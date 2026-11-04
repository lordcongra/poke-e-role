import { describe, it, expect } from 'vitest';
import {
    convertMovesToMax,
    createFormBackup,
    restoreFormBackup,
    syncHealthAndWill,
    type RestoreConfig
} from '../macroHelpers';
import type { MoveData, CustomType, Rank } from '../../../store/storeTypes';
import { CombatStat, Skill } from '../../../types/enums';
import { createTestCharacterState } from '../../../test/testStateHelpers';

describe('macroHelpers', () => {
    describe('convertMovesToMax', () => {
        it('boosts offensive moves by +2 power and adds [Acc +2] while retaining bracketed tags', () => {
            const moves: MoveData[] = [{
                id: 'm1',
                name: 'Flamethrower',
                type: 'Fire',
                category: 'Special',
                acc1: 'spe',
                acc2: 'none',
                dmg1: 'spe',
                power: 3,
                desc: 'A fiery blast. [High Crit] [Charge]',
                active: false,
                marker: ''
            }];

            const converted = convertMovesToMax(moves, []);
            expect(converted).toHaveLength(1);
            expect(converted[0].name).toBe('Max Flare');
            expect(converted[0].power).toBe(5); // 3 + 2
            expect(converted[0].desc).toContain('[Acc +2]');
            expect(converted[0].desc).toContain('[High Crit]');
            expect(converted[0].desc).toContain('[Charge]');
        });

        it('converts status moves into Max Guard with 0 power and shield description', () => {
            const statusMoves: MoveData[] = [{
                id: 'm2',
                name: 'Protect',
                type: 'Normal',
                category: 'Status',
                acc1: 'none',
                acc2: 'none',
                dmg1: 'none',
                power: 0,
                desc: 'Protects the user from harm.',
                active: false,
                marker: ''
            }];

            const converted = convertMovesToMax(statusMoves, []);
            expect(converted).toHaveLength(1);
            expect(converted[0].name).toBe('Max Guard');
            expect(converted[0].type).toBe('Normal');
            expect(converted[0].power).toBe(0);
            expect(converted[0].desc).toContain('Target: Max Self. Shield Move.');
        });

        it('uses custom type max move name and effect when custom type matches', () => {
            const customTypes: CustomType[] = [
                {
                    id: 'ct-cosmic',
                    name: 'Cosmic',
                    color: '#4B0082',
                    weaknesses: [],
                    resistances: [],
                    immunities: [],
                    seAgainst: [],
                    nveAgainst: [],
                    noEffectAgainst: [],
                    maxMoveName: 'G-Max Singularity',
                    maxMoveEffect: 'Creates a gravitational field.'
                }
            ];
            const cosmicMove: MoveData[] = [{
                id: 'm3',
                name: 'Meteor Beam',
                type: 'Cosmic',
                category: 'Special',
                acc1: 'spe',
                acc2: 'none',
                dmg1: 'spe',
                power: 4,
                desc: 'Beams from outer space. [Area]',
                active: false,
                marker: ''
            }];

            const converted = convertMovesToMax(cosmicMove, customTypes);
            expect(converted[0].name).toBe('G-Max Singularity');
            expect(converted[0].power).toBe(6); // 4 + 2
            expect(converted[0].desc).toBe('Creates a gravitational field. [Acc +2] [Area]');
        });
    });

    describe('createFormBackup & restoreFormBackup', () => {
        it('serializes snapshot of stats, skills, health, will, moves, and typing', () => {
            const state = createTestCharacterState({
                identity: {
                    species: 'Gengar',
                    type1: 'Ghost',
                    type2: 'Poison',
                    ability: 'Cursed Body',
                    availableAbilities: ['Cursed Body', 'Levitate'],
                    tokenImageUrl: 'https://example.com/gengar.png'
                },
                health: {
                    hpBase: 4,
                    hpCurr: 12,
                    hpMax: 12,
                    temporaryHitPoints: 2,
                    temporaryHitPointsMax: 2
                },
                will: {
                    willCurr: 5,
                    willMax: 6,
                    temporaryWill: 1,
                    temporaryWillMax: 1
                },
                stats: {
                    [CombatStat.STR]: { base: 2, rank: 1, limit: 5, buff: 1, debuff: 0 },
                    [CombatStat.DEX]: { base: 3, rank: 0, limit: 5, buff: 0, debuff: 0 },
                    [CombatStat.VIT]: { base: 2, rank: 0, limit: 5, buff: 0, debuff: 0 },
                    [CombatStat.SPE]: { base: 4, rank: 2, limit: 6, buff: 0, debuff: 0 },
                    [CombatStat.INS]: { base: 2, rank: 0, limit: 5, buff: 0, debuff: 0 }
                },
                skills: {
                    [Skill.STEALTH]: { base: 3, buff: 0, customName: 'Shadow Blend' }
                },
                moves: [
                    {
                        id: 'm-shadow',
                        name: 'Shadow Ball',
                        type: 'Ghost',
                        category: 'Special',
                        acc1: 'spe',
                        acc2: 'none',
                        dmg1: 'spe',
                        power: 3,
                        desc: '',
                        active: false,
                        marker: ''
                    }
                ]
            });

            const backupStr = createFormBackup(state);
            const parsed = JSON.parse(backupStr);

            expect(parsed.species).toBe('Gengar');
            expect(parsed.type1).toBe('Ghost');
            expect(parsed.type2).toBe('Poison');
            expect(parsed.ability).toBe('Cursed Body');
            expect(parsed.hpCurr).toBe(12);
            expect(parsed.tempHp).toBe(2);
            expect(parsed.stats[CombatStat.SPE].base).toBe(4);
            expect(parsed.skills[Skill.STEALTH].customName).toBe('Shadow Blend');
            expect(parsed.moves).toHaveLength(1);
            expect(parsed.moves[0].name).toBe('Shadow Ball');
        });

        it('selectively restores only typing via RestoreConfig', () => {
            const state = createTestCharacterState({
                identity: { type1: 'Ghost', type2: 'Poison' }
            });
            const backupStr = createFormBackup(state);

            const draft = {
                identity: { ...state.identity, type1: 'Normal', type2: 'Flying' },
                health: { ...state.health },
                will: { ...state.will },
                derived: { ...state.derived },
                stats: { ...state.stats },
                socials: { ...state.socials },
                moves: [...state.moves],
                skills: { ...state.skills },
                statuses: [...state.statuses]
            };
            const updatesToSave: Record<string, unknown> = {};
            const config: RestoreConfig = { restoreTyping: true };

            restoreFormBackup(backupStr, draft, updatesToSave, config);

            expect(draft.identity.type1).toBe('Ghost');
            expect(draft.identity.type2).toBe('Poison');
            expect(updatesToSave['type1']).toBe('Ghost');
            expect(updatesToSave['type2']).toBe('Poison');
            expect(updatesToSave[`${CombatStat.STR}-base`]).toBeUndefined();
        });

        it('selectively restores only moves via RestoreConfig', () => {
            const state = createTestCharacterState({
                moves: [
                    {
                        id: 'm1',
                        name: 'Original Move',
                        type: 'Normal',
                        category: 'Physical',
                        acc1: 'str',
                        acc2: 'none',
                        dmg1: 'str',
                        power: 2,
                        desc: '',
                        active: false,
                        marker: ''
                    }
                ]
            });
            const backupStr = createFormBackup(state);

            const draft = {
                identity: { ...state.identity },
                health: { ...state.health },
                will: { ...state.will },
                derived: { ...state.derived },
                stats: { ...state.stats },
                socials: { ...state.socials },
                moves: [{ id: 'm-temp', name: 'Temporary Move' } as MoveData],
                skills: { ...state.skills },
                statuses: [...state.statuses]
            };
            const updatesToSave: Record<string, unknown> = {};

            restoreFormBackup(backupStr, draft, updatesToSave, { restoreMoves: true });

            expect(draft.moves).toHaveLength(1);
            expect(draft.moves[0].name).toBe('Original Move');
            expect(updatesToSave['moves-data']).toBeDefined();
        });
    });

    describe('syncHealthAndWill', () => {
        it('recalculates hpMax and increases hpCurr proportionally without exceeding max', () => {
            const state = createTestCharacterState();
            const newStats = {
                ...state.stats,
                [CombatStat.VIT]: { base: 4, rank: 0, limit: 5, buff: 0, debuff: 0 },
                [CombatStat.INS]: { base: 3, rank: 0, limit: 5, buff: 0, debuff: 0 }
            };
            const newIdentity = { ...state.identity, rank: 'Starter' as Rank };
            const newHealth = { hpBase: 4, hpCurr: 6, hpMax: 6, temporaryHitPoints: 0, temporaryHitPointsMax: 0 };
            const newWill = { willBase: 3, willCurr: 4, willMax: 4, temporaryWill: 0, temporaryWillMax: 0 };
            const updatesToSave: Record<string, unknown> = {};

            // Max HP = BaseHP (4) + VIT (4) = 8. Old hpMax was 6. Difference is +2.
            syncHealthAndWill(state, newStats, newIdentity, newHealth, newWill, updatesToSave, false);

            expect(newHealth.hpMax).toBe(8);
            expect(newHealth.hpCurr).toBe(8); // 6 + 2
            expect(updatesToSave['hp-curr']).toBe(8);
            expect(updatesToSave['hp-max-display']).toBe(8);

            // Will Max = willBase (3) + INS (3) = 6. Old willMax was 4. Difference is +2.
            expect(newWill.willMax).toBe(6);
            expect(newWill.willCurr).toBe(6); // 4 + 2
            expect(updatesToSave['will-curr']).toBe(6);
            expect(updatesToSave['will-max-display']).toBe(6);
        });

        it('honors preventCurrentGain and caps hpCurr if max drops below current hp', () => {
            const state = createTestCharacterState();
            const boostedStats = {
                ...state.stats,
                [CombatStat.VIT]: { base: 5, rank: 0, limit: 5, buff: 0, debuff: 0 }
            };
            const newIdentity = { ...state.identity, rank: 'Starter' as Rank };
            const healthGainPrevented = { hpBase: 4, hpCurr: 5, hpMax: 6, temporaryHitPoints: 0, temporaryHitPointsMax: 0 };
            const willDummy = { willBase: 3, willCurr: 3, willMax: 4, temporaryWill: 0, temporaryWillMax: 0 };
            const updatesToSave: Record<string, unknown> = {};

            // Boost VIT to 5 (Max HP 9), but preventCurrentGain = true
            syncHealthAndWill(state, boostedStats, newIdentity, healthGainPrevented, willDummy, updatesToSave, true);
            expect(healthGainPrevented.hpMax).toBe(9);
            expect(healthGainPrevented.hpCurr).toBe(5); // Remained at 5

            // Now test capping: lower VIT to 1 (Max HP 5), hpCurr starts at 8
            const lowStats = {
                ...state.stats,
                [CombatStat.VIT]: { base: 1, rank: 0, limit: 5, buff: 0, debuff: 0 }
            };
            const overHealth = { hpBase: 4, hpCurr: 8, hpMax: 8, temporaryHitPoints: 0, temporaryHitPointsMax: 0 };
            syncHealthAndWill(state, lowStats, newIdentity, overHealth, willDummy, updatesToSave, false);
            expect(overHealth.hpMax).toBe(5);
            expect(overHealth.hpCurr).toBe(5); // Capped to 5
        });
    });
});
