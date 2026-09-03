import { StrictMode, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
import { BattleOrganizerModal } from './components/modals/battleOrganizer/BattleOrganizerModal';
import { PrintBattleOrganizer } from './components/print/PrintBattleOrganizer';
import './style.css';

// Strictly type the custom Window property for HMR to avoid 'any'
interface WindowWithReactRoot extends Window {
    __REACT_ROOT__?: Root;
}

export function BattleOrganizerApp() {
    const [isPrinting, setIsPrinting] = useState(false);
    const [isReady, setIsReady] = useState(() => !OBR.isAvailable || Boolean(OBR.isReady));
    const [theme, setTheme] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('theme') || localStorage.getItem('pokerole-theme') || 'dark';
    });

    // Theme sync
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

    // OBR ready & theme sync
    useEffect(() => {
        if (!OBR.isAvailable) return;

        const unsubs: Array<() => void> = [];
        OBR.onReady(() => {
            setIsReady(true);

            // Load saved theme colors if present
            try {
                const savedColors = localStorage.getItem('pkr_active_theme_colors');
                if (savedColors) {
                    const data = JSON.parse(savedColors);
                    if (data?.enabled && data?.primary) {
                        document.body.style.setProperty('--dynamic-type-color', data.primary);
                        document.documentElement.style.setProperty('--dynamic-type-color', data.primary);
                        if (data.secondary) {
                            document.body.style.setProperty('--dynamic-secondary-color', data.secondary);
                            document.documentElement.style.setProperty('--dynamic-secondary-color', data.secondary);
                        }
                    }
                }
            } catch (e) {
                console.warn('[BattleOrganizerApp] Failed to parse saved theme colors:', e);
            }

            const unsubTheme = OBR.broadcast.onMessage('pkr-theme-update', (event) => {
                setTheme(event.data as string);
            });
            unsubs.push(unsubTheme);

            const unsubColors = OBR.broadcast.onMessage('pokerole-pmd-extension/popover-theme-sync', (event) => {
                const data = event.data as { enabled: boolean; primary?: string; secondary?: string };
                if (data?.enabled && data?.primary) {
                    document.body.style.setProperty('--dynamic-type-color', data.primary);
                    document.documentElement.style.setProperty('--dynamic-type-color', data.primary);
                    if (data.secondary) {
                        document.body.style.setProperty('--dynamic-secondary-color', data.secondary);
                        document.documentElement.style.setProperty('--dynamic-secondary-color', data.secondary);
                    }
                }
            });
            unsubs.push(unsubColors);
        });

        return () => unsubs.forEach((u) => u());
    }, []);

    const handleClose = () => {
        if (OBR.isAvailable) {
            OBR.modal.close('pkr-battle-organizer').catch(() => {});
        } else {
            window.close();
        }
    };

    if (!isReady) {
        return (
            <div
                style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted, #aaa)',
                    backgroundColor: 'var(--panel-bg, #1e1e1e)',
                    fontSize: '0.9rem'
                }}
            >
                Loading Battle Organizer...
            </div>
        );
    }

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                backgroundColor: 'var(--panel-bg, #1e1e1e)'
            }}
        >
            <BattleOrganizerModal isPopout={true} onClose={handleClose} onPrint={() => setIsPrinting(true)} />
            {isPrinting && <PrintBattleOrganizer onDone={() => setIsPrinting(false)} />}
        </div>
    );
}

const container = document.getElementById('root')!;
const win = window as WindowWithReactRoot;

if (!win.__REACT_ROOT__) {
    win.__REACT_ROOT__ = createRoot(container);
}

win.__REACT_ROOT__.render(
    <StrictMode>
        <BattleOrganizerApp />
    </StrictMode>
);
