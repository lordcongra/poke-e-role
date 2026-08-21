import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchItemData } from '../../utils/api';
import { KNOWN_ITEMS } from '../../data/constants';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import { TooltipIcon } from '../ui/TooltipIcon';
import { CollapsingSection } from '../ui/CollapsingSection';
import { InventoryItemRow } from './InventoryItemRow';
import { ItemInfoModal } from '../modals/ItemInfoModal';
import { SmartTagsGuideModal } from '../modals/SmartTagsGuideModal';
import { AlertTriangle, Plus, Check, Trash2, XCircle } from 'lucide-react';
import './InventoryTable.css';

export function InventoryTable() {
    const role = useCharacterStore((state) => state.role);
    const inventory = useCharacterStore((state) => state.inventory);
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);

    const addInventoryItem = useCharacterStore((state) => state.addInventoryItem);
    const removeInventoryItem = useCharacterStore((state) => state.removeInventoryItem);

    const notes = useCharacterStore((state) => state.notes);
    const setNotes = useCharacterStore((state) => state.setNotes);

    const trainingPoints = useCharacterStore((state) => state.tp);
    const pokedollars = useCharacterStore((state) => state.currency);
    const setTrainingPoints = useCharacterStore((state) => state.setTp);
    const setPokedollars = useCharacterStore((state) => state.setCurrency);

    const [infoModal, setInfoModal] = useState<{ title: string; desc: string } | null>(null);
    const [tagBuilderData, setTagBuilderData] = useState<{
        id: string;
        type: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
    } | null>(null);
    const [fetchingItems, setFetchingItems] = useState<Record<string, boolean>>({});

    const [showTagsGuide, setShowTagsGuide] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

    const activeCount = inventory.filter((item) => item.active).length;
    const customItemNames = roomCustomItems.filter((item) => role === 'GM' || !item.gmOnly).map((item) => item.name);

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

    const bagHeaderElements = (
        <>
            <TooltipIcon onClick={() => setShowTagsGuide(true)} />
            {activeCount > 1 && (
                <div
                    className="inventory-table__warning text-label"
                    style={{
                        color: 'var(--semantic-danger)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <AlertTriangle size={14} color="var(--semantic-danger)" /> Multiple items active
                </div>
            )}
            <div className="inventory-table__currency-container">
                <span
                    className="inventory-table__currency-tp text-label"
                    style={{ color: 'var(--secondary)' }}
                    title="Training Points"
                >
                    TP:{' '}
                    <input
                        type="number"
                        value={trainingPoints}
                        onChange={(event) => setTrainingPoints(Number(event.target.value) || 0)}
                        className="no-spinners inventory-table__currency-input inventory-table__currency-input--tp text-subtext"
                        style={{ color: 'var(--text-main)' }}
                    />
                </span>
                <span className="inventory-table__currency-pd text-label" style={{ color: 'var(--primary)' }}>
                    PD:{' '}
                    <input
                        type="number"
                        value={pokedollars}
                        onChange={(event) => setPokedollars(Number(event.target.value) || 0)}
                        className="no-spinners inventory-table__currency-input text-subtext"
                        style={{ color: 'var(--text-main)' }}
                    />
                </span>
            </div>
        </>
    );

    return (
        <div className="inventory-table__container">
            <datalist id="item-list">
                {[...KNOWN_ITEMS.map((item) => item.name), ...customItemNames].map((itemName) => (
                    <option key={itemName} value={itemName} />
                ))}
            </datalist>

            <CollapsingSection title="BAG" headerElements={bagHeaderElements}>
                <div className="table-responsive-wrapper">
                    <table className="data-table inventory-table__table">
                        <thead>
                            <tr className="inventory-table__header-row text-theme-header">
                                <th className="inventory-table__header-cell-check" title="Equipped?">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            {inventory.map((item) => (
                                <InventoryItemRow
                                    key={item.id}
                                    item={item}
                                    handleInfoClick={handleInfoClick}
                                    fetchingItems={fetchingItems}
                                    setTagBuilderData={setTagBuilderData}
                                    setDeleteItemId={setDeleteItemId}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={addInventoryItem}
                    className="action-button action-button--theme inventory-table__add-btn text-theme-header"
                >
                    <Plus size={16} /> Add Item
                </button>
            </CollapsingSection>

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
                    onClose={() => setTagBuilderData(null)}
                />
            )}

            {infoModal && <ItemInfoModal infoModal={infoModal} onClose={() => setInfoModal(null)} />}

            {showTagsGuide && <SmartTagsGuideModal onClose={() => setShowTagsGuide(false)} />}

            {deleteItemId && (
                <div className="inventory-table__modal-overlay">
                    <div className="inventory-table__modal-content">
                        <h3
                            className="inventory-table__modal-title modal-title-with-icon text-title-primary"
                            style={{ color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p
                            className="inventory-table__modal-text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}
                        >
                            Are you sure you want to delete this Item?
                        </p>
                        <div className="inventory-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark inventory-table__modal-btn text-theme-header"
                                onClick={() => setDeleteItemId(null)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red inventory-table__modal-btn text-theme-header"
                                onClick={() => {
                                    removeInventoryItem(deleteItemId);
                                    setDeleteItemId(null);
                                }}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
