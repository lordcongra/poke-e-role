import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { loadLocalDataset } from '../../utils/api';
import { generateLootPool, rollLootItem, formatCamelCase, type PoolItem } from '../../utils/lootGeneratorLogic';
import { ItemGeneratorResultModal } from './ItemGeneratorResultModal';
import { ItemGeneratorPocketGroup } from './ItemGeneratorPocketGroup';
import { ItemGeneratorTmFilters } from './ItemGeneratorTmFilters';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import './ItemGeneratorModal.css';

interface ItemGeneratorModalProps {
    onClose: () => void;
}

type ItemCategory = { id: string; label: string };
type ItemPocket = {
    pocket: string;
    label: string;
    isFlat: boolean;
    categories: ItemCategory[];
};

export function ItemGeneratorModal({ onClose }: ItemGeneratorModalProps) {
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const role = useCharacterStore((state) => state.role);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    const [basePockets, setBasePockets] = useState<ItemPocket[]>([]);
    const [customPockets, setCustomPockets] = useState<ItemPocket[]>([]);
    const [expandedPockets, setExpandedPockets] = useState<Record<string, boolean>>({});

    const [filters, setFilters] = useState<Record<string, boolean>>({});
    const [tmPowers, setTmPowers] = useState<string[]>([]);
    const [tmTypes, setTmTypes] = useState<string[]>(['Any']);

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedItem, setGeneratedItem] = useState<{ name: string; description: string } | null>(null);
    const [activePool, setActivePool] = useState<PoolItem[]>([]);

    const visibleTypes = roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    const allTypes = [...POKEMON_TYPES.filter((t) => t !== ''), ...visibleTypes.map((type) => type.name)];
    const allTypeColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(visibleTypes.map((type) => [type.name, type.color]))
    };

    useEffect(() => {
        const initializeCategories = async () => {
            const index = await loadLocalDataset();
            if (!index) return;

            const basePocketMap: Record<string, Set<string>> = {};
            if (index.items) {
                Object.keys(index.items).forEach((pocket) => {
                    if (pocket === 'TechnicalMachine') return;
                    if (!basePocketMap[pocket]) basePocketMap[pocket] = new Set();
                    Object.keys(index.items[pocket]).forEach((category) => {
                        basePocketMap[pocket].add(category);
                    });
                });
            }

            const builtBasePockets: ItemPocket[] = Object.keys(basePocketMap).map((pocket) => {
                const categoriesArray = Array.from(basePocketMap[pocket]);
                const isFlat = categoriesArray.length === 1 && categoriesArray[0] === 'Misc';
                return {
                    pocket,
                    label: formatCamelCase(pocket),
                    isFlat,
                    categories: categoriesArray.map((cat) => ({
                        id: `base_item_${pocket}_${cat}`,
                        label: isFlat ? formatCamelCase(pocket) : formatCamelCase(cat)
                    }))
                };
            });
            setBasePockets(builtBasePockets);

            const customPocketMap: Record<string, Set<string>> = {};
            const visibleCustomItems = roomCustomItems.filter((i) => !i.gmOnly);

            visibleCustomItems.forEach((item) => {
                const pocket = item.pocket || 'Custom';
                const category = item.category || 'Misc';
                if (!customPocketMap[pocket]) customPocketMap[pocket] = new Set();
                customPocketMap[pocket].add(category);
            });

            const builtCustomPockets: ItemPocket[] = Object.keys(customPocketMap).map((pocket) => {
                const categoriesArray = Array.from(customPocketMap[pocket]);
                const isFlat = categoriesArray.length === 1 && categoriesArray[0] === 'Misc';
                return {
                    pocket,
                    label: formatCamelCase(pocket),
                    isFlat,
                    categories: categoriesArray.map((cat) => ({
                        id: `custom_item_${pocket}_${cat}`,
                        label: isFlat ? formatCamelCase(pocket) : formatCamelCase(cat)
                    }))
                };
            });
            setCustomPockets(builtCustomPockets);
        };
        initializeCategories();
    }, [roomCustomItems]);

    const handleSelectAll = (select: boolean) => {
        const newFilters: Record<string, boolean> = {};

        basePockets.forEach((pocketGroup) => {
            pocketGroup.categories.forEach((cat) => (newFilters[cat.id] = select));
        });
        customPockets.forEach((pocketGroup) => {
            pocketGroup.categories.forEach((cat) => (newFilters[cat.id] = select));
        });

        setFilters(newFilters);
        setTmPowers(select ? ['support', '1', '2', '3', '4', '5', '6', '7', '8', '10'] : []);
        setTmTypes(select ? ['Any'] : []);
    };

    const togglePocket = (pocketId: string) => {
        setExpandedPockets((prev) => ({ ...prev, [pocketId]: !prev[pocketId] }));
    };

    const handleGenerate = async () => {
        const index = await loadLocalDataset();
        if (!index) {
            if (OBR.isAvailable) OBR.notification.show('⚠️ Local dataset not found.', 'ERROR');
            return;
        }

        const masterPool = generateLootPool(index, filters, tmPowers, tmTypes, roomCustomItems, roomCustomMoves);

        if (masterPool.length === 0) {
            if (OBR.isAvailable) OBR.notification.show('⚠️ No items match these filters!', 'WARNING');
            return;
        }

        setActivePool(masterPool);

        setIsGenerating(true);
        try {
            const item = await rollLootItem(masterPool);
            setGeneratedItem(item);
        } catch (error) {
            console.error('Loot Generator Error:', error);
            if (OBR.isAvailable) OBR.notification.show('⚠️ Error generating item.', 'ERROR');
        } finally {
            setIsGenerating(false);
        }
    };

    const isAnySelected = Object.values(filters).some((val) => val === true) || tmPowers.length > 0;

    return (
        <>
            <div className="item-generator-modal__overlay">
                <div className="item-generator-modal__content">
                    <div className="item-generator-modal__header">
                        <h3 className="item-generator-modal__title">🎁 Random Loot Generator</h3>
                        <button onClick={onClose} className="item-generator-modal__close-btn" title="Close">
                            X
                        </button>
                    </div>
                    <p className="item-generator-modal__desc">Select one or more categories to build your loot pool.</p>

                    <div className="item-generator-modal__filter-actions">
                        <button
                            type="button"
                            onClick={() => handleSelectAll(true)}
                            className="item-generator-modal__btn-small"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectAll(false)}
                            className="item-generator-modal__btn-small"
                        >
                            Deselect All
                        </button>
                    </div>

                    <div className="item-generator-modal__filters-container">
                        <div className="item-generator-modal__filter-group">
                            <div className="item-generator-modal__filter-group-title">🎒 Base Items</div>
                            {basePockets.length === 0 && <div className="item-generator-modal__desc">Loading...</div>}
                            {basePockets.map((group) => (
                                <ItemGeneratorPocketGroup
                                    key={`base_${group.pocket}`}
                                    pocketGroup={group}
                                    isCustom={false}
                                    filters={filters}
                                    setFilters={setFilters}
                                    expandedPockets={expandedPockets}
                                    togglePocket={togglePocket}
                                />
                            ))}
                        </div>

                        <ItemGeneratorTmFilters
                            tmPowers={tmPowers}
                            setTmPowers={setTmPowers}
                            tmTypes={tmTypes}
                            setTmTypes={setTmTypes}
                            allTypes={allTypes}
                            allTypeColors={allTypeColors}
                        />

                        <div className="item-generator-modal__filter-group">
                            <div className="item-generator-modal__filter-group-title">🛠️ Custom Items</div>
                            {customPockets.length === 0 && (
                                <div className="item-generator-modal__desc">No Custom Items available.</div>
                            )}
                            {customPockets.map((group) => (
                                <ItemGeneratorPocketGroup
                                    key={`custom_${group.pocket}`}
                                    pocketGroup={group}
                                    isCustom={true}
                                    filters={filters}
                                    setFilters={setFilters}
                                    expandedPockets={expandedPockets}
                                    togglePocket={togglePocket}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="item-generator-modal__actions">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || !isAnySelected}
                            className="action-button action-button--red item-generator-modal__btn"
                        >
                            {isGenerating ? '⏳ Generating...' : '🎲 Generate'}
                        </button>
                    </div>
                </div>
            </div>

            {generatedItem && (
                <ItemGeneratorResultModal
                    item={generatedItem}
                    onClose={() => setGeneratedItem(null)}
                    onReroll={async () => {
                        setIsGenerating(true);
                        const item = await rollLootItem(activePool);
                        setGeneratedItem(item);
                        setIsGenerating(false);
                    }}
                />
            )}
        </>
    );
}
