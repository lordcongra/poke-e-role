import { useState } from 'react';
import { Edit2, Copy, Trash2, Clock, AlertTriangle, EyeOff } from 'lucide-react';
import type { CustomFieldEffect } from '../../store/storeTypes';
import { HomebrewFieldEffectModal, renderCustomFieldIcon } from './HomebrewFieldEffectModal';
import { parseTagPills } from './homebrewFieldEffectUtils';
import './HomebrewFieldEffect.css';

interface HomebrewFieldEffectCardProps {
    effect: CustomFieldEffect;
    role?: string;
    canEdit: boolean;
    onRemove: () => void;
    onDuplicate: () => void;
}

export function HomebrewFieldEffectCard({
    effect,
    canEdit,
    onRemove,
    onDuplicate
}: HomebrewFieldEffectCardProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const tagList = parseTagPills(effect.tags || '');

    const categoryLabel =
        effect.category === 'weather'
            ? 'Weather'
            : effect.category === 'terrain'
              ? 'Terrain'
              : 'Field Effect';

    const categoryClass =
        effect.category === 'weather'
            ? 'hb-category-pill--weather'
            : effect.category === 'terrain'
              ? 'hb-category-pill--terrain'
              : 'hb-category-pill--field';

    return (
        <div className="hb-fe-card">
            {/* Header: Icon, Name, Category, Default Rounds, Actions */}
            <div className="hb-fe-card__header">
                <div className="hb-fe-card__badge-row">
                    <div
                        className="hb-fe-card__icon-box"
                        style={{ backgroundColor: effect.color || '#3B82F6' }}
                    >
                        {renderCustomFieldIcon(effect.icon, 16)}
                    </div>

                    <div className="hb-fe-card__title-box">
                        <span className="hb-fe-card__name text-label" title={effect.name}>
                            {effect.name || 'Unnamed Field Effect'}
                        </span>
                        <div className="hb-fe-card__meta">
                            <span className={`hb-category-pill ${categoryClass}`}>
                                {categoryLabel}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={11} /> {effect.defaultRounds ?? 4} rds
                            </span>
                            {effect.gmOnly && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        color: 'var(--semantic-danger)'
                                    }}
                                    title="GM Only Effect"
                                >
                                    <EyeOff size={11} /> GM Only
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="hb-fe-card__actions">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(true)}
                            className="action-button action-button--secondary hb-fe-card__btn"
                            title="Edit Effect & Tags"
                        >
                            <Edit2 size={13} /> Edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDuplicate}
                        className="action-button action-button--dark hb-fe-card__btn"
                        title="Duplicate Effect"
                    >
                        <Copy size={13} /> Copy
                    </button>
                    {canEdit && (
                        <>
                            {isConfirmingDelete ? (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={onRemove}
                                        className="action-button action-button--red hb-fe-card__btn"
                                        title="Confirm Delete"
                                    >
                                        <AlertTriangle size={13} /> Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmingDelete(false)}
                                        className="action-button action-button--dark hb-fe-card__btn"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmingDelete(true)}
                                    className="action-button action-button--dark hb-fe-card__btn"
                                    title="Delete Effect"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Combat Tag Pills */}
            {tagList.length > 0 && (
                <div className="hb-fe-card__tags-row">
                    {tagList.map((tagStr) => (
                        <span key={tagStr} className="hb-fe-tag-pill">
                            {tagStr}
                        </span>
                    ))}
                </div>
            )}

            {/* Description Text */}
            {effect.description && (
                <div className="hb-fe-card__desc text-subtext">{effect.description}</div>
            )}

            {/* Smart Builder Modal */}
            {isEditModalOpen && (
                <HomebrewFieldEffectModal
                    effect={effect}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}
