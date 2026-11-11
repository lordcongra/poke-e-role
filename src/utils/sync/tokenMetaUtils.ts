import { parseFiniteNumber } from '@/utils/sync/mappers/mapperHelpers';

/**
 * Parsed combat resource pool values extracted from token metadata.
 */
export interface CombatPoolValues {
    hp: number;
    maxHp: number;
    will: number;
    maxWill: number;
}

/**
 * Parses `hp`, `maxHp`, `will`, and `maxWill` from flattened token metadata,
 * preserving `0` and falling back per-field when values are missing or non-finite.
 */
export function parseCombatPoolsFromMeta(
    meta: Record<string, unknown> | null | undefined,
    fallback: Partial<CombatPoolValues> = {}
): CombatPoolValues {
    return {
        hp: parseFiniteNumber(meta?.['hp-curr'], fallback.hp ?? 0),
        maxHp: parseFiniteNumber(meta?.['hp-max-display'], fallback.maxHp ?? 0),
        will: parseFiniteNumber(meta?.['will-curr'], fallback.will ?? 0),
        maxWill: parseFiniteNumber(meta?.['will-max-display'], fallback.maxWill ?? 0)
    };
}

function normalizeLabel(value?: string | null): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : String(value ?? '').trim().toLowerCase();
}

/**
 * Checks whether a scene token's species/nickname is compatible with a PC summary
 * using exact case-insensitive canonical matching (avoiding substring collisions like Mew vs Mewtwo)
 * while allowing renamed tokens whose nickname matches the summary nickname or name.
 */
export function isTokenSpeciesCompatible(
    tokenSpecies?: string | null,
    tokenNickname?: string | null,
    sumSpecies?: string | null,
    sumNickname?: string | null,
    sumName?: string | null
): boolean {
    const tSpecies = normalizeLabel(tokenSpecies);
    const tNick = normalizeLabel(tokenNickname);
    const sSpecies = normalizeLabel(sumSpecies);
    const sNick = normalizeLabel(sumNickname);
    const sName = normalizeLabel(sumName);

    if (tSpecies && sSpecies) {
        if (tSpecies === sSpecies) return true;
    } else if (tSpecies && !sSpecies && sName) {
        if (tSpecies === sName) return true;
    }

    const summaryLabels = [sNick, sName, ...(tSpecies ? [] : [sSpecies])].filter(Boolean);
    if (tNick && summaryLabels.includes(tNick)) {
        return true;
    }

    const hasComparableSpecies = Boolean(tSpecies && (sSpecies || sName));
    const hasComparableNick = Boolean(tNick && summaryLabels.length > 0);

    if (hasComparableSpecies || hasComparableNick) {
        return false;
    }

    return true;
}

