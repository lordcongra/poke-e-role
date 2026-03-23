// src/@types/index.ts

import { CombatStat, SocialStat, Skill, MoveCategory, PokemonType } from './enums';

// Helper type to combine all valid rollable attributes
export type CoreAttribute = CombatStat | SocialStat | 'will';

// --- INTERFACES ---
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

export interface Move { 
    id: string; 
    name: string; 
    attr: CoreAttribute | (string & {}); 
    skill: Skill | 'none' | (string & {}); 
    type: PokemonType | (string & {}); 
    cat: MoveCategory | (string & {}); 
    dmg: string; // Legacy/unused? Keeping for backward compatibility
    power: number; 
    dmgStat: CoreAttribute | '' | (string & {}); 
    desc?: string; 
    used?: boolean;
}

export interface SkillCheck {
    id: string;
    name: string;
    attr: CoreAttribute | (string & {});
    skill: Skill | 'none' | (string & {});
}

export interface InventoryItem { 
    id: string; 
    qty: number; 
    name: string; 
    desc: string; 
    active?: boolean;
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

export interface GithubTreeItem {
    path: string;
    mode: string;
    type: string;
    sha: string;
    url: string;
}

export interface GithubTreeResponse {
    sha: string;
    url: string;
    tree: GithubTreeItem[];
    truncated: boolean;
}

// --- CONSTANTS & MAPPINGS ---
export const ATTRIBUTE_MAPPING: Record<string, CoreAttribute | (string & {})> = {
    "Strength": CombatStat.STR,
    "Dexterity": CombatStat.DEX,
    "Vitality": CombatStat.VIT,
    "Special": CombatStat.SPE,
    "Insight": CombatStat.INS,
    "Tough": SocialStat.TOU,
    "Cool": SocialStat.COO,
    "Beauty": SocialStat.BEA,
    "Cute": SocialStat.CUT,
    "Clever": SocialStat.CLE,
    "Will": "will"
};

export const DAMAGE_STAT_MAPPING: Record<string, CombatStat> = {
    "Strength": CombatStat.STR,
    "Dexterity": CombatStat.DEX,
    "Vitality": CombatStat.VIT,
    "Special": CombatStat.SPE,
    "Insight": CombatStat.INS
};

export interface OwlTracker {
    id: string;
    variant: string;
    color: number;
    value?: number | boolean;
    max?: number;
    checked?: boolean;
    inlineMath?: boolean;
    name: string;
}

export interface PrettyInitMetadata {
    count?: string;
    active?: boolean;
    group?: number;
}

export interface DicePlusData {
    playerId?: string;
    rollId?: string;
    result?: {
        totalValue: string | number;
    };
    error?: string;
}

export interface PokemonStats {
    HP?: number;
    Strength?: number;
    Dexterity?: number;
    Vitality?: number;
    Special?: number;
    Insight?: number;
}

export interface PokemonData {
    Type1?: string;
    Type2?: string;
    BaseStats?: PokemonStats;
    Attributes?: PokemonStats;
    BaseAttributes?: PokemonStats;
    Strength?: number;
    Dexterity?: number;
    Vitality?: number;
    Special?: number;
    Insight?: number;
    BaseHP?: number;
    Ability1?: string;
    Ability2?: string;
    HiddenAbility?: string;
    Abilities?: Array<string | { Name: string }>;
}

export interface MoveData {
    Type?: string;
    Category?: string;
    Power?: number | string;
    Effect?: string;
    Description?: string;
    Damage1?: string;
    Accuracy1?: string;
    Accuracy2?: string;
}

export interface AbilityData {
    Effect?: string;
    Description?: string;
}

export interface CustomInfo {
    id: string;
    label: string;
    value: string;
}