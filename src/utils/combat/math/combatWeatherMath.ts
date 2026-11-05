import type { CharacterState } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { getEffectsByCategory, getAllActiveFieldEffects } from '@/utils/combat/fieldEffectsData';
import { checkCondition } from '@/utils/tagParser/conditionChecker';
import { resolveCharacterSide } from '@/utils/combat/combatantSideUtils';

export interface WeatherDamageBonusResult {
    diceBonus: number;
    flatPenalty: number;
    tag: string;
}

/** Weather damage modifier constants */
export const EXTREME_WEATHER_NAMES = {
    FIRE_BOOST: ['desolate', 'harsh sun'],
    WATER_BOOST: ['typhoon', 'heavy rain', 'primordial sea'],
    FLYING_BOOST: ['strong winds', 'delta stream']
} as const;

export const STANDARD_WEATHER_NAMES = {
    SUN: 'sun',
    RAIN: 'rain',
    SNOW: 'snow'
} as const;

export const TERRAIN_NAMES = {
    ELECTRIC: 'electric',
    PSYCHIC: 'psychic',
    MISTY: 'misty',
    GRASSY: 'grassy'
} as const;

/** Regex pattern for extracting damage bonuses/penalties from homebrew field effect tags */
export const HOMEBREW_DAMAGE_TAG_REGEX =
    /\[\s*(?:(?:dmg\s*pool|dmg|damage)\s*([+-]?\s*\d+)|([+-]?\s*\d+)\s*(?:dmg\s*pool|dmg|damage))(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi;

/**
 * Calculates dice bonuses and flat penalties applied to a move's damage pool based on
 * active weather conditions, terrain effects, and custom homebrew battlefield tags.
 */
export function getWeatherDamageBonus(
    moveType: string | undefined,
    battlefield: CharacterState['activeBattlefield'],
    isHalfHp?: boolean,
    isNPC?: boolean,
    state?: CharacterState
): WeatherDamageBonusResult {
    if (!moveType || !battlefield) return { diceBonus: 0, flatPenalty: 0, tag: '' };

    let effectiveHalfHp = isHalfHp;
    if (effectiveHalfHp === undefined) {
        try {
            const st = useCharacterStore.getState();
            effectiveHalfHp = st.health.hpCurr <= Math.floor(st.health.hpMax / 2);
        } catch {
            effectiveHalfHp = false;
        }
    }

    const cleanType = moveType.trim().toLowerCase();
    let diceBonus = 0;
    let flatPenalty = 0;
    const tagDescriptions: string[] = [];

    // 1. Weather bonuses across all active weathers
    const activeWeathers = getEffectsByCategory(battlefield, 'weather');
    for (const w of activeWeathers) {
        const cleanName = (w.name || '').trim().toLowerCase();
        // Extreme weather (+2 dice)
        if (cleanName.includes('desolate') || cleanName.includes('harsh sun')) {
            if (cleanType === 'fire') {
                diceBonus += 2;
                tagDescriptions.push('Desolate Weather (+2 Dice to Fire Damage Pool)');
            } else if (cleanType === 'water') {
                flatPenalty += 2;
                tagDescriptions.push('Desolate Weather (-2 Flat Damage from Water Moves)');
            }
        } else if (
            cleanName.includes('typhoon') ||
            cleanName.includes('heavy rain') ||
            cleanName.includes('primordial sea')
        ) {
            if (cleanType === 'water') {
                diceBonus += 2;
                tagDescriptions.push('Typhoon (+2 Dice to Water Damage Pool)');
            } else if (cleanType === 'fire') {
                flatPenalty += 2;
                tagDescriptions.push('Typhoon (-2 Flat Damage from Fire Moves)');
            }
        } else if (cleanName.includes('strong winds') || cleanName.includes('delta stream')) {
            if (cleanType === 'flying') {
                diceBonus += 2;
                tagDescriptions.push('Strong Winds (+2 Dice to Flying Damage Pool)');
            }
        }
        // Standard weather (+1 dice / -1 flat penalty)
        else if (cleanName.includes('sun')) {
            if (cleanType === 'fire') {
                diceBonus += 1;
                tagDescriptions.push('Sunny (+1 Dice to Fire Damage Pool)');
            } else if (cleanType === 'water') {
                flatPenalty += 1;
                tagDescriptions.push('Sunny (-1 Flat Damage from Water Moves)');
            }
        } else if (cleanName.includes('rain')) {
            if (cleanType === 'water') {
                diceBonus += 1;
                tagDescriptions.push('Rain (+1 Dice to Water Damage Pool)');
            } else if (cleanType === 'fire') {
                flatPenalty += 1;
                tagDescriptions.push('Rain (-1 Flat Damage from Fire Moves)');
            }
        } else if ((cleanName.includes('snow') || cleanName === 'snowy') && !cleanName.includes('hail')) {
            if (cleanType === 'ice') {
                diceBonus += 1;
                tagDescriptions.push('Snowy (+1 Dice to Ice Damage Pool)');
            }
        }
    }

    // 2. Terrain damage bonuses (+1 die to matching moves for Electric and Psychic Terrain)
    const activeTerrains = getEffectsByCategory(battlefield, 'terrain');
    for (const t of activeTerrains) {
        const cleanTerrain = (t.name || '').trim().toLowerCase();
        if (cleanTerrain.includes('electric')) {
            if (cleanType === 'electric') {
                diceBonus += 1;
                tagDescriptions.push('Electric Terrain (+1 Dice to Electric Damage Pool)');
            }
        } else if (cleanTerrain.includes('psychic')) {
            if (cleanType === 'psychic') {
                diceBonus += 1;
                tagDescriptions.push('Psychic Terrain (+1 Dice to Psychic Damage Pool)');
            }
        } else if (cleanTerrain.includes('misty')) {
            if (cleanType === 'dragon') {
                flatPenalty += 1;
                tagDescriptions.push('Misty Terrain (-1 Flat Damage from Dragon Moves)');
            }
        }
    }

    let currentState = state;
    if (!currentState) {
        try {
            currentState = useCharacterStore.getState();
        } catch {
            currentState = undefined;
        }
    }
    const resolvedSide = currentState ? resolveCharacterSide(currentState) : (isNPC ? 'foe' : 'player');

    // Side Grassy Terrain check: In Pokerole, Grassy Terrain (+1 Grass Damage) ONLY applies to the side it is on
    if (cleanType === 'grass' && battlefield) {
        const side =
            resolvedSide === 'foe'
                ? battlefield.foeSide
                : resolvedSide === 'player'
                ? battlefield.playerSide
                : undefined;
        if (side) {
            const sideHasGrassy = Boolean(
                side.forceFields?.some(
                    (ff) =>
                        (ff?.name || '').toLowerCase().includes('grassy') &&
                        (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                ) ||
                side.extraForceFields?.some(
                    (ff) =>
                        (ff?.name || '').toLowerCase().includes('grassy') &&
                        (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                ) ||
                (side.other || '').toLowerCase().includes('grassy') ||
                side.extraOther?.some((o) => o.toLowerCase().includes('grassy')) ||
                (side.entryHazard || '').toLowerCase().includes('grassy') ||
                side.extraHazards?.some((h) => h.toLowerCase().includes('grassy'))
            );
            if (sideHasGrassy) {
                diceBonus += 1;
                tagDescriptions.push('Grassy Terrain (+1 Dice to Grass Damage Pool)');
            }
        }
    }

    // 4. Parse damage tags from active custom homebrew field effects
    try {
        const customEffects = useCharacterStore.getState().roomCustomFieldEffects;
        if (customEffects && Array.isArray(customEffects)) {
            const allActive = getAllActiveFieldEffects(battlefield);
            for (const activeItem of allActive) {
                if (activeItem.side && activeItem.side !== resolvedSide) continue;
                const cleanActiveName = activeItem.name.trim().toLowerCase();
                const customDef = customEffects.find((c) => c.name.trim().toLowerCase() === cleanActiveName);
                if (customDef && customDef.tags) {
                    const damageMatches = customDef.tags.matchAll(HOMEBREW_DAMAGE_TAG_REGEX);
                    for (const match of damageMatches) {
                        const condition = match[4]?.trim();
                        if (condition && !checkCondition(condition, effectiveHalfHp)) {
                            continue;
                        }
                        const amountStr = match[1] || match[2] || '0';
                        const amount = parseInt(amountStr.replace(/\s+/g, ''), 10);
                        const targetType = match[3]?.trim().toLowerCase();
                        if (!targetType || targetType === cleanType) {
                            if (amount > 0) {
                                diceBonus += amount;
                                tagDescriptions.push(
                                    `${customDef.name} (+${amount} Dice to ${targetType ? match[3].trim() + ' ' : ''}Damage Pool)`
                                );
                            } else if (amount < 0) {
                                flatPenalty += Math.abs(amount);
                                tagDescriptions.push(
                                    `${customDef.name} (-${Math.abs(amount)} Flat Damage from ${targetType ? match[3].trim() + ' ' : ''}Moves)`
                                );
                            }
                        }
                    }
                }
            }
        }
    } catch {
        // Safe fallback
    }

    return { diceBonus, flatPenalty, tag: tagDescriptions.join(', ') };
}

