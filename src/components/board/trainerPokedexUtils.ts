import type { TrainerPokedexData, TrainerPokedexEntry } from '../../store/entityTypes';
import type { PokemonLookupEntry } from '../../utils/api/apiTypes';

export interface PokedexTotals {
    seen: number;
    caught: number;
    shiny: number;
}

/**
 * Calculates total seen, caught, and shiny counts from trainer pokedex data.
 * Deduplicates keys case-insensitively before tallying counters.
 */
export function countPokedexTotals(pokedex: TrainerPokedexData = {}): PokedexTotals {
    let seen = 0;
    let caught = 0;
    let shiny = 0;

    const merged: Record<string, TrainerPokedexEntry> = {};
    for (const [key, entry] of Object.entries(pokedex)) {
        if (!entry) continue;
        const norm = key.trim().toLowerCase();
        if (!norm) continue;
        if (!merged[norm]) {
            merged[norm] = {
                seen: Boolean(entry.seen || entry.caught || entry.shiny),
                caught: Boolean(entry.caught),
                shiny: Boolean(entry.shiny)
            };
        } else {
            merged[norm].seen = Boolean(merged[norm].seen || entry.seen || entry.caught || entry.shiny);
            merged[norm].caught = Boolean(merged[norm].caught || entry.caught);
            merged[norm].shiny = Boolean(merged[norm].shiny || entry.shiny);
        }
    }

    for (const entry of Object.values(merged)) {
        if (entry.seen || entry.caught || entry.shiny) seen++;
        if (entry.caught) caught++;
        if (entry.shiny) shiny++;
    }

    return { seen, caught, shiny };
}

/**
 * Safely retrieves or defaults a pokedex entry for a given species name (case-insensitive).
 */
export function getPokedexEntry(pokedex: TrainerPokedexData = {}, name: string): TrainerPokedexEntry {
    const cleanLower = name.trim().toLowerCase();
    const entry = pokedex[name] ?? Object.entries(pokedex).find(([k]) => k.trim().toLowerCase() === cleanLower)?.[1];
    if (!entry) {
        return { seen: false, caught: false, shiny: false };
    }
    return {
        seen: Boolean(entry.seen || entry.caught || entry.shiny),
        caught: Boolean(entry.caught),
        shiny: Boolean(entry.shiny)
    };
}

/**
 * Checks whether a given pokemon has any recorded status (case-insensitive).
 */
export function isPokemonRegistered(pokedex: TrainerPokedexData = {}, name: string): boolean {
    const cleanLower = name.trim().toLowerCase();
    const entry = pokedex[name] ?? Object.entries(pokedex).find(([k]) => k.trim().toLowerCase() === cleanLower)?.[1];
    return Boolean(entry && (entry.seen || entry.caught || entry.shiny));
}

/**
 * Returns the canonical species TitleCase name if matched case-insensitively in the lookup list,
 * otherwise returns the trimmed name.
 */
export function findCanonicalSpeciesName(name: string, lookupList: Array<{ name: string }>): string {
    const clean = name.trim();
    const lower = clean.toLowerCase();
    const match = lookupList.find((item) => item.name.trim().toLowerCase() === lower);
    return match ? match.name : clean;
}

/**
 * Filters a lookup list to only include Pokémon registered in the trainer's Pokédex.
 */
export function filterRegisteredPokemon(
    pokedex: TrainerPokedexData = {},
    lookupList: PokemonLookupEntry[] = []
): PokemonLookupEntry[] {
    return lookupList.filter((p) => isPokemonRegistered(pokedex, p.name));
}

/**
 * Calculates percentage clamped between 0 and 100.
 */
export function calculatePokedexPercentage(count: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((count / total) * 100)));
}

/**
 * Resolves a registered Pokémon name to its full lookup entry if found in the index,
 * or generates a fallback entry if it was custom-typed.
 */
export function resolvePokedexEntryToLookup(
    name: string,
    _entry: TrainerPokedexEntry,
    lookupMap: Map<string, PokemonLookupEntry>
): PokemonLookupEntry {
    const found = lookupMap.get(name.trim().toLowerCase());
    if (found) return found;
    return {
        name: name.trim(),
        dexId: '???',
        type1: 'Normal',
        type2: '',
        moves: [],
        ability1: '',
        ability2: '',
        hiddenAbility: '',
        eventAbilities: '',
        legendary: false,
        starter: false,
        isCustom: true
    };
}
