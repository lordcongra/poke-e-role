import { useState } from 'react';

interface MovesTableLearnsetProps {
    learnset: Array<{ Learned: string; Name: string }>;
}

export function MovesTableLearnset({ learnset }: MovesTableLearnsetProps) {
    const [showLearnset, setShowLearnset] = useState(false);

    if (learnset.length === 0) return null;

    const groupedLearnset = learnset.reduce(
        (accumulator, move) => {
            if (!accumulator[move.Learned]) accumulator[move.Learned] = [];
            accumulator[move.Learned].push(move.Name);
            return accumulator;
        },
        {} as Record<string, string[]>
    );

    const rankOrder = [
        'Starter',
        'Beginner',
        'Rookie',
        'Amateur',
        'Standard',
        'Advanced',
        'Expert',
        'Master',
        'Champion',
        'Other'
    ];
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
                className="action-button action-button--dark moves-table__learnset-toggle-btn"
            >
                {showLearnset ? '📖 Hide Learnset' : '📖 View Learnset'}
            </button>
            {showLearnset && (
                <div className="moves-table__learnset-container">
                    {sortedRanks.map((rank) => (
                        <div key={rank} className="moves-table__learnset-rank-group">
                            <div className="moves-table__learnset-rank-title">{rank}</div>
                            <div className="moves-table__learnset-moves-list">
                                {groupedLearnset[rank].map((moveName, index) => (
                                    <span key={index} className="moves-table__learnset-pill">
                                        {moveName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
