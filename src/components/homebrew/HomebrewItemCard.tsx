import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { ImageDownload } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/storeTypes';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { ItemImageSection } from '../modals/items/ItemImageSection';
import { HomebrewItemEffectsSection } from './HomebrewItemEffectsSection';
import { HomebrewItemClassificationRow } from './HomebrewItemClassificationRow';
import { imageManager, autoCropTransparency } from '../../utils/graphics/imageManager';
import { setItemArt } from '../../utils/graphics/itemArtCatalog';
import { ChevronDown, Tag, Copy, X, AlertTriangle, Package } from 'lucide-react';
import { TagPillList } from '../ui/TagPillList';
import { extractItemTags } from '../modals/items/tagBuilder/tagBuilderLogic';
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

    const resolveInitialCustomGroup = (target: CustomItem) => {
        if (target.customGroup?.trim()) return target.customGroup.trim();
        if (target.category && target.category !== 'Misc' && target.category !== 'Custom') return target.category;
        return target.pocket === 'Custom' ? 'Custom' : '';
    };

    const [localName, setLocalName] = useState(item.name);
    const [localDescription, setLocalDescription] = useState(item.description);
    const [localPocket, setLocalPocket] = useState(item.pocket || 'Custom');
    const [localCustomGroup, setLocalCustomGroup] = useState(resolveInitialCustomGroup(item));
    const [localCategory, setLocalCategory] = useState(item.category || 'Misc');
    const [localSubCategory, setLocalSubCategory] = useState(item.subCategory || '');
    const [localRarity, setLocalRarity] = useState(item.rarity || 'Uncommon');
    const [localGameMasterOnly, setLocalGameMasterOnly] = useState(item.gmOnly || false);

    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlText, setUrlText] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [tagBuilderInitialTag, setTagBuilderInitialTag] = useState<string | undefined>(undefined);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(item.name !== 'New Item');

    const [prevItem, setPrevItem] = useState(item);
    if (prevItem !== item) {
        setPrevItem(item);
        setLocalName(item.name);
        setLocalDescription(item.description);
        setLocalPocket(item.pocket || 'Custom');
        setLocalCustomGroup(resolveInitialCustomGroup(item));
        setLocalCategory(item.category || 'Misc');
        setLocalSubCategory(item.subCategory || '');
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
                            onClick={() => {
                                setTagBuilderInitialTag(undefined);
                                setShowTagBuilder(true);
                            }}
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
                    <HomebrewItemClassificationRow
                        item={item}
                        canEdit={canEdit}
                        localPocket={localPocket}
                        setLocalPocket={setLocalPocket}
                        localCustomGroup={localCustomGroup}
                        setLocalCustomGroup={setLocalCustomGroup}
                        localCategory={localCategory}
                        setLocalCategory={setLocalCategory}
                        localSubCategory={localSubCategory}
                        setLocalSubCategory={setLocalSubCategory}
                        localRarity={localRarity}
                        setLocalRarity={setLocalRarity}
                        onUpdateField={(field, val) => updateCustomItem(item.id, field, val)}
                    />
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
                    {extractItemTags({ name: item.name, description: item.description, tags: item.tags }).length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                            <TagPillList
                                tags={extractItemTags({ name: item.name, description: item.description, tags: item.tags })}
                                onEditTag={(tagStr) => {
                                    setTagBuilderInitialTag(tagStr);
                                    setShowTagBuilder(true);
                                }}
                                onDeleteTag={(rawTag) => {
                                    const currentTags =
                                        item.tags !== undefined
                                            ? item.tags
                                            : (item.description.match(/\[[^\]]+\]/g) || []).join(' ');
                                    const updated = currentTags.replace(rawTag, '').replace(/\s+/g, ' ').trim();
                                    updateCustomItem(item.id, 'tags', updated);
                                    if (item.description.includes(rawTag)) {
                                        const cleanDesc = item.description
                                            .replace(rawTag, '')
                                            .replace(/\n\s*\n+/g, '\n')
                                            .trim();
                                        updateCustomItem(item.id, 'description', cleanDesc);
                                    }
                                }}
                                onAddTag={() => {
                                    setTagBuilderInitialTag(undefined);
                                    setShowTagBuilder(true);
                                }}
                                showAddButton={false}
                            />
                        </div>
                    )}
                    {canEdit && (
                        <div style={{ marginTop: '6px', marginBottom: '4px', display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark text-theme-header"
                                style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                    setTagBuilderInitialTag(undefined);
                                    setShowTagBuilder(true);
                                }}
                            >
                                <Tag size={12} /> Add Smart Tags
                            </button>
                        </div>
                    )}
                    <HomebrewItemEffectsSection item={item} canEdit={canEdit} />
                </>
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={item.id}
                    targetType="homebrew_item"
                    initialTag={tagBuilderInitialTag}
                    onClose={() => {
                        setShowTagBuilder(false);
                        setTagBuilderInitialTag(undefined);
                    }}
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
