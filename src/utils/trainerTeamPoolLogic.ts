import type { CharacterState, Rank, GeneratorConfig, TempBuild } from '../store/storeTypes';
import type { TrainerClass } from '../data/trainerClasses';
import { BIOME_MAP } from '../data/biomeData';
import { generateBuild, buildTokenMetadataFromBuild } from './generatorUtils';
import {
    type PokedexLookupItem,
    type PokemonLookupFilterOptions,
    calculateScalarLoyaltyHappiness,
    filterPokemonLookupPool
} from './pokemonFilterUtils';
import type { TrainerGeneratorConfig, SlotMixMode } from './trainerGeneratorTypes';

export const ALL_POKEMON_TYPES = [
    'Normal',
    'Fire',
    'Water',
    'Grass',
    'Electric',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Steel',
    'Dark',
    'Fairy'
];

export const RANK_ORDER: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion'];

export function resolveSlotRank(config: TrainerGeneratorConfig, resolvedRank: Rank, slotIndex: number): Rank {
    const trainerRankIdx = RANK_ORDER.indexOf(resolvedRank);
    if (config.teamRankMode === 'custom' && config.customPokemonRanks && config.customPokemonRanks[slotIndex]) {
        return config.customPokemonRanks[slotIndex];
    } else if (config.teamRankMode === 'random') {
        const maxAvailableIdx = config.capPokemonRank ? Math.max(0, trainerRankIdx) : RANK_ORDER.length - 1;
        const randomIdx = Math.floor(Math.random() * (maxAvailableIdx + 1));
        return RANK_ORDER[randomIdx];
    }
    return resolvedRank;
}

export function getEligibleTeamPool(
    config: TrainerGeneratorConfig,
    lookupList: PokedexLookupItem[],
    concept: TrainerClass | null,
    slotIndex: number = 0,
    slotRank?: Rank
): PokedexLookupItem[] {
    // 1. Resolve Concept Types
    let conceptTypes: string[] = [];
    if (config.typeSpecialtyMode === 'concept' && concept) {
        conceptTypes = concept.typePreferences;
    } else if (config.typeSpecialtyMode === 'monotype') {
        conceptTypes = [ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)]];
    } else if (config.typeSpecialtyMode === 'dual') {
        const t1 = ALL_POKEMON_TYPES[Math.floor(Math.random() * ALL_POKEMON_TYPES.length)];
        const rest = ALL_POKEMON_TYPES.filter((t) => t !== t1);
        const t2 = rest[Math.floor(Math.random() * rest.length)];
        conceptTypes = [t1, t2];
    } else if (config.typeSpecialtyMode === 'manual' && config.manualTypes.length > 0) {
        conceptTypes = config.manualTypes;
    } else {
        conceptTypes = ['Any'];
    }

    // 2. Resolve Active Biome
    const teamBiome =
        config.teamBiomeId !== undefined
            ? config.teamBiomeId === 'none'
                ? undefined
                : config.teamBiomeId
            : config.biomeId;

    // 3. Resolve Active Mix Mode for this slot
    let mode: SlotMixMode = 'concept_only';
    if (teamBiome && teamBiome !== 'none') {
        if (config.biomeConceptMixMode === 'split') {
            mode = config.customSlotMixModes?.[slotIndex] || 'concept_only';
        } else if (config.biomeConceptMixMode) {
            mode = config.biomeConceptMixMode as SlotMixMode;
        } else {
            mode = 'concept_only';
        }
    }

    let targetTypes: string[] = [];
    const filterOpts: PokemonLookupFilterOptions = { ...config };

    switch (mode) {
        case 'biome_only': {
            targetTypes = ['Any'];
            filterOpts.biomeId = teamBiome;
            break;
        }
        case 'union': {
            const biomeDef = teamBiome ? BIOME_MAP[teamBiome] : undefined;
            const biomeTypes = biomeDef?.types || [];
            if (conceptTypes.includes('Any') || biomeTypes.length === 0) {
                targetTypes = ['Any'];
            } else {
                targetTypes = Array.from(new Set([...conceptTypes, ...biomeTypes]));
            }
            filterOpts.biomeId = undefined;
            break;
        }
        case 'combo': {
            targetTypes = conceptTypes;
            filterOpts.biomeId = teamBiome;
            break;
        }
        case 'concept_only':
        default: {
            targetTypes = conceptTypes;
            filterOpts.biomeId = undefined;
            break;
        }
    }

    // 4. Resolve Recommended Rank filter if active
    if (config.filterRecommendedRank) {
        let targetRank: string = 'Standard';
        if (config.recommendedRankMode === 'match_pokemon' || !config.recommendedRankMode) {
            targetRank =
                slotRank || resolveSlotRank(config, config.rank === 'random' ? 'Starter' : config.rank, slotIndex);
        } else if (config.recommendedRankMode === 'exact') {
            targetRank = config.exactRecommendedRank || 'Standard';
        } else if (config.recommendedRankMode === 'custom') {
            const customVal = config.customSlotRecommendedRanks?.[slotIndex] || 'match_pokemon';
            if (customVal === 'match_pokemon') {
                targetRank =
                    slotRank || resolveSlotRank(config, config.rank === 'random' ? 'Starter' : config.rank, slotIndex);
            } else {
                targetRank = customVal;
            }
        }
        filterOpts.filterRecommendedRank = true;
        filterOpts.allowedRecommendedRanks = [targetRank];
    }

    let eligiblePool = filterPokemonLookupPool(lookupList, targetTypes, filterOpts);
    if (eligiblePool.length === 0) {
        // Fallback 1: relax stage filters if pool is empty
        eligiblePool = filterPokemonLookupPool(lookupList, targetTypes, {
            ...filterOpts,
            allowedLineLengths: [1, 2, 3],
            allowedStageIndices: [1, 2, 3]
        });
    }

    // Fallback 2: For combo mode, if no dual-typed species exist matching both concept and biome,
    // relax to concept_only so the trainer receives their signature typing
    if (eligiblePool.length === 0 && mode === 'combo') {
        eligiblePool = filterPokemonLookupPool(lookupList, conceptTypes, {
            ...config,
            biomeId: undefined,
            allowedLineLengths: [1, 2, 3],
            allowedStageIndices: [1, 2, 3]
        });
    }

    // Fallback 3: If still empty, relax recommended rank filter if it was enforced
    if (eligiblePool.length === 0 && filterOpts.filterRecommendedRank) {
        eligiblePool = filterPokemonLookupPool(lookupList, targetTypes, {
            ...filterOpts,
            filterRecommendedRank: false
        });
    }

    // Fallback 4: If still empty, relax any type/biome constraint while respecting species inclusion toggles
    if (eligiblePool.length === 0) {
        eligiblePool = filterPokemonLookupPool(lookupList, ['Any'], {
            ...filterOpts,
            filterRecommendedRank: false,
            allowedLineLengths: [1, 2, 3],
            allowedStageIndices: [1, 2, 3]
        });
    }
    return eligiblePool;
}

export async function pickAndGenerateTeamMember(
    slotIndex: number,
    config: TrainerGeneratorConfig,
    resolvedRank: Rank,
    state: CharacterState,
    lookupList: PokedexLookupItem[],
    usedSpecies: Set<string> = new Set(),
    presetPokeRank?: Rank
): Promise<{ species: string; build: TempBuild; metadata: Record<string, unknown> } | null> {
    let candidatePool = lookupList;
    if (!config.allowDuplicates) {
        const uniqueAvailable = lookupList.filter((m) => !usedSpecies.has(m.name.toLowerCase()));
        if (uniqueAvailable.length > 0) {
            candidatePool = uniqueAvailable;
        }
    }

    if (candidatePool.length === 0) {
        candidatePool = lookupList;
    }

    const chosenMon = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    if (!chosenMon) return null;

    const pokeRank: Rank = presetPokeRank || resolveSlotRank(config, resolvedRank, slotIndex);

    return generateSingleTeamMember(slotIndex, chosenMon, pokeRank, config, state);
}

export async function generateSingleTeamMember(
    slotIndex: number,
    chosenMon: PokedexLookupItem,
    pokeRank: Rank,
    config: TrainerGeneratorConfig,
    state: CharacterState
): Promise<{ species: string; build: TempBuild; metadata: Record<string, unknown> } | null> {
    const pokeGenConfig: GeneratorConfig = {
        targetSpecies: chosenMon.name,
        targetRank: pokeRank,
        randomizeSpecies: false,
        randomizeGender: true,
        randomizeNature: true,
        buildType: config.buildType || 'minmax',
        combatBias: 'balanced',
        defensePreference: 'auto',
        targetAtkCount: 2,
        targetSupCount: 1,
        includePmd: false,
        includeCustom: false,
        overridePrimaryStab: false,
        overrideSecondaryStab: false,
        overrideCoverage: false,
        coveragePreference: 'balanced',
        primaryStabCount: 1,
        secondaryStabCount: 1,
        coverageCount: 1,
        autoSelectBias: true,
        ensureDefenses: true,
        minStats: {},
        minSocials: {},
        includePreEvolutions: true,
        evo2Stage1Offset: 1,
        evo3Stage2Offset: 1,
        evo3Stage1Offset: 2,
        allowOverrank: false,
        overrankAmount: 0,
        allowPreEvoOverrank: false,
        useSpilloverRatio: true,
        spilloverAtkRatio: 0.5,
        spilloverSupRatio: 0.5,
        spilloverJitter: true
    };

    const pokemonState: CharacterState = {
        ...state,
        identity: {
            ...state.identity,
            mode: 'Pokémon',
            age: ''
        }
    };

    const pokeBuild = await generateBuild(pokeGenConfig, pokemonState);
    if (!pokeBuild) return null;

    const pokeMeta = buildTokenMetadataFromBuild(
        pokeBuild,
        chosenMon.name,
        `${import.meta.env.BASE_URL || '/'}pokeball.svg`
    );
    pokeMeta['age'] = '';

    if (config.scaleLoyaltyHappiness) {
        const { loyalty, happiness } = calculateScalarLoyaltyHappiness(pokeRank, slotIndex);
        pokeMeta['loyalty-curr'] = loyalty;
        pokeMeta['happiness-curr'] = happiness;
    }

    return {
        species: chosenMon.name,
        build: pokeBuild,
        metadata: pokeMeta
    };
}
