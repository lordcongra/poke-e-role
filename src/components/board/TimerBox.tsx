import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TooltipIcon } from '../ui/TooltipIcon';
import './TimerBox.css';

export function TimerBox() {
    const effects = useCharacterStore((state) => state.effects);
    const addEffect = useCharacterStore((state) => state.addEffect);
    const updateEffect = useCharacterStore((state) => state.updateEffect);
    const removeEffect = useCharacterStore((state) => state.removeEffect);

    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    return (
        <div className="sheet-panel health-section__box timer-box">
            <div className="timer-box__header">
                <span className="timer-box__header-title">
                    TIMERS{' '}
                    <TooltipIcon
                        onClick={() =>
                            setTooltipInfo({
                                title: 'Timers',
                                desc: 'Tracks any moves or effects that last a number of rounds.'
                            })
                        }
                    />
                </span>
                <button onClick={addEffect} className="action-button action-button--dark timer-box__add-btn">
                    + Add
                </button>
            </div>
            <div className="timer-box__content">
                {effects.length === 0 ? (
                    <div className="timer-box__empty">No active effects.</div>
                ) : (
                    effects.map((effect) => (
                        <div key={effect.id} className="timer-box__row">
                            <input
                                type="text"
                                className="timer-box__name-input"
                                value={effect.name}
                                onChange={(event) => updateEffect(effect.id, 'name', event.target.value)}
                                placeholder="Effect Name"
                            />
                            <span className="timer-box__rounds-label">Rds:</span>
                            <input
                                type="number"
                                className="timer-box__rounds-input"
                                value={effect.rounds}
                                onChange={(event) => updateEffect(effect.id, 'rounds', Number(event.target.value) || 0)}
                                min={0}
                            />
                            <button
                                onClick={() => removeEffect(effect.id)}
                                className="action-button action-button--red timer-box__icon-btn"
                            >
                                X
                            </button>
                        </div>
                    ))
                )}
            </div>

            {tooltipInfo && (
                <div className="timer-box__modal-overlay">
                    <div className="timer-box__modal-content">
                        <h3 className="timer-box__modal-title">{tooltipInfo.title}</h3>
                        <p className="timer-box__modal-desc">{tooltipInfo.desc}</p>
                        <div className="timer-box__modal-btn-container">
                            <button
                                type="button"
                                className="action-button action-button--dark timer-box__modal-btn"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
