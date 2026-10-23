import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/entityTypes';
import { CORE_CURABLE_STATUSES, CORE_INFLICTABLE_STATUSES } from '../../utils/items/itemCharges';
import { ItemAttackActionConfig } from '../items/ItemAttackActionConfig';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TooltipIcon } from '../ui/TooltipIcon';
import { HomebrewItemRecoverySection } from './HomebrewItemRecoverySection';
import { HomebrewItemStatsSection } from './HomebrewItemStatsSection';
import { HomebrewEffectsTooltipModal } from './HomebrewEffectsTooltipModal';
import {
    ChevronDown,
    ChevronUp,
    Battery,
    ShieldAlert,
    Skull
} from 'lucide-react';

interface HomebrewItemEffectsSectionProps {
    item: CustomItem;
    canEdit: boolean;
}

export function HomebrewItemEffectsSection({ item, canEdit }: HomebrewItemEffectsSectionProps) {
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);
    const roomCustomStatuses = useCharacterStore((state) => state.roomCustomStatuses);

    const hasConfigured = Boolean(
        (typeof item.charges === 'number' && item.charges > 0) ||
        item.destroyOnDepletion === false ||
        item.healHp ||
        item.healWill ||
        (item.cures && item.cures.length > 0) ||
        item.permanentStatBoost ||
        item.statBuff ||
        item.statDebuff ||
        item.gainTempHp ||
        item.gainTempWill ||
        item.dungeonPassive ||
        (item.inflictsStatus && item.inflictsStatus.length > 0) ||
        Boolean(item.attackAction)
    );
    const [isExpanded, setIsExpanded] = useState(() => hasConfigured);
    const [activeTooltip, setActiveTooltip] = useState<{ title: string; content: string } | null>(null);

    const handleToggleCure = (statusName: string) => {
        if (!canEdit) return;
        const current = item.cures || [];
        const isSelected = current.some((c) => c.toLowerCase() === statusName.toLowerCase());
        const updated = isSelected
            ? current.filter((c) => c.toLowerCase() !== statusName.toLowerCase())
            : [...current, statusName];
        updateCustomItem(item.id, 'cures', updated.length > 0 ? updated : undefined);
    };

    const handleToggleInflict = (statusName: string) => {
        if (!canEdit) return;
        const current = item.inflictsStatus || [];
        const isSelected = current.some((c) => c.toLowerCase() === statusName.toLowerCase());
        const updated = isSelected
            ? current.filter((c) => c.toLowerCase() !== statusName.toLowerCase())
            : [...current, statusName];
        updateCustomItem(item.id, 'inflictsStatus', updated.length > 0 ? updated : undefined);
    };

    const curablePills: string[] = [
        ...CORE_CURABLE_STATUSES,
        ...(roomCustomStatuses || [])
            .map((s) => s.name?.trim())
            .filter(
                (n): n is string =>
                    Boolean(n) && !CORE_CURABLE_STATUSES.some((c) => c.toLowerCase() === n.toLowerCase())
            )
    ];

    const inflictPills: string[] = [
        ...CORE_INFLICTABLE_STATUSES,
        ...(roomCustomStatuses || [])
            .map((s) => s.name?.trim())
            .filter(
                (n): n is string =>
                    Boolean(n) &&
                    n !== 'All Statuses' &&
                    n !== 'Healthy' &&
                    !CORE_INFLICTABLE_STATUSES.some((c) => c.toLowerCase() === n.toLowerCase())
            )
    ];

    return (
        <div className="homebrew-item-effects">
            <button
                type="button"
                className="homebrew-item-effects__toggle text-subtext"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="homebrew-item-effects__toggle-title">
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>Item Effects, Charges & Passives</span>
                </span>
                {hasConfigured && (
                    <span className="homebrew-item-effects__badge" title="Has charges or effects configured">
                        Configured
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="homebrew-item-effects__body">
                    {/* Item Charges & Retention */}
                    <div className="homebrew-item-effects__charges-row">
                        <div className="homebrew-item-effects__field homebrew-item-effects__field--inline">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Battery size={13} /> Default Charges
                            </span>
                            <NumberSpinner
                                value={item.charges ?? 0}
                                min={0}
                                max={99}
                                compact
                                disabled={!canEdit}
                                onChange={(val) => {
                                    if (val <= 0) {
                                        updateCustomItem(item.id, 'charges', undefined);
                                        updateCustomItem(item.id, 'maxCharges', undefined);
                                    } else {
                                        updateCustomItem(item.id, 'charges', val);
                                        updateCustomItem(item.id, 'maxCharges', val);
                                    }
                                }}
                            />
                        </div>

                        <label className="homebrew-item-effects__checkbox-row text-subtext">
                            <input
                                type="checkbox"
                                checked={item.destroyOnDepletion === false}
                                disabled={!canEdit}
                                onChange={(e) =>
                                    updateCustomItem(
                                        item.id,
                                        'destroyOnDepletion',
                                        e.target.checked ? false : undefined
                                    )
                                }
                            />
                            <span>Retain item in bag when depleted (keep at 0 charges)</span>
                        </label>
                    </div>

                    {/* Columns Grid: Left = Recovery, Right = Stats */}
                    <div className="homebrew-item-effects__columns-grid">
                        <HomebrewItemRecoverySection
                            item={item}
                            canEdit={canEdit}
                            onChange={(field, val) => updateCustomItem(item.id, field, val)}
                        />
                        <HomebrewItemStatsSection
                            item={item}
                            canEdit={canEdit}
                            onOpenTooltip={(tip) => setActiveTooltip(tip)}
                        />
                    </div>


                    {/* Cures Statuses */}
                    <div className="homebrew-item-effects__cures-section">
                        <span className="homebrew-item-effects__cures-title text-subtext">
                            <ShieldAlert size={12} /> Cures Statuses:
                        </span>
                        <div className="homebrew-item-effects__pills-container">
                            {curablePills.map((st) => {
                                const isSelected = (item.cures || []).some((c) => c.toLowerCase() === st.toLowerCase());
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        disabled={!canEdit}
                                        className={`homebrew-item-effects__pill ${
                                            isSelected ? 'homebrew-item-effects__pill--selected' : ''
                                        }`}
                                        onClick={() => handleToggleCure(st)}
                                    >
                                        {st}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Inflicts Statuses */}
                    <div className="homebrew-item-effects__cures-section">
                        <span className="homebrew-item-effects__cures-title text-subtext">
                            <Skull size={12} style={{ color: 'var(--semantic-danger)' }} /> Inflicts Statuses:
                            <TooltipIcon
                                onClick={() =>
                                    setActiveTooltip({
                                        title: 'Inflicts Statuses',
                                        content:
                                            'Using this item automatically applies the selected status conditions (including any room custom homebrew statuses) to the target Pokémon’s active conditions roster.'
                                    })
                                }
                            />
                        </span>
                        <div className="homebrew-item-effects__pills-container">
                            {inflictPills.map((st) => {
                                const isSelected = (item.inflictsStatus || []).some(
                                    (c) => c.toLowerCase() === st.toLowerCase()
                                );
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        disabled={!canEdit}
                                        className={`homebrew-item-effects__pill ${
                                            isSelected ? 'homebrew-item-effects__pill--selected' : ''
                                        }`}
                                        onClick={() => handleToggleInflict(st)}
                                    >
                                        {st}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Attack / Move Action */}
                    <ItemAttackActionConfig
                        attackAction={item.attackAction}
                        onChange={(action) => updateCustomItem(item.id, 'attackAction', action)}
                        canEdit={canEdit}
                    />
                </div>
            )}

            {/* Tooltip Modal */}
            <HomebrewEffectsTooltipModal tooltip={activeTooltip} onClose={() => setActiveTooltip(null)} />
        </div>
    );
}
