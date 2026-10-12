import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { TERRAIN_CONDITIONS_DATA, OTHER_FIELD_CONDITIONS_DATA } from '../../../utils/combat/fieldEffectsData';
import { WEATHER_CONDITIONS_DATA } from '../../../data/gm/gmStatusData';
import type { BattleOrganizerTimerEffect } from '../../../types/battleOrganizerTypes';

export interface BattlefieldEffectCardProps {
    title: string;
    icon: React.ReactNode;
    value: string;
    remainingRounds: number;
    onChangeName: (name: string) => void;
    onChangeRounds: (rounds: number) => void;
    extraEffects?: BattleOrganizerTimerEffect[];
    onChangeExtras?: (extras: BattleOrganizerTimerEffect[]) => void;
    category: 'weather' | 'terrain' | 'other';
    placeholder: string;
}

interface PresetItem {
    name: string;
    rounds: number;
    isCustom?: boolean;
    color?: string;
}

export function BattlefieldEffectCard({
    title,
    icon,
    value,
    remainingRounds,
    onChangeName,
    onChangeRounds,
    extraEffects,
    onChangeExtras,
    category,
    placeholder
}: BattlefieldEffectCardProps) {
    const roomCustomFieldEffects = useCharacterStore((state) => state.roomCustomFieldEffects);
    const role = useCharacterStore((state) => state.role);
    const [pendingPreset, setPendingPreset] = React.useState<PresetItem | null>(null);

    // Canonical Pokerole presets
    const canonicalPresets: PresetItem[] = React.useMemo(() => {
        if (category === 'weather') {
            return WEATHER_CONDITIONS_DATA.map((w) => ({
                name: w.name,
                rounds: 4
            }));
        }
        if (category === 'terrain') {
            return TERRAIN_CONDITIONS_DATA.map((t) => ({
                name: t.name,
                rounds: 4
            }));
        }
        return OTHER_FIELD_CONDITIONS_DATA.map((o) => ({
            name: o.name,
            rounds: o.name.toLowerCase().includes('deluge') ? 1 : 4
        }));
    }, [category]);

    // Custom homebrew field effects
    const customPresets: PresetItem[] = React.useMemo(() => {
        const visible = roomCustomFieldEffects.filter((e) => role === 'GM' || !e.gmOnly);
        const filtered = visible.filter((e) => {
            if (category === 'weather') return e.category === 'weather';
            if (category === 'terrain') return e.category === 'terrain';
            return e.category === 'field';
        });
        return filtered.map((e) => ({
            name: e.name,
            rounds: e.defaultRounds ?? 4,
            isCustom: true,
            color: e.color
        }));
    }, [roomCustomFieldEffects, category, role]);

    const isPresetActive = (presetName: string) => {
        const clean = presetName.toLowerCase().trim();
        if (value.toLowerCase().trim() === clean && remainingRounds > 0) return true;
        return Boolean(
            extraEffects?.some((e) => e.name.toLowerCase().trim() === clean && (e.remainingRounds ?? 0) > 0)
        );
    };

    const handleSelectPreset = (preset: PresetItem) => {
        const cleanPreset = preset.name.toLowerCase().trim();

        // 1. If currently active in primary slot, toggle off
        if (value.toLowerCase().trim() === cleanPreset) {
            onChangeName('');
            onChangeRounds(0);
            setPendingPreset(null);
            return;
        }

        // 2. If currently active in secondary slot, toggle off
        if (extraEffects?.some((e) => e.name.toLowerCase().trim() === cleanPreset)) {
            onChangeExtras?.(extraEffects.filter((e) => e.name.toLowerCase().trim() !== cleanPreset));
            setPendingPreset(null);
            return;
        }

        // 3. If primary slot is empty or has 0 rounds, assign to primary directly
        if (!value.trim() || remainingRounds === 0) {
            onChangeName(preset.name);
            onChangeRounds(preset.rounds);
            setPendingPreset(null);
            return;
        }

        // 4. Primary slot is occupied: prompt GM to replace primary or add as secondary
        setPendingPreset(preset);
    };

    const handleInputChange = (text: string) => {
        onChangeName(text);
        if (text.trim() && remainingRounds === 0) {
            onChangeRounds(4);
        } else if (!text.trim() && remainingRounds > 0) {
            onChangeRounds(0);
        }
    };

    const handleExtraNameChange = (idx: number, text: string) => {
        if (!extraEffects || !onChangeExtras) return;
        const next = [...extraEffects];
        const prevRounds = next[idx]?.remainingRounds ?? 0;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        next[idx] = { ...next[idx], name: text, remainingRounds: newRounds };
        onChangeExtras(next);
    };

    const handleExtraRoundsChange = (idx: number, rounds: number) => {
        if (!extraEffects || !onChangeExtras) return;
        const next = [...extraEffects];
        next[idx] = { ...next[idx], remainingRounds: rounds };
        onChangeExtras(next);
    };

    const handleRemoveExtra = (idx: number) => {
        if (!extraEffects || !onChangeExtras) return;
        const next = extraEffects.filter((_, i) => i !== idx);
        onChangeExtras(next);
    };

    const handleAddExtra = () => {
        if (!onChangeExtras) return;
        const next = [...(extraEffects || []), { name: '', remainingRounds: 4 }];
        onChangeExtras(next);
    };

    const addLabel = category === 'weather' ? 'Weather' : category === 'terrain' ? 'Terrain' : 'Field Effect';

    return (
        <div className="bo-effect-card">
            <div className="bo-effect-card__header">
                <span className="bo-field-label text-label">
                    {icon} {title}
                </span>
                <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
            </div>

            {/* Primary Slot */}
            <div className="bo-effect-card__body">
                <input
                    type="text"
                    className="bo-input bo-input--underline text-label"
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={placeholder}
                />
                <RemainingRoundsBoxes
                    value={remainingRounds}
                    onChange={onChangeRounds}
                    title={`${title} Remaining Rounds`}
                />
            </div>

            {/* Secondary Extra Slots */}
            {extraEffects && extraEffects.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {extraEffects.map((extra, idx) => (
                        <div
                            key={idx}
                            className="bo-effect-card__body"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <input
                                type="text"
                                className="bo-input bo-input--underline text-label"
                                value={extra.name}
                                onChange={(e) => handleExtraNameChange(idx, e.target.value)}
                                placeholder={`Secondary ${title}...`}
                                style={{ flex: 1 }}
                            />
                            <RemainingRoundsBoxes
                                value={extra.remainingRounds}
                                onChange={(rounds) => handleExtraRoundsChange(idx, rounds)}
                                title={`Secondary ${title} ${idx + 1} Remaining Rounds`}
                            />
                            <button
                                type="button"
                                className="bo-extra-remove-btn"
                                onClick={() => handleRemoveExtra(idx)}
                                title={`Remove this ${title.toLowerCase()}`}
                                aria-label={`Remove this ${title.toLowerCase()}`}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--semantic-danger, #ef5350)',
                                    cursor: 'pointer',
                                    padding: '3px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px'
                                }}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Inline Add Button */}
            <div style={{ marginTop: '6px' }}>
                <button
                    type="button"
                    className="bo-add-extra-btn"
                    onClick={handleAddExtra}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'transparent',
                        border: '1px dashed var(--border, #444)',
                        borderRadius: '4px',
                        color: 'var(--text-subtext, #aaa)',
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <Plus size={12} />
                    <span>+ Add {addLabel}</span>
                </button>
            </div>

            {/* Prompt when preset selected but primary slot is occupied */}
            {pendingPreset && (
                <div
                    style={{
                        background: 'color-mix(in srgb, var(--primary) 15%, var(--panel-bg))',
                        border: '1px solid var(--primary)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        marginTop: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        fontSize: '0.75rem'
                    }}
                >
                    <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        Slot has "{value}". Apply "{pendingPreset.name}" as:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={() => {
                                onChangeName(pendingPreset.name);
                                onChangeRounds(pendingPreset.rounds);
                                setPendingPreset(null);
                            }}
                        >
                            Replace Primary
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--secondary"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={() => {
                                const next = [
                                    ...(extraEffects || []),
                                    { name: pendingPreset.name, remainingRounds: pendingPreset.rounds }
                                ];
                                onChangeExtras?.(next);
                                setPendingPreset(null);
                            }}
                        >
                            Add as Secondary
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark"
                            style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                            onClick={() => setPendingPreset(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Preset chips for canonical presets and custom homebrew */}
            <div className="bo-preset-chips-row">
                {canonicalPresets.map((preset) => {
                    const isActive = isPresetActive(preset.name);
                    return (
                        <button
                            key={preset.name}
                            type="button"
                            className={`bo-preset-chip ${isActive ? 'bo-preset-chip--active' : ''}`}
                            onClick={() => handleSelectPreset(preset)}
                            title={`Set ${preset.name} (${preset.rounds} rounds)`}
                        >
                            {preset.name}
                        </button>
                    );
                })}

                {/* Custom Homebrew Dropdown / Chips */}
                {customPresets.length > 0 && (
                    <select
                        className="bo-preset-select text-subtext"
                        value={customPresets.some((c) => isPresetActive(c.name)) ? value : ''}
                        onChange={(e) => {
                            const found = customPresets.find((c) => c.name === e.target.value);
                            if (found) handleSelectPreset(found);
                        }}
                        title="Pick from Custom Homebrew Effects"
                    >
                        <option value="">+ Homebrew ({customPresets.length})</option>
                        {customPresets.map((c) => (
                            <option key={c.name} value={c.name}>
                                ★ {c.name} ({c.rounds}r)
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
}
