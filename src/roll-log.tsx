import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
import './style.css';

interface RollData {
    id: string;
    player: string;
    label: string;
    result: string;
    icon: string;
}

function RollLog() {
    const [rolls, setRolls] = useState<RollData[]>([]);
    const [theme, setTheme] = useState(localStorage.getItem('pokerole-theme') || 'light');

    const loadRolls = () => {
        const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
        setRolls(data);
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
        localStorage.setItem('pkr_roll_log', JSON.stringify(next));
        setRolls(next);
        if (next.length === 0) OBR.popover.close('pkr-roll-log');
    };

    const clearAll = () => {
        localStorage.setItem('pkr_roll_log', '[]');
        setRolls([]);
        OBR.popover.close('pkr-roll-log');
    };

    if (rolls.length === 0) return null;

    return (
        <div
            style={{
                padding: '10px',
                background: 'var(--panel-bg)',
                border: '2px solid var(--primary)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '6px',
                    flexShrink: 0
                }}
            >
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>🎲 Roll Log</h3>
                <button
                    onClick={clearAll}
                    className="action-button action-button--red"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                    Clear All ✖
                </button>
            </div>
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    paddingRight: '4px'
                }}
            >
                {rolls.map((r) => (
                    <div
                        key={r.id}
                        style={{
                            background: 'var(--panel-alt)',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <img
                                src={r.icon}
                                alt="Token"
                                style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '4px' }}
                            />
                            <strong style={{ fontSize: '0.9rem' }}>{r.player}</strong>
                            <button
                                onClick={() => dismiss(r.id)}
                                style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                ✖
                            </button>
                        </div>
                        <div
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: 'var(--primary)',
                                marginBottom: '4px'
                            }}
                        >
                            {r.label}
                        </div>
                        <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{r.result}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ⚠️ HMR-Safe React Root Injection!
const container = document.getElementById('root')!;
const win = window as any;
if (!win.__REACT_ROOT__) {
    win.__REACT_ROOT__ = createRoot(container);
}
win.__REACT_ROOT__.render(
    <StrictMode>
        <RollLog />
    </StrictMode>
);
