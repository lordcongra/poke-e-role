import type { InventoryItem, StatusItem, CustomStatus, CharacterHealth, CharacterWill } from '../../store/entityTypes';
import { getItemEffectiveCharges, getBaseItemCharges } from './itemCharges';

export interface ItemEffectDefinition {
    healHp?: number;
    healWill?: number;
    cures?: string[];
}

export interface ItemUsageResult {
    nextHealth: CharacterHealth;
    nextWill: CharacterWill;
    nextStatuses: StatusItem[];
    hpHealed: number;
    willHealed: number;
    curedStatusNames: string[];
    summaryText: string;
}

/**
 * Registry of base Pokérole items with their default usage effects.
 */
export const BASE_ITEM_EFFECTS: Record<string, ItemEffectDefinition> = {
    // Multi-unit potions & drinks: heal 1 HP per charge used
    Potion: { healHp: 1 },
    'Super Potion': { healHp: 1 },
    'Hyper Potion': { healHp: 1 },
    Remedy: { healHp: 1 },
    'Energy Root': { healHp: 1 },
    'Fresh Water': { healHp: 1 },
    'Soda Pop': { healHp: 1 },
    Lemonade: { healHp: 1 },
    'MooMoo Milk': { healHp: 1 },
    'Berry Juice': { healHp: 1 },

    // Flat heals
    'Sitrus Berry': { healHp: 3 },
    'Oran Berry': { healHp: 1 },
    Chocolate: { healHp: 1 },
    Honey: { healHp: 1 },

    // Full heals & revives
    'Max Potion': { healHp: 99 },
    'Full Restore': { healHp: 99, cures: ['All Status'] },
    'Revival Herb': { healHp: 99, cures: ['Fainted'] },
    'Max Revive': { healHp: 99, cures: ['Fainted'] },
    Revive: { healHp: 1, cures: ['Fainted'] },

    // Status cures
    'Burn Heal': { cures: ['Burn'] },
    Antidote: { cures: ['Poison'] },
    Awakening: { cures: ['Sleep'] },
    'Paralyze Heal': { cures: ['Paralysis'] },
    'Ice Heal': { cures: ['Frozen Solid'] },
    'Baked Goods': { cures: ['Sleep', 'Poison', 'Frozen Solid', 'Paralysis'] },
    'Full Heal': { cures: ['All Status'] },
    'Lum Berry': { cures: ['All Status'] }
};

/**
 * Looks up default item usage effects for a base item by name (case-insensitive).
 */
export function getBaseItemEffect(name: string): ItemEffectDefinition | undefined {
    if (!name) return undefined;
    const trimmed = name.trim().toLowerCase();
    for (const [key, val] of Object.entries(BASE_ITEM_EFFECTS)) {
        if (key.toLowerCase() === trimmed) {
            return val;
        }
    }
    return undefined;
}

/**
 * Checks whether an active status matches a given cure keyword or status name.
 */
export function statusMatchesCure(status: StatusItem, cure: string, customStatuses: CustomStatus[] = []): boolean {
    const sName = (status.name || '').trim().toLowerCase();
    const sCustom = (status.customName || '').trim().toLowerCase();
    const c = cure.trim().toLowerCase();

    if (sName === 'healthy') return false;

    if (c === 'all status' || c === 'all' || c === 'all statuses') {
        return sName !== 'fainted' && sCustom !== 'fainted';
    }

    if (c === 'burn') {
        return sName.includes('burn') || sCustom.includes('burn');
    }

    if (c === 'poison') {
        return sName.includes('poison') || sCustom.includes('poison');
    }

    if (c === 'paralysis' || c === 'paralyze') {
        return sName.includes('paraly') || sCustom.includes('paraly');
    }

    if (c === 'sleep') {
        return sName.includes('sleep') || sCustom.includes('sleep');
    }

    if (c === 'frozen solid' || c === 'freeze' || c === 'frozen') {
        return (
            sName.includes('frozen') ||
            sName.includes('freeze') ||
            sCustom.includes('frozen') ||
            sCustom.includes('freeze')
        );
    }

    if (c === 'fainted') {
        return sName === 'fainted' || sCustom === 'fainted';
    }

    // Direct name match for standard or custom status
    if (sName === c || sCustom === c) {
        return true;
    }

    // Check customStatuses registry
    const matchingCustom = customStatuses.find((cs) => cs.name.trim().toLowerCase() === c);
    if (matchingCustom) {
        const customNameLower = matchingCustom.name.trim().toLowerCase();
        if (sName === customNameLower || sCustom === customNameLower) {
            return true;
        }
    }

    return false;
}

/**
 * Checks whether an item's configured healHp reflects the legacy bug where
 * total bottle capacity was saved into healHp instead of the 1 HP per-charge heal.
 */
export function isLegacyBottleCapacity(item: { name?: string; healHp?: number; maxCharges?: number }): boolean {
    if (!item.name || typeof item.healHp !== 'number') return false;
    const baseEffect = getBaseItemEffect(item.name);
    const baseCharges = getBaseItemCharges(item.name);
    return Boolean(
        baseCharges !== undefined &&
        baseCharges > 1 &&
        baseEffect?.healHp === 1 &&
        (item.healHp === baseCharges || item.healHp === item.maxCharges)
    );
}

/**
 * Pure function that calculates HP healing, Will restoration, and status cures
 * for an item usage event.
 */
export function applyItemUsageEffects(
    item: InventoryItem,
    currentHealth: CharacterHealth,
    currentWill: CharacterWill,
    currentStatuses: StatusItem[],
    customStatuses: CustomStatus[] = []
): ItemUsageResult {
    const baseEffect = getBaseItemEffect(item.name || '');
    const healHpAmount = isLegacyBottleCapacity(item) ? 1 : (item.healHp ?? baseEffect?.healHp ?? 0);
    const healWillAmount = item.healWill ?? baseEffect?.healWill ?? 0;
    const curesList = item.cures ?? baseEffect?.cures ?? [];

    // --- HP HEALING ---
    const currentHp = currentHealth.hpCurr ?? currentHealth.currentHitPoints ?? 0;
    const maxHp = currentHealth.hpMax ?? currentHealth.maxHitPoints ?? 0;

    let targetHp = currentHp;
    if (healHpAmount >= 99) {
        targetHp = maxHp;
    } else if (healHpAmount > 0) {
        targetHp = Math.min(maxHp, currentHp + healHpAmount);
    }
    const hpHealed = Math.max(0, targetHp - currentHp);

    const nextHealth: CharacterHealth = {
        ...currentHealth,
        hpCurr: targetHp,
        hpMax: maxHp,
        currentHitPoints: targetHp,
        maxHitPoints: maxHp
    };

    // --- WILL RESTORATION ---
    const currentWillVal = currentWill.willCurr ?? 0;
    const maxWill = currentWill.willMax ?? 0;

    let targetWill = currentWillVal;
    if (healWillAmount >= 99) {
        targetWill = maxWill;
    } else if (healWillAmount > 0) {
        targetWill = Math.min(maxWill, currentWillVal + healWillAmount);
    }
    const willHealed = Math.max(0, targetWill - currentWillVal);

    const nextWill: CharacterWill = {
        ...currentWill,
        willCurr: targetWill,
        willMax: maxWill
    };

    // --- STATUS CURING ---
    const curedStatusNames: string[] = [];
    let nextStatuses: StatusItem[] = [];

    for (const status of currentStatuses) {
        const isCured = curesList.some((cure) => statusMatchesCure(status, cure, customStatuses));
        if (isCured) {
            const displayName = status.name === 'Custom...' && status.customName ? status.customName : status.name;
            curedStatusNames.push(displayName);
        } else {
            nextStatuses.push(status);
        }
    }

    // If all statuses are removed, automatically insert 'Healthy'
    if (nextStatuses.length === 0) {
        nextStatuses.push({
            id: crypto.randomUUID(),
            name: 'Healthy',
            customName: '',
            rounds: 0
        });
    } else if (nextStatuses.length > 1) {
        const nonHealthy = nextStatuses.filter((s) => s.name !== 'Healthy');
        if (nonHealthy.length > 0) {
            nextStatuses = nonHealthy;
        }
    }

    // --- SUMMARY TEXT ---
    const summaryParts: string[] = [];
    if (hpHealed > 0) {
        summaryParts.push(`Healed ${hpHealed} HP`);
    }
    if (willHealed > 0) {
        summaryParts.push(`Restored ${willHealed} Will`);
    }
    if (curedStatusNames.length > 0) {
        summaryParts.push(`Cured ${curedStatusNames.join(', ')}`);
    }
    const summaryText = summaryParts.length > 0 ? summaryParts.join('. ') + '.' : 'No effect.';

    return {
        nextHealth,
        nextWill,
        nextStatuses,
        hpHealed,
        willHealed,
        curedStatusNames,
        summaryText
    };
}

/**
 * Checks whether an item defines or inherits any direct usage effect (healing HP, restoring Will, or curing status).
 */
export function hasItemUsageEffect(item: {
    name?: string;
    healHp?: number;
    healWill?: number;
    cures?: string[];
}): boolean {
    if ((item.healHp ?? 0) > 0 || (item.healWill ?? 0) > 0 || (item.cures && item.cures.length > 0)) {
        return true;
    }
    if (item.name && getBaseItemEffect(item.name) !== undefined) {
        return true;
    }
    return false;
}

/**
 * Checks whether an item can be consumed/used via the quick use action
 * (has charges or has a defined usage effect).
 */
export function isItemUsable(item: InventoryItem): boolean {
    const effective = getItemEffectiveCharges(item);
    if (effective.hasCharges) {
        return true;
    }
    return hasItemUsageEffect(item);
}
