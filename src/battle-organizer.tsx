import { StrictMode, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
import { BattleOrganizerModal } from './components/modals/battleOrganizer/BattleOrganizerModal';
import { PrintBattleOrganizer } from './components/print/PrintBattleOrganizer';
import {
    getBattleOrganizerSettings,
    subscribeBattleOrganizerSettings
} from './components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import type { BattleOrganizerSettings } from './types/battleOrganizerTypes';
import { isStandaloneMode } from './utils/storageAdapter';
import './style.css';

// Strictly type the custom Window property for HMR to avoid 'any'
interface WindowWithReactRoot extends Window {
    __REACT_ROOT__?: Root;
}

export function applyDynamicColors(primary?: string | null, secondary?: string | null) {
    if (primary && primary.trim()) {
        const p = primary.trim();
        document.body.style.setProperty('--dynamic-type-color', p);
        document.documentElement.style.setProperty('--dynamic-type-color', p);
    } else {
        document.body.style.removeProperty('--dynamic-type-color');
        document.documentElement.style.removeProperty('--dynamic-type-color');
    }

    if (secondary && secondary.trim()) {
        const s = secondary.trim();
        document.body.style.setProperty('--dynamic-secondary-color', s);
        document.documentElement.style.setProperty('--dynamic-secondary-color', s);
    } else {
        document.body.style.removeProperty('--dynamic-secondary-color');
        document.documentElement.style.removeProperty('--dynamic-secondary-color');
    }
}

export function resolveThemeColors(): { primary: string; secondary: string } {
    try {
        const params = new URLSearchParams(window.location.search);
        const urlPrimary = params.get('primary');
        const urlSecondary = params.get('secondary');
        if (urlPrimary && urlPrimary.trim()) {
            return {
                primary: urlPrimary.trim(),
                secondary: urlSecondary ? urlSecondary.trim() : ''
            };
        }
    } catch {
        // ignore
    }

    try {
        const sheetColors = localStorage.getItem('pkr_sheet_theme_colors');
        if (sheetColors) {
            const parsed = JSON.parse(sheetColors);
            if (parsed?.primary) {
                return {
                    primary: parsed.primary,
                    secondary: parsed.secondary || ''
                };
            }
        }
    } catch {
        // ignore
    }

    try {
        const activeColors = localStorage.getItem('pkr_active_theme_colors');
        if (activeColors) {
            const parsed = JSON.parse(activeColors);
            if (parsed?.primary) {
                return {
                    primary: parsed.primary,
                    secondary: parsed.secondary || ''
                };
            }
        }
    } catch {
        // ignore
    }

    return { primary: '', secondary: '' };
}

// Immediately apply theme and dynamic colors on script load to prevent any flash of default red
try {
    const params = new URLSearchParams(window.location.search);
    const initialTheme = params.get('theme') || localStorage.getItem('pokerole-theme') || 'dark';
    if (initialTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        document.body.setAttribute('data-theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
    }

    const initialColors = resolveThemeColors();
    applyDynamicColors(initialColors.primary, initialColors.secondary);
} catch (e) {
    console.warn('[battle-organizer] Immediate theme initialization failed:', e);
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

    // Apply colors on mount
    useEffect(() => {
        const colors = resolveThemeColors();
        applyDynamicColors(colors.primary, colors.secondary);
    }, []);

    // Live storage sync for standalone PWA & cross-tab theme changes
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pokerole-theme' && e.newValue) {
                setTheme(e.newValue);
            }
            if (e.key === 'pkr_sheet_theme_colors' || e.key === 'pkr_active_theme_colors') {
                const colors = resolveThemeColors();
                applyDynamicColors(colors.primary, colors.secondary);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Dynamic modal resizing when settings change (e.g. toggling battlefield or round tracker)
    useEffect(() => {
        if (isStandaloneMode) {
            const unsub = subscribeBattleOrganizerSettings((settings) => {
                try {
                    let targetWidth = 1360;
                    let targetHeight = 880;
                    if (settings.showBattlefield && !settings.showRoundTracker) {
                        targetWidth = 1040;
                        targetHeight = 620;
                    } else if (!settings.showBattlefield && settings.showRoundTracker) {
                        targetWidth = 1200;
                        targetHeight = 760;
                    }
                    window.resizeTo(targetWidth, targetHeight);
                } catch {
                    // resizeTo may be blocked by browser security
                }
            });
            return () => unsub();
        }

        if (!OBR.isAvailable || !isReady) return;

        let prevDimensions = '';

        const resizeModal = async (settings: BattleOrganizerSettings) => {
            try {
                const viewportWidth = (await OBR.viewport.getWidth()) ?? 1200;
                const viewportHeight = (await OBR.viewport.getHeight()) ?? 800;

                let targetWidth = 1360;
                let targetHeight = 900;

                if (settings.showBattlefield && !settings.showRoundTracker) {
                    targetWidth = 1040;
                    targetHeight = 600;
                } else if (!settings.showBattlefield && settings.showRoundTracker) {
                    targetWidth = 1200;
                    targetHeight = 740;
                }

                targetWidth = Math.min(Math.round(viewportWidth * 0.95), targetWidth);
                targetHeight = Math.min(Math.round(viewportHeight * 0.95), targetHeight);

                const dimKey = `${targetWidth}x${targetHeight}`;
                if (dimKey === prevDimensions) return;
                prevDimensions = dimKey;

                const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
                const themeToPass = document.body.getAttribute('data-theme') || 'dark';
                const currentPrimary =
                    document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
                    document.body.style.getPropertyValue('--dynamic-type-color') ||
                    '';
                const currentSecondary =
                    document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
                    document.body.style.getPropertyValue('--dynamic-secondary-color') ||
                    '';
                const params = new URLSearchParams();
                params.set('theme', themeToPass);
                if (currentPrimary.trim()) params.set('primary', currentPrimary.trim());
                if (currentSecondary.trim()) params.set('secondary', currentSecondary.trim());
                const url = `${baseUrl}/battle-organizer.html?${params.toString()}`;

                await OBR.modal.open({
                    id: 'pkr-battle-organizer',
                    url: url,
                    width: targetWidth,
                    height: targetHeight
                });
            } catch (e) {
                console.warn('[BattleOrganizerApp] Failed to dynamically resize OBR modal:', e);
            }
        };

        // Resize on mount with current settings
        resizeModal(getBattleOrganizerSettings());

        const unsub = subscribeBattleOrganizerSettings((newSettings) => {
            resizeModal(newSettings);
        });

        return () => unsub();
    }, [isReady]);

    // OBR ready & broadcast sync
    useEffect(() => {
        if (!OBR.isAvailable) return;

        const unsubs: Array<() => void> = [];
        OBR.onReady(() => {
            setIsReady(true);

            // Re-apply latest theme colors on OBR ready
            const colors = resolveThemeColors();
            applyDynamicColors(colors.primary, colors.secondary);

            const unsubTheme = OBR.broadcast.onMessage('pkr-theme-update', (event) => {
                setTheme(event.data as string);
            });
            unsubs.push(unsubTheme);

            const unsubColors = OBR.broadcast.onMessage('pokerole-pmd-extension/popover-theme-sync', (event) => {
                const data = event.data as { enabled: boolean; primary?: string; secondary?: string };
                if (data?.primary) {
                    applyDynamicColors(data.primary, data.secondary);
                } else if (data?.enabled === false) {
                    const fallback = resolveThemeColors();
                    applyDynamicColors(fallback.primary, fallback.secondary);
                }
            });
            unsubs.push(unsubColors);
        });

        return () => unsubs.forEach((u) => u());
    }, []);

    const handleClose = () => {
        if (isStandaloneMode) {
            window.close();
        } else if (OBR.isAvailable) {
            OBR.modal.close('pkr-battle-organizer').catch(() => {});
            OBR.popover.close('pkr-battle-organizer').catch(() => {});
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
