import { describe, it, expect } from 'vitest';
import {
    calculateMaxHp,
    calculateMaxWill,
    getPainPenalty,
    getStatusPenalties,
    calculateCriticalRequirement,
    calculateBaseDamage
} from '@/utils/combat/combatMath';
import { createTestCharacterState } from '@/test/testStateHelpers';
import { createEmptyBonuses } from '@/utils/tagParser/parseCombatTags';
import type { MoveData, Rank } from '@/store/storeTypes';

describe('combatMath', () => {
    describe('calculateMaxHp and calculateMaxWill', () => {
        it('calculates Max HP: Base + VIT + Rank Bonus + Item buffs', () => {
            const baseState = createTestCharacterState({
                health: { hpBase: 4 },
                stats: { vit: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                identity: { rank: 'Starter' }
            });
            const emptyBuffs = createEmptyBonuses();

            // Starter rank: 4 base + 2 VIT + 0 rankBonus + 0 item = 6
            expect(calculateMaxHp(baseState, emptyBuffs)).toBe(6);

            // Item buff (+3 HP): 4 + 2 + 0 + 3 = 9
            expect(calculateMaxHp(baseState, { ...emptyBuffs, hp: 3 })).toBe(9);

            // Master rank (+3 HP): 4 + 2 + 3 + 0 = 9
            const masterState = createTestCharacterState({
                health: { hpBase: 4 },
                stats: { vit: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                identity: { rank: 'Master' }
            });
            expect(calculateMaxHp(masterState, emptyBuffs)).toBe(9);

            // Champion rank with items: 4 + 2 + 3 + 5 = 14
            const champState = createTestCharacterState({
                health: { hpBase: 4 },
                stats: { vit: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                identity: { rank: 'Champion' }
            });
            expect(calculateMaxHp(champState, { ...emptyBuffs, hp: 5 })).toBe(14);
        });

        it('calculates Max HP with vg-high-hp ruleset using max(VIT, INS)', () => {
            const vgState = createTestCharacterState({
                health: { hpBase: 4 },
                stats: {
                    vit: { base: 2, rank: 0, buff: 0, debuff: 0 },
                    ins: { base: 5, rank: 0, buff: 0, debuff: 0 }
                },
                identity: { rank: 'Starter', ruleset: 'vg-high-hp' }
            });
            // INS (5) > VIT (2) -> 4 base + 5 INS + 0 rank = 9
            expect(calculateMaxHp(vgState, createEmptyBonuses())).toBe(9);
        });

        it('calculates Max Will: Base + INS + Rank Bonus + Item buffs', () => {
            const baseState = createTestCharacterState({
                will: { willBase: 3 },
                stats: { ins: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                identity: { rank: 'Starter' }
            });
            const emptyBuffs = createEmptyBonuses();

            // Starter rank: 3 base + 2 INS + 0 rankBonus + 0 item = 5
            expect(calculateMaxWill(baseState, emptyBuffs)).toBe(5);

            // Item buff (+2 Will): 3 + 2 + 0 + 2 = 7
            expect(calculateMaxWill(baseState, { ...emptyBuffs, will: 2 })).toBe(7);

            // Master rank (+3 Will): 3 + 2 + 3 + 0 = 8
            const masterState = createTestCharacterState({
                will: { willBase: 3 },
                stats: { ins: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                identity: { rank: 'Master' }
            });
            expect(calculateMaxWill(masterState, emptyBuffs)).toBe(8);

            // Champion rank with items: 3 + 2 + 3 + 4 = 12
            const champState = createTestCharacterState({
                will: { willBase: 3 },
                stats: { ins: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                identity: { rank: 'Champion' }
            });
            expect(calculateMaxWill(champState, { ...emptyBuffs, will: 4 })).toBe(12);
        });
    });

    describe('getPainPenalty', () => {
        it('returns 0 for Vit and Will (pain does not apply to defenses/pools)', () => {
            const lowHpState = createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 } });
            ['vit', 'vitality', 'Vitality', 'will', 'Will', 'none'].forEach((attr) => {
                expect(getPainPenalty(attr, lowHpState)).toBe(0);
            });
        });

        it('returns -3 dice when HP <= 1', () => {
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 } }))).toBe(-3);
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 0 } }))).toBe(-3);
        });

        it('returns -1 die when HP <= floor(maxHp / 2)', () => {
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 5 } }))).toBe(-1);
            expect(getPainPenalty('dex', createTestCharacterState({ health: { hpMax: 10, hpCurr: 2 } }))).toBe(-1);
        });

        it('returns 0 when HP > floor(maxHp / 2)', () => {
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 6 } }))).toBe(0);
            expect(getPainPenalty('spe', createTestCharacterState({ health: { hpMax: 10, hpCurr: 10 } }))).toBe(0);
        });

        it('subtracts ignoredPain correctly', () => {
            // HP <= 1 (raw penalty 3)
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 }, trackers: { ignoredPain: 1 } }))).toBe(-2);
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 }, trackers: { ignoredPain: 2 } }))).toBe(-1);
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 }, trackers: { ignoredPain: 3 } }))).toBe(0);

            // HP <= floor(maxHp / 2) (raw penalty 1)
            expect(getPainPenalty('str', createTestCharacterState({ health: { hpMax: 10, hpCurr: 4 }, trackers: { ignoredPain: 1 } }))).toBe(0);
        });

        it('returns 0 when pain is disabled or itemBuffs has ignorePain', () => {
            const disabledState = createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 }, identity: { pain: 'Disabled' } });
            expect(getPainPenalty('str', disabledState)).toBe(0);

            const lowHpState = createTestCharacterState({ health: { hpMax: 10, hpCurr: 1 } });
            expect(getPainPenalty('str', lowHpState, { ...createEmptyBonuses(), ignorePain: true })).toBe(0);
        });
    });

    describe('getStatusPenalties', () => {
        it('calculates Confusion penalty by rank tiers: -1 (Standard), -2 (Advanced/Expert), -3 (Master)', () => {
            const ranksAndPenalties: [Rank, number][] = [
                ['Starter', -1], ['Rookie', -1], ['Standard', -1],
                ['Advanced', -2], ['Expert', -2], ['Ace', -2],
                ['Master', -3], ['Champion', -3]
            ];
            for (const [rank, expectedPenalty] of ranksAndPenalties) {
                const state = createTestCharacterState({
                    identity: { rank },
                    statuses: [{ id: 's1', name: 'Confusion', customName: '', rounds: 3 }]
                });
                expect(getStatusPenalties(state).confusionPenalty).toBe(expectedPenalty);
            }
        });

        it('calculates Paralysis penalty (-2 Dexterity) and respects Limber negation', () => {
            const paralyzedState = createTestCharacterState({
                identity: { ability: 'Static' },
                statuses: [{ id: 's1', name: 'Paralysis', customName: '', rounds: 3 }]
            });
            expect(getStatusPenalties(paralyzedState).paralysisDexterityPenalty).toBe(-2);

            const limberState = createTestCharacterState({
                identity: { ability: 'Limber' },
                statuses: [{ id: 's1', name: 'Paralysis', customName: '', rounds: 3 }]
            });
            expect(getStatusPenalties(limberState).paralysisDexterityPenalty).toBe(0);
        });

        it('calculates Sleep penalty (isAsleep = true) and respects immunity abilities', () => {
            const asleepState = createTestCharacterState({
                identity: { ability: 'Static' },
                statuses: [{ id: 's1', name: 'Sleep', customName: '', rounds: 3 }]
            });
            expect(getStatusPenalties(asleepState).isAsleep).toBe(true);

            // Insomnia, Sweet Veil, Vital Spirit negate Sleep
            for (const ability of ['Insomnia', 'Sweet Veil', 'Vital Spirit']) {
                const immuneState = createTestCharacterState({
                    identity: { ability },
                    statuses: [{ id: 's1', name: 'Sleep', customName: '', rounds: 3 }]
                });
                expect(getStatusPenalties(immuneState).isAsleep).toBe(false);
            }
        });

        it('returns zero penalties for healthy character', () => {
            const healthyState = createTestCharacterState({ statuses: [] });
            const penalties = getStatusPenalties(healthyState);
            expect(penalties.confusionPenalty).toBe(0);
            expect(penalties.paralysisDexterityPenalty).toBe(0);
            expect(penalties.isAsleep).toBe(false);
            expect(penalties.isFrozen).toBe(false);
        });
    });

    describe('calculateCriticalRequirement', () => {
        const standardMove: MoveData = {
            id: 'm1',
            active: true,
            name: 'Tackle',
            type: 'Normal',
            category: 'Physical',
            power: 2,
            acc1: 'str',
            acc2: 'brawl',
            dmg1: 'str',
            desc: ''
        };

        const highCritMove: MoveData = {
            id: 'm2',
            active: true,
            name: 'Slash',
            type: 'Normal',
            category: 'Physical',
            power: 2,
            acc1: 'str',
            acc2: 'brawl',
            dmg1: 'str',
            desc: '[High Critical]'
        };

        it('base requirement is requiredSuccesses + 3', () => {
            const state = createTestCharacterState();
            const emptyBuffs = createEmptyBonuses();
            expect(calculateCriticalRequirement(standardMove, 1, state, emptyBuffs).criticalRequirement).toBe(4);
            expect(calculateCriticalRequirement(standardMove, 2, state, emptyBuffs).criticalRequirement).toBe(5);
        });

        it('reduces requirement by 1 for High Critical move or item', () => {
            const state = createTestCharacterState();
            const emptyBuffs = createEmptyBonuses();

            // High Crit move: 4 - 1 = 3
            const moveCritRes = calculateCriticalRequirement(highCritMove, 1, state, emptyBuffs);
            expect(moveCritRes.criticalRequirement).toBe(3);
            expect(moveCritRes.hasMoveHighCrit).toBe(true);

            // Item with highCritStacks: 4 - 1 = 3
            const itemCritBuffs = { ...emptyBuffs, highCritStacks: 1 };
            const itemCritRes = calculateCriticalRequirement(standardMove, 1, state, itemCritBuffs);
            expect(itemCritRes.criticalRequirement).toBe(3);
            expect(itemCritRes.hasItemHighCrit).toBe(true);

            // Both High Crit move and item do not duplicate base reduction: still 4 - 1 = 3
            expect(calculateCriticalRequirement(highCritMove, 1, state, itemCritBuffs).criticalRequirement).toBe(3);
        });

        it('stacks additional reduction with Super Luck and clamps at minimum 1', () => {
            const superLuckState = createTestCharacterState({
                identity: { ability: 'Super Luck', abilityActive: true }
            });
            const emptyBuffs = createEmptyBonuses();

            // Standard move + Super Luck: 4 - 1 = 3
            const superLuckOnlyRes = calculateCriticalRequirement(standardMove, 1, superLuckState, emptyBuffs);
            expect(superLuckOnlyRes.criticalRequirement).toBe(3);
            expect(superLuckOnlyRes.hasSuperLuck).toBe(true);

            // High Crit move + Super Luck: 4 - (1 base + 1 Super Luck) = 2
            const stackedRes = calculateCriticalRequirement(highCritMove, 1, superLuckState, emptyBuffs);
            expect(stackedRes.criticalRequirement).toBe(2);

            // Additional stacking items: 4 - (1 base + 1 Super Luck + 2 stacking) = 1 (clamped at minimum 1)
            const heavyStackBuffs = { ...emptyBuffs, stackingHighCritStacks: 2 };
            const clampedRes = calculateCriticalRequirement(highCritMove, 0, superLuckState, heavyStackBuffs);
            expect(clampedRes.criticalRequirement).toBe(1);
        });
    });

    describe('calculateBaseDamage STAB and Protean/Libero checks (B-13)', () => {
        const makeMove = (type: string, category: 'Physical' | 'Special' = 'Physical'): MoveData => ({
            id: 'm-stab',
            active: true,
            name: 'Test Move',
            type,
            category,
            power: 2,
            acc1: 'str',
            acc2: 'brawl',
            dmg1: 'str',
            desc: ''
        });

        it('uses exact normalized type comparison and ignores None/Typeless/substrings', () => {
            const state = createTestCharacterState({
                identity: { type1: 'Spice', type2: 'None', ability: '' },
                stats: { str: { base: 2, rank: 0, buff: 0, debuff: 0 } }
            });
            const buffs = createEmptyBonuses();

            // Base: power (2) + str (2) = 4 (no STAB)
            expect(calculateBaseDamage(makeMove('Ice'), state, buffs)).toBe(4);
            expect(calculateBaseDamage(makeMove('None'), state, buffs)).toBe(4);
            expect(calculateBaseDamage(makeMove('Typeless'), state, buffs)).toBe(4);
            expect(calculateBaseDamage(makeMove(''), state, buffs)).toBe(4);

            // Exact case-insensitive match grants +1 STAB -> 5
            expect(calculateBaseDamage(makeMove('spice'), state, buffs)).toBe(5);
        });

        it('respects abilityActive and Neutralizing Gas suppression for Protean/Libero STAB', () => {
            const proteanActive = createTestCharacterState({
                identity: { type1: 'Water', type2: '', ability: 'Protean', abilityActive: true },
                stats: { str: { base: 2, rank: 0, buff: 0, debuff: 0 } }
            });
            const buffs = createEmptyBonuses();

            // Active Protean grants +1 STAB on non-STAB Fire move: 2 + 2 + 1 = 5
            expect(calculateBaseDamage(makeMove('Fire'), proteanActive, buffs)).toBe(5);
            // Typeless still does not get STAB
            expect(calculateBaseDamage(makeMove('Typeless'), proteanActive, buffs)).toBe(4);

            // Disabled abilityActive removes Protean STAB
            const proteanDisabled = createTestCharacterState({
                identity: { type1: 'Water', type2: '', ability: 'Protean', abilityActive: false },
                stats: { str: { base: 2, rank: 0, buff: 0, debuff: 0 } }
            });
            expect(calculateBaseDamage(makeMove('Fire'), proteanDisabled, buffs)).toBe(4);

            // Neutralizing Gas active on battlefield suppresses Protean/Libero STAB
            const emptySide = {
                forceFields: [
                    { name: '', remainingRounds: 0 },
                    { name: '', remainingRounds: 0 }
                ] as [{ name: string; remainingRounds: number }, { name: string; remainingRounds: number }],
                entryHazard: '',
                cover: '',
                other: ''
            };
            const proteanSuppressed = createTestCharacterState({
                identity: { type1: 'Water', type2: '', ability: 'Libero', abilityActive: true, isNPC: false },
                stats: { str: { base: 2, rank: 0, buff: 0, debuff: 0 } },
                activeBattlefield: {
                    location: '',
                    weather: { name: 'None', remainingRounds: 0 },
                    terrain: { name: 'None', remainingRounds: 0 },
                    other: { name: 'Neutralizing Gas', remainingRounds: -1 },
                    playerSide: emptySide,
                    foeSide: emptySide,
                    playerTargets: 0,
                    foeTargets: 0,
                    highlightedSide: 'all'
                }
            });
            expect(calculateBaseDamage(makeMove('Fire'), proteanSuppressed, buffs)).toBe(4);
        });
    });
});
