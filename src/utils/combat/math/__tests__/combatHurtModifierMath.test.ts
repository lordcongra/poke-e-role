import { describe, it, expect } from 'vitest';
import { parseMissingHpHurtModifier } from '../combatHurtModifierMath';
import { calculateBaseDamage } from '@/utils/combat/combatMath';
import { createTestCharacterState } from '@/test/testStateHelpers';
import type { MoveData } from '@/store/storeTypes';

describe('combatHurtModifierMath', () => {
    const makeMove = (partial: Partial<MoveData>): MoveData => ({
        id: 'test-move',
        active: true,
        name: 'Test Move',
        type: 'Fire',
        category: 'Special',
        acc1: 'Special',
        acc2: 'Channel',
        dmg1: 'Special',
        power: 4,
        ...partial
    });

    describe('Natural language parsing', () => {
        it('parses Eruption natural language correctly for partial and cap missing HP', () => {
            const eruption = makeMove({
                name: 'Eruption',
                desc: 'Target All Foes in Range. Lethal. *Reduce 1 Dice from the Damage Pool for every missing HP the User has. Up to 5 dice may be removed this way.'
            });

            // Full HP
            const fullHpState = createTestCharacterState({
                health: { hpCurr: 10, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(eruption, fullHpState)).toEqual({
                diceModifier: 0,
                tag: ''
            });

            // 3 Missing HP (-3 Dice)
            const partialHpState = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(eruption, partialHpState)).toEqual({
                diceModifier: -3,
                tag: 'Eruption (-3 Dice: 3 Missing HP)'
            });

            // 7 Missing HP (Exceeds cap 5 -> -5 Dice)
            const lowHpState = createTestCharacterState({
                health: { hpCurr: 3, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(eruption, lowHpState)).toEqual({
                diceModifier: -5,
                tag: 'Eruption (-5 Dice: 7 Missing HP)'
            });
        });

        it('parses Water Spout natural language correctly', () => {
            const waterSpout = makeMove({
                name: 'Water Spout',
                desc: 'Target All Foes in Range. Lethal. *Reduce 1 Die from the Damage Pool for every missing HP the User has. Up to 5 Dice may be removed this way.'
            });
            const state = createTestCharacterState({
                health: { hpCurr: 8, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(waterSpout, state)).toEqual({
                diceModifier: -2,
                tag: 'Water Spout (-2 Dice: 2 Missing HP)'
            });
        });

        it('parses Dragon Energy natural language correctly', () => {
            const dragonEnergy = makeMove({
                name: 'Dragon Energy',
                desc: 'Target All foes in Range. Lethal. *Reduce 1 Dice from the Damage Pool for every missing HP the User has. Up to 5 dice may be removed this way.'
            });
            const state = createTestCharacterState({
                health: { hpCurr: 6, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(dragonEnergy, state)).toEqual({
                diceModifier: -4,
                tag: 'Dragon Energy (-4 Dice: 4 Missing HP)'
            });
        });

        it('parses Hard Press natural language correctly', () => {
            const hardPress = makeMove({
                name: 'Hard Press',
                desc: 'Single Target. *Reduce 1 Die from the Damage Pool for every missing Hp the User has. Up to 5 Dice may be removed this way.'
            });
            const state = createTestCharacterState({
                health: { hpCurr: 9, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(hardPress, state)).toEqual({
                diceModifier: -1,
                tag: 'Hard Press (-1 Dice: 1 Missing HP)'
            });
        });

        it('parses Flail natural language correctly', () => {
            const flail = makeMove({
                name: 'Flail',
                category: 'Physical',
                dmg1: 'Strength',
                desc: 'Single Target. *Add 1 Extra Die to the Damage Pool of this Move for every missing Point of HP the user has. Up to 5 Dice may be added this way.'
            });

            // Full HP
            const fullHpState = createTestCharacterState({
                health: { hpCurr: 10, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(flail, fullHpState)).toEqual({
                diceModifier: 0,
                tag: ''
            });

            // 3 Missing HP (+3 Dice)
            const partialHpState = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(flail, partialHpState)).toEqual({
                diceModifier: 3,
                tag: 'Flail (+3 Dice: 3 Missing HP)'
            });

            // 8 Missing HP (Exceeds cap 5 -> +5 Dice)
            const lowHpState = createTestCharacterState({
                health: { hpCurr: 2, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(flail, lowHpState)).toEqual({
                diceModifier: 5,
                tag: 'Flail (+5 Dice: 8 Missing HP)'
            });
        });

        it('parses Reversal natural language correctly', () => {
            const reversal = makeMove({
                name: 'Reversal',
                category: 'Physical',
                dmg1: 'Strength',
                desc: 'Single Target. *Add 1 Extra Die to the Damage Pool for every missing HP the User has. Up to 5 Dice may be added this way.'
            });
            const state = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(reversal, state)).toEqual({
                diceModifier: 3,
                tag: 'Reversal (+3 Dice: 3 Missing HP)'
            });
        });
    });

    describe('Bracket tag parsing', () => {
        it('parses [Hurt Penalty] default values (1 per HP, max 5)', () => {
            const move = makeMove({
                name: 'Custom Penalty Move',
                desc: 'Deals damage [Hurt Penalty]'
            });
            const state = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, state)).toEqual({
                diceModifier: -3,
                tag: 'Custom Penalty Move (-3 Dice: 3 Missing HP)'
            });
        });

        it('parses [Hurt Bonus] default values (1 per HP, max 5)', () => {
            const move = makeMove({
                name: 'Custom Bonus Move',
                desc: 'Deals damage [Hurt Bonus]'
            });
            const state = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, state)).toEqual({
                diceModifier: 3,
                tag: 'Custom Bonus Move (+3 Dice: 3 Missing HP)'
            });
        });

        it('parses parameterized bracket tags [Hurt Penalty: X per HP (max Y)]', () => {
            const move = makeMove({
                name: 'Heavy Recoil Move',
                desc: 'A move with custom scaling [Hurt Penalty: 2 per HP (max 6)]'
            });

            // 2 missing HP * 2 = -4 Dice
            const state = createTestCharacterState({
                health: { hpCurr: 8, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, state)).toEqual({
                diceModifier: -4,
                tag: 'Heavy Recoil Move (-4 Dice: 2 Missing HP)'
            });

            // 4 missing HP * 2 = 8, capped at 6 -> -6 Dice
            const stateLow = createTestCharacterState({
                health: { hpCurr: 6, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, stateLow)).toEqual({
                diceModifier: -6,
                tag: 'Heavy Recoil Move (-6 Dice: 4 Missing HP)'
            });
        });

        it('parses parameterized bracket tags [Hurt Bonus: X per HP (max Y)]', () => {
            const move = makeMove({
                name: 'Desperation Strike',
                desc: 'Hits harder when injured [Hurt Bonus: 2 per HP (max 4)]'
            });

            const state = createTestCharacterState({
                health: { hpCurr: 9, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, state)).toEqual({
                diceModifier: 2,
                tag: 'Desperation Strike (+2 Dice: 1 Missing HP)'
            });

            // Exceeds max 4
            const stateLow = createTestCharacterState({
                health: { hpCurr: 5, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, stateLow)).toEqual({
                diceModifier: 4,
                tag: 'Desperation Strike (+4 Dice: 5 Missing HP)'
            });
        });
    });

    describe('Attributes fallback (Tier 3)', () => {
        it('uses move.attributes?.HurtPenalty when no description tag exists', () => {
            const move = makeMove({
                name: 'Attribute Move',
                desc: 'No special text',
                attributes: { HurtPenalty: true }
            });
            const state = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, state)).toEqual({
                diceModifier: -3,
                tag: 'Attribute Move (-3 Dice: 3 Missing HP)'
            });
        });

        it('uses move.attributes?.HurtBonus when no description tag exists', () => {
            const move = makeMove({
                name: 'Attribute Bonus Move',
                desc: 'No special text',
                attributes: { HurtBonus: true }
            });
            const state = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 }
            });
            expect(parseMissingHpHurtModifier(move, state)).toEqual({
                diceModifier: 3,
                tag: 'Attribute Bonus Move (+3 Dice: 3 Missing HP)'
            });
        });
    });

    describe('Integration with calculateBaseDamage', () => {
        it('reduces base damage dice pool for missing HP and floors at 1', () => {
            const eruption = makeMove({
                name: 'Eruption',
                power: 2,
                dmg1: 'Special',
                desc: 'Target All Foes in Range. Lethal. *Reduce 1 Dice from the Damage Pool for every missing HP the User has. Up to 5 dice may be removed this way.'
            });

            // Base SPE = 1. Power = 2. Total nominal damage = 3.
            // Full HP -> 3 dice
            const fullState = createTestCharacterState({
                health: { hpCurr: 10, hpMax: 10 },
                stats: { spe: { base: 1, rank: 0, buff: 0, debuff: 0 } }
            });
            expect(calculateBaseDamage(eruption, fullState)).toBe(3);

            // 1 missing HP -> 3 - 1 = 2 dice
            const partialState = createTestCharacterState({
                health: { hpCurr: 9, hpMax: 10 },
                stats: { spe: { base: 1, rank: 0, buff: 0, debuff: 0 } }
            });
            expect(calculateBaseDamage(eruption, partialState)).toBe(2);

            // 5 missing HP -> 3 - 5 = -2, floored at 1
            const lowState = createTestCharacterState({
                health: { hpCurr: 5, hpMax: 10 },
                stats: { spe: { base: 1, rank: 0, buff: 0, debuff: 0 } }
            });
            expect(calculateBaseDamage(eruption, lowState)).toBe(1);
        });

        it('increases base damage dice pool for Flail', () => {
            const flail = makeMove({
                name: 'Flail',
                power: 1,
                dmg1: 'Strength',
                desc: 'Single Target. *Add 1 Extra Die to the Damage Pool of this Move for every missing Point of HP the user has. Up to 5 Dice may be added this way.'
            });

            // Base STR = 2. Power = 1. Base = 3.
            // 3 missing HP -> 3 + 3 = 6 dice
            const state = createTestCharacterState({
                health: { hpCurr: 7, hpMax: 10 },
                stats: { str: { base: 2, rank: 0, buff: 0, debuff: 0 } }
            });
            expect(calculateBaseDamage(flail, state)).toBe(6);
        });
    });
});

