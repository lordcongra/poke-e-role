import type { CharacterState, InventoryItem } from '../../store/storeTypes';
import type { ItemUsageResult } from './itemUsageEffects';
import type { ItemLookupResult } from '../common/itemLookupUtils';
import { getItemEffectiveCharges, consumeChargeFromInventory } from './itemCharges';
import { parseCombatTags, getAbilityText, calculateMaxHp, calculateMaxWill } from '../combat/combatUtils';
import { getItemArt } from '../graphics/itemArtCatalog';

/**
 * Recalculates HP and Will maximums based on inventory stat tags and updates the save payload.
 */
export const syncHealthWill = (
    state: CharacterState,
    newInventory: InventoryItem[],
    updatesToSave: Record<string, unknown>
): { health: CharacterState['health']; will: CharacterState['will'] } => {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const inventoryModifiers = parseCombatTags(
        newInventory,
        state.extraCategories,
        undefined,
        abilityText,
        state.passives
    );
    const fakeState = { ...state, inventory: newInventory };

    const newHealth = { ...state.health };
    const oldHpMax = newHealth.hpMax;
    newHealth.hpMax = calculateMaxHp(fakeState, inventoryModifiers);
    if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += newHealth.hpMax - oldHpMax;
    else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

    const newWill = { ...state.will };
    const oldWillMax = newWill.willMax;
    newWill.willMax = calculateMaxWill(fakeState, inventoryModifiers);
    if (newWill.willMax > oldWillMax) newWill.willCurr += newWill.willMax - oldWillMax;
    else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

    updatesToSave['hp-curr'] = newHealth.hpCurr;
    updatesToSave['hp-max-display'] = newHealth.hpMax;
    updatesToSave['will-curr'] = newWill.willCurr;
    updatesToSave['will-max-display'] = newWill.willMax;

    return { health: newHealth, will: newWill };
};

/**
 * Applies item usage effects (HP, Will, Temp HP, Stat Buffs/Debuffs, Passives) to CharacterState
 * and prepares the delta updates payload for Owlbear Rodeo persistence.
 */
export function applyUsageToState(
    state: CharacterState,
    item: InventoryItem,
    usage: ItemUsageResult,
    nextInventory: InventoryItem[]
): {
    partialState: Partial<CharacterState>;
    updatesToSave: Record<string, unknown>;
} {
    const updatesToSave: Record<string, unknown> = {
        'current-hp': usage.nextHealth.currentHitPoints ?? usage.nextHealth.hpCurr,
        'hp-curr': usage.nextHealth.hpCurr,
        'will-curr': usage.nextWill.willCurr,
        'status-list': JSON.stringify(usage.nextStatuses),
        'inv-data': JSON.stringify(nextInventory)
    };

    if (usage.tempHpGained > 0) {
        updatesToSave['temporary-hit-points'] = usage.nextHealth.temporaryHitPoints;
        updatesToSave['temporary-hit-points-max'] = usage.nextHealth.temporaryHitPointsMax;
    }

    // Stat Buff & Debuff
    let nextStats = state.stats;
    let nextDerived = state.derived;

    if (usage.statBuff) {
        const sName = usage.statBuff.stat.trim().toLowerCase();
        if (sName === 'defense' || sName === 'def') {
            nextDerived = { ...nextDerived, defBuff: (nextDerived.defBuff || 0) + usage.statBuff.value };
            updatesToSave['def-buff'] = nextDerived.defBuff;
        } else if (sName === 'special defense' || sName === 'sdef' || sName === 'spdef') {
            nextDerived = { ...nextDerived, sdefBuff: (nextDerived.sdefBuff || 0) + usage.statBuff.value };
            updatesToSave['spd-buff'] = nextDerived.sdefBuff;
        } else {
            const combatKey =
                sName === 'strength' || sName === 'str'
                    ? 'str'
                    : sName === 'dexterity' || sName === 'dex'
                      ? 'dex'
                      : sName === 'vitality' || sName === 'vit'
                        ? 'vit'
                        : sName === 'special' || sName === 'spe'
                          ? 'spe'
                          : sName === 'insight' || sName === 'ins'
                            ? 'ins'
                            : null;
            if (combatKey && nextStats[combatKey]) {
                nextStats = {
                    ...nextStats,
                    [combatKey]: {
                        ...nextStats[combatKey],
                        buff: (nextStats[combatKey].buff || 0) + usage.statBuff.value
                    }
                };
                updatesToSave[`${combatKey}-buff`] = nextStats[combatKey].buff;
            }
        }
    }

    if (usage.statDebuff) {
        const sName = usage.statDebuff.stat.trim().toLowerCase();
        if (sName === 'defense' || sName === 'def') {
            nextDerived = { ...nextDerived, defDebuff: (nextDerived.defDebuff || 0) + usage.statDebuff.value };
            updatesToSave['def-debuff'] = nextDerived.defDebuff;
        } else if (sName === 'special defense' || sName === 'sdef' || sName === 'spdef') {
            nextDerived = { ...nextDerived, sdefDebuff: (nextDerived.sdefDebuff || 0) + usage.statDebuff.value };
            updatesToSave['spd-debuff'] = nextDerived.sdefDebuff;
        } else {
            const combatKey =
                sName === 'strength' || sName === 'str'
                    ? 'str'
                    : sName === 'dexterity' || sName === 'dex'
                      ? 'dex'
                      : sName === 'vitality' || sName === 'vit'
                        ? 'vit'
                        : sName === 'special' || sName === 'spe'
                          ? 'spe'
                          : sName === 'insight' || sName === 'ins'
                            ? 'ins'
                            : null;
            if (combatKey && nextStats[combatKey]) {
                nextStats = {
                    ...nextStats,
                    [combatKey]: {
                        ...nextStats[combatKey],
                        debuff: (nextStats[combatKey].debuff || 0) + usage.statDebuff.value
                    }
                };
                updatesToSave[`${combatKey}-debuff`] = nextStats[combatKey].debuff;
            }
        }
    }

    // Permanent Stat Boost & Dungeon Passive
    let nextPassives = state.passives;
    let passivesChanged = false;

    if (usage.permanentStatBoost) {
        passivesChanged = true;
        nextPassives = [
            ...nextPassives,
            {
                id: crypto.randomUUID(),
                name: `${item.name} (${usage.permanentStatBoost.stat})`,
                desc: `[${usage.permanentStatBoost.stat} +${usage.permanentStatBoost.value}]`,
                active: true,
                showInConditions: true
            }
        ];
    }

    if (usage.dungeonPassive) {
        passivesChanged = true;
        nextPassives = [
            ...nextPassives,
            {
                id: crypto.randomUUID(),
                name: item.name,
                desc: usage.dungeonPassive,
                active: true,
                showInConditions: true
            }
        ];
    }

    if (passivesChanged) {
        updatesToSave['passives-data'] = JSON.stringify(nextPassives);
    }

    let nextTrackers = state.trackers;
    if (usage.combatBoost) {
        updatesToSave['active-combat-boost'] = JSON.stringify(usage.combatBoost);
        nextTrackers = {
            ...state.trackers,
            activeCombatBoost: usage.combatBoost
        };
    }

    return {
        partialState: {
            inventory: nextInventory,
            health: usage.nextHealth,
            will: usage.nextWill,
            statuses: usage.nextStatuses,
            stats: nextStats,
            derived: nextDerived,
            passives: nextPassives,
            trackers: nextTrackers
        },
        updatesToSave
    };
}

/**
 * Drains 1 charge from an item (respecting destroyOnDepletion retention),
 * or decrements quantity by 1 if the item has no charge bar.
 */
export function drainInventoryItemCharge(inventory: InventoryItem[], itemId: string): InventoryItem[] {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return inventory;

    const effective = getItemEffectiveCharges(item);
    if (effective.hasCharges) {
        return consumeChargeFromInventory(inventory, itemId).newInventory;
    }

    const currentQty = item.qty ?? 1;
    if (currentQty <= 1) {
        if (item.destroyOnDepletion === false) {
            return inventory.map((i) => (i.id === itemId ? { ...i, qty: 0 } : i));
        }
        return inventory.filter((i) => i.id !== itemId);
    }
    return inventory.map((i) => (i.id === itemId ? { ...i, qty: currentQty - 1 } : i));
}

/**
 * Maps an ItemLookupResult to a partial InventoryItem update object,
 * ensuring all effect, charge, art, tag, and action fields are mapped cleanly.
 */
export function applyLookupResultToItem(
    item: InventoryItem,
    result: ItemLookupResult,
    forceOverwrite = false
): Partial<InventoryItem> {
    const updates: Partial<InventoryItem> = {};

    if (result.name && result.name !== item.name) {
        updates.name = result.name;
    }

    if (result.description && (forceOverwrite || !item.desc.trim())) {
        updates.desc = result.description;
    } else if (/\[.*?\]/.test(item.desc)) {
        updates.desc = item.desc
            .replace(/\[.*?\]/g, '')
            .replace(/\n\s*\n+/g, '\n')
            .trim();
    }

    if (result.tags) {
        updates.tags = result.tags;
    }

    const targetImg = result.imageUrl || getItemArt(result.name) || getItemArt(item.name);
    if (targetImg && (!item.imageUrl || item.imageUrl === 'none')) {
        updates.imageUrl = targetImg;
    }

    if (result.charges !== undefined) {
        updates.charges = result.charges;
    }
    if (result.maxCharges !== undefined) {
        updates.maxCharges = result.maxCharges;
    }
    if (result.destroyOnDepletion !== undefined) {
        updates.destroyOnDepletion = result.destroyOnDepletion;
    }
    if (result.healHp !== undefined) {
        updates.healHp = result.healHp;
    }
    if (result.healWill !== undefined) {
        updates.healWill = result.healWill;
    }
    if (result.cures !== undefined) {
        updates.cures = result.cures;
    }
    if (result.permanentStatBoost !== undefined) {
        updates.permanentStatBoost = result.permanentStatBoost;
    }
    if (result.statBuff !== undefined) {
        updates.statBuff = result.statBuff;
    }
    if (result.statDebuff !== undefined) {
        updates.statDebuff = result.statDebuff;
    }
    if (result.gainTempHp !== undefined) {
        updates.gainTempHp = result.gainTempHp;
    }
    if (result.gainTempWill !== undefined) {
        updates.gainTempWill = result.gainTempWill;
    }
    if (result.dungeonPassive !== undefined) {
        updates.dungeonPassive = result.dungeonPassive;
    }
    if (result.inflictsStatus !== undefined) {
        updates.inflictsStatus = result.inflictsStatus;
    }
    if (result.attackAction !== undefined) {
        updates.attackAction = result.attackAction;
    }

    return updates;
}
