import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomMove } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import { NumberSpinner } from '../ui/NumberSpinner';
import { ChevronDown, Tag, Copy, X, AlertTriangle } from 'lucide-react';
import './Homebrew.css';
import './HomebrewMove.css';

interface HomebrewMoveCardProps {
    move: CustomMove;
    allTypes: string[];
    allTypeColors: Record<string, string>;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
    onDuplicate: () => void;
}

export function HomebrewMoveCard({
    move,
    allTypes,
    allTypeColors,
    role,
    canEdit,
    onRemove,
    onDuplicate
}: HomebrewMoveCardProps) {
    const updateCustomMove = useCharacterStore((state) => state.updateCustomMove);

    const [localName, setLocalName] = useState(move.name);
    const [localDescription, setLocalDescription] = useState(move.desc);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(move.gmOnly || false);

    const [isCollapsed, setIsCollapsed] = useState(move.name !== 'New Move');
    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [prevMove, setPrevMove] = useState(move);
    if (prevMove !== move) {
        setPrevMove(move);
        setLocalName(move.name);
        setLocalDescription(move.desc);
        setLocalGameMasterOnly(move.gmOnly || false);
    }

    return (
        <div className="homebrew-card">
            <div className="homebrew-card__header">
                <button
                    type="button"
                    className={`collapse-btn flex-layout--row-center ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <ChevronDown size={16} />
                </button>
                <input
                    type="text"
                    value={localName}
                    onChange={(event) => canEdit && setLocalName(event.target.value)}
                    onBlur={() => canEdit && localName !== move.name && updateCustomMove(move.id, 'name', localName)}
                    placeholder="Move Name"
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
                                updateCustomMove(move.id, 'gmOnly', event.target.checked);
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
                            title="Duplicate Move"
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
                    <div className="homebrew-move__row">
                        <select
                            value={move.type}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'type', event.target.value)}
                            disabled={!canEdit}
                            className={`homebrew-move__select ${move.type && move.type !== 'None' ? 'text-theme-header' : ''}`}
                            style={{
                                background: allTypeColors[move.type] || 'var(--input-bg)'
                            }}
                        >
                            <option value="">-- Type --</option>
                            {allTypes.map((typeOption) => (
                                <option key={typeOption} value={typeOption}>
                                    {typeOption}
                                </option>
                            ))}
                        </select>
                        <select
                            value={move.category}
                            onChange={(event) =>
                                canEdit &&
                                updateCustomMove(
                                    move.id,
                                    'category',
                                    event.target.value as 'Physical' | 'Special' | 'Status'
                                )
                            }
                            disabled={!canEdit}
                            className="homebrew-move__select text-label"
                        >
                            <option value="Physical">Physical</option>
                            <option value="Special">Special</option>
                            <option value="Status">Status</option>
                        </select>
                        <div className="homebrew-move__power-box">
                            <span className="text-label">Power:</span>
                            <NumberSpinner
                                value={move.power}
                                onChange={(value: number) => canEdit && updateCustomMove(move.id, 'power', value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>

                    <div className="homebrew-move__stat-row">
                        <span className="text-label">Accuracy:</span>
                        <div className="homebrew-move__dual-col">
                            <select
                                value={move.acc1}
                                onChange={(event) => canEdit && updateCustomMove(move.id, 'acc1', event.target.value)}
                                disabled={!canEdit}
                                className="homebrew-move__stat-select text-label"
                            >
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
                            <span className="homebrew-move__or-label text-subtext">or</span>
                            <select
                                value={move.acc1Alt || ''}
                                onChange={(event) =>
                                    canEdit && updateCustomMove(move.id, 'acc1Alt', event.target.value)
                                }
                                disabled={!canEdit}
                                className="homebrew-move__stat-select text-label"
                            >
                                <option value="">-- None --</option>
                                {Object.values(CombatStat).map((stat) => (
                                    <option key={`alt1-${stat}`} value={stat}>
                                        {stat.toUpperCase()}
                                    </option>
                                ))}
                                {Object.values(SocialStat).map((stat) => (
                                    <option key={`alt1-${stat}`} value={stat}>
                                        {stat.toUpperCase()}
                                    </option>
                                ))}
                                <option value="will">WILL</option>
                            </select>
                        </div>
                        <span className="text-label">+</span>
                        <div className="homebrew-move__dual-col">
                            <select
                                value={move.acc2}
                                onChange={(event) => canEdit && updateCustomMove(move.id, 'acc2', event.target.value)}
                                disabled={!canEdit}
                                className="homebrew-move__stat-select text-label"
                            >
                                <option value="none">-- None --</option>
                                {Object.values(Skill).map((skill) => (
                                    <option key={skill} value={skill}>
                                        {skill.charAt(0).toUpperCase() + skill.slice(1)}
                                    </option>
                                ))}
                            </select>
                            <span className="homebrew-move__or-label text-subtext">or</span>
                            <select
                                value={move.acc2Alt || ''}
                                onChange={(event) =>
                                    canEdit && updateCustomMove(move.id, 'acc2Alt', event.target.value)
                                }
                                disabled={!canEdit}
                                className="homebrew-move__stat-select text-label"
                            >
                                <option value="">-- None --</option>
                                {Object.values(Skill).map((skill) => (
                                    <option key={`alt2-${skill}`} value={skill}>
                                        {skill.charAt(0).toUpperCase() + skill.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="homebrew-move__stat-row">
                        <span className="text-label">Damage:</span>
                        <div className="homebrew-move__dual-col">
                            <select
                                value={move.dmg1}
                                onChange={(event) => canEdit && updateCustomMove(move.id, 'dmg1', event.target.value)}
                                disabled={!canEdit}
                                className="homebrew-move__stat-select text-label"
                            >
                                <option value="">-- None --</option>
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
                            </select>
                            <span className="homebrew-move__or-label text-subtext">or</span>
                            <select
                                value={move.dmg1Alt || ''}
                                onChange={(event) =>
                                    canEdit && updateCustomMove(move.id, 'dmg1Alt', event.target.value)
                                }
                                disabled={!canEdit}
                                className="homebrew-move__stat-select text-label"
                            >
                                <option value="">-- None --</option>
                                {Object.values(CombatStat).map((stat) => (
                                    <option key={`altdmg1-${stat}`} value={stat}>
                                        {stat.toUpperCase()}
                                    </option>
                                ))}
                                {Object.values(SocialStat).map((stat) => (
                                    <option key={`altdmg1-${stat}`} value={stat}>
                                        {stat.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <textarea
                        value={localDescription}
                        onChange={(event) => canEdit && setLocalDescription(event.target.value)}
                        onBlur={() =>
                            canEdit &&
                            localDescription !== move.desc &&
                            updateCustomMove(move.id, 'desc', localDescription)
                        }
                        placeholder="Move Description / Effects"
                        disabled={!canEdit}
                        className="homebrew-card__textarea homebrew-card__textarea--small text-subtext"
                    />
                </>
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={move.id}
                    targetType="homebrew_move"
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
                            Are you sure you want to delete this Custom Move?
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
