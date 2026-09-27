import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { ImageDownload } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/storeTypes';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { ItemImageSection } from '../modals/items/ItemImageSection';
import { imageManager, autoCropTransparency } from '../../utils/imageManager';
import { setItemArt } from '../../utils/itemArtCatalog';
import { ChevronDown, Tag, Copy, X, AlertTriangle, Package } from 'lucide-react';
import './Homebrew.css';
import './HomebrewItemCard.css';
import '../modals/items/ItemEditModal.css';

interface HomebrewItemCardProps {
    item: CustomItem;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
    onDuplicate: () => void;
}

export function HomebrewItemCard({ item, role, canEdit, onRemove, onDuplicate }: HomebrewItemCardProps) {
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);

    const [localName, setLocalName] = useState(item.name);
    const [localDescription, setLocalDescription] = useState(item.description);
    const [localPocket, setLocalPocket] = useState(item.pocket || 'Misc');
    const [localCategory, setLocalCategory] = useState(item.category || 'Misc');
    const [localRarity, setLocalRarity] = useState(item.rarity || 'Uncommon');
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(item.gmOnly || false);

    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlText, setUrlText] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(item.name !== 'New Item');

    const [prevItem, setPrevItem] = useState(item);
    if (prevItem !== item) {
        setPrevItem(item);
        setLocalName(item.name);
        setLocalDescription(item.description);
        setLocalPocket(item.pocket || 'Misc');
        setLocalCategory(item.category || 'Misc');
        setLocalRarity(item.rarity || 'Uncommon');
        setLocalGameMasterOnly(item.gmOnly || false);
    }

    // Resolve Image Blob / URL for display
    useEffect(() => {
        let isMounted = true;
        let createdBlobUrl: string | null = null;

        if (item.imageUrl && item.imageUrl !== 'none') {
            imageManager.getImageUrl(item.imageUrl).then((url) => {
                if (isMounted) {
                    setResolvedImageUrl(url);
                    if (url && url.startsWith('blob:')) {
                        createdBlobUrl = url;
                    }
                }
            });
        } else {
            setResolvedImageUrl(null);
        }

        return () => {
            isMounted = false;
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [item.imageUrl]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const croppedBlob = await autoCropTransparency(file, true);
            const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type || 'image/png' });
            const imgId = await imageManager.saveImage(croppedFile);

            if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
                imageManager.deleteImage(item.imageUrl).catch(() => {});
            }

            updateCustomItem(item.id, 'imageUrl', imgId);
            const currentName = (localName || item.name).trim();
            if (currentName) {
                setItemArt(currentName, imgId);
            }
        } catch (error) {
            console.error('[HomebrewItemCard] Failed to upload image:', error);
        } finally {
            if (event.target) event.target.value = '';
        }
    };

    const handleSelectObrImage = async () => {
        if (!OBR.isAvailable) return;
        try {
            if (typeof OBR.assets?.downloadImages === 'function') {
                const images = (await OBR.assets.downloadImages()) as ImageDownload[];
                if (images && images.length > 0) {
                    const selectedUrl = images[0].image?.url;
                    if (selectedUrl) {
                        if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
                            imageManager.deleteImage(item.imageUrl).catch(() => {});
                        }
                        updateCustomItem(item.id, 'imageUrl', selectedUrl);
                        const currentName = (localName || item.name).trim();
                        if (currentName) {
                            setItemArt(currentName, selectedUrl);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[HomebrewItemCard] Failed to pick image from Owlbear:', error);
        }
    };

    const handleSaveUrl = () => {
        const trimmed = urlText.trim();
        if (!trimmed) return;

        if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
            imageManager.deleteImage(item.imageUrl).catch(() => {});
        }
        updateCustomItem(item.id, 'imageUrl', trimmed);
        const currentName = (localName || item.name).trim();
        if (currentName) {
            setItemArt(currentName, trimmed);
        }
        setUrlText('');
        setShowUrlInput(false);
    };

    const handleRemoveImage = async () => {
        if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
            try {
                await imageManager.deleteImage(item.imageUrl);
            } catch {}
        }
        updateCustomItem(item.id, 'imageUrl', undefined);
    };

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
                {resolvedImageUrl ? (
                    <img
                        src={resolvedImageUrl}
                        alt={localName || item.name}
                        className="homebrew-item-card__thumb"
                        title="Custom Item Artwork"
                    />
                ) : (
                    <div className="homebrew-item-card__thumb homebrew-item-card__thumb--empty" title="No artwork set">
                        <Package size={14} />
                    </div>
                )}
                <input
                    type="text"
                    value={localName}
                    onChange={(event) => {
                        if (!canEdit) return;
                        setLocalName(event.target.value);
                        if (event.target.value.trim() && item.imageUrl && item.imageUrl !== 'none') {
                            setItemArt(event.target.value.trim(), item.imageUrl);
                        }
                    }}
                    onBlur={() => {
                        if (!canEdit) return;
                        if (localName !== item.name) {
                            updateCustomItem(item.id, 'name', localName);
                            if (localName.trim() && item.imageUrl && item.imageUrl !== 'none') {
                                setItemArt(localName.trim(), item.imageUrl);
                            }
                        }
                    }}
                    placeholder="Item Name"
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
                                updateCustomItem(item.id, 'gmOnly', event.target.checked);
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
                            title="Duplicate Item"
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
                    {canEdit ? (
                        <div className="homebrew-item-card__image-container">
                            <ItemImageSection
                                imageUrl={item.imageUrl && item.imageUrl !== 'none' ? item.imageUrl : undefined}
                                resolvedImageUrl={resolvedImageUrl}
                                itemName={localName || item.name}
                                fileInputRef={fileInputRef}
                                showUrlInput={showUrlInput}
                                setShowUrlInput={setShowUrlInput}
                                urlText={urlText}
                                setUrlText={setUrlText}
                                onFileUpload={handleFileUpload}
                                onSelectObrImage={handleSelectObrImage}
                                onSaveUrl={handleSaveUrl}
                                onRemoveImage={handleRemoveImage}
                            />
                        </div>
                    ) : resolvedImageUrl ? (
                        <div
                            className="homebrew-item-card__image-container"
                            style={{ display: 'flex', justifyContent: 'center' }}
                        >
                            <img
                                src={resolvedImageUrl}
                                alt={localName || item.name}
                                style={{ maxHeight: 80, objectFit: 'contain' }}
                            />
                        </div>
                    ) : null}
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
                        className="homebrew-card__textarea homebrew-card__textarea--large text-subtext"
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
                            Are you sure you want to delete this Custom Item?
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
