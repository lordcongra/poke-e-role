import React, { useRef, useCallback } from 'react';

interface UsePcSlotTouchProps {
    onContextMenu: (e: React.MouseEvent) => void;
    onClick: () => void;
    onDragStart?: (e: React.DragEvent) => void;
}

export function usePcSlotTouch({ onContextMenu, onClick, onDragStart }: UsePcSlotTouchProps) {
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 1) {
                const t = e.touches[0];
                touchStartRef.current = { x: t.clientX, y: t.clientY };
                didLongPressRef.current = false;
                clearTimer();

                timerRef.current = setTimeout(() => {
                    if (touchStartRef.current) {
                        didLongPressRef.current = true;
                        const synthEvent = {
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            clientX: touchStartRef.current.x,
                            clientY: touchStartRef.current.y
                        } as unknown as React.MouseEvent;
                        onContextMenu(synthEvent);
                    }
                }, 450);
            }
        },
        [clearTimer, onContextMenu]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (touchStartRef.current && e.touches.length === 1) {
                const t = e.touches[0];
                const dx = Math.abs(t.clientX - touchStartRef.current.x);
                const dy = Math.abs(t.clientY - touchStartRef.current.y);
                // Swiping or scrolling cancels the long-press timer
                if (dx > 10 || dy > 10) {
                    clearTimer();
                }
            }
        },
        [clearTimer]
    );

    const handleTouchEnd = useCallback(() => {
        clearTimer();
        touchStartRef.current = null;
    }, [clearTimer]);

    const handleTouchCancel = useCallback(() => {
        clearTimer();
        touchStartRef.current = null;
    }, [clearTimer]);

    const handleClick = useCallback(() => {
        if (didLongPressRef.current) {
            didLongPressRef.current = false;
            return;
        }
        onClick();
    }, [onClick]);

    const handleDragStartWrapped = useCallback(
        (e: React.DragEvent) => {
            clearTimer();
            onDragStart?.(e);
        },
        [clearTimer, onDragStart]
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
