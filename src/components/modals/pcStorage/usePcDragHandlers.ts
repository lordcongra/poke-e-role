import { useState, useCallback } from 'react';
import { handlePcDragStart, handlePcDrop, type PcDragItem } from '../../../utils/pc/pcDragDropUtils';

export function usePcDragHandlers(
    activeBoxIndex: number,
    swapPcSlots: (from: PcDragItem, to: PcDragItem) => void,
    partySlots?: (string | null)[],
    currentBoxSlots?: (string | null)[]
) {
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

    const handleTabDrop = useCallback(
        (e: React.DragEvent, targetTab: 'party' | 'box') => {
            let source = dragSource;
            try {
                const raw = e.dataTransfer.getData('application/json');
                if (raw) source = JSON.parse(raw);
            } catch {}
            if (!source) return;

            if (targetTab === 'party' && source.type === 'box') {
                const emptyIdx = partySlots ? partySlots.findIndex((s) => s === null) : -1;
                const targetIndex = emptyIdx !== -1 ? emptyIdx : 0;
                swapPcSlots(
                    { type: 'box', index: source.index, boxIndex: source.boxIndex ?? activeBoxIndex },
                    { type: 'party', index: targetIndex }
                );
                setDragSource(null);
            } else if (targetTab === 'box' && source.type === 'party') {
                const emptyIdx = currentBoxSlots ? currentBoxSlots.findIndex((s) => s === null) : -1;
                const targetIndex = emptyIdx !== -1 ? emptyIdx : 0;
                swapPcSlots(
                    { type: 'party', index: source.index },
                    { type: 'box', index: targetIndex, boxIndex: activeBoxIndex }
                );
                setDragSource(null);
            }
        },
        [activeBoxIndex, currentBoxSlots, dragSource, partySlots, swapPcSlots]
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
        handleTabDrop,
        handlePartyDragStart,
        handleBoxDragStart,
        handleDragEnd
    };
}
