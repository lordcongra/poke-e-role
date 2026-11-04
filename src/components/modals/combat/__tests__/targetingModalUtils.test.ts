import { describe, it, expect, beforeEach } from 'vitest';
import {
    calculateDefaultEffectiveness,
    initializeMultiTargetRows,
    detectMoveTargetingType,
    type TargetOption
} from '@/components/modals/combat/targetingModalUtils';
import { getTargetOptions } from '@/components/modals/items/tagBuilder/tagBuilderConstants';
import { executeMultiTargetDamageRoll } from '@/utils/combat/multiTargetDamageRoller';
import { executeDamageRoll } from '@/utils/combat/combatRoller';
import type { CharacterState, MoveData } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';

function createMockCharacterState(overrides?: {
    identity?: Partial<CharacterState['identity']>;
    health?: Partial<CharacterState['health']>;
    trackers?: Partial<CharacterState['trackers']>;
}): CharacterState {
    const base = useCharacterStore.getState();
    return {
        ...base,
        identity: {
            ...base.identity,
            nickname: 'Pikachu',
            species: 'Pikachu',
            type1: 'Electric',
            type2: '',
            ...overrides?.identity
        },
        health: {
            ...base.health,
            hpCurr: 10,
            hpMax: 10,
            ...overrides?.health
        },
        trackers: {
            ...base.trackers,
            ...overrides?.trackers
        }
    };
}

describe('targetingModalUtils', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('calculateDefaultEffectiveness', () => {
        it('returns +1 for single Super Effective matchup', () => {
            // Fire vs Grass: 2x -> +1
            expect(calculateDefaultEffectiveness('Fire', ['Grass'])).toEqual({ modifier: 1, isImmune: false });
            // Water vs Fire: 2x -> +1
            expect(calculateDefaultEffectiveness('Water', ['Fire'])).toEqual({ modifier: 1, isImmune: false });
            // Electric vs Water: 2x -> +1
            expect(calculateDefaultEffectiveness('Electric', ['Water'])).toEqual({ modifier: 1, isImmune: false });
        });

        it('returns +2 for double Super Effective matchup', () => {
            // Grass vs Water/Ground: 2 * 2 = 4x -> +2
            expect(calculateDefaultEffectiveness('Grass', ['Water', 'Ground'])).toEqual({ modifier: 2, isImmune: false });
            // Ice vs Dragon/Flying: 2 * 2 = 4x -> +2
            expect(calculateDefaultEffectiveness('Ice', ['Dragon', 'Flying'])).toEqual({ modifier: 2, isImmune: false });
        });

        it('returns -1 for single Not Very Effective matchup', () => {
            // Grass vs Fire: 0.5x -> -1
            expect(calculateDefaultEffectiveness('Grass', ['Fire'])).toEqual({ modifier: -1, isImmune: false });
            // Fire vs Water: 0.5x -> -1
            expect(calculateDefaultEffectiveness('Fire', ['Water'])).toEqual({ modifier: -1, isImmune: false });
        });

        it('returns -2 for double Not Very Effective matchup', () => {
            // Grass vs Fire/Flying: 0.5 * 0.5 = 0.25x -> -2
            expect(calculateDefaultEffectiveness('Grass', ['Fire', 'Flying'])).toEqual({ modifier: -2, isImmune: false });
            // Bug vs Fire/Flying: 0.5 * 0.5 = 0.25x -> -2
            expect(calculateDefaultEffectiveness('Bug', ['Fire', 'Flying'])).toEqual({ modifier: -2, isImmune: false });
        });

        it('returns 0 for neutral matchup', () => {
            // Normal vs Normal: 1x -> 0
            expect(calculateDefaultEffectiveness('Normal', ['Normal'])).toEqual({ modifier: 0, isImmune: false });
            // Electric vs Normal: 1x -> 0
            expect(calculateDefaultEffectiveness('Electric', ['Normal'])).toEqual({ modifier: 0, isImmune: false });
        });

        it('returns { modifier: 0, isImmune: true } for type immunities', () => {
            // Normal vs Ghost: 0x -> { modifier: 0, isImmune: true }
            expect(calculateDefaultEffectiveness('Normal', ['Ghost'])).toEqual({ modifier: 0, isImmune: true });
            // Electric vs Ground: 0x -> { modifier: 0, isImmune: true }
            expect(calculateDefaultEffectiveness('Electric', ['Ground'])).toEqual({ modifier: 0, isImmune: true });
            // Ground vs Flying: 0x -> { modifier: 0, isImmune: true }
            expect(calculateDefaultEffectiveness('Ground', ['Flying'])).toEqual({ modifier: 0, isImmune: true });
            // Psychic vs Dark: 0x -> { modifier: 0, isImmune: true }
            expect(calculateDefaultEffectiveness('Psychic', ['Dark'])).toEqual({ modifier: 0, isImmune: true });
        });

        it('handles edge cases: empty strings, empty target array, and whitespace / case insensitivity', () => {
            expect(calculateDefaultEffectiveness('', ['Grass'])).toEqual({ modifier: 0, isImmune: false });
            expect(calculateDefaultEffectiveness('Fire', [])).toEqual({ modifier: 0, isImmune: false });
            expect(calculateDefaultEffectiveness('  fire  ', ['  grass  '])).toEqual({ modifier: 1, isImmune: false });
            expect(calculateDefaultEffectiveness('FIRE', ['GRASS'])).toEqual({ modifier: 1, isImmune: false });
            expect(calculateDefaultEffectiveness('  normal  ', ['  ghost  '])).toEqual({ modifier: 0, isImmune: true });
        });
    });

    describe('initializeMultiTargetRows', () => {
        it('populates isImmune: true for targets with type immunity', () => {
            const targets: TargetOption[] = [
                { id: 't1', name: 'Gengar', def: 2, isTera: false, isPlayerSide: false, types: ['Ghost', 'Poison'] },
                { id: 't2', name: 'Rattata', def: 1, isTera: false, isPlayerSide: false, types: ['Normal'] }
            ];

            const rows = initializeMultiTargetRows(targets, 'Normal', true, null, undefined, 'single', 5);
            expect(rows).toHaveLength(2);

            const gengar = rows.find((r) => r.name === 'Gengar');
            expect(gengar).toBeDefined();
            expect(gengar?.isImmune).toBe(true);
            expect(gengar?.effectiveness).toBe(0);

            const rattata = rows.find((r) => r.name === 'Rattata');
            expect(rattata).toBeDefined();
            expect(rattata?.isImmune).toBe(false);
            expect(rattata?.effectiveness).toBe(0);
        });
    });

    describe('Damage Resolution with isImmune', () => {
        const normalMove: MoveData = {
            id: 'tackle',
            name: 'Tackle',
            type: 'Normal',
            category: 'Physical',
            power: 2,
            acc1: 'Dexterity',
            acc2: 'Brawl',
            dmg1: 'Strength',
            active: true
        };

        it('forces finalDamage = 0 and logs immunity in standard multi-target damage rolls', async () => {
            const state = createMockCharacterState();
            const selections = [
                {
                    id: 'gengar',
                    name: 'Gengar',
                    def: 1,
                    effectiveness: 0,
                    isImmune: true,
                    isEvaded: false,
                    isPlayerSide: false
                },
                {
                    id: 'rattata',
                    name: 'Rattata',
                    def: 1,
                    effectiveness: 0,
                    isImmune: false,
                    isEvaded: false,
                    isPlayerSide: false
                }
            ];

            const override = { active: false, type: 'dice' as const, value: 0 };
            await executeMultiTargetDamageRoll(normalMove, state, 5, false, selections, override);

            const logs: Array<{ label: string; result: string }> = JSON.parse(
                localStorage.getItem('pkr_roll_log') || '[]'
            );
            const gengarLog = logs.find((l) => l.label.includes('vs Gengar'));
            const rattataLog = logs.find((l) => l.label.includes('vs Rattata'));

            expect(gengarLog).toBeDefined();
            expect(gengarLog?.label).toContain('IMMUNE: 0 Damage');
            expect(gengarLog?.result).toContain('= 0 Total Damage');
            expect(gengarLog?.result).toContain('Target is Immune to Normal attacks (0 Damage dealt).');

            expect(rattataLog).toBeDefined();
            expect(rattataLog?.label).not.toContain('IMMUNE: 0 Damage');
            expect(rattataLog?.result).not.toContain('= 0 Total Damage');
        });

        it('forces finalDamage = 0 and logs immunity in flat override multi-target damage rolls', async () => {
            const state = createMockCharacterState();
            const selections = [
                {
                    id: 'gengar',
                    name: 'Gengar',
                    def: 2,
                    effectiveness: 0,
                    isImmune: true,
                    isEvaded: false,
                    isPlayerSide: false
                }
            ];

            const override = { active: true, type: 'flat' as const, value: 10 };
            await executeMultiTargetDamageRoll(normalMove, state, 5, false, selections, override);

            const logs: Array<{ label: string; result: string }> = JSON.parse(
                localStorage.getItem('pkr_roll_log') || '[]'
            );
            const gengarLog = logs.find((l) => l.label.includes('vs Gengar'));

            expect(gengarLog).toBeDefined();
            expect(gengarLog?.label).toContain('IMMUNE: 0 Damage');
            expect(gengarLog?.result).toContain('= 0 Total Damage');
            expect(gengarLog?.result).toContain('Target is Immune to Normal attacks (0 Damage dealt).');
        });

        it('forces actualDicePool = 0 and adds immunity tags in single-target executeDamageRoll', async () => {
            const state = createMockCharacterState({
                identity: { nickname: 'Snorlax', species: 'Snorlax' }
            });

            const override = { active: false, type: 'dice' as const, value: 0 };
            const result = await executeDamageRoll(
                normalMove,
                state,
                5,
                false,
                0,
                0,
                override,
                undefined,
                0,
                'Gengar',
                true // isImmune
            );

            expect(result.diceToRoll).toBe(0);
            expect(result.tags).toContain('IMMUNE: 0 Damage');
            expect(result.tags).toContain('Snorlax is IMMUNE to Normal attacks (0 Damage)');
            expect(result.finalTags).toContain('IMMUNE: 0 Damage');
        });
    });

    describe('detectMoveTargetingType', () => {
        const testMove: MoveData = {
            id: 'earthquake',
            name: 'Earthquake',
            type: 'Ground',
            category: 'Physical',
            power: 3,
            acc1: 'Strength',
            acc2: 'Brawl',
            dmg1: 'Strength',
            active: true
        };

        it('detects area moves correctly', () => {
            const rawAreaMove = { ...testMove, target: 'area' } as unknown as MoveData;
            expect(detectMoveTargetingType(rawAreaMove)).toBe('area');

            const descAreaMove = { ...testMove, desc: 'A destructive area move striking all combatants.' };
            expect(detectMoveTargetingType(descAreaMove)).toBe('area');

            const descAreaAttack = { ...testMove, desc: 'An explosive area attack.' };
            expect(detectMoveTargetingType(descAreaAttack)).toBe('area');

            const tagAreaMove = { ...testMove, desc: '[Target: Area] Hits all nearby.' };
            expect(detectMoveTargetingType(tagAreaMove)).toBe('area');

            const tagAllOnField = { ...testMove, desc: '[Target: All on Field]' };
            expect(detectMoveTargetingType(tagAllOnField)).toBe('area');

            const tagField = { ...testMove, desc: '[Target: Field]' };
            expect(detectMoveTargetingType(tagField)).toBe('area');
        });

        it('detects target-all in range / all foes / all allies correctly', () => {
            const rawAllFoes = { ...testMove, target: 'all foes' } as unknown as MoveData;
            expect(detectMoveTargetingType(rawAllFoes)).toBe('target-all');

            const rawAllAllies = { ...testMove, target: 'all allies' } as unknown as MoveData;
            expect(detectMoveTargetingType(rawAllAllies)).toBe('target-all');

            const rawAllInRange = { ...testMove, target: 'all in range' } as unknown as MoveData;
            expect(detectMoveTargetingType(rawAllInRange)).toBe('target-all');

            const descAllFoes = { ...testMove, desc: '[Target: All Foes]' };
            expect(detectMoveTargetingType(descAllFoes)).toBe('target-all');

            const descAllAllies = { ...testMove, desc: '[Target: All Allies]' };
            expect(detectMoveTargetingType(descAllAllies)).toBe('target-all');

            const descAllInRange = { ...testMove, desc: '[Target: All in Range]' };
            expect(detectMoveTargetingType(descAllInRange)).toBe('target-all');
        });

        it('defaults to single targeting when no area or multi-target patterns match', () => {
            expect(detectMoveTargetingType(testMove)).toBe('single');
            const singleTagMove = { ...testMove, desc: '[Target: Single Foe]' };
            expect(detectMoveTargetingType(singleTagMove)).toBe('single');
        });
    });

    describe('initializeMultiTargetRows target preselection', () => {
        const combatants: TargetOption[] = [
            { id: 'f1', name: 'Foe 1', def: 1, isTera: false, isPlayerSide: false, types: ['Normal'] },
            { id: 'f2', name: 'Foe 2', def: 1, isTera: false, isPlayerSide: false, types: ['Normal'] },
            { id: 'a1', name: 'Ally 1', def: 1, isTera: false, isPlayerSide: true, types: ['Normal'] },
            { id: 'a2', name: 'Ally 2', def: 1, isTera: false, isPlayerSide: true, types: ['Normal'] }
        ];

        const baseMove: MoveData = {
            id: 'surf',
            name: 'Surf',
            type: 'Water',
            category: 'Special',
            power: 3,
            acc1: 'Special',
            acc2: 'Channel',
            dmg1: 'Special',
            active: true
        };

        it('preselects up to maxTargets across all combatants (including allies) in area mode', () => {
            const rows = initializeMultiTargetRows(combatants, 'Water', false, null, undefined, 'area', 3);
            const selected = rows.filter((r) => r.selected);
            expect(selected).toHaveLength(3);
            expect(selected.map((r) => r.id)).toEqual(['f1', 'f2', 'a1']);
        });

        it('preselects player allies up to maxTargets in target-all mode when targeting allies', () => {
            const allyMove: MoveData = { ...baseMove, desc: '[Target: All Allies]' };
            const rows = initializeMultiTargetRows(combatants, 'Water', false, null, undefined, 'target-all', 2, allyMove);
            const selected = rows.filter((r) => r.selected);
            expect(selected).toHaveLength(2);
            expect(selected.every((r) => r.isPlayerSide)).toBe(true);
            expect(selected.map((r) => r.id)).toEqual(['a1', 'a2']);
        });

        it('preselects foes up to maxTargets in target-all mode when targeting foes', () => {
            const foeMove: MoveData = { ...baseMove, desc: '[Target: All Foes]' };
            const rows = initializeMultiTargetRows(combatants, 'Water', false, null, undefined, 'target-all', 1, foeMove);
            const selected = rows.filter((r) => r.selected);
            expect(selected).toHaveLength(1);
            expect(selected[0].id).toBe('f1');
            expect(selected[0].isPlayerSide).toBe(false);
        });
    });

    describe('tagBuilder getTargetOptions', () => {
        it('includes all required targeting options without emojis', () => {
            const options = getTargetOptions('targeting', []);
            expect(options).toEqual([
                'All Foes',
                'All Allies',
                'Allies & Self',
                'All on Field',
                'All Except Self',
                'Single Foe',
                'Single Ally'
            ]);
            options.forEach((opt) => {
                expect(/\p{Extended_Pictographic}/u.test(opt)).toBe(false);
            });
        });
    });
});

