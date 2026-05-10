import { StrictMode, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
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
    const [theme, setTheme] = useState(localStorage.getItem('pokerole-theme') || 'light');

    const loadRolls = () => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            setRolls(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to parse roll log from local storage. Resetting log.', error);
            setRolls([]);
        }
    };

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme]);

    useEffect(() => {
        loadRolls();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pkr_roll_log') {
                loadRolls();
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
            console.error('Failed to save to localStorage', error);
        }
        setRolls(next);
        if (next.length === 0 && OBR.isAvailable) OBR.popover.close('pkr-roll-log');
    };

    const clearAll = () => {
        try {
            localStorage.setItem('pkr_roll_log', '[]');
        } catch (error) {
            console.error('Failed to clear localStorage', error);
        }
        setRolls([]);
        if (OBR.isAvailable) OBR.popover.close('pkr-roll-log');
    };

    if (rolls.length === 0) return null;

    return (
        <div className="roll-log__container">
            <div className="roll-log__header">
                <h3 className="roll-log__title">🎲 Roll Log</h3>
                <button
                    type="button"
                    onClick={clearAll}
                    className="action-button action-button--red roll-log__clear-btn"
                >
                    Clear All ✖
                </button>
            </div>
            <div className="roll-log__list">
                {rolls.map((r) => (
                    <div key={r.id} className="roll-log__entry">
                        <div className="roll-log__entry-header">
                            <img src={r.icon} alt="Token" className="roll-log__entry-icon" />
                            <strong className="roll-log__entry-player">{r.player}</strong>
                            <button
                                type="button"
                                onClick={() => dismiss(r.id)}
                                className="roll-log__entry-dismiss"
                                title="Dismiss"
                            >
                                ✖
                            </button>
                        </div>
                        <div className="roll-log__entry-label">{r.label}</div>
                        <div className="roll-log__entry-result">{r.result}</div>
                    </div>
                ))}
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
