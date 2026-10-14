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
        effects: ['-1 Damage from Electric-type Moves. (4 Rounds)'],
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
        effects: ['-1 Damage from Fire-type Moves. (4 Rounds)'],
        defaultRounds: 4
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
    { moveName: 'Mist', effectName: 'Mist', category: 'forceField', rounds: 4 }
];

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
    'aurora veil': 'AV',
    spikes: 'SP',
    'stealth rock': 'SR',
    'toxic spikes': 'TS',
    'sticky web': 'SW',
    wr: 'WR',
    mr: 'MR',
    fl: 'FL',
    ms: 'MS',
    ws: 'WS'
};
