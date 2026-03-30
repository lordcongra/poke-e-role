// src/components/HomebrewPokemon.tsx
import { useState, useEffect, useRef } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomPokemon } from '../store/storeTypes';
import { ALL_ABILITIES, ALL_MOVES } from '../utils/api';
import { NumberSpinner } from './NumberSpinner';

const POKEMON_TYPES = ['', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const TYPE_COLORS: Record<string, string> = { 'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030', 'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0', 'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820', 'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848', 'Steel': '#B8B8D0', 'Fairy': '#EE99AC' };
const RANKS = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion', 'Other'];

function LearnsetMoveRow({ pId, mIndex, move, currentMoves }: { pId: string, mIndex: number, move: {Learned: string, Name: string}, currentMoves: Array<{Learned: string, Name: string}> }) {
    const updateCustomPokemon = useCharacterStore(state => state.updateCustomPokemon);
    const [localName, setLocalName] = useState(move.Name);

    useEffect(() => { setLocalName(move.Name); }, [move.Name]);

    const handleRemove = () => {
        const newMoves = [...currentMoves];
        newMoves.splice(mIndex, 1);
        updateCustomPokemon(pId, 'Moves', newMoves);
    };

    const handleBlur = () => {
        if (localName !== move.Name) {
            const newMoves = [...currentMoves];
            newMoves[mIndex] = { ...newMoves[mIndex], Name: localName };
            updateCustomPokemon(pId, 'Moves', newMoves);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            <input 
                type="text" 
                value={localName} 
                onChange={e => setLocalName(e.target.value)} 
                onBlur={handleBlur} 
                list="hb-move-list"
                placeholder="Move Name" 
                style={{ flex: 1, padding: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }} 
            />
            <button onClick={handleRemove} className="action-button action-button--red" style={{ padding: '0 6px' }}>X</button>
        </div>
    );
}

function PokemonCard({ p, allTypes, allTypeColors, abilityOptions, moveOptions, onRemove }: { p: CustomPokemon, allTypes: string[], allTypeColors: Record<string, string>, abilityOptions: string[], moveOptions: string[], onRemove: () => void }) {
    const updateCustomPokemon = useCharacterStore(state => state.updateCustomPokemon);

    const [localName, setLocalName] = useState(p.Name);
    const [localAb1, setLocalAb1] = useState(p.Ability1);
    const [localAb2, setLocalAb2] = useState(p.Ability2);
    const [localHA, setLocalHA] = useState(p.HiddenAbility);
    const [localEA, setLocalEA] = useState(p.EventAbilities);
    
    const [isCollapsed, setIsCollapsed] = useState(p.Name !== 'New Pokemon');

    useEffect(() => {
        setLocalName(p.Name); setLocalAb1(p.Ability1); setLocalAb2(p.Ability2);
        setLocalHA(p.HiddenAbility); setLocalEA(p.EventAbilities);
    }, [p]);

    const addLearnsetMove = (rank: string) => {
        updateCustomPokemon(p.id, 'Moves', [...p.Moves, { Learned: rank, Name: '' }]);
    };

    const renderStatInput = (label: string, baseField: keyof CustomPokemon, maxField: keyof CustomPokemon, baseVal: number, maxVal: number) => {
        const isHp = baseField === maxField;
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--row-even)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 'bold' }}>Base</span>
                        <div style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                            <NumberSpinner value={baseVal} onChange={v => updateCustomPokemon(p.id, baseField, v)} min={0} />
                        </div>
                    </div>
                    {!isHp && (
                        <>
                            <span style={{ color: 'var(--text-muted)', marginTop: '10px', fontWeight: 'bold' }}>/</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 'bold' }}>Limit</span>
                                <div style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                                    <NumberSpinner value={maxVal} onChange={v => updateCustomPokemon(p.id, maxField, v)} min={0} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ background: 'var(--panel-alt)', border: '2px solid var(--primary)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                <input 
                    type="text" 
                    value={localName} 
                    onChange={e => setLocalName(e.target.value)} 
                    onBlur={() => localName !== p.Name && updateCustomPokemon(p.id, 'Name', localName)}
                    placeholder="Pokémon Species Name" 
                    style={{ flex: 1, padding: '6px', fontWeight: 'bold', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
                <button onClick={onRemove} className="action-button action-button--red" style={{ padding: '6px 12px' }}>Delete</button>
            </div>
            
            {!isCollapsed && (
                <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select 
                            value={p.Type1} 
                            onChange={e => updateCustomPokemon(p.id, 'Type1', e.target.value)} 
                            style={{ flex: 1, padding: '4px', background: allTypeColors[p.Type1] || 'var(--input-bg)', color: p.Type1 && p.Type1 !== 'None' ? 'white' : 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 'bold', textShadow: p.Type1 ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none' }}
                        >
                            {allTypes.map(t => <option key={`t1-${t}`} value={t}>{t || '-- Type 1 --'}</option>)}
                        </select>
                        <select 
                            value={p.Type2} 
                            onChange={e => updateCustomPokemon(p.id, 'Type2', e.target.value)} 
                            style={{ flex: 1, padding: '4px', background: allTypeColors[p.Type2] || 'var(--input-bg)', color: p.Type2 && p.Type2 !== 'None' ? 'white' : 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 'bold', textShadow: p.Type2 ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none' }}
                        >
                            {allTypes.map(t => <option key={`t2-${t}`} value={t}>{t || '-- Type 2 --'}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {renderStatInput('HP', 'BaseHP', 'BaseHP', p.BaseHP, p.BaseHP)}
                        {renderStatInput('STR', 'Strength', 'MaxStrength', p.Strength, p.MaxStrength)}
                        {renderStatInput('DEX', 'Dexterity', 'MaxDexterity', p.Dexterity, p.MaxDexterity)}
                        {renderStatInput('VIT', 'Vitality', 'MaxVitality', p.Vitality, p.MaxVitality)}
                        {renderStatInput('SPE', 'Special', 'MaxSpecial', p.Special, p.MaxSpecial)}
                        {renderStatInput('INS', 'Insight', 'MaxInsight', p.Insight, p.MaxInsight)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input type="text" list="hb-ability-list" value={localAb1} onChange={e => setLocalAb1(e.target.value)} onBlur={() => localAb1 !== p.Ability1 && updateCustomPokemon(p.id, 'Ability1', localAb1)} placeholder="Ability 1" style={{ padding: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <input type="text" list="hb-ability-list" value={localAb2} onChange={e => setLocalAb2(e.target.value)} onBlur={() => localAb2 !== p.Ability2 && updateCustomPokemon(p.id, 'Ability2', localAb2)} placeholder="Ability 2" style={{ padding: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <input type="text" list="hb-ability-list" value={localHA} onChange={e => setLocalHA(e.target.value)} onBlur={() => localHA !== p.HiddenAbility && updateCustomPokemon(p.id, 'HiddenAbility', localHA)} placeholder="Hidden Ability" style={{ padding: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }} />
                        <input type="text" list="hb-ability-list" value={localEA} onChange={e => setLocalEA(e.target.value)} onBlur={() => localEA !== p.EventAbilities && updateCustomPokemon(p.id, 'EventAbilities', localEA)} placeholder="Event Ability" style={{ padding: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }} />
                        
                        <datalist id="hb-ability-list">
                            {abilityOptions.map(a => <option key={a} value={a} />)}
                        </datalist>
                        <datalist id="hb-move-list">
                            {moveOptions.map(m => <option key={m} value={m} />)}
                        </datalist>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>Learnset Categories</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                            {RANKS.map(rank => {
                                const movesInRank = p.Moves.map((m, i) => ({ m, i })).filter(x => x.m.Learned === rank);
                                return (
                                    <div key={rank} style={{ background: 'var(--row-odd)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>{rank}</div>
                                        {movesInRank.map(({ m, i }) => (
                                            <LearnsetMoveRow key={i} pId={p.id} mIndex={i} move={m} currentMoves={p.Moves} />
                                        ))}
                                        <button onClick={() => addLearnsetMove(rank)} className="action-button action-button--dark" style={{ padding: '2px 6px', fontSize: '0.75rem', marginTop: '2px' }}>+ Add {rank} Move</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export function HomebrewPokemon() {
    const roomCustomPokemon = useCharacterStore(state => state.roomCustomPokemon);
    const roomCustomTypes = useCharacterStore(state => state.roomCustomTypes);
    const roomCustomAbilities = useCharacterStore(state => state.roomCustomAbilities);
    const roomCustomMoves = useCharacterStore(state => state.roomCustomMoves);
    const addCustomPokemon = useCharacterStore(state => state.addCustomPokemon);
    const removeCustomPokemon = useCharacterStore(state => state.removeCustomPokemon);
    const overwriteCustomPokemonData = useCharacterStore(state => state.overwriteCustomPokemonData);
    const mergeCustomPokemonData = useCharacterStore(state => state.mergeCustomPokemonData);

    const allTypes = [...POKEMON_TYPES, ...roomCustomTypes.map(t => t.name)];
    const allTypeColors = { ...TYPE_COLORS, ...Object.fromEntries(roomCustomTypes.map(t => [t.name, t.color])) };
    
    const abilityOptions = [...ALL_ABILITIES, ...roomCustomAbilities.map(a => a.name)];
    const moveOptions = [...ALL_MOVES, ...roomCustomMoves.map(m => m.name)];

    const fileRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomPokemon[] | null>(null);
    const [search, setSearch] = useState('');

    const handleExport = () => {
        const dataStr = JSON.stringify(roomCustomPokemon, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pokerole_custom_pokemon.json";
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
                else if (OBR.isAvailable) OBR.notification.show("Invalid Custom Pokémon file.", "ERROR");
            } catch(err) {
                if (OBR.isAvailable) OBR.notification.show("Failed to parse JSON.", "ERROR");
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const filteredPokemon = roomCustomPokemon.filter(p => p.Name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Create custom Pokémon or Boss monsters. Entering their name in the Character Identity panel will automatically build their sheet.
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" placeholder="🔍 Search Pokémon..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)', outline: 'none' }} />
                <button onClick={() => { setSearch(''); addCustomPokemon(); }} className="action-button action-button--dark" style={{ padding: '8px', background: '#8E24AA', borderColor: '#8E24AA', whiteSpace: 'nowrap' }}>+ Create New</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flex: 1, paddingRight: '4px', overscrollBehavior: 'contain' }}>
                {filteredPokemon.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
                        {roomCustomPokemon.length === 0 ? "No custom Pokémon yet." : "No Pokémon match your search."}
                    </div>
                ) : (
                    filteredPokemon.map(p => (
                        <PokemonCard key={p.id} p={p} allTypes={allTypes} allTypeColors={allTypeColors} abilityOptions={abilityOptions} moveOptions={moveOptions} onRemove={() => removeCustomPokemon(p.id)} />
                    ))
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button onClick={handleExport} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>💾 Export Pokémon</button>
                <button onClick={() => fileRef.current?.click()} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>📂 Import Pokémon</button>
                <input type="file" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
            </div>

            {/* AUDIT FIX: 3-Button Smart Merge Modal! */}
            {importData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '400px', width: '90%', border: '2px solid #C62828', textAlign: 'center' }}>
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>How would you like to import this data? <b>Overwrite</b> will delete your existing Pokémon. <b>Add / Merge</b> will safely combine them, updating any items with matching names.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setImportData(null)} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>Cancel</button>
                            <button onClick={() => { mergeCustomPokemonData(importData); setImportData(null); }} className="action-button" style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}>Add / Merge</button>
                            <button onClick={() => { overwriteCustomPokemonData(importData); setImportData(null); }} className="action-button action-button--red" style={{ flex: 1, padding: '8px' }}>Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}