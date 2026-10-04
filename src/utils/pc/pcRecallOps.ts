import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import { GRAPHICS_META_ID } from '../graphics/graphicsManager';
import type { PcPokemonSummary, TrainerRoster } from '../../types/pcStorageTypes';
import { calculateRelativeAttachment } from './rehomeEngine';
import { broadcastPlayerPc, broadcastGmPc } from '../../hooks/owlbearSync/setupOwlbearPcSync';

import { isMatchingPokemonItem, isItemTrainer } from './pcItemMatching';

export interface RecallPokemonResult {
    success: boolean;
    attachedItems?: PcPokemonSummary['attachedItems'];
    savedTokenItem?: Item;
    fullMetadata?: Record<string, unknown>;
    currentHp?: number;
    maxHp?: number;
    currentWill?: number;
    maxWill?: number;
}

export async function recallPokemonFromMap(
    mapTokenId?: string,
    summary?: PcPokemonSummary
): Promise<RecallPokemonResult> {
    if (!OBR.isAvailable || (!mapTokenId && !summary?.entityId)) {
        return { success: true };
    }

    try {
        const sceneItems = await OBR.scene.items.getItems();
        let parent = mapTokenId ? sceneItems.find((i) => i.id === mapTokenId) : undefined;
        if (parent && summary && !isMatchingPokemonItem(parent, summary)) {
            parent = undefined;
        }
        if (!parent && summary) {
            parent = sceneItems.find((i) => isMatchingPokemonItem(i, summary));
        }

        if (!parent) {
            // Token not on active scene (e.g. spawned in another scene, or removed).
            // Do NOT wipe attachments with an empty array!
            return { success: true };
        }

        const resolvedParentId = parent.id;
        const allAttachedChildren = sceneItems.filter((i) => i.attachedTo === resolvedParentId);
        const realAttachedChildren = allAttachedChildren.filter(
            (it) =>
                !it.metadata[GRAPHICS_META_ID] &&
                !it.metadata['pokerole-extension/graphic-v6'] &&
                !it.id.startsWith(`${resolvedParentId}-`)
        );
        const bundles = realAttachedChildren.map((child) => calculateRelativeAttachment(parent, child));

        const meta = {
            ...((parent.metadata?.['pokerole-pmd-extension/stats'] as Record<string, unknown>) || {}),
            ...((parent.metadata?.[METADATA_ID] as Record<string, unknown>) || {})
        };
        const currentHp =
            typeof meta['hp-curr'] === 'number'
                ? meta['hp-curr']
                : !isNaN(Number(meta['hp-curr'])) && meta['hp-curr'] !== '' && meta['hp-curr'] !== undefined
                  ? Number(meta['hp-curr'])
                  : undefined;
        const maxHp =
            typeof meta['hp-max-display'] === 'number'
                ? meta['hp-max-display']
                : !isNaN(Number(meta['hp-max-display'])) &&
                    meta['hp-max-display'] !== '' &&
                    meta['hp-max-display'] !== undefined
                  ? Number(meta['hp-max-display'])
                  : undefined;
        const currentWill =
            typeof meta['will-curr'] === 'number'
                ? meta['will-curr']
                : !isNaN(Number(meta['will-curr'])) && meta['will-curr'] !== '' && meta['will-curr'] !== undefined
                  ? Number(meta['will-curr'])
                  : undefined;
        const maxWill =
            typeof meta['will-max-display'] === 'number'
                ? meta['will-max-display']
                : !isNaN(Number(meta['will-max-display'])) &&
                    meta['will-max-display'] !== '' &&
                    meta['will-max-display'] !== undefined
                  ? Number(meta['will-max-display'])
                  : undefined;

        // Delete parent, any scene clones of this Pokémon, and all attached accessories
        const idsToDelete = new Set<string>([parent.id, ...allAttachedChildren.map((c) => c.id)]);
        if (summary) {
            const clones = sceneItems.filter((i) => i.id !== parent.id && isMatchingPokemonItem(i, summary));
            for (const c of clones) {
                idsToDelete.add(c.id);
                const att = sceneItems.filter((a) => a.attachedTo === c.id);
                for (const a of att) idsToDelete.add(a.id);
            }
        }
        await OBR.scene.items.deleteItems(Array.from(idsToDelete));

        return {
            success: true,
            attachedItems: bundles.length > 0 ? bundles : summary?.attachedItems || [],
            savedTokenItem: parent,
            fullMetadata: { ...(summary?.fullMetadata || {}), ...meta },
            currentHp,
            maxHp,
            currentWill,
            maxWill
        };
    } catch (e) {
        console.error('[pcRecallOps] Failed to recall Pokémon from map:', e);
        return { success: false };
    }
}

export async function clearTokenClaimOps(mapTokenId?: string, entityId?: string): Promise<void> {
    if (!OBR.isAvailable || (!mapTokenId && !entityId)) return;
    try {
        const sceneItems = await OBR.scene.items.getItems();
        const targets = sceneItems.filter((it) => {
            if (it.layer !== 'CHARACTER') return false;
            if (isItemTrainer(it)) return false;
            if (mapTokenId && it.id === mapTokenId) return true;
            if (entityId) {
                const meta = (it.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                const claimMeta = it.metadata?.['pokerole-pmd-extension/claimed-by'] as
                    | { entityId?: string }
                    | undefined;
                return (
                    (meta.entityId && meta.entityId === entityId) ||
                    (claimMeta?.entityId && claimMeta.entityId === entityId)
                );
            }
            return false;
        });
        if (targets.length > 0) {
            await OBR.scene.items.updateItems(
                targets.map((t) => t.id),
                (items) => {
                    for (const it of items) {
                        delete it.metadata['pokerole-pmd-extension/claimed-by'];
                    }
                }
            );
        }
    } catch (e) {
        console.warn('[pcRecallOps] Failed to clear claimed-by on item:', e);
    }
}

export async function unlinkPokemonFromPcOps(
    summary: PcPokemonSummary,
    role: 'PLAYER' | 'GM' = 'PLAYER',
    spawnFn?: (
        s: PcPokemonSummary,
        ownerId?: string,
        role?: 'PLAYER' | 'GM'
    ) => Promise<{ success: boolean; newMapTokenId?: string }>
): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        let tokenId = summary.mapTokenId;
        if (!summary.isOnMap && spawnFn) {
            const res = await spawnFn(summary, undefined, role);
            if (res.success && res.newMapTokenId) {
                tokenId = res.newMapTokenId;
            }
        }
        if (tokenId) {
            await clearTokenClaimOps(tokenId);
        }
    } catch (e) {
        console.warn('[pcRecallOps] Failed to unlink Pokémon to map:', e);
    }
}

/**
 * Broadcasts a Pokémon summary update (such as send out or recall) across all connected peers
 * and dispatches a local event so any open sheet modals update immediately.
 */
export function broadcastSummaryMapChange(
    summary: PcPokemonSummary,
    campaignId?: string,
    trainer?: TrainerRoster,
    role: string = 'PLAYER'
): void {
    if (!OBR.isAvailable) return;
    if (role === 'GM') {
        broadcastGmPc({ campaignId, trainer, summaries: [summary] }).catch(() => {});
    } else {
        broadcastPlayerPc({ campaignId, trainer, summaries: [summary] }).catch(() => {});
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('pkr-remote-summary-applied', {
                detail: { entityId: summary.entityId, summary }
            })
        );
    }
}

export async function executeRecallWorkflow(
    summary: PcPokemonSummary,
    campaignId?: string,
    trainer?: TrainerRoster,
    role: string = 'PLAYER',
    updatePokemonSummary?: (summary: PcPokemonSummary) => void
): Promise<PcPokemonSummary | null> {
    const result = await recallPokemonFromMap(summary.mapTokenId, summary);
    if (!result.success) return null;
    const updated: PcPokemonSummary = {
        ...summary,
        isOnMap: false,
        mapTokenId: undefined,
        attachedItems: result.attachedItems !== undefined ? result.attachedItems : summary.attachedItems,
        hp: result.currentHp ?? summary.hp,
        maxHp: result.maxHp ?? summary.maxHp,
        will: result.currentWill ?? summary.will,
        maxWill: result.maxWill ?? summary.maxWill,
        savedTokenItem: result.savedTokenItem ?? summary.savedTokenItem,
        fullMetadata: result.fullMetadata ?? summary.fullMetadata,
        lastModified: Date.now()
    };
    updatePokemonSummary?.(updated);
    broadcastSummaryMapChange(updated, campaignId, trainer, role);
    return updated;
}

export async function executeSendOutWorkflow(
    summary: PcPokemonSummary,
    spawnResult: { success: boolean; newMapTokenId?: string; alreadyOnBoard?: boolean },
    campaignId?: string,
    trainer?: TrainerRoster,
    role: string = 'PLAYER',
    updatePokemonSummary?: (summary: PcPokemonSummary) => void
): Promise<PcPokemonSummary | null> {
    if (spawnResult.alreadyOnBoard) {
        if (OBR.isAvailable) {
            OBR.notification.show(`${summary.name || summary.species} is already on the board!`, 'WARNING');
        }
        const updated: PcPokemonSummary = {
            ...summary,
            isOnMap: true,
            mapTokenId: spawnResult.newMapTokenId || summary.mapTokenId,
            lastModified: Date.now()
        };
        updatePokemonSummary?.(updated);
        broadcastSummaryMapChange(updated, campaignId, trainer, role);
        return updated;
    }
    if (spawnResult.success && spawnResult.newMapTokenId) {
        const updated: PcPokemonSummary = {
            ...summary,
            isOnMap: true,
            mapTokenId: spawnResult.newMapTokenId,
            lastModified: Date.now()
        };
        updatePokemonSummary?.(updated);
        broadcastSummaryMapChange(updated, campaignId, trainer, role);
        return updated;
    }
    console.error('[pcRecallOps] Failed to send out Pokémon to map:', summary);
    if (OBR.isAvailable) {
        OBR.notification.show(`Failed to send out ${summary.name || summary.species} to the map.`, 'ERROR');
    }
    return null;
}
