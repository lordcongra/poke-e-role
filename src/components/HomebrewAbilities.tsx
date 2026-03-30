// src/components/HomebrewAbilities.tsx
import { useState, useEffect, useRef } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomAbility } from '../store/storeTypes';
import { TagBuilderModal } from './TagBuilderModal';

function AbilityCard({ ability, role, canEdit, onRemove }: { ability: CustomAbility, role: string, canEdit: boolean, onRemove: () => void }) {
    const updateCustomAbility = useCharacterStore(state => state.updateCustomAbility);
    
    const [localName, setLocalName] = useState(ability.name);
    const [localDesc, setLocalDesc] = useState(ability.description);
    const [localEffect, setLocalEffect] = useState(ability.effect);
    const [localGmOnly, setLocalGmOnly] = useState(ability.gmOnly || false);
    
    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(ability.name !== 'New Ability');

    useEffect(() => {
        setLocalName(ability.name);
        setLocalDesc(ability.description);
        setLocalEffect(ability.effect);
        setLocalGmOnly(ability.gmOnly || false);
    }, [ability]);

    return (
        <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                <input 
                    type="text" 
                    value={localName} 
                    onChange={e => canEdit && setLocalName(e.target.value)} 
                    onBlur={() => canEdit && localName !== ability.name && updateCustomAbility(ability.id, 'name', localName)}
                    placeholder="Ability Name" 
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '6px', fontWeight: 'bold', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
                {role === 'GM' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#c62828', fontWeight: 'bold' }}>
                        <input type="checkbox" checked={localGmOnly} onChange={e => { setLocalGmOnly(e.target.checked); updateCustomAbility(ability.id, 'gmOnly', e.target.checked); }} />
                        GM Only
                    </label>
                )}
                {canEdit && <button onClick={() => setShowTagBuilder(true)} className="action-button action-button--dark" style={{ padding: '6px 12px' }}>🏷️ Tags</button>}
                {canEdit && <button onClick={onRemove} className="action-button action-button--red" style={{ padding: '6px 12px' }}>Delete</button>}
            </div>
            
            {!isCollapsed && (
                <>
                    <textarea 
                        value={localDesc} 
                        onChange={e => canEdit && setLocalDesc(e.target.value)} 
                        onBlur={() => canEdit && localDesc !== ability.description && updateCustomAbility(ability.id, 'description', localDesc)}
                        placeholder="Flavor Text / Description" 
                        disabled={!canEdit}
                        style={{ width: '100%', height: '50px', padding: '6px', resize: 'vertical', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                    />
                    <textarea 
                        value={localEffect} 
                        onChange={e => canEdit && setLocalEffect(e.target.value)} 
                        onBlur={() => canEdit && localEffect !== ability.effect && updateCustomAbility(ability.id, 'effect', localEffect)}
                        placeholder="Mechanical Effect (e.g. [Str +2])" 
                        disabled={!canEdit}
                        style={{ width: '100%', height: '50px', padding: '6px', resize: 'vertical', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                    />
                </>
            )}
            
            {showTagBuilder && <TagBuilderModal targetId={ability.id} targetType="homebrew_ability" onClose={() => setShowTagBuilder(false)} />}
        </div>
    );
}

export function HomebrewAbilities() {
    const role = useCharacterStore(state => state.role);
    const access = useCharacterStore(state => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomAbilities = useCharacterStore(state => state.roomCustomAbilities);
    const addCustomAbility = useCharacterStore(state => state.addCustomAbility);
    const removeCustomAbility = useCharacterStore(state => state.removeCustomAbility);
    const overwriteCustomAbilityData = useCharacterStore(state => state.overwriteCustomAbilityData);
    const mergeCustomAbilityData = useCharacterStore(state => state.mergeCustomAbilityData);

    const fileRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomAbility[] | null>(null);
    const [search, setSearch] = useState('');

    const visibleAbilities = roomCustomAbilities.filter(a => role === 'GM' || !a.gmOnly);
    const filteredAbilities = visibleAbilities.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    const handleExport = () => {
        const dataStr = JSON.stringify(visibleAbilities, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pokerole_custom_abilities.json";
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
                else if (OBR.isAvailable) OBR.notification.show("Invalid Custom Abilities file.", "ERROR");
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
                Create custom abilities. When players assign these to their sheets, your custom descriptions and tags will automatically appear!
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" placeholder="🔍 Search Abilities..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)', outline: 'none' }} />
                {canEdit && <button onClick={() => { setSearch(''); addCustomAbility(); }} className="action-button action-button--dark" style={{ padding: '8px', background: '#00695C', borderColor: '#00695C', whiteSpace: 'nowrap' }}>+ Create New</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px', overscrollBehavior: 'contain' }}>
                {filteredAbilities.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
                        {visibleAbilities.length === 0 ? "No custom abilities yet." : "No abilities match your search."}
                    </div>
                ) : (
                    filteredAbilities.map(ability => (
                        <AbilityCard key={ability.id} ability={ability} role={role} canEdit={canEdit} onRemove={() => removeCustomAbility(ability.id)} />
                    ))
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button onClick={handleExport} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>💾 Export Abilities</button>
                {canEdit && (
                    <>
                        <button onClick={() => fileRef.current?.click()} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>📂 Import Abilities</button>
                        <input type="file" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
                    </>
                )}
            </div>

            {importData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '400px', width: '90%', border: '2px solid #C62828', textAlign: 'center' }}>
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>How would you like to import this data? <b>Overwrite</b> will delete your existing Abilities. <b>Add / Merge</b> will safely combine them, updating any items with matching names.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setImportData(null)} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>Cancel</button>
                            <button onClick={() => { mergeCustomAbilityData(importData); setImportData(null); }} className="action-button" style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}>Add / Merge</button>
                            <button onClick={() => { overwriteCustomAbilityData(importData); setImportData(null); }} className="action-button action-button--red" style={{ flex: 1, padding: '8px' }}>Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}