// src/components/HomebrewItems.tsx
import { useState, useEffect, useRef } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomItem } from '../store/storeTypes';
import { TagBuilderModal } from './TagBuilderModal';

function ItemCard({ item, role, canEdit, onRemove }: { item: CustomItem, role: string, canEdit: boolean, onRemove: () => void }) {
    const updateCustomItem = useCharacterStore(state => state.updateCustomItem);
    
    const [localName, setLocalName] = useState(item.name);
    const [localDesc, setLocalDesc] = useState(item.description);
    const [localGmOnly, setLocalGmOnly] = useState(item.gmOnly || false);
    
    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(item.name !== 'New Item');

    useEffect(() => {
        setLocalName(item.name);
        setLocalDesc(item.description);
        setLocalGmOnly(item.gmOnly || false);
    }, [item]);

    return (
        <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                <input 
                    type="text" 
                    value={localName} 
                    onChange={e => canEdit && setLocalName(e.target.value)} 
                    onBlur={() => canEdit && localName !== item.name && updateCustomItem(item.id, 'name', localName)}
                    placeholder="Item Name" 
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '6px', fontWeight: 'bold', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
                {role === 'GM' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#c62828', fontWeight: 'bold' }}>
                        <input type="checkbox" checked={localGmOnly} onChange={e => { setLocalGmOnly(e.target.checked); updateCustomItem(item.id, 'gmOnly', e.target.checked); }} />
                        GM Only
                    </label>
                )}
                {canEdit && <button onClick={() => setShowTagBuilder(true)} className="action-button action-button--dark" style={{ padding: '6px 12px' }}>🏷️ Tags</button>}
                {canEdit && <button onClick={onRemove} className="action-button action-button--red" style={{ padding: '6px 12px' }}>Delete</button>}
            </div>
            
            {!isCollapsed && (
                <textarea 
                    value={localDesc} 
                    onChange={e => canEdit && setLocalDesc(e.target.value)} 
                    onBlur={() => canEdit && localDesc !== item.description && updateCustomItem(item.id, 'description', localDesc)}
                    placeholder="Item Effect / Description and Tags" 
                    disabled={!canEdit}
                    style={{ width: '100%', height: '70px', padding: '6px', resize: 'vertical', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                />
            )}
            
            {showTagBuilder && <TagBuilderModal targetId={item.id} targetType="homebrew_item" onClose={() => setShowTagBuilder(false)} />}
        </div>
    );
}

export function HomebrewItems() {
    const role = useCharacterStore(state => state.role);
    const access = useCharacterStore(state => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomItems = useCharacterStore(state => state.roomCustomItems);
    const addCustomItem = useCharacterStore(state => state.addCustomItem);
    const removeCustomItem = useCharacterStore(state => state.removeCustomItem);
    const overwriteCustomItemData = useCharacterStore(state => state.overwriteCustomItemData);
    const mergeCustomItemData = useCharacterStore(state => state.mergeCustomItemData);

    const fileRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomItem[] | null>(null);
    const [search, setSearch] = useState('');

    const visibleItems = roomCustomItems.filter(i => role === 'GM' || !i.gmOnly);
    const filteredItems = visibleItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    const handleExport = () => {
        const dataStr = JSON.stringify(visibleItems, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pokerole_custom_items.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                if (Array.isArray(imported)) setImportData(imported);
                else if (OBR.isAvailable) OBR.notification.show("Invalid Custom Items file.", "ERROR");
            } catch(err) {
                if (OBR.isAvailable) OBR.notification.show("Failed to parse JSON.", "ERROR");
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Create custom items. These will appear in the Bag dropdown, automatically loading their tags and descriptions when selected!
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" placeholder="🔍 Search Items..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)', outline: 'none' }} />
                {canEdit && <button onClick={() => { setSearch(''); addCustomItem(); }} className="action-button action-button--dark" style={{ padding: '8px', background: '#00695C', borderColor: '#00695C', whiteSpace: 'nowrap' }}>+ Create New</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px', overscrollBehavior: 'contain' }}>
                {filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
                        {visibleItems.length === 0 ? "No custom items yet." : "No items match your search."}
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <ItemCard key={item.id} item={item} role={role} canEdit={canEdit} onRemove={() => removeCustomItem(item.id)} />
                    ))
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button onClick={handleExport} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>💾 Export Items</button>
                {canEdit && (
                    <>
                        <button onClick={() => fileRef.current?.click()} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>📂 Import Items</button>
                        <input type="file" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
                    </>
                )}
            </div>

            {importData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '400px', width: '90%', border: '2px solid #C62828', textAlign: 'center' }}>
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>How would you like to import this data? <b>Overwrite</b> will delete your existing Items. <b>Add / Merge</b> will safely combine them, updating any items with matching names.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setImportData(null)} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>Cancel</button>
                            <button onClick={() => { mergeCustomItemData(importData); setImportData(null); }} className="action-button" style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}>Add / Merge</button>
                            <button onClick={() => { overwriteCustomItemData(importData); setImportData(null); }} className="action-button action-button--red" style={{ flex: 1, padding: '8px' }}>Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}