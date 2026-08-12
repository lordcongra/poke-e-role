import React, { useEffect, useState } from 'react';
import { storageAdapter } from '../../utils/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { setActiveTokenId } from '../../utils/obr';
import { fetchPokemonData } from '../../utils/api';
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();

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
            } catch (error) {}
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
            loadData();
        } catch (error) {
            console.error('[Sidebar] Creation failed:', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, item: TreeItem) => {
        e.stopPropagation();
        if (window.confirm(`Delete ${item.type} "${item.name}"? (Nested items will be moved to root)`)) {
            if (item.type === 'folder') await storageAdapter.deleteFolder(item.id);
            else await storageAdapter.deleteLocalCharacter(item.id);

            if (activeTokenId === item.id) {
                useCharacterStore.setState({ tokenId: null });
                setActiveTokenId(null);
            }
            loadData();
        }
    };

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // --- DRAG AND DROP ---
    const handleDragStart = (e: React.DragEvent, item: TreeItem) => {
        e.dataTransfer.setData('itemId', item.id);
        e.dataTransfer.setData('itemType', item.type);
    };

    const handleDrop = async (e: React.DragEvent, targetParentId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = e.dataTransfer.getData('itemId');
        const itemType = e.dataTransfer.getData('itemType');

        if (itemId && itemId !== targetParentId) {
            if (itemType === 'folder') await storageAdapter.moveFolder(itemId, targetParentId);
            else await storageAdapter.moveItem(itemId, targetParentId);

            if (targetParentId) {
                setExpandedNodes((prev) => ({ ...prev, [targetParentId]: true }));
            }
            loadData();
        }
    };

    const renderTree = (parentId: string | null, depth = 0) => {
        const children = items.filter((i) => i.parentId === parentId);
        if (children.length === 0) return null;

        return children.map((item) => {
            const hasChildren = items.some((i) => i.parentId === item.id);
            const isExpanded = expandedNodes[item.id];

            return (
                <div key={item.id} className="sidebar__node">
                    <div
                        className={`sidebar__item ${activeTokenId === item.id ? 'sidebar__item--active' : ''}`}
                        style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onClick={() => {
                            if (item.type === 'character') handleSelectCharacter(item.id, item.meta!);
                            else setExpandedNodes((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                        }}
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
                        </div>
                        <button className="sidebar__delete-btn" onClick={(e) => handleDelete(e, item)}>
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
            </div>

            <div className="sidebar__tree" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, null)}>
                {renderTree(null, 0)}

                {items.length === 0 && <p className="sidebar__empty">Directory is empty. Create a file above!</p>}
                <div className="sidebar__dropzone-root">Drop here to move to Root</div>
            </div>
        </div>
    );
}
