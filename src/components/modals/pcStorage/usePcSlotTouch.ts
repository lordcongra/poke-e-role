import React, { useRef, useCallback, useEffect } from 'react';

interface UsePcSlotTouchProps {
    onContextMenu: (e: React.MouseEvent) => void;
    onClick: () => void;
    onDragStart?: (e: React.DragEvent) => void;
}

export function usePcSlotTouch({ onContextMenu, onClick, onDragStart }: UsePcSlotTouchProps) {
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const touchStartTime = useRef<number>(0);
    const isTouchActiveRef = useRef<boolean>(false);
    const isDraggingRef = useRef<boolean>(false);
    const hasMovedRef = useRef<boolean>(false);
    const didLongPressRef = useRef<boolean>(false);
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

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const target = e.target as HTMLElement;
        // Ignore touch starts on interactive child buttons or menus
        if (target.closest('button, input, select, a, [role="button"]')) return;

        const t = e.touches[0];
        touchStartPos.current = { x: t.clientX, y: t.clientY };
        touchStartTime.current = Date.now();
        isTouchActiveRef.current = true;
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        didLongPressRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStartPos.current || e.touches.length === 0) return;
        const t = e.touches[0];
        const dx = t.clientX - touchStartPos.current.x;
        const dy = t.clientY - touchStartPos.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist >= 10) {
            hasMovedRef.current = true;
            // If dragging or held past hold-to-drag threshold, treat as drag
            if (isDraggingRef.current || Date.now() - touchStartTime.current >= 200) {
                isDraggingRef.current = true;
            }
        }
    }, []);

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            const startPos = touchStartPos.current;
            const startTime = touchStartTime.current;
            const isDragging = isDraggingRef.current;
            const hasMoved = hasMovedRef.current;
            const duration = Date.now() - startTime;

            const endTouch = e.changedTouches[0] || (startPos ? { clientX: startPos.x, clientY: startPos.y } : null);
            const totalDist =
                startPos && endTouch ? Math.hypot(endTouch.clientX - startPos.x, endTouch.clientY - startPos.y) : 0;
            const didDrag = isDragging || hasMoved || totalDist >= 10;

            // If held for >300ms but released WITHOUT dragging (total distance moved < 10px), trigger onContextMenu
            if (startPos && !didDrag && duration >= 300) {
                didLongPressRef.current = true;
                lastActionTimeRef.current = Date.now();
                if (e.cancelable) {
                    e.preventDefault();
                }
                e.stopPropagation();

                const synthEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    clientX: endTouch ? endTouch.clientX : startPos.x,
                    clientY: endTouch ? endTouch.clientY : startPos.y
                } as unknown as React.MouseEvent;

                onContextMenu(synthEvent);

                try {
                    if (navigator.vibrate) navigator.vibrate(30);
                } catch {
                    // Ignore haptic error
                }
            } else if (didDrag) {
                lastActionTimeRef.current = Date.now();
            }

            touchStartPos.current = null;
            isTouchActiveRef.current = false;
            isDraggingRef.current = false;
            hasMovedRef.current = false;
        },
        [onContextMenu]
    );

    const handleTouchCancel = useCallback(() => {
        touchStartPos.current = null;
        isTouchActiveRef.current = false;
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        lastActionTimeRef.current = Date.now();
    }, []);

    const handleClick = useCallback(() => {
        if (
            didLongPressRef.current ||
            isDraggingRef.current ||
            hasMovedRef.current ||
            Date.now() - lastActionTimeRef.current < 600
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
