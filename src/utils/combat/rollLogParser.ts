export interface ParsedFactor {
    raw: string;
    category: 'ability' | 'item' | 'passive' | 'move' | 'status' | 'condition' | 'tactical' | 'modifier';
    title: string;
    detail?: string;
}

export interface ParsedRollLabel {
    cleanLabel: string;
    coreTags: string[];
    factorTags: string[];
    parsedFactors: ParsedFactor[];
}

export function splitTopLevelCommas(str: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '(' || char === '[' || char === '{') {
            depth++;
            current += char;
        } else if (char === ')' || char === ']' || char === '}') {
            if (depth > 0) depth--;
            current += char;
        } else if (char === ',' && depth === 0) {
            if (current.trim()) parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    return parts;
}

export function categorizeFactor(raw: string): ParsedFactor {
    const trimmed = raw.trim();

    // 1. Ability
    if (/^ability:\s*/i.test(trimmed)) {
        const full = trimmed.replace(/^ability:\s*/i, '');
        const match = full.match(/^(.*?)(?:\s*\(([^()]+)\))?$/);
        return {
            raw: trimmed,
            category: 'ability',
            title: match?.[1]?.trim() || full,
            detail: match?.[2]?.trim() || undefined
        };
    }

    // 2. Item
    if (/^item:\s*/i.test(trimmed)) {
        const full = trimmed.replace(/^item:\s*/i, '');
        const match = full.match(/^(.*?)(?:\s*\(([^()]+)\))?$/);
        return {
            raw: trimmed,
            category: 'item',
            title: match?.[1]?.trim() || full,
            detail: match?.[2]?.trim() || undefined
        };
    }

    // 3. Passive
    if (/^passive:\s*/i.test(trimmed)) {
        const full = trimmed.replace(/^passive:\s*/i, '');
        const match = full.match(/^(.*?)(?:\s*\(([^()]+)\))?$/);
        return {
            raw: trimmed,
            category: 'passive',
            title: match?.[1]?.trim() || full,
            detail: match?.[2]?.trim() || undefined
        };
    }

    // 4. Move Mechanics / STAB / Type
    if (
        /^move:\s*/i.test(trimmed) ||
        /\b(?:stab|protean\s+stab)\b/i.test(trimmed) ||
        /tera\s+burst/i.test(trimmed) ||
        /tera\s+boost/i.test(trimmed) ||
        /powder:\s*/i.test(trimmed) ||
        /min\s+1\s+die\s+vs\s+def/i.test(trimmed)
    ) {
        const parenMatch = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
        return {
            raw: trimmed,
            category: 'move',
            title: parenMatch?.[1]?.trim() || trimmed.replace(/^move:\s*/i, ''),
            detail: parenMatch?.[2]?.trim() || undefined
        };
    }

    // 5. Conditions & Penalties
    if (
        /pain\s+penalty/i.test(trimmed) ||
        /ignored\s+pain/i.test(trimmed) ||
        /low\s+accuracy/i.test(trimmed) ||
        /ignored\s+\d+\s+low\s+acc/i.test(trimmed)
    ) {
        const colonMatch = trimmed.match(/^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|die|dmg\s+dice))$/i);
        return {
            raw: trimmed,
            category: 'condition',
            title: colonMatch ? colonMatch[1].trim() : trimmed,
            detail: colonMatch ? colonMatch[2].trim() : undefined
        };
    }

    // 6. Statuses
    if (
        /paralysis/i.test(trimmed) ||
        /asleep/i.test(trimmed) ||
        /frozen/i.test(trimmed) ||
        /confusion/i.test(trimmed) ||
        /poison/i.test(trimmed) ||
        /burn/i.test(trimmed)
    ) {
        const colonMatch = trimmed.match(/^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|die|dmg\s+dice))$/i);
        return {
            raw: trimmed,
            category: 'status',
            title: colonMatch ? colonMatch[1].trim() : trimmed,
            detail: colonMatch ? colonMatch[2].trim() : undefined
        };
    }

    // 7. Tactical & Roll Modifiers (First Hit, Chances, Bank, Recoil, Super Effective, etc.)
    if (
        /super\s+effective/i.test(trimmed) ||
        /not\s+very\s+effective/i.test(trimmed) ||
        /first\s+hit/i.test(trimmed) ||
        /chances:/i.test(trimmed) ||
        /banked/i.test(trimmed) ||
        /recoil/i.test(trimmed) ||
        /cannot\s+be\s+evaded/i.test(trimmed) ||
        /acc\s+\d+s\s+add\s+dmg/i.test(trimmed) ||
        /stacking\s+high\s+crit/i.test(trimmed) ||
        /extra\s+stacking\s+crit/i.test(trimmed)
    ) {
        const parenMatch = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
        return {
            raw: trimmed,
            category: 'tactical',
            title: parenMatch?.[1]?.trim() || trimmed,
            detail: parenMatch?.[2]?.trim() || undefined
        };
    }

    // 8. Tracker Mod / Net Mod / Rank bonus / Stat Buffs & Debuffs
    if (
        /tracker\s*mod/i.test(trimmed) ||
        /net\s+mod/i.test(trimmed) ||
        /rank/i.test(trimmed) ||
        /\b(?:buff|debuff)\b/i.test(trimmed)
    ) {
        const colonMatch = trimmed.match(
            /^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|die|dmg\s+dice|dmg\s+die|acc\s+dice|acc\s+die))$/i
        );
        const parenMatch = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
        return {
            raw: trimmed,
            category: 'modifier',
            title: colonMatch ? colonMatch[1].trim() : parenMatch?.[1]?.trim() || trimmed,
            detail: colonMatch ? colonMatch[2].trim() : parenMatch?.[2]?.trim() || undefined
        };
    }

    const colonMatch = trimmed.match(
        /^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|die|dmg\s+dice|dmg\s+die|acc\s+dice|acc\s+die))$/i
    );
    const parenMatch = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    return {
        raw: trimmed,
        category: 'modifier',
        title: colonMatch ? colonMatch[1].trim() : parenMatch?.[1]?.trim() || trimmed,
        detail: colonMatch ? colonMatch[2].trim() : parenMatch?.[2]?.trim() || undefined
    };
}

export function consolidateFactors(factors: ParsedFactor[]): ParsedFactor[] {
    if (!factors || factors.length <= 1) return factors;

    const sourcedIndices = new Set<number>();
    const genericIndicesToRemove = new Set<number>();

    // Identify all sourced factors: item, passive, ability
    factors.forEach((f, idx) => {
        if (f.category === 'item' || f.category === 'passive' || f.category === 'ability') {
            sourcedIndices.add(idx);
        }
    });

    const result = factors.map((f) => ({ ...f }));

    const checkCoverage = (sourcedIdx: number, genericIdx: number) => {
        const sourced = result[sourcedIdx];
        const generic = result[genericIdx];

        const sourcedText = `${sourced.title} ${sourced.detail || ''}`.toLowerCase();
        const genericText = `${generic.title} ${generic.detail || ''}`.toLowerCase();

        // 1. Acc Xs Add Dmg / Acc Xs Add Dmg Dice
        if (
            /acc\s*\d+s\s*add(?:s)?\s*(?:dmg|damage)/i.test(genericText) &&
            /acc\s*\d+s\s*add(?:s)?\s*(?:dmg|damage)/i.test(sourcedText)
        ) {
            if (sourced.detail && !/dice/i.test(sourced.detail)) {
                sourced.detail = sourced.detail.replace(/add(?:s)?\s*dmg/i, 'Add Dmg Dice');
            }
            genericIndicesToRemove.add(genericIdx);
            return true;
        }

        // 2. Ignore Low Acc / Ignored X Low Acc
        if (/ignored?\s*(?:\d+\s*)?low\s*acc/i.test(genericText) && /ignore\s*low\s*acc/i.test(sourcedText)) {
            const countMatch = generic.title.match(/ignored\s+(\d+)\s+low\s+acc/i);
            if (countMatch) {
                sourced.detail = `Ignored ${countMatch[1]} Low Acc`;
            }
            genericIndicesToRemove.add(genericIdx);
            return true;
        }

        // 3. Ignore Pain / Ignored Pain Penalty
        if (/ignore(?:d)?\s*pain/i.test(genericText) && /ignore(?:d)?\s*pain/i.test(sourcedText)) {
            sourced.detail = 'Ignored Pain Penalty';
            genericIndicesToRemove.add(genericIdx);
            return true;
        }

        // 4. First Hit
        if (/first\s*hit/i.test(genericText) && /first\s*hit/i.test(sourcedText)) {
            if (generic.detail) {
                sourced.detail = `First Hit (${generic.detail})`;
            }
            genericIndicesToRemove.add(genericIdx);
            return true;
        }

        // 5. Temp HP
        if (/gains?\s*\d+\s*temp\s*hp/i.test(genericText) && /temp\s*hp/i.test(sourcedText)) {
            genericIndicesToRemove.add(genericIdx);
            return true;
        }

        // 6. High Critical
        if (
            /high\s*critical/i.test(genericText) &&
            /high\s*critical/i.test(sourcedText) &&
            generic.category === 'move'
        ) {
            genericIndicesToRemove.add(genericIdx);
            return true;
        }

        return false;
    };

    for (const sIdx of sourcedIndices) {
        for (let gIdx = 0; gIdx < factors.length; gIdx++) {
            if (sourcedIndices.has(gIdx)) continue;
            checkCoverage(sIdx, gIdx);
        }
    }

    // Normalize detail on sourced factors so each clearly indicates what it contributed to the roll
    result.forEach((f) => {
        if (f.category === 'item' || f.category === 'passive' || f.category === 'ability') {
            if (f.detail) {
                if (/^ignore\s*low\s*acc\s*(\d+)$/i.test(f.detail)) {
                    f.detail = f.detail.replace(/^ignore\s*low\s*acc\s*(\d+)$/i, 'Ignored $1 Low Acc');
                } else if (/^ignore(?:d)?\s*pain(?:\s*penalty)?$/i.test(f.detail)) {
                    f.detail = 'Ignored Pain Penalty';
                }
                if (/acc\s*\d+s\s*add(?:s)?\s*dmg(?!\s*dice)/i.test(f.detail)) {
                    f.detail = f.detail.replace(/add(?:s)?\s*dmg/i, 'Add Dmg Dice');
                }
            }
        }
    });

    const seen = new Set<string>();
    return result.filter((f, idx) => {
        if (genericIndicesToRemove.has(idx)) return false;
        const key = `${f.category}:${f.title}:${f.detail || ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parseRollLabel(label: string): ParsedRollLabel {
    if (!label) {
        return { cleanLabel: '', coreTags: [], factorTags: [], parsedFactors: [] };
    }

    // Matches trailing [ ... ] tag group at the end of the roll label
    const bracketMatch = label.match(/^(.*?)(?:\s*\[\s*([^\]]+?)\s*\])?$/);
    if (!bracketMatch || !bracketMatch[2]) {
        return { cleanLabel: label.trim(), coreTags: [], factorTags: [], parsedFactors: [] };
    }

    const cleanLabel = (bracketMatch[1] || '').trim();
    const rawTags = bracketMatch[2].trim();

    const tags = rawTags
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean);

    const coreTags: string[] = [];
    const factorTags: string[] = [];

    for (const t of tags) {
        if (/^need\s+\d+\s+succ/i.test(t) || /^crit\s+on\s+\d+\+/i.test(t)) {
            coreTags.push(t);
        } else {
            factorTags.push(t);
        }
    }

    // Expand grouped tags (e.g. "Passive: Passive (Effect 1), Test (Effect 2)") into separate factor tags
    const expandedFactorTags: string[] = [];
    for (const t of factorTags) {
        const prefixMatch = t.match(/^(Passive|Item|Ability):\s*(.+)$/i);
        if (prefixMatch) {
            const prefix = prefixMatch[1];
            const content = prefixMatch[2];
            const subItems = splitTopLevelCommas(content);
            if (subItems.length > 1) {
                for (const sub of subItems) {
                    expandedFactorTags.push(`${prefix}: ${sub}`);
                }
                continue;
            }
        }
        expandedFactorTags.push(t);
    }

    const parsedFactors = consolidateFactors(expandedFactorTags.map(categorizeFactor));

    return {
        cleanLabel,
        coreTags,
        factorTags,
        parsedFactors
    };
}
