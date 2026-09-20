import { BIOME_MAP } from '../data/biomeData';

export const MYTHICAL_POKEMON_NAMES = new Set([
    'mew',
    'celebi',
    'jirachi',
    'deoxys',
    'phione',
    'manaphy',
    'darkrai',
    'shaymin',
    'arceus',
    'victini',
    'keldeo',
    'meloetta',
    'genesect',
    'diancie',
    'hoopa',
    'volcanion',
    'magearna',
    'marshadow',
    'zeraora',
    'meltan',
    'melmetal',
    'zarude',
    'pecharunt'
]);

export const ULTRA_BEAST_NAMES = new Set([
    'nihilego',
    'buzzwole',
    'pheromosa',
    'xurkitree',
    'celesteela',
    'kartana',
    'guzzlord',
    'poipole',
    'naganadel',
    'stakataka',
    'blacephalon'
]);

export const PARADOX_POKEMON_NAMES = new Set([
    'great tusk',
    'scream tail',
    'brute bonnet',
    'flutter mane',
    'slither wing',
    'sandy shocks',
    'roaring moon',
    'koraidon',
    'walking wake',
    'gouging fire',
    'raging bolt',
    'iron treads',
    'iron bundle',
    'iron hands',
    'iron jugulis',
    'iron moth',
    'iron thorns',
    'iron valiant',
    'miraidon',
    'iron leaves',
    'iron crown',
    'iron boulder'
]);

export interface PokedexLookupItem {
    name: string;
    dexId: string;
    type1: string;
    type2: string;
    ability1: string;
    ability2: string;
    hiddenAbility: string;
    eventAbilities: string;
    legendary: boolean;
    mythical?: boolean;
    ultraBeast?: boolean;
    paradox?: boolean;
    starter: boolean;
    recommendedRank?: string;
    stage?: number;
    totalStages?: number;
    moves: Array<[string, string]>;
}

export interface PokemonLookupFilterOptions {
    includeMegas?: boolean;
    includeLegendaries?: boolean;
    includeMythicals?: boolean;
    includeUltraBeasts?: boolean;
    includeParadox?: boolean;
    allowedLineLengths?: number[];
    allowedStageIndices?: number[];
    biomeId?: string;
    usedSpecies?: Set<string>;
    filterRecommendedRank?: boolean;
    allowedRecommendedRanks?: string[];
}
export { calculateScalarLoyaltyHappiness } from './combatMath';

export function filterPokemonLookupPool(
    lookup: PokedexLookupItem[],
    targetTypes: string[],
    config: PokemonLookupFilterOptions
): PokedexLookupItem[] {
    const isSpecialType = (t: string) =>
        targetTypes.length === 0 || targetTypes.includes('Any') || targetTypes.includes(t);

    const allowedLineLengths = config.allowedLineLengths ?? [1, 2, 3];
    const allowedStageIndices = config.allowedStageIndices ?? [1, 2, 3];

    return lookup.filter((mon) => {
        const cleanName = mon.name.toLowerCase();

        // Used species filter (for duplicate prevention)
        if (config.usedSpecies && (config.usedSpecies.has(mon.name) || config.usedSpecies.has(cleanName))) {
            return false;
        }

        // 1. Exclude Megas / Special Forms unless enabled
        const isMegaOrForm =
            cleanName.includes('(mega') || cleanName.includes('(primal') || cleanName.includes('(gigantamax');
        if (isMegaOrForm && !config.includeMegas) return false;

        // 2. Ultra Beasts
        const isUltraBeast = ULTRA_BEAST_NAMES.has(cleanName) || Boolean(mon.ultraBeast);
        if (isUltraBeast) {
            if (!config.includeUltraBeasts) return false;
        }

        // 3. Paradox Pokémon
        const isParadox = PARADOX_POKEMON_NAMES.has(cleanName) || Boolean(mon.paradox);
        if (isParadox) {
            if (!config.includeParadox) return false;
        }

        // 4. Mythicals
        const isMythical = MYTHICAL_POKEMON_NAMES.has(cleanName) || Boolean(mon.mythical);
        if (isMythical) {
            if (!config.includeMythicals) return false;
        }

        // 5. Standard Legendaries (excluding Ultra Beasts, Paradox, and Mythicals)
        const isStandardLegendary = mon.legendary && !isUltraBeast && !isParadox && !isMythical;
        if (isStandardLegendary && !config.includeLegendaries) return false;

        // 4. Line length filter (totalStages)
        const totalStages = mon.totalStages ?? 1;
        if (!allowedLineLengths.includes(totalStages)) return false;

        // 5. Stage index filter (stage)
        const stage = mon.stage ?? 1;
        if (!allowedStageIndices.includes(stage)) return false;

        // 6. Type matching
        if (targetTypes.length > 0 && !targetTypes.includes('Any')) {
            const matchesType1 = isSpecialType(mon.type1);
            const matchesType2 = Boolean(mon.type2 && mon.type2 !== 'None' && isSpecialType(mon.type2));
            if (!matchesType1 && !matchesType2) return false;
        }

        // 7. Biome filter
        if (config.biomeId && config.biomeId !== 'none' && config.biomeId !== 'any') {
            const biome = BIOME_MAP[config.biomeId];
            if (biome && biome.types && biome.types.length > 0) {
                const matchesBiome1 = biome.types.includes(mon.type1);
                const matchesBiome2 = Boolean(mon.type2 && mon.type2 !== 'None' && biome.types.includes(mon.type2));
                if (!matchesBiome1 && !matchesBiome2) return false;
            }
        }

        // 8. Recommended Rank filter
        if (
            config.filterRecommendedRank &&
            config.allowedRecommendedRanks &&
            config.allowedRecommendedRanks.length > 0
        ) {
            if (!mon.recommendedRank) return false;
            const monRank = mon.recommendedRank.toLowerCase();
            const allowed = config.allowedRecommendedRanks.map((r) => r.toLowerCase());
            if (!allowed.includes(monRank)) return false;
        }

        return true;
    });
}
