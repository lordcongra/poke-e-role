import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomStatus } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import './Homebrew.css';
import './HomebrewStatusCard.css';

interface HomebrewStatusCardProps {
    status: CustomStatus;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
    onDuplicate: () => void;
}

export function HomebrewStatusCard({ status, role, canEdit, onRemove, onDuplicate }: HomebrewStatusCardProps) {
    const updateCustomStatus = useCharacterStore((state) => state.updateCustomStatus);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const skills = useCharacterStore((state) => state.skills);

    const [localName, setLocalName] = useState(status.name);
    const [localShorthand, setLocalShorthand] = useState(status.shorthand || '');
    const [localDescription, setLocalDescription] = useState(status.description);
    const [localEffects, setLocalEffects] = useState(status.effects);
    const [localColor, setLocalColor] = useState(status.color);
    const [localTextColor, setLocalTextColor] = useState(status.textColor);

    const [localRecoveryAttr, setLocalRecoveryAttr] = useState(status.recoveryAttr || 'none');
    const [localRecoverySkill, setLocalRecoverySkill] = useState(status.recoverySkill || 'none');

    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(status.gmOnly || false);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(status.name !== 'New Status');

    useEffect(() => {
        setLocalName(status.name);
        setLocalShorthand(status.shorthand || '');
        setLocalDescription(status.description);
        setLocalEffects(status.effects);
        setLocalColor(status.color);
        setLocalTextColor(status.textColor);
        setLocalRecoveryAttr(status.recoveryAttr || 'none');
        setLocalRecoverySkill(status.recoverySkill || 'none');
        setLocalGameMasterOnly(status.gmOnly || false);
    }, [status]);

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
                        canEdit && localName !== status.name && updateCustomStatus(status.id, 'name', localName)
                    }
                    placeholder="Status Name"
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
                                updateCustomStatus(status.id, 'gmOnly', event.target.checked);
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
                            🏷️ Tags
                        </button>
                        <button
                            onClick={onDuplicate}
                            className="action-button action-button--dark homebrew-card__btn"
                            title="Duplicate Status"
                        >
                            📋 Copy
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="action-button action-button--red homebrew-card__btn"
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div className="homebrew-status-card__row">
                        <input
                            type="text"
                            value={localShorthand}
                            onChange={(event) => canEdit && setLocalShorthand(event.target.value)}
                            onBlur={() =>
                                canEdit &&
                                localShorthand !== status.shorthand &&
                                updateCustomStatus(status.id, 'shorthand', localShorthand)
                            }
                            placeholder="Shorthand Label (Optional)"
                            disabled={!canEdit}
                            className="homebrew-card__name-input homebrew-status-card__shorthand-input"
                        />

                        <div className="homebrew-status-card__color-group">
                            <span className="homebrew-status-card__color-label">BG:</span>
                            <input
                                type="color"
                                value={localColor}
                                onChange={(event) => canEdit && setLocalColor(event.target.value)}
                                onBlur={() =>
                                    canEdit &&
                                    localColor !== status.color &&
                                    updateCustomStatus(status.id, 'color', localColor)
                                }
                                disabled={!canEdit}
                                className="homebrew-status-card__color-picker"
                            />
                        </div>

                        <div className="homebrew-status-card__color-group">
                            <span className="homebrew-status-card__color-label">Text:</span>
                            <input
                                type="color"
                                value={localTextColor}
                                onChange={(event) => canEdit && setLocalTextColor(event.target.value)}
                                onBlur={() =>
                                    canEdit &&
                                    localTextColor !== status.textColor &&
                                    updateCustomStatus(status.id, 'textColor', localTextColor)
                                }
                                disabled={!canEdit}
                                className="homebrew-status-card__color-picker"
                            />
                        </div>
                    </div>

                    <div className="homebrew-status-card__row homebrew-status-card__row--recovery">
                        <span className="homebrew-status-card__color-label">Recovery Roll:</span>
                        <select
                            value={localRecoveryAttr}
                            onChange={(event) => canEdit && setLocalRecoveryAttr(event.target.value)}
                            onBlur={() =>
                                canEdit &&
                                localRecoveryAttr !== status.recoveryAttr &&
                                updateCustomStatus(status.id, 'recoveryAttr', localRecoveryAttr)
                            }
                            disabled={!canEdit}
                            className="homebrew-status-card__select"
                        >
                            <option value="none">-- None --</option>
                            {Object.values(CombatStat).map((stat) => (
                                <option key={stat} value={stat}>
                                    {stat.toUpperCase()}
                                </option>
                            ))}
                            {Object.values(SocialStat).map((stat) => (
                                <option key={stat} value={stat}>
                                    {stat.toUpperCase()}
                                </option>
                            ))}
                            <option value="will">WILL</option>
                        </select>
                        <span>+</span>
                        <select
                            value={localRecoverySkill}
                            onChange={(event) => canEdit && setLocalRecoverySkill(event.target.value)}
                            onBlur={() =>
                                canEdit &&
                                localRecoverySkill !== status.recoverySkill &&
                                updateCustomStatus(status.id, 'recoverySkill', localRecoverySkill)
                            }
                            disabled={!canEdit}
                            className="homebrew-status-card__select"
                        >
                            <option value="none">-- None --</option>
                            {Object.values(Skill).map((skillName) => (
                                <option key={skillName} value={skillName}>
                                    {skills[skillName]?.customName ||
                                        skillName.charAt(0).toUpperCase() + skillName.slice(1)}
                                </option>
                            ))}
                            {extraCategories.length > 0 &&
                                extraCategories.map((category) => (
                                    <optgroup key={category.id} label={category.name || 'EXTRA'}>
                                        {category.skills.map((extraSkill) => (
                                            <option key={extraSkill.id} value={extraSkill.id}>
                                                {extraSkill.name || 'Unnamed'}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                        </select>
                    </div>

                    <textarea
                        value={localDescription}
                        onChange={(event) => canEdit && setLocalDescription(event.target.value)}
                        onBlur={() =>
                            canEdit &&
                            localDescription !== status.description &&
                            updateCustomStatus(status.id, 'description', localDescription)
                        }
                        placeholder="Flavor Text / Description"
                        disabled={!canEdit}
                        className="homebrew-card__textarea homebrew-card__textarea--small"
                    />
                    <textarea
                        value={localEffects}
                        onChange={(event) => canEdit && setLocalEffects(event.target.value)}
                        onBlur={() =>
                            canEdit &&
                            localEffects !== status.effects &&
                            updateCustomStatus(status.id, 'effects', localEffects)
                        }
                        placeholder="Mechanical Tags & Setup"
                        disabled={!canEdit}
                        className="homebrew-card__textarea homebrew-card__textarea--small"
                    />
                </>
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={status.id}
                    targetType="homebrew_status"
                    onClose={() => setShowTagBuilder(false)}
                />
            )}

            {showDeleteConfirm && (
                <div className="homebrew-confirm__overlay">
                    <div className="homebrew-confirm__content">
                        <h3 className="homebrew-confirm__title">⚠️ Confirm Deletion</h3>
                        <p className="homebrew-confirm__text">Are you sure you want to delete this Custom Status?</p>
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
