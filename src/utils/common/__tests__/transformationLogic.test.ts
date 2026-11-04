import { describe, it, expect, vi } from 'vitest';
import {
    processTransformation,
    processReversion,
    type TransformationDraft
} from '../transformationLogic';
import { createFormBackup } from '../macroHelpers';
import { calculateMaxHp } from '../../combat/combatMath';
import { CombatStat } from '../../../types/enums';
import type { CharacterState, CustomForm, MoveData } from '../../../store/storeTypes';
import { createTestCharacterState } from '../../../test/testStateHelpers';

vi.mock('../../api', () => ({
    fetchPokemonData: vi.fn(async () => null),
    fetchMoveData: vi.fn(async () => null),
    getCanonicalMoveName: vi.fn((name: string) => name)
}));

const makeStats = (str = 2, dex = 2, vit = 2, spe = 2, ins = 2) => {
    const s = (base: number) => ({ base, rank: 0, limit: 5, buff: 0, debuff: 0 });
    return { [CombatStat.STR]: s(str), [CombatStat.DEX]: s(dex), [CombatStat.VIT]: s(vit), [CombatStat.SPE]: s(spe), [CombatStat.INS]: s(ins) };
};

const createTestDraft = (state: CharacterState): TransformationDraft => ({
    identity: { ...state.identity },
    health: { ...state.health },
    will: { ...state.will },
    derived: { ...state.derived },
    stats: JSON.parse(JSON.stringify(state.stats)),
    socials: { ...state.socials },
    moves: [...state.moves],
    skills: { ...state.skills },
    statuses: [...state.statuses],
    effects: [...state.effects],
    trackers: { ...state.trackers }
});

describe('transformationLogic', () => {
    describe('Mega Evolution', () => {
        it('saves base form backup to baseFormData and updates activeTransformation', () => {
            const state = createTestCharacterState({
                identity: { species: 'Lucario', activeTransformation: 'None' },
                health: { temporaryHitPoints: 5, temporaryHitPointsMax: 5 }
            });
            const draft = createTestDraft(state);
            const updates: Record<string, unknown> = {};

            processTransformation(draft, state, updates, 'Mega');

            expect(draft.identity.activeTransformation).toBe('Mega');
            expect(draft.identity.baseFormData).toBeTruthy();
            expect(updates['base-form-data']).toBe(draft.identity.baseFormData);
            expect(draft.health.temporaryHitPoints).toBe(0);
            expect(updates['temporary-hit-points']).toBe(0);
        });

        it('saves to altFormData and restores base stats upon reversion', () => {
            const baseState = createTestCharacterState({ stats: makeStats(2, 2, 2, 2, 2) });
            const baseBackup = createFormBackup(baseState);

            const megaState = createTestCharacterState({
                identity: { activeTransformation: 'Mega', baseFormData: baseBackup },
                stats: makeStats(5, 4, 2, 4, 2)
            });
            const draft = createTestDraft(megaState);
            const updates: Record<string, unknown> = {};

            processReversion(draft, megaState, updates);

            expect(draft.identity.activeTransformation).toBe('None');
            expect(draft.identity.altFormData).toBeTruthy();
            expect(updates['alt-form-data']).toBe(draft.identity.altFormData);
            expect(draft.stats[CombatStat.STR].base).toBe(2);
            expect(updates[`${CombatStat.STR}-base`]).toBe(2);
        });

        it('invariant: fainted Pokémon (hpCurr <= 0) remains at 0 HP on reversion', () => {
            const baseState = createTestCharacterState({
                health: { hpCurr: 10, hpMax: 10, hpBase: 4, temporaryHitPoints: 0, temporaryHitPointsMax: 0 }
            });
            const baseBackup = createFormBackup(baseState);

            const faintedMegaState = createTestCharacterState({
                identity: {
                    activeTransformation: 'Mega',
                    baseFormData: baseBackup
                },
                health: { hpCurr: 0, hpMax: 10, hpBase: 4, temporaryHitPoints: 0, temporaryHitPointsMax: 0 }
            });
            const draft = createTestDraft(faintedMegaState);
            const updates: Record<string, unknown> = {};

            processReversion(draft, faintedMegaState, updates);

            expect(draft.health.hpCurr).toBe(0);
            expect(updates['hp-curr']).toBe(0);
        });
    });

    describe('Dynamax / Gigantamax', () => {
        it('Dynamax gives 6 Temp HP and 3-round timer; Gigantamax gives 12 Temp HP and +2 to buffs', () => {
            // Dynamax
            const dynaState = createTestCharacterState();
            const dynaDraft = createTestDraft(dynaState);
            const dynaUpdates: Record<string, unknown> = {};
            processTransformation(dynaDraft, dynaState, dynaUpdates, 'Dynamax');

            expect(dynaDraft.health.temporaryHitPoints).toBe(6);
            expect(dynaDraft.health.temporaryHitPointsMax).toBe(6);
            expect(dynaUpdates['temporary-hit-points']).toBe(6);
            expect(dynaDraft.effects).toContainEqual(expect.objectContaining({ name: 'Dynamax Timer', rounds: 3 }));

            // Gigantamax
            const gigaState = createTestCharacterState();
            const gigaDraft = createTestDraft(gigaState);
            const gigaUpdates: Record<string, unknown> = {};
            processTransformation(gigaDraft, gigaState, gigaUpdates, 'Gigantamax');

            expect(gigaDraft.health.temporaryHitPoints).toBe(12);
            expect(gigaDraft.health.temporaryHitPointsMax).toBe(12);
            expect(gigaDraft.stats[CombatStat.STR].buff).toBe(gigaState.stats[CombatStat.STR].buff + 2);
            expect(gigaDraft.stats[CombatStat.SPE].buff).toBe(gigaState.stats[CombatStat.SPE].buff + 2);
            expect(gigaDraft.stats[CombatStat.DEX].buff).toBe(gigaState.stats[CombatStat.DEX].buff + 2);
            expect(gigaDraft.derived.defBuff).toBe(gigaState.derived.defBuff + 2);
            expect(gigaDraft.derived.sdefBuff).toBe(gigaState.derived.sdefBuff + 2);
        });

        it('reversion clears Temp HP, removes timer, and decrements buffs by 2', () => {
            const activeGigaState = createTestCharacterState({
                identity: { activeTransformation: 'Gigantamax' },
                health: { temporaryHitPoints: 12, temporaryHitPointsMax: 12 },
                effects: [{ id: 'timer-1', name: 'Gigantamax Timer', rounds: 2 }],
                stats: {
                    ...makeStats(),
                    [CombatStat.STR]: { base: 2, rank: 0, limit: 5, buff: 3, debuff: 0 },
                    [CombatStat.SPE]: { base: 2, rank: 0, limit: 5, buff: 2, debuff: 0 },
                    [CombatStat.DEX]: { base: 2, rank: 0, limit: 5, buff: 2, debuff: 0 }
                },
                derived: { defBuff: 2, sdefBuff: 3 }
            });
            const draft = createTestDraft(activeGigaState);
            const updates: Record<string, unknown> = {};

            processReversion(draft, activeGigaState, updates);

            expect(draft.health.temporaryHitPoints).toBe(0);
            expect(draft.health.temporaryHitPointsMax).toBe(0);
            expect(updates['temporary-hit-points']).toBe(0);
            expect(draft.effects.some((e) => e.name.includes('Timer'))).toBe(false);
            expect(draft.stats[CombatStat.STR].buff).toBe(1); // 3 - 2
            expect(draft.stats[CombatStat.SPE].buff).toBe(0); // 2 - 2
            expect(draft.stats[CombatStat.DEX].buff).toBe(0); // 2 - 2
            expect(draft.derived.defBuff).toBe(0); // 2 - 2
            expect(draft.derived.sdefBuff).toBe(1); // 3 - 2
        });
    });

    describe('Terastallization', () => {
        it('sets affinity, injects Tera Blast move, and cleans up on reversion', () => {
            const state = createTestCharacterState();
            const draft = createTestDraft(state);
            const updates: Record<string, unknown> = {};

            processTransformation(
                draft,
                state,
                updates,
                'Terastallize',
                undefined,
                'Electric',
                { category: 'Special', acc1: 'spe', acc2: 'none', dmg1: 'spe' }
            );

            expect(draft.identity.terastallizeAffinity).toBe('Electric');
            expect(draft.identity.terastallizeBonusActive).toBe(true);
            expect(updates['terastallize-affinity']).toBe('Electric');
            const teraBlast = draft.moves.find((m) => m.name === 'Tera Blast');
            expect(teraBlast).toBeDefined();
            expect(teraBlast?.type).toBe('Electric');
            expect(teraBlast?.power).toBe(3);

            // Reversion
            const activeTeraState = createTestCharacterState({
                identity: { activeTransformation: 'Terastallize', terastallizeAffinity: 'Electric', terastallizeBonusActive: true },
                moves: [teraBlast as MoveData]
            });
            const revertDraft = createTestDraft(activeTeraState);
            const revertUpdates: Record<string, unknown> = {};

            processReversion(revertDraft, activeTeraState, revertUpdates);

            expect(revertDraft.identity.terastallizeAffinity).toBe('');
            expect(revertDraft.identity.terastallizeBonusActive).toBe(false);
            expect(revertDraft.moves.some((m) => m.name === 'Tera Blast')).toBe(false);
        });
    });

    describe('Custom Forms & Stance Change', () => {
        const createForm = (overrides: Partial<CustomForm>): CustomForm => ({
            id: 'f1', name: 'Form', description: '', tags: '', grantedMoves: [],
            swapBaseStats: false, swapStatLimits: false, swapStatRanks: false, swapSkills: false,
            swapMoves: false, swapTyping: false, swapAbilities: false, swapBuffs: false, swapDebuffs: false,
            freshBuffs: false, freshDebuffs: false, wipeBuffs: false, wipeDebuffs: false,
            swapStatuses: false, freshStatuses: false, wipeStatuses: false, restoreHp: false,
            restoreWill: false, healHp: false, healWill: false, activationCostHp: 0, activationCostWill: 0,
            tempHp: 0, tempWill: 0, ...overrides
        });

        const bladeForm = createForm({
            id: 'form-blade',
            name: 'Blade Forme',
            swapBaseStats: true,
            swapStatLimits: true,
            shareHighestHp: true,
            grantedMoves: ['Sacred Sword']
        });

        it('applies custom form swap flags and cleans up grantedMoves on reversion', () => {
            const baseState = createTestCharacterState({
                roomCustomForms: [bladeForm],
                moves: [{ id: 'm-slash', name: 'Slash', type: 'Normal', category: 'Physical', acc1: 'str', acc2: 'none', dmg1: 'str', power: 2, desc: '', active: false, marker: '' }]
            });
            const draft = createTestDraft(baseState);
            const updates: Record<string, unknown> = {};

            processTransformation(draft, baseState, updates, 'Custom', 'form-blade');

            expect(draft.identity.activeFormId).toBe('form-blade');
            expect(draft.identity.customFormConfig?.restoreBaseStats).toBe(true);
            expect(draft.moves.some((m) => m.name === 'Sacred Sword')).toBe(true);

            // Reversion cleans up granted moves
            const activeCustomState = createTestCharacterState({
                identity: { activeTransformation: 'Custom', activeFormId: 'form-blade' },
                roomCustomForms: [bladeForm],
                moves: [...draft.moves]
            });
            const revertDraft = createTestDraft(activeCustomState);
            const revertUpdates: Record<string, unknown> = {};

            processReversion(revertDraft, activeCustomState, revertUpdates);

            expect(revertDraft.moves.some((m) => m.name === 'Sacred Sword')).toBe(false);
            expect(revertDraft.moves.some((m) => m.name === 'Slash')).toBe(true);
        });

        it('validates shareHighestHp so Max HP does not drop in lower-vitality forms', () => {
            // Blade Form has lower VIT (1), but base form had Max HP of 8 backed up in baseFormData
            const baseBackup = JSON.stringify({ hpMax: 8 });
            const bladeState = createTestCharacterState({
                identity: {
                    activeTransformation: 'Custom',
                    activeFormId: 'form-blade',
                    baseFormData: baseBackup
                },
                roomCustomForms: [bladeForm],
                health: { hpBase: 4, hpCurr: 8, hpMax: 8, temporaryHitPoints: 0, temporaryHitPointsMax: 0 },
                stats: {
                    [CombatStat.VIT]: { base: 1, rank: 0, limit: 5, buff: 0, debuff: 0 }
                }
            });

            // Without shareHighestHp, hpBase(4) + vit(1) = 5. With shareHighestHp, returns 8.
            const calculatedHpInBlade = calculateMaxHp(bladeState);
            expect(calculatedHpInBlade).toBe(8);

            // In Base Form, check that a saved form with shareHighestHp preserves its higher Max HP
            const baseFormState = createTestCharacterState({
                identity: {
                    activeTransformation: 'None',
                    formSaves: {
                        'form-blade': JSON.stringify({ hpMax: 10 })
                    }
                },
                roomCustomForms: [bladeForm],
                health: { hpBase: 4, hpCurr: 6, hpMax: 6, temporaryHitPoints: 0, temporaryHitPointsMax: 0 },
                stats: {
                    [CombatStat.VIT]: { base: 2, rank: 0, limit: 5, buff: 0, debuff: 0 }
                }
            });

            const calculatedHpInBase = calculateMaxHp(baseFormState);
            expect(calculatedHpInBase).toBe(10);
        });
    });
});
