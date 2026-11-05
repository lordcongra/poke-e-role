import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldShiftTypeForAbility, fetchBaseSpeciesTyping } from '../proteanLiberoUtils';
import * as api from '@/utils/api/api';

describe('proteanLiberoUtils', () => {
    describe('shouldShiftTypeForAbility', () => {
        it('Protean shifts on Physical and Special moves', () => {
            const physShift = shouldShiftTypeForAbility('Protean', true, 'Physical', 'Water', 'Normal', '');
            expect(physShift.shouldShift).toBe(true);
            expect(physShift.newType).toBe('Water');
            expect(physShift.matchedAbility).toBe('Protean');

            const specShift = shouldShiftTypeForAbility('Protean (HA)', true, 'Special', 'Ice', 'Water', '');
            expect(specShift.shouldShift).toBe(true);
            expect(specShift.newType).toBe('Ice');
            expect(specShift.matchedAbility).toBe('Protean');
        });

        it('Protean ignores Status and Support moves', () => {
            const statusShift = shouldShiftTypeForAbility('Protean', true, 'Status', 'Ghost', 'Normal', '');
            expect(statusShift.shouldShift).toBe(false);
            expect(statusShift.matchedAbility).toBe('Protean');

            const supportShift = shouldShiftTypeForAbility('Protean', true, 'Support', 'Grass', 'Water', '');
            expect(supportShift.shouldShift).toBe(false);
            expect(supportShift.matchedAbility).toBe('Protean');
        });

        it('Libero shifts on Physical, Special, Status, and Support moves', () => {
            const physShift = shouldShiftTypeForAbility('Libero', true, 'Physical', 'Fire', 'Normal', '');
            expect(physShift.shouldShift).toBe(true);
            expect(physShift.newType).toBe('Fire');
            expect(physShift.matchedAbility).toBe('Libero');

            const specShift = shouldShiftTypeForAbility('Libero', true, 'Special', 'Electric', 'Fire', '');
            expect(specShift.shouldShift).toBe(true);
            expect(specShift.newType).toBe('Electric');
            expect(specShift.matchedAbility).toBe('Libero');

            const statusShift = shouldShiftTypeForAbility('Libero', true, 'Status', 'Ghost', 'Fire', '');
            expect(statusShift.shouldShift).toBe(true);
            expect(statusShift.newType).toBe('Ghost');
            expect(statusShift.matchedAbility).toBe('Libero');

            const supportShift = shouldShiftTypeForAbility('Libero', true, 'Support', 'Normal', 'Fire', '');
            expect(supportShift.shouldShift).toBe(true);
            expect(supportShift.newType).toBe('Normal');
            expect(supportShift.matchedAbility).toBe('Libero');
        });

        it('blocks shift when abilityActive is false', () => {
            const resProtean = shouldShiftTypeForAbility('Protean', false, 'Physical', 'Water', 'Normal', '');
            expect(resProtean.shouldShift).toBe(false);
            expect(resProtean.matchedAbility).toBeNull();

            const resLibero = shouldShiftTypeForAbility('Libero', false, 'Physical', 'Fire', 'Normal', '');
            expect(resLibero.shouldShift).toBe(false);
            expect(resLibero.matchedAbility).toBeNull();
        });

        it('returns shouldShift=false when character is already purely that type', () => {
            const res = shouldShiftTypeForAbility('Protean', true, 'Physical', 'Water', 'Water', '');
            expect(res.shouldShift).toBe(false);
            expect(res.matchedAbility).toBe('Protean');

            const resNone = shouldShiftTypeForAbility('Libero', true, 'Physical', 'Fire', 'fire', 'none');
            expect(resNone.shouldShift).toBe(false);
            expect(resNone.matchedAbility).toBe('Libero');
        });

        it('returns shouldShift=true when character is dual-typed with that type (shifts to mono-type)', () => {
            const resDual = shouldShiftTypeForAbility('Protean', true, 'Physical', 'Water', 'Water', 'Dark');
            expect(resDual.shouldShift).toBe(true);
            expect(resDual.newType).toBe('Water');
            expect(resDual.matchedAbility).toBe('Protean');
        });

        it('ignores typeless moves or missing move types', () => {
            const resTypeless = shouldShiftTypeForAbility('Protean', true, 'Physical', 'Typeless', 'Water', '');
            expect(resTypeless.shouldShift).toBe(false);

            const resEmpty = shouldShiftTypeForAbility('Libero', true, 'Physical', '', 'Water', '');
            expect(resEmpty.shouldShift).toBe(false);
        });

        it('returns shouldShift=false for non-matching abilities', () => {
            const resTorrent = shouldShiftTypeForAbility('Torrent', true, 'Physical', 'Water', 'Normal', '');
            expect(resTorrent.shouldShift).toBe(false);
            expect(resTorrent.matchedAbility).toBeNull();
        });
    });

    describe('fetchBaseSpeciesTyping', () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it('returns correct base typing for dual-type pokemon', async () => {
            vi.spyOn(api, 'fetchPokemonData').mockResolvedValueOnce({
                Name: 'Greninja',
                Type1: 'Water',
                Type2: 'Dark'
            } as any);

            const result = await fetchBaseSpeciesTyping('Greninja');
            expect(result).toEqual({ type1: 'Water', type2: 'Dark' });
        });

        it('returns sanitized empty string for single-type pokemon', async () => {
            vi.spyOn(api, 'fetchPokemonData').mockResolvedValueOnce({
                Name: 'Cinderace',
                Type1: 'Fire',
                Type2: 'None'
            } as any);

            const result = await fetchBaseSpeciesTyping('Cinderace');
            expect(result).toEqual({ type1: 'Fire', type2: '' });
        });

        it('falls back to Normal if Type1 is omitted', async () => {
            vi.spyOn(api, 'fetchPokemonData').mockResolvedValueOnce({
                Name: 'UnknownMon'
            } as any);

            const result = await fetchBaseSpeciesTyping('UnknownMon');
            expect(result).toEqual({ type1: 'Normal', type2: '' });
        });

        it('returns null if speciesName is empty or fetch returns null', async () => {
            expect(await fetchBaseSpeciesTyping('')).toBeNull();

            vi.spyOn(api, 'fetchPokemonData').mockResolvedValueOnce(null);
            expect(await fetchBaseSpeciesTyping('Nonexistent')).toBeNull();
        });
    });
});

