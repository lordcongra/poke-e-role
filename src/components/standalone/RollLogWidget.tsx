import { useEffect, useState } from 'react';
import { imageManager } from '../../utils/imageManager';
import { Dices, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import './RollLogWidget.css';

interface RollData {
    id: string;
    player: string;
    label: string;
    result: string;
    icon: string;
}

interface RollLogWidgetProps {
    isDocked?: boolean;
}

export function RollLogWidget({ isDocked = false }: RollLogWidgetProps) {
    const [rolls, setRolls] = useState<RollData[]>([]);
    const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({});
    const [isCollapsed, setIsCollapsed] = useState(false);

    const loadRolls = async () => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            const rawRolls: RollData[] = Array.isArray(data) ? data : [];
            setRolls(rawRolls);

            const newIcons: Record<string, string> = {};
            for (const r of rawRolls) {
                if (r.icon && r.icon.startsWith('local-img:')) {
                    try {
                        const url = await imageManager.getImageUrl(r.icon);
                        if (url) newIcons[r.id] = url;
                    } catch (e) {
                        console.warn('[RollLogWidget] Failed to resolve local image for roll log.', e);
                    }
                }
            }
            setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
        } catch (error) {
            console.error('[RollLogWidget] Failed to parse roll log from local storage.', error);
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
        try {
            const next = rolls.filter((r) => r.id !== id);
            localStorage.setItem('pkr_roll_log', JSON.stringify(next));
            setRolls(next);
        } catch (error) {
            console.error('[RollLogWidget] Failed to save dismissed roll to localStorage.', error);
        }
    };

    const clearAll = () => {
        try {
            localStorage.setItem('pkr_roll_log', '[]');
            setRolls([]);
        } catch (error) {
            console.error('[RollLogWidget] Failed to clear roll log in localStorage.', error);
        }
    };

    if (rolls.length === 0) return null;

    return (
        <div
            className={`roll-log-widget ${isCollapsed ? 'roll-log-widget--collapsed' : ''} ${isDocked ? 'roll-log-widget--docked' : 'roll-log-widget--floating'}`}
        >
            <div className="roll-log-widget__header">
                <span
                    className="roll-log-widget__title text-title-primary"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <Dices size={16} /> Roll History ({rolls.length})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={clearAll} className="roll-log-widget__btn-clear text-theme-header">
                        Clear All <Trash2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="roll-log-widget__btn-toggle text-subtext"
                    >
                        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="roll-log-widget__list">
                    {rolls.map((r) => (
                        <div key={r.id} className="roll-log-widget__entry">
                            <div className="roll-log-widget__entry-header">
                                <img
                                    src={resolvedIcons[r.id] || r.icon}
                                    alt="Avatar"
                                    className="roll-log-widget__icon"
                                />
                                <strong className="text-title-primary" style={{ fontSize: '0.85rem' }}>
                                    {r.player}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() => dismiss(r.id)}
                                    className="roll-log-widget__dismiss text-subtext"
                                    title="Dismiss Roll"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="text-label">{r.label}</div>
                            <div className="roll-log-widget__result text-subtext" style={{ color: 'var(--text-main)' }}>
                                {r.result}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
