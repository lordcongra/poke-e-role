import { useState, useEffect } from 'react';
import { imageManager } from '../../utils/imageManager';
import { Dices, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
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
    const [rolls, setRolls] = useState<RollData[]>(() => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[RollLogWidget] Failed to parse roll log from local storage.', error);
            return [];
        }
    });
    const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({});
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const resolveIcons = async () => {
            const newIcons: Record<string, string> = {};
            for (const r of rolls) {
                if (r.icon && r.icon.startsWith('local-img:')) {
                    try {
                        const url = await imageManager.getImageUrl(r.icon);
                        if (url) newIcons[r.id] = url;
                    } catch (e) {
                        console.warn('[RollLogWidget] Failed to resolve local image for roll log.', e);
                    }
                }
            }
            if (isMounted) {
                setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
            }
        };

        resolveIcons();

        const handleUpdate = () => {
            try {
                const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                const rawRolls: RollData[] = Array.isArray(data) ? data : [];
                if (isMounted) setRolls(rawRolls);
            } catch (error) {
                console.error('[RollLogWidget] Failed to parse roll log from local storage.', error);
                if (isMounted) setRolls([]);
            }
        };

        window.addEventListener('pkr-roll-log-update', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            isMounted = false;
            window.removeEventListener('pkr-roll-log-update', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [rolls]);

    const dismiss = (id: string) => {
        try {
            const newRolls = rolls.filter((r) => r.id !== id);
            setRolls(newRolls);
            localStorage.setItem('pkr_roll_log', JSON.stringify(newRolls));
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        } catch (error) {
            console.error('[RollLogWidget] Failed to update roll log in local storage.', error);
        }
    };

    const clearAll = () => {
        try {
            setRolls([]);
            localStorage.removeItem('pkr_roll_log');
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        } catch (error) {
            console.error('[RollLogWidget] Failed to clear roll log in local storage.', error);
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
                        aria-label={isCollapsed ? 'Expand roll history' : 'Collapse roll history'}
                    >
                        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="roll-log-widget__list">
                    {rolls.map((r) => {
                        const iconUrl = resolvedIcons[r.id] || r.icon;
                        return (
                            <div key={r.id} className="roll-log-widget__entry">
                                <div className="roll-log-widget__entry-header">
                                    <img
                                        src={iconUrl}
                                        alt={r.player}
                                        className="roll-log-widget__icon"
                                        onError={(e) => {
                                            e.currentTarget.src = `${import.meta.env.BASE_URL || '/'}pokeball.svg`;
                                        }}
                                    />
                                    <strong className="text-title-primary" style={{ fontSize: '0.85rem' }}>
                                        {r.player}
                                    </strong>
                                    <button
                                        type="button"
                                        onClick={() => dismiss(r.id)}
                                        className="roll-log-widget__dismiss text-subtext"
                                        title="Dismiss Roll"
                                        aria-label="Dismiss Roll"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="text-label">{r.label}</div>
                                <div
                                    className="roll-log-widget__result text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    {r.result}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
