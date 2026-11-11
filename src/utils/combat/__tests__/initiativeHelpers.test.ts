import { describe, it, expect } from 'vitest';
import {
    calculateEncodedInitiative,
    formatInitiativeDisplay,
    sortCombatants,
    extractIsNpc,
    extractCharacterName,
    extractTokenImage,
    isDefaultPokeballImage,
    resolveActiveTokenImage,
    resolveActiveCombatantFields,
    areCombatantListsEqual,
    resolveStalemateTiebreakers,
    resolveInitiativeRolls,
    type Combatant
} from '@/utils/combat/initiativeHelpers';
import { createTestCharacterState } from '@/test/testStateHelpers';

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

    describe('resolveStalemateTiebreakers and resolveInitiativeRolls (B-18)', () => {
        it('keeps existing unique non-zero opponent tiebreakers stable and repairs duplicates/zeros', () => {
            const result = resolveStalemateTiebreakers('roller', [
                { id: 'opp-1', tiebreaker: 4 },
                { id: 'opp-2', tiebreaker: 4 }, // duplicate
                { id: 'opp-3', tiebreaker: 0 }  // zero
            ]);

            expect(result.opponentTiebreakers['opp-1']).toBe(4);
            const allTies = [
                result.assignedTiebreaker,
                result.opponentTiebreakers['opp-1'],
                result.opponentTiebreakers['opp-2'],
                result.opponentTiebreakers['opp-3']
            ];
            expect(new Set(allTies).size).toBe(4);
            allTies.forEach((t) => {
                expect(t).toBeGreaterThanOrEqual(1);
                expect(t).toBeLessThanOrEqual(6);
            });
        });

        it('handles >6 stalemate combatants in resolveStalemateTiebreakers without infinite loops', () => {
            const opponents = Array.from({ length: 7 }, (_, i) => ({
                id: `opp-${i + 1}`,
                tiebreaker: i < 6 ? i + 1 : 0
            }));
            const result = resolveStalemateTiebreakers('roller', opponents);
            const allTies = [result.assignedTiebreaker, ...Object.values(result.opponentTiebreakers)];
            expect(new Set(allTies).size).toBe(8);
            allTies.forEach((t) => expect(t).toBeGreaterThan(0));
        });

        it('resolves >6 participants in resolveInitiativeRolls without infinite loops', () => {
            const participants = Array.from({ length: 12 }, (_, i) => ({
                id: `p-${i + 1}`,
                name: `Mon ${i + 1}`,
                baseInit: 5
            }));
            const { rolledCombatants, logSummary } = resolveInitiativeRolls(participants);
            expect(rolledCombatants).toHaveLength(12);
            expect(logSummary).toContain('Mon 12');

            // Verify every stalemate group has unique tiebreakers
            const groups = new Map<string, number[]>();
            for (const c of rolledCombatants) {
                const key = `${c.total}_${c.baseInit}`;
                const list = groups.get(key) || [];
                list.push(c.tiebreaker);
                groups.set(key, list);
            }
            for (const ties of groups.values()) {
                if (ties.length > 1) {
                    expect(new Set(ties).size).toBe(ties.length);
                    ties.forEach((t) => expect(t).toBeGreaterThan(0));
                }
            }
        });
    });

    describe('extractTokenImage and resolveActiveTokenImage', () => {
        it('extracts images from flat, OBR image.url, nested stats, and state.identity', () => {
            expect(extractTokenImage({ 'token-image-url': 'https://a.png' })).toBe('https://a.png');
            expect(extractTokenImage({ tokenImageUrl: 'https://b.png' })).toBe('https://b.png');
            expect(extractTokenImage({ image: { url: 'https://c.png' } })).toBe('https://c.png');
            expect(extractTokenImage({ 'pokerole-pmd-extension/stats': { 'token-image-url': 'https://d.png' } })).toBe(
                'https://d.png'
            );
            expect(extractTokenImage({ state: { identity: { tokenImageUrl: 'https://e.png' } } })).toBe(
                'https://e.png'
            );
            expect(extractTokenImage({})).toBe('');
            expect(extractTokenImage(null)).toBe('');
        });

        it('identifies default pokeball fallback images', () => {
            expect(isDefaultPokeballImage('/poke-e-role/pokeball-token.svg')).toBe(true);
            expect(isDefaultPokeballImage('/pokeball.svg')).toBe(true);
            expect(isDefaultPokeballImage('https://example.com/custom.png')).toBe(false);
            expect(isDefaultPokeballImage('')).toBe(false);
        });

        it('resolves store image consistently with extractTokenImage fallback', () => {
            // Default pokeball placeholder in store must not override empty metadata image
            expect(resolveActiveTokenImage('/poke-e-role/pokeball-token.svg', '')).toBe('');
            // Default pokeball placeholder must not override OBR image.url extracted from metadata
            expect(resolveActiveTokenImage('/poke-e-role/pokeball-token.svg', 'https://obr.png')).toBe(
                'https://obr.png'
            );
            // Explicitly saved pokeball-token.svg in metadata stays intact
            expect(
                resolveActiveTokenImage('/poke-e-role/pokeball-token.svg', '/poke-e-role/pokeball-token.svg')
            ).toBe('/poke-e-role/pokeball-token.svg');
            // Custom image in store overrides empty/stale metadata image
            expect(resolveActiveTokenImage('local-img:123', 'https://old.png')).toBe('local-img:123');
            // Empty store image preserves metadata fallback unless explicitly cleared
            expect(resolveActiveTokenImage('', 'https://obr.png', false)).toBe('https://obr.png');
            expect(resolveActiveTokenImage('', 'https://obr.png', true)).toBe('');
        });

        it('resolves active combatant fields consistently and compares combatant lists', () => {
            const state = createTestCharacterState({
                identity: {
                    nickname: 'Sparky',
                    species: 'Pikachu',
                    tokenImageUrl: '/poke-e-role/pokeball-token.svg'
                },
                skills: {
                    alert: { base: 1, buff: 0, customName: '' }
                }
            });
            const fields = resolveActiveCombatantFields(state, { name: 'Old', image: '' }, false);
            expect(fields.name).toBe('Sparky');
            expect(fields.image).toBe('');
            expect(fields.baseInit).toBe(3);

            const listA: Combatant[] = [
                { id: '1', name: 'Sparky', image: '', d6: 3, baseInit: 4, total: 7, tiebreaker: 0 }
            ];
            const listB: Combatant[] = [
                { id: '1', name: 'Sparky', image: '', d6: 3, baseInit: 4, total: 7, tiebreaker: 0 }
            ];
            const listC: Combatant[] = [
                { id: '1', name: 'Sparky', image: 'https://a.png', d6: 3, baseInit: 4, total: 7, tiebreaker: 0 }
            ];
            expect(areCombatantListsEqual(listA, listB)).toBe(true);
            expect(areCombatantListsEqual(listA, listC)).toBe(false);
        });
    });
});

