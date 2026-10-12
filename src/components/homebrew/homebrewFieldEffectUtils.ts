import {
    Sparkles,
    Sun,
    CloudRain,
    Wind,
    Snowflake,
    Zap,
    Sprout,
    Eye,
    Shield,
    Flame,
    Droplets,
    Mountain,
    Moon,
    CloudLightning,
    type LucideIcon
} from 'lucide-react';

export interface FieldIconOption {
    key: string;
    label: string;
    Icon: LucideIcon;
}

export const AVAILABLE_FIELD_ICONS: FieldIconOption[] = [
    { key: 'CloudRain', label: 'Rain', Icon: CloudRain },
    { key: 'Sun', label: 'Sun', Icon: Sun },
    { key: 'Wind', label: 'Wind', Icon: Wind },
    { key: 'Snowflake', label: 'Snow', Icon: Snowflake },
    { key: 'Zap', label: 'Electric', Icon: Zap },
    { key: 'Sprout', label: 'Grass', Icon: Sprout },
    { key: 'Eye', label: 'Psychic', Icon: Eye },
    { key: 'Shield', label: 'Barrier', Icon: Shield },
    { key: 'Sparkles', label: 'Magic', Icon: Sparkles },
    { key: 'Flame', label: 'Fire', Icon: Flame },
    { key: 'Droplets', label: 'Water', Icon: Droplets },
    { key: 'Mountain', label: 'Rock', Icon: Mountain },
    { key: 'Moon', label: 'Dark', Icon: Moon },
    { key: 'CloudLightning', label: 'Storm', Icon: CloudLightning }
];

export const PRESET_FIELD_COLORS: string[] = [
    '#3B82F6', // Blue / Rain
    '#F08030', // Orange / Sun
    '#E0C068', // Tan / Sand
    '#98D8D8', // Cyan / Snow
    '#F8D030', // Yellow / Electric
    '#78C850', // Green / Grass
    '#F85888', // Pink / Psychic
    '#EE99AC', // Rose / Fairy
    '#A040A0', // Purple / Poison
    '#8B5CF6', // Violet / Arcane
    '#E91E63', // Red / Barrier
    '#705848', // Brown / Dark
    '#64748B' // Slate / Neutral
];

export function parseTagPills(rawTags: string): string[] {
    return (rawTags || '')
        .split(']')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('[') ? `${t}]` : `[${t}]`));
}

export const CANONICAL_WEATHER_KEYS = [
    'rain',
    'raining',
    'rainy',
    'heavy rain',
    'typhoon',
    'primordial sea',
    'sun',
    'sunny',
    'sunlight',
    'harsh sun',
    'harsh sunlight',
    'desolate',
    'desolate weather',
    'desolate land',
    'sandstorm',
    'sand',
    'snow',
    'snowy',
    'hail',
    'hailing',
    'strong winds',
    'wind',
    'delta stream'
];

export const CANONICAL_TERRAIN_KEYS = [
    'electric terrain',
    'electric',
    'grassy terrain',
    'grassy',
    'misty terrain',
    'misty',
    'psychic terrain',
    'psychic',
    'terrain',
    'any terrain'
];

export const CANONICAL_OTHER_FIELD_KEYS = ['trick room', 'gravity', 'ion deluge'];

export const CANONICAL_STATUS_KEYS = [
    'status',
    'any status',
    'status ailment',
    'status effect',
    'ailment',
    'statused',
    'healthy',
    'burn',
    'burned',
    '1st degree burn',
    '2nd degree burn',
    '3rd degree burn',
    'poison',
    'poisoned',
    'badly poisoned',
    'toxic',
    'paralysis',
    'paralyzed',
    'frozen solid',
    'frozen',
    'freeze',
    'sleep',
    'asleep',
    'sleeping',
    'confusion',
    'confused',
    'in love',
    'infatuation',
    'infatuated',
    'disable',
    'disabled',
    'flinch',
    'flinched'
];

export interface ConditionCollisionInfo {
    collides: boolean;
    source?: string;
    matchedName?: string;
}

export function checkConditionTagCollision(
    rawTag: string,
    currentEffectId: string,
    otherCustomEffects: { id: string; name: string; conditionTag?: string }[]
): ConditionCollisionInfo {
    const key = rawTag.trim().toLowerCase();
    if (!key) return { collides: false };

    if (CANONICAL_WEATHER_KEYS.includes(key)) {
        return { collides: true, source: 'Canonical Weather', matchedName: key };
    }
    if (CANONICAL_TERRAIN_KEYS.includes(key)) {
        return { collides: true, source: 'Canonical Terrain', matchedName: key };
    }
    if (CANONICAL_OTHER_FIELD_KEYS.includes(key)) {
        return { collides: true, source: 'Canonical Battlefield Effect', matchedName: key };
    }
    if (CANONICAL_STATUS_KEYS.includes(key)) {
        return { collides: true, source: 'Status Condition', matchedName: key };
    }

    const collidingCustom = otherCustomEffects.find((c) => {
        if (c.id === currentEffectId) return false;
        const cTag = (c.conditionTag || c.name).trim().toLowerCase();
        const cName = c.name.trim().toLowerCase();
        return cTag === key || cName === key;
    });

    if (collidingCustom) {
        return {
            collides: true,
            source: 'Custom Field Effect',
            matchedName: collidingCustom.name
        };
    }

    return { collides: false };
}
