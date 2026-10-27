import type { FieldEffectInfo, MoveFieldEffectDefinition } from './fieldEffectsData';

export const TERRAIN_CONDITIONS_DATA: FieldEffectInfo[] = [
    {
        id: 'terrain-electric',
        name: 'Electric Terrain',
        category: 'terrain',
        badge: 'Electric',
        color: '#F8D030',
        icon: 'Zap',
        initials: 'ET',
        effects: [
            '+1 Damage to Electric-type Moves',
            'Grounded Pokémon cannot fall Asleep or Rest',
            'Activates Surge abilities and boosts'
        ]
    },
    {
        id: 'terrain-grassy',
        name: 'Grassy Terrain',
        category: 'terrain',
        badge: 'Grass',
        color: '#78C850',
        icon: 'Sprout',
        initials: 'GT',
        effects: [
            '+1 Damage to Grass-type Moves',
            'Grounded Pokémon recover 1 HP at end of round',
            '-1 Damage from Earthquake, Bulldoze, and Magnitude'
        ]
    },
    {
        id: 'terrain-misty',
        name: 'Misty Terrain',
        category: 'terrain',
        badge: 'Fairy',
        color: '#EE99AC',
        icon: 'Sparkles',
        initials: 'MT',
        effects: [
            '-1 Damage from Dragon-type Moves',
            'Grounded Pokémon cannot be inflicted with Major/Minor Status Ailments or Confusion'
        ]
    },
    {
        id: 'terrain-psychic',
        name: 'Psychic Terrain',
        category: 'terrain',
        badge: 'Psychic',
        color: '#F85888',
        icon: 'Eye',
        initials: 'PT',
        effects: [
            '+1 Damage to Psychic-type Moves',
            'Grounded Pokémon are protected from Priority & Reaction Moves (Evade/Clash priority)'
        ]
    }
];

export const OTHER_FIELD_CONDITIONS_DATA: FieldEffectInfo[] = [
    {
        id: 'other-trick-room',
        name: 'Trick Room',
        category: 'other',
        badge: 'Dimension',
        color: '#9C27B0',
        icon: 'Sparkles',
        initials: 'TR',
        effects: [
            'Turn order is reversed: slower combatants act first in Initiative order',
            'Lasts for 4 rounds or until cancelled'
        ],
        defaultRounds: 4
    },
    {
        id: 'other-gravity',
        name: 'Gravity',
        category: 'other',
        badge: 'Field',
        color: '#5C6BC0',
        icon: 'Sparkles',
        initials: 'GR',
        effects: [
            'Grounds Flying and Levitating Pokémon (removes Ground immunity)',
            'All Pokémon have -2 dice penalty to Evasion rolls',
            'High-flying/bouncing moves cannot be used'
        ],
        defaultRounds: 4
    },
    {
        id: 'other-ion-deluge',
        name: 'Ion Deluge',
        category: 'other',
        badge: 'Electric Field',
        color: '#FFD54F',
        icon: 'Zap',
        initials: 'ID',
        effects: ['All Normal-type moves become Electric-type for the rest of the scene.'],
        defaultRounds: -1
    },
    {
        id: 'other-wonder-room',
        name: 'Wonder Room',
        category: 'other',
        badge: 'Dimension',
        color: '#26C6DA',
        icon: 'Sparkles',
        initials: 'WR',
        effects: ['Defense and Sp. Defense calculations are swapped for all Pokémon. (4 Rounds)'],
        defaultRounds: 4
    },
    {
        id: 'other-magic-room',
        name: 'Magic Room',
        category: 'other',
        badge: 'Dimension',
        color: '#AB47BC',
        icon: 'Sparkles',
        initials: 'MR',
        effects: ['Held items lose their effects; no items can be used. (4 Rounds)'],
        defaultRounds: 4
    },
    {
        id: 'other-fairy-lock',
        name: 'Fairy Lock',
        category: 'other',
        badge: 'Lock',
        color: '#EC407A',
        icon: 'Sparkles',
        initials: 'FL',
        effects: ['All Pokémon are afflicted with Block and cannot flee or retreat next round. (1 Round)'],
        defaultRounds: 1
    },
    {
        id: 'other-mud-sport',
        name: 'Mud Sport',
        category: 'other',
        badge: 'Sport',
        color: '#8D6E63',
        icon: 'Droplets',
        initials: 'MS',
        effects: [
            "Physical & Special Electric-Type Moves have Power 0. Pokémon weak to Electric-Type Moves won't receive Super-Effective Damage from them. (4 Rounds)"
        ],
        defaultRounds: 4
    },
    {
        id: 'other-water-sport',
        name: 'Water Sport',
        category: 'other',
        badge: 'Sport',
        color: '#42A5F5',
        icon: 'Droplets',
        initials: 'WS',
        effects: [
            "Physical & Special Fire-Type Moves have Power 0. Pokémon weak to Fire-Type Moves won't receive Super-Effective Damage from them. (4 Rounds)"
        ],
        defaultRounds: 4
    }
];

export const FORCE_FIELD_CONDITIONS_DATA: FieldEffectInfo[] = [
    {
        id: 'forcefield-reflect',
        name: 'Reflect',
        category: 'forceField',
        badge: 'Barrier',
        color: '#E91E63',
        icon: 'Shield',
        initials: 'RF',
        effects: ['-1 Damage from Physical Moves for all allies', 'Protects user and allies for 4 rounds'],
        defaultRounds: 4
    },
    {
        id: 'forcefield-light-screen',
        name: 'Light Screen',
        category: 'forceField',
        badge: 'Barrier',
        color: '#9C27B0',
        icon: 'Shield',
        initials: 'LS',
        effects: ['-1 Damage from Special Moves for all allies', 'Protects user and allies for 4 rounds'],
        defaultRounds: 4
    },
    {
        id: 'forcefield-aurora-veil',
        name: 'Aurora Veil',
        category: 'forceField',
        badge: 'Barrier',
        color: '#00BCD4',
        icon: 'Shield',
        initials: 'AV',
        effects: [
            '-1 Damage from both Physical and Special Moves for all allies',
            'Can only be set during Snowy or Hail weather (4 rounds)'
        ],
        defaultRounds: 4
    },
    {
        id: 'forcefield-tailwind',
        name: 'Tailwind',
        category: 'forceField',
        badge: 'Wind Buff',
        color: '#4CAF50',
        icon: 'Wind',
        initials: 'TW',
        effects: ['+2 Dexterity bonus to user and all allies', 'Boosts Initiative and movement speed for 4 rounds'],
        defaultRounds: 4
    },
    {
        id: 'forcefield-safeguard',
        name: 'Safeguard',
        category: 'forceField',
        badge: 'Ward',
        color: '#8BC34A',
        icon: 'ShieldCheck',
        initials: 'SG',
        effects: ['Protects user and allies from Major and Minor Status Ailments', 'Lasts for 4 rounds'],
        defaultRounds: 4
    },
    {
        id: 'forcefield-mist',
        name: 'Mist',
        category: 'forceField',
        badge: 'Ward',
        color: '#80DEEA',
        icon: 'CloudFog',
        initials: 'MS',
        effects: ['Protects user and allies from stat and skill reductions inflicted by foes', 'Lasts for 4 rounds'],
        defaultRounds: 4
    },
    {
        id: 'forcefield-lucky-chant',
        name: 'Lucky Chant',
        category: 'forceField',
        badge: 'Chant',
        color: '#FFD54F',
        icon: 'Sparkles',
        initials: 'LC',
        effects: [
            'Allies are immune to Critical Hit bonus dice',
            'Allies can re-roll one un-successful die per roll',
            'Whole Scene Duration'
        ],
        defaultRounds: -1
    }
];

export const ENTRY_HAZARD_CONDITIONS_DATA: FieldEffectInfo[] = [
    {
        id: 'hazard-stealth-rock',
        name: 'Stealth Rock',
        category: 'entryHazard',
        badge: 'Rock Hazard',
        color: '#A1887F',
        icon: 'Mountain',
        initials: 'SR',
        effects: [
            'Deals Rock-type damage to foes upon entering battle, modified by type effectiveness',
            'Remains on field until cleared (Whole Scene)'
        ],
        defaultRounds: -1
    },
    {
        id: 'hazard-spikes',
        name: 'Spikes',
        category: 'entryHazard',
        badge: 'Ground Hazard',
        color: '#8D6E63',
        icon: 'ShieldAlert',
        initials: 'SP',
        effects: [
            'Deals 1 Typeless damage to grounded foes upon entering battle (stacks up to 3 layers for up to 3 damage)',
            'Remains on field until cleared (Whole Scene)'
        ],
        defaultRounds: -1
    },
    {
        id: 'hazard-toxic-spikes',
        name: 'Toxic Spikes',
        category: 'entryHazard',
        badge: 'Poison Hazard',
        color: '#AB47BC',
        icon: 'Skull',
        initials: 'TS',
        effects: [
            'Poisons grounded foes upon entering battle (1 layer: Poison; 2 layers: Badly Poisoned)',
            'Poison-type Pokémon absorb and remove this hazard upon entry'
        ],
        defaultRounds: -1
    },
    {
        id: 'hazard-sticky-web',
        name: 'Sticky Web',
        category: 'entryHazard',
        badge: 'Bug Hazard',
        color: '#C0CA33',
        icon: 'Target',
        initials: 'SW',
        effects: [
            'Reduces Dexterity by 1 for grounded foes upon entering battle',
            'Remains on field until cleared (Whole Scene)'
        ],
        defaultRounds: -1
    }
];

export const MOVE_FIELD_EFFECT_MAP: MoveFieldEffectDefinition[] = [
    { moveName: 'Sunny Day', effectName: 'Sunny', category: 'weather', rounds: 4 },
    { moveName: 'Rain Dance', effectName: 'Rain', category: 'weather', rounds: 4 },
    { moveName: 'Sandstorm', effectName: 'Sandstorm', category: 'weather', rounds: 4 },
    { moveName: 'Hail', effectName: 'Hail', category: 'weather', rounds: 4 },
    { moveName: 'Snowscape', effectName: 'Snowy', category: 'weather', rounds: 4 },
    { moveName: 'Chilly Reception', effectName: 'Snowy', category: 'weather', rounds: 4 },
    { moveName: 'Electric Terrain', effectName: 'Electric Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Grassy Terrain', effectName: 'Grassy Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Misty Terrain', effectName: 'Misty Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Psychic Terrain', effectName: 'Psychic Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Trick Room', effectName: 'Trick Room', category: 'other', rounds: 4 },
    { moveName: 'Gravity', effectName: 'Gravity', category: 'other', rounds: 4 },
    { moveName: 'Ion Deluge', effectName: 'Ion Deluge', category: 'other', rounds: -1 },
    { moveName: 'Wonder Room', effectName: 'Wonder Room', category: 'other', rounds: 4 },
    { moveName: 'Magic Room', effectName: 'Magic Room', category: 'other', rounds: 4 },
    { moveName: 'Fairy Lock', effectName: 'Fairy Lock', category: 'other', rounds: 1 },
    { moveName: 'Mud Sport', effectName: 'Mud Sport', category: 'other', rounds: 4 },
    { moveName: 'Water Sport', effectName: 'Water Sport', category: 'other', rounds: 4 },
    { moveName: 'Tailwind', effectName: 'Tailwind', category: 'forceField', rounds: 4 },
    { moveName: 'Aurora Veil', effectName: 'Aurora Veil', category: 'forceField', rounds: 4 },
    { moveName: 'Reflect', effectName: 'Reflect', category: 'forceField', rounds: 4 },
    { moveName: 'Baddy Bad', effectName: 'Reflect', category: 'forceField', rounds: 4 },
    { moveName: 'Light Screen', effectName: 'Light Screen', category: 'forceField', rounds: 4 },
    { moveName: 'Glitzy Glow', effectName: 'Light Screen', category: 'forceField', rounds: 4 },
    { moveName: 'Safeguard', effectName: 'Safeguard', category: 'forceField', rounds: 4 },
    { moveName: 'Mist', effectName: 'Mist', category: 'forceField', rounds: 4 },
    { moveName: 'Lucky Chant', effectName: 'Lucky Chant', category: 'forceField', rounds: -1 },
    { moveName: 'Stealth Rock', effectName: 'Stealth Rock', category: 'entryHazard', rounds: -1 },
    { moveName: 'Spikes', effectName: 'Spikes', category: 'entryHazard', rounds: -1 },
    { moveName: 'Toxic Spikes', effectName: 'Toxic Spikes', category: 'entryHazard', rounds: -1 },
    { moveName: 'Sticky Web', effectName: 'Sticky Web', category: 'entryHazard', rounds: -1 },
    { moveName: 'Ceaseless Edge', effectName: 'Spikes', category: 'entryHazard', rounds: -1 },
    { moveName: 'Stone Axe', effectName: 'Stealth Rock', category: 'entryHazard', rounds: -1 }
];

export const CANONICAL_HAZARDS = ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'];

/** @deprecated Deprecated in favor of freeform text input in side panels */
export const CANONICAL_SIDE_OTHER: string[] = [];

export const FIELD_EFFECT_INITIALS_MAP: Record<string, string> = {
    sunny: 'SN',
    rain: 'RN',
    sandstorm: 'SS',
    snowy: 'SW',
    hail: 'HL',
    'chilly reception': 'CR',
    'desolate weather': 'DW',
    desolate: 'DW',
    typhoon: 'TP',
    'strong winds': 'WI',
    fog: 'FG',
    tailwind: 'TW',
    'electric terrain': 'ET',
    'grassy terrain': 'GT',
    'misty terrain': 'MT',
    'psychic terrain': 'PT',
    'trick room': 'TR',
    gravity: 'GR',
    'ion deluge': 'ID',
    'wonder room': 'WR',
    'magic room': 'MR',
    'fairy lock': 'FL',
    'mud sport': 'MS',
    'water sport': 'WS',
    reflect: 'RF',
    'light screen': 'LS',
    safeguard: 'SG',
    mist: 'MS',
    'lucky chant': 'LC',
    'aurora veil': 'AV',
    spikes: 'SP',
    'stealth rock': 'SR',
    'toxic spikes': 'TS',
    'sticky web': 'SW',
    'ceaseless edge': 'CE',
    'stone axe': 'SA',
    wr: 'WR',
    mr: 'MR',
    fl: 'FL',
    ms: 'MS',
    ws: 'WS'
};
