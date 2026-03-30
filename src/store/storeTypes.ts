// src/store/storeTypes.ts
import type { CombatStat, SocialStat, Skill } from '../types/enums';

export type Rank = 'Starter' | 'Rookie' | 'Standard' | 'Advanced' | 'Expert' | 'Ace' | 'Master' | 'Champion';

export interface StatData { base: number; rank: number; buff: number; debuff: number; limit: number; }
export interface SkillData { base: number; buff: number; customName?: string; }
export interface SkillCheck { id: string; name: string; attr: string; skill: string; }

export interface MoveData {
    id: string; active: boolean; name: string; type: string; category: 'Physical' | 'Special' | 'Status';
    acc1: string; acc2: string; dmg1: string; power: number; desc?: string;
}

export interface StatusItem { id: string; name: string; customName: string; rounds: number; }
export interface EffectItem { id: string; name: string; rounds: number; }
export interface InventoryItem { id: string; qty: number; name: string; desc: string; active?: boolean; }
export interface CustomInfo { id: string; label: string; value: string; }

export interface Trackers {
    actions: number; evade: boolean; clash: boolean;
    chances: number; fate: number;
    globalAcc: number; globalDmg: number; globalSucc: number; globalChance: number;
    ignoredPain: number;
}

export interface CustomType { 
    id?: string; name: string; color: string; weaknesses: string[]; resistances: string[]; immunities: string[];
    seAgainst: string[]; nveAgainst: string[]; noEffectAgainst: string[];
}

export interface ExtraSkill { id: string; name: string; base: number; buff: number; }
export interface ExtraCategory { id: string; name: string; skills: ExtraSkill[]; }

export interface TempMove {
    id: string; name: string; attr: string; skill: string;
    type: string; cat: string; dmgStat: string; power: number; desc: string;
}

export interface TempBuild {
    species: string; attr: Record<string, number>; soc: Record<string, number>;
    skills: Record<string, number>; customSkillsList: string[]; customSkillMap: Record<string, string>;
    moves: TempMove[]; maxMoves: number; includePmd: boolean;
}

export interface GeneratorConfig {
    buildType: string; combatBias: string; targetAtkCount: number; targetSupCount: number; includePmd: boolean; includeCustom: boolean;
}

export interface CustomAbility {
    id: string;
    name: string;
    description: string;
    effect: string;
}

export interface CustomMove {
    id: string;
    name: string;
    type: string;
    category: 'Physical' | 'Special' | 'Status';
    power: number;
    acc1: string;
    acc2: string;
    dmg1: string;
    desc: string;
}

export interface CustomPokemon {
    id: string;
    Name: string;
    Type1: string;
    Type2: string;
    BaseHP: number;
    Strength: number;
    MaxStrength: number;
    Dexterity: number;
    MaxDexterity: number;
    Vitality: number;
    MaxVitality: number;
    Special: number;
    MaxSpecial: number;
    Insight: number;
    MaxInsight: number;
    Ability1: string;
    Ability2: string;
    HiddenAbility: string;
    EventAbilities: string;
    Moves: Array<{ Learned: string, Name: string }>;
}

export interface CoreSlice {
    health: { hpCurr: number; hpMax: number; hpBase: number; };
    will: { willCurr: number; willMax: number; willBase: number; };
    derived: { defBuff: number; defDebuff: number; sdefBuff: number; sdefDebuff: number; happy: number; loyal: number; };
    extras: { core: number; social: number; skill: number; };
    stats: Record<CombatStat, StatData>;
    socials: Record<SocialStat, StatData>;
    skills: Record<Skill, SkillData>;

    setDerived: <K extends keyof CoreSlice['derived']>(field: K, value: CoreSlice['derived'][K]) => void;
    updateHealth: <K extends keyof CoreSlice['health']>(field: K, value: CoreSlice['health'][K]) => void;
    updateWill: <K extends keyof CoreSlice['will']>(field: K, value: CoreSlice['will'][K]) => void;
    setExtra: <K extends keyof CoreSlice['extras']>(category: K, value: CoreSlice['extras'][K]) => void;
    setStat: <K extends keyof StatData>(stat: CombatStat, field: K, value: StatData[K]) => void;
    setSocialStat: <K extends keyof StatData>(stat: SocialStat, field: K, value: StatData[K]) => void;
    setSkill: <K extends keyof SkillData>(skill: Skill, field: K, value: SkillData[K]) => void;
}

export interface MovesSlice {
    moves: MoveData[]; skillChecks: SkillCheck[];
    addMove: () => void; updateMove: <K extends keyof MoveData>(id: string, field: K, value: MoveData[K]) => void;
    removeMove: (id: string) => void; moveUpMove: (id: string) => void; moveDownMove: (id: string) => void;
    applyMoveData: (id: string, data: Record<string, unknown>) => void;
    addSkillCheck: () => void; updateSkillCheck: <K extends keyof SkillCheck>(id: string, field: K, value: SkillCheck[K]) => void; removeSkillCheck: (id: string) => void;
}

export interface InventorySlice {
    inventory: InventoryItem[]; notes: string; customInfo: CustomInfo[];
    tp: number; currency: number; 
    addInventoryItem: () => void; updateInventoryItem: <K extends keyof InventoryItem>(id: string, field: K, value: InventoryItem[K]) => void;
    removeInventoryItem: (id: string) => void; moveUpInventoryItem: (id: string) => void; moveDownInventoryItem: (id: string) => void;
    setNotes: (text: string) => void;
    setTp: (val: number) => void; setCurrency: (val: number) => void;
    addCustomInfo: () => void; updateCustomInfo: (id: string, field: keyof CustomInfo, value: string) => void; removeCustomInfo: (id: string) => void;
}

export interface TrackerSlice {
    statuses: StatusItem[]; effects: EffectItem[]; trackers: Trackers;
    addStatus: () => void; updateStatus: <K extends keyof StatusItem>(id: string, field: K, value: StatusItem[K]) => void; removeStatus: (id: string) => void;
    addEffect: () => void; updateEffect: <K extends keyof EffectItem>(id: string, field: K, value: EffectItem[K]) => void; removeEffect: (id: string) => void;
    updateTracker: <K extends keyof Trackers>(field: K, value: Trackers[K]) => void; 
    incrementAction: () => void;
    resetRound: () => void; longRest: () => void;
}

export interface HomebrewSlice {
    roomCustomTypes: CustomType[]; 
    roomCustomAbilities: CustomAbility[];
    roomCustomMoves: CustomMove[];
    roomCustomPokemon: CustomPokemon[];
    extraCategories: ExtraCategory[]; 
    generatorConfig: GeneratorConfig;
    
    setRoomCustomTypes: (types: CustomType[]) => void; 
    setRoomCustomAbilities: (abs: CustomAbility[]) => void;
    setRoomCustomMoves: (moves: CustomMove[]) => void;
    setRoomCustomPokemon: (mons: CustomPokemon[]) => void;

    addCustomType: (type: CustomType) => void; updateCustomType: (oldName: string, newType: CustomType) => void; removeCustomType: (name: string) => void;
    addCustomAbility: () => void; updateCustomAbility: <K extends keyof CustomAbility>(id: string, field: K, value: CustomAbility[K]) => void; removeCustomAbility: (id: string) => void;
    addCustomMove: () => void; updateCustomMove: <K extends keyof CustomMove>(id: string, field: K, value: CustomMove[K]) => void; removeCustomMove: (id: string) => void;
    addCustomPokemon: () => void; updateCustomPokemon: <K extends keyof CustomPokemon>(id: string, field: K, value: CustomPokemon[K]) => void; removeCustomPokemon: (id: string) => void;

    overwriteCustomTypeData: (types: CustomType[]) => void;
    overwriteCustomAbilityData: (abs: CustomAbility[]) => void;
    overwriteCustomMoveData: (moves: CustomMove[]) => void;
    overwriteCustomPokemonData: (mons: CustomPokemon[]) => void;
    overwriteAllHomebrewData: (types: CustomType[], abs: CustomAbility[], moves: CustomMove[], mons: CustomPokemon[]) => void;

    // AUDIT FIX: Merging (Additive) functions!
    mergeCustomTypeData: (types: CustomType[]) => void;
    mergeCustomAbilityData: (abs: CustomAbility[]) => void;
    mergeCustomMoveData: (moves: CustomMove[]) => void;
    mergeCustomPokemonData: (mons: CustomPokemon[]) => void;
    mergeAllHomebrewData: (types: CustomType[], abs: CustomAbility[], moves: CustomMove[], mons: CustomPokemon[]) => void;

    addExtraCategory: () => void; updateExtraCategory: (id: string, name: string) => void; updateExtraSkill: <K extends keyof ExtraSkill>(catId: string, skillId: string, field: K, value: ExtraSkill[K]) => void; removeExtraCategory: (id: string) => void;
    
    setGeneratorConfig: (config: Partial<GeneratorConfig>) => void;
    applyGeneratedBuild: (build: TempBuild) => void;
}

export interface IdentitySlice {
    tokenId: string | null; role: 'GM' | 'PLAYER';
    identity: { 
        nickname: string; species: string; nature: string; rank: Rank;
        type1: string; type2: string; ability: string; availableAbilities: string[];
        mode: string; age: string; gender: string; ruleset: string; pain: string; rolls: string;
        combat: string; social: string; hand: string; isNPC: boolean;
        learnset: Array<{ Learned: string; Name: string; }>;
        pokemonBackup?: string; trainerBackup?: string;
        isAltForm: boolean; baseFormData?: string; altFormData?: string;
        
        showTrackers: boolean; settingHpBar: boolean; gmHpBar: boolean;
        settingHpText: boolean; gmHpText: boolean; settingWillBar: boolean; gmWillBar: boolean;
        settingWillText: boolean; gmWillText: boolean; settingDefBadge: boolean; gmDefBadge: boolean;
        settingEcoBadge: boolean; gmEcoBadge: boolean; colorAct: string; colorEva: string; colorCla: string;
        
        xOffset: number; yOffset: number;
        hpOffsetX: number; hpOffsetY: number;
        willOffsetX: number; willOffsetY: number;
        defOffsetX: number; defOffsetY: number;
        actOffsetX: number; actOffsetY: number;
        evaOffsetX: number; evaOffsetY: number;
        claOffsetX: number; claOffsetY: number;
    };
    
    setIdentity: <K extends keyof IdentitySlice['identity']>(field: K, value: IdentitySlice['identity'][K]) => void;
    setTokenData: (tokenId: string, role: 'GM' | 'PLAYER') => void;
    applyLearnset: (data: Record<string, unknown>) => void;
}

export interface MacroSlice {
    setMode: (mode: 'Pokémon' | 'Trainer') => void;
    toggleForm: () => void; 
    applySpeciesData: (data: Record<string, unknown>, wipeData?: boolean, updateStats?: boolean) => void;
    refreshSpeciesData: (data: Record<string, unknown>) => void;
}

export interface SyncSlice {
    loadFromOwlbear: (meta: Record<string, unknown>) => void;
}

export interface CharacterState extends CoreSlice, MovesSlice, InventorySlice, TrackerSlice, HomebrewSlice, IdentitySlice, MacroSlice, SyncSlice {}