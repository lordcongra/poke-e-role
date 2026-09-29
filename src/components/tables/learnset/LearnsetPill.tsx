import { memo } from 'react';
import { Bookmark, Check, Plus, Loader2, X } from 'lucide-react';

import type { MoveTypeInfo } from './useLearnsetTypeColors';

interface LearnsetPillProps {
    moveName: string;
    isLearned: boolean;
    isWishlisted: boolean;
    isAdding: boolean;
    showRemoveWishlist?: boolean;
    typeInfo?: MoveTypeInfo;
    onSelectMove: (moveName: string) => void;
    onQuickAdd: (moveName: string, e: React.MouseEvent) => void;
    onToggleWishlist: (moveName: string) => void;
    onRemoveWishlist?: (moveName: string) => void;
}

export const LearnsetPill = memo(function LearnsetPill({
    moveName,
    isLearned,
    isWishlisted,
    isAdding,
    showRemoveWishlist = false,
    typeInfo,
    onSelectMove,
    onQuickAdd,
    onToggleWishlist,
    onRemoveWishlist
}: LearnsetPillProps) {
    const pillStyle: React.CSSProperties | undefined = typeInfo?.color
        ? {
              borderColor: `color-mix(in srgb, ${typeInfo.color} ${isLearned ? '75%' : '55%'}, var(--border, rgba(255, 255, 255, 0.15)))`,
              backgroundColor: isLearned
                  ? `color-mix(in srgb, ${typeInfo.color} 24%, var(--label-bg))`
                  : `color-mix(in srgb, ${typeInfo.color} 12%, var(--label-bg))`,
              ['--move-type-color' as string]: typeInfo.color
          }
        : undefined;

    return (
        <div
            className={`moves-table__learnset-pill text-subtext ${
                isLearned ? 'moves-table__learnset-pill--learned' : ''
            } ${isWishlisted ? 'moves-table__learnset-pill--wishlisted' : ''}`}
            style={pillStyle}
        >
            {/* Wishlist Bookmark Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleWishlist(moveName);
                }}
                className={`moves-table__learnset-wishlist-btn ${
                    isWishlisted ? 'moves-table__learnset-wishlist-btn--active' : ''
                }`}
                title={isWishlisted ? `Remove ${moveName} from wishlist` : `Add ${moveName} to wishlist`}
                aria-label={isWishlisted ? `Remove ${moveName} from wishlist` : `Add ${moveName} to wishlist`}
            >
                <Bookmark
                    size={11}
                    fill={isWishlisted ? '#f59e0b' : 'none'}
                    color={isWishlisted ? '#f59e0b' : 'currentColor'}
                />
            </button>

            {/* Move Name Button */}
            <button
                type="button"
                onClick={() => onSelectMove(moveName)}
                className="moves-table__learnset-name-btn"
                title={
                    typeInfo?.type
                        ? isLearned
                            ? `${moveName} (${typeInfo.type}) (Learned) - Click to view details`
                            : `${moveName} (${typeInfo.type}) - Click to view details & options`
                        : isLearned
                          ? `${moveName} (Learned) - Click to view details`
                          : `Click to view ${moveName} details & options`
                }
            >
                {isLearned && <Check size={11} className="moves-table__learnset-pill-icon" />}
                <span>{moveName}</span>
            </button>

            {/* Quick Learn/Add Button */}
            {!isLearned && (
                <button
                    type="button"
                    onClick={(e) => onQuickAdd(moveName, e)}
                    className="moves-table__learnset-add-btn"
                    disabled={isAdding}
                    title={`Learn ${moveName} (Add to move slots)`}
                    aria-label={`Learn ${moveName}`}
                >
                    {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                </button>
            )}

            {/* Optional Remove from Wishlist 'X' Button */}
            {showRemoveWishlist && onRemoveWishlist && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWishlist(moveName);
                    }}
                    className="moves-table__learnset-remove-wishlist-btn"
                    title={`Remove ${moveName} from wishlist`}
                    aria-label={`Remove ${moveName} from wishlist`}
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
});
