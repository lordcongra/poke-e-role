import { describe, it, expect, beforeEach, vi } from 'vitest';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { createTestCharacterState } from '@/test/testStateHelpers';
import {
    rollStatus,
    rollAccuracy,
    executeDamageRoll,
    rollSkillCheck,
    rollGeneric
} from '../combatRoller';
import { hasTailwindActive } from '../rollers/rollerCommon';
import type { MoveData, StatusItem, SkillCheck } from '@/store/storeTypes';
import { CombatStat, Skill } from '@/types/enums';
import { createDefaultBattlefield } from '@/components/modals/battleOrganizer/battleOrganizerUtils';
import { getBattleOrganizerStorageKey } from '@/utils/sync/roomScopedStorage';

// Mock rollDicePlus
vi.mock('../diceRoller', () => ({
    rollDicePlus: vi.fn().mockResolvedValue(undefined)
}));

// Mock OBR
vi.mock('@owlbear-rodeo/sdk', () => ({
    default: {
        isAvailable: true,
        notification: {
            show: vi.fn()
        },
        scene: {
            items: {
                getItems: vi.fn().mockResolvedValue([])
            }
        }
    }
}));

import { rollDicePlus } from '../diceRoller';

describe('combatRoller Safety Test Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('rollStatus', () => {
        it('rolls Burn recovery, increments action, and passes correct notation to rollDicePlus', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Charizard', species: 'Charizard' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                stats: {
                    [CombatStat.DEX]: { base: 3, rank: 0, buff: 0, debuff: 0, limit: 5 }
                },
                skills: {
                    [Skill.ATHLETIC]: { base: 2, buff: 0, customName: '' }
                },
                trackers: {
                    actions: 0
                }
            });
            useCharacterStore.setState(state);

            const status: StatusItem = {
                id: 'status-burn-1',
                name: 'Burn',
                customName: '',
                rounds: 3
            };

            await rollStatus(status, useCharacterStore.getState());

            expect(useCharacterStore.getState().trackers.actions).toBe(1);
            expect(rollDicePlus).toHaveBeenCalledTimes(1);
            const [notation, label, rollType, payload] = vi.mocked(rollDicePlus).mock.calls[0];
            expect(notation).toBe('5d6>3');
            expect(label).toContain('Charizard rolled Burn Recovery!');
            expect(rollType).toBe('status');
            expect(payload).toBe('status-burn-1');
        });

        it('rolls Sleep recovery and increments action', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Snorlax', species: 'Snorlax' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                stats: {
                    [CombatStat.INS]: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 }
                },
                trackers: {
                    actions: 0
                }
            });
            useCharacterStore.setState(state);

            const status: StatusItem = {
                id: 'status-sleep-1',
                name: 'Sleep',
                customName: '',
                rounds: 2
            };

            await rollStatus(status, useCharacterStore.getState());

            expect(useCharacterStore.getState().trackers.actions).toBe(1);
            expect(rollDicePlus).toHaveBeenCalledWith(
                '2d6>3',
                expect.stringContaining('Snorlax rolled Sleep Recovery!'),
                'status',
                'status-sleep-1'
            );
        });

        it('rolls Confusion recovery without incrementing action and with rollType "roll"', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Psyduck', species: 'Psyduck' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                stats: {
                    [CombatStat.INS]: { base: 3, rank: 0, buff: 0, debuff: 0, limit: 5 }
                },
                trackers: {
                    actions: 0
                }
            });
            useCharacterStore.setState(state);

            const status: StatusItem = {
                id: 'status-confusion-1',
                name: 'Confusion',
                customName: '',
                rounds: 1
            };

            await rollStatus(status, useCharacterStore.getState());

            expect(useCharacterStore.getState().trackers.actions).toBe(0);
            expect(rollDicePlus).toHaveBeenCalledWith(
                '3d6>3',
                expect.stringContaining('Psyduck rolled Confusion Recovery!'),
                'roll',
                'status-confusion-1'
            );
        });
    });

    describe('rollAccuracy', () => {
        it('blocks action when character is Asleep and move is not Sleep Talk/Snore', async () => {
            const state = createTestCharacterState({
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                statuses: [{ id: 's1', name: 'Sleep', customName: '', rounds: 2 }]
            });
            useCharacterStore.setState(state);

            const move: MoveData = {
                id: 'm-tackle',
                name: 'Tackle',
                type: 'Normal',
                category: 'Physical',
                power: 2,
                acc1: 'Dexterity',
                acc2: 'brawl',
                dmg1: 'Strength',
                active: true
            };

            await rollAccuracy(move, useCharacterStore.getState());

            expect(rollDicePlus).not.toHaveBeenCalled();
            expect(OBR.notification.show).toHaveBeenCalledWith(
                '[WARNING] You are Asleep and cannot perform actions!',
                'WARNING'
            );
        });

        it('rolls accuracy, increments action, and consumes First Hit Acc tracker', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Pikachu', species: 'Pikachu' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                stats: {
                    [CombatStat.DEX]: { base: 3, rank: 0, buff: 0, debuff: 0, limit: 5 },
                    [CombatStat.STR]: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 }
                },
                skills: {
                    [Skill.BRAWL]: { base: 2, buff: 0, customName: '' }
                },
                trackers: {
                    actions: 0,
                    firstHitAcc: true
                },
                inventory: [
                    {
                        id: 'item-custom-scope',
                        name: 'Custom Scope Lens',
                        desc: '[First Hit Acc +2]',
                        qty: 1,
                        active: true
                    }
                ]
            });
            useCharacterStore.setState(state);

            const move: MoveData = {
                id: 'm-quick-attack',
                name: 'Quick Attack',
                type: 'Normal',
                category: 'Physical',
                power: 2,
                acc1: 'Dexterity',
                acc2: 'brawl',
                dmg1: 'Strength',
                active: true
            };

            await rollAccuracy(move, useCharacterStore.getState());

            expect(useCharacterStore.getState().trackers.actions).toBe(1);
            expect(useCharacterStore.getState().trackers.firstHitAcc).toBe(false);
            expect(rollDicePlus).toHaveBeenCalledTimes(1);

            const [notation, label, rollType] = vi.mocked(rollDicePlus).mock.calls[0];
            // Base Acc = 3 (Dex) + 2 (Brawl) + 2 (First Hit) = 7
            expect(notation).toBe('7d6>3');
            expect(label).toContain('Pikachu rolled Quick Attack (Acc)!');
            expect(label).toContain('Need 1 Succ');
            expect(label).toContain('First Hit Acc +2');
            expect(rollType).toBe('roll');
        });

        it('dispatches acc_face rollType when move has accFaceAddsDmg tag', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Greninja', species: 'Greninja' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                stats: {
                    [CombatStat.DEX]: { base: 3, rank: 0, buff: 0, debuff: 0, limit: 5 }
                },
                skills: {
                    [Skill.BRAWL]: { base: 1, buff: 0, customName: '' }
                },
                inventory: [
                    {
                        id: 'item-custom-lens',
                        name: 'Custom Sniper Lens',
                        desc: '[Acc 6s Add Dmg Dice Limit 2]',
                        qty: 1,
                        active: true
                    }
                ]
            });
            useCharacterStore.setState(state);

            const move: MoveData = {
                id: 'm-water-shuriken',
                name: 'Water Shuriken',
                type: 'Water',
                category: 'Special',
                power: 2,
                acc1: 'Dexterity',
                acc2: 'brawl',
                dmg1: 'Special',
                active: true
            };

            await rollAccuracy(move, useCharacterStore.getState());

            expect(rollDicePlus).toHaveBeenCalledWith(
                '4d6>3',
                expect.stringContaining('Acc 6s Add Dmg Dice Limit 2'),
                'acc_face',
                'm-water-shuriken_6_2',
                undefined
            );
        });
    });

    describe('executeDamageRoll', () => {
        it('executes damage roll, handles super effective bonus, and clears active combat boost', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Charizard', species: 'Charizard', type1: 'Fire', type2: 'Flying' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                trackers: {
                    activeCombatBoost: {
                        sourceName: 'Charcoal',
                        type: 'Fire',
                        accSucc: 0,
                        dmgSucc: 2,
                        stage: 'armed'
                    },
                    firstHitDmg: true
                },
                inventory: [
                    {
                        id: 'item-custom-band',
                        name: 'Custom Muscle Band',
                        desc: '[First Hit Dmg +1]',
                        qty: 1,
                        active: true
                    }
                ]
            });
            useCharacterStore.setState(state);

            const move: MoveData = {
                id: 'm-flamethrower',
                name: 'Flamethrower',
                type: 'Fire',
                category: 'Special',
                power: 3,
                acc1: 'Special',
                acc2: 'Channel',
                dmg1: 'Special',
                active: true
            };

            const override = { active: false, type: 'dice' as const, value: 0 };
            const result = await executeDamageRoll(
                move,
                useCharacterStore.getState(),
                5, // baseDamage
                false, // isCritical
                1, // effectiveness (Super Effective +1)
                1, // reduction (1 def)
                override
            );

            // Base 5 - 1 def = 4 dice.
            // Flat: +1 (SE) + 2 (Charcoal boost) = +3.
            expect(result.diceToRoll).toBe(4);
            expect(result.tags).toContain('SUPER EFFECTIVE (+1 Succ)');
            expect(result.tags).toContain('STAB (+1 Die)');
            expect(result.tags).toContain('First Hit (+1 Dice)');
            expect(result.tags).toContain('Item: Charcoal (+2 Dmg Succ)');

            expect(useCharacterStore.getState().trackers.firstHitDmg).toBe(false);
            expect(useCharacterStore.getState().trackers.activeCombatBoost).toBeNull();
            expect(rollDicePlus).toHaveBeenCalledWith(
                '4d6>3+3',
                expect.stringContaining('Charizard rolled Flamethrower (Dmg)!'),
                'damage',
                '0_0_1'
            );
        });

        it('handles immunity by zeroing dice pool and flat modifier', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Gengar', species: 'Gengar' },
                roomCustomStatuses: [],
                roomCustomAbilities: []
            });
            useCharacterStore.setState(state);

            const move: MoveData = {
                id: 'm-hyper-beam',
                name: 'Hyper Beam',
                type: 'Normal',
                category: 'Special',
                power: 5,
                acc1: 'Special',
                acc2: 'Channel',
                dmg1: 'Special',
                active: true
            };

            const override = { active: false, type: 'dice' as const, value: 0 };
            const result = await executeDamageRoll(
                move,
                useCharacterStore.getState(),
                8,
                false,
                0,
                0,
                override,
                undefined,
                0,
                undefined,
                true // isImmune
            );

            expect(result.diceToRoll).toBe(0);
            expect(result.tags).toContain('IMMUNE: 0 Damage');
            expect(rollDicePlus).toHaveBeenCalledWith(
                '0d6>3',
                expect.stringContaining('IMMUNE: 0 Damage'),
                'damage',
                '0_0_0'
            );
        });

        it('clears banked excess accuracy dice upon damage roll execution', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Lucario', species: 'Lucario', type1: 'Fighting', type2: 'Steel' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                trackers: {
                    bankedAccDice: { 'm-close-combat': 2 }
                }
            });
            useCharacterStore.setState(state);

            const move: MoveData = {
                id: 'm-close-combat',
                name: 'Close Combat',
                type: 'Fighting',
                category: 'Physical',
                power: 4,
                acc1: 'Strength',
                acc2: 'brawl',
                dmg1: 'Strength',
                active: true
            };

            const override = { active: false, type: 'dice' as const, value: 0 };
            const result = await executeDamageRoll(
                move,
                useCharacterStore.getState(),
                4,
                false,
                0,
                0,
                override
            );

            // Base 4 + 2 banked = 6 dice
            expect(result.diceToRoll).toBe(6);
            expect(result.tags).toContain('Banked Excess Acc (+2 Dmg)');
            expect(useCharacterStore.getState().trackers.bankedAccDice['m-close-combat']).toBeUndefined();
        });
    });

    describe('rollSkillCheck', () => {
        it('rolls skill check with stat + skill + rank bonus and dispatches action_roll', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Alakazam', rank: 'Master' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                stats: {
                    [CombatStat.INS]: { base: 5, rank: 0, buff: 0, debuff: 0, limit: 5 }
                },
                skills: {
                    [Skill.ALERT]: { base: 3, buff: 0, customName: '' }
                }
            });
            useCharacterStore.setState(state);

            const check: SkillCheck = {
                id: 'check-perception',
                name: 'Perception',
                attr: 'Insight',
                skill: 'alert'
            };

            await rollSkillCheck(check, useCharacterStore.getState());

            // 5 (Ins) + 3 (Alert) + 2 (Master rank bonus) = 10 dice
            expect(rollDicePlus).toHaveBeenCalledWith(
                '10d6>3',
                expect.stringContaining('[Action Roll] Alakazam rolled Perception!'),
                'action_roll',
                'check-perception'
            );
        });

        it('blocks skill check when Asleep and not Comatose', async () => {
            const state = createTestCharacterState({
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                statuses: [{ id: 's-sleep', name: 'Sleep', customName: '', rounds: 2 }]
            });
            useCharacterStore.setState(state);

            const check: SkillCheck = {
                id: 'check-stealth',
                name: 'Stealth',
                attr: 'Dexterity',
                skill: 'Stealth'
            };

            await rollSkillCheck(check, useCharacterStore.getState());

            expect(rollDicePlus).not.toHaveBeenCalled();
            expect(OBR.notification.show).toHaveBeenCalledWith(
                '[WARNING] You are Asleep and cannot perform actions!',
                'WARNING'
            );
        });
    });

    describe('rollGeneric', () => {
        it('handles evasion roll with tracker mutations and gravity penalty', async () => {
            const defaultBf = createDefaultBattlefield();
            const state = createTestCharacterState({
                identity: { nickname: 'Ninjask' },
                roomCustomStatuses: [],
                roomCustomAbilities: [],
                activeBattlefield: {
                    ...defaultBf,
                    other: { name: 'Gravity', remainingRounds: 3 }
                }
            });
            useCharacterStore.setState(state);

            await rollGeneric(
                'Evasion',
                5, // dicePool
                'dex',
                true, // incrementEvade
                false, // incrementClash
                true // incrementAction
            );

            expect(useCharacterStore.getState().trackers.actions).toBe(1);
            expect(useCharacterStore.getState().trackers.evade).toBe(true);

            // 5 dice - 2 Gravity = 3 dice
            expect(rollDicePlus).toHaveBeenCalledWith(
                '3d6>3',
                expect.stringContaining('Ninjask rolled Evasion! [ Gravity (-2 Evasion Dice) ]')
            );
        });

        it('handles defense roll with Fur Coat ability tag', async () => {
            const state = createTestCharacterState({
                identity: { nickname: 'Furfrou', ability: 'Fur Coat' },
                roomCustomStatuses: [],
                roomCustomAbilities: []
            });
            useCharacterStore.setState(state);

            await rollGeneric('Defense', 4, 'vit');

            expect(rollDicePlus).toHaveBeenCalledWith(
                '4d6>3',
                expect.stringContaining('Furfrou rolled Defense! [ Ability: Fur Coat (-2 Phys Dmg Taken) ]')
            );
        });
    });

    describe('hasTailwindActive', () => {
        beforeEach(() => {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.clear();
            }
        });

        it('returns true for player character when Tailwind is active on playerSide', () => {
            const bf = createDefaultBattlefield();
            bf.playerSide.forceFields[0] = { name: 'Tailwind', remainingRounds: 3 };

            const state = createTestCharacterState({
                identity: { nickname: 'Pikachu', isNPC: false },
                activeBattlefield: bf
            });

            expect(hasTailwindActive(state)).toBe(true);
        });

        it('returns false for player character when Tailwind is only active on foeSide', () => {
            const bf = createDefaultBattlefield();
            bf.foeSide.forceFields[0] = { name: 'Tailwind', remainingRounds: 3 };

            const state = createTestCharacterState({
                identity: { nickname: 'Pikachu', isNPC: false },
                activeBattlefield: bf
            });

            expect(hasTailwindActive(state)).toBe(false);
        });

        it('returns true for foe character when Tailwind is active on foeSide', () => {
            const bf = createDefaultBattlefield();
            bf.foeSide.forceFields[0] = { name: 'Tailwind', remainingRounds: 3 };

            const state = createTestCharacterState({
                identity: { nickname: 'Zubat', isNPC: true },
                activeBattlefield: bf
            });

            expect(hasTailwindActive(state)).toBe(true);
        });

        it('returns false when character resolves to "none" (non-combatant on bench)', () => {
            localStorage.setItem(
                getBattleOrganizerStorageKey(),
                JSON.stringify({
                    activeRoundIndex: 0,
                    rounds: [{ combatants: [{ name: 'ActiveCharizard', isPlayerSide: true }] }]
                })
            );

            const bf = createDefaultBattlefield();
            bf.playerSide.forceFields[0] = { name: 'Tailwind', remainingRounds: 3 };

            // Pikachu is not ActiveCharizard -> resolves to 'none'
            const state = createTestCharacterState({
                identity: { nickname: 'Pikachu', isNPC: false },
                activeBattlefield: bf
            });

            expect(hasTailwindActive(state)).toBe(false);
        });
    });
});
