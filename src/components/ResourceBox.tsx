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
            <div className="health-section__header" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}>{title}</div>
            <div className="resource-box">
                <div className="resource-bar-fill" style={{ backgroundColor: barColor, width: `${pct}%` }}></div>
                
                <div className="resource-box__main" style={{ zIndex: 2 }}>
                    <span className="resource-box__label">Curr:</span>
                    <NumberSpinner value={curr} onChange={onCurrChange} min={0} />
                    <span className="resource-box__divider">/</span>
                    <span className="resource-box__max">{max}</span>
                </div>
                
                <div className="resource-box__sub" style={{ zIndex: 2 }}>
                    <span>Base:</span>
                    <NumberSpinner value={base} onChange={onBaseChange} min={0} />
                </div>
            </div>
        </div>
    );
}