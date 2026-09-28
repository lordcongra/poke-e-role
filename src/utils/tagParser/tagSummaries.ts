import type { MoveData, PassiveItem, InventoryItem } from '../../store/storeTypes';
import type { BoostTrackerSource } from './tagTypes';
import { getMaxBoost } from '../../data/abilities/knownAbilities';
import { KNOWN_ITEMS } from '../../data/constants';

export function isStatOrSkillMatch(tagText: string, attrOrSkill?: string): boolean {
    if (!attrOrSkill || attrOrSkill.toLowerCase() === 'none') return false;
    const lowerTag = tagText.toLowerCase();
    const cleanTarget = attrOrSkill.toLowerCase().trim();
    const map: Record<string, string> = {
        strength: 'str',
        dexterity: 'dex',
        vitality: 'vit',
        special: 'spe',
        insight: 'ins',
        tough: 'tou',
        cool: 'coo',
        beauty: 'bea',
        cute: 'cut',
        clever: 'cle'
    };
    const shortCode = map[cleanTarget] || cleanTarget;

    if (lowerTag.includes(cleanTarget)) return true;
    const regex = new RegExp(`\\b${shortCode}\\b|\\b${cleanTarget}\\b`, 'i');
    return regex.test(lowerTag);
}

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
                lower.includes('first hit acc') ||
                isStatOrSkillMatch(lower, move?.acc1) ||
                isStatOrSkillMatch(lower, move?.acc2)
            ) {
                isMatch = true;
            }
        } else if (rollType === 'dmg') {
            if (
                lower.includes('dmg') ||
                lower.includes('damage') ||
                lower.includes('crit dmg') ||
                lower.includes('temp hp') ||
                lower.includes('first hit dmg') ||
                isStatOrSkillMatch(lower, move?.dmg1)
            ) {
                isMatch = true;
            }
        }

        if (isMatch) {
            let cleaned = tag.replace(/@\s*[^\]]+/gi, '').trim();
            if (/acc\s*\d+s\s*add(?:s)?\s*dmg(?!\s*dice)/i.test(cleaned)) {
                cleaned = cleaned.replace(/add(?:s)?\s*dmg/i, 'Add Dmg Dice');
            }
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

    if (cleanEffects.length === 0) {
        if (rollType === 'all' && rawTags.length > 0) {
            return rawTags[0].replace(/@\s*[^\]]+/gi, '').trim();
        }
        return '';
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
