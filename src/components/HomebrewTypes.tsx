// src/components/HomebrewTypes.tsx
import { useState, useRef } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomType } from '../store/storeTypes';

const BASE_TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

export function HomebrewTypes() {
    const roomCustomTypes = useCharacterStore(state => state.roomCustomTypes);
    const addCustomType = useCharacterStore(state => state.addCustomType);
    const updateCustomType = useCharacterStore(state => state.updateCustomType);
    const removeCustomType = useCharacterStore(state => state.removeCustomType);
    const overwriteCustomTypeData = useCharacterStore(state => state.overwriteCustomTypeData);
    const mergeCustomTypeData = useCharacterStore(state => state.mergeCustomTypeData);

    const allOptions = [...BASE_TYPES, ...roomCustomTypes.map(t => t.name)];

    const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#9C27B0');
    const [weaknesses, setWeaknesses] = useState<string[]>([]);
    const [resistances, setResistances] = useState<string[]>([]);
    const [immunities, setImmunities] = useState<string[]>([]);
    const [seAgainst, setSEAgainst] = useState<string[]>([]);
    const [nveAgainst, setNVEAgainst] = useState<string[]>([]);
    const [noEffectAgainst, setNoEffectAgainst] = useState<string[]>([]);

    const [selectedDropdown, setSelectedDropdown] = useState(allOptions[0]);
    const fileRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomType[] | null>(null);

    const resetForm = () => {
        setEditingOriginalName(null);
        setName(''); setColor('#9C27B0');
        setWeaknesses([]); setResistances([]); setImmunities([]);
        setSEAgainst([]); setNVEAgainst([]); setNoEffectAgainst([]);
    };

    const handleSave = () => {
        if (!name.trim()) return;
        const newObj: CustomType = { name: name.trim(), color, weaknesses, resistances, immunities, seAgainst, nveAgainst, noEffectAgainst };
        if (editingOriginalName) {
            updateCustomType(editingOriginalName, newObj);
        } else {
            addCustomType(newObj);
        }
        resetForm();
    };

    const loadForEditing = (t: CustomType) => {
        setEditingOriginalName(t.name);
        setName(t.name); setColor(t.color);
        setWeaknesses(t.weaknesses || []); setResistances(t.resistances || []); setImmunities(t.immunities || []);
        setSEAgainst(t.seAgainst || []); setNVEAgainst(t.nveAgainst || []); setNoEffectAgainst(t.noEffectAgainst || []);
    };

    const addToArray = (arr: string[], setter: (v: string[]) => void) => {
        if (!arr.includes(selectedDropdown)) setter([...arr, selectedDropdown]);
    };
    
    const removeFromArray = (val: string, arr: string[], setter: (v: string[]) => void) => {
        setter(arr.filter(item => item !== val));
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(roomCustomTypes, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pokerole_custom_types.json";
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
                else if (OBR.isAvailable) OBR.notification.show("Invalid Custom Types file.", "ERROR");
            } catch(err) {
                if (OBR.isAvailable) OBR.notification.show("Failed to parse JSON.", "ERROR");
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const renderPills = (arr: string[], setter: (v: string[]) => void) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {arr.map(val => (
                <span key={val} onClick={() => removeFromArray(val, arr, setter)} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer' }} title="Click to remove">
                    {val} x
                </span>
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-main)', flex: 1, minHeight: 0 }}>
            <p style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {editingOriginalName ? `✏️ Editing ${editingOriginalName}` : 'Create custom typings and define their combat matchups. These will appear in the Typing dropdowns.'}
            </p>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '30px', height: '30px', padding: '0', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '4px' }} />
                <input type="text" value={color} onChange={e => setColor(e.target.value)} style={{ width: '65px', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Type Name" style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text-main)', minWidth: 0 }} />
            </div>

            <div style={{ background: 'var(--panel-alt)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                    <select className="identity-grid__select" style={{ flex: 1, border: '1px solid var(--border)', padding: '4px', borderRadius: '4px' }} value={selectedDropdown} onChange={e => setSelectedDropdown(e.target.value)}>
                        {allOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.8rem', margin: '0 0 4px 0', color: 'var(--primary)' }}>Defensive</h4>
                        <button onClick={() => addToArray(weaknesses, setWeaknesses)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.7rem', padding: '4px' }}>+ Weak (2x)</button>
                        {renderPills(weaknesses, setWeaknesses)}
                        <button onClick={() => addToArray(resistances, setResistances)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.7rem', padding: '4px', marginTop: '6px' }}>+ Resist (0.5x)</button>
                        {renderPills(resistances, setResistances)}
                        <button onClick={() => addToArray(immunities, setImmunities)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.7rem', padding: '4px', marginTop: '6px' }}>+ Immune (0x)</button>
                        {renderPills(immunities, setImmunities)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.8rem', margin: '0 0 4px 0', color: '#1976D2' }}>Offensive</h4>
                        <button onClick={() => addToArray(seAgainst, setSEAgainst)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.7rem', padding: '4px' }}>+ S.Effective (2x)</button>
                        {renderPills(seAgainst, setSEAgainst)}
                        <button onClick={() => addToArray(nveAgainst, setNVEAgainst)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.7rem', padding: '4px', marginTop: '6px' }}>+ N.V.E (0.5x)</button>
                        {renderPills(nveAgainst, setNVEAgainst)}
                        <button onClick={() => addToArray(noEffectAgainst, setNoEffectAgainst)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.7rem', padding: '4px', marginTop: '6px' }}>+ No Effect (0x)</button>
                        {renderPills(noEffectAgainst, setNoEffectAgainst)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                {editingOriginalName && <button onClick={resetForm} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>Cancel Edit</button>}
                <button onClick={handleSave} className="action-button" style={{ background: '#8E24AA', color: 'white', flex: 1, padding: '8px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{editingOriginalName ? '💾 Save Type' : '+ Add Type'}</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px', flex: 1, overscrollBehavior: 'contain' }}>
                {roomCustomTypes.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom types added yet.</div>
                ) : (
                    roomCustomTypes.map(t => (
                        <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0 }}>
                            <span onClick={() => loadForEditing(t)} style={{ background: t.color, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textShadow: '1px 1px 1px rgba(0,0,0,0.8)', cursor: 'pointer' }} title="Click to edit">
                                {t.name} ✏️
                            </span>
                            <button onClick={() => removeCustomType(t.name)} style={{ background: 'transparent', border: 'none', color: '#C62828', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }} title="Delete">X</button>
                        </div>
                    ))
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button onClick={handleExport} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>💾 Export Types</button>
                <button onClick={() => fileRef.current?.click()} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>📂 Import Types</button>
                <input type="file" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
            </div>

            {/* AUDIT FIX: 3-Button Smart Merge Modal! */}
            {importData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '400px', width: '90%', border: '2px solid #C62828', textAlign: 'center' }}>
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Import</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>How would you like to import this data? <b>Overwrite</b> will delete your existing Types. <b>Add / Merge</b> will safely combine them, updating any items with matching names.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setImportData(null)} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>Cancel</button>
                            <button onClick={() => { mergeCustomTypeData(importData); setImportData(null); }} className="action-button" style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}>Add / Merge</button>
                            <button onClick={() => { overwriteCustomTypeData(importData); setImportData(null); }} className="action-button action-button--red" style={{ flex: 1, padding: '8px' }}>Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}