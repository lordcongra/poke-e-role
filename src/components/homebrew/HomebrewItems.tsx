import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/storeTypes';
import { HomebrewItemCard } from './HomebrewItemCard';

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Create custom items. These will appear in the Bag dropdown, automatically loading their tags and
                descriptions when selected!
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="🔍 Search Items..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-main)',
                        outline: 'none'
                    }}
                />
                {canEdit && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            addCustomItem();
                        }}
                        className="action-button action-button--dark"
                        style={{ padding: '8px', background: '#00695C', borderColor: '#00695C', whiteSpace: 'nowrap' }}
                    >
                        + Create New
                    </button>
                )}
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflowY: 'auto',
                    flex: 1,
                    paddingRight: '4px',
                    overscrollBehavior: 'contain'
                }}
            >
                {filteredItems.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem',
                            padding: '20px'
                        }}
                    >
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

            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: 'auto',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '10px'
                }}
            >
                <button
                    onClick={handleExport}
                    className="action-button action-button--dark"
                    style={{ flex: 1, padding: '8px' }}
                >
                    💾 Export Items
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark"
                            style={{ flex: 1, padding: '8px' }}
                        >
                            📂 Import Items
                        </button>
                        <input
                            type="file"
                            ref={fileReference}
                            onChange={handleImport}
                            style={{ display: 'none' }}
                            accept=".json"
                        />
                    </>
                )}
            </div>

            {importData && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1300,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '400px',
                            width: '90%',
                            border: '2px solid #C62828',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Items.{' '}
                            <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setImportData(null)}
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '8px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeCustomItemData(importData);
                                    setImportData(null);
                                }}
                                className="action-button"
                                style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomItemData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '8px' }}
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
