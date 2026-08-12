import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CharacterState } from '../../store/storeTypes';
import { fetchPokemonData, fetchAbilityData, fetchMoveData, loadLocalDataset } from '../../utils/api';
import { saveToOwlbear } from '../../utils/obr';
import { STATS_META_ID } from '../../utils/graphicsManager';
import { flattenStateToMetadata } from '../../utils/stateMapper';
import { useObrReady } from '../../hooks/useObrReady';
import { IdentityToggles } from './IdentityToggles';
import { PrintSettingsModal } from '../modals/PrintSettingsModal';
import { isStandaloneMode } from '../../utils/storageAdapter';

interface IdentityControlsProps {
    onOpenTrackerSettings: () => void;
}

export function IdentityControls({ onOpenTrackerSettings }: IdentityControlsProps) {
    const isObrReady = useObrReady();
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const addCustomInfo = useCharacterStore((state) => state.addCustomInfo);
    const refreshSpeciesData = useCharacterStore((state) => state.refreshSpeciesData);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
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
                await fetchAbilityData(identityStore.ability);
            }
        } catch (error) {
            console.error('[IdentityControls] Refresh failed:', error);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    };

    const handleExport = async () => {
        const state = useCharacterStore.getState();

        if (isStandaloneMode) {
            try {
                const exportData = flattenStateToMetadata(state);
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
                return;
            } catch (error) {
                console.error('[IdentityControls] Standalone Export failed:', error);
                return;
            }
        }

        if (!state.tokenId || !OBR.isAvailable || !isObrReady) {
            if (OBR.isAvailable && isObrReady) OBR.notification.show('Please select a token to export.', 'WARNING');
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
            console.error('[IdentityControls] Export failed:', error);
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
                if (OBR.isAvailable && isObrReady) OBR.notification.show('Invalid JSON file.', 'ERROR');
                else alert('Invalid JSON file.');
            }
            if (fileInputReference.current) fileInputReference.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if (!importData) return;
        const store = useCharacterStore.getState();
        try {
            if (
                importData['moves-data'] !== undefined ||
                importData['hp-curr'] !== undefined ||
                importData['v2-migrated']
            ) {
                store.loadFromOwlbear(importData);
                saveToOwlbear(importData);
            } else {
                useCharacterStore.setState(importData as unknown as CharacterState);
                const fullState = useCharacterStore.getState();
                const metaToSave = flattenStateToMetadata(fullState);
                saveToOwlbear(metaToSave);
            }
        } catch (error) {
            console.error('[IdentityControls] Failed to import character data:', error);
            if (OBR.isAvailable && isObrReady) OBR.notification.show('Failed to import data.', 'ERROR');
            else alert('Failed to import data.');
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
                    className="action-button action-button--dark identity-header__btn identity-header__btn--refresh"
                    title="Refresh Data"
                >
                    {isRefreshing ? '⏳' : '↻'}
                </button>

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
            </div>

            {!isStandaloneMode && <IdentityToggles onOpenTrackerSettings={onOpenTrackerSettings} />}

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
        </>
    );
}
