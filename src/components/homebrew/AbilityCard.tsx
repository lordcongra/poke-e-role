import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomAbility } from '../../store/storeTypes';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import { ChevronDown, Tag, Copy, X, AlertTriangle } from 'lucide-react';
import './Homebrew.css';

interface AbilityCardProps {
    ability: CustomAbility;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
    onDuplicate: () => void;
}

export function AbilityCard({ ability, role, canEdit, onRemove, onDuplicate }: AbilityCardProps) {
    const updateCustomAbility = useCharacterStore((state) => state.updateCustomAbility);

    const [localName, setLocalName] = useState(ability.name);
    const [localDescription, setLocalDescription] = useState(ability.description);
    const [localEffect, setLocalEffect] = useState(ability.effect);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(ability.gmOnly || false);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(ability.name !== 'New Ability');

    const [prevAbility, setPrevAbility] = useState(ability);
    if (prevAbility !== ability) {
        setPrevAbility(ability);
        setLocalName(ability.name);
        setLocalDescription(ability.description);
        setLocalEffect(ability.effect);
        setLocalGameMasterOnly(ability.gmOnly || false);
    }

    return (
        <div className="homebrew-card">
            <div className="homebrew-card__header">
                <button
                    type="button"
                    className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ChevronDown size={16} />
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
                    className="homebrew-card__name-input text-label"
                />
                {role === 'GM' && (
                    <label className="homebrew-card__gm-label text-subtext">
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
                    <>
                        <button
                            onClick={() => setShowTagBuilder(true)}
                            className="action-button action-button--dark homebrew-card__btn"
                        >
                            <Tag size={14} /> Tags
                        </button>
                        <button
                            onClick={onDuplicate}
                            className="action-button action-button--dark homebrew-card__btn"
                            title="Duplicate Ability"
                        >
                            <Copy size={14} /> Copy
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="action-button action-button--red homebrew-card__btn"
                        >
                            <X size={14} /> Delete
                        </button>
                    </>
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
                        className="homebrew-card__textarea homebrew-card__textarea--small text-subtext"
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
                        className="homebrew-card__textarea homebrew-card__textarea--small text-subtext"
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
                        <h3
                            className="homebrew-confirm__title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p className="homebrew-confirm__text text-subtext">
                            Are you sure you want to delete this Custom Ability?
                        </p>
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
