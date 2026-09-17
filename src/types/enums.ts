export const CombatStat = {
    STR: 'str',
    DEX: 'dex',
    VIT: 'vit',
    SPE: 'spe',
    INS: 'ins'
} as const;
export type CombatStat = (typeof CombatStat)[keyof typeof CombatStat];

export const SocialStat = {
    TOU: 'tou',
    COO: 'coo',
    BEA: 'bea',
    CUT: 'cut',
    CLE: 'cle'
} as const;
export type SocialStat = (typeof SocialStat)[keyof typeof SocialStat];

export const Skill = {
    BRAWL: 'brawl',
    CHANNEL: 'channel',
    CLASH: 'clash',
    EVASION: 'evasion',
    ALERT: 'alert',
    ATHLETIC: 'athletic',
    NATURE: 'nature',
    STEALTH: 'stealth',
    CHARM: 'charm',
    ETIQUETTE: 'etiquette',
    INTIMIDATE: 'intimidate',
    PERFORM: 'perform',
    CRAFTS: 'crafts',
    LORE: 'lore',
    MEDICINE: 'medicine',
    MAGIC: 'magic'
} as const;
export type Skill = (typeof Skill)[keyof typeof Skill];

export interface SkillCategoryGroup {
    name: string;
    skills: Array<{
        key: Skill;
        label: string;
        trainerLabel: string;
    }>;
}

export const SKILL_CATEGORIES: SkillCategoryGroup[] = [
    {
        name: 'Fight',
        skills: [
            { key: Skill.BRAWL, label: 'Brawl', trainerLabel: 'Brawl' },
            { key: Skill.CHANNEL, label: 'Channel', trainerLabel: 'Throw' },
            { key: Skill.CLASH, label: 'Clash', trainerLabel: 'Weapon' },
            { key: Skill.EVASION, label: 'Evasion', trainerLabel: 'Evasion' }
        ]
    },
    {
        name: 'Survive',
        skills: [
            { key: Skill.ALERT, label: 'Alert', trainerLabel: 'Alert' },
            { key: Skill.ATHLETIC, label: 'Athletic', trainerLabel: 'Athletic' },
            { key: Skill.NATURE, label: 'Nature', trainerLabel: 'Nature' },
            { key: Skill.STEALTH, label: 'Stealth', trainerLabel: 'Stealth' }
        ]
    },
    {
        name: 'Social',
        skills: [
            { key: Skill.CHARM, label: 'Charm', trainerLabel: 'Empathy' },
            { key: Skill.ETIQUETTE, label: 'Etiquette', trainerLabel: 'Etiquette' },
            { key: Skill.INTIMIDATE, label: 'Intimidate', trainerLabel: 'Intimidate' },
            { key: Skill.PERFORM, label: 'Perform', trainerLabel: 'Perform' }
        ]
    },
    {
        name: 'Knowledge',
        skills: [
            { key: Skill.CRAFTS, label: 'Crafts', trainerLabel: 'Crafts' },
            { key: Skill.LORE, label: 'Lore', trainerLabel: 'Lore' },
            { key: Skill.MEDICINE, label: 'Medicine', trainerLabel: 'Medicine' },
            { key: Skill.MAGIC, label: 'Magic', trainerLabel: 'Science' }
        ]
    }
];
