import { describe, it, expect, vi } from 'vitest';
import {
    parseHeight,
    parseWeight,
    parseLearnset,
    getBase,
    getLimit,
    extractAbilities,
    convertApiPokemonToCustom
} from '../macroHelpers';
import type { PokemonApiResponse } from '../../api/apiTypes';

vi.mock('../../api', () => ({
    getCanonicalMoveName: vi.fn((name: string) => name),
    fetchPokemonData: vi.fn(async () => null),
    fetchMoveData: vi.fn(async () => null)
}));

describe('macroParsers', () => {
    describe('parseHeight and parseWeight', () => {
        it('parses valid height and weight object structures', () => {
            expect(parseHeight({ Meters: 1.7, Feet: 5.5 })).toBe('1.7m / 5.5ft');
            expect(parseHeight({ Meters: 0, Feet: 0 })).toBe('0m / 0ft');
            expect(parseHeight({})).toBe('0m / 0ft');

            expect(parseWeight({ Kilograms: 60, Pounds: 132 })).toBe('60kg / 132lbs');
            expect(parseWeight({ Kilograms: 0, Pounds: 0 })).toBe('0kg / 0lbs');
            expect(parseWeight({})).toBe('0kg / 0lbs');
        });

        it('preserves raw string representations', () => {
            expect(parseHeight('2.1m / 6.9ft')).toBe('2.1m / 6.9ft');
            expect(parseWeight('100kg / 220lbs')).toBe('100kg / 220lbs');
        });

        it('returns empty string for null, undefined, and invalid non-object inputs', () => {
            expect(parseHeight(null)).toBe('');
            expect(parseHeight(undefined)).toBe('');
            expect(parseHeight(123)).toBe('');
            expect(parseHeight(true)).toBe('');

            expect(parseWeight(null)).toBe('');
            expect(parseWeight(undefined)).toBe('');
            expect(parseWeight(456)).toBe('');
            expect(parseWeight(false)).toBe('');
        });
    });

    describe('parseLearnset', () => {
        it('parses string arrays defaulting Learned to "Other"', () => {
            const moves = ['Tackle', 'Growl'];
            expect(parseLearnset(moves)).toEqual([
                { Learned: 'Other', Name: 'Tackle' },
                { Learned: 'Other', Name: 'Growl' }
            ]);
        });

        it('parses object arrays supporting Rank, Learned, Level, and Learn variants', () => {
            const moves = [
                { Rank: 'Starter', Name: 'Tackle' },
                { Learned: 'Amateur', Name: 'Quick Attack' },
                { Level: '15', Move: 'Thunder Shock' },
                { Learn: 'Ace', Move: 'Thunder' },
                { Unrelated: 'Ignored' } // No Name or Move
            ];
            expect(parseLearnset(moves)).toEqual([
                { Learned: 'Starter', Name: 'Tackle' },
                { Learned: 'Amateur', Name: 'Quick Attack' },
                { Learned: '15', Name: 'Thunder Shock' },
                { Learned: 'Ace', Name: 'Thunder' }
            ]);
        });

        it('parses rank-keyed dictionaries with string and object entries', () => {
            const movesDict = {
                Starter: ['Tackle', { Name: 'Tail Whip' }],
                Beginner: [{ Move: 'Ember' }]
            };
            expect(parseLearnset(movesDict)).toEqual([
                { Learned: 'Starter', Name: 'Tackle' },
                { Learned: 'Starter', Name: 'Tail Whip' },
                { Learned: 'Beginner', Name: 'Ember' }
            ]);
        });

        it('returns empty array for invalid, null, or undefined learnset inputs', () => {
            expect(parseLearnset(null)).toEqual([]);
            expect(parseLearnset(undefined)).toEqual([]);
            expect(parseLearnset('invalid')).toEqual([]);
            expect(parseLearnset(123)).toEqual([]);
        });
    });

    describe('getBase and getLimit', () => {
        it('resolves limits from MaxAttributes, MaxStats, Max${stat}, and Max ${stat} with fallback to 5', () => {
            expect(getLimit({ MaxAttributes: { Strength: 8 } }, 'Strength')).toBe(8);
            expect(getLimit({ MaxStats: { Dexterity: 7 } }, 'Dexterity')).toBe(7);
            expect(getLimit({ MaxVitality: 6 }, 'Vitality')).toBe(6);
            expect(getLimit({ 'Max Special': 9 }, 'Special')).toBe(9);
            expect(getLimit({}, 'Insight')).toBe(5);
        });

        it('resolves base stats from flat object, Attributes, and BaseAttributes with custom fallback', () => {
            expect(getBase({ Strength: 4 }, 'Strength', 2)).toBe(4);
            expect(getBase({ Attributes: { Dexterity: 3 } }, 'Dexterity', 2)).toBe(3);
            expect(getBase({ BaseAttributes: { Vitality: 5 } }, 'Vitality', 2)).toBe(5);
            expect(getBase({}, 'Special', 2)).toBe(2);
            expect(getBase({}, 'Insight', 1)).toBe(1);
        });
    });

    describe('extractAbilities', () => {
        it('extracts Ability1, Ability2 (filtering "None"), and HiddenAbility with (HA)', () => {
            const data = {
                Ability1: 'Blaze',
                Ability2: 'Solar Power',
                HiddenAbility: 'Chlorophyll'
            };
            expect(extractAbilities(data)).toEqual(['Blaze', 'Solar Power', 'Chlorophyll (HA)']);

            const withNone = {
                Ability1: 'Torrent',
                Ability2: 'None',
                HiddenAbility: 'None'
            };
            expect(extractAbilities(withNone)).toEqual(['Torrent']);
        });

        it('parses comma-separated EventAbilities and ExtraAbilities array filtering None and blanks', () => {
            const data = {
                Ability1: 'Static',
                EventAbilities: 'Lightning Rod, Surge Surfer, None, ',
                ExtraAbilities: [' Motor Drive ', 'None', '', 'Volt Absorb']
            };
            expect(extractAbilities(data)).toEqual([
                'Static',
                'Lightning Rod',
                'Surge Surfer',
                'Motor Drive',
                'Volt Absorb'
            ]);
        });

        it('falls back to legacy Abilities array of strings or objects when primary fields are absent', () => {
            const stringArray = { Abilities: ['Levitate', 'Heatproof'] };
            expect(extractAbilities(stringArray)).toEqual(['Levitate', 'Heatproof']);

            const objectArray = { Abilities: [{ Name: 'Pressure' }, { Name: 'Unnerve' }] };
            expect(extractAbilities(objectArray)).toEqual(['Pressure', 'Unnerve']);
        });
    });

    describe('convertApiPokemonToCustom', () => {
        it('normalizes full API response payload with types, stats, limits, and moves', () => {
            const apiData: PokemonApiResponse = {
                Name: 'Charizard',
                Type1: 'Fire',
                Type2: 'Flying',
                BaseHP: 5,
                Strength: 3,
                MaxStrength: 7,
                Dexterity: 3,
                MaxDexterity: 6,
                Vitality: 3,
                MaxVitality: 6,
                Special: 4,
                MaxSpecial: 8,
                Insight: 3,
                MaxInsight: 6,
                Ability1: 'Blaze',
                Ability2: 'None',
                HiddenAbility: 'Solar Power',
                EventAbilities: 'None',
                Moves: { Other: ['Scratch', 'Growl'] },
                DexID: '6',
                DexCategory: 'Flame Pokemon',
                Height: { Meters: 1.7, Feet: 5.5 },
                Weight: { Kilograms: 90.5, Pounds: 199.5 },
                DexDescription: 'Spits fire that is hot enough to melt boulders.',
                RecommendedRank: 'Pro'
            };

            const custom = convertApiPokemonToCustom(apiData);
            expect(custom.Name).toBe('Charizard');
            expect(custom.Type1).toBe('Fire');
            expect(custom.Type2).toBe('Flying');
            expect(custom.BaseHP).toBe(5);
            expect(custom.Strength).toBe(3);
            expect(custom.MaxStrength).toBe(7);
            expect(custom.Special).toBe(4);
            expect(custom.MaxSpecial).toBe(8);
            expect(custom.Ability1).toBe('Blaze');
            expect(custom.Ability2).toBe('');
            expect(custom.HiddenAbility).toBe('Solar Power');
            expect(custom.EventAbilities).toBe('');
            expect(custom.Moves).toEqual([
                { Learned: 'Other', Name: 'Scratch' },
                { Learned: 'Other', Name: 'Growl' }
            ]);
            expect(custom.DexID).toBe('6');
            expect(custom.Height).toBe('1.7m / 5.5ft');
            expect(custom.Weight).toBe('90.5kg / 199.5lbs');
            expect(custom.Legendary).toBe(false);
            expect(custom.Mythical).toBe(false);
            expect(custom.UltraBeast).toBe(false);
            expect(custom.Paradox).toBe(false);
        });

        it('accurately identifies classification tags for Legendary, Mythical, UltraBeast, and Paradox', () => {
            const mew = convertApiPokemonToCustom({ Name: 'Mew' });
            expect(mew.Mythical).toBe(true);
            expect(mew.Legendary).toBe(false);

            const nihilego = convertApiPokemonToCustom({ Name: 'Nihilego' });
            expect(nihilego.UltraBeast).toBe(true);

            const greatTusk = convertApiPokemonToCustom({ Name: 'Great Tusk' });
            expect(greatTusk.Paradox).toBe(true);

            const rayquaza = convertApiPokemonToCustom({ Name: 'Rayquaza', legendary: true } as unknown as PokemonApiResponse);
            expect(rayquaza.Legendary).toBe(true);
            expect(rayquaza.Mythical).toBe(false);

            const dialga = convertApiPokemonToCustom({ Name: 'Dialga', Legendary: true } as unknown as PokemonApiResponse);
            expect(dialga.Legendary).toBe(true);
        });

        it('falls back to legacy Abilities array when Ability1 is missing', () => {
            const apiData: PokemonApiResponse = {
                Name: 'Gengar',
                Abilities: ['Cursed Body', 'Levitate', 'Shadow Tag']
            };
            const custom = convertApiPokemonToCustom(apiData);
            expect(custom.Ability1).toBe('Cursed Body');
            expect(custom.Ability2).toBe('Levitate');
            expect(custom.HiddenAbility).toBe('Shadow Tag');
        });
    });
});
