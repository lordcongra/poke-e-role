import type { StateCreator } from 'zustand';
import type { CharacterState, MacroSlice } from '../storeTypes';
import { CombatStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/sync/obr';
import OBR from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import {
    syncHealthAndWill,
    type RestoreConfig,
    getBase,
    getLimit,
    extractAbilities,
    parseLearnset,
    parseHeight,
    parseWeight
} from '../../utils/common/macroHelpers';
import {
    processReversion,
    processTransformation,
    handleTokenImageSwap,
    type TransformationDraft
} from '../../utils/common/transformationLogic';
import { executeSpeciesChange, sanitizeType } from '../../utils/common/speciesChangeLogic';

export const createMacroSlice: StateCreator<CharacterState, [], [], MacroSlice> = (set, get) => ({
    setMode: (newMode) =>
        set((state) => {
            const wasTrainer = state.identity.mode !== 'Pokémon';
            const isTrainer = newMode !== 'Pokémon';

            // If switching between 'Trainer' and 'Trainer (Special)', simply update mode without wiping or restoring backups
            if (wasTrainer && isTrainer) {
                const isSpecial = newMode === 'Trainer (Special)';
                const clashLabel = isSpecial ? 'Channel' : 'Weapon';
                const newSkills = { ...state.skills };
                newSkills[Skill.CLASH] = { ...newSkills[Skill.CLASH], customName: clashLabel };

                const updatesToSave: Record<string, unknown> = {
                    mode: newMode,
                    [`label-${Skill.CLASH}`]: clashLabel
                };
                const newIdentity = { ...state.identity, mode: newMode };
                try {
                    saveToOwlbear(updatesToSave);
                } catch (e) {
                    console.error('[MacroSlice] Failed to save mode switch metadata to Owlbear.', e);
                }
                return { identity: newIdentity, skills: newSkills };
            }

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

            const isSpecial = newMode === 'Trainer (Special)';
            const newSkills = { ...state.skills };
            newSkills[Skill.CHANNEL] = { ...newSkills[Skill.CHANNEL], customName: isTrainer ? 'Throw' : 'Channel' };
            newSkills[Skill.CLASH] = {
                ...newSkills[Skill.CLASH],
                customName: isSpecial ? 'Channel' : isTrainer ? 'Weapon' : 'Clash'
            };
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
                } catch (e) {
                    console.warn('[MacroSlice] Failed to parse backup data during mode switch.', e);
                }
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
            } catch (e) {
                console.error('[MacroSlice] Failed to save mode switch metadata to Owlbear.', e);
            }

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

                if (costHp > 0) {
                    const totalEffectiveHp = draft.health.hpCurr + (draft.health.temporaryHitPoints || 0);
                    if (totalEffectiveHp <= costHp) {
                        if (OBR.isAvailable) OBR.notification.show('Not enough HP to safely transform!', 'ERROR');
                        return state;
                    }

                    let remainingHpCost = costHp;
                    if (draft.health.temporaryHitPoints > 0) {
                        const deduct = Math.min(draft.health.temporaryHitPoints, remainingHpCost);
                        draft.health.temporaryHitPoints -= deduct;
                        remainingHpCost -= deduct;
                        updatesToSave['temporary-hit-points'] = draft.health.temporaryHitPoints;
                    }
                    if (remainingHpCost > 0) {
                        draft.health.hpCurr -= remainingHpCost;
                    }
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

            // 4. Final Updates (Pass updatesToSave so the image actually gets stored!)
            handleTokenImageSwap(
                state,
                draft,
                updatesToSave,
                isReverting,
                targetTransformation,
                customFormId,
                revertConfig
            );

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {
                console.error('[MacroSlice] Failed to save transformation to Owlbear.', e);
            }

            return draft;
        }),

    applySpeciesData: (data, wipeData = true, updateStats = true) => {
        set((state) => {
            if (!data || (!data.Name && !data.Moves)) return state;

            const { nextState, updatesToSave } = executeSpeciesChange(
                state,
                data as Record<string, unknown>,
                wipeData,
                updateStats
            );

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {
                console.error('[MacroSlice] Failed to save applied species data to Owlbear.', e);
            }

            return nextState;
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
                    .catch((e) =>
                        console.warn('[MacroSlice] Failed to update OBR item name on manual species change:', e)
                    );
            }, 250);
        }
    },

    refreshSpeciesData: (data, shouldSave = true) =>
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
            const newType2 = sanitizeType(state.identity.type2 || String(dataRecord.Type2 || ''));

            const heightStr = state.identity.height || parseHeight(dataRecord.Height);
            const weightStr = state.identity.weight || parseWeight(dataRecord.Weight);

            // Detect if base stats are at generic uninitialized defaults (2, 2, 2, 2, 1 and hpBase 4)
            const isDefaultBaseStats =
                state.stats[CombatStat.STR].base === 2 &&
                state.stats[CombatStat.DEX].base === 2 &&
                state.stats[CombatStat.VIT].base === 2 &&
                state.stats[CombatStat.SPE].base === 2 &&
                state.stats[CombatStat.INS].base === 1 &&
                state.health.hpBase === 4;

            const baseStats = dataRecord.BaseStats as Record<string, unknown> | undefined;
            const speciesHpBase = Number(dataRecord.BaseHP || (baseStats && baseStats.HP)) || 0;
            const needsBaseRecovery =
                isDefaultBaseStats &&
                (speciesHpBase > 0 || dataRecord.Dexterity !== undefined || dataRecord.Strength !== undefined);

            const newStats = {
                ...state.stats,
                [CombatStat.STR]: {
                    ...state.stats[CombatStat.STR],
                    limit: getLimit(dataRecord, 'Strength'),
                    ...(needsBaseRecovery ? { base: getBase(dataRecord, 'Strength', 2) } : {})
                },
                [CombatStat.DEX]: {
                    ...state.stats[CombatStat.DEX],
                    limit: getLimit(dataRecord, 'Dexterity'),
                    ...(needsBaseRecovery ? { base: getBase(dataRecord, 'Dexterity', 2) } : {})
                },
                [CombatStat.VIT]: {
                    ...state.stats[CombatStat.VIT],
                    limit: getLimit(dataRecord, 'Vitality'),
                    ...(needsBaseRecovery ? { base: getBase(dataRecord, 'Vitality', 2) } : {})
                },
                [CombatStat.SPE]: {
                    ...state.stats[CombatStat.SPE],
                    limit: getLimit(dataRecord, 'Special'),
                    ...(needsBaseRecovery ? { base: getBase(dataRecord, 'Special', 2) } : {})
                },
                [CombatStat.INS]: {
                    ...state.stats[CombatStat.INS],
                    limit: getLimit(dataRecord, 'Insight'),
                    ...(needsBaseRecovery ? { base: getBase(dataRecord, 'Insight', 1) } : {})
                }
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
            if (needsBaseRecovery && speciesHpBase > 0) {
                newHealth.hpBase = speciesHpBase;
            }
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

            if (needsBaseRecovery) {
                updatesToSave['str-base'] = newStats[CombatStat.STR].base;
                updatesToSave['dex-base'] = newStats[CombatStat.DEX].base;
                updatesToSave['vit-base'] = newStats[CombatStat.VIT].base;
                updatesToSave['spe-base'] = newStats[CombatStat.SPE].base;
                updatesToSave['ins-base'] = newStats[CombatStat.INS].base;
                if (speciesHpBase > 0) updatesToSave['hp-base'] = newHealth.hpBase;
            }

            // Always run the sync engine to ensure Max HP and Max Will match the latest stat limits (preventing current gain)
            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave, !needsBaseRecovery);

            if (shouldSave) {
                try {
                    saveToOwlbear(updatesToSave);
                } catch (e) {
                    console.error('[MacroSlice] Failed to save refreshed species data to Owlbear.', e);
                }
            }

            return {
                identity: newIdentity,
                stats: newStats,
                health: newHealth,
                will: newWill
            };
        })
});
