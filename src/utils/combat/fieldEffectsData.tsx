import {
    Sun,
    CloudRain,
    Wind,
    Snowflake,
    Zap,
    Sprout,
    Sparkles,
    Eye,
    Shield,
    Flame,
    Droplets,
    Mountain,
    Moon,
    CloudLightning
} from 'lucide-react';
import { WEATHER_CONDITIONS_DATA } from '../../data/gm/gmStatusData';
import { useCharacterStore } from '../../store/useCharacterStore';

export type FieldEffectIconKey =
    | 'Sun'
    | 'CloudRain'
    | 'Wind'
    | 'Snowflake'
    | 'Zap'
    | 'Sprout'
    | 'Sparkles'
    | 'Eye'
    | 'Shield'
    | 'Flame'
    | 'Droplets'
    | 'Mountain'
    | 'Moon'
    | 'CloudLightning'
    | string;

export interface FieldEffectInfo {
    id: string;
    name: string;
    category: 'weather' | 'terrain' | 'other' | 'forceField';
    badge: string;
    color: string;
    icon: FieldEffectIconKey;
    effects: string[];
}

export const TERRAIN_CONDITIONS_DATA: FieldEffectInfo[] = [
    {
        id: 'terrain-electric',
        name: 'Electric Terrain',
        category: 'terrain',
        badge: 'Electric',
        color: '#F8D030',
        icon: 'Zap',
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
        effects: ['All Normal-type moves become Electric-type for the rest of the round']
    },
    {
        id: 'field-reflect',
        name: 'Reflect',
        category: 'forceField',
        badge: 'Barrier',
        color: '#E91E63',
        icon: 'Shield',
        effects: ['Reduces Physical Damage taken by the protected side by 1 for 4 rounds']
    },
    {
        id: 'field-light-screen',
        name: 'Light Screen',
        category: 'forceField',
        badge: 'Screen',
        color: '#AB47BC',
        icon: 'Shield',
        effects: ['Reduces Special Damage taken by the protected side by 1 for 4 rounds']
    },
    {
        id: 'field-safeguard',
        name: 'Safeguard',
        category: 'forceField',
        badge: 'Ward',
        color: '#26A69A',
        icon: 'Shield',
        effects: ['Protects the side from receiving Status Ailments and Confusion for 4 rounds']
    },
    {
        id: 'field-mist',
        name: 'Mist',
        category: 'forceField',
        badge: 'Haze',
        color: '#80DEEA',
        icon: 'Shield',
        effects: ['Protects the side from having their stats or dice pools lowered by opponents']
    }
];

export function getFieldEffectInfo(
    rawName: string,
    categoryHint?: 'weather' | 'terrain' | 'other' | 'forceField'
): FieldEffectInfo {
    const name = rawName.trim();
    const clean = name.toLowerCase();

    // 1. Check Terrains
    const terrainMatch = TERRAIN_CONDITIONS_DATA.find(
        (t) => clean.includes(t.name.toLowerCase()) || clean.includes(t.badge.toLowerCase())
    );
    if (terrainMatch && (categoryHint === 'terrain' || !categoryHint)) {
        return terrainMatch;
    }

    // 2. Check Other / Force fields
    const otherMatch = OTHER_FIELD_CONDITIONS_DATA.find((o) => clean.includes(o.name.toLowerCase()));
    if (otherMatch && (categoryHint === otherMatch.category || !categoryHint)) {
        return otherMatch;
    }

    // 3. Check Weather conditions data
    const weatherData = WEATHER_CONDITIONS_DATA.find(
        (w) =>
            clean.includes(w.name.toLowerCase()) ||
            (w.id === 'weather-sunny' && (clean.includes('sun') || clean.includes('harsh sun') || clean.includes('desolate'))) ||
            (w.id === 'weather-rain' && (clean.includes('rain') || clean.includes('drizzle') || clean.includes('typhoon'))) ||
            (w.id === 'weather-sandstorm' && clean.includes('sand')) ||
            (w.id === 'weather-snowy' && (clean.includes('snow') || clean.includes('blizzard'))) ||
            (w.id === 'weather-hail' && clean.includes('hail'))
    );

    if (weatherData) {
        let icon: FieldEffectIconKey = 'Sun';
        if (weatherData.id.includes('rain') || weatherData.id.includes('typhoon')) icon = 'CloudRain';
        else if (weatherData.id.includes('sandstorm') || weatherData.id.includes('strong-winds')) icon = 'Wind';
        else if (weatherData.id.includes('snow') || weatherData.id.includes('hail')) icon = 'Snowflake';

        return {
            id: weatherData.id,
            name: weatherData.name,
            category: 'weather',
            badge: weatherData.badge,
            color: weatherData.color,
            icon,
            effects: weatherData.effects
        };
    }

    // 4. Fallback based on keywords or category hint
    let fallbackIcon: FieldEffectIconKey = 'Sparkles';
    let fallbackColor = '#607D8B';
    let fallbackBadge = 'Field';

    if (clean.includes('sun') || clean.includes('fire')) {
        fallbackIcon = 'Sun';
        fallbackColor = '#F08030';
        fallbackBadge = 'Sun';
    } else if (clean.includes('rain') || clean.includes('water')) {
        fallbackIcon = 'CloudRain';
        fallbackColor = '#6890F0';
        fallbackBadge = 'Rain';
    } else if (clean.includes('wind') || clean.includes('sand')) {
        fallbackIcon = 'Wind';
        fallbackColor = '#E0C068';
        fallbackBadge = 'Wind';
    } else if (clean.includes('ice') || clean.includes('snow') || clean.includes('hail')) {
        fallbackIcon = 'Snowflake';
        fallbackColor = '#98D8D8';
        fallbackBadge = 'Ice';
    } else if (clean.includes('zap') || clean.includes('electr')) {
        fallbackIcon = 'Zap';
        fallbackColor = '#F8D030';
        fallbackBadge = 'Electric';
    } else if (clean.includes('grass') || clean.includes('plant') || clean.includes('bloom')) {
        fallbackIcon = 'Sprout';
        fallbackColor = '#78C850';
        fallbackBadge = 'Grass';
    } else if (clean.includes('psychic') || clean.includes('mind')) {
        fallbackIcon = 'Eye';
        fallbackColor = '#F85888';
        fallbackBadge = 'Psychic';
    } else if (clean.includes('shield') || clean.includes('screen') || clean.includes('reflect') || clean.includes('veil')) {
        fallbackIcon = 'Shield';
        fallbackColor = '#E91E63';
        fallbackBadge = 'Barrier';
    }

    try {
        const customEffects = useCharacterStore.getState().roomCustomFieldEffects;
        if (customEffects && Array.isArray(customEffects)) {
            const found = customEffects.find((c) => c.name.toLowerCase().trim() === clean);
            if (found) {
                return {
                    id: found.id,
                    name: found.name,
                    category: found.category === 'field' ? 'other' : found.category,
                    badge: found.category.toUpperCase(),
                    color: found.color || fallbackColor,
                    icon: (found.icon as FieldEffectIconKey) || fallbackIcon,
                    effects: [found.description || found.tags || 'Active custom battlefield effect.']
                };
            }
        }
    } catch {
        // Safe fallback if store is not yet initialized
    }

    return {
        id: `custom-${clean.replace(/\s+/g, '-')}`,
        name: rawName,
        category: categoryHint || 'other',
        badge: fallbackBadge,
        color: fallbackColor,
        icon: fallbackIcon,
        effects: ['Active custom battlefield effect.']
    };
}

export function FieldEffectIcon({
    icon,
    size = 14,
    className
}: {
    icon: FieldEffectIconKey;
    size?: number;
    className?: string;
}) {
    switch (icon) {
        case 'Sun':
            return <Sun size={size} className={className} />;
        case 'CloudRain':
            return <CloudRain size={size} className={className} />;
        case 'Wind':
            return <Wind size={size} className={className} />;
        case 'Snowflake':
            return <Snowflake size={size} className={className} />;
        case 'Zap':
            return <Zap size={size} className={className} />;
        case 'Sprout':
            return <Sprout size={size} className={className} />;
        case 'Eye':
            return <Eye size={size} className={className} />;
        case 'Shield':
            return <Shield size={size} className={className} />;
        case 'Flame':
            return <Flame size={size} className={className} />;
        case 'Droplets':
            return <Droplets size={size} className={className} />;
        case 'Mountain':
            return <Mountain size={size} className={className} />;
        case 'Moon':
            return <Moon size={size} className={className} />;
        case 'CloudLightning':
            return <CloudLightning size={size} className={className} />;
        case 'Sparkles':
        default:
            return <Sparkles size={size} className={className} />;
    }
}

export interface MoveFieldEffectDefinition {
    moveName: string;
    effectName: string;
    category: 'weather' | 'terrain' | 'other' | 'forceField';
    rounds: number;
}

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

export function detectMoveFieldEffect(text: string): MoveFieldEffectDefinition | null {
    if (!text) return null;
    const clean = text.toLowerCase().trim();
    for (const def of MOVE_FIELD_EFFECT_MAP) {
        const lowerMove = def.moveName.toLowerCase();
        if (clean === lowerMove || clean.includes(lowerMove)) {
            return def;
        }
    }
    return null;
}
