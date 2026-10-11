import React from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { TERRAIN_CONDITIONS_DATA, OTHER_FIELD_CONDITIONS_DATA } from '../../../utils/combat/fieldEffectsData';
import { WEATHER_CONDITIONS_DATA } from '../../../data/gm/gmStatusData';

export interface BattlefieldEffectCardProps {
    title: string;
    icon: React.ReactNode;
    value: string;
    remainingRounds: number;
    onChangeName: (name: string) => void;
    onChangeRounds: (rounds: number) => void;
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
    category,
    placeholder
}: BattlefieldEffectCardProps) {
    const roomCustomFieldEffects = useCharacterStore((state) => state.roomCustomFieldEffects);
    const role = useCharacterStore((state) => state.role);

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

    const handleSelectPreset = (preset: PresetItem) => {
        if (value.toLowerCase().trim() === preset.name.toLowerCase().trim()) {
            // Toggle off
            onChangeName('');
            onChangeRounds(0);
        } else {
            onChangeName(preset.name);
            onChangeRounds(preset.rounds);
        }
    };

    const handleInputChange = (text: string) => {
        onChangeName(text);
        if (text.trim() && remainingRounds === 0) {
            onChangeRounds(4);
        } else if (!text.trim() && remainingRounds > 0) {
            onChangeRounds(0);
        }
    };

    return (
        <div className="bo-effect-card">
            <div className="bo-effect-card__header">
                <span className="bo-field-label text-label">
                    {icon} {title}
                </span>
                <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
            </div>

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

            {/* Preset chips for canonical presets and custom homebrew */}
            <div className="bo-preset-chips-row">
                {canonicalPresets.map((preset) => {
                    const isActive = value.toLowerCase().trim() === preset.name.toLowerCase().trim();
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
                        value={customPresets.some((c) => c.name.toLowerCase() === value.toLowerCase()) ? value : ''}
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
