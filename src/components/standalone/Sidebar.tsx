import { useEffect, useState, useRef } from 'react';
import { storageAdapter } from '../../utils/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId } from '../../utils/obr';
import { fetchPokemonData } from '../../utils/api';
import { imageManager } from '../../utils/imageManager';
import './Sidebar.css';

type TreeItem = {
    id: string;
    name: string;
    parentId: string | null;
    type: 'folder' | 'character';
    meta?: Record<string, unknown>;
};

export function Sidebar() {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const [items, setItems] = useState<TreeItem[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const [newName, setNewName] = useState<string>('');
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    // Feature 1: Initiative Tags state
    const [initTags, setInitTags] = useState<Record<string, string>>({});

    // Feature 2: Drag and Drop Reordering state
    const [dragOverInfo, setDragOverInfo] = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(
        null
    );

    // --- Context Menu State ---
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItem } | null>(null);

    const restoreInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
        updateInitTags();

        const handleDataChange = () => loadData();
        window.addEventListener('pkr-local-data-changed', handleDataChange);
        window.addEventListener('pkr-standalone-init-update', updateInitTags);

        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function (key, value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            originalSetItem.apply(this, [key, value] as any);
            if (key.startsWith('pkr_char_') || key === 'pkr_folders') {
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        };

        // Close context menu when clicking outside
        const closeContextMenu = () => setContextMenu(null);
        document.addEventListener('click', closeContextMenu);

        return () => {
            window.removeEventListener('pkr-local-data-changed', handleDataChange);
            window.removeEventListener('pkr-standalone-init-update', updateInitTags);
            localStorage.setItem = originalSetItem;
            document.removeEventListener('click', closeContextMenu);
        };
    }, []);

    const updateInitTags = () => {
        const savedList = localStorage.getItem('pkr_standalone_init_list');
        if (!savedList) {
            setInitTags({});
            return;
        }
        try {
            const list = JSON.parse(savedList);
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
                    newTags[c.id] = '⚔️';
                }
            });
            setInitTags(newTags);
        } catch (e) {
            console.error('[Sidebar] Failed to parse initiative list for tags', e);
        }
    };

    const loadData = async () => {
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();

            const customOrder = JSON.parse(localStorage.getItem('pkr_sidebar_order') || '[]') as string[];
            const orderMap = new Map<string, number>();
            customOrder.forEach((id, index) => orderMap.set(id, index));

            const combined: TreeItem[] = [
                ...flds.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId, type: 'folder' as const })),
                ...chars.map((c) => ({
                    id: c.id,
                    name: c.name,
                    parentId: c.parentId,
                    type: 'character' as const,
                    meta: c.metadata
                }))
            ];

            combined.sort((a, b) => {
                const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
                const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
                if (indexA !== indexB) return indexA - indexB;
                return a.name.localeCompare(b.name);
            });

            setItems(combined);
        } catch (error) {
            console.error('[Sidebar] Failed to load data:', error);
        }
    };

    const handleSelectCharacter = async (id: string, meta: Record<string, unknown>) => {
        setActiveTokenId(id);
        const store = useCharacterStore.getState();
        store.setTokenData(id, 'PLAYER');
        store.loadFromOwlbear(meta);

        if (meta['species']) {
            try {
                const data = await fetchPokemonData(String(meta['species']));
                if (data) store.refreshSpeciesData(data as Record<string, unknown>);
            } catch (error) {
                // Ignore fetch errors
            }
        } else {
            store.applyLearnset({ Moves: [] });
        }
    };

    const handleCreate = async (type: 'folder' | 'character') => {
        if (!newName.trim()) return;
        try {
            if (type === 'folder') {
                await storageAdapter.createFolder(newName, null);
            } else {
                const newId = await storageAdapter.createLocalCharacter(newName, null);
                handleSelectCharacter(newId, { nickname: newName, parentId: null });
            }
            setNewName('');
        } catch (error) {
            console.error('[Sidebar] Creation failed:', error);
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
            console.error('[Sidebar] Failed to duplicate character:', error);
        }
    };

    const executeMove = (item: TreeItem, direction: 'up' | 'down') => {
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
                        console.warn('[Sidebar] Failed to delete orphaned image:', err);
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

        // Target top 25% for 'before', bottom 25% for 'after', middle 50% for 'inside'
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

        // Dropping into root directory
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

        // Move item to new logical parent in storage
        if (draggedType === 'folder') await storageAdapter.moveFolder(draggedId, newParentId);
        else await storageAdapter.moveItem(draggedId, newParentId);

        // Manage explicit visual sorting
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
            console.error('[Sidebar] Failed to create master backup', error);
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
                    if (!window.confirm('WARNING: This will OVERWRITE your entire local directory! Proceed?')) return;

                    localStorage.setItem('pkr_folders', JSON.stringify(data.folders || []));
                    for (const char of data.characters || []) {
                        localStorage.setItem(`pkr_char_${char.id}`, JSON.stringify(char.metadata));
                    }
                    window.dispatchEvent(new Event('pkr-local-data-changed'));
                    alert('Master Backup Restored Successfully!');
                } else {
                    alert('Invalid Master Backup file.');
                }
            } catch (err) {
                alert('Failed to read backup file. It may be corrupted.');
            }
            if (restoreInputRef.current) restoreInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const renderTree = (parentId: string | null, depth = 0) => {
        const children = items.filter((i) => i.parentId === parentId);
        if (children.length === 0) return null;

        return children.map((item) => {
            const hasChildren = items.some((i) => i.parentId === item.id);
            const isExpanded = expandedNodes[item.id];
            const initTag = initTags[item.id];

            return (
                <div key={item.id} className="sidebar__node">
                    <div
                        className={`sidebar__item ${activeTokenId === item.id ? 'sidebar__item--active' : ''} ${getDragClass(item.id)}`}
                        style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, item)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, item)}
                        onClick={() => {
                            if (item.type === 'character') handleSelectCharacter(item.id, item.meta!);
                            else setExpandedNodes((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                        <div className="sidebar__item-content">
                            {hasChildren ? (
                                <span className="sidebar__caret" onClick={(e) => toggleExpand(e, item.id)}>
                                    {isExpanded ? '▼' : '▶'}
                                </span>
                            ) : (
                                <span className="sidebar__caret-empty" />
                            )}

                            <span className="sidebar__item-icon">{item.type === 'folder' ? '📁' : '📄'}</span>
                            <span className="sidebar__item-name">{item.name}</span>

                            {/* Feature 1 UI: Render the badge if it is in the tracker */}
                            {initTag && (
                                <span
                                    className={`sidebar__init-badge ${initTag === '⚔️' ? 'sidebar__init-badge--combat' : ''}`}
                                >
                                    {initTag}
                                </span>
                            )}
                        </div>
                        <button
                            className="sidebar__delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                executeDelete(item);
                            }}
                            title="Delete"
                        >
                            🗑️
                        </button>
                    </div>
                    {isExpanded && renderTree(item.id, depth + 1)}
                </div>
            );
        });
    };

    if (isCollapsed) {
        return (
            <div className="sidebar sidebar--collapsed">
                <button className="sidebar__toggle-btn" onClick={() => setIsCollapsed(false)}>
                    ☰
                </button>
            </div>
        );
    }

    return (
        <div className="sidebar">
            <div className="sidebar__header">
                <h2 className="sidebar__title">Directory</h2>
                <button className="sidebar__toggle-btn" onClick={() => setIsCollapsed(true)}>
                    ◀
                </button>
            </div>

            <div className="sidebar__create-panel">
                <div className="sidebar__create-row">
                    <input
                        type="text"
                        className="sidebar__input"
                        placeholder="New Name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate('character');
                        }}
                    />
                </div>
                <div className="sidebar__create-row">
                    <button className="sidebar__btn sidebar__btn--folder" onClick={() => handleCreate('folder')}>
                        📁 Add Folder
                    </button>
                    <button className="sidebar__btn sidebar__btn--char" onClick={() => handleCreate('character')}>
                        📄 Add Sheet
                    </button>
                </div>
                <div className="sidebar__create-row sidebar__backup-row">
                    <button
                        className="sidebar__btn sidebar__btn--backup"
                        onClick={handleExportMasterBackup}
                        title="Export all folders and characters"
                    >
                        💾 Backup
                    </button>
                    <button
                        className="sidebar__btn sidebar__btn--restore"
                        onClick={() => restoreInputRef.current?.click()}
                        title="Restore from a Master Backup file"
                    >
                        📂 Restore
                    </button>
                    <input
                        type="file"
                        ref={restoreInputRef}
                        onChange={handleRestoreMasterBackup}
                        accept=".json"
                        className="sidebar__hidden-input"
                    />
                </div>
            </div>

            <div
                className="sidebar__tree"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, null)}
                onMouseLeave={() => setDragOverInfo(null)}
            >
                {renderTree(null, 0)}

                {items.length === 0 && <p className="sidebar__empty">Directory is empty. Create a file above!</p>}
                <div className="sidebar__dropzone-root">Drop here to move to Root</div>
            </div>

            {/* Custom Right-Click Context Menu */}
            {contextMenu && (
                <div
                    className="sidebar__context-menu"
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="sidebar__context-item" onClick={() => executeRename(contextMenu.item)}>
                        ✏️ Rename
                    </button>

                    {/* Quick Move Operations */}
                    <button className="sidebar__context-item" onClick={() => executeMove(contextMenu.item, 'up')}>
                        ⬆️ Move Up
                    </button>
                    <button className="sidebar__context-item" onClick={() => executeMove(contextMenu.item, 'down')}>
                        ⬇️ Move Down
                    </button>

                    {contextMenu.item.type === 'character' && (
                        <button className="sidebar__context-item" onClick={() => executeDuplicate(contextMenu.item)}>
                            📄 Duplicate
                        </button>
                    )}

                    <button
                        className="sidebar__context-item sidebar__context-item--danger"
                        onClick={() => executeDelete(contextMenu.item)}
                    >
                        🗑️ Delete
                    </button>
                </div>
            )}
        </div>
    );
}
