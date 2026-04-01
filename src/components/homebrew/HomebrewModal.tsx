// src/components/HomebrewModal.tsx
import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from "../../store/useCharacterStore";
import { HomebrewTypes } from './HomebrewTypes';
import { HomebrewAbilities } from './HomebrewAbilities';
import { HomebrewMoves } from './HomebrewMoves';
import { HomebrewPokemon } from './HomebrewPokemon';
import { HomebrewItems } from './HomebrewItems';
import type { CustomType, CustomAbility, CustomMove, CustomPokemon, CustomItem } from '../../store/storeTypes';

export function HomebrewModal({ onClose }: { onClose: () => void }) {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const [activeTab, setActiveTab] = useState<'types' | 'abilities' | 'moves' | 'pokemon' | 'items'>('types');
    const overwriteAllHomebrewData = useCharacterStore((state) => state.overwriteAllHomebrewData);
    const mergeAllHomebrewData = useCharacterStore((state) => state.mergeAllHomebrewData);

    const fileRef = useRef<HTMLInputElement>(null);
    const [importAllData, setImportAllData] = useState<{
        types: CustomType[];
        abs: CustomAbility[];
        moves: CustomMove[];
        mons: CustomPokemon[];
        items: CustomItem[];
    } | null>(null);

    const handleExportAll = () => {
        const state = useCharacterStore.getState();
        const exportData = {
            customTypes: state.roomCustomTypes.filter((t) => role === 'GM' || !t.gmOnly),
            customAbilities: state.roomCustomAbilities.filter((a) => role === 'GM' || !a.gmOnly),
            customMoves: state.roomCustomMoves.filter((m) => role === 'GM' || !m.gmOnly),
            customPokemon: state.roomCustomPokemon.filter((p) => role === 'GM' || !p.gmOnly),
            customItems: state.roomCustomItems.filter((i) => role === 'GM' || !i.gmOnly)
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pokerole_homebrew_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                if (
                    imported &&
                    typeof imported === 'object' &&
                    (imported.customTypes ||
                        imported.customAbilities ||
                        imported.customMoves ||
                        imported.customPokemon ||
                        imported.customItems)
                ) {
                    setImportAllData({
                        types: imported.customTypes || [],
                        abs: imported.customAbilities || [],
                        moves: imported.customMoves || [],
                        mons: imported.customPokemon || [],
                        items: imported.customItems || []
                    });
                } else {
                    if (OBR.isAvailable) OBR.notification.show('Invalid Homebrew Backup file.', 'ERROR');
                }
            } catch (err) {
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const tabStyle = (tabName: string) => ({
        flex: 1,
        padding: '8px 4px',
        fontWeight: 'bold' as const,
        background: activeTab === tabName ? 'var(--panel-bg)' : 'rgba(0,0,0,0.2)',
        color: activeTab === tabName ? '#00695C' : 'white',
        border: 'none',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        fontSize: '0.85rem'
    });

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 1200,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    borderRadius: '8px',
                    width: '550px',
                    border: '2px solid #00695C',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        background: '#00695C',
                        paddingTop: '10px',
                        paddingLeft: '10px',
                        paddingRight: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: 'white' }}>🛠️ Homebrew Workshop</h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
                                padding: '0 5px'
                            }}
                        >
                            X
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <button onClick={() => setActiveTab('types')} style={tabStyle('types')}>
                            Types
                        </button>
                        <button onClick={() => setActiveTab('abilities')} style={tabStyle('abilities')}>
                            Abilities
                        </button>
                        <button onClick={() => setActiveTab('moves')} style={tabStyle('moves')}>
                            Moves
                        </button>
                        <button onClick={() => setActiveTab('pokemon')} style={tabStyle('pokemon')}>
                            Pokémon
                        </button>
                        <button onClick={() => setActiveTab('items')} style={tabStyle('items')}>
                            Items
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        padding: '15px',
                        overflowY: 'hidden',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}
                >
                    {activeTab === 'types' && <HomebrewTypes />}
                    {activeTab === 'abilities' && <HomebrewAbilities />}
                    {activeTab === 'moves' && <HomebrewMoves />}
                    {activeTab === 'pokemon' && <HomebrewPokemon />}
                    {activeTab === 'items' && <HomebrewItems />}
                </div>

                <div
                    style={{
                        padding: '10px',
                        borderTop: '1px solid var(--border)',
                        background: 'var(--panel-alt)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Changes automatically save to the Room.
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={handleExportAll}
                            className="action-button action-button--dark"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                            💾 Backup All
                        </button>
                        {canEdit && (
                            <>
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                >
                                    📂 Restore All
                                </button>
                                <input
                                    type="file"
                                    ref={fileRef}
                                    onChange={handleImportAll}
                                    style={{ display: 'none' }}
                                    accept=".json"
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {importAllData && (
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
                        <h3 style={{ color: '#C62828', marginTop: 0 }}>⚠️ Confirm Restore</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            How would you like to import this data? <b>Overwrite</b> will delete all existing Workshop
                            items. <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setImportAllData(null)}
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '8px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeAllHomebrewData(
                                        importAllData.types,
                                        importAllData.abs,
                                        importAllData.moves,
                                        importAllData.mons,
                                        importAllData.items
                                    );
                                    setImportAllData(null);
                                }}
                                className="action-button"
                                style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteAllHomebrewData(
                                        importAllData.types,
                                        importAllData.abs,
                                        importAllData.moves,
                                        importAllData.mons,
                                        importAllData.items
                                    );
                                    setImportAllData(null);
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
