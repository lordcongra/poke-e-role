import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/storeTypes';
import { HomebrewItemCard } from './HomebrewItemCard';
import './Homebrew.css';

export function HomebrewItems() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const addCustomItem = useCharacterStore((state) => state.addCustomItem);
    const removeCustomItem = useCharacterStore((state) => state.removeCustomItem);
    const overwriteCustomItemData = useCharacterStore((state) => state.overwriteCustomItemData);
    const mergeCustomItemData = useCharacterStore((state) => state.mergeCustomItemData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomItem[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

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
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc">
                Create custom items. These will appear in the Bag dropdown, automatically loading their tags and
                descriptions when selected!
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="🔍 Search Items..."
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
                        + Create New
                    </button>
                )}
            </div>

            <div className="homebrew-list__scroll-area">
                {filteredItems.length === 0 ? (
                    <div className="homebrew-list__empty">
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
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button
                    onClick={handleExport}
                    className="action-button action-button--dark homebrew-list__footer-btn"
                >
                    💾 Export Items
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            📂 Import Items
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
                        <h3 className="homebrew-import__title">⚠️ Confirm Import</h3>
                        <p className="homebrew-import__text">
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