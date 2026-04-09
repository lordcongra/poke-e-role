import type { CharacterState, MoveData, StatusItem, CustomType } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { parseCombatTags, getAbilityText } from './combatMath';
import { MAX_MOVES_DATA } from '../data/maxMoves';

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

export const createFormBackup = (
    state: CharacterState,
    healthDraft?: CharacterState['health'],
    willDraft?: CharacterState['will'],
    statusesDraft?: CharacterState['statuses']
): string => {
    const backupData: Record<string, unknown> = {
        species: state.identity.species,
        type1: state.identity.type1,
        type2: state.identity.type2,
        ability: state.identity.ability,
        availableAbilities: state.identity.availableAbilities,
        hpBase: state.health.hpBase,
        hpCurr: healthDraft ? healthDraft.hpCurr : state.health.hpCurr,
        willCurr: willDraft ? willDraft.willCurr : state.will.willCurr,
        statuses: statusesDraft ? statusesDraft : state.statuses,
        moves: state.moves
    };

    const statsBackup: Record<string, unknown> = {};
    Object.values(CombatStat).forEach((stat) => {
        statsBackup[stat] = {
            base: state.stats[stat].base,
            rank: state.stats[stat].rank,
            limit: state.stats[stat].limit
        };
    });
    backupData.stats = statsBackup;

    const socialsBackup: Record<string, unknown> = {};
    Object.values(SocialStat).forEach((stat) => {
        socialsBackup[stat] = {
            base: state.socials[stat].base,
            rank: state.socials[stat].rank,
            limit: state.socials[stat].limit
        };
    });
    backupData.socials = socialsBackup;

    const skillsBackup: Record<string, unknown> = {};
    Object.entries(state.skills).forEach(([sk, val]) => {
        skillsBackup[sk] = {
            base: val.base,
            customName: val.customName
        };
    });
    backupData.skills = skillsBackup;

    return JSON.stringify(backupData);
};

export interface RestoreConfig {
    restoreBaseStats?: boolean;
    restoreStatLimits?: boolean;
    restoreStatRanks?: boolean;
    restoreSkills?: boolean;
    restoreMoves?: boolean;
    restoreTyping?: boolean;
    restoreAbilities?: boolean;
    restoreResources?: boolean;
}

export const restoreFormBackup = (
    backupStr: string,
    draft: {
        identity: CharacterState['identity'];
        health: CharacterState['health'];
        will: CharacterState['will'];
        derived: CharacterState['derived'];
        stats: CharacterState['stats'];
        socials: CharacterState['socials'];
        moves: CharacterState['moves'];
        skills: CharacterState['skills'];
        statuses: CharacterState['statuses'];
    },
    updatesToSave: Record<string, unknown>,
    config: RestoreConfig
) => {
    try {
        const loadedData = JSON.parse(backupStr);
        const { identity, health, will, stats, socials, skills } = draft;

        if (config.restoreTyping) {
            identity.species = String(loadedData.species ?? identity.species);
            identity.type1 = String(loadedData.type1 ?? identity.type1);
            identity.type2 = String(loadedData.type2 ?? identity.type2);
            
            updatesToSave['species'] = identity.species;
            updatesToSave['type1'] = identity.type1;
            updatesToSave['type2'] = identity.type2;
        }

        if (config.restoreAbilities) {
            identity.ability = String(loadedData.ability ?? identity.ability);
            identity.availableAbilities = Array.isArray(loadedData.availableAbilities)
                ? loadedData.availableAbilities
                : identity.availableAbilities;

            updatesToSave['ability'] = identity.ability;
            updatesToSave['ability-list'] = identity.availableAbilities.join(',');
        }

        if (config.restoreBaseStats && loadedData.hpBase !== undefined) {
            health.hpBase = Number(loadedData.hpBase);
            updatesToSave['hp-base'] = health.hpBase;
        }

        if (config.restoreResources) {
            if (loadedData.hpCurr !== undefined) {
                health.hpCurr = Number(loadedData.hpCurr);
                updatesToSave['hp-curr'] = health.hpCurr;
            }
            if (loadedData.willCurr !== undefined) {
                will.willCurr = Number(loadedData.willCurr);
                updatesToSave['will-curr'] = will.willCurr;
            }
            if (loadedData.statuses !== undefined) {
                draft.statuses = loadedData.statuses as StatusItem[];
                updatesToSave['status-list'] = JSON.stringify(draft.statuses);
            }
        }

        if (loadedData.stats) {
            Object.entries(loadedData.stats as Record<string, { base?: number; rank?: number; limit?: number }>).forEach(([stat, val]) => {
                const s = stat as CombatStat;
                if (stats[s]) {
                    if (config.restoreBaseStats && val.base !== undefined) {
                        stats[s].base = Number(val.base);
                        updatesToSave[`${s}-base`] = stats[s].base;
                    }
                    if (config.restoreStatRanks && val.rank !== undefined) {
                        stats[s].rank = Number(val.rank);
                        updatesToSave[`${s}-rank`] = stats[s].rank;
                    }
                    if (config.restoreStatLimits && val.limit !== undefined) {
                        stats[s].limit = Number(val.limit);
                        updatesToSave[`${s}-limit`] = stats[s].limit;
                    }
                }
            });
        }

        if (loadedData.socials) {
            Object.entries(loadedData.socials as Record<string, { base?: number; rank?: number; limit?: number }>).forEach(([stat, val]) => {
                const s = stat as SocialStat;
                if (socials[s]) {
                    if (config.restoreBaseStats && val.base !== undefined) {
                        socials[s].base = Number(val.base);
                        updatesToSave[`${s}-base`] = socials[s].base;
                    }
                    if (config.restoreStatRanks && val.rank !== undefined) {
                        socials[s].rank = Number(val.rank);
                        updatesToSave[`${s}-rank`] = socials[s].rank;
                    }
                    if (config.restoreStatLimits && val.limit !== undefined) {
                        socials[s].limit = Number(val.limit);
                        updatesToSave[`${s}-limit`] = socials[s].limit;
                    }
                }
            });
        }

        if (loadedData.skills && config.restoreSkills) {
            Object.entries(loadedData.skills as Record<string, { base?: number; customName?: string }>).forEach(([sk, val]) => {
                const s = sk as Skill;
                if (skills[s]) {
                    skills[s].base = val.base !== undefined ? Number(val.base) : skills[s].base;
                    if (val.customName !== undefined) skills[s].customName = String(val.customName);

                    updatesToSave[`${s}-base`] = skills[s].base;
                    if (val.customName !== undefined) updatesToSave[`label-${s}`] = skills[s].customName;
                }
            });
        }

        if (loadedData.moves && config.restoreMoves) {
            draft.moves = loadedData.moves as MoveData[];
            updatesToSave['moves-data'] = JSON.stringify(draft.moves);
        }
    } catch (e) {
        console.error('Failed to parse form backup during form reversion', e);
    }
};

export const convertMovesToMax = (moves: MoveData[], customTypes: CustomType[]): MoveData[] => {
    return moves.map(m => {
        if (m.category === 'Status') {
            return {
                ...m,
                name: 'Max Guard',
                type: 'Normal',
                power: 0,
                desc: 'Target: Max Self. Shield Move. Reaction 5. Reduce 5 Damage this Max Pokémon would receive from a Physical or Special Move. Negate the Added Effects of Any Move that targets the Max user.'
            };
        }

        const customType = customTypes.find(t => t.name.toLowerCase() === m.type.toLowerCase());
        let maxName = `Max ${m.type}`;
        let maxEffect = 'No specific Max effect found.';
        
        if (customType && customType.maxMoveName) {
            maxName = customType.maxMoveName;
            maxEffect = customType.maxMoveEffect || maxEffect;
        } else if (MAX_MOVES_DATA[m.type]) {
            maxName = MAX_MOVES_DATA[m.type].name;
            maxEffect = MAX_MOVES_DATA[m.type].effect;
        }
        
        const retainedTags = (m.desc || '').match(/\[.*?\]/g)?.join(' ') || '';
        
        return {
            ...m,
            name: maxName,
            power: m.power + 2,
            desc: `${maxEffect} [Acc +2] ${retainedTags}`.trim()
        };
    });
};