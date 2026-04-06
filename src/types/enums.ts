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
