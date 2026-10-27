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
    type ResolvedSlot
} from '../../../utils/items/itemAttackRoller';
import {
    calculateBaseAccuracy,
    calculateTotalDamage,
    getAbilityText,
    parseCombatTags
} from '../../../utils/combat/combatUtils';
import { ChevronDown, ChevronUp, Package, Swords, Target, Scale } from 'lucide-react';
import { ItemMovesScalePopover } from './ItemMovesScalePopover';
import './ItemMovesDrawer.css';

interface ItemMovesDrawerProps {
    onTarget?: (move: MoveData) => void;
}

export function ItemMovesDrawer({ onTarget }: ItemMovesDrawerProps) {
    const inventory = useCharacterStore((state) => state.inventory);
    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const passives = useCharacterStore((state) => state.passives);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    // Keep UI synced when stats, socials, or skills change
    useCharacterStore((state) => state.stats);
    useCharacterStore((state) => state.socials);
    useCharacterStore((state) => state.skills);

    const [isExpanded, setIsExpanded] = useState(true);
    const [openPopoverItemId, setOpenPopoverItemId] = useState<string | null>(null);

    const fullState = useCharacterStore.getState();
    const abilityText = getAbilityText(ability, customAbilities);

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
                        const ephemeralMove = buildEphemeralMoveFromItem(item, action, fullState);
                        const itemBuffs = parseCombatTags(
                            inventory,
                            extraCategories,
                            ephemeralMove,
                            abilityText,
                            passives
                        );

                        const { acc1, acc2, dmg1 } = resolveItemMoveStats(action, item, fullState);
                        const hasDual = acc1.isDual || acc2.isDual || dmg1.isDual;

                        const accuracyTotal = calculateBaseAccuracy(ephemeralMove, fullState, itemBuffs);
                        const damageTotal =
                            action.category === 'Status'
                                ? '-'
                                : calculateTotalDamage(ephemeralMove, fullState, itemBuffs);

                        return (
                            <div key={item.id} className="item-moves-drawer__card">
                                {/* Tier 1: Header & Action Bar */}
                                <div className="item-moves-drawer__card-header">
                                    <div className="item-moves-drawer__meta-group">
                                        <span
                                            className="item-moves-drawer__type-pill"
                                            style={{ backgroundColor: getTypeColor(action.type) }}
                                        >
                                            {action.type}
                                        </span>
                                        <span className="item-moves-drawer__name">{item.name || 'Unnamed Item'}</span>
                                        <span className="item-moves-drawer__category-pill">{action.category}</span>
                                        {effective.hasCharges && (
                                            <span
                                                className={`item-moves-drawer__charge-badge ${effective.charges <= 0 ? 'depleted' : ''}`}
                                                title={`${effective.charges} of ${effective.maxCharges} charges remaining`}
                                            >
                                                {effective.charges}/{effective.maxCharges} Charges
                                            </span>
                                        )}
                                        {!effective.hasCharges && (item.qty ?? 1) > 1 && (
                                            <span
                                                className="item-moves-drawer__charge-badge"
                                                title={`${item.qty} remaining in bag`}
                                            >
                                                x{item.qty}
                                            </span>
                                        )}
                                    </div>

                                    <div className="item-moves-drawer__actions">
                                        <button
                                            type="button"
                                            className="item-moves-drawer__btn item-moves-drawer__btn--attack"
                                            disabled={isDepleted}
                                            onClick={() => executeItemAttackRoll(item, action)}
                                            title={
                                                isDepleted
                                                    ? 'Item depleted (0 charges or quantity remaining)'
                                                    : `Roll Accuracy (${accuracyTotal} dice) for ${item.name}`
                                            }
                                        >
                                            <Swords size={12} />
                                            <span>Attack / Throw ({accuracyTotal})</span>
                                        </button>

                                        {onTarget && action.category !== 'Status' && (
                                            <button
                                                type="button"
                                                className="item-moves-drawer__btn item-moves-drawer__btn--dmg"
                                                disabled={isDepleted}
                                                onClick={() => onTarget(ephemeralMove)}
                                                title={`Open Targeting & Damage (${damageTotal} dice) for ${item.name}`}
                                            >
                                                <Target size={12} />
                                                <span>Dmg ({damageTotal})</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Tier 2: Combat Details & Formulas Bar */}
                                <div className="item-moves-drawer__card-body">
                                    <div className="item-moves-drawer__stat-chip">
                                        <span className="item-moves-drawer__chip-label">Acc:</span>
                                        <strong className="item-moves-drawer__chip-val text-value-highlight">
                                            {accuracyTotal}
                                        </strong>
                                        <span className="item-moves-drawer__chip-formula">
                                            ({renderStatDisplay(acc1, 'STR')} + {renderStatDisplay(acc2, 'NONE')})
                                        </span>
                                    </div>

                                    {action.category !== 'Status' && (
                                        <div className="item-moves-drawer__stat-chip">
                                            <span className="item-moves-drawer__chip-label">Dmg:</span>
                                            <strong
                                                className="item-moves-drawer__chip-val text-value-highlight"
                                                style={{ color: 'var(--primary)' }}
                                            >
                                                {damageTotal}
                                            </strong>
                                            <span className="item-moves-drawer__chip-formula">
                                                ({renderStatDisplay(dmg1, 'STR')} + {action.power})
                                            </span>
                                        </div>
                                    )}

                                    {hasDual && (
                                        <button
                                            type="button"
                                            className={`item-moves-drawer__scale-btn ${openPopoverItemId === item.id ? 'active' : ''}`}
                                            onClick={() =>
                                                setOpenPopoverItemId(openPopoverItemId === item.id ? null : item.id)
                                            }
                                            title="Select Scaling Stat Preference"
                                            aria-label={`Scale options for ${item.name}`}
                                        >
                                            <Scale size={11} />
                                            <span>Scale</span>
                                        </button>
                                    )}

                                    {action.chanceDice && action.chanceDice > 0 && (
                                        <div className="item-moves-drawer__chance-chip">
                                            <span>★ {action.chanceDice} Chance</span>
                                            <span className="item-moves-drawer__chance-desc">
                                                ({action.chanceEffect || 'Effect'})
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {openPopoverItemId === item.id && hasDual && (
                                    <ItemMovesScalePopover
                                        item={item}
                                        action={action}
                                        acc1={acc1}
                                        acc2={acc2}
                                        dmg1={dmg1}
                                        fullState={fullState}
                                        itemBuffs={itemBuffs}
                                        onClose={() => setOpenPopoverItemId(null)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
