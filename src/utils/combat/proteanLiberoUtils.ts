import { fetchPokemonData } from '@/utils/api/api';
import { sanitizeType } from '@/utils/common/speciesChangeLogic';

export interface ProteanLiberoShiftResult {
    shouldShift: boolean;
    newType: string;
    matchedAbility: 'Protean' | 'Libero' | null;
}

export interface BaseSpeciesTyping {
    type1: string;
    type2: string;
}

/**
 * Evaluates whether an ability shift should trigger for Protean or Libero.
 * - Protean shifts type on Physical and Special moves only.
 * - Libero shifts type on Physical, Special, Status, and Support moves.
 * - Shifts are ignored if abilityActive is false, moveType is missing or typeless,
 *   or character is already purely the target type.
 */
export function shouldShiftTypeForAbility(
    abilityName: string,
    abilityActive: boolean,
    moveCategory: string,
    moveType: string,
    currentType1: string,
    currentType2: string
): ProteanLiberoShiftResult {
    if (abilityActive === false || !abilityName) {
        return { shouldShift: false, newType: '', matchedAbility: null };
    }

    const cleanAbility = abilityName.trim().toLowerCase();
    let matchedAbility: 'Protean' | 'Libero' | null = null;
    if (cleanAbility.includes('protean')) {
        matchedAbility = 'Protean';
    } else if (cleanAbility.includes('libero')) {
        matchedAbility = 'Libero';
    }

    if (!matchedAbility) {
        return { shouldShift: false, newType: '', matchedAbility: null };
    }

    const normMoveType = (moveType || '').trim();
    if (!normMoveType || normMoveType.toLowerCase() === 'typeless') {
        return { shouldShift: false, newType: '', matchedAbility };
    }

    const cat = (moveCategory || '').trim().toLowerCase();
    if (matchedAbility === 'Protean') {
        const isPhysOrSpec = cat === 'physical' || cat === 'special';
        if (!isPhysOrSpec) {
            return { shouldShift: false, newType: '', matchedAbility };
        }
    } else if (matchedAbility === 'Libero') {
        const validLiberoCats = ['physical', 'special', 'status', 'support'];
        if (!validLiberoCats.includes(cat)) {
            return { shouldShift: false, newType: '', matchedAbility };
        }
    }

    const cType1 = (currentType1 || '').trim().toLowerCase();
    const cType2 = (currentType2 || '').trim().toLowerCase();
    const isAlreadyPure = cType1 === normMoveType.toLowerCase() && (!cType2 || cType2 === 'none');
    if (isAlreadyPure) {
        return { shouldShift: false, newType: '', matchedAbility };
    }

    return {
        shouldShift: true,
        newType: normMoveType,
        matchedAbility
    };
}

/**
 * Asynchronously loads base species typing from local or homebrew datasets.
 */
export async function fetchBaseSpeciesTyping(speciesName: string): Promise<BaseSpeciesTyping | null> {
    if (!speciesName) return null;
    const data = await fetchPokemonData(speciesName);
    if (!data) return null;
    const type1 = String(data.Type1 || 'Normal').trim();
    const type2 = sanitizeType(data.Type2);
    return { type1, type2 };
}

