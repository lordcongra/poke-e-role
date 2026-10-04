import type { Item } from '@owlbear-rodeo/sdk';
import type { AttachmentBundle } from '../../types/pcStorageTypes';
import { isCharacterOrRegisteredToken } from './pcAttachmentOps';

/**
 * Calculates the relative transform of a child item attached to a parent token.
 * Stores local coordinates, rotation offset, and scale ratio so accessories (bows,
 * hats, held items, surfboards) stay perfectly positioned across scenes and respect
 * horizontal flipping (such as from the Flip! extension).
 */
export function calculateRelativeAttachment(parent: Item, child: Item): AttachmentBundle {
    const parentPos = parent.position || { x: 0, y: 0 };
    const childPos = child.position || { x: 0, y: 0 };
    const parentScale = parent.scale || { x: 1, y: 1 };
    const childScale = child.scale || { x: 1, y: 1 };
    const parentRot = parent.rotation || 0;
    const childRot = child.rotation || 0;

    // Delta in world coordinates
    const dx = childPos.x - parentPos.x;
    const dy = childPos.y - parentPos.y;

    // Un-rotate by parent angle (degrees to radians)
    const rad = (-parentRot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const unrotatedX = dx * cos - dy * sin;
    const unrotatedY = dx * sin + dy * cos;

    // Un-scale by parent scale (handling negative scale from Flip!)
    const scaleX = parentScale.x !== 0 ? parentScale.x : 1;
    const scaleY = parentScale.y !== 0 ? parentScale.y : 1;

    return {
        item: child,
        relativeOffset: {
            x: unrotatedX / scaleX,
            y: unrotatedY / scaleY
        },
        relativeRotation: childRot - parentRot,
        relativeScale: {
            x: childScale.x / scaleX,
            y: childScale.y / scaleY
        }
    };
}

/**
 * Applies the stored relative transform to place an attached child onto a newly spawned parent token.
 * Perfectly mirrors accessories when the parent is horizontally flipped (Flip! extension).
 */
export function applyRelativeAttachment(newParent: Item, bundle: AttachmentBundle, newParentId: string): Item {
    const childClone = JSON.parse(JSON.stringify(bundle.item)) as Item;
    const parentPos = newParent.position || { x: 0, y: 0 };
    const parentScale = newParent.scale || { x: 1, y: 1 };
    const parentRot = newParent.rotation || 0;

    // 1. Scale local offset by parent's current scale
    const scaledX = bundle.relativeOffset.x * parentScale.x;
    const scaledY = bundle.relativeOffset.y * parentScale.y;

    // 2. Rotate local offset by parent's current rotation
    const rad = (parentRot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;

    // 3. Apply position
    childClone.position = {
        x: parentPos.x + rotatedX,
        y: parentPos.y + rotatedY
    };

    // 4. Apply rotation
    childClone.rotation = parentRot + bundle.relativeRotation;

    // 5. Apply scale (mirrors when parent scale is negative)
    childClone.scale = {
        x: bundle.relativeScale.x * parentScale.x,
        y: bundle.relativeScale.y * parentScale.y
    };

    // 6. Rewire attachment link to new parent
    (childClone as { id: string }).id = crypto.randomUUID();
    childClone.attachedTo = newParentId;

    return childClone;
}

export interface RehomeOptions {
    landingPosition: { x: number; y: number };
    ownerId?: string;
}

/**
 * Re-homes a captured token subtree (parent token + all attached children)
 * by minting fresh IDs, rewiring attachedTo pointers, and placing at the landing coordinates.
 */
export function rehomeTokenSubtree(parentToken: Item, attachments: AttachmentBundle[], options: RehomeOptions): Item[] {
    const freshParentId = crypto.randomUUID();
    const clonedParent = JSON.parse(JSON.stringify(parentToken)) as Item;

    (clonedParent as { id: string }).id = freshParentId;
    clonedParent.position = { ...options.landingPosition };
    delete (clonedParent as { attachedTo?: unknown }).attachedTo;
    if (options.ownerId) {
        clonedParent.createdUserId = options.ownerId;
    }

    const rehomedChildren: Item[] = [];

    // Cycle detector & safeguard: ensure child is never parent and never a character token
    for (const bundle of attachments) {
        if (!bundle || !bundle.item || bundle.item.id === parentToken.id) {
            continue;
        }
        if (isCharacterOrRegisteredToken(bundle.item)) {
            continue;
        }
        const rehomedChild = applyRelativeAttachment(clonedParent, bundle, freshParentId);
        if (options.ownerId) {
            rehomedChild.createdUserId = options.ownerId;
        }
        rehomedChildren.push(rehomedChild);
    }

    return [clonedParent, ...rehomedChildren];
}

/**
 * Chunks items array into smaller batches to respect Owlbear Rodeo write-message rate limits.
 */
export function chunkItems<T>(items: T[], chunkSize = 15): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
