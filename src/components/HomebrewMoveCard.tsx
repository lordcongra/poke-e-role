import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomMove } from '../store/storeTypes';
import { CombatStat, Skill } from '../types/enums';
import { TagBuilderModal } from './TagBuilderModal';
import { NumberSpinner } from './NumberSpinner';

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
        <div
            style={{
                background: 'var(--panel-alt)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0
            }}
        >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    style={{
                        flex: 1,
                        padding: '6px',
                        fontWeight: 'bold',
                        background: 'var(--input-bg)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px'
                    }}
                />
                {role === 'GM' && (
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.7rem',
                            color: '#c62828',
                            fontWeight: 'bold'
                        }}
                    >
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
                        className="action-button action-button--dark"
                        style={{ padding: '6px 12px' }}
                    >
                        🏷️ Tags
                    </button>
                )}
                {canEdit && (
                    <button
                        onClick={onRemove}
                        className="action-button action-button--red"
                        style={{ padding: '6px 12px' }}
                    >
                        Delete
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={move.type}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'type', event.target.value)}
                            disabled={!canEdit}
                            style={{
                                flex: 1,
                                padding: '4px',
                                background: allTypeColors[move.type] || 'var(--input-bg)',
                                color: move.type && move.type !== 'None' ? 'white' : 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontWeight: 'bold',
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
                            style={{
                                flex: 1,
                                padding: '4px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px'
                            }}
                        >
                            <option value="Physical">Physical</option>
                            <option value="Special">Special</option>
                            <option value="Status">Status</option>
                        </select>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid var(--border)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'var(--input-bg)'
                            }}
                        >
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                Power:
                            </span>
                            <NumberSpinner
                                value={move.power}
                                onChange={(value) => canEdit && updateCustomMove(move.id, 'power', value)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            background: 'var(--row-odd)',
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                            Accuracy:
                        </span>
                        <select
                            value={move.acc1}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'acc1', event.target.value)}
                            disabled={!canEdit}
                            style={{
                                flex: 1,
                                padding: '2px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '3px'
                            }}
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
                            style={{
                                flex: 1,
                                padding: '2px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '3px'
                            }}
                        >
                            <option value="none">-- None --</option>
                            {Object.values(Skill).map((skill) => (
                                <option key={skill} value={skill}>
                                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            background: 'var(--row-odd)',
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                            Damage:
                        </span>
                        <select
                            value={move.dmg1}
                            onChange={(event) => canEdit && updateCustomMove(move.id, 'dmg1', event.target.value)}
                            disabled={!canEdit}
                            style={{
                                flex: 1,
                                padding: '2px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '3px'
                            }}
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
                        style={{
                            width: '100%',
                            height: '50px',
                            padding: '6px',
                            resize: 'vertical',
                            background: 'var(--input-bg)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontFamily: 'inherit',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                        }}
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
