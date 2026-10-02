import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../sync/obr';

/**
 * Checks whether an Owlbear Rodeo item is a Trainer token.
 */
export function isItemTrainer(item: Item): boolean {
    const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
    const mode = (meta.mode as string) || '';
    const rank = (meta.rank as string) || '';
    return mode === 'Trainer' || mode === 'Trainer (Special)' || rank === 'Trainer';
}

/**
 * Checks if a scene Item actively represents the given Pokémon summary.
 * Strictly guarantees that:
 * 1. The item is on the CHARACTER layer.
 * 2. The item is NOT a Trainer token.
 * 3. The item matches entityId, or matches mapTokenId with identical name or species.
 */
export function isMatchingPokemonItem(item: Item, summary: PcPokemonSummary): boolean {
    if (item.layer !== 'CHARACTER') return false;
    if (isItemTrainer(item)) return false;

    const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
    const claimMeta = item.metadata?.['pokerole-pmd-extension/claimed-by'] as { entityId?: string } | undefined;

    // Check entityId match
    if (summary.entityId) {
        if (
            (meta.entityId && meta.entityId === summary.entityId) ||
            (claimMeta?.entityId && claimMeta.entityId === summary.entityId)
        ) {
            return true;
        }
    }

    // Check mapTokenId match: ONLY if it also shares species or name!
    if (summary.mapTokenId && item.id === summary.mapTokenId) {
        const itemSpecies = ((meta.species as string) || (meta.name as string) || item.name || '').trim().toLowerCase();
        const sumSpecies = (summary.species || '').trim().toLowerCase();
        const sumName = (summary.name || '').trim().toLowerCase();
        if (itemSpecies && (itemSpecies === sumSpecies || itemSpecies === sumName)) {
            return true;
        }
    }

    return false;
}

/**
 * Resolves whether a candidate from sceneCandidates matches a given summary.
 */
export function findMatchingSceneCandidate<
    T extends { id?: string; matchedEntityId?: string; species?: string; name?: string }
>(candidates: T[], summary?: PcPokemonSummary | null): T | undefined {
    if (!summary) return undefined;
    return candidates.find(
        (c) =>
            (summary.mapTokenId && c.id === summary.mapTokenId) ||
            (summary.entityId && c.matchedEntityId === summary.entityId) ||
            (c.species &&
                summary.species &&
                c.species.toLowerCase() === summary.species.toLowerCase() &&
                (c.name || c.species).toLowerCase() === (summary.name || summary.species).toLowerCase())
    );
}
