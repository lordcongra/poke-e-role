import { useState, useMemo } from 'react';
import type { MoveData, InventoryItem, ItemAttackAction } from '../../../store/entityTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS } from '../../../data/constants';
import { getItemEffectiveCharges } from '../../../utils/items/itemCharges';
import {
    resolveItemAttackAction,
    buildEphemeralMoveFromItem,
    executeItemAttackRoll
} from '../../../utils/items/itemAttackRoller';
import { ChevronDown, ChevronUp, Package, Swords, Target } from 'lucide-react';
import './ItemMovesDrawer.css';

interface ItemMovesDrawerProps {
    onTarget?: (move: MoveData) => void;
}

export function ItemMovesDrawer({ onTarget }: ItemMovesDrawerProps) {
    const inventory = useCharacterStore((state) => state.inventory);
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    const [isExpanded, setIsExpanded] = useState(true);

    const activeItemMoves = useMemo(() => {
        const matches: Array<{ item: InventoryItem; action: ItemAttackAction }> = [];
        for (const item of inventory) {
            if (item.active === false) continue;
            const action = resolveItemAttackAction(item, roomCustomItems);
            if (action) {
                matches.push({ item, action });
            }
        }
        return matches;
    }, [inventory, roomCustomItems]);

    const typeColors = useMemo(() => {
        const customMap: Record<string, string> = {};
        for (const t of roomCustomTypes || []) {
            customMap[t.name.toLowerCase()] = t.color;
        }
        return { ...TYPE_COLORS, ...customMap };
    }, [roomCustomTypes]);

    if (activeItemMoves.length === 0) {
        return null;
    }

    const getTypeColor = (typeStr: string) => {
        const clean = typeStr.trim().toLowerCase();
        return typeColors[clean] || typeColors[typeStr.trim()] || '#705848';
    };

    return (
        <div className="item-moves-drawer">
            <button
                type="button"
                className="item-moves-drawer__header"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Collapse Item Moves' : 'Expand Item Moves'}
            >
                <div className="item-moves-drawer__header-left">
                    <Package size={16} style={{ color: 'var(--primary, #3b82f6)' }} />
                    <span className="text-label" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        Equipped Item Moves & Thrown Items
                    </span>
                    <span className="item-moves-drawer__badge">
                        {activeItemMoves.length}
                    </span>
                </div>
                <div className="item-moves-drawer__header-right">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {isExpanded && (
                <div className="item-moves-drawer__body">
                    {activeItemMoves.map(({ item, action }) => {
                        const effective = getItemEffectiveCharges(item);
                        const isDepleted =
                            (effective.hasCharges && effective.charges <= 0) || (item.qty ?? 1) <= 0;
                        const ephemeralMove = buildEphemeralMoveFromItem(item, action);

                        const acc1Display = action.acc1Alt ? `${action.acc1.toUpperCase()}/${action.acc1Alt.toUpperCase()}` : action.acc1.toUpperCase();
                        const acc2Val = action.acc2 && action.acc2 !== 'none' ? action.acc2 : 'None';
                        const acc2Display = action.acc2Alt ? `${acc2Val.toUpperCase()}/${action.acc2Alt.toUpperCase()}` : acc2Val.toUpperCase();
                        const accStr = `${acc1Display} + ${acc2Display}`;

                        const dmg1Base = action.dmg1 ? action.dmg1.toUpperCase() : '';
                        const dmg1Display = action.dmg1Alt ? `${dmg1Base || 'NONE'}/${action.dmg1Alt.toUpperCase()}` : dmg1Base;
                        const dmgStr = dmg1Display ? `${dmg1Display} + ${action.power}` : `Pwr ${action.power}`;

                        return (
                            <div key={item.id} className="item-moves-drawer__row">
                                <div className="item-moves-drawer__move-info">
                                    <span
                                        className="item-moves-drawer__type-pill"
                                        style={{ backgroundColor: getTypeColor(action.type) }}
                                    >
                                        {action.type}
                                    </span>
                                    <div className="item-moves-drawer__name-group">
                                        <span className="item-moves-drawer__name">
                                            {item.name || 'Unnamed Item'}
                                        </span>
                                        <div className="item-moves-drawer__stats">
                                            <span className="item-moves-drawer__category">
                                                {action.category}
                                            </span>
                                            <span>Acc: {accStr}</span>
                                            {action.category !== 'Status' && <span>Dmg: {dmgStr}</span>}
                                            {action.chanceDice && action.chanceDice > 0 && (
                                                <span style={{ color: '#facc15' }}>
                                                    ★ {action.chanceDice} Chance ({action.chanceEffect || 'Effect'})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="item-moves-drawer__actions">
                                    {effective.hasCharges && (
                                        <span className="text-subtext" style={{ fontSize: '0.75rem', marginRight: '4px' }}>
                                            {effective.charges}/{effective.maxCharges} Charges
                                        </span>
                                    )}
                                    {!effective.hasCharges && (item.qty ?? 1) > 1 && (
                                        <span className="text-subtext" style={{ fontSize: '0.75rem', marginRight: '4px' }}>
                                            x{item.qty}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        className="item-moves-drawer__btn item-moves-drawer__btn--attack"
                                        disabled={isDepleted}
                                        onClick={() => executeItemAttackRoll(item, action)}
                                        title={
                                            isDepleted
                                                ? 'Item depleted (0 charges or quantity remaining)'
                                                : `Roll Accuracy for ${item.name}`
                                        }
                                    >
                                        <Swords size={12} />
                                        <span>Attack / Throw</span>
                                    </button>

                                    {onTarget && action.category !== 'Status' && (
                                        <button
                                            type="button"
                                            className="item-moves-drawer__btn item-moves-drawer__btn--dmg"
                                            disabled={isDepleted}
                                            onClick={() => onTarget(ephemeralMove)}
                                            title={`Open Targeting & Damage for ${item.name}`}
                                        >
                                            <Target size={12} />
                                            <span>Dmg</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
