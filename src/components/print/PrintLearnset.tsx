import { useMemo } from 'react';
import type { MoveData, PrintConfig } from '../../store/storeTypes';

export const RANK_ORDER = [
    'Starter',
    'Rookie',
    'Standard',
    'Advanced',
    'Expert',
    'Ace',
    'Master',
    'Champion',
    'Other'
];

interface PrintLearnsetProps {
    learnset?: Array<{ Learned: string; Name: string }>;
    moves?: MoveData[];
    config: PrintConfig;
}

export function PrintLearnset({ learnset = [], moves = [], config }: PrintLearnsetProps) {
    if (!config.showLearnset || !learnset || learnset.length === 0) {
        return null;
    }

    const learnedSet = useMemo(() => {
        return new Set(
            (moves || [])
                .map((m) => m.name?.toLowerCase().trim())
                .filter(Boolean)
        );
    }, [moves]);

    const groupedLearnset = useMemo(() => {
        const grouped: Record<string, string[]> = {};
        for (const item of learnset) {
            const name = item.Name?.trim();
            if (!name) continue;
            const rank = item.Learned?.trim() || 'Other';
            if (!grouped[rank]) {
                grouped[rank] = [];
            }
            grouped[rank].push(name);
        }
        return grouped;
    }, [learnset]);

    const sortedRanks = useMemo(() => {
        return Object.keys(groupedLearnset)
            .filter((rank) => groupedLearnset[rank] && groupedLearnset[rank].length > 0)
            .sort((a, b) => {
                let indexA = RANK_ORDER.indexOf(a);
                let indexB = RANK_ORDER.indexOf(b);
                if (indexA === -1) indexA = 99;
                if (indexB === -1) indexB = 99;
                return indexA - indexB;
            });
    }, [groupedLearnset]);

    if (sortedRanks.length === 0) {
        return null;
    }

    return (
        <div className="print-sheet__section">
            <h4 className="print-sheet__section-title">Move Learnset</h4>
            <table className="print-sheet__learnset-table">
                <tbody>
                    {sortedRanks.map((rank) => (
                        <tr key={rank} className="print-sheet__learnset-row">
                            <th scope="row" className="print-sheet__learnset-rank">
                                {rank}
                            </th>
                            <td className="print-sheet__learnset-moves">
                                {groupedLearnset[rank].map((moveName, idx) => {
                                    const isLearned = learnedSet.has(moveName.toLowerCase().trim());
                                    return (
                                        <span
                                            key={`${rank}-${moveName}-${idx}`}
                                            className={`print-sheet__learnset-pill ${
                                                isLearned ? 'print-sheet__learnset-pill--learned' : ''
                                            }`}
                                        >
                                            {isLearned ? <strong>✓ {moveName}</strong> : moveName}
                                        </span>
                                    );
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
