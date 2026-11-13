import { StrictMode, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OBR from '@owlbear-rodeo/sdk';
import { BattleOrganizerModal } from './components/modals/battleOrganizer/BattleOrganizerModal';

const PrintBattleOrganizer = lazy(() =>
    import('./components/print/PrintBattleOrganizer').then((m) => ({ default: m.PrintBattleOrganizer }))
);
import {
    subscribeBattleOrganizerSettings,
    setBattleOrganizerOpen
} from './components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import { isStandaloneMode } from './utils/sync/storageAdapter';
import { getRollLogStorageKey } from '@/utils/sync/roomScopedStorage';
import { ROOM_META_ID } from './hooks/owlbearSync/owlbearSyncConstants';
import { mapRoomSettings } from './utils/sync/roomSettingsMeta';
import { useCharacterStore } from './store/useCharacterStore';
import { homebrewStorage, initHomebrewBroadcastSync } from './utils/sync/homebrewStorage';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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
    const rawRoleParam = params.get('role');
    if (rawRoleParam === 'GM' || rawRoleParam === 'PLAYER') {
        useCharacterStore.setState({ role: rawRoleParam });
    }
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

    // Apply colors on mount & track BO open status
    useEffect(() => {
        setBattleOrganizerOpen(true);
        const handleUnload = () => {
            setBattleOrganizerOpen(false);
        };
        window.addEventListener('pagehide', handleUnload);
        window.addEventListener('beforeunload', handleUnload);

        if (OBR.isAvailable) {
            OBR.popover.close('pkr-roll-log').catch(() => {});
        }

        const colors = resolveThemeColors();
        applyDynamicColors(colors.primary, colors.secondary);

        return () => {
            window.removeEventListener('pagehide', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);
            setBattleOrganizerOpen(false);
            if (OBR.isAvailable && !isStandaloneMode) {
                try {
                    const stored = JSON.parse(localStorage.getItem(getRollLogStorageKey()) || '[]');
                    if (Array.isArray(stored) && stored.length > 0) {
                        const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
                        OBR.popover
                            .open({
                                id: 'pkr-roll-log',
                                url: `${baseUrl}/roll-log.html?roomId=${encodeURIComponent(OBR.room.id || '')}`,
                                height: 380,
                                width: 320,
                                disableClickAway: true,
                                anchorReference: 'POSITION',
                                anchorPosition: { left: window.innerWidth - 340, top: window.innerHeight - 400 }
                            })
                            .catch(() => {});
                    }
                } catch (e) {
                    console.warn('[BattleOrganizer] Failed to re-open roll-log popover:', e);
                }
            }
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        };
    }, []);

    // Load local homebrew & multi-tab BroadcastChannel sync on mount
    useEffect(() => {
        useCharacterStore.getState().initPcStorage();
        useCharacterStore.getState().loadHomebrewLocal();
        homebrewStorage.runLocalStorageMigration().catch(() => {});

        const unsubBroadcast = initHomebrewBroadcastSync((data) => {
            useCharacterStore.getState().applyHomebrewSync(data);
        });

        return () => {
            unsubBroadcast();
        };
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

    // Track previous visibility of Battlefield and Round Tracker to avoid resizing on unrelated settings changes (e.g. rollLogMode)
    const prevVisibilityRef = useRef<{
        showBattlefield?: boolean;
        showRoundTracker?: boolean;
    }>({});

    // Dynamic window resizing in standalone PWA mode when settings change
    useEffect(() => {
        if (!isStandaloneMode) return;

        const unsub = subscribeBattleOrganizerSettings((settings) => {
            try {
                const prev = prevVisibilityRef.current;
                const isInitial = prev.showBattlefield === undefined;
                const hasChanged =
                    !isInitial &&
                    (prev.showBattlefield !== settings.showBattlefield ||
                        prev.showRoundTracker !== settings.showRoundTracker);

                prevVisibilityRef.current = {
                    showBattlefield: settings.showBattlefield,
                    showRoundTracker: settings.showRoundTracker
                };

                // Do not resize on initial mount or when unrelated settings (like rollLogMode) change
                if (!hasChanged) return;

                // If user has maximized the window or gone fullscreen, preserve user's window state
                const isMaximized =
                    Boolean(document.fullscreenElement) ||
                    (typeof window.screen !== 'undefined' &&
                        window.outerWidth >= (window.screen.availWidth || 0) - 24 &&
                        window.outerHeight >= (window.screen.availHeight || 0) - 24);

                if (isMaximized) return;

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
    }, []);

    // OBR ready & broadcast sync
    useEffect(() => {
        if (!OBR.isAvailable) return;

        const unsubs: Array<() => void> = [];
        OBR.onReady(() => {
            setIsReady(true);

            // Re-apply latest theme colors on OBR ready
            const colors = resolveThemeColors();
            applyDynamicColors(colors.primary, colors.secondary);

            useCharacterStore.getState().initPcStorage();

            OBR.room
                .getMetadata()
                .then((meta) => {
                    if (ROOM_META_ID in meta) {
                        const data = meta[ROOM_META_ID] as Record<string, unknown> | undefined;
                        if (data) {
                            useCharacterStore.getState().applyRoomSettings(mapRoomSettings(data));
                        }
                    }
                })
                .catch((err) => {
                    console.warn('[BattleOrganizer] Failed to fetch room metadata:', err);
                });

            const unsubRoomMeta = OBR.room.onMetadataChange((meta) => {
                if (ROOM_META_ID in meta) {
                    const data = meta[ROOM_META_ID] as Record<string, unknown> | undefined;
                    if (data) {
                        useCharacterStore.getState().applyRoomSettings(mapRoomSettings(data));
                    }
                }
            });
            unsubs.push(unsubRoomMeta);

            OBR.player
                .getRole()
                .then((role) => {
                    const resolvedRole = role || useCharacterStore.getState().role || 'PLAYER';
                    useCharacterStore.setState({ role: resolvedRole });
                    useCharacterStore.getState().loadHomebrewLocal();
                })
                .catch((err) => {
                    console.warn('[BattleOrganizer] Failed to retrieve OBR player role, falling back to PLAYER:', err);
                    const fallbackRole = useCharacterStore.getState().role || 'PLAYER';
                    useCharacterStore.setState({ role: fallbackRole });
                    useCharacterStore.getState().loadHomebrewLocal();
                });

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
        setBattleOrganizerOpen(false);
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
            {isPrinting && (
                <Suspense fallback={null}>
                    <PrintBattleOrganizer onDone={() => setIsPrinting(false)} />
                </Suspense>
            )}
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
        <ErrorBoundary>
            <BattleOrganizerApp />
        </ErrorBoundary>
    </StrictMode>
);
