import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchPokemonData, fetchAbilityData, fetchMoveData, loadLocalDataset } from '../../utils/api';
import { saveToOwlbear } from '../../utils/obr';
import { STATS_META_ID } from '../../utils/graphicsManager';
import { canViewHomebrew } from '../../utils/helper';
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
            if (importData['moves-data'] !== undefined) {
                store.loadFromOwlbear(importData);
                saveToOwlbear(importData);
            } else {
                useCharacterStore.setState(importData);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = importData as any;
                const metaToSave: Record<string, unknown> = {};

                if (d.identity) {
                    metaToSave['nickname'] = d.identity.nickname;
                    metaToSave['species'] = d.identity.species;
                    metaToSave['nature'] = d.identity.nature;
                    metaToSave['rank'] = d.identity.rank;
                    metaToSave['type1'] = d.identity.type1;
                    metaToSave['type2'] = d.identity.type2;
                    metaToSave['ability'] = d.identity.ability;
                    metaToSave['ability-list'] = (d.identity.availableAbilities || []).join(',');
                    metaToSave['mode'] = d.identity.mode;
                    metaToSave['age'] = d.identity.age;
                    metaToSave['gender'] = d.identity.gender;
                    metaToSave['rolls'] = d.identity.rolls;
                    metaToSave['combat'] = d.identity.combat;
                    metaToSave['social'] = d.identity.social;
                    metaToSave['hand'] = d.identity.hand;
                    metaToSave['is-npc'] = d.identity.isNPC;
                    metaToSave['pokemon-backup'] = d.identity.pokemonBackup;
                    metaToSave['trainer-backup'] = d.identity.trainerBackup;
                    metaToSave['base-form-data'] = d.identity.baseFormData;
                    metaToSave['alt-form-data'] = d.identity.altFormData;
                    metaToSave['is-alt-form'] = d.identity.isAltForm;

                    metaToSave['show-trackers'] = d.identity.showTrackers;
                    metaToSave['setting-hp-bar'] = d.identity.settingHpBar;
                    metaToSave['gm-hp-bar'] = d.identity.gmHpBar;
                    metaToSave['setting-hp-text'] = d.identity.settingHpText;
                    metaToSave['gm-hp-text'] = d.identity.gmHpText;
                    metaToSave['setting-will-bar'] = d.identity.settingWillBar;
                    metaToSave['gm-will-bar'] = d.identity.gmWillBar;
                    metaToSave['setting-will-text'] = d.identity.settingWillText;
                    metaToSave['gm-will-text'] = d.identity.gmWillText;
                    metaToSave['setting-def-badge'] = d.identity.settingDefBadge;
                    metaToSave['gm-def-badge'] = d.identity.gmDefBadge;
                    metaToSave['setting-eco-badge'] = d.identity.settingEcoBadge;
                    metaToSave['gm-eco-badge'] = d.identity.gmEcoBadge;
                    metaToSave['color-act'] = d.identity.colorAct;
                    metaToSave['color-eva'] = d.identity.colorEva;
                    metaToSave['color-cla'] = d.identity.colorCla;

                    metaToSave['tracker-scale'] = d.identity.trackerScale;
                    metaToSave['x-offset'] = d.identity.xOffset;
                    metaToSave['y-offset'] = d.identity.yOffset;
                    metaToSave['hp-offset-x'] = d.identity.hpOffsetX;
                    metaToSave['hp-offset-y'] = d.identity.hpOffsetY;
                    metaToSave['will-offset-x'] = d.identity.willOffsetX;
                    metaToSave['will-offset-y'] = d.identity.willOffsetY;
                    metaToSave['def-offset-x'] = d.identity.defOffsetX;
                    metaToSave['def-offset-y'] = d.identity.defOffsetY;
                    metaToSave['act-offset-x'] = d.identity.actOffsetX;
                    metaToSave['act-offset-y'] = d.identity.actOffsetY;
                    metaToSave['eva-offset-x'] = d.identity.evaOffsetX;
                    metaToSave['eva-offset-y'] = d.identity.evaOffsetY;
                    metaToSave['cla-offset-x'] = d.identity.claOffsetX;
                    metaToSave['cla-offset-y'] = d.identity.claOffsetY;
                }

                if (d.health) {
                    metaToSave['hp-curr'] = d.health.hpCurr;
                    metaToSave['hp-max-display'] = d.health.hpMax;
                    metaToSave['hp-base'] = d.health.hpBase;
                }
                if (d.will) {
                    metaToSave['will-curr'] = d.will.willCurr;
                    metaToSave['will-max-display'] = d.will.willMax;
                    metaToSave['will-base'] = d.will.willBase;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (d.stats)
                    Object.entries(d.stats).forEach(([stat, vals]: any) => {
                        metaToSave[`${stat}-base`] = vals.base;
                        metaToSave[`${stat}-rank`] = vals.rank;
                        metaToSave[`${stat}-buff`] = vals.buff;
                        metaToSave[`${stat}-debuff`] = vals.debuff;
                        metaToSave[`${stat}-limit`] = vals.limit;
                    });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (d.socials)
                    Object.entries(d.socials).forEach(([stat, vals]: any) => {
                        metaToSave[`${stat}-base`] = vals.base;
                        metaToSave[`${stat}-rank`] = vals.rank;
                        metaToSave[`${stat}-buff`] = vals.buff;
                        metaToSave[`${stat}-debuff`] = vals.debuff;
                        metaToSave[`${stat}-limit`] = vals.limit;
                    });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (d.skills)
                    Object.entries(d.skills).forEach(([skill, vals]: any) => {
                        metaToSave[`${skill}-base`] = vals.base;
                        metaToSave[`${skill}-buff`] = vals.buff;
                        if (vals.customName) metaToSave[`label-${skill}`] = vals.customName;
                    });

                if (d.derived) {
                    metaToSave['def-buff'] = d.derived.defBuff;
                    metaToSave['def-debuff'] = d.derived.defDebuff;
                    metaToSave['spd-buff'] = d.derived.sdefBuff;
                    metaToSave['spd-debuff'] = d.derived.sdefDebuff;
                    metaToSave['happiness-curr'] = d.derived.happy;
                    metaToSave['loyalty-curr'] = d.derived.loyal;
                }

                if (d.extras) {
                    metaToSave['extra-core'] = d.extras.core;
                    metaToSave['extra-social'] = d.extras.social;
                    metaToSave['extra-skill'] = d.extras.skill;
                }

                if (d.trackers) {
                    metaToSave['actions-used'] = d.trackers.actions;
                    metaToSave['evasions-used'] = d.trackers.evade;
                    metaToSave['clashes-used'] = d.trackers.clash;
                    metaToSave['chances-used'] = d.trackers.chances;
                    metaToSave['fate-used'] = d.trackers.fate;
                    metaToSave['global-acc-mod'] = d.trackers.globalAcc;
                    metaToSave['global-dmg-mod'] = d.trackers.globalDmg;
                    metaToSave['global-succ-mod'] = d.trackers.globalSucc;
                    metaToSave['global-chance-mod'] = d.trackers.globalChance;
                    metaToSave['ignored-pain-mod'] = d.trackers.ignoredPain;
                }

                if (d.moves) metaToSave['moves-data'] = JSON.stringify(d.moves);
                if (d.skillChecks) metaToSave['skill-checks-data'] = JSON.stringify(d.skillChecks);
                if (d.inventory) metaToSave['inv-data'] = JSON.stringify(d.inventory);
                if (d.statuses) metaToSave['status-list'] = JSON.stringify(d.statuses);
                if (d.effects) metaToSave['effects-data'] = JSON.stringify(d.effects);
                if (d.customInfo) metaToSave['custom-info-data'] = JSON.stringify(d.customInfo);
                if (d.extraCategories) metaToSave['extra-skills-data'] = JSON.stringify(d.extraCategories);

                metaToSave['notes'] = d.notes || '';
                metaToSave['training-points'] = d.tp || 0;
                metaToSave['currency'] = d.currency || 0;

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
