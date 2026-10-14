import type React from 'react';
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
    CloudLightning,
    CloudFog,
    Skull,
    Feather,
    Waves,
    Heart,
    Swords,
    TreePine,
    Compass,
    Star,
    ShieldAlert,
    Target,
    Hourglass,
    Crosshair,
    Sparkle,
    Flower2,
    Ghost,
    Gem,
    ShieldCheck
} from 'lucide-react';

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
    | 'CloudFog'
    | 'Skull'
    | 'Feather'
    | 'Waves'
    | 'Heart'
    | 'Swords'
    | 'TreePine'
    | 'Compass'
    | 'Star'
    | 'ShieldAlert'
    | string;

const FIELD_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
    CloudLightning,
    CloudFog,
    Skull,
    Feather,
    Waves,
    Heart,
    Swords,
    TreePine,
    Compass,
    Star,
    ShieldAlert,
    Target,
    Hourglass,
    Crosshair,
    Sparkle,
    Flower2,
    Ghost,
    Gem,
    ShieldCheck
};

export function FieldEffectIcon({
    icon,
    size = 14,
    className
}: {
    icon: FieldEffectIconKey;
    size?: number;
    className?: string;
}) {
    const Component = FIELD_ICON_MAP[icon] || Sparkles;
    return <Component size={size} className={className} />;
}
