import type { ActiveCombatBoost } from '../../store/entityTypes';

function safeParseInt(val: string | undefined): number {
    if (!val) return 0;
    const clean = val.replace(/\s+/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
}

/**
 * Checks whether text contains flat accuracy or damage success tags ([Acc Succ ...], [Dmg Succ ...]).
 */
export function hasCombatBoostTags(text: string): boolean {
    if (!text) return false;
    return /\[\s*(?:acc|dmg)\s+succ/i.test(text);
}

/**
 * Parses flat accuracy and damage successes and optional type requirements from an item's tags or description.
 * Returns an armed ActiveCombatBoost or undefined if no combat success bonuses are found.
 */
export function parseCombatBoostFromItem(item: {
    name?: string;
    tags?: string;
    desc?: string;
    description?: string;
}): ActiveCombatBoost | undefined {
    const combined = `${item.tags || ''} ${item.desc || ''} ${item.description || ''}`;
    if (!hasCombatBoostTags(combined)) {
        return undefined;
    }

    let totalAccSucc = 0;
    let totalDmgSucc = 0;
    let detectedType: string | undefined = undefined;

    // De-duplicate tag pills using a Set to prevent double-counting duplicate tags across tags, desc, and description
    const allTagMatches = combined.match(/\[[^\]]+\]/g) || [];
    const seen = new Set<string>();
    const uniqueTags: string[] = [];

    for (const rawTag of allTagMatches) {
        const trimmed = rawTag.trim();
        const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
        if (!seen.has(key)) {
            seen.add(key);
            uniqueTags.push(trimmed);
        }
    }

    for (const tag of uniqueTags) {
        const accMatch = tag.match(
            /^\[\s*acc\s+succ(?:ess(?:es)?)?\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]$/i
        );
        if (accMatch) {
            const val = safeParseInt(accMatch[1]);
            totalAccSucc += val;
            const req = accMatch[2]?.trim();
            if (req && !detectedType) {
                detectedType = req;
            }
            continue;
        }

        const dmgMatch = tag.match(
            /^\[\s*dmg\s+succ(?:ess(?:es)?)?\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]$/i
        );
        if (dmgMatch) {
            const val = safeParseInt(dmgMatch[1]);
            totalDmgSucc += val;
            const req = dmgMatch[2]?.trim();
            if (req && !detectedType) {
                detectedType = req;
            }
        }
    }

    if (totalAccSucc === 0 && totalDmgSucc === 0) {
        return undefined;
    }

    return {
        sourceName: item.name || 'Item',
        type: detectedType || undefined,
        accSucc: totalAccSucc,
        dmgSucc: totalDmgSucc,
        stage: 'armed'
    };
}
