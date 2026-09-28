import { useState, useEffect, useRef } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { imageManager, autoCropTransparency } from '../../../utils/imageManager';
import { lookupItemDetails } from '../../../utils/itemLookupUtils';
import { KNOWN_ITEMS } from '../../../data/constants';
import { setItemArt, getItemArt, useItemArt } from '../../../utils/itemArtCatalog';
import { TagBuilderModal } from './TagBuilderModal';
import { ItemImageSection } from './ItemImageSection';
import { broadcastInfo } from '../../../utils/diceRoller';
import { NumberSpinner } from '../../ui/NumberSpinner';
import OBR, { type ImageDownload } from '@owlbear-rodeo/sdk';
import {
    X,
    Trash2,
    Megaphone,
    Tag,
    Check,
    RefreshCw,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
    XCircle,
    Dices
} from 'lucide-react';
import { TagPillList } from '../../ui/TagPillList';
import { extractItemTags } from './tagBuilder/tagBuilderLogic';
import './ItemEditModal.css';

interface ItemEditModalProps {
    itemId: string;
    onClose: () => void;
}

export function ItemEditModal({ itemId, onClose }: ItemEditModalProps) {
    const item = useCharacterStore((state) => state.inventory.find((i) => i.id === itemId));
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const removeInventoryItem = useCharacterStore((state) => state.removeInventoryItem);
    const moveUpInventoryItem = useCharacterStore((state) => state.moveUpInventoryItem);
    const moveDownInventoryItem = useCharacterStore((state) => state.moveDownInventoryItem);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [localName, setLocalName] = useState(item?.name || '');
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlText, setUrlText] = useState('');
    const [tagBuilderInitialTag, setTagBuilderInitialTag] = useState<string | undefined>(undefined);
    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [isBroadcasted, setIsBroadcasted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const knownArt = useItemArt(item?.name || localName);
    const effectiveImageUrl =
        item?.imageUrl && item.imageUrl !== 'none' ? item.imageUrl : item?.imageUrl !== 'none' ? knownArt : undefined;

    // Automatically adopt known artwork if item has no image and art is discovered
    useEffect(() => {
        if (item && !item.imageUrl && item.imageUrl !== 'none' && knownArt) {
            updateInventoryItem(item.id, 'imageUrl', knownArt);
        }
    }, [item?.id, item?.imageUrl, knownArt, updateInventoryItem]);

    // Keep localName synced if item updates externally
    useEffect(() => {
        if (item?.name !== undefined && item.name !== localName) {
            setLocalName(item.name);
        }
    }, [item?.name]);

    // Resolve Image Blob / URL
    useEffect(() => {
        let isMounted = true;
        let createdBlobUrl: string | null = null;

        if (effectiveImageUrl && effectiveImageUrl !== 'none') {
            imageManager.getImageUrl(effectiveImageUrl).then((url) => {
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
    }, [effectiveImageUrl]);

    const handleSafeClose = () => {
        const value = (localName || item?.name || '').trim();
        const currentImg = item?.imageUrl;
        if (value && currentImg && currentImg !== 'none') {
            setItemArt(value, currentImg);
        }
        onClose();
    };

    // Handle Escape Key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !showTagBuilder && !showDeleteConfirm) {
                handleSafeClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSafeClose, showTagBuilder, showDeleteConfirm]);

    if (!item) return null;

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const croppedBlob = await autoCropTransparency(file, true);
            const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type || 'image/png' });
            const imgId = await imageManager.saveImage(croppedFile);

            if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
                imageManager.deleteImage(item.imageUrl).catch((err) => {
                    console.error('[ItemEditModal] Failed to cleanup replaced image:', err);
                });
            }

            updateInventoryItem(item.id, 'imageUrl', imgId);
            const currentName = (localName || item.name).trim();
            if (currentName) {
                setItemArt(currentName, imgId);
            }
        } catch (error) {
            console.error('[ItemEditModal] Failed to upload image:', error);
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
                        updateInventoryItem(item.id, 'imageUrl', selectedUrl);
                        const currentName = (localName || item.name).trim();
                        if (currentName) {
                            setItemArt(currentName, selectedUrl);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[ItemEditModal] Failed to pick image from Owlbear:', error);
        }
    };

    const handleSaveUrl = () => {
        const trimmed = urlText.trim();
        if (!trimmed) return;

        if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
            imageManager.deleteImage(item.imageUrl).catch(() => {});
        }
        updateInventoryItem(item.id, 'imageUrl', trimmed);
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
            } catch (error) {
                console.error('[ItemEditModal] Failed to delete image from IndexedDB:', error);
            }
        }
        updateInventoryItem(item.id, 'imageUrl', 'none');
    };

    const handleApplyItemLookup = async (nameQuery: string, forceOverwrite = false) => {
        const query = nameQuery.trim();
        if (!query) return;

        setIsFetchingInfo(true);
        try {
            const result = await lookupItemDetails(query);
            if (result) {
                if (result.name && result.name !== item.name) {
                    updateInventoryItem(item.id, 'name', result.name);
                    setLocalName(result.name);
                }

                if (result.description) {
                    if (forceOverwrite || !item.desc.trim()) {
                        updateInventoryItem(item.id, 'desc', result.description);
                    }
                }

                if (result.tags) {
                    updateInventoryItem(item.id, 'tags', result.tags);
                }

                if (/\[.*?\]/.test(item.desc)) {
                    const cleaned = item.desc
                        .replace(/\[.*?\]/g, '')
                        .replace(/\n\s*\n+/g, '\n')
                        .trim();
                    updateInventoryItem(item.id, 'desc', cleaned);
                }

                const targetImg = result.imageUrl || getItemArt(result.name) || getItemArt(query);
                if (targetImg && (!item.imageUrl || item.imageUrl === 'none')) {
                    updateInventoryItem(item.id, 'imageUrl', targetImg);
                }
            }
        } catch (e) {
            console.error('[ItemEditModal] Failed to lookup item info:', e);
        } finally {
            setIsFetchingInfo(false);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalName(val);

        if (val.trim() && item.imageUrl && item.imageUrl !== 'none') {
            setItemArt(val.trim(), item.imageUrl);
        }

        // Instant auto-pull if exact match with known item or catalog
        const trimmedLower = val.trim().toLowerCase();
        if (KNOWN_ITEMS.some((k) => k.name.toLowerCase() === trimmedLower) || Boolean(getItemArt(val))) {
            handleApplyItemLookup(val, false);
        }
    };

    const handleNameBlur = async () => {
        const value = localName.trim();
        if (value !== item.name) {
            updateInventoryItem(item.id, 'name', value);
        }
        if (value && (!item.imageUrl || item.imageUrl === 'none')) {
            const art = getItemArt(value);
            if (art) {
                updateInventoryItem(item.id, 'imageUrl', art);
            }
        } else if (value && item.imageUrl && item.imageUrl !== 'none') {
            setItemArt(value, item.imageUrl);
        }
        if (value && (value !== item.name || !item.desc.trim())) {
            await handleApplyItemLookup(value, false);
        }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleLookupInfo = async () => {
        const query = (localName || item.name).trim();
        if (!query) return;
        await handleApplyItemLookup(query, true);
    };

    const handleBroadcast = () => {
        const effectiveTags = extractItemTags(item)
            .map((p) => p.tag)
            .join(' ');
        const fullBroadcastDesc = effectiveTags
            ? `${item.desc || ''}\n\n${effectiveTags}`.trim()
            : item.desc || 'No description listed.';
        broadcastInfo(item.name || 'Item', fullBroadcastDesc);
        setIsBroadcasted(true);
        setTimeout(() => setIsBroadcasted(false), 2000);
    };

    return (
        <div className="item-edit-modal__overlay" onClick={handleSafeClose} role="dialog" aria-modal="true">
            <div className="item-edit-modal__dialog" onClick={(e) => e.stopPropagation()}>
                {/* Accent Bar */}
                <div className="item-edit-modal__accent-bar" />

                {/* Close Button */}
                <button
                    type="button"
                    className="item-edit-modal__close-btn"
                    onClick={handleSafeClose}
                    title="Close (Esc)"
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="item-edit-modal__header">
                    <h2 className="item-edit-modal__title text-title-primary">{item.name ? item.name : 'Edit Item'}</h2>
                </div>

                {/* Body Content */}
                <div className="item-edit-modal__body">
                    {/* Image Section */}
                    <ItemImageSection
                        imageUrl={effectiveImageUrl !== 'none' ? effectiveImageUrl : undefined}
                        resolvedImageUrl={resolvedImageUrl}
                        itemName={item.name}
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

                    {/* Item Name Row & Equip Toggle */}
                    <div className="item-edit-modal__row">
                        <input
                            type="text"
                            list="item-list"
                            className="item-edit-modal__name-input text-label"
                            style={{ color: 'var(--text-main)' }}
                            value={localName}
                            onChange={handleNameChange}
                            onBlur={handleNameBlur}
                            onKeyDown={handleNameKeyDown}
                            placeholder="Item Name"
                        />

                        <label
                            className={`item-edit-modal__equip-badge ${
                                item.active ? 'item-edit-modal__equip-badge--active' : ''
                            }`}
                            title={
                                item.active
                                    ? 'Active / Equipped item (tap to unequip)'
                                    : 'Unequipped item (tap to equip)'
                            }
                        >
                            <input
                                type="checkbox"
                                style={{ display: 'none' }}
                                checked={item.active}
                                onChange={(e) => updateInventoryItem(item.id, 'active', e.target.checked)}
                            />
                            <Check size={14} style={{ opacity: item.active ? 1 : 0.4 }} />
                            <span>{item.active ? 'Equipped' : 'Equip'}</span>
                        </label>
                    </div>

                    {/* Quantity & Lookup Controls */}
                    <div className="item-edit-modal__sub-controls">
                        <div className="item-edit-modal__qty-group">
                            <span className="item-edit-modal__qty-label">Quantity:</span>
                            <NumberSpinner
                                value={item.qty}
                                onChange={(value: number) => updateInventoryItem(item.id, 'qty', value)}
                                min={0}
                            />
                        </div>

                        <button
                            type="button"
                            className="action-button action-button--dark item-edit-modal__img-action-btn text-theme-header"
                            onClick={handleLookupInfo}
                            disabled={isFetchingInfo}
                            title="Auto-fill official Pokérole description and smart tags"
                        >
                            <RefreshCw size={13} className={isFetchingInfo ? 'spin' : ''} />
                            {isFetchingInfo ? 'Looking up...' : 'Lookup Info'}
                        </button>

                        <button
                            type="button"
                            className={`action-button ${
                                item.showInRollLog !== false ? 'action-button--theme' : 'action-button--dark'
                            } item-edit-modal__img-action-btn text-theme-header`}
                            onClick={() =>
                                updateInventoryItem(
                                    item.id,
                                    'showInRollLog',
                                    item.showInRollLog === false ? true : false
                                )
                            }
                            title={
                                item.showInRollLog !== false
                                    ? 'Showing in Roll Log (Click to hide)'
                                    : 'Hidden from Roll Log (Click to show)'
                            }
                        >
                            <Dices size={13} />
                            {item.showInRollLog !== false ? 'In Roll Log' : 'Hide from Log'}
                        </button>
                    </div>

                    {/* Effect / Notes Area */}
                    <div className="item-edit-modal__desc-container">
                        <div className="item-edit-modal__desc-header">
                            <span className="item-edit-modal__desc-label">Effect / Notes</span>
                        </div>
                        <textarea
                            className="item-edit-modal__desc-textarea text-subtext"
                            style={{ color: 'var(--text-main)' }}
                            value={item.desc}
                            onChange={(e) => updateInventoryItem(item.id, 'desc', e.target.value)}
                            onBlur={() => {
                                if (/\[.*?\]/.test(item.desc)) {
                                    const legacyMatches = Array.from(item.desc.matchAll(/\[(.*?)\]/g)).map(
                                        (m) => `[${m[1].trim()}]`
                                    );
                                    const currentTagList = item.tags
                                        ? Array.from(item.tags.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`)
                                        : [];
                                    const merged = Array.from(new Set([...currentTagList, ...legacyMatches])).join(' ');
                                    const cleaned = item.desc
                                        .replace(/\[.*?\]/g, '')
                                        .replace(/\n\s*\n+/g, '\n')
                                        .trim();
                                    updateInventoryItem(item.id, 'tags', merged);
                                    updateInventoryItem(item.id, 'desc', cleaned);
                                }
                            }}
                            placeholder="Enter item description, effect, or notes..."
                            rows={3}
                        />
                        {extractItemTags(item).length > 0 && (
                            <div
                                style={{ marginTop: '4px' }}
                                className={item.active === false ? 'inventory-item__desc-tags--inactive' : ''}
                                title={
                                    item.active === false
                                        ? 'Item unequipped (tags inactive in rolls — equip to activate)'
                                        : 'Item equipped (tags active in rolls)'
                                }
                            >
                                <TagPillList
                                    tags={extractItemTags(item)}
                                    onEditTag={(tagStr) => {
                                        setTagBuilderInitialTag(tagStr);
                                        setShowTagBuilder(true);
                                    }}
                                    onDeleteTag={(rawTag) => {
                                        const currentTags =
                                            item.tags !== undefined
                                                ? item.tags
                                                : (item.desc.match(/\[[^\]]+\]/g) || []).join(' ');
                                        const updated = currentTags.replace(rawTag, '').replace(/\s+/g, ' ').trim();
                                        updateInventoryItem(item.id, 'tags', updated);
                                        if (item.desc.includes(rawTag)) {
                                            const cleanDesc = item.desc
                                                .replace(rawTag, '')
                                                .replace(/\n\s*\n+/g, '\n')
                                                .trim();
                                            updateInventoryItem(item.id, 'desc', cleanDesc);
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
                        <div className="item-edit-modal__desc-toolbar">
                            <button
                                type="button"
                                className="action-button action-button--dark item-edit-modal__img-action-btn text-theme-header"
                                onClick={() => {
                                    setTagBuilderInitialTag(undefined);
                                    setShowTagBuilder(true);
                                }}
                            >
                                <Tag size={13} /> Add Smart Tags
                            </button>
                            <button
                                type="button"
                                className={`action-button ${
                                    isBroadcasted ? 'action-button--theme' : 'action-button--dark'
                                } item-edit-modal__img-action-btn text-theme-header`}
                                onClick={handleBroadcast}
                            >
                                <Megaphone size={13} /> {isBroadcasted ? 'Broadcasted!' : 'Broadcast'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="item-edit-modal__footer">
                    <div className="item-edit-modal__footer-left">
                        <button
                            type="button"
                            onClick={() => moveUpInventoryItem(item.id)}
                            className="action-button action-button--sort text-label"
                            title="Move Up"
                            style={{ padding: '6px 8px' }}
                        >
                            <ChevronUp size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => moveDownInventoryItem(item.id)}
                            className="action-button action-button--sort text-label"
                            title="Move Down"
                            style={{ padding: '6px 8px' }}
                        >
                            <ChevronDown size={15} />
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark item-edit-modal__delete-btn"
                            onClick={() => setShowDeleteConfirm(true)}
                            title="Delete Item"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>

                    <button
                        type="button"
                        className="action-button action-button--theme text-theme-header"
                        onClick={handleSafeClose}
                    >
                        Done
                    </button>
                </div>

                {/* Tag Builder Modal Sub-dialog */}
                {showTagBuilder && (
                    <TagBuilderModal targetId={item.id} targetType="item" onClose={() => setShowTagBuilder(false)} />
                )}

                {/* Delete Confirmation Modal Sub-dialog */}
                {showDeleteConfirm && (
                    <div className="item-edit-modal__delete-dialog-overlay" onClick={() => setShowDeleteConfirm(false)}>
                        <div className="item-edit-modal__delete-dialog" onClick={(e) => e.stopPropagation()}>
                            <h3
                                className="item-edit-modal__delete-title text-title-primary"
                                style={{ color: 'var(--semantic-danger)' }}
                            >
                                <AlertTriangle size={18} /> Confirm Deletion
                            </h3>
                            <p
                                className="item-edit-modal__delete-text text-subtext"
                                style={{ color: 'var(--text-main)' }}
                            >
                                Are you sure you want to delete &ldquo;{item.name || 'this item'}&rdquo;?
                            </p>
                            <div className="item-edit-modal__delete-actions">
                                <button
                                    type="button"
                                    className="action-button action-button--dark text-theme-header"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    <XCircle size={15} /> Cancel
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--red text-theme-header"
                                    onClick={() => {
                                        if (item.imageUrl && item.imageUrl.startsWith('local-img:')) {
                                            imageManager.deleteImage(item.imageUrl).catch(() => {});
                                        }
                                        removeInventoryItem(item.id);
                                        onClose();
                                    }}
                                >
                                    <Trash2 size={15} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showTagBuilder && (
                    <TagBuilderModal
                        targetId={item.id}
                        targetType="item"
                        initialTag={tagBuilderInitialTag}
                        onClose={() => {
                            setShowTagBuilder(false);
                            setTagBuilderInitialTag(undefined);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
