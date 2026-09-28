import type { MoveData, PassiveItem, InventoryItem } from '../../store/storeTypes';
import type { BoostTrackerSource } from './tagTypes';
import { getMaxBoost } from '../../data/abilities/knownAbilities';
import { KNOWN_ITEMS } from '../../data/constants';

export function extractActiveEffectSummary(
    desc: string,
    rollType: 'acc' | 'dmg' | 'all' = 'all',
    move?: MoveData,
    boostLevel: number = 1
): string {
    if (!desc) return '';
    const rawTags = Array.from(desc.matchAll(/\[(.*?)\]/g)).map((m) => m[1].trim());
    if (rawTags.length === 0) return '';

    const cleanEffects: string[] = [];

    rawTags.forEach((tag) => {
        const lower = tag.toLowerCase();
        let isMatch = false;

        if (rollType === 'all') {
            isMatch = true;
        } else if (rollType === 'acc') {
            if (
                lower.includes('acc') ||
                lower.includes('accuracy') ||
                lower.includes('high crit') ||
                lower.includes('low acc') ||
                lower.includes('never miss') ||
                lower.includes('dex') ||
                lower.includes('spe') ||
                lower.includes('str') ||
                lower.includes('vit') ||
                lower.includes('ins') ||
                (move?.acc1 && lower.includes(move.acc1.toLowerCase())) ||
                (move?.acc2 && lower.includes(move.acc2.toLowerCase()))
            ) {
                isMatch = true;
            }
        } else if (rollType === 'dmg') {
            if (
                lower.includes('dmg') ||
                lower.includes('crit dmg') ||
                lower.includes('temp hp') ||
                lower.includes('str') ||
                lower.includes('spe') ||
                (move?.dmg1 && lower.includes(move.dmg1.toLowerCase()))
            ) {
                isMatch = true;
            }
        }

        if (isMatch) {
            let cleaned = tag.replace(/@\s*[^\]]+/gi, '').trim();
            if (boostLevel > 1 && /@\s*(?:stacking\s+)?boost/i.test(tag)) {
                cleaned = cleaned.replace(/([+-])\s*(\d+)/, (_, sign, num) => {
                    const scaled = parseInt(num, 10) * boostLevel;
                    return `${sign}${scaled}`;
                });
            }
            if (cleaned && !cleanEffects.includes(cleaned)) {
                cleanEffects.push(cleaned);
            }
        }
    });

    if (cleanEffects.length === 0 && rawTags.length > 0) {
        const first = rawTags[0].replace(/@\s*[^\]]+/gi, '').trim();
        return first;
    }

    return cleanEffects.join(', ');
}

export function getActiveBoostSources(
    passives?: PassiveItem[],
    inventory?: InventoryItem[],
    boostLevels: Record<string, number> = {}
): BoostTrackerSource[] {
    const sources: BoostTrackerSource[] = [];

    // 1. Passives
    (passives || [])
        .filter((p) => p.active !== false)
        .forEach((p) => {
            const rawTags = Array.from((p.desc || '').matchAll(/\[(.*?)\]/g)).map((m) => m[1].trim());
            const boostTags = rawTags.filter(
                (t) => /@\s*(?:stacking\s+)?boost\b|@\s*stacks\b/i.test(t) || /^\s*stacking\s+high\s+crit\b/i.test(t)
            );

            boostTags.forEach((t, idx) => {
                const key = boostTags.length === 1 ? `passive_${p.id}` : `passive_${p.id}_${idx}`;
                const fallbackKey = `passive_${p.id}`;
                const currentLevel =
                    boostLevels[key] !== undefined
                        ? boostLevels[key]
                        : boostLevels[fallbackKey] !== undefined
                          ? boostLevels[fallbackKey]
                          : (p.boostLevel ?? 0);

                const maxBoost = getMaxBoost(p.name, `[${t}]`);
                const effect = t.replace(/@\s*[^\]]+/gi, '').trim();

                let label = '';
                const pName = (p.name || '').trim();
                const isGenericName = !pName || /^passive(?:s)?$/i.test(pName) || /^boon(?:s)?$/i.test(pName);

                if (isGenericName) {
                    label = `${effect} Boost`;
                } else if (boostTags.length > 1) {
                    label = `${pName}: ${effect}`;
                } else {
                    label = `${pName} (${effect})`;
                }

                sources.push({
                    id: key,
                    entityKind: 'passive',
                    entityId: p.id,
                    entityName: pName || 'Passive',
                    label,
                    effect,
                    maxBoost: Math.max(1, maxBoost),
                    currentLevel,
                    tagText: `[${t}]`
                });
            });
        });

    // 2. Inventory Items
    (inventory || [])
        .filter((i) => i.active !== false)
        .forEach((i) => {
            const knownMatch = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === (i.name || '').trim().toLowerCase());
            const canonicalTags = knownMatch?.tags || '';
            const combinedTags = `${i.tags || ''} ${i.desc || ''}`.trim() || canonicalTags;
            const rawTags = Array.from(combinedTags.matchAll(/\[(.*?)\]/g)).map((m) => m[1].trim());
            const boostTags = rawTags.filter(
                (t) => /@\s*(?:stacking\s+)?boost\b|@\s*stacks\b/i.test(t) || /^\s*stacking\s+high\s+crit\b/i.test(t)
            );

            boostTags.forEach((t, idx) => {
                const key = boostTags.length === 1 ? `item_${i.id}` : `item_${i.id}_${idx}`;
                const fallbackKey = `item_${i.id}`;
                const currentLevel =
                    boostLevels[key] !== undefined
                        ? boostLevels[key]
                        : boostLevels[fallbackKey] !== undefined
                          ? boostLevels[fallbackKey]
                          : (i.boostLevel ?? 0);

                const maxBoost = getMaxBoost(i.name, `[${t}]`);
                const effect = t.replace(/@\s*[^\]]+/gi, '').trim();

                let label = '';
                const iName = (i.name || '').trim();
                const isGenericName = !iName || /^item(?:s)?$/i.test(iName);

                if (isGenericName) {
                    label = `${effect} Boost`;
                } else if (boostTags.length > 1) {
                    label = `${iName}: ${effect}`;
                } else {
                    label = `${iName} (${effect})`;
                }

                sources.push({
                    id: key,
                    entityKind: 'item',
                    entityId: i.id,
                    entityName: iName || 'Item',
                    label,
                    effect,
                    maxBoost: Math.max(1, maxBoost),
                    currentLevel,
                    tagText: `[${t}]`
                });
            });
        });

    return sources;
}
