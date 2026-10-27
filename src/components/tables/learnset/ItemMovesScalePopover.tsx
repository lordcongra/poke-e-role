import type { InventoryItem, ItemAttackAction } from '../../../store/entityTypes';
import type { CharacterState } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import {
    formatStatShort,
    formatStatFull,
    isSameStatOrSkill,
    getStatOrSkillTotal,
    type ResolvedSlot
} from '../../../utils/items/itemAttackRoller';
import type { CombatBonuses } from '../../../utils/tagParser/tagTypes';
import { Scale, X, Check } from 'lucide-react';

interface ItemMovesScalePopoverProps {
    item: InventoryItem;
    action: ItemAttackAction;
    acc1: ResolvedSlot;
    acc2: ResolvedSlot;
    dmg1: ResolvedSlot;
    fullState: CharacterState;
    itemBuffs?: CombatBonuses;
    onClose: () => void;
}

export function ItemMovesScalePopover({
    item,
    action,
    acc1,
    acc2,
    dmg1,
    fullState,
    itemBuffs,
    onClose
}: ItemMovesScalePopoverProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const setPendingDualScale = useCharacterStore((state) => state.setPendingDualScale);

    return (
        <div className="item-moves-drawer__popover">
            <div className="item-moves-drawer__popover-header">
                <div className="item-moves-drawer__popover-title">
                    <Scale size={13} style={{ color: 'var(--primary, #3b82f6)' }} />
                    <span>Dual-Scale Preference</span>
                </div>
                <button type="button" className="item-moves-drawer__popover-close" onClick={onClose} aria-label="Close">
                    <X size={13} />
                </button>
            </div>

            <div className="item-moves-drawer__popover-body">
                {acc1.isDual && acc1.alt && (
                    <div className="item-moves-drawer__popover-section">
                        <span className="item-moves-drawer__popover-label">Accuracy Stat:</span>
                        <div className="item-moves-drawer__popover-buttons">
                            {[action.acc1, action.acc1Alt!].map((opt) => {
                                const isChosen = isSameStatOrSkill(acc1.active, opt);
                                const score = getStatOrSkillTotal(opt, fullState, itemBuffs);
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
                                            updateInventoryItem(item.id, 'attackAction', updated);
                                        }}
                                    >
                                        {isChosen && <Check size={11} />}
                                        <span>
                                            {formatStatFull(opt)} ({formatStatShort(opt)}: {score})
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {acc2.isDual && acc2.alt && (
                    <div className="item-moves-drawer__popover-section">
                        <span className="item-moves-drawer__popover-label">Accuracy Skill:</span>
                        <div className="item-moves-drawer__popover-buttons">
                            {[action.acc2 || 'none', action.acc2Alt!].map((opt) => {
                                const isChosen = isSameStatOrSkill(acc2.active, opt);
                                const isNone = !opt || opt.toLowerCase() === 'none';
                                const score = isNone ? 0 : getStatOrSkillTotal(opt, fullState, itemBuffs);
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
                                            updateInventoryItem(item.id, 'attackAction', updated);
                                        }}
                                    >
                                        {isChosen && <Check size={11} />}
                                        <span>{isNone ? 'None' : `${formatStatFull(opt)} (${score})`}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {dmg1.isDual && dmg1.alt && action.category !== 'Status' && (
                    <div className="item-moves-drawer__popover-section">
                        <span className="item-moves-drawer__popover-label">Damage Stat:</span>
                        <div className="item-moves-drawer__popover-buttons">
                            {[action.dmg1 || '', action.dmg1Alt!].filter(Boolean).map((opt) => {
                                const isChosen = isSameStatOrSkill(dmg1.active, opt);
                                const score = getStatOrSkillTotal(opt, fullState, itemBuffs);
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
                                            updateInventoryItem(item.id, 'attackAction', updated);
                                        }}
                                    >
                                        {isChosen && <Check size={11} />}
                                        <span>
                                            {formatStatFull(opt)} ({formatStatShort(opt)}: {score})
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
                            acc1Options: action.acc1Alt ? [action.acc1, action.acc1Alt] : undefined,
                            acc2Options: action.acc2Alt ? [action.acc2 || 'none', action.acc2Alt] : undefined,
                            dmg1Options: action.dmg1Alt ? [action.dmg1 || '', action.dmg1Alt] : undefined
                        });
                        onClose();
                    }}
                >
                    Open Full Scaling Dialog...
                </button>
            </div>
        </div>
    );
}
