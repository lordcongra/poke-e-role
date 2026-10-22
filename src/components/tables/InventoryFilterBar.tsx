import { memo } from 'react';
import type { InventoryItem, CustomItem } from '../../store/entityTypes';
import { getItemEffectiveCharges } from '../../utils/items/itemCharges';
import { getBaseItemEffect } from '../../utils/items/itemUsageEffects';
import './InventoryTable.css';

export type InventoryCategoryFilter = 'all' | 'medicine' | 'held' | 'charges' | 'custom';

export interface CategoryFilterPill {
    id: InventoryCategoryFilter;
    label: string;
    count: number;
}

export function isItemInInventoryCategory(
    item: InventoryItem,
    category: InventoryCategoryFilter,
    customItems: CustomItem[] = []
): boolean {
    if (category === 'all') return true;

    const nameLower = (item.name || '').trim().toLowerCase();
    const tagsLower = (item.tags || '').toLowerCase();
    const descLower = (item.desc || '').toLowerCase();

    if (category === 'custom') {
        return customItems.some((c) => c.name.trim().toLowerCase() === nameLower);
    }

    if (category === 'charges') {
        const effective = getItemEffectiveCharges(item);
        return (
            effective.hasCharges ||
            item.destroyOnDepletion !== undefined ||
            item.charges !== undefined ||
            item.maxCharges !== undefined
        );
    }

    if (category === 'medicine') {
        const customMatch = customItems.find((c) => c.name.trim().toLowerCase() === nameLower);
        if (
            (item.healHp ?? 0) > 0 ||
            (item.healWill ?? 0) > 0 ||
            (item.cures && item.cures.length > 0) ||
            (item.inflictsStatus && item.inflictsStatus.length > 0) ||
            (item.gainTempHp ?? 0) > 0 ||
            (item.gainTempWill ?? 0) > 0 ||
            Boolean(item.permanentStatBoost) ||
            (customMatch &&
                ((customMatch.healHp ?? 0) > 0 ||
                    (customMatch.healWill ?? 0) > 0 ||
                    (customMatch.cures && customMatch.cures.length > 0) ||
                    (customMatch.gainTempHp ?? 0) > 0 ||
                    (customMatch.gainTempWill ?? 0) > 0 ||
                    Boolean(customMatch.permanentStatBoost)))
        ) {
            return true;
        }
        const baseEffect = getBaseItemEffect(item.name || '');
        if (
            baseEffect &&
            ((baseEffect.healHp ?? 0) > 0 ||
                (baseEffect.healWill ?? 0) > 0 ||
                (baseEffect.cures && baseEffect.cures.length > 0))
        ) {
            return true;
        }
        if (
            tagsLower.includes('medicine') ||
            descLower.includes('restore') ||
            descLower.includes('heal') ||
            descLower.includes('cure')
        ) {
            return true;
        }
        return false;
    }

    if (category === 'held') {
        const customMatch = customItems.find((c) => c.name.trim().toLowerCase() === nameLower);
        if (
            customMatch?.pocket === 'Held Items' ||
            customMatch?.category === 'HeldItems' ||
            item.active === true ||
            tagsLower.includes('type boosting') ||
            tagsLower.includes('choice') ||
            tagsLower.includes('mega stone') ||
            tagsLower.includes('plate') ||
            tagsLower.includes('drive') ||
            tagsLower.includes('memory') ||
            tagsLower.includes('z-crystal') ||
            tagsLower.includes('incense') ||
            tagsLower.includes('orb') ||
            Boolean(item.statBuff) ||
            Boolean(item.statDebuff)
        ) {
            return true;
        }
        return false;
    }

    return true;
}

interface InventoryFilterBarProps {
    inventory: InventoryItem[];
    selectedCategory: InventoryCategoryFilter;
    onSelectCategory: (category: InventoryCategoryFilter) => void;
    customItems?: CustomItem[];
}

export const InventoryFilterBar = memo(function InventoryFilterBar({
    inventory,
    selectedCategory,
    onSelectCategory,
    customItems = []
}: InventoryFilterBarProps) {
    const pills: CategoryFilterPill[] = [
        { id: 'all', label: 'All', count: inventory.length },
        {
            id: 'medicine',
            label: 'Medicine',
            count: inventory.filter((item) => isItemInInventoryCategory(item, 'medicine', customItems)).length
        },
        {
            id: 'held',
            label: 'Held Items',
            count: inventory.filter((item) => isItemInInventoryCategory(item, 'held', customItems)).length
        },
        {
            id: 'charges',
            label: 'Charges / Consumables',
            count: inventory.filter((item) => isItemInInventoryCategory(item, 'charges', customItems)).length
        },
        {
            id: 'custom',
            label: 'Custom',
            count: inventory.filter((item) => isItemInInventoryCategory(item, 'custom', customItems)).length
        }
    ];

    return (
        <div className="inventory-filter-bar" role="tablist" aria-label="Inventory Bag Category Filters">
            {pills.map((pill) => {
                const isActive = selectedCategory === pill.id;
                return (
                    <button
                        key={pill.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelectCategory(pill.id)}
                        className={`inventory-filter-pill ${isActive ? 'inventory-filter-pill--active' : ''}`}
                    >
                        <span>{pill.label}</span>
                        <span className="inventory-filter-pill__badge">{pill.count}</span>
                    </button>
                );
            })}
        </div>
    );
});
