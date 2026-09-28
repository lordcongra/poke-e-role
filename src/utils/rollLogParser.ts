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

export function categorizeFactor(raw: string): ParsedFactor {
    const trimmed = raw.trim();

    // 1. Ability
    if (/^ability:\s*/i.test(trimmed)) {
        const full = trimmed.replace(/^ability:\s*/i, '');
        const match = full.match(/^(.*?)(?:\s*\((.*?)\))?$/);
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
        const match = full.match(/^(.*?)(?:\s*\((.*?)\))?$/);
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
        const match = full.match(/^(.*?)(?:\s*\((.*?)\))?$/);
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
        /powder:\s*/i.test(trimmed) ||
        /min\s+1\s+die\s+vs\s+def/i.test(trimmed)
    ) {
        return {
            raw: trimmed,
            category: 'move',
            title: trimmed.replace(/^move:\s*/i, '')
        };
    }

    // 5. Conditions & Penalties
    if (
        /pain\s+penalty/i.test(trimmed) ||
        /ignored\s+pain/i.test(trimmed) ||
        /low\s+accuracy/i.test(trimmed) ||
        /ignored\s+\d+\s+low\s+acc/i.test(trimmed)
    ) {
        const colonMatch = trimmed.match(/^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|dmg\s+dice))$/i);
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
        const colonMatch = trimmed.match(/^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|dmg\s+dice))$/i);
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

    // 8. Tracker Mod / Net Mod / Rank bonus
    if (/tracker\s*mod/i.test(trimmed) || /net\s+mod/i.test(trimmed) || /rank/i.test(trimmed)) {
        const colonMatch = trimmed.match(/^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|dmg\s+dice))$/i);
        const parenMatch = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
        return {
            raw: trimmed,
            category: 'modifier',
            title: colonMatch ? colonMatch[1].trim() : parenMatch?.[1]?.trim() || trimmed,
            detail: colonMatch ? colonMatch[2].trim() : parenMatch?.[2]?.trim() || undefined
        };
    }

    const colonMatch = trimmed.match(/^(.*?):\s*([+-]?\d+\s*(?:succ(?:esses?)?|dice|dmg\s+dice))$/i);
    return {
        raw: trimmed,
        category: 'modifier',
        title: colonMatch ? colonMatch[1].trim() : trimmed,
        detail: colonMatch ? colonMatch[2].trim() : undefined
    };
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

    const parsedFactors = factorTags.map(categorizeFactor);

    return {
        cleanLabel,
        coreTags,
        factorTags,
        parsedFactors
    };
}
