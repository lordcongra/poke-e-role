import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { rollStatus } from '../../utils/combatUtils';
import { TooltipIcon } from '../ui/TooltipIcon';
import { STATUS_COLORS, STATUS_RULES, STATUS_OPTIONS } from '../../data/constants';
import './StatusBox.css';

export function StatusBox() {
    const role = useCharacterStore((state) => state.role);
    const statuses = useCharacterStore((state) => state.statuses);
    const customStatuses = useCharacterStore((state) => state.roomCustomStatuses).filter(
        (s) => role === 'GM' || !s.gmOnly
    );

    const addStatus = useCharacterStore((state) => state.addStatus);
    const updateStatus = useCharacterStore((state) => state.updateStatus);
    const removeStatus = useCharacterStore((state) => state.removeStatus);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    const STATUS_OPTIONS_COMBINED = [...STATUS_OPTIONS, ...customStatuses.map((s) => s.name)];

    return (
        <div className="sheet-panel health-section__box status-box">
            <div className="status-box__header">
                <span className="status-box__header-title">
                    STATUS{' '}
                    <TooltipIcon
                        onClick={() => setTooltipInfo({ title: 'Status Effects', desc: 'Apply a status effect.' })}
                    />
                </span>
                <button onClick={addStatus} className="action-button action-button--dark status-box__add-btn">
                    + Add
                </button>
            </div>
            <div className="status-box__content">
                {statuses.map((status, index) => {
                    const customStatusData = customStatuses.find((s) => s.name === status.name);
                    const colors = customStatusData
                        ? { bg: customStatusData.color, text: customStatusData.textColor }
                        : STATUS_COLORS[status.name] || { bg: '#FFF', text: '#000' };

                    let statusDesc = STATUS_RULES[status.name] || 'Custom Effect.';
                    if (customStatusData) {
                        statusDesc = `${customStatusData.description}\n\nEffects: ${customStatusData.effects}`;
                    }

                    return (
                        <div key={status.id} className="status-box__row">
                            <select
                                className="identity-grid__select status-box__select"
                                style={{ background: colors.bg, color: colors.text }}
                                value={status.name}
                                onChange={(event) => updateStatus(status.id, 'name', event.target.value)}
                            >
                                {STATUS_OPTIONS_COMBINED.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>

                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: status.name,
                                        desc: statusDesc
                                    })
                                }
                            />

                            <input
                                type="number"
                                className="status-box__rounds-input"
                                value={status.rounds}
                                onChange={(event) => updateStatus(status.id, 'rounds', Number(event.target.value) || 0)}
                                title="Successes/Rounds"
                            />
                            {status.name !== 'Healthy' && (
                                <button
                                    onClick={() => rollStatus(status, useCharacterStore.getState())}
                                    className="action-button action-button--dark status-box__icon-btn"
                                >
                                    🎲
                                </button>
                            )}
                            {index > 0 && (
                                <button
                                    onClick={() => removeStatus(status.id)}
                                    className="action-button action-button--red status-box__icon-btn"
                                >
                                    X
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {tooltipInfo && (
                <div className="status-box__modal-overlay">
                    <div className="status-box__modal-content">
                        <h3 className="status-box__modal-title">{tooltipInfo.title}</h3>
                        <p className="status-box__modal-desc">{tooltipInfo.desc}</p>
                        <div className="status-box__modal-btn-container">
                            <button
                                type="button"
                                className="action-button action-button--dark status-box__modal-btn"
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
