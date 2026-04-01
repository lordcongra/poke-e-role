import type { CustomPokemon, CustomMove, CustomAbility, CustomItem } from '../store/storeTypes';

export const GITHUB_TREE_URL =
    'https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1';

export const SPECIES_URLS: Record<string, string> = {};
export const MOVES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};
export const ITEMS_URLS: Record<string, string> = {};

export const ALL_ABILITIES: string[] = [];
export const ALL_MOVES: string[] = [];

let isTreeLoaded = false;
let treePromise: Promise<void> | null = null;

let homebrewPokemon: CustomPokemon[] = [];
let homebrewMoves: CustomMove[] = [];
let homebrewAbilities: CustomAbility[] = [];
let homebrewItems: CustomItem[] = [];

const KNOWN_DUAL_MOVES: Record<string, string[]> = {
    Absorb: ['Absorb (Channel)', 'Absorb (Nature)'],
    'Mega Drain': ['Mega Drain (Channel)', 'Mega Drain (Nature)'],
    'Giga Drain': ['Giga Drain (Channel)', 'Giga Drain (Nature)'],
    'Leech Seed': ['Leech Seed (Channel)', 'Leech Seed (Nature)'],
    'Quick Attack': ['Quick Attack (Strength)', 'Quick Attack (Dexterity)'],
    'Extreme Speed': ['Extreme Speed (Strength)', 'Extreme Speed (Dexterity)'],
    Acrobatics: ['Acrobatics (Strength)', 'Acrobatics (Dexterity)'],
    'Aerial Ace': ['Aerial Ace (Strength)', 'Aerial Ace (Dexterity)'],
    Bide: ['Bide (Strength)', 'Bide (Vitality)'],
    'Electro Ball': ['Electro Ball (Channel)', 'Electro Ball (Athletic)'],
    'Grass Knot': ['Grass Knot (Channel)', 'Grass Knot (Nature)'],
    'Horn Leech': ['Horn Leech (Brawl)', 'Horn Leech (Nature)'],
    'Mach Punch': ['Mach Punch (Strength)', 'Mach Punch (Dexterity)'],
    'Vacuum Wave': ['Vacuum Wave (Strength)', 'Vacuum Wave (Dexterity)'],
    'Water Shuriken': ['Water Shuriken (Channel)', 'Water Shuriken (Athletic)'],
    'Parabolic Charge': ['Parabolic Charge (Channel)', 'Parabolic Charge (Nature)'],
    'Draining Kiss': ['Draining Kiss (Charm)', 'Draining Kiss (Nature)'],
    'Oblivion Wing': ['Oblivion Wing (Channel)', 'Oblivion Wing (Nature)'],
    'Bitter Malice': ['Bitter Malice (Channel)', 'Bitter Malice (Nature)']
};

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

interface GitHubFileNode {
    path: string;
}

interface GitHubTreeResponse {
    tree: GitHubFileNode[];
}

export interface PokemonApiResponse {
    Name?: string;
    Type1?: string;
    Type2?: string;
    BaseStats?: { HP?: number };
    BaseHP?: number;
    Strength?: number | string;
    Dexterity?: number | string;
    Vitality?: number | string;
    Special?: number | string;
    Insight?: number | string;
    MaxAttributes?: Record<string, number | string>;
    MaxStats?: Record<string, number | string>;
    Ability1?: string;
    Ability2?: string;
    HiddenAbility?: string;
    EventAbilities?: string;
    Abilities?: string[] | { Name: string }[];
    Moves?:
        | Record<string, string[] | { Name?: string; Move?: string }[]>
        | { Learned?: string; Learn?: string; Level?: string; Rank?: string; Name?: string; Move?: string }[];
}

export interface MoveApiResponse {
    Name?: string;
    Type?: string;
    Category?: string;
    Power?: number | string;
    Accuracy1?: string;
    Accuracy2?: string;
    Damage1?: string;
    Effect?: string;
    Description?: string;
}

export interface AbilityApiResponse {
    Name?: string;
    Description?: string;
    Effect?: string;
}

export interface ItemApiResponse {
    Name?: string;
    Description?: string;
    Effect?: string;
}

const activeRequests = new Map<string, AbortController>();

async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    if (activeRequests.has(cacheKey)) {
        activeRequests.get(cacheKey)?.abort();
    }

    const controller = new AbortController();
    activeRequests.set(cacheKey, controller);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = (await response.json()) as T;
        localStorage.setItem(`pkr_cache_${cacheKey}`, JSON.stringify(data));
        return data;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log(`[Network] Fetch aborted for ${itemName}.`);
            return null;
        }

        console.warn(`[Network] Fetch failed for ${itemName}, checking cache...`);
        const cached = localStorage.getItem(`pkr_cache_${cacheKey}`);

        if (cached) {
            console.log(`Using cached data for ${itemName}.`);
            return JSON.parse(cached) as T;
        }

        console.error(`Failed to load ${itemName}. No offline cache found.`);
        return null;
    } finally {
        activeRequests.delete(cacheKey);
    }
}

export function loadGithubTree(): Promise<void> {
    if (isTreeLoaded) return Promise.resolve();
    if (treePromise) return treePromise;

    treePromise = fetchWithCache<GitHubTreeResponse>(GITHUB_TREE_URL, 'master_tree', 'Pokerole Database')
        .then((data) => {
            if (!data || !data.tree) return;

            const versionRegex = /(v|(version\s?))3\.0/i;
            const pokemonRegex = /\/(Pokemon|Pokedex)\//i;
            const moveRegex = /\/Moves\//i;
            const abilityRegex = /\/Abilities\//i;
            const itemRegex = /\/(Items|Equipment)\//i;

            data.tree.forEach((file: GitHubFileNode) => {
                if (!versionRegex.test(file.path) || !file.path.endsWith('.json')) return;

                const name = file.path.split('/').pop()?.replace('.json', '') || '';
                if (!name) return;

                const rawUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
                const cleanKey = name.toLowerCase();

                if (pokemonRegex.test(file.path)) {
                    SPECIES_URLS[cleanKey] = rawUrl;
                } else if (moveRegex.test(file.path)) {
                    MOVES_URLS[cleanKey] = rawUrl;

                    if (KNOWN_DUAL_MOVES[name]) {
                        KNOWN_DUAL_MOVES[name].forEach((variant) => {
                            if (!ALL_MOVES.includes(variant)) ALL_MOVES.push(variant);
                        });
                    } else {
                        if (!ALL_MOVES.includes(name)) ALL_MOVES.push(name);
                    }
                } else if (abilityRegex.test(file.path)) {
                    ABILITIES_URLS[cleanKey] = rawUrl;
                    if (!ALL_ABILITIES.includes(name)) ALL_ABILITIES.push(name);
                } else if (itemRegex.test(file.path)) {
                    ITEMS_URLS[cleanKey] = rawUrl;
                }
            });

            ALL_ABILITIES.sort();
            ALL_MOVES.sort();
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
    // Strip "(HA)" from the end of the string before searching
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
    const selectedUrl = MOVES_URLS[cleanName];

    if (!selectedUrl) return null;
    return await fetchWithCache<MoveApiResponse>(selectedUrl, `move_${cleanName}`, baseName);
}

export async function fetchItemData(itemName: string): Promise<ItemApiResponse | null> {
    if (!itemName) return null;
    const cleanName = itemName.trim().toLowerCase();

    const custom = homebrewItems.find((i) => i.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return { Name: custom.name, Description: custom.description };
    }

    await loadGithubTree();
    const selectedUrl = ITEMS_URLS[cleanName];

    if (!selectedUrl) return null;
    return await fetchWithCache<ItemApiResponse>(selectedUrl, `item_${cleanName}`, itemName);
}
