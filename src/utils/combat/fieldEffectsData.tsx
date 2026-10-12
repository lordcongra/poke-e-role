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
    initials: string;
}

import {
    TERRAIN_CONDITIONS_DATA,
    OTHER_FIELD_CONDITIONS_DATA,
    MOVE_FIELD_EFFECT_MAP,
    FIELD_EFFECT_INITIALS_MAP
} from './fieldEffectsConstants';
import type { BattlefieldData, BattleOrganizerTimerEffect } from '../../types/battleOrganizerTypes';

export { TERRAIN_CONDITIONS_DATA, OTHER_FIELD_CONDITIONS_DATA, MOVE_FIELD_EFFECT_MAP, FIELD_EFFECT_INITIALS_MAP };

export function getFieldEffectInitials(rawName: string): string {
    if (!rawName) return '??';
    const clean = rawName.trim();
    const lower = clean.toLowerCase();
    if (FIELD_EFFECT_INITIALS_MAP[lower]) {
        return FIELD_EFFECT_INITIALS_MAP[lower];
    }
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (clean.length >= 2) {
        return clean.slice(0, 2).toUpperCase();
    }
    return clean.toUpperCase().padEnd(2, '?');
}

export function getFieldEffectInfo(
    rawName: string,
    categoryHint?: 'weather' | 'terrain' | 'other' | 'forceField'
): FieldEffectInfo {
    const name = rawName.trim();
    const clean = name.toLowerCase();

    // 1. Check custom homebrew effects first for exact name matches
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
                    color: found.color || '#607D8B',
                    icon: (found.icon as FieldEffectIconKey) || 'Sparkles',
                    initials: getFieldEffectInitials(found.name),
                    effects: [found.description || found.tags || 'Active custom battlefield effect.']
                };
            }
        }
    } catch {
        // Safe fallback if store is not yet initialized
    }

    // 2. Check Terrains (exact or whole-word matching for badge keywords so names like "Fairy Ward" do not match "Misty Terrain")
    const terrainMatch = TERRAIN_CONDITIONS_DATA.find((t) => {
        const tName = t.name.toLowerCase();
        const tBadge = t.badge.toLowerCase();
        if (clean.includes(tName) || (t.id === 'terrain-misty' && clean.includes('misty'))) return true;
        if (clean === tBadge) return true;
        const badgeWordRegex = new RegExp(`\\b${tBadge}\\s+terrain\\b`, 'i');
        return badgeWordRegex.test(clean);
    });
    if (terrainMatch && (categoryHint === 'terrain' || !categoryHint)) {
        return {
            ...terrainMatch,
            initials: terrainMatch.initials || getFieldEffectInitials(terrainMatch.name)
        };
    }

    // 3. Check Other / Force fields
    const otherMatch = OTHER_FIELD_CONDITIONS_DATA.find((o) => clean.includes(o.name.toLowerCase()));
    if (otherMatch && (categoryHint === otherMatch.category || !categoryHint)) {
        return {
            ...otherMatch,
            initials: otherMatch.initials || getFieldEffectInitials(otherMatch.name)
        };
    }

    // 4. Check Weather conditions data
    const weatherData = WEATHER_CONDITIONS_DATA.find(
        (w) =>
            clean.includes(w.name.toLowerCase()) ||
            (w.id === 'weather-sunny' &&
                (clean.includes('sun') || clean.includes('harsh sun') || clean.includes('desolate'))) ||
            (w.id === 'weather-rain' &&
                (clean.includes('rain') || clean.includes('drizzle') || clean.includes('typhoon'))) ||
            (w.id === 'weather-sandstorm' && clean.includes('sand')) ||
            (w.id === 'weather-snowy' && (clean.includes('snow') || clean.includes('blizzard'))) ||
            (w.id === 'weather-hail' && clean.includes('hail'))
    );

    if (weatherData && (categoryHint === 'weather' || !categoryHint)) {
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
            initials: getFieldEffectInitials(weatherData.name),
            effects: weatherData.effects
        };
    }

    // 5. Fallback based on keywords or category hint
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
    } else if (
        clean.includes('shield') ||
        clean.includes('screen') ||
        clean.includes('reflect') ||
        clean.includes('veil')
    ) {
        fallbackIcon = 'Shield';
        fallbackColor = '#E91E63';
        fallbackBadge = 'Barrier';
    }

    return {
        id: `custom-${clean.replace(/\s+/g, '-')}`,
        name: rawName,
        category: categoryHint || 'other',
        badge: fallbackBadge,
        color: fallbackColor,
        icon: fallbackIcon,
        initials: getFieldEffectInitials(rawName),
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

export function detectMoveFieldEffect(text: string): MoveFieldEffectDefinition | null {
    if (!text) return null;
    const clean = text.toLowerCase().trim();
    for (const def of MOVE_FIELD_EFFECT_MAP) {
        const lowerMove = def.moveName.toLowerCase();
        if (clean === lowerMove || clean.includes(lowerMove)) {
            return def;
        }
    }

    // Inspect custom homebrew field effects
    try {
        const customEffects = useCharacterStore.getState().roomCustomFieldEffects;
        if (customEffects && Array.isArray(customEffects)) {
            for (const effect of customEffects) {
                const effNameLower = effect.name.trim().toLowerCase();
                if (!effNameLower) continue;

                const matchesName = clean === effNameLower || clean.includes(effNameLower);
                const matchesTriggerMove = effect.triggerMoves?.some((tm) => {
                    const cleanTm = tm.trim().toLowerCase();
                    return cleanTm && (clean === cleanTm || clean.includes(cleanTm));
                });

                if (matchesName || matchesTriggerMove) {
                    return {
                        moveName: effect.name,
                        effectName: effect.name,
                        category: (effect.category === 'field' ? 'other' : effect.category) as
                            | 'weather'
                            | 'terrain'
                            | 'other',
                        rounds: effect.defaultRounds ?? 4
                    };
                }
            }
        }
    } catch {
        // Safe fallback if store is not yet initialized
    }

    return null;
}

export interface ActiveFieldEffectItem extends BattleOrganizerTimerEffect {
    category: 'weather' | 'terrain' | 'other' | 'forceField';
    id: string;
    subLabel?: string;
    prefix?: string;
    isExtra?: boolean;
    extraIndex?: number;
    side?: 'player' | 'foe';
    forceFieldIndex?: 0 | 1;
}

export function getEffectsByCategory(
    battlefield: BattlefieldData | null | undefined,
    category: 'weather' | 'terrain' | 'other'
): BattleOrganizerTimerEffect[] {
    if (!battlefield) return [];
    const results: BattleOrganizerTimerEffect[] = [];

    const primary = battlefield[category];
    if (primary?.name?.trim() && (primary.remainingRounds ?? 0) > 0) {
        results.push(primary);
    }

    const extras =
        category === 'weather'
            ? battlefield.extraWeathers
            : category === 'terrain'
              ? battlefield.extraTerrains
              : battlefield.extraOther;

    if (extras && Array.isArray(extras)) {
        for (const item of extras) {
            if (item?.name?.trim() && (item.remainingRounds ?? 0) > 0) {
                results.push(item);
            }
        }
    }

    return results;
}

export function getAllActiveFieldEffects(battlefield: BattlefieldData | null | undefined): ActiveFieldEffectItem[] {
    if (!battlefield) return [];
    const results: ActiveFieldEffectItem[] = [];

    // Weather Primary & Extras
    if (battlefield.weather?.name?.trim() && (battlefield.weather.remainingRounds ?? 0) > 0) {
        results.push({
            ...battlefield.weather,
            category: 'weather',
            id: 'weather-primary',
            prefix: 'Weather',
            isExtra: false
        });
    }
    battlefield.extraWeathers?.forEach((w, idx) => {
        if (w?.name?.trim() && (w.remainingRounds ?? 0) > 0) {
            results.push({
                ...w,
                category: 'weather',
                id: `weather-extra-${idx}`,
                prefix: 'Weather',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    // Terrain Primary & Extras
    if (battlefield.terrain?.name?.trim() && (battlefield.terrain.remainingRounds ?? 0) > 0) {
        results.push({
            ...battlefield.terrain,
            category: 'terrain',
            id: 'terrain-primary',
            prefix: 'Terrain',
            isExtra: false
        });
    }
    battlefield.extraTerrains?.forEach((t, idx) => {
        if (t?.name?.trim() && (t.remainingRounds ?? 0) > 0) {
            results.push({
                ...t,
                category: 'terrain',
                id: `terrain-extra-${idx}`,
                prefix: 'Terrain',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    // Other Primary & Extras
    if (battlefield.other?.name?.trim() && (battlefield.other.remainingRounds ?? 0) > 0) {
        results.push({
            ...battlefield.other,
            category: 'other',
            id: 'other-primary',
            prefix: 'Global',
            isExtra: false
        });
    }
    battlefield.extraOther?.forEach((o, idx) => {
        if (o?.name?.trim() && (o.remainingRounds ?? 0) > 0) {
            results.push({
                ...o,
                category: 'other',
                id: `other-extra-${idx}`,
                prefix: 'Global',
                isExtra: true,
                extraIndex: idx
            });
        }
    });

    // Force Fields (Player & Foe)
    battlefield.playerSide?.forceFields?.forEach((ff, idx) => {
        if (ff?.name?.trim() && (ff.remainingRounds ?? 0) > 0) {
            results.push({
                ...ff,
                category: 'forceField',
                id: `player-ff-${idx}`,
                subLabel: 'Ally',
                prefix: 'Ally Field',
                side: 'player',
                forceFieldIndex: idx as 0 | 1
            });
        }
    });

    battlefield.foeSide?.forceFields?.forEach((ff, idx) => {
        if (ff?.name?.trim() && (ff.remainingRounds ?? 0) > 0) {
            results.push({
                ...ff,
                category: 'forceField',
                id: `foe-ff-${idx}`,
                subLabel: 'Foe',
                prefix: 'Foe Field',
                side: 'foe',
                forceFieldIndex: idx as 0 | 1
            });
        }
    });

    return results;
}
