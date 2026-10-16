import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    getFieldEffectInfo,
    FieldEffectIcon,
    getAllActiveFieldEffects,
    type FieldEffectInfo
} from '../../utils/combat/fieldEffectsData';
import './ActiveFieldEffectsRow.css';

interface FieldRowItem {
    id: string;
    info: FieldEffectInfo;
    remainingRounds: number;
    prefix?: string;
    displayName: string;
}

export function ActiveFieldEffectsRow() {
    const activeBattlefield = useCharacterStore((state) => state.activeBattlefield);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (!activeBattlefield) return null;

    const allActive = getAllActiveFieldEffects(activeBattlefield);
    const items: FieldRowItem[] = allActive.map((item) => {
        const info = getFieldEffectInfo(item.name, item.category);
        const displayName = item.subLabel ? `${item.subLabel} ${info.name}` : info.name;
        return {
            id: item.id,
            info,
            remainingRounds: item.remainingRounds,
            prefix: item.prefix,
            displayName
        };
    });

    if (items.length === 0) return null;

    return (
        <div className="sheet-field-effects-row">
            <div className="sheet-field-effects-list">
                {items.map((item) => {
                    const isSelected = selectedId === item.id;
                    const color = item.info.color;

                    return (
                        <div key={item.id} className="sheet-field-pill-wrap">
                            <button
                                type="button"
                                className={`sheet-field-pill ${isSelected ? 'is-selected' : ''}`}
                                style={{
                                    borderColor: color,
                                    background: `color-mix(in srgb, ${color} 15%, var(--panel-bg))`
                                }}
                                onClick={() => setSelectedId((curr) => (curr === item.id ? null : item.id))}
                                title={`${item.displayName} (${item.remainingRounds} Rnds) - Click for rules`}
                            >
                                <span className="sheet-field-pill__icon" style={{ color }}>
                                    <FieldEffectIcon icon={item.info.icon} size={13} />
                                </span>
                                <span className="sheet-field-pill__label">{item.displayName}</span>
                                <span className="sheet-field-pill__rounds">
                                    {item.remainingRounds} {item.remainingRounds === 1 ? 'Rnd' : 'Rnds'}
                                </span>
                            </button>

                            {isSelected && (
                                <div className="sheet-field-card" style={{ borderColor: color }}>
                                    <div className="sheet-field-card__header">
                                        <div className="sheet-field-card__title">
                                            <FieldEffectIcon icon={item.info.icon} size={14} />
                                            <span>{item.displayName}</span>
                                        </div>
                                        <span
                                            className="sheet-field-card__badge"
                                            style={{ backgroundColor: color, color: '#ffffff' }}
                                        >
                                            {item.info.badge}
                                        </span>
                                    </div>
                                    <div className="sheet-field-card__rounds-info text-subtext">
                                        Duration: {item.remainingRounds}{' '}
                                        {item.remainingRounds === 1 ? 'Round' : 'Rounds'} remaining
                                    </div>
                                    <ul className="sheet-field-card__effects">
                                        {item.info.effects.map((eff, idx) => (
                                            <li key={idx} className="sheet-field-card__effect-item">
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
        </div>
    );
}
