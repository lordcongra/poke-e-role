import { describe, it, expect } from 'vitest';
import { sanitizeHomebrewData } from '@/utils/sync/homebrewStorage';
import { validateAndSanitizeHomebrewBackup } from '@/utils/sync/homebrewSanitizer';

describe('sanitizeHomebrewData & validateAndSanitizeHomebrewBackup (S-07)', () => {
    it('returns empty arrays for null, primitives, and array roots', () => {
        const invalidRoots: unknown[] = [null, undefined, 123, 'corrupted', true, [], [{ name: 'Bad' }]];
        for (const root of invalidRoots) {
            const sanitized = sanitizeHomebrewData(root);
            expect(sanitized.customTypes).toEqual([]);
            expect(sanitized.customAbilities).toEqual([]);
            expect(sanitized.customMoves).toEqual([]);
            expect(sanitized.customPokemon).toEqual([]);
            expect(sanitized.customItems).toEqual([]);
            expect(sanitized.customForms).toEqual([]);
            expect(sanitized.customStatuses).toEqual([]);
            expect(sanitized.customFieldEffects).toEqual([]);
            expect(validateAndSanitizeHomebrewBackup(root)).toBeNull();
        }
    });

    it('drops null, primitives, arrays, and objects lacking valid non-empty string Name/name across all 8 categories', () => {
        const invalidMixed = [null, undefined, 123, 'str', [], {}, { name: '' }, { name: '   ' }, { name: 42 }];
        const invalidPokemonMixed = [
            null,
            undefined,
            123,
            'str',
            [],
            {},
            { Name: '' },
            { Name: '   ' },
            { Name: 99 },
            { name: 'lowercaseNameWrongKey' }
        ];

        const validType = {
            name: 'Cosmic',
            color: '#6b21a8',
            weaknesses: ['Dark'],
            resistances: [],
            immunities: [],
            seAgainst: ['Psychic'],
            nveAgainst: [],
            noEffectAgainst: []
        };
        const validAbility = { id: 'ab-1', name: 'Starlight', description: 'Glows.', effect: '+1 SpA' };
        const validMove = {
            id: 'mv-1',
            name: 'Comet Pulse',
            type: 'Cosmic',
            category: 'Special',
            power: 3,
            acc1: 'Special',
            acc2: 'Channel',
            dmg1: 'Special',
            desc: 'Fires starlight.'
        };
        const validPokemon = {
            id: 'pk-1',
            Name: 'Astrachu',
            Type1: 'Cosmic',
            Type2: '',
            BaseHP: 5,
            Moves: [{ Learned: 'Starter', Name: 'Comet Pulse' }, null, { Name: '' }, 123]
        };
        const validItem = { id: 'it-1', name: 'Star Candy', description: 'Sweet.' };
        const validForm = { id: 'fm-1', name: 'Mega Astrachu', description: 'Mega form.' };
        const validStatus = {
            id: 'st-1',
            name: 'Dazed',
            description: 'Confused by stars.',
            effects: '-1 Dex',
            color: '#f59e0b',
            textColor: '#111827'
        };
        const validFieldEffect = {
            id: 'fe-1',
            name: 'Meteor Shower',
            category: 'weather',
            defaultRounds: 5,
            color: '#7c3aed',
            icon: 'sparkles',
            tags: 'cosmic',
            description: 'Boosts Cosmic moves.'
        };

        const result = sanitizeHomebrewData({
            customTypes: [...invalidMixed, validType],
            customAbilities: [...invalidMixed, validAbility],
            customMoves: [...invalidMixed, validMove],
            customPokemon: [...invalidPokemonMixed, validPokemon],
            customItems: [...invalidMixed, validItem],
            customForms: [...invalidMixed, validForm],
            customStatuses: [...invalidMixed, validStatus],
            customFieldEffects: [...invalidMixed, validFieldEffect]
        });

        expect(result.customTypes).toHaveLength(1);
        expect(result.customTypes[0].name).toBe('Cosmic');

        expect(result.customAbilities).toHaveLength(1);
        expect(result.customAbilities[0].name).toBe('Starlight');

        expect(result.customMoves).toHaveLength(1);
        expect(result.customMoves[0].name).toBe('Comet Pulse');

        expect(result.customPokemon).toHaveLength(1);
        expect(result.customPokemon[0].Name).toBe('Astrachu');
        expect(result.customPokemon[0].Moves).toEqual([{ Learned: 'Starter', Name: 'Comet Pulse' }]);

        expect(result.customItems).toHaveLength(1);
        expect(result.customItems[0].name).toBe('Star Candy');

        expect(result.customForms).toHaveLength(1);
        expect(result.customForms[0].name).toBe('Mega Astrachu');
        expect(result.customForms[0].grantedMoves).toEqual([]);

        expect(result.customStatuses).toHaveLength(1);
        expect(result.customStatuses[0].name).toBe('Dazed');

        expect(result.customFieldEffects).toHaveLength(1);
        expect(result.customFieldEffects?.[0].name).toBe('Meteor Shower');
    });

    it('validateAndSanitizeHomebrewBackup rejects backups with non-array categories or exclusively invalid items', () => {
        expect(validateAndSanitizeHomebrewBackup({ customTypes: 'bad' })).toBeNull();
        expect(validateAndSanitizeHomebrewBackup({ customTypes: [null, 123, {}] })).toBeNull();
        expect(
            validateAndSanitizeHomebrewBackup({
                customTypes: [null, { name: 'ValidType', color: '#112233' }],
                customMoves: 'not-an-array'
            })?.customTypes.map((t) => t.name)
        ).toEqual(['ValidType']);
    });
});

