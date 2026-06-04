import type { StateCreator } from 'zustand';
import type { CharacterState, MacroSlice } from '../storeTypes';
import { CombatStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import OBR from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import {
    syncHealthAndWill,
    type RestoreConfig,
    getLimit,
    getBase,
    extractAbilities,
    parseLearnset
} from '../../utils/macroHelpers';
import {
    processReversion,
    processTransformation,
    handleTokenImageSwap,
    type TransformationDraft
} from '../../utils/transformationLogic';

export const createMacroSlice: StateCreator<CharacterState, [], [], MacroSlice> = (set, get) => ({
    setMode: (newMode) =>
        set((state) => {
            const isTrainer = newMode === 'Trainer';
            const currentBackupKey = isTrainer ? 'pokemonBackup' : 'trainerBackup';
            const targetBackupKey = isTrainer ? 'trainerBackup' : 'pokemonBackup';
            const obrSaveKey = isTrainer ? 'pokemon-backup' : 'trainer-backup';

            const backupData: Record<string, unknown> = { type1: state.identity.type1, type2: state.identity.type2 };
            Object.values(CombatStat).forEach((stat) => {
                backupData[`${stat}Base`] = state.stats[stat].base;
                backupData[`${stat}Limit`] = state.stats[stat].limit;
            });
            const backupStr = JSON.stringify(backupData);

            const updatesToSave: Record<string, unknown> = { mode: newMode, [obrSaveKey]: backupStr };
            const newIdentity = { ...state.identity, mode: newMode, [currentBackupKey]: backupStr };
            const newStats = { ...state.stats };

            const newSkills = { ...state.skills };
            newSkills[Skill.CHANNEL] = { ...newSkills[Skill.CHANNEL], customName: isTrainer ? 'Throw' : 'Channel' };
            newSkills[Skill.CLASH] = { ...newSkills[Skill.CLASH], customName: isTrainer ? 'Weapon' : 'Clash' };
            newSkills[Skill.CHARM] = { ...newSkills[Skill.CHARM], customName: isTrainer ? 'Empathy' : 'Charm' };
            newSkills[Skill.MAGIC] = { ...newSkills[Skill.MAGIC], customName: isTrainer ? 'Science' : 'Magic' };

            updatesToSave[`label-${Skill.CHANNEL}`] = newSkills[Skill.CHANNEL].customName;
            updatesToSave[`label-${Skill.CLASH}`] = newSkills[Skill.CLASH].customName;
            updatesToSave[`label-${Skill.CHARM}`] = newSkills[Skill.CHARM].customName;
            updatesToSave[`label-${Skill.MAGIC}`] = newSkills[Skill.MAGIC].customName;

            const rawBackup = state.identity[targetBackupKey];
            if (rawBackup) {
                try {
                    const parsed = JSON.parse(rawBackup);
                    newIdentity.type1 = parsed.type1 ?? newIdentity.type1;
                    newIdentity.type2 = parsed.type2 ?? newIdentity.type2;
                    updatesToSave.type1 = newIdentity.type1;
                    updatesToSave.type2 = newIdentity.type2;

                    Object.values(CombatStat).forEach((stat) => {
                        newStats[stat] = { ...newStats[stat] };
                        if (parsed[`${stat}Base`] !== undefined) {
                            newStats[stat].base = parsed[`${stat}Base`];
                            updatesToSave[`${stat}-base`] = parsed[`${stat}Base`];
                        }
                        if (parsed[`${stat}Limit`] !== undefined) {
                            newStats[stat].limit = parsed[`${stat}Limit`];
                            updatesToSave[`${stat}-limit`] = parsed[`${stat}Limit`];
                        }
                    });
                } catch (e) {}
            } else if (isTrainer) {
                newIdentity.type1 = '';
                newIdentity.type2 = '';
                updatesToSave.type1 = '';
                updatesToSave.type2 = '';
                Object.values(CombatStat).forEach((stat) => {
                    newStats[stat] = { ...newStats[stat], base: 1, limit: 5 };
                    updatesToSave[`${stat}-base`] = 1;
                    updatesToSave[`${stat}-limit`] = 5;
                });
            }

            const newHealth = { ...state.health };
            const newWill = { ...state.will };

            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave);

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}

            return { identity: newIdentity, stats: newStats, health: newHealth, will: newWill, skills: newSkills };
        }),

    toggleTransformation: (targetTransformation, affinity = '', autoMaxMoves = false, teraBlastConfig, customFormId) =>
        set((state) => {
            const isCurrentlyTransformed = state.identity.activeTransformation !== 'None';
            const isReverting =
                targetTransformation === 'None' ||
                (isCurrentlyTransformed && state.identity.activeTransformation === targetTransformation);

            const draft: TransformationDraft = {
                identity: { ...state.identity },
                health: { ...state.health },
                will: { ...state.will },
                derived: { ...state.derived },
                stats: { ...state.stats },
                socials: { ...state.socials },
                moves: [...state.moves],
                skills: { ...state.skills },
                statuses: [...state.statuses],
                effects: [...state.effects],
                trackers: { ...state.trackers }
            };

            const updatesToSave: Record<string, unknown> = {};
            let revertConfig: RestoreConfig = {};

            // 1. Check Costs & Requirements
            if (!isReverting) {
                let costHp = 0;
                let costWill = 0;

                if (targetTransformation === 'Mega' || targetTransformation === 'Terastallize') {
                    costWill = 1;
                } else if (targetTransformation === 'Custom' && customFormId) {
                    const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
                    if (targetForm) {
                        costHp = targetForm.activationCostHp || 0;
                        costWill = targetForm.activationCostWill || 0;
                    }
                }

                if (costHp > 0 && draft.health.hpCurr <= costHp) {
                    if (OBR.isAvailable) OBR.notification.show('Not enough HP to safely transform!', 'ERROR');
                    return state;
                }

                if (costWill > 0) {
                    let remainingWillCost = costWill;
                    if (draft.will.temporaryWill > 0) {
                        const deduct = Math.min(draft.will.temporaryWill, remainingWillCost);
                        draft.will.temporaryWill -= deduct;
                        remainingWillCost -= deduct;
                        updatesToSave['temporary-will'] = draft.will.temporaryWill;
                    }
                    if (remainingWillCost > 0) {
                        if (draft.will.willCurr < remainingWillCost) {
                            if (OBR.isAvailable) OBR.notification.show('Not enough Willpower!', 'ERROR');
                            return state;
                        }
                        draft.will.willCurr -= remainingWillCost;
                    }
                }

                draft.health.hpCurr -= costHp;
            }

            // 2. Process Core Transformation Logic
            if (isReverting) {
                revertConfig = processReversion(draft, state, updatesToSave);
            } else {
                processTransformation(
                    draft,
                    state,
                    updatesToSave,
                    targetTransformation,
                    customFormId,
                    affinity,
                    teraBlastConfig,
                    autoMaxMoves
                );
            }

            // 3. Mathematical Syncing (Derived HP / Will / Healing)
            syncHealthAndWill(state, draft.stats, draft.identity, draft.health, draft.will, updatesToSave, true);

            if (!isReverting && targetTransformation === 'Mega') {
                draft.statuses = [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
                updatesToSave['status-list'] = JSON.stringify(draft.statuses);

                draft.health.hpCurr = draft.health.hpMax;
                updatesToSave['hp-curr'] = draft.health.hpCurr;
                draft.will.willCurr = draft.will.willMax;
                updatesToSave['will-curr'] = draft.will.willCurr;
            }

            if (!isReverting && targetTransformation === 'Custom' && customFormId) {
                const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
                if (targetForm) {
                    if (targetForm.healHp) {
                        draft.health.hpCurr = draft.health.hpMax;
                        updatesToSave['hp-curr'] = draft.health.hpCurr;
                    }
                    if (targetForm.healWill) {
                        draft.will.willCurr = draft.will.willMax;
                        updatesToSave['will-curr'] = draft.will.willMax;
                    }
                }
            }

            // 4. Final Updates
            handleTokenImageSwap(state, draft, isReverting, targetTransformation, customFormId, revertConfig);

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {
                console.error('Failed to save transformation to Owlbear', e);
            }

            return draft;
        }),

    applySpeciesData: (data, wipeData = true, updateStats = true) => {
        set((state) => {
            if (!data || (!data.Name && !data.Moves)) return state;
            const newStats = { ...state.stats };
            const updatesToSave: Record<string, unknown> = {};
            const newHealth = { ...state.health };
            const newWill = { ...state.will };

            if (updateStats) {
                const applyStat = (statKey: CombatStat, dataBase: number, dataMax: number) => {
                    newStats[statKey] = { ...newStats[statKey], base: dataBase, limit: dataMax };
                    updatesToSave[`${statKey}-base`] = dataBase;
                    updatesToSave[`${statKey}-limit`] = dataMax;
                };

                applyStat(CombatStat.STR, getBase(data, 'Strength', 2), getLimit(data, 'Strength'));
                applyStat(CombatStat.DEX, getBase(data, 'Dexterity', 2), getLimit(data, 'Dexterity'));
                applyStat(CombatStat.VIT, getBase(data, 'Vitality', 2), getLimit(data, 'Vitality'));
                applyStat(CombatStat.SPE, getBase(data, 'Special', 2), getLimit(data, 'Special'));
                applyStat(CombatStat.INS, getBase(data, 'Insight', 1), getLimit(data, 'Insight'));

                const baseStats = data.BaseStats as Record<string, unknown> | undefined;
                newHealth.hpBase = Number(data.BaseHP || (baseStats && baseStats.HP)) || 4;
                updatesToSave['hp-base'] = newHealth.hpBase;
            }

            const abilities = extractAbilities(data);
            const learnsetArray = parseLearnset(data.Moves);

            let heightStr = '';
            if (typeof data.Height === 'object' && data.Height !== null) {
                const h = data.Height as { Meters?: number; Feet?: number };
                heightStr = `${h.Meters || 0}m / ${h.Feet || 0}ft`;
            } else if (typeof data.Height === 'string') {
                heightStr = data.Height;
            }

            let weightStr = '';
            if (typeof data.Weight === 'object' && data.Weight !== null) {
                const w = data.Weight as { Kilograms?: number; Pounds?: number };
                weightStr = `${w.Kilograms || 0}kg / ${w.Pounds || 0}lbs`;
            } else if (typeof data.Weight === 'string') {
                weightStr = data.Weight;
            }

            const newIdentity = {
                ...state.identity,
                species: String(data.Name || state.identity.species),
                type1: String(data.Type1 || ''),
                type2: String(data.Type2 || ''),
                availableAbilities: abilities,
                ability: abilities.length > 0 ? abilities[0] : '',
                learnset: learnsetArray,
                dexId: String(data.DexID || ''),
                dexCategory: String(data.DexCategory || ''),
                height: heightStr,
                weight: weightStr,
                dexDescription: String(data.DexDescription || '')
            };

            updatesToSave['species'] = newIdentity.species;
            updatesToSave['type1'] = newIdentity.type1;
            updatesToSave['type2'] = newIdentity.type2;
            updatesToSave['ability'] = newIdentity.ability;
            updatesToSave['ability-list'] = abilities.join(',');
            updatesToSave['dex-id'] = newIdentity.dexId;
            updatesToSave['dex-category'] = newIdentity.dexCategory;
            updatesToSave['height'] = newIdentity.height;
            updatesToSave['weight'] = newIdentity.weight;
            updatesToSave['dex-description'] = newIdentity.dexDescription;

            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave);

            let newSkills = { ...state.skills };
            let newMoves = [...state.moves];
            let newChecks = [...state.skillChecks];

            if (wipeData) {
                Object.values(Skill).forEach((sk) => {
                    newSkills[sk as Skill] = { ...newSkills[sk as Skill], base: 0, buff: 0 };
                    updatesToSave[`${sk}-base`] = 0;
                    updatesToSave[`${sk}-buff`] = 0;
                });
                newMoves = [];
                updatesToSave['moves-data'] = '[]';
                newChecks = [];
                updatesToSave['skill-checks-data'] = '[]';
            }

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}

            return {
                stats: newStats,
                health: newHealth,
                will: newWill,
                identity: newIdentity,
                skills: newSkills,
                moves: newMoves,
                skillChecks: newChecks
            };
        });

        // NATIVE OBR SYNC SIDE EFFECT
        // Executed OUTSIDE the set() function so it fires properly after the state updates!
        const tokenId = get().tokenId;
        const targetName = String(data.Name || get().identity.species);

        if (OBR.isAvailable && tokenId && data.Name) {
            // 250ms timeout to ensure this runs completely separate from any batching or saveToOwlbear races!
            setTimeout(() => {
                OBR.scene.items
                    .updateItems([tokenId], (items: Item[]) => {
                        for (const item of items) {
                            item.name = targetName;
                        }
                    })
                    .catch((e: unknown) => console.warn('Failed to update OBR item name on manual species change:', e));
            }, 250);
        }
    },

    refreshSpeciesData: (data) =>
        set((state) => {
            if (!data || (!data.Name && !data.Moves)) return state;

            const dataRecord = data as Record<string, unknown>;

            const abilities = extractAbilities(dataRecord);
            const learnsetArray = parseLearnset(dataRecord.Moves);

            let newAbility = state.identity.ability;
            // ONLY override the ability if the user hasn't selected one yet
            // This protects Homebrew abilities from being wiped!
            if (!newAbility && abilities.length > 0) {
                newAbility = abilities[0].replace(' (HA)', '');
            }

            // DO NOT override types if the user already has custom types set!
            const newType1 = state.identity.type1 || String(dataRecord.Type1 || '');
            const newType2 = state.identity.type2 || String(dataRecord.Type2 || '');

            let heightStr = state.identity.height;
            // ONLY populate height if currently empty
            if (!heightStr) {
                if (typeof dataRecord.Height === 'object' && dataRecord.Height !== null) {
                    const h = dataRecord.Height as { Meters?: number; Feet?: number };
                    heightStr = `${h.Meters || 0}m / ${h.Feet || 0}ft`;
                } else if (typeof dataRecord.Height === 'string') {
                    heightStr = dataRecord.Height;
                }
            }

            let weightStr = state.identity.weight;
            // ONLY populate weight if currently empty
            if (!weightStr) {
                if (typeof dataRecord.Weight === 'object' && dataRecord.Weight !== null) {
                    const w = dataRecord.Weight as { Kilograms?: number; Pounds?: number };
                    weightStr = `${w.Kilograms || 0}kg / ${w.Pounds || 0}lbs`;
                } else if (typeof dataRecord.Weight === 'string') {
                    weightStr = dataRecord.Weight;
                }
            }

            const newStats = {
                ...state.stats,
                [CombatStat.STR]: { ...state.stats[CombatStat.STR], limit: getLimit(dataRecord, 'Strength') },
                [CombatStat.DEX]: { ...state.stats[CombatStat.DEX], limit: getLimit(dataRecord, 'Dexterity') },
                [CombatStat.VIT]: { ...state.stats[CombatStat.VIT], limit: getLimit(dataRecord, 'Vitality') },
                [CombatStat.SPE]: { ...state.stats[CombatStat.SPE], limit: getLimit(dataRecord, 'Special') },
                [CombatStat.INS]: { ...state.stats[CombatStat.INS], limit: getLimit(dataRecord, 'Insight') }
            };

            const newIdentity = {
                ...state.identity,
                availableAbilities: abilities,
                ability: newAbility,
                learnset: learnsetArray,
                type1: newType1,
                type2: newType2,
                dexId: state.identity.dexId || String(dataRecord.DexID || ''),
                dexCategory: state.identity.dexCategory || String(dataRecord.DexCategory || ''),
                height: heightStr,
                weight: weightStr,
                dexDescription: state.identity.dexDescription || String(dataRecord.DexDescription || '')
            };

            const newHealth = { ...state.health };
            const newWill = { ...state.will };

            const updatesToSave: Record<string, unknown> = {
                ability: newAbility,
                'ability-list': abilities.join(','),
                type1: newType1,
                type2: newType2,
                'str-limit': newStats[CombatStat.STR].limit,
                'dex-limit': newStats[CombatStat.DEX].limit,
                'vit-limit': newStats[CombatStat.VIT].limit,
                'spe-limit': newStats[CombatStat.SPE].limit,
                'ins-limit': newStats[CombatStat.INS].limit,
                'dex-id': newIdentity.dexId,
                'dex-category': newIdentity.dexCategory,
                height: newIdentity.height,
                weight: newIdentity.weight,
                'dex-description': newIdentity.dexDescription
            };

            // Always run the sync engine to ensure Max HP and Max Will match the latest stat limits
            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave);

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}

            return {
                identity: newIdentity,
                stats: newStats,
                health: newHealth,
                will: newWill
            };
        })
});
