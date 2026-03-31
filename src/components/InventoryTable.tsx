// src/components/InventoryTable.tsx
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { fetchItemData } from '../utils/api';
import type { InventoryItem } from '../store/storeTypes';
import { NumberSpinner } from './NumberSpinner';
import { TagBuilderModal } from './TagBuilderModal';

const HARDCODED_ITEMS = [
    'Air Balloon',
    'Amulet Coin',
    'Black Belt',
    'Black Glasses',
    'Bright Powder',
    'Charcoal',
    'Choice Band',
    'Choice Scarf',
    'Choice Specs',
    'Clear Amulet',
    'Destiny Knot',
    'Dragon Fang',
    'Eject Button',
    'Eviolite',
    'Expert Belt',
    'Fairy Wings',
    'Flame Orb',
    'Focus Sash',
    'Hard Stone',
    'Heavy-Duty Boots',
    'Iron Ball',
    "King's Rock",
    'Leek',
    'Leftovers',
    'Life Orb',
    'Light Ball',
    'Loaded Dice',
    'Lucky Punch',
    'Magnet',
    'Metal Coat',
    'Metronome',
    'Miracle Seed',
    'Muscle Band',
    'Mystic Water',
    'Never-Melt Ice',
    'Poison Barb',
    'Power Herb',
    'Power Increasers',
    'Protective Pads',
    'Quick Claw',
    'Razor Claw',
    'Razor Fang',
    'Red Card',
    'Ring Target',
    'Rocky Helmet',
    'Safety Goggles',
    'Sharp Beak',
    'Silk Scarf',
    'Silver Powder',
    'Soft Sand',
    'Spell Tag',
    'Sticky Barb',
    'Thick Club',
    'Throat Spray',
    'Toxic Orb',
    'Twisted Spoon',
    'Umbrella',
    'Weakness Policy',
    'White Herb',
    'Wide Lens',
    'Wise Glasses',
    'Zoom Lens'
];

const HARDCODED_TAGS: Record<string, string> = {
    'wide lens': '[Acc +2]',
    'zoom lens': '[Acc +2]',
    'life orb': '[Dmg +2] [Recoil]',
    'black belt': '[Dmg +1: Fighting]',
    'black glasses': '[Dmg +1: Dark]',
    charcoal: '[Dmg +1: Fire]',
    'dragon fang': '[Dmg +1: Dragon]',
    'fairy wings': '[Dmg +1: Fairy]',
    'hard stone': '[Dmg +1: Rock]',
    magnet: '[Dmg +1: Electric]',
    'metal coat': '[Dmg +1: Steel]',
    'miracle seed': '[Dmg +1: Grass]',
    'mystic water': '[Dmg +1: Water]',
    'never-melt ice': '[Dmg +1: Ice]',
    'poison barb': '[Dmg +1: Poison]',
    'sharp beak': '[Dmg +1: Flying]',
    'silk scarf': '[Dmg +1: Normal]',
    'silver powder': '[Dmg +1: Bug]',
    'soft sand': '[Dmg +1: Ground]',
    'spell tag': '[Dmg +1: Ghost]',
    'twisted spoon': '[Dmg +1: Psychic]',
    'razor claw': '[High Crit]',
    leek: '[High Crit]',
    'lucky punch': '[High Crit] [Str +2]',
    'sharp claw': '[High Crit]',
    'ring target': '[Remove Immunities]',
    eviolite: '[Def +1] [Spd +1]',
    metronome: '[Combo Dmg +1]',
    'loaded dice': '[Chance +2]',
    'choice scarf': '[Init +3]',
    'iron ball': '[Dex -1] [Remove Immunity: Ground]',
    'toxic orb': '[Status: Poison]',
    'flame orb': '[Status: 1st Degree Burn]',
    'air balloon': '[Immune: Ground]',
    'expert belt': '[Dmg +1: Super Effective]',
    'thick club': '[Str +2]',
    'light ball': '[Str +1] [Spe +1]',
    'quick claw': '[Init +2]',
    'muscle band': '[Dmg +1: Physical]',
    'wise glasses': '[Dmg +1: Special]'
};

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span
        onClick={onClick}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#555',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '11px',
            cursor: 'pointer',
            marginLeft: '6px',
            fontWeight: 'bold'
        }}
    >
        ?
    </span>
);

function InventoryItemRow({
    item,
    handleInfoClick,
    fetchingItems,
    setTagBuilderData,
    setDeleteItemId
}: {
    item: InventoryItem;
    handleInfoClick: (id: string, name: string, desc: string) => void;
    fetchingItems: Record<string, boolean>;
    setTagBuilderData: (d: {
        id: string;
        type: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
    }) => void;
    setDeleteItemId: (id: string) => void;
}) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const moveUpInventoryItem = useCharacterStore((state) => state.moveUpInventoryItem);
    const moveDownInventoryItem = useCharacterStore((state) => state.moveDownInventoryItem);

    const [localName, setLocalName] = useState(item.name);

    useEffect(() => {
        setLocalName(item.name);
    }, [item.name]);

    const handleNameBlur = async () => {
        const val = localName.trim();
        if (val !== item.name) {
            updateInventoryItem(item.id, 'name', val);

            const data = await fetchItemData(val);
            let newDesc = '';
            if (data && (data.Description || data.Effect)) {
                newDesc = String(data.Description || data.Effect || '').trim();
            }

            // AUDIT FIX: Read from the Hardcoded dictionary and append it to the new description!
            const hardcoded = HARDCODED_TAGS[val.toLowerCase()];
            if (hardcoded) newDesc = newDesc ? `${newDesc}\n\n${hardcoded}` : hardcoded;

            useCharacterStore.getState().updateInventoryItem(item.id, 'desc', newDesc);
        }
    };

    return (
        <tr className="data-table__row--dynamic">
            <td className="data-table__cell--top" style={{ paddingTop: '6px' }}>
                <input
                    type="checkbox"
                    style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                    checked={item.active}
                    onChange={(e) => updateInventoryItem(item.id, 'active', e.target.checked)}
                />
            </td>
            <td className="data-table__cell--top">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <NumberSpinner
                        value={item.qty}
                        onChange={(val) => updateInventoryItem(item.id, 'qty', val)}
                        min={0}
                    />
                </div>
            </td>
            <td className="data-table__cell--top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <input
                        type="text"
                        list="item-list"
                        className="identity-grid__input"
                        style={{ width: '100%' }}
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Item Name"
                    />
                    <button
                        className="action-button"
                        style={{ background: 'transparent', color: '#1976D2', padding: '0', fontSize: '1.1rem' }}
                        onClick={() => handleInfoClick(item.id, item.name, item.desc)}
                        disabled={fetchingItems[item.id]}
                    >
                        ❔
                    </button>
                    <button
                        className="action-button"
                        style={{
                            background: 'transparent',
                            color: 'var(--text-main)',
                            padding: '0',
                            fontSize: '1.1rem'
                        }}
                        onClick={() => setTagBuilderData({ id: item.id, type: 'item' })}
                    >
                        🏷️
                    </button>
                </div>
            </td>
            <td style={{ padding: '4px 2px' }}>
                <textarea
                    className="identity-grid__input form-input--item-desc"
                    style={{
                        width: '100%',
                        resize: 'vertical',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        padding: '4px',
                        minHeight: '30px'
                    }}
                    value={item.desc}
                    onChange={(e) => updateInventoryItem(item.id, 'desc', e.target.value)}
                    placeholder="Effect / Notes..."
                />
            </td>
            <td className="data-table__cell--top">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <button
                        onClick={() => moveUpInventoryItem(item.id)}
                        style={{ padding: '0 4px', fontSize: '0.6rem', cursor: 'pointer' }}
                    >
                        ▲
                    </button>
                    <button
                        onClick={() => moveDownInventoryItem(item.id)}
                        style={{ padding: '0 4px', fontSize: '0.6rem', cursor: 'pointer' }}
                    >
                        ▼
                    </button>
                </div>
            </td>
            <td className="data-table__cell--top">
                <button
                    onClick={() => setDeleteItemId(item.id)}
                    style={{
                        cursor: 'pointer',
                        background: '#C62828',
                        border: 'none',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px'
                    }}
                >
                    X
                </button>
            </td>
        </tr>
    );
}

export function InventoryTable() {
    const role = useCharacterStore((state) => state.role);
    const inventory = useCharacterStore((state) => state.inventory);
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);

    const addInventoryItem = useCharacterStore((state) => state.addInventoryItem);
    const removeInventoryItem = useCharacterStore((state) => state.removeInventoryItem);

    const notes = useCharacterStore((state) => state.notes);
    const setNotes = useCharacterStore((state) => state.setNotes);

    const tp = useCharacterStore((state) => state.tp);
    const currency = useCharacterStore((state) => state.currency);
    const setTp = useCharacterStore((state) => state.setTp);
    const setCurrency = useCharacterStore((state) => state.setCurrency);

    const [infoModal, setInfoModal] = useState<{ title: string; desc: string } | null>(null);
    const [tagBuilderData, setTagBuilderData] = useState<{
        id: string;
        type: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
    } | null>(null);
    const [fetchingItems, setFetchingItems] = useState<Record<string, boolean>>({});

    const [isInvCollapsed, setIsInvCollapsed] = useState(false);
    const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
    const [showTagsGuide, setShowTagsGuide] = useState(false);

    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

    const activeCount = inventory.filter((i) => i.active).length;
    const customItemNames = roomCustomItems.filter((i) => role === 'GM' || !i.gmOnly).map((i) => i.name);

    const handleInfoClick = async (id: string, name: string, descFallback: string) => {
        if (!name) {
            setInfoModal({ title: 'Unknown Item', desc: descFallback || 'No description listed.' });
            return;
        }
        setFetchingItems((prev) => ({ ...prev, [id]: true }));
        setInfoModal({ title: name, desc: 'Loading...' });

        const data = await fetchItemData(name);
        if (data) {
            setInfoModal({
                title: name,
                desc: String(data.Description || data.Effect || descFallback || 'No description found.')
            });
        } else {
            setInfoModal({ title: name, desc: descFallback || 'No description found.' });
        }
        setFetchingItems((prev) => ({ ...prev, [id]: false }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <datalist id="item-list">
                {[...HARDCODED_ITEMS, ...customItemNames].map((i) => (
                    <option key={i} value={i} />
                ))}
            </datalist>

            <div className="sheet-panel">
                <div className="sheet-panel__header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
                        <button
                            type="button"
                            className={`collapse-btn ${isInvCollapsed ? 'is-collapsed' : ''}`}
                            onClick={() => setIsInvCollapsed(!isInvCollapsed)}
                        >
                            ▼
                        </button>
                        BAG
                        <TooltipIcon onClick={() => setShowTagsGuide(true)} />
                    </span>

                    {activeCount > 1 && (
                        <div
                            style={{
                                color: '#d32f2f',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                flex: '1 1 auto',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            ⚠️ Multiple items active
                        </div>
                    )}

                    <div
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            flex: '1 1 auto',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap'
                        }}
                    >
                        <span style={{ color: '#d35400', whiteSpace: 'nowrap' }} title="Training Points">
                            TP:{' '}
                            <input
                                type="number"
                                value={tp}
                                onChange={(e) => setTp(Number(e.target.value) || 0)}
                                className="no-spinners"
                                style={{
                                    fontWeight: 'normal',
                                    width: '50px',
                                    textAlign: 'right',
                                    border: '1px solid var(--border)',
                                    borderRadius: '3px',
                                    padding: '2px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                        </span>
                        <span style={{ color: '#1a5e20', whiteSpace: 'nowrap' }}>
                            PD:{' '}
                            <input
                                type="number"
                                value={currency}
                                onChange={(e) => setCurrency(Number(e.target.value) || 0)}
                                className="no-spinners"
                                style={{
                                    fontWeight: 'normal',
                                    width: '60px',
                                    textAlign: 'right',
                                    border: '1px solid var(--border)',
                                    borderRadius: '3px',
                                    padding: '2px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                        </span>
                    </div>
                </div>

                {!isInvCollapsed && (
                    <div className="panel-content-wrapper">
                        <div className="table-responsive-wrapper">
                            <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#333', color: 'white' }}>
                                        <th style={{ width: '25px', textAlign: 'center' }} title="Equipped?">
                                            ✔
                                        </th>
                                        <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ width: '30%' }}>Item Name</th>
                                        <th>Effect / Notes</th>
                                        <th style={{ width: '30px', textAlign: 'center' }}>Sort</th>
                                        <th style={{ width: '30px', textAlign: 'center' }}>Del</th>
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
                            onClick={addInventoryItem}
                            className="action-button action-button--dark"
                            style={{ width: '100%', marginTop: '4px' }}
                        >
                            + Add Item
                        </button>
                    </div>
                )}
            </div>

            <div className="sheet-panel">
                <div className="sheet-panel__header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                            type="button"
                            className={`collapse-btn ${isNotesCollapsed ? 'is-collapsed' : ''}`}
                            onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                        >
                            ▼
                        </button>
                        NOTES
                    </span>
                </div>
                {!isNotesCollapsed && (
                    <div className="panel-content-wrapper">
                        <textarea
                            style={{
                                width: '100%',
                                height: '80px',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                padding: '4px',
                                fontFamily: 'inherit',
                                fontSize: '0.85rem',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                background: 'var(--input-bg)',
                                color: 'var(--text-main)'
                            }}
                            placeholder="Add any extra notes, traits, or character backstory here..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {tagBuilderData && (
                <TagBuilderModal
                    targetId={tagBuilderData.id}
                    targetType={tagBuilderData.type}
                    onClose={() => setTagBuilderData(null)}
                />
            )}

            {infoModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1100,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '15px',
                            borderRadius: '8px',
                            width: '300px',
                            border: '2px solid #C62828',
                            color: 'var(--text-main)'
                        }}
                    >
                        <h3
                            style={{
                                marginTop: 0,
                                color: '#C62828',
                                fontSize: '1.1rem',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '4px',
                                textAlign: 'center'
                            }}
                        >
                            {infoModal.title}
                        </h3>
                        <p
                            style={{
                                fontSize: '0.85rem',
                                marginBottom: '15px',
                                color: 'var(--text-muted)',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '250px',
                                overflowY: 'auto'
                            }}
                        >
                            {infoModal.desc}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="action-button action-button--dark"
                                style={{ width: '100%', padding: '6px' }}
                                onClick={() => setInfoModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTagsGuide && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 1000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontFamily: 'sans-serif'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '15px',
                            borderRadius: '8px',
                            width: '340px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                            border: '2px solid var(--primary)',
                            color: 'var(--text-main)'
                        }}
                    >
                        <h3
                            style={{
                                marginTop: 0,
                                color: 'var(--primary)',
                                fontSize: '1.1rem',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '4px',
                                textAlign: 'center'
                            }}
                        >
                            🏷️ Smart Tags Guide
                        </h3>
                        <p
                            style={{
                                fontSize: '0.8rem',
                                marginBottom: '10px',
                                color: 'var(--text-muted)',
                                textAlign: 'center'
                            }}
                        >
                            Type these exactly as shown (with brackets) into an equipped item's Name or Notes to
                            automatically apply mechanics.
                        </p>
                        <ul
                            style={{
                                fontSize: '0.8rem',
                                paddingLeft: '20px',
                                marginBottom: '15px',
                                lineHeight: '1.6',
                                color: 'var(--text-main)'
                            }}
                        >
                            <li>
                                <b>Stats/Skills:</b> <code>[Dex -2]</code>, <code>[Brawl +2]</code>,{' '}
                                <code>[Def +1]</code>, <code>[Spd +1]</code>
                            </li>
                            <li>
                                <b>Combat:</b> <code>[Dmg +1]</code>, <code>[Dmg +1: Physical]</code>,{' '}
                                <code>[Acc +1]</code>, <code>[Chance +2]</code>
                            </li>
                            <li>
                                <b>Matchups:</b> <code>[Immune: Ground]</code>, <code>[Remove Immunity: Type]</code>,{' '}
                                <code>[Remove Immunities]</code>
                            </li>
                            <li>
                                <b>Mechanics:</b> <code>[High Crit]</code>, <code>[Ignore Low Acc 2]</code>,{' '}
                                <code>[Status: Poison]</code>, <code>[Recoil]</code>
                            </li>
                        </ul>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setShowTagsGuide(false)}
                                className="action-button action-button--dark"
                                style={{ width: '100%', padding: '6px' }}
                            >
                                Close Guide
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
