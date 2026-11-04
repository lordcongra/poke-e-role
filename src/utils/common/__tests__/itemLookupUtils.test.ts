import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseHeldItemNames, lookupMultipleItemDetails } from '../itemLookupUtils';
import { useCharacterStore } from '@/store/useCharacterStore';
import * as apiModule from '@/utils/api/api';

vi.mock('@/utils/api/api', async () => {
    const actual = await vi.importActual<typeof import('@/utils/api/api')>('@/utils/api/api');
    return {
        ...actual,
        fetchItemData: vi.fn()
    };
});

describe('itemLookupUtils - parseHeldItemNames & multi-item lookup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCharacterStore.setState({ roomCustomItems: [] });
    });

    it('returns empty array for empty string', async () => {
        const result = await parseHeldItemNames('');
        expect(result).toEqual([]);
    });

    it('returns single item unchanged when no commas exist', async () => {
        const result = await parseHeldItemNames('Leftovers');
        expect(result).toEqual(['Leftovers']);
    });

    it('splits comma-delimited items into distinct item names', async () => {
        const result = await parseHeldItemNames('Leftovers, Choice Band, Sitrus Berry');
        expect(result).toEqual(['Leftovers', 'Choice Band', 'Sitrus Berry']);
    });

    it('preserves an exact custom item even if its name contains a comma', async () => {
        useCharacterStore.setState({
            roomCustomItems: [
                {
                    id: 'custom-1',
                    name: 'Super Potion, Special Edition',
                    description: 'Heals extra HP',
                    tags: '[Heal +3]'
                }
            ]
        });

        const result = await parseHeldItemNames('Super Potion, Special Edition');
        expect(result).toEqual(['Super Potion, Special Edition']);
    });

    it('correctly parses multiple items when one has a comma in its name', async () => {
        useCharacterStore.setState({
            roomCustomItems: [
                {
                    id: 'custom-1',
                    name: 'Power Herb, Deluxe',
                    description: 'One-turn charge herb',
                    tags: ''
                }
            ]
        });

        const result = await parseHeldItemNames('Power Herb, Deluxe, Leftovers');
        expect(result).toEqual(['Power Herb, Deluxe', 'Leftovers']);
    });

    it('looks up multiple items and returns details for each', async () => {
        vi.mocked(apiModule.fetchItemData).mockImplementation(async (name: string) => {
            if (name.toLowerCase() === 'leftovers') {
                return { Name: 'Leftovers', Description: 'Restores HP each turn.' };
            }
            if (name.toLowerCase() === 'choice band') {
                return { Name: 'Choice Band', Description: 'Boosts Attack but locks moves.' };
            }
            return null;
        });

        const items = await lookupMultipleItemDetails('Leftovers, Choice Band');
        expect(items).toHaveLength(2);
        expect(items[0].name).toBe('Leftovers');
        expect(items[0].description).toBe('Restores HP each turn.');
        expect(items[1].name).toBe('Choice Band');
        expect(items[1].description).toBe('Boosts Attack but locks moves.');
    });
});

