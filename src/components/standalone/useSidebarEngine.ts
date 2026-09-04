import { useEffect, useState, useRef, useCallback } from 'react';
import { storageAdapter } from '../../utils/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId } from '../../utils/obr';
import { fetchPokemonData } from '../../utils/api';
import { imageManager } from '../../utils/imageManager';

export type TreeItem = {
    id: string;
    name: string;
    parentId: string | null;
    type: 'folder' | 'character';
    meta?: Record<string, unknown>;
    activeTrans: string;
};

interface MasterBackupData {
    type?: string;
    folders?: Record<string, unknown>[];
    characters?: Array<{ id: string; metadata: Record<string, unknown> }>;
}

export function useSidebarEngine() {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const [items, setItems] = useState<TreeItem[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768);

    const [newName, setNewName] = useState<string>('');
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const [initTags, setInitTags] = useState<Record<string, string>>({});
    const [dragOverInfo, setDragOverInfo] = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(
        null
    );
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItem } | null>(null);

    const [pendingRestoreData, setPendingRestoreData] = useState<MasterBackupData | null>(null);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();

            const customOrder = JSON.parse(localStorage.getItem('pkr_sidebar_order') || '[]') as string[];
            const orderMap = new Map<string, number>();
            customOrder.forEach((id, index) => orderMap.set(id, index));

            const combined: TreeItem[] = [
                ...flds.map((f) => ({
                    id: f.id,
                    name: f.name,
                    parentId: f.parentId,
                    type: 'folder' as const,
                    activeTrans: 'None'
                })),
                ...chars.map((c) => {
                    const metaObj = c.metadata as Record<string, unknown> | undefined;
                    const nestedState = metaObj?.state as Record<string, unknown> | undefined;
                    const nestedIdentity = nestedState?.identity as Record<string, unknown> | undefined;

                    // Safely extract the active transformation state from local storage metadata
                    const currentTrans = String(
                        metaObj?.['active-transformation'] || nestedIdentity?.activeTransformation || 'None'
                    );

                    return {
                        id: c.id,
                        name: c.name,
                        parentId: c.parentId,
                        type: 'character' as const,
                        meta: metaObj,
                        activeTrans: currentTrans
                    };
                })
            ];

            combined.sort((a, b) => {
                const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
                const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
                if (indexA !== indexB) return indexA - indexB;
                return a.name.localeCompare(b.name);
            });

            setItems(combined);
        } catch (error) {
            console.error('[SidebarEngine] Failed to load data:', error);
        }
    }, []);

    const updateInitTags = useCallback(() => {
        const savedList = localStorage.getItem('pkr_standalone_init_list');
        if (!savedList) {
            setInitTags({});
            return;
        }
        try {
            const list = JSON.parse(savedList) as { id: string; name: string }[];
            if (!Array.isArray(list)) return;

            const nameGroups: Record<string, string[]> = {};
            list.forEach((c) => {
                if (c && c.name && c.id) {
                    if (!nameGroups[c.name]) nameGroups[c.name] = [];
                    nameGroups[c.name].push(c.id);
                }
            });

            Object.values(nameGroups).forEach((ids) => ids.sort());

            const newTags: Record<string, string> = {};
            list.forEach((c) => {
                if (!c || !c.name || !c.id) return;
                const ids = nameGroups[c.name];
                if (ids && ids.length > 1) {
                    newTags[c.id] = `#${ids.indexOf(c.id) + 1}`;
                } else {
                    newTags[c.id] = 'init_active';
                }
            });
            setInitTags(newTags);
        } catch (e) {
            console.error('[SidebarEngine] Failed to parse initiative list for tags', e);
        }
    }, []);

    const handleSelectCharacter = useCallback(async (id: string, meta: Record<string, unknown>) => {
        setActiveTokenId(id);
        const store = useCharacterStore.getState();
        store.setTokenData(id, 'PLAYER');
        store.loadFromOwlbear(meta);

        if (meta['species']) {
            try {
                const data = await fetchPokemonData(String(meta['species']));
                if (data) store.refreshSpeciesData(data as Record<string, unknown>);
            } catch {
                // Ignore fetch errors
            }
        } else {
            store.applyLearnset({ Moves: [] });
        }
    }, []);

    useEffect(() => {
        loadData();
        updateInitTags();

        const handleDataChange = () => loadData();
        window.addEventListener('pkr-local-data-changed', handleDataChange);
        window.addEventListener('pkr-standalone-init-update', updateInitTags);

        const handleActiveCharStorage = async (e: StorageEvent) => {
            if (e.key === 'pkr_active_character_id' && e.newValue) {
                const chars = await storageAdapter.getLocalCharacters();
                const match = chars.find((c) => c.id === e.newValue);
                if (match) {
                    handleSelectCharacter(match.id, (match.metadata || {}) as Record<string, unknown>);
                }
            }
        };

        const handleActiveCharCustomEvent = async (e: Event) => {
            const detail = (e as CustomEvent<{ id: string }>).detail;
            if (detail?.id) {
                const chars = await storageAdapter.getLocalCharacters();
                const match = chars.find((c) => c.id === detail.id);
                if (match) {
                    handleSelectCharacter(match.id, (match.metadata || {}) as Record<string, unknown>);
                }
            }
        };

        window.addEventListener('storage', handleActiveCharStorage);
        window.addEventListener('pkr-select-character', handleActiveCharCustomEvent);

        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function (key, value) {
            originalSetItem.call(this, key, value);
            if (key.startsWith('pkr_char_') || key === 'pkr_folders') {
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        };

        const closeContextMenu = () => setContextMenu(null);
        document.addEventListener('click', closeContextMenu);

        return () => {
            window.removeEventListener('pkr-local-data-changed', handleDataChange);
            window.removeEventListener('pkr-standalone-init-update', updateInitTags);
            window.removeEventListener('storage', handleActiveCharStorage);
            window.removeEventListener('pkr-select-character', handleActiveCharCustomEvent);
            localStorage.setItem = originalSetItem;
            document.removeEventListener('click', closeContextMenu);
        };
    }, [loadData, updateInitTags, handleSelectCharacter]);

    const handleCreate = async (type: 'folder' | 'character') => {
        const finalName = newName.trim();

        try {
            if (type === 'folder') {
                await storageAdapter.createFolder(finalName || 'New Folder', null);
            } else {
                const newId = await storageAdapter.createLocalCharacter(finalName, null);
                handleSelectCharacter(newId, { nickname: finalName, parentId: null });
            }
            setNewName(''); // Clear the input box after creation
        } catch (error) {
            console.error('[SidebarEngine] Creation failed:', error);
        }
    };

    // --- CONTEXT MENU ACTIONS ---
    const handleContextMenu = (e: React.MouseEvent, item: TreeItem) => {
        e.preventDefault();
        const menuHeightEstimate = 180;
        let safeY = e.clientY;
        if (safeY + menuHeightEstimate > window.innerHeight) {
            safeY = window.innerHeight - menuHeightEstimate;
        }
        setContextMenu({ x: e.clientX, y: safeY, item });
    };

    const executeRename = async (item: TreeItem) => {
        setContextMenu(null);
        const promptName = window.prompt(`Rename ${item.type}:`, item.name);
        if (!promptName || promptName.trim() === '' || promptName === item.name) return;

        const newSafeName = promptName.trim();

        if (item.type === 'folder') {
            const flds = await storageAdapter.getFolders();
            const updated = flds.map((f) => (f.id === item.id ? { ...f, name: newSafeName } : f));
            localStorage.setItem('pkr_folders', JSON.stringify(updated));
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        } else {
            const charData = localStorage.getItem(`pkr_char_${item.id}`);
            if (charData) {
                const meta = JSON.parse(charData);
                meta.nickname = newSafeName;
                localStorage.setItem(`pkr_char_${item.id}`, JSON.stringify(meta));
                window.dispatchEvent(new Event('pkr-local-data-changed'));

                if (activeTokenId === item.id) {
                    useCharacterStore.getState().setIdentity('nickname', newSafeName);
                }
            }
        }
    };

    const executeDuplicate = async (item: TreeItem) => {
        setContextMenu(null);
        if (item.type === 'folder') return;

        try {
            const charData = localStorage.getItem(`pkr_char_${item.id}`);
            if (charData) {
                const meta = JSON.parse(charData);
                const newName = `${item.name} (Copy)`;
                meta.nickname = newName;

                const newId = await storageAdapter.createLocalCharacter(newName, item.parentId);
                localStorage.setItem(`pkr_char_${newId}`, JSON.stringify(meta));
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        } catch (error) {
            console.error('[SidebarEngine] Failed to duplicate character:', error);
        }
    };

    const executeMove = async (item: TreeItem, direction: 'up' | 'down' | 'in' | 'out') => {
        setContextMenu(null);
        const siblings = items.filter((i) => i.parentId === item.parentId);
        const currentIndex = siblings.findIndex((i) => i.id === item.id);

        if (direction === 'up' && currentIndex > 0) {
            const currentOrder = items.map((i) => i.id);
            const indexA = currentOrder.indexOf(siblings[currentIndex].id);
            const indexB = currentOrder.indexOf(siblings[currentIndex - 1].id);
            const temp = currentOrder[indexA];
            currentOrder[indexA] = currentOrder[indexB];
            currentOrder[indexB] = temp;
            localStorage.setItem('pkr_sidebar_order', JSON.stringify(currentOrder));
            loadData();
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            const currentOrder = items.map((i) => i.id);
            const indexA = currentOrder.indexOf(siblings[currentIndex].id);
            const indexB = currentOrder.indexOf(siblings[currentIndex + 1].id);
            const temp = currentOrder[indexA];
            currentOrder[indexA] = currentOrder[indexB];
            currentOrder[indexB] = temp;
            localStorage.setItem('pkr_sidebar_order', JSON.stringify(currentOrder));
            loadData();
        } else if (direction === 'in') {
            if (currentIndex > 0) {
                const prevSibling = siblings[currentIndex - 1];
                if (prevSibling.type === 'folder') {
                    if (item.type === 'folder') {
                        await storageAdapter.moveFolder(item.id, prevSibling.id);
                    } else {
                        await storageAdapter.moveItem(item.id, prevSibling.id);
                    }
                    setExpandedNodes((prev) => ({ ...prev, [prevSibling.id]: true }));
                    loadData();
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
                loadData();
            } else {
                alert('This item is already at the root level.');
            }
        }
    };

    const executeDelete = async (item: TreeItem) => {
        setContextMenu(null);
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
                        await imageManager.deleteImage(tokenImageUrl);
                    } catch (err) {
                        console.warn('[SidebarEngine] Failed to delete orphaned image:', err);
                    }
                }

                await storageAdapter.deleteLocalCharacter(item.id);
            }

            if (activeTokenId === item.id) {
                useCharacterStore.setState({ tokenId: null });
                setActiveTokenId(null);
            }
        }
    };

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // --- DRAG AND DROP HANDLERS ---
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

        if (y < rect.height * 0.25) pos = 'before';
        else if (y > rect.height * 0.75) pos = 'after';

        setDragOverInfo({ id: item.id, position: pos });
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetItem: TreeItem | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverInfo(null);

        const draggedId = e.dataTransfer.getData('itemId');
        const draggedType = e.dataTransfer.getData('itemType');

        if (!draggedId || draggedId === targetItem?.id) return;

        if (!targetItem) {
            if (draggedType === 'folder') await storageAdapter.moveFolder(draggedId, null);
            else await storageAdapter.moveItem(draggedId, null);
            return;
        }

        const position = dragOverInfo?.id === targetItem.id ? dragOverInfo.position : 'inside';

        let newParentId = targetItem.parentId;
        if (position === 'inside') {
            newParentId = targetItem.id;
        }

        if (draggedType === 'folder') await storageAdapter.moveFolder(draggedId, newParentId);
        else await storageAdapter.moveItem(draggedId, newParentId);

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

        if (position === 'inside' || newParentId) {
            setExpandedNodes((prev) => ({ ...prev, [newParentId!]: true }));
        }

        loadData();
    };

    const getDragClass = (itemId: string) => {
        if (dragOverInfo?.id !== itemId) return '';
        if (dragOverInfo.position === 'before') return 'sidebar__item--drag-before';
        if (dragOverInfo.position === 'after') return 'sidebar__item--drag-after';
        return 'sidebar__item--drag-inside';
    };

    const handleExportMasterBackup = async () => {
        const confirmed = window.confirm(
            'MASTER BACKUP NOTICE:\n\n' +
                'This will export all folders and character sheets to a JSON file.\n' +
                'Please note: Locally uploaded custom images are stored in browser storage and CANNOT be embedded into file backups. Only external image URLs will be fully preserved.\n\n' +
                'Proceed with export?'
        );
        if (!confirmed) return;

        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();
            const backup = { type: 'pokerole-master-backup', version: 1, characters: chars, folders: flds };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PokeRole_Master_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[SidebarEngine] Failed to create master backup', error);
            alert('Failed to generate Master Backup.');
        }
    };

    const handleRestoreMasterBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.type === 'pokerole-master-backup') {
                    setPendingRestoreData(data);
                } else {
                    alert('Invalid Master Backup file.');
                }
            } catch (err) {
                console.error('[SidebarEngine] Failed to read backup file:', err);
                alert('Failed to read backup file. It may be corrupted.');
            }
            if (restoreInputRef.current) restoreInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmRestoreMerge = () => {
        if (!pendingRestoreData) return;
        const data = pendingRestoreData;

        const existingFoldersStr = localStorage.getItem('pkr_folders') || '[]';
        const existingFolders = JSON.parse(existingFoldersStr) as Record<string, unknown>[];
        const folderMap = new Map(existingFolders.map((f) => [String(f.id), f]));
        (data.folders || []).forEach((f: Record<string, unknown>) => {
            folderMap.set(String(f.id), f);
        });
        localStorage.setItem('pkr_folders', JSON.stringify(Array.from(folderMap.values())));

        for (const char of data.characters || []) {
            localStorage.setItem(`pkr_char_${char.id}`, JSON.stringify(char.metadata));
        }
        window.dispatchEvent(new Event('pkr-local-data-changed'));
        setPendingRestoreData(null);
        alert('Master Backup Merged Successfully!');
    };

    const confirmRestoreOverwrite = () => {
        if (!pendingRestoreData) return;
        if (
            !window.confirm(
                'FINAL WARNING: Overwriting will delete all current local files not in the backup. Are you completely sure?'
            )
        ) {
            return;
        }

        const data = pendingRestoreData;
        localStorage.setItem('pkr_folders', JSON.stringify(data.folders || []));
        for (const char of data.characters || []) {
            localStorage.setItem(`pkr_char_${char.id}`, JSON.stringify(char.metadata));
        }
        window.dispatchEvent(new Event('pkr-local-data-changed'));
        setPendingRestoreData(null);
        alert('Master Backup Restored (Overwritten) Successfully!');
    };

    const cancelRestore = () => {
        setPendingRestoreData(null);
    };

    return {
        activeTokenId,
        items,
        isCollapsed,
        setIsCollapsed,
        newName,
        setNewName,
        expandedNodes,
        initTags,
        contextMenu,
        restoreInputRef,
        pendingRestoreData,
        handleCreate,
        handleExportMasterBackup,
        handleRestoreMasterBackup,
        confirmRestoreMerge,
        confirmRestoreOverwrite,
        cancelRestore,
        handleSelectCharacter,
        executeRename,
        executeDuplicate,
        executeMove,
        executeDelete,
        toggleExpand,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleContextMenu,
        getDragClass,
        setDragOverInfo
    };
}
