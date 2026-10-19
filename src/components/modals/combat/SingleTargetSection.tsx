import type { ChangeEvent } from 'react';
import type { TargetOption } from './targetingModalUtils';

interface SingleTargetSectionProps {
    targets: TargetOption[];
    isPhysicalMove: boolean;
    selectedTargetId: string;
    reduction: number;
    effectiveness: number;
    appliedFieldFactors: string[];
    baseDamage: number;
    bankedDice: number;
    overrideType: 'none' | 'dice' | 'flat' | 'dice-ignore';
    seDmgBonus: number;
    onTargetSelect: (e: ChangeEvent<HTMLSelectElement>) => void;
    onReductionChange: (val: number) => void;
    onEffectivenessChange: (val: number) => void;
}

export function SingleTargetSection({
    targets,
    isPhysicalMove,
    selectedTargetId,
    reduction,
    effectiveness,
    appliedFieldFactors,
    baseDamage,
    bankedDice,
    overrideType,
    seDmgBonus,
    onTargetSelect,
    onReductionChange,
    onEffectivenessChange
}: SingleTargetSectionProps) {
    const isPoolDepleted = reduction > 0 && baseDamage + bankedDice - reduction <= 0 && overrideType === 'none';

    return (
        <div className="targeting-modal__single-section">
            <div className="targeting-modal__form-group">
                <label className="targeting-modal__label text-label">Enemy Token:</label>
                <select
                    value={selectedTargetId}
                    onChange={onTargetSelect}
                    className="targeting-modal__select text-label"
                    style={{ color: 'var(--text-main)' }}
                >
                    <option value="manual">-- Manual Entry --</option>
                    {targets.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name} ({isPhysicalMove ? 'DEF' : 'SPD'}: {t.def})
                        </option>
                    ))}
                </select>
            </div>

            <div className="targeting-modal__form-group targeting-modal__form-group--large">
                <label className="targeting-modal__label text-label">
                    <span>{isPhysicalMove ? 'Defense' : 'Special Defense'}</span> Reduction:
                </label>
                <input
                    type="number"
                    value={reduction}
                    onChange={(e) => onReductionChange(Number(e.target.value) || 0)}
                    min="0"
                    className="targeting-modal__input text-value-highlight"
                />
                {appliedFieldFactors.length > 0 && (
                    <div
                        style={{
                            fontSize: '0.76rem',
                            color: 'var(--primary)',
                            marginTop: '4px',
                            fontWeight: 600
                        }}
                    >
                        Active Force Field Reduction: {appliedFieldFactors.join(', ')}
                    </div>
                )}
                {isPoolDepleted && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <em>
                            Defenses reduce pool to 0 — <strong>Minimum 1 Die</strong> will still be rolled.
                        </em>
                    </div>
                )}
            </div>

            <div className="targeting-modal__form-group">
                <label className="targeting-modal__label text-label">Effectiveness:</label>
                <select
                    className="targeting-modal__select text-label"
                    style={{ color: 'var(--text-main)' }}
                    value={effectiveness}
                    onChange={(e) => onEffectivenessChange(Number(e.target.value))}
                >
                    <option value={2}>
                        4x Super Effective (+2 Dmg{seDmgBonus > 0 ? `, +${seDmgBonus} SE Dice` : ''})
                    </option>
                    <option value={1}>
                        2x Super Effective (+1 Dmg{seDmgBonus > 0 ? `, +${seDmgBonus} SE Dice` : ''})
                    </option>
                    <option value={0}>1x Normal Effectiveness</option>
                    <option value={-1}>0.5x Not Very Effective (-1 Dmg)</option>
                    <option value={-2}>0.25x Not Very Effective (-2 Dmg)</option>
                </select>
            </div>
        </div>
    );
}
