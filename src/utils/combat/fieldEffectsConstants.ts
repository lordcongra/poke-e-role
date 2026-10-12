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
        ]
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
        ]
    },
    {
        id: 'other-ion-deluge',
        name: 'Ion Deluge',
        category: 'other',
        badge: 'Electric Field',
        color: '#FFD54F',
        icon: 'Zap',
        initials: 'ID',
        effects: ['All Normal-type moves become Electric-type for the rest of the round']
    },
    {
        id: 'field-reflect',
        name: 'Reflect',
        category: 'forceField',
        badge: 'Barrier',
        color: '#E91E63',
        icon: 'Shield',
        initials: 'RF',
        effects: ['Reduces Physical Damage taken by the protected side by 1 for 4 rounds']
    },
    {
        id: 'field-light-screen',
        name: 'Light Screen',
        category: 'forceField',
        badge: 'Screen',
        color: '#AB47BC',
        icon: 'Shield',
        initials: 'LS',
        effects: ['Reduces Special Damage taken by the protected side by 1 for 4 rounds']
    },
    {
        id: 'field-safeguard',
        name: 'Safeguard',
        category: 'forceField',
        badge: 'Ward',
        color: '#26A69A',
        icon: 'Shield',
        initials: 'SG',
        effects: ['Protects the side from receiving Status Ailments and Confusion for 4 rounds']
    },
    {
        id: 'field-mist',
        name: 'Mist',
        category: 'forceField',
        badge: 'Haze',
        color: '#80DEEA',
        icon: 'Shield',
        initials: 'MS',
        effects: ['Protects the side from having their stats or dice pools lowered by opponents']
    }
];

export const MOVE_FIELD_EFFECT_MAP: MoveFieldEffectDefinition[] = [
    { moveName: 'Sunny Day', effectName: 'Sunny', category: 'weather', rounds: 4 },
    { moveName: 'Rain Dance', effectName: 'Rain', category: 'weather', rounds: 4 },
    { moveName: 'Sandstorm', effectName: 'Sandstorm', category: 'weather', rounds: 4 },
    { moveName: 'Hail', effectName: 'Hail', category: 'weather', rounds: 4 },
    { moveName: 'Snowscape', effectName: 'Snowy', category: 'weather', rounds: 4 },
    { moveName: 'Electric Terrain', effectName: 'Electric Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Grassy Terrain', effectName: 'Grassy Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Misty Terrain', effectName: 'Misty Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Psychic Terrain', effectName: 'Psychic Terrain', category: 'terrain', rounds: 4 },
    { moveName: 'Trick Room', effectName: 'Trick Room', category: 'other', rounds: 4 },
    { moveName: 'Gravity', effectName: 'Gravity', category: 'other', rounds: 4 },
    { moveName: 'Ion Deluge', effectName: 'Ion Deluge', category: 'other', rounds: 4 },
    { moveName: 'Reflect', effectName: 'Reflect', category: 'forceField', rounds: 4 },
    { moveName: 'Light Screen', effectName: 'Light Screen', category: 'forceField', rounds: 4 },
    { moveName: 'Safeguard', effectName: 'Safeguard', category: 'forceField', rounds: 4 },
    { moveName: 'Mist', effectName: 'Mist', category: 'forceField', rounds: 4 }
];

export const FIELD_EFFECT_INITIALS_MAP: Record<string, string> = {
    sunny: 'SN',
    rain: 'RN',
    sandstorm: 'SS',
    snowy: 'SW',
    hail: 'HL',
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
    reflect: 'RF',
    'light screen': 'LS',
    safeguard: 'SG',
    mist: 'MS',
    'aurora veil': 'AV',
    spikes: 'SP',
    'stealth rock': 'SR',
    'toxic spikes': 'TS',
    'sticky web': 'SW'
};
