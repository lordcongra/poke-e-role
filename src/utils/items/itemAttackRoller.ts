import type { InventoryItem, MoveData, ItemAttackAction } from '../../store/entityTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { rollAccuracy } from '../combat/combatRoller';
import { getItemEffectiveCharges } from './itemCharges';

/**
 * Resolves the configured attackAction for an inventory item,
 * checking the item itself or room custom items.
 */
export function resolveItemAttackAction(
    item: InventoryItem,
    roomCustomItems?: Array<{ name: string; attackAction?: ItemAttackAction }>
): ItemAttackAction | undefined {
    if (item.attackAction) return item.attackAction;
    if (roomCustomItems && item.name) {
        const match = roomCustomItems.find(
            (c) => c.name.toLowerCase() === item.name.trim().toLowerCase()
        );
        if (match?.attackAction) return match.attackAction;
    }
    return undefined;
}

/**
 * Converts an InventoryItem and its ItemAttackAction into an ephemeral MoveData object
 * suitable for the standard Pokérole combat accuracy & damage engines.
 */
export function buildEphemeralMoveFromItem(
    item: InventoryItem,
    action: ItemAttackAction
): MoveData {
    return {
        id: `item-${item.id}`,
        active: true,
        name: item.name || 'Thrown Item',
        type: action.type || 'Normal',
        category: action.category || 'Physical',
        acc1: action.acc1,
        acc2: action.acc2 || 'none',
        dmg1: action.dmg1 || '',
        power: action.power ?? 0,
        desc: [
            action.tags || '',
            action.chanceDice
                ? `Roll ${action.chanceDice} Chance Die to inflict ${action.chanceEffect || 'Effect'}.`
                : ''
        ]
            .filter(Boolean)
            .join(' '),
        attackAction: action
    };
}

/**
 * Executes an attack roll for a consumable/held item:
 * 1. Verifies charges/quantity availability
 * 2. Triggers rollAccuracy() with ephemeral MoveData
 * 3. Consumes 1 charge (or decrements qty)
 */
export async function executeItemAttackRoll(
    item: InventoryItem,
    action: ItemAttackAction
): Promise<void> {
    const store = useCharacterStore.getState();
    const effective = getItemEffectiveCharges(item);
    const isDepleted = (effective.hasCharges && effective.charges <= 0) || (item.qty ?? 1) <= 0;
    if (isDepleted) return;

    const ephemeralMove = buildEphemeralMoveFromItem(item, action);

    // Roll accuracy through combatRoller (applies stat/skill buffs, held item bonuses, passives)
    await rollAccuracy(ephemeralMove, store);

    // Drain charge / decrement qty
    store.consumeItemCharge(item.id);
}
