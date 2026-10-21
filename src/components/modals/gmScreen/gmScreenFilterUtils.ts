import type { GmCheatItem } from '../../../data/gmScreenData';

/**
 * Filters and ranks GM cheat sheet items based on active tab and search query with weighted relevance scoring.
 */
export function filterAndScoreCheatItems(items: GmCheatItem[], searchQuery: string, activeTab: string): GmCheatItem[] {
    const rawQuery = searchQuery.toLowerCase().trim();
    const tabFiltered = items.filter((item) => activeTab === 'all' || item.category === activeTab);

    if (!rawQuery) {
        return tabFiltered;
    }

    const queryTerms = rawQuery.split(/\s+/).filter(Boolean);

    const scoredItems = tabFiltered
        .map((item, originalIndex) => {
            const titleLower = item.title.toLowerCase();
            const summaryLower = item.summary.toLowerCase();
            const badgeLower = item.badge?.toLowerCase() || '';
            const categoryLower = item.category.toLowerCase();
            const categoryLabelLower = item.categoryLabel.toLowerCase();
            const keywordsLower = item.keywords.map((k) => k.toLowerCase());
            const discordLower = item.discordMarkdown.toLowerCase();

            let score = 0;

            // 1. Title matches (highest priority)
            if (titleLower === rawQuery) {
                score += 2000;
            } else if (titleLower.startsWith(rawQuery)) {
                score += 1000;
            } else if (new RegExp(`\\b${rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(titleLower)) {
                score += 700;
            } else if (titleLower.includes(rawQuery)) {
                score += 400;
            }

            // 2. Badge matches
            if (badgeLower === rawQuery) {
                score += 500;
            } else if (badgeLower.includes(rawQuery)) {
                score += 250;
            }

            // 3. Category matches
            if (categoryLower === rawQuery || categoryLabelLower === rawQuery) {
                score += 400;
            } else if (categoryLower.includes(rawQuery) || categoryLabelLower.includes(rawQuery)) {
                score += 200;
            }

            // 4. Keyword matches
            if (keywordsLower.includes(rawQuery)) {
                score += 350;
            } else if (keywordsLower.some((k) => k.includes(rawQuery))) {
                score += 150;
            }

            // 5. Summary matches
            if (summaryLower.includes(rawQuery)) {
                score += 80;
            }

            // 6. Discord text matches
            if (discordLower.includes(rawQuery)) {
                score += 20;
            }

            // 7. Multi-word individual term scoring
            if (queryTerms.length > 1) {
                let termHits = 0;
                for (const term of queryTerms) {
                    let termHit = false;
                    if (titleLower.includes(term)) {
                        score += 150;
                        termHit = true;
                    }
                    if (badgeLower.includes(term) || categoryLower.includes(term)) {
                        score += 80;
                        termHit = true;
                    }
                    if (keywordsLower.some((k) => k.includes(term))) {
                        score += 60;
                        termHit = true;
                    }
                    if (summaryLower.includes(term)) {
                        score += 30;
                        termHit = true;
                    }
                    if (discordLower.includes(term)) {
                        score += 10;
                        termHit = true;
                    }
                    if (termHit) termHits++;
                }
                if (termHits === queryTerms.length) {
                    score += 300;
                }
            }

            return { item, score, originalIndex };
        })
        .filter(({ score }) => score > 0);

    // Sort by score descending; preserve original array index on ties
    scoredItems.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.originalIndex - b.originalIndex;
    });

    return scoredItems.map(({ item }) => item);
}

/**
 * Calculates item counts per tab category.
 */
export function getCheatItemTabCounts(items: GmCheatItem[]): Record<string, number> {
    const counts: Record<string, number> = {
        all: items.length,
        rules: 0,
        trainer: 0,
        maneuvers: 0,
        environment: 0,
        progression: 0,
        lookup: 0,
        homebrew: 0
    };
    items.forEach((item) => {
        if (counts[item.category] !== undefined) {
            counts[item.category]++;
        }
    });
    return counts;
}
