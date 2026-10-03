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

    const meta = (item.metadata?.[METADATA_ID] || item.metadata?.['pokerole-pmd-extension/stats']) as
        | Record<string, unknown>
        | undefined;
    const claimMeta = item.metadata?.['pokerole-pmd-extension/claimed-by'] as { entityId?: string } | undefined;
    const itemEntityId =
        (meta?.entityId as string) ||
        (claimMeta?.entityId as string) ||
        (item.metadata?.['entityId'] as string) ||
        undefined;

    // Strict entityId match
    if (summary.entityId && itemEntityId) {
        return itemEntityId === summary.entityId;
    }

    // Direct token ID match (only if no conflicting entityId)
    if (summary.mapTokenId && item.id === summary.mapTokenId) {
        if (itemEntityId && summary.entityId && itemEntityId !== summary.entityId) {
            return false;
        }
        return true;
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
            (summary.entityId && c.matchedEntityId === summary.entityId) ||
            (summary.mapTokenId && c.id === summary.mapTokenId)
    );
}
