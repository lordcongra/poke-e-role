import type { StateCreator } from 'zustand';
import type { CharacterState, MacroSlice } from '../storeTypes';
import { CombatStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import { parseCombatTags, getAbilityText } from '../../utils/combatMath';

const parseLearnset = (movesObj: unknown): Array<{ Learned: string; Name: string }> => {
    const result: Array<{ Learned: string; Name: string }> = [];
    if (Array.isArray(movesObj)) {
        movesObj.forEach((m: unknown) => {
            if (typeof m === 'string') result.push({ Learned: 'Other', Name: m });
            else if (typeof m === 'object' && m !== null) {
                const mRec = m as Record<string, unknown>;
                const rank = mRec.Learned || mRec.Learn || mRec.Level || mRec.Rank || 'Other';
                const name = mRec.Name || mRec.Move || '';
                if (name) result.push({ Learned: String(rank), Name: String(name) });
            }
        });
    } else if (typeof movesObj === 'object' && movesObj !== null) {
        Object.entries(movesObj).forEach(([rank, mList]) => {
            if (Array.isArray(mList)) {
                mList.forEach((m: unknown) => {
                    let name = '';
                    if (typeof m === 'string') name = m;
                    else if (typeof m === 'object' && m !== null) {
                        const mRec = m as Record<string, unknown>;
                        name = String(mRec.Name || mRec.Move || '');
                    }
                    if (name) result.push({ Learned: rank, Name: name });
                });
            }
        });
    }
    return result;
};

const getLimit = (pd: Record<string, unknown>, stat: string) => {
    const maxAttr = pd.MaxAttributes as Record<string, string | number> | undefined;
    const maxStats = pd.MaxStats as Record<string, string | number> | undefined;
    const val = pd[`Max${stat}`] || pd[`Max ${stat}`] || (maxAttr && maxAttr[stat]) || (maxStats && maxStats[stat]);
    return val ? parseInt(String(val)) : 5;
};

const getBase = (pd: Record<string, unknown>, stat: string, fallback: number) => {
    const baseAttr = pd.Attributes || pd.BaseAttributes || pd;
    const val = (baseAttr as Record<string, unknown>)[stat];
    return val ? parseInt(String(val)) : fallback;
};

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

            const abilityText = getAbilityText(newIdentity.ability, state.roomCustomAbilities);
            const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

            const vitTotal = Math.max(
                1,
                newStats[CombatStat.VIT].base +
                    newStats[CombatStat.VIT].rank +
                    newStats[CombatStat.VIT].buff -
                    newStats[CombatStat.VIT].debuff +
                    (invMods.stats.vit || 0)
            );
            const insTotal = Math.max(
                1,
                newStats[CombatStat.INS].base +
                    newStats[CombatStat.INS].rank +
                    newStats[CombatStat.INS].buff -
                    newStats[CombatStat.INS].debuff +
                    (invMods.stats.ins || 0)
            );

            let hpStat = vitTotal;
            if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);
            const oldHpMax = newHealth.hpMax;
            newHealth.hpMax = newHealth.hpBase + hpStat;
            if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += newHealth.hpMax - oldHpMax;
            else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

            const newWill = { ...state.will };
            const oldWillMax = newWill.willMax;
            newWill.willMax = newWill.willBase + insTotal;
            if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
            else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

            updatesToSave['hp-curr'] = newHealth.hpCurr;
            updatesToSave['hp-max-display'] = newHealth.hpMax;
            updatesToSave['will-curr'] = newWill.willCurr;
            updatesToSave['will-max-display'] = newWill.willMax;

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}

            return { identity: newIdentity, stats: newStats, health: newHealth, will: newWill, skills: newSkills };
        }),

    toggleForm: () =>
        set((state) => {
            const isAlt = state.identity.isAltForm;
            const currentSaveKey = isAlt ? 'altFormData' : 'baseFormData';
            const targetLoadKey = isAlt ? 'baseFormData' : 'altFormData';
            const obrSaveKey = isAlt ? 'alt-form-data' : 'base-form-data';

            const currentData: Record<string, unknown> = {
                species: state.identity.species,
                type1: state.identity.type1,
                type2: state.identity.type2,
                ability: state.identity.ability,
                availableAbilities: state.identity.availableAbilities,
                hpBase: state.health.hpBase
            };
            Object.values(CombatStat).forEach((stat) => {
                currentData[`${stat}Base`] = state.stats[stat].base;
                currentData[`${stat}Limit`] = state.stats[stat].limit;
            });
            const backupStr = JSON.stringify(currentData);

            const updatesToSave: Record<string, unknown> = { 'is-alt-form': !isAlt, [obrSaveKey]: backupStr };
            const newIdentity = { ...state.identity, isAltForm: !isAlt, [currentSaveKey]: backupStr };
            const newStats = { ...state.stats };
            const newHealth = { ...state.health };

            let loadedData = currentData;
            if (state.identity[targetLoadKey]) {
                try {
                    loadedData = JSON.parse(state.identity[targetLoadKey]!);
                } catch (e) {}
            }

            newIdentity.species = String(loadedData.species ?? newIdentity.species);
            newIdentity.type1 = String(loadedData.type1 ?? newIdentity.type1);
            newIdentity.type2 = String(loadedData.type2 ?? newIdentity.type2);
            newIdentity.ability = String(loadedData.ability ?? newIdentity.ability);
            newIdentity.availableAbilities = Array.isArray(loadedData.availableAbilities)
                ? loadedData.availableAbilities
                : newIdentity.availableAbilities;

            updatesToSave['species'] = newIdentity.species;
            updatesToSave['type1'] = newIdentity.type1;
            updatesToSave['type2'] = newIdentity.type2;
            updatesToSave['ability'] = newIdentity.ability;
            updatesToSave['ability-list'] = newIdentity.availableAbilities.join(',');

            if (loadedData.hpBase !== undefined) {
                newHealth.hpBase = Number(loadedData.hpBase);
                updatesToSave['hp-base'] = newHealth.hpBase;
            }

            Object.values(CombatStat).forEach((stat) => {
                newStats[stat] = { ...newStats[stat] };
                if (loadedData[`${stat}Base`] !== undefined) {
                    newStats[stat].base = Number(loadedData[`${stat}Base`]);
                    updatesToSave[`${stat}-base`] = newStats[stat].base;
                }
                if (loadedData[`${stat}Limit`] !== undefined) {
                    newStats[stat].limit = Number(loadedData[`${stat}Limit`]);
                    updatesToSave[`${stat}-limit`] = newStats[stat].limit;
                }
            });

            const abilityText = getAbilityText(newIdentity.ability, state.roomCustomAbilities);
            const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

            const vitTotal = Math.max(
                1,
                newStats[CombatStat.VIT].base +
                    newStats[CombatStat.VIT].rank +
                    newStats[CombatStat.VIT].buff -
                    newStats[CombatStat.VIT].debuff +
                    (invMods.stats.vit || 0)
            );
            const insTotal = Math.max(
                1,
                newStats[CombatStat.INS].base +
                    newStats[CombatStat.INS].rank +
                    newStats[CombatStat.INS].buff -
                    newStats[CombatStat.INS].debuff +
                    (invMods.stats.ins || 0)
            );

            let hpStat = vitTotal;
            if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

            const oldHpMax = newHealth.hpMax;
            newHealth.hpMax = newHealth.hpBase + hpStat;
            if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += newHealth.hpMax - oldHpMax;
            else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

            const newWill = { ...state.will };
            const oldWillMax = newWill.willMax;
            newWill.willMax = newWill.willBase + insTotal;
            if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
            else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

            updatesToSave['hp-curr'] = newHealth.hpCurr;
            updatesToSave['hp-max-display'] = newHealth.hpMax;
            updatesToSave['will-curr'] = newWill.willCurr;
            updatesToSave['will-max-display'] = newWill.willMax;

            try {
                saveToOwlbear(updatesToSave);
            } catch (e) {}

            return { identity: newIdentity, stats: newStats, health: newHealth, will: newWill };
        }),

    applySpeciesData: (data, wipeData = true, updateStats = true) =>
        set((state) => {
            if (!data || (!data.Name && !data.Moves)) return state;
            const newStats = { ...state.stats };
            const updatesToSave: Record<string, unknown> = {};
            const newHealth = { ...state.health };

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

            const abilities: string[] = [];
            if (data.Ability1) abilities.push(String(data.Ability1));
            if (data.Ability2 && data.Ability2 !== 'None') abilities.push(String(data.Ability2));
            if (data.HiddenAbility && data.HiddenAbility !== 'None')
                abilities.push(String(data.HiddenAbility) + ' (HA)');
            if (data.EventAbilities) abilities.push(String(data.EventAbilities));

            if (abilities.length === 0 && Array.isArray(data.Abilities)) {
                data.Abilities.forEach((a: unknown) => {
                    if (typeof a === 'string') abilities.push(a);
                    else if (a && typeof a === 'object' && (a as Record<string, unknown>).Name)
                        abilities.push(String((a as Record<string, unknown>).Name));
                });
            }

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

            const abilityText = getAbilityText(newIdentity.ability, state.roomCustomAbilities);
            const invMods = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

            const vitTotal = Math.max(
                1,
                newStats[CombatStat.VIT].base +
                    newStats[CombatStat.VIT].rank +
                    newStats[CombatStat.VIT].buff -
                    newStats[CombatStat.VIT].debuff +
                    (invMods.stats.vit || 0)
            );
            const insTotal = Math.max(
                1,
                newStats[CombatStat.INS].base +
                    newStats[CombatStat.INS].rank +
                    newStats[CombatStat.INS].buff -
                    newStats[CombatStat.INS].debuff +
                    (invMods.stats.ins || 0)
            );

            let hpStat = vitTotal;
            if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

            const oldHpMax = newHealth.hpMax;
            newHealth.hpMax = newHealth.hpBase + hpStat;
            if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += newHealth.hpMax - oldHpMax;
            else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

            const newWill = { ...state.will };
            const oldWillMax = newWill.willMax;
            newWill.willMax = newWill.willBase + insTotal;
            if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
            else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

            updatesToSave['hp-curr'] = newHealth.hpCurr;
            updatesToSave['hp-max-display'] = newHealth.hpMax;
            updatesToSave['will-curr'] = newWill.willCurr;
            updatesToSave['will-max-display'] = newWill.willMax;

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

            const abilities: string[] = [];
            if (data.Ability1) abilities.push(String(data.Ability1));
            if (data.Ability2 && data.Ability2 !== 'None') abilities.push(String(data.Ability2));
            if (data.HiddenAbility && data.HiddenAbility !== 'None')
                abilities.push(String(data.HiddenAbility) + ' (HA)');
            if (data.EventAbilities) abilities.push(String(data.EventAbilities));

            if (abilities.length === 0 && Array.isArray(data.Abilities)) {
                data.Abilities.forEach((a: unknown) => {
                    if (typeof a === 'string') abilities.push(a);
                    else if (a && typeof a === 'object' && (a as Record<string, unknown>).Name)
                        abilities.push(String((a as Record<string, unknown>).Name));
                });
            }

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
