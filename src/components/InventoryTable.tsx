import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { fetchItemData } from '../utils/api';
import { KNOWN_ITEMS } from '../data/constants';
import { TagBuilderModal } from './TagBuilderModal';
import { TooltipIcon } from './TooltipIcon';
import { CollapsingSection } from './CollapsingSection';
import { InventoryItemRow } from './InventoryItemRow';
import { ItemInfoModal } from './ItemInfoModal';
import { SmartTagsGuideModal } from './SmartTagsGuideModal';
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
            {activeCount > 1 && <div className="inventory-table__warning">⚠️ Multiple items active</div>}
            <div className="inventory-table__currency-container">
                <span className="inventory-table__currency-tp" title="Training Points">
                    TP:{' '}
                    <input
                        type="number"
                        value={trainingPoints}
                        onChange={(event) => setTrainingPoints(Number(event.target.value) || 0)}
                        className="no-spinners inventory-table__currency-input inventory-table__currency-input--tp"
                    />
                </span>
                <span className="inventory-table__currency-pd">
                    PD:{' '}
                    <input
                        type="number"
                        value={pokedollars}
                        onChange={(event) => setPokedollars(Number(event.target.value) || 0)}
                        className="no-spinners inventory-table__currency-input"
                    />
                </span>
            </div>
        </>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <datalist id="item-list">
                {[...KNOWN_ITEMS.map((item) => item.name), ...customItemNames].map((itemName) => (
                    <option key={itemName} value={itemName} />
                ))}
            </datalist>

            <CollapsingSection title="BAG" headerElements={bagHeaderElements}>
                <div className="table-responsive-wrapper">
                    <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
                        <thead>
                            <tr className="inventory-table__header-row">
                                <th className="inventory-table__header-cell-check" title="Equipped?">
                                    ✔
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
                    className="action-button action-button--dark"
                    style={{ width: '100%', marginTop: '4px' }}
                >
                    + Add Item
                </button>
            </CollapsingSection>

            <CollapsingSection title="NOTES">
                <textarea
                    className="inventory-table__notes-area"
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
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1200,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '300px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#C62828', marginTop: 0, fontSize: '1.1rem' }}>⚠️ Confirm Deletion</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            Are you sure you want to delete this Item?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setDeleteItemId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => {
                                    removeInventoryItem(deleteItemId);
                                    setDeleteItemId(null);
                                }}
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
