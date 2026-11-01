import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';

export interface ConditionItem {
    id: string;
    label: string;
    bg: string;
    text: string;
    icon?: React.ReactNode;
    onClear?: () => void;
}

interface TrackerConditionsListProps {
    conditions: ConditionItem[];
    onRefresh?: () => void;
}

export function TrackerConditionsList({ conditions, onRefresh }: TrackerConditionsListProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [isConfirmingRefresh, setIsConfirmingRefresh] = useState(false);
    const hasMultiple = conditions.length > 4;
    const displayedConditions = isExpanded || !hasMultiple ? conditions : conditions.slice(0, 4);

    // Auto-clear confirmation after 4 seconds of inactivity
    useEffect(() => {
        if (!confirmingId) return;
        const timer = setTimeout(() => {
            setConfirmingId(null);
        }, 4000);
        return () => clearTimeout(timer);
    }, [confirmingId]);

    // Auto-clear refresh confirmation after 4 seconds of inactivity
    useEffect(() => {
        if (!isConfirmingRefresh) return;
        const timer = setTimeout(() => {
            setIsConfirmingRefresh(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, [isConfirmingRefresh]);

    return (
        <div
            className={`tracker-section__conditions-container ${
                isExpanded
                    ? 'tracker-section__conditions-container--expanded'
                    : 'tracker-section__conditions-container--collapsed'
            }`}
        >
            <div className="tracker-section__conditions-header">
                <span className="tracker-section__conditions-label text-label">Conditions:</span>
                {onRefresh &&
                    (isConfirmingRefresh ? (
                        <span className="tracker-section__condition-confirm-actions tracker-section__conditions-refresh-confirm">
                            <span className="tracker-section__condition-confirm-text">Refresh?</span>
                            <button
                                type="button"
                                className="tracker-section__condition-confirm-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRefresh();
                                    setIsConfirmingRefresh(false);
                                }}
                                title="Confirm refresh conditions"
                                aria-label="Confirm refresh conditions"
                            >
                                <Check size={11} />
                            </button>
                            <button
                                type="button"
                                className="tracker-section__condition-cancel-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsConfirmingRefresh(false);
                                }}
                                title="Cancel refresh"
                                aria-label="Cancel"
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ) : (
                        <button
                            type="button"
                            className="tracker-section__conditions-refresh-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsConfirmingRefresh(true);
                            }}
                            title="Refresh conditions (requires confirmation)"
                            aria-label="Refresh conditions"
                        >
                            <RotateCw size={11} />
                        </button>
                    ))}
            </div>
            <div
                className={`tracker-section__conditions-list ${
                    isExpanded
                        ? 'tracker-section__conditions-list--expanded'
                        : 'tracker-section__conditions-list--collapsed'
                }`}
            >
                {conditions.length === 0 ? (
                    <span className="tracker-section__conditions-empty text-subtext">None</span>
                ) : (
                    displayedConditions.map((c) => {
                        const isConfirming = confirmingId === c.id;
                        return (
                            <span
                                key={c.id}
                                className={`tracker-section__condition-pill ${
                                    c.onClear ? 'tracker-section__condition-pill--interactive' : ''
                                } ${isConfirming ? 'tracker-section__condition-pill--confirming' : ''}`}
                                style={{ background: c.bg, color: c.text }}
                            >
                                {c.icon && <span className="tracker-section__condition-icon">{c.icon}</span>}
                                <span>{c.label}</span>
                                {c.onClear &&
                                    (isConfirming ? (
                                        <span className="tracker-section__condition-confirm-actions">
                                            <span className="tracker-section__condition-confirm-text">Clear?</span>
                                            <button
                                                type="button"
                                                className="tracker-section__condition-confirm-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    c.onClear?.();
                                                    setConfirmingId(null);
                                                }}
                                                title={`Confirm clear ${c.label}`}
                                                aria-label={`Confirm clear ${c.label}`}
                                            >
                                                <Check size={11} />
                                            </button>
                                            <button
                                                type="button"
                                                className="tracker-section__condition-cancel-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmingId(null);
                                                }}
                                                title="Cancel"
                                                aria-label="Cancel"
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="tracker-section__condition-clear-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmingId(c.id);
                                            }}
                                            title={`Clear ${c.label} (requires confirmation)`}
                                            aria-label={`Clear ${c.label}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    ))}
                            </span>
                        );
                    })
                )}
            </div>
            {hasMultiple && (
                <button
                    type="button"
                    className="tracker-section__conditions-expand-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Collapse conditions' : 'Expand conditions'}
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp size={13} /> Less
                        </>
                    ) : (
                        <>
                            <ChevronDown size={13} /> More
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
