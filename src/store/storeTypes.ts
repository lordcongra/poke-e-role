import type { CombatStat, SocialStat, Skill } from '../types/enums';
import type {
    Rank,
    StatData,
    SkillData,
    SkillCheck,
    MoveData,
    StatusItem,
    EffectItem,
    InventoryItem,
    CustomInfo,
    Trackers,
    ExtraSkill,
    ExtraCategory,
    TempBuild,
    GeneratorConfig,
    CustomAbility,
    CustomItem,
    CustomMove,
    CustomPokemon,
    CustomType
} from './entityTypes';

export * from './entityTypes';

export interface PendingDualScale {
    moveId: string;
    moveName: string;
    acc1Options?: string[];
    acc2Options?: string[];
    dmg1Options?: string[];
}

export interface PrintConfig {
    blankName: boolean;
    blankSpecies: boolean;
    blankType: boolean;
    blankNature: boolean;
    blankRank: boolean;
    blankAgeGender: boolean;
    blankStats: boolean;
    blankSocials: boolean;
    blankSkills: boolean;
    blankAbilities: boolean;
    blankMoves: boolean;
    hideMoveDesc: boolean;
    hideKnowledgeSkills: boolean;
    hideCustomSkills: boolean;
    hideAge: boolean;
    coreSkillsOnly: boolean;
    showOnlyActiveAbility: boolean;
    compactMode: boolean;
    statStyle: 'dots' | 'numbers' | 'both';
    abilityDescStyle: 'all' | 'selected' | 'none';
}

export interface CoreSlice {
    health: { hpCurr: number; hpMax: number; hpBase: number };
    will: { willCurr: number; willMax: number; willBase: number };
    derived: { defBuff: number; defDebuff: number; sdefBuff: number; sdefDebuff: number; happy: number; loyal: number };
    extras: { core: number; social: number; skill: number };
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
    moves: MoveData[];
    skillChecks: SkillCheck[];
    pendingDualScale: PendingDualScale | null;

    setPendingDualScale: (data: PendingDualScale | null) => void;
    resolveDualScale: (moveId: string, acc1?: string, acc2?: string, dmg1?: string) => void;
    addMove: () => void;
    updateMove: <K extends keyof MoveData>(id: string, field: K, value: MoveData[K]) => void;
    removeMove: (id: string) => void;
    moveUpMove: (id: string) => void;
    moveDownMove: (id: string) => void;
    applyMoveData: (id: string, data: Record<string, unknown>) => void;
    addSkillCheck: () => void;
    updateSkillCheck: <K extends keyof SkillCheck>(id: string, field: K, value: SkillCheck[K]) => void;
    removeSkillCheck: (id: string) => void;
}

export interface InventorySlice {
    inventory: InventoryItem[];
    notes: string;
    customInfo: CustomInfo[];
    tp: number;
    currency: number;
    addInventoryItem: () => void;
    updateInventoryItem: <K extends keyof InventoryItem>(id: string, field: K, value: InventoryItem[K]) => void;
    removeInventoryItem: (id: string) => void;
    moveUpInventoryItem: (id: string) => void;
    moveDownInventoryItem: (id: string) => void;
    setNotes: (text: string) => void;
    setTp: (val: number) => void;
    setCurrency: (val: number) => void;
    addCustomInfo: () => void;
    updateCustomInfo: (id: string, field: keyof CustomInfo, value: string) => void;
    removeCustomInfo: (id: string) => void;
}

export interface TrackerSlice {
    statuses: StatusItem[];
    effects: EffectItem[];
    trackers: Trackers;
    addStatus: () => void;
    updateStatus: <K extends keyof StatusItem>(id: string, field: K, value: StatusItem[K]) => void;
    removeStatus: (id: string) => void;
    addEffect: () => void;
    updateEffect: <K extends keyof EffectItem>(id: string, field: K, value: EffectItem[K]) => void;
    removeEffect: (id: string) => void;
    updateTracker: <K extends keyof Trackers>(field: K, value: Trackers[K]) => void;
    incrementAction: () => void;
    resetRound: () => void;
    longRest: () => void;
}

export interface HomebrewSlice {
    roomCustomTypes: CustomType[];
    roomCustomAbilities: CustomAbility[];
    roomCustomMoves: CustomMove[];
    roomCustomPokemon: CustomPokemon[];
    roomCustomItems: CustomItem[];

    setRoomCustomTypes: (types: CustomType[]) => void;
    setRoomCustomAbilities: (abs: CustomAbility[]) => void;
    setRoomCustomMoves: (moves: CustomMove[]) => void;
    setRoomCustomPokemon: (mons: CustomPokemon[]) => void;
    setRoomCustomItems: (items: CustomItem[]) => void;

    addCustomType: (type: CustomType) => void;
    updateCustomType: (oldName: string, newType: CustomType) => void;
    removeCustomType: (name: string) => void;
    addCustomAbility: () => void;
    updateCustomAbility: <K extends keyof CustomAbility>(id: string, field: K, value: CustomAbility[K]) => void;
    removeCustomAbility: (id: string) => void;
    addCustomMove: () => void;
    updateCustomMove: <K extends keyof CustomMove>(id: string, field: K, value: CustomMove[K]) => void;
    removeCustomMove: (id: string) => void;
    addCustomPokemon: () => void;
    updateCustomPokemon: <K extends keyof CustomPokemon>(id: string, field: K, value: CustomPokemon[K]) => void;
    removeCustomPokemon: (id: string) => void;
    addCustomItem: () => void;
    updateCustomItem: <K extends keyof CustomItem>(id: string, field: K, value: CustomItem[K]) => void;
    removeCustomItem: (id: string) => void;

    overwriteCustomTypeData: (types: CustomType[]) => void;
    overwriteCustomAbilityData: (abs: CustomAbility[]) => void;
    overwriteCustomMoveData: (moves: CustomMove[]) => void;
    overwriteCustomPokemonData: (mons: CustomPokemon[]) => void;
    overwriteCustomItemData: (items: CustomItem[]) => void;
    overwriteAllHomebrewData: (
        types: CustomType[],
        abs: CustomAbility[],
        moves: CustomMove[],
        mons: CustomPokemon[],
        items: CustomItem[]
    ) => void;

    mergeCustomTypeData: (types: CustomType[]) => void;
    mergeCustomAbilityData: (abs: CustomAbility[]) => void;
    mergeCustomMoveData: (moves: CustomMove[]) => void;
    mergeCustomPokemonData: (mons: CustomPokemon[]) => void;
    mergeCustomItemData: (items: CustomItem[]) => void;
    mergeAllHomebrewData: (
        types: CustomType[],
        abs: CustomAbility[],
        moves: CustomMove[],
        mons: CustomPokemon[],
        items: CustomItem[]
    ) => void;
}

export interface ExtraSkillsSlice {
    extraCategories: ExtraCategory[];
    addExtraCategory: () => void;
    updateExtraCategory: (id: string, name: string) => void;
    updateExtraSkill: <K extends keyof ExtraSkill>(
        catId: string,
        skillId: string,
        field: K,
        value: ExtraSkill[K]
    ) => void;
    removeExtraCategory: (id: string) => void;
}

export interface GeneratorSlice {
    generatorConfig: GeneratorConfig;
    setGeneratorConfig: (config: Partial<GeneratorConfig>) => void;
    applyGeneratedBuild: (build: TempBuild) => void;
}

export interface IdentitySlice {
    tokenId: string | null;
    role: 'GM' | 'PLAYER';
    identity: {
        nickname: string;
        species: string;
        nature: string;
        rank: Rank;
        type1: string;
        type2: string;
        ability: string;
        availableAbilities: string[];
        mode: string;
        age: string;
        gender: string;
        ruleset: string;
        pain: string;
        rolls: string;
        homebrewAccess: string;
        combat: string;
        social: string;
        hand: string;
        isNPC: boolean;
        learnset: Array<{ Learned: string; Name: string }>;
        pokemonBackup?: string;
        trainerBackup?: string;
        isAltForm: boolean;
        baseFormData?: string;
        altFormData?: string;

        showTrackers: boolean;
        settingHpBar: boolean;
        gmHpBar: boolean;
        settingHpText: boolean;
        gmHpText: boolean;
        settingWillBar: boolean;
        gmWillBar: boolean;
        settingWillText: boolean;
        gmWillText: boolean;
        settingDefBadge: boolean;
        gmDefBadge: boolean;
        settingEcoBadge: boolean;
        gmEcoBadge: boolean;
        colorAct: string;
        colorEva: string;
        colorCla: string;

        trackerScale: number;
        xOffset: number;
        yOffset: number;
        hpOffsetX: number;
        hpOffsetY: number;
        willOffsetX: number;
        willOffsetY: number;
        defOffsetX: number;
        defOffsetY: number;
        actOffsetX: number;
        actOffsetY: number;
        evaOffsetX: number;
        evaOffsetY: number;
        claOffsetX: number;
        claOffsetY: number;

        tokenImageUrl: string | null;
        printConfig: PrintConfig;
        isPrinting: boolean;
    };

    setIdentity: <K extends keyof IdentitySlice['identity']>(field: K, value: IdentitySlice['identity'][K]) => void;
    setPrintConfig: (config: Partial<PrintConfig>) => void;
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

export interface CharacterState
    extends
        CoreSlice,
        MovesSlice,
        InventorySlice,
        TrackerSlice,
        HomebrewSlice,
        ExtraSkillsSlice,
        GeneratorSlice,
        IdentitySlice,
        MacroSlice,
        SyncSlice {}
