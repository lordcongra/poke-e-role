import type { StateCreator } from 'zustand';
import type { CharacterState, MovesSlice, MoveData, SkillCheck, PendingDualScale } from '../storeTypes';
import { saveToOwlbear } from '../../utils/sync/obr';

export const createMovesSlice: StateCreator<CharacterState, [], [], MovesSlice> = (set) => ({
    moves: [],
    skillChecks: [],
    pendingDualScale: null,
    wishlist: [],

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
                        ...(category ? { category } : {}),
                        dualScaleSelected: true
                    };
                }
                return m;
            });
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save resolved dual scale to Owlbear.', e);
            }
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
                    desc: '',
                    marker: ''
                }
            ];
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save new move to Owlbear.', e);
            }
            return { moves: newMoves };
        }),
    updateMove: (id, field, value) =>
        set((state) => {
            const newMoves = state.moves.map((m) => (m.id === id ? { ...m, [field]: value } : m));
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save updated move to Owlbear.', e);
            }
            return { moves: newMoves };
        }),
    removeMove: (id) =>
        set((state) => {
            const newMoves = state.moves.filter((m) => m.id !== id);
            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save removed move to Owlbear.', e);
            }
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
            } catch (e) {
                console.warn('[MovesSlice] Failed to save reordered move to Owlbear.', e);
            }
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
            } catch (e) {
                console.warn('[MovesSlice] Failed to save reordered move to Owlbear.', e);
            }
            return { moves: newMoves };
        }),

    applyMoveData: (id, data) =>
        set((state) => {
            if (!data) return state;

            const mapAttrOptions = (val: string) => {
                const rawParts = (val || '')
                    .split(/[/,]|(?:\s+or\s+)/i)
                    .map((v) => v.trim())
                    .filter(Boolean);
                const options: string[] = [];
                for (const clean of rawParts.map((v) => v.toLowerCase())) {
                    let matched = '';
                    if (clean.includes('str')) matched = 'str';
                    else if (clean.includes('dex')) matched = 'dex';
                    else if (clean.includes('vit')) matched = 'vit';
                    else if (clean.includes('spe')) matched = 'spe';
                    else if (clean.includes('ins')) matched = 'ins';
                    else if (clean.includes('will')) matched = 'will';
                    else if (clean.includes('tou')) matched = 'tou';
                    else if (clean.includes('coo')) matched = 'coo';
                    else if (clean.includes('bea')) matched = 'bea';
                    else if (clean.includes('cut')) matched = 'cut';
                    else if (clean.includes('cle')) matched = 'cle';
                    if (matched && !options.includes(matched)) {
                        options.push(matched);
                    }
                }
                return options.length > 0 ? options : [''];
            };

            const mapSkillOptions = (val: string) => {
                const rawParts = (val || '')
                    .split(/[/,]|(?:\s+or\s+)/i)
                    .map((v) => v.trim())
                    .filter(Boolean);
                const options: string[] = [];
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

                for (const clean of rawParts.map((v) => v.toLowerCase())) {
                    let matched = '';
                    for (const s of skills) {
                        if (clean.includes(s)) {
                            matched = s;
                            break;
                        }
                    }
                    if (!matched) {
                        for (const cat of state.extraCategories) {
                            for (const sk of cat.skills) {
                                if (clean === sk.id.toLowerCase() || (sk.name && clean === sk.name.toLowerCase())) {
                                    matched = sk.id;
                                    break;
                                }
                            }
                            if (matched) break;
                        }
                    }
                    if (matched && !options.includes(matched)) {
                        options.push(matched);
                    }
                }
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

                    // Combine Damage1 and Damage2 to capture both "Strength/Dexterity" and Damage1: Strength, Damage2: Dexterity
                    const rawDamageCandidate = [data.Damage1, data.Damage2]
                        .filter((d) => d && d !== 'None' && String(d).trim() !== '')
                        .join('/');
                    const dmg1Opts = mapAttrOptions(rawDamageCandidate);

                    const isNameUnchanged =
                        !m.name ||
                        m.name.trim().toLowerCase() ===
                            String(data.Name || m.name)
                                .trim()
                                .toLowerCase();
                    const isResolvedDualScale = Boolean(m.dualScaleSelected && isNameUnchanged);

                    if (
                        !isResolvedDualScale &&
                        (acc1Opts.length > 1 || acc2Opts.length > 1 || dmg1Opts.length > 1 || catOpts)
                    ) {
                        newPendingDualScale = {
                            moveId: m.id,
                            moveName: String(data.Name || m.name),
                            acc1Options: acc1Opts.length > 1 ? acc1Opts : undefined,
                            acc2Options: acc2Opts.length > 1 ? acc2Opts : undefined,
                            dmg1Options: dmg1Opts.length > 1 ? dmg1Opts : undefined,
                            categoryOptions: catOpts
                        };
                    }

                    const formatStatName = (raw?: string): string => {
                        if (!raw) return '';
                        const trimmed = raw.trim();
                        if (!trimmed) return '';
                        return trimmed
                            .split('/')
                            .map((segment) =>
                                segment
                                    .trim()
                                    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                                    .trim()
                            )
                            .join(' / ');
                    };

                    const formatDamageDesc = (dmg1?: string, dmg2?: string): string => {
                        const d1 = formatStatName(dmg1);
                        const d2 = formatStatName(dmg2);
                        if (!d1 && !d2) return 'None';
                        if (!d2 || d2 === 'None') return d1 || 'None';
                        if (!d1 || d1 === 'None') return d2;

                        const d2Attrs = mapAttrOptions(d2);
                        const isD2Attribute = d2Attrs.length > 0 && d2Attrs[0] !== '';
                        if (isD2Attribute) {
                            return `${d1} / ${d2}`;
                        }
                        return `${d1} + ${d2}`;
                    };

                    const rawAcc1 = formatStatName(String(data.Accuracy1 || 'STR'));
                    const rawAcc2 = formatStatName(String(data.Accuracy2 || 'None'));
                    const rawDmgDesc = formatDamageDesc(
                        data.Damage1 !== undefined ? String(data.Damage1) : undefined,
                        data.Damage2 !== undefined ? String(data.Damage2) : undefined
                    );

                    const accString =
                        rawAcc2.toLowerCase() === 'none' ? `Accuracy: ${rawAcc1}` : `Accuracy: ${rawAcc1} + ${rawAcc2}`;
                    const dmgString = cat === 'Status' ? '' : `Damage: ${rawDmgDesc}`;

                    const rawDesc = String(data.Effect || data.Description || m.desc || '');
                    const retainedTags = rawDesc.match(/\[.*?\]/g)?.join(' ') || '';

                    let cleanDesc = rawDesc.replace(/\[.*?\]/g, '').trim();
                    cleanDesc = cleanDesc.replace(/\n\nAccuracy:[\s\S]*/i, '').trim();

                    const finalDesc =
                        `${cleanDesc}\n\n${accString}${dmgString ? '\n' + dmgString : ''}${retainedTags ? '\n\n' + retainedTags : ''}`.trim();

                    return {
                        ...m,
                        name: String(data.Name || m.name),
                        type: String(data.Type || 'Normal'),
                        category: isResolvedDualScale ? m.category : cat,
                        acc1: isResolvedDualScale ? m.acc1 : acc1Opts[0] || 'str',
                        acc2: isResolvedDualScale ? m.acc2 : acc2Opts[0] || 'none',
                        dmg1: isResolvedDualScale ? m.dmg1 : dmg1Opts[0] || '',
                        power: data.Power !== undefined && data.Power !== '' ? Number(data.Power) : m.power,
                        desc: finalDesc,
                        marker: m.marker || '',
                        dualScaleSelected: isResolvedDualScale
                    };
                }
                return m;
            });

            try {
                saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save applied move data to Owlbear.', e);
            }

            return {
                moves: newMoves,
                pendingDualScale:
                    newPendingDualScale || (state.pendingDualScale?.moveId === id ? null : state.pendingDualScale)
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
            } catch (e) {
                console.warn('[MovesSlice] Failed to save added skill check to Owlbear.', e);
            }
            return { skillChecks: newChecks };
        }),
    updateSkillCheck: (id, field, value) =>
        set((state) => {
            const newChecks = state.skillChecks.map((c) => (c.id === id ? { ...c, [field]: value } : c));
            try {
                saveToOwlbear({ 'skill-checks-data': JSON.stringify(newChecks) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save updated skill check to Owlbear.', e);
            }
            return { skillChecks: newChecks };
        }),
    removeSkillCheck: (id) =>
        set((state) => {
            const newChecks = state.skillChecks.filter((c) => c.id !== id);
            try {
                saveToOwlbear({ 'skill-checks-data': JSON.stringify(newChecks) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save removed skill check to Owlbear.', e);
            }
            return { skillChecks: newChecks };
        }),
    addToWishlist: (moveName) =>
        set((state) => {
            const clean = moveName.trim();
            if (!clean) return state;
            if (state.wishlist.some((m) => m.toLowerCase() === clean.toLowerCase())) return state;
            const newWishlist = [...state.wishlist, clean];
            try {
                saveToOwlbear({ 'moves-wishlist-data': JSON.stringify(newWishlist) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save wishlist to Owlbear.', e);
            }
            return { wishlist: newWishlist };
        }),
    removeFromWishlist: (moveName) =>
        set((state) => {
            const clean = moveName.trim().toLowerCase();
            const newWishlist = state.wishlist.filter((m) => m.toLowerCase() !== clean);
            try {
                saveToOwlbear({ 'moves-wishlist-data': JSON.stringify(newWishlist) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save wishlist to Owlbear.', e);
            }
            return { wishlist: newWishlist };
        }),
    toggleWishlist: (moveName) =>
        set((state) => {
            const clean = moveName.trim();
            if (!clean) return state;
            const exists = state.wishlist.some((m) => m.toLowerCase() === clean.toLowerCase());
            const newWishlist = exists
                ? state.wishlist.filter((m) => m.toLowerCase() !== clean.toLowerCase())
                : [...state.wishlist, clean];
            try {
                saveToOwlbear({ 'moves-wishlist-data': JSON.stringify(newWishlist) });
            } catch (e) {
                console.warn('[MovesSlice] Failed to save wishlist to Owlbear.', e);
            }
            return { wishlist: newWishlist };
        })
});
