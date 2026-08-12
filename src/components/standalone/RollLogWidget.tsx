import { useEffect, useState } from 'react';
import './RollLogWidget.css';

interface RollData {
    id: string;
    player: string;
    label: string;
    result: string;
    icon: string;
}

export function RollLogWidget() {
    const [rolls, setRolls] = useState<RollData[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const loadRolls = () => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            setRolls(Array.isArray(data) ? data : []);
        } catch (error) {
            setRolls([]);
        }
    };

    useEffect(() => {
        loadRolls();

        const handleUpdate = () => loadRolls();
        window.addEventListener('pkr-roll-log-update', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener('pkr-roll-log-update', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const dismiss = (id: string) => {
        const next = rolls.filter((r) => r.id !== id);
        localStorage.setItem('pkr_roll_log', JSON.stringify(next));
        setRolls(next);
    };

    const clearAll = () => {
        localStorage.setItem('pkr_roll_log', '[]');
        setRolls([]);
    };

    if (rolls.length === 0) return null;

    return (
        <div className={`roll-log-widget ${isCollapsed ? 'roll-log-widget--collapsed' : ''}`}>
            <div className="roll-log-widget__header">
                <span className="roll-log-widget__title" onClick={() => setIsCollapsed(!isCollapsed)}>
                    🎲 Roll History ({rolls.length})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={clearAll} className="roll-log-widget__btn-clear">
                        Clear All ✖
                    </button>
                    <button type="button" onClick={() => setIsCollapsed(!isCollapsed)} className="roll-log-widget__btn-toggle">
                        {isCollapsed ? '▲' : '▼'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="roll-log-widget__list">
                    {rolls.map((r) => (
                        <div key={r.id} className="roll-log-widget__entry">
                            <div className="roll-log-widget__entry-header">
                                <img src={r.icon} alt="Avatar" className="roll-log-widget__icon" />
                                <strong className="roll-log-widget__player">{r.player}</strong>
                                <button type="button" onClick={() => dismiss(r.id)} className="roll-log-widget__dismiss">
                                    ✖
                                </button>
                            </div>
                            <div className="roll-log-widget__label">{r.label}</div>
                            <div className="roll-log-widget__result">{r.result}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}