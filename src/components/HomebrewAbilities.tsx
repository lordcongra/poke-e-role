import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomAbility } from '../store/storeTypes';
import { AbilityCard } from './AbilityCard';

export function HomebrewAbilities() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const addCustomAbility = useCharacterStore((state) => state.addCustomAbility);
    const removeCustomAbility = useCharacterStore((state) => state.removeCustomAbility);
    const overwriteCustomAbilityData = useCharacterStore((state) => state.overwriteCustomAbilityData);
    const mergeCustomAbilityData = useCharacterStore((state) => state.mergeCustomAbilityData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomAbility[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const visibleAbilities = roomCustomAbilities.filter((ability) => role === 'GM' || !ability.gmOnly);
    const filteredAbilities = visibleAbilities.filter((ability) =>
        ability.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        const dataString = JSON.stringify(visibleAbilities, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_abilities.json';
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
                    OBR.notification.show('Invalid Custom Abilities file.', 'ERROR');
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
                Create custom abilities. When players assign these to their sheets, your custom descriptions and tags
                will automatically appear!
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="🔍 Search Abilities..."
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
                            addCustomAbility();
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
                {filteredAbilities.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem',
                            padding: '20px'
                        }}
                    >
                        {visibleAbilities.length === 0 ? 'No custom abilities yet.' : 'No abilities match your search.'}
                    </div>
                ) : (
                    filteredAbilities.map((ability) => (
                        <AbilityCard
                            key={ability.id}
                            ability={ability}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomAbility(ability.id)}
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
                    💾 Export Abilities
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark"
                            style={{ flex: 1, padding: '8px' }}
                        >
                            📂 Import Abilities
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
                            How would you like to import this data? <b>Overwrite</b> will delete your existing
                            Abilities. <b>Add / Merge</b> will safely combine them, updating any items with matching
                            names.
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
                                    mergeCustomAbilityData(importData);
                                    setImportData(null);
                                }}
                                className="action-button"
                                style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white' }}
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomAbilityData(importData);
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
