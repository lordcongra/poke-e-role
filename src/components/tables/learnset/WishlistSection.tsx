import { useState } from 'react';
import { Bookmark, Plus } from 'lucide-react';
import { LearnsetPill } from './LearnsetPill';
import type { MoveTypeInfo } from './useLearnsetTypeColors';

interface WishlistSectionProps {
    wishlist: string[];
    learnedSet: Set<string>;
    addingMoves: Set<string>;
    getMoveTypeInfo?: (moveName: string) => MoveTypeInfo;
    onSelectMove: (moveName: string) => void;
    onQuickAdd: (moveName: string, e: React.MouseEvent) => void;
    onToggleWishlist: (moveName: string) => void;
    onRemoveWishlist: (moveName: string) => void;
    onAddCustomMove: (moveName: string) => void;
}

export function WishlistSection({
    wishlist,
    learnedSet,
    addingMoves,
    getMoveTypeInfo,
    onSelectMove,
    onQuickAdd,
    onToggleWishlist,
    onRemoveWishlist,
    onAddCustomMove
}: WishlistSectionProps) {
    const [customMoveInput, setCustomMoveInput] = useState('');

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = customMoveInput.trim();
        if (!trimmed) return;
        onAddCustomMove(trimmed);
        setCustomMoveInput('');
    };

    return (
        <div className="moves-table__wishlist-container">
            {/* Add TM / Tutor / Custom Move to Wishlist */}
            <form onSubmit={handleSubmit} className="moves-table__wishlist-add-bar">
                <input
                    type="text"
                    list="move-list"
                    value={customMoveInput}
                    onChange={(e) => setCustomMoveInput(e.target.value)}
                    placeholder="Add TM, Tutor, or Custom Move..."
                    className="moves-table__wishlist-input text-label"
                />
                <button
                    type="submit"
                    className="action-button action-button--theme moves-table__wishlist-add-submit-btn text-theme-header"
                    disabled={!customMoveInput.trim()}
                    title="Add to Wishlist"
                    aria-label="Add to Wishlist"
                >
                    <Plus size={14} />
                    <span className="moves-table__wishlist-add-text">Add</span>
                </button>
            </form>

            {wishlist.length === 0 ? (
                <div className="moves-table__wishlist-empty text-subtext">
                    <Bookmark size={24} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600 }}>Your Move Wishlist is currently empty.</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.75, maxWidth: '320px' }}>
                        Bookmark moves from your Learnset or type a TM / Tutor move above to keep track of moves you
                        plan to learn!
                    </div>
                </div>
            ) : (
                <div className="moves-table__learnset-moves-list">
                    {wishlist.map((moveName, index) => (
                        <LearnsetPill
                            key={`wishlist-${moveName}-${index}`}
                            moveName={moveName}
                            isLearned={learnedSet.has(moveName.toLowerCase().trim())}
                            isWishlisted={true}
                            isAdding={addingMoves.has(moveName)}
                            showRemoveWishlist={true}
                            typeInfo={getMoveTypeInfo?.(moveName)}
                            onSelectMove={onSelectMove}
                            onQuickAdd={onQuickAdd}
                            onToggleWishlist={onToggleWishlist}
                            onRemoveWishlist={onRemoveWishlist}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
