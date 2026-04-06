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
    /** 'attr' = The core Attribute used for the roll (e.g., 'ins', 'str', 'will') */
    attr: string;
    skill: string;
}

export interface MoveData {
    id: string;
    active: boolean;
    name: string;
    type: string;
    /** 'cat' = Category (Physical, Special, Status) */
    category: 'Physical' | 'Special' | 'Status';
    /** 'acc1' = Accuracy Attribute (e.g., 'dex', 'str', 'will') */
    acc1: string;
    /** 'acc2' = Accuracy Skill (e.g., 'brawl', 'channel', or 'none') */
    acc2: string;
    /** 'dmg1' = Damage Attribute (e.g., 'str', 'spe', or '' for Status moves) */
    dmg1: string;
    power: number;
    /** 'desc' = Description and mechanical tags (e.g., '[High Crit]') */
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
    /** 'qty' = Quantity of the item */
    qty: number;
    name: string;
    /** 'desc' = Description and mechanical tags */
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
    /** 'globalAcc' = Global Accuracy Modifier applied to all rolls */
    globalAcc: number;
    /** 'globalDmg' = Global Damage Modifier applied to all rolls */
    globalDmg: number;
    /** 'globalSucc' = Global Success Modifier (Flat additions/subtractions to final successes) */
    globalSucc: number;
    /** 'globalChance' = Global Chance Dice Modifier */
    globalChance: number;
    /** 'ignoredPain' = How many levels of Pain Penalty the character is currently ignoring */
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
    /** 'attr' = Accuracy Attribute */
    attr: string;
    skill: string;
    type: string;
    /** 'cat' = Move Category (Phys, Spec, Status) */
    cat: string;
    /** 'dmgStat' = Damage Attribute */
    dmgStat: string;
    power: number;
    /** 'desc' = Description and mechanical tags */
    desc: string;
}

export interface TempBuild {
    species: string;
    /** 'attr' = Combat Attributes (Strength, Dexterity, Vitality, Special, Insight) */
    attr: Record<string, number>;
    /** 'soc' = Social Attributes (Tough, Cool, Beauty, Cute, Clever) */
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
    /** 'gmOnly' = Hides this entity from the player-facing dropdowns */
    gmOnly?: boolean;
}

export interface CustomItem {
    id: string;
    name: string;
    description: string;
    pocket?: string;
    category?: string;
    rarity?: string;
    /** 'gmOnly' = Hides this entity from the player-facing dropdowns */
    gmOnly?: boolean;
}

export interface CustomMove {
    id: string;
    name: string;
    type: string;
    /** 'category' = Category (Physical, Special, Status) */
    category: 'Physical' | 'Special' | 'Status';
    power: number;
    /** 'acc1' = Accuracy Attribute */
    acc1: string;
    /** 'acc2' = Accuracy Skill */
    acc2: string;
    /** 'dmg1' = Damage Attribute */
    dmg1: string;
    /** 'desc' = Description and mechanical tags */
    desc: string;
    /** 'gmOnly' = Hides this entity from the player-facing dropdowns */
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
    /** 'gmOnly' = Hides this entity from the player-facing dropdowns */
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
    /** 'gmOnly' = Hides this entity from the player-facing dropdowns */
    gmOnly?: boolean;
}
