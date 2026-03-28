// src/utils/api.ts

export const GITHUB_TREE_URL = "https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1";

export const SPECIES_URLS: Record<string, string> = {};
export const MOVES_URLS: Record<string, string> = {};
export const ABILITIES_URLS: Record<string, string> = {};

export const ALL_ABILITIES: string[] = [];
// NEW: Global array for all Move names
export const ALL_MOVES: string[] = [];

let isTreeLoaded = false;

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
                // Capture every move name!
                if (!ALL_MOVES.includes(name)) ALL_MOVES.push(name);
            } else if (abilityRegex.test(file.path)) {
                ABILITIES_URLS[cleanKey] = rawUrl;
                if (!ALL_ABILITIES.includes(name)) ALL_ABILITIES.push(name);
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
    await loadGithubTree();
    const cleanName = speciesName.trim().toLowerCase();
    const selectedUrl = SPECIES_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `species_${cleanName}`, speciesName);
}

export async function fetchAbilityData(abilityName: string) {
    if (!abilityName) return null;
    await loadGithubTree();
    const cleanName = abilityName.trim().toLowerCase();
    const selectedUrl = ABILITIES_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `ability_${cleanName}`, abilityName);
}

// NEW: Fetches JSON data for a specific move!
export async function fetchMoveData(moveName: string) {
    if (!moveName) return null;
    await loadGithubTree();
    const cleanName = moveName.trim().toLowerCase();
    const selectedUrl = MOVES_URLS[cleanName];

    if (!selectedUrl) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await fetchWithCache<any>(selectedUrl, `move_${cleanName}`, moveName);
}