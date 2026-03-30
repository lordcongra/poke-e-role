// src/utils/api.ts
import type { CustomPokemon, CustomMove, CustomAbility } from '../store/storeTypes';

export const GITHUB_TREE_URL = "https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1";

export const SPECIES_URLS: Record<string, string> = {};
export const MOVES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};
export const ITEMS_URLS: Record<string, string> = {}; 

export const ALL_ABILITIES: string[] = [];
export const ALL_MOVES: string[] = [];

let isTreeLoaded = false;

// --- HOMEBREW REGISTRY INJECTION ---
let hbPokemon: CustomPokemon[] = [];
let hbMoves: CustomMove[] = [];
let hbAbilities: CustomAbility[] = [];

export function syncHomebrewToApi(p: CustomPokemon[], m: CustomMove[], a: CustomAbility[]) {
    hbPokemon = p;
    hbMoves = m;
    hbAbilities = a;
}
// -----------------------------------

async function fetchWithCache<T>(url: string, cacheKey: string, itemName: string): Promise<T | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = (await response.json()) as T;
        localStorage.setItem(`pkr_cache_${cacheKey}`, JSON.stringify(data));
        return data;
    } catch (err) {
        console.warn(`[Network] Fetch failed for ${itemName}, checking cache...`);
        const cached = localStorage.getItem(`pkr_cache_${cacheKey}`);
        
        if (cached) {
            console.log(`Using cached data for ${itemName}.`);
            return JSON.parse(cached) as T;
        }
        
        console.error(`❌ Failed to load ${itemName}. No offline cache found.`);
        return null;
    }
}

export async function loadGithubTree(): Promise<void> {
    if (isTreeLoaded) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await fetchWithCache<any>(GITHUB_TREE_URL, 'master_tree', 'Pokerole Database');
    if (!data || !data.tree) return;

    try {
        const versionRegex = /(v|(version\s?))3\.0/i;
        const pokemonRegex = /\/(Pokemon|Pokedex)\//i;
        const moveRegex = /\/Moves\//i;
        const abilityRegex = /\/Abilities\//i;
        const itemRegex = /\/(Items|Equipment)\//i; 

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.tree.forEach((file: any) => {
            if (!versionRegex.test(file.path) || !file.path.endsWith(".json")) return;

            const name = file.path.split('/').pop()?.replace('.json', '') || '';
            if (!name) return;

            const rawUrl = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
            const cleanKey = name.toLowerCase();

            if (pokemonRegex.test(file.path)) {
                SPECIES_URLS[cleanKey] = rawUrl;
            } else if (moveRegex.test(file.path)) {
                MOVES_URLS[cleanKey] = rawUrl;
                if (!ALL_MOVES.includes(name)) ALL_MOVES.push(name);
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
    } catch(err) {
        console.error("Error processing Github Data:", err);
    }
}

export async function fetchPokemonData(speciesName: string) {
    if (!speciesName) return null;
    const cleanName = speciesName.trim().toLowerCase();

    // INTERCEPT: Check Homebrew Memory First!
    const custom = hbPokemon.find(p => p.Name.trim().toLowerCase() === cleanName);
    if (custom) return custom;

    await loadGithubTree();
    const selectedUrl = SPECIES_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `species_${cleanName}`, speciesName);
}

export async function fetchAbilityData(abilityName: string) {
    if (!abilityName) return null;
    const cleanName = abilityName.trim().toLowerCase();

    // INTERCEPT: Check Homebrew Memory First!
    const custom = hbAbilities.find(a => a.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return { Name: custom.name, Description: custom.description, Effect: custom.effect };
    }

    await loadGithubTree();
    const selectedUrl = ABILITIES_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `ability_${cleanName}`, abilityName);
}

export async function fetchMoveData(moveName: string) {
    if (!moveName) return null;
    const cleanName = moveName.trim().toLowerCase();

    // INTERCEPT: Check Homebrew Memory First!
    const custom = hbMoves.find(m => m.name.trim().toLowerCase() === cleanName);
    if (custom) {
        return {
            Name: custom.name, Type: custom.type, Category: custom.category, Power: custom.power,
            Accuracy1: custom.acc1, Accuracy2: custom.acc2, Damage1: custom.dmg1, Effect: custom.desc
        };
    }

    await loadGithubTree();
    const selectedUrl = MOVES_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `move_${cleanName}`, moveName);
}

export async function fetchItemData(itemName: string) {
    if (!itemName) return null;
    await loadGithubTree();
    const cleanName = itemName.trim().toLowerCase();
    const selectedUrl = ITEMS_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `item_${cleanName}`, itemName);
}