import type { StateCreator } from 'zustand';
import type { CharacterState, MacroSlice, MoveData } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import OBR from '@owlbear-rodeo/sdk';
import {
    parseLearnset,
    getLimit,
    getBase,
    extractAbilities,
    syncHealthAndWill,
    createFormBackup,
    restoreFormBackup,
    convertMovesToMax,
    type RestoreConfig
} from '../../utils/macroHelpers';
import { fetchMoveData } from '../../utils/api';

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

            const newIdentity = { ...state.identity };
            const newTrackers = { ...state.trackers };
            const newStats = { ...state.stats };
            const newSocials = { ...state.socials };
            const newHealth = { ...state.health };
            const newWill = { ...state.will };
            const newDerived = { ...state.derived };
            let newStatuses = [...state.statuses];
            let newEffects = [...state.effects];

            const draft = {
                identity: newIdentity,
                health: newHealth,
                will: newWill,
                derived: newDerived,
                stats: newStats,
                socials: newSocials,
                moves: [...state.moves],
                skills: { ...state.skills },
                statuses: newStatuses
            };

            const updatesToSave: Record<string, unknown> = {};
            let shouldRestoreImage = false;

            if (isReverting) {
                const previousTrans = state.identity.activeTransformation;
                const wasFainted = state.health.hpCurr <= 0;
                
                let revertConfig: RestoreConfig = {};
                let shouldWipeTempHp = false;
                let shouldWipeTempWill = false;

                if (previousTrans === 'Mega') {
                    const backupStr = createFormBackup(state, newHealth, newWill, draft.statuses);
                    newIdentity.altFormData = backupStr;
                    updatesToSave['alt-form-data'] = backupStr;
                    revertConfig = {
                        restoreBaseStats: true,
                        restoreStatLimits: true,
                        restoreStatRanks: true,
                        restoreSkills: true,
                        restoreMoves: true,
                        restoreTyping: true,
                        restoreAbilities: true,
                        restoreHp: true,
                        restoreWill: true,
                        restoreStatuses: true,
                        restoreBuffs: false,
                        restoreDebuffs: false
                    };
                    shouldWipeTempHp = true;
                    shouldWipeTempWill = true;
                } else if (['Dynamax', 'Gigantamax'].includes(previousTrans)) {
                    const backupStr = createFormBackup(state, newHealth, newWill, draft.statuses);
                    newIdentity.maxFormData = backupStr;
                    updatesToSave['max-form-data'] = backupStr;
                    revertConfig = { restoreMoves: true };
                    shouldWipeTempHp = true;
                } else if (previousTrans === 'Custom' && state.identity.activeFormId) {
                    const backupStr = createFormBackup(state, newHealth, newWill, draft.statuses);
                    newIdentity.formSaves = { ...newIdentity.formSaves, [state.identity.activeFormId]: backupStr };
                    updatesToSave['form-saves'] = JSON.stringify(newIdentity.formSaves);

                    const activeForm = state.roomCustomForms.find((f) => f.id === state.identity.activeFormId);
                    
                    if (activeForm && activeForm.imageUrl) {
                        shouldRestoreImage = true;
                    }

                    revertConfig =
                        state.identity.customFormConfig && Object.keys(state.identity.customFormConfig).length > 0
                            ? state.identity.customFormConfig
                            : activeForm
                              ? {
                                    restoreBaseStats: activeForm.swapBaseStats,
                                    restoreStatLimits: activeForm.swapStatLimits,
                                    restoreStatRanks: activeForm.swapStatRanks,
                                    restoreSkills: activeForm.swapSkills,
                                    restoreMoves: activeForm.swapMoves,
                                    restoreTyping: activeForm.swapTyping,
                                    restoreAbilities: activeForm.swapAbilities,
                                    restoreHp: activeForm.restoreHp,
                                    restoreWill: activeForm.restoreWill,
                                    restoreBuffs: activeForm.swapBuffs || activeForm.freshBuffs,
                                    restoreDebuffs: activeForm.swapDebuffs || activeForm.freshDebuffs,
                                    restoreStatuses: activeForm.swapStatuses || activeForm.freshStatuses
                                }
                              : {
                                    restoreBaseStats: true,
                                    restoreStatLimits: true,
                                    restoreStatRanks: true,
                                    restoreSkills: true,
                                    restoreMoves: true,
                                    restoreTyping: true,
                                    restoreAbilities: true,
                                    restoreHp: true,
                                    restoreWill: true
                                };

                    if (shouldRestoreImage) revertConfig.restoreImage = true;

                    if (!revertConfig.restoreMoves) {
                        const grantedMoves = activeForm ? activeForm.grantedMoves : [];
                        if (grantedMoves && grantedMoves.length > 0) {
                            const grantedNames = grantedMoves.map((m) => m.toLowerCase());
                            draft.moves = draft.moves.filter((m) => !grantedNames.includes(m.name.toLowerCase()));
                            updatesToSave['moves-data'] = JSON.stringify(draft.moves);
                        }
                    }
                    
                    if (activeForm) {
                        if (activeForm.restoreHp || activeForm.tempHp > 0) shouldWipeTempHp = true;
                        if (activeForm.restoreWill || activeForm.tempWill > 0) shouldWipeTempWill = true;
                    }
                }

                if (shouldWipeTempHp) {
                    newHealth.temporaryHitPoints = 0;
                    newHealth.temporaryHitPointsMax = 0;
                    updatesToSave['temporary-hit-points'] = 0;
                    updatesToSave['temporary-hit-points-max'] = 0;
                }
                if (shouldWipeTempWill) {
                    newWill.temporaryWill = 0;
                    newWill.temporaryWillMax = 0;
                    updatesToSave['temporary-will'] = 0;
                    updatesToSave['temporary-will-max'] = 0;
                }

                if (
                    ['Mega', 'Custom', 'Dynamax', 'Gigantamax', 'Terastallize'].includes(previousTrans) &&
                    state.identity.baseFormData
                ) {
                    restoreFormBackup(state.identity.baseFormData, draft, updatesToSave, revertConfig);
                }

                if (previousTrans === 'Mega' && wasFainted) {
                    newHealth.hpCurr = 0;
                    updatesToSave['hp-curr'] = 0;
                }

                if (previousTrans === 'Gigantamax') {
                    newStats[CombatStat.STR].buff = Math.max(0, newStats[CombatStat.STR].buff - 2);
                    newStats[CombatStat.SPE].buff = Math.max(0, newStats[CombatStat.SPE].buff - 2);
                    newStats[CombatStat.DEX].buff = Math.max(0, newStats[CombatStat.DEX].buff - 2);
                    newDerived.defBuff = Math.max(0, newDerived.defBuff - 2);
                    newDerived.sdefBuff = Math.max(0, newDerived.sdefBuff - 2);

                    updatesToSave[`${CombatStat.STR}-buff`] = newStats[CombatStat.STR].buff;
                    updatesToSave[`${CombatStat.SPE}-buff`] = newStats[CombatStat.SPE].buff;
                    updatesToSave[`${CombatStat.DEX}-buff`] = newStats[CombatStat.DEX].buff;
                    updatesToSave['def-buff'] = newDerived.defBuff;
                    updatesToSave['spd-buff'] = newDerived.sdefBuff;
                }

                if (previousTrans === 'Terastallize') {
                    newIdentity.terastallizeAffinity = '';
                    newIdentity.terastallizeBonusActive = false;
                    updatesToSave['terastallize-affinity'] = '';
                    updatesToSave['terastallize-bonus-active'] = false;
                    
                    draft.moves = draft.moves.filter((m) => !(m.name === 'Tera Blast' && m.desc === 'Changes Type to match Terastallization.'));
                    updatesToSave['moves-data'] = JSON.stringify(draft.moves);
                }

                newEffects = newEffects.filter((e) => !e.name.includes('Timer'));
                updatesToSave['effects-data'] = JSON.stringify(newEffects);

                newIdentity.activeTransformation = 'None';
                newIdentity.activeFormId = '';
                newIdentity.customFormConfig = {};

                newTrackers.firstHitAcc = false;
                newTrackers.firstHitDmg = false;

                updatesToSave['active-transformation'] = 'None';
                updatesToSave['active-form-id'] = '';
                updatesToSave['custom-form-config'] = '{}';
                updatesToSave['first-hit-acc-active'] = false;
                updatesToSave['first-hit-dmg-active'] = false;
            } else {
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

                if (costHp > 0 && newHealth.hpCurr <= costHp) {
                    if (OBR.isAvailable) OBR.notification.show('Not enough HP to safely transform!', 'ERROR');
                    return state;
                }

                if (costWill > 0) {
                    let remainingWillCost = costWill;
                    if (newWill.temporaryWill > 0) {
                        const deduct = Math.min(newWill.temporaryWill, remainingWillCost);
                        newWill.temporaryWill -= deduct;
                        remainingWillCost -= deduct;
                        updatesToSave['temporary-will'] = newWill.temporaryWill;
                    }
                    if (remainingWillCost > 0) {
                        if (newWill.willCurr < remainingWillCost) {
                            if (OBR.isAvailable) OBR.notification.show('Not enough Willpower!', 'ERROR');
                            return state;
                        }
                        newWill.willCurr -= remainingWillCost;
                    }
                }

                newHealth.hpCurr -= costHp;

                if (['Mega', 'Dynamax', 'Gigantamax', 'Custom'].includes(targetTransformation)) {
                    const backupStr = createFormBackup(state, newHealth, newWill, draft.statuses);
                    newIdentity.baseFormData = backupStr;
                    updatesToSave['base-form-data'] = backupStr;

                    if (targetTransformation === 'Mega') {
                        newHealth.temporaryHitPoints = 0;
                        newHealth.temporaryHitPointsMax = 0;
                        updatesToSave['temporary-hit-points'] = 0;
                        updatesToSave['temporary-hit-points-max'] = 0;
                        newWill.temporaryWill = 0;
                        newWill.temporaryWillMax = 0;
                        updatesToSave['temporary-will'] = 0;
                        updatesToSave['temporary-will-max'] = 0;
                    } else if (targetTransformation === 'Custom' && customFormId) {
                        const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
                        if (targetForm) {
                            if (targetForm.restoreHp) {
                                newHealth.temporaryHitPoints = 0;
                                newHealth.temporaryHitPointsMax = 0;
                                updatesToSave['temporary-hit-points'] = 0;
                                updatesToSave['temporary-hit-points-max'] = 0;
                            }
                            if (targetForm.restoreWill) {
                                newWill.temporaryWill = 0;
                                newWill.temporaryWillMax = 0;
                                updatesToSave['temporary-will'] = 0;
                                updatesToSave['temporary-will-max'] = 0;
                            }
                        }
                    }

                    if (targetTransformation === 'Mega' && state.identity.altFormData) {
                        restoreFormBackup(state.identity.altFormData, draft, updatesToSave, {
                            restoreBaseStats: true,
                            restoreStatLimits: true,
                            restoreStatRanks: true,
                            restoreSkills: true,
                            restoreMoves: true,
                            restoreTyping: true,
                            restoreAbilities: true,
                            restoreHp: true,
                            restoreWill: true,
                            restoreStatuses: true
                        });
                    } else if (['Dynamax', 'Gigantamax'].includes(targetTransformation) && state.identity.maxFormData) {
                        restoreFormBackup(state.identity.maxFormData, draft, updatesToSave, { restoreMoves: true });
                    } else if (targetTransformation === 'Custom' && customFormId) {
                        const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
                        if (targetForm) {
                            newTrackers.firstHitAcc = true;
                            newTrackers.firstHitDmg = true;
                            updatesToSave['first-hit-acc-active'] = true;
                            updatesToSave['first-hit-dmg-active'] = true;

                            const activateConfig: RestoreConfig = {
                                restoreBaseStats: targetForm.swapBaseStats,
                                restoreStatLimits: targetForm.swapStatLimits,
                                restoreStatRanks: targetForm.swapStatRanks,
                                restoreSkills: targetForm.swapSkills,
                                restoreMoves: targetForm.swapMoves,
                                restoreTyping: targetForm.swapTyping,
                                restoreAbilities: targetForm.swapAbilities,
                                restoreHp: targetForm.restoreHp,
                                restoreWill: targetForm.restoreWill,
                                restoreBuffs: targetForm.swapBuffs,
                                restoreDebuffs: targetForm.swapDebuffs,
                                restoreStatuses: targetForm.swapStatuses
                            };

                            const savedConfig: RestoreConfig = {
                                restoreBaseStats: targetForm.swapBaseStats,
                                restoreStatLimits: targetForm.swapStatLimits,
                                restoreStatRanks: targetForm.swapStatRanks,
                                restoreSkills: targetForm.swapSkills,
                                restoreMoves: targetForm.swapMoves,
                                restoreTyping: targetForm.swapTyping,
                                restoreAbilities: targetForm.swapAbilities,
                                restoreHp: targetForm.restoreHp,
                                restoreWill: targetForm.restoreWill,
                                restoreBuffs: targetForm.swapBuffs || targetForm.freshBuffs,
                                restoreDebuffs: targetForm.swapDebuffs || targetForm.freshDebuffs,
                                restoreStatuses: targetForm.swapStatuses || targetForm.freshStatuses
                            };

                            newIdentity.customFormConfig = savedConfig as Record<string, boolean>;
                            updatesToSave['custom-form-config'] = JSON.stringify(savedConfig);

                            if (newIdentity.formSaves[customFormId]) {
                                restoreFormBackup(
                                    newIdentity.formSaves[customFormId],
                                    draft,
                                    updatesToSave,
                                    activateConfig
                                );
                            }

                            if (targetForm.tempHp > 0) {
                                newHealth.temporaryHitPoints = targetForm.tempHp;
                                newHealth.temporaryHitPointsMax = targetForm.tempHp;
                                updatesToSave['temporary-hit-points'] = targetForm.tempHp;
                                updatesToSave['temporary-hit-points-max'] = targetForm.tempHp;
                            }
                            if (targetForm.tempWill > 0) {
                                newWill.temporaryWill = targetForm.tempWill;
                                newWill.temporaryWillMax = targetForm.tempWill;
                                updatesToSave['temporary-will'] = targetForm.tempWill;
                                updatesToSave['temporary-will-max'] = targetForm.tempWill;
                            }
                            if (targetForm.freshStatuses || targetForm.wipeStatuses) {
                                draft.statuses = [
                                    { id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }
                                ];
                                updatesToSave['status-list'] = JSON.stringify(draft.statuses);
                            }
                            if (targetForm.freshDebuffs || targetForm.wipeDebuffs) {
                                Object.values(CombatStat).forEach((s) => {
                                    newStats[s].debuff = 0;
                                    updatesToSave[`${s}-debuff`] = 0;
                                });
                                Object.values(SocialStat).forEach((s) => {
                                    newSocials[s].debuff = 0;
                                    updatesToSave[`${s}-debuff`] = 0;
                                });
                                newDerived.defDebuff = 0;
                                updatesToSave['def-debuff'] = 0;
                                newDerived.sdefDebuff = 0;
                                updatesToSave['spd-debuff'] = 0;
                            }
                            if (targetForm.freshBuffs || targetForm.wipeBuffs) {
                                Object.values(CombatStat).forEach((s) => {
                                    newStats[s].buff = 0;
                                    updatesToSave[`${s}-buff`] = 0;
                                });
                                Object.values(SocialStat).forEach((s) => {
                                    newSocials[s].buff = 0;
                                    updatesToSave[`${s}-buff`] = 0;
                                });
                                newDerived.defBuff = 0;
                                updatesToSave['def-buff'] = 0;
                                newDerived.sdefBuff = 0;
                                updatesToSave['spd-buff'] = 0;
                            }
                            if (targetForm.grantedMoves && targetForm.grantedMoves.length > 0) {
                                targetForm.grantedMoves.forEach((moveName) => {
                                    if (!draft.moves.find((m) => m.name.toLowerCase() === moveName.toLowerCase())) {
                                        const newMoveId = crypto.randomUUID();
                                        draft.moves.push({
                                            id: newMoveId,
                                            active: false,
                                            name: moveName,
                                            type: 'Normal',
                                            category: 'Physical',
                                            acc1: 'str',
                                            acc2: 'none',
                                            dmg1: 'str',
                                            power: 1,
                                            desc: 'Granted by Custom Form'
                                        });

                                        fetchMoveData(moveName)
                                            .then((data) => {
                                                if (data) {
                                                    get().applyMoveData(newMoveId, data as Record<string, unknown>);
                                                }
                                            })
                                            .catch((e) => console.warn('Failed to fetch granted move:', e));
                                    }
                                });
                                updatesToSave['moves-data'] = JSON.stringify(draft.moves);
                            }

                            newIdentity.activeFormId = customFormId;
                            updatesToSave['active-form-id'] = customFormId;
                        }
                    }
                }

                if (targetTransformation === 'Terastallize') {
                    newIdentity.terastallizeAffinity = affinity;
                    newIdentity.terastallizeBonusActive = true;
                    updatesToSave['terastallize-affinity'] = affinity;
                    updatesToSave['terastallize-bonus-active'] = true;

                    if (teraBlastConfig) {
                        const teraBlastMove: MoveData = {
                            id: crypto.randomUUID(),
                            active: false,
                            name: 'Tera Blast',
                            type: affinity,
                            category: teraBlastConfig.category,
                            acc1: teraBlastConfig.acc1,
                            acc2: teraBlastConfig.acc2,
                            dmg1: teraBlastConfig.dmg1,
                            power: 3,
                            desc: 'Changes Type to match Terastallization.'
                        };
                        draft.moves.push(teraBlastMove);
                        updatesToSave['moves-data'] = JSON.stringify(draft.moves);
                    }
                } else if (targetTransformation === 'Dynamax' || targetTransformation === 'Gigantamax') {
                    newHealth.temporaryHitPoints = targetTransformation === 'Dynamax' ? 6 : 12;
                    newHealth.temporaryHitPointsMax = newHealth.temporaryHitPoints;

                    updatesToSave['temporary-hit-points'] = newHealth.temporaryHitPoints;
                    updatesToSave['temporary-hit-points-max'] = newHealth.temporaryHitPointsMax;

                    newEffects = [
                        ...newEffects,
                        { id: crypto.randomUUID(), name: `${targetTransformation} Timer`, rounds: 3 }
                    ];
                    updatesToSave['effects-data'] = JSON.stringify(newEffects);

                    if (targetTransformation === 'Gigantamax') {
                        newStats[CombatStat.STR].buff += 2;
                        newStats[CombatStat.SPE].buff += 2;
                        newStats[CombatStat.DEX].buff += 2;
                        newDerived.defBuff += 2;
                        newDerived.sdefBuff += 2;

                        updatesToSave[`${CombatStat.STR}-buff`] = newStats[CombatStat.STR].buff;
                        updatesToSave[`${CombatStat.SPE}-buff`] = newStats[CombatStat.SPE].buff;
                        updatesToSave[`${CombatStat.DEX}-buff`] = newStats[CombatStat.DEX].buff;
                        updatesToSave['def-buff'] = newDerived.defBuff;
                        updatesToSave['spd-buff'] = newDerived.sdefBuff;
                    }

                    if (autoMaxMoves && !state.identity.maxFormData) {
                        draft.moves = convertMovesToMax(draft.moves, state.roomCustomTypes);
                        updatesToSave['moves-data'] = JSON.stringify(draft.moves);
                    }
                }

                newIdentity.activeTransformation = targetTransformation;
                updatesToSave['active-transformation'] = targetTransformation;
            }

            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave, true);

            if (!isReverting && targetTransformation === 'Mega') {
                draft.statuses = [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
                updatesToSave['status-list'] = JSON.stringify(draft.statuses);
                
                newHealth.hpCurr = newHealth.hpMax;
                updatesToSave['hp-curr'] = newHealth.hpCurr;
                newWill.willCurr = newWill.willMax;
                updatesToSave['will-curr'] = newWill.willCurr;
            }

            if (!isReverting && targetTransformation === 'Custom' && customFormId) {
                const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
                if (targetForm) {
                    if (targetForm.healHp) {
                        newHealth.hpCurr = newHealth.hpMax;
                        updatesToSave['hp-curr'] = newHealth.hpCurr;
                    }
                    if (targetForm.healWill) {
                        newWill.willCurr = newWill.willMax;
                        updatesToSave['will-curr'] = newWill.willCurr;
                    }
                }
            }

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {
                console.error('Failed to save transformation to Owlbear', e);
            }
            
            // NATIVE OBR IMAGE SWAP LOGIC
            if (OBR.isAvailable && state.tokenId) {
                let targetUrl = '';
                if (isReverting && shouldRestoreImage && newIdentity.tokenImageUrl) {
                    targetUrl = newIdentity.tokenImageUrl;
                } else if (!isReverting && targetTransformation === 'Custom' && customFormId) {
                    const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
                    if (targetForm && targetForm.imageUrl) {
                        targetUrl = targetForm.imageUrl;
                        newIdentity.tokenImageUrl = targetUrl;
                    }
                }

                if (targetUrl) {
                    OBR.scene.items.updateItems([state.tokenId], (items) => {
                        for (const item of items) {
                            const imgItem = item as any;
                            if (imgItem.image) imgItem.image.url = targetUrl;
                        }
                    }).catch(e => console.warn("Failed to update token image:", e));
                }
            }

            return {
                identity: newIdentity,
                stats: newStats,
                socials: newSocials,
                health: newHealth,
                will: newWill,
                derived: newDerived,
                statuses: draft.statuses,
                effects: newEffects,
                moves: draft.moves,
                skills: draft.skills,
                trackers: newTrackers
            };
        }),

    applySpeciesData: (data, wipeData = true, updateStats = true) =>
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

            const newIdentity = {
                ...state.identity,
                type1: String(data.Type1 || ''),
                type2: String(data.Type2 || ''),
                availableAbilities: abilities,
                ability: abilities.length > 0 ? abilities[0] : '',
                learnset: learnsetArray
            };
            updatesToSave['type1'] = newIdentity.type1;
            updatesToSave['type2'] = newIdentity.type2;
            updatesToSave['ability'] = newIdentity.ability;
            updatesToSave['ability-list'] = abilities.join(',');

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
        }),

    refreshSpeciesData: (data) =>
        set((state) => {
            if (!data || (!data.Name && !data.Moves)) return state;

            const abilities = extractAbilities(data);
            const learnsetArray = parseLearnset(data.Moves);

            let newAbility = state.identity.ability;
            const cleanAbilities = abilities.map((a) => a.replace(' (HA)', '').toLowerCase());
            if (!cleanAbilities.includes(newAbility.toLowerCase()) && abilities.length > 0) {
                newAbility = abilities[0].replace(' (HA)', '');
            }

            const newType1 = String(data.Type1 || state.identity.type1 || '');
            const newType2 = String(data.Type2 || state.identity.type2 || '');

            const newStats = {
                ...state.stats,
                [CombatStat.STR]: { ...state.stats[CombatStat.STR], limit: getLimit(data, 'Strength') },
                [CombatStat.DEX]: { ...state.stats[CombatStat.DEX], limit: getLimit(data, 'Dexterity') },
                [CombatStat.VIT]: { ...state.stats[CombatStat.VIT], limit: getLimit(data, 'Vitality') },
                [CombatStat.SPE]: { ...state.stats[CombatStat.SPE], limit: getLimit(data, 'Special') },
                [CombatStat.INS]: { ...state.stats[CombatStat.INS], limit: getLimit(data, 'Insight') }
            };

            const updatesToSave = {
                ability: newAbility,
                'ability-list': abilities.join(','),
                type1: newType1,
                type2: newType2,
                'str-limit': newStats[CombatStat.STR].limit,
                'dex-limit': newStats[CombatStat.DEX].limit,
                'vit-limit': newStats[CombatStat.VIT].limit,
                'spe-limit': newStats[CombatStat.SPE].limit,
                'ins-limit': newStats[CombatStat.INS].limit
            };

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}

            return {
                identity: {
                    ...state.identity,
                    availableAbilities: abilities,
                    ability: newAbility,
                    learnset: learnsetArray,
                    type1: newType1,
                    type2: newType2
                },
                stats: newStats
            };
        })
});