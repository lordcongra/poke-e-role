// src/store/useCharacterStore.ts
import { create } from 'zustand';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { saveToOwlbear } from '../utils/obr';

export interface SkillCheck { id: string; name: string; attr: string; skill: string; }
export interface StatData { base: number; rank: number; buff: number; debuff: number; limit: number; }
export interface SkillData { base: number; buff: number; }
export type Rank = 'Starter' | 'Rookie' | 'Standard' | 'Advanced' | 'Expert' | 'Ace' | 'Master' | 'Champion';

export interface PokemonJSON {
    Name: string; Type1: string; Type2: string; BaseHP: number;
    Strength: number; MaxStrength: number; Dexterity: number; MaxDexterity: number;
    Vitality: number; MaxVitality: number; Special: number; MaxSpecial: number;
    Insight: number; MaxInsight: number; Ability1: string; Ability2: string;
    HiddenAbility: string; EventAbilities: string; Moves: Array<{ Learned: string; Name: string; }>;
    [key: string]: unknown; 
}

export interface MoveData {
    id: string; active: boolean; name: string; type: string; category: 'Physical' | 'Special' | 'Status';
    accBonus: number; // The flat bonus box
    acc1: string; // e.g. "DEX"
    acc2: string; // e.g. "BRAWL"
    dmg1: string; // e.g. "STR"
    power: number; // e.g. 2
}

interface CharacterState {
    identity: { 
        nickname: string; species: string; nature: string; rank: Rank;
        type1: string; type2: string; ability: string; availableAbilities: string[];
        mode: string; age: string; ruleset: string; pain: string; rolls: string;
        combat: string; social: string; hand: string; 
        learnset: Array<{ Learned: string; Name: string; }>;
    };
    derived: { defBuff: number; defDebuff: number; sdefBuff: number; sdefDebuff: number; happy: number; loyal: number; };
    health: { hpCurr: number; hpMax: number; hpBase: number; };
    will: { willCurr: number; willMax: number; willBase: number; };
    extras: { core: number; social: number; };
    stats: Record<CombatStat, StatData>;
    socials: Record<SocialStat, StatData>;
    skills: Record<Skill, SkillData>;
    skillChecks: SkillCheck[];
    moves: MoveData[];
    
    setIdentity: (field: keyof CharacterState['identity'], value: string | string[] | Array<{ Learned: string; Name: string; }>) => void;
    setDerived: (field: keyof CharacterState['derived'], value: number) => void;
    updateHealth: (field: keyof CharacterState['health'], value: number) => void;
    updateWill: (field: keyof CharacterState['will'], value: number) => void;
    setExtra: (category: 'core' | 'social', value: number) => void;
    setStat: (stat: CombatStat, field: keyof StatData, value: number) => void;
    setSocialStat: (stat: SocialStat, field: keyof StatData, value: number) => void;
    setSkill: (skill: Skill, field: keyof SkillData, value: number) => void;
    
    addSkillCheck: () => void;
    updateSkillCheck: (id: string, field: keyof SkillCheck, value: string) => void;
    removeSkillCheck: (id: string) => void;
    
    addMove: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMove: (id: string, field: keyof MoveData, value: any) => void;
    removeMove: (id: string) => void;
    moveUpMove: (id: string) => void;
    moveDownMove: (id: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyMoveData: (id: string, data: any) => void;

    loadFromOwlbear: (meta: Record<string, unknown>) => void;
    applySpeciesData: (data: PokemonJSON) => void;
}

const defaultStat = (): StatData => ({ base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 });
const defaultSocial = (): StatData => ({ base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 });
const defaultSkill = (): SkillData => ({ base: 0, buff: 0 });

export const getRankPoints = (rank: Rank) => {
    switch (rank) {
        case 'Starter': return { core: 0, social: 0, skills: 5 }; 
        case 'Rookie': return { core: 2, social: 2, skills: 10 };
        case 'Standard': return { core: 4, social: 4, skills: 14 }; 
        case 'Advanced': return { core: 6, social: 6, skills: 17 };
        case 'Expert': return { core: 8, social: 8, skills: 19 }; 
        case 'Ace': return { core: 10, social: 10, skills: 20 };
        case 'Master': return { core: 10, social: 10, skills: 22 }; 
        case 'Champion': return { core: 14, social: 14, skills: 25 };
        default: return { core: 0, social: 0, skills: 0 };
    }
};

export const useCharacterStore = create<CharacterState>((set) => ({
    identity: { 
        nickname: '', species: '', nature: '', rank: 'Starter', 
        type1: '', type2: '', ability: '', availableAbilities: [],
        mode: 'Pokémon', age: '', ruleset: 'VIT = DEF/HP, INS = SPD', pain: 'Disabled', rolls: 'Public (Everyone)',
        combat: '', social: '', hand: '', learnset: []
    },
    derived: { defBuff: 0, defDebuff: 0, sdefBuff: 0, sdefDebuff: 0, happy: 0, loyal: 0 },
    health: { hpCurr: 6, hpMax: 6, hpBase: 4 },
    will: { willCurr: 4, willMax: 4, willBase: 3 },
    extras: { core: 0, social: 0 },
    stats: { [CombatStat.STR]: defaultStat(), [CombatStat.DEX]: defaultStat(), [CombatStat.VIT]: defaultStat(), [CombatStat.SPE]: defaultStat(), [CombatStat.INS]: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 } },
    socials: { [SocialStat.TOU]: defaultSocial(), [SocialStat.COO]: defaultSocial(), [SocialStat.BEA]: defaultSocial(), [SocialStat.CUT]: defaultSocial(), [SocialStat.CLE]: defaultSocial() },
    skills: Object.values(Skill).reduce((acc, skill) => ({ ...acc, [skill]: defaultSkill() }), {} as Record<Skill, SkillData>),
    skillChecks: [], moves: [],

    setIdentity: (field, value) => set((state) => {
        try { if (typeof value === 'string') saveToOwlbear({ [field]: value }); } catch (e) {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { identity: { ...state.identity, [field]: value as any } };
    }),

    setDerived: (field, value) => set((state) => {
        try { saveToOwlbear({ [field]: value }); } catch (e) {}
        return { derived: { ...state.derived, [field]: value } };
    }),
    
    setExtra: (category, value) => set((state) => {
        try { saveToOwlbear({ [`extra-${category}`]: Math.max(0, value) }); } catch(e){}
        return { extras: { ...state.extras, [category]: Math.max(0, value) } };
    }),

    updateHealth: (field, value) => set((state) => {
        const newHealth = { ...state.health, [field]: value };
        if (field === 'hpBase') {
            const vitTotal = Math.max(1, state.stats[CombatStat.VIT].base + state.stats[CombatStat.VIT].rank + state.stats[CombatStat.VIT].buff - state.stats[CombatStat.VIT].debuff);
            const insTotal = Math.max(1, state.stats[CombatStat.INS].base + state.stats[CombatStat.INS].rank + state.stats[CombatStat.INS].buff - state.stats[CombatStat.INS].debuff);
            let hpStat = vitTotal;
            if (state.identity.ruleset === 'VIT = DEF, INS = SPD; either VIT/INS used for HP') hpStat = Math.max(vitTotal, insTotal);
            const oldMax = newHealth.hpMax; newHealth.hpMax = newHealth.hpBase + hpStat;
            if (newHealth.hpMax > oldMax) newHealth.hpCurr += (newHealth.hpMax - oldMax);
            else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;
        }
        if (field === 'hpCurr') newHealth.hpCurr = Math.max(0, Math.min(newHealth.hpMax, value));
        try { saveToOwlbear({ 'hp-curr': newHealth.hpCurr, 'hp-max-display': newHealth.hpMax, 'hp-base': newHealth.hpBase }); } catch(e){}
        return { health: newHealth };
    }),

    updateWill: (field, value) => set((state) => {
        const newWill = { ...state.will, [field]: value };
        if (field === 'willBase') {
            const insTotal = Math.max(1, state.stats[CombatStat.INS].base + state.stats[CombatStat.INS].rank + state.stats[CombatStat.INS].buff - state.stats[CombatStat.INS].debuff);
            const oldMax = newWill.willMax; newWill.willMax = newWill.willBase + insTotal;
            if (newWill.willMax > oldMax) newWill.willCurr += (newWill.willMax - oldMax);
            else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;
        }
        if (field === 'willCurr') newWill.willCurr = Math.max(0, Math.min(newWill.willMax, value));
        try { saveToOwlbear({ 'will-curr': newWill.willCurr, 'will-max-display': newWill.willMax, 'will-base': newWill.willBase }); } catch(e){}
        return { will: newWill };
    }),

    setStat: (stat, field, value) => set((state) => {
        const newStats = { ...state.stats, [stat]: { ...state.stats[stat], [field]: Math.max(0, value) } };
        const obrKey = field === 'limit' ? 'max' : field;
        const updates: Record<string, unknown> = { [`${stat}-${obrKey}`]: Math.max(0, value) };
        const newHealth = { ...state.health }; const newWill = { ...state.will };

        if ((stat === CombatStat.VIT || stat === CombatStat.INS) && field !== 'limit') {
            const vitTotal = Math.max(1, newStats[CombatStat.VIT].base + newStats[CombatStat.VIT].rank + newStats[CombatStat.VIT].buff - newStats[CombatStat.VIT].debuff);
            const insTotal = Math.max(1, newStats[CombatStat.INS].base + newStats[CombatStat.INS].rank + newStats[CombatStat.INS].buff - newStats[CombatStat.INS].debuff);
            let hpStat = vitTotal;
            if (state.identity.ruleset === 'VIT = DEF, INS = SPD; either VIT/INS used for HP') hpStat = Math.max(vitTotal, insTotal);
            const oldMax = newHealth.hpMax; newHealth.hpMax = newHealth.hpBase + hpStat;
            if (newHealth.hpMax > oldMax) newHealth.hpCurr += (newHealth.hpMax - oldMax); 
            else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;
            Object.assign(updates, { 'hp-curr': newHealth.hpCurr, 'hp-max-display': newHealth.hpMax });
        }
        if (stat === CombatStat.INS && field !== 'limit') {
            const insTotal = Math.max(1, newStats[CombatStat.INS].base + newStats[CombatStat.INS].rank + newStats[CombatStat.INS].buff - newStats[CombatStat.INS].debuff);
            const oldMax = newWill.willMax; newWill.willMax = newWill.willBase + insTotal;
            if (newWill.willMax > oldMax) newWill.willCurr += (newWill.willMax - oldMax); 
            else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;
            Object.assign(updates, { 'will-curr': newWill.willCurr, 'will-max-display': newWill.willMax });
        }
        try { saveToOwlbear(updates); } catch(e){}
        return { stats: newStats, health: newHealth, will: newWill };
    }),

    setSocialStat: (stat, field, value) => set((state) => {
        const obrKey = field === 'limit' ? 'max' : field;
        try { saveToOwlbear({ [`${stat}-${obrKey}`]: Math.max(0, value) }); } catch(e){}
        return { socials: { ...state.socials, [stat]: { ...state.socials[stat], [field]: Math.max(0, value) } } };
    }),

    setSkill: (skill, field, value) => set((state) => {
        try { saveToOwlbear({ [`${skill}-${field}`]: Math.max(0, value) }); } catch(e){}
        return { skills: { ...state.skills, [skill]: { ...state.skills[skill], [field]: Math.max(0, value) } } };
    }),

    addSkillCheck: () => set((state) => { return state; }),
    updateSkillCheck: () => set((state) => { return state; }),
    removeSkillCheck: () => set((state) => { return state; }),

    addMove: () => set((state) => {
        const newMoves = [...state.moves, { id: crypto.randomUUID(), active: false, name: '', type: 'Normal', category: 'Physical', accBonus: 0, acc1: '--', acc2: '--', dmg1: '--', power: 0 }];
        try { saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) }); } catch(e){}
        return { moves: newMoves as MoveData[] };
    }),
    updateMove: (id, field, value) => set((state) => {
        const newMoves = state.moves.map(m => m.id === id ? { ...m, [field]: value } : m);
        try { saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) }); } catch(e){}
        return { moves: newMoves };
    }),
    removeMove: (id) => set((state) => {
        const newMoves = state.moves.filter(m => m.id !== id);
        try { saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) }); } catch(e){}
        return { moves: newMoves };
    }),
    moveUpMove: (id) => set((state) => {
        const index = state.moves.findIndex(m => m.id === id);
        if (index <= 0) return state;
        const newMoves = [...state.moves];
        [newMoves[index - 1], newMoves[index]] = [newMoves[index], newMoves[index - 1]];
        try { saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) }); } catch(e){}
        return { moves: newMoves };
    }),
    moveDownMove: (id) => set((state) => {
        const index = state.moves.findIndex(m => m.id === id);
        if (index < 0 || index >= state.moves.length - 1) return state;
        const newMoves = [...state.moves];
        [newMoves[index + 1], newMoves[index]] = [newMoves[index], newMoves[index + 1]];
        try { saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) }); } catch(e){}
        return { moves: newMoves };
    }),

    applyMoveData: (id, data) => set((state) => {
        if (!data || !data.Name) return state;

        // Helpers to map raw JSON strings to our strict dropdown options
        const mapAttr = (val: string) => {
            const v = (val || '').toLowerCase();
            if (v.includes('str')) return 'STR'; if (v.includes('dex')) return 'DEX';
            if (v.includes('vit')) return 'VIT'; if (v.includes('spe')) return 'SPE';
            if (v.includes('ins')) return 'INS'; return '--';
        };
        const mapSkill = (val: string) => {
            const v = (val || '').split('/')[0].toLowerCase().trim(); // Take ONLY the first skill!
            const skills = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform'];
            for (const s of skills) { if (v.includes(s)) return s.toUpperCase(); }
            return '--';
        };

        const newMoves = state.moves.map(m => {
            if (m.id === id) {
                return {
                    ...m,
                    name: data.Name || m.name,
                    type: data.Type || m.type,
                    category: data.Category || m.category,
                    acc1: mapAttr(data.Accuracy1),
                    acc2: mapSkill(data.Accuracy2),
                    dmg1: mapAttr(data.Damage1),
                    power: data.Power !== undefined ? Number(data.Power) : m.power
                };
            }
            return m;
        });
        try { saveToOwlbear({ 'moves-data': JSON.stringify(newMoves) }); } catch(e){}
        return { moves: newMoves as MoveData[] };
    }),

    applySpeciesData: (data) => set((state) => {
        if (!data || !data.Name) return state;
        const newStats = { ...state.stats };
        const updatesToSave: Record<string, unknown> = {};

        const applyStat = (statKey: CombatStat, dataBase: number, dataMax: number) => {
            newStats[statKey] = { ...newStats[statKey], base: dataBase, limit: dataMax };
            updatesToSave[`${statKey}-base`] = dataBase; updatesToSave[`${statKey}-max`] = dataMax;
        };
        applyStat(CombatStat.STR, data.Strength, data.MaxStrength); applyStat(CombatStat.DEX, data.Dexterity, data.MaxDexterity);
        applyStat(CombatStat.VIT, data.Vitality, data.MaxVitality); applyStat(CombatStat.SPE, data.Special, data.MaxSpecial);
        applyStat(CombatStat.INS, data.Insight, data.MaxInsight);

        const newHealth = { ...state.health }; newHealth.hpBase = data.BaseHP; updatesToSave['hp-base'] = newHealth.hpBase;
        const vitTotal = Math.max(1, newStats[CombatStat.VIT].base + newStats[CombatStat.VIT].rank + newStats[CombatStat.VIT].buff - newStats[CombatStat.VIT].debuff);
        const insTotal = Math.max(1, newStats[CombatStat.INS].base + newStats[CombatStat.INS].rank + newStats[CombatStat.INS].buff - newStats[CombatStat.INS].debuff);
        
        let hpStat = vitTotal;
        if (state.identity.ruleset === 'VIT = DEF, INS = SPD; either VIT/INS used for HP') hpStat = Math.max(vitTotal, insTotal);

        const oldHpMax = newHealth.hpMax; newHealth.hpMax = newHealth.hpBase + hpStat;
        if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += (newHealth.hpMax - oldHpMax); else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;
        
        const newWill = { ...state.will };
        const oldWillMax = newWill.willMax; newWill.willMax = newWill.willBase + insTotal;
        if (newWill.willMax > oldWillMax) newWill.willCurr += (newWill.willMax - oldWillMax); else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

        updatesToSave['hp-curr'] = newHealth.hpCurr; updatesToSave['hp-max-display'] = newHealth.hpMax;
        updatesToSave['will-curr'] = newWill.willCurr; updatesToSave['will-max-display'] = newWill.willMax;

        const abilities = [];
        if (data.Ability1) abilities.push(data.Ability1); if (data.Ability2) abilities.push(data.Ability2);
        if (data.HiddenAbility) abilities.push(data.HiddenAbility); if (data.EventAbilities) abilities.push(data.EventAbilities);
        const learnsetArray = Array.isArray(data.Moves) ? data.Moves : [];

        const newIdentity = { 
            ...state.identity, type1: data.Type1 || '', type2: data.Type2 || '',
            availableAbilities: abilities, ability: abilities.length > 0 ? abilities[0] : '', learnset: learnsetArray
        };
        updatesToSave['type1'] = newIdentity.type1; updatesToSave['type2'] = newIdentity.type2; updatesToSave['ability'] = newIdentity.ability;

        try { saveToOwlbear(updatesToSave); } catch(e){}
        return { stats: newStats, health: newHealth, will: newWill, identity: newIdentity };
    }),

    loadFromOwlbear: (meta) => set((state) => {
        const newStats = { ...state.stats };
        Object.values(CombatStat).forEach(stat => {
            if (meta[`${stat}-base`] !== undefined) newStats[stat].base = Number(meta[`${stat}-base`]);
            if (meta[`${stat}-rank`] !== undefined) newStats[stat].rank = Number(meta[`${stat}-rank`]);
            if (meta[`${stat}-buff`] !== undefined) newStats[stat].buff = Number(meta[`${stat}-buff`]);
            if (meta[`${stat}-debuff`] !== undefined) newStats[stat].debuff = Number(meta[`${stat}-debuff`]);
            if (meta[`${stat}-max`] !== undefined) newStats[stat].limit = Number(meta[`${stat}-max`]); 
        });
        
        const newSocials = { ...state.socials };
        Object.values(SocialStat).forEach(stat => {
            if (meta[`${stat}-base`] !== undefined) newSocials[stat].base = Number(meta[`${stat}-base`]);
            if (meta[`${stat}-rank`] !== undefined) newSocials[stat].rank = Number(meta[`${stat}-rank`]);
            if (meta[`${stat}-buff`] !== undefined) newSocials[stat].buff = Number(meta[`${stat}-buff`]);
            if (meta[`${stat}-debuff`] !== undefined) newSocials[stat].debuff = Number(meta[`${stat}-debuff`]);
            if (meta[`${stat}-max`] !== undefined) newSocials[stat].limit = Number(meta[`${stat}-max`]);
        });

        const newSkills = { ...state.skills };
        Object.values(Skill).forEach(skill => {
            if (meta[`${skill}-base`] !== undefined) newSkills[skill].base = Number(meta[`${skill}-base`]);
            if (meta[`${skill}-buff`] !== undefined) newSkills[skill].buff = Number(meta[`${skill}-buff`]);
        });

        let parsedMoves: MoveData[] = [];
        try { parsedMoves = meta['moves-data'] ? JSON.parse(String(meta['moves-data'])) : []; } catch(e) {}

        return {
            ...state,
            identity: { 
                ...state.identity,
                nickname: String(meta['nickname'] || ''), species: String(meta['species'] || ''),
                nature: String(meta['nature'] || ''), rank: (meta['rank'] as Rank) || 'Starter',
                type1: String(meta['type1'] || ''), type2: String(meta['type2'] || ''),
                ability: String(meta['ability'] || ''), mode: String(meta['mode'] || 'Pokémon'),
                age: String(meta['age'] || ''), ruleset: String(meta['ruleset'] || 'VIT = DEF/HP, INS = SPD'),
                pain: String(meta['pain'] || 'Disabled'), rolls: String(meta['rolls'] || 'Public (Everyone)'),
                combat: String(meta['combat'] || ''), social: String(meta['social'] || ''), hand: String(meta['hand'] || '')
            },
            derived: {
                defBuff: Number(meta['defBuff']) || 0, defDebuff: Number(meta['defDebuff']) || 0,
                sdefBuff: Number(meta['sdefBuff']) || 0, sdefDebuff: Number(meta['sdefDebuff']) || 0,
                happy: Number(meta['happy']) || 0, loyal: Number(meta['loyal']) || 0
            },
            stats: newStats, socials: newSocials, skills: newSkills, moves: parsedMoves
        };
    })
}));