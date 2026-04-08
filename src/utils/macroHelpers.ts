import type { CharacterState, MoveData, SkillData } from '../store/storeTypes';
import { CombatStat, Skill } from '../types/enums';
import { parseCombatTags, getAbilityText } from './combatMath';

export const parseLearnset = (movesObj: unknown): Array<{ Learned: string; Name: string }> => {
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

export const getLimit = (pd: Record<string, unknown>, stat: string): number => {
    const maxAttr = pd.MaxAttributes as Record<string, string | number> | undefined;
    const maxStats = pd.MaxStats as Record<string, string | number> | undefined;
    const val = pd[`Max${stat}`] || pd[`Max ${stat}`] || (maxAttr && maxAttr[stat]) || (maxStats && maxStats[stat]);
    return val ? parseInt(String(val)) : 5;
};

export const getBase = (pd: Record<string, unknown>, stat: string, fallback: number): number => {
    const baseAttr = pd.Attributes || pd.BaseAttributes || pd;
    const val = (baseAttr as Record<string, unknown>)[stat];
    return val ? parseInt(String(val)) : fallback;
};

export const extractAbilities = (data: Record<string, unknown>): string[] => {
    const abilities: string[] = [];
    if (data.Ability1) abilities.push(String(data.Ability1));
    if (data.Ability2 && data.Ability2 !== 'None') abilities.push(String(data.Ability2));
    if (data.HiddenAbility && data.HiddenAbility !== 'None') abilities.push(String(data.HiddenAbility) + ' (HA)');
    if (data.EventAbilities) abilities.push(String(data.EventAbilities));

    if (abilities.length === 0 && Array.isArray(data.Abilities)) {
        data.Abilities.forEach((a: unknown) => {
            if (typeof a === 'string') abilities.push(a);
            else if (a && typeof a === 'object' && (a as Record<string, unknown>).Name)
                abilities.push(String((a as Record<string, unknown>).Name));
        });
    }
    return abilities;
};

export const syncHealthAndWill = (
    state: CharacterState,
    newStats: CharacterState['stats'],
    newIdentity: CharacterState['identity'],
    newHealth: CharacterState['health'],
    newWill: CharacterState['will'],
    updatesToSave: Record<string, unknown>
) => {
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

    const oldWillMax = newWill.willMax;
    newWill.willMax = newWill.willBase + insTotal;
    if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
    else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

    updatesToSave['hp-curr'] = newHealth.hpCurr;
    updatesToSave['hp-max-display'] = newHealth.hpMax;
    updatesToSave['will-curr'] = newWill.willCurr;
    updatesToSave['will-max-display'] = newWill.willMax;
};

export const createFormBackup = (state: CharacterState): string => {
    const backupData: Record<string, unknown> = {
        species: state.identity.species,
        type1: state.identity.type1,
        type2: state.identity.type2,
        ability: state.identity.ability,
        availableAbilities: state.identity.availableAbilities,
        hpBase: state.health.hpBase,
        defBuff: state.derived.defBuff,
        defDebuff: state.derived.defDebuff,
        sdefBuff: state.derived.sdefBuff,
        sdefDebuff: state.derived.sdefDebuff,
        moves: state.moves,
        skills: state.skills
    };
    Object.values(CombatStat).forEach((stat) => {
        backupData[`${stat}Base`] = state.stats[stat].base;
        backupData[`${stat}Limit`] = state.stats[stat].limit;
        backupData[`${stat}Buff`] = state.stats[stat].buff;
        backupData[`${stat}Debuff`] = state.stats[stat].debuff;
    });
    return JSON.stringify(backupData);
};

export const restoreFormBackup = (
    backupStr: string,
    draft: {
        identity: CharacterState['identity'];
        health: CharacterState['health'];
        derived: CharacterState['derived'];
        stats: CharacterState['stats'];
        moves: CharacterState['moves'];
        skills: CharacterState['skills'];
    },
    updatesToSave: Record<string, unknown>
) => {
    try {
        const loadedData = JSON.parse(backupStr);
        const { identity, health, derived, stats } = draft;

        identity.species = String(loadedData.species ?? identity.species);
        identity.type1 = String(loadedData.type1 ?? identity.type1);
        identity.type2 = String(loadedData.type2 ?? identity.type2);
        identity.ability = String(loadedData.ability ?? identity.ability);
        identity.availableAbilities = Array.isArray(loadedData.availableAbilities)
            ? loadedData.availableAbilities
            : identity.availableAbilities;

        updatesToSave['species'] = identity.species;
        updatesToSave['type1'] = identity.type1;
        updatesToSave['type2'] = identity.type2;
        updatesToSave['ability'] = identity.ability;
        updatesToSave['ability-list'] = identity.availableAbilities.join(',');

        if (loadedData.hpBase !== undefined) {
            health.hpBase = Number(loadedData.hpBase);
            updatesToSave['hp-base'] = health.hpBase;
        }

        if (loadedData.defBuff !== undefined) {
            derived.defBuff = Number(loadedData.defBuff);
            updatesToSave['def-buff'] = derived.defBuff;
        }
        if (loadedData.defDebuff !== undefined) {
            derived.defDebuff = Number(loadedData.defDebuff);
            updatesToSave['def-debuff'] = derived.defDebuff;
        }
        if (loadedData.sdefBuff !== undefined) {
            derived.sdefBuff = Number(loadedData.sdefBuff);
            updatesToSave['spd-buff'] = derived.sdefBuff;
        }
        if (loadedData.sdefDebuff !== undefined) {
            derived.sdefDebuff = Number(loadedData.sdefDebuff);
            updatesToSave['spd-debuff'] = derived.sdefDebuff;
        }

        Object.values(CombatStat).forEach((stat) => {
            stats[stat] = { ...stats[stat] };
            if (loadedData[`${stat}Base`] !== undefined) {
                stats[stat].base = Number(loadedData[`${stat}Base`]);
                updatesToSave[`${stat}-base`] = stats[stat].base;
            }
            if (loadedData[`${stat}Limit`] !== undefined) {
                stats[stat].limit = Number(loadedData[`${stat}Limit`]);
                updatesToSave[`${stat}-limit`] = stats[stat].limit;
            }
            if (loadedData[`${stat}Buff`] !== undefined) {
                stats[stat].buff = Number(loadedData[`${stat}Buff`]);
                updatesToSave[`${stat}-buff`] = stats[stat].buff;
            }
            if (loadedData[`${stat}Debuff`] !== undefined) {
                stats[stat].debuff = Number(loadedData[`${stat}Debuff`]);
                updatesToSave[`${stat}-debuff`] = stats[stat].debuff;
            }
        });

        if (loadedData.moves) {
            draft.moves = loadedData.moves as MoveData[];
            updatesToSave['moves-data'] = JSON.stringify(draft.moves);
        }

        if (loadedData.skills) {
            draft.skills = loadedData.skills as Record<Skill, SkillData>;
            Object.entries(draft.skills).forEach(([sk, val]) => {
                updatesToSave[`${sk}-base`] = val.base;
                updatesToSave[`${sk}-buff`] = val.buff;
                if (val.customName) updatesToSave[`label-${sk}`] = val.customName;
            });
        }
    } catch (e) {
        console.error('Failed to parse form backup during form reversion', e);
    }
};
