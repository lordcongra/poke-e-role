import { StrictMode, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
import { imageManager } from './utils/imageManager';
import { Dices, Trash2, X } from 'lucide-react';
import './style.css';
import './roll-log.css';

interface RollData {
    id: string;
    player: string;
    label: string;
    result: string;
    icon: string;
}

// Strictly type the custom Window property for HMR to avoid 'any'
interface WindowWithReactRoot extends Window {
    __REACT_ROOT__?: Root;
}

function RollLog() {
    const [rolls, setRolls] = useState<RollData[]>([]);
    const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({});

    // 🔥 Default to dark instead of light
    const [theme, setTheme] = useState(localStorage.getItem('pokerole-theme') || 'dark');

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
                        console.warn('[RollLog] Failed to resolve local image for roll log.', e);
                    }
                }
            }
            setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
        } catch (error) {
            console.error('[RollLog] Failed to parse roll log from local storage. Resetting log.', error);
            setRolls([]);
        }
    };

    const applyDynamicColors = (data?: { enabled: boolean; primary?: string; secondary?: string }) => {
        if (data?.enabled && data?.primary) {
            document.body.style.setProperty('--dynamic-type-color', data.primary);
            document.documentElement.style.setProperty('--dynamic-type-color', data.primary);
            if (data.secondary) {
                document.body.style.setProperty('--dynamic-secondary-color', data.secondary);
                document.documentElement.style.setProperty('--dynamic-secondary-color', data.secondary);
            } else {
                document.body.style.removeProperty('--dynamic-secondary-color');
                document.documentElement.style.removeProperty('--dynamic-secondary-color');
            }
        } else {
            document.body.style.removeProperty('--dynamic-type-color');
            document.documentElement.style.removeProperty('--dynamic-type-color');
            document.body.style.removeProperty('--dynamic-secondary-color');
            document.documentElement.style.removeProperty('--dynamic-secondary-color');
        }
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem('pkr_active_theme_colors');
            if (raw) applyDynamicColors(JSON.parse(raw));
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (theme === 'light') {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, [theme]);

    useEffect(() => {
        loadRolls();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pkr_roll_log') {
                loadRolls();
            }
            if (e.key === 'pkr_active_theme_colors') {
                try {
                    applyDynamicColors(JSON.parse(e.newValue || '{}'));
                } catch (err) {}
            }
        };
        window.addEventListener('storage', handleStorage);

        if (OBR.isAvailable) {
            OBR.onReady(() => {
                const unsubs: Array<() => void> = [];

                unsubs.push(
                    OBR.broadcast.onMessage('pokerole-pmd-extension/roll-log-update', () => {
                        loadRolls();
                    })
                );

                unsubs.push(
                    OBR.broadcast.onMessage('pokerole-pmd-extension/theme-sync', (event) => {
                        setTheme(event.data as string);
                    })
                );

                unsubs.push(
                    OBR.broadcast.onMessage('pokerole-pmd-extension/popover-theme-sync', (event) => {
                        applyDynamicColors(event.data as { enabled: boolean; primary?: string; secondary?: string });
                    })
                );

                return () => unsubs.forEach((unsub) => unsub());
            });
        }

        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const dismiss = (id: string) => {
        const next = rolls.filter((r) => r.id !== id);
        try {
            localStorage.setItem('pkr_roll_log', JSON.stringify(next));
        } catch (error) {
            console.error('[RollLog] Failed to save to localStorage', error);
        }
        setRolls(next);
        if (next.length === 0 && OBR.isAvailable) OBR.popover.close('pkr-roll-log');
    };

    const clearAll = () => {
        try {
            localStorage.setItem('pkr_roll_log', '[]');
        } catch (error) {
            console.error('[RollLog] Failed to clear localStorage', error);
        }
        setRolls([]);
        if (OBR.isAvailable) OBR.popover.close('pkr-roll-log');
    };

    if (rolls.length === 0) return null;

    return (
        <div className="roll-log-wrapper">
            <div className="roll-log__container">
                <div className="roll-log__header">
                    <h3 className="roll-log__title text-title-primary">
                        <Dices size={20} /> Roll Log
                    </h3>
                    <button
                        type="button"
                        onClick={clearAll}
                        className="action-button action-button--red roll-log__clear-btn text-theme-header"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
                <div className="roll-log__list">
                    {rolls.map((r) => (
                        <div key={r.id} className="roll-log__entry">
                            <div className="roll-log__entry-header">
                                <img src={resolvedIcons[r.id] || r.icon} alt="Token" className="roll-log__entry-icon" />
                                <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                    {r.player}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() => dismiss(r.id)}
                                    className="roll-log__entry-dismiss text-subtext"
                                    title="Dismiss"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="roll-log__entry-label text-label" style={{ color: 'var(--primary)' }}>
                                {r.label}
                            </div>
                            <div className="roll-log__entry-result text-subtext" style={{ color: 'var(--text-main)' }}>
                                {r.result}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ⚠️ HMR-Safe React Root Injection!
const container = document.getElementById('root')!;
const win = window as WindowWithReactRoot;
if (!win.__REACT_ROOT__) {
    win.__REACT_ROOT__ = createRoot(container);
}
win.__REACT_ROOT__.render(
    <StrictMode>
        <RollLog />
    </StrictMode>
);
