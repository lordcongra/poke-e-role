import { memo } from 'react';
import { Zap } from 'lucide-react';
import './ItemChargesBadge.css';

export interface ItemChargesBadgeProps {
    charges: number;
    maxCharges: number;
    mode?: 'compact' | 'visual';
    className?: string;
}

export const ItemChargesBadge = memo(function ItemChargesBadge({
    charges,
    maxCharges,
    mode = 'compact',
    className = ''
}: ItemChargesBadgeProps) {
    const safeMax = Math.max(1, maxCharges);
    const safeCharges = Math.max(0, Math.min(charges, safeMax));
    const percent = Math.min(100, Math.max(0, (safeCharges / safeMax) * 100));
    const isDepleted = safeCharges === 0;
    const depletedClass = isDepleted ? 'item-charges-badge--depleted' : '';
    const badgeTitle = isDepleted
        ? `Depleted: 0 / ${maxCharges} charges remaining`
        : `Charges: ${charges} / ${maxCharges}`;

    if (mode === 'visual') {
        if (safeMax <= 6) {
            return (
                <div
                    className={`item-charges-badge item-charges-badge--visual item-charges-badge--pips ${depletedClass} ${className}`.trim()}
                    title={badgeTitle}
                    aria-label={`${charges} of ${maxCharges} charges remaining`}
                >
                    <Zap size={11} className="item-charges-badge__icon" />
                    <div className="item-charges-badge__pip-row">
                        {Array.from({ length: safeMax }, (_, i) => {
                            const isFilled = i < safeCharges;
                            return (
                                <span
                                    key={i}
                                    className={`item-charges-badge__pip ${
                                        isFilled ? 'item-charges-badge__pip--filled' : 'item-charges-badge__pip--empty'
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div
                className={`item-charges-badge item-charges-badge--visual item-charges-badge--bar ${depletedClass} ${className}`.trim()}
                title={badgeTitle}
                aria-label={`${charges} of ${maxCharges} charges remaining`}
            >
                <div className="item-charges-badge__progress-track">
                    <div className="item-charges-badge__progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="item-charges-badge__bar-label text-subtext">
                    <Zap size={10} className="item-charges-badge__icon" />
                    <span>
                        {charges}/{maxCharges}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <span
            className={`item-charges-badge item-charges-badge--compact ${depletedClass} ${className}`.trim()}
            title={badgeTitle}
            aria-label={`${charges} of ${maxCharges} charges remaining`}
        >
            <Zap size={11} className="item-charges-badge__icon" />
            <span>
                {charges}/{maxCharges}
            </span>
        </span>
    );
});
