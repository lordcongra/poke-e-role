import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { fetchMoveLookupIndex } from '../../../utils/api/api';
import { getUserPreference, setUserPreference } from '../../../utils/sync/userPreferences';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import type { CustomType } from '../../../store/storeTypes';

export const LEARNSET_COLOR_BY_TYPE_KEY = 'learnset_color_by_type';
export const LEARNSET_CUSTOM_TYPE_COLORS_KEY = 'learnset_custom_type_colors';

/**
 * High-contrast, visually distinct type palette specifically curated for Learnset visibility on dark backgrounds.
 * Isolates high-contrast colors solely to Learnset pills without affecting sheet theming or base TYPE_COLORS.
 */
export const LEARNSET_HIGH_CONTRAST_TYPE_COLORS: Record<string, string> = {
    Normal: '#9CA3AF', // Silvery slate-gray (distinct from earth/brown)
    Dark: '#4A4453', // Deep midnight obsidian (shadow slate)
    Rock: '#BFA640', // Stony mineral ochre / sandstone (warm golden stone)
    Ground: '#D97746', // Warm terracotta clay / rich red-orange earth
    Flying: '#76A5E8', // Atmospheric sky breeze blue (differentiated from purple)
    Ghost: '#7949A5', // Spectral deep violet-purple (RGB: 121, 73, 165)
    Poison: '#A33EA1', // Toxic vivid magenta-violet
    Bug: '#92BC2C', // Vivid lime insect green
    Grass: '#59B44F', // Fresh vibrant meadow green
    Fire: '#F08030', // Bright flame orange-red
    Water: '#4E90D6', // Oceanic azure blue
    Ice: '#51C4E7', // Glacial crystalline cyan
    Electric: '#F8D030', // Lightning bright yellow
    Fighting: '#C22E28', // Bold martial brick crimson
    Psychic: '#F85888', // Vibrant cosmic pink
    Dragon: '#6F35FC', // Royal mythical violet-indigo
    Steel: '#60A1B8', // Polished chrome metallic steel
    Fairy: '#EE99AC', // Luminous rose pink
    Stellar: '#4DD0E1' // Celestial prismatic teal
};

export interface MoveTypeInfo {
    type?: string;
    color?: string;
}

export function useLearnsetTypeColors() {
    const [colorByType, setColorByType] = useState<boolean>(() => {
        try {
            const cached = localStorage.getItem(`pkr_pref_${LEARNSET_COLOR_BY_TYPE_KEY}`);
            return cached !== null ? JSON.parse(cached) : false;
        } catch {
            return false;
        }
    });

    const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
        try {
            const cached = localStorage.getItem(`pkr_pref_${LEARNSET_CUSTOM_TYPE_COLORS_KEY}`);
            return cached !== null ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    });

    const [moveTypeMap, setMoveTypeMap] = useState<Record<string, string>>({});

    const role = useCharacterStore((state) => state.role);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);

    // Initialize preferences from IndexedDB on startup
    useEffect(() => {
        let isMounted = true;
        getUserPreference<boolean>(LEARNSET_COLOR_BY_TYPE_KEY, false).then((val) => {
            if (isMounted) {
                setColorByType(val);
            }
        });
        getUserPreference<Record<string, string>>(LEARNSET_CUSTOM_TYPE_COLORS_KEY, {}).then((val) => {
            if (isMounted && val && typeof val === 'object') {
                setCustomColors(val);
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    // Filter homebrew types respecting GM-only restrictions
    const visibleCustomTypes = useMemo(() => {
        return (roomCustomTypes || []).filter((t: CustomType) => isStandaloneMode || role === 'GM' || !t.gmOnly);
    }, [roomCustomTypes, role]);

    // Load move types dictionary from move lookup index and custom moves
    useEffect(() => {
        let isMounted = true;
        fetchMoveLookupIndex()
            .then((entries) => {
                if (!isMounted) return;
                const mapping: Record<string, string> = {};
                for (const entry of entries) {
                    if (entry.name && entry.type) {
                        mapping[entry.name.toLowerCase().trim()] = entry.type;
                    }
                }
                if (roomCustomMoves) {
                    for (const cm of roomCustomMoves) {
                        if (cm.name && cm.type) {
                            mapping[cm.name.toLowerCase().trim()] = cm.type;
                        }
                    }
                }
                setMoveTypeMap(mapping);
            })
            .catch((err) => {
                console.warn('[useLearnsetTypeColors] Failed to fetch move index:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [roomCustomMoves]);

    // Combine high-contrast type colors, custom homebrew & room types, and user custom color overrides
    const combinedColors = useMemo(() => {
        const customMap: Record<string, string> = {};
        (roomCustomTypes || []).forEach((t: CustomType) => {
            if (t.name && t.color) customMap[t.name] = t.color;
        });
        return {
            ...LEARNSET_HIGH_CONTRAST_TYPE_COLORS,
            ...customMap,
            ...customColors
        };
    }, [roomCustomTypes, customColors]);

    const toggleColorByType = useCallback(() => {
        setColorByType((prev) => {
            const next = !prev;
            setUserPreference(LEARNSET_COLOR_BY_TYPE_KEY, next);
            return next;
        });
    }, []);

    const setTypeColorOverride = useCallback((type: string, color: string) => {
        const cleanType = type.trim();
        const titleType = cleanType.charAt(0).toUpperCase() + cleanType.slice(1).toLowerCase();
        setCustomColors((prev) => {
            const next = { ...prev, [titleType]: color };
            setUserPreference(LEARNSET_CUSTOM_TYPE_COLORS_KEY, next);
            return next;
        });
    }, []);

    const resetTypeColorOverride = useCallback((type: string) => {
        const cleanType = type.trim();
        const titleType = cleanType.charAt(0).toUpperCase() + cleanType.slice(1).toLowerCase();
        setCustomColors((prev) => {
            const next = { ...prev };
            delete next[cleanType];
            delete next[titleType];
            setUserPreference(LEARNSET_CUSTOM_TYPE_COLORS_KEY, next);
            return next;
        });
    }, []);

    const resetAllTypeColors = useCallback(() => {
        setCustomColors({});
        setUserPreference(LEARNSET_CUSTOM_TYPE_COLORS_KEY, {});
    }, []);

    const getMoveTypeInfo = useCallback(
        (moveName: string): MoveTypeInfo => {
            if (!colorByType) return {};
            const clean = moveName.toLowerCase().trim();
            const type = moveTypeMap[clean];
            if (!type) return {};

            const cleanType = type.trim();
            const titleType = cleanType.charAt(0).toUpperCase() + cleanType.slice(1).toLowerCase();
            const color = combinedColors[cleanType] || combinedColors[titleType];

            return {
                type,
                color
            };
        },
        [colorByType, moveTypeMap, combinedColors]
    );

    return {
        colorByType,
        toggleColorByType,
        getMoveTypeInfo,
        customColors,
        setTypeColorOverride,
        resetTypeColorOverride,
        resetAllTypeColors,
        visibleCustomTypes
    };
}
