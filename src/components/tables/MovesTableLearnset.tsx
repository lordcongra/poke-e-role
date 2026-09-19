import { useState, useMemo } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { MoveDetailModal } from '../modals/moveLookup/MoveDetailModal';

interface MovesTableLearnsetProps {
    learnset: Array<{ Learned: string; Name: string }>;
}

export function MovesTableLearnset({ learnset }: MovesTableLearnsetProps) {
    const [showLearnset, setShowLearnset] = useState(false);
    const [selectedMoveName, setSelectedMoveName] = useState<string | null>(null);

    const characterMoves = useCharacterStore((state) => state.moves);
    const learnedSet = useMemo(
        () => new Set(characterMoves.map((m) => m.name.toLowerCase().trim()).filter(Boolean)),
        [characterMoves]
    );

    if (learnset.length === 0) return null;

    const groupedLearnset = learnset.reduce(
        (accumulator, move) => {
            if (!accumulator[move.Learned]) accumulator[move.Learned] = [];
            accumulator[move.Learned].push(move.Name);
            return accumulator;
        },
        {} as Record<string, string[]>
    );

    const rankOrder = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace', 'Master', 'Champion', 'Other'];
    const sortedRanks = Object.keys(groupedLearnset).sort((a, b) => {
        let indexA = rankOrder.indexOf(a);
        let indexB = rankOrder.indexOf(b);
        if (indexA === -1) indexA = 99;
        if (indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    return (
        <div className="moves-table__learnset-section">
            <button
                type="button"
                onClick={() => setShowLearnset(!showLearnset)}
                className="action-button action-button--dark moves-table__learnset-toggle-btn text-theme-header"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
                <BookOpen size={16} /> {showLearnset ? 'Hide Learnset' : 'View Learnset'}
            </button>
            {showLearnset && (
                <div
                    className="moves-table__learnset-container text-label"
                    style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}
                >
                    {sortedRanks.map((rank) => (
                        <div key={rank} className="moves-table__learnset-rank-group">
                            <div
                                className="moves-table__learnset-rank-title text-title-primary"
                                style={{ color: 'var(--primary)' }}
                            >
                                {rank}
                            </div>
                            <div className="moves-table__learnset-moves-list">
                                {groupedLearnset[rank].map((moveName, index) => {
                                    const isLearned = learnedSet.has(moveName.toLowerCase().trim());
                                    return (
                                        <button
                                            key={`${rank}-${moveName}-${index}`}
                                            type="button"
                                            onClick={() => setSelectedMoveName(moveName)}
                                            className={`moves-table__learnset-pill text-subtext ${
                                                isLearned ? 'moves-table__learnset-pill--learned' : ''
                                            }`}
                                            title={isLearned ? `${moveName} (Learned) - Click to view details` : `Click to view ${moveName} details`}
                                        >
                                            {isLearned && <Check size={11} className="moves-table__learnset-pill-icon" />}
                                            <span>{moveName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedMoveName && (
                <MoveDetailModal
                    moveName={selectedMoveName}
                    onClose={() => setSelectedMoveName(null)}
                />
            )}
        </div>
    );
}

