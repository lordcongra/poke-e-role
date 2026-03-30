// src/components/HomebrewMoves.tsx
import { useState, useEffect, useRef } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomMove } from '../store/storeTypes';
import { CombatStat, Skill } from '../types/enums';
import { TagBuilderModal } from './TagBuilderModal';
import { NumberSpinner } from './NumberSpinner';

const POKEMON_TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const TYPE_COLORS: Record<string, string> = { 'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030', 'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0', 'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820', 'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848', 'Steel': '#B8B8D0', 'Fairy': '#EE99AC' };

function MoveCard({ move, allTypes, allTypeColors, role, canEdit, onRemove }: { move: CustomMove, allTypes: string[], allTypeColors: Record<string, string>, role: string, canEdit: boolean, onRemove: () => void }) {
    const updateCustomMove = useCharacterStore(state => state.updateCustomMove);
    
    const [localName, setLocalName] = useState(move.name);
    const [localDesc, setLocalDesc] = useState(move.desc);
    const [localGmOnly, setLocalGmOnly] = useState(move.gmOnly || false);
    
    const [isCollapsed, setIsCollapsed] = useState(move.name !== 'New Move');
    const [showTagBuilder, setShowTagBuilder] = useState(false);

    useEffect(() => {
        setLocalName(move.name);
        setLocalDesc(move.desc);
        setLocalGmOnly(move.gmOnly || false);
    }, [move]);

    return (
        <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                <input 
                    type="text" 
                    value={localName} 
                    onChange={e => canEdit && setLocalName(e.target.value)} 
                    onBlur={() => canEdit && localName !== move.name && updateCustomMove(move.id, 'name', localName)}
                    placeholder="Move Name" 
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '6px', fontWeight: 'bold', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
                {role === 'GM' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#c62828', fontWeight: 'bold' }}>
                        <input type="checkbox" checked={localGmOnly} onChange={e => { setLocalGmOnly(e.target.checked); updateCustomMove(move.id, 'gmOnly', e.target.checked); }} />
                        GM Only
                    </label>
                )}
                {canEdit && <button onClick={() => setShowTagBuilder(true)} className="action-button action-button--dark" style={{ padding: '6px 12px' }}>🏷️ Tags</button>}
                {canEdit && <button onClick={onRemove} className="action-button action-button--red" style={{ padding: '6px 12px' }}>Delete</button>}
            </div>
            
            {!isCollapsed && (
                <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select 
                            value={move.type} 
                            onChange={e => canEdit && updateCustomMove(move.id, 'type', e.target.value)} 
                            disabled={!canEdit}
                            style={{ flex: 1, padding: '4px', background: allTypeColors[move.type] || 'var(--input-bg)', color: move.type && move.type !== 'None' ? 'white' : 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 'bold', textShadow: move.type && move.type !== 'None' ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none' }}
                        >
                            <option value="">-- Type --</option>
                            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={move.category} onChange={e => canEdit && updateCustomMove(move.id, 'category', e.target.value as 'Physical' | 'Special' | 'Status')} disabled={!canEdit} style={{ flex: 1, padding: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                            <option value="Physical">Physical</option>
                            <option value="Special">Special</option>
                            <option value="Status">Status</option>
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', background: 'var(--input-bg)' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Power:</span>
                            <NumberSpinner value={move.power} onChange={v => canEdit && updateCustomMove(move.id, 'power', v)} disabled={!canEdit} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--row-odd)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Accuracy:</span>
                        <select value={move.acc1} onChange={e => canEdit && updateCustomMove(move.id, 'acc1', e.target.value)} disabled={!canEdit} style={{ flex: 1, padding: '2px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                            {Object.values(CombatStat).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                            <option value="will">WILL</option>
                        </select>
                        <span>+</span>
                        <select value={move.acc2} onChange={e => canEdit && updateCustomMove(move.id, 'acc2', e.target.value)} disabled={!canEdit} style={{ flex: 1, padding: '2px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                            <option value="none">-- None --</option>
                            {Object.values(Skill).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--row-odd)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Damage:</span>
                        <select value={move.dmg1} onChange={e => canEdit && updateCustomMove(move.id, 'dmg1', e.target.value)} disabled={!canEdit} style={{ flex: 1, padding: '2px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                            <option value="">-- None --</option>
                            {Object.values(CombatStat).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <textarea 
                        value={localDesc} 
                        onChange={e => canEdit && setLocalDesc(e.target.value)} 
                        onBlur={() => canEdit && localDesc !== move.desc && updateCustomMove(move.id, 'desc', localDesc)}
                        placeholder="Move Description / Effects" 
                        disabled={!canEdit}
                        style={{ width: '100%', height: '50px', padding: '6px', resize: 'vertical', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                    />
                </>
            )}
            
            {showTagBuilder && <TagBuilderModal targetId={move.id} targetType="homebrew_move" onClose={() => setShowTagBuilder(false)} />}
        </div>
    );
}

export function HomebrewMoves() {
    const role = useCharacterStore(state => state.role);
    const access = useCharacterStore(state => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomMoves = useCharacterStore(state => state.roomCustomMoves);
    const roomCustomTypes = useCharacterStore(state => state.roomCustomTypes);
    const addCustomMove = useCharacterStore(state => state.addCustomMove);
    const removeCustomMove = useCharacterStore(state => state.removeCustomMove);
    const overwriteCustomMoveData = useCharacterStore(state => state.overwriteCustomMoveData);
    const mergeCustomMoveData = useCharacterStore(state => state.mergeCustomMoveData);

    const filteredTypes = roomCustomTypes.filter(t => role === 'GM' || !t.gmOnly);
    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map(t => t.name)];
    const allTypeColors = { ...TYPE_COLORS, ...Object.fromEntries(filteredTypes.map(t => [t.name, t.color])) };

    const fileRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomMove[] | null>(null);
    const [search, setSearch] = useState('');

    const visibleMoves = roomCustomMoves.filter(m => role === 'GM' || !m.gmOnly);
    const filteredMoves = visibleMoves.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

    const handleExport = () => {
        const dataStr = JSON.stringify(visibleMoves, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pokerole_custom_moves.json";
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
                else if (OBR.isAvailable) OBR.notification.show("Invalid Custom Moves file.", "ERROR");
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
                Create custom moves. These will appear in the move dropdowns and automatically populate their formulas when selected.
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" placeholder="🔍 Search Moves..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)', outline: 'none' }} />
                {canEdit && <button onClick={() => { setSearch(''); addCustomMove(); }} className="action-button action-button--dark" style={{ padding: '8px', background: '#00695C', borderColor: '#00695C', whiteSpace: 'nowrap' }}>+ Create New</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px', overscrollBehavior: 'contain' }}>
                {filteredMoves.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
                        {visibleMoves.length === 0 ? "No custom moves yet." : "No moves match your search."}
                    </div>
                ) : (
                    filteredMoves.map(move => (
                        <MoveCard key={move.id} move={move} allTypes={allTypes} allTypeColors={allTypeColors} role={role} canEdit={canEdit} onRemove={() => removeCustomMove(move.id)} />
                    ))
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button onClick={handleExport} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>💾 Export Moves</button>
                {canEdit && (
                    <>
                        <button onClick={() => fileRef.current?.click()} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>📂 Import Moves</button>
                        <input type="file" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
                    </>
                )}
            </div>

            {importData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '400px', width: '90%', border: '2px solid #C62828', textAlign: 'center' }}>
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>How would you like to import this data? <b>Overwrite</b> will delete your existing Moves. <b>Add / Merge</b> will safely combine them, updating any items with matching names.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setImportData(null)} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>Cancel</button>
                            <button onClick={() => { mergeCustomMoveData(importData); setImportData(null); }} className="action-button" style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}>Add / Merge</button>
                            <button onClick={() => { overwriteCustomMoveData(importData); setImportData(null); }} className="action-button action-button--red" style={{ flex: 1, padding: '8px' }}>Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}