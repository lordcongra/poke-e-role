import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { imageManager } from '../utils/graphics/imageManager';
import { cropImageTransparencyUrl } from '../utils/graphics/imageCropUtils';
import type { RollSyncData } from './owlbearSync/owlbearSyncConstants';

export function useRollLogSync() {
    const [rolls, setRolls] = useState<RollSyncData[]>(() => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[useRollLogSync] Failed to parse roll log from local storage. Resetting log.', error);
            return [];
        }
    });
    const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({});
    const [theme, setTheme] = useState(() => localStorage.getItem('pokerole-theme') || 'dark');

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

    // 1. Initial theme colors
    useEffect(() => {
        try {
            const raw = localStorage.getItem('pkr_active_theme_colors');
            if (raw) applyDynamicColors(JSON.parse(raw));
        } catch (e) {
            console.warn('[useRollLogSync] Failed to parse active theme colors from localStorage:', e);
        }
    }, []);

    // 2. Light / Dark theme attribute sync
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

    // 3. Resolve and cache token / Pokemon icons
    useEffect(() => {
        let isMounted = true;

        const resolveIcons = async () => {
            const newIcons: Record<string, string> = {};
            for (const r of rolls) {
                let resolved = r.icon;
                if (resolved && resolved.startsWith('local-img:')) {
                    try {
                        const url = await imageManager.getImageUrl(resolved);
                        if (url) resolved = url;
                    } catch (e) {
                        console.warn('[useRollLogSync] Failed to resolve local image for roll log.', e);
                    }
                }
                if (resolved && !resolved.includes('pokeball.svg')) {
                    try {
                        const cropped = await cropImageTransparencyUrl(resolved, true);
                        if (cropped && isMounted) newIcons[r.id] = cropped;
                    } catch {
                        if (resolved && isMounted) newIcons[r.id] = resolved;
                    }
                } else if (resolved && isMounted) {
                    newIcons[r.id] = resolved;
                }
            }
            if (isMounted) {
                setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
            }
        };

        resolveIcons();

        return () => {
            isMounted = false;
        };
    }, [rolls]);

    // 4. Multi-channel synchronization (Storage, BroadcastChannel, OBR broadcasts)
    useEffect(() => {
        let isMounted = true;

        const handleReload = () => {
            try {
                const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                const rawRolls: RollSyncData[] = Array.isArray(data) ? data : [];
                if (isMounted) setRolls(rawRolls);
            } catch (error) {
                console.error('[useRollLogSync] Failed to parse roll log from local storage. Resetting log.', error);
                if (isMounted) setRolls([]);
            }
        };

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pkr_roll_log') {
                handleReload();
            }
            if (e.key === 'pkr_active_theme_colors') {
                try {
                    applyDynamicColors(JSON.parse(e.newValue || '{}'));
                } catch (err) {
                    console.warn('[useRollLogSync] Failed to parse dynamic colors on storage update:', err);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('pkr-roll-log-update', handleReload);

        // Same-origin fast broadcast channel (instant cross-iframe sync)
        let channel: BroadcastChannel | null = null;
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                channel = new BroadcastChannel('pkr_roll_log_channel');
                channel.onmessage = (event) => {
                    if (event.data?.type === 'roll-log-update') {
                        handleReload();
                    } else if (event.data?.type === 'roll-log-sync' && event.data.roll && isMounted) {
                        const roll = event.data.roll as RollSyncData;
                        setRolls((prev) => {
                            if (prev.some((r) => r.id === roll.id)) return prev;
                            const next = [roll, ...prev].slice(0, 50);
                            try {
                                localStorage.setItem('pkr_roll_log', JSON.stringify(next));
                            } catch (e) {
                                console.error('[useRollLogSync] Failed to persist synced roll:', e);
                            }
                            return next;
                        });
                    }
                };
            } catch (chanErr) {
                console.warn('[useRollLogSync] BroadcastChannel setup failed:', chanErr);
            }
        }

        const unsubs: Array<() => void> = [];
        if (OBR.isAvailable) {
            OBR.onReady(() => {
                if (!isMounted) return;
                try {
                    unsubs.push(
                        OBR.broadcast.onMessage('pokerole-pmd-extension/roll-log-update', () => {
                            handleReload();
                        })
                    );

                    unsubs.push(
                        OBR.broadcast.onMessage('pokerole-pmd-extension/roll-log-sync', async (event) => {
                            const roll = event.data as RollSyncData;
                            if (roll && roll.id && isMounted) {
                                if (roll.targetVisibility === 'gm_only') {
                                    try {
                                        const myId = await OBR.player.getId();
                                        const myRole = await OBR.player.getRole();
                                        if (myRole !== 'GM' && roll.playerId !== myId) {
                                            return;
                                        }
                                    } catch {
                                        return;
                                    }
                                }
                                setRolls((prev) => {
                                    if (prev.some((r) => r.id === roll.id)) return prev;
                                    const next = [roll, ...prev].slice(0, 50);
                                    try {
                                        localStorage.setItem('pkr_roll_log', JSON.stringify(next));
                                    } catch (e) {
                                        console.error('[useRollLogSync] Failed to persist synced roll:', e);
                                    }
                                    return next;
                                });
                            }
                        })
                    );

                    unsubs.push(
                        OBR.broadcast.onMessage('pokerole-pmd-extension/theme-sync', (event) => {
                            if (isMounted) setTheme(event.data as string);
                        })
                    );

                    unsubs.push(
                        OBR.broadcast.onMessage('pokerole-pmd-extension/popover-theme-sync', (event) => {
                            applyDynamicColors(
                                event.data as { enabled: boolean; primary?: string; secondary?: string }
                            );
                        })
                    );
                } catch (e) {
                    console.error('[useRollLogSync] Failed to register OBR broadcast listeners:', e);
                }
            });
        }

        return () => {
            isMounted = false;
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('pkr-roll-log-update', handleReload);
            if (channel) {
                try {
                    channel.close();
                } catch {}
            }
            unsubs.forEach((unsub) => {
                try {
                    unsub();
                } catch (e) {
                    console.warn('[useRollLogSync] Error during unsubscribe:', e);
                }
            });
        };
    }, []);

    const dismiss = (id: string) => {
        const next = rolls.filter((r) => r.id !== id);
        try {
            localStorage.setItem('pkr_roll_log', JSON.stringify(next));
        } catch (error) {
            console.error('[useRollLogSync] Failed to save to localStorage', error);
        }
        setRolls(next);
        if (next.length === 0 && OBR.isAvailable) {
            OBR.onReady(() => {
                OBR.popover.close('pkr-roll-log').catch(() => {});
            });
        }
    };

    const clearAll = () => {
        try {
            localStorage.setItem('pkr_roll_log', '[]');
        } catch (error) {
            console.error('[useRollLogSync] Failed to clear localStorage', error);
        }
        setRolls([]);
        if (OBR.isAvailable) {
            OBR.onReady(() => {
                OBR.popover.close('pkr-roll-log').catch(() => {});
            });
        }
    };

    return {
        rolls,
        resolvedIcons,
        dismiss,
        clearAll
    };
}
