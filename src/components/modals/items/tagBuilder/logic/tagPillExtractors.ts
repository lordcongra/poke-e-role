import { KNOWN_ITEMS } from '@/data/constants';

export interface ParsedTagPill {
    tag: string;
    display: string;
    raw: string;
    category?: string;
    isMoveKeyword?: boolean;
}

export function extractTagsFromText(text: string): ParsedTagPill[] {
    if (!text) return [];
    const matches = text.match(/\[[^\]]+\]/g) || [];
    return matches.map((m) => {
        const inner = m.slice(1, -1).trim();
        return {
            tag: m,
            display: inner,
            raw: m,
            isMoveKeyword: false
        };
    });
}

/**
 * Extracts all tags for an item from its tags field, any legacy tags in its description,
 * or canonical tags from KNOWN_ITEMS if neither is present.
 */
export function extractItemTags(
    item: { name?: string; desc?: string; description?: string; tags?: string } | null | undefined
): ParsedTagPill[] {
    if (!item) return [];
    const knownItem = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === (item.name || '').trim().toLowerCase());
    const canonicalTags = knownItem?.tags || '';
    const descText = item.desc ?? item.description ?? '';
    const legacyTags = descText.match(/\[[^\]]+\]/g)?.join(' ') || '';
    const combined = `${item.tags || ''} ${legacyTags}`.trim() || canonicalTags;
    const pills = extractTagsFromText(combined);
    const seen = new Set<string>();
    return pills.filter((p) => {
        if (seen.has(p.tag)) return false;
        seen.add(p.tag);
        return true;
    });
}

export function extractMoveTags(desc: string): ParsedTagPill[] {
    if (!desc) return [];
    const pills: ParsedTagPill[] = [];

    // 1. Extract bracketed tags
    const bracketMatches = [...desc.matchAll(/\[([^\]]+)\]/g)];
    for (const bm of bracketMatches) {
        pills.push({
            tag: bm[0],
            display: bm[1].trim(),
            raw: bm[0],
            isMoveKeyword: false
        });
    }

    // Text with brackets stripped to avoid double-matching inner keywords
    const textWithoutBrackets = desc.replace(/\[[^\]]+\]/g, ' ');

    // 2. Unbracketed move keywords
    const keywordRegexes: {
        pattern: RegExp;
        normalize: (match: RegExpMatchArray) => { tag: string; display: string };
    }[] = [
        {
            pattern: /\b(?:low accuracy|low acc)\s*(\d+)\b/gi,
            normalize: (m) => ({
                tag: `Low Accuracy ${m[1]}`,
                display: `Low Accuracy ${m[1]}`
            })
        },
        {
            pattern: /\b(?:high critical|high crit)\b/gi,
            normalize: () => ({
                tag: 'High Critical',
                display: 'High Critical'
            })
        },
        {
            pattern: /\bnever miss\b/gi,
            normalize: () => ({
                tag: 'Never Miss',
                display: 'Never Miss'
            })
        },
        {
            pattern: /\brecoil\b/gi,
            normalize: () => ({
                tag: 'Recoil',
                display: 'Recoil'
            })
        },
        {
            pattern: /\bsuccessive actions?\b/gi,
            normalize: () => ({
                tag: 'Successive Actions',
                display: 'Successive Actions'
            })
        },
        {
            pattern: /\bset damage\s*(\d+)\b/gi,
            normalize: (m) => ({
                tag: `Set Damage ${m[1]}`,
                display: `Set Damage ${m[1]}`
            })
        },
        {
            pattern: /\bpowder(?:\s+move)?\b/gi,
            normalize: () => ({
                tag: 'Powder',
                display: 'Powder'
            })
        }
    ];

    for (const kr of keywordRegexes) {
        const matches = [...textWithoutBrackets.matchAll(kr.pattern)];
        for (const m of matches) {
            const norm = kr.normalize(m);
            // Avoid duplicate if already in pills
            if (!pills.some((p) => p.display.toLowerCase() === norm.display.toLowerCase())) {
                pills.push({
                    tag: norm.tag,
                    display: norm.display,
                    raw: m[0],
                    isMoveKeyword: true
                });
            }
        }
    }

    return pills;
}

