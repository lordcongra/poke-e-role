export const LEARN_RANKS = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master'];
export const RANK_ORDER = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion', 'Other'];

export function groupMovesByRank(moves: [string, string][]): { rank: string; moves: string[] }[] {
    const grouped: Record<string, string[]> = {};
    moves.forEach(([name, rank]) => {
        const r = rank || 'Other';
        if (!grouped[r]) grouped[r] = [];
        grouped[r].push(name);
    });

    const sortedRanks = Object.keys(grouped).sort((a, b) => {
        let indexA = RANK_ORDER.indexOf(a);
        let indexB = RANK_ORDER.indexOf(b);
        if (indexA === -1) indexA = 99;
        if (indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    return sortedRanks.map((rank) => ({
        rank,
        moves: grouped[rank]
    }));
}
