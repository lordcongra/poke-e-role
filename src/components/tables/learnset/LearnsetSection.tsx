import { useMemo } from 'react';
import { LearnsetPill } from './LearnsetPill';
import type { MoveTypeInfo } from './useLearnsetTypeColors';

interface LearnsetSectionProps {
    learnset: Array<{ Learned: string; Name: string }>;
    learnedSet: Set<string>;
    wishlistSet: Set<string>;
    addingMoves: Set<string>;
    getMoveTypeInfo?: (moveName: string) => MoveTypeInfo;
    onSelectMove: (moveName: string) => void;
    onQuickAdd: (moveName: string, e: React.MouseEvent) => void;
    onToggleWishlist: (moveName: string) => void;
}

const RANK_ORDER = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion', 'Other'];

export function LearnsetSection({
    learnset,
    learnedSet,
    wishlistSet,
    addingMoves,
    getMoveTypeInfo,
    onSelectMove,
    onQuickAdd,
    onToggleWishlist
}: LearnsetSectionProps) {
    const groupedLearnset = useMemo(() => {
        return (learnset || []).reduce(
            (accumulator, move) => {
                if (!accumulator[move.Learned]) accumulator[move.Learned] = [];
                accumulator[move.Learned].push(move.Name);
                return accumulator;
            },
            {} as Record<string, string[]>
        );
    }, [learnset]);

    const sortedRanks = useMemo(() => {
        return Object.keys(groupedLearnset).sort((a, b) => {
            let indexA = RANK_ORDER.indexOf(a);
            let indexB = RANK_ORDER.indexOf(b);
            if (indexA === -1) indexA = 99;
            if (indexB === -1) indexB = 99;
            return indexA - indexB;
        });
    }, [groupedLearnset]);

    return (
        <div className="moves-table__learnset-content">
            {sortedRanks.map((rank) => (
                <div key={rank} className="moves-table__learnset-rank-group">
                    <div
                        className="moves-table__learnset-rank-title text-title-primary"
                        style={{ color: 'var(--primary)' }}
                    >
                        {rank}
                    </div>
                    <div className="moves-table__learnset-moves-list">
                        {groupedLearnset[rank].map((moveName, index) => (
                            <LearnsetPill
                                key={`${rank}-${moveName}-${index}`}
                                moveName={moveName}
                                isLearned={learnedSet.has(moveName.toLowerCase().trim())}
                                isWishlisted={wishlistSet.has(moveName.toLowerCase().trim())}
                                isAdding={addingMoves.has(moveName)}
                                typeInfo={getMoveTypeInfo?.(moveName)}
                                onSelectMove={onSelectMove}
                                onQuickAdd={onQuickAdd}
                                onToggleWishlist={onToggleWishlist}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
