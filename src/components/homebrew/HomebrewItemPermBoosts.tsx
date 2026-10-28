import { useState } from 'react';
import type { CustomItem } from '../../store/entityTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TooltipIcon } from '../ui/TooltipIcon';
import { TrendingUp, AlertTriangle, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { CustomStatScopeModal } from '../modals/items/CustomStatScopeModal';

interface HomebrewItemPermBoostsProps {
    item: CustomItem;
    canEdit: boolean;
    onOpenTooltip: (tooltip: { title: string; content: string }) => void;
}

export function HomebrewItemPermBoosts({ item, canEdit, onOpenTooltip }: HomebrewItemPermBoostsProps) {
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);
    const [customModalConfig, setCustomModalConfig] = useState<{ index: number; stats: string[] } | null>(null);

    const permBoosts: Array<{ stat: string; value: number }> =
        item.permanentStatBoosts && item.permanentStatBoosts.length > 0
            ? item.permanentStatBoosts
            : item.permanentStatBoost
              ? [item.permanentStatBoost]
              : [];

    const handleAddPermBoost = () => {
        if (!canEdit) return;
        const updated = [...permBoosts, { stat: 'Strength', value: 1 }];
        updateCustomItem(item.id, 'permanentStatBoosts', updated);
        updateCustomItem(item.id, 'permanentStatBoost', updated[0]);
    };

    const handleUpdatePermBoost = (index: number, stat: string, value: number) => {
        if (!canEdit) return;
        const updated = permBoosts.map((b, i) => (i === index ? { stat, value } : b));
        updateCustomItem(item.id, 'permanentStatBoosts', updated);
        updateCustomItem(item.id, 'permanentStatBoost', updated[0]);
    };

    const handleRemovePermBoost = (index: number) => {
        if (!canEdit) return;
        const updated = permBoosts.filter((_, i) => i !== index);
        updateCustomItem(item.id, 'permanentStatBoosts', updated.length > 0 ? updated : undefined);
        updateCustomItem(item.id, 'permanentStatBoost', updated[0] || undefined);
    };

    const openCustomScopeModal = (index: number, currentStatString: string) => {
        let stats: string[] = [];
        if (currentStatString.startsWith('PlayerChoice:custom:')) {
            stats = currentStatString
                .slice('PlayerChoice:custom:'.length)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
        setCustomModalConfig({ index, stats });
    };

    const handleSaveCustomWhitelist = (selectedStats: string[]) => {
        if (!customModalConfig) return;
        const { index } = customModalConfig;
        const currentVal = permBoosts[index]?.value ?? 1;
        handleUpdatePermBoost(index, `PlayerChoice:custom:${selectedStats.join(',')}`, currentVal);
        setCustomModalConfig(null);
    };

    const handleScopeSelectChange = (index: number, newScope: string, currentValue: number) => {
        if (newScope === 'PlayerChoice:custom') {
            const defaultCustom = 'PlayerChoice:custom:Strength,Dexterity,Vitality,Special,Insight';
            handleUpdatePermBoost(index, defaultCustom, currentValue);
            openCustomScopeModal(index, defaultCustom);
        } else {
            handleUpdatePermBoost(index, newScope, currentValue);
        }
    };

    const handleMainSelectChange = (index: number, newStat: string, currentBoost: { stat: string; value: number }) => {
        if (newStat === 'PlayerChoice') {
            const scope = currentBoost.stat.startsWith('PlayerChoice:') ? currentBoost.stat : 'PlayerChoice:core';
            handleUpdatePermBoost(index, scope, currentBoost.value);
        } else {
            handleUpdatePermBoost(index, newStat, currentBoost.value);
        }
    };

    const hasVitOrInsBoost = permBoosts.some((b) => b.stat === 'Vitality' || b.stat === 'Insight');

    return (
        <div className="homebrew-item-effects__field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="homebrew-item-effects__field-label text-subtext">
                    <TrendingUp size={12} style={{ color: 'var(--primary)' }} /> Permanent Stat Boosts
                    <TooltipIcon
                        onClick={() =>
                            onOpenTooltip({
                                title: 'Permanent Stat Boost',
                                content:
                                    'Simulates permanent vitamin or rare candy stat gains. When consumed or used on a character, permanently increases the chosen Attribute, Trait, or Pool by the specified value. If Vitality, Insight, Max HP, or Max Will are boosted, pools are recalculated automatically.'
                            })
                        }
                    />
                </span>
                {canEdit && (
                    <button
                        type="button"
                        className="action-button action-button--dark text-subtext"
                        style={{
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={handleAddPermBoost}
                    >
                        <Plus size={12} /> Add Boost
                    </button>
                )}
            </div>

            {permBoosts.length === 0 ? (
                <span
                    className="text-subtext"
                    style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                >
                    No permanent boosts configured
                </span>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {permBoosts.map((boost, idx) => {
                        const isPlayerChoice = boost.stat.startsWith('PlayerChoice');
                        const isCustomScope = boost.stat.startsWith('PlayerChoice:custom');
                        const mainSelectValue = isPlayerChoice ? 'PlayerChoice' : boost.stat;
                        const currentScopeValue = isCustomScope
                            ? 'PlayerChoice:custom'
                            : boost.stat === 'PlayerChoice'
                              ? 'PlayerChoice:core'
                              : boost.stat;

                        return (
                            <div key={`perm-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <select
                                    className="homebrew-item-effects__select text-subtext"
                                    style={{ flex: 1 }}
                                    value={mainSelectValue}
                                    disabled={!canEdit}
                                    onChange={(e) => handleMainSelectChange(idx, e.target.value, boost)}
                                >
                                    <optgroup label="Core Attributes">
                                        <option value="Strength">Strength</option>
                                        <option value="Dexterity">Dexterity</option>
                                        <option value="Vitality">Vitality</option>
                                        <option value="Special">Special</option>
                                        <option value="Insight">Insight</option>
                                    </optgroup>
                                    <optgroup label="Social Attributes">
                                        <option value="Tough">Tough</option>
                                        <option value="Cool">Cool</option>
                                        <option value="Beauty">Beauty</option>
                                        <option value="Cute">Cute</option>
                                        <option value="Clever">Clever</option>
                                    </optgroup>
                                    <optgroup label="Traits & Pools">
                                        <option value="Defense">Defense</option>
                                        <option value="Special Defense">Special Defense</option>
                                        <option value="Max HP">Max HP</option>
                                        <option value="Max Will">Max Will</option>
                                    </optgroup>
                                    <optgroup label="Combo Boosts">
                                        <option value="AllCore">All Core Attributes</option>
                                        <option value="AllSocial">All Social Attributes</option>
                                        <option value="AllAttributes">All Attributes</option>
                                    </optgroup>
                                    <optgroup label="Player's Choice">
                                        <option value="PlayerChoice">Player's Choice</option>
                                    </optgroup>
                                </select>

                                {isPlayerChoice && (
                                    <select
                                        className="homebrew-item-effects__select text-subtext"
                                        style={{ flex: 1 }}
                                        value={currentScopeValue}
                                        disabled={!canEdit}
                                        onChange={(e) => handleScopeSelectChange(idx, e.target.value, boost.value)}
                                    >
                                        <option value="PlayerChoice:core">Scope: Core Attributes</option>
                                        <option value="PlayerChoice:social">Scope: Social Attributes</option>
                                        <option value="PlayerChoice:traits">Scope: Traits &amp; Pools</option>
                                        <option value="PlayerChoice:core_social">Scope: Core &amp; Social</option>
                                        <option value="PlayerChoice:any">Scope: Any Stat</option>
                                        <option value="PlayerChoice:custom">Scope: Custom...</option>
                                    </select>
                                )}

                                {isCustomScope && canEdit && (
                                    <button
                                        type="button"
                                        className="action-button action-button--dark text-subtext"
                                        style={{ padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                                        onClick={() => openCustomScopeModal(idx, boost.stat)}
                                        title="Configure Custom Allowed Stats"
                                    >
                                        <SlidersHorizontal size={13} />
                                    </button>
                                )}

                                <NumberSpinner
                                    value={boost.value}
                                    min={1}
                                    max={10}
                                    compact
                                    disabled={!canEdit}
                                    onChange={(val) => handleUpdatePermBoost(idx, boost.stat, Math.max(1, val))}
                                />
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="action-button action-button--dark"
                                        style={{ padding: '4px 6px' }}
                                        onClick={() => handleRemovePermBoost(idx)}
                                        title="Remove boost"
                                    >
                                        <Trash2 size={13} style={{ color: 'var(--semantic-danger)' }} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {hasVitOrInsBoost && (
                <div className="homebrew-item-effects__advisory">
                    <AlertTriangle size={14} className="homebrew-item-effects__advisory-icon" />
                    <span>
                        <strong>RAW Rulebook Note:</strong> Vitality and Insight are not normally eligible for item
                        boosts in official Pokérole rules, but are allowed here for homebrew flexibility.
                    </span>
                </div>
            )}

            {customModalConfig && (
                <CustomStatScopeModal
                    initialSelectedStats={customModalConfig.stats}
                    onSave={handleSaveCustomWhitelist}
                    onClose={() => setCustomModalConfig(null)}
                />
            )}
        </div>
    );
}
