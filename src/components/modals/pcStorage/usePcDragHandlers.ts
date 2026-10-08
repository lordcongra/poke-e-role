import { useState, useCallback } from 'react';
import { handlePcDragStart, handlePcDrop, type PcDragItem } from '../../../utils/pc/pcDragDropUtils';

export function usePcDragHandlers(activeBoxIndex: number, swapPcSlots: (from: PcDragItem, to: PcDragItem) => void) {
    const [dragSource, setDragSource] = useState<PcDragItem | null>(null);

    const handlePartyDrop = useCallback(
        (e: React.DragEvent, targetIndex: number) => {
            handlePcDrop(e, { type: 'party', index: targetIndex }, activeBoxIndex, dragSource, swapPcSlots);
            setDragSource(null);
        },
        [activeBoxIndex, dragSource, swapPcSlots]
    );

    const handleBoxDrop = useCallback(
        (e: React.DragEvent, targetIndex: number) => {
            handlePcDrop(e, { type: 'box', index: targetIndex }, activeBoxIndex, dragSource, swapPcSlots);
            setDragSource(null);
        },
        [activeBoxIndex, dragSource, swapPcSlots]
    );

    const handlePartyDragStart = useCallback((e: React.DragEvent, index: number) => {
        handlePcDragStart(e, { type: 'party', index });
        setDragSource({ type: 'party', index });
    }, []);

    const handleBoxDragStart = useCallback((e: React.DragEvent, index: number) => {
        handlePcDragStart(e, { type: 'box', index });
        setDragSource({ type: 'box', index });
    }, []);

    const handleDragEnd = useCallback(() => setDragSource(null), []);

    return {
        dragSource,
        handlePartyDrop,
        handleBoxDrop,
        handlePartyDragStart,
        handleBoxDragStart,
        handleDragEnd
    };
}
