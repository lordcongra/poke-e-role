import React from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { BattlefieldAutocompleteInput, type AutocompleteSuggestion } from './BattlefieldAutocompleteInput';
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
    id?: string;
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
        return OTHER_FIELD_CONDITIONS_DATA.filter((o) => o.category === 'other').map((o) => ({
            name: o.name,
            rounds: o.defaultRounds ?? 4
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
            id: e.id,
            name: e.name,
            rounds: e.defaultRounds ?? 4,
            isCustom: true,
            color: e.color
        }));
    }, [roomCustomFieldEffects, category, role]);

    const suggestions: AutocompleteSuggestion[] = React.useMemo(() => {
        const canonical = canonicalPresets.map((p) => ({
            name: p.name,
            rounds: p.rounds,
            category
        }));
        const custom = customPresets.map((p) => ({
            name: p.name,
            rounds: p.rounds,
            category
        }));
        return [...canonical, ...custom];
    }, [canonicalPresets, customPresets, category]);

    const getFilteredSuggestions = (query: string): AutocompleteSuggestion[] => {
        const clean = query.trim().toLowerCase();
        if (!clean) return suggestions;
        return suggestions.filter((s) => s.name.toLowerCase().includes(clean));
    };

    const isPresetActive = (presetName: string) => {
        const clean = presetName.toLowerCase().trim();
        if (value.toLowerCase().trim() === clean && (remainingRounds > 0 || remainingRounds === -1)) return true;
        return Boolean(
            extraEffects?.some(
                (e) =>
                    e.name.toLowerCase().trim() === clean && ((e.remainingRounds ?? 0) > 0 || e.remainingRounds === -1)
            )
        );
    };

    const handleSelectPreset = (preset: PresetItem) => {
        const cleanPreset = preset.name.toLowerCase().trim();

        // 1. If currently in primary slot: only toggle off if remainingRounds > 0 or -1, reactivate if remainingRounds === 0
        if (value.toLowerCase().trim() === cleanPreset) {
            if (remainingRounds > 0 || remainingRounds === -1) {
                onChangeName('');
                onChangeRounds(0);
                setPendingPreset(null);
                return;
            } else {
                onChangeName(preset.name);
                onChangeRounds(preset.rounds);
                setPendingPreset(null);
                return;
            }
        }

        // 2. If currently in secondary slot: only toggle off if active, reactivate if 0
        const matchingExtra = extraEffects?.find((e) => e.name.toLowerCase().trim() === cleanPreset);
        if (matchingExtra) {
            if ((matchingExtra.remainingRounds ?? 0) > 0 || matchingExtra.remainingRounds === -1) {
                onChangeExtras?.(extraEffects!.filter((e) => e.name.toLowerCase().trim() !== cleanPreset));
                setPendingPreset(null);
                return;
            } else {
                onChangeExtras?.(
                    extraEffects!.map((e) =>
                        e.name.toLowerCase().trim() === cleanPreset ? { ...e, remainingRounds: preset.rounds } : e
                    )
                );
                setPendingPreset(null);
                return;
            }
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
        } else if (!text.trim() && (remainingRounds > 0 || remainingRounds === -1)) {
            onChangeRounds(0);
        }
    };

    const handleSelectSuggestion = (item: AutocompleteSuggestion) => {
        onChangeName(item.name);
        onChangeRounds(item.rounds ?? 4);
    };

    const handleExtraNameChange = (idx: number, text: string) => {
        if (!extraEffects || !onChangeExtras) return;
        const next = [...extraEffects];
        const prevRounds = next[idx]?.remainingRounds ?? 0;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && (prevRounds > 0 || prevRounds === -1)) newRounds = 0;
        next[idx] = { ...next[idx], name: text, remainingRounds: newRounds };
        onChangeExtras(next);
    };

    const handleSelectExtraSuggestion = (idx: number, item: AutocompleteSuggestion) => {
        if (!extraEffects || !onChangeExtras) return;
        const next = [...extraEffects];
        next[idx] = { ...next[idx], name: item.name, remainingRounds: item.rounds ?? 4 };
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
                <BattlefieldAutocompleteInput
                    value={value}
                    onChange={handleInputChange}
                    onSelect={handleSelectSuggestion}
                    suggestions={getFilteredSuggestions(value)}
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
                            <BattlefieldAutocompleteInput
                                value={extra.name}
                                onChange={(val) => handleExtraNameChange(idx, val)}
                                onSelect={(item) => handleSelectExtraSuggestion(idx, item)}
                                suggestions={getFilteredSuggestions(extra.name)}
                                placeholder={`Secondary ${title}...`}
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
                    const roundText = preset.rounds === -1 ? 'Whole Scene' : `${preset.rounds} rounds`;
                    return (
                        <button
                            key={preset.name}
                            type="button"
                            className={`bo-preset-chip ${isActive ? 'bo-preset-chip--active' : ''}`}
                            onClick={() => handleSelectPreset(preset)}
                            title={`Set ${preset.name} (${roundText})`}
                        >
                            {preset.name}
                        </button>
                    );
                })}

                {/* Custom Homebrew Chips */}
                {customPresets.map((preset, pIdx) => {
                    const isActive = isPresetActive(preset.name);
                    const roundText = preset.rounds === -1 ? 'Whole Scene' : `${preset.rounds} rounds`;
                    const customStyle: React.CSSProperties = {};
                    if (preset.color) {
                        if (isActive) {
                            customStyle.background = preset.color;
                            customStyle.borderColor = preset.color;
                            customStyle.color = '#ffffff';
                        } else {
                            customStyle.borderColor = preset.color;
                            customStyle.color = preset.color;
                        }
                    }
                    return (
                        <button
                            key={preset.id || `${preset.name}-${pIdx}`}
                            type="button"
                            className={`bo-preset-chip bo-preset-chip--custom ${isActive ? 'bo-preset-chip--active' : ''}`}
                            onClick={() => handleSelectPreset(preset)}
                            title={`Set Custom: ${preset.name} (${roundText})`}
                            style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
                        >
                            <Star size={10} fill="currentColor" style={{ marginRight: 4, verticalAlign: 'middle' }} />{' '}
                            {preset.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
