import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { fetchPokemonData, fetchAbilityData, fetchMoveData, loadGithubTree } from '../utils/api';
import { saveToOwlbear } from '../utils/obr';
import { canViewHomebrew } from '../utils/helper';
import { IdentityToggles } from './IdentityToggles';

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

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
    const fileInputReference = useRef<HTMLInputElement>(null);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await loadGithubTree();
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

    const handleExport = () => {
        const state = useCharacterStore.getState();
        const exportData = {
            identity: state.identity,
            health: state.health,
            will: state.will,
            derived: state.derived,
            extras: state.extras,
            stats: state.stats,
            socials: state.socials,
            skills: state.skills,
            moves: state.moves,
            skillChecks: state.skillChecks,
            inventory: state.inventory,
            notes: state.notes,
            customInfo: state.customInfo,
            tp: state.tp,
            currency: state.currency,
            statuses: state.statuses,
            effects: state.effects,
            trackers: state.trackers
        };
        const dataString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        const name = identityStore.nickname || identityStore.species || 'character';
        linkElement.href = url;
        linkElement.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;
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
        if (importData['moves-data'] !== undefined) {
            store.loadFromOwlbear(importData);
            saveToOwlbear(importData);
        } else {
            useCharacterStore.setState(importData);
        }
        setImportData(null);
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
                    title="Export Character (Download)"
                >
                    💾
                </button>
                <button
                    type="button"
                    onClick={() => fileInputReference.current?.click()}
                    className="action-button action-button--dark identity-header__btn--small"
                    title="Import Character (Upload)"
                >
                    📂
                </button>
                <input
                    type="file"
                    ref={fileInputReference}
                    onChange={handleImport}
                    style={{ display: 'none' }}
                    accept=".json"
                />

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
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setImportData(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={confirmImport}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
