import { useEffect } from 'react';
import { X, Minus, Plus, Trash2, Sparkles } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    getFieldEffectInfo,
    FieldEffectIcon,
    getAllActiveFieldEffects,
    type ActiveFieldEffectItem
} from '../../utils/combat/fieldEffectsData';
import {
    updateBattlefieldEffectRounds,
    deleteBattlefieldEffect,
    syncBattlefieldUpdate
} from '../../utils/combat/battlefieldSyncUtils';
import './InitiativeFieldEffectsModal.css';

export interface InitiativeFieldEffectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isGM?: boolean;
    isStandaloneMode?: boolean;
    highlightedId?: string | null;
}

export function InitiativeFieldEffectsModal({
    isOpen,
    onClose,
    isGM = false,
    isStandaloneMode = false,
    highlightedId
}: InitiativeFieldEffectsModalProps) {
    const activeBattlefield = useCharacterStore((state) => state.activeBattlefield);
    const role = useCharacterStore((state) => state.role);
    const canEdit = isStandaloneMode || isGM || role === 'GM';

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const allActive = getAllActiveFieldEffects(activeBattlefield);

    const handleStepRounds = (item: ActiveFieldEffectItem, delta: number) => {
        if (!activeBattlefield) return;
        if (item.remainingRounds === -1 && delta < 0) return;
        const nextRounds =
            item.remainingRounds === -1 ? (delta > 0 ? 1 : -1) : Math.max(0, item.remainingRounds + delta);
        const updated = updateBattlefieldEffectRounds(activeBattlefield, item, nextRounds);
        syncBattlefieldUpdate(updated);
    };

    const handleDelete = (item: ActiveFieldEffectItem) => {
        if (!activeBattlefield) return;
        const updated = deleteBattlefieldEffect(activeBattlefield, item);
        syncBattlefieldUpdate(updated);
    };

    return (
        <div className="init-field-modal-overlay" onClick={onClose}>
            <div
                className="init-field-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="init-field-modal-title"
            >
                {/* Header */}
                <div className="init-field-modal__header">
                    <div className="init-field-modal__title-wrap">
                        <Sparkles size={16} className="init-field-modal__header-icon" />
                        <h2 id="init-field-modal-title" className="init-field-modal__title text-title-primary">
                            Active Battlefield Effects
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="init-field-modal__close-btn"
                        onClick={onClose}
                        title="Close Modal"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="init-field-modal__body">
                    {allActive.length === 0 ? (
                        <div className="init-field-modal__empty text-subtext">
                            No active battlefield effects currently in play.
                        </div>
                    ) : (
                        <div className="init-field-modal__list">
                            {allActive.map((item) => {
                                const info = getFieldEffectInfo(item.name, item.category);
                                const isHighlighted = highlightedId === item.id;
                                const color = info.color;

                                return (
                                    <div
                                        key={item.id}
                                        className={`init-field-card ${isHighlighted ? 'is-highlighted' : ''}`}
                                        style={{
                                            borderColor: color,
                                            background: `color-mix(in srgb, ${color} 8%, var(--panel-bg))`
                                        }}
                                    >
                                        <div className="init-field-card__header">
                                            <div className="init-field-card__top-row">
                                                <div className="init-field-card__identity">
                                                    <span className="init-field-card__icon" style={{ color }}>
                                                        <FieldEffectIcon icon={info.icon} size={15} />
                                                    </span>
                                                    <span
                                                        className="init-field-card__name text-title-primary"
                                                        title={info.name}
                                                    >
                                                        {item.subLabel ? `${item.subLabel} ` : ''}
                                                        {info.name}
                                                    </span>
                                                </div>
                                                <span
                                                    className="init-field-card__badge"
                                                    style={{ backgroundColor: color, color: '#ffffff' }}
                                                >
                                                    {info.badge}
                                                </span>
                                            </div>

                                            {/* Stepper Controls */}
                                            <div className="init-field-card__controls-row">
                                                {canEdit ? (
                                                    <div className="init-field-card__controls">
                                                        <div className="init-field-stepper">
                                                            <button
                                                                type="button"
                                                                className="init-field-stepper__btn"
                                                                onClick={() => handleStepRounds(item, -1)}
                                                                disabled={
                                                                    item.remainingRounds === -1 ||
                                                                    item.remainingRounds <= 0
                                                                }
                                                                title={
                                                                    item.remainingRounds === -1
                                                                        ? 'Whole Scene effect (Cannot decrease below Scene)'
                                                                        : 'Decrease Remaining Rounds'
                                                                }
                                                                aria-label="Decrease Rounds"
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span className="init-field-stepper__value text-value-highlight">
                                                                {item.remainingRounds === -1 ? (
                                                                    'Scene'
                                                                ) : (
                                                                    <>
                                                                        {item.remainingRounds}{' '}
                                                                        <span className="init-field-stepper__unit">
                                                                            {item.remainingRounds === 1
                                                                                ? 'Rnd'
                                                                                : 'Rnds'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="init-field-stepper__btn"
                                                                onClick={() => handleStepRounds(item, 1)}
                                                                title="Increase Remaining Rounds"
                                                                aria-label="Increase Rounds"
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="init-field-card__delete-btn"
                                                            onClick={() => handleDelete(item)}
                                                            title="Remove Effect from Battlefield"
                                                            aria-label="Delete Effect"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="init-field-card__readonly-rounds text-value-highlight">
                                                        {item.remainingRounds === -1 ? (
                                                            'Scene'
                                                        ) : (
                                                            <>
                                                                {item.remainingRounds}{' '}
                                                                <span className="init-field-stepper__unit">
                                                                    {item.remainingRounds === 1 ? 'Rnd' : 'Rnds'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Effect Rules */}
                                        <ul className="init-field-card__effects">
                                            {info.effects.map((eff, effIdx) => (
                                                <li key={effIdx} className="init-field-card__effect-item text-subtext">
                                                    {eff}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="init-field-modal__footer">
                    {canEdit && (
                        <span className="init-field-modal__hint text-subtext">
                            Adjustments sync live to all connected players.
                        </span>
                    )}
                    <button
                        type="button"
                        className="action-button action-button--dark init-field-modal__done-btn"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
