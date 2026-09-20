import type { Rank, TempBuild } from '../store/storeTypes';
import type { TrainerClass, TrainerProfileType } from '../data/trainerClasses';

export type BiomeConceptMixMode = 'concept_only' | 'biome_only' | 'union' | 'combo' | 'split';
export type SlotMixMode = 'concept_only' | 'biome_only' | 'union' | 'combo';

export interface TrainerGeneratorConfig {
    trainerName?: string;
    conceptId: string;
    rank: Rank | 'random';
    age: 'Child' | 'Teen' | 'Adult' | 'Senior' | 'random';
    gender: 'Male' | 'Female' | 'Non-Binary' | 'random';
    nature: string;
    isSpecialTrainer: boolean;
    autoSpecialForMystic: boolean;
    profile: TrainerProfileType | 'auto';
    assignBadges: boolean;

    generateTeam: boolean;
    teamSize: number;
    typeSpecialtyMode: 'concept' | 'monotype' | 'dual' | 'variety' | 'manual';
    manualTypes: string[];
    teamRankMode: 'match_trainer' | 'random' | 'custom';
    customPokemonRanks: Rank[];
    capPokemonRank: boolean;
    allowDuplicates: boolean;
    buildType: 'minmax' | 'average' | 'wild';
    allowedLineLengths: number[];
    allowedStageIndices: number[];
    includeLegendaries: boolean;
    includeMythicals: boolean;
    includeUltraBeasts: boolean;
    includeParadox: boolean;
    includeMegas: boolean;
    scaleLoyaltyHappiness: boolean;
    biomeId?: string; // Fallback / legacy
    trainerBiomeId?: string; // Biome for trainer origin & concepts
    teamBiomeId?: string; // Biome for Pokémon team ecosystem
    biomeConceptMixMode?: BiomeConceptMixMode;
    customSlotMixModes?: SlotMixMode[];
    filterRecommendedRank?: boolean;
    recommendedRankMode?: 'match_pokemon' | 'exact' | 'custom';
    exactRecommendedRank?: Rank;
    customSlotRecommendedRanks?: (Rank | 'match_pokemon')[];
}

export interface GeneratedTrainerResult {
    trainerName: string;
    resolvedRank: Rank;
    concept: TrainerClass | null;
    trainerMetadata: Record<string, unknown>;
    teamMembers: Array<{
        species: string;
        build: TempBuild;
        metadata: Record<string, unknown>;
    }>;
    config?: TrainerGeneratorConfig;
    originBiomeId?: string;
}
