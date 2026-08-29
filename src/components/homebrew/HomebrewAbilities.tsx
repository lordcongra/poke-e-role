import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomAbility } from '../../store/storeTypes';
import { AbilityCard } from './AbilityCard';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { Plus, Save, FolderOpen, AlertTriangle } from 'lucide-react';
import './Homebrew.css';

export function HomebrewAbilities() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const addCustomAbility = useCharacterStore((state) => state.addCustomAbility);
    const removeCustomAbility = useCharacterStore((state) => state.removeCustomAbility);
    const duplicateCustomAbility = useCharacterStore((state) => state.duplicateCustomAbility);
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
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc text-subtext">
                Create custom abilities. When players assign these to their sheets, your custom descriptions and tags
                will automatically appear!
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="Search Abilities..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input"
                />
                {canEdit && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            addCustomAbility();
                        }}
                        className="action-button action-button--dark homebrew-list__create-btn"
                    >
                        <Plus size={16} /> Create New
                    </button>
                )}
            </div>

            <div className="homebrew-list__scroll-area">
                {filteredAbilities.length === 0 ? (
                    <div className="homebrew-list__empty text-subtext" style={{ fontStyle: 'italic' }}>
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
                            onDuplicate={() => duplicateCustomAbility(ability.id)}
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    <Save size={16} /> Export Abilities
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            <FolderOpen size={16} /> Import Abilities
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
                        <h3
                            className="homebrew-import__title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Import
                        </h3>
                        <p className="homebrew-import__text text-subtext">
                            How would you like to import this data? <b>Overwrite</b> will delete your existing
                            Abilities. <b>Add / Merge</b> will safely combine them, updating any items with matching
                            names.
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
                                    mergeCustomAbilityData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--secondary homebrew-import__btn"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomAbilityData(importData);
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
