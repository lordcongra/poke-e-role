// --- INTERFACES ---
export interface Move { 
    id: string; 
    name: string; 
    attr: string; 
    skill: string; 
    type: string; 
    cat: string; 
    dmg: string; 
    power: number; 
    dmgStat: string; 
    desc?: string; 
}

export interface InventoryItem { 
    id: string; 
    qty: number; 
    name: string; 
    desc: string; 
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

// Typing for the GitHub API response so we don't use 'any'
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
export const ATTRIBUTE_MAPPING: Record<string, string> = {
    "Strength": "str",
    "Dexterity": "dex",
    "Vitality": "vit",
    "Special": "spe",
    "Insight": "ins",
    "Tough": "tou",
    "Cool": "coo",
    "Beauty": "bea",
    "Cute": "cut",
    "Clever": "cle",
    "Will": "will"
};

export const DAMAGE_STAT_MAPPING: Record<string, string> = {
    "Strength": "str",
    "Dexterity": "dex",
    "Vitality": "vit",
    "Special": "spe",
    "Insight": "ins"
};

export interface OwlTracker {
    id: string;
    variant: string;
    color: number;
    value?: number | boolean; // <--- THE FIX: Allows checkboxes to be true/false!
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