import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/storeTypes';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import './Homebrew.css';
import './HomebrewItemCard.css';

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
    const [localPocket, setLocalPocket] = useState(item.pocket || 'Misc');
    const [localCategory, setLocalCategory] = useState(item.category || 'Misc');
    const [localRarity, setLocalRarity] = useState(item.rarity || 'Uncommon');
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(item.gmOnly || false);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(item.name !== 'New Item');

    useEffect(() => {
        setLocalName(item.name);
        setLocalDescription(item.description);
        setLocalPocket(item.pocket || 'Misc');
        setLocalCategory(item.category || 'Misc');
        setLocalRarity(item.rarity || 'Uncommon');
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
                    <div className="homebrew-item-card__row">
                        <select
                            value={localPocket}
                            onChange={(event) => canEdit && setLocalPocket(event.target.value)}
                            onBlur={() =>
                                canEdit &&
                                localPocket !== item.pocket &&
                                updateCustomItem(item.id, 'pocket', localPocket)
                            }
                            disabled={!canEdit}
                            className="homebrew-item-card__select"
                        >
                            <option value="Medicine">Medicine</option>
                            <option value="HeldItems">Held Items</option>
                            <option value="Pokeballs">Pokéballs</option>
                            <option value="TrainerItems">Trainer Items</option>
                            <option value="EvolutionItem">Evolution Item</option>
                            <option value="KeyItems">Key Items</option>
                            <option value="Custom">Custom</option>
                        </select>
                        <input
                            type="text"
                            list="homebrew-categories-list"
                            value={localCategory}
                            onChange={(event) => canEdit && setLocalCategory(event.target.value)}
                            onBlur={() =>
                                canEdit &&
                                localCategory !== item.category &&
                                updateCustomItem(item.id, 'category', localCategory)
                            }
                            placeholder="Category (e.g. Healing, Berry)"
                            disabled={!canEdit}
                            className="homebrew-item-card__input"
                        />
                        <select
                            value={localRarity}
                            onChange={(event) => canEdit && setLocalRarity(event.target.value)}
                            onBlur={() =>
                                canEdit &&
                                localRarity !== item.rarity &&
                                updateCustomItem(item.id, 'rarity', localRarity)
                            }
                            disabled={!canEdit}
                            className="homebrew-item-card__select"
                        >
                            <option value="Common">Common</option>
                            <option value="Uncommon">Uncommon</option>
                            <option value="Rare">Rare</option>
                            <option value="Very Rare">Very Rare</option>
                            <option value="Legendary">Legendary</option>
                        </select>
                    </div>
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
                </>
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={item.id}
                    targetType="homebrew_item"
                    onClose={() => setShowTagBuilder(false)}
                />
            )}

            {showDeleteConfirm && (
                <div className="homebrew-confirm__overlay">
                    <div className="homebrew-confirm__content">
                        <h3 className="homebrew-confirm__title">⚠️ Confirm Deletion</h3>
                        <p className="homebrew-confirm__text">Are you sure you want to delete this Custom Item?</p>
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