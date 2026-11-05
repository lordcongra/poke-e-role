import type { CharacterState } from '@/store/storeTypes';
import { calculateMaxHp, calculateMaxWill } from '@/utils/combat/combatMath';
import {
    parseStats,
    parseSocials,
    parseSkills,
    parseHealth,
    parseWill,
    parseDerived,
    parseExtras
} from './mappers/parseCombatState';
import {
    parseMoves,
    parseInventory,
    parsePassives,
    parseStatuses,
    parseEffects,
    parseCustomInfo,
    parseBadges,
    parsePokedex
} from './mappers/parseCharacterFeatures';
import {
    parseIdentity,
    parseExtraCategories,
    parseWishlist,
    parseSkillChecks,
    parseTrackers
} from './mappers/parseIdentityState';

// =========================================
// OBR METADATA -> ZUSTAND HYDRATION ORCHESTRATOR
// =========================================

export function hydrateStateFromMetadata(
    meta: Record<string, unknown>,
    state: CharacterState
): Partial<CharacterState> {
    const parsedExtraCats = parseExtraCategories(meta);
    const parsedMoves = parseMoves(meta, parsedExtraCats);
    const parsedWishlist = parseWishlist(meta);
    const parsedChecks = parseSkillChecks(meta, parsedExtraCats);
    const parsedInv = parseInventory(meta);
    const parsedPassives = parsePassives(meta);
    const parsedStatuses = parseStatuses(meta);
    const parsedEffects = parseEffects(meta);
    const parsedCustomInfo = parseCustomInfo(meta);
    const parsedBadges = parseBadges(meta);
    const parsedPokedex = meta['pokedex-data'] !== undefined ? parsePokedex(meta) : (state.identity?.pokedex ?? {});

    const newStats = parseStats(meta, state);
    const newSocials = parseSocials(meta, state);
    const newSkills = parseSkills(meta, state);
    const newHealth = parseHealth(meta);
    const newWill = parseWill(meta);
    const newIdentity = parseIdentity(meta, state, parsedBadges, parsedPokedex);
    const newDerived = parseDerived(meta);
    const newExtras = parseExtras(meta);
    const newTrackers = parseTrackers(meta);

    try {
        const tempState = {
            ...state,
            identity: { ...state.identity, ...newIdentity },
            stats: newStats,
            socials: newSocials,
            skills: newSkills,
            health: newHealth,
            will: newWill,
            inventory: parsedInv,
            passives: parsedPassives,
            extraCategories: parsedExtraCats
        } as CharacterState;

        const calculatedHpMax = calculateMaxHp(tempState);
        if (calculatedHpMax > 0) {
            newHealth.hpMax = calculatedHpMax;
            if (newHealth.hpCurr > newHealth.hpMax) {
                newHealth.hpCurr = newHealth.hpMax;
            }
        }

        const calculatedWillMax = calculateMaxWill(tempState);
        if (calculatedWillMax > 0) {
            newWill.willMax = calculatedWillMax;
            if (newWill.willCurr > newWill.willMax) {
                newWill.willCurr = newWill.willMax;
            }
        }
    } catch {}

    return {
        identity: {
            ...state.identity,
            ...newIdentity
        },
        health: newHealth,
        will: newWill,
        derived: newDerived,
        extras: newExtras,
        trackers: newTrackers,
        notes: String(meta['notes'] || ''),
        tp: Number(meta['training-points']) || 0,
        currency: Number(meta['currency']) || 0,
        stats: newStats,
        socials: newSocials,
        skills: newSkills,
        moves: parsedMoves,
        wishlist: parsedWishlist,
        skillChecks: parsedChecks,
        extraCategories: parsedExtraCats,
        inventory: parsedInv,
        passives: parsedPassives,
        statuses: parsedStatuses,
        effects: parsedEffects,
        customInfo: parsedCustomInfo
    };
}

// Re-export sub-parsers for modular consumption
export {
    parseStats,
    parseSocials,
    parseSkills,
    parseHealth,
    parseWill,
    parseDerived,
    parseExtras
} from './mappers/parseCombatState';
export {
    parseMoves,
    parseInventory,
    parsePassives,
    parseStatuses,
    parseEffects,
    parseCustomInfo,
    parseBadges,
    parsePokedex
} from './mappers/parseCharacterFeatures';
export {
    parseIdentity,
    parseExtraCategories,
    parseWishlist,
    parseSkillChecks,
    parseTrackers
} from './mappers/parseIdentityState';

// =========================================
// ZUSTAND -> OBR METADATA FLATTENING
// =========================================
export { flattenStateToMetadata } from './flattenStateToMetadata';
