import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import { GRAPHICS_META_ID } from '../graphics/graphicsManager';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';
import { isItemTrainer } from './pcItemMatching';
import { getAbsoluteItemPosition } from './pcPlacementUtils';

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
    const allAttachedChildren = sceneItems.filter((i) => i.attachedTo === parentId);
    const nonHudChildren = allAttachedChildren.filter(
        (it) =>
            !it.metadata[GRAPHICS_META_ID] &&
            !it.metadata['pokerole-extension/graphic-v6'] &&
            !it.id.startsWith(`${parentId}-`)
    );

    const characterTokens: Item[] = [];
    const accessoryTokens: Item[] = [];

    for (const child of nonHudChildren) {
        if (isCharacterOrRegisteredToken(child, pcSummaries)) {
            characterTokens.push(child);
        } else {
            accessoryTokens.push(child);
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
