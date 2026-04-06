import type { CustomPokemon, CustomMove, CustomAbility, CustomItem } from '../store/storeTypes';
import { fetchWithCache } from './apiClient';
import type {
    LocalIndexItem,
    LocalDatasetIndex,
    GitHubFileNode,
    GitHubTreeResponse,
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

export const GITHUB_TREE_URL =
    'https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1';

export const SPECIES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};
export const MOVES_URLS: Record<string, string> = {};
export const ITEMS_URLS: Record<string, string> = {};
export const NATURES_URLS: Record<string, string> = {};

export const ALL_ABILITIES: string[] = [];
export const ALL_MOVES: string[] = [];
export const CATEGORIZED_ITEMS: Record<string, string[]> = {};

let isTreeLoaded = false;
let treePromise: Promise<void> | null = null;

let homebrewPokemon: CustomPokemon[] = [];
let homebrewMoves: CustomMove[] = [];
let homebrewAbilities: CustomAbility[] = [];
let homebrewItems: CustomItem[] = [];

let localDatasetIndex: LocalDatasetIndex | null = null;

export async function loadLocalDataset(): Promise<LocalDatasetIndex | null> {
    if (localDatasetIndex) return localDatasetIndex;
    try {
        const response = await fetch('/dataset/index.json');
        if (!response.ok) throw new Error('Could not fetch local dataset map.');

        const data = (await response.json()) as LocalDatasetIndex;

        if (ALL_MOVES.length === 0 && data.moves) {
            const populateMoves = (arr: LocalIndexItem[]) => {
                arr.forEach((moveItem) => {
                    const cleanKey = moveItem.name.toLowerCase();
                    MOVES_URLS[cleanKey] = moveItem.path;
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

        if (Object.keys(CATEGORIZED_ITEMS).length === 0 && data.items) {
            Object.keys(data.items).forEach((pocket) => {
                Object.keys(data.items[pocket]).forEach((category) => {
                    if (!CATEGORIZED_ITEMS[category]) CATEGORIZED_ITEMS[category] = [];

                    data.items[pocket][category].forEach((item) => {
                        const cleanKey = item.name.toLowerCase();
                        ITEMS_URLS[cleanKey] = item.path;
                        if (!CATEGORIZED_ITEMS[category].includes(item.name)) {
                            CATEGORIZED_ITEMS[category].push(item.name);
                        }
                    });
                });
            });
        }

        localDatasetIndex = data;
        return localDatasetIndex;
    } catch (error) {
        console.error('Failed to load local dataset:', error);
        return null;
    }
}

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

export function loadGithubTree(): Promise<void> {
    if (isTreeLoaded) return Promise.resolve();
    if (treePromise) return treePromise;

    treePromise = fetchWithCache<GitHubTreeResponse>(GITHUB_TREE_URL, 'master_tree_fallback', 'Pokerole Github DB')
        .then((data) => {
            if (!data || !data.tree) return;

            const versionRegex = /(v|(version\s?))3\.0/i;
            const pokemonRegex = /(^|\/)(Pokemon|Pokedex)\//i;
            const abilityRegex = /(^|\/)Abilities\//i;
            const moveRegex = /(^|\/)Moves\//i;
            const itemRegex = /(^|\/)Items\//i;
            const natureRegex = /(^|\/)Natures\//i;

            data.tree.forEach((file: GitHubFileNode) => {
                if (!file.path.endsWith('.json')) return;

                const name = file.path.split('/').pop()?.replace('.json', '') || '';
                if (!name) return;

                const rawUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
                const cleanKey = name.toLowerCase();

                const isV3 = versionRegex.test(file.path);

                if (pokemonRegex.test(file.path) && isV3) {
                    SPECIES_URLS[cleanKey] = rawUrl;
                } else if (abilityRegex.test(file.path) && isV3) {
                    ABILITIES_URLS[cleanKey] = rawUrl;
                    if (!ALL_ABILITIES.includes(name)) ALL_ABILITIES.push(name);
                } else if (moveRegex.test(file.path) && isV3) {
                    MOVES_URLS[cleanKey] = rawUrl;
                } else if (itemRegex.test(file.path) && isV3) {
                    ITEMS_URLS[cleanKey] = rawUrl;
                } else if (natureRegex.test(file.path)) {
                    NATURES_URLS[cleanKey] = rawUrl;
                }
            });

            ALL_ABILITIES.sort();
            isTreeLoaded = true;
        })
        .catch((err) => console.error('Error processing Github Data:', err))
        .finally(() => {
            treePromise = null;
        });

    return treePromise;
}

export async function fetchPokemonData(speciesName: string): Promise<PokemonApiResponse | CustomPokemon | null> {
    if (!speciesName) return null;
    const cleanName = speciesName.trim().toLowerCase();

    const custom = homebrewPokemon.find((p) => p.Name.trim().toLowerCase() === cleanName);
    if (custom) return custom;

    await loadGithubTree();
    const selectedUrl = SPECIES_URLS[cleanName];

    if (!selectedUrl) return null;
    return await fetchWithCache<PokemonApiResponse>(selectedUrl, `species_${cleanName}`, speciesName);
}

export async function fetchAbilityData(abilityName: string): Promise<AbilityApiResponse | null> {
    if (!abilityName) return null;
    const baseName = abilityName.replace(/\s*\(HA\)$/i, '').trim();
    const cleanName = baseName.toLowerCase();

    const custom = homebrewAbilities.find((a) => a.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return { Name: custom.name, Description: custom.description, Effect: custom.effect };
    }

    await loadGithubTree();
    const selectedUrl = ABILITIES_URLS[cleanName];

    if (!selectedUrl) return null;
    return await fetchWithCache<AbilityApiResponse>(selectedUrl, `ability_${cleanName}`, baseName);
}

export async function fetchMoveData(moveName: string): Promise<MoveApiResponse | null> {
    if (!moveName) return null;
    const baseName = moveName.split(' (')[0].trim();
    const cleanName = baseName.toLowerCase();

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

    await loadGithubTree();
    await loadLocalDataset();

    const liveUrl = MOVES_URLS[cleanName];
    if (liveUrl) {
        try {
            const data = await fetchWithCache<MoveApiResponse>(liveUrl, `live_move_${cleanName}`, baseName);
            if (data) return data;
        } catch (e) {
            console.warn(`[Live Fetch] Failed to fetch live data for move ${moveName}, falling back to local.`);
        }
    }

    const localIndex = localDatasetIndex;
    if (localIndex) {
        let targetPath = '';
        const checkArr = (arr: LocalIndexItem[]) => {
            const found = arr.find((m) => m.name.toLowerCase() === cleanName);
            if (found) targetPath = found.path;
        };

        if (localIndex.moves.support) checkArr(localIndex.moves.support);
        if (localIndex.moves.variable && !targetPath) checkArr(localIndex.moves.variable);
        if (!targetPath && localIndex.moves.basic) {
            Object.values(localIndex.moves.basic).forEach(checkArr);
        }
        if (!targetPath && localIndex.moves.highPower) {
            Object.values(localIndex.moves.highPower).forEach(checkArr);
        }

        if (targetPath) {
            return await fetchWithCache<MoveApiResponse>(targetPath, `local_move_${cleanName}`, baseName);
        }
    }

    return null;
}

export async function fetchItemData(itemName: string): Promise<ItemApiResponse | null> {
    if (!itemName) return null;
    const cleanName = itemName.trim().toLowerCase();

    const custom = homebrewItems.find((i) => i.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return { Name: custom.name, Description: custom.description };
    }

    await loadGithubTree();
    await loadLocalDataset();

    const liveUrl = ITEMS_URLS[cleanName];
    if (liveUrl) {
        try {
            const data = await fetchWithCache<ItemApiResponse>(liveUrl, `live_item_${cleanName}`, itemName);
            if (data) return data;
        } catch (e) {
            console.warn(`[Live Fetch] Failed to fetch live data for item ${itemName}, falling back to local.`);
        }
    }

    const localIndex = localDatasetIndex;
    if (localIndex) {
        let targetPath = '';
        Object.values(localIndex.items).forEach((pocket) => {
            Object.values(pocket).forEach((categoryItems) => {
                const found = categoryItems.find((item) => item.name.toLowerCase() === cleanName);
                if (found) targetPath = found.path;
            });
        });

        if (targetPath) {
            return await fetchWithCache<ItemApiResponse>(targetPath, `local_item_${cleanName}`, itemName);
        }
    }

    return null;
}

export async function fetchNatureData(natureName: string): Promise<NatureApiResponse | null> {
    if (!natureName || natureName === '-- Select --') return null;
    const cleanName = natureName.trim().toLowerCase();

    await loadGithubTree();
    let selectedUrl = NATURES_URLS[cleanName];

    if (!selectedUrl) {
        const formattedName = natureName.charAt(0).toUpperCase() + natureName.slice(1).toLowerCase();
        selectedUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/v3.0/Natures/${formattedName}.json`;
    }

    return await fetchWithCache<NatureApiResponse>(selectedUrl, `nature_${cleanName}`, natureName);
}
