import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    loadLocalDataset,
    fetchBasePokemonData,
    fetchPokemonData,
    fetchAbilityData,
    fetchNatureData
} from '@/utils/api/api';
import { fetchWithCache, clearMemoryCache } from '@/utils/api/apiClient';

describe('apiLookupSafety', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        clearMemoryCache();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('returns null with zero fetch calls for non-indexed species, abilities, and natures after loadLocalDataset()', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                pokemon: [{ name: 'Pikachu', path: '/dataset/pokedex/Pikachu.json' }],
                abilities: [{ name: 'Static', path: '/dataset/abilities/Static.json' }],
                natures: [{ name: 'Hardy', path: '/dataset/natures/Hardy.json' }],
                moves: {},
                items: {}
            })
        });
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const index = await loadLocalDataset();
        expect(index).not.toBeNull();

        mockFetch.mockClear();

        const [baseMon, mon, ability, nature] = await Promise.all([
            fetchBasePokemonData('NonExistentMon'),
            fetchPokemonData('NonExistentMon'),
            fetchAbilityData('NonExistentAbility'),
            fetchNatureData('NonExistentNature')
        ]);

        expect(baseMon).toBeNull();
        expect(mon).toBeNull();
        expect(ability).toBeNull();
        expect(nature).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('negative-caches 404 responses in fetchWithCache so repeated lookups do not re-fetch', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        });
        globalThis.fetch = mockFetch as unknown as typeof fetch;

        const first = await fetchWithCache('/dataset/pokedex/Missing.json', 'missing_mon_key', 'Missing');
        const second = await fetchWithCache('/dataset/pokedex/Missing.json', 'missing_mon_key', 'Missing');

        expect(first).toBeNull();
        expect(second).toBeNull();
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});

