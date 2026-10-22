import type { CustomItem } from '../../store/storeTypes';
import { formatCamelCase } from '../../utils/generators/lootGeneratorLogic';

export interface CustomItemClassification {
    isCustomPocket: boolean;
    topLevelGroup: string;
    accordionKey: string;
    subCategory?: string;
}

export const formatItemPocketName = (pocket?: string): string => {
    if (!pocket) return 'Custom';
    if (pocket === 'HeldItems') return 'Held Items';
    if (pocket === 'Pokeballs') return 'Pokéballs';
    if (pocket === 'TrainerItems') return 'Trainer Items';
    if (pocket === 'EvolutionItem') return 'Evolution Items';
    if (pocket === 'KeyItems') return 'Key Items';
    if (pocket === 'Custom' || pocket === 'Misc') return 'Custom';
    return formatCamelCase(pocket);
};

export function getCustomItemClassification(item: CustomItem): CustomItemClassification {
    const rawPocket = item.pocket || 'Custom';
    const isCustom = rawPocket === 'Custom' || rawPocket === 'Misc';

    if (!isCustom) {
        const topLevel = formatItemPocketName(rawPocket);
        const sub = item.subCategory?.trim();
        const accordionKey = sub ? `${topLevel} > ${sub}` : topLevel;
        return {
            isCustomPocket: false,
            topLevelGroup: topLevel,
            accordionKey,
            subCategory: sub
        };
    }

    // Custom group resolution
    let group = item.customGroup?.trim();
    if (!group) {
        if (item.category?.trim() && item.category.trim() !== 'Misc' && item.category.trim() !== 'Custom') {
            group = item.category.trim();
        } else {
            group = 'Custom';
        }
    }

    let sub = item.subCategory?.trim();
    if (
        !sub &&
        item.customGroup &&
        item.category &&
        item.category.trim() !== item.customGroup.trim() &&
        item.category.trim() !== 'Misc' &&
        item.category.trim() !== 'Custom'
    ) {
        sub = item.category.trim();
    }

    const accordionKey = sub ? `${group} > ${sub}` : group;

    return {
        isCustomPocket: true,
        topLevelGroup: group,
        accordionKey,
        subCategory: sub
    };
}

export interface AccordionItemSection {
    accordionKey: string;
    topLevelGroup: string;
    items: CustomItem[];
}

export function groupCustomItemsByAccordion(items: CustomItem[]): AccordionItemSection[] {
    const map = new Map<string, { topLevelGroup: string; items: CustomItem[] }>();

    items.forEach((item) => {
        const { accordionKey, topLevelGroup } = getCustomItemClassification(item);
        if (!map.has(accordionKey)) {
            map.set(accordionKey, { topLevelGroup, items: [] });
        }
        map.get(accordionKey)!.items.push(item);
    });

    const standardOrder = ['Medicine', 'Held Items', 'Pokéballs', 'Trainer Items', 'Evolution Items', 'Key Items'];

    return Array.from(map.entries())
        .map(([accordionKey, data]) => ({
            accordionKey,
            topLevelGroup: data.topLevelGroup,
            items: data.items
        }))
        .sort((a, b) => {
            const idxA = standardOrder.indexOf(a.topLevelGroup);
            const idxB = standardOrder.indexOf(b.topLevelGroup);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            if (a.topLevelGroup === 'Custom' && b.topLevelGroup !== 'Custom') return 1;
            if (b.topLevelGroup === 'Custom' && a.topLevelGroup !== 'Custom') return -1;
            return a.accordionKey.localeCompare(b.accordionKey);
        });
}

export interface CategoryPillData {
    id: string;
    label: string;
    count: number;
}

export function getDistinctCategoryPills(items: CustomItem[]): CategoryPillData[] {
    const counts: Record<string, number> = {};

    items.forEach((item) => {
        const { topLevelGroup } = getCustomItemClassification(item);
        counts[topLevelGroup] = (counts[topLevelGroup] || 0) + 1;
    });

    const standardOrder = ['Medicine', 'Held Items', 'Pokéballs', 'Trainer Items', 'Evolution Items', 'Key Items'];
    const groups = Object.keys(counts).sort((a, b) => {
        const idxA = standardOrder.indexOf(a);
        const idxB = standardOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        if (a === 'Custom' && b !== 'Custom') return 1;
        if (b === 'Custom' && a !== 'Custom') return -1;
        return a.localeCompare(b);
    });

    return [
        { id: 'All', label: 'All', count: items.length },
        ...groups.map((group) => ({
            id: group,
            label: group,
            count: counts[group]
        }))
    ];
}
