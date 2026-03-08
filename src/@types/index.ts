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