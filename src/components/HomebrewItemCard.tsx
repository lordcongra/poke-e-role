import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomItem } from '../store/storeTypes';
import { TagBuilderModal } from './TagBuilderModal';

interface HomebrewItemCardProps {
    item: CustomItem;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
}

export function HomebrewItemCard({ item, role, canEdit, onRemove }: HomebrewItemCardProps) {
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);

    const [localName, setLocalName] = useState(item.name);
    const [localDescription, setLocalDescription] = useState(item.description);
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(item.gmOnly || false);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(item.name !== 'New Item');

    useEffect(() => {
        setLocalName(item.name);
        setLocalDescription(item.description);
        setLocalGameMasterOnly(item.gmOnly || false);
    }, [item]);

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
                    onBlur={() => canEdit && localName !== item.name && updateCustomItem(item.id, 'name', localName)}
                    placeholder="Item Name"
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
                                updateCustomItem(item.id, 'gmOnly', event.target.checked);
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
                <textarea
                    value={localDescription}
                    onChange={(event) => canEdit && setLocalDescription(event.target.value)}
                    onBlur={() =>
                        canEdit &&
                        localDescription !== item.description &&
                        updateCustomItem(item.id, 'description', localDescription)
                    }
                    placeholder="Item Effect / Description and Tags"
                    disabled={!canEdit}
                    style={{
                        width: '100%',
                        height: '70px',
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
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={item.id}
                    targetType="homebrew_item"
                    onClose={() => setShowTagBuilder(false)}
                />
            )}
        </div>
    );
}
