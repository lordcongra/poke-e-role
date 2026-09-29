import { useState, useMemo, useCallback } from 'react';
import { BookOpen, Bookmark, X, Palette, Settings } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { MoveDetailModal } from '../modals/moveLookup/MoveDetailModal';
import { fetchMoveData } from '../../utils/api/api';
import { LearnsetSection } from './learnset/LearnsetSection';
import { WishlistSection } from './learnset/WishlistSection';
import { useLearnsetTypeColors } from './learnset/useLearnsetTypeColors';
import { LearnsetTypeColorsModal } from './learnset/LearnsetTypeColorsModal';

interface MovesTableLearnsetProps {
    learnset: Array<{ Learned: string; Name: string }>;
}

export function MovesTableLearnset({ learnset = [] }: MovesTableLearnsetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isColorSettingsOpen, setIsColorSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'learnset' | 'wishlist'>('learnset');
    const [selectedMoveName, setSelectedMoveName] = useState<string | null>(null);
    const [addingMoves, setAddingMoves] = useState<Set<string>>(new Set());

    const {
        colorByType,
        toggleColorByType,
        getMoveTypeInfo,
        customColors,
        setTypeColorOverride,
        resetTypeColorOverride,
        resetAllTypeColors,
        visibleCustomTypes
    } = useLearnsetTypeColors();

    const characterMoves = useCharacterStore((state) => state.moves);
    const wishlist = useCharacterStore((state) => state.wishlist || []);
    const addToWishlist = useCharacterStore((state) => state.addToWishlist);
    const removeFromWishlist = useCharacterStore((state) => state.removeFromWishlist);
    const toggleWishlist = useCharacterStore((state) => state.toggleWishlist);

    const learnedSet = useMemo(
        () => new Set(characterMoves.map((m) => m.name.toLowerCase().trim()).filter(Boolean)),
        [characterMoves]
    );

    const wishlistSet = useMemo(() => new Set(wishlist.map((m) => m.toLowerCase().trim()).filter(Boolean)), [wishlist]);

    const handleQuickAdd = useCallback(
        async (moveName: string, e: React.MouseEvent) => {
            e.stopPropagation();
            if (learnedSet.has(moveName.toLowerCase().trim()) || addingMoves.has(moveName)) return;

            setAddingMoves((prev) => new Set(prev).add(moveName));
            try {
                const store = useCharacterStore.getState();
                const existingMoves = store.moves;

                // Find an empty move slot or create a new slot
                const emptySlot = existingMoves.find((m) => !m.name || m.name.trim() === '');
                let targetId: string;

                if (emptySlot) {
                    targetId = emptySlot.id;
                } else {
                    store.addMove();
                    const updatedMoves = useCharacterStore.getState().moves;
                    targetId = updatedMoves[updatedMoves.length - 1].id;
                }

                const fullData = await fetchMoveData(moveName);
                if (fullData) {
                    store.applyMoveData(targetId, fullData as Record<string, unknown>);
                } else {
                    store.updateMove(targetId, 'name', moveName);
                }
            } catch (err) {
                console.error('[MovesTableLearnset] Failed to quick-add move:', err);
            } finally {
                setAddingMoves((prev) => {
                    const next = new Set(prev);
                    next.delete(moveName);
                    return next;
                });
            }
        },
        [learnedSet, addingMoves]
    );

    const hasLearnset = learnset && learnset.length > 0;
    const hasWishlist = wishlist && wishlist.length > 0;

    // If neither learnset nor wishlist exists, hide section
    if (!hasLearnset && !hasWishlist) return null;

    return (
        <div className="moves-table__learnset-section">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="action-button action-button--dark moves-table__learnset-toggle-btn text-theme-header"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
                {hasLearnset ? (
                    <>
                        <BookOpen size={16} /> {isOpen ? 'Hide Learnset' : 'View Learnset'}
                    </>
                ) : (
                    <>
                        <Bookmark size={16} /> {isOpen ? 'Hide Move Wishlist' : 'View Move Wishlist'}
                    </>
                )}
            </button>

            {/* Expanded Container */}
            {isOpen && (
                <div
                    className="moves-table__learnset-container text-label"
                    style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}
                >
                    {/* Header Bar with Tabs, Color Toggle, and Close Button */}
                    <div className="moves-table__learnset-header-bar">
                        <div className="moves-table__learnset-tabs">
                            {hasLearnset && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('learnset')}
                                    className={`moves-table__learnset-tab-btn ${
                                        activeTab === 'learnset' ? 'moves-table__learnset-tab-btn--active' : ''
                                    }`}
                                >
                                    <BookOpen size={13} /> Learnset
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setActiveTab('wishlist')}
                                className={`moves-table__learnset-tab-btn ${
                                    activeTab === 'wishlist' ? 'moves-table__learnset-tab-btn--active' : ''
                                }`}
                            >
                                <Bookmark
                                    size={13}
                                    fill={wishlist.length > 0 ? '#f59e0b' : 'none'}
                                    color={wishlist.length > 0 ? '#f59e0b' : 'currentColor'}
                                />
                                <span>Wishlist</span>
                                {wishlist.length > 0 && (
                                    <span className="moves-table__learnset-tab-badge">{wishlist.length}</span>
                                )}
                            </button>
                        </div>

                        <div className="moves-table__learnset-header-actions">
                            <div className="moves-table__learnset-color-btn-group">
                                <button
                                    type="button"
                                    onClick={toggleColorByType}
                                    className={`moves-table__learnset-color-toggle-btn ${
                                        colorByType ? 'moves-table__learnset-color-toggle-btn--active' : ''
                                    }`}
                                    title={
                                        colorByType
                                            ? 'Displaying move-themed type colors (click to theme after Pokémon type)'
                                            : 'Displaying Pokémon type theme (click to show move type colors)'
                                    }
                                    aria-label="Toggle Move Type Colors"
                                >
                                    <Palette size={12} />
                                    <span>Type Colors</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsColorSettingsOpen(true)}
                                    className="moves-table__learnset-color-settings-btn"
                                    title="Configure Learnset Type Colors"
                                    aria-label="Configure Learnset Type Colors"
                                >
                                    <Settings size={12} />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="moves-table__learnset-close-icon-btn"
                                title="Close"
                                aria-label="Close"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Learnset Tab */}
                    {activeTab === 'learnset' && hasLearnset && (
                        <LearnsetSection
                            learnset={learnset}
                            learnedSet={learnedSet}
                            wishlistSet={wishlistSet}
                            addingMoves={addingMoves}
                            getMoveTypeInfo={getMoveTypeInfo}
                            onSelectMove={setSelectedMoveName}
                            onQuickAdd={handleQuickAdd}
                            onToggleWishlist={toggleWishlist}
                        />
                    )}

                    {/* Wishlist Tab */}
                    {activeTab === 'wishlist' && (
                        <WishlistSection
                            wishlist={wishlist}
                            learnedSet={learnedSet}
                            addingMoves={addingMoves}
                            getMoveTypeInfo={getMoveTypeInfo}
                            onSelectMove={setSelectedMoveName}
                            onQuickAdd={handleQuickAdd}
                            onToggleWishlist={toggleWishlist}
                            onRemoveWishlist={removeFromWishlist}
                            onAddCustomMove={addToWishlist}
                        />
                    )}
                </div>
            )}

            {selectedMoveName && (
                <MoveDetailModal moveName={selectedMoveName} onClose={() => setSelectedMoveName(null)} />
            )}

            {isColorSettingsOpen && (
                <LearnsetTypeColorsModal
                    isOpen={isColorSettingsOpen}
                    onClose={() => setIsColorSettingsOpen(false)}
                    customColors={customColors}
                    onSetColor={setTypeColorOverride}
                    onResetColor={resetTypeColorOverride}
                    onResetAll={resetAllTypeColors}
                    visibleCustomTypes={visibleCustomTypes}
                />
            )}
        </div>
    );
}
