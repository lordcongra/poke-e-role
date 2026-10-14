import { useState, useEffect, useRef } from 'react';
import { Shield, Plus, Trash2, Zap } from 'lucide-react';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { fetchMoveLookupIndex } from '../../../utils/api/api';
import type { MoveLookupEntry } from '../../../utils/api/apiTypes';
import type { BattlefieldSideData, BattleOrganizerTimerEffect } from '../../../types/battleOrganizerTypes';

export interface BattlefieldSidePanelProps {
    side: 'player' | 'foe';
    title: string;
    sideData: BattlefieldSideData;
    onUpdateSide: <K extends keyof BattlefieldSideData>(key: K, value: BattlefieldSideData[K]) => void;
}

const SUPPORTED_DAMAGE_MOVES = new Set(['reflect', 'light screen', 'aurora veil']);

const QUICK_CHIPS = [
    { name: 'Reflect', supported: true },
    { name: 'Light Screen', supported: true },
    { name: 'Aurora Veil', supported: true },
    { name: 'Tailwind', supported: false },
    { name: 'Safeguard', supported: false },
    { name: 'Mist', supported: false }
];

export function BattlefieldSidePanel({ side, title, sideData, onUpdateSide }: BattlefieldSidePanelProps) {
    const [allMoves, setAllMoves] = useState<MoveLookupEntry[]>([]);
    const [activeDropdownIndex, setActiveDropdownIndex] = useState<0 | 1 | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;
        fetchMoveLookupIndex()
            .then((moves) => {
                if (isMounted) setAllMoves(moves);
            })
            .catch((err) => {
                console.error('[BattlefieldSidePanel] Failed to fetch move index:', err);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // Close autocomplete when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setActiveDropdownIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...sideData.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && (prevRounds > 0 || prevRounds === -1)) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        onUpdateSide('forceFields', fields);
    };

    const handleForceFieldRoundsChange = (idx: 0 | 1, val: number) => {
        const fields = [...sideData.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        fields[idx] = { ...fields[idx], remainingRounds: val };
        onUpdateSide('forceFields', fields);
    };

    const handleSelectMoveSuggestion = (idx: 0 | 1, moveName: string) => {
        handleForceFieldChange(idx, moveName);
        setActiveDropdownIndex(null);
    };

    const isChipActive = (name: string) => {
        const clean = name.toLowerCase().trim();
        return sideData.forceFields.some(
            (ff) => ff.name.toLowerCase().trim() === clean && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
        );
    };

    const handleToggleChip = (name: string) => {
        const clean = name.toLowerCase().trim();
        const activeIdx = sideData.forceFields.findIndex(
            (ff) => ff.name.toLowerCase().trim() === clean && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
        );

        if (activeIdx !== -1) {
            // Already active -> toggle off
            handleForceFieldChange(activeIdx as 0 | 1, '');
            return;
        }

        // Find empty or expired slot
        const emptyIdx = sideData.forceFields.findIndex((ff) => !ff.name.trim() || ff.remainingRounds === 0);
        const targetIdx = (emptyIdx !== -1 ? emptyIdx : 0) as 0 | 1;
        const fields = [...sideData.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        fields[targetIdx] = { name, remainingRounds: 4 };
        onUpdateSide('forceFields', fields);
    };

    // Extra Hazards
    const handleAddExtraHazard = () => {
        const current = sideData.extraHazards || [];
        onUpdateSide('extraHazards', [...current, '']);
    };

    const handleExtraHazardChange = (idx: number, val: string) => {
        const current = [...(sideData.extraHazards || [])];
        current[idx] = val;
        onUpdateSide('extraHazards', current);
    };

    const handleRemoveExtraHazard = (idx: number) => {
        const current = (sideData.extraHazards || []).filter((_, i) => i !== idx);
        onUpdateSide('extraHazards', current);
    };

    // Extra Other
    const handleAddExtraOther = () => {
        const current = sideData.extraOther || [];
        onUpdateSide('extraOther', [...current, '']);
    };

    const handleExtraOtherChange = (idx: number, val: string) => {
        const current = [...(sideData.extraOther || [])];
        current[idx] = val;
        onUpdateSide('extraOther', current);
    };

    const handleRemoveExtraOther = (idx: number) => {
        const current = (sideData.extraOther || []).filter((_, i) => i !== idx);
        onUpdateSide('extraOther', current);
    };

    const getFilteredMoves = (query: string) => {
        const clean = query.trim().toLowerCase();
        if (!clean) {
            // Return top common side moves if query is empty
            const defaults = ['Reflect', 'Light Screen', 'Aurora Veil', 'Tailwind', 'Safeguard', 'Mist'];
            return allMoves.filter((m) => defaults.includes(m.name)).slice(0, 10);
        }
        return allMoves.filter((m) => m.name.toLowerCase().includes(clean)).slice(0, 15);
    };

    return (
        <div className={`bo-side-panel bo-side-panel--${side}`}>
            <h3 className={`bo-side-title bo-side-title--${side} text-title-primary`}>{title}</h3>

            {/* Force Fields / Team Buffs */}
            <div className="bo-field-group">
                <div className="bo-field-group__header">
                    <span className="bo-field-label text-label">
                        <Shield size={14} /> Force Fields / Team Buffs
                    </span>
                    <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                </div>

                {/* Quick Chips */}
                <div className="bo-preset-chips-row bo-preset-chips-row--side">
                    {QUICK_CHIPS.map((chip) => {
                        const active = isChipActive(chip.name);
                        return (
                            <button
                                key={chip.name}
                                type="button"
                                className={`bo-preset-chip ${active ? 'bo-preset-chip--active' : ''}`}
                                onClick={() => handleToggleChip(chip.name)}
                                title={`${chip.name}${chip.supported ? ' (Supported in roll calculations)' : ' (Informational tracker)'}`}
                            >
                                {chip.name} {chip.supported && <Zap size={11} className="bo-chip-zap" />}
                            </button>
                        );
                    })}
                </div>

                {/* Input Slot 1 & 2 */}
                {([0, 1] as const).map((idx) => {
                    const fieldVal = sideData.forceFields[idx].name;
                    const isDropdownOpen = activeDropdownIndex === idx;
                    const suggestions = isDropdownOpen ? getFilteredMoves(fieldVal) : [];

                    return (
                        <div key={idx} className="bo-field-group__row" style={{ position: 'relative' }}>
                            <div
                                style={{ flex: 1, position: 'relative' }}
                                ref={isDropdownOpen ? dropdownRef : undefined}
                            >
                                <input
                                    type="text"
                                    className="bo-input bo-input--underline text-label"
                                    value={fieldVal}
                                    onFocus={() => setActiveDropdownIndex(idx)}
                                    onChange={(e) => {
                                        handleForceFieldChange(idx, e.target.value);
                                        setActiveDropdownIndex(idx);
                                    }}
                                    placeholder={
                                        idx === 0
                                            ? side === 'player'
                                                ? 'e.g. Reflect, Light Screen'
                                                : 'e.g. Light Screen, Reflect'
                                            : side === 'player'
                                              ? 'e.g. Safeguard, Tailwind'
                                              : 'e.g. Aurora Veil, Tailwind'
                                    }
                                    style={{ width: '100%' }}
                                />

                                {/* Searchable Move Autocomplete Dropdown */}
                                {isDropdownOpen && suggestions.length > 0 && (
                                    <div className="bo-move-autocomplete-dropdown">
                                        {suggestions.map((m) => {
                                            const isSupported = SUPPORTED_DAMAGE_MOVES.has(m.name.toLowerCase());
                                            return (
                                                <div
                                                    key={m.name}
                                                    className="bo-move-autocomplete-item"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectMoveSuggestion(idx, m.name);
                                                    }}
                                                >
                                                    <span className="bo-move-autocomplete-name">{m.name}</span>
                                                    {isSupported && (
                                                        <span
                                                            className="bo-supported-badge"
                                                            title="Supported by combat math engine for rolls"
                                                        >
                                                            <Zap size={10} />
                                                            <span>Supported</span>
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <RemainingRoundsBoxes
                                value={sideData.forceFields[idx].remainingRounds}
                                onChange={(val) => handleForceFieldRoundsChange(idx, val)}
                                title={`${title} Force Field ${idx + 1} Rounds`}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Hazard & Cover subgrid */}
            <div className="bo-side-subgrid">
                <div className="bo-subfield">
                    <div className="bo-subfield-header">
                        <button
                            type="button"
                            className="bo-compact-add-btn"
                            onClick={handleAddExtraHazard}
                            title="Add additional Entry Hazard line"
                            aria-label="Add additional Entry Hazard"
                        >
                            <Plus size={11} />
                        </button>
                        <label className="bo-field-label text-label">Entry Hazard</label>
                    </div>
                    <input
                        type="text"
                        className="bo-input bo-input--underline text-label"
                        value={sideData.entryHazard}
                        onChange={(e) => onUpdateSide('entryHazard', e.target.value)}
                        placeholder={side === 'player' ? 'e.g. Stealth Rock, Spikes' : 'e.g. Toxic Spikes, Sticky Web'}
                    />
                    {sideData.extraHazards &&
                        sideData.extraHazards.map((extra, eIdx) => (
                            <div key={eIdx} className="bo-extra-input-row">
                                <input
                                    type="text"
                                    className="bo-input bo-input--underline text-label"
                                    value={extra}
                                    onChange={(e) => handleExtraHazardChange(eIdx, e.target.value)}
                                    placeholder="Additional hazard..."
                                />
                                <button
                                    type="button"
                                    className="bo-extra-remove-btn"
                                    onClick={() => handleRemoveExtraHazard(eIdx)}
                                    title="Remove hazard line"
                                    aria-label="Remove hazard line"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                </div>

                <div className="bo-subfield">
                    <div className="bo-subfield-header">
                        <label className="bo-field-label text-label">Cover</label>
                    </div>
                    <input
                        type="text"
                        className="bo-input bo-input--underline text-label"
                        value={sideData.cover}
                        onChange={(e) => onUpdateSide('cover', e.target.value)}
                        placeholder={side === 'player' ? 'e.g. Half Cover (+1 Def)' : 'e.g. Full Cover'}
                    />
                </div>
            </div>

            {/* Other */}
            <div className="bo-subfield">
                <div className="bo-subfield-header">
                    <button
                        type="button"
                        className="bo-compact-add-btn"
                        onClick={handleAddExtraOther}
                        title="Add additional Other effect line"
                        aria-label="Add additional Other effect"
                    >
                        <Plus size={11} />
                    </button>
                    <label className="bo-field-label text-label">Other</label>
                </div>
                <input
                    type="text"
                    className="bo-input bo-input--underline text-label"
                    value={sideData.other}
                    onChange={(e) => onUpdateSide('other', e.target.value)}
                    placeholder="e.g. Safeguard, Mist"
                />
                {sideData.extraOther &&
                    sideData.extraOther.map((extra, oIdx) => (
                        <div key={oIdx} className="bo-extra-input-row">
                            <input
                                type="text"
                                className="bo-input bo-input--underline text-label"
                                value={extra}
                                onChange={(e) => handleExtraOtherChange(oIdx, e.target.value)}
                                placeholder="Additional effect..."
                            />
                            <button
                                type="button"
                                className="bo-extra-remove-btn"
                                onClick={() => handleRemoveExtraOther(oIdx)}
                                title="Remove effect line"
                                aria-label="Remove effect line"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
            </div>
        </div>
    );
}
