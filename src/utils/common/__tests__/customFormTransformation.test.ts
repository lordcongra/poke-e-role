import { describe, it, expect, vi } from 'vitest';
import {
    processTransformation,
    processReversion,
    handleTokenImageSwap,
    type TransformationDraft
} from '../transformationLogic';
import { createFormBackup } from '../macroHelpers';
import { calculateMaxWill } from '../../combat/combatMath';
import { CombatStat, SocialStat } from '../../../types/enums';
import type { CharacterState, CustomForm } from '../../../store/storeTypes';
import { createTestCharacterState } from '../../../test/testStateHelpers';

vi.mock('../../api', () => ({
    fetchPokemonData: vi.fn(async () => null),
    fetchMoveData: vi.fn(async () => null),
    getCanonicalMoveName: vi.fn((name: string) => name)
}));

const makeCustomForm = (overrides: Partial<CustomForm> = {}): CustomForm => ({
    id: 'form-1', name: 'Blade Form', description: '', swapBaseStats: false, swapStatLimits: false,
    swapStatRanks: false, swapSkills: false, swapMoves: false, swapTyping: false, swapAbilities: false,
    swapBuffs: false, swapDebuffs: false, freshBuffs: false, freshDebuffs: false, wipeBuffs: false,
    wipeDebuffs: false, swapStatuses: false, freshStatuses: false, wipeStatuses: false, restoreHp: false,
    restoreWill: false, healHp: false, healWill: false, activationCostHp: 0, activationCostWill: 0,
    grantedMoves: [], tags: '', tempHp: 0, tempWill: 0, ...overrides
});

const createTestDraft = (state: CharacterState): TransformationDraft => ({
    identity: { ...state.identity }, health: { ...state.health }, will: { ...state.will },
    derived: { ...state.derived }, stats: JSON.parse(JSON.stringify(state.stats)),
    socials: JSON.parse(JSON.stringify(state.socials)), moves: [...state.moves],
    skills: { ...state.skills }, statuses: [...state.statuses], effects: [...state.effects],
    trackers: { ...state.trackers }
});

describe('customFormTransformation', () => {
    describe('CustomForm reset flags (freshBuffs/wipeBuffs and freshDebuffs/wipeDebuffs)', () => {
        it('zeros all 5 CombatStats, 5 SocialStats, and derived def/sdef buffs on freshBuffs or wipeBuffs', () => {
            const form = makeCustomForm({ id: 'f-buff', freshBuffs: true });
            const state = createTestCharacterState({ roomCustomForms: [form] });
            const draft = createTestDraft(state);
            Object.values(CombatStat).forEach((s) => { draft.stats[s].buff = 2; });
            Object.values(SocialStat).forEach((s) => { draft.socials[s].buff = 3; });
            draft.derived.defBuff = 2;
            draft.derived.sdefBuff = 2;

            const updates: Record<string, unknown> = {};
            processTransformation(draft, state, updates, 'Custom', 'f-buff');

            Object.values(CombatStat).forEach((s) => {
                expect(draft.stats[s].buff).toBe(0);
                expect(updates[`${s}-buff`]).toBe(0);
            });
            Object.values(SocialStat).forEach((s) => { expect(draft.socials[s].buff).toBe(0); });
            expect(draft.derived.defBuff).toBe(0);
            expect(draft.derived.sdefBuff).toBe(0);
            expect(updates['def-buff']).toBe(0);
            expect(updates['spd-buff']).toBe(0);
        });

        it('zeros all 5 CombatStats, 5 SocialStats, and derived def/sdef debuffs on freshDebuffs or wipeDebuffs', () => {
            const form = makeCustomForm({ id: 'f-debuff', wipeDebuffs: true });
            const state = createTestCharacterState({ roomCustomForms: [form] });
            const draft = createTestDraft(state);
            Object.values(CombatStat).forEach((s) => { draft.stats[s].debuff = 2; });
            Object.values(SocialStat).forEach((s) => { draft.socials[s].debuff = 1; });
            draft.derived.defDebuff = 2;
            draft.derived.sdefDebuff = 2;

            const updates: Record<string, unknown> = {};
            processTransformation(draft, state, updates, 'Custom', 'f-debuff');

            Object.values(CombatStat).forEach((s) => {
                expect(draft.stats[s].debuff).toBe(0);
                expect(updates[`${s}-debuff`]).toBe(0);
            });
            Object.values(SocialStat).forEach((s) => { expect(draft.socials[s].debuff).toBe(0); });
            expect(draft.derived.defDebuff).toBe(0);
            expect(draft.derived.sdefDebuff).toBe(0);
            expect(updates['def-debuff']).toBe(0);
            expect(updates['spd-debuff']).toBe(0);
        });
    });

    describe('CustomForm status reset', () => {
        it('resets statuses to a single Healthy item on freshStatuses or wipeStatuses', () => {
            const form = makeCustomForm({ id: 'f-status', freshStatuses: true });
            const state = createTestCharacterState({
                roomCustomForms: [form],
                statuses: [
                    { id: 'st-1', name: 'Burn', customName: '', rounds: 2 },
                    { id: 'st-2', name: 'Poison', customName: '', rounds: 1 }
                ]
            });
            const draft = createTestDraft(state);
            const updates: Record<string, unknown> = {};

            processTransformation(draft, state, updates, 'Custom', 'f-status');

            expect(draft.statuses).toHaveLength(1);
            expect(draft.statuses[0].name).toBe('Healthy');
            expect(updates['status-list']).toBe(JSON.stringify(draft.statuses));
        });
    });

    describe('CustomForm temp pools initialization & pre-wiping', () => {
        it('initializes tempHp and tempWill from targetForm', () => {
            const form = makeCustomForm({ id: 'f-temp', tempHp: 8, tempWill: 4 });
            const state = createTestCharacterState({ roomCustomForms: [form] });
            const draft = createTestDraft(state);
            const updates: Record<string, unknown> = {};

            processTransformation(draft, state, updates, 'Custom', 'f-temp');

            expect(draft.health.temporaryHitPoints).toBe(8);
            expect(draft.health.temporaryHitPointsMax).toBe(8);
            expect(draft.will.temporaryWill).toBe(4);
            expect(draft.will.temporaryWillMax).toBe(4);
            expect(updates['temporary-hit-points']).toBe(8);
            expect(updates['temporary-will']).toBe(4);
        });

        it('pre-wipes existing temp resources when restoreHp or restoreWill is true', () => {
            const form = makeCustomForm({ id: 'f-wipe-temp', restoreHp: true, restoreWill: true });
            const state = createTestCharacterState({
                roomCustomForms: [form],
                health: { temporaryHitPoints: 6, temporaryHitPointsMax: 6 },
                will: { temporaryWill: 3, temporaryWillMax: 3 }
            });
            const draft = createTestDraft(state);
            const updates: Record<string, unknown> = {};

            processTransformation(draft, state, updates, 'Custom', 'f-wipe-temp');

            expect(draft.health.temporaryHitPoints).toBe(0);
            expect(draft.health.temporaryHitPointsMax).toBe(0);
            expect(draft.will.temporaryWill).toBe(0);
            expect(draft.will.temporaryWillMax).toBe(0);
        });
    });

    describe('CustomForm reversion cleanup', () => {
        it('wipes temp HP and temp Will on reversion when activeForm.restoreHp, restoreWill, or temp pools > 0', () => {
            const form = makeCustomForm({ id: 'f-rev', restoreHp: true, tempWill: 5 });
            const baseState = createTestCharacterState({ health: { temporaryHitPoints: 0 }, will: { temporaryWill: 0 } });
            const baseBackup = createFormBackup(baseState);
            const transformedState = createTestCharacterState({
                identity: { activeTransformation: 'Custom', activeFormId: 'f-rev', baseFormData: baseBackup },
                roomCustomForms: [form],
                health: { temporaryHitPoints: 10, temporaryHitPointsMax: 10 },
                will: { temporaryWill: 5, temporaryWillMax: 5 }
            });
            const draft = createTestDraft(transformedState);
            const updates: Record<string, unknown> = {};

            processReversion(draft, transformedState, updates);

            expect(draft.health.temporaryHitPoints).toBe(0);
            expect(draft.health.temporaryHitPointsMax).toBe(0);
            expect(draft.will.temporaryWill).toBe(0);
            expect(draft.will.temporaryWillMax).toBe(0);
            expect(updates['temporary-hit-points']).toBe(0);
            expect(updates['temporary-will']).toBe(0);
        });
    });

    describe('token image swap (handleTokenImageSwap)', () => {
        it('swaps image for Mega, Max, Tera, Custom form, and restores on reversion', () => {
            const state = createTestCharacterState({
                identity: {
                    tokenImageUrl: 'http://img/base.png',
                    megaImageUrl: 'http://img/mega.png',
                    maxImageUrl: 'http://img/max.png',
                    teraImageUrl: 'http://img/tera.png',
                    customFormImages: { 'cf-x': 'http://img/custom-x.png' }
                }
            });

            // Mega
            const draftMega = createTestDraft(state);
            const updatesMega: Record<string, unknown> = {};
            handleTokenImageSwap(state, draftMega, updatesMega, false, 'Mega');
            expect(draftMega.identity.tokenImageUrl).toBe('http://img/mega.png');
            expect(updatesMega['tokenImageUrl']).toBe('http://img/mega.png');

            // Max
            const draftMax = createTestDraft(state);
            const updatesMax: Record<string, unknown> = {};
            handleTokenImageSwap(state, draftMax, updatesMax, false, 'Dynamax');
            expect(draftMax.identity.tokenImageUrl).toBe('http://img/max.png');

            // Tera
            const draftTera = createTestDraft(state);
            const updatesTera: Record<string, unknown> = {};
            handleTokenImageSwap(state, draftTera, updatesTera, false, 'Terastallize');
            expect(draftTera.identity.tokenImageUrl).toBe('http://img/tera.png');

            // Custom
            const draftCustom = createTestDraft(state);
            const updatesCustom: Record<string, unknown> = {};
            handleTokenImageSwap(state, draftCustom, updatesCustom, false, 'Custom', 'cf-x');
            expect(draftCustom.identity.tokenImageUrl).toBe('http://img/custom-x.png');

            // Reversion with restoreImage = true
            const draftRev = createTestDraft(state);
            draftRev.identity.tokenImageUrl = 'http://img/base.png';
            const updatesRev: Record<string, unknown> = {};
            handleTokenImageSwap(state, draftRev, updatesRev, true, 'None', undefined, { restoreImage: true });
            expect(updatesRev['tokenImageUrl']).toBe('http://img/base.png');
        });
    });

    describe('re-transforming into existing saved form vs first-time initialization', () => {
        it('restores cached snapshot from formSaves when re-transforming', () => {
            const form = makeCustomForm({ id: 'cf-saved', swapTyping: true, swapBaseStats: true });
            const savedState = createTestCharacterState({
                identity: { type1: 'Ghost', type2: 'Steel' }
            });
            savedState.stats[CombatStat.STR].base = 6;
            const savedBackup = createFormBackup(savedState);
            const state = createTestCharacterState({
                identity: { formSaves: { 'cf-saved': savedBackup } },
                roomCustomForms: [form]
            });
            const draft = createTestDraft(state);
            draft.identity.formSaves = { 'cf-saved': savedBackup };
            const updates: Record<string, unknown> = {};

            processTransformation(draft, state, updates, 'Custom', 'cf-saved');

            expect(draft.identity.type1).toBe('Ghost');
            expect(draft.identity.type2).toBe('Steel');
            expect(draft.stats[CombatStat.STR].base).toBe(6);
        });
    });

    describe('shareHighestWill calculation', () => {
        it('preserves highest max Will across forms with shareHighestWill enabled', () => {
            const form = makeCustomForm({ id: 'cf-stance', shareHighestWill: true });

            // Transformed state: baseFormData has willMax: 9, while transformed will is lower (4)
            const transformedState = createTestCharacterState({
                identity: {
                    activeTransformation: 'Custom',
                    activeFormId: 'cf-stance',
                    baseFormData: JSON.stringify({ willMax: 9 })
                },
                roomCustomForms: [form],
                will: { willBase: 3, willCurr: 4, willMax: 4 },
                stats: { ins: { base: 1, rank: 0, limit: 5, buff: 0, debuff: 0 } }
            });
            expect(calculateMaxWill(transformedState)).toBe(9);

            // In Base Form: saved form with shareHighestWill had willMax: 10
            const baseState = createTestCharacterState({
                identity: {
                    activeTransformation: 'None',
                    formSaves: { 'cf-stance': JSON.stringify({ willMax: 10 }) }
                },
                roomCustomForms: [form],
                will: { willBase: 3, willCurr: 4, willMax: 4 },
                stats: { ins: { base: 1, rank: 0, limit: 5, buff: 0, debuff: 0 } }
            });
            expect(calculateMaxWill(baseState)).toBe(10);
        });
    });
});
