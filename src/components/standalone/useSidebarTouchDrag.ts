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
    onCloseContextMenu?: () => void;
    dragOverInfo: TouchDragOverInfo | null;
    setDragOverInfo: React.Dispatch<React.SetStateAction<TouchDragOverInfo | null>>;
}

export function useSidebarTouchDrag({
    items,
    treeContainerRef,
    onDropItem,
    onOpenContextMenu,
    onCloseContextMenu,
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

    // Keep latest props in refs to avoid re-binding window listeners during active gestures
    const itemsRef = useRef(items);
    const onDropItemRef = useRef(onDropItem);
    const onOpenContextMenuRef = useRef(onOpenContextMenu);

    useEffect(() => {
        itemsRef.current = items;
        onDropItemRef.current = onDropItem;
        onOpenContextMenuRef.current = onOpenContextMenu;
    });

    // Synchronous drop target ref - updated instantaneously with no React render lag
    const currentDropRef = useRef<TouchDragOverInfo | null>(null);

    const updateDragOver = useCallback(
        (info: TouchDragOverInfo | null) => {
            currentDropRef.current = info;
            setDragOverInfo(info);
        },
        [setDragOverInfo]
    );

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
        updateDragOver(null);
        touchActiveItem.current = null;
        isLiftedRef.current = false;
        isDraggingRef.current = false;
    }, [cleanupTimer, updateDragOver]);

    // Crucial: Intercept & suppress native browser contextmenu events during hold, drag, and shortly after
    useEffect(() => {
        const handleContextMenuCapture = (e: MouseEvent) => {
            if (
                isLiftedRef.current ||
                isDraggingRef.current ||
                touchActiveItem.current !== null ||
                Date.now() - lastActionTimeRef.current < 800
            ) {
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

    // Dual-point hit testing helper: tests both thumb touch point and badge offset point
    const resolveHitElement = useCallback((clientX: number, clientY: number) => {
        // Point 1: Direct thumb touch point
        let el = document.elementFromPoint(clientX, clientY);

        // Point 2: If direct point misses a tree item, try 30px higher (where the ghost badge floats)
        if (!el?.closest('.sidebar__item, .init-tracker, .sidebar__dropzone-root')) {
            const elevatedEl = document.elementFromPoint(clientX, clientY - 30);
            if (elevatedEl?.closest('.sidebar__item, .init-tracker, .sidebar__dropzone-root')) {
                el = elevatedEl;
            }
        }
        return el;
    }, []);

    const calculateDropInfo = useCallback(
        (clientX: number, clientY: number): TouchDragOverInfo | null => {
            const activeItem = touchActiveItem.current;
            if (!activeItem) return null;

            const hit = resolveHitElement(clientX, clientY);
            if (!hit) return null;

            // Check 1: Initiative Tracker standalone container
            const initTarget = hit.closest(
                '.init-tracker__standalone-wrapper, .init-tracker, [data-drop-zone="initiative"]'
            );
            if (initTarget) {
                return { id: '__initiative__', position: 'inside' };
            }

            // Check 2: Root Dropzone
            const rootTarget = hit.closest('.sidebar__dropzone-root, [data-drop-zone="root"]');
            if (rootTarget) {
                return { id: '__root__', position: 'inside' };
            }

            // Check 3: Sidebar Tree Item (Folder or Character)
            const itemEl = hit.closest('.sidebar__item') as HTMLElement | null;
            if (itemEl) {
                const targetId = itemEl.getAttribute('data-item-id');
                const targetType = itemEl.getAttribute('data-item-type');
                if (targetId && targetId !== activeItem.id) {
                    const rect = itemEl.getBoundingClientRect();
                    const relY = clientY - rect.top;

                    // When dragging a character sheet onto a folder, it should ALWAYS drop inside the folder
                    if (targetType === 'folder') {
                        if (activeItem.type === 'character') {
                            return { id: targetId, position: 'inside' };
                        }
                        // Reordering folder-relative-to-folder
                        let pos: 'before' | 'after' | 'inside' = 'inside';
                        if (relY < rect.height * 0.2) {
                            pos = 'before';
                        } else if (relY > rect.height * 0.8) {
                            pos = 'after';
                        }
                        return { id: targetId, position: pos };
                    }

                    // Dropping relative to a character row
                    const pos: 'before' | 'after' = relY < rect.height * 0.5 ? 'before' : 'after';
                    return { id: targetId, position: pos };
                }
            }

            // Check 4: Sidebar tree empty area -> treat as root dropzone
            const treeTarget = hit.closest('.sidebar__tree');
            if (treeTarget && !itemEl) {
                return { id: '__root__', position: 'inside' };
            }

            return null;
        },
        [resolveHitElement]
    );

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
                    // Finger moved beyond 8px slop -> user is scrolling the list naturally
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

                // Prevent native page scrolling while actively dragging an item
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
                        const intensity = Math.min(
                            14,
                            Math.max(3, (touch.clientY - (rect.bottom - edgeThreshold)) / 3)
                        );
                        treeEl.scrollTop += intensity;
                    }
                }

                // Hit testing drop targets beneath the touch
                const dropInfo = calculateDropInfo(touch.clientX, touch.clientY);
                updateDragOver(dropInfo);
            }
        },
        [calculateDropInfo, cleanupTimer, treeContainerRef, updateDragOver]
    );

    const onWindowTouchEnd = useCallback(
        async (e: TouchEvent) => {
            const activeItem = touchActiveItem.current;
            const isLifted = isLiftedRef.current;
            const isDragging = isDraggingRef.current;

            cleanupTimer();

            if (isLifted && activeItem) {
                // Prevent synthetic clicks or contextmenu events from browser
                if (e.cancelable) {
                    e.preventDefault();
                }
                e.stopPropagation();

                lastActionTimeRef.current = Date.now();

                const endTouch = e.changedTouches[0] || touchStartPos.current;
                const totalDist = Math.hypot(
                    endTouch.clientX - touchStartPos.current.x,
                    endTouch.clientY - touchStartPos.current.y
                );

                // Option A: Smart Hold Context Menu
                // If held for 300ms and released WITHOUT dragging (totalDist < 10 and not marked dragging)
                if (!isDragging && totalDist < 10) {
                    onOpenContextMenuRef.current(endTouch.clientX, endTouch.clientY, activeItem);
                    try {
                        if (navigator.vibrate) navigator.vibrate(30);
                    } catch {
                        // Ignore
                    }
                } else if (isDragging || totalDist >= 10) {
                    // Active Drag Dropped!
                    try {
                        if (navigator.vibrate) navigator.vibrate(25);
                    } catch {
                        // Ignore
                    }

                    // Re-verify drop target directly at the release coordinates if currentDropRef is empty
                    let finalDrop = currentDropRef.current;
                    if (!finalDrop) {
                        finalDrop = calculateDropInfo(endTouch.clientX, endTouch.clientY);
                    }

                    if (finalDrop?.id === '__initiative__') {
                        if (activeItem.type === 'character') {
                            window.dispatchEvent(
                                new CustomEvent('pkr-init-add-character', { detail: { id: activeItem.id } })
                            );
                        }
                    } else if (finalDrop?.id === '__root__') {
                        await onDropItemRef.current(activeItem.id, activeItem.type, null, 'inside');
                    } else if (finalDrop?.id) {
                        const targetItem = itemsRef.current.find((i) => i.id === finalDrop.id);
                        if (targetItem) {
                            await onDropItemRef.current(activeItem.id, activeItem.type, targetItem, finalDrop.position);
                        }
                    }
                }
            }

            resetDragState();
        },
        [calculateDropInfo, cleanupTimer, resetDragState]
    );

    const onWindowTouchCancel = useCallback(() => {
        lastActionTimeRef.current = Date.now();
        resetDragState();
    }, [resetDragState]);

    // Keep stable window listeners using refs to prevent teardown during active drags
    const onWindowTouchMoveRef = useRef(onWindowTouchMove);
    const onWindowTouchEndRef = useRef(onWindowTouchEnd);
    const onWindowTouchCancelRef = useRef(onWindowTouchCancel);

    useEffect(() => {
        onWindowTouchMoveRef.current = onWindowTouchMove;
        onWindowTouchEndRef.current = onWindowTouchEnd;
        onWindowTouchCancelRef.current = onWindowTouchCancel;
    });

    useEffect(() => {
        const handleMove = (e: TouchEvent) => onWindowTouchMoveRef.current(e);
        const handleEnd = (e: TouchEvent) => onWindowTouchEndRef.current(e);
        const handleCancel = () => onWindowTouchCancelRef.current();

        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd, { passive: false });
        window.addEventListener('touchcancel', handleCancel, { passive: false });

        return () => {
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('touchcancel', handleCancel);
        };
    }, []);

    const handleItemTouchStart = useCallback(
        (e: React.TouchEvent, item: TreeItem) => {
            if (e.touches.length !== 1) return;
            const target = e.target as HTMLElement;
            // Ignore touch starts on interactive controls
            if (target.closest('button, .sidebar__caret, input, select')) return;

            // Close any existing open context menu when starting a new touch
            if (onCloseContextMenu) {
                onCloseContextMenu();
            }

            const touch = e.touches[0];
            touchStartPos.current = { x: touch.clientX, y: touch.clientY };
            touchActiveItem.current = item;
            isLiftedRef.current = false;
            isDraggingRef.current = false;
            currentDropRef.current = null;

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
        [cleanupTimer, onCloseContextMenu]
    );

    const isClickBlocked = useCallback(() => {
        return (
            isLiftedRef.current ||
            isDraggingRef.current ||
            touchActiveItem.current !== null ||
            Date.now() - lastActionTimeRef.current < 600
        );
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
