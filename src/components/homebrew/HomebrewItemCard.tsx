import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/storeTypes';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import './Homebrew.css';

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
                    onBlur={() => canEdit && localName !== item.name && updateCustomItem(item.id, 'name', localName)}
                    placeholder="Item Name"
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
                                updateCustomItem(item.id, 'gmOnly', event.target.checked);
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
                    className="homebrew-card__textarea homebrew-card__textarea--large"
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
