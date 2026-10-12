import { useState, useRef, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    getFieldEffectInfo,
    FieldEffectIcon,
    getAllActiveFieldEffects,
    type FieldEffectInfo
} from '../../utils/combat/fieldEffectsData';
import './InitiativeFieldEffectsBar.css';

interface ActiveConditionItem {
    id: string;
    info: FieldEffectInfo;
    remainingRounds: number;
    subLabel?: string;
}

export function InitiativeFieldEffectsBar() {
    const activeBattlefield = useCharacterStore((state) => state.activeBattlefield);
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                setOpenPopoverId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activeBattlefield) return null;

    const allActive = getAllActiveFieldEffects(activeBattlefield);
    const items: ActiveConditionItem[] = allActive.map((item) => ({
        id: item.id,
        info: getFieldEffectInfo(item.name, item.category),
        remainingRounds: item.remainingRounds,
        subLabel: item.subLabel
    }));

    if (items.length === 0) return null;

    return (
        <div className="init-field-bar" ref={barRef}>
            {items.map((item) => {
                const isOpen = openPopoverId === item.id;
                const badgeColor = item.info.color;

                return (
                    <div
                        key={item.id}
                        className="init-field-badge-wrap"
                        onMouseEnter={() => setOpenPopoverId(item.id)}
                        onMouseLeave={() => setOpenPopoverId((curr) => (curr === item.id ? null : curr))}
                    >
                        <button
                            type="button"
                            className={`init-field-badge ${isOpen ? 'is-active' : ''}`}
                            style={{
                                borderColor: badgeColor,
                                background: `color-mix(in srgb, ${badgeColor} 18%, var(--panel-bg))`
                            }}
                            onClick={() => setOpenPopoverId((curr) => (curr === item.id ? null : item.id))}
                            title={`${item.info.name} (${item.remainingRounds} Rounds remaining) - Click for Pokerole rules`}
                        >
                            <span className="init-field-badge__icon" style={{ color: badgeColor }}>
                                <FieldEffectIcon icon={item.info.icon} size={12} />
                            </span>
                            <span className="init-field-badge__name">
                                {item.subLabel ? `${item.subLabel} ` : ''}
                                {item.info.name}
                            </span>
                            <span className="init-field-badge__rounds">{item.remainingRounds}</span>
                        </button>

                        {isOpen && (
                            <div className="init-field-popover" style={{ borderColor: badgeColor }}>
                                <div className="init-field-popover__header">
                                    <span className="init-field-popover__title">
                                        <FieldEffectIcon icon={item.info.icon} size={13} />
                                        {item.info.name} ({item.remainingRounds} Rnds)
                                    </span>
                                    <span
                                        className="init-field-popover__tag"
                                        style={{
                                            backgroundColor: badgeColor,
                                            color: '#ffffff'
                                        }}
                                    >
                                        {item.info.badge}
                                    </span>
                                </div>
                                <ul className="init-field-popover__list">
                                    {item.info.effects.map((eff, effIdx) => (
                                        <li key={effIdx} className="init-field-popover__item">
                                            {eff}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
