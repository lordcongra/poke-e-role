export type Rank = 'Starter' | 'Rookie' | 'Standard' | 'Advanced' | 'Expert' | 'Ace' | 'Master' | 'Champion';

export interface StatData {
    base: number;
    rank: number;
    buff: number;
    debuff: number;
    limit: number;
}

export interface SkillData {
    base: number;
    buff: number;
    customName?: string;
}

export interface SkillCheck {
    id: string;
    name: string;
    attr: string;
    skill: string;
}

export interface MoveData {
    id: string;
    active: boolean;
    name: string;
    type: string;
    category: 'Physical' | 'Special' | 'Status';
    acc1: string;
    acc2: string;
    dmg1: string;
    power: number;
    desc?: string;
}

export interface StatusItem {
    id: string;
    name: string;
    customName: string;
    rounds: number;
}

export interface EffectItem {
    id: string;
    name: string;
    rounds: number;
}

export interface InventoryItem {
    id: string;
    qty: number;
    name: string;
    desc: string;
    active?: boolean;
}

export interface CustomInfo {
    id: string;
    label: string;
    value: string;
}

export interface Trackers {
    actions: number;
    evade: boolean;
    clash: boolean;
    chances: number;
    fate: number;
    globalAcc: number;
    globalDmg: number;
    globalSucc: number;
    globalChance: number;
    ignoredPain: number;
}

export interface ExtraSkill {
    id: string;
    name: string;
    base: number;
    buff: number;
}

export interface ExtraCategory {
    id: string;
    name: string;
    skills: ExtraSkill[];
}

export interface TempMove {
    id: string;
    name: string;
    attr: string;
    skill: string;
    type: string;
    cat: string;
    dmgStat: string;
    power: number;
    desc: string;
}

export interface TempBuild {
    species: string;
    attr: Record<string, number>;
    soc: Record<string, number>;
    skills: Record<string, number>;
    customSkillsList: string[];
    customSkillMap: Record<string, string>;
    moves: TempMove[];
    maxMoves: number;
    includePmd: boolean;
}

export interface GeneratorConfig {
    buildType: string;
    combatBias: string;
    targetAtkCount: number;
    targetSupCount: number;
    includePmd: boolean;
    includeCustom: boolean;
}

export interface CustomAbility {
    id: string;
    name: string;
    description: string;
    effect: string;
    gmOnly?: boolean;
}

export interface CustomItem {
    id: string;
    name: string;
    description: string;
    pocket?: string;
    category?: string;
    gmOnly?: boolean;
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
    gmOnly?: boolean;
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
    Moves: Array<{ Learned: string; Name: string }>;
    gmOnly?: boolean;
}

export interface CustomType {
    id?: string;
    name: string;
    color: string;
    weaknesses: string[];
    resistances: string[];
    immunities: string[];
    seAgainst: string[];
    nveAgainst: string[];
    noEffectAgainst: string[];
    gmOnly?: boolean;
}
