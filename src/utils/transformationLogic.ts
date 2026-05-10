import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CharacterState, TransformationType, TeraBlastConfig, MoveData } from '../store/storeTypes';
import { CombatStat, SocialStat } from '../types/enums';
import { createFormBackup, restoreFormBackup, convertMovesToMax, type RestoreConfig } from './macroHelpers';
import { fetchMoveData } from './api';

export interface TransformationDraft {
    identity: CharacterState['identity'];
    health: CharacterState['health'];
    will: CharacterState['will'];
    derived: CharacterState['derived'];
    stats: CharacterState['stats'];
    socials: CharacterState['socials'];
    moves: CharacterState['moves'];
    skills: CharacterState['skills'];
    statuses: CharacterState['statuses'];
    effects: CharacterState['effects'];
    trackers: CharacterState['trackers'];
}

export function processReversion(
    draft: TransformationDraft,
    state: CharacterState,
    updatesToSave: Record<string, unknown>
): RestoreConfig {
    const previousTrans = state.identity.activeTransformation;
    const wasFainted = state.health.hpCurr <= 0;

    let shouldWipeTempHp = false;
    let shouldWipeTempWill = false;
    let revertConfig: RestoreConfig = {};
    let shouldRestoreImage = false;

    if (previousTrans === 'Mega') {
        const backupStr = createFormBackup(state, draft.health, draft.will, draft.statuses);
        draft.identity.altFormData = backupStr;
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
        if (state.identity.megaImageUrl) revertConfig.restoreImage = true;
    } else if (['Dynamax', 'Gigantamax'].includes(previousTrans)) {
        const backupStr = createFormBackup(state, draft.health, draft.will, draft.statuses);
        draft.identity.maxFormData = backupStr;
        updatesToSave['max-form-data'] = backupStr;
        revertConfig = { restoreMoves: true };
        shouldWipeTempHp = true;
        if (state.identity.maxImageUrl) revertConfig.restoreImage = true;
    } else if (previousTrans === 'Custom' && state.identity.activeFormId) {
        const backupStr = createFormBackup(state, draft.health, draft.will, draft.statuses);
        draft.identity.formSaves = { ...draft.identity.formSaves, [state.identity.activeFormId]: backupStr };
        updatesToSave['form-saves'] = JSON.stringify(draft.identity.formSaves);

        const activeForm = state.roomCustomForms.find((f) => f.id === state.identity.activeFormId);

        if (state.identity.customFormImages[state.identity.activeFormId]) {
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
    } else if (previousTrans === 'Terastallize') {
        draft.identity.terastallizeAffinity = '';
        draft.identity.terastallizeBonusActive = false;
        updatesToSave['terastallize-affinity'] = '';
        updatesToSave['terastallize-bonus-active'] = false;

        draft.moves = draft.moves.filter(
            (m) => !(m.name === 'Tera Blast' && m.desc === 'Changes Type to match Terastallization.')
        );
        updatesToSave['moves-data'] = JSON.stringify(draft.moves);

        if (state.identity.teraImageUrl) revertConfig.restoreImage = true;
    }

    if (shouldWipeTempHp) {
        draft.health.temporaryHitPoints = 0;
        draft.health.temporaryHitPointsMax = 0;
        updatesToSave['temporary-hit-points'] = 0;
        updatesToSave['temporary-hit-points-max'] = 0;
    }
    if (shouldWipeTempWill) {
        draft.will.temporaryWill = 0;
        draft.will.temporaryWillMax = 0;
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
        draft.health.hpCurr = 0;
        updatesToSave['hp-curr'] = 0;
    }

    if (previousTrans === 'Gigantamax') {
        draft.stats[CombatStat.STR].buff = Math.max(0, draft.stats[CombatStat.STR].buff - 2);
        draft.stats[CombatStat.SPE].buff = Math.max(0, draft.stats[CombatStat.SPE].buff - 2);
        draft.stats[CombatStat.DEX].buff = Math.max(0, draft.stats[CombatStat.DEX].buff - 2);
        draft.derived.defBuff = Math.max(0, draft.derived.defBuff - 2);
        draft.derived.sdefBuff = Math.max(0, draft.derived.sdefBuff - 2);

        updatesToSave[`${CombatStat.STR}-buff`] = draft.stats[CombatStat.STR].buff;
        updatesToSave[`${CombatStat.SPE}-buff`] = draft.stats[CombatStat.SPE].buff;
        updatesToSave[`${CombatStat.DEX}-buff`] = draft.stats[CombatStat.DEX].buff;
        updatesToSave['def-buff'] = draft.derived.defBuff;
        updatesToSave['spd-buff'] = draft.derived.sdefBuff;
    }

    draft.effects = draft.effects.filter((e) => !e.name.includes('Timer'));
    updatesToSave['effects-data'] = JSON.stringify(draft.effects);

    draft.identity.activeTransformation = 'None';
    draft.identity.activeFormId = '';
    draft.identity.customFormConfig = {};

    draft.trackers.firstHitAcc = false;
    draft.trackers.firstHitDmg = false;

    updatesToSave['active-transformation'] = 'None';
    updatesToSave['active-form-id'] = '';
    updatesToSave['custom-form-config'] = '{}';
    updatesToSave['first-hit-acc-active'] = false;
    updatesToSave['first-hit-dmg-active'] = false;

    return revertConfig;
}

export function processTransformation(
    draft: TransformationDraft,
    state: CharacterState,
    updatesToSave: Record<string, unknown>,
    targetTransformation: TransformationType,
    customFormId?: string,
    affinity?: string,
    teraBlastConfig?: TeraBlastConfig,
    autoMaxMoves?: boolean
) {
    const backupStr = createFormBackup(state, draft.health, draft.will, draft.statuses);
    draft.identity.baseFormData = backupStr;
    updatesToSave['base-form-data'] = backupStr;

    if (targetTransformation === 'Mega') {
        draft.health.temporaryHitPoints = 0;
        draft.health.temporaryHitPointsMax = 0;
        updatesToSave['temporary-hit-points'] = 0;
        updatesToSave['temporary-hit-points-max'] = 0;
        draft.will.temporaryWill = 0;
        draft.will.temporaryWillMax = 0;
        updatesToSave['temporary-will'] = 0;
        updatesToSave['temporary-will-max'] = 0;
    } else if (targetTransformation === 'Custom' && customFormId) {
        const targetForm = state.roomCustomForms.find((f) => f.id === customFormId);
        if (targetForm) {
            if (targetForm.restoreHp) {
                draft.health.temporaryHitPoints = 0;
                draft.health.temporaryHitPointsMax = 0;
                updatesToSave['temporary-hit-points'] = 0;
                updatesToSave['temporary-hit-points-max'] = 0;
            }
            if (targetForm.restoreWill) {
                draft.will.temporaryWill = 0;
                draft.will.temporaryWillMax = 0;
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
            draft.trackers.firstHitAcc = true;
            draft.trackers.firstHitDmg = true;
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

            draft.identity.customFormConfig = savedConfig as Record<string, boolean>;
            updatesToSave['custom-form-config'] = JSON.stringify(savedConfig);

            if (draft.identity.formSaves[customFormId]) {
                restoreFormBackup(draft.identity.formSaves[customFormId], draft, updatesToSave, activateConfig);
            }

            if (targetForm.tempHp > 0) {
                draft.health.temporaryHitPoints = targetForm.tempHp;
                draft.health.temporaryHitPointsMax = targetForm.tempHp;
                updatesToSave['temporary-hit-points'] = targetForm.tempHp;
                updatesToSave['temporary-hit-points-max'] = targetForm.tempHp;
            }
            if (targetForm.tempWill > 0) {
                draft.will.temporaryWill = targetForm.tempWill;
                draft.will.temporaryWillMax = targetForm.tempWill;
                updatesToSave['temporary-will'] = targetForm.tempWill;
                updatesToSave['temporary-will-max'] = targetForm.tempWill;
            }
            if (targetForm.freshStatuses || targetForm.wipeStatuses) {
                draft.statuses = [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
                updatesToSave['status-list'] = JSON.stringify(draft.statuses);
            }
            if (targetForm.freshDebuffs || targetForm.wipeDebuffs) {
                Object.values(CombatStat).forEach((s) => {
                    draft.stats[s].debuff = 0;
                    updatesToSave[`${s}-debuff`] = 0;
                });
                Object.values(SocialStat).forEach((s) => {
                    draft.socials[s].debuff = 0;
                    updatesToSave[`${s}-debuff`] = 0;
                });
                draft.derived.defDebuff = 0;
                updatesToSave['def-debuff'] = 0;
                draft.derived.sdefDebuff = 0;
                updatesToSave['spd-debuff'] = 0;
            }
            if (targetForm.freshBuffs || targetForm.wipeBuffs) {
                Object.values(CombatStat).forEach((s) => {
                    draft.stats[s].buff = 0;
                    updatesToSave[`${s}-buff`] = 0;
                });
                Object.values(SocialStat).forEach((s) => {
                    draft.socials[s].buff = 0;
                    updatesToSave[`${s}-buff`] = 0;
                });
                draft.derived.defBuff = 0;
                updatesToSave['def-buff'] = 0;
                draft.derived.sdefBuff = 0;
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
                            desc: 'Granted by Custom Form',
                            marker: ''
                        });

                        fetchMoveData(moveName)
                            .then((data) => {
                                if (data) {
                                    useCharacterStore
                                        .getState()
                                        .applyMoveData(newMoveId, data as Record<string, unknown>);
                                }
                            })
                            .catch((e) => console.warn('Failed to fetch granted move:', e));
                    }
                });
                updatesToSave['moves-data'] = JSON.stringify(draft.moves);
            }

            draft.identity.activeFormId = customFormId;
            updatesToSave['active-form-id'] = customFormId;
        }
    }

    if (targetTransformation === 'Terastallize' && affinity) {
        draft.identity.terastallizeAffinity = affinity;
        draft.identity.terastallizeBonusActive = true;
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
                desc: 'Changes Type to match Terastallization.',
                marker: ''
            };
            draft.moves.push(teraBlastMove);
            updatesToSave['moves-data'] = JSON.stringify(draft.moves);
        }
    } else if (targetTransformation === 'Dynamax' || targetTransformation === 'Gigantamax') {
        draft.health.temporaryHitPoints = targetTransformation === 'Dynamax' ? 6 : 12;
        draft.health.temporaryHitPointsMax = draft.health.temporaryHitPoints;

        updatesToSave['temporary-hit-points'] = draft.health.temporaryHitPoints;
        updatesToSave['temporary-hit-points-max'] = draft.health.temporaryHitPointsMax;

        draft.effects = [
            ...draft.effects,
            { id: crypto.randomUUID(), name: `${targetTransformation} Timer`, rounds: 3 }
        ];
        updatesToSave['effects-data'] = JSON.stringify(draft.effects);

        if (targetTransformation === 'Gigantamax') {
            draft.stats[CombatStat.STR].buff += 2;
            draft.stats[CombatStat.SPE].buff += 2;
            draft.stats[CombatStat.DEX].buff += 2;
            draft.derived.defBuff += 2;
            draft.derived.sdefBuff += 2;

            updatesToSave[`${CombatStat.STR}-buff`] = draft.stats[CombatStat.STR].buff;
            updatesToSave[`${CombatStat.SPE}-buff`] = draft.stats[CombatStat.SPE].buff;
            updatesToSave[`${CombatStat.DEX}-buff`] = draft.stats[CombatStat.DEX].buff;
            updatesToSave['def-buff'] = draft.derived.defBuff;
            updatesToSave['spd-buff'] = draft.derived.sdefBuff;
        }

        if (autoMaxMoves && !state.identity.maxFormData) {
            draft.moves = convertMovesToMax(draft.moves, state.roomCustomTypes);
            updatesToSave['moves-data'] = JSON.stringify(draft.moves);
        }
    }

    draft.identity.activeTransformation = targetTransformation;
    updatesToSave['active-transformation'] = targetTransformation;
}

export function handleTokenImageSwap(
    state: CharacterState,
    draft: TransformationDraft,
    isReverting: boolean,
    targetTransformation: TransformationType,
    customFormId?: string,
    revertConfig?: RestoreConfig
) {
    if (!OBR.isAvailable || !state.tokenId) return;

    let targetUrl = '';
    if (isReverting && draft.identity.tokenImageUrl) {
        if (revertConfig?.restoreImage) targetUrl = draft.identity.tokenImageUrl;
    } else if (!isReverting) {
        if (targetTransformation === 'Custom' && customFormId) {
            if (state.identity.customFormImages[customFormId]) {
                targetUrl = state.identity.customFormImages[customFormId];
                draft.identity.tokenImageUrl = targetUrl;
            }
        } else if (targetTransformation === 'Mega' && state.identity.megaImageUrl) {
            targetUrl = state.identity.megaImageUrl;
            draft.identity.tokenImageUrl = targetUrl;
        } else if (
            (targetTransformation === 'Dynamax' || targetTransformation === 'Gigantamax') &&
            state.identity.maxImageUrl
        ) {
            targetUrl = state.identity.maxImageUrl;
            draft.identity.tokenImageUrl = targetUrl;
        } else if (targetTransformation === 'Terastallize' && state.identity.teraImageUrl) {
            targetUrl = state.identity.teraImageUrl;
            draft.identity.tokenImageUrl = targetUrl;
        }
    }

    if (targetUrl) {
        OBR.scene.items
            .updateItems([state.tokenId], (items) => {
                for (const item of items) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const imgItem = item as any;
                    if (imgItem.image) imgItem.image.url = targetUrl;
                }
            })
            .catch((e) => console.warn('Failed to update token image:', e));
    }
}
