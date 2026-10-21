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
 * Extracts a stable identity key for an accessory item to detect duplicate props/attachments.
 * Matches by source item ID, image artwork URL, token name, or text content.
 */
export function getAccessoryIdentityKey(item: Item): string {
    const meta = (item.metadata || {}) as Record<string, unknown>;
    const sourceId = (meta['pokerole-pmd-extension/source-item-id'] as string) || (meta.sourceItemId as string);
    if (sourceId && typeof sourceId === 'string' && sourceId.trim()) {
        return `source:${sourceId.trim()}`;
    }
    const imgUrl = (item as { image?: { url?: string } }).image?.url;
    if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
        return `img:${imgUrl.trim()}`;
    }
    if (item.name && typeof item.name === 'string' && item.name.trim()) {
        return `name:${item.name.trim()}`;
    }
    const text = (item as { text?: { plainText?: string } }).text?.plainText;
    if (text && typeof text === 'string' && text.trim()) {
        return `text:${text.trim()}`;
    }
    return `id:${item.id}`;
}

export const MAX_ATTACHMENTS_PER_TOKEN = 30;

/**
 * Checks whether two attachment items/bundles are stacked duplicates.
 * Returns true ONLY if they share the exact same identity AND are placed at virtually
 * the exact same position (within 1 pixel), meaning one is invisibly stacked on the other.
 * Distinct intentional attachments (e.g. two identical bows placed at different positions) return false.
 */
export function areAttachmentsStackedDuplicates(
    a: { item: Item; relativeOffset?: { x: number; y: number } },
    b: { item: Item; relativeOffset?: { x: number; y: number } }
): boolean {
    const keyA = getAccessoryIdentityKey(a.item);
    const keyB = getAccessoryIdentityKey(b.item);
    if (keyA !== keyB) return false;

    if (a.relativeOffset && b.relativeOffset) {
        const dx = Math.abs(a.relativeOffset.x - b.relativeOffset.x);
        const dy = Math.abs(a.relativeOffset.y - b.relativeOffset.y);
        return dx < 1 && dy < 1;
    }

    const posA = a.item.position || { x: 0, y: 0 };
    const posB = b.item.position || { x: 0, y: 0 };
    const dx = Math.abs(posA.x - posB.x);
    const dy = Math.abs(posA.y - posB.y);
    return dx < 1 && dy < 1;
}

/**
 * Deduplicates attachment bundles by pruning stacked duplicates (identical accessories
 * placed at the exact same relative coordinates). Intentional distinct attachments
 * (e.g. two identical bows placed at different offsets) are preserved.
 * Enforces a safe ceiling (maximum 30 attachments per token) to prevent token bloat.
 */
export function sanitizeAttachmentBundles(bundles: AttachmentBundle[] | undefined): AttachmentBundle[] {
    if (!bundles || !Array.isArray(bundles) || bundles.length === 0) {
        return [];
    }

    const sanitized: AttachmentBundle[] = [];

    for (const bundle of bundles) {
        if (!bundle || !bundle.item) continue;

        // Check if this bundle is an exact stacked duplicate of an already kept bundle
        const isStackedDuplicate = sanitized.some((kept) => areAttachmentsStackedDuplicates(kept, bundle));

        if (isStackedDuplicate) {
            continue;
        }

        sanitized.push(bundle);
        if (sanitized.length >= MAX_ATTACHMENTS_PER_TOKEN) {
            break;
        }
    }

    return sanitized;
}

/**
 * Extracts live relative attachment bundles for accessories attached to a parent token.
 * Automatically sanitizes and deduplicates bundles before returning.
 */
export function extractLiveAccessoryBundles(sceneItems: Item[], parent: Item): AttachmentBundle[] {
    const { accessoryTokens } = separateAttachments(sceneItems, parent.id);
    const bundles = accessoryTokens.map((child) => calculateRelativeAttachment(parent, child));
    return sanitizeAttachmentBundles(bundles);
}

/**
 * Compares stored attachment bundles against live scene accessory bundles.
 * Returns true if the count, child identities, or relative transform has meaningfully changed.
 * Stabilized against horizontal scale flips (Flip! extension) so scale sign inversions do not
 * falsely trigger runaway attachment diffs.
 */
export function hasAttachmentDiff(
    storedBundles: AttachmentBundle[] | undefined,
    liveBundles: AttachmentBundle[]
): boolean {
    const stored = sanitizeAttachmentBundles(storedBundles);
    const live = sanitizeAttachmentBundles(liveBundles);

    if (stored.length !== live.length) return true;
    if (stored.length === 0 && live.length === 0) return false;

    // Track matched stored indices to handle multiple identical attachments cleanly
    const matchedStoredIndices = new Set<number>();

    for (const l of live) {
        const lKey = getAccessoryIdentityKey(l.item);
        let foundMatch = false;

        for (let i = 0; i < stored.length; i++) {
            if (matchedStoredIndices.has(i)) continue;
            const s = stored[i];
            const sKey = getAccessoryIdentityKey(s.item);

            if (s.item.id === l.item.id || sKey === lKey) {
                const dx = Math.abs(s.relativeOffset.x - l.relativeOffset.x);
                const dy = Math.abs(s.relativeOffset.y - l.relativeOffset.y);
                const dr = Math.abs(s.relativeRotation - l.relativeRotation);
                const dsx = Math.abs(s.relativeScale.x - l.relativeScale.x);
                const dsy = Math.abs(s.relativeScale.y - l.relativeScale.y);

                // Account for horizontal flip sign inversion (Flip! extension)
                const xOffsetDiff = Math.min(dx, Math.abs(s.relativeOffset.x + l.relativeOffset.x));
                const xScaleDiff = Math.min(dsx, Math.abs(s.relativeScale.x + l.relativeScale.x));

                if (xOffsetDiff <= 0.01 && dy <= 0.01 && dr <= 0.01 && xScaleDiff <= 0.01 && dsy <= 0.01) {
                    matchedStoredIndices.add(i);
                    foundMatch = true;
                    break;
                }
            }
        }

        if (!foundMatch) return true;
    }

    return false;
}

/**
 * Reconciles attached accessories on the live Owlbear Rodeo scene with desired bundles.
 * Self-heals by pruning stacked duplicate tokens on the canvas and only spawning missing
 * accessories (capped at a safe maximum of 30 attachments).
 * Preserves intentional distinct attachments (e.g. two identical bows placed at different positions).
 */
export function reconcileTokenAttachmentsOnScene(
    parent: Item,
    desiredBundles: AttachmentBundle[] | undefined,
    sceneItems: Item[],
    tagAsBackupToken: boolean = false
): { itemsToAdd: Item[]; idsToDelete: string[] } {
    const { accessoryTokens } = separateAttachments(sceneItems, parent.id);
    const desired = sanitizeAttachmentBundles(desiredBundles);
    const itemsToAdd: Item[] = [];
    const idsToDelete: string[] = [];

    // Case 1: Attachment was detached or removed in PC storage; clear accessories from scene token
    if (desired.length === 0) {
        if (accessoryTokens.length > 0) {
            idsToDelete.push(...accessoryTokens.map((a) => a.id));
        }
        return { itemsToAdd, idsToDelete };
    }

    // Convert live accessories into bundles with relative offsets to check for stacked duplicates
    const liveWithBundles = accessoryTokens.map((child) => ({
        token: child,
        bundle: calculateRelativeAttachment(parent, child)
    }));

    // Active Canvas Self-Healing: Keep non-stacked live accessories, prune stacked duplicates
    const survivingLive: Array<{ token: Item; bundle: AttachmentBundle }> = [];

    for (const live of liveWithBundles) {
        const isStackedDuplicate = survivingLive.some((survivor) =>
            areAttachmentsStackedDuplicates(survivor.bundle, live.bundle)
        );

        if (isStackedDuplicate) {
            idsToDelete.push(live.token.id);
        } else {
            survivingLive.push(live);
        }
    }

    // Enforce safety ceiling (MAX_ATTACHMENTS_PER_TOKEN) on surviving live accessories
    while (survivingLive.length > MAX_ATTACHMENTS_PER_TOKEN) {
        const excess = survivingLive.pop()!;
        idsToDelete.push(excess.token.id);
    }

    // Case 2: For each desired attachment bundle, spawn only if no matching live accessory exists
    const matchedLiveIndices = new Set<number>();
    const idMap = new Map<string, string>();
    idMap.set(parent.id, parent.id);

    for (const bundle of desired) {
        if (bundle?.item?.id && bundle.item.id !== parent.id) {
            idMap.set(bundle.item.id, crypto.randomUUID());
        }
    }

    for (const bundle of desired) {
        if (!bundle || !bundle.item || bundle.item.id === parent.id) continue;
        const bKey = getAccessoryIdentityKey(bundle.item);

        // Find if this bundle already has a matching live accessory on the canvas
        let matchedIndex = -1;
        for (let i = 0; i < survivingLive.length; i++) {
            if (matchedLiveIndices.has(i)) continue;
            const live = survivingLive[i];
            const liveKey = getAccessoryIdentityKey(live.token);

            if (live.token.id === bundle.item.id) {
                matchedIndex = i;
                break;
            }

            if (liveKey === bKey) {
                const dx = Math.abs(bundle.relativeOffset.x - live.bundle.relativeOffset.x);
                const flipDx = Math.abs(bundle.relativeOffset.x + live.bundle.relativeOffset.x);
                const dy = Math.abs(bundle.relativeOffset.y - live.bundle.relativeOffset.y);

                if ((dx < 1 || flipDx < 1) && dy < 1) {
                    matchedIndex = i;
                    break;
                }
            }
        }

        if (matchedIndex !== -1) {
            matchedLiveIndices.add(matchedIndex);
            continue; // Already exists on canvas!
        }

        // Safety ceiling check
        if (survivingLive.length + itemsToAdd.length >= MAX_ATTACHMENTS_PER_TOKEN) {
            break;
        }

        const assignedId = idMap.get(bundle.item.id);
        const targetParentId = (bundle.item.attachedTo && idMap.get(bundle.item.attachedTo)) || parent.id;
        const child = applyRelativeAttachment(parent, bundle, targetParentId, assignedId);

        child.metadata = {
            ...(child.metadata || {}),
            'pokerole-pmd-extension/source-item-id': bundle.item.id,
            ...(tagAsBackupToken ? { 'pokerole-pmd-extension/is-backup-token': true } : {})
        };

        itemsToAdd.push(child);
    }

    return { itemsToAdd, idsToDelete };
}
