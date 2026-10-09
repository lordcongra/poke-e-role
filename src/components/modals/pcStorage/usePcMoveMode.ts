import { useState, useCallback } from 'react';
import type { PcDragItem } from '../../../utils/pc/pcDragDropUtils';

export function usePcMoveMode(
    activeBoxIndex: number,
    swapPcSlots: (from: PcDragItem, to: PcDragItem) => void,
    selectedPcSlot: { type: 'party' | 'box'; index: number } | null,
    setSelectedPcSlot: (slot: { type: 'party' | 'box'; index: number } | null) => void,
    setDepositTarget: (target: { targetSlot?: { type: 'party' | 'box'; index: number } } | null) => void
) {
    const [movingSlot, setMovingSlot] = useState<{
        source: { type: 'party' | 'box'; index: number };
        name: string;
    } | null>(null);

    const handleSlotClick = useCallback(
        (target: { type: 'party' | 'box'; index: number }) => {
            if (movingSlot) {
                if (movingSlot.source.type === target.type && movingSlot.source.index === target.index) {
                    setMovingSlot(null);
                } else {
                    swapPcSlots(
                        {
                            ...movingSlot.source,
                            boxIndex: movingSlot.source.type === 'box' ? activeBoxIndex : undefined
                        },
                        {
                            ...target,
                            boxIndex: target.type === 'box' ? activeBoxIndex : undefined
                        }
                    );
                    setMovingSlot(null);
                }
                return;
            }
            setSelectedPcSlot(
                selectedPcSlot?.type === target.type && selectedPcSlot?.index === target.index ? null : target
            );
        },
        [activeBoxIndex, movingSlot, selectedPcSlot, setSelectedPcSlot, swapPcSlots]
    );

    const handleEmptySlotClick = useCallback(
        (target: { type: 'party' | 'box'; index: number }) => {
            if (movingSlot) {
                swapPcSlots(
                    {
                        ...movingSlot.source,
                        boxIndex: movingSlot.source.type === 'box' ? activeBoxIndex : undefined
                    },
                    {
                        ...target,
                        boxIndex: target.type === 'box' ? activeBoxIndex : undefined
                    }
                );
                setMovingSlot(null);
                return;
            }
            setSelectedPcSlot(null);
            setDepositTarget({ targetSlot: target });
        },
        [activeBoxIndex, movingSlot, setSelectedPcSlot, setDepositTarget, swapPcSlots]
    );

    const cancelMoveMode = useCallback(() => setMovingSlot(null), []);

    const startMoveMode = useCallback(
        (source: { type: 'party' | 'box'; index: number }, name: string) => {
            setMovingSlot({ source, name });
            setSelectedPcSlot(source);
        },
        [setSelectedPcSlot]
    );

    return {
        movingSlot,
        setMovingSlot,
        startMoveMode,
        handleSlotClick,
        handleEmptySlotClick,
        cancelMoveMode
    };
}
