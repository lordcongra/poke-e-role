import type { TrainerPokedexData, TrainerPokedexEntry } from '../../store/entityTypes';
import type { PokemonLookupEntry } from '../../utils/api/apiTypes';

export interface PokedexTotals {
    seen: number;
    caught: number;
    shiny: number;
}

/**
 * Calculates total seen, caught, and shiny counts from trainer pokedex data.
 */
export function countPokedexTotals(pokedex: TrainerPokedexData = {}): PokedexTotals {
    let seen = 0;
    let caught = 0;
    let shiny = 0;

    for (const entry of Object.values(pokedex)) {
        if (!entry) continue;
        if (entry.seen || entry.caught || entry.shiny) seen++;
        if (entry.caught) caught++;
        if (entry.shiny) shiny++;
    }

    return { seen, caught, shiny };
}

/**
 * Safely retrieves or defaults a pokedex entry for a given species name.
 */
export function getPokedexEntry(pokedex: TrainerPokedexData = {}, name: string): TrainerPokedexEntry {
    const entry = pokedex[name];
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
 * Checks whether a given pokemon has any recorded status.
 */
export function isPokemonRegistered(pokedex: TrainerPokedexData = {}, name: string): boolean {
    const entry = pokedex[name];
    return Boolean(entry && (entry.seen || entry.caught || entry.shiny));
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
