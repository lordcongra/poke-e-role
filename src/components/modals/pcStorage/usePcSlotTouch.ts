import React, { useRef, useCallback, useEffect } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';

interface UsePcSlotTouchProps {
    onContextMenu: (e: React.MouseEvent) => void;
    onClick: () => void;
    onDragStart?: (e: React.DragEvent) => void;
    slotType?: 'party' | 'box';
    slotIndex?: number;
    disabled?: boolean;
}

export function usePcSlotTouch({
    onContextMenu,
    onClick,
    onDragStart,
    slotType,
    slotIndex,
    disabled = false
}: UsePcSlotTouchProps) {
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const touchStartTime = useRef<number>(0);
    const isTouchActiveRef = useRef<boolean>(false);
    const isDraggingRef = useRef<boolean>(false);
    const hasMovedRef = useRef<boolean>(false);
    const isScrollingRef = useRef<boolean>(false);
    const didLongPressRef = useRef<boolean>(false);
    const longPressTimerRef = useRef<number | null>(null);
    const ghostElRef = useRef<HTMLElement | null>(null);
    const sourceElRef = useRef<HTMLElement | null>(null);
    const lastHoveredElRef = useRef<HTMLElement | null>(null);
    const lastActionTimeRef = useRef<number>(0);

    // Suppress browser native contextmenu events on window during active touch holds and drags
    useEffect(() => {
        const handleContextMenuCapture = (e: MouseEvent) => {
            if (isDraggingRef.current || isTouchActiveRef.current || Date.now() - lastActionTimeRef.current < 800) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener('contextmenu', handleContextMenuCapture, { capture: true });
        document.addEventListener('contextmenu', handleContextMenuCapture, { capture: true });
        return () => {
            window.removeEventListener('contextmenu', handleContextMenuCapture, { capture: true });
            document.removeEventListener('contextmenu', handleContextMenuCapture, { capture: true });
        };
    }, []);

    const clearTimers = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const cleanupGhost = useCallback(() => {
        if (ghostElRef.current) {
            if (ghostElRef.current.parentNode) {
                ghostElRef.current.parentNode.removeChild(ghostElRef.current);
            }
            ghostElRef.current = null;
        }
        if (sourceElRef.current) {
            sourceElRef.current.classList.remove('pc-slot-card--touch-dragging');
            sourceElRef.current = null;
        }
        if (lastHoveredElRef.current) {
            lastHoveredElRef.current.classList.remove('pc-slot--touch-drag-over', 'pc-modal__mobile-tab--drag-over');
            lastHoveredElRef.current = null;
        }
    }, []);

    const createGhost = useCallback((sourceEl: HTMLElement, x: number, y: number) => {
        sourceEl.classList.add('pc-slot-card--touch-dragging');

        const exactHeight = Math.max(50, Math.min(sourceEl.offsetHeight || 60, 68));
        const exactWidth = Math.max(140, Math.min(sourceEl.offsetWidth || 220, 280));

        const ghost = sourceEl.cloneNode(true) as HTMLElement;
        ghost.classList.add('pc-touch-drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
        ghost.style.transform = 'translate(-50%, -50%) scale(1.03)';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '99999';
        ghost.style.opacity = '0.95';
        ghost.style.width = `${exactWidth}px`;
        ghost.style.maxWidth = `${exactWidth}px`;
        ghost.style.minWidth = `${exactWidth}px`;
        ghost.style.height = `${exactHeight}px`;
        ghost.style.maxHeight = `${exactHeight}px`;
        ghost.style.minHeight = `${exactHeight}px`;
        ghost.style.boxSizing = 'border-box';
        ghost.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.55), 0 0 16px var(--primary, #3b82f6)';
        ghost.style.transition = 'transform 0.05s ease-out';
        ghost.style.margin = '0';
        ghost.style.overflow = 'hidden';

        // Hide action buttons in the ghost preview to keep it clean and compact
        ghost.querySelectorAll('button, .pc-slot-card__party-actions, .pc-slot-card__box-actions').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
        });

        document.body.appendChild(ghost);
        ghostElRef.current = ghost;
    }, []);

    const updateHoverTarget = useCallback((x: number, y: number, currentSource: HTMLElement | null) => {
        const elUnder = document.elementFromPoint(x, y);
        const targetSlot = elUnder?.closest('[data-slot-type]') as HTMLElement | null;
        const targetTab = elUnder?.closest('[data-tab-type], .pc-modal__mobile-tab') as HTMLElement | null;
        const target = targetSlot || targetTab;

        if (lastHoveredElRef.current && lastHoveredElRef.current !== target) {
            lastHoveredElRef.current.classList.remove('pc-slot--touch-drag-over', 'pc-modal__mobile-tab--drag-over');
        }

        if (target && target !== currentSource && !currentSource?.contains(target)) {
            if (targetTab) {
                target.classList.add('pc-modal__mobile-tab--drag-over');
            } else {
                target.classList.add('pc-slot--touch-drag-over');
            }
            lastHoveredElRef.current = target;
        } else {
            lastHoveredElRef.current = null;
        }
    }, []);

    const executeDrop = useCallback(
        (targetEl: Element | null, sourceEl: HTMLElement | null) => {
            const wrapper = sourceEl?.closest('[data-slot-type]');
            const resolvedSourceType =
                slotType ?? (wrapper?.getAttribute('data-slot-type') as 'party' | 'box' | undefined);
            const rawIndex =
                slotIndex ??
                (wrapper?.getAttribute('data-slot-index') != null
                    ? parseInt(wrapper.getAttribute('data-slot-index')!, 10)
                    : undefined);

            if (resolvedSourceType == null || rawIndex == null) return;
            const sourceIdx = rawIndex;

            const targetSlot = targetEl?.closest('[data-slot-type]');
            const targetTab = targetEl?.closest('[data-tab-type], .pc-modal__mobile-tab');

            const { pcData, activeBoxIndex, swapPcSlots } = useCharacterStore.getState();

            if (targetSlot) {
                const targetType = targetSlot.getAttribute('data-slot-type') as 'party' | 'box' | null;
                const targetIdxAttr = targetSlot.getAttribute('data-slot-index');
                if (targetType && targetIdxAttr != null) {
                    const targetIdx = parseInt(targetIdxAttr, 10);
                    // Don't swap if dropped on the exact same slot
                    if (targetType !== resolvedSourceType || targetIdx !== sourceIdx) {
                        swapPcSlots(
                            {
                                type: resolvedSourceType,
                                index: sourceIdx,
                                boxIndex: resolvedSourceType === 'box' ? activeBoxIndex : undefined
                            },
                            {
                                type: targetType,
                                index: targetIdx,
                                boxIndex: targetType === 'box' ? activeBoxIndex : undefined
                            }
                        );
                        try {
                            if (navigator.vibrate) navigator.vibrate(30);
                        } catch {}
                    }
                }
            } else if (targetTab) {
                const tabTypeAttr =
                    targetTab.getAttribute('data-tab-type') ||
                    (targetTab.textContent?.includes('Party') || targetTab.textContent?.includes('Team')
                        ? 'party'
                        : 'box');

                const camp = pcData.campaigns[pcData.activeCampaignId];
                const activeTrainer = camp?.trainers[camp?.activeTrainerId];
                const party = activeTrainer ? activeTrainer.party : camp?.teamParty || [];
                const trainerBoxes =
                    activeTrainer?.boxes && activeTrainer.boxes.length > 0 ? activeTrainer.boxes : camp?.boxes || [];
                const currentBox = trainerBoxes[activeBoxIndex] || trainerBoxes[0];
                const boxSlots = currentBox?.slots || [];

                if (tabTypeAttr === 'party' && resolvedSourceType === 'box') {
                    const emptyIdx = party.findIndex((s) => s === null);
                    const targetIndex = emptyIdx !== -1 ? emptyIdx : 0;
                    swapPcSlots(
                        { type: 'box', index: sourceIdx, boxIndex: activeBoxIndex },
                        { type: 'party', index: targetIndex }
                    );
                    try {
                        if (navigator.vibrate) navigator.vibrate(30);
                    } catch {}
                } else if (tabTypeAttr === 'box' && resolvedSourceType === 'party') {
                    const emptyIdx = boxSlots.findIndex((s) => s === null);
                    const targetIndex = emptyIdx !== -1 ? emptyIdx : 0;
                    swapPcSlots(
                        { type: 'party', index: sourceIdx },
                        { type: 'box', index: targetIndex, boxIndex: activeBoxIndex }
                    );
                    try {
                        if (navigator.vibrate) navigator.vibrate(30);
                    } catch {}
                }
            }
        },
        [slotIndex, slotType]
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length !== 1) return;
            const target = e.target as HTMLElement;
            // Ignore touch starts on interactive child buttons or menus
            if (target.closest('button, input, select, a, [role="button"]')) return;

            clearTimers();
            const t = e.touches[0];
            touchStartPos.current = { x: t.clientX, y: t.clientY };
            touchStartTime.current = Date.now();
            isTouchActiveRef.current = true;
            isDraggingRef.current = false;
            hasMovedRef.current = false;
            isScrollingRef.current = false;
            didLongPressRef.current = false;

            const currentEl = e.currentTarget as HTMLElement;
            sourceElRef.current = currentEl;

            // Long-press static hold (>400ms without movement) triggers onContextMenu
            longPressTimerRef.current = window.setTimeout(() => {
                if (!hasMovedRef.current && !isScrollingRef.current && !isDraggingRef.current) {
                    didLongPressRef.current = true;
                    lastActionTimeRef.current = Date.now();
                    const synthEvent = {
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        clientX: touchStartPos.current?.x ?? 0,
                        clientY: touchStartPos.current?.y ?? 0
                    } as unknown as React.MouseEvent;

                    onContextMenu(synthEvent);

                    try {
                        if (navigator.vibrate) navigator.vibrate(30);
                    } catch {}
                }
            }, 400);
        },
        [clearTimers, onContextMenu]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!touchStartPos.current || e.touches.length === 0) return;
            const t = e.touches[0];
            const dx = t.clientX - touchStartPos.current.x;
            const dy = t.clientY - touchStartPos.current.y;
            const dist = Math.hypot(dx, dy);

            if (dist >= 10) {
                hasMovedRef.current = true;
                clearTimers();

                const duration = Date.now() - touchStartTime.current;

                if (!isDraggingRef.current) {
                    if (duration < 220 && !isScrollingRef.current) {
                        // Movement happened quickly -> user is scrolling
                        isScrollingRef.current = true;
                    } else if (duration >= 220 && !isScrollingRef.current && !disabled) {
                        // User held > 220ms and moved -> initiate drag mode
                        isDraggingRef.current = true;
                        if (e.cancelable) e.preventDefault();

                        try {
                            if (navigator.vibrate) navigator.vibrate(20);
                        } catch {}

                        if (sourceElRef.current) {
                            createGhost(sourceElRef.current, t.clientX, t.clientY);
                        }
                    }
                } else {
                    // Already in drag mode: prevent scroll, update ghost and hover targets
                    if (e.cancelable) e.preventDefault();
                    if (ghostElRef.current) {
                        ghostElRef.current.style.left = `${t.clientX}px`;
                        ghostElRef.current.style.top = `${t.clientY}px`;
                    }
                    updateHoverTarget(t.clientX, t.clientY, sourceElRef.current);
                }
            }
        },
        [clearTimers, createGhost, disabled, updateHoverTarget]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            const startPos = touchStartPos.current;
            const startTime = touchStartTime.current;
            const isDragging = isDraggingRef.current;
            const didLongPress = didLongPressRef.current;
            const hasMoved = hasMovedRef.current;
            const isScrolling = isScrollingRef.current;
            const duration = Date.now() - startTime;

            clearTimers();

            const endTouch = e.changedTouches[0] || (startPos ? { clientX: startPos.x, clientY: startPos.y } : null);
            const sourceEl = sourceElRef.current;

            cleanupGhost();

            if (isDragging && endTouch) {
                lastActionTimeRef.current = Date.now();
                if (e.cancelable) e.preventDefault();
                const targetEl = document.elementFromPoint(endTouch.clientX, endTouch.clientY);
                executeDrop(targetEl, sourceEl);
            } else if (!isDragging && !didLongPress && !hasMoved && !isScrolling && duration < 220) {
                // Quick tap (<220ms) triggers click
                lastActionTimeRef.current = Date.now();
                onClick();
            } else if (didLongPress || duration >= 220) {
                lastActionTimeRef.current = Date.now();
            }

            touchStartPos.current = null;
            isTouchActiveRef.current = false;
            isDraggingRef.current = false;
            hasMovedRef.current = false;
            isScrollingRef.current = false;
        },
        [clearTimers, cleanupGhost, executeDrop, onClick]
    );

    const handleTouchCancel = useCallback(() => {
        clearTimers();
        cleanupGhost();
        touchStartPos.current = null;
        isTouchActiveRef.current = false;
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        isScrollingRef.current = false;
        lastActionTimeRef.current = Date.now();
    }, [clearTimers, cleanupGhost]);

    const handleClick = useCallback(() => {
        if (
            didLongPressRef.current ||
            isDraggingRef.current ||
            hasMovedRef.current ||
            Date.now() - lastActionTimeRef.current < 450
        ) {
            didLongPressRef.current = false;
            return;
        }
        onClick();
    }, [onClick]);

    const handleDragStartWrapped = useCallback(
        (e: React.DragEvent) => {
            isDraggingRef.current = true;
            hasMovedRef.current = true;
            lastActionTimeRef.current = Date.now();
            onDragStart?.(e);
        },
        [onDragStart]
    );

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        handleClick,
        handleDragStartWrapped
    };
}
