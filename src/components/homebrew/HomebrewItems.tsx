import { useState, useRef, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { loadLocalDataset } from '../../utils/api';
import type { CustomItem } from '../../store/storeTypes';
import { HomebrewItemCard } from './HomebrewItemCard';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { Plus, Save, FolderOpen, AlertTriangle } from 'lucide-react';
import './Homebrew.css';

export function HomebrewItems() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const addCustomItem = useCharacterStore((state) => state.addCustomItem);
    const removeCustomItem = useCharacterStore((state) => state.removeCustomItem);
    const duplicateCustomItem = useCharacterStore((state) => state.duplicateCustomItem);
    const overwriteCustomItemData = useCharacterStore((state) => state.overwriteCustomItemData);
    const mergeCustomItemData = useCharacterStore((state) => state.mergeCustomItemData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomItem[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    useEffect(() => {
        loadLocalDataset().then((index) => {
            if (!index) return;
            const categories = new Set<string>();
            Object.values(index.items).forEach((pocketObj) => {
                Object.keys(pocketObj).forEach((cat) => categories.add(cat));
            });
            roomCustomItems.forEach((i) => categories.add(i.category || 'Misc'));
            setAvailableCategories(Array.from(categories).sort());
        });
    }, [roomCustomItems]);

    const visibleItems = roomCustomItems.filter((item) => role === 'GM' || !item.gmOnly);
    const filteredItems = visibleItems.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleExport = () => {
        const dataString = JSON.stringify(visibleItems, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_items.json';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            try {
                const imported = JSON.parse(fileEvent.target?.result as string);
                if (Array.isArray(imported)) {
                    setImportData(imported);
                } else if (OBR.isAvailable) {
                    OBR.notification.show('Invalid Custom Items file.', 'ERROR');
                }
            } catch (error) {
                console.error('[HomebrewItems] Failed to parse items JSON:', error);
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc text-subtext">
                Create custom items. These will appear in the Bag dropdown, automatically loading their tags and
                descriptions when selected!
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="Search Items..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input"
                />
                {canEdit && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            addCustomItem();
                        }}
                        className="action-button action-button--dark homebrew-list__create-btn"
                    >
                        <Plus size={16} /> Create New
                    </button>
                )}
            </div>

            <datalist id="homebrew-categories-list">
                {availableCategories.map((cat) => (
                    <option key={cat} value={cat} />
                ))}
            </datalist>

            <div className="homebrew-list__scroll-area">
                {filteredItems.length === 0 ? (
                    <div className="homebrew-list__empty text-subtext" style={{ fontStyle: 'italic' }}>
                        {visibleItems.length === 0 ? 'No custom items yet.' : 'No items match your search.'}
                    </div>
                ) : (
                    filteredItems.map((item) => (
                        <HomebrewItemCard
                            key={item.id}
                            item={item}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomItem(item.id)}
                            onDuplicate={() => duplicateCustomItem(item.id)}
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    <Save size={16} /> Export Items
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            <FolderOpen size={16} /> Import Items
                        </button>
                        <input
                            type="file"
                            ref={fileReference}
                            onChange={handleImport}
                            className="homebrew-file-input"
                            accept=".json"
                        />
                    </>
                )}
            </div>

            {importData && (
                <div className="homebrew-import__overlay">
                    <div className="homebrew-import__content">
                        <h3
                            className="homebrew-import__title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Import
                        </h3>
                        <p className="homebrew-import__text text-subtext">
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Items.{' '}
                            <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div className="homebrew-import__actions">
                            <button
                                onClick={() => setImportData(null)}
                                className="action-button action-button--dark homebrew-import__btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeCustomItemData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomItemData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--red homebrew-import__btn"
                            >
                                Overwrite
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
