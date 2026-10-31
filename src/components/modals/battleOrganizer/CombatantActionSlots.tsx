import React from 'react';
import { RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import type { ActionSlotData, ActionCritType } from '../../../types/battleOrganizerTypes';

export interface CombatantActionSlotsProps {
    actions: ActionSlotData[];
    combatantName?: string;
    disabled?: boolean;
    showCriticalMarks?: boolean;
    onActionTextChange: (actIdx: number, text: string) => void;
    onActionStatusToggle: (actIdx: number, status: 'success' | 'failed') => void;
    onActionCritToggle?: (actIdx: number, critType: ActionCritType) => void;
    onActionClear: (actIdx: number) => void;
}

export const CombatantActionSlots: React.FC<CombatantActionSlotsProps> = ({
    actions,
    combatantName = 'Combatant',
    disabled = false,
    showCriticalMarks = true,
    onActionTextChange,
    onActionStatusToggle,
    onActionCritToggle,
    onActionClear
}) => {
    return (
        <td className="bo-cell bo-cell--actions">
            <div className="bo-actions-grid">
                {(actions || []).map((act, actIdx) => {
                    const isSuccess = act?.status === 'success';
                    const isFailed = act?.status === 'failed';
                    const isCritHit = showCriticalMarks && act?.critType === 'crit_hit';
                    const isCritFail = showCriticalMarks && act?.critType === 'crit_fail';

                    const handleCheckClick = () => {
                        if (disabled) return;
                        if (showCriticalMarks) {
                            if (isCritHit) {
                                onActionCritToggle?.(actIdx, 'none');
                            } else if (isSuccess) {
                                onActionCritToggle?.(actIdx, 'crit_hit');
                            } else {
                                onActionCritToggle?.(actIdx, 'none');
                                onActionStatusToggle(actIdx, 'success');
                            }
                        } else {
                            onActionStatusToggle(actIdx, 'success');
                        }
                    };

                    const handleCrossClick = () => {
                        if (disabled) return;
                        if (showCriticalMarks) {
                            if (isCritFail) {
                                onActionCritToggle?.(actIdx, 'none');
                            } else if (isFailed) {
                                onActionCritToggle?.(actIdx, 'crit_fail');
                            } else {
                                onActionCritToggle?.(actIdx, 'none');
                                onActionStatusToggle(actIdx, 'failed');
                            }
                        } else {
                            onActionStatusToggle(actIdx, 'failed');
                        }
                    };

                    return (
                        <div
                            key={actIdx}
                            className={`bo-action-box ${isCritHit ? 'bo-action-box--crit-hit' : isSuccess ? 'bo-action-box--success' : ''} ${isCritFail ? 'bo-action-box--crit-fail' : isFailed ? 'bo-action-box--failed' : ''}`}
                        >
                            <input
                                type="text"
                                className="bo-action-text-input text-subtext"
                                value={act?.text || ''}
                                onChange={(e) => onActionTextChange(actIdx, e.target.value)}
                                placeholder="Move / Act"
                                title={`Action ${actIdx + 1} Description / Move`}
                                aria-label={`Action ${actIdx + 1} for ${combatantName}`}
                                disabled={disabled}
                            />
                            <div className="bo-action-status-row">
                                <button
                                    type="button"
                                    className={`bo-status-btn bo-status-btn--check ${isCritHit ? 'bo-status-btn--active-crit-hit' : isSuccess ? 'bo-status-btn--active-check' : ''}`}
                                    onClick={handleCheckClick}
                                    title={
                                        isCritHit
                                            ? `Action ${actIdx + 1} Critical Hit (Click to clear)`
                                            : isSuccess
                                              ? `Action ${actIdx + 1} Success (Click to mark Critical Hit)`
                                              : `Mark Action ${actIdx + 1} Used / Success (✓)`
                                    }
                                    aria-label={`Action ${actIdx + 1} success`}
                                    disabled={disabled}
                                >
                                    {isCritHit ? <Sparkles size={10} /> : '✓'}
                                </button>
                                <button
                                    type="button"
                                    className={`bo-status-btn bo-status-btn--cross ${isCritFail ? 'bo-status-btn--active-crit-fail' : isFailed ? 'bo-status-btn--active-cross' : ''}`}
                                    onClick={handleCrossClick}
                                    title={
                                        isCritFail
                                            ? `Action ${actIdx + 1} Critical Failure (Click to clear)`
                                            : isFailed
                                              ? `Action ${actIdx + 1} Failed (Click to mark Critical Failure)`
                                              : `Mark Action ${actIdx + 1} Failed / Clash / Evade / Cancelled (✗)`
                                    }
                                    aria-label={`Action ${actIdx + 1} failed`}
                                    disabled={disabled}
                                >
                                    {isCritFail ? <AlertTriangle size={10} /> : '✗'}
                                </button>
                                <button
                                    type="button"
                                    className="bo-status-btn bo-status-btn--clear"
                                    onClick={() => onActionClear(actIdx)}
                                    title={`Quick Clear: Reset Action ${actIdx + 1} and restore to action counter`}
                                    aria-label={`Action ${actIdx + 1} clear`}
                                    disabled={disabled}
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
