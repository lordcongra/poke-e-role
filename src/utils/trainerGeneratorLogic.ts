import type { CharacterState, Rank } from '../store/storeTypes';
import { TRAINER_CLASSES, type TrainerClass, type TrainerProfileType } from '../data/trainerClasses';
import { NATURES } from '../data/constants';
import { BIOMES, getTrainerClassesForBiome } from '../data/biomeData';
import type { TempBuild } from '../store/storeTypes';
import {
    MYTHICAL_POKEMON_NAMES,
    type PokedexLookupItem,
    type PokemonLookupFilterOptions,
    calculateScalarLoyaltyHappiness,
    filterPokemonLookupPool
} from './pokemonFilterUtils';

// Re-export types
export * from './trainerGeneratorTypes';

// Re-export stat allocation and metadata functions
export * from './trainerStatAllocation';

// Re-export team pool logic and generation functions
export * from './trainerTeamPoolLogic';

// Re-export filter utils
export {
    MYTHICAL_POKEMON_NAMES,
    type PokedexLookupItem,
    type PokemonLookupFilterOptions,
    calculateScalarLoyaltyHappiness,
    filterPokemonLookupPool
};

import type { TrainerGeneratorConfig, GeneratedTrainerResult } from './trainerGeneratorTypes';
import { buildTrainerTokenMetadata } from './trainerStatAllocation';
import { RANK_ORDER, resolveSlotRank, getEligibleTeamPool, pickAndGenerateTeamMember } from './trainerTeamPoolLogic';
export { resolveSlotRank };

/**
 * Main orchestrator for generating a complete Trainer and their Pokémon team.
 */
export async function generateFullTrainerTeam(
    config: TrainerGeneratorConfig,
    state: CharacterState,
    lookupList: PokedexLookupItem[]
): Promise<GeneratedTrainerResult> {
    // 0. Resolve Biomes if 'random' or 'match_trainer' was passed
    let resolvedTrainerBiome = config.trainerBiomeId || config.biomeId;
    if (resolvedTrainerBiome === 'random') {
        resolvedTrainerBiome = BIOMES[Math.floor(Math.random() * BIOMES.length)].id;
    } else if (resolvedTrainerBiome === 'none') {
        resolvedTrainerBiome = undefined;
    }

    let resolvedTeamBiome = config.teamBiomeId;
    if (resolvedTeamBiome === 'random') {
        resolvedTeamBiome = BIOMES[Math.floor(Math.random() * BIOMES.length)].id;
    } else if (resolvedTeamBiome === 'match_trainer') {
        resolvedTeamBiome = resolvedTrainerBiome || BIOMES[Math.floor(Math.random() * BIOMES.length)].id;
    }

    const effectiveConfig: TrainerGeneratorConfig = {
        ...config,
        trainerBiomeId: resolvedTrainerBiome,
        teamBiomeId: resolvedTeamBiome,
        biomeId: resolvedTeamBiome
    };

    // 1. Resolve Trainer Identity
    let concept: TrainerClass | null = null;
    if (effectiveConfig.conceptId === 'any_random') {
        concept = TRAINER_CLASSES[Math.floor(Math.random() * TRAINER_CLASSES.length)];
    } else if (effectiveConfig.conceptId === 'biome_match') {
        if (resolvedTrainerBiome && resolvedTrainerBiome !== 'none' && resolvedTrainerBiome !== 'any') {
            const eligible = getTrainerClassesForBiome(resolvedTrainerBiome);
            if (eligible.length > 0) {
                concept = eligible[Math.floor(Math.random() * eligible.length)];
            }
        }
        if (!concept) {
            concept = TRAINER_CLASSES[Math.floor(Math.random() * TRAINER_CLASSES.length)];
        }
    } else if (effectiveConfig.conceptId === 'random') {
        let pool = TRAINER_CLASSES;
        if (resolvedTrainerBiome && resolvedTrainerBiome !== 'none' && resolvedTrainerBiome !== 'any') {
            const eligible = getTrainerClassesForBiome(resolvedTrainerBiome);
            if (eligible.length > 0 && Math.random() < 0.75) {
                pool = eligible;
            }
        }
        concept = pool[Math.floor(Math.random() * pool.length)];
    } else if (effectiveConfig.conceptId && effectiveConfig.conceptId !== 'none') {
        concept = TRAINER_CLASSES.find((c) => c.id === effectiveConfig.conceptId) || null;
    }

    const resolvedRank: Rank =
        effectiveConfig.rank === 'random'
            ? concept?.minRank || RANK_ORDER[Math.floor(Math.random() * RANK_ORDER.length)]
            : effectiveConfig.rank;

    const resolvedAge =
        effectiveConfig.age === 'random'
            ? (['Teen', 'Adult', 'Senior'] as const)[Math.floor(Math.random() * 3)]
            : effectiveConfig.age;

    const resolvedGender =
        effectiveConfig.gender === 'random'
            ? (['Male', 'Female', 'Non-Binary'] as const)[Math.floor(Math.random() * 3)]
            : effectiveConfig.gender;

    const validNatures = NATURES.filter((n) => n && n.trim() !== '');
    const resolvedNature =
        effectiveConfig.nature === 'random' || !effectiveConfig.nature
            ? validNatures[Math.floor(Math.random() * validNatures.length)]
            : effectiveConfig.nature;

    let isSpecial = effectiveConfig.isSpecialTrainer;
    if (effectiveConfig.autoSpecialForMystic && concept?.isSupernatural) {
        isSpecial = true;
    }

    const resolvedProfile: TrainerProfileType =
        effectiveConfig.profile === 'auto' ? concept?.suggestedProfile || 'battler' : effectiveConfig.profile;

    const defaultName = concept ? concept.name : 'Trainer';
    const finalTrainerName = effectiveConfig.trainerName?.trim() || defaultName;

    // 2. Build Trainer Metadata
    const trainerMetadata = buildTrainerTokenMetadata(
        finalTrainerName,
        concept,
        resolvedRank,
        resolvedAge,
        resolvedGender,
        resolvedNature,
        isSpecial,
        resolvedProfile,
        effectiveConfig.assignBadges,
        resolvedTrainerBiome
    );

    // 3. Resolve Pokémon Team
    const teamMembers: Array<{
        species: string;
        build: TempBuild;
        metadata: Record<string, unknown>;
    }> = [];

    if (effectiveConfig.generateTeam && effectiveConfig.teamSize > 0) {
        const usedSpecies = new Set<string>();

        for (let i = 0; i < effectiveConfig.teamSize; i++) {
            const slotRank = resolveSlotRank(effectiveConfig, resolvedRank, i);
            const eligiblePool = getEligibleTeamPool(effectiveConfig, lookupList, concept, i, slotRank);
            const member = await pickAndGenerateTeamMember(
                i,
                effectiveConfig,
                resolvedRank,
                state,
                eligiblePool,
                usedSpecies,
                slotRank
            );
            if (member) {
                usedSpecies.add(member.species.toLowerCase());
                teamMembers.push(member);
            }
        }
    }

    return {
        trainerName: finalTrainerName,
        resolvedRank,
        concept,
        trainerMetadata,
        teamMembers,
        config: effectiveConfig,
        originBiomeId: resolvedTrainerBiome
    };
}
