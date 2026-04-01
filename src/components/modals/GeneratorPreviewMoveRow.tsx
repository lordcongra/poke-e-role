import type { TempMove } from '../../store/storeTypes';
import './GeneratorPreviewModal.css';

interface GeneratorPreviewMoveRowProps {
    move: TempMove;
    accuracyPool: number;
    damagePool: string | number;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function GeneratorPreviewMoveRow({
    move,
    accuracyPool,
    damagePool,
    onOpenTooltip
}: GeneratorPreviewMoveRowProps) {
    const handleTooltipClick = () => {
        const damageStatisticLabel = move.dmgStat ? move.dmgStat.toUpperCase() : 'N/A';
        const accuracySkillLabel = move.skill.charAt(0).toUpperCase() + move.skill.slice(1);

        onOpenTooltip({
            title: move.name,
            desc: `Type: ${move.type} | Category: ${move.cat} | Power: ${move.power}\nAccuracy: ${move.attr.toUpperCase()} + ${accuracySkillLabel}\nDamage: ${damageStatisticLabel}\n\n${move.desc}`
        });
    };

    return (
        <div className="generator-preview-move">
            <span className="generator-preview-move__name" title={move.name}>
                {move.name}
            </span>
            <span className="generator-preview-move__stats">
                [{move.cat.substring(0, 4)}] A:{accuracyPool} | D:{damagePool}
            </span>
            <button type="button" className="generator-preview-move__tooltip-btn" onClick={handleTooltipClick}>
                ?
            </button>
        </div>
    );
}
