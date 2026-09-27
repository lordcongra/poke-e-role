import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { lookupItemDetails } from '../../utils/itemLookupUtils';
import { imageManager } from '../../utils/imageManager';
import { useItemArt, setItemArt, getItemArt } from '../../utils/itemArtCatalog';
import type { InventoryItem } from '../../store/storeTypes';
import { NumberSpinner } from '../ui/NumberSpinner';
import { KNOWN_ITEMS } from '../../data/constants';
import { Info, Tag, ChevronUp, ChevronDown, X, Image as ImageIcon } from 'lucide-react';
import './InventoryTable.css';

interface InventoryItemRowProps {
    item: InventoryItem;
    handleInfoClick: (id: string, name: string, desc: string) => void;
    fetchingItems: Record<string, boolean>;
    setTagBuilderData: (d: {
        id: string;
        type: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
    }) => void;
    setDeleteItemId: (id: string) => void;
    onEditItem?: (id: string) => void;
}

export function InventoryItemRow({
    item,
    handleInfoClick,
    fetchingItems,
    setTagBuilderData,
    setDeleteItemId,
    onEditItem
}: InventoryItemRowProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const moveUpInventoryItem = useCharacterStore((state) => state.moveUpInventoryItem);
    const moveDownInventoryItem = useCharacterStore((state) => state.moveDownInventoryItem);

    const [localName, setLocalName] = useState(item.name);
    const [resolvedImg, setResolvedImg] = useState<string | null>(null);

    const knownArt = useItemArt(item.name || localName);
    const effectiveImageUrl =
        item.imageUrl && item.imageUrl !== 'none' ? item.imageUrl : item.imageUrl !== 'none' ? knownArt : undefined;

    // Automatically adopt known artwork if item has no image and art is discovered
    useEffect(() => {
        if (!item.imageUrl && item.imageUrl !== 'none' && knownArt) {
            updateInventoryItem(item.id, 'imageUrl', knownArt);
        }
    }, [item.id, item.imageUrl, knownArt, updateInventoryItem]);

    useEffect(() => {
        let isMounted = true;
        let createdBlobUrl: string | null = null;

        if (effectiveImageUrl && effectiveImageUrl !== 'none') {
            imageManager.getImageUrl(effectiveImageUrl).then((url) => {
                if (isMounted) {
                    setResolvedImg(url);
                    if (url && url.startsWith('blob:')) {
                        createdBlobUrl = url;
                    }
                }
            });
        } else {
            setResolvedImg(null);
        }

        return () => {
            isMounted = false;
            if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
        };
    }, [effectiveImageUrl]);

    const [prevName, setPrevName] = useState(item.name);
    if (prevName !== item.name) {
        setPrevName(item.name);
        setLocalName(item.name);
    }

    const handleApplyItemLookup = async (nameQuery: string, forceOverwrite = false) => {
        const query = nameQuery.trim();
        if (!query) return;

        try {
            const result = await lookupItemDetails(query);
            if (result) {
                if (result.name && result.name !== item.name) {
                    updateInventoryItem(item.id, 'name', result.name);
                    setLocalName(result.name);
                }
                if (result.fullDescription) {
                    if (forceOverwrite || !item.desc.trim()) {
                        useCharacterStore.getState().updateInventoryItem(item.id, 'desc', result.fullDescription);
                    }
                }
                const targetImg = result.imageUrl || getItemArt(result.name) || getItemArt(query);
                if (targetImg && (!item.imageUrl || item.imageUrl === 'none')) {
                    useCharacterStore.getState().updateInventoryItem(item.id, 'imageUrl', targetImg);
                }
            }
        } catch (e) {
            console.error('[InventoryItemRow] Failed to lookup item info:', e);
        }
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.target.value;
        setLocalName(val);

        if (val.trim() && item.imageUrl && item.imageUrl !== 'none') {
            setItemArt(val.trim(), item.imageUrl);
        }

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

    const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.currentTarget.blur();
        }
    };

    return (
        <tr className="data-table__row--dynamic">
            <td className="data-table__cell--middle">
                <input
                    type="checkbox"
                    className="inventory-item__checkbox"
                    checked={item.active}
                    onChange={(event) => updateInventoryItem(item.id, 'active', event.target.checked)}
                />
            </td>
            <td className="data-table__cell--middle">
                <div className="inventory-item__qty-container">
                    <NumberSpinner
                        value={item.qty}
                        onChange={(value: number) => updateInventoryItem(item.id, 'qty', value)}
                        min={0}
                    />
                </div>
            </td>
            <td className="data-table__cell--middle inventory-item__name-cell">
                <div className="inventory-item__name-container">
                    <button
                        type="button"
                        className="inventory-item__thumb-btn"
                        onClick={() => onEditItem?.(item.id)}
                        title={effectiveImageUrl ? 'Item Artwork (Click to edit)' : 'Add Item Artwork'}
                        aria-label="Item image"
                    >
                        {resolvedImg ? (
                            <img src={resolvedImg} alt={item.name} className="inventory-item__thumb-img" />
                        ) : (
                            <ImageIcon size={13} className="inventory-item__thumb-placeholder" />
                        )}
                    </button>
                    <input
                        type="text"
                        list="item-list"
                        className="identity-grid__input inventory-item__name-input text-label"
                        style={{ color: 'var(--text-main)' }}
                        value={localName}
                        onChange={handleNameChange}
                        onBlur={handleNameBlur}
                        onKeyDown={handleNameKeyDown}
                        placeholder="Item Name"
                    />
                    <button
                        type="button"
                        className="action-button action-button--ghost inventory-item__icon-btn inventory-item__icon-btn--info"
                        onClick={() => handleInfoClick(item.id, item.name, item.desc)}
                        disabled={fetchingItems[item.id]}
                        title="View Details"
                    >
                        <Info size={14} />
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--ghost inventory-item__icon-btn inventory-item__icon-btn--tag"
                        onClick={() => setTagBuilderData({ id: item.id, type: 'item' })}
                        title="Add Smart Tags"
                    >
                        <Tag size={14} />
                    </button>
                </div>
            </td>
            <td className="data-table__cell--middle inventory-item__desc-cell">
                <textarea
                    className="identity-grid__input form-input--item-desc inventory-item__desc-input text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    value={item.desc}
                    onChange={(event) => updateInventoryItem(item.id, 'desc', event.target.value)}
                    placeholder="Effect / Notes..."
                    rows={2}
                />
            </td>
            <td className="data-table__cell--middle">
                <div className="inventory-item__sort-container">
                    <button
                        type="button"
                        onClick={() => moveUpInventoryItem(item.id)}
                        className="action-button action-button--sort inventory-item__sort-btn text-label"
                        title="Move Up"
                        aria-label="Move Up"
                    >
                        <ChevronUp size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => moveDownInventoryItem(item.id)}
                        className="action-button action-button--sort inventory-item__sort-btn text-label"
                        title="Move Down"
                        aria-label="Move Down"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>
            </td>
            <td className="data-table__cell--middle">
                <button
                    type="button"
                    onClick={() => setDeleteItemId(item.id)}
                    className="action-button action-button--dark inventory-item__delete-btn text-theme-header"
                    title="Delete Item"
                    aria-label="Delete Item"
                >
                    <X size={15} />
                </button>
            </td>
        </tr>
    );
}
