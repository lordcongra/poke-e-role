import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchItemData } from '../../utils/api';
import type { InventoryItem } from '../../store/storeTypes';
import { NumberSpinner } from '../ui/NumberSpinner';
import { KNOWN_ITEMS } from '../../data/constants';
import './InventoryTable.css';

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
            <td className="data-table__cell--top inventory-item__cell-top">
                <input
                    type="checkbox"
                    className="inventory-item__checkbox"
                    checked={item.active}
                    onChange={(event) => updateInventoryItem(item.id, 'active', event.target.checked)}
                />
            </td>
            <td className="data-table__cell--top">
                <div className="inventory-item__qty-container">
                    <NumberSpinner
                        value={item.qty}
                        onChange={(value: number) => updateInventoryItem(item.id, 'qty', value)}
                        min={0}
                    />
                </div>
            </td>
            <td className="data-table__cell--top">
                <div className="inventory-item__name-container">
                    <input
                        type="text"
                        list="item-list"
                        className="identity-grid__input inventory-item__name-input"
                        value={localName}
                        onChange={(event) => setLocalName(event.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Item Name"
                    />
                    <button
                        type="button"
                        className="action-button inventory-item__icon-btn inventory-item__icon-btn--info"
                        onClick={() => handleInfoClick(item.id, item.name, item.desc)}
                        disabled={fetchingItems[item.id]}
                    >
                        ❔
                    </button>
                    <button
                        type="button"
                        className="action-button inventory-item__icon-btn inventory-item__icon-btn--tag"
                        onClick={() => setTagBuilderData({ id: item.id, type: 'item' })}
                    >
                        🏷️
                    </button>
                </div>
            </td>
            <td className="inventory-item__desc-cell">
                <textarea
                    className="identity-grid__input form-input--item-desc inventory-item__desc-input"
                    value={item.desc}
                    onChange={(event) => updateInventoryItem(item.id, 'desc', event.target.value)}
                    placeholder="Effect / Notes..."
                />
            </td>
            <td className="data-table__cell--top">
                <div className="inventory-item__sort-container">
                    <button
                        type="button"
                        onClick={() => moveUpInventoryItem(item.id)}
                        className="inventory-item__sort-btn"
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        onClick={() => moveDownInventoryItem(item.id)}
                        className="inventory-item__sort-btn"
                    >
                        ▼
                    </button>
                </div>
            </td>
            <td className="data-table__cell--top">
                <button type="button" onClick={() => setDeleteItemId(item.id)} className="inventory-item__delete-btn">
                    X
                </button>
            </td>
        </tr>
    );
}
