import { useCharacterStore } from '../../store/useCharacterStore';
import { getEffectsByCategory, getAllActiveFieldEffects } from '../combat/fieldEffectsData';

export const safeParseInt = (value: string | undefined): number => parseInt((value || '0').replace(/\s/g, ''), 10) || 0;

export function isBoostCondition(conditionStr: string | undefined): boolean {
    if (!conditionStr) return false;
    const cond = conditionStr.toLowerCase().trim();
    return (
        cond === 'boost' ||
        cond === 'triggered' ||
        cond === 'active' ||
        cond === 'ability boost' ||
        cond.includes('boost') ||
        cond.startsWith('stack')
    );
}

export function isStackingBoostCondition(conditionStr: string | undefined): boolean {
    if (!conditionStr) return false;
    const cond = conditionStr.toLowerCase().trim();
    return cond.includes('stack') || /boost\s*(?::|\s*\d+)/i.test(cond);
}

export function getBoostMultiplier(conditionStr: string | undefined, boostLevel: number, maxBoost: number): number {
    if (!isBoostCondition(conditionStr)) return 1;
    const isStacking = isStackingBoostCondition(conditionStr) || maxBoost > 1;
    return isStacking ? Math.max(1, boostLevel) : 1;
}

export function checkCondition(
    conditionStr: string | undefined,
    isHalfHp: boolean,
    sourceBoostActive?: boolean
): boolean {
    if (!conditionStr) return true;
    const cond = conditionStr.toLowerCase().trim();

    // 1. Half HP
    if (
        cond === 'half hp' ||
        cond === 'half hp or less' ||
        cond === 'half-hp' ||
        cond === '<=50% hp' ||
        cond === '<= 50% hp' ||
        cond === '<=50%' ||
        cond === '50% hp' ||
        cond.includes('half hp') ||
        cond.includes('50%') ||
        cond.includes('half-hp')
    ) {
        return isHalfHp;
    }

    const state = useCharacterStore.getState();

    // 2. Ability / Source Boost Trigger (e.g., Sap Sipper, Moxie, Beast Boost, Steam Engine, etc.)
    if (isBoostCondition(conditionStr)) {
        if (sourceBoostActive !== undefined) {
            return sourceBoostActive;
        }
        return state.identity.abilityBoostActive === true;
    }

    // 3. Status checks
    const activeStatuses = (state.statuses || []).filter((s) => s.name && s.name.toLowerCase() !== 'healthy');

    // Generic status: "@ Status", "@ Any Status", "@ Status Ailment"
    if (
        cond === 'status' ||
        cond === 'any status' ||
        cond === 'status ailment' ||
        cond === 'status effect' ||
        cond === 'ailment' ||
        cond === 'statused'
    ) {
        return activeStatuses.length > 0;
    }

    const hasStatus = (matcher: (name: string, custom: string) => boolean) => {
        return activeStatuses.some((s) => {
            const n = (s.name || '').toLowerCase();
            const c = (s.customName || '').toLowerCase();
            return matcher(n, c);
        });
    };

    if (cond === 'burn' || cond === 'burned') {
        return hasStatus((n, c) => n.includes('burn') || c.includes('burn'));
    }
    if (cond === '1st degree burn' || cond === '1st deg burn') {
        return hasStatus((n, c) => n.includes('1st degree burn') || c.includes('1st degree burn'));
    }
    if (cond === '2nd degree burn' || cond === '2nd deg burn') {
        return hasStatus((n, c) => n.includes('2nd degree burn') || c.includes('2nd degree burn'));
    }
    if (cond === '3rd degree burn' || cond === '3rd deg burn') {
        return hasStatus((n, c) => n.includes('3rd degree burn') || c.includes('3rd degree burn'));
    }
    if (cond === 'poison' || cond === 'poisoned') {
        return hasStatus(
            (n, c) => n.includes('poison') || c.includes('poison') || n.includes('toxic') || c.includes('toxic')
        );
    }
    if (cond === 'badly poisoned' || cond === 'toxic') {
        return hasStatus(
            (n, c) =>
                n.includes('badly poisoned') ||
                c.includes('badly poisoned') ||
                n.includes('toxic') ||
                c.includes('toxic')
        );
    }
    if (cond === 'paralysis' || cond === 'paralyzed') {
        return hasStatus((n, c) => n.includes('paraly') || c.includes('paraly'));
    }
    if (cond === 'frozen solid' || cond === 'frozen' || cond === 'freeze') {
        return hasStatus(
            (n, c) => n.includes('frozen') || c.includes('frozen') || n.includes('freeze') || c.includes('freeze')
        );
    }
    if (cond === 'sleep' || cond === 'asleep' || cond === 'sleeping') {
        return hasStatus((n, c) => n.includes('sleep') || c.includes('sleep'));
    }
    if (cond === 'confusion' || cond === 'confused') {
        return hasStatus((n, c) => n.includes('confus') || c.includes('confus'));
    }
    if (cond === 'in love' || cond === 'infatuation' || cond === 'infatuated') {
        return hasStatus(
            (n, c) => n.includes('love') || c.includes('love') || n.includes('infat') || c.includes('infat')
        );
    }
    if (cond === 'disable' || cond === 'disabled') {
        return hasStatus((n, c) => n.includes('disable') || c.includes('disable'));
    }
    if (cond === 'flinch' || cond === 'flinched') {
        return hasStatus((n, c) => n.includes('flinch') || c.includes('flinch'));
    }

    // Direct match against standard or custom status name
    if (hasStatus((n, c) => n === cond || c === cond)) {
        return true;
    }

    // 4. Weather & Terrain evaluations (strictly checking remainingRounds > 0 across primary and extra slots)
    const activeBattlefield = state.activeBattlefield;
    if (activeBattlefield) {
        const activeWeathers = getEffectsByCategory(activeBattlefield, 'weather');
        for (const weather of activeWeathers) {
            const weatherName = (weather?.name || '').trim().toLowerCase();
            // Rain / Typhoon / Heavy Rain
            if (
                cond === 'rain' ||
                cond === 'raining' ||
                cond === 'rainy' ||
                cond === 'heavy rain' ||
                cond === 'typhoon'
            ) {
                if (
                    weatherName.includes('rain') ||
                    weatherName.includes('typhoon') ||
                    weatherName.includes('primordial sea')
                ) {
                    return true;
                }
            }
            // Sun / Sunny / Harsh Sunlight / Desolate Weather
            if (
                cond === 'sun' ||
                cond === 'sunny' ||
                cond === 'sunlight' ||
                cond === 'harsh sun' ||
                cond === 'harsh sunlight' ||
                cond === 'desolate' ||
                cond === 'desolate weather' ||
                cond === 'desolate land'
            ) {
                if (weatherName.includes('sun') || weatherName.includes('desolate')) {
                    return true;
                }
            }
            // Sandstorm
            if (cond === 'sandstorm' || cond === 'sand') {
                if (weatherName.includes('sandstorm') || weatherName.includes('sand')) {
                    return true;
                }
            }
            // Snow / Hail
            if (cond === 'snow' || cond === 'snowy' || cond === 'hail' || cond === 'hailing') {
                if (weatherName.includes('snow') || weatherName.includes('hail')) {
                    return true;
                }
            }
            // Strong Winds
            if (cond === 'strong winds' || cond === 'wind' || cond === 'delta stream') {
                if (weatherName.includes('strong winds') || weatherName.includes('delta stream')) {
                    return true;
                }
            }
        }

        const activeTerrains = getEffectsByCategory(activeBattlefield, 'terrain');
        for (const terrain of activeTerrains) {
            const terrainName = (terrain?.name || '').trim().toLowerCase();
            // Electric Terrain
            if (cond === 'electric terrain' || cond === 'electric') {
                if (terrainName.includes('electric')) return true;
            }
            // Grassy Terrain (applies only to combatants on the side that has Grassy Terrain)
            if (cond === 'grassy terrain' || cond === 'grassy') {
                try {
                    const isNpc = useCharacterStore.getState().identity.isNPC;
                    const side = isNpc ? activeBattlefield?.foeSide : activeBattlefield?.playerSide;
                    const sideHasGrassy = Boolean(
                        side?.forceFields?.some(
                            (ff) =>
                                (ff?.name || '').toLowerCase().includes('grassy') &&
                                (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                        ) ||
                        side?.extraForceFields?.some(
                            (ff) =>
                                (ff?.name || '').toLowerCase().includes('grassy') &&
                                (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                        ) ||
                        (side?.other || '').toLowerCase().includes('grassy') ||
                        side?.extraOther?.some((o) => o.toLowerCase().includes('grassy')) ||
                        (side?.entryHazard || '').toLowerCase().includes('grassy') ||
                        side?.extraHazards?.some((h) => h.toLowerCase().includes('grassy'))
                    );
                    if (sideHasGrassy) return true;
                } catch {
                    if (terrainName.includes('grassy')) return true;
                }
            }
            // Misty Terrain
            if (cond === 'misty terrain' || cond === 'misty') {
                if (terrainName.includes('misty')) return true;
            }
            // Psychic Terrain
            if (cond === 'psychic terrain' || cond === 'psychic') {
                if (terrainName.includes('psychic')) return true;
            }
            // Generic Terrain
            if (cond === 'terrain' || cond === 'any terrain') {
                return true;
            }
        }

        // 5. General & Custom Field Effects (Trick Room, Gravity, Ion Deluge, custom field effects, etc.)
        const isCanonicalWeather =
            cond === 'rain' ||
            cond === 'raining' ||
            cond === 'rainy' ||
            cond === 'heavy rain' ||
            cond === 'typhoon' ||
            cond === 'primordial sea' ||
            cond === 'sun' ||
            cond === 'sunny' ||
            cond === 'sunlight' ||
            cond === 'harsh sun' ||
            cond === 'harsh sunlight' ||
            cond === 'desolate' ||
            cond === 'desolate weather' ||
            cond === 'desolate land' ||
            cond === 'sandstorm' ||
            cond === 'sand' ||
            cond === 'snow' ||
            cond === 'snowy' ||
            cond === 'hail' ||
            cond === 'hailing' ||
            cond === 'strong winds' ||
            cond === 'wind' ||
            cond === 'delta stream';

        const allActiveEffects = getAllActiveFieldEffects(activeBattlefield);
        const customEffects = state.roomCustomFieldEffects || [];
        for (const effect of allActiveEffects) {
            const effName = (effect?.name || '').trim().toLowerCase();
            if (!effName) continue;

            // Restrict canonical weather checks from false-matching general field effects
            if (!isCanonicalWeather) {
                if (effName === cond) return true;
                if (cond === 'trick room' && effName.includes('trick room')) return true;
                if (cond === 'gravity' && effName.includes('gravity')) return true;
                if (cond === 'ion deluge' && effName.includes('ion deluge')) return true;
            }

            // Check if this active effect matches a custom effect whose exact name or conditionTag matches cond
            const matchingCustom = customEffects.find(
                (c) =>
                    c.name.trim().toLowerCase() === effName ||
                    (c.conditionTag && c.conditionTag.trim().toLowerCase() === effName)
            );
            if (matchingCustom) {
                const cTag = (matchingCustom.conditionTag || '').trim().toLowerCase();
                const cName = matchingCustom.name.trim().toLowerCase();
                if (cTag === cond || cName === cond) {
                    return true;
                }
            }
        }
    }

    return false;
}
