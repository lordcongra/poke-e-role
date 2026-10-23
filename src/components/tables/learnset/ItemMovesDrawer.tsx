import { useState, useMemo } from 'react';
import type { MoveData, InventoryItem, ItemAttackAction } from '../../../store/entityTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS } from '../../../data/constants';
import { getItemEffectiveCharges } from '../../../utils/items/itemCharges';
import {
    resolveItemAttackAction,
    buildEphemeralMoveFromItem,
    executeItemAttackRoll,
    resolveItemMoveStats,
    formatStatShort,
    formatStatFull,
    isSameStatOrSkill,
    type ResolvedSlot
} from '../../../utils/items/itemAttackRoller';
import { ChevronDown, ChevronUp, Package, Swords, Target, Scale, X, Check } from 'lucide-react';
import './ItemMovesDrawer.css';

interface ItemMovesDrawerProps {
    onTarget?: (move: MoveData) => void;
}

export function ItemMovesDrawer({ onTarget }: ItemMovesDrawerProps) {
    const inventory = useCharacterStore((state) => state.inventory);
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const setPendingDualScale = useCharacterStore((state) => state.setPendingDualScale);

    const [isExpanded, setIsExpanded] = useState(true);
    const [openPopoverItemId, setOpenPopoverItemId] = useState<string | null>(null);

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

    const renderStatDisplay = (slot: ResolvedSlot, fallbackVal = 'NONE') => {
        if (!slot.active) return fallbackVal;
        if (slot.isDual && slot.alt) {
            return (
                <span
                    className="item-moves-drawer__dual-indicator"
                    title={`Active: ${formatStatFull(slot.active)} (Alt: ${formatStatFull(slot.alt)})`}
                >
                    <strong className="item-moves-drawer__stat-active">{formatStatShort(slot.active)}*</strong>
                    <span className="item-moves-drawer__stat-sep">/</span>
                    <span className="item-moves-drawer__stat-inactive">{formatStatShort(slot.alt)}</span>
                </span>
            );
        }
        return formatStatShort(slot.active);
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
                    <span className="item-moves-drawer__badge">{activeItemMoves.length}</span>
                </div>
                <div className="item-moves-drawer__header-right">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {isExpanded && (
                <div className="item-moves-drawer__body">
                    {activeItemMoves.map(({ item, action }) => {
                        const effective = getItemEffectiveCharges(item);
                        const isDepleted = (effective.hasCharges && effective.charges <= 0) || (item.qty ?? 1) <= 0;
                        const ephemeralMove = buildEphemeralMoveFromItem(item, action);

                        const { acc1, acc2, dmg1 } = resolveItemMoveStats(action, item);
                        const hasDual = acc1.isDual || acc2.isDual || dmg1.isDual;

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
                                        <span className="item-moves-drawer__name">{item.name || 'Unnamed Item'}</span>
                                        <div className="item-moves-drawer__stats">
                                            <span className="item-moves-drawer__category">{action.category}</span>
                                            <span>
                                                Acc: {renderStatDisplay(acc1, 'STR')} +{' '}
                                                {renderStatDisplay(acc2, 'NONE')}
                                            </span>
                                            {action.category !== 'Status' && (
                                                <span>
                                                    Dmg:{' '}
                                                    {dmg1.active ? (
                                                        <>
                                                            {renderStatDisplay(dmg1, 'STR')} + {action.power}
                                                        </>
                                                    ) : (
                                                        `Pwr ${action.power}`
                                                    )}
                                                </span>
                                            )}
                                            {hasDual && (
                                                <button
                                                    type="button"
                                                    className={`item-moves-drawer__scale-btn ${openPopoverItemId === item.id ? 'active' : ''}`}
                                                    onClick={() =>
                                                        setOpenPopoverItemId(
                                                            openPopoverItemId === item.id ? null : item.id
                                                        )
                                                    }
                                                    title="Select Scaling Stat Preference"
                                                    aria-label={`Scale options for ${item.name}`}
                                                >
                                                    <Scale size={11} />
                                                    <span>Scale</span>
                                                </button>
                                            )}
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
                                        <span
                                            className="text-subtext"
                                            style={{ fontSize: '0.75rem', marginRight: '4px' }}
                                        >
                                            {effective.charges}/{effective.maxCharges} Charges
                                        </span>
                                    )}
                                    {!effective.hasCharges && (item.qty ?? 1) > 1 && (
                                        <span
                                            className="text-subtext"
                                            style={{ fontSize: '0.75rem', marginRight: '4px' }}
                                        >
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

                                {openPopoverItemId === item.id && hasDual && (
                                    <div className="item-moves-drawer__popover">
                                        <div className="item-moves-drawer__popover-header">
                                            <div className="item-moves-drawer__popover-title">
                                                <Scale size={13} style={{ color: 'var(--primary, #3b82f6)' }} />
                                                <span>Dual-Scale Preference</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="item-moves-drawer__popover-close"
                                                onClick={() => setOpenPopoverItemId(null)}
                                                aria-label="Close"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>

                                        <div className="item-moves-drawer__popover-body">
                                            {acc1.isDual && acc1.alt && (
                                                <div className="item-moves-drawer__popover-section">
                                                    <span className="item-moves-drawer__popover-label">
                                                        Accuracy Stat:
                                                    </span>
                                                    <div className="item-moves-drawer__popover-buttons">
                                                        {[action.acc1, action.acc1Alt!].map((opt) => {
                                                            const isChosen = isSameStatOrSkill(acc1.active, opt);
                                                            return (
                                                                <button
                                                                    key={`acc1-${opt}`}
                                                                    type="button"
                                                                    className={`item-moves-drawer__popover-opt-btn ${isChosen ? 'active' : ''}`}
                                                                    onClick={() => {
                                                                        const updated: ItemAttackAction = {
                                                                            ...action,
                                                                            selectedAcc1: opt
                                                                        };
                                                                        updateInventoryItem(
                                                                            item.id,
                                                                            'attackAction',
                                                                            updated
                                                                        );
                                                                    }}
                                                                >
                                                                    {isChosen && <Check size={11} />}
                                                                    <span>
                                                                        {formatStatFull(opt)} ({formatStatShort(opt)})
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {acc2.isDual && acc2.alt && (
                                                <div className="item-moves-drawer__popover-section">
                                                    <span className="item-moves-drawer__popover-label">
                                                        Accuracy Skill:
                                                    </span>
                                                    <div className="item-moves-drawer__popover-buttons">
                                                        {[action.acc2 || 'none', action.acc2Alt!].map((opt) => {
                                                            const isChosen = isSameStatOrSkill(acc2.active, opt);
                                                            return (
                                                                <button
                                                                    key={`acc2-${opt}`}
                                                                    type="button"
                                                                    className={`item-moves-drawer__popover-opt-btn ${isChosen ? 'active' : ''}`}
                                                                    onClick={() => {
                                                                        const updated: ItemAttackAction = {
                                                                            ...action,
                                                                            selectedAcc2: opt
                                                                        };
                                                                        updateInventoryItem(
                                                                            item.id,
                                                                            'attackAction',
                                                                            updated
                                                                        );
                                                                    }}
                                                                >
                                                                    {isChosen && <Check size={11} />}
                                                                    <span>{formatStatFull(opt)}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {dmg1.isDual && dmg1.alt && action.category !== 'Status' && (
                                                <div className="item-moves-drawer__popover-section">
                                                    <span className="item-moves-drawer__popover-label">
                                                        Damage Stat:
                                                    </span>
                                                    <div className="item-moves-drawer__popover-buttons">
                                                        {[action.dmg1 || '', action.dmg1Alt!]
                                                            .filter(Boolean)
                                                            .map((opt) => {
                                                                const isChosen = isSameStatOrSkill(dmg1.active, opt);
                                                                return (
                                                                    <button
                                                                        key={`dmg1-${opt}`}
                                                                        type="button"
                                                                        className={`item-moves-drawer__popover-opt-btn ${isChosen ? 'active' : ''}`}
                                                                        onClick={() => {
                                                                            const updated: ItemAttackAction = {
                                                                                ...action,
                                                                                selectedDmg1: opt
                                                                            };
                                                                            updateInventoryItem(
                                                                                item.id,
                                                                                'attackAction',
                                                                                updated
                                                                            );
                                                                        }}
                                                                    >
                                                                        {isChosen && <Check size={11} />}
                                                                        <span>
                                                                            {formatStatFull(opt)} (
                                                                            {formatStatShort(opt)})
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="item-moves-drawer__full-dialog-btn"
                                                onClick={() => {
                                                    setPendingDualScale({
                                                        moveId: `item-${item.id}`,
                                                        moveName: item.name || 'Item Move',
                                                        acc1Options: action.acc1Alt
                                                            ? [action.acc1, action.acc1Alt]
                                                            : undefined,
                                                        acc2Options: action.acc2Alt
                                                            ? [action.acc2 || 'none', action.acc2Alt]
                                                            : undefined,
                                                        dmg1Options: action.dmg1Alt
                                                            ? [action.dmg1 || '', action.dmg1Alt]
                                                            : undefined
                                                    });
                                                    setOpenPopoverItemId(null);
                                                }}
                                            >
                                                Open Full Scaling Dialog...
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
