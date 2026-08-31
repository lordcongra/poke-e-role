/**
 * Pokerole GM Screen - Pokémon Mystery Dungeon (PMD) & Community Homebrew Data
 * Reference compilation based on community house rules and Congra's PMD campaign system.
 */

export const DRAKE_HELD_ITEMS_DOC_URL =
    'https://docs.google.com/document/d/1TndU1bcozMWATwB2xxEjbLVITE78Qs6D4fNkV1u0yPc/edit?usp=sharing';

export const PMD_HOMEBREW_DISCLAIMER =
    'Note: These rules, weight charts, and mechanics are optional community suggestions for PMD campaigns, not official requirements. GMs and tables are encouraged to modify, pick and choose, or adapt them to best fit their adventure!';

export interface PmdBagCapacity {
    rank: string;
    capacity: number;
    notes: string;
}

export interface PmdItemWeight {
    category: string;
    examples: string;
    weight: number;
    stackRate: string;
    description: string;
}

export interface PmdFoodItem {
    name: string;
    category: 'Apple' | 'Gummi' | 'Belly Snack';
    willRestore: string;
    effect: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary';
}

export interface PmdWeaponModel {
    name: string;
    creator: string;
    type: string;
    weight: number;
    description: string;
    example: string;
}

export interface PmdSwitcherModel {
    name: string;
    creator: string;
    style: string;
    description: string;
    example: string;
}

export interface PmdCharacterRule {
    id: string;
    title: string;
    badge: string;
    summary: string;
    detail: string;
    appTip: string;
    link?: string;
    linkLabel?: string;
}

// 1. PMD CHARACTER CREATION & STAT ADJUSTMENTS
export const PMD_CHARACTER_RULES: PmdCharacterRule[] = [
    {
        id: 'teen-stats',
        title: 'Trainer / Teen Stats for Pokémon',
        badge: '+2 Core / +2 Social',
        summary:
            'Use human Trainer stat bonuses (usually the "Teen" age profile: +2 Core Attribute Points & +2 Social Attribute Points).',
        detail: 'Enables Pokémon to have the well-rounded competency of PMD guild adventurers.',
        appTip: 'In this app, set your Age to "Teen" in the Identity section and the extra points will be automatically applied to your point pool!'
    },
    {
        id: 'double-hp',
        title: 'Increased Base HP (Double HP)',
        badge: 'Survivability',
        summary:
            'Double starting Base HP or add a flat Vitality multiplier to withstand multi-encounter dungeon gauntlets.',
        detail:
            'Typically chosen as an alternative (either/or) to the Trainer Teen bonus stats, though gritty high-stakes campaigns may allow both.',
        appTip: 'You can adjust Max HP directly or use Extras in the Core Attributes section to match your table’s HP rule.'
    },
    {
        id: 'knowledge-magic-skills',
        title: 'Knowledge Skills & Magic Swap',
        badge: 'Crafts, Lore, Med, Magic',
        summary:
            'Grant Pokémon access to the Trainer Knowledge skill group (Crafts, Medicine, Lore, and Science). In PMD, Science is swapped to Magic.',
        detail:
            'Allows Pokémon to craft dungeon tools, brew herbal remedies, research ancient ruins, and channel primal arcanum.',
        appTip: 'This autosheet includes the Knowledge category with Magic built-in by default for all Pokémon!'
    },
    {
        id: 'narrative-rank-ups',
        title: 'Narrative Rank-Ups & Guild Promotions',
        badge: 'Story Progression',
        summary:
            'Rank-ups are awarded narratively by the Guild upon completing major expedition missions or rescue ranks, rather than spending Training Points (TP).',
        detail:
            'Preserves all earned TP exclusively for raising skills, attributes, and learning new moves without requiring TP sinks for rank promotion.',
        appTip: 'When promoted, simply switch your Rank in the Identity header to unlock higher skill caps and target counts.'
    },
    {
        id: 'multiple-held-items',
        title: 'Multiple Held Items & Compendium',
        badge: 'Equipment',
        summary:
            'Allow Pokémon to equip more than one held item, scarf, or looplet to simulate PMD dungeon loadouts.',
        detail:
            'Recommended cap: 2–3 active held items maximum, or gating extra slots behind higher Guild Ranks to prevent passive stat stacking runaway. Check Prof. Drake’s Held Item Homebrew doc for extensive item inspiration.',
        appTip: 'Use smart tags like [Str +1] [Def +1] in your inventory items to automatically apply held item buffs.',
        link: DRAKE_HELD_ITEMS_DOC_URL,
        linkLabel: "Prof. Drake's Held Item Homebrew List (Google Doc)"
    }
];

// 2. TREASURE BAG CAPACITY BY RANK
export const PMD_BAG_CAPACITY_TABLE: PmdBagCapacity[] = [
    { rank: 'Starter', capacity: 5, notes: 'Starter pouch (basic supplies)' },
    { rank: 'Rookie', capacity: 5, notes: 'Rookie Guild satchel' },
    { rank: 'Standard', capacity: 10, notes: 'Standard explorer bag (+5 wt)' },
    { rank: 'Advanced', capacity: 15, notes: 'Advanced expedition pack (+5 wt)' },
    { rank: 'Expert', capacity: 20, notes: 'Expert treasure rucksack (+5 wt)' },
    { rank: 'Ace', capacity: 25, notes: 'Ace adventurer haversack (+5 wt)' },
    { rank: 'Master', capacity: 30, notes: 'Master dungeon kit (+5 wt)' },
    { rank: 'Champion', capacity: 35, notes: 'Guildmaster bottomless bag (+5 wt)' }
];

// 3. ITEM WEIGHT SYSTEM
export const PMD_ITEM_WEIGHT_TABLE: PmdItemWeight[] = [
    {
        category: 'Health & Will Restoring',
        examples: 'Oran Berry, Sitrus Berry, Apples, Gummis, Elixirs',
        weight: 1.0,
        stackRate: '1 per 1.0 Wt',
        description: 'Vital sustenance and healing supplies carried in dedicated pockets.'
    },
    {
        category: 'Spikes & Throwables',
        examples: 'Corsola Spikes, Geo Pebbles, Iron Thorns, Silver Spikes',
        weight: 0.1,
        stackRate: '10 per 1.0 Wt',
        description: 'Lightweight projectiles for ranged chip damage and triggering switches.'
    },
    {
        category: 'Wonder Orbs',
        examples: 'Escape Orb, Petrify Orb, Slumber Orb, Foe-Hold Orb',
        weight: 1.0,
        stackRate: '1 per 1.0 Wt',
        description: 'Potent single-use glass spheres holding room-wide spell effects.'
    },
    {
        category: 'Mystery Seeds',
        examples: 'Reviver Seed, Warp Seed, Blast Seed, Heal Seed, Pure Seed',
        weight: 0.2,
        stackRate: '5 per 1.0 Wt',
        description: 'Compact emergency seeds for revives, teleports, and elemental bursts.'
    },
    {
        category: 'Weapons & Focus Wands',
        examples: 'Move Focus Wands, Prof. Drake Upgradeable Weapons, Swords/Staves',
        weight: 1.0,
        stackRate: '1 per 1.0 Wt',
        description: 'Physical arms or spellcasting wands equipped for combat flexibility.'
    },
    {
        category: 'Held Items & Scarves',
        examples: 'Silk Scarf, Defense Scarf, Warp Scarf, Looplets',
        weight: 0.5,
        stackRate: '2 per 1.0 Wt',
        description: 'Worn equipment (often weightless when actively equipped, or 0.5–1.0 wt in bag).'
    }
];

// 4. FOOD, WILL RESTORATION & GUMMIS
export const PMD_FOOD_WILL_TABLE: PmdFoodItem[] = [
    {
        name: 'Small Apple',
        category: 'Apple',
        willRestore: '1 Will Point',
        effect: 'Quick snack to stave off hunger and recover minor mental fatigue.',
        rarity: 'Common'
    },
    {
        name: 'Apple (Standard)',
        category: 'Apple',
        willRestore: '2 Will Points',
        effect: 'Reliable dungeon staple that fills the belly and sharpens focus.',
        rarity: 'Common'
    },
    {
        name: 'Big Apple',
        category: 'Apple',
        willRestore: '3 Will Points',
        effect: 'Hearty expedition meal providing substantial energy and morale.',
        rarity: 'Uncommon'
    },
    {
        name: 'Perfect Apple',
        category: 'Apple',
        willRestore: 'All Will (Full Max)',
        effect: 'Legendary delicacy; fully replenishes Will to maximum capacity.',
        rarity: 'Very Rare'
    },
    {
        name: 'Type Gummi (Standard)',
        category: 'Gummi',
        willRestore: '1–2 Will Points',
        effect: 'Chewy treat matched to Pokémon type (e.g. Grass/Fire). Restores Will and tastes delicious.',
        rarity: 'Common'
    },
    {
        name: 'Empowering Gummi (Temp Buff)',
        category: 'Gummi',
        willRestore: '2 Will Points',
        effect: 'Restores Will and grants +1 to a matching Attribute or Skill for the current dungeon floor.',
        rarity: 'Rare'
    },
    {
        name: 'Miracle Gummi (Permanent Upgrade)',
        category: 'Gummi',
        willRestore: 'All Will',
        effect: 'Ultra-rare dungeon treasure; grants a permanent +1 to a matching Core or Social Attribute.',
        rarity: 'Legendary'
    },
    {
        name: 'Four-Leaf Cookie',
        category: 'Belly Snack',
        willRestore: '1 Will Point',
        effect: 'Restores Will + grants Lucky status (+1 bonus success on next roll).',
        rarity: 'Rare'
    },
    {
        name: 'Dungeon Chocolate',
        category: 'Belly Snack',
        willRestore: '1 Will Point',
        effect: 'Restores Will + grants a sugar rush (+2 Initiative for the next encounter).',
        rarity: 'Uncommon'
    },
    {
        name: 'Mega Donut',
        category: 'Belly Snack',
        willRestore: '2 Will Points',
        effect: 'Restores Will + grants +2 Temp HP or +1 Defense for the next 3 rounds.',
        rarity: 'Rare'
    }
];

// 5. WEAPONS & COMBAT EQUIPMENT MODELS
export const PMD_WEAPONS_MODELS: PmdWeaponModel[] = [
    {
        name: 'Upgradeable Struggle Weapons',
        creator: 'Prof. Drake (Pokerole Discord)',
        type: 'Progressive Struggle Upgrade',
        weight: 1.0,
        description:
            'Weapons act as an upgradeable system based on the Struggle maneuver that can make the weapon better over time (improving damage, accuracy, or weapon capabilities). See Prof. Drake’s homebrew threads/docs in the Pokerole Discord for his complete upgrade progression system!',
        example: 'Custom Weapon (1 Wt): Improves upon the base Struggle maneuver over time as the adventurer invests in upgrades and mastery.'
    },
    {
        name: 'Move Focus Weapons & Wands',
        creator: 'Congra (@congra)',
        type: 'Move Slot Equipment',
        weight: 1.0,
        description:
            'Weapons (such as Wands, Staves, Swords, or Bows) serve as an extra equipable slot to cast or perform a specific Move without consuming one of the Pokémon’s move slots. Allows players to bring specialized elemental coverage, utility, or tactical options into dungeons. The GM can determine whether the weapon uses the same resolution stats as the move itself (e.g. Clever + Channel for Hypnosis) or its own unique stats (such as Special + Channel or Special + Magic for a wand, or Strength + Brawl / Strength + Weapons for a blade).',
        example: 'Hypnosis Wand (1 Wt): Allows casting Hypnosis (Clever/Special + Channel/Magic). Shadow Blade (1 Wt): Allows performing Night Slash.'
    }
];

// 6. SWITCHER MOVES IN PMD (COMMUNITY MODELS)
export const PMD_SWITCHER_MOVE_MODELS: PmdSwitcherModel[] = [
    {
        name: 'Free Tactical Cover & Reposition',
        creator: 'Congra (@congra in Pokerole Discord)',
        style: 'Environmental Positioning',
        description:
            'When using a Switcher Move (such as U-turn, Volt Switch, Flip Turn, Teleport, Baton Pass, Parting Shot), the user executes the move and its primary damage/effects, then immediately dashes behind nearby environmental terrain to Take Cover as a Free Action (without spending an action to move/find cover). Refer to the "Cover Mechanics & Defense Bonuses" section in this GM Screen for details on defense bonuses (+1 to +3 Def), determined at GM discretion based on whatever cover is available in the surrounding environment.',
        example:
            'A Pokémon uses U-turn to hit a foe, then instantly ducks behind a nearby boulder or corner, gaining Light (+1) or Heavy (+2) Cover defenses for free (see Cover table).'
    },
    {
        name: 'Reaction Swaps & Ally Decoys',
        creator: 'NorthLight (Pokerole Discord)',
        style: 'Teamplay & Decoy Redirection',
        description:
            'Adapts specific switcher and pivot moves for multi-member dungeon teams on the field:\n• Ally Switch: Reaction 1. Can only be used if you’re being attacked. The attack no longer targets you and instead targets one of your allies in range (if they are willing); the chosen ally gains a free action to react to the attack if it has any.\n• Shed Tail: Target One Ally. Make a substitute decoy for the target (user takes 2 damage and creates a 2 HP Substitute decoy onto an ally in range to shield them).',
        example:
            'Using Ally Switch right as a deadly attack lands so a willing ally in range can take the hit and use a free reaction.'
    },
    {
        name: 'Tactical Disengage & Evasion Debuff',
        creator: 'Cylland (Pokerole Discord)',
        style: '1v1 Duels & Evasive Feints',
        description:
            'In 1v1 duels, boss encounters, or solo expeditions where switching teammates is not applicable, Switcher moves act as an elusive hit-and-run maneuver that inflicts -1 Accuracy on the target’s next move (or provides a temporary evasion boost) as the user darts out of reach.',
        example:
            'Using Volt Switch or Parting Shot disrupts the opponent’s targeting rhythm, imposing -1 Accuracy on their next strike.'
    }
];
