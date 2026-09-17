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
    starter: boolean;
    stage?: number;
    totalStages?: number;
    moves: Array<[string, string]>;
}

export interface PokemonLookupFilterOptions {
    includeMegas?: boolean;
    includeLegendaries?: boolean;
    includeMythicals?: boolean;
    allowedLineLengths?: number[];
    allowedStageIndices?: number[];
    biomeId?: string;
    usedSpecies?: Set<string>;
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

        // 2. Legendaries
        if (mon.legendary && !config.includeLegendaries) return false;

        // 3. Mythicals
        if (MYTHICAL_POKEMON_NAMES.has(cleanName) && !config.includeMythicals) return false;

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

        return true;
    });
}
