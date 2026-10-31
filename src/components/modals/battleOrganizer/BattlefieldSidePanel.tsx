import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { BattlefieldAutocompleteInput, type AutocompleteSuggestion } from './BattlefieldAutocompleteInput';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { fetchMoveLookupIndex } from '../../../utils/api/api';
import type { MoveLookupEntry } from '../../../utils/api/apiTypes';
import type { BattlefieldSideData, BattleOrganizerTimerEffect } from '../../../types/battleOrganizerTypes';
import { CANONICAL_HAZARDS } from '../../../utils/combat/fieldEffectsConstants';

export interface BattlefieldSidePanelProps {
    side: 'player' | 'foe';
    title: string;
    sideData: BattlefieldSideData;
    onUpdateSide: <K extends keyof BattlefieldSideData>(key: K, value: BattlefieldSideData[K]) => void;
}

const SUPPORTED_SIDE_MOVES = new Set(['reflect', 'light screen', 'aurora veil', 'tailwind', 'flower gift']);

export function BattlefieldSidePanel({ side, title, sideData, onUpdateSide }: BattlefieldSidePanelProps) {
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const [allMoves, setAllMoves] = useState<MoveLookupEntry[]>([]);

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

    const handleForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...sideData.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && (prevRounds > 0 || prevRounds === -1)) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        onUpdateSide('forceFields', fields);
    };

    const handleForceFieldSelect = (idx: 0 | 1, item: AutocompleteSuggestion) => {
        const fields = [...sideData.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        const prevRounds = fields[idx].remainingRounds;
        const newRounds = item.rounds !== undefined ? item.rounds : prevRounds === 0 ? 4 : prevRounds;
        fields[idx] = { name: item.name, remainingRounds: newRounds };
        onUpdateSide('forceFields', fields);
    };

    const handleForceFieldRoundsChange = (idx: 0 | 1, val: number) => {
        const fields = [...sideData.forceFields] as [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
        fields[idx] = { ...fields[idx], remainingRounds: val };
        onUpdateSide('forceFields', fields);
    };

    // Extra Force Fields
    const handleAddExtraForceField = () => {
        const current = sideData.extraForceFields || [];
        onUpdateSide('extraForceFields', [...current, { name: '', remainingRounds: 4 }]);
    };

    const handleExtraForceFieldChange = (idx: number, text: string) => {
        const current = [...(sideData.extraForceFields || [])];
        const prevRounds = current[idx]?.remainingRounds ?? 0;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && (prevRounds > 0 || prevRounds === -1)) newRounds = 0;
        current[idx] = { ...current[idx], name: text, remainingRounds: newRounds };
        onUpdateSide('extraForceFields', current);
    };

    const handleExtraForceFieldSelect = (idx: number, item: AutocompleteSuggestion) => {
        const current = [...(sideData.extraForceFields || [])];
        const prevRounds = current[idx]?.remainingRounds ?? 0;
        const newRounds = item.rounds !== undefined ? item.rounds : prevRounds === 0 ? 4 : prevRounds;
        current[idx] = { ...current[idx], name: item.name, remainingRounds: newRounds };
        onUpdateSide('extraForceFields', current);
    };

    const handleExtraForceFieldRoundsChange = (idx: number, val: number) => {
        const current = [...(sideData.extraForceFields || [])];
        current[idx] = { ...current[idx], remainingRounds: val };
        onUpdateSide('extraForceFields', current);
    };

    const handleRemoveExtraForceField = (idx: number) => {
        const current = (sideData.extraForceFields || []).filter((_, i) => i !== idx);
        onUpdateSide('extraForceFields', current);
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

    // Autocomplete suggestion builders
    const getForceFieldSuggestions = (query: string): AutocompleteSuggestion[] => {
        const clean = query.trim().toLowerCase();
        const customFieldMoves = roomCustomMoves.filter((m) => m.battlefieldCategory === 'forceField');
        const standardDefaults: AutocompleteSuggestion[] = [
            { name: 'Reflect', rounds: 4, supported: true },
            { name: 'Light Screen', rounds: 4, supported: true },
            { name: 'Aurora Veil', rounds: 4, supported: true },
            { name: 'Tailwind', rounds: 4, supported: true },
            { name: 'Flower Gift', rounds: -1, supported: true },
            { name: 'Safeguard', rounds: 4, supported: false },
            { name: 'Mist', rounds: 4, supported: false },
            { name: 'Lucky Chant', rounds: -1, supported: false }
        ];

        if (!clean) {
            const defaultNames = new Set(standardDefaults.map((d) => d.name.toLowerCase()));
            const customDefaults: AutocompleteSuggestion[] = customFieldMoves
                .filter((m) => !defaultNames.has(m.name.toLowerCase()))
                .map((m) => ({
                    name: m.name,
                    rounds: 4,
                    supported: SUPPORTED_SIDE_MOVES.has(m.name.toLowerCase())
                }));
            return [...standardDefaults, ...customDefaults];
        }

        const matchedDefaults = standardDefaults.filter((d) => d.name.toLowerCase().includes(clean));
        const matchedDefaultNames = new Set(matchedDefaults.map((d) => d.name.toLowerCase()));

        const matchedCustom: AutocompleteSuggestion[] = customFieldMoves
            .filter((m) => m.name.toLowerCase().includes(clean) && !matchedDefaultNames.has(m.name.toLowerCase()))
            .map((m) => {
                const isLuckyChant = m.name.toLowerCase() === 'lucky chant';
                const isFlowerGift = m.name.toLowerCase() === 'flower gift';
                return {
                    name: m.name,
                    rounds: isLuckyChant || isFlowerGift ? -1 : 4,
                    supported: SUPPORTED_SIDE_MOVES.has(m.name.toLowerCase())
                };
            });
        const customNames = new Set([
            ...matchedDefaultNames,
            ...matchedCustom.map((c) => c.name.toLowerCase())
        ]);

        const matchedMoves = allMoves
            .filter((m) => m.name.toLowerCase().includes(clean) && !customNames.has(m.name.toLowerCase()))
            .slice(0, 15)
            .map((m) => {
                const isLuckyChant = m.name.toLowerCase() === 'lucky chant';
                const isFlowerGift = m.name.toLowerCase() === 'flower gift';
                return {
                    name: m.name,
                    rounds: isLuckyChant || isFlowerGift ? -1 : 4,
                    supported: SUPPORTED_SIDE_MOVES.has(m.name.toLowerCase())
                };
            });
        return [...matchedDefaults, ...matchedCustom, ...matchedMoves];
    };

    const getHazardSuggestions = (query: string): AutocompleteSuggestion[] => {
        const clean = query.trim().toLowerCase();
        const customHazardMoves = roomCustomMoves.filter((m) => m.battlefieldCategory === 'entryHazard');
        if (!clean) {
            const canonicalHazards = CANONICAL_HAZARDS.map((name) => ({ name }));
            const canonicalNames = new Set(CANONICAL_HAZARDS.map((h) => h.toLowerCase()));
            const customHazards = customHazardMoves
                .filter((m) => !canonicalNames.has(m.name.toLowerCase()))
                .map((m) => ({ name: m.name }));
            return [...canonicalHazards, ...customHazards];
        }
        const matchedCanonicals = CANONICAL_HAZARDS.filter((h) => h.toLowerCase().includes(clean)).map((name) => ({
            name
        }));
        const canonicalNames = new Set(matchedCanonicals.map((c) => c.name.toLowerCase()));
        const matchedCustom = customHazardMoves
            .filter((m) => m.name.toLowerCase().includes(clean) && !canonicalNames.has(m.name.toLowerCase()))
            .map((m) => ({ name: m.name }));
        const existingNames = new Set([
            ...matchedCanonicals.map((c) => c.name.toLowerCase()),
            ...matchedCustom.map((c) => c.name.toLowerCase())
        ]);
        const matchedMoves = allMoves
            .filter((m) => m.name.toLowerCase().includes(clean) && !existingNames.has(m.name.toLowerCase()))
            .slice(0, 10)
            .map((m) => ({ name: m.name }));
        return [...matchedCanonicals, ...matchedCustom, ...matchedMoves];
    };

    return (
        <div className={`bo-side-panel bo-side-panel--${side}`}>
            <h3 className={`bo-side-title bo-side-title--${side} text-title-primary`}>{title}</h3>

            {/* Force Fields / Team Buffs */}
            <div className="bo-field-group">
                <div className="bo-field-group__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            type="button"
                            className="bo-compact-add-btn"
                            onClick={handleAddExtraForceField}
                            title="Add additional Force Field / Team Buff"
                            aria-label="Add additional Force Field / Team Buff"
                        >
                            <Plus size={11} />
                        </button>
                        <span className="bo-field-label text-label">
                            <Shield size={14} /> Force Fields / Team Buffs
                        </span>
                    </div>
                    <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                </div>

                {/* Input Slot 1 & 2 */}
                {([0, 1] as const).map((idx) => {
                    const fieldVal = sideData.forceFields[idx].name;
                    return (
                        <div key={idx} className="bo-field-group__row">
                            <BattlefieldAutocompleteInput
                                value={fieldVal}
                                onChange={(val) => handleForceFieldChange(idx, val)}
                                onSelect={(item) => handleForceFieldSelect(idx, item)}
                                suggestions={getForceFieldSuggestions(fieldVal)}
                                placeholder={
                                    idx === 0
                                        ? side === 'player'
                                            ? 'e.g. Reflect, Light Screen'
                                            : 'e.g. Light Screen, Reflect'
                                        : side === 'player'
                                          ? 'e.g. Safeguard, Tailwind'
                                          : 'e.g. Aurora Veil, Tailwind'
                                }
                            />
                            <RemainingRoundsBoxes
                                value={sideData.forceFields[idx].remainingRounds}
                                onChange={(val) => handleForceFieldRoundsChange(idx, val)}
                                title={`${title} Force Field ${idx + 1} Rounds`}
                            />
                        </div>
                    );
                })}

                {/* Extra Force Fields */}
                {sideData.extraForceFields &&
                    sideData.extraForceFields.map((extra, efIdx) => (
                        <div key={efIdx} className="bo-field-group__row">
                            <BattlefieldAutocompleteInput
                                value={extra.name}
                                onChange={(val) => handleExtraForceFieldChange(efIdx, val)}
                                onSelect={(item) => handleExtraForceFieldSelect(efIdx, item)}
                                suggestions={getForceFieldSuggestions(extra.name)}
                                placeholder="Additional Force Field / Buff..."
                            />
                            <RemainingRoundsBoxes
                                value={extra.remainingRounds}
                                onChange={(val) => handleExtraForceFieldRoundsChange(efIdx, val)}
                                title={`${title} Extra Force Field ${efIdx + 1} Rounds`}
                            />
                            <button
                                type="button"
                                className="bo-extra-remove-btn"
                                onClick={() => handleRemoveExtraForceField(efIdx)}
                                title="Remove force field"
                                aria-label="Remove force field"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
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
                    <BattlefieldAutocompleteInput
                        value={sideData.entryHazard}
                        onChange={(val) => onUpdateSide('entryHazard', val)}
                        onSelect={(item) => onUpdateSide('entryHazard', item.name)}
                        suggestions={getHazardSuggestions(sideData.entryHazard)}
                        placeholder={side === 'player' ? 'e.g. Stealth Rock, Spikes' : 'e.g. Toxic Spikes, Sticky Web'}
                    />
                    {sideData.extraHazards &&
                        sideData.extraHazards.map((extra, eIdx) => (
                            <div key={eIdx} className="bo-extra-input-row">
                                <BattlefieldAutocompleteInput
                                    value={extra}
                                    onChange={(val) => handleExtraHazardChange(eIdx, val)}
                                    onSelect={(item) => handleExtraHazardChange(eIdx, item.name)}
                                    suggestions={getHazardSuggestions(extra)}
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
                    placeholder=""
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
