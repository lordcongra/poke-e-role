import { NumberSpinner } from './NumberSpinner';
import './UI.css';

interface ResourceBoxProps {
    title: string;
    curr: number;
    max: number;
    base: number;
    temp?: number;
    tempMax?: number;
    color: string;
    onCurrChange: (val: number) => void;
    onBaseChange: (val: number) => void;
    onTempChange?: (val: number) => void;
    onClearTemp?: () => void;
    onAddTempClick?: () => void;
}

export function ResourceBox({
    title,
    curr,
    max,
    base,
    temp,
    tempMax,
    color,
    onCurrChange,
    onBaseChange,
    onTempChange,
    onClearTemp,
    onAddTempClick
}: ResourceBoxProps) {
    const pct = Math.max(0, Math.min(100, (curr / Math.max(1, max)) * 100));
    const tempPct = tempMax && tempMax > 0 ? Math.max(0, Math.min(100, ((temp || 0) / tempMax) * 100)) : 0;

    let barColor = color;
    if (title === 'HP') {
        if (pct > 50) barColor = 'rgba(76, 175, 80, 0.9)';
        else if (pct > 20) barColor = 'rgba(255, 152, 0, 0.9)';
        else barColor = 'rgba(244, 67, 54, 0.9)';
    } else if (title === 'WILL') {
        barColor = 'rgba(33, 150, 243, 0.9)';
    }

    return (
        <div className="health-section__box">
            <div className="health-section__header health-section__header--shadow">{title}</div>
            <div className="resource-box">
                <div className="resource-bar-fill" style={{ backgroundColor: barColor, width: `${pct}%` }}></div>

                {tempMax !== undefined && tempMax > 0 && (
                    <div className="resource-bar-fill resource-bar-fill--temp" style={{ width: `${tempPct}%` }}></div>
                )}

                <div className="resource-box__main resource-box__content-layer">
                    <span className="resource-box__label">Curr:</span>
                    <NumberSpinner value={curr} onChange={onCurrChange} min={0} />
                    <span className="resource-box__divider">/</span>
                    <span className="resource-box__max">{max}</span>
                </div>

                {onTempChange && onAddTempClick && (
                    <div className="resource-box__temp-row resource-box__content-layer">
                        {tempMax === undefined || tempMax === 0 ? (
                            <button
                                onClick={onAddTempClick}
                                className="action-button resource-box__add-temp-btn"
                                title="Add Temporary HP Shield"
                            >
                                🛡️ +Temp
                            </button>
                        ) : (
                            <div className="resource-box__temp-wrapper">
                                <button
                                    onClick={onAddTempClick}
                                    className="action-button resource-box__temp-shield-btn"
                                    title="Set Temporary HP"
                                >
                                    🛡️
                                </button>
                                <NumberSpinner value={temp || 0} onChange={onTempChange} min={0} max={tempMax} />
                                {onClearTemp && (
                                    <button
                                        onClick={onClearTemp}
                                        className="action-button action-button--red resource-box__clear-temp-btn"
                                        title="Remove Temp HP"
                                    >
                                        X
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="resource-box__sub resource-box__content-layer">
                    <span>Base:</span>
                    <NumberSpinner value={base} onChange={onBaseChange} min={0} />
                </div>
            </div>
        </div>
    );
}
