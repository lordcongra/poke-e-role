import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    loadLocalDataset,
    fetchMoveData,
    fetchItemData,
    type LocalIndexItem,
    type ItemApiResponse
} from '../../utils/api';
import type { CustomItem } from '../../store/storeTypes';
import { ItemGeneratorResultModal } from './ItemGeneratorResultModal';
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

export type PoolItem =
    | { type: 'homebrew'; data: CustomItem }
    | { type: 'tm'; data: LocalIndexItem }
    | { type: 'item'; data: LocalIndexItem };

const formatCamelCase = (text: string) => {
    if (text === 'ZCrystal') return 'Z-Crystal';
    if (text === 'EvolutionItem') return 'Evolution Items';
    if (text === 'TrainerItems') return 'Trainer Items';
    return text.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const formatPokeballName = (name: string) => {
    if (name.toLowerCase().endsWith('ball') && !name.toLowerCase().endsWith(' ball')) {
        const spaced = name.replace(/ball$/i, ' Ball');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }
    return name;
};

const formatItemDescription = (data: ItemApiResponse): string => {
    let extraInfo = '';

    if (data.HealthRestored) {
        extraInfo += `\n\nHealth Restored: ${data.HealthRestored}`;
    }
    if (data.Cures) {
        const curesList = Array.isArray(data.Cures) ? data.Cures.join(', ') : data.Cures;
        extraInfo += `\nCures: ${curesList}`;
    }
    if (data.Boost) {
        const boosts = data.Boost.trim()
            .split(/\s+/)
            .map((b) => formatCamelCase(b))
            .join(', ');
        const val = data.Value ? ` +${data.Value}` : '';
        extraInfo += `\nBoosts: ${boosts}${val}`;
    }
    if (data.ForPokemon) {
        const mons = data.ForPokemon.trim()
            .split(/\s+/)
            .map((p) =>
                p
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
            )
            .join(', ');
        extraInfo += `\nFor Pokémon: ${mons}`;
    }
    if (data.ForTypes) {
        extraInfo += `\nFor Types: ${data.ForTypes}`;
    }

    const baseDescription = data.Description || data.Effect || '';
    return extraInfo ? `${baseDescription}${extraInfo}` : baseDescription;
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
    const allTypes = [...POKEMON_TYPES.filter(t => t !== ''), ...visibleTypes.map((type) => type.name)];
    const allTypeColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(visibleTypes.map((type) => [type.name, type.color]))
    };

    useEffect(() => {
        const initializeCategories = async () => {
            const index = await loadLocalDataset();
            if (!index) return;

            // 1. Build Base Dataset Pockets
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

            const builtBasePockets: ItemPocket[] = Object.keys(basePocketMap).map(pocket => {
                const categoriesArray = Array.from(basePocketMap[pocket]);
                const isFlat = categoriesArray.length === 1 && categoriesArray[0] === 'Misc';
                return {
                    pocket,
                    label: formatCamelCase(pocket),
                    isFlat,
                    categories: categoriesArray.map(cat => ({
                        id: `base_item_${pocket}_${cat}`,
                        label: isFlat ? formatCamelCase(pocket) : formatCamelCase(cat)
                    }))
                };
            });
            setBasePockets(builtBasePockets);

            // 2. Build Custom Homebrew Pockets
            const customPocketMap: Record<string, Set<string>> = {};
            const visibleCustomItems = roomCustomItems.filter(i => !i.gmOnly);
            
            visibleCustomItems.forEach((item) => {
                const pocket = item.pocket || 'Custom';
                const category = item.category || 'Misc';
                if (!customPocketMap[pocket]) customPocketMap[pocket] = new Set();
                customPocketMap[pocket].add(category);
            });

            const builtCustomPockets: ItemPocket[] = Object.keys(customPocketMap).map(pocket => {
                const categoriesArray = Array.from(customPocketMap[pocket]);
                const isFlat = categoriesArray.length === 1 && categoriesArray[0] === 'Misc';
                return {
                    pocket,
                    label: formatCamelCase(pocket),
                    isFlat,
                    categories: categoriesArray.map(cat => ({
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
            pocketGroup.categories.forEach((cat) => {
                newFilters[cat.id] = select;
            });
        });
        
        customPockets.forEach((pocketGroup) => {
            pocketGroup.categories.forEach((cat) => {
                newFilters[cat.id] = select;
            });
        });

        setFilters(newFilters);

        if (select) {
            setTmPowers(['support', '1', '2', '3', '4', '5', '6', '7', '8', '10']);
            setTmTypes(['Any']);
        } else {
            setTmPowers([]);
            setTmTypes([]);
        }
    };

    const togglePocket = (pocketId: string) => {
        setExpandedPockets(prev => ({ ...prev, [pocketId]: !prev[pocketId] }));
    };

    const executeRoll = async (pool: PoolItem[]) => {
        setIsGenerating(true);
        try {
            const roll = pool[Math.floor(Math.random() * pool.length)];

            let finalItemName = '';
            let finalItemDescription = '';

            if (roll.type === 'homebrew') {
                finalItemName = roll.data.name;
                finalItemDescription = roll.data.description;
            } else if (roll.type === 'tm') {
                const moveData = await fetchMoveData(roll.data.name);
                if (moveData) {
                    const accuracyText = [moveData.Accuracy1, moveData.Accuracy2].filter(Boolean).join(' + ');
                    const damageText = moveData.Damage1 || 'None';
                    const effectText = moveData.Effect ? `\n\nEffect: ${moveData.Effect}` : '';

                    finalItemName = `TM: ${roll.data.name}`;
                    finalItemDescription = `Teaches the move ${roll.data.name}.\n\nType: ${moveData.Type} | Cat: ${moveData.Category} | Power: ${moveData.Power}\nAcc: ${accuracyText || 'None'} | Dmg: ${damageText}${effectText}\n\n${moveData.Description}`;
                }
            } else if (roll.type === 'item') {
                const itemData = await fetchItemData(roll.data.name);
                finalItemName = formatPokeballName(roll.data.name);
                finalItemDescription = itemData ? formatItemDescription(itemData) : '';
            }

            setGeneratedItem({ name: finalItemName, description: finalItemDescription });
        } catch (error) {
            console.error('Loot Generator Error:', error);
            if (OBR.isAvailable) OBR.notification.show('⚠️ Error generating item. Check console.', 'ERROR');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerate = async () => {
        const index = await loadLocalDataset();
        if (!index) {
            if (OBR.isAvailable) OBR.notification.show('⚠️ Local dataset not found.', 'ERROR');
            return;
        }

        const masterPool: PoolItem[] = [];

        // 1. Collect Standard Items
        if (index.items) {
            Object.keys(index.items).forEach((pocket) => {
                if (pocket === 'TechnicalMachine') return;
                Object.keys(index.items[pocket]).forEach((category) => {
                    if (filters[`base_item_${pocket}_${category}`]) {
                        const itemsArr = index.items[pocket][category];
                        if (Array.isArray(itemsArr)) {
                            itemsArr.forEach((i) => masterPool.push({ type: 'item', data: i }));
                        }
                    }
                });
            });
        }

        // 2. Collect Custom Items
        const visibleCustomItems = roomCustomItems.filter(i => !i.gmOnly);
        visibleCustomItems.forEach(custom => {
            const cPocket = custom.pocket || 'Custom';
            const cCategory = custom.category || 'Misc';
            if (filters[`custom_item_${cPocket}_${cCategory}`]) {
                masterPool.push({ type: 'homebrew', data: custom });
            }
        });

        // 3. Collect TMs (Dataset + Homebrew Mixed)
        const selectedPowers = new Set(tmPowers);
        
        const isMoveTypeValid = (type: string | undefined) => {
            if (tmTypes.length === 0 || tmTypes.includes('Any')) return true;
            return tmTypes.some(t => t.toLowerCase() === type?.toLowerCase());
        };

        const processMoveArray = (arr: LocalIndexItem[]) => {
            if (!Array.isArray(arr)) return;
            arr.forEach(m => {
                if (isMoveTypeValid(m.type)) {
                    masterPool.push({ type: 'tm', data: m });
                }
            });
        };

        if (selectedPowers.has('support') && index.moves?.support) {
            processMoveArray(index.moves.support);
        }

        [1, 2, 3].forEach(power => {
            if (selectedPowers.has(String(power)) && index.moves?.basic?.[`power_${power}`]) {
                processMoveArray(index.moves.basic[`power_${power}`]);
            }
        });

        let includesHighPower = false;
        [4, 5, 6, 7, 8, 10].forEach(power => {
            if (selectedPowers.has(String(power))) {
                includesHighPower = true;
                if (index.moves?.highPower?.[`power_${power}`]) {
                    processMoveArray(index.moves.highPower[`power_${power}`]);
                }
            }
        });

        // Vacuum Variable moves natively into High Power
        if (includesHighPower && index.moves?.highPower?.variable) {
            processMoveArray(index.moves.highPower.variable);
        }

        const visibleCustomMoves = roomCustomMoves.filter(m => !m.gmOnly);
        visibleCustomMoves.forEach(m => {
            if (isMoveTypeValid(m.type)) {
                let shouldInclude = false;
                if (m.power === 0 && selectedPowers.has('support')) shouldInclude = true;
                if (m.power >= 1 && m.power <= 10 && selectedPowers.has(String(m.power))) shouldInclude = true;
                if (m.power > 10 && includesHighPower) shouldInclude = true;

                if (shouldInclude) {
                    masterPool.push({
                        type: 'tm',
                        data: { name: m.name, path: '', type: m.type }
                    });
                }
            }
        });

        if (masterPool.length === 0) {
            if (OBR.isAvailable)
                OBR.notification.show('⚠️ No items match these filters!', 'WARNING');
            return;
        }

        setActivePool(masterPool);
        executeRoll(masterPool);
    };

    const isAnySelected = Object.values(filters).some((val) => val === true) || tmPowers.length > 0;

    const renderPocketGroup = (pocketGroup: ItemPocket, isCustom: boolean) => {
        const uniqueKey = `${isCustom ? 'custom' : 'base'}_${pocketGroup.pocket}`;
        
        if (pocketGroup.isFlat) {
            return (
                <label key={uniqueKey} className="item-generator-modal__checkbox-label item-generator-modal__flat-label">
                    <input
                        type="checkbox"
                        className="item-generator-modal__checkbox"
                        checked={!!filters[pocketGroup.categories[0].id]}
                        onChange={() => setFilters((prev) => ({ ...prev, [pocketGroup.categories[0].id]: !prev[pocketGroup.categories[0].id] }))}
                    />
                    {pocketGroup.label}
                </label>
            );
        }

        return (
            <div key={uniqueKey}>
                <div 
                    className="item-generator-modal__pocket-header"
                    onClick={() => togglePocket(uniqueKey)}
                >
                    <span className={`item-generator-modal__pocket-chevron ${expandedPockets[uniqueKey] ? 'item-generator-modal__pocket-chevron--open' : ''}`}>
                        ▶
                    </span>
                    <span className="item-generator-modal__pocket-title">{pocketGroup.label}</span>
                </div>
                
                {expandedPockets[uniqueKey] && (
                    <div className="item-generator-modal__checkbox-list">
                        {pocketGroup.categories.map((cat) => (
                            <label key={cat.id} className="item-generator-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    className="item-generator-modal__checkbox"
                                    checked={!!filters[cat.id]}
                                    onChange={() =>
                                        setFilters((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                                    }
                                />
                                {cat.label}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

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
                        
                        {/* LEFT COLUMN: Standard Items */}
                        <div className="item-generator-modal__filter-group">
                            <div className="item-generator-modal__filter-group-title">Base Items</div>
                            {basePockets.length === 0 && <div className="item-generator-modal__desc">Loading...</div>}
                            {basePockets.map(group => renderPocketGroup(group, false))}
                        </div>

                        {/* MIDDLE COLUMN: Technical Machines */}
                        <div className="item-generator-modal__filter-group">
                            <div className="item-generator-modal__filter-group-title">Technical Machines</div>
                            
                            <span className="item-generator-modal__type-label">TM Powers:</span>
                            <div className="item-generator-modal__dropdown-row">
                                <select
                                    className="item-generator-modal__type-select"
                                    value=""
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !tmPowers.includes(val)) {
                                            setTmPowers([...tmPowers, val]);
                                        }
                                    }}
                                >
                                    <option value="" disabled>+ Add Power Level...</option>
                                    {!tmPowers.includes('support') && <option value="support">Support Moves (Power 0)</option>}
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(power => (
                                        !tmPowers.includes(String(power)) && <option key={`opt_pow_${power}`} value={String(power)}>Power {power}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="item-generator-modal__pill-container">
                                {tmPowers.map(p => (
                                    <span key={p} className="item-generator-modal__pill" onClick={() => setTmPowers(tmPowers.filter(pow => pow !== p))}>
                                        {p === 'support' ? 'Support' : `Power ${p}`} x
                                    </span>
                                ))}
                            </div>

                            <span className="item-generator-modal__type-label">TM Types:</span>
                            <div className="item-generator-modal__dropdown-row">
                                <select
                                    className="item-generator-modal__type-select"
                                    value=""
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                            if (val === 'Any') {
                                                setTmTypes(['Any']);
                                            } else {
                                                const next = tmTypes.filter(t => t !== 'Any');
                                                if (!next.includes(val)) setTmTypes([...next, val]);
                                            }
                                        }
                                    }}
                                >
                                    <option value="" disabled>+ Add Move Type...</option>
                                    {!tmTypes.includes('Any') && <option value="Any">Any Type</option>}
                                    {allTypes.map(type => (
                                        !tmTypes.includes(type) && <option key={`opt_type_${type}`} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="item-generator-modal__pill-container">
                                {tmTypes.map(t => (
                                    <span
                                        key={t}
                                        className="item-generator-modal__pill"
                                        style={{
                                            background: t === 'Any' ? 'var(--dark)' : (allTypeColors[t] || 'var(--dark)'),
                                            color: 'white',
                                            textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                            borderColor: 'transparent'
                                        }}
                                        onClick={() => setTmTypes(tmTypes.filter(type => type !== t))}
                                    >
                                        {t} x
                                    </span>
                                ))}
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Custom Items */}
                        <div className="item-generator-modal__filter-group">
                            <div className="item-generator-modal__filter-group-title">Custom Items</div>
                            {customPockets.length === 0 && <div className="item-generator-modal__desc">No Custom Items available.</div>}
                            {customPockets.map(group => renderPocketGroup(group, true))}
                        </div>

                    </div>

                    <div className="item-generator-modal__actions">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || !isAnySelected}
                            className="action-button action-button--dark item-generator-modal__btn"
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
                    onReroll={() => executeRoll(activePool)}
                />
            )}
        </>
    );
}