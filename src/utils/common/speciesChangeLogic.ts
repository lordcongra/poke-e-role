import type { CharacterState, StatusItem, StatData } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import {
    getBase,
    getLimit,
    extractAbilities,
    parseLearnset,
    parseHeight,
    parseWeight,
    syncHealthAndWill
} from './macroHelpers';
import { getKnownAbility } from '../../data/abilities/knownAbilities';
import { calculateMaxHp, calculateMaxWill } from '../combat/combatUtils';

/**
 * Sanitizes a Pokémon typing string.
 * Converts 'None', 'none', or empty/whitespace values into an empty string ''.
 */
export function sanitizeType(typeVal?: unknown): string {
    if (!typeVal || typeof typeVal !== 'string') return '';
    const trimmed = typeVal.trim();
    if (trimmed.toLowerCase() === 'none') return '';
    return trimmed;
}

export interface SpeciesChangeResult {
    nextState: Partial<CharacterState>;
    updatesToSave: Record<string, unknown>;
}

/**
 * Executes a species data change across the 3 user-selected modes:
 * 1. Brand New Pokémon (wipeData = true, updateStats = true): Complete reset to a fresh sheet.
 * 2. Evolve / Mega / Form Shift (wipeData = false, updateStats = true): Retains earned ranks, moves, skills.
 * 3. Type / Ability Shift Only (wipeData = false, updateStats = false): Updates typing & abilities only.
 */
export function executeSpeciesChange(
    state: CharacterState,
    data: Record<string, unknown>,
    wipeData: boolean,
    updateStats: boolean
): SpeciesChangeResult {
    const updatesToSave: Record<string, unknown> = {};

    const abilities = extractAbilities(data);
    const learnsetArray = parseLearnset(data.Moves);
    const defaultAbility = abilities.length > 0 ? abilities[0] : '';
    const cleanDefAbility = defaultAbility.replace(/\s*\(HA\)$/i, '').trim();
    const known = getKnownAbility(cleanDefAbility, wipeData ? 'Starter' : state.identity.rank);
    const custom = state.roomCustomAbilities?.find(
        (ca) => ca.name.trim().toLowerCase() === cleanDefAbility.toLowerCase()
    );
    const initialTags = known?.tags || (custom ? `${custom.effect || ''} ${custom.description || ''}`.trim() : '');

    // ==========================================
    // MODE 1: BRAND NEW POKÉMON (Full Wipe & Fresh Stats)
    // ==========================================
    if (wipeData) {
        const newStats = {} as Record<CombatStat, StatData>;
        const applyCombatStat = (statKey: CombatStat, baseVal: number, maxVal: number) => {
            newStats[statKey] = { base: baseVal, limit: maxVal, rank: 0, buff: 0, debuff: 0 };
            updatesToSave[`${statKey}-base`] = baseVal;
            updatesToSave[`${statKey}-limit`] = maxVal;
            updatesToSave[`${statKey}-rank`] = 0;
            updatesToSave[`${statKey}-buff`] = 0;
            updatesToSave[`${statKey}-debuff`] = 0;
        };

        applyCombatStat(CombatStat.STR, getBase(data, 'Strength', 2), getLimit(data, 'Strength'));
        applyCombatStat(CombatStat.DEX, getBase(data, 'Dexterity', 2), getLimit(data, 'Dexterity'));
        applyCombatStat(CombatStat.VIT, getBase(data, 'Vitality', 2), getLimit(data, 'Vitality'));
        applyCombatStat(CombatStat.SPE, getBase(data, 'Special', 2), getLimit(data, 'Special'));
        applyCombatStat(CombatStat.INS, getBase(data, 'Insight', 1), getLimit(data, 'Insight'));

        const newSocials = {} as Record<SocialStat, StatData>;
        Object.values(SocialStat).forEach((soc) => {
            newSocials[soc as SocialStat] = { base: 1, limit: 5, rank: 0, buff: 0, debuff: 0 };
            updatesToSave[`${soc}-base`] = 1;
            updatesToSave[`${soc}-limit`] = 5;
            updatesToSave[`${soc}-rank`] = 0;
            updatesToSave[`${soc}-buff`] = 0;
            updatesToSave[`${soc}-debuff`] = 0;
        });

        const newSkills = {} as CharacterState['skills'];
        Object.values(Skill).forEach((sk) => {
            newSkills[sk as Skill] = { base: 0, buff: 0 };
            updatesToSave[`${sk}-base`] = 0;
            updatesToSave[`${sk}-buff`] = 0;
        });

        const newSpeciesName = String(data.Name || 'Unknown');
        const newType1 = String(data.Type1 || 'Normal');
        const newType2 = sanitizeType(data.Type2);
        const finalNickname = state.identity.nickname || '';
        const newIdentity: CharacterState['identity'] = {
            ...state.identity,
            nickname: finalNickname,
            species: newSpeciesName,
            rank: 'Starter',
            type1: newType1,
            type2: newType2,
            availableAbilities: abilities,
            ability: defaultAbility,
            abilityActive: known?.autoActive ?? true,
            abilityBoostActive: false,
            abilityBoostLevel: 0,
            abilityTags: initialTags,
            learnset: learnsetArray,
            dexId: String(data.DexID || ''),
            dexCategory: String(data.DexCategory || ''),
            height: parseHeight(data.Height),
            weight: parseWeight(data.Weight),
            dexDescription: String(data.DexDescription || '')
        };

        updatesToSave['name'] = finalNickname || newSpeciesName;
        updatesToSave['nickname'] = finalNickname;
        updatesToSave['species'] = newSpeciesName;
        updatesToSave['rank'] = 'Starter';
        updatesToSave['type1'] = newType1;
        updatesToSave['type2'] = newType2;
        updatesToSave['ability'] = newIdentity.ability;
        updatesToSave['ability-active'] = newIdentity.abilityActive;
        updatesToSave['ability-boost-active'] = false;
        updatesToSave['ability-boost-level'] = 0;
        updatesToSave['ability-tags'] = newIdentity.abilityTags;
        updatesToSave['ability-list'] = abilities.join(',');
        updatesToSave['dex-id'] = newIdentity.dexId;
        updatesToSave['dex-category'] = newIdentity.dexCategory;
        updatesToSave['height'] = newIdentity.height;
        updatesToSave['weight'] = newIdentity.weight;
        updatesToSave['dex-description'] = newIdentity.dexDescription;

        const baseStats = data.BaseStats as Record<string, unknown> | undefined;
        const hpBase = Number(data.BaseHP || (baseStats && baseStats.HP)) || 4;
        const willBase = 3;

        const fakeState = {
            ...state,
            stats: newStats,
            identity: newIdentity,
            inventory: [],
            health: { hpCurr: 10, hpMax: 10, hpBase, temporaryHitPoints: 0, temporaryHitPointsMax: 0 },
            will: { willCurr: 5, willMax: 5, willBase, temporaryWill: 0, temporaryWillMax: 0 }
        } as CharacterState;

        const hpMax = calculateMaxHp(fakeState);
        const willMax = calculateMaxWill(fakeState);

        const newHealth = {
            hpCurr: hpMax,
            hpMax,
            hpBase,
            temporaryHitPoints: 0,
            temporaryHitPointsMax: 0
        };

        const newWill = {
            willCurr: willMax,
            willMax,
            willBase,
            temporaryWill: 0,
            temporaryWillMax: 0
        };

        updatesToSave['hp-base'] = hpBase;
        updatesToSave['hp-curr'] = hpMax;
        updatesToSave['hp-max-display'] = hpMax;
        updatesToSave['temporary-hit-points'] = 0;
        updatesToSave['temporary-hit-points-max'] = 0;

        updatesToSave['will-base'] = willBase;
        updatesToSave['will-curr'] = willMax;
        updatesToSave['will-max-display'] = willMax;
        updatesToSave['temporary-will'] = 0;
        updatesToSave['temporary-will-max'] = 0;

        const healthyStatus: StatusItem = {
            id: crypto.randomUUID(),
            name: 'Healthy',
            customName: '',
            rounds: 0
        };
        const newStatuses: StatusItem[] = [healthyStatus];
        updatesToSave['status-list'] = JSON.stringify(newStatuses);

        updatesToSave['moves-data'] = '[]';
        updatesToSave['skill-checks-data'] = '[]';
        updatesToSave['passives-data'] = '[]';
        updatesToSave['effects-data'] = '[]';
        updatesToSave['inventory-data'] = '[]';
        updatesToSave['wishlist-data'] = '[]';

        // Combat Tracker variables
        updatesToSave['def-buff'] = 0;
        updatesToSave['def-debuff'] = 0;
        updatesToSave['sdef-buff'] = 0;
        updatesToSave['sdef-debuff'] = 0;
        updatesToSave['actions-curr'] = 0;
        updatesToSave['evade-used'] = false;
        updatesToSave['clash-used'] = false;
        updatesToSave['first-hit-acc'] = false;
        updatesToSave['first-hit-dmg'] = false;

        return {
            nextState: {
                stats: newStats,
                socials: newSocials,
                skills: newSkills,
                health: newHealth,
                will: newWill,
                identity: newIdentity,
                moves: [],
                skillChecks: [],
                statuses: newStatuses,
                passives: [],
                effects: [],
                inventory: [],
                wishlist: [],
                customInfo: [],
                derived: { defBuff: 0, defDebuff: 0, sdefBuff: 0, sdefDebuff: 0, happy: 0, loyal: 0 },
                trackers: {
                    actions: 0,
                    evade: false,
                    clash: false,
                    chances: 0,
                    fate: 0,
                    globalAcc: 0,
                    globalDmg: 0,
                    globalSucc: 0,
                    globalChance: 0,
                    ignoredPain: 0,
                    firstHitAcc: false,
                    firstHitDmg: false,
                    bankedAccDice: {},
                    boostLevels: {}
                }
            },
            updatesToSave
        };
    }

    // ==========================================
    // MODE 2 & 3: EVOLUTION OR TYPE/ABILITY SHIFT
    // ==========================================
    const newStats = { ...state.stats };
    const newHealth = { ...state.health };
    const newWill = { ...state.will };

    if (updateStats) {
        // Evolve / Mega / Form Shift: Update Base and Limits, PRESERVE earned ranks/buffs
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

    // Ability preservation: If existing ability is in the new species' available abilities, keep it
    const cleanCurrentAbility = state.identity.ability.replace(/\s*\(HA\)$/i, '').trim();
    const canRetainAbility = abilities.some(
        (a) =>
            a
                .replace(/\s*\(HA\)$/i, '')
                .trim()
                .toLowerCase() === cleanCurrentAbility.toLowerCase()
    );
    const finalAbility = canRetainAbility ? state.identity.ability : defaultAbility;

    const newType1 = String(data.Type1 || state.identity.type1 || 'Normal');
    const newType2 = sanitizeType(data.Type2 !== undefined ? data.Type2 : state.identity.type2);

    const newIdentity: CharacterState['identity'] = {
        ...state.identity,
        species: String(data.Name || state.identity.species),
        type1: newType1,
        type2: newType2,
        availableAbilities: abilities,
        ability: finalAbility,
        abilityActive: known?.autoActive ?? true,
        abilityBoostActive: false,
        abilityBoostLevel: 0,
        abilityTags: initialTags,
        learnset: learnsetArray,
        dexId: String(data.DexID || state.identity.dexId || ''),
        dexCategory: String(data.DexCategory || state.identity.dexCategory || ''),
        height: parseHeight(data.Height) || state.identity.height,
        weight: parseWeight(data.Weight) || state.identity.weight,
        dexDescription: String(data.DexDescription || state.identity.dexDescription || '')
    };

    updatesToSave['species'] = newIdentity.species;
    updatesToSave['type1'] = newIdentity.type1;
    updatesToSave['type2'] = newIdentity.type2;
    updatesToSave['ability'] = newIdentity.ability;
    updatesToSave['ability-active'] = newIdentity.abilityActive;
    updatesToSave['ability-boost-active'] = false;
    updatesToSave['ability-boost-level'] = 0;
    updatesToSave['ability-tags'] = newIdentity.abilityTags;
    updatesToSave['ability-list'] = abilities.join(',');
    updatesToSave['dex-id'] = newIdentity.dexId;
    updatesToSave['dex-category'] = newIdentity.dexCategory;
    updatesToSave['height'] = newIdentity.height;
    updatesToSave['weight'] = newIdentity.weight;
    updatesToSave['dex-description'] = newIdentity.dexDescription;

    if (updateStats) {
        syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave, false);
    }

    return {
        nextState: {
            stats: newStats,
            health: newHealth,
            will: newWill,
            identity: newIdentity
        },
        updatesToSave
    };
}
