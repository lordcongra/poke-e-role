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
    '#64748B'  // Slate / Neutral
];

export function parseTagPills(rawTags: string): string[] {
    return (rawTags || '')
        .split(']')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('[') ? `${t}]` : `[${t}]`));
}
