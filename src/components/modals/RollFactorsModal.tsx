import React, { useEffect } from 'react';
import {
    X,
    Layers,
    Zap,
    Package,
    Award,
    Swords,
    AlertTriangle,
    Activity,
    Crosshair,
    Sliders,
    Target,
    Flame
} from 'lucide-react';
import { categorizeFactor, type ParsedFactor } from '../../utils/rollLogParser';
import './RollFactorsModal.css';

export interface RollFactorsModalProps {
    title: string;
    characterName?: string;
    coreTags?: string[];
    factors: string[];
    result?: string;
    onClose: () => void;
}

export const RollFactorsModal: React.FC<RollFactorsModalProps> = ({
    title,
    characterName,
    coreTags = [],
    factors = [],
    result,
    onClose
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const parsedFactors: ParsedFactor[] = factors.map(categorizeFactor);

    const getCategoryBadge = (category: ParsedFactor['category']) => {
        switch (category) {
            case 'ability':
                return { label: 'Ability', icon: <Zap size={13} />, className: 'factor-badge--ability' };
            case 'item':
                return { label: 'Item', icon: <Package size={13} />, className: 'factor-badge--item' };
            case 'passive':
                return { label: 'Passive', icon: <Award size={13} />, className: 'factor-badge--passive' };
            case 'move':
                return { label: 'Move Mechanic', icon: <Swords size={13} />, className: 'factor-badge--move' };
            case 'condition':
                return { label: 'Condition', icon: <AlertTriangle size={13} />, className: 'factor-badge--condition' };
            case 'status':
                return { label: 'Status', icon: <Activity size={13} />, className: 'factor-badge--status' };
            case 'tactical':
                return { label: 'Tactical', icon: <Crosshair size={13} />, className: 'factor-badge--tactical' };
            case 'modifier':
            default:
                return { label: 'Modifier', icon: <Sliders size={13} />, className: 'factor-badge--modifier' };
        }
    };

    const cleanActionName = characterName
        ? title.replace(new RegExp(`^${characterName}\\s+rolled\\s+`, 'i'), 'Rolled ')
        : title;

    return (
        <div
            className="roll-factors-modal__overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roll-factors-modal-title"
        >
            <div className="roll-factors-modal__container">
                {/* Header */}
                <div className="roll-factors-modal__header">
                    <div className="roll-factors-modal__title-group">
                        <div className="roll-factors-modal__title-icon">
                            <Layers size={18} />
                        </div>
                        <div className="roll-factors-modal__header-text">
                            <h3 id="roll-factors-modal-title" className="roll-factors-modal__title">
                                Roll Factors & Modifiers
                            </h3>
                            <div className="roll-factors-modal__subtitle">
                                {characterName && (
                                    <span className="roll-factors-modal__char-badge">{characterName}</span>
                                )}
                                <span className="roll-factors-modal__action-name" title={title}>
                                    {cleanActionName}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="roll-factors-modal__close-btn"
                        title="Close Factors Modal"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="roll-factors-modal__body">
                    {/* Core Requirements Bar */}
                    {coreTags.length > 0 && (
                        <div className="roll-factors-modal__core-bar">
                            <span className="roll-factors-modal__section-heading">
                                <Target size={14} /> Core Requirements
                            </span>
                            <div className="roll-factors-modal__core-tags">
                                {coreTags.map((tag, idx) => {
                                    const isCrit = /^crit\s+on/i.test(tag);
                                    return (
                                        <div
                                            key={idx}
                                            className={`roll-factors-modal__core-chip ${isCrit ? 'roll-factors-modal__core-chip--crit' : ''}`}
                                        >
                                            {isCrit ? <Flame size={13} /> : <Target size={13} />}
                                            <span>{tag}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Result Math */}
                    {result && (
                        <div className="roll-factors-modal__result-box">
                            <span className="roll-factors-modal__section-heading">Dice Outcome</span>
                            <div className="roll-factors-modal__result-text">{result}</div>
                        </div>
                    )}

                    {/* Factors List */}
                    <div className="roll-factors-modal__factors-section">
                        <span className="roll-factors-modal__section-heading">
                            Contributing Factors ({factors.length})
                        </span>

                        {factors.length === 0 ? (
                            <div className="roll-factors-modal__empty">
                                No additional items, abilities, or passives modified this roll.
                            </div>
                        ) : (
                            <div className="roll-factors-modal__list">
                                {parsedFactors.map((factor, idx) => {
                                    const badge = getCategoryBadge(factor.category);
                                    return (
                                        <div key={idx} className="roll-factors-modal__card">
                                            <div className="roll-factors-modal__card-header">
                                                <span className={`roll-factors-modal__badge ${badge.className}`}>
                                                    {badge.icon}
                                                    <span>{badge.label}</span>
                                                </span>
                                                {factor.detail && (
                                                    <span className="roll-factors-modal__detail-tag">
                                                        {factor.detail}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="roll-factors-modal__card-title">{factor.title}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="roll-factors-modal__footer">
                    <button type="button" onClick={onClose} className="roll-factors-modal__btn-done">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
