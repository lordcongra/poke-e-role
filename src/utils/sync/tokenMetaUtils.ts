import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';
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

/** Resolves the display nickname for a PC Pokemon summary. */
export function resolveSummaryNickname(sum: PcPokemonSummary): unknown {
    const explicitNick = sum.fullMetadata?.nickname ?? sum.fullMetadata?.['nickname'];
    if (explicitNick !== undefined) return explicitNick;
    if (sum.name && sum.species && sum.name !== sum.species) return sum.name;
    return '';
}

/** Merges live token metadata with authoritative PC summary identity and move fields. */
export function buildMergedSummaryMeta(sum: PcPokemonSummary, tMeta: Record<string, unknown>): Record<string, unknown> {
    const mergedMeta: Record<string, unknown> = { ...(sum.fullMetadata || {}), ...tMeta };
    if (sum.species) mergedMeta['species'] = sum.species;
    mergedMeta['nickname'] = resolveSummaryNickname(sum);
    if (sum.rank) mergedMeta['rank'] = sum.rank;
    if (sum.fullMetadata?.['moves-data'] && sum.fullMetadata['moves-data'] !== '[]') {
        mergedMeta['moves-data'] = sum.fullMetadata['moves-data'];
    }
    if (sum.type1) mergedMeta['type1'] = sum.type1;
    if (sum.type2 !== undefined) mergedMeta['type2'] = sum.type2;
    if (sum.fullMetadata?.['ability']) mergedMeta['ability'] = sum.fullMetadata['ability'];
    return mergedMeta;
}

/** Returns a shallow-cloned item metadata object with a fresh entityId applied to all present slots. */
export function buildClonedTokenMetadata(
    metadata: Item['metadata'],
    metadataId: string,
    newEntityId: string
): Item['metadata'] {
    const nextMeta: Item['metadata'] = { ...metadata };
    if (nextMeta[metadataId] && typeof nextMeta[metadataId] === 'object') {
        nextMeta[metadataId] = { ...(nextMeta[metadataId] as Record<string, unknown>), entityId: newEntityId };
    }
    if (nextMeta['pokerole-pmd-extension/stats'] && typeof nextMeta['pokerole-pmd-extension/stats'] === 'object') {
        nextMeta['pokerole-pmd-extension/stats'] = {
            ...(nextMeta['pokerole-pmd-extension/stats'] as Record<string, unknown>),
            entityId: newEntityId
        };
    }
    if ('entityId' in nextMeta) {
        nextMeta['entityId'] = newEntityId;
    }
    return nextMeta;
}

