import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../sync/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { extractCharacterName } from './initiativeHelpers';
import { extractEntityId } from '../../hooks/owlbearSync/setupOwlbearTokenSync';
import type { CombatantRowData } from '../../types/battleOrganizerTypes';

export interface ResolvedCombatantToken {
    tokenId: string | null;
    tokenItem: Item | null;
    entityId?: string;
    isRecalled: boolean;
}

/**
 * Synchronously checks if a combatant matches an item in candidateItems (or stored character data).
 * Handles token replacements (e.g. Pokémon recalled and sent back out to the map).
 */
export function resolveCombatantLiveTokenSync(
    combatant: CombatantRowData,
    candidateItems: Item[]
): ResolvedCombatantToken {
    const storeState = useCharacterStore.getState();
    const cleanCombatantName = (combatant.name || '').trim().toLowerCase();

    // 1. Direct match by current tokenId if it exists on the scene
    if (combatant.tokenId) {
        const directMatch = candidateItems.find((item) => item.id === combatant.tokenId);
        if (directMatch) {
            const eId = extractEntityId(directMatch) || combatant.entityId;
            return {
                tokenId: directMatch.id,
                tokenItem: directMatch,
                entityId: eId,
                isRecalled: false
            };
        }
    }

    // 2. Match by entityId if known
    let targetEntityId = combatant.entityId;
    if (!targetEntityId && cleanCombatantName) {
        // Look up in PC summaries by name
        for (const [id, summary] of Object.entries(storeState.pcData.pokemonSummaries || {})) {
            const sumName = (summary.name || summary.species || '').trim().toLowerCase();
            if (sumName === cleanCombatantName) {
                targetEntityId = id;
                break;
            }
        }
    }

    if (targetEntityId) {
        // Look for candidate item with matching entityId
        const byEntity = candidateItems.find((item) => {
            const eId = extractEntityId(item);
            return eId === targetEntityId;
        });
        if (byEntity) {
            return {
                tokenId: byEntity.id,
                tokenItem: byEntity,
                entityId: targetEntityId,
                isRecalled: false
            };
        }

        // Look for candidate item with matching mapTokenId from PC storage
        const pcSummary = storeState.pcData.pokemonSummaries?.[targetEntityId];
        if (pcSummary?.isOnMap && pcSummary.mapTokenId) {
            const byMapTokenId = candidateItems.find((item) => item.id === pcSummary.mapTokenId);
            if (byMapTokenId) {
                return {
                    tokenId: byMapTokenId.id,
                    tokenItem: byMapTokenId,
                    entityId: targetEntityId,
                    isRecalled: false
                };
            }
        }
    }

    // 3. Fallback: match by character name across candidate scene items
    if (cleanCombatantName) {
        const byName = candidateItems.find((item) => {
            const meta = (item.metadata['pokerole-extension/stats'] ||
                item.metadata['pokerole-pmd-extension/stats'] ||
                item.metadata) as Record<string, unknown>;
            const resolvedName = extractCharacterName(meta, item.name).trim().toLowerCase();
            return resolvedName === cleanCombatantName || item.name.trim().toLowerCase() === cleanCombatantName;
        });

        if (byName) {
            const resolvedEId = extractEntityId(byName) || targetEntityId || combatant.entityId;
            return {
                tokenId: byName.id,
                tokenItem: byName,
                entityId: resolvedEId,
                isRecalled: false
            };
        }
    }

    // No live token found on the map — Pokémon is recalled or unlinked
    return {
        tokenId: null,
        tokenItem: null,
        entityId: targetEntityId || combatant.entityId,
        isRecalled: true
    };
}

/**
 * Asynchronously resolves live token for a combatant.
 * Fetches items from scene or local storage if candidateItems is not supplied.
 */
export async function resolveCombatantLiveToken(
    combatant: CombatantRowData,
    candidateItems?: Item[]
): Promise<ResolvedCombatantToken> {
    if (candidateItems && candidateItems.length > 0) {
        return resolveCombatantLiveTokenSync(combatant, candidateItems);
    }

    if (isStandaloneMode) {
        try {
            const localChars = await storageAdapter.getLocalCharacters();
            const items = localChars.map((c) => ({
                id: c.id,
                name: c.name,
                layer: 'CHARACTER' as const,
                metadata: c.metadata
            })) as unknown as Item[];
            return resolveCombatantLiveTokenSync(combatant, items);
        } catch (e) {
            console.warn('[combatantTokenResolver] Failed to resolve standalone character:', e);
            return { tokenId: null, tokenItem: null, entityId: combatant.entityId, isRecalled: true };
        }
    }

    if (OBR.isAvailable) {
        try {
            const isReady = await OBR.scene.isReady();
            if (!isReady) {
                return { tokenId: null, tokenItem: null, entityId: combatant.entityId, isRecalled: true };
            }
            const items = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
            return resolveCombatantLiveTokenSync(combatant, items);
        } catch (e) {
            console.warn('[combatantTokenResolver] Failed to resolve OBR items:', e);
            return { tokenId: null, tokenItem: null, entityId: combatant.entityId, isRecalled: true };
        }
    }

    return { tokenId: null, tokenItem: null, entityId: combatant.entityId, isRecalled: true };
}

/**
 * Resolves a live token ID for a combatant, returning null if the token was deleted/recalled.
 */
export async function resolveCombatantTokenId(combatant: CombatantRowData): Promise<string | null> {
    const resolved = await resolveCombatantLiveToken(combatant);
    return resolved.tokenId;
}
