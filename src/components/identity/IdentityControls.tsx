import { useState, useRef, useEffect } from 'react';
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
import { InitiativeSettingsModal } from '../modals/InitiativeSettingsModal';

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
    const [showInitSettings, setShowInitSettings] = useState(false);
    const fileInputReference = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!OBR.isAvailable) return;
            const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
                unsub();
                openTracker(true);
            });
            OBR.broadcast.sendMessage('pkr-init-ping-check', {}, { destination: 'LOCAL' });
            setTimeout(() => unsub(), 100);
        }, 300);
        return () => clearTimeout(timeout);
    }, [
        identityStore.initiativeTrackerPreset,
        identityStore.initiativeTrackerOffsetX,
        identityStore.initiativeTrackerOffsetY,
        identityStore.initiativeTrackerLayout,
        identityStore.initiativeTrackerAvatarShape,
        identityStore.initiativeTrackerWidthBuffer,
        identityStore.initiativeTrackerHeightBuffer
    ]);

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
            console.error('Failed to import character data:', error);
            if (OBR.isAvailable) OBR.notification.show('Failed to import data.', 'ERROR');
        } finally {
            setImportData(null);
        }
    };

    const openTracker = async (isReAnchor = false) => {
        const { 
            initiativeTrackerPreset, 
            initiativeTrackerOffsetX, 
            initiativeTrackerOffsetY, 
            initiativeTrackerLayout, 
            initiativeTrackerAvatarShape,
            initiativeTrackerWidthBuffer,
            initiativeTrackerHeightBuffer
        } = identityStore;

        const width = await OBR.viewport.getWidth();
        const height = await OBR.viewport.getHeight();
        
        let anchorPosition = { top: 0, left: 0 };
        let transformOrigin = { vertical: 'TOP', horizontal: 'LEFT' };

        const posX = initiativeTrackerOffsetX || 0;
        const posY = initiativeTrackerOffsetY || 0;

        switch (initiativeTrackerPreset) {
            case 'top-left':
                anchorPosition = { top: posY, left: posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'LEFT' };
                break;
            case 'top-right':
                anchorPosition = { top: posY, left: width + posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'RIGHT' };
                break;
            case 'bottom-left':
                anchorPosition = { top: height + posY, left: posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'LEFT' };
                break;
            case 'bottom-right':
                anchorPosition = { top: height + posY, left: width + posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'RIGHT' };
                break;
            case 'center-left':
                anchorPosition = { top: height / 2 + posY, left: posX };
                transformOrigin = { vertical: 'CENTER', horizontal: 'LEFT' };
                break;
            case 'center-right':
                anchorPosition = { top: height / 2 + posY, left: width + posX };
                transformOrigin = { vertical: 'CENTER', horizontal: 'RIGHT' };
                break;
            case 'top-center':
                anchorPosition = { top: posY, left: width / 2 + posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'CENTER' };
                break;
            case 'bottom-center':
                anchorPosition = { top: height + posY, left: width / 2 + posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'CENTER' };
                break;
        }

        const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        const themeToPass = document.body.getAttribute('data-theme') || 'light';
        const url = `${baseUrl}/initiative-tracker.html?layout=${initiativeTrackerLayout}&theme=${themeToPass}&shape=${initiativeTrackerAvatarShape}&wb=${initiativeTrackerWidthBuffer}&hb=${initiativeTrackerHeightBuffer}`;

        const savedW = parseInt(localStorage.getItem('pkr_init_width') || '400');
        const savedH = parseInt(localStorage.getItem('pkr_init_height') || '150');

        OBR.popover.open({
            id: 'pkr-initiative-tracker',
            url: url,
            height: isReAnchor ? savedH : 150, 
            width: isReAnchor ? savedW : 400,
            disableClickAway: true,
            anchorReference: 'POSITION',
            anchorPosition: anchorPosition,
            // @ts-ignore
            transformOrigin: transformOrigin
        }).catch(() => {});
    };

    const handleInitiativeToggle = async () => {
        if (!OBR.isAvailable) return;
        
        let handled = false;
        const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
            handled = true;
            unsub();
            OBR.popover.close('pkr-initiative-tracker').catch(() => {});
        });

        OBR.broadcast.sendMessage('pkr-init-ping-toggle', {}, { destination: 'LOCAL' });

        setTimeout(() => {
            unsub();
            if (!handled) {
                openTracker();
            }
        }, 150);
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

                <div style={{ display: 'flex', gap: '0px', flex: '1 1 25%', minWidth: '100px' }}>
                    <button
                        type="button"
                        className="action-button identity-header__btn"
                        style={{ backgroundColor: '#f44336', borderColor: '#f44336', flex: 1, borderRadius: '4px 0 0 4px', borderRight: '1px solid #c62828' }}
                        onClick={handleInitiativeToggle}
                    >
                        ⚔️ Initiative
                    </button>
                    <button
                        type="button"
                        className="action-button identity-header__btn"
                        style={{ backgroundColor: '#f44336', borderColor: '#f44336', flex: '0 0 32px', padding: '0', borderRadius: '0 4px 4px 0' }}
                        onClick={() => setShowInitSettings(true)}
                        title="Initiative Settings"
                    >
                        ⚙️
                    </button>
                </div>

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

            {showInitSettings && <InitiativeSettingsModal onClose={() => setShowInitSettings(false)} />}
            {showPrintModal && <PrintSettingsModal onClose={() => setShowPrintModal(false)} />}
            {showLootGenModal && <ItemGeneratorModal onClose={() => setShowLootGenModal(false)} />}
        </>
    );
}