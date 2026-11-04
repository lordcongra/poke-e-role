import { describe, it, expect } from 'vitest';
import {
    calculateEncodedInitiative,
    formatInitiativeDisplay,
    sortCombatants,
    extractIsNpc,
    extractCharacterName,
    type Combatant
} from '@/utils/combat/initiativeHelpers';

describe('initiativeHelpers', () => {
    describe('calculateEncodedInitiative', () => {
        it('returns 0 when total initiative is 0', () => {
            expect(calculateEncodedInitiative(0, 5, 2)).toBe(0);
            expect(calculateEncodedInitiative(0, 0, 0)).toBe(0);
            expect(calculateEncodedInitiative(0, 10, 50)).toBe(0);
        });

        it('calculates encoded initiative: total + baseInit / 100 + tiebreaker / 10000 parsed to 4 decimals', () => {
            // 12 + 5/100 + 3/10000 = 12 + 0.05 + 0.0003 = 12.0503
            expect(calculateEncodedInitiative(12, 5, 3)).toBe(12.0503);

            // 8 + 2/100 + 0 = 8.02
            expect(calculateEncodedInitiative(8, 2, 0)).toBe(8.02);

            // Default tiebreaker is 0
            expect(calculateEncodedInitiative(8, 2)).toBe(8.02);

            // 15 + 12/100 + 45/10000 = 15.1245
            expect(calculateEncodedInitiative(15, 12, 45)).toBe(15.1245);

            // 6 + 10/100 + 99/10000 = 6 + 0.10 + 0.0099 = 6.1099
            expect(calculateEncodedInitiative(6, 10, 99)).toBe(6.1099);
        });
    });

    describe('formatInitiativeDisplay', () => {
        it("returns '0' when total is 0", () => {
            expect(formatInitiativeDisplay(0, 5, 3)).toBe('0');
            expect(formatInitiativeDisplay(0, 0, 0)).toBe('0');
            expect(formatInitiativeDisplay(0, 2)).toBe('0');
        });

        it('formats with tiebreaker when tiebreaker > 0', () => {
            // ${total}.${baseInit}${tiebreaker}
            expect(formatInitiativeDisplay(12, 5, 3)).toBe('12.53');
            expect(formatInitiativeDisplay(7, 2, 1)).toBe('7.21');
        });

        it('formats without tiebreaker when tiebreaker is 0 or omitted', () => {
            // ${total}.${baseInit}
            expect(formatInitiativeDisplay(12, 5)).toBe('12.5');
            expect(formatInitiativeDisplay(12, 5, 0)).toBe('12.5');
            expect(formatInitiativeDisplay(7, 2)).toBe('7.2');
        });

        it('formats as plain total when both baseInit and tiebreaker are 0', () => {
            expect(formatInitiativeDisplay(12, 0, 0)).toBe('12');
            expect(formatInitiativeDisplay(12, 0)).toBe('12');
        });
    });

    describe('sortCombatants', () => {
        it('sorts combatants descending by total, then baseInit, then tiebreaker', () => {
            const combatants: Combatant[] = [
                { id: '1', name: 'Alpha', image: '', d6: 2, total: 8, baseInit: 4, tiebreaker: 1 },
                { id: '2', name: 'Beta', image: '', d6: 4, total: 10, baseInit: 2, tiebreaker: 0 },
                { id: '3', name: 'Gamma', image: '', d6: 3, total: 8, baseInit: 5, tiebreaker: 0 },
                { id: '4', name: 'Delta', image: '', d6: 2, total: 8, baseInit: 4, tiebreaker: 3 }
            ];

            const sorted = sortCombatants(combatants);
            // Beta has total 10 -> 1st
            expect(sorted[0].id).toBe('2');
            // Gamma has total 8, baseInit 5 -> 2nd
            expect(sorted[1].id).toBe('3');
            // Delta has total 8, baseInit 4, tiebreaker 3 -> 3rd
            expect(sorted[2].id).toBe('4');
            // Alpha has total 8, baseInit 4, tiebreaker 1 -> 4th
            expect(sorted[3].id).toBe('1');
        });
    });

    describe('extractIsNpc and extractCharacterName', () => {
        it('extracts NPC status accurately across flat and nested metadata', () => {
            expect(extractIsNpc({ 'is-npc': true })).toBe(true);
            expect(extractIsNpc({ 'isNPC': 'true' })).toBe(true);
            expect(extractIsNpc({ state: { identity: { isNPC: true } } })).toBe(true);
            expect(extractIsNpc({}, true)).toBe(true);
            expect(extractIsNpc({ 'is-npc': false })).toBe(false);
            expect(extractIsNpc(null)).toBe(false);
        });

        it('extracts character name with nickname taking precedence over species and name', () => {
            expect(extractCharacterName({ nickname: 'Sparky', species: 'Pikachu' })).toBe('Sparky');
            expect(extractCharacterName({ species: 'Pikachu' })).toBe('Pikachu');
            expect(extractCharacterName({ name: 'Trainer Red' })).toBe('Trainer Red');
            expect(extractCharacterName(null, 'DefaultFallback')).toBe('DefaultFallback');
        });
    });
});

