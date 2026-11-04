import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupAbilityDetails } from '../abilityLookupUtils';
import { useCharacterStore } from '@/store/useCharacterStore';
import * as apiModule from '@/utils/api/api';

vi.mock('@/utils/api/api', async () => {
    const actual = await vi.importActual<typeof import('@/utils/api/api')>('@/utils/api/api');
    return {
        ...actual,
        fetchAbilityData: vi.fn()
    };
});

describe('abilityLookupUtils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCharacterStore.setState({ roomCustomAbilities: [] });
    });

    it('returns empty result for blank ability name', async () => {
        const result = await lookupAbilityDetails('');
        expect(result.name).toBe('');
        expect(result.tags).toBe('');
    });

    it('cleans (HA) suffix from ability name', async () => {
        vi.mocked(apiModule.fetchAbilityData).mockResolvedValueOnce({
            Name: 'Overgrow',
            Effect: 'Powers up Grass-type moves in a pinch.',
            Description: 'Ups Grass moves in low HP.'
        });

        const result = await lookupAbilityDetails('Overgrow (HA)');
        expect(result.name).toBe('Overgrow');
        expect(apiModule.fetchAbilityData).toHaveBeenCalledWith('Overgrow');
    });

    it('resolves known ability summary and rank-based tags', async () => {
        const starterResult = await lookupAbilityDetails('Huge Power', 'Starter');
        expect(starterResult.summary).toContain('Increases Strength');
        expect(starterResult.tags).toBe('[Str +1]');

        const expertResult = await lookupAbilityDetails('Huge Power', 'Expert');
        expect(expertResult.tags).toBe('[Str +2]');
    });

    it('prioritizes roomCustomAbilities from store', async () => {
        useCharacterStore.setState({
            roomCustomAbilities: [
                {
                    id: 'custom-1',
                    name: 'Super Boost',
                    description: 'Custom flavor text',
                    effect: 'Custom effect description'
                }
            ]
        });

        const result = await lookupAbilityDetails('Super Boost');
        expect(result.name).toBe('Super Boost');
        expect(result.effect).toBe('Custom effect description');
        expect(result.description).toBe('Custom flavor text');
    });

    it('merges initialTags without duplicate entries', async () => {
        const result = await lookupAbilityDetails('Huge Power', 'Starter', '[Custom Tag]');
        expect(result.tags).toBe('[Custom Tag] [Str +1]');

        const noDuplicate = await lookupAbilityDetails('Huge Power', 'Starter', '[Str +1]');
        expect(noDuplicate.tags).toBe('[Str +1]');
    });
});

