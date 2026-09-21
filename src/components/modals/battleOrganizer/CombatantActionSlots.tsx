import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { ActionSlotData } from '../../../types/battleOrganizerTypes';

export interface CombatantActionSlotsProps {
    actions: ActionSlotData[];
    combatantName?: string;
    onActionTextChange: (actIdx: number, text: string) => void;
    onActionStatusToggle: (actIdx: number, status: 'success' | 'failed') => void;
    onActionClear: (actIdx: number) => void;
}

export const CombatantActionSlots: React.FC<CombatantActionSlotsProps> = ({
    actions,
    combatantName = 'Combatant',
    onActionTextChange,
    onActionStatusToggle,
    onActionClear
}) => {
    return (
        <td className="bo-cell bo-cell--actions">
            <div className="bo-actions-grid">
                {actions.map((act, actIdx) => {
                    const isSuccess = act.status === 'success';
                    const isFailed = act.status === 'failed';

                    return (
                        <div
                            key={actIdx}
                            className={`bo-action-box ${isSuccess ? 'bo-action-box--success' : ''} ${isFailed ? 'bo-action-box--failed' : ''}`}
                        >
                            <input
                                type="text"
                                className="bo-action-text-input text-subtext"
                                value={act.text}
                                onChange={(e) => onActionTextChange(actIdx, e.target.value)}
                                placeholder="Move / Act"
                                title={`Action ${actIdx + 1} Description / Move`}
                                aria-label={`Action ${actIdx + 1} for ${combatantName}`}
                            />
                            <div className="bo-action-status-row">
                                <button
                                    type="button"
                                    className={`bo-status-btn bo-status-btn--check ${isSuccess ? 'bo-status-btn--active-check' : ''}`}
                                    onClick={() => onActionStatusToggle(actIdx, 'success')}
                                    title={`Mark Action ${actIdx + 1} Used / Success (✓)`}
                                    aria-label={`Action ${actIdx + 1} success`}
                                >
                                    ✓
                                </button>
                                <button
                                    type="button"
                                    className={`bo-status-btn bo-status-btn--cross ${isFailed ? 'bo-status-btn--active-cross' : ''}`}
                                    onClick={() => onActionStatusToggle(actIdx, 'failed')}
                                    title={`Mark Action ${actIdx + 1} Failed / Clash / Evade / Cancelled (✗)`}
                                    aria-label={`Action ${actIdx + 1} failed`}
                                >
                                    ✗
                                </button>
                                <button
                                    type="button"
                                    className="bo-status-btn bo-status-btn--clear"
                                    onClick={() => onActionClear(actIdx)}
                                    title={`Quick Clear: Reset Action ${actIdx + 1} and restore to action counter`}
                                    aria-label={`Action ${actIdx + 1} clear`}
                                >
                                    <RotateCcw size={10} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </td>
    );
};
