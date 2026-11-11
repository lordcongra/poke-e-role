import { useCallback } from 'react';
import { storageAdapter, markDataChanged } from '@/utils/sync/storageAdapter';
import { METADATA_ID } from '@/utils/sync/obr';
import { imageManager } from '@/utils/graphics/imageManager';
import type { TreeItem } from './sidebarTypes';

interface UseSidebarTreeCrudProps {
    items: TreeItem[];
    newName: string;
    setNewName: (name: string) => void;
    onLoadData: () => Promise<void>;
    onCloseContextMenu: () => void;
    onExpandNode: (id: string) => void;
    onSelectCharacter: (id: string, meta: Record<string, unknown>) => void;
    onClearActiveSheetIfMatch: (id: string) => void;
    onUpdateActiveIdentityNickname: (id: string, newName: string) => void;
    onSyncFolderRename: (id: string, oldName: string, newName: string) => void;
    onSyncCharacterRename: (id: string, newName: string) => void;
    onSyncMoveToPc: (id: string, newParentId: string | null) => void;
    onCleanUpPcOnDelete: (item: TreeItem) => void;
}

export function useSidebarTreeCrud({
    items,
    newName,
    setNewName,
    onLoadData,
    onCloseContextMenu,
    onExpandNode,
    onSelectCharacter,
    onClearActiveSheetIfMatch,
    onUpdateActiveIdentityNickname,
    onSyncFolderRename,
    onSyncCharacterRename,
    onSyncMoveToPc,
    onCleanUpPcOnDelete
}: UseSidebarTreeCrudProps) {
    const handleCreate = useCallback(
        async (type: 'folder' | 'character') => {
            const finalName = newName.trim();
            try {
                if (type === 'folder') {
                    await storageAdapter.createFolder(finalName || 'New Folder', null);
                } else {
                    const newId = await storageAdapter.createLocalCharacter(finalName, null);
                    onSelectCharacter(newId, { nickname: finalName, parentId: null, rank: 'Starter' });
                }
                setNewName('');
            } catch (error) {
                console.error('[SidebarEngine] Creation failed:', error);
            }
        },
        [newName, setNewName, onSelectCharacter]
    );

    const executeRename = useCallback(
        async (item: TreeItem) => {
            onCloseContextMenu();
            const promptName = window.prompt(`Rename ${item.type}:`, item.name);
            if (!promptName || promptName.trim() === '' || promptName === item.name) return;

            const newSafeName = promptName.trim();
            if (item.type === 'folder') {
                await storageAdapter.renameFolder(item.id, newSafeName);
                onSyncFolderRename(item.id, item.name, newSafeName);
            } else {
                await storageAdapter.saveCharacter(item.id, { nickname: newSafeName }, METADATA_ID);
                onUpdateActiveIdentityNickname(item.id, newSafeName);
                onSyncCharacterRename(item.id, newSafeName);
            }
        },
        [onCloseContextMenu, onSyncFolderRename, onUpdateActiveIdentityNickname, onSyncCharacterRename]
    );

    const executeDuplicate = useCallback(
        async (item: TreeItem) => {
            onCloseContextMenu();
            if (item.type === 'folder') return;
            try {
                const charData = localStorage.getItem(`pkr_char_${item.id}`);
                if (charData) {
                    const meta = JSON.parse(charData);
                    const duplicatedName = `${item.name} (Copy)`;
                    meta.nickname = duplicatedName;
                    const newId = await storageAdapter.createLocalCharacter(duplicatedName, item.parentId);
                    localStorage.setItem(`pkr_char_${newId}`, JSON.stringify(meta));
                    window.dispatchEvent(new Event('pkr-local-data-changed'));
                }
            } catch (error) {
                console.error('[SidebarEngine] Failed to duplicate character:', error);
            }
        },
        [onCloseContextMenu]
    );

    const executeMove = useCallback(
        async (item: TreeItem, direction: 'up' | 'down' | 'in' | 'out') => {
            onCloseContextMenu();
            const siblings = items.filter((i) => i.parentId === item.parentId);
            const currentIndex = siblings.findIndex((i) => i.id === item.id);

            if (direction === 'up' && currentIndex > 0) {
                const currentOrder = items.map((i) => i.id);
                const indexA = currentOrder.indexOf(siblings[currentIndex].id);
                const indexB = currentOrder.indexOf(siblings[currentIndex - 1].id);
                [currentOrder[indexA], currentOrder[indexB]] = [currentOrder[indexB], currentOrder[indexA]];
                localStorage.setItem('pkr_sidebar_order', JSON.stringify(currentOrder));
                markDataChanged();
                await onLoadData();
            } else if (direction === 'down' && currentIndex < siblings.length - 1) {
                const currentOrder = items.map((i) => i.id);
                const indexA = currentOrder.indexOf(siblings[currentIndex].id);
                const indexB = currentOrder.indexOf(siblings[currentIndex + 1].id);
                [currentOrder[indexA], currentOrder[indexB]] = [currentOrder[indexB], currentOrder[indexA]];
                localStorage.setItem('pkr_sidebar_order', JSON.stringify(currentOrder));
                markDataChanged();
                await onLoadData();
            } else if (direction === 'in') {
                if (currentIndex > 0) {
                    const prevSibling = siblings[currentIndex - 1];
                    if (prevSibling.type === 'folder') {
                        if (item.type === 'folder') {
                            await storageAdapter.moveFolder(item.id, prevSibling.id);
                        } else {
                            await storageAdapter.moveItem(item.id, prevSibling.id);
                            onSyncMoveToPc(item.id, prevSibling.id);
                        }
                        onExpandNode(prevSibling.id);
                        await onLoadData();
                    } else {
                        alert('You can only move an item "Into" a folder positioned directly above it.');
                    }
                } else {
                    alert('There is no folder above this item to move into.');
                }
            } else if (direction === 'out') {
                if (item.parentId !== null) {
                    const parentFolder = items.find((i) => i.id === item.parentId);
                    const grandParentId = parentFolder ? parentFolder.parentId : null;
                    if (item.type === 'folder') {
                        await storageAdapter.moveFolder(item.id, grandParentId);
                    } else {
                        await storageAdapter.moveItem(item.id, grandParentId);
                    }
                    await onLoadData();
                } else {
                    alert('This item is already at the root level.');
                }
            }
        },
        [items, onCloseContextMenu, onLoadData, onSyncMoveToPc, onExpandNode]
    );

    const executeDelete = useCallback(
        async (item: TreeItem) => {
            onCloseContextMenu();
            if (window.confirm(`Delete ${item.type} "${item.name}"? (Nested items will be moved to root)`)) {
                if (item.type === 'folder') {
                    await storageAdapter.deleteFolder(item.id);
                } else {
                    let tokenImageUrl = '';
                    if (item.meta) {
                        if (typeof item.meta['token-image-url'] === 'string') {
                            tokenImageUrl = item.meta['token-image-url'];
                        } else if (typeof item.meta['tokenImageUrl'] === 'string') {
                            tokenImageUrl = item.meta['tokenImageUrl'];
                        } else if (item.meta.state && (item.meta.state as Record<string, unknown>).identity) {
                            const identity = (item.meta.state as Record<string, unknown>).identity as Record<
                                string,
                                unknown
                            >;
                            if (identity && typeof identity.tokenImageUrl === 'string') {
                                tokenImageUrl = identity.tokenImageUrl;
                            }
                        }
                    }

                    if (tokenImageUrl && tokenImageUrl.startsWith('local-img:')) {
                        try {
                            await imageManager.deleteImage(tokenImageUrl, item.id);
                        } catch (err) {
                            console.warn('[SidebarEngine] Failed to delete orphaned image:', err);
                        }
                    }

                    await storageAdapter.deleteLocalCharacter(item.id);
                    onCleanUpPcOnDelete(item);
                }

                onClearActiveSheetIfMatch(item.id);
            }
        },
        [onCloseContextMenu, onCleanUpPcOnDelete, onClearActiveSheetIfMatch]
    );

    return {
        handleCreate,
        executeRename,
        executeDuplicate,
        executeMove,
        executeDelete
    };
}

