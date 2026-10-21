import { Info, Scale } from 'lucide-react';
import type { TempMove } from '../../../store/storeTypes';
import './GeneratorPreviewModal.css';

export interface GeneratorPreviewMoveRowProps {
    move: TempMove;
    accuracyPool: number;
    damagePool: string | number;
    hasStab?: boolean;
    stabBonus?: number;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
    onUpdateMove?: (updates: Partial<TempMove>) => void;
    getAttrPool?: (attrKey: string) => number;
    getSkillPool?: (skillKey: string) => number;
    getDmgPool?: (dmgStatKey: string, power: number, stabBonus: number) => number | string;
}

export function GeneratorPreviewMoveRow({
    move,
    accuracyPool,
    damagePool,
    hasStab = false,
    stabBonus = 1,
    onOpenTooltip,
    onUpdateMove,
    getAttrPool,
    getSkillPool,
    getDmgPool
}: GeneratorPreviewMoveRowProps) {
    const handleTooltipClick = () => {
        const damageStatisticLabel = move.dmgStat ? move.dmgStat.toUpperCase() : 'N/A';
        const accuracySkillLabel = move.skill.charAt(0).toUpperCase() + move.skill.slice(1);
        const stabText = hasStab && damagePool !== 'N/A' ? ` (+${stabBonus} STAB)` : '';

        onOpenTooltip({
            title: move.name,
            desc: `Type: ${move.type} | Category: ${move.cat} | Power: ${move.power}\nAccuracy: ${move.attr.toUpperCase()} + ${accuracySkillLabel}\nDamage: ${damageStatisticLabel} + ${move.power || 0}${stabText}\n\n${move.desc}`
        });
    };

    const isStabApplied = hasStab && damagePool !== 'N/A';
    const stabTooltip = 'Damage preview already accounting for STAB bonus';

    const hasCandidateAttrs = Boolean(move.candidateAttrs && move.candidateAttrs.length > 1);
    const hasCandidateSkills = Boolean(move.candidateSkills && move.candidateSkills.length > 1);
    const hasCandidateDmgStats = Boolean(move.candidateDmgStats && move.candidateDmgStats.length > 1);
    const hasCandidateCategories = Boolean(move.candidateCategories && move.candidateCategories.length > 1);
    const isDualScaling = hasCandidateAttrs || hasCandidateSkills || hasCandidateDmgStats || hasCandidateCategories;

    return (
        <div className="generator-preview-move">
            <div className="generator-preview-move__main">
                <span
                    className="generator-preview-move__name text-label"
                    style={{ color: 'var(--text-main)' }}
                    title={isStabApplied ? `${move.name} (${stabTooltip})` : move.name}
                >
                    {move.name}
                </span>
                <span className="generator-preview-move__stats text-subtext">
                    [{move.cat.substring(0, 4)}] A:{accuracyPool} |{' '}
                    {isStabApplied ? (
                        <span className="generator-preview-move__damage-box--stab" title={stabTooltip}>
                            D:{damagePool}
                        </span>
                    ) : (
                        <span>D:{damagePool}</span>
                    )}
                </span>
                <button
                    type="button"
                    className="generator-preview-move__tooltip-btn"
                    onClick={handleTooltipClick}
                    aria-label={`Info for ${move.name}`}
                >
                    <Info size={14} />
                </button>
            </div>

            {isDualScaling && onUpdateMove && (
                <div className="generator-preview-move__selectors">
                    <span
                        className="generator-preview-move__dual-badge"
                        title="Dual-scaling move with configurable stat pools"
                    >
                        <Scale size={11} />
                        <span>Dual</span>
                    </span>
                    {hasCandidateCategories && (
                        <label className="generator-preview-move__select-group">
                            <span className="generator-preview-move__select-label">Cat:</span>
                            <select
                                className="generator-preview-move__select"
                                value={move.cat}
                                onChange={(e) => onUpdateMove({ cat: e.target.value, dualScaleSelected: true })}
                            >
                                {move.candidateCategories!.map((catOpt) => (
                                    <option key={catOpt} value={catOpt}>
                                        {catOpt}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {hasCandidateAttrs && (
                        <label className="generator-preview-move__select-group">
                            <span className="generator-preview-move__select-label">Acc:</span>
                            <select
                                className="generator-preview-move__select"
                                value={move.attr?.toLowerCase() || ''}
                                onChange={(e) => onUpdateMove({ attr: e.target.value, dualScaleSelected: true })}
                            >
                                {move.candidateAttrs!.map((opt) => {
                                    const currentSkillPool = getSkillPool ? getSkillPool(move.skill) : 0;
                                    const pool = getAttrPool ? getAttrPool(opt) + currentSkillPool : undefined;
                                    return (
                                        <option key={opt} value={opt.toLowerCase()}>
                                            {opt.toUpperCase()}{pool !== undefined ? ` (${pool})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                    )}
                    {hasCandidateSkills && (
                        <label className="generator-preview-move__select-group">
                            <span className="generator-preview-move__select-label">Skill:</span>
                            <select
                                className="generator-preview-move__select"
                                value={move.skill?.toLowerCase() || ''}
                                onChange={(e) => onUpdateMove({ skill: e.target.value, dualScaleSelected: true })}
                            >
                                {move.candidateSkills!.map((opt) => {
                                    const currentAttrPool = getAttrPool ? getAttrPool(move.attr) : 0;
                                    const pool = getSkillPool ? currentAttrPool + getSkillPool(opt) : undefined;
                                    const label = opt.charAt(0).toUpperCase() + opt.slice(1);
                                    return (
                                        <option key={opt} value={opt.toLowerCase()}>
                                            {label}{pool !== undefined ? ` (${pool})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                    )}
                    {hasCandidateDmgStats && (
                        <label className="generator-preview-move__select-group">
                            <span className="generator-preview-move__select-label">Dmg:</span>
                            <select
                                className="generator-preview-move__select"
                                value={move.dmgStat?.toLowerCase() || ''}
                                onChange={(e) => onUpdateMove({ dmgStat: e.target.value, dualScaleSelected: true })}
                            >
                                {move.candidateDmgStats!.map((opt) => {
                                    const pool = getDmgPool
                                        ? getDmgPool(opt, move.power || 0, hasStab ? stabBonus : 0)
                                        : undefined;
                                    return (
                                        <option key={opt} value={opt.toLowerCase()}>
                                            {opt.toUpperCase()}{pool !== undefined ? ` (${pool})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}

