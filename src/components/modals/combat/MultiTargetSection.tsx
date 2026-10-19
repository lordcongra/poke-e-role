import { AlertCircle, AlertTriangle, Shield, CheckSquare, Check, X } from 'lucide-react';
import { NumberSpinner } from '../../ui/NumberSpinner';
import { buildDefenseTierGroups, type MultiTargetSelection, type MultiTargetRowData } from './targetingModalUtils';

interface MultiTargetSectionProps {
    mode: 'target-all' | 'area';
    targets: MultiTargetRowData[];
    isPhysicalMove: boolean;
    baseDamage: number;
    bankedDice: number;
    weatherBonus: number;
    override: { active: boolean; type: 'dice' | 'flat' | 'dice-ignore'; value: number };
    maxTargets: number;
    rank: string;
    onToggleTarget: (id: string) => void;
    onToggleEvaded: (id: string) => void;
    onChangeEffectiveness: (id: string, val: number) => void;
    onChangeDef: (id: string, val: number) => void;
    onSelectAllFoes: () => void;
    onSelectAll: () => void;
    onClearAll: () => void;
}

export function MultiTargetSection({
    mode,
    targets,
    isPhysicalMove,
    baseDamage,
    bankedDice,
    weatherBonus,
    override,
    maxTargets,
    rank,
    onToggleTarget,
    onToggleEvaded,
    onChangeEffectiveness,
    onChangeDef,
    onSelectAllFoes,
    onSelectAll,
    onClearAll
}: MultiTargetSectionProps) {
    const selectedTargets = targets.filter((t) => t.selected);
    const selectedCount = selectedTargets.length;
    const isExceeded = selectedCount > maxTargets;
    const isAreaUnderfilled = mode === 'area' && targets.length >= maxTargets && selectedCount < maxTargets;

    // Calculate effective base damage for defense tier preview
    let effectiveBase = baseDamage + bankedDice + weatherBonus;
    if (override.active) {
        if (override.type === 'dice' || override.type === 'dice-ignore') {
            effectiveBase = override.value;
        } else if (override.type === 'flat') {
            effectiveBase = 0;
        }
    }

    const selectionsForTiers: MultiTargetSelection[] = selectedTargets.map((t) => ({
        id: t.id,
        name: t.name,
        def: override.active && override.type === 'dice-ignore' ? 0 : t.def,
        effectiveness: t.effectiveness,
        isEvaded: t.isEvaded,
        isPlayerSide: t.isPlayerSide,
        types: t.types
    }));

    const tierGroups =
        !override.active || override.type !== 'flat' ? buildDefenseTierGroups(selectionsForTiers, effectiveBase) : [];

    return (
        <div className="targeting-modal__multi-section">
            {/* Area Requirement Warning */}
            {isAreaUnderfilled && (
                <div className="targeting-modal__alert targeting-modal__alert--info">
                    <AlertCircle size={15} />
                    <span>
                        <strong>Area Move:</strong> Pokérole area attacks hit all combatants in range up to your Rank
                        limit (<strong>{maxTargets}</strong>) unless obstructed.
                    </span>
                </div>
            )}

            {/* Over-Quota Warning */}
            {isExceeded && (
                <div className="targeting-modal__alert targeting-modal__alert--warning">
                    <AlertTriangle size={15} />
                    <span>
                        Selected <strong>{selectedCount}</strong> targets. Your rank ({rank || 'Standard'}) allows a
                        maximum of <strong>{maxTargets}</strong>.
                    </span>
                </div>
            )}

            {/* Quick Action Buttons */}
            <div className="targeting-modal__quick-actions">
                <button
                    type="button"
                    className="action-button action-button--dark targeting-modal__quick-btn text-subtext"
                    onClick={onSelectAllFoes}
                    title="Select all foes up to rank limit"
                >
                    <CheckSquare size={13} /> Select Foes
                </button>
                <button
                    type="button"
                    className="action-button action-button--dark targeting-modal__quick-btn text-subtext"
                    onClick={onSelectAll}
                    title="Select all combatants up to rank limit"
                >
                    <Check size={13} /> Select All
                </button>
                <button
                    type="button"
                    className="action-button action-button--dark targeting-modal__quick-btn text-subtext"
                    onClick={onClearAll}
                    title="Clear selection"
                >
                    <X size={13} /> Clear
                </button>
            </div>

            {/* Combatants Table */}
            {targets.length === 0 ? (
                <div className="targeting-modal__empty-notice text-subtext">
                    No active combatants found in scene. Add tokens to the scene or initiative tracker.
                </div>
            ) : (
                <div className="targeting-modal__table-container">
                    <table className="targeting-modal__table">
                        <thead>
                            <tr>
                                <th style={{ width: '36px', textAlign: 'center' }}>Hit</th>
                                <th style={{ width: 'auto' }}>Target</th>
                                <th style={{ width: '76px', textAlign: 'center' }}>{isPhysicalMove ? 'DEF' : 'SPD'}</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Clash/Evade?</th>
                                <th style={{ width: '95px', textAlign: 'right' }}>Effectiveness</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targets.map((target) => (
                                <tr
                                    key={target.id}
                                    className={`targeting-modal__table-row ${
                                        target.selected ? 'targeting-modal__table-row--selected' : ''
                                    } ${target.isEvaded ? 'targeting-modal__table-row--evaded' : ''}`}
                                >
                                    {/* Selection Checkbox */}
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={target.selected}
                                            onChange={() => onToggleTarget(target.id)}
                                            className="targeting-modal__checkbox"
                                            title="Include in attack"
                                        />
                                    </td>

                                    {/* Name & Affiliation */}
                                    <td>
                                        <div className="targeting-modal__target-cell">
                                            <span className="targeting-modal__target-name" title={target.name}>
                                                {target.name}
                                            </span>
                                            <span
                                                className={`targeting-modal__side-tag ${
                                                    target.isPlayerSide
                                                        ? 'targeting-modal__side-tag--ally'
                                                        : 'targeting-modal__side-tag--foe'
                                                }`}
                                            >
                                                {target.isPlayerSide ? 'Ally' : 'Foe'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Defense Input / Badge */}
                                    <td style={{ textAlign: 'center' }}>
                                        <NumberSpinner
                                            value={target.def}
                                            onChange={(val) => onChangeDef(target.id, val)}
                                            min={0}
                                            max={99}
                                            disabled={!target.selected}
                                        />
                                    </td>

                                    {/* Evaded / Clashed Checkbox */}
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={target.isEvaded}
                                            disabled={!target.selected}
                                            onChange={() => onToggleEvaded(target.id)}
                                            className="targeting-modal__checkbox"
                                            title="Mark as Clashed or Evaded (0 damage)"
                                        />
                                    </td>

                                    {/* Effectiveness Dropdown */}
                                    <td style={{ textAlign: 'right' }}>
                                        <select
                                            value={target.effectiveness}
                                            disabled={!target.selected || target.isEvaded}
                                            onChange={(e) => onChangeEffectiveness(target.id, Number(e.target.value))}
                                            className="targeting-modal__select targeting-modal__select--compact text-label"
                                            style={{ color: 'var(--text-main)' }}
                                        >
                                            <option value={2}>4x (+2)</option>
                                            <option value={1}>2x (+1)</option>
                                            <option value={0}>1x (0)</option>
                                            <option value={-1}>0.5x (-1)</option>
                                            <option value={-2}>0.25x (-2)</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Defense Tier Preview */}
            <div className="targeting-modal__tiers-box">
                <div className="targeting-modal__tiers-header text-label">
                    <Shield size={13} /> Defense Tiers &amp; Rolling Preview
                </div>
                {override.active && override.type === 'flat' ? (
                    <div className="targeting-modal__tier-item text-subtext">
                        <strong>True Damage Override:</strong> Flat {override.value} Damage applied directly (modified
                        by each target's effectiveness).
                    </div>
                ) : tierGroups.length === 0 ? (
                    <div className="targeting-modal__tier-empty text-subtext">
                        {selectedCount === 0
                            ? 'Select at least one target to preview dice pools.'
                            : 'All selected targets are marked as Clashed/Evaded.'}
                    </div>
                ) : (
                    <div className="targeting-modal__tier-list">
                        {tierGroups.map((tier, idx) => (
                            <div key={idx} className="targeting-modal__tier-item text-subtext">
                                <span className="targeting-modal__tier-badge text-value-highlight">
                                    DEF {tier.effectiveDef}: {tier.dicePool} Dice
                                    {tier.incrementalDice > 0 ? (
                                        <span className="targeting-modal__tier-inc">
                                            {' '}
                                            (+{tier.incrementalDice} dice)
                                        </span>
                                    ) : (
                                        ' (reused)'
                                    )}
                                </span>
                                <span className="targeting-modal__tier-targets">
                                    {' '}
                                    &rarr; {tier.targets.map((t) => t.name).join(', ')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
