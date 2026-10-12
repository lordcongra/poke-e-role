import { useState } from 'react';
import { X, Sparkles, Check, FastForward } from 'lucide-react';
import type { RoundEndTrigger } from './roundEndTriggerUtils';
import './RoundEndTriggerModal.css';

interface RoundEndTriggerModalProps {
    isOpen: boolean;
    triggers: RoundEndTrigger[];
    onConfirm: (selectedTriggers: RoundEndTrigger[]) => void;
    onSkip: () => void;
    onClose: () => void;
}

export function RoundEndTriggerModal({ isOpen, triggers, onConfirm, onSkip, onClose }: RoundEndTriggerModalProps) {
    const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        triggers.forEach((t) => {
            initial[t.id] = t.checked;
        });
        return initial;
    });

    if (!isOpen || triggers.length === 0) return null;

    const handleToggle = (id: string) => {
        setSelectedMap((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleConfirmSelected = () => {
        const confirmed = triggers.filter((t) => selectedMap[t.id]);
        onConfirm(confirmed);
    };

    const countSelected = triggers.filter((t) => selectedMap[t.id]).length;

    return (
        <div className="round-trigger-modal__overlay" onClick={onClose}>
            <div
                className="round-trigger-modal__content"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="round-trigger-modal-title"
            >
                <div className="round-trigger-modal__header">
                    <h3 id="round-trigger-modal-title" className="round-trigger-modal__title">
                        <Sparkles size={16} color="var(--primary)" />
                        Round End Triggers
                    </h3>
                    <button
                        type="button"
                        className="round-trigger-modal__close-btn"
                        onClick={onClose}
                        title="Cancel"
                        aria-label="Cancel"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="round-trigger-modal__body">
                    <p className="round-trigger-modal__hint">
                        The following abilities, items, or active battlefield effects trigger at the end of the round.
                        Select which effects to apply before resetting the round:
                    </p>

                    <div className="round-trigger-modal__list">
                        {triggers.map((trigger) => {
                            const isChecked = selectedMap[trigger.id] ?? false;
                            return (
                                <label key={trigger.id} className="round-trigger-modal__item">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggle(trigger.id)}
                                        className="round-trigger-modal__checkbox"
                                    />
                                    <div className="round-trigger-modal__item-info">
                                        <span className="round-trigger-modal__prompt">{trigger.promptText}</span>
                                        <span className="round-trigger-modal__source">Source: {trigger.source}</span>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="round-trigger-modal__footer">
                    <button
                        type="button"
                        className="action-button action-button--dark round-trigger-modal__btn"
                        onClick={onSkip}
                        title="Reset round without applying any end-of-round triggers"
                    >
                        <FastForward size={14} /> Skip All & Reset
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--theme round-trigger-modal__btn"
                        onClick={handleConfirmSelected}
                        title="Apply checked effects and reset round"
                    >
                        <Check size={14} />
                        {countSelected > 0 ? `Apply (${countSelected}) & Reset` : 'Reset Round'}
                    </button>
                </div>
            </div>
        </div>
    );
}
