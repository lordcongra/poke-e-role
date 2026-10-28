import type { InventoryItem } from '../../store/entityTypes';
import { ATTRIBUTE_COLORS } from '../../data/constants';

export interface StatOption {
    key: string;
    label: string;
    color: string;
    isRawRestricted?: boolean;
}

export const CATEGORY_DEFINITIONS: Record<string, { label: string; options: StatOption[] }> = {
    core: {
        label: 'Core',
        options: [
            { key: 'Strength', label: 'Strength', color: ATTRIBUTE_COLORS.Strength },
            { key: 'Dexterity', label: 'Dexterity', color: ATTRIBUTE_COLORS.Dexterity },
            { key: 'Vitality', label: 'Vitality', color: ATTRIBUTE_COLORS.Vitality, isRawRestricted: true },
            { key: 'Special', label: 'Special', color: ATTRIBUTE_COLORS.Special },
            { key: 'Insight', label: 'Insight', color: ATTRIBUTE_COLORS.Insight, isRawRestricted: true }
        ]
    },
    social: {
        label: 'Social',
        options: [
            { key: 'Tough', label: 'Tough', color: ATTRIBUTE_COLORS.Tough },
            { key: 'Cool', label: 'Cool', color: ATTRIBUTE_COLORS.Cool },
            { key: 'Beauty', label: 'Beauty', color: ATTRIBUTE_COLORS.Beauty },
            { key: 'Cute', label: 'Cute', color: ATTRIBUTE_COLORS.Cute },
            { key: 'Clever', label: 'Clever', color: ATTRIBUTE_COLORS.Clever }
        ]
    },
    traits: {
        label: 'Traits & Pools',
        options: [
            { key: 'Defense', label: 'Defense', color: ATTRIBUTE_COLORS.Defense },
            { key: 'Special Defense', label: 'Special Defense', color: ATTRIBUTE_COLORS['Special Defense'] },
            { key: 'Max HP', label: 'Max HP', color: ATTRIBUTE_COLORS['Max HP'] },
            { key: 'Max Will', label: 'Max Will', color: ATTRIBUTE_COLORS['Max Will'] }
        ]
    }
};

export function getCustomStatWhitelist(item: InventoryItem): string[] | null {
    const rawStat =
        item.permanentStatBoosts?.find((b) => b.stat?.startsWith('PlayerChoice'))?.stat ||
        (item.permanentStatBoost?.stat?.startsWith('PlayerChoice') ? item.permanentStatBoost.stat : undefined);

    if (rawStat && rawStat.startsWith('PlayerChoice:custom')) {
        if (rawStat.startsWith('PlayerChoice:custom:')) {
            return rawStat
                .slice('PlayerChoice:custom:'.length)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
        return [];
    }
    return null;
}

export function getStatChoiceScope(item: InventoryItem): string {
    const rawStat =
        item.permanentStatBoosts?.find((b) => b.stat?.startsWith('PlayerChoice'))?.stat ||
        (item.permanentStatBoost?.stat?.startsWith('PlayerChoice') ? item.permanentStatBoost.stat : undefined) ||
        'PlayerChoice:core';

    if (rawStat.startsWith('PlayerChoice:custom')) {
        return 'custom';
    }
    if (rawStat.includes(':')) {
        return rawStat.split(':')[1]?.toLowerCase() || 'core';
    }
    return 'core';
}

export function getAllowedCategories(scope: string): string[] {
    switch (scope) {
        case 'social':
            return ['social'];
        case 'traits':
            return ['traits'];
        case 'core_social':
            return ['core', 'social'];
        case 'any':
        case 'custom':
            return ['core', 'social', 'traits'];
        case 'core':
        default:
            return ['core'];
    }
}

