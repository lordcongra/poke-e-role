import type { CustomItem } from '../../store/storeTypes';
import './HomebrewItemCard.css';

interface HomebrewItemClassificationRowProps {
    item: CustomItem;
    canEdit: boolean;
    localPocket: string;
    setLocalPocket: (val: string) => void;
    localCustomGroup: string;
    setLocalCustomGroup: (val: string) => void;
    localCategory: string;
    setLocalCategory: (val: string) => void;
    localSubCategory: string;
    setLocalSubCategory: (val: string) => void;
    localRarity: string;
    setLocalRarity: (val: string) => void;
    onUpdateField: <K extends keyof CustomItem>(field: K, val: CustomItem[K]) => void;
}

export function HomebrewItemClassificationRow({
    item,
    canEdit,
    localPocket,
    setLocalPocket,
    localCustomGroup,
    setLocalCustomGroup,
    localCategory,
    setLocalCategory,
    localSubCategory,
    setLocalSubCategory,
    localRarity,
    setLocalRarity,
    onUpdateField
}: HomebrewItemClassificationRowProps) {
    const isCustom = localPocket === 'Custom' || localPocket === 'Misc';

    return (
        <div className="homebrew-item-card__row">
            <div className="homebrew-item-card__field">
                <label className="homebrew-item-card__field-label text-subtext">
                    {isCustom ? 'Type / Pocket' : 'Pocket'}
                </label>
                <select
                    value={localPocket}
                    onChange={(e) => {
                        if (!canEdit) return;
                        const val = e.target.value;
                        setLocalPocket(val);
                        onUpdateField('pocket', val);
                        if (val === 'Custom' && !localCustomGroup) {
                            setLocalCustomGroup('Custom');
                            onUpdateField('customGroup', 'Custom');
                        }
                    }}
                    disabled={!canEdit}
                    className="homebrew-item-card__select"
                >
                    <option value="Medicine">Medicine</option>
                    <option value="HeldItems">Held Items</option>
                    <option value="Pokeballs">Pokéballs</option>
                    <option value="TrainerItems">Trainer Items</option>
                    <option value="EvolutionItem">Evolution Item</option>
                    <option value="KeyItems">Key Items</option>
                    <option value="Custom">Custom</option>
                </select>
            </div>

            {isCustom ? (
                <>
                    <div className="homebrew-item-card__field">
                        <label className="homebrew-item-card__field-label text-subtext">Custom Group</label>
                        <input
                            type="text"
                            list="homebrew-custom-groups-list"
                            value={localCustomGroup}
                            onChange={(e) => canEdit && setLocalCustomGroup(e.target.value)}
                            onBlur={() => {
                                if (!canEdit) return;
                                const trimmed = localCustomGroup.trim();
                                const effectiveCurrentGroup =
                                    item.customGroup ||
                                    (item.category && item.category !== 'Misc' && item.category !== 'Custom'
                                        ? item.category
                                        : 'Custom');
                                if (trimmed !== effectiveCurrentGroup) {
                                    onUpdateField('customGroup', trimmed);
                                    if (!item.subCategory) {
                                        onUpdateField('category', trimmed || 'Misc');
                                    }
                                }
                            }}
                            placeholder="e.g. PMD Items, Relics"
                            disabled={!canEdit}
                            className="homebrew-item-card__input"
                        />
                    </div>

                    <div className="homebrew-item-card__field">
                        <label className="homebrew-item-card__field-label text-subtext">Sub-Category</label>
                        <input
                            type="text"
                            list="homebrew-subcategories-list"
                            value={localSubCategory}
                            onChange={(e) => canEdit && setLocalSubCategory(e.target.value)}
                            onBlur={() => {
                                if (!canEdit) return;
                                const trimmed = localSubCategory.trim();
                                if (trimmed !== (item.subCategory || '')) {
                                    onUpdateField('subCategory', trimmed);
                                }
                            }}
                            placeholder="e.g. Wands, Orbs"
                            disabled={!canEdit}
                            className="homebrew-item-card__input"
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="homebrew-item-card__field">
                        <label className="homebrew-item-card__field-label text-subtext">Category</label>
                        <input
                            type="text"
                            list="homebrew-categories-list"
                            value={localCategory}
                            onChange={(e) => canEdit && setLocalCategory(e.target.value)}
                            onBlur={() => {
                                if (!canEdit) return;
                                if (localCategory !== item.category) {
                                    onUpdateField('category', localCategory);
                                }
                            }}
                            placeholder="e.g. Healing, Berry"
                            disabled={!canEdit}
                            className="homebrew-item-card__input"
                        />
                    </div>

                    <div className="homebrew-item-card__field">
                        <label className="homebrew-item-card__field-label text-subtext">Sub-Category (Optional)</label>
                        <input
                            type="text"
                            list="homebrew-subcategories-list"
                            value={localSubCategory}
                            onChange={(e) => canEdit && setLocalSubCategory(e.target.value)}
                            onBlur={() => {
                                if (!canEdit) return;
                                const trimmed = localSubCategory.trim();
                                if (trimmed !== (item.subCategory || '')) {
                                    onUpdateField('subCategory', trimmed);
                                }
                            }}
                            placeholder="e.g. Herb, Special"
                            disabled={!canEdit}
                            className="homebrew-item-card__input"
                        />
                    </div>
                </>
            )}

            <div className="homebrew-item-card__field" style={{ flex: '0 1 120px' }}>
                <label className="homebrew-item-card__field-label text-subtext">Rarity</label>
                <select
                    value={localRarity}
                    onChange={(e) => {
                        if (!canEdit) return;
                        setLocalRarity(e.target.value);
                        onUpdateField('rarity', e.target.value);
                    }}
                    disabled={!canEdit}
                    className="homebrew-item-card__select"
                >
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Very Rare">Very Rare</option>
                    <option value="Legendary">Legendary</option>
                </select>
            </div>
        </div>
    );
}
