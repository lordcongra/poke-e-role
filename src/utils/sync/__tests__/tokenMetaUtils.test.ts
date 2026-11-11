import { describe, it, expect } from 'vitest';
import { parseCombatPoolsFromMeta, isTokenSpeciesCompatible } from '@/utils/sync/tokenMetaUtils';

describe('parseCombatPoolsFromMeta', () => {
    const fallback = { hp: 10, maxHp: 12, will: 3, maxWill: 5 };

    it('parses numeric values including zero', () => {
        const result = parseCombatPoolsFromMeta(
            {
                'hp-curr': 0,
                'hp-max-display': 15,
                'will-curr': 0,
                'will-max-display': 8
            },
            fallback
        );

        expect(result).toEqual({ hp: 0, maxHp: 15, will: 0, maxWill: 8 });
    });

    it('parses valid numeric strings including zero and trimmed whitespace', () => {
        const result = parseCombatPoolsFromMeta(
            {
                'hp-curr': '0',
                'hp-max-display': ' 20 ',
                'will-curr': '2',
                'will-max-display': '6'
            },
            fallback
        );

        expect(result).toEqual({ hp: 0, maxHp: 20, will: 2, maxWill: 6 });
    });

    it('falls back on empty strings, null, undefined, NaN, and Infinity', () => {
        const result = parseCombatPoolsFromMeta(
            {
                'hp-curr': '',
                'hp-max-display': null,
                'will-curr': Number.NaN,
                'will-max-display': 'not-a-number'
            },
            fallback
        );

        expect(result).toEqual(fallback);

        expect(
            parseCombatPoolsFromMeta(
                {
                    'hp-curr': undefined,
                    'hp-max-display': '   ',
                    'will-curr': Infinity,
                    'will-max-display': -Infinity
                },
                fallback
            )
        ).toEqual(fallback);
    });

    it('handles missing metadata object and partial fallbacks', () => {
        expect(parseCombatPoolsFromMeta(undefined, fallback)).toEqual(fallback);
        expect(parseCombatPoolsFromMeta(null, { hp: 4 })).toEqual({
            hp: 4,
            maxHp: 0,
            will: 0,
            maxWill: 0
        });
    });
});

describe('isTokenSpeciesCompatible', () => {
    it('rejects distinct species even when one is a substring of the other (Mew vs Mewtwo)', () => {
        expect(isTokenSpeciesCompatible('Mew', '', 'Mewtwo', '', 'Mewtwo')).toBe(false);
        expect(isTokenSpeciesCompatible('Mewtwo', 'Mewtwo', 'Mew', '', 'Mew')).toBe(false);
        expect(isTokenSpeciesCompatible('Mew', 'Mew', 'Mewtwo', '', 'Mewtwo')).toBe(false);
    });

    it('matches identical species case-insensitively and with surrounding whitespace', () => {
        expect(isTokenSpeciesCompatible('Pikachu', '', 'Pikachu', '', 'Pikachu')).toBe(true);
        expect(isTokenSpeciesCompatible('  pikachu ', '', 'PIKACHU', '', 'Pikachu')).toBe(true);
    });

    it('matches empty token species when nickname matches summary nickname or name', () => {
        expect(isTokenSpeciesCompatible('', 'Sparky', 'Pikachu', 'Sparky', 'Sparky')).toBe(true);
        expect(isTokenSpeciesCompatible(undefined, 'sparky', 'Pikachu', '', 'Sparky')).toBe(true);
    });

    it('matches renamed token "Sparky" when summary species is "Pikachu" and summary nickname is "Sparky"', () => {
        expect(isTokenSpeciesCompatible('Pikachu', 'Sparky', 'Pikachu', 'Sparky', 'Sparky')).toBe(true);
        expect(isTokenSpeciesCompatible('Sparky', 'Sparky', 'Pikachu', 'Sparky', 'Pikachu')).toBe(true);
    });

    it('rejects mismatched nickname when token species is empty or mismatched', () => {
        expect(isTokenSpeciesCompatible('', 'Charizard', 'Pikachu', 'Sparky', 'Sparky')).toBe(false);
        expect(isTokenSpeciesCompatible('Mew', 'Sparky', 'Mewtwo', 'Bolt', 'Bolt')).toBe(false);
    });

    it('returns true when neither species nor nickname has comparable fields to contradict', () => {
        expect(isTokenSpeciesCompatible('', '', 'Pikachu', 'Sparky', 'Sparky')).toBe(true);
        expect(isTokenSpeciesCompatible('Pikachu', 'Sparky', '', '', '')).toBe(true);
    });
});

