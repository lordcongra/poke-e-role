import { memo } from 'react';
import { Bookmark, Check, Plus, Loader2, X } from 'lucide-react';

interface LearnsetPillProps {
    moveName: string;
    isLearned: boolean;
    isWishlisted: boolean;
    isAdding: boolean;
    showRemoveWishlist?: boolean;
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
    onSelectMove,
    onQuickAdd,
    onToggleWishlist,
    onRemoveWishlist
}: LearnsetPillProps) {
    return (
        <div
            className={`moves-table__learnset-pill text-subtext ${
                isLearned ? 'moves-table__learnset-pill--learned' : ''
            } ${isWishlisted ? 'moves-table__learnset-pill--wishlisted' : ''}`}
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
                    isLearned
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
