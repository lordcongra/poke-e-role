import type { StateCreator } from 'zustand';
import type { CharacterState, InventorySlice, InventoryItem, CustomInfo } from '../storeTypes';
import { saveToOwlbear } from '../../utils/sync/obr';
import { imageManager } from '../../utils/graphics/imageManager';
import { KNOWN_ITEMS } from '../../data/constants';
import { getBaseItemCharges, getItemEffectiveCharges, consumeChargeFromInventory } from '../../utils/items/itemCharges';
import { applyItemUsageEffects } from '../../utils/items/itemUsageEffects';
import { broadcastInfo } from '../../utils/combat/diceRoller';

import { syncHealthWill, applyUsageToState, drainInventoryItemCharge } from '../../utils/items/inventoryItemOps';

export const createInventorySlice: StateCreator<CharacterState, [], [], InventorySlice> = (set) => ({
    inventory: [],
    notes: '',
    customInfo: [],
    tp: 0,
    currency: 0,

    addInventoryItem: () =>
        set((state) => {
            const newInventory: InventoryItem[] = [
                ...state.inventory,
                { id: crypto.randomUUID(), qty: 1, name: '', desc: '', active: false }
            ];
            const updatesToSave: Record<string, unknown> = { 'inv-data': JSON.stringify(newInventory) };
            const { health, will } = syncHealthWill(state, newInventory, updatesToSave);
            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[InventorySlice] Failed to save added item to Owlbear:', error);
            }
            return { inventory: newInventory, health, will };
        }),

    addSpecificInventoryItem: (item) =>
        set((state) => {
            const rawName = item.name || '';
            const rawDesc = item.description || '';
            const knownMatch = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === rawName.toLowerCase());
            const legacyTags = Array.from(rawDesc.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
            const cleanDesc = rawDesc
                .replace(/\[.*?\]/g, '')
                .replace(/\n\s*\n+/g, '\n')
                .trim();
            const tags = item.tags || (legacyTags.length > 0 ? legacyTags.join(' ') : knownMatch?.tags || undefined);

            const customMatch = state.roomCustomItems?.find((i) => i.name.toLowerCase() === rawName.toLowerCase());
            const resolvedImageUrl = item.imageUrl || customMatch?.imageUrl;
            const baseCharges = getBaseItemCharges(rawName);
            const resolvedCharges = item.charges ?? customMatch?.charges ?? baseCharges;
            const resolvedMaxCharges =
                item.maxCharges ?? customMatch?.maxCharges ?? item.charges ?? customMatch?.charges ?? baseCharges;
            const resolvedHealHp = item.healHp ?? customMatch?.healHp;
            const resolvedHealWill = item.healWill ?? customMatch?.healWill;
            const resolvedCures = item.cures ?? customMatch?.cures;
            const resolvedDestroyOnDepletion = item.destroyOnDepletion ?? customMatch?.destroyOnDepletion;
            const resolvedPermanentStatBoost = item.permanentStatBoost ?? customMatch?.permanentStatBoost;
            const resolvedStatBuff = item.statBuff ?? customMatch?.statBuff;
            const resolvedStatDebuff = item.statDebuff ?? customMatch?.statDebuff;
            const resolvedGainTempHp = item.gainTempHp ?? customMatch?.gainTempHp;
            const resolvedGainTempWill = item.gainTempWill ?? customMatch?.gainTempWill;
            const resolvedDungeonPassive = item.dungeonPassive ?? customMatch?.dungeonPassive;
            const resolvedInflictsStatus = item.inflictsStatus ?? customMatch?.inflictsStatus;
            const resolvedAttackAction = item.attackAction ?? customMatch?.attackAction;

            const newInventory: InventoryItem[] = [
                ...state.inventory,
                {
                    id: crypto.randomUUID(),
                    qty: item.quantity ?? 1,
                    name: rawName,
                    desc: cleanDesc,
                    tags,
                    active: item.active || false,
                    imageUrl: resolvedImageUrl,
                    charges: resolvedCharges,
                    maxCharges: resolvedMaxCharges,
                    destroyOnDepletion: resolvedDestroyOnDepletion,
                    healHp: resolvedHealHp,
                    healWill: resolvedHealWill,
                    cures: resolvedCures,
                    permanentStatBoost: resolvedPermanentStatBoost,
                    statBuff: resolvedStatBuff,
                    statDebuff: resolvedStatDebuff,
                    gainTempHp: resolvedGainTempHp,
                    gainTempWill: resolvedGainTempWill,
                    dungeonPassive: resolvedDungeonPassive,
                    inflictsStatus: resolvedInflictsStatus,
                    attackAction: resolvedAttackAction
                }
            ];
            const updatesToSave: Record<string, unknown> = { 'inv-data': JSON.stringify(newInventory) };
            const { health, will } = syncHealthWill(state, newInventory, updatesToSave);
            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[InventorySlice] Failed to save specific item to Owlbear:', error);
            }
            return { inventory: newInventory, health, will };
        }),

    updateInventoryItem: (id, field, value) =>
        set((state) => {
            let statusChanged = false;
            let newStatuses = [...state.statuses];
            let grantedTempHp = 0;

            const newInventory = state.inventory.map((item) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };

                    if (field === 'active') {
                        const knownMatch = KNOWN_ITEMS.find(
                            (k) => k.name.toLowerCase() === (item.name || '').trim().toLowerCase()
                        );
                        const canonicalTags = knownMatch?.tags || '';
                        const combinedTags = `${item.tags || ''} ${item.desc || ''}`.trim() || canonicalTags;
                        const descriptionText = combinedTags.toLowerCase();

                        if (value === true) {
                            const tempHpMatch = descriptionText.match(/\[\s*gain temp hp\s*(\d+)\s*\]/i);
                            if (tempHpMatch) {
                                grantedTempHp = Math.max(grantedTempHp, parseInt(tempHpMatch[1], 10));
                            }
                        }

                        const statusMatches = Array.from(descriptionText.matchAll(/\[status:\s*([a-zA-Z0-9\s]+)\]/gi));

                        if (statusMatches.length > 0) {
                            if (value === true) {
                                statusMatches.forEach((match) => {
                                    const statusName = match[1].trim();
                                    const properNames = [
                                        '1st Degree Burn',
                                        '2nd Degree Burn',
                                        '3rd Degree Burn',
                                        'Poison',
                                        'Badly Poisoned',
                                        'Paralysis',
                                        'Sleep',
                                        'Frozen Solid',
                                        'Confusion',
                                        'In Love',
                                        'Flinch'
                                    ];

                                    const properName =
                                        properNames.find((s) => s.toLowerCase() === statusName.toLowerCase()) ||
                                        statusName;

                                    const exists = newStatuses.some(
                                        (s) =>
                                            s.name.toLowerCase() === properName.toLowerCase() ||
                                            s.customName.toLowerCase() === properName.toLowerCase()
                                    );

                                    if (!exists) {
                                        if (newStatuses.length === 1 && newStatuses[0].name === 'Healthy')
                                            newStatuses = [];
                                        newStatuses.push({
                                            id: crypto.randomUUID(),
                                            name: properName,
                                            customName: '',
                                            rounds: 0
                                        });
                                        statusChanged = true;
                                    }
                                });
                            } else {
                                statusMatches.forEach((match) => {
                                    const statusName = match[1].trim().toLowerCase();
                                    const idx = newStatuses.findIndex(
                                        (s) =>
                                            (s.name === 'Custom...'
                                                ? s.customName.toLowerCase()
                                                : s.name.toLowerCase()) === statusName
                                    );
                                    if (idx !== -1) {
                                        newStatuses.splice(idx, 1);
                                        statusChanged = true;
                                    }
                                });
                                if (newStatuses.length === 0) {
                                    newStatuses.push({
                                        id: crypto.randomUUID(),
                                        name: 'Healthy',
                                        customName: '',
                                        rounds: 0
                                    });
                                    statusChanged = true;
                                }
                            }
                        }
                    }
                    return updated as InventoryItem;
                }
                return item;
            });

            const updatesToSave: Record<string, unknown> = {};
            const { health, will } = syncHealthWill(state, newInventory, updatesToSave);

            if (grantedTempHp > health.temporaryHitPointsMax) {
                health.temporaryHitPoints = grantedTempHp;
                health.temporaryHitPointsMax = grantedTempHp;
                updatesToSave['temporary-hit-points'] = grantedTempHp;
                updatesToSave['temporary-hit-points-max'] = grantedTempHp;
            }

            updatesToSave['inv-data'] = JSON.stringify(newInventory);
            if (statusChanged) updatesToSave['status-list'] = JSON.stringify(newStatuses);

            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[InventorySlice] Failed to save updated item to Owlbear:', error);
            }
            return { inventory: newInventory, health, will, ...(statusChanged ? { statuses: newStatuses } : {}) };
        }),

    removeInventoryItem: (id) =>
        set((state) => {
            const itemToRemove = state.inventory.find((i) => i.id === id);
            if (itemToRemove?.imageUrl && itemToRemove.imageUrl.startsWith('local-img:')) {
                imageManager.deleteImage(itemToRemove.imageUrl).catch((error) => {
                    console.error('[InventorySlice] Failed to delete item image from IndexedDB:', error);
                });
            }

            const newInventory = state.inventory.filter((i) => i.id !== id);
            const updatesToSave: Record<string, unknown> = { 'inv-data': JSON.stringify(newInventory) };
            const { health, will } = syncHealthWill(state, newInventory, updatesToSave);
            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[InventorySlice] Failed to save removed item to Owlbear:', error);
            }
            return { inventory: newInventory, health, will };
        }),

    moveUpInventoryItem: (id) =>
        set((state) => {
            const index = state.inventory.findIndex((i) => i.id === id);
            if (index <= 0) return state;
            const newInventory = [...state.inventory];
            [newInventory[index - 1], newInventory[index]] = [newInventory[index], newInventory[index - 1]];
            try {
                saveToOwlbear({ 'inv-data': JSON.stringify(newInventory) });
            } catch (error) {
                console.error('[InventorySlice] Failed to save moved item to Owlbear:', error);
            }
            return { inventory: newInventory };
        }),
    moveDownInventoryItem: (id) =>
        set((state) => {
            const index = state.inventory.findIndex((i) => i.id === id);
            if (index < 0 || index >= state.inventory.length - 1) return state;
            const newInventory = [...state.inventory];
            [newInventory[index + 1], newInventory[index]] = [newInventory[index], newInventory[index + 1]];
            try {
                saveToOwlbear({ 'inv-data': JSON.stringify(newInventory) });
            } catch (error) {
                console.error('[InventorySlice] Failed to save moved item to Owlbear:', error);
            }
            return { inventory: newInventory };
        }),
    setNotes: (text) =>
        set(() => {
            try {
                saveToOwlbear({ notes: text });
            } catch (error) {
                console.error('[InventorySlice] Failed to save notes to Owlbear:', error);
            }
            return { notes: text };
        }),

    setTp: (val) =>
        set(() => {
            try {
                saveToOwlbear({ 'training-points': val });
            } catch (error) {
                console.error('[InventorySlice] Failed to save TP to Owlbear:', error);
            }
            return { tp: val };
        }),
    setCurrency: (val) =>
        set(() => {
            try {
                saveToOwlbear({ currency: val });
            } catch (error) {
                console.error('[InventorySlice] Failed to save currency to Owlbear:', error);
            }
            return { currency: val };
        }),

    addCustomInfo: () =>
        set((state) => {
            const newInfo = [...state.customInfo, { id: crypto.randomUUID(), label: 'New Field', value: '' }];
            try {
                saveToOwlbear({ 'custom-info-data': JSON.stringify(newInfo) });
            } catch (error) {
                console.error('[InventorySlice] Failed to save custom info to Owlbear:', error);
            }
            return { customInfo: newInfo };
        }),
    updateCustomInfo: (id: string, field: keyof CustomInfo, value: string) =>
        set((state) => {
            const newInfo = state.customInfo.map((c) => (c.id === id ? { ...c, [field]: value } : c));
            try {
                saveToOwlbear({ 'custom-info-data': JSON.stringify(newInfo) });
            } catch (error) {
                console.error('[InventorySlice] Failed to save updated custom info to Owlbear:', error);
            }
            return { customInfo: newInfo };
        }),
    removeCustomInfo: (id: string) =>
        set((state) => {
            const newInfo = state.customInfo.filter((c) => c.id !== id);
            try {
                saveToOwlbear({ 'custom-info-data': JSON.stringify(newInfo) });
            } catch (error) {
                console.error('[InventorySlice] Failed to save removed custom info to Owlbear:', error);
            }
            return { customInfo: newInfo };
        }),

    useInventoryItem: (id: string, options?: { chosenStat?: string }) =>
        set((state) => {
            const item = state.inventory.find((i) => i.id === id);
            if (!item) return state;

            const effective = getItemEffectiveCharges(item);
            if (effective.hasCharges && effective.charges <= 0) {
                return state;
            }

            const usage = applyItemUsageEffects(
                item,
                state.health,
                state.will,
                state.statuses,
                state.roomCustomStatuses,
                options
            );

            let nextInventory: InventoryItem[];
            if (effective.hasCharges) {
                const result = consumeChargeFromInventory(state.inventory, id);
                nextInventory = result.newInventory;
            } else {
                const currentQty = item.qty ?? 1;
                if (currentQty <= 1) {
                    if (item.destroyOnDepletion === false) {
                        nextInventory = state.inventory.map((i) => (i.id === id ? { ...i, qty: 0 } : i));
                    } else {
                        nextInventory = state.inventory.filter((i) => i.id !== id);
                    }
                } else {
                    nextInventory = state.inventory.map((i) => (i.id === id ? { ...i, qty: currentQty - 1 } : i));
                }
            }

            const { partialState, updatesToSave } = applyUsageToState(state, item, usage, nextInventory);

            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[InventorySlice] Failed to save used item to Owlbear:', error);
            }

            const characterName = state.identity?.nickname || state.identity?.species || 'Trainer';
            const broadcastMessage = `Used ${item.name || 'Item'}. ${usage.summaryText}`;
            broadcastInfo(characterName || 'Trainer', broadcastMessage).catch((error) => {
                console.error('[InventorySlice] Failed to broadcast item usage:', error);
            });

            return partialState;
        }),

    consumeItemCharge: (id: string) =>
        set((state) => {
            const item = state.inventory.find((i) => i.id === id);
            if (!item) return state;

            const nextInventory = drainInventoryItemCharge(state.inventory, id);
            const updatesToSave: Record<string, unknown> = { 'inv-data': JSON.stringify(nextInventory) };
            const { health, will } = syncHealthWill(state, nextInventory, updatesToSave);

            try {
                saveToOwlbear(updatesToSave);
            } catch (error) {
                console.error('[InventorySlice] Failed to save consumed charge to Owlbear:', error);
            }

            return { inventory: nextInventory, health, will };
        })
});
