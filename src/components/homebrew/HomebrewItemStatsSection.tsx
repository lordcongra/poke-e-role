import type { CustomItem } from '../../store/entityTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TooltipIcon } from '../ui/TooltipIcon';
import { TrendingUp, TrendingDown, AlertTriangle, Scroll, Plus, Trash2 } from 'lucide-react';

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

    // --- PERMANENT STAT BOOSTS ---
    const permBoosts: Array<{
        stat: 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight' | 'PlayerChoice';
        value: number;
    }> =
        item.permanentStatBoosts && item.permanentStatBoosts.length > 0
            ? item.permanentStatBoosts
            : item.permanentStatBoost
              ? [item.permanentStatBoost]
              : [];

    const handleAddPermBoost = () => {
        if (!canEdit) return;
        const updated = [...permBoosts, { stat: 'Strength' as const, value: 1 }];
        updateCustomItem(item.id, 'permanentStatBoosts', updated);
        updateCustomItem(item.id, 'permanentStatBoost', updated[0]);
    };

    const handleUpdatePermBoost = (index: number, stat: string, value: number) => {
        if (!canEdit) return;
        const updated = permBoosts.map((b, i) =>
            i === index
                ? {
                      stat: stat as 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight' | 'PlayerChoice',
                      value
                  }
                : b
        );
        updateCustomItem(item.id, 'permanentStatBoosts', updated);
        updateCustomItem(item.id, 'permanentStatBoost', updated[0]);
    };

    const handleRemovePermBoost = (index: number) => {
        if (!canEdit) return;
        const updated = permBoosts.filter((_, i) => i !== index);
        updateCustomItem(item.id, 'permanentStatBoosts', updated.length > 0 ? updated : undefined);
        updateCustomItem(item.id, 'permanentStatBoost', updated[0] || undefined);
    };

    // --- ENCOUNTER BUFFS ---
    const buffs: Array<{ stat: string; value: number }> =
        item.statBuffs && item.statBuffs.length > 0 ? item.statBuffs : item.statBuff ? [item.statBuff] : [];

    const handleAddBuff = () => {
        if (!canEdit) return;
        const updated = [...buffs, { stat: 'Strength', value: 1 }];
        updateCustomItem(item.id, 'statBuffs', updated);
        updateCustomItem(item.id, 'statBuff', updated[0]);
    };

    const handleUpdateBuff = (index: number, stat: string, value: number) => {
        if (!canEdit) return;
        const updated = buffs.map((b, i) => (i === index ? { stat, value } : b));
        updateCustomItem(item.id, 'statBuffs', updated);
        updateCustomItem(item.id, 'statBuff', updated[0]);
    };

    const handleRemoveBuff = (index: number) => {
        if (!canEdit) return;
        const updated = buffs.filter((_, i) => i !== index);
        updateCustomItem(item.id, 'statBuffs', updated.length > 0 ? updated : undefined);
        updateCustomItem(item.id, 'statBuff', updated[0] || undefined);
    };

    // --- ENCOUNTER DEBUFFS ---
    const debuffs: Array<{ stat: string; value: number }> =
        item.statDebuffs && item.statDebuffs.length > 0 ? item.statDebuffs : item.statDebuff ? [item.statDebuff] : [];

    const handleAddDebuff = () => {
        if (!canEdit) return;
        const updated = [...debuffs, { stat: 'Defense', value: 1 }];
        updateCustomItem(item.id, 'statDebuffs', updated);
        updateCustomItem(item.id, 'statDebuff', updated[0]);
    };

    const handleUpdateDebuff = (index: number, stat: string, value: number) => {
        if (!canEdit) return;
        const updated = debuffs.map((d, i) => (i === index ? { stat, value } : d));
        updateCustomItem(item.id, 'statDebuffs', updated);
        updateCustomItem(item.id, 'statDebuff', updated[0]);
    };

    const handleRemoveDebuff = (index: number) => {
        if (!canEdit) return;
        const updated = debuffs.filter((_, i) => i !== index);
        updateCustomItem(item.id, 'statDebuffs', updated.length > 0 ? updated : undefined);
        updateCustomItem(item.id, 'statDebuff', updated[0] || undefined);
    };

    // --- DUNGEON PASSIVES ---
    const passives: string[] =
        item.dungeonPassives && item.dungeonPassives.length > 0
            ? item.dungeonPassives
            : item.dungeonPassive
              ? [item.dungeonPassive]
              : [];

    const handleAddPassive = () => {
        if (!canEdit) return;
        const updated = [...passives, ''];
        updateCustomItem(item.id, 'dungeonPassives', updated);
        updateCustomItem(item.id, 'dungeonPassive', updated[0]);
    };

    const handleUpdatePassive = (index: number, text: string) => {
        if (!canEdit) return;
        const updated = passives.map((p, i) => (i === index ? text : p));
        updateCustomItem(item.id, 'dungeonPassives', updated);
        updateCustomItem(item.id, 'dungeonPassive', updated[0] || undefined);
    };

    const handleRemovePassive = (index: number) => {
        if (!canEdit) return;
        const updated = passives.filter((_, i) => i !== index);
        updateCustomItem(item.id, 'dungeonPassives', updated.length > 0 ? updated : undefined);
        updateCustomItem(item.id, 'dungeonPassive', updated[0] || undefined);
    };

    const hasVitOrInsBoost = permBoosts.some((b) => b.stat === 'Vitality' || b.stat === 'Insight');

    return (
        <div className="homebrew-item-effects__stats-section">
            {/* Permanent Stat Boosts */}
            <div className="homebrew-item-effects__field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="homebrew-item-effects__field-label text-subtext">
                        <TrendingUp size={12} style={{ color: 'var(--primary)' }} /> Permanent Stat Boosts
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
                        {permBoosts.map((boost, idx) => (
                            <div key={`perm-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <select
                                    className="homebrew-item-effects__select text-subtext"
                                    style={{ flex: 1 }}
                                    value={boost.stat}
                                    disabled={!canEdit}
                                    onChange={(e) => handleUpdatePermBoost(idx, e.target.value, boost.value)}
                                >
                                    {STAT_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt === 'PlayerChoice' ? 'Player Choice (Rare Candy)' : opt}
                                        </option>
                                    ))}
                                </select>
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
                        ))}
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
            </div>

            {/* Encounter Stat Buffs & Debuffs */}
            <div className="homebrew-item-effects__fields-grid">
                {/* Encounter Buffs */}
                <div className="homebrew-item-effects__field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <TrendingUp size={12} style={{ color: 'var(--secondary)' }} /> Encounter Buffs
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
                                onClick={handleAddBuff}
                            >
                                <Plus size={12} /> Add
                            </button>
                        )}
                    </div>
                    {buffs.length === 0 ? (
                        <span
                            className="text-subtext"
                            style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                        >
                            None
                        </span>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {buffs.map((buff, idx) => (
                                <div key={`buff-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <select
                                        className="homebrew-item-effects__select text-subtext"
                                        style={{ flex: 1 }}
                                        value={buff.stat}
                                        disabled={!canEdit}
                                        onChange={(e) => handleUpdateBuff(idx, e.target.value, buff.value)}
                                    >
                                        {COMBAT_AND_DERIVED_STATS.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                    <NumberSpinner
                                        value={buff.value}
                                        min={1}
                                        max={10}
                                        compact
                                        disabled={!canEdit}
                                        onChange={(val) => handleUpdateBuff(idx, buff.stat, Math.max(1, val))}
                                    />
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            style={{ padding: '4px 6px' }}
                                            onClick={() => handleRemoveBuff(idx)}
                                            title="Remove buff"
                                        >
                                            <Trash2 size={13} style={{ color: 'var(--semantic-danger)' }} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Encounter Debuffs */}
                <div className="homebrew-item-effects__field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="homebrew-item-effects__field-label text-subtext">
                            <TrendingDown size={12} style={{ color: 'var(--semantic-danger)' }} /> Encounter Debuffs
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
                                onClick={handleAddDebuff}
                            >
                                <Plus size={12} /> Add
                            </button>
                        )}
                    </div>
                    {debuffs.length === 0 ? (
                        <span
                            className="text-subtext"
                            style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                        >
                            None
                        </span>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {debuffs.map((debuff, idx) => (
                                <div
                                    key={`debuff-${idx}`}
                                    style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                                >
                                    <select
                                        className="homebrew-item-effects__select text-subtext"
                                        style={{ flex: 1 }}
                                        value={debuff.stat}
                                        disabled={!canEdit}
                                        onChange={(e) => handleUpdateDebuff(idx, e.target.value, debuff.value)}
                                    >
                                        {COMBAT_AND_DERIVED_STATS.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                    <NumberSpinner
                                        value={debuff.value}
                                        min={1}
                                        max={10}
                                        compact
                                        disabled={!canEdit}
                                        onChange={(val) => handleUpdateDebuff(idx, debuff.stat, Math.max(1, val))}
                                    />
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            style={{ padding: '4px 6px' }}
                                            onClick={() => handleRemoveDebuff(idx)}
                                            title="Remove debuff"
                                        >
                                            <Trash2 size={13} style={{ color: 'var(--semantic-danger)' }} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Dungeon Passives */}
            <div className="homebrew-item-effects__field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="homebrew-item-effects__field-label text-subtext">
                        <Scroll size={12} /> Dungeon Passives / Rules Granted
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Dungeon Passives / Rules Granted',
                                    content:
                                        'When consumed or used, these rule texts are directly granted into the target Pokémon’s active Passives & Conditions tracker on their sheet (e.g. [Rock Walk] or custom dungeon exploration rules).'
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
                            onClick={handleAddPassive}
                        >
                            <Plus size={12} /> Add Passive
                        </button>
                    )}
                </div>

                {passives.length === 0 ? (
                    <span
                        className="text-subtext"
                        style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                    >
                        No dungeon passives configured
                    </span>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {passives.map((passiveText, idx) => (
                            <div key={`passive-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="homebrew-item-effects__input text-subtext"
                                    style={{ flex: 1 }}
                                    value={passiveText}
                                    placeholder="e.g. [Rock Walk] or Grants immunity to environmental hazards"
                                    disabled={!canEdit}
                                    onChange={(e) => handleUpdatePassive(idx, e.target.value)}
                                />
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="action-button action-button--dark"
                                        style={{ padding: '4px 6px' }}
                                        onClick={() => handleRemovePassive(idx)}
                                        title="Remove passive"
                                    >
                                        <Trash2 size={13} style={{ color: 'var(--semantic-danger)' }} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
