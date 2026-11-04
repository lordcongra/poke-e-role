import { describe, it, expect } from 'vitest';
import { executeSpeciesChange, sanitizeType } from '../speciesChangeLogic';
import { createTestCharacterState } from '../../../test/testStateHelpers';
import { CombatStat } from '../../../types/enums';

describe('speciesChangeLogic', () => {
    describe('sanitizeType', () => {
        it('returns empty string for "None", "none", case variants and whitespace', () => {
            expect(sanitizeType('None')).toBe('');
            expect(sanitizeType('none')).toBe('');
            expect(sanitizeType('NONE')).toBe('');
            expect(sanitizeType('  None  ')).toBe('');
            expect(sanitizeType('  none  ')).toBe('');
            expect(sanitizeType('')).toBe('');
            expect(sanitizeType('   ')).toBe('');
        });

        it('returns empty string for non-string or undefined inputs', () => {
            expect(sanitizeType(undefined)).toBe('');
            expect(sanitizeType(null)).toBe('');
            expect(sanitizeType(123)).toBe('');
            expect(sanitizeType({})).toBe('');
        });

        it('returns trimmed string for valid Pokemon types', () => {
            expect(sanitizeType('Electric')).toBe('Electric');
            expect(sanitizeType('  Fire  ')).toBe('Fire');
            expect(sanitizeType('Grass')).toBe('Grass');
            expect(sanitizeType('Dark')).toBe('Dark');
        });
    });

    describe('executeSpeciesChange', () => {
        const pikachuData = {
            Name: 'Pikachu',
            Type1: 'Electric',
            Type2: 'None',
            Strength: 2,
            MaxStrength: 4,
            Dexterity: 3,
            MaxDexterity: 6,
            Vitality: 2,
            MaxVitality: 4,
            Special: 2,
            MaxSpecial: 4,
            Insight: 2,
            MaxInsight: 4,
            BaseHP: 4,
            Ability1: 'Static',
            Ability2: 'Lightning Rod (HA)',
            Moves: [
                { Learned: 'Starter', Move: 'Thundershock' },
                { Learned: 'Amateur', Move: 'Spark' }
            ],
            DexID: '025',
            DexCategory: 'Mouse',
            Height: '0.4 m',
            Weight: '6.0 kg',
            DexDescription: 'Electric mouse Pokemon'
        };

        const raichuData = {
            Name: 'Raichu',
            Type1: 'Electric',
            Type2: '',
            Strength: 3,
            MaxStrength: 5,
            Dexterity: 4,
            MaxDexterity: 6,
            Vitality: 3,
            MaxVitality: 5,
            Special: 3,
            MaxSpecial: 5,
            Insight: 3,
            MaxInsight: 5,
            BaseHP: 5,
            Ability1: 'Static',
            Ability2: 'Surge Surfer (HA)',
            Moves: [
                { Learned: 'Starter', Move: 'Thunderbolt' }
            ],
            DexID: '026',
            DexCategory: 'Mouse',
            Height: '0.8 m',
            Weight: '30.0 kg',
            DexDescription: 'Raichu electric mouse'
        };

        it('Mode 1 (wipeData = true, updateStats = true): resets sheet to fresh species base', () => {
            const initial = createTestCharacterState({
                identity: {
                    nickname: 'Sparky',
                    species: 'Pichu',
                    rank: 'Expert',
                    type1: 'Electric',
                    type2: '',
                    ability: 'Static'
                },
                stats: {
                    str: { base: 1, limit: 3, rank: 2, buff: 1, debuff: 0 },
                    dex: { base: 2, limit: 4, rank: 1, buff: 0, debuff: 0 },
                    vit: { base: 1, limit: 3, rank: 0, buff: 0, debuff: 0 },
                    spe: { base: 1, limit: 3, rank: 0, buff: 0, debuff: 0 },
                    ins: { base: 1, limit: 3, rank: 0, buff: 0, debuff: 0 }
                },
                moves: [{ id: 'm1', name: 'Nuzzle' } as any],
                inventory: [{ id: 'i1', name: 'Berry' } as any],
                trackers: {
                    actions: 3,
                    evade: true,
                    clash: true,
                    chances: 1,
                    fate: 1,
                    globalAcc: 1,
                    globalDmg: 1,
                    globalSucc: 0,
                    globalChance: 0,
                    ignoredPain: 0,
                    firstHitAcc: true,
                    firstHitDmg: true,
                    bankedAccDice: {},
                    boostLevels: {}
                }
            });

            const result = executeSpeciesChange(initial, pikachuData, true, true);

            // Identity checks
            expect(result.nextState.identity?.species).toBe('Pikachu');
            expect(result.nextState.identity?.nickname).toBe('Sparky');
            expect(result.nextState.identity?.rank).toBe('Starter');
            expect(result.nextState.identity?.type1).toBe('Electric');
            expect(result.nextState.identity?.type2).toBe(''); // sanitized from 'None'
            expect(result.nextState.identity?.dexId).toBe('025');

            // Combat stats reset: base/limit updated, ranks and buffs zeroed out
            const stats = result.nextState.stats!;
            expect(stats[CombatStat.STR]).toEqual({ base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 });
            expect(stats[CombatStat.DEX]).toEqual({ base: 3, limit: 6, rank: 0, buff: 0, debuff: 0 });
            expect(stats[CombatStat.VIT]).toEqual({ base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 });
            expect(stats[CombatStat.SPE]).toEqual({ base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 });
            expect(stats[CombatStat.INS]).toEqual({ base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 });

            // Health & Will reset to fresh species base
            expect(result.nextState.health?.hpMax).toBe(6); // Pikachu BaseHP 4 + VIT 2
            expect(result.nextState.health?.hpCurr).toBe(6);
            expect(result.nextState.will?.willMax).toBe(5); // willBase 3 + INS 2
            expect(result.nextState.will?.willCurr).toBe(5);
            expect(result.updatesToSave['hp-curr']).toBe(6);
            expect(result.updatesToSave['hp-max-display']).toBe(6);
            expect(result.updatesToSave['will-curr']).toBe(5);
            expect(result.updatesToSave['will-max-display']).toBe(5);

            // Collections wiped
            expect(result.nextState.moves).toEqual([]);
            expect(result.nextState.inventory).toEqual([]);
            expect(result.nextState.passives).toEqual([]);
            expect(result.nextState.effects).toEqual([]);
            expect(result.nextState.wishlist).toEqual([]);
            expect(result.nextState.statuses).toHaveLength(1);
            expect(result.nextState.statuses![0].name).toBe('Healthy');

            // Trackers reset
            expect(result.nextState.trackers?.actions).toBe(0);
            expect(result.nextState.trackers?.evade).toBe(false);
            expect(result.nextState.trackers?.clash).toBe(false);
            expect(result.nextState.trackers?.firstHitAcc).toBe(false);
            expect(result.nextState.trackers?.firstHitDmg).toBe(false);

            // Serialization updates
            expect(result.updatesToSave['name']).toBe('Sparky');
            expect(result.updatesToSave['species']).toBe('Pikachu');
            expect(result.updatesToSave['rank']).toBe('Starter');
            expect(result.updatesToSave['type2']).toBe('');
            expect(result.updatesToSave['str-base']).toBe(2);
            expect(result.updatesToSave['str-rank']).toBe(0);
            expect(result.updatesToSave['moves-data']).toBe('[]');
            expect(result.updatesToSave['inventory-data']).toBe('[]');
        });

        it('Mode 1 falls back to species name when nickname is empty', () => {
            const initial = createTestCharacterState({
                identity: { nickname: '', species: 'Pichu' }
            });
            const result = executeSpeciesChange(initial, pikachuData, true, true);
            expect(result.updatesToSave['name']).toBe('Pikachu');
            expect(result.nextState.identity?.nickname).toBe('');
        });

        it('Mode 2 (wipeData = false, updateStats = true): preserves earned ranks and spent points while applying new base and limit', () => {
            const initial = createTestCharacterState({
                identity: {
                    nickname: 'Bolt',
                    species: 'Pikachu',
                    rank: 'Advanced',
                    type1: 'Electric',
                    type2: '',
                    ability: 'Static'
                },
                stats: {
                    str: { base: 2, limit: 4, rank: 2, buff: 1, debuff: 0 },
                    dex: { base: 3, limit: 6, rank: 3, buff: 0, debuff: 0 },
                    vit: { base: 2, limit: 4, rank: 1, buff: 0, debuff: 0 },
                    spe: { base: 2, limit: 4, rank: 1, buff: 0, debuff: 0 },
                    ins: { base: 2, limit: 4, rank: 1, buff: 0, debuff: 0 }
                },
                moves: [{ id: 'm1', name: 'Spark' } as any],
                inventory: [{ id: 'i1', name: 'Magnet' } as any]
            });

            const result = executeSpeciesChange(initial, raichuData, false, true);

            // Stats: base and limit updated, rank and buff preserved
            const stats = result.nextState.stats!;
            expect(stats[CombatStat.STR]).toEqual({ base: 3, limit: 5, rank: 2, buff: 1, debuff: 0 });
            expect(stats[CombatStat.DEX]).toEqual({ base: 4, limit: 6, rank: 3, buff: 0, debuff: 0 });
            expect(stats[CombatStat.VIT]).toEqual({ base: 3, limit: 5, rank: 1, buff: 0, debuff: 0 });

            // Identity: rank preserved, species updated, retainable ability preserved
            expect(result.nextState.identity?.species).toBe('Raichu');
            expect(result.nextState.identity?.rank).toBe('Advanced');
            expect(result.nextState.identity?.ability).toBe('Static');

            // Collections are NOT wiped
            expect(result.nextState.moves).toBeUndefined();
            expect(result.nextState.inventory).toBeUndefined();
            expect(result.updatesToSave['moves-data']).toBeUndefined();
            expect(result.updatesToSave['inventory-data']).toBeUndefined();

            // Updates to save reflect base/limit updates
            expect(result.updatesToSave['str-base']).toBe(3);
            expect(result.updatesToSave['str-limit']).toBe(5);
            expect(result.updatesToSave['species']).toBe('Raichu');

            // Health scaling via syncHealthAndWill (Raichu BaseHP 5 + VIT base 3 + VIT rank 1 = 9)
            expect(result.nextState.health?.hpMax).toBe(9);
            expect(result.updatesToSave['hp-curr']).toBe(9);
            expect(result.updatesToSave['hp-max-display']).toBe(9);
        });

        it('Mode 2 switches ability to default when current ability is not in new species learnset', () => {
            const initial = createTestCharacterState({
                identity: {
                    species: 'Pikachu',
                    rank: 'Advanced',
                    ability: 'Static'
                }
            });

            const levitateSpecies = {
                Name: 'Rotom',
                Type1: 'Electric',
                Type2: 'Ghost',
                Ability1: 'Levitate',
                Strength: 2,
                MaxStrength: 4,
                Dexterity: 3,
                MaxDexterity: 6,
                Vitality: 2,
                MaxVitality: 4,
                Special: 3,
                MaxSpecial: 6,
                Insight: 2,
                MaxInsight: 4
            };

            const result = executeSpeciesChange(initial, levitateSpecies, false, true);
            expect(result.nextState.identity?.ability).toBe('Levitate');
            expect(result.updatesToSave['ability']).toBe('Levitate');
        });

        it('Mode 3 (wipeData = false, updateStats = false): retains all stats and only shifts typing/abilities', () => {
            const initial = createTestCharacterState({
                identity: {
                    nickname: 'Cosplay',
                    species: 'Pikachu',
                    rank: 'Advanced',
                    type1: 'Electric',
                    type2: '',
                    ability: 'Static'
                },
                stats: {
                    str: { base: 2, limit: 4, rank: 1, buff: 0, debuff: 0 },
                    dex: { base: 3, limit: 6, rank: 2, buff: 0, debuff: 0 },
                    vit: { base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 },
                    spe: { base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 },
                    ins: { base: 2, limit: 4, rank: 0, buff: 0, debuff: 0 }
                },
                health: { hpCurr: 8, hpMax: 8, hpBase: 4, temporaryHitPoints: 0, temporaryHitPointsMax: 0 }
            });

            const cosplayData = {
                Name: 'Pikachu Libre',
                Type1: 'Electric',
                Type2: 'Fighting',
                Ability1: 'Mold Breaker',
                Strength: 5,
                MaxStrength: 8,
                BaseHP: 6
            };

            const result = executeSpeciesChange(initial, cosplayData, false, false);

            // Stats remain untouched
            const stats = result.nextState.stats!;
            expect(stats[CombatStat.STR]).toEqual({ base: 2, limit: 4, rank: 1, buff: 0, debuff: 0 });
            expect(result.updatesToSave['str-base']).toBeUndefined();
            expect(result.updatesToSave['str-limit']).toBeUndefined();
            expect(result.updatesToSave['hp-base']).toBeUndefined();

            // Typing and ability shift applied
            expect(result.nextState.identity?.species).toBe('Pikachu Libre');
            expect(result.nextState.identity?.type1).toBe('Electric');
            expect(result.nextState.identity?.type2).toBe('Fighting');
            expect(result.nextState.identity?.ability).toBe('Mold Breaker');

            expect(result.updatesToSave['species']).toBe('Pikachu Libre');
            expect(result.updatesToSave['type1']).toBe('Electric');
            expect(result.updatesToSave['type2']).toBe('Fighting');
            expect(result.updatesToSave['ability']).toBe('Mold Breaker');
        });
    });
});
