// src/components/ResourceBox.tsx
import { NumberSpinner } from './NumberSpinner';

interface ResourceBoxProps {
    title: string;
    curr: number;
    max: number;
    base: number;
    color: string;
    onCurrChange: (val: number) => void;
    onBaseChange: (val: number) => void;
}

export function ResourceBox({ title, curr, max, base, color, onCurrChange, onBaseChange }: ResourceBoxProps) {
    const pct = Math.max(0, Math.min(100, (curr / Math.max(1, max)) * 100));

    return (
        <div className="health-section__box">
            <div className="health-section__header">{title}</div>
            <div className="resource-box">
                <div 
                    className="resource-bar-fill" 
                    style={{ width: `${pct}%`, backgroundColor: color }}
                ></div>
                
                <div className="resource-box__main">
                    <span className="resource-box__label">Curr:</span>
                    {/* Replaced naked input with our new component! */}
                    <NumberSpinner value={curr} onChange={onCurrChange} max={max} />
                    <span className="resource-box__divider">/</span>
                    <span className="resource-box__max">{max}</span>
                </div>
                
                <div className="resource-box__sub">
                    <span>Base:</span>
                    {/* Replaced naked input with our new component! */}
                    <NumberSpinner value={base} onChange={onBaseChange} min={1} />
                </div>
            </div>
        </div>
    );
}