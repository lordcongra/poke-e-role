// src/store/slices/movesSlice.ts
import type { StateCreator } from 'zustand';
import type { CharacterState, MovesSlice, MoveData, SkillCheck } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';

export const createMovesSlice: StateCreator<CharacterState, [], [], MovesSlice> = (set) => ({
    moves: [],
    skillChecks: [],

    addMove: () =>
        set((state) => {
            const newMoves: MoveData[] = [
                ...state.moves,
                {
                    id: crypto.randomUUID(),
                    active: false,
                    name: '',
                    type: '',
                    category: 'Physical',
                    acc1: 'str',
                    acc2: 'brawl',
                    dmg1: 'str',
                    power: 0,
                    desc: ''
                }
            ];
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves };
        }),
    updateMove: (id, field, value) =>
        set((state) => {
            const newMoves = state.moves.map((m) => (m.id === id ? { ...m, [field]: value } : m));
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves };
        }),
    removeMove: (id) =>
        set((state) => {
            const newMoves = state.moves.filter((m) => m.id !== id);
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves };
        }),
    moveUpMove: (id) =>
        set((state) => {
            const index = state.moves.findIndex((m) => m.id === id);
            if (index <= 0) return state;
            const newMoves = [...state.moves];
            [newMoves[index - 1], newMoves[index]] = [newMoves[index], newMoves[index - 1]];
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves };
        }),
    moveDownMove: (id) =>
        set((state) => {
            const index = state.moves.findIndex((m) => m.id === id);
            if (index < 0 || index >= state.moves.length - 1) return state;
            const newMoves = [...state.moves];
            [newMoves[index + 1], newMoves[index]] = [newMoves[index], newMoves[index + 1]];
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves };
        }),

    applyMoveData: (id, data) =>
        set((state) => {
            if (!data) return state;

            const mapAttr = (val: string) => {
                const v = (val || '').toLowerCase().trim();
                if (v.includes('str')) return 'str';
                if (v.includes('dex')) return 'dex';
                if (v.includes('vit')) return 'vit';
                if (v.includes('spe')) return 'spe';
                if (v.includes('ins')) return 'ins';
                if (v.includes('will')) return 'will';
                return '';
            };

            const mapSkill = (val: string) => {
                const v = (val || '').split('/')[0].toLowerCase().trim();
                const skills = [
                    'brawl',
                    'channel',
                    'clash',
                    'evasion',
                    'alert',
                    'athletic',
                    'nature',
                    'stealth',
                    'charm',
                    'etiquette',
                    'intimidate',
                    'perform',
                    'crafts',
                    'lore',
                    'medicine',
                    'magic'
                ];
                for (const s of skills) {
                    if (v.includes(s)) return s;
                }

                for (const cat of state.extraCategories) {
                    for (const sk of cat.skills) {
                        if (v === sk.id.toLowerCase() || (sk.name && v === sk.name.toLowerCase())) return sk.id;
                    }
                }

                return 'none';
            };

            const newMoves = state.moves.map((m) => {
                if (m.id === id) {
                    const rawCat = String(data.Category || 'Physical');
                    const cat = rawCat === 'Physical' ? 'Physical' : rawCat === 'Special' ? 'Special' : 'Status';
                    const rawDmg = String(data.Damage1 === 'None' ? '' : data.Damage1 || '');

                    let extraDesc = '';
                    if (String(data.Accuracy2 || '').includes('/')) {
                        extraDesc += `\n[Dual Acc: ${data.Accuracy2}]`;
                    }
                    if (String(data.Damage1 || '').includes('/')) {
                        extraDesc += `\n[Dual Dmg: ${data.Damage1}]`;
                    }

                    const cleanDesc = String(data.Effect || data.Description || m.desc || '');
                    const finalDesc = extraDesc ? `${cleanDesc}\n${extraDesc}` : cleanDesc;

                    return {
                        ...m,
                        name: String(data.Name || m.name),
                        type: String(data.Type || 'Normal'),
                        category: cat as 'Physical' | 'Special' | 'Status',
                        acc1: mapAttr(String(data.Accuracy1 || 'str')) || 'str',
                        acc2: mapSkill(String(data.Accuracy2 || 'none')),
                        dmg1: mapAttr(rawDmg),
                        power: data.Power !== undefined && data.Power !== '' ? Number(data.Power) : m.power,
                        desc: finalDesc.trim()
                    };
                }
                return m;
            });

            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves };
        }),

    addSkillCheck: () =>
        set((state) => {
            const newChecks: SkillCheck[] = [
                ...state.skillChecks,
                { id: crypto.randomUUID(), name: '', attr: 'ins', skill: 'none' }
            ];
            try {
                saveToOwlbear({ 'skill-checks-data': JSON.stringify(newChecks) });
            } catch (e) {}
            return { skillChecks: newChecks };
        }),
    updateSkillCheck: (id, field, value) =>
        set((state) => {
            const newChecks = state.skillChecks.map((c) => (c.id === id ? { ...c, [field]: value } : c));
            try {
                saveToOwlbear({ 'skill-checks-data': JSON.stringify(newChecks) });
            } catch (e) {}
            return { skillChecks: newChecks };
        }),
    removeSkillCheck: (id) =>
        set((state) => {
            const newChecks = state.skillChecks.filter((c) => c.id !== id);
            try {
                saveToOwlbear({ 'skill-checks-data': JSON.stringify(newChecks) });
            } catch (e) {}
            return { skillChecks: newChecks };
        })
});
