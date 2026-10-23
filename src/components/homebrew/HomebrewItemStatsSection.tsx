import type { CustomItem } from '../../store/entityTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TooltipIcon } from '../ui/TooltipIcon';
import { TrendingUp, TrendingDown, AlertTriangle, Scroll } from 'lucide-react';

interface HomebrewItemStatsSectionProps {
    item: CustomItem;
    canEdit: boolean;
    onOpenTooltip: (tooltip: { title: string; content: string }) => void;
}

const STAT_OPTIONS = ['Strength', 'Dexterity', 'Vitality', 'Special', 'Insight', 'PlayerChoice'] as const;
const COMBAT_AND_DERIVED_STATS = [
    'Strength',
    'Dexterity',
    'Vitality',
    'Special',
    'Insight',
    'Defense',
    'Special Defense'
] as const;

export function HomebrewItemStatsSection({ item, canEdit, onOpenTooltip }: HomebrewItemStatsSectionProps) {
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);

    const handlePermanentStatSelect = (statVal: string) => {
        if (!canEdit) return;
        if (!statVal || statVal === 'None') {
            updateCustomItem(item.id, 'permanentStatBoost', undefined);
        } else {
            const currentVal = item.permanentStatBoost?.value ?? 1;
            updateCustomItem(item.id, 'permanentStatBoost', {
                stat: statVal as 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight' | 'PlayerChoice',
                value: currentVal
            });
        }
    };

    const handleBuffSelect = (statVal: string) => {
        if (!canEdit) return;
        if (!statVal || statVal === 'None') {
            updateCustomItem(item.id, 'statBuff', undefined);
        } else {
            const currentVal = item.statBuff?.value ?? 1;
            updateCustomItem(item.id, 'statBuff', { stat: statVal, value: currentVal });
        }
    };

    const handleDebuffSelect = (statVal: string) => {
        if (!canEdit) return;
        if (!statVal || statVal === 'None') {
            updateCustomItem(item.id, 'statDebuff', undefined);
        } else {
            const currentVal = item.statDebuff?.value ?? 1;
            updateCustomItem(item.id, 'statDebuff', { stat: statVal, value: currentVal });
        }
    };

    const isVitOrInsBoost = item.permanentStatBoost?.stat === 'Vitality' || item.permanentStatBoost?.stat === 'Insight';

    return (
        <div className="homebrew-item-effects__stats-section">
            {/* Permanent Stat Boost */}
            <div className="homebrew-item-effects__field">
                <span className="homebrew-item-effects__field-label text-subtext">
                    <TrendingUp size={12} style={{ color: 'var(--primary)' }} /> Permanent Stat Boost
                    <TooltipIcon
                        onClick={() =>
                            onOpenTooltip({
                                title: 'Permanent Stat Boost',
                                content:
                                    'Simulates permanent vitamin or rare candy stat gains. When consumed or used on a character, permanently increases the chosen Attribute by the specified value. If Vitality or Insight are boosted, max HP or Will are recalculated automatically.'
                            })
                        }
                    />
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                        className="homebrew-item-effects__select text-subtext"
                        style={{ flex: 1 }}
                        value={item.permanentStatBoost?.stat || 'None'}
                        disabled={!canEdit}
                        onChange={(e) => handlePermanentStatSelect(e.target.value)}
                    >
                        <option value="None">None</option>
                        {STAT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt === 'PlayerChoice' ? 'Player Choice (Rare Candy)' : opt}
                            </option>
                        ))}
                    </select>
                    {Boolean(item.permanentStatBoost) && (
                        <NumberSpinner
                            value={item.permanentStatBoost?.value ?? 1}
                            min={1}
                            max={10}
                            compact
                            disabled={!canEdit}
                            onChange={(val) => {
                                if (!item.permanentStatBoost) return;
                                updateCustomItem(item.id, 'permanentStatBoost', {
                                    ...item.permanentStatBoost,
                                    value: Math.max(1, val)
                                });
                            }}
                        />
                    )}
                </div>

                {/* RAW Rulebook Advisory Note */}
                {isVitOrInsBoost && (
                    <div className="homebrew-item-effects__advisory">
                        <AlertTriangle size={14} className="homebrew-item-effects__advisory-icon" />
                        <span>
                            <strong>RAW Rulebook Note:</strong> Vitality and Insight are not normally eligible
                            for item boosts in official Pokérole rules, but are allowed here for homebrew
                            flexibility.
                        </span>
                    </div>
                )}
            </div>

            {/* Encounter Stat Buff & Debuff */}
            <div className="homebrew-item-effects__fields-grid">
                <div className="homebrew-item-effects__field">
                    <span className="homebrew-item-effects__field-label text-subtext">
                        <TrendingUp size={12} style={{ color: 'var(--secondary)' }} /> Encounter Buff
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select
                            className="homebrew-item-effects__select text-subtext"
                            style={{ flex: 1 }}
                            value={item.statBuff?.stat || 'None'}
                            disabled={!canEdit}
                            onChange={(e) => handleBuffSelect(e.target.value)}
                        >
                            <option value="None">None</option>
                            {COMBAT_AND_DERIVED_STATS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        {Boolean(item.statBuff) && (
                            <NumberSpinner
                                value={item.statBuff?.value ?? 1}
                                min={1}
                                max={10}
                                compact
                                disabled={!canEdit}
                                onChange={(val) => {
                                    if (!item.statBuff) return;
                                    updateCustomItem(item.id, 'statBuff', {
                                        ...item.statBuff,
                                        value: Math.max(1, val)
                                    });
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="homebrew-item-effects__field">
                    <span className="homebrew-item-effects__field-label text-subtext">
                        <TrendingDown size={12} style={{ color: 'var(--semantic-danger)' }} /> Encounter Debuff
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select
                            className="homebrew-item-effects__select text-subtext"
                            style={{ flex: 1 }}
                            value={item.statDebuff?.stat || 'None'}
                            disabled={!canEdit}
                            onChange={(e) => handleDebuffSelect(e.target.value)}
                        >
                            <option value="None">None</option>
                            {COMBAT_AND_DERIVED_STATS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        {Boolean(item.statDebuff) && (
                            <NumberSpinner
                                value={item.statDebuff?.value ?? 1}
                                min={1}
                                max={10}
                                compact
                                disabled={!canEdit}
                                onChange={(val) => {
                                    if (!item.statDebuff) return;
                                    updateCustomItem(item.id, 'statDebuff', {
                                        ...item.statDebuff,
                                        value: Math.max(1, val)
                                    });
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Dungeon Passive */}
            <label className="homebrew-item-effects__field">
                <span className="homebrew-item-effects__field-label text-subtext">
                    <Scroll size={12} /> Dungeon Passive / Rule Granted
                    <TooltipIcon
                        onClick={() =>
                            onOpenTooltip({
                                title: 'Dungeon Passive / Rule Granted',
                                content:
                                    'When consumed or used, this rule text is directly granted into the target Pokémon’s active Passives & Conditions tracker on their sheet (e.g. [Rock Walk] or custom dungeon exploration rules).'
                            })
                        }
                    />
                </span>
                <input
                    type="text"
                    className="homebrew-item-effects__input text-subtext"
                    value={item.dungeonPassive || ''}
                    placeholder="e.g. [Rock Walk] or Grants immunity to environmental hazards"
                    disabled={!canEdit}
                    onChange={(e) => {
                        const val = e.target.value;
                        updateCustomItem(item.id, 'dungeonPassive', val.trim() ? val : undefined);
                    }}
                />
            </label>
        </div>
    );
}
