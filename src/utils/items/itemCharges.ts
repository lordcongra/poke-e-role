import type { InventoryItem } from '../../store/entityTypes';

/**
 * Registry of official Pokérole base items with multi-use charges.
 */
export const BASE_ITEM_CHARGES: Record<string, number> = {
    Potion: 2,
    'Super Potion': 4,
    'Hyper Potion': 14,
    Remedy: 4,
    'Energy Root': 14,
    'Fresh Water': 4,
    'Soda Pop': 5,
    Lemonade: 6,
    'MooMoo Milk': 8,
    'Berry Juice': 2,
    'Pepper Spray Can': 5
};

/**
 * Looks up default multi-use charges for a base item by name.
 */
export function getBaseItemCharges(name: string): number | undefined {
    if (!name) return undefined;
    const trimmed = name.trim().toLowerCase();
    for (const [key, val] of Object.entries(BASE_ITEM_CHARGES)) {
        if (key.toLowerCase() === trimmed) {
            return val;
        }
    }
    return undefined;
}

/**
 * Resolves the effective charges and max charges for an item, falling back
 * to the base item charge registry for backwards compatibility if existing
 * items have undefined charges.
 */
export function getItemEffectiveCharges(item: { name?: string; charges?: number; maxCharges?: number }): {
    hasCharges: boolean;
    charges: number;
    maxCharges: number;
} {
    const base = item.name ? getBaseItemCharges(item.name) : undefined;

    if (typeof item.charges === 'number') {
        const max = typeof item.maxCharges === 'number' ? item.maxCharges : (base ?? item.charges);
        return {
            hasCharges: true,
            charges: item.charges,
            maxCharges: Math.max(max, item.charges)
        };
    }

    if (typeof item.maxCharges === 'number') {
        return {
            hasCharges: true,
            charges: item.maxCharges,
            maxCharges: item.maxCharges
        };
    }

    if (base !== undefined) {
        return {
            hasCharges: true,
            charges: base,
            maxCharges: base
        };
    }

    return {
        hasCharges: false,
        charges: 0,
        maxCharges: 0
    };
}

/**
 * Consumes a single charge from an item in the inventory.
 *
 * Splitting and stacking rules:
 * - If remainingCharges === 0: decrements stack qty by 1. If qty === 0, removes the item.
 * - If remainingCharges > 0:
 *   - If current stack qty > 1: decrements current qty by 1. Checks if another item matches
 *     name with identical charges === remainingCharges. If so, increments its qty by 1.
 *     Otherwise, inserts a new duplicated entry with qty: 1 and charges: remainingCharges.
 *   - If current stack qty === 1: checks if another item matches name with charges === remainingCharges.
 *     If so, increments its qty by 1 and removes current item. Otherwise, updates current item's
 *     charges to remainingCharges.
 */
export function consumeChargeFromInventory(
    inventory: InventoryItem[],
    itemId: string
): {
    newInventory: InventoryItem[];
    consumedItem: InventoryItem;
    remainingCharges: number;
    maxCharges: number;
} {
    const itemIndex = inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
        throw new Error(`[itemCharges] Item with id "${itemId}" not found in inventory.`);
    }

    const targetItem = inventory[itemIndex];
    const effective = getItemEffectiveCharges(targetItem);

    const currentCharges = effective.hasCharges ? effective.charges : 1;
    const effectiveMaxCharges = effective.hasCharges ? effective.maxCharges : 1;
    const remainingCharges = Math.max(0, currentCharges - 1);

    const consumedItem: InventoryItem = {
        ...targetItem,
        charges: currentCharges,
        maxCharges: effectiveMaxCharges
    };

    const newInventory = [...inventory];
    const currentQty = targetItem.qty ?? 1;

    if (remainingCharges === 0) {
        if (currentQty <= 1) {
            newInventory.splice(itemIndex, 1);
        } else {
            newInventory[itemIndex] = {
                ...targetItem,
                qty: currentQty - 1
            };
        }
    } else {
        // remainingCharges > 0
        const matchingIndex = newInventory.findIndex(
            (item, idx) =>
                idx !== itemIndex &&
                item.name.trim().toLowerCase() === targetItem.name.trim().toLowerCase() &&
                (item.charges === remainingCharges || getItemEffectiveCharges(item).charges === remainingCharges)
        );

        if (currentQty > 1) {
            // Decrement current stack
            newInventory[itemIndex] = {
                ...targetItem,
                qty: currentQty - 1,
                charges: effective.charges,
                maxCharges: effectiveMaxCharges
            };

            if (matchingIndex !== -1) {
                const match = newInventory[matchingIndex];
                newInventory[matchingIndex] = {
                    ...match,
                    qty: (match.qty ?? 1) + 1,
                    charges: remainingCharges,
                    maxCharges: effectiveMaxCharges
                };
            } else {
                const newEntry: InventoryItem = {
                    ...targetItem,
                    id: crypto.randomUUID(),
                    qty: 1,
                    charges: remainingCharges,
                    maxCharges: effectiveMaxCharges
                };
                newInventory.splice(itemIndex + 1, 0, newEntry);
            }
        } else {
            // currentQty === 1
            if (matchingIndex !== -1) {
                const match = newInventory[matchingIndex];
                newInventory[matchingIndex] = {
                    ...match,
                    qty: (match.qty ?? 1) + 1,
                    charges: remainingCharges,
                    maxCharges: effectiveMaxCharges
                };
                newInventory.splice(itemIndex, 1);
            } else {
                newInventory[itemIndex] = {
                    ...targetItem,
                    charges: remainingCharges,
                    maxCharges: effectiveMaxCharges
                };
            }
        }
    }

    return {
        newInventory,
        consumedItem,
        remainingCharges,
        maxCharges: effectiveMaxCharges
    };
}
