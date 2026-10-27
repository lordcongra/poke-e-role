import { X } from 'lucide-react';

export interface ConditionItem {
    id: string;
    label: string;
    bg: string;
    text: string;
    onClear?: () => void;
}

interface TrackerConditionsListProps {
    conditions: ConditionItem[];
}

export function TrackerConditionsList({ conditions }: TrackerConditionsListProps) {
    return (
        <div className="tracker-section__conditions-container">
            <span className="tracker-section__conditions-label text-label">Conditions:</span>
            <div className="tracker-section__conditions-list">
                {conditions.length === 0 ? (
                    <span className="tracker-section__conditions-empty text-subtext">None</span>
                ) : (
                    conditions.map((c) => (
                        <span
                            key={c.id}
                            className={`tracker-section__condition-pill ${c.onClear ? 'tracker-section__condition-pill--interactive' : ''}`}
                            style={{ background: c.bg, color: c.text }}
                        >
                            <span>{c.label}</span>
                            {c.onClear && (
                                <button
                                    type="button"
                                    className="tracker-section__condition-clear-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        c.onClear?.();
                                    }}
                                    title="Dismiss Boost"
                                    aria-label="Dismiss Boost"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}
