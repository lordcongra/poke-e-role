import { describe, it, expect } from 'vitest';
import type { Item } from '@owlbear-rodeo/sdk';
import {
    calculateRelativeAttachment,
    applyRelativeAttachment,
    rehomeTokenSubtree
} from '../rehomeEngine';

function createMockItem(overrides: Partial<Item> = {}): Item {
    return {
        id: crypto.randomUUID(),
        type: 'IMAGE',
        layer: 'ATTACHMENT',
        name: 'Item',
        visible: true,
        locked: false,
        createdUserId: 'user-1',
        zIndex: 0,
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        metadata: {},
        ...overrides
    } as unknown as Item;
}

describe('rehomeEngine', () => {
    describe('calculateRelativeAttachment', () => {
        it('calculates correct relative coordinate offsets (dx, dy) with identity rotation and scale', () => {
            const parent = createMockItem({
                id: 'parent-1',
                position: { x: 100, y: 200 },
                rotation: 0,
                scale: { x: 1, y: 1 }
            });
            const child = createMockItem({
                id: 'child-1',
                position: { x: 150, y: 230 },
                rotation: 15,
                scale: { x: 1, y: 1 }
            });

            const bundle = calculateRelativeAttachment(parent, child);

            expect(bundle.item).toBe(child);
            expect(bundle.relativeOffset.x).toBe(50);
            expect(bundle.relativeOffset.y).toBe(30);
            expect(bundle.relativeRotation).toBe(15);
            expect(bundle.relativeScale).toEqual({ x: 1, y: 1 });
        });

        it('un-rotates relative coordinate offsets according to parent rotation', () => {
            // Parent at (0, 0) rotated 90 degrees clockwise
            const parent = createMockItem({
                position: { x: 0, y: 0 },
                rotation: 90,
                scale: { x: 1, y: 1 }
            });
            // Child is at world (0, 50). In parent's local rotated frame, this is on its local +X axis
            const child = createMockItem({
                position: { x: 0, y: 50 },
                rotation: 90,
                scale: { x: 1, y: 1 }
            });

            const bundle = calculateRelativeAttachment(parent, child);

            expect(bundle.relativeOffset.x).toBeCloseTo(50, 4);
            expect(bundle.relativeOffset.y).toBeCloseTo(0, 4);
            expect(bundle.relativeRotation).toBe(0);
        });

        it('un-scales relative coordinates and scale ratios according to parent scale', () => {
            const parent = createMockItem({
                position: { x: 100, y: 100 },
                rotation: 0,
                scale: { x: 2, y: 4 }
            });
            const child = createMockItem({
                position: { x: 160, y: 180 },
                rotation: 0,
                scale: { x: 1, y: 2 }
            });

            const bundle = calculateRelativeAttachment(parent, child);

            // dx = 60, scaleX = 2 => local x = 30
            // dy = 80, scaleY = 4 => local y = 20
            expect(bundle.relativeOffset.x).toBe(30);
            expect(bundle.relativeOffset.y).toBe(20);
            // relativeScale: childScale / parentScale => (1/2, 2/4) = (0.5, 0.5)
            expect(bundle.relativeScale.x).toBe(0.5);
            expect(bundle.relativeScale.y).toBe(0.5);
        });

        it('handles mirror transforms for horizontally flipped tokens (scaleX < 0)', () => {
            // Parent horizontally flipped via Flip! extension: scaleX = -1
            const parent = createMockItem({
                position: { x: 200, y: 200 },
                rotation: 0,
                scale: { x: -1, y: 1 }
            });
            // Child placed at world offset dx = 40, dy = 15
            const child = createMockItem({
                position: { x: 240, y: 215 },
                rotation: 0,
                scale: { x: 1, y: 1 }
            });

            const bundle = calculateRelativeAttachment(parent, child);

            // dx = 40, scaleX = -1 => relativeOffset.x = -40
            expect(bundle.relativeOffset.x).toBe(-40);
            expect(bundle.relativeOffset.y).toBe(15);
            // relativeScale.x = 1 / -1 = -1
            expect(bundle.relativeScale.x).toBe(-1);
            expect(bundle.relativeScale.y).toBe(1);

            // Round-trip check: applying this back to the flipped parent reproduces original world position
            const applied = applyRelativeAttachment(parent, bundle, parent.id);
            expect(applied.position.x).toBeCloseTo(240, 4);
            expect(applied.position.y).toBeCloseTo(215, 4);
            expect(applied.scale.x).toBeCloseTo(1, 4);
            expect(applied.scale.y).toBeCloseTo(1, 4);
        });

        it('falls back safely when position, rotation, or scale are omitted or zero', () => {
            const parentNoProps = {} as Item;
            const childNoProps = {} as Item;

            const bundle = calculateRelativeAttachment(parentNoProps, childNoProps);

            expect(bundle.relativeOffset).toEqual({ x: 0, y: 0 });
            expect(bundle.relativeRotation).toBe(0);
            expect(bundle.relativeScale).toEqual({ x: 1, y: 1 });
        });
    });

    describe('applyRelativeAttachment', () => {
        it('applies relative offset, rotation, scale and assigns customId and attachedTo', () => {
            const newParent = createMockItem({
                id: 'new-parent-id',
                position: { x: 500, y: 600 },
                rotation: 0,
                scale: { x: 1, y: 1 }
            });

            const originalChild = createMockItem({ id: 'old-child-id', name: 'Ribbon' });
            const bundle = {
                item: originalChild,
                relativeOffset: { x: 25, y: -10 },
                relativeRotation: 45,
                relativeScale: { x: 0.8, y: 0.8 }
            };

            const applied = applyRelativeAttachment(newParent, bundle, 'new-parent-id', 'custom-uuid-1');

            expect(applied.id).toBe('custom-uuid-1');
            expect(applied.attachedTo).toBe('new-parent-id');
            expect(applied.position).toEqual({ x: 525, y: 590 });
            expect(applied.rotation).toBe(45);
            expect(applied.scale).toEqual({ x: 0.8, y: 0.8 });
            expect(applied.name).toBe('Ribbon');
        });
    });

    describe('rehomeTokenSubtree', () => {
        it('re-homes parent and valid attached children while skipping character tokens', () => {
            const parentToken = createMockItem({
                id: 'old-p-id',
                layer: 'CHARACTER',
                position: { x: 100, y: 100 },
                rotation: 0,
                scale: { x: 1, y: 1 }
            });

            const childProp = createMockItem({
                id: 'child-prop-1',
                layer: 'ATTACHMENT',
                position: { x: 120, y: 110 },
                rotation: 0,
                scale: { x: 1, y: 1 },
                attachedTo: 'old-p-id'
            });

            const childCharacter = createMockItem({
                id: 'child-char-1',
                layer: 'CHARACTER',
                metadata: {
                    'pokerole-pmd-extension/stats': { species: 'Charmander' }
                },
                position: { x: 150, y: 150 },
                attachedTo: 'old-p-id'
            });

            const bundleProp = calculateRelativeAttachment(parentToken, childProp);
            const bundleChar = calculateRelativeAttachment(parentToken, childCharacter);

            const rehomed = rehomeTokenSubtree(parentToken, [bundleProp, bundleChar], {
                landingPosition: { x: 400, y: 400 },
                ownerId: 'new-owner'
            });

            // Should have parent and only childProp (childCharacter skipped)
            expect(rehomed).toHaveLength(2);

            const newParent = rehomed[0];
            expect(newParent.id).not.toBe('old-p-id');
            expect(newParent.position).toEqual({ x: 400, y: 400 });
            expect(newParent.attachedTo).toBeUndefined();
            expect(newParent.createdUserId).toBe('new-owner');

            const newChild = rehomed[1];
            expect(newChild.id).not.toBe('child-prop-1');
            expect(newChild.attachedTo).toBe(newParent.id);
            expect(newChild.position).toEqual({ x: 420, y: 410 });
            expect(newChild.createdUserId).toBe('new-owner');
        });
    });
});

