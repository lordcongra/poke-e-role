/**
 * Synthesizes dynamic bracketed combat tags for Pokemon abilities based on
 * effect and description text analysis.
 */

/**
 * Synthesizes dynamic bracketed tags based on ability effect, description, and existing tags.
 * Automatically appends:
 * - [Unique] for text containing "Unique Ability" or "[Unique]"
 * - [Ignore Stat Reductions] for total attribute/trait reduction immunity (Clear Body, White Smoke, Full Metal Body, Flower Veil)
 * - [Ignore Str Reduction] for Strength reduction immunity (Hyper Cutter)
 * - [Ignore Def Reduction] for Defense reduction immunity (Big Pecks)
 * - [Ignore Acc Reduction] for Accuracy reduction immunity (Keen Eye)
 * 
 * Preserves custom bracketed tags without duplication.
 */
export function synthesizeAbilityTags(
    effectText?: string | null,
    descriptionText?: string | null,
    existingTags?: string | null
): string {
    const resultTags: string[] = [];
    const seenTags = new Set<string>();

    function addTag(tag: string) {
        const trimmed = tag.trim();
        if (!trimmed) return;
        const normalized = trimmed.toLowerCase();
        if (!seenTags.has(normalized)) {
            seenTags.add(normalized);
            resultTags.push(trimmed);
        }
    }

    if (existingTags && existingTags.trim()) {
        const bracketMatches = existingTags.match(/\[[^\]]+\]/g);
        if (bracketMatches && bracketMatches.length > 0) {
            for (const m of bracketMatches) {
                addTag(m);
            }
        } else {
            const trimmed = existingTags.trim();
            addTag(trimmed.startsWith('[') ? trimmed : `[${trimmed}]`);
        }
    }

    const fullText = `${effectText || ''} ${descriptionText || ''} ${existingTags || ''}`;

    // 1. [Unique]
    const hasUniqueTag = seenTags.has('[unique]') || seenTags.has('[unique ability]');
    if (!hasUniqueTag) {
        const isUniqueText =
            /\bunique\s+ability\b/i.test(fullText) ||
            /\[\s*unique(?:\s+ability)?\s*\]/i.test(fullText);
        if (isUniqueText) {
            addTag('[Unique]');
        }
    }

    // 2. [Ignore Stat Reductions] (Total attribute/trait reduction immunity)
    const hasIgnoreAllStatTag =
        seenTags.has('[ignore stat reductions]') ||
        seenTags.has('[ignore stat reduction]') ||
        seenTags.has('[ignore all stat reductions]') ||
        seenTags.has('[ignore all stat reduction]');
    if (!hasIgnoreAllStatTag) {
        const isTotalStatReduction =
            /\b(?:cannot|can't)\s+(?:have\s+(?:their|its)\s+)?(?:attributes(?:\/traits)?|stats?)\s+reduced\b/i.test(fullText) ||
            /\b(?:cannot|can't)\s+(?:increase\s+or\s+)?reduce\s+(?:the\s+)?(?:attributes(?:\/traits)?|stats?)\b/i.test(fullText) ||
            /\bimmune\s+to\s+(?:all\s+)?(?:stat|attribute)\s+reductions?\b/i.test(fullText) ||
            /\[\s*ignore\s+(?:all\s+)?stat\s+reductions?\s*\]/i.test(fullText);
        if (isTotalStatReduction) {
            addTag('[Ignore Stat Reductions]');
        }
    }

    // 3. [Ignore Str Reduction] (e.g. Hyper Cutter)
    const hasIgnoreStrTag =
        seenTags.has('[ignore str reduction]') ||
        seenTags.has('[ignore str reductions]') ||
        seenTags.has('[ignore strength reduction]') ||
        seenTags.has('[ignore strength reductions]');
    if (!hasIgnoreStrTag) {
        const isStrReduction =
            /\b(?:cannot|can't)\s+(?:have\s+(?:their|its)\s+)?strength(?:\s+attribute)?\s+reduced\b/i.test(fullText) ||
            /\b(?:cannot|can't)\s+reduce\s+(?:the\s+)?strength(?:\s+attribute)?\b/i.test(fullText) ||
            /\[\s*ignore\s+str(?:ength)?\s+reductions?\s*\]/i.test(fullText);
        if (isStrReduction) {
            addTag('[Ignore Str Reduction]');
        }
    }

    // 4. [Ignore Def Reduction] (e.g. Big Pecks)
    const hasIgnoreDefTag =
        seenTags.has('[ignore def reduction]') ||
        seenTags.has('[ignore def reductions]') ||
        seenTags.has('[ignore defense reduction]') ||
        seenTags.has('[ignore defense reductions]');
    if (!hasIgnoreDefTag) {
        const isDefReduction =
            /\b(?:cannot|can't)\s+(?:have\s+(?:their|its)\s+)?defense(?:\s+attribute)?\s+reduced\b/i.test(fullText) ||
            /\b(?:cannot|can't)\s+reduce\s+(?:the\s+)?defense(?:\s+attribute)?\b/i.test(fullText) ||
            /\[\s*ignore\s+def(?:ense)?\s+reductions?\s*\]/i.test(fullText);
        if (isDefReduction) {
            addTag('[Ignore Def Reduction]');
        }
    }

    // 5. [Ignore Acc Reduction] (e.g. Keen Eye)
    const hasIgnoreAccTag =
        seenTags.has('[ignore acc reduction]') ||
        seenTags.has('[ignore acc reductions]') ||
        seenTags.has('[ignore accuracy reduction]') ||
        seenTags.has('[ignore accuracy reductions]');
    if (!hasIgnoreAccTag) {
        const isAccReduction =
            /\b(?:cannot|can't)\s+(?:have\s+(?:their|its)\s+)?accuracy(?:\s+attribute|\s+rolls)?\s+reduced\b/i.test(fullText) ||
            /\b(?:cannot|can't)\s+(?:have\s+successes\s+removed\s+from\s+its\s+accuracy\s+rolls)\b/i.test(fullText) ||
            /\b(?:cannot|can't)\s+reduce\s+(?:this\s+pokemon's\s+|the\s+)?accuracy\b/i.test(fullText) ||
            /\[\s*ignore\s+acc(?:uracy)?\s+reductions?\s*\]/i.test(fullText);
        if (isAccReduction) {
            addTag('[Ignore Acc Reduction]');
        }
    }

    return resultTags.join(' ');
}
