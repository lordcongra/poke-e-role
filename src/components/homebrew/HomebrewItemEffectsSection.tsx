import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/entityTypes';
import { CORE_CURABLE_STATUSES } from '../../utils/items/itemCharges';
import { ItemAttackActionConfig } from '../items/ItemAttackActionConfig';
import {
    ChevronDown,
    ChevronUp,
    Battery,
    Heart,
    Zap,
    ShieldAlert,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    ShieldPlus,
    Scroll,
    Skull
} from 'lucide-react';

interface HomebrewItemEffectsSectionProps {
    item: CustomItem;
    canEdit: boolean;
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
        item.dungeonPassive ||
        (item.inflictsStatus && item.inflictsStatus.length > 0) ||
        Boolean(item.attackAction)
    );
    const [isExpanded, setIsExpanded] = useState(() => hasConfigured);

    const handleChargesChange = (raw: string) => {
        if (!canEdit) return;
        const trimmed = raw.trim();
        const num = trimmed === '' ? undefined : parseInt(trimmed, 10);
        if (num === undefined || isNaN(num) || num <= 0) {
            updateCustomItem(item.id, 'charges', undefined);
            updateCustomItem(item.id, 'maxCharges', undefined);
        } else {
            updateCustomItem(item.id, 'charges', num);
            updateCustomItem(item.id, 'maxCharges', num);
        }
    };

    const handleEffectNum = (field: 'healHp' | 'healWill' | 'gainTempHp', raw: string) => {
        if (!canEdit) return;
        const trimmed = raw.trim();
        const num = trimmed === '' ? undefined : Math.max(0, parseInt(trimmed, 10) || 0);
        updateCustomItem(item.id, field, num);
    };

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

    const handlePermanentStatValue = (valStr: string) => {
        if (!canEdit || !item.permanentStatBoost) return;
        const num = Math.max(1, parseInt(valStr, 10) || 1);
        updateCustomItem(item.id, 'permanentStatBoost', {
            ...item.permanentStatBoost,
            value: num
        });
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

    const handleBuffValue = (valStr: string) => {
        if (!canEdit || !item.statBuff) return;
        const num = Math.max(1, parseInt(valStr, 10) || 1);
        updateCustomItem(item.id, 'statBuff', { ...item.statBuff, value: num });
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

    const handleDebuffValue = (valStr: string) => {
        if (!canEdit || !item.statDebuff) return;
        const num = Math.max(1, parseInt(valStr, 10) || 1);
        updateCustomItem(item.id, 'statDebuff', { ...item.statDebuff, value: num });
    };

    const activeCustomNames = (roomCustomStatuses || [])
        .map((s) => s.name?.trim())
        .filter(
            (n): n is string => Boolean(n) && !CORE_CURABLE_STATUSES.some((c) => c.toLowerCase() === n.toLowerCase())
        );
    const allStatusPills: string[] = [...CORE_CURABLE_STATUSES, ...activeCustomNames];

    const isVitOrInsBoost =
        item.permanentStatBoost?.stat === 'Vitality' || item.permanentStatBoost?.stat === 'Insight';

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
                    {/* Charges & Depletion */}
                    <div className="homebrew-item-effects__fields-grid">
                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Battery size={12} /> Default Charges
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.charges ?? ''}
                                placeholder="0 (Single-use)"
                                disabled={!canEdit}
                                onChange={(e) => handleChargesChange(e.target.value)}
                            />
                        </label>

                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Heart size={12} style={{ color: 'var(--semantic-danger)' }} /> Heal HP
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.healHp ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={(e) => handleEffectNum('healHp', e.target.value)}
                            />
                        </label>

                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Zap size={12} style={{ color: 'var(--primary)' }} /> Heal Will
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.healWill ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={(e) => handleEffectNum('healWill', e.target.value)}
                            />
                        </label>

                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <ShieldPlus size={12} style={{ color: 'var(--secondary)' }} /> Gain Temp HP
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.gainTempHp ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={(e) => handleEffectNum('gainTempHp', e.target.value)}
                            />
                        </label>
                    </div>

                    {/* Depletion Retention Option */}
                    <label className="homebrew-item-effects__checkbox-row text-subtext">
                        <input
                            type="checkbox"
                            checked={item.destroyOnDepletion === false}
                            disabled={!canEdit}
                            onChange={(e) =>
                                updateCustomItem(item.id, 'destroyOnDepletion', e.target.checked ? false : undefined)
                            }
                        />
                        <span>Retain item in bag when depleted (keep at 0 charges)</span>
                    </label>

                    {/* Permanent Stat Boost */}
                    <div className="homebrew-item-effects__field">
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <TrendingUp size={12} style={{ color: 'var(--primary)' }} /> Permanent Stat Boost
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '6px' }}>
                            <select
                                className="homebrew-item-effects__select text-subtext"
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
                            <input
                                type="number"
                                min={1}
                                max={10}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.permanentStatBoost?.value ?? 1}
                                disabled={!canEdit || !item.permanentStatBoost}
                                onChange={(e) => handlePermanentStatValue(e.target.value)}
                                title="Stat boost amount (e.g. +1)"
                            />
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '4px' }}>
                                <select
                                    className="homebrew-item-effects__select text-subtext"
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
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="homebrew-item-effects__input text-subtext"
                                    value={item.statBuff?.value ?? 1}
                                    disabled={!canEdit || !item.statBuff}
                                    onChange={(e) => handleBuffValue(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <TrendingDown size={12} style={{ color: 'var(--semantic-danger)' }} /> Encounter Debuff
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '4px' }}>
                                <select
                                    className="homebrew-item-effects__select text-subtext"
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
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="homebrew-item-effects__input text-subtext"
                                    value={item.statDebuff?.value ?? 1}
                                    disabled={!canEdit || !item.statDebuff}
                                    onChange={(e) => handleDebuffValue(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dungeon Passive */}
                    <label className="homebrew-item-effects__field">
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <Scroll size={12} /> Dungeon Passive / Rule Granted
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

                    {/* Cures Statuses */}
                    <div className="homebrew-item-effects__cures-section">
                        <span className="homebrew-item-effects__cures-title text-subtext">
                            <ShieldAlert size={12} /> Cures Statuses:
                        </span>
                        <div className="homebrew-item-effects__pills-container">
                            {allStatusPills.map((st) => {
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
                        </span>
                        <div className="homebrew-item-effects__pills-container">
                            {allStatusPills
                                .filter((s) => s !== 'All Statuses' && s !== 'Healthy')
                                .map((st) => {
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
        </div>
    );
}
