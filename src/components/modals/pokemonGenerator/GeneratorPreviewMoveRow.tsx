import { Info } from 'lucide-react';
import type { TempMove } from '../../../store/storeTypes';
import './GeneratorPreviewModal.css';

export interface GeneratorPreviewMoveRowProps {
    move: TempMove;
    accuracyPool: number;
    damagePool: string | number;
    hasStab?: boolean;
    stabBonus?: number;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function GeneratorPreviewMoveRow({
    move,
    accuracyPool,
    damagePool,
    hasStab = false,
    stabBonus = 1,
    onOpenTooltip
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

    return (
        <div className="generator-preview-move">
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
            <button type="button" className="generator-preview-move__tooltip-btn" onClick={handleTooltipClick}>
                <Info size={14} />
            </button>
        </div>
    );
}
