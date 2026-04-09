import type { StateCreator } from 'zustand';
import type { CharacterState, TrackerSlice } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';

export const createTrackerSlice: StateCreator<CharacterState, [], [], TrackerSlice> = (set) => ({
    statuses: [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }],
    effects: [],
    trackers: {
        actions: 0,
        evade: false,
        clash: false,
        chances: 0,
        fate: 0,
        globalAcc: 0,
        globalDmg: 0,
        globalSucc: 0,
        globalChance: 0,
        ignoredPain: 0,
        firstHitAcc: false,
        firstHitDmg: false
    },

    addStatus: () =>
        set((state) => {
            const newStatuses = [
                ...state.statuses,
                { id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }
            ];
            try {
                saveToOwlbear({ 'status-list': JSON.stringify(newStatuses) });
            } catch (e) {}
            return { statuses: newStatuses };
        }),
    updateStatus: (id, field, value) =>
        set((state) => {
            const newStatuses = state.statuses.map((s) => (s.id === id ? { ...s, [field]: value } : s));
            try {
                saveToOwlbear({ 'status-list': JSON.stringify(newStatuses) });
            } catch (e) {}
            return { statuses: newStatuses };
        }),
    removeStatus: (id) =>
        set((state) => {
            const newStatuses = state.statuses.filter((s) => s.id !== id);
            if (newStatuses.length === 0)
                newStatuses.push({ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 });
            try {
                saveToOwlbear({ 'status-list': JSON.stringify(newStatuses) });
            } catch (e) {}
            return { statuses: newStatuses };
        }),

    addEffect: () =>
        set((state) => {
            const newEffects = [...state.effects, { id: crypto.randomUUID(), name: '', rounds: 0 }];
            try {
                saveToOwlbear({ 'effects-data': JSON.stringify(newEffects) });
            } catch (e) {}
            return { effects: newEffects };
        }),
    updateEffect: (id, field, value) =>
        set((state) => {
            const newEffects = state.effects.map((e) => (e.id === id ? { ...e, [field]: value } : e));
            try {
                saveToOwlbear({ 'effects-data': JSON.stringify(newEffects) });
            } catch (e) {}
            return { effects: newEffects };
        }),
    removeEffect: (id) =>
        set((state) => {
            const newEffects = state.effects.filter((e) => e.id !== id);
            try {
                saveToOwlbear({ 'effects-data': JSON.stringify(newEffects) });
            } catch (e) {}
            return { effects: newEffects };
        }),

    updateTracker: (field, value) =>
        set((state) => {
            const newTrackers = { ...state.trackers, [field]: value };

            let obrKey = String(field);
            if (field === 'actions') obrKey = 'actions-used';
            else if (field === 'evade') obrKey = 'evasions-used';
            else if (field === 'clash') obrKey = 'clashes-used';
            else if (field === 'chances') obrKey = 'chances-used';
            else if (field === 'fate') obrKey = 'fate-used';
            else if (field === 'globalAcc') obrKey = 'global-acc-mod';
            else if (field === 'globalDmg') obrKey = 'global-dmg-mod';
            else if (field === 'globalSucc') obrKey = 'global-succ-mod';
            else if (field === 'globalChance') obrKey = 'global-chance-mod';
            else if (field === 'ignoredPain') obrKey = 'ignored-pain-mod';
            else if (field === 'firstHitAcc') obrKey = 'first-hit-acc-active';
            else if (field === 'firstHitDmg') obrKey = 'first-hit-dmg-active';

            try {
                saveToOwlbear({ [obrKey]: value });
            } catch (e) {}
            return { trackers: newTrackers };
        }),

    incrementAction: () =>
        set((state) => {
            if (state.trackers.actions >= 5) return state;
            const newActions = state.trackers.actions + 1;
            try {
                saveToOwlbear({ 'actions-used': newActions });
            } catch (e) {}
            return { trackers: { ...state.trackers, actions: newActions } };
        }),

    resetRound: () =>
        set((state) => {
            const newEffects = state.effects
                .map((e) => ({ ...e, rounds: Math.max(0, e.rounds - 1) }))
                .filter((e) => e.rounds > 0);
            const newMoves = state.moves.map((m) => ({ ...m, active: false }));

            try {
                saveToOwlbear({
                    'actions-used': 0,
                    'evasions-used': false,
                    'clashes-used': false,
                    'chances-used': 0,
                    'fate-used': 0,
                    'effects-data': JSON.stringify(newEffects),
                    'moves-data': JSON.stringify(newMoves)
                });
            } catch (e) {}

            return {
                trackers: { ...state.trackers, actions: 0, evade: false, clash: false, chances: 0, fate: 0 },
                effects: newEffects,
                moves: newMoves
            };
        }),
    longRest: () =>
        set((state) => {
            const newStatuses = state.statuses.filter((s) => s.name === 'Healthy');
            if (newStatuses.length === 0)
                newStatuses.push({ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 });

            try {
                saveToOwlbear({
                    'hp-curr': state.health.hpMax,
                    'will-curr': state.will.willMax,
                    'ignored-pain-mod': 0,
                    'status-list': JSON.stringify(newStatuses)
                });
            } catch (e) {}

            return {
                health: { ...state.health, hpCurr: state.health.hpMax },
                will: { ...state.will, willCurr: state.will.willMax },
                trackers: { ...state.trackers, ignoredPain: 0 },
                statuses: newStatuses
            };
        })
});
