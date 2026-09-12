import { useState } from 'react';
import { FastForward, Plus, Copy, ArrowUpDown, Trash2 } from 'lucide-react';
import type { BattleRoundData } from '../../../types/battleOrganizerTypes';

export interface BattleRoundNavProps {
    rounds: BattleRoundData[];
    activeRoundIndex: number;
    currentRoundNumber?: number;
    onSelectRound: (index: number) => void;
    onAdvanceRound: () => void;
    onAddRound: () => void;
    onDuplicateRound: (index: number) => void;
    onDeleteRound: (index: number) => void;
    onSortInitiative: () => void;
    onUpdateRoundNumber: (roundIndex: number, newNumber: number) => void;
}

export function BattleRoundNav({
    rounds,
    activeRoundIndex,
    currentRoundNumber,
    onSelectRound,
    onAdvanceRound,
    onAddRound,
    onDuplicateRound,
    onDeleteRound,
    onSortInitiative,
    onUpdateRoundNumber
}: BattleRoundNavProps) {
    const [confirmDeleteRoundIdx, setConfirmDeleteRoundIdx] = useState<number | null>(null);

    return (
        <>
            {/* Round Navigation Bar */}
            <div className="bo-round-nav-bar">
                <div className="bo-round-tabs">
                    {rounds.map((r, idx) => (
                        <button
                            key={r.id}
                            type="button"
                            className={`bo-round-tab ${idx === activeRoundIndex ? 'bo-round-tab--active' : ''}`}
                            onClick={() => onSelectRound(idx)}
                        >
                            Round {r.roundNumber || idx + 1}
                        </button>
                    ))}
                </div>

                <div className="bo-round-actions">
                    <button
                        type="button"
                        className="action-button action-button--primary bo-round-btn"
                        onClick={onAdvanceRound}
                        title="End current round, decrement battlefield timers, and advance to next round"
                    >
                        <FastForward size={14} /> End Round & Advance
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark bo-round-btn"
                        onClick={onAddRound}
                        title="Add a new blank round"
                    >
                        <Plus size={14} /> New Round
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark bo-round-btn"
                        onClick={() => onDuplicateRound(activeRoundIndex)}
                        title="Duplicate current round and all its combatants"
                    >
                        <Copy size={14} /> Replicate Round
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark bo-round-btn"
                        onClick={onSortInitiative}
                        title="Sort combatants descending by initiative score"
                    >
                        <ArrowUpDown size={14} /> Sort Init
                    </button>

                    {rounds.length > 1 &&
                        (confirmDeleteRoundIdx === activeRoundIndex ? (
                            <div className="bo-confirm-delete-round-inline">
                                <span className="bo-confirm-delete-text text-subtext">Delete?</span>
                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-round-btn-mini"
                                    onClick={() => setConfirmDeleteRoundIdx(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--red bo-round-btn-mini"
                                    onClick={() => {
                                        onDeleteRound(activeRoundIndex);
                                        setConfirmDeleteRoundIdx(null);
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="action-button action-button--dark bo-round-btn bo-round-btn--danger"
                                onClick={() => setConfirmDeleteRoundIdx(activeRoundIndex)}
                                title="Delete this round"
                            >
                                <Trash2 size={14} />
                            </button>
                        ))}
                </div>
            </div>

            {/* Round Header Pill */}
            <div className="bo-pill-header bo-pill-header--round">
                <span className="bo-pill-header__text text-theme-header">Round</span>
                <input
                    type="number"
                    className="bo-round-number-input text-value-highlight"
                    value={currentRoundNumber || activeRoundIndex + 1}
                    onChange={(e) => {
                        const num = parseInt(e.target.value, 10) || 1;
                        onUpdateRoundNumber(activeRoundIndex, num);
                    }}
                    min={1}
                />
            </div>
        </>
    );
}
