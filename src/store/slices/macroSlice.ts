import type { StateCreator } from 'zustand';
import type { CharacterState, MacroSlice, TransformationType } from '../storeTypes';
import { CombatStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import OBR from '@owlbear-rodeo/sdk';
import {
    parseLearnset,
    getLimit,
    getBase,
    extractAbilities,
    syncHealthAndWill,
    createFormBackup,
    restoreFormBackup
} from '../../utils/macroHelpers';

export const createMacroSlice: StateCreator<CharacterState, [], [], MacroSlice> = (set) => ({
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

    toggleTransformation: (targetTransformation: TransformationType, affinity = '') =>
        set((state) => {
            const isCurrentlyTransformed = state.identity.activeTransformation !== 'None';
            const isReverting =
                targetTransformation === 'None' ||
                (isCurrentlyTransformed && state.identity.activeTransformation === targetTransformation);

            const newIdentity = { ...state.identity };
            const newStats = { ...state.stats };
            const newHealth = { ...state.health };
            const newWill = { ...state.will };
            const newDerived = { ...state.derived };
            let newStatuses = [...state.statuses];
            let newEffects = [...state.effects];

            const draft = {
                identity: newIdentity,
                health: newHealth,
                derived: newDerived,
                stats: newStats,
                moves: [...state.moves],
                skills: { ...state.skills }
            };

            const updatesToSave: Record<string, unknown> = {};

            if (isReverting) {
                const previousTrans = state.identity.activeTransformation;

                if (['Mega', 'Dynamax', 'Gigantamax', 'Custom'].includes(previousTrans)) {
                    const backupStr = createFormBackup(state);
                    newIdentity.altFormData = backupStr;
                    updatesToSave['alt-form-data'] = backupStr;

                    if (state.identity.baseFormData) {
                        restoreFormBackup(state.identity.baseFormData, draft, updatesToSave);
                    }
                }

                if (previousTrans === 'Terastallize') {
                    newIdentity.terastallizeAffinity = '';
                    newIdentity.terastallizeBonusActive = false;
                    updatesToSave['terastallize-affinity'] = '';
                    updatesToSave['terastallize-bonus-active'] = false;
                }

                newHealth.temporaryHitPoints = 0;
                updatesToSave['temporary-hit-points'] = 0;

                newEffects = newEffects.filter((e) => !e.name.includes('Timer'));
                updatesToSave['effects-data'] = JSON.stringify(newEffects);

                newIdentity.activeTransformation = 'None';
                updatesToSave['active-transformation'] = 'None';
            } else {
                if (targetTransformation === 'Mega' || targetTransformation === 'Terastallize') {
                    if (newWill.willCurr < 1) {
                        if (OBR.isAvailable) OBR.notification.show('Not enough Willpower!', 'ERROR');
                        return state;
                    }
                    newWill.willCurr -= 1;
                }

                if (['Mega', 'Dynamax', 'Gigantamax', 'Custom'].includes(targetTransformation)) {
                    const backupStr = createFormBackup(state);
                    newIdentity.baseFormData = backupStr;
                    updatesToSave['base-form-data'] = backupStr;

                    if (state.identity.altFormData) {
                        restoreFormBackup(state.identity.altFormData, draft, updatesToSave);
                    }
                }

                if (targetTransformation === 'Terastallize') {
                    newIdentity.terastallizeAffinity = affinity;
                    newIdentity.terastallizeBonusActive = true;
                    updatesToSave['terastallize-affinity'] = affinity;
                    updatesToSave['terastallize-bonus-active'] = true;
                } else if (targetTransformation === 'Dynamax') {
                    newHealth.temporaryHitPoints = 6;
                    updatesToSave['temporary-hit-points'] = 6;
                    newEffects = [...newEffects, { id: crypto.randomUUID(), name: 'Dynamax Timer', rounds: 3 }];
                    updatesToSave['effects-data'] = JSON.stringify(newEffects);
                } else if (targetTransformation === 'Gigantamax') {
                    newHealth.temporaryHitPoints = 12;
                    updatesToSave['temporary-hit-points'] = 12;
                    newEffects = [...newEffects, { id: crypto.randomUUID(), name: 'Gigantamax Timer', rounds: 3 }];
                    updatesToSave['effects-data'] = JSON.stringify(newEffects);

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

                newIdentity.activeTransformation = targetTransformation;
                updatesToSave['active-transformation'] = targetTransformation;
            }

            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave);

            if (!isReverting && targetTransformation === 'Mega') {
                newHealth.hpCurr = newHealth.hpMax;
                newWill.willCurr = newWill.willMax;
                updatesToSave['hp-curr'] = newHealth.hpCurr;
                updatesToSave['will-curr'] = newWill.willCurr;

                newStatuses = [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
                updatesToSave['status-list'] = JSON.stringify(newStatuses);
            }

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {
                console.error('Failed to save transformation to Owlbear', e);
            }

            return {
                identity: newIdentity,
                stats: newStats,
                health: newHealth,
                will: newWill,
                derived: newDerived,
                statuses: newStatuses,
                effects: newEffects,
                moves: draft.moves,
                skills: draft.skills
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
