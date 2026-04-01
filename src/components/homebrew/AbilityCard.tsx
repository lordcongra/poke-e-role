import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomAbility } from '../../store/storeTypes';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import './Homebrew.css';

interface AbilityCardProps {
    ability: CustomAbility;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
}

export function AbilityCard({ ability, role, canEdit, onRemove }: AbilityCardProps) {
    const updateCustomAbility = useCharacterStore((state) => state.updateCustomAbility);

    const [localName, setLocalName] = useState(ability.name);
    const [localDescription, setLocalDescription] = useState(ability.description);
    const [localEffect, setLocalEffect] = useState(ability.effect);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(ability.gmOnly || false);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(ability.name !== 'New Ability');

    useEffect(() => {
        setLocalName(ability.name);
        setLocalDescription(ability.description);
        setLocalEffect(ability.effect);
        setLocalGameMasterOnly(ability.gmOnly || false);
    }, [ability]);

    return (
        <div className="homebrew-card">
            <div className="homebrew-card__header">
                <button
                    type="button"
                    className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    ▼
                </button>
                <input
                    type="text"
                    value={localName}
                    onChange={(event) => canEdit && setLocalName(event.target.value)}
                    onBlur={() =>
                        canEdit && localName !== ability.name && updateCustomAbility(ability.id, 'name', localName)
                    }
                    placeholder="Ability Name"
                    disabled={!canEdit}
                    className="homebrew-card__name-input"
                />
                {role === 'GM' && (
                    <label className="homebrew-card__gm-label">
                        <input
                            type="checkbox"
                            checked={localGameMasterOnly}
                            onChange={(event) => {
                                setLocalGameMasterOnly(event.target.checked);
                                updateCustomAbility(ability.id, 'gmOnly', event.target.checked);
                            }}
                        />
                        GM Only
                    </label>
                )}
                {canEdit && (
                    <button
                        onClick={() => setShowTagBuilder(true)}
                        className="action-button action-button--dark homebrew-card__btn"
                    >
                        🏷️ Tags
                    </button>
                )}
                {canEdit && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="action-button action-button--red homebrew-card__btn"
                    >
                        Delete
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <textarea
                        value={localDescription}
                        onChange={(event) => canEdit && setLocalDescription(event.target.value)}
                        onBlur={() =>
                            canEdit &&
                            localDescription !== ability.description &&
                            updateCustomAbility(ability.id, 'description', localDescription)
                        }
                        placeholder="Flavor Text / Description"
                        disabled={!canEdit}
                        className="homebrew-card__textarea homebrew-card__textarea--small"
                    />
                    <textarea
                        value={localEffect}
                        onChange={(event) => canEdit && setLocalEffect(event.target.value)}
                        onBlur={() =>
                            canEdit &&
                            localEffect !== ability.effect &&
                            updateCustomAbility(ability.id, 'effect', localEffect)
                        }
                        placeholder="Mechanical Effect (e.g. [Str +2])"
                        disabled={!canEdit}
                        className="homebrew-card__textarea homebrew-card__textarea--small"
                    />
                </>
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={ability.id}
                    targetType="homebrew_ability"
                    onClose={() => setShowTagBuilder(false)}
                />
            )}

            {showDeleteConfirm && (
                <div className="homebrew-confirm__overlay">
                    <div className="homebrew-confirm__content">
                        <h3 className="homebrew-confirm__title">⚠️ Confirm Deletion</h3>
                        <p className="homebrew-confirm__text">Are you sure you want to delete this Custom Ability?</p>
                        <div className="homebrew-confirm__actions">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="action-button action-button--dark homebrew-confirm__btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onRemove}
                                className="action-button action-button--red homebrew-confirm__btn"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
