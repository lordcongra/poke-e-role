import type React from 'react';
import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';
import 'mobile-drag-drop/default.css';

let polyfillInitialized = false;

export function initMobileDragDrop(): void {
    if (polyfillInitialized || typeof window === 'undefined') return;
    try {
        polyfill({
            holdToDrag: 250,
            dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
        });
        polyfillInitialized = true;
    } catch (e) {
        console.warn('[pcDragDropUtils] Failed to initialize mobile-drag-drop polyfill:', e);
    }
}

export interface PcDragItem {
    type: 'party' | 'box';
    index: number;
    boxIndex?: number;
}

export function handlePcDragStart(e: React.DragEvent, source: PcDragItem): void {
    try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(source));
        e.dataTransfer.clearData('text/uri-list');
    } catch {}
}

export function handlePcDrop(
    e: React.DragEvent,
    target: PcDragItem,
    activeBoxIndex: number,
    dragSource: PcDragItem | null,
    swapPcSlots: (from: PcDragItem, to: PcDragItem) => void
): void {
    let source = dragSource;
    try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) source = JSON.parse(raw);
    } catch {}
    if (source) {
        swapPcSlots(
            { ...source, boxIndex: source.type === 'box' ? activeBoxIndex : undefined },
            { ...target, boxIndex: target.type === 'box' ? activeBoxIndex : undefined }
        );
    }
}
