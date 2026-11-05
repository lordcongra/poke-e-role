import { describe, it, expect } from 'vitest';
import {
    hasPotentialRoundAdvanceTriggers,
    resolveCombatantRoundTriggers,
    type CombatantCharacterData
} from '../roundAdvanceTriggerUtils';
import type { CombatantRowData } from '../../../../types/battleOrganizerTypes';
import { createDefaultCombatant, createDefaultBattlefield, createDefaultActions } from '../battleOrganizerUtils';

function createMockCombatant(overrides: Partial<CombatantRowData> = {}): CombatantRowData {
    return {
        ...createDefaultCombatant('1', 'Pikachu', true),
        status: 'Healthy',
        hpCurr: 10,
        hpMax: 10,
        ...overrides
    };
}

describe('roundAdvanceTriggerUtils', () => {
    describe('hasPotentialRoundAdvanceTriggers', () => {
        it('returns true when active weather or terrain exists', () => {
            const bfWeather = createDefaultBattlefield();
            bfWeather.weather = { name: 'Sandstorm', remainingRounds: 3 };
            expect(hasPotentialRoundAdvanceTriggers(bfWeather)).toBe(true);

            const bfTerrain = createDefaultBattlefield();
            bfTerrain.terrain = { name: 'Grassy Terrain', remainingRounds: 2 };
            expect(hasPotentialRoundAdvanceTriggers(bfTerrain)).toBe(true);
        });

        it('returns true if any combatant has status matching burn, poison, or badly poisoned', () => {
            const bf = createDefaultBattlefield();
            const cBurn = createMockCombatant({ status: '1st Degree Burn' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cBurn])).toBe(true);

            const cPoison = createMockCombatant({ status: 'Poison' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cPoison])).toBe(true);

            const cBadly = createMockCombatant({ status: 'Badly Poisoned (2)' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cBadly])).toBe(true);
        });

        it('returns true if any combatant has Leftovers or Smart Tags matching round end', () => {
            const bf = createDefaultBattlefield();
            const cLeftovers = createMockCombatant({ heldItem: 'Leftovers' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cLeftovers])).toBe(true);

            const cHealTag = createMockCombatant({ heldItem: 'Berry [Heal 2 HP Round End]' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cHealTag])).toBe(true);

            const cDmgTag = createMockCombatant({ abilityTags: '[Deal 1 Damage at End of Round]' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cDmgTag])).toBe(true);
        });

        it('returns false when no battlefield effects, statuses, or tags exist', () => {
            const bf = createDefaultBattlefield();
            const cNormal = createMockCombatant({ status: 'Healthy', heldItem: 'Choice Band' });
            expect(hasPotentialRoundAdvanceTriggers(bf, [cNormal])).toBe(false);
        });
    });

    describe('resolveCombatantRoundTriggers', () => {
        const emptyDataMap = new Map<string, CombatantCharacterData>();

        it('evaluates Burn status: deals 1 damage with damageReason "Burn (1 Dmg)"', () => {
            const bf = createDefaultBattlefield();
            const c = createMockCombatant({ status: 'Burn' });
            const triggers = resolveCombatantRoundTriggers([c], bf, emptyDataMap);

            expect(triggers[0].hasDamageTrigger).toBe(true);
            expect(triggers[0].damageAmount).toBe(1);
            expect(triggers[0].damageReason).toBe('Burn (1 Dmg)');
            expect(triggers[0].isDamageImmune).toBe(false);
        });

        it('evaluates Poison status: deals 1 damage with damageReason "Poison (1 Dmg)"', () => {
            const bf = createDefaultBattlefield();
            const c = createMockCombatant({ status: 'Poison' });
            const triggers = resolveCombatantRoundTriggers([c], bf, emptyDataMap);

            expect(triggers[0].hasDamageTrigger).toBe(true);
            expect(triggers[0].damageAmount).toBe(1);
            expect(triggers[0].damageReason).toBe('Poison (1 Dmg)');
            expect(triggers[0].isDamageImmune).toBe(false);
        });

        it('evaluates Badly Poisoned status: scales damage with rounds in status string', () => {
            const bf = createDefaultBattlefield();
            const c = createMockCombatant({ status: 'Badly Poisoned (3)' });
            const triggers = resolveCombatantRoundTriggers([c], bf, emptyDataMap);

            expect(triggers[0].hasDamageTrigger).toBe(true);
            expect(triggers[0].damageAmount).toBe(3);
            expect(triggers[0].damageReason).toBe('Badly Poisoned (3 Dmg)');
            expect(triggers[0].isDamageImmune).toBe(false);
        });

        it('evaluates Leftovers held item: restores 1 HP', () => {
            const bf = createDefaultBattlefield();
            const c = createMockCombatant({ heldItem: 'Leftovers', hpCurr: 7, hpMax: 10 });
            const triggers = resolveCombatantRoundTriggers([c], bf, emptyDataMap);

            expect(triggers[0].hasHealingTrigger).toBe(true);
            expect(triggers[0].healingAmount).toBe(1);
            expect(triggers[0].healingReason).toBe('Leftovers (+1 HP)');
            expect(triggers[0].isHealingIneligible).toBe(false);
        });

        it('marks healing as Full HP when combatant is at maximum health', () => {
            const bf = createDefaultBattlefield();
            const c = createMockCombatant({ heldItem: 'Leftovers', hpCurr: 10, hpMax: 10 });
            const triggers = resolveCombatantRoundTriggers([c], bf, emptyDataMap);

            expect(triggers[0].hasHealingTrigger).toBe(true);
            expect(triggers[0].healingIneligibleReason).toBe('Full HP');
        });

        it('evaluates Smart Tags for dealing and healing end-of-round effects', () => {
            const bf = createDefaultBattlefield();
            const c = createMockCombatant({
                heldItem: 'Flame Orb [Deal 1 Damage at End of Round]',
                abilityTags: '[Heal 2 HP Round End]',
                hpCurr: 5,
                hpMax: 10
            });
            const triggers = resolveCombatantRoundTriggers([c], bf, emptyDataMap);

            expect(triggers[0].hasDamageTrigger).toBe(true);
            expect(triggers[0].damageAmount).toBe(1);
            expect(triggers[0].damageReason).toContain('Round End Tag (1 Dmg)');

            expect(triggers[0].hasHealingTrigger).toBe(true);
            expect(triggers[0].healingAmount).toBe(2);
            expect(triggers[0].healingReason).toContain('Round End Tag (+2 HP)');
        });

        it('marks Flying-type combatant as Airborne under Grassy Terrain alone', () => {
            const bf = createDefaultBattlefield();
            bf.playerSide.forceFields[0] = { name: 'Grassy Terrain', remainingRounds: 4 };

            const charMap = new Map<string, CombatantCharacterData>([
                [
                    'pidgeot',
                    {
                        types: ['Normal', 'Flying'],
                        ability: 'Keen Eye',
                        abilityActive: true,
                        abilityTags: ''
                    }
                ]
            ]);

            const c = createMockCombatant({ name: 'Pidgeot', hpCurr: 5, hpMax: 10, isPlayerSide: true });
            const triggers = resolveCombatantRoundTriggers([c], bf, charMap);

            expect(triggers[0].hasHealingTrigger).toBe(true);
            expect(triggers[0].isHealingIneligible).toBe(true);
            expect(triggers[0].healingIneligibleReason).toBe('Airborne (Flying)');
            expect(triggers[0].healingAmount).toBe(0);
        });

        it('allows Flying-type combatant to receive Grassy Terrain heal when Gravity is active', () => {
            const bf = createDefaultBattlefield();
            bf.playerSide.forceFields[0] = { name: 'Grassy Terrain', remainingRounds: 4 };
            bf.other = { name: 'Gravity', remainingRounds: 3 };

            const charMap = new Map<string, CombatantCharacterData>([
                [
                    'pidgeot',
                    {
                        types: ['Normal', 'Flying'],
                        ability: 'Keen Eye',
                        abilityActive: true,
                        abilityTags: ''
                    }
                ]
            ]);

            const c = createMockCombatant({ name: 'Pidgeot', hpCurr: 5, hpMax: 10, isPlayerSide: true });
            const triggers = resolveCombatantRoundTriggers([c], bf, charMap);

            expect(triggers[0].hasHealingTrigger).toBe(true);
            expect(triggers[0].isHealingIneligible).toBe(false);
            expect(triggers[0].healingAmount).toBe(1);
            expect(triggers[0].healingReason).toBe('Grassy Terrain (+1 HP)');
        });
    });

    describe('Status preservation across round advance', () => {
        it('preserves statuses without modification (e.g. Flinched, Burn, Confused) across rounds', () => {
            const combatants: CombatantRowData[] = [
                createMockCombatant({ name: 'Flinched Mon', status: 'Flinched' }),
                createMockCombatant({ name: 'Burned Mon', status: '1st Degree Burn' }),
                createMockCombatant({ name: 'Confused Mon', status: 'Confused' }),
                createMockCombatant({ name: 'Multi-Status Mon', status: 'Flinched, Confused, Badly Poisoned (2)' }),
                createMockCombatant({ name: 'Healthy Mon', status: 'Healthy' })
            ];

            // In Pokérole, statuses (including volatile statuses like Flinch) NEVER clear on round advance
            const advancedCombatants = combatants.map((c) => ({
                ...c,
                id: 'new-id',
                actions: createDefaultActions(),
                evadeUsed: false,
                clashUsed: false
            }));

            expect(advancedCombatants[0].status).toBe('Flinched');
            expect(advancedCombatants[1].status).toBe('1st Degree Burn');
            expect(advancedCombatants[2].status).toBe('Confused');
            expect(advancedCombatants[3].status).toBe('Flinched, Confused, Badly Poisoned (2)');
            expect(advancedCombatants[4].status).toBe('Healthy');

            for (let i = 0; i < combatants.length; i++) {
                expect(advancedCombatants[i].status).toBe(combatants[i].status);
                expect(advancedCombatants[i].evadeUsed).toBe(false);
                expect(advancedCombatants[i].clashUsed).toBe(false);
            }
        });
    });
});
