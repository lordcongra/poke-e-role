import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchItemData, loadLocalDataset, ALL_ITEMS } from '../../utils/api/api';
import { KNOWN_ITEMS } from '../../data/constants';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { CollapsingSection } from '../ui/CollapsingSection';
import { InventoryItemRow } from './InventoryItemRow';
import { InventoryCard } from './InventoryCard';
import { InventoryGridCard } from './InventoryGridCard';
import { ItemInfoModal } from '../modals/items/ItemInfoModal';
import { ItemEditModal } from '../modals/items/ItemEditModal';
import { SmartTagsGuideModal } from '../modals/items/SmartTagsGuideModal';
import { ItemTargetPromptModal } from '../modals/items/ItemTargetPromptModal';
import { ItemStatChoiceModal } from '../modals/items/ItemStatChoiceModal';
import { ItemDeleteConfirmModal } from './ItemDeleteConfirmModal';
import { InventoryFilterBar, isItemInInventoryCategory, type InventoryCategoryFilter } from './InventoryFilterBar';
import { InventoryHeaderActions } from './InventoryHeaderActions';
import { useInventoryItemUsage } from './useInventoryItemUsage';
import { Plus, Package, Check, Search } from 'lucide-react';
import { PassivesTable } from './PassivesTable';
import './InventoryTable.css';

export function InventoryTable() {
    const role = useCharacterStore((state) => state.role);
    const inventory = useCharacterStore((state) => state.inventory);
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);

    const addInventoryItem = useCharacterStore((state) => state.addInventoryItem);
    const removeInventoryItem = useCharacterStore((state) => state.removeInventoryItem);

    const {
        targetPrompt,
        setTargetPrompt,
        statChoicePrompt,
        setStatChoicePrompt,
        handleUseItem,
        handleSelectTarget,
        handleConfirmStatChoice
    } = useInventoryItemUsage();

    const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState<boolean>(() => {
        try {
            const stored = localStorage.getItem('pkr_bag_show_filters');
            return stored !== null ? stored === 'true' : true;
        } catch {
            return true;
        }
    });

    const handleToggleFilters = () => {
        setShowFilters((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('pkr_bag_show_filters', String(next));
            } catch {}
            return next;
        });
    };

    const notes = useCharacterStore((state) => state.notes);
    const setNotes = useCharacterStore((state) => state.setNotes);

    const trainingPoints = useCharacterStore((state) => state.tp);
    const pokedollars = useCharacterStore((state) => state.currency);
    const setTrainingPoints = useCharacterStore((state) => state.setTp);
    const setPokedollars = useCharacterStore((state) => state.setCurrency);

    const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
        try {
            return (localStorage.getItem('pkr_bag_view_mode') as 'list' | 'card') || 'list';
        } catch {
            return 'list';
        }
    });

    const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>(() => {
        try {
            return (localStorage.getItem('pkr_bag_card_size') as 'sm' | 'md' | 'lg') || 'sm';
        } catch {
            return 'sm';
        }
    });

    const handleSetCardSize = (size: 'sm' | 'md' | 'lg') => {
        setCardSize(size);
        try {
            localStorage.setItem('pkr_bag_card_size', size);
        } catch {}
    };

    const handleSetViewMode = (mode: 'list' | 'card') => {
        setViewMode(mode);
        try {
            localStorage.setItem('pkr_bag_view_mode', mode);
        } catch {}
    };

    const [allKnownItems, setAllKnownItems] = useState<string[]>(() => KNOWN_ITEMS.map((item) => item.name));

    useEffect(() => {
        loadLocalDataset().then(() => {
            const combined = Array.from(new Set([...ALL_ITEMS, ...KNOWN_ITEMS.map((item) => item.name)])).sort();
            setAllKnownItems(combined);
        });
    }, []);

    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    const [infoModal, setInfoModal] = useState<{ title: string; desc: string } | null>(null);
    const [tagBuilderData, setTagBuilderData] = useState<{
        id: string;
        type: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
        initialTag?: string;
    } | null>(null);
    const [fetchingItems, setFetchingItems] = useState<Record<string, boolean>>({});

    const [showTagsGuide, setShowTagsGuide] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

    const activeCount = inventory.filter((item) => item.active).length;
    const customItemNames = roomCustomItems
        .filter((item) => isStandaloneMode || role === 'GM' || !item.gmOnly)
        .map((item) => item.name);

    const handleInfoClick = async (id: string, name: string, descriptionFallback: string) => {
        if (!name) {
            setInfoModal({ title: 'Unknown Item', desc: descriptionFallback || 'No description listed.' });
            return;
        }
        setFetchingItems((previous) => ({ ...previous, [id]: true }));
        setInfoModal({ title: name, desc: 'Loading...' });

        const data = await fetchItemData(name);
        if (data) {
            setInfoModal({
                title: name,
                desc: String(data.Description || data.Effect || descriptionFallback || 'No description found.')
            });
        } else {
            setInfoModal({ title: name, desc: descriptionFallback || 'No description found.' });
        }
        setFetchingItems((previous) => ({ ...previous, [id]: false }));
    };

    const filteredInventory = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return inventory.filter((item) => {
            if (!isItemInInventoryCategory(item, selectedCategory, roomCustomItems)) {
                return false;
            }
            if (!query) return true;
            const name = (item.name || '').toLowerCase();
            const desc = (item.desc || '').toLowerCase();
            const tags = (item.tags || '').toLowerCase();
            return name.includes(query) || desc.includes(query) || tags.includes(query);
        });
    }, [inventory, selectedCategory, roomCustomItems, searchQuery]);

    return (
        <div className="inventory-table__container">
            <datalist id="item-list">
                {Array.from(new Set([...allKnownItems, ...customItemNames]))
                    .sort()
                    .map((itemName) => (
                        <option key={itemName} value={itemName} />
                    ))}
            </datalist>

            <CollapsingSection
                title="BAG"
                headerElements={
                    <InventoryHeaderActions
                        viewMode={viewMode}
                        onSetViewMode={handleSetViewMode}
                        cardSize={cardSize}
                        onSetCardSize={handleSetCardSize}
                        onShowTagsGuide={() => setShowTagsGuide(true)}
                        activeCount={activeCount}
                        trainingPoints={trainingPoints}
                        pokedollars={pokedollars}
                        onSetTrainingPoints={setTrainingPoints}
                        onSetPokedollars={setPokedollars}
                        showFilters={showFilters}
                        onToggleFilters={handleToggleFilters}
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                    />
                }
            >
                {showFilters && (
                    <InventoryFilterBar
                        inventory={inventory}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        customItems={roomCustomItems}
                    />
                )}

                {filteredInventory.length === 0 ? (
                    <div className="inventory-table__empty-state">
                        {searchQuery.trim() ? (
                            <>
                                <Search size={32} style={{ opacity: 0.5 }} />
                                <span className="text-subtext">No items found matching "{searchQuery.trim()}".</span>
                                <button
                                    type="button"
                                    className="action-button action-button--secondary text-subtext"
                                    onClick={() => setSearchQuery('')}
                                    style={{ marginTop: '4px', padding: '4px 12px', fontSize: '0.78rem' }}
                                >
                                    Clear Search
                                </button>
                            </>
                        ) : (
                            <>
                                <Package size={32} style={{ opacity: 0.5 }} />
                                <span className="text-subtext">
                                    {inventory.length === 0
                                        ? 'No items in your bag yet.'
                                        : 'No items match this category.'}
                                </span>
                            </>
                        )}
                    </div>
                ) : viewMode === 'card' ? (
                    <div className={`inventory-table__grid-container inventory-table__grid-container--${cardSize}`}>
                        {filteredInventory.map((item) => (
                            <InventoryGridCard
                                key={item.id}
                                item={item}
                                size={cardSize}
                                onClick={() => setEditingItemId(item.id)}
                                onDelete={() => setDeleteItemId(item.id)}
                                onUseItem={handleUseItem}
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="desktop-only-flex table-responsive-wrapper">
                            <table className="data-table inventory-table__table">
                                <thead>
                                    <tr className="inventory-table__header-row text-theme-header">
                                        <th className="inventory-table__header-cell-check" title="Equipped?">
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Check size={16} />
                                            </div>
                                        </th>
                                        <th className="inventory-table__header-cell-qty">Qty</th>
                                        <th className="inventory-table__header-cell-name">Item Name</th>
                                        <th>Effect / Notes</th>
                                        <th className="inventory-table__header-cell-sort">Sort</th>
                                        <th className="inventory-table__header-cell-del">Del</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.map((item) => (
                                        <InventoryItemRow
                                            key={item.id}
                                            item={item}
                                            handleInfoClick={handleInfoClick}
                                            fetchingItems={fetchingItems}
                                            setTagBuilderData={setTagBuilderData}
                                            setDeleteItemId={setDeleteItemId}
                                            onEditItem={setEditingItemId}
                                            onUseItem={handleUseItem}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mobile-only-flex inventory-table__mobile-card-container">
                            {filteredInventory.map((item) => (
                                <InventoryCard
                                    key={item.id}
                                    item={item}
                                    handleInfoClick={handleInfoClick}
                                    fetchingItems={fetchingItems}
                                    setTagBuilderData={setTagBuilderData}
                                    setDeleteItemId={setDeleteItemId}
                                    onEditItem={setEditingItemId}
                                    onUseItem={handleUseItem}
                                />
                            ))}
                        </div>
                    </>
                )}

                <button
                    type="button"
                    onClick={addInventoryItem}
                    className="action-button action-button--theme inventory-table__add-btn text-theme-header"
                >
                    <Plus size={16} /> Add Item
                </button>
            </CollapsingSection>

            <PassivesTable />

            <CollapsingSection title="NOTES">
                <textarea
                    className="inventory-table__notes-area text-subtext"
                    style={{ color: 'var(--text-main)' }}
                    placeholder="Add any extra notes, traits, or character backstory here..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                />
            </CollapsingSection>

            {tagBuilderData && (
                <TagBuilderModal
                    targetId={tagBuilderData.id}
                    targetType={tagBuilderData.type}
                    initialTag={tagBuilderData.initialTag}
                    onClose={() => setTagBuilderData(null)}
                />
            )}

            {infoModal && <ItemInfoModal infoModal={infoModal} onClose={() => setInfoModal(null)} />}

            {showTagsGuide && <SmartTagsGuideModal onClose={() => setShowTagsGuide(false)} />}

            {deleteItemId && (
                <ItemDeleteConfirmModal
                    item={inventory.find((i) => i.id === deleteItemId)}
                    onCancel={() => setDeleteItemId(null)}
                    onConfirm={() => {
                        removeInventoryItem(deleteItemId);
                        setDeleteItemId(null);
                    }}
                />
            )}

            {targetPrompt && (
                <ItemTargetPromptModal
                    item={targetPrompt.item}
                    candidates={targetPrompt.candidates}
                    onSelectTarget={handleSelectTarget}
                    onClose={() => setTargetPrompt(null)}
                />
            )}

            {statChoicePrompt && (
                <ItemStatChoiceModal
                    item={statChoicePrompt.item}
                    onSelectStat={handleConfirmStatChoice}
                    onClose={() => setStatChoicePrompt(null)}
                />
            )}

            {editingItemId && <ItemEditModal itemId={editingItemId} onClose={() => setEditingItemId(null)} />}
        </div>
    );
}
