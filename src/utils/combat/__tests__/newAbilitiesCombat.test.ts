import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '@/store/useCharacterStore';
import { checkCondition } from '@/utils/tagParser/conditionChecker';
import { getWeatherDamageBonus } from '@/utils/combat/math/combatWeatherMath';
import {
    calculateTargetDefAndFactors,
    isNonRangedPhysicalMove,
    type TargetOption
} from '@/components/modals/combat/targetingModalUtils';
import { getKnownAbility, KNOWN_ABILITIES } from '@/data/abilities/knownAbilities';
import { createDefaultBattlefield } from '@/components/modals/battleOrganizer/battleOrganizerUtils';
import type { MoveData } from '@/store/storeTypes';
import type { BattlefieldData } from '@/types/battleOrganizerTypes';

describe('New Abilities Errata & Integrations', () => {
    beforeEach(() => {
        useCharacterStore.setState({
            identity: {
                ...useCharacterStore.getState().identity,
                ability: '',
                abilityTags: '',
                abilityActive: true
            },
            statuses: [{ id: 'healthy', name: 'Healthy', customName: '', rounds: 0 }],
            passives: [],
            inventory: [],
            activeBattlefield: undefined
        });
    });

    describe('Known Abilities Registry', () => {
        it('registers all 7 abilities with correct tags and benefit displays', () => {
            const expectedAbilities = [
                'Aura Guard',
                'Dragonize',
                'Eelevate',
                'Fire Mane',
                'Mega Sol',
                'Piercing Drill',
                'Spicy Spray'
            ];

            for (const name of expectedAbilities) {
                const ability = getKnownAbility(name);
                expect(ability).toBeDefined();
                expect(ability?.autoActive).toBe(true);
            }

            expect(KNOWN_ABILITIES['Eelevate'].maxBoost).toBe(3);
            expect(KNOWN_ABILITIES['Aura Guard'].tags).toContain('[Def Dmg -2: Non-Ranged Physical]');
            expect(KNOWN_ABILITIES['Mega Sol'].tags).toBe('[Self Weather: Sun]');
            expect(KNOWN_ABILITIES['Piercing Drill'].tags).toContain('[Bypass: Screens: Non-Ranged Physical]');
            expect(KNOWN_ABILITIES['Fire Mane'].tags).toContain('[Dmg +2: Fire]');
            expect(KNOWN_ABILITIES['Fire Mane'].tags).toContain('[Ignore Pain: Fire]');
        });
    });

    describe('Self-Weather Tag Support (Mega Sol)', () => {
        it('allows @ Sun, @ Sunny, and @ Harsh Sun to return true with [Self Weather: Sun]', () => {
            useCharacterStore.setState({
                identity: {
                    ...useCharacterStore.getState().identity,
                    ability: 'Mega Sol',
                    abilityTags: '[Self Weather: Sun]',
                    abilityActive: true
                },
                activeBattlefield: undefined
            });

            expect(checkCondition('sun', false)).toBe(true);
            expect(checkCondition('sunny', false)).toBe(true);
            expect(checkCondition('harsh sun', false)).toBe(true);
            expect(checkCondition('rain', false)).toBe(false);
        });

        it('grants +1 Fire damage pool die and -1 Water damage penalty with Mega Sol', () => {
            useCharacterStore.setState({
                identity: {
                    ...useCharacterStore.getState().identity,
                    ability: 'Mega Sol',
                    abilityTags: '[Self Weather: Sun]',
                    abilityActive: true
                },
                activeBattlefield: undefined
            });

            const fireBonus = getWeatherDamageBonus('Fire', null);
            expect(fireBonus.diceBonus).toBe(1);
            expect(fireBonus.flatPenalty).toBe(0);
            expect(fireBonus.tag).toContain('Mega Sol (+1 Dice to Fire Damage Pool)');

            const waterBonus = getWeatherDamageBonus('Water', null);
            expect(waterBonus.diceBonus).toBe(0);
            expect(waterBonus.flatPenalty).toBe(1);
            expect(waterBonus.tag).toContain('Mega Sol (-1 Flat Damage from Water Moves)');
        });

        it('does not duplicate sunny bonus if battlefield already has Sun active', () => {
            const sunBattlefield: BattlefieldData = {
                ...createDefaultBattlefield(),
                weather: { name: 'Sun', remainingRounds: 3 }
            };

            useCharacterStore.setState({
                identity: {
                    ...useCharacterStore.getState().identity,
                    ability: 'Mega Sol',
                    abilityTags: '[Self Weather: Sun]',
                    abilityActive: true
                },
                activeBattlefield: sunBattlefield
            });

            const fireBonus = getWeatherDamageBonus('Fire', sunBattlefield);
            expect(fireBonus.diceBonus).toBe(1);
            expect(fireBonus.tag).toContain('Sunny (+1 Dice to Fire Damage Pool)');
        });
    });

    describe('Screen Bypass & Damage Reduction (Aura Guard & Piercing Drill)', () => {
        const dummyDefender: TargetOption = {
            id: 'target-1',
            name: 'Aura Def',
            def: 3,
            isTera: false,
            isPlayerSide: false,
            types: ['psychic'],
            ability: 'Aura Guard',
            abilityActive: true
        };

        const meleePhysicalMove: MoveData = {
            id: 'tackle',
            name: 'Tackle',
            active: true,
            type: 'Normal',
            category: 'Physical',
            acc1: 'Dexterity',
            acc2: 'Brawl',
            dmg1: 'Strength',
            power: 2,
            desc: 'A full-body charge.'
        };

        const rangedPhysicalMove: MoveData = {
            id: 'rock-slide',
            name: 'Rock Slide',
            active: true,
            type: 'Rock',
            category: 'Physical',
            acc1: 'Dexterity',
            acc2: 'Channel',
            dmg1: 'Strength',
            power: 3,
            desc: 'Large boulders are hurled. Ranged Move.'
        };

        const specialMove: MoveData = {
            id: 'flamethrower',
            name: 'Flamethrower',
            active: true,
            type: 'Fire',
            category: 'Special',
            acc1: 'Special',
            acc2: 'Channel',
            dmg1: 'Special',
            power: 3,
            desc: 'A scorching blast of fire.'
        };

        it('isNonRangedPhysicalMove correctly detects melee physical vs ranged physical vs special', () => {
            expect(isNonRangedPhysicalMove(true, meleePhysicalMove)).toBe(true);
            expect(isNonRangedPhysicalMove(true, rangedPhysicalMove)).toBe(false);
            expect(isNonRangedPhysicalMove(false, specialMove)).toBe(false);
        });

        it('Aura Guard reduces Non-Ranged Physical move damage by 2', () => {
            const res = calculateTargetDefAndFactors(dummyDefender, true, null, meleePhysicalMove);
            expect(res.flatReduction).toBe(2);
            expect(res.factors).toContain('Aura Guard (-2 Damage)');
        });

        it('Aura Guard does not reduce damage from Ranged Physical or Special moves', () => {
            const rangedRes = calculateTargetDefAndFactors(dummyDefender, true, null, rangedPhysicalMove);
            expect(rangedRes.flatReduction).toBe(0);
            expect(rangedRes.factors).not.toContain('Aura Guard (-2 Damage)');

            const specialRes = calculateTargetDefAndFactors(dummyDefender, false, null, specialMove);
            expect(specialRes.flatReduction).toBe(0);
            expect(specialRes.factors).not.toContain('Aura Guard (-2 Damage)');
        });

        it('Piercing Drill bypasses Reflect, Light Screen, and Aurora Veil on Non-Ranged Physical moves', () => {
            const screenedBattlefield: BattlefieldData = {
                ...createDefaultBattlefield(),
                foeSide: {
                    ...createDefaultBattlefield().foeSide,
                    forceFields: [
                        { name: 'Reflect', remainingRounds: 4 },
                        { name: 'Aurora Veil', remainingRounds: 4 }
                    ]
                }
            };

            const normalFoe: TargetOption = {
                id: 'foe-1',
                name: 'Foe',
                def: 2,
                isTera: false,
                isPlayerSide: false,
                types: ['normal']
            };

            // Standard attacker without Piercing Drill gets reduced
            const normalAtkRes = calculateTargetDefAndFactors(
                normalFoe,
                true,
                screenedBattlefield,
                meleePhysicalMove,
                'Blaze'
            );
            expect(normalAtkRes.flatReduction).toBe(2); // Reflect (-1) + Aurora Veil (-1)

            // Attacker with Piercing Drill bypasses the screens
            const piercingAtkRes = calculateTargetDefAndFactors(
                normalFoe,
                true,
                screenedBattlefield,
                meleePhysicalMove,
                'Piercing Drill'
            );
            expect(piercingAtkRes.flatReduction).toBe(0);
            expect(piercingAtkRes.factors).toContain('Piercing Drill (Ignored Screens)');
        });
    });
});
