import './ItemGeneratorModal.css';

interface ItemCategory {
    id: string;
    label: string;
}

interface ItemPocket {
    pocket: string;
    label: string;
    isFlat: boolean;
    categories: ItemCategory[];
}

interface ItemGeneratorPocketGroupProps {
    pocketGroup: ItemPocket;
    isCustom: boolean;
    filters: Record<string, boolean>;
    setFilters: (update: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
    expandedPockets: Record<string, boolean>;
    togglePocket: (pocketId: string) => void;
}

export function ItemGeneratorPocketGroup({
    pocketGroup,
    isCustom,
    filters,
    setFilters,
    expandedPockets,
    togglePocket
}: ItemGeneratorPocketGroupProps) {
    const uniqueKey = `${isCustom ? 'custom' : 'base'}_${pocketGroup.pocket}`;

    if (pocketGroup.isFlat) {
        return (
            <label className="item-generator-modal__checkbox-label item-generator-modal__pocket-header">
                <input
                    type="checkbox"
                    className="item-generator-modal__checkbox"
                    checked={!!filters[pocketGroup.categories[0].id]}
                    onChange={() =>
                        setFilters((prev) => ({
                            ...prev,
                            [pocketGroup.categories[0].id]: !prev[pocketGroup.categories[0].id]
                        }))
                    }
                />
                <span className="item-generator-modal__pocket-title">{pocketGroup.label}</span>
            </label>
        );
    }

    return (
        <div>
            <div className="item-generator-modal__pocket-header" onClick={() => togglePocket(uniqueKey)}>
                <span
                    className={`item-generator-modal__pocket-chevron ${expandedPockets[uniqueKey] ? 'item-generator-modal__pocket-chevron--open' : ''}`}
                >
                    ▶
                </span>
                <span className="item-generator-modal__pocket-title">{pocketGroup.label}</span>
            </div>

            {expandedPockets[uniqueKey] && (
                <div className="item-generator-modal__checkbox-list">
                    {pocketGroup.categories.map((category) => (
                        <label key={category.id} className="item-generator-modal__checkbox-label">
                            <input
                                type="checkbox"
                                className="item-generator-modal__checkbox"
                                checked={!!filters[category.id]}
                                onChange={() => setFilters((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
                            />
                            {category.label}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
