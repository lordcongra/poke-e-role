import { storageAdapter, type LocalCharacter, isStandaloneMode } from '../sync/storageAdapter';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';
import { isTrainerMetadata } from './pcSidebarSync';

/**
 * Strips parenthetical form/variant tags and extra whitespace.
 * e.g., "Urshifu (Single Strike Style)" -> "urshifu"
 * e.g., "Typhlosion (Hisuian Form)" -> "typhlosion"
 */
export function normalizeBaseName(str?: string): string {
    if (!str) return '';
    return str
        .replace(/\s*\([^)]*\)/g, '')
        .trim()
        .toLowerCase();
}

/**
 * Robustly matches a Pokémon ID (entityId, candidate ID, map token ID, or name)
 * to a local character in the Standalone Sidebar.
 * If matched and missing `entityId`, stamps `entityId` into local storage so future lookups are immediate.
 */
export async function findAndLinkLocalCharacter(
    entityId: string,
    localChars: LocalCharacter[],
    pokemonSummaries: Record<string, PcPokemonSummary>,
    excludeIds?: Set<string>
): Promise<LocalCharacter | undefined> {
    if (!isStandaloneMode || !entityId) return undefined;

    // 1. Direct match by char id or metadata entityId
    let match = localChars.find(
        (c) => (!excludeIds || !excludeIds.has(c.id)) && (c.id === entityId || c.metadata?.entityId === entityId)
    );
    if (match) {
        if (!match.metadata?.entityId) {
            await linkCharacterEntityId(match.id, entityId);
            match.metadata = { ...(match.metadata || {}), entityId };
        }
        return match;
    }

    const summary =
        pokemonSummaries[entityId] || Object.values(pokemonSummaries).find((s) => s && s.entityId === entityId);
    if (summary) {
        // 2. Match by summary mapTokenId or savedTokenItem id
        if (summary.mapTokenId) {
            match = localChars.find((c) => (!excludeIds || !excludeIds.has(c.id)) && c.id === summary.mapTokenId);
            if (match) {
                await linkCharacterEntityId(match.id, entityId);
                match.metadata = { ...(match.metadata || {}), entityId };
                return match;
            }
        }
        if (summary.savedTokenItem && summary.savedTokenItem.id) {
            const savedId = summary.savedTokenItem.id;
            match = localChars.find((c) => (!excludeIds || !excludeIds.has(c.id)) && c.id === savedId);
            if (match) {
                await linkCharacterEntityId(match.id, entityId);
                match.metadata = { ...(match.metadata || {}), entityId };
                return match;
            }
        }

        // 3. Match non-trainer characters by name, nickname, species, and base species variants
        const cleanName = (summary.name || summary.species || '').trim().toLowerCase();
        const summarySpecies = (summary.species || '').trim().toLowerCase();
        const baseSummaryName = normalizeBaseName(summary.name);
        const baseSummarySpecies = normalizeBaseName(summary.species);

        const candidates = localChars.filter(
            (c) => !isTrainerMetadata(c.metadata) && (!excludeIds || !excludeIds.has(c.id))
        );

        // 3a. Exact name or nickname match
        if (cleanName) {
            match = candidates.find((c) => {
                const charName = c.name.trim().toLowerCase();
                const charNick = String(c.metadata?.nickname || '')
                    .trim()
                    .toLowerCase();
                return charName === cleanName || charNick === cleanName;
            });
        }

        // 3b. Exact species match
        if (!match && summarySpecies) {
            match = candidates.find((c) => {
                const charSpecies = String(c.metadata?.species || '')
                    .trim()
                    .toLowerCase();
                const charName = c.name.trim().toLowerCase();
                const charNick = String(c.metadata?.nickname || '')
                    .trim()
                    .toLowerCase();
                return charSpecies === summarySpecies || charName === summarySpecies || charNick === summarySpecies;
            });
        }

        // 3c. Base name match (stripping form suffixes like "(Single Strike Style)", "(Hisuian Form)", etc.)
        if (!match) {
            const targetBases = new Set([baseSummaryName, baseSummarySpecies].filter((s) => s.length > 0));
            if (targetBases.size > 0) {
                match = candidates.find((c) => {
                    const baseCharName = normalizeBaseName(c.name);
                    const baseCharNick = normalizeBaseName(String(c.metadata?.nickname || ''));
                    const baseCharSpecies = normalizeBaseName(String(c.metadata?.species || ''));
                    return (
                        targetBases.has(baseCharName) ||
                        targetBases.has(baseCharNick) ||
                        targetBases.has(baseCharSpecies)
                    );
                });
            }
        }

        // 3d. Prefix / substring match (minimum 3 chars)
        if (!match && baseSummaryName.length >= 3) {
            match = candidates.find((c) => {
                const baseCharName = normalizeBaseName(c.name);
                const baseCharSpecies = normalizeBaseName(String(c.metadata?.species || ''));
                return (
                    (baseCharName.length >= 3 &&
                        (baseCharName.startsWith(baseSummaryName) || baseSummaryName.startsWith(baseCharName))) ||
                    (baseCharSpecies.length >= 3 &&
                        (baseCharSpecies.startsWith(baseSummarySpecies) ||
                            baseSummarySpecies.startsWith(baseCharSpecies)))
                );
            });
        }

        if (match) {
            await linkCharacterEntityId(match.id, entityId);
            match.metadata = { ...(match.metadata || {}), entityId };
            return match;
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
