import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomMove } from '../store/storeTypes';
import { HomebrewMoveCard } from './HomebrewMoveCard';
import { POKEMON_TYPES, TYPE_COLORS } from '../data/constants';

export function HomebrewMoves() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const addCustomMove = useCharacterStore((state) => state.addCustomMove);
    const removeCustomMove = useCharacterStore((state) => state.removeCustomMove);
    const overwriteCustomMoveData = useCharacterStore((state) => state.overwriteCustomMoveData);
    const mergeCustomMoveData = useCharacterStore((state) => state.mergeCustomMoveData);

    const filteredTypes = roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map((type) => type.name)];
    const allTypeColors = { ...TYPE_COLORS, ...Object.fromEntries(filteredTypes.map((type) => [type.name, type.color])) };

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomMove[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const visibleMoves = roomCustomMoves.filter((move) => role === 'GM' || !move.gmOnly);
    const filteredMoves = visibleMoves.filter((move) => move.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleExport = () => {
        const dataString = JSON.stringify(visibleMoves, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_moves.json';
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
                    OBR.notification.show('Invalid Custom Moves file.', 'ERROR');
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
                Create custom moves. These will appear in the move dropdowns and automatically populate their formulas when selected.
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="🔍 Search Moves..."
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
                            addCustomMove();
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
                {filteredMoves.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem',
                            padding: '20px'
                        }}
                    >
                        {visibleMoves.length === 0 ? 'No custom moves yet.' : 'No moves match your search.'}
                    </div>
                ) : (
                    filteredMoves.map((move) => (
                        <HomebrewMoveCard
                            key={move.id}
                            move={move}
                            allTypes={allTypes}
                            allTypeColors={allTypeColors}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomMove(move.id)}
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
                <button onClick={handleExport} className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }}>
                    💾 Export Moves
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark"
                            style={{ flex: 1, padding: '8px' }}
                        >
                            📂 Import Moves
                        </button>
                        <input type="file" ref={fileReference} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
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
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Moves.{' '}
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
                                    mergeCustomMoveData(importData);
                                    setImportData(null);
                                }}
                                className="action-button"
                                style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomMoveData(importData);
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