import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../sync/obr';

/**
 * Resolves whether a given active character identity/metadata already corresponds
 * to an existing Pokémon in the trainer's party or stored summaries.
 */
export function resolveExistingCharacterEntityId(
    identity: { nickname?: string; species?: string },
    activeTokenId: string | null,
    fullMetadata: Record<string, unknown>,
    existingSummaries?: Record<string, PcPokemonSummary>,
    partySlots?: (string | null)[]
): string | null {
    if (!existingSummaries) return null;

    const summariesList = Object.values(existingSummaries);

    // 1. Match by explicit entityId in fullMetadata
    const explicitEntityId =
        (fullMetadata.entityId as string) ||
        (fullMetadata['pokerole-pmd-extension/claimed-by'] as { entityId?: string })?.entityId;
    if (explicitEntityId && existingSummaries[explicitEntityId]) {
        return explicitEntityId;
    }

    // 2. Match by activeTokenId against mapTokenId or savedTokenItem.id
    if (activeTokenId) {
        const byMap = summariesList.find(
            (s) => s.mapTokenId === activeTokenId || s.savedTokenItem?.id === activeTokenId
        );
        if (byMap) return byMap.entityId;
    }

    const activeSpecies = identity.species || '';
    const activeName = identity.nickname || identity.species || '';
    if (!activeSpecies && !activeName) return null;

    // 3. Match against trainer's party slots
    if (partySlots && partySlots.length > 0) {
        for (const pId of partySlots) {
            if (!pId) continue;
            const pSum = existingSummaries[pId];
            if (pSum) {
                const pName = pSum.name || pSum.species;
                if (
                    pSum.species.toLowerCase() === activeSpecies.toLowerCase() &&
                    pName.toLowerCase() === activeName.toLowerCase()
                ) {
                    return pSum.entityId;
                }
            }
        }
    }

    // 4. Match against all stored summaries if single unique match by species & name
    const matches = summariesList.filter(
        (s) =>
            s.species.toLowerCase() === activeSpecies.toLowerCase() &&
            (s.name || s.species).toLowerCase() === activeName.toLowerCase()
    );
    if (matches.length === 1) {
        return matches[0].entityId;
    }

    return null;
}

/**
 * Resolves an Owlbear Rodeo Item candidate against existing PC summaries and party slots.
 */
export function resolveSceneCandidateMatch(
    item: Item,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    partySlots: (string | null)[] = [],
    myPlayerId?: string
): {
    matchedEntityId?: string;
    isInParty: boolean;
    claimedBy?: string;
} {
    const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
    const claimMeta = item.metadata?.['pokerole-pmd-extension/claimed-by'] as
        | { playerId?: string; playerName?: string; trainerName?: string; entityId?: string }
        | undefined;

    let claimedBy: string | undefined = undefined;
    if (claimMeta?.playerId && myPlayerId && claimMeta.playerId !== myPlayerId) {
        claimedBy = claimMeta.playerName || claimMeta.trainerName || 'Another Player';
    }

    const partyEntityIds = new Set(partySlots.filter(Boolean) as string[]);
    const summariesList = Object.values(pokemonSummaries);

    let matchedEntityId: string | undefined = undefined;

    // 1. By mapTokenId or saved item id
    const byTokenId = summariesList.find((s) => s.mapTokenId === item.id || s.savedTokenItem?.id === item.id);
    if (byTokenId) {
        matchedEntityId = byTokenId.entityId;
    }

    // 2. By entityId in metadata or claimed-by
    if (!matchedEntityId) {
        const rawEntityId = (meta.entityId as string) || (claimMeta?.entityId as string);
        if (rawEntityId && pokemonSummaries[rawEntityId]) {
            matchedEntityId = rawEntityId;
        }
    }

    // 3. By party member name and species
    const species = (meta.species as string) || (meta.name as string) || '';
    const name = (meta.name as string) || (meta.nickname as string) || item.name || species;
    if (!matchedEntityId && species) {
        for (const pId of partySlots) {
            if (!pId) continue;
            const pSum = pokemonSummaries[pId];
            if (
                pSum &&
                pSum.species.toLowerCase() === species.toLowerCase() &&
                (pSum.name || pSum.species).toLowerCase() === name.toLowerCase()
            ) {
                matchedEntityId = pSum.entityId;
                break;
            }
        }
    }

    const isInParty = Boolean(matchedEntityId && partyEntityIds.has(matchedEntityId));

    return {
        matchedEntityId,
        isInParty,
        claimedBy
    };
}
