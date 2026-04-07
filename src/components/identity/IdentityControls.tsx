import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CharacterState } from '../../store/storeTypes';
import { fetchPokemonData, fetchAbilityData, fetchMoveData, loadLocalDataset } from '../../utils/api';
import { saveToOwlbear } from '../../utils/obr';
import { STATS_META_ID } from '../../utils/graphicsManager';
import { canViewHomebrew } from '../../utils/helper';
import { flattenStateToMetadata } from '../../utils/stateMapper';
import { IdentityToggles } from './IdentityToggles';
import { PrintSettingsModal } from '../modals/PrintSettingsModal';
import { ItemGeneratorModal } from '../modals/ItemGeneratorModal';

interface IdentityControlsProps {
    onOpenHomebrew: () => void;
    onOpenTrackerSettings: () => void;
    onOpenRules: () => void;
    isDark: boolean;
    toggleTheme: () => void;
}

export function IdentityControls({
    onOpenHomebrew,
    onOpenTrackerSettings,
    onOpenRules,
    isDark,
    toggleTheme
}: IdentityControlsProps) {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const addCustomInfo = useCharacterStore((state) => state.addCustomInfo);
    const refreshSpeciesData = useCharacterStore((state) => state.refreshSpeciesData);
    const role = useCharacterStore((state) => state.role);

    const access = identityStore.homebrewAccess || 'Full';
    const showHomebrewButton = canViewHomebrew(role, access);
    const showLootGenButton = role === 'GM' || identityStore.gmOnlyLootGen === false;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showLootGenModal, setShowLootGenModal] = useState(false);
    const fileInputReference = useRef<HTMLInputElement>(null);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await loadLocalDataset();

            const store = useCharacterStore.getState();

            for (const move of store.moves) {
                if (move.name) {
                    const data = await fetchMoveData(move.name);
                    if (data) store.applyMoveData(move.id, data as Record<string, unknown>);
                }
            }

            if (identityStore.species && identityStore.mode === 'Pokémon') {
                const data = await fetchPokemonData(identityStore.species);
                if (data) refreshSpeciesData(data as Record<string, unknown>);
            }

            if (identityStore.ability) {
                const abilityData = await fetchAbilityData(identityStore.ability);
                if (abilityData && (abilityData.Description || abilityData.Effect)) {
                    console.log('Ability data validated.');
                }
            }
        } catch (error) {
            console.error('Refresh failed', error);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    };

    const handleExport = async () => {
        const state = useCharacterStore.getState();
        if (!state.tokenId || !OBR.isAvailable) {
            if (OBR.isAvailable) OBR.notification.show('Please select a token to export.', 'WARNING');
            return;
        }

        try {
            const items = await OBR.scene.items.getItems([state.tokenId]);
            if (items.length === 0) return;

            const exportData = items[0].metadata[STATS_META_ID] || {};
            const dataString = JSON.stringify(exportData, null, 2);

            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const linkElement = document.createElement('a');
            const name = state.identity.nickname || state.identity.species || 'character';
            linkElement.href = url;
            linkElement.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed', error);
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            try {
                const imported = JSON.parse(fileEvent.target?.result as string);
                setImportData(imported);
            } catch (error) {
                if (OBR.isAvailable) OBR.notification.show('Invalid JSON file.', 'ERROR');
            }
            if (fileInputReference.current) fileInputReference.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if (!importData) return;
        const store = useCharacterStore.getState();
        try {
            // Safer check: A valid Owlbear Rodeo flat export will almost always have one of these keys.
            if (importData['moves-data'] !== undefined || importData['hp-curr'] !== undefined || importData['v2-migrated']) {
                store.loadFromOwlbear(importData);
                saveToOwlbear(importData);
            } else {
                // It's a raw Zustand state JSON export
                useCharacterStore.setState(importData as unknown as CharacterState);
                
                // CRITICAL FIX: Pass the newly hydrated, fully-initialized Zustand state to the mapper, 
                // NOT the raw JSON variable. This guarantees properties like `state.health` actually exist!
                const fullState = useCharacterStore.getState();
                const metaToSave = flattenStateToMetadata(fullState);
                saveToOwlbear(metaToSave);
            }
        } catch (error) {
            console.error('Failed to import character data:', error);
            if (OBR.isAvailable) OBR.notification.show('Failed to import data.', 'ERROR');
        } finally {
            setImportData(null);
        }
    };

    return (
        <>
            <div className="identity-header__actions">
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="action-button action-button--dark identity-header__btn"
                    title="Refresh Data"
                >
                    {isRefreshing ? '⏳ Refreshing...' : '↻ Refresh'}
                </button>

                {showHomebrewButton && (
                    <button
                        type="button"
                        className="action-button action-button--dark identity-header__btn identity-header__btn--homebrew"
                        onClick={onOpenHomebrew}
                    >
                        🛠️ Homebrew
                    </button>
                )}

                {showLootGenButton && (
                    <button
                        type="button"
                        className="action-button identity-header__btn identity-header__btn--loot"
                        onClick={() => setShowLootGenModal(true)}
                    >
                        🎁 Loot Gen
                    </button>
                )}

                <button
                    type="button"
                    onClick={addCustomInfo}
                    className="action-button identity-header__btn identity-header__btn--custom-field"
                    title="Add Custom Field"
                >
                    ➕ Custom Field
                </button>

                <button
                    type="button"
                    onClick={handleExport}
                    className="action-button action-button--dark identity-header__btn--small"
                    title="Export Character (Download JSON)"
                >
                    💾
                </button>
                <button
                    type="button"
                    onClick={() => fileInputReference.current?.click()}
                    className="action-button action-button--dark identity-header__btn--small"
                    title="Import Character (Upload JSON)"
                >
                    📂
                </button>
                <input
                    type="file"
                    ref={fileInputReference}
                    onChange={handleImport}
                    className="identity-header__file-input"
                    accept=".json"
                />

                <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="action-button action-button--dark identity-header__btn--small"
                    title="Print Sheet"
                >
                    🖨️
                </button>

                <button
                    type="button"
                    className="action-button action-button--dark identity-header__btn--small"
                    onClick={toggleTheme}
                    title="Toggle Dark Mode"
                >
                    {isDark ? '☀️' : '🌙'}
                </button>
            </div>

            <IdentityToggles onOpenTrackerSettings={onOpenTrackerSettings} onOpenRules={onOpenRules} />

            {importData && (
                <div className="identity-header__modal-overlay">
                    <div className="identity-header__modal-content">
                        <h3 className="identity-header__modal-title">⚠️ Confirm Import</h3>
                        <p className="identity-header__modal-text">
                            Import character data? This will completely overwrite the current token.
                        </p>
                        <div className="identity-header__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark identity-header__modal-btn"
                                onClick={() => setImportData(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red identity-header__modal-btn"
                                onClick={confirmImport}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPrintModal && <PrintSettingsModal onClose={() => setShowPrintModal(false)} />}
            {showLootGenModal && <ItemGeneratorModal onClose={() => setShowLootGenModal(false)} />}
        </>
    );
}