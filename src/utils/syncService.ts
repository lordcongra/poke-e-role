import { useCharacterStore } from '../store/useCharacterStore';
import { loadLocalDataset, fetchMoveData, fetchPokemonData, fetchAbilityData } from './api';

/**
 * Synchronizes character dataset across moves, species, and active ability.
 */
export async function syncCharacterDataset(): Promise<void> {
    await loadLocalDataset();
    const store = useCharacterStore.getState();

    for (const move of store.moves) {
        if (move.name) {
            const data = await fetchMoveData(move.name);
            if (data) {
                store.applyMoveData(move.id, data as Record<string, unknown>);
            }
        }
    }

    if (store.identity.species && store.identity.mode === 'Pokémon') {
        const data = await fetchPokemonData(store.identity.species);
        if (data) {
            store.refreshSpeciesData(data as Record<string, unknown>);
        }
    }

    if (store.identity.ability) {
        await fetchAbilityData(store.identity.ability);
    }
}
