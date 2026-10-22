import { useState } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { InventoryItem } from '../../../store/entityTypes';
import { getItemEffectiveCharges, CORE_CURABLE_STATUSES } from '../../../utils/items/itemCharges';
import { getBaseItemEffect, isLegacyBottleCapacity, hasItemUsageEffect } from '../../../utils/items/itemUsageEffects';
import {
    getTrainerItemTargets,
    applyItemToPokemonTarget,
    type ItemTargetCandidate
} from '../../../utils/items/itemTargeting';
import { ItemTargetPromptModal } from './ItemTargetPromptModal';
import { ItemStatChoiceModal } from './ItemStatChoiceModal';
import { NumberSpinner } from '../../ui/NumberSpinner';
import { RotateCcw, Sparkles, ChevronDown, ChevronUp, Heart, Zap, ShieldAlert } from 'lucide-react';
import { ItemAttackActionConfig } from '../../items/ItemAttackActionConfig';

interface ItemChargesControlProps {
    item: InventoryItem;
    onUseItem?: (item: InventoryItem) => void;
}

export function ItemChargesControl({ item, onUseItem }: ItemChargesControlProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const useInventoryItem = useCharacterStore((state) => state.useInventoryItem);
    const roomCustomStatuses = useCharacterStore((state) => state.roomCustomStatuses);
    const [targetCandidates, setTargetCandidates] = useState<ItemTargetCandidate[] | null>(null);
    const [statChoicePrompt, setStatChoicePrompt] = useState<{
        item: InventoryItem;
        target?: ItemTargetCandidate;
    } | null>(null);

    const effective = getItemEffectiveCharges(item);
    const baseEffect = getBaseItemEffect(item.name || '');
    const isLegacyBottle = isLegacyBottleCapacity(item);
    const displayHealHp = isLegacyBottle ? 1 : item.healHp;
    const hpPlaceholder = baseEffect?.healHp !== undefined ? String(baseEffect.healHp) : '0';
    const willPlaceholder = baseEffect?.healWill !== undefined ? String(baseEffect.healWill) : '0';

    const isChargesActive =
        typeof item.charges === 'number' || typeof item.maxCharges === 'number' || effective.hasCharges;
    const hasEffects = hasItemUsageEffect(item) || Boolean(item.attackAction);
    const [showEffects, setShowEffects] = useState(() => hasEffects);

    const handleToggleHasCharges = (checked: boolean) => {
        updateInventoryItem(item.id, 'charges', checked ? (effective.charges > 0 ? effective.charges : 3) : undefined);
        updateInventoryItem(
            item.id,
            'maxCharges',
            checked ? (effective.maxCharges > 0 ? effective.maxCharges : 3) : undefined
        );
    };

    const handleToggleCure = (statusName: string) => {
        const current = item.cures || [];
        const isSelected = current.some((c) => c.toLowerCase() === statusName.toLowerCase());
        const updated = isSelected
            ? current.filter((c) => c.toLowerCase() !== statusName.toLowerCase())
            : [...current, statusName];
        updateInventoryItem(item.id, 'cures', updated.length > 0 ? updated : undefined);
    };

    const handleNumEffect = (field: 'healHp' | 'healWill', raw: string) => {
        const val = raw.trim();
        updateInventoryItem(item.id, field, val === '' ? undefined : Math.max(0, parseInt(val, 10) || 0));
    };

    const allPills = [
        ...CORE_CURABLE_STATUSES,
        ...(roomCustomStatuses || [])
            .map((s) => s.name?.trim())
            .filter(
                (n): n is string =>
                    Boolean(n) && !CORE_CURABLE_STATUSES.some((c) => c.toLowerCase() === n.toLowerCase())
            )
    ];

    const handleUse = () => {
        if (onUseItem) {
            onUseItem(item);
            return;
        }
        const store = useCharacterStore.getState();
        const candidates = getTrainerItemTargets(store, item);
        if (candidates.length > 1) {
            setTargetCandidates(candidates);
        } else if (item.permanentStatBoost?.stat === 'PlayerChoice') {
            setStatChoicePrompt({ item });
        } else {
            useInventoryItem(item.id);
        }
    };

    const handleSelectTarget = async (target: ItemTargetCandidate) => {
        setTargetCandidates(null);
        if (item.permanentStatBoost?.stat === 'PlayerChoice') {
            setStatChoicePrompt({ item, target });
            return;
        }
        if (target.isTrainer) {
            useInventoryItem(item.id);
        } else {
            const store = useCharacterStore.getState();
            await applyItemToPokemonTarget(store, item, target);
        }
    };

    const handleConfirmStatChoice = async (
        chosenStat: 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight'
    ) => {
        if (!statChoicePrompt) return;
        const { item: targetItem, target } = statChoicePrompt;
        setStatChoicePrompt(null);
        if (!target || target.isTrainer) {
            useInventoryItem(targetItem.id, { chosenStat });
        } else {
            const store = useCharacterStore.getState();
            await applyItemToPokemonTarget(store, targetItem, target, { chosenStat });
        }
    };

    return (
        <div className="item-charges-control">
            <div className="item-charges-control__main-row">
                <label className="item-charges-control__toggle-label">
                    <input
                        type="checkbox"
                        checked={isChargesActive}
                        onChange={(e) => handleToggleHasCharges(e.target.checked)}
                    />
                    <span className="text-label">Has Charges</span>
                </label>
                <button
                    type="button"
                    className="action-button action-button--theme item-charges-control__use-btn text-theme-header"
                    onClick={handleUse}
                    disabled={isChargesActive ? effective.charges <= 0 : (item.qty ?? 0) <= 0}
                    title={
                        isChargesActive
                            ? `Use 1 charge (${effective.charges}/${effective.maxCharges})`
                            : 'Use 1 item from bag'
                    }
                >
                    <Sparkles size={13} />
                    <span>Use Item</span>
                </button>
            </div>

            {isChargesActive && (
                <>
                    <div className="item-charges-control__spinners-row">
                        <div className="item-charges-control__spinner-group">
                            <span className="item-charges-control__label text-subtext">Charges:</span>
                            <NumberSpinner
                                value={effective.charges}
                                min={0}
                                max={effective.maxCharges}
                                onChange={(val) => updateInventoryItem(item.id, 'charges', val)}
                            />
                        </div>
                        <div className="item-charges-control__spinner-group">
                            <span className="item-charges-control__label text-subtext">Max:</span>
                            <NumberSpinner
                                value={effective.maxCharges}
                                min={1}
                                max={99}
                                onChange={(val) => {
                                    updateInventoryItem(item.id, 'maxCharges', val);
                                    if (effective.charges > val) updateInventoryItem(item.id, 'charges', val);
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark item-charges-control__refill-btn text-theme-header"
                            onClick={() => updateInventoryItem(item.id, 'charges', effective.maxCharges)}
                            disabled={effective.charges >= effective.maxCharges}
                            title="Refill charges to max"
                        >
                            <RotateCcw size={12} />
                            <span>Refill</span>
                        </button>
                    </div>
                    <label
                        className="item-charges-control__toggle-label"
                        style={{ marginTop: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                        title="Keep this item in your inventory at 0 charges instead of discarding it when empty"
                    >
                        <input
                            type="checkbox"
                            checked={item.destroyOnDepletion === false}
                            onChange={(e) =>
                                updateInventoryItem(item.id, 'destroyOnDepletion', e.target.checked ? false : undefined)
                            }
                        />
                        <span className="text-subtext">Retain at 0 Charges (don't discard on empty)</span>
                    </label>
                </>
            )}

            <button
                type="button"
                className="action-button action-button--dark item-charges-control__effects-toggle text-subtext"
                onClick={() => setShowEffects(!showEffects)}
            >
                {showEffects ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <span>Usage Effects (Heal & Status)</span>
                {hasEffects && <span className="item-charges-control__dot-badge" title="Has configured effects" />}
            </button>

            {showEffects && (
                <div className="item-charges-control__effects-panel">
                    <div className="item-charges-control__healing-row">
                        <label className="item-charges-control__field">
                            <span className="item-charges-control__field-title text-subtext">
                                <Heart size={12} style={{ color: 'var(--semantic-danger)' }} /> Heal HP:
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="item-charges-control__num-input text-subtext"
                                value={displayHealHp ?? ''}
                                placeholder={hpPlaceholder}
                                onChange={(e) => handleNumEffect('healHp', e.target.value)}
                            />
                        </label>
                        <label className="item-charges-control__field">
                            <span className="item-charges-control__field-title text-subtext">
                                <Zap size={12} style={{ color: 'var(--primary)' }} /> Heal Will:
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="item-charges-control__num-input text-subtext"
                                value={item.healWill ?? ''}
                                placeholder={willPlaceholder}
                                onChange={(e) => handleNumEffect('healWill', e.target.value)}
                            />
                        </label>
                    </div>

                    <div className="item-charges-control__cures-group">
                        <span className="item-charges-control__cures-title text-subtext">
                            <ShieldAlert size={12} /> Cures Statuses:
                        </span>
                        <div className="item-charges-control__pills-container">
                            {allPills.map((st) => {
                                const sel = (item.cures || []).some((c) => c.toLowerCase() === st.toLowerCase());
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        className={`item-charges-control__cure-pill ${sel ? 'item-charges-control__cure-pill--selected' : ''}`}
                                        onClick={() => handleToggleCure(st)}
                                    >
                                        {st}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <ItemAttackActionConfig
                        attackAction={item.attackAction}
                        onChange={(action) => updateInventoryItem(item.id, 'attackAction', action)}
                    />
                </div>
            )}

            {targetCandidates && (
                <ItemTargetPromptModal
                    item={item}
                    candidates={targetCandidates}
                    onSelectTarget={handleSelectTarget}
                    onClose={() => setTargetCandidates(null)}
                />
            )}

            {statChoicePrompt && (
                <ItemStatChoiceModal
                    item={statChoicePrompt.item}
                    onSelectStat={handleConfirmStatChoice}
                    onClose={() => setStatChoicePrompt(null)}
                />
            )}
        </div>
    );
}
