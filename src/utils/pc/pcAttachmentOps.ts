import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import { GRAPHICS_META_ID } from '../graphics/graphicsManager';
import type { PcPokemonSummary, AttachmentBundle } from '../../types/pcStorageTypes';
import { isItemTrainer } from './pcItemMatching';
import { getAbsoluteItemPosition } from './pcPlacementUtils';
import { calculateRelativeAttachment, applyRelativeAttachment } from './rehomeEngine';

/**
 * Checks whether an item is a Pokérole character token (Pokémon or Trainer)
 * or registered in the PC, rather than a visual accessory / prop (hats, items, etc.).
 */
export function isCharacterOrRegisteredToken(item: Item, pcSummaries?: Record<string, PcPokemonSummary>): boolean {
    if (isItemTrainer(item)) return true;

    // Check layer
    if (item.layer === 'CHARACTER') {
        const meta = (item.metadata || {}) as Record<string, unknown>;
        const stats = (meta[METADATA_ID] ||
            meta['pokerole-pmd-extension/stats'] ||
            meta['pokerole-extension/stats']) as Record<string, unknown> | undefined;

        if (
            stats &&
            (stats.species ||
                stats.name ||
                stats.entityId ||
                stats.mode ||
                stats.rank ||
                stats['hp-curr'] !== undefined)
        ) {
            return true;
        }

        if (meta['pokerole-pmd-extension/claimed-by'] || meta['entityId']) {
            return true;
        }
    }

    // Check against registered PC summaries if provided
    if (pcSummaries) {
        const meta = (item.metadata || {}) as Record<string, unknown>;
        const stats = (meta[METADATA_ID] ||
            meta['pokerole-pmd-extension/stats'] ||
            meta['pokerole-extension/stats']) as Record<string, unknown> | undefined;
        const itemEntId = (stats?.entityId as string) || (meta.entityId as string);

        for (const sum of Object.values(pcSummaries)) {
            if (sum.mapTokenId && sum.mapTokenId === item.id) return true;
            if (sum.entityId && itemEntId && sum.entityId === itemEntId) return true;
        }
    }

    return false;
}

/**
 * Separates attached items into genuine accessories (hats, weapons, surfboards)
 * and character/registered tokens (Pokémon or Trainers attached to this token).
 * Automatically excludes internal graphics HUD overlays.
 */
export function separateAttachments(
    sceneItems: Item[],
    parentId: string,
    pcSummaries?: Record<string, PcPokemonSummary>
): {
    characterTokens: Item[];
    accessoryTokens: Item[];
    allAttachedChildren: Item[];
} {
    const childrenByParent = new Map<string, Item[]>();
    for (const item of sceneItems) {
        if (item.attachedTo) {
            const list = childrenByParent.get(item.attachedTo);
            if (list) {
                list.push(item);
            } else {
                childrenByParent.set(item.attachedTo, [item]);
            }
        }
    }

    const queue: string[] = [parentId];
    const visited = new Set<string>([parentId]);
    const characterTokens: Item[] = [];
    const accessoryTokens: Item[] = [];
    const allAttachedChildren: Item[] = [];

    while (queue.length > 0) {
        const currId = queue.shift()!;
        const children = childrenByParent.get(currId) || [];

        for (const child of children) {
            if (visited.has(child.id)) {
                continue;
            }
            visited.add(child.id);
            allAttachedChildren.push(child);

            const isHudGraphic =
                Boolean(child.metadata?.[GRAPHICS_META_ID]) ||
                Boolean(child.metadata?.['pokerole-extension/graphic-v6']) ||
                child.id.startsWith(parentId);

            if (isHudGraphic) {
                continue;
            }

            if (isCharacterOrRegisteredToken(child, pcSummaries)) {
                characterTokens.push(child);
            } else {
                accessoryTokens.push(child);
                queue.push(child.id);
            }
        }
    }

    return {
        characterTokens,
        accessoryTokens,
        allAttachedChildren
    };
}

/**
 * Safely disconnects attached tokens from a parent token on the active Owlbear Rodeo scene.
 * Converts each child's position to absolute world coordinates so they do not shift or jump,
 * then clears their attachedTo link.
 */
export async function detachTokensFromParent(attachedTokens: Item[], sceneItems: Item[]): Promise<void> {
    if (!OBR.isAvailable || attachedTokens.length === 0) return;

    try {
        const targetIds = new Set(attachedTokens.map((t) => t.id));
        await OBR.scene.items.updateItems(
            (item) => targetIds.has(item.id),
            (items) => {
                for (const item of items) {
                    const absPos = getAbsoluteItemPosition(item, sceneItems);
                    item.position = absPos;
                    delete (item as { attachedTo?: unknown }).attachedTo;
                }
            }
        );
    } catch (e) {
        console.warn('[pcAttachmentOps] Failed to detach tokens from parent:', e);
    }
}

/**
 * Extracts live relative attachment bundles for accessories attached to a parent token.
 */
export function extractLiveAccessoryBundles(sceneItems: Item[], parent: Item): AttachmentBundle[] {
    const { accessoryTokens } = separateAttachments(sceneItems, parent.id);
    return accessoryTokens.map((child) => calculateRelativeAttachment(parent, child));
}

/**
 * Compares stored attachment bundles against live scene accessory bundles.
 * Returns true if the count, child IDs, or relative transform has meaningfully changed.
 */
export function hasAttachmentDiff(
    storedBundles: AttachmentBundle[] | undefined,
    liveBundles: AttachmentBundle[]
): boolean {
    const stored = storedBundles || [];
    if (stored.length !== liveBundles.length) return true;
    if (stored.length === 0 && liveBundles.length === 0) return false;

    for (let i = 0; i < liveBundles.length; i++) {
        const l = liveBundles[i];
        const s = stored[i];
        if (!s || s.item.id !== l.item.id) return true;
        const dx = Math.abs(s.relativeOffset.x - l.relativeOffset.x);
        const dy = Math.abs(s.relativeOffset.y - l.relativeOffset.y);
        const dr = Math.abs(s.relativeRotation - l.relativeRotation);
        const dsx = Math.abs(s.relativeScale.x - l.relativeScale.x);
        const dsy = Math.abs(s.relativeScale.y - l.relativeScale.y);
        if (dx > 0.01 || dy > 0.01 || dr > 0.01 || dsx > 0.01 || dsy > 0.01) {
            return true;
        }
    }
    return false;
}

/**
 * Reconciles attached accessories on the live Owlbear Rodeo scene with desired bundles.
 * Spawns missing accessories and marks stale or detached accessories for removal.
 */
export function reconcileTokenAttachmentsOnScene(
    parent: Item,
    desiredBundles: AttachmentBundle[] | undefined,
    sceneItems: Item[],
    tagAsBackupToken: boolean = false
): { itemsToAdd: Item[]; idsToDelete: string[] } {
    const { accessoryTokens } = separateAttachments(sceneItems, parent.id);
    const desired = desiredBundles || [];
    const itemsToAdd: Item[] = [];
    const idsToDelete: string[] = [];

    // Case 1: Attachment was detached or removed in PC storage; clear accessories from scene token
    if (desired.length === 0) {
        if (accessoryTokens.length > 0) {
            idsToDelete.push(...accessoryTokens.map((a) => a.id));
        }
        return { itemsToAdd, idsToDelete };
    }

    // Case 2: Desired attachments exist but scene token is missing them
    if (accessoryTokens.length === 0) {
        const idMap = new Map<string, string>();
        idMap.set(parent.id, parent.id);

        for (const bundle of desired) {
            if (bundle?.item?.id && bundle.item.id !== parent.id) {
                idMap.set(bundle.item.id, crypto.randomUUID());
            }
        }

        for (const bundle of desired) {
            if (!bundle || !bundle.item || bundle.item.id === parent.id) continue;
            const assignedId = idMap.get(bundle.item.id);
            const targetParentId = (bundle.item.attachedTo && idMap.get(bundle.item.attachedTo)) || parent.id;
            const child = applyRelativeAttachment(parent, bundle, targetParentId, assignedId);
            if (tagAsBackupToken) {
                child.metadata = {
                    ...(child.metadata || {}),
                    'pokerole-pmd-extension/is-backup-token': true
                };
            }
            itemsToAdd.push(child);
        }
    }

    return { itemsToAdd, idsToDelete };
}
