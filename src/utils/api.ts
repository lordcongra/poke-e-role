import type { CustomPokemon, CustomMove, CustomAbility, CustomItem } from '../store/storeTypes';
import { fetchWithCache } from './apiClient';
import type {
    LocalIndexItem,
    LocalDatasetIndex,
    PokemonApiResponse,
    MoveApiResponse,
    AbilityApiResponse,
    ItemApiResponse,
    NatureApiResponse
} from './apiTypes';

// Re-export the types so we don't break existing imports in the UI components!
export type {
    LocalIndexItem,
    LocalDatasetIndex,
    PokemonApiResponse,
    MoveApiResponse,
    AbilityApiResponse,
    ItemApiResponse,
    NatureApiResponse
};

// VITE MAGIC: Automatically detects your domain sub-folder!
const BASE_URL = import.meta.env.BASE_URL || '/';

const formatLocalPath = (pathStr: string) => {
    if (pathStr.startsWith('/')) {
        return BASE_URL + pathStr.slice(1);
    }
    return pathStr;
};

export const SPECIES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};
export const MOVES_URLS: Record<string, string> = {};
export const ITEMS_URLS: Record<string, string> = {};
export const NATURES_URLS: Record<string, string> = {};

export const ALL_ABILITIES: string[] = [];
export const ALL_MOVES: string[] = [];
export const CATEGORIZED_ITEMS: Record<string, string[]> = {};

let localDatasetIndex: LocalDatasetIndex | null = null;
let isDatasetLoaded = false;
let datasetPromise: Promise<LocalDatasetIndex | null> | null = null;

let homebrewPokemon: CustomPokemon[] = [];
let homebrewMoves: CustomMove[] = [];
let homebrewAbilities: CustomAbility[] = [];
let homebrewItems: CustomItem[] = [];

export function syncHomebrewToApi(
    pokemon: CustomPokemon[],
    moves: CustomMove[],
    abilities: CustomAbility[],
    items: CustomItem[]
) {
    homebrewPokemon = pokemon;
    homebrewMoves = moves;
    homebrewAbilities = abilities;
    homebrewItems = items;
}

export async function loadLocalDataset(): Promise<LocalDatasetIndex | null> {
    if (isDatasetLoaded && localDatasetIndex) return localDatasetIndex;
    if (datasetPromise) return datasetPromise;

    datasetPromise = (async () => {
        try {
            // Safely grab the index using the Vite Base URL!
            const response = await fetch(`${BASE_URL}dataset/index.json`);
            if (!response.ok) throw new Error('Could not fetch local dataset map.');

            const data = (await response.json()) as LocalDatasetIndex;

            // Populate Moves
            if (ALL_MOVES.length === 0 && data.moves) {
                const populateMoves = (arr: LocalIndexItem[]) => {
                    arr.forEach((moveItem) => {
                        const cleanKey = moveItem.name.toLowerCase();
                        MOVES_URLS[cleanKey] = formatLocalPath(moveItem.path);
                        if (!ALL_MOVES.includes(moveItem.name)) ALL_MOVES.push(moveItem.name);
                    });
                };

                if (data.moves.support) populateMoves(data.moves.support);
                if (data.moves.variable) populateMoves(data.moves.variable);
                if (data.moves.basic) {
                    Object.values(data.moves.basic).forEach(populateMoves);
                }
                if (data.moves.highPower) {
                    Object.values(data.moves.highPower).forEach(populateMoves);
                }
                ALL_MOVES.sort();
            }

            // Populate Items
            if (Object.keys(CATEGORIZED_ITEMS).length === 0 && data.items) {
                Object.keys(data.items).forEach((pocket) => {
                    Object.keys(data.items[pocket]).forEach((category) => {
                        if (!CATEGORIZED_ITEMS[category]) CATEGORIZED_ITEMS[category] = [];

                        data.items[pocket][category].forEach((item) => {
                            const cleanKey = item.name.toLowerCase();
                            ITEMS_URLS[cleanKey] = formatLocalPath(item.path);
                            if (!CATEGORIZED_ITEMS[category].includes(item.name)) {
                                CATEGORIZED_ITEMS[category].push(item.name);
                            }
                        });
                    });
                });
            }

            // Populate Pokemon
            if (Object.keys(SPECIES_URLS).length === 0 && data.pokemon) {
                Object.values(data.pokemon).forEach((p) => {
                    SPECIES_URLS[p.name.toLowerCase()] = formatLocalPath(p.path);
                });
            }

            // Populate Abilities
            if (ALL_ABILITIES.length === 0 && data.abilities) {
                Object.values(data.abilities).forEach((a) => {
                    ABILITIES_URLS[a.name.toLowerCase()] = formatLocalPath(a.path);
                    if (!ALL_ABILITIES.includes(a.name)) ALL_ABILITIES.push(a.name);
                });
                ALL_ABILITIES.sort();
            }

            // Populate Natures
            if (Object.keys(NATURES_URLS).length === 0 && data.natures) {
                Object.values(data.natures).forEach((n) => {
                    NATURES_URLS[n.name.toLowerCase()] = formatLocalPath(n.path);
                });
            }

            localDatasetIndex = data;
            isDatasetLoaded = true;
            return localDatasetIndex;
        } catch (error) {
            console.error('Failed to load local dataset:', error);
            return null;
        } finally {
            datasetPromise = null;
        }
    })();

    return datasetPromise;
}

export async function fetchPokemonData(speciesName: string): Promise<PokemonApiResponse | CustomPokemon | null> {
    if (!speciesName) return null;
    const cleanName = speciesName.trim().toLowerCase();

    // 1. Check Homebrew First
    const custom = homebrewPokemon.find((p) => p.Name.trim().toLowerCase() === cleanName);
    if (custom) return custom;

    // 2. Check Local Dataset
    await loadLocalDataset();
    let selectedUrl = SPECIES_URLS[cleanName];
    let isLocal = true;

    // 3. Fallback to Raw GitHub CDN (Bypasses API Rate Limits)
    if (!selectedUrl) {
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        const formattedName = speciesName
            .trim()
            .split('-')
            .map((w) => w.split(' ').map(capitalize).join(' '))
            .join('-');
        selectedUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/v3.0/Pokedex/${formattedName}.json`;
        isLocal = false;
    }

    const cacheKey = isLocal ? `local_species_${cleanName}` : `live_species_${cleanName}`;
    return await fetchWithCache<PokemonApiResponse>(selectedUrl, cacheKey, speciesName);
}

export async function fetchAbilityData(abilityName: string): Promise<AbilityApiResponse | null> {
    if (!abilityName) return null;
    const baseName = abilityName.replace(/\s*\(HA\)$/i, '').trim();
    const cleanName = baseName.toLowerCase();

    // 1. Check Homebrew First
    const custom = homebrewAbilities.find((a) => a.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return { Name: custom.name, Description: custom.description, Effect: custom.effect };
    }

    // 2. Check Local Dataset
    await loadLocalDataset();
    let selectedUrl = ABILITIES_URLS[cleanName];
    let isLocal = true;

    // 3. Fallback to Raw GitHub CDN
    if (!selectedUrl) {
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        const formattedName = baseName
            .trim()
            .split('-')
            .map((w) => w.split(' ').map(capitalize).join(' '))
            .join('-');
        selectedUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/v3.0/Abilities/${formattedName}.json`;
        isLocal = false;
    }

    const cacheKey = isLocal ? `local_ability_${cleanName}` : `live_ability_${cleanName}`;
    return await fetchWithCache<AbilityApiResponse>(selectedUrl, cacheKey, baseName);
}

export async function fetchMoveData(moveName: string): Promise<MoveApiResponse | null> {
    if (!moveName) return null;
    const baseName = moveName.split(' (')[0].trim();
    const cleanName = baseName.toLowerCase();

    // 1. Check Homebrew First
    const custom = homebrewMoves.find((m) => m.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return {
            Name: custom.name,
            Type: custom.type,
            Category: custom.category,
            Power: custom.power,
            Accuracy1: custom.acc1,
            Accuracy2: custom.acc2,
            Damage1: custom.dmg1,
            Effect: custom.desc
        };
    }

    // 2. Check Local Dataset
    await loadLocalDataset();
    let targetPath = MOVES_URLS[cleanName];

    if (targetPath) {
        return await fetchWithCache<MoveApiResponse>(targetPath, `local_move_${cleanName}`, baseName);
    }

    console.warn(`[Local Fetch] Failed to find move ${moveName} in local dataset.`);
    return null;
}

export async function fetchItemData(itemName: string): Promise<ItemApiResponse | null> {
    if (!itemName) return null;
    const cleanName = itemName.trim().toLowerCase();

    // 1. Check Homebrew First
    const custom = homebrewItems.find((i) => i.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return { Name: custom.name, Description: custom.description };
    }

    // 2. Check Local Dataset
    await loadLocalDataset();
    let targetPath = ITEMS_URLS[cleanName];

    if (targetPath) {
        return await fetchWithCache<ItemApiResponse>(targetPath, `local_item_${cleanName}`, itemName);
    }

    console.warn(`[Local Fetch] Failed to find item ${itemName} in local dataset.`);
    return null;
}

export async function fetchNatureData(natureName: string): Promise<NatureApiResponse | null> {
    if (!natureName || natureName === '-- Select --') return null;
    const cleanName = natureName.trim().toLowerCase();

    // 1. Check Local Dataset
    await loadLocalDataset();
    let selectedUrl = NATURES_URLS[cleanName];
    let isLocal = true;

    // 2. Fallback to Raw GitHub CDN
    if (!selectedUrl) {
        const formattedName = natureName.charAt(0).toUpperCase() + natureName.slice(1).toLowerCase();
        selectedUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/v3.0/Natures/${formattedName}.json`;
        isLocal = false;
    }

    const cacheKey = isLocal ? `local_nature_${cleanName}` : `live_nature_${cleanName}`;
    return await fetchWithCache<NatureApiResponse>(selectedUrl, cacheKey, natureName);
}
