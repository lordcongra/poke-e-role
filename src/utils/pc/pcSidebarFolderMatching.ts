import { storageAdapter, type LocalCharacter, isStandaloneMode } from '../sync/storageAdapter';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';
import { isTrainerMetadata } from './pcSidebarSync';

/**
 * Robustly matches a Pokémon ID (entityId, candidate ID, map token ID, or name)
 * to a local character in the Standalone Sidebar.
 * If matched and missing `entityId`, stamps `entityId` into local storage so future lookups are immediate.
 */
export async function findAndLinkLocalCharacter(
    entityId: string,
    localChars: LocalCharacter[],
    pokemonSummaries: Record<string, PcPokemonSummary>
): Promise<LocalCharacter | undefined> {
    if (!isStandaloneMode || !entityId) return undefined;

    // 1. Direct match by char id or metadata entityId
    let match = localChars.find((c) => c.id === entityId || c.metadata?.entityId === entityId);
    if (match) {
        if (!match.metadata?.entityId) {
            await linkCharacterEntityId(match.id, entityId);
            match.metadata = { ...(match.metadata || {}), entityId };
        }
        return match;
    }

    const summary = pokemonSummaries[entityId];
    if (summary) {
        // 2. Match by summary mapTokenId or savedTokenItem id
        if (summary.mapTokenId) {
            match = localChars.find((c) => c.id === summary.mapTokenId);
            if (match) {
                await linkCharacterEntityId(match.id, entityId);
                match.metadata = { ...(match.metadata || {}), entityId };
                return match;
            }
        }
        if (summary.savedTokenItem && summary.savedTokenItem.id) {
            const savedId = summary.savedTokenItem.id;
            match = localChars.find((c) => c.id === savedId);
            if (match) {
                await linkCharacterEntityId(match.id, entityId);
                match.metadata = { ...(match.metadata || {}), entityId };
                return match;
            }
        }

        // 3. Match by name & nickname (non-trainer only)
        const cleanName = (summary.name || summary.species || '').trim().toLowerCase();
        if (cleanName) {
            match = localChars.find((c) => {
                if (isTrainerMetadata(c.metadata)) return false;
                const charName = c.name.trim().toLowerCase();
                const charNick = String(c.metadata?.nickname || '')
                    .trim()
                    .toLowerCase();
                return charName === cleanName || charNick === cleanName;
            });
            if (match) {
                await linkCharacterEntityId(match.id, entityId);
                match.metadata = { ...(match.metadata || {}), entityId };
                return match;
            }
        }
    }

    return undefined;
}

async function linkCharacterEntityId(characterId: string, entityId: string): Promise<void> {
    try {
        await storageAdapter.saveCharacter(characterId, { entityId }, 'pokerole-pmd-extension/stats');
    } catch (e) {
        console.warn('[pcSidebarFolderMatching] Failed to link entityId to character:', e);
    }
}
