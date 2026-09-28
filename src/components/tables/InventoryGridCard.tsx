import { useState, useEffect, memo } from 'react';
import type { InventoryItem } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { imageManager } from '../../utils/graphics/imageManager';
import { useItemArt } from '../../utils/graphics/itemArtCatalog';
import { Check, Package, X } from 'lucide-react';
import './InventoryGridCard.css';

interface InventoryGridCardProps {
    item: InventoryItem;
    size?: 'sm' | 'md' | 'lg';
    onClick: () => void;
    onDelete?: () => void;
}

export const InventoryGridCard = memo(function InventoryGridCard({
    item,
    size = 'sm',
    onClick,
    onDelete
}: InventoryGridCardProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const [resolvedImg, setResolvedImg] = useState<string | null>(null);

    const knownArt = useItemArt(item.name);
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
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [effectiveImageUrl]);

    return (
        <div
            className={`inventory-grid-card inventory-grid-card--${size} ${item.active ? 'inventory-grid-card--active' : ''}`}
            onClick={onClick}
            title={`${item.name || 'Unnamed Item'}\n(Click to view & edit details)`}
        >
            {/* Top Bar: Equip Toggle & Quantity / Delete */}
            <div className="inventory-grid-card__top-bar">
                <button
                    type="button"
                    className={`inventory-grid-card__equip-btn ${
                        item.active ? 'inventory-grid-card__equip-btn--active' : ''
                    }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        updateInventoryItem(item.id, 'active', !item.active);
                    }}
                    title={item.active ? 'Equipped item (Click to unequip)' : 'Unequipped item (Click to equip)'}
                    aria-label={item.active ? 'Unequip' : 'Equip'}
                >
                    <Check size={12} style={{ opacity: item.active ? 1 : 0.4 }} />
                </button>

                <div className="inventory-grid-card__top-right">
                    <span className="inventory-grid-card__qty-badge">x{item.qty}</span>
                    {onDelete && (
                        <button
                            type="button"
                            className="inventory-grid-card__delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            title="Delete Item"
                            aria-label="Delete Item"
                        >
                            <X size={11} />
                        </button>
                    )}
                </div>
            </div>

            {/* Image / Artwork */}
            <div className="inventory-grid-card__image-container">
                {resolvedImg ? (
                    <img src={resolvedImg} alt={item.name || 'Item'} className="inventory-grid-card__img" />
                ) : (
                    <Package size={34} className="inventory-grid-card__placeholder-icon" />
                )}
            </div>

            {/* Name */}
            <span className="inventory-grid-card__name text-label">{item.name || 'Unnamed Item'}</span>
        </div>
    );
});
