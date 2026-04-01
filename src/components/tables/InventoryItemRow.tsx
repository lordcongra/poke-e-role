import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchItemData } from '../../utils/api';
import type { InventoryItem } from '../../store/storeTypes';
import { NumberSpinner } from '../ui/NumberSpinner';
import { KNOWN_ITEMS } from '../../data/constants';

interface InventoryItemRowProps {
    item: InventoryItem;
    handleInfoClick: (id: string, name: string, desc: string) => void;
    fetchingItems: Record<string, boolean>;
    setTagBuilderData: (d: {
        id: string;
        type: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
    }) => void;
    setDeleteItemId: (id: string) => void;
}

export function InventoryItemRow({
    item,
    handleInfoClick,
    fetchingItems,
    setTagBuilderData,
    setDeleteItemId
}: InventoryItemRowProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const moveUpInventoryItem = useCharacterStore((state) => state.moveUpInventoryItem);
    const moveDownInventoryItem = useCharacterStore((state) => state.moveDownInventoryItem);

    const [localName, setLocalName] = useState(item.name);

    useEffect(() => {
        setLocalName(item.name);
    }, [item.name]);

    const handleNameBlur = async () => {
        const value = localName.trim();
        if (value !== item.name) {
            updateInventoryItem(item.id, 'name', value);

            const data = await fetchItemData(value);
            let newDescription = '';
            if (data && (data.Description || data.Effect)) {
                newDescription = String(data.Description || data.Effect || '').trim();
            }

            const knownItemMatch = KNOWN_ITEMS.find((known) => known.name.toLowerCase() === value.toLowerCase());

            const hardcodedTags = knownItemMatch?.tags;
            if (hardcodedTags) {
                newDescription = newDescription ? `${newDescription}\n\n${hardcodedTags}` : hardcodedTags;
            }

            useCharacterStore.getState().updateInventoryItem(item.id, 'desc', newDescription);
        }
    };

    return (
        <tr className="data-table__row--dynamic">
            <td className="data-table__cell--top" style={{ paddingTop: '6px' }}>
                <input
                    type="checkbox"
                    style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                    checked={item.active}
                    onChange={(event) => updateInventoryItem(item.id, 'active', event.target.checked)}
                />
            </td>
            <td className="data-table__cell--top">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <NumberSpinner
                        value={item.qty}
                        onChange={(value: number) => updateInventoryItem(item.id, 'qty', value)}
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
                        onChange={(event) => setLocalName(event.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Item Name"
                    />
                    <button
                        type="button"
                        className="action-button"
                        style={{ background: 'transparent', color: '#1976D2', padding: '0', fontSize: '1.1rem' }}
                        onClick={() => handleInfoClick(item.id, item.name, item.desc)}
                        disabled={fetchingItems[item.id]}
                    >
                        ❔
                    </button>
                    <button
                        type="button"
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
                    onChange={(event) => updateInventoryItem(item.id, 'desc', event.target.value)}
                    placeholder="Effect / Notes..."
                />
            </td>
            <td className="data-table__cell--top">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <button
                        type="button"
                        onClick={() => moveUpInventoryItem(item.id)}
                        style={{
                            padding: '0 4px',
                            fontSize: '0.6rem',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)'
                        }}
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        onClick={() => moveDownInventoryItem(item.id)}
                        style={{
                            padding: '0 4px',
                            fontSize: '0.6rem',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)'
                        }}
                    >
                        ▼
                    </button>
                </div>
            </td>
            <td className="data-table__cell--top">
                <button
                    type="button"
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
