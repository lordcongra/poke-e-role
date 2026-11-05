import { useState, useRef, useCallback } from 'react';
import { storageAdapter, markDataChanged } from '@/utils/sync/storageAdapter';
import { useSidebarTouchDrag, type TouchDragOverInfo } from './useSidebarTouchDrag';
import type { TreeItem } from './sidebarTypes';

interface UseSidebarDragOpsProps {
    items: TreeItem[];
    onLoadData: () => Promise<void>;
    onSyncMoveToPc: (itemId: string, newParentId: string | null) => void;
    onOpenContextMenu: (x: number, y: number, item: TreeItem) => void;
    onCloseContextMenu: () => void;
    onExpandNode: (id: string) => void;
}

export function useSidebarDragOps({
    items,
    onLoadData,
    onSyncMoveToPc,
    onOpenContextMenu,
    onCloseContextMenu,
    onExpandNode
}: UseSidebarDragOpsProps) {
    const [dragOverInfo, setDragOverInfo] = useState<TouchDragOverInfo | null>(null);
    const treeContainerRef = useRef<HTMLDivElement | null>(null);

    const handleDragStart = (e: React.DragEvent, item: TreeItem) => {
        e.dataTransfer.setData('itemId', item.id);
        e.dataTransfer.setData('itemType', item.type);
    };

    const handleDragOver = (e: React.DragEvent, item: TreeItem) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;

        let pos: 'before' | 'after' | 'inside' = 'inside';

        if (item.type === 'folder') {
            if (y < rect.height * 0.15) pos = 'before';
            else if (y > rect.height * 0.85) pos = 'after';
            else pos = 'inside';
        } else {
            pos = y < rect.height * 0.5 ? 'before' : 'after';
        }

        setDragOverInfo({ id: item.id, position: pos });
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const executeMoveItem = useCallback(
        async (
            draggedId: string,
            draggedType: 'folder' | 'character',
            targetItem: TreeItem | null,
            position: 'before' | 'after' | 'inside' = 'inside'
        ) => {
            if (!draggedId || draggedId === targetItem?.id) return;

            if (!targetItem) {
                if (draggedType === 'folder') await storageAdapter.moveFolder(draggedId, null);
                else await storageAdapter.moveItem(draggedId, null);
                markDataChanged();
                await onLoadData();
                return;
            }

            let newParentId = targetItem.parentId;
            if (targetItem.type === 'folder' && (position === 'inside' || draggedType === 'character')) {
                newParentId = targetItem.id;
                position = 'inside';
            } else if (targetItem.type === 'character') {
                newParentId = targetItem.parentId;
            }

            if (draggedType === 'folder') {
                await storageAdapter.moveFolder(draggedId, newParentId);
            } else {
                await storageAdapter.moveItem(draggedId, newParentId);
                onSyncMoveToPc(draggedId, newParentId);
            }

            const currentOrder = JSON.parse(localStorage.getItem('pkr_sidebar_order') || '[]') as string[];
            const filteredOrder = currentOrder.filter((id) => id !== draggedId);

            if (position === 'inside') {
                filteredOrder.push(draggedId);
            } else {
                let targetIndex = filteredOrder.indexOf(targetItem.id);
                if (targetIndex === -1) {
                    filteredOrder.push(targetItem.id);
                    targetIndex = filteredOrder.indexOf(targetItem.id);
                }
                if (position === 'after') targetIndex += 1;
                filteredOrder.splice(targetIndex, 0, draggedId);
            }

            localStorage.setItem('pkr_sidebar_order', JSON.stringify(filteredOrder));
            markDataChanged();

            if (position === 'inside' || newParentId) {
                onExpandNode(newParentId!);
            }

            await onLoadData();
        },
        [onLoadData, onSyncMoveToPc, onExpandNode]
    );

    const handleDrop = async (e: React.DragEvent, targetItem: TreeItem | null) => {
        e.preventDefault();
        e.stopPropagation();
        const position =
            dragOverInfo && targetItem && dragOverInfo.id === targetItem.id ? dragOverInfo.position : 'inside';
        setDragOverInfo(null);

        const draggedId = e.dataTransfer.getData('itemId');
        const draggedType = e.dataTransfer.getData('itemType') as 'folder' | 'character';

        if (!draggedId) return;
        await executeMoveItem(draggedId, draggedType, targetItem, position);
    };

    const {
        liftedItemId,
        touchGhostItem,
        touchGhostPos,
        isDragActive: isTouchDragActive,
        handleItemTouchStart,
        isClickBlocked
    } = useSidebarTouchDrag({
        items,
        treeContainerRef,
        onDropItem: executeMoveItem,
        onOpenContextMenu,
        onCloseContextMenu,
        dragOverInfo,
        setDragOverInfo
    });

    const getDragClass = (itemId: string) => {
        if (liftedItemId === itemId) return 'sidebar__item--lifted';
        if (dragOverInfo?.id !== itemId) return '';
        if (dragOverInfo.position === 'before') return 'sidebar__item--drag-before';
        if (dragOverInfo.position === 'after') return 'sidebar__item--drag-after';
        return 'sidebar__item--drag-inside';
    };

    return {
        dragOverInfo,
        setDragOverInfo,
        treeContainerRef,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        getDragClass,
        executeMoveItem,
        liftedItemId,
        touchGhostItem,
        touchGhostPos,
        isTouchDragActive,
        handleItemTouchStart,
        isClickBlocked
    };
}

