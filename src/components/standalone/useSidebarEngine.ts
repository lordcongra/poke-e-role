import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { storageAdapter, markDataChanged, hasUnbackedData, BACKUP_STATUS_EVENT } from '../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId } from '../../utils/sync/obr';
import { fetchPokemonData } from '../../utils/api/api';
import { imageManager } from '../../utils/graphics/imageManager';
import { useSidebarTouchDrag, type TouchDragOverInfo } from './useSidebarTouchDrag';
import { setItemArt } from '../../utils/graphics/itemArtCatalog';
import {
    organizeTrainerSidebarFolders,
    syncSidebarFolderRenameToPc,
    syncSidebarCharacterRenameToPc,
    syncSidebarMoveToPc,
    isTrainerMetadata,
    autoHealTrainerBeltPokemon
} from '../../utils/pc/pcSidebarSync';
import { useSidebarBackup } from './useSidebarBackup';

export type TreeItem = {
    id: string;
    name: string;
    parentId: string | null;
    type: 'folder' | 'character';
    meta?: Record<string, unknown>;
    activeTrans: string;
};

export function useSidebarEngine() {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const pcData = useCharacterStore((state) => state.pcData);
    const openPcModal = useCharacterStore((state) => state.openPcModal);
    const switchTrainer = useCharacterStore((state) => state.switchTrainer);

    const [items, setItems] = useState<TreeItem[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768);

    const [newName, setNewName] = useState<string>('');
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const [initTags, setInitTags] = useState<Record<string, string>>({});
    const [dragOverInfo, setDragOverInfo] = useState<TouchDragOverInfo | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItem } | null>(null);
    const treeContainerRef = useRef<HTMLDivElement | null>(null);

    const {
        isBackupModalOpen,
        setIsBackupModalOpen,
        hasUnbackedChanges,
        setHasUnbackedChanges,
        pendingRestoreData,
        restoreInputRef,
        handleExportMasterBackup,
        confirmExportMasterBackup,
        handleRestoreMasterBackup,
        confirmRestoreMerge,
        confirmRestoreOverwrite,
        cancelRestore
    } = useSidebarBackup();

    // Map of entityId -> active Belt slot number and Trainer name
    const partyMemberMap = useMemo(() => {
        const map: Record<string, { trainerName: string; slotNumber: number }> = {};
        if (!pcData?.campaigns) return map;
        const summaries = pcData.pokemonSummaries || {};
        for (const camp of Object.values(pcData.campaigns)) {
            for (const tr of Object.values(camp.trainers)) {
                if (!tr.party) continue;
                tr.party.forEach((entityId, idx) => {
                    if (entityId) {
                        map[entityId] = { trainerName: tr.name, slotNumber: idx + 1 };
                        const sum = summaries[entityId];
                        if (sum) {
                            if (sum.savedTokenItem?.id) {
                                map[sum.savedTokenItem.id] = { trainerName: tr.name, slotNumber: idx + 1 };
                            }
                            if (sum.mapTokenId) {
                                map[sum.mapTokenId] = { trainerName: tr.name, slotNumber: idx + 1 };
                            }
                            if (sum.name) {
                                map[`__name_${sum.name.trim().toLowerCase()}`] = {
                                    trainerName: tr.name,
                                    slotNumber: idx + 1
                                };
                            }
                            if (sum.species) {
                                map[`__species_${sum.species.trim().toLowerCase()}`] = {
                                    trainerName: tr.name,
                                    slotNumber: idx + 1
                                };
                            }
                        }
                    }
                });
            }
        }
        return map;
    }, [pcData]);

    const loadData = useCallback(async () => {
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();
            await autoHealTrainerBeltPokemon(chars, flds, useCharacterStore.getState().pcData);

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
            setHasUnbackedChanges(hasUnbackedData(chars.length, flds.length));
        } catch (error) {
            console.error('[SidebarEngine] Failed to load data:', error);
        }
    }, [setHasUnbackedChanges]);

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
        store.setTokenData(id, 'GM');
        store.loadFromOwlbear(meta);

        // Harvest any item artwork from selected character into catalog
        const rawInv = meta['inv-data'];
        if (typeof rawInv === 'string') {
            try {
                const items = JSON.parse(rawInv);
                if (Array.isArray(items)) {
                    for (const it of items) {
                        if (it?.name && it?.imageUrl) {
                            setItemArt(it.name, it.imageUrl);
                        }
                    }
                }
            } catch {
                // Ignore parse errors
            }
        }

        if (meta['species']) {
            try {
                const data = await fetchPokemonData(String(meta['species']));
                if (data) store.refreshSpeciesData(data as Record<string, unknown>, false);
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

        const handleDataChange = () => {
            loadData();
            updateInitTags();
        };
        window.addEventListener('pkr-local-data-changed', handleDataChange);
        window.addEventListener('pkr-standalone-init-update', updateInitTags);

        const handleActiveCharStorage = async (e: StorageEvent) => {
            if (e.key === 'pkr_active_char_id' && e.newValue) {
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
            if (key.startsWith('pkr_char_') || key === 'pkr_folders' || key.includes('pkr_pc_storage')) {
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        };

        const handleBackupStatus = async () => {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const flds = await storageAdapter.getFolders();
                setHasUnbackedChanges(hasUnbackedData(chars.length, flds.length));
            } catch (err) {
                console.error('[SidebarEngine] Failed to check backup status:', err);
            }
        };
        window.addEventListener(BACKUP_STATUS_EVENT, handleBackupStatus);

        const closeContextMenu = () => setContextMenu(null);
        document.addEventListener('click', closeContextMenu);

        return () => {
            window.removeEventListener('pkr-local-data-changed', handleDataChange);
            window.removeEventListener('pkr-standalone-init-update', updateInitTags);
            window.removeEventListener(BACKUP_STATUS_EVENT, handleBackupStatus);
            window.removeEventListener('storage', handleActiveCharStorage);
            window.removeEventListener('pkr-select-character', handleActiveCharCustomEvent);
            localStorage.setItem = originalSetItem;
            document.removeEventListener('click', closeContextMenu);
        };
    }, [loadData, updateInitTags, handleSelectCharacter, setHasUnbackedChanges]);

    const handleCreate = async (type: 'folder' | 'character') => {
        const finalName = newName.trim();

        try {
            if (type === 'folder') {
                await storageAdapter.createFolder(finalName || 'New Folder', null);
            } else {
                const newId = await storageAdapter.createLocalCharacter(finalName, null);
                handleSelectCharacter(newId, { nickname: finalName, parentId: null });
            }
            setNewName('');
        } catch (error) {
            console.error('[SidebarEngine] Creation failed:', error);
        }
    };

    // --- CONTEXT MENU ACTIONS ---
    const openContextMenuAt = useCallback((clientX: number, clientY: number, item: TreeItem) => {
        const menuHeightEstimate = 220;
        const menuWidthEstimate = 180;
        let safeY = clientY;
        let safeX = clientX;
        if (safeY + menuHeightEstimate > window.innerHeight) {
            safeY = Math.max(10, window.innerHeight - menuHeightEstimate);
        }
        if (safeX + menuWidthEstimate > window.innerWidth) {
            safeX = Math.max(10, window.innerWidth - menuWidthEstimate);
        }
        setContextMenu({ x: safeX, y: safeY, item });
    }, []);

    const handleContextMenu = (e: React.MouseEvent, item: TreeItem) => {
        e.preventDefault();
        openContextMenuAt(e.clientX, e.clientY, item);
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
            markDataChanged();
            window.dispatchEvent(new Event('pkr-local-data-changed'));

            syncSidebarFolderRenameToPc(item.id, item.name, newSafeName, useCharacterStore.getState().pcData).catch(
                console.warn
            );
        } else {
            const charData = localStorage.getItem(`pkr_char_${item.id}`);
            if (charData) {
                const meta = JSON.parse(charData);
                meta.nickname = newSafeName;
                localStorage.setItem(`pkr_char_${item.id}`, JSON.stringify(meta));
                markDataChanged();
                window.dispatchEvent(new Event('pkr-local-data-changed'));

                if (activeTokenId === item.id) {
                    useCharacterStore.getState().setIdentity('nickname', newSafeName);
                }

                syncSidebarCharacterRenameToPc(item.id, newSafeName, useCharacterStore.getState().pcData).catch(
                    console.warn
                );
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
            markDataChanged();
            loadData();
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            const currentOrder = items.map((i) => i.id);
            const indexA = currentOrder.indexOf(siblings[currentIndex].id);
            const indexB = currentOrder.indexOf(siblings[currentIndex + 1].id);
            const temp = currentOrder[indexA];
            currentOrder[indexA] = currentOrder[indexB];
            currentOrder[indexB] = temp;
            localStorage.setItem('pkr_sidebar_order', JSON.stringify(currentOrder));
            markDataChanged();
            loadData();
        } else if (direction === 'in') {
            if (currentIndex > 0) {
                const prevSibling = siblings[currentIndex - 1];
                if (prevSibling.type === 'folder') {
                    if (item.type === 'folder') {
                        await storageAdapter.moveFolder(item.id, prevSibling.id);
                    } else {
                        await storageAdapter.moveItem(item.id, prevSibling.id);
                        syncSidebarMoveToPc(item.id, prevSibling.id, useCharacterStore.getState().pcData).catch(
                            console.warn
                        );
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
                        await imageManager.deleteImage(tokenImageUrl, item.id);
                    } catch (err) {
                        console.warn('[SidebarEngine] Failed to delete orphaned image:', err);
                    }
                }

                await storageAdapter.deleteLocalCharacter(item.id);
                // Clean up from PC storage if it was stored in party or box
                useCharacterStore.getState().deletePokemonFromPc(item.id);
            }

            if (activeTokenId === item.id) {
                useCharacterStore.setState({ tokenId: null });
                setActiveTokenId(null);
                useCharacterStore.getState().loadFromOwlbear({});
            }
        }
    };

    const handleOrganizeTrainerFolders = async (item: TreeItem) => {
        setContextMenu(null);
        if (item.type !== 'character' || !isTrainerMetadata(item.meta)) return;

        const camp = pcData.campaigns[pcData.activeCampaignId];
        if (!camp) return;

        let matchedTrainer = Object.values(camp.trainers).find(
            (t) =>
                t.id === item.id ||
                t.savedTokenItem?.id === item.id ||
                t.mapTokenId === item.id ||
                t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );

        if (!matchedTrainer) {
            matchedTrainer = {
                id: item.id,
                name: item.name,
                party: [null, null, null, null, null, null],
                boxes: [{ id: `box_1_${Date.now()}`, name: 'Box 1', slots: new Array(30).fill(null) }]
            };
            useCharacterStore.getState().addTrainer(item.name);
        }

        const activeBoxes =
            matchedTrainer.boxes && matchedTrainer.boxes.length > 0 ? matchedTrainer.boxes : camp.boxes || [];
        const res = await organizeTrainerSidebarFolders(matchedTrainer, activeBoxes);
        if (res.success) {
            setExpandedNodes((prev) => ({ ...prev, [item.id]: true }));
            loadData();
            alert(
                `Organized folders for ${item.name}!\n` +
                    (res.createdBelt ? '• Created Belt folder\n' : '') +
                    (res.createdBoxes > 0 ? `• Created ${res.createdBoxes} Box folder(s)\n` : '') +
                    `• Moved ${res.movedPokemonCount} Pokémon sheet(s) into their matching folders.`
            );
        } else {
            alert(`Unable to organize folders for ${item.name}. Please ensure Pokémon are assigned in PC Storage.`);
        }
    };

    const handleOpenPc = (item: TreeItem) => {
        setContextMenu(null);
        const camp = pcData.campaigns[pcData.activeCampaignId];
        if (camp) {
            let matchedTrainer = Object.values(camp.trainers).find(
                (t) =>
                    t.id === item.id ||
                    t.savedTokenItem?.id === item.id ||
                    t.mapTokenId === item.id ||
                    t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
            );
            if (!matchedTrainer) {
                useCharacterStore.getState().addTrainer(item.name);
                const updatedCamp =
                    useCharacterStore.getState().pcData.campaigns[useCharacterStore.getState().pcData.activeCampaignId];
                matchedTrainer = Object.values(updatedCamp?.trainers || {}).find(
                    (t) => t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
            }
            if (matchedTrainer) {
                switchTrainer(matchedTrainer.id);
            }
        }
        openPcModal();
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

        if (item.type === 'folder') {
            // Folders give a generous inside drop target so dropping onto a folder nests items inside
            if (y < rect.height * 0.15) pos = 'before';
            else if (y > rect.height * 0.85) pos = 'after';
            else pos = 'inside';
        } else {
            // Characters can never nest other characters inside them; only allow before or after
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
                loadData();
                return;
            }

            let newParentId = targetItem.parentId;
            // Dropping a character onto a folder ALWAYS moves the character inside that folder
            if (targetItem.type === 'folder' && (position === 'inside' || draggedType === 'character')) {
                newParentId = targetItem.id;
                position = 'inside';
            } else if (targetItem.type === 'character') {
                // Characters can NEVER be parent containers for other characters
                newParentId = targetItem.parentId;
            }

            if (draggedType === 'folder') await storageAdapter.moveFolder(draggedId, newParentId);
            else {
                await storageAdapter.moveItem(draggedId, newParentId);
                syncSidebarMoveToPc(draggedId, newParentId, useCharacterStore.getState().pcData).catch(console.warn);
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
                setExpandedNodes((prev) => ({ ...prev, [newParentId!]: true }));
            }

            loadData();
        },
        [loadData]
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
        onOpenContextMenu: openContextMenuAt,
        onCloseContextMenu: () => setContextMenu(null),
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

    const characterCount = items.filter((i) => i.type === 'character').length;
    const folderCount = items.filter((i) => i.type === 'folder').length;

    return {
        activeTokenId,
        items,
        characterCount,
        folderCount,
        isCollapsed,
        setIsCollapsed,
        newName,
        setNewName,
        expandedNodes,
        initTags,
        contextMenu,
        partyMemberMap,
        isBackupModalOpen,
        setIsBackupModalOpen,
        hasUnbackedChanges,
        restoreInputRef,
        pendingRestoreData,
        handleCreate,
        handleExportMasterBackup,
        confirmExportMasterBackup,
        handleRestoreMasterBackup,
        confirmRestoreMerge,
        confirmRestoreOverwrite,
        cancelRestore,
        handleSelectCharacter,
        handleOrganizeTrainerFolders,
        handleOpenPc,
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
        closeContextMenu: () => setContextMenu(null),
        getDragClass,
        setDragOverInfo,
        dragOverInfo,
        treeContainerRef,
        liftedItemId,
        touchGhostItem,
        touchGhostPos,
        isTouchDragActive,
        handleItemTouchStart,
        isClickBlocked
    };
}
