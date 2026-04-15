import type { StateCreator } from 'zustand';
import type { CharacterState, MovesSlice, MoveData, SkillCheck, PendingDualScale } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';

export const createMovesSlice: StateCreator<CharacterState, [], [], MovesSlice> = (set) => ({
    moves: [],
    skillChecks: [],
    pendingDualScale: null,

    setPendingDualScale: (data) => set({ pendingDualScale: data }),

    resolveDualScale: (moveId, acc1, acc2, dmg1, category) =>
        set((state) => {
            const newMoves = state.moves.map((m) => {
                if (m.id === moveId) {
                    return {
                        ...m,
                        ...(acc1 ? { acc1 } : {}),
                        ...(acc2 ? { acc2 } : {}),
                        ...(dmg1 ? { dmg1 } : {}),
                        ...(category ? { category } : {})
                    };
                }
                return m;
            });
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}
            return { moves: newMoves, pendingDualScale: null };
        }),

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

            const mapAttrOptions = (val: string) => {
                const options = (val || '')
                    .split('/')
                    .map((v) => {
                        const clean = v.toLowerCase().trim();
                        if (clean.includes('str')) return 'str';
                        if (clean.includes('dex')) return 'dex';
                        if (clean.includes('vit')) return 'vit';
                        if (clean.includes('spe')) return 'spe';
                        if (clean.includes('ins')) return 'ins';
                        if (clean.includes('will')) return 'will';
                        if (clean.includes('tou')) return 'tou';
                        if (clean.includes('coo')) return 'coo';
                        if (clean.includes('bea')) return 'bea';
                        if (clean.includes('cut')) return 'cut';
                        if (clean.includes('cle')) return 'cle';
                        return '';
                    })
                    .filter(Boolean);
                return options.length > 0 ? options : [''];
            };

            const mapSkillOptions = (val: string) => {
                const options = (val || '')
                    .split('/')
                    .map((v) => {
                        const clean = v.toLowerCase().trim();
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
                            if (clean.includes(s)) return s;
                        }

                        for (const cat of state.extraCategories) {
                            for (const sk of cat.skills) {
                                if (clean === sk.id.toLowerCase() || (sk.name && clean === sk.name.toLowerCase()))
                                    return sk.id;
                            }
                        }
                        return 'none';
                    })
                    .filter(Boolean);
                return options.length > 0 ? options : ['none'];
            };

            let newPendingDualScale: PendingDualScale | null = null;

            const newMoves = state.moves.map((m) => {
                if (m.id === id) {
                    const rawCat = String(data.Category || 'Physical').toLowerCase();
                    let cat: 'Physical' | 'Special' | 'Status' = 'Status';
                    let catOpts: ('Physical' | 'Special' | 'Status')[] | undefined = undefined;

                    if (rawCat === 'physical' || rawCat.includes('phys')) cat = 'Physical';
                    else if (rawCat === 'special' || rawCat.includes('spec')) cat = 'Special';
                    else if (rawCat === 'status' || rawCat.includes('stat') || rawCat.includes('sup')) cat = 'Status';
                    else {
                        cat = 'Physical';
                        catOpts = ['Physical', 'Special', 'Status'];
                    }

                    const acc1Opts = mapAttrOptions(String(data.Accuracy1 || 'str'));
                    const acc2Opts = mapSkillOptions(String(data.Accuracy2 || 'none'));
                    const dmg1Opts = mapAttrOptions(String(data.Damage1 === 'None' ? '' : data.Damage1 || ''));

                    if (acc1Opts.length > 1 || acc2Opts.length > 1 || dmg1Opts.length > 1 || catOpts) {
                        newPendingDualScale = {
                            moveId: m.id,
                            moveName: String(data.Name || m.name),
                            acc1Options: acc1Opts.length > 1 ? acc1Opts : undefined,
                            acc2Options: acc2Opts.length > 1 ? acc2Opts : undefined,
                            dmg1Options: dmg1Opts.length > 1 ? dmg1Opts : undefined,
                            categoryOptions: catOpts
                        };
                    }

                    const rawAcc1 = String(data.Accuracy1 || 'STR');
                    const rawAcc2 = String(data.Accuracy2 || 'None');
                    const rawDmg1 = String(data.Damage1 || 'None');

                    const accString = rawAcc2.toLowerCase() === 'none' ? `Accuracy: ${rawAcc1}` : `Accuracy: ${rawAcc1} + ${rawAcc2}`;
                    const dmgString = cat === 'Status' ? '' : `Damage: ${rawDmg1}`;

                    const rawDesc = String(data.Effect || data.Description || m.desc || '');
                    const retainedTags = rawDesc.match(/\[.*?\]/g)?.join(' ') || '';
                    
                    let cleanDesc = rawDesc.replace(/\[.*?\]/g, '').trim();
                    cleanDesc = cleanDesc.replace(/\n\nAccuracy:[\s\S]*/i, '').trim();

                    const finalDesc = `${cleanDesc}\n\n${accString}${dmgString ? '\n' + dmgString : ''}${retainedTags ? '\n\n' + retainedTags : ''}`.trim();

                    return {
                        ...m,
                        name: String(data.Name || m.name),
                        type: String(data.Type || 'Normal'),
                        category: cat,
                        acc1: acc1Opts[0] || 'str',
                        acc2: acc2Opts[0] || 'none',
                        dmg1: dmg1Opts[0] || '',
                        power: data.Power !== undefined && data.Power !== '' ? Number(data.Power) : m.power,
                        desc: finalDesc
                    };
                }
                return m;
            });

            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {}

            return {
                moves: newMoves,
                pendingDualScale: newPendingDualScale || state.pendingDualScale
            };
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