import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomAbility } from '../store/storeTypes';
import { TagBuilderModal } from './TagBuilderModal';

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
    const [isCollapsed, setIsCollapsed] = useState(ability.name !== 'New Ability');

    useEffect(() => {
        setLocalName(ability.name);
        setLocalDescription(ability.description);
        setLocalEffect(ability.effect);
        setLocalGameMasterOnly(ability.gmOnly || false);
    }, [ability]);

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
                    onBlur={() =>
                        canEdit && localName !== ability.name && updateCustomAbility(ability.id, 'name', localName)
                    }
                    placeholder="Ability Name"
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
                                updateCustomAbility(ability.id, 'gmOnly', event.target.checked);
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
                    targetId={ability.id}
                    targetType="homebrew_ability"
                    onClose={() => setShowTagBuilder(false)}
                />
            )}
        </div>
    );
}
