import { WEATHER_CONDITIONS_DATA } from '../../data/gm/gmStatusData';
import { useCharacterStore } from '../../store/useCharacterStore';
import { FieldEffectIcon, type FieldEffectIconKey } from './FieldEffectIcon';
export { FieldEffectIcon, type FieldEffectIconKey };

export interface FieldEffectInfo {
    id: string;
    name: string;
    category: 'weather' | 'terrain' | 'other' | 'forceField' | 'entryHazard';
    badge: string;
    color: string;
    icon: FieldEffectIconKey;
    effects: string[];
    initials: string;
    defaultRounds?: number;
}

import {
    TERRAIN_CONDITIONS_DATA,
    OTHER_FIELD_CONDITIONS_DATA,
    FORCE_FIELD_CONDITIONS_DATA,
    ENTRY_HAZARD_CONDITIONS_DATA,
    MOVE_FIELD_EFFECT_MAP,
    FIELD_EFFECT_INITIALS_MAP,
    CANONICAL_HAZARDS,
    CANONICAL_SIDE_OTHER
} from './fieldEffectsConstants';

export {
    TERRAIN_CONDITIONS_DATA,
    OTHER_FIELD_CONDITIONS_DATA,
    FORCE_FIELD_CONDITIONS_DATA,
    ENTRY_HAZARD_CONDITIONS_DATA,
    MOVE_FIELD_EFFECT_MAP,
    FIELD_EFFECT_INITIALS_MAP,
    CANONICAL_HAZARDS,
    CANONICAL_SIDE_OTHER
};

export function getFieldEffectInitials(rawName: string): string {
    if (!rawName) return '??';
    const stripped = rawName.replace(/^(?:\[?(?:ally|foe|player|enemy)\]?[:\s-]+)/i, '').trim();
    const clean = stripped || rawName.trim();
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
    categoryHint?: 'weather' | 'terrain' | 'other' | 'forceField' | 'entryHazard'
): FieldEffectInfo {
    const stripped = rawName.replace(/^(?:\[?(?:ally|foe|player|enemy)\]?[:\s-]+)/i, '').trim();
    const name = stripped || rawName.trim();
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

    // Matchers for standard categories
    const findTerrain = (): FieldEffectInfo | undefined => {
        const match = TERRAIN_CONDITIONS_DATA.find((t) => {
            const tName = t.name.toLowerCase();
            const tBadge = t.badge.toLowerCase();
            if (clean.includes(tName) || (t.id === 'terrain-misty' && clean.includes('misty'))) return true;
            if (clean === tBadge) return true;
            const badgeWordRegex = new RegExp(`\\b${tBadge}\\s+terrain\\b`, 'i');
            return badgeWordRegex.test(clean);
        });
        return match
            ? {
                  ...match,
                  initials: match.initials || getFieldEffectInitials(match.name)
              }
            : undefined;
    };

    const findForceField = (): FieldEffectInfo | undefined => {
        const match = FORCE_FIELD_CONDITIONS_DATA.find(
            (f) => clean === f.name.toLowerCase() || clean.includes(f.name.toLowerCase())
        );
        return match
            ? {
                  ...match,
                  initials: match.initials || getFieldEffectInitials(match.name)
              }
            : undefined;
    };

    const findHazard = (): FieldEffectInfo | undefined => {
        const match = ENTRY_HAZARD_CONDITIONS_DATA.find(
            (h) => clean === h.name.toLowerCase() || clean.includes(h.name.toLowerCase())
        );
        return match
            ? {
                  ...match,
                  initials: match.initials || getFieldEffectInitials(match.name)
              }
            : undefined;
    };

    const findOther = (): FieldEffectInfo | undefined => {
        const match = OTHER_FIELD_CONDITIONS_DATA.find((o) => clean.includes(o.name.toLowerCase()));
        return match
            ? {
                  ...match,
                  initials: match.initials || getFieldEffectInitials(match.name)
              }
            : undefined;
    };

    const findWeather = (): FieldEffectInfo | undefined => {
        const weatherData = WEATHER_CONDITIONS_DATA.find(
            (w) =>
                (w.id === 'weather-rain'
                    ? /\b(rain|raining|rainy|drizzle|typhoon)\b/i.test(clean)
                    : clean.includes(w.name.toLowerCase())) ||
                (w.id === 'weather-sunny' &&
                    (clean.includes('sun') || clean.includes('harsh sun') || clean.includes('desolate'))) ||
                (w.id === 'weather-sandstorm' && clean.includes('sand')) ||
                (w.id === 'weather-snowy' && (clean.includes('snow') || clean.includes('blizzard'))) ||
                (w.id === 'weather-hail' && clean.includes('hail'))
        );
        if (!weatherData) return undefined;

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
    };

    // If categoryHint is provided, search that category first
    if (categoryHint) {
        let hintedMatch: FieldEffectInfo | undefined;
        if (categoryHint === 'terrain') hintedMatch = findTerrain();
        else if (categoryHint === 'forceField') hintedMatch = findForceField();
        else if (categoryHint === 'entryHazard') hintedMatch = findHazard();
        else if (categoryHint === 'other') hintedMatch = findOther();
        else if (categoryHint === 'weather') hintedMatch = findWeather();

        if (hintedMatch) {
            return hintedMatch;
        }
    }

    // Cross-category search across all standard categories before falling back to keywords
    const standardMatch = findTerrain() || findForceField() || findHazard() || findOther() || findWeather();
    if (standardMatch) {
        return standardMatch;
    }

    // Fallback based on keywords or category hint
    let fallbackIcon: FieldEffectIconKey = 'Sparkles';
    let fallbackColor = '#607D8B';
    let fallbackBadge = 'Field';

    if (clean.includes('grass') || clean.includes('plant') || clean.includes('bloom')) {
        fallbackIcon = 'Sprout';
        fallbackColor = '#78C850';
        fallbackBadge = 'Grass';
    } else if (clean.includes('sun') || clean.includes('fire')) {
        fallbackIcon = 'Sun';
        fallbackColor = '#F08030';
        fallbackBadge = 'Sun';
    } else if (/\b(rain|raining|rainy|drizzle|typhoon)\b/i.test(clean) || clean.includes('water')) {
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

export interface MoveFieldEffectDefinition {
    moveName: string;
    effectName: string;
    category: 'weather' | 'terrain' | 'other' | 'forceField' | 'entryHazard';
    rounds: number;
}

import { parseBattlefieldTagFromText } from './fieldEffectsTagUtils';
export { parseBattlefieldTagFromText };

export function detectMoveFieldEffect(text: string): MoveFieldEffectDefinition | null {
    if (!text) return null;

    // 1. Direct tag parsing in text (e.g. if text contains bracketed battlefield tags)
    const directTag = parseBattlefieldTagFromText(text);
    if (directTag) return directTag;

    const clean = text.toLowerCase().trim();
    for (const def of MOVE_FIELD_EFFECT_MAP) {
        const lowerMove = def.moveName.toLowerCase();
        if (clean === lowerMove || clean.includes(lowerMove)) {
            return def;
        }
    }

    // 2. Inspect custom homebrew field effects
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

    // 3. Inspect roomCustomMoves and active sheet moves by name to check if move has an embedded battlefield tag in desc
    try {
        const state = useCharacterStore.getState();
        const customMoves = state.roomCustomMoves || [];
        const sheetMoves = state.moves || [];
        const allMoves = [...customMoves, ...sheetMoves];

        for (const move of allMoves) {
            const mName = move.name?.trim().toLowerCase();
            if (mName && (clean === mName || clean.includes(mName))) {
                if (move.desc) {
                    const tagDef = parseBattlefieldTagFromText(move.desc, move.name);
                    if (tagDef) return tagDef;
                }
            }
        }
    } catch {
        // Safe fallback if store is not yet initialized
    }

    return null;
}

export { type ActiveFieldEffectItem, getEffectsByCategory, getAllActiveFieldEffects } from './fieldEffectsActiveUtils';
