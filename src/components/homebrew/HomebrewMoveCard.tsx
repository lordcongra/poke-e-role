import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomMove } from '../../store/storeTypes';
import { CombatStat, Skill } from '../../types/enums';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import { NumberSpinner } from '../ui/NumberSpinner';
import './Homebrew.css';
import './HomebrewMove.css';

interface HomebrewMoveCardProps {
    move: CustomMove;
    allTypes: string[];
    allTypeColors: Record<string, string>;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
}

export function HomebrewMoveCard({ move, allTypes, allTypeColors, role, canEdit, onRemove }: HomebrewMoveCardProps) {
    const updateCustomMove = useCharacterStore((state) => state.updateCustomMove);

    const [localName, setLocalName] = useState(move.name);
    const [localDescription, setLocalDescription] = useState(move.desc);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(move.gmOnly || false);

    const [isCollapsed, setIsCollapsed] = useState(move.name !== 'New Move');
    const [showTagBuilder, setShowTagBuilder] = useState(false);

    useEffect(() => {
        setLocalName(move.name);
        setLocalDescription(move.desc);
        setLocalGameMasterOnly(move.gmOnly || false);
    }, [move]);

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
                    onBlur={() => canEdit && localName !== move.name && updateCustomMove(move.id, 'name', localName)}
                    placeholder="Move Name"
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
                                updateCustomMove(move.id, 'gmOnly', event.target.checked);
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
                    <button onClick={onRemove} className="action-button action-button--red homebrew-card__btn">
                        Delete
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div className="homebrew-move__row">
                        <select
                            value={move.type}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'type', event.target.value)}
                            disabled={!canEdit}
                            className="homebrew-move__select"
                            style={{
                                background: allTypeColors[move.type] || 'var(--input-bg)',
                                color: move.type && move.type !== 'None' ? 'white' : 'var(--text-main)',
                                textShadow: move.type && move.type !== 'None' ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none'
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
                            className="homebrew-move__select"
                        >
                            <option value="Physical">Physical</option>
                            <option value="Special">Special</option>
                            <option value="Status">Status</option>
                        </select>
                        <div className="homebrew-move__power-box">
                            <span className="homebrew-move__label">Power:</span>
                            <NumberSpinner
                                value={move.power}
                                onChange={(value: number) => canEdit && updateCustomMove(move.id, 'power', value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>

                    <div className="homebrew-move__stat-row">
                        <span className="homebrew-move__label">Accuracy:</span>
                        <select
                            value={move.acc1}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'acc1', event.target.value)}
                            disabled={!canEdit}
                            className="homebrew-move__stat-select"
                        >
                            {Object.values(CombatStat).map((stat) => (
                                <option key={stat} value={stat}>
                                    {stat.toUpperCase()}
                                </option>
                            ))}
                            <option value="will">WILL</option>
                        </select>
                        <span>+</span>
                        <select
                            value={move.acc2}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'acc2', event.target.value)}
                            disabled={!canEdit}
                            className="homebrew-move__stat-select"
                        >
                            <option value="none">-- None --</option>
                            {Object.values(Skill).map((skill) => (
                                <option key={skill} value={skill}>
                                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="homebrew-move__stat-row">
                        <span className="homebrew-move__label">Damage:</span>
                        <select
                            value={move.dmg1}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'dmg1', event.target.value)}
                            disabled={!canEdit}
                            className="homebrew-move__stat-select"
                        >
                            <option value="">-- None --</option>
                            {Object.values(CombatStat).map((stat) => (
                                <option key={stat} value={stat}>
                                    {stat.toUpperCase()}
                                </option>
                            ))}
                        </select>
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
                        className="homebrew-card__textarea homebrew-card__textarea--small"
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
        </div>
    );
}
