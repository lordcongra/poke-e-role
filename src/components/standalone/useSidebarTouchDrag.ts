import { useState, useRef, useEffect, useCallback } from 'react';
import type { TreeItem } from './useSidebarEngine';

export interface TouchDragOverInfo {
    id: string; // target item id, or '__root__', or '__initiative__'
    position: 'before' | 'after' | 'inside';
}

interface UseSidebarTouchDragProps {
    items: TreeItem[];
    treeContainerRef: React.RefObject<HTMLDivElement | null>;
    onDropItem: (
        draggedId: string,
        draggedType: 'folder' | 'character',
        targetItem: TreeItem | null,
        position: 'before' | 'after' | 'inside'
    ) => Promise<void>;
    onOpenContextMenu: (x: number, y: number, item: TreeItem) => void;
    dragOverInfo: TouchDragOverInfo | null;
    setDragOverInfo: React.Dispatch<React.SetStateAction<TouchDragOverInfo | null>>;
}

export function useSidebarTouchDrag({
    items,
    treeContainerRef,
    onDropItem,
    onOpenContextMenu,
    dragOverInfo,
    setDragOverInfo
}: UseSidebarTouchDragProps) {
    const [liftedItemId, setLiftedItemId] = useState<string | null>(null);
    const [touchGhostItem, setTouchGhostItem] = useState<TreeItem | null>(null);
    const [touchGhostPos, setTouchGhostPos] = useState<{ x: number; y: number } | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const touchActiveItem = useRef<TreeItem | null>(null);
    const holdTimerRef = useRef<number | null>(null);
    const isLiftedRef = useRef(false);
    const isDraggingRef = useRef(false);
    const lastActionTimeRef = useRef(0);

    // Keep ref of dragOverInfo so touch-end listener has fresh state without recreation
    const dragOverInfoRef = useRef<TouchDragOverInfo | null>(dragOverInfo);
    useEffect(() => {
        dragOverInfoRef.current = dragOverInfo;
    }, [dragOverInfo]);

    const cleanupTimer = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const resetDragState = useCallback(() => {
        cleanupTimer();
        setLiftedItemId(null);
        setTouchGhostItem(null);
        setTouchGhostPos(null);
        setIsDragActive(false);
        setDragOverInfo(null);
        touchActiveItem.current = null;
        isLiftedRef.current = false;
        isDraggingRef.current = false;
    }, [cleanupTimer, setDragOverInfo]);

    const onWindowTouchMove = useCallback(
        (e: TouchEvent) => {
            if (e.touches.length === 0 || !touchActiveItem.current) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartPos.current.x;
            const dy = touch.clientY - touchStartPos.current.y;
            const dist = Math.hypot(dx, dy);

            // Case A: Before the 300ms hold timer has elapsed
            if (!isLiftedRef.current) {
                if (dist > 8) {
                    // Finger moved beyond slop threshold -> native vertical scroll in progress
                    cleanupTimer();
                    touchActiveItem.current = null;
                }
                return;
            }

            // Case B: Item is lifted!
            if (dist > 6 || isDraggingRef.current) {
                if (!isDraggingRef.current) {
                    isDraggingRef.current = true;
                    setIsDragActive(true);
                }

                // Prevent native scrolling while actively dragging an item
                if (e.cancelable) {
                    e.preventDefault();
                }

                setTouchGhostPos({ x: touch.clientX, y: touch.clientY });

                // Smooth edge auto-scrolling
                const treeEl = treeContainerRef.current;
                if (treeEl) {
                    const rect = treeEl.getBoundingClientRect();
                    const edgeThreshold = 44;
                    if (touch.clientY < rect.top + edgeThreshold && touch.clientY >= rect.top - 10) {
                        const intensity = Math.min(14, Math.max(3, (rect.top + edgeThreshold - touch.clientY) / 3));
                        treeEl.scrollTop -= intensity;
                    } else if (touch.clientY > rect.bottom - edgeThreshold && touch.clientY <= rect.bottom + 10) {
                        const intensity = Math.min(14, Math.max(3, (touch.clientY - (rect.bottom - edgeThreshold)) / 3));
                        treeEl.scrollTop += intensity;
                    }
                }

                // Hit testing drop targets
                const hit = document.elementFromPoint(touch.clientX, touch.clientY);
                if (!hit) {
                    setDragOverInfo(null);
                    return;
                }

                // Check 1: Initiative Tracker standalone container
                const initTarget = hit.closest(
                    '.init-tracker__standalone-wrapper, .init-tracker, [data-drop-zone="initiative"]'
                );
                if (initTarget) {
                    setDragOverInfo({ id: '__initiative__', position: 'inside' });
                    return;
                }

                // Check 2: Root Dropzone
                const rootTarget = hit.closest('.sidebar__dropzone-root, [data-drop-zone="root"]');
                if (rootTarget) {
                    setDragOverInfo({ id: '__root__', position: 'inside' });
                    return;
                }

                // Check 3: Sidebar Tree Item
                const itemEl = hit.closest('.sidebar__item') as HTMLElement | null;
                if (itemEl) {
                    const targetId = itemEl.getAttribute('data-item-id');
                    const targetType = itemEl.getAttribute('data-item-type');
                    if (targetId && targetId !== touchActiveItem.current?.id) {
                        const rect = itemEl.getBoundingClientRect();
                        const relY = touch.clientY - rect.top;
                        let pos: 'before' | 'after' | 'inside' = 'inside';
                        if (relY < rect.height * 0.25) {
                            pos = 'before';
                        } else if (relY > rect.height * 0.75) {
                            pos = 'after';
                        } else if (targetType === 'folder') {
                            pos = 'inside';
                        } else {
                            pos = relY < rect.height * 0.5 ? 'before' : 'after';
                        }
                        setDragOverInfo({ id: targetId, position: pos });
                        return;
                    }
                }

                // Check 4: Sidebar tree empty area -> treat as root dropzone
                const treeTarget = hit.closest('.sidebar__tree');
                if (treeTarget && !itemEl) {
                    setDragOverInfo({ id: '__root__', position: 'inside' });
                    return;
                }

                setDragOverInfo(null);
            }
        },
        [cleanupTimer, setDragOverInfo, treeContainerRef]
    );

    const onWindowTouchEnd = useCallback(
        async (e: TouchEvent) => {
            const activeItem = touchActiveItem.current;
            const isLifted = isLiftedRef.current;
            const isDragging = isDraggingRef.current;
            const currentDrop = dragOverInfoRef.current;

            cleanupTimer();

            if (isLifted) {
                lastActionTimeRef.current = Date.now();

                // Option A: Smart Hold
                // If held for 300ms but released without dragging -> open context menu!
                if (!isDragging && activeItem) {
                    const touch = e.changedTouches[0] || touchStartPos.current;
                    onOpenContextMenu(touch.clientX, touch.clientY, activeItem);
                    try {
                        if (navigator.vibrate) navigator.vibrate(30);
                    } catch {
                        // Ignore
                    }
                } else if (isDragging && activeItem) {
                    // Dropped after active drag
                    try {
                        if (navigator.vibrate) navigator.vibrate(25);
                    } catch {
                        // Ignore
                    }

                    if (currentDrop?.id === '__initiative__') {
                        if (activeItem.type === 'character') {
                            window.dispatchEvent(
                                new CustomEvent('pkr-init-add-character', { detail: { id: activeItem.id } })
                            );
                        }
                    } else if (currentDrop?.id === '__root__') {
                        await onDropItem(activeItem.id, activeItem.type, null, 'inside');
                    } else if (currentDrop?.id) {
                        const targetItem = items.find((i) => i.id === currentDrop.id);
                        if (targetItem) {
                            await onDropItem(activeItem.id, activeItem.type, targetItem, currentDrop.position);
                        }
                    }
                }
            }

            resetDragState();
        },
        [cleanupTimer, items, onDropItem, onOpenContextMenu, resetDragState]
    );

    const onWindowTouchCancel = useCallback(() => {
        resetDragState();
    }, [resetDragState]);

    useEffect(() => {
        window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
        window.addEventListener('touchend', onWindowTouchEnd, { passive: false });
        window.addEventListener('touchcancel', onWindowTouchCancel, { passive: false });
        return () => {
            window.removeEventListener('touchmove', onWindowTouchMove);
            window.removeEventListener('touchend', onWindowTouchEnd);
            window.removeEventListener('touchcancel', onWindowTouchCancel);
        };
    }, [onWindowTouchMove, onWindowTouchEnd, onWindowTouchCancel]);

    const handleItemTouchStart = useCallback(
        (e: React.TouchEvent, item: TreeItem) => {
            if (e.touches.length !== 1) return;
            const target = e.target as HTMLElement;
            // Ignore touch starts on interactive controls
            if (target.closest('button, .sidebar__caret, input, select')) return;

            const touch = e.touches[0];
            touchStartPos.current = { x: touch.clientX, y: touch.clientY };
            touchActiveItem.current = item;
            isLiftedRef.current = false;
            isDraggingRef.current = false;

            cleanupTimer();

            // 300ms hold timer
            holdTimerRef.current = window.setTimeout(() => {
                isLiftedRef.current = true;
                setLiftedItemId(item.id);
                setTouchGhostItem(item);
                setTouchGhostPos({ x: touchStartPos.current.x, y: touchStartPos.current.y });

                try {
                    if (navigator.vibrate) navigator.vibrate(40);
                } catch {
                    // Ignore
                }
            }, 300);
        },
        [cleanupTimer]
    );

    const isClickBlocked = useCallback(() => {
        return Date.now() - lastActionTimeRef.current < 350;
    }, []);

    return {
        liftedItemId,
        touchGhostItem,
        touchGhostPos,
        isDragActive,
        handleItemTouchStart,
        isClickBlocked
    };
}
