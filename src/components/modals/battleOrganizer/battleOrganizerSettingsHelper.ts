import OBR from '@owlbear-rodeo/sdk';
import type { BattleOrganizerSettings, BattleOrganizerWindowMode } from '../../../types/battleOrganizerTypes';

export const BO_SHOW_BATTLEFIELD_KEY = 'pkr_bo_show_battlefield';
export const BO_SHOW_ROUND_TRACKER_KEY = 'pkr_bo_show_round_tracker';
export const BO_WINDOW_MODE_KEY = 'pkr_bo_window_mode';
export const BO_AUTO_SYNC_ACTIONS_KEY = 'pkr_bo_auto_sync_actions';
export const BO_SETTINGS_UPDATE_EVENT = 'pkr-bo-settings-update';
export const BO_BROADCAST_SETTINGS_CHANNEL = 'pkr-bo-settings-broadcast';

export const DEFAULT_BO_SETTINGS: BattleOrganizerSettings = {
    showBattlefield: true,
    showRoundTracker: true,
    windowMode: 'modal',
    autoSyncActions: true
};

export function getBattleOrganizerSettings(): BattleOrganizerSettings {
    try {
        const rawBattlefield = localStorage.getItem(BO_SHOW_BATTLEFIELD_KEY);
        const rawRoundTracker = localStorage.getItem(BO_SHOW_ROUND_TRACKER_KEY);
        const rawWindowMode = localStorage.getItem(BO_WINDOW_MODE_KEY) as BattleOrganizerWindowMode | null;
        const rawAutoSync = localStorage.getItem(BO_AUTO_SYNC_ACTIONS_KEY);

        let showBattlefield = rawBattlefield !== null ? rawBattlefield === 'true' : DEFAULT_BO_SETTINGS.showBattlefield;
        let showRoundTracker =
            rawRoundTracker !== null ? rawRoundTracker === 'true' : DEFAULT_BO_SETTINGS.showRoundTracker;

        // Safety: At least one section must be visible. If both are false, restore both to true.
        if (!showBattlefield && !showRoundTracker) {
            showBattlefield = true;
            showRoundTracker = true;
        }

        const windowMode: BattleOrganizerWindowMode =
            rawWindowMode === 'modal' || rawWindowMode === 'popout' || rawWindowMode === 'popover'
                ? rawWindowMode
                : 'modal';

        const autoSyncActions = rawAutoSync !== null ? rawAutoSync === 'true' : DEFAULT_BO_SETTINGS.autoSyncActions;

        return {
            showBattlefield,
            showRoundTracker,
            windowMode,
            autoSyncActions
        };
    } catch (e) {
        console.error('[BattleOrganizerSettings] Failed to load settings from localStorage:', e);
        return { ...DEFAULT_BO_SETTINGS };
    }
}

export function saveBattleOrganizerSettings(partial: Partial<BattleOrganizerSettings>): BattleOrganizerSettings {
    try {
        const current = getBattleOrganizerSettings();
        let next: BattleOrganizerSettings = {
            ...current,
            ...partial
        };

        // Guarantee at least one section is enabled
        if (!next.showBattlefield && !next.showRoundTracker) {
            if (partial.showBattlefield === false && current.showRoundTracker) {
                next.showRoundTracker = true;
            } else if (partial.showRoundTracker === false && current.showBattlefield) {
                next.showBattlefield = true;
            } else {
                next.showBattlefield = true;
                next.showRoundTracker = true;
            }
        }

        localStorage.setItem(BO_SHOW_BATTLEFIELD_KEY, String(next.showBattlefield));
        localStorage.setItem(BO_SHOW_ROUND_TRACKER_KEY, String(next.showRoundTracker));
        localStorage.setItem(BO_WINDOW_MODE_KEY, next.windowMode || 'modal');
        localStorage.setItem(BO_AUTO_SYNC_ACTIONS_KEY, String(next.autoSyncActions));

        // Dispatch local event
        window.dispatchEvent(new CustomEvent(BO_SETTINGS_UPDATE_EVENT, { detail: next }));

        // Broadcast to other OBR frames / popovers if available
        if (OBR.isAvailable) {
            try {
                OBR.broadcast.sendMessage(BO_BROADCAST_SETTINGS_CHANNEL, next, { destination: 'LOCAL' });
            } catch (broadcastErr) {
                console.warn('[BattleOrganizerSettings] Failed to broadcast settings update:', broadcastErr);
            }
        }

        return next;
    } catch (e) {
        console.error('[BattleOrganizerSettings] Failed to save settings to localStorage:', e);
        return getBattleOrganizerSettings();
    }
}

export function subscribeBattleOrganizerSettings(callback: (settings: BattleOrganizerSettings) => void): () => void {
    const handleCustomEvent = (e: Event) => {
        const customEvent = e as CustomEvent<BattleOrganizerSettings>;
        if (customEvent.detail) {
            callback(customEvent.detail);
        } else {
            callback(getBattleOrganizerSettings());
        }
    };

    const handleStorageEvent = (e: StorageEvent) => {
        if (
            e.key === BO_SHOW_BATTLEFIELD_KEY ||
            e.key === BO_SHOW_ROUND_TRACKER_KEY ||
            e.key === BO_WINDOW_MODE_KEY ||
            e.key === BO_AUTO_SYNC_ACTIONS_KEY
        ) {
            callback(getBattleOrganizerSettings());
        }
    };

    window.addEventListener(BO_SETTINGS_UPDATE_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    let unsubBroadcast: (() => void) | undefined;
    if (OBR.isAvailable) {
        try {
            unsubBroadcast = OBR.broadcast.onMessage(BO_BROADCAST_SETTINGS_CHANNEL, (event) => {
                if (event.data) {
                    callback(event.data as BattleOrganizerSettings);
                }
            });
        } catch {
            // Ignore OBR not ready
        }
    }

    return () => {
        window.removeEventListener(BO_SETTINGS_UPDATE_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
        if (unsubBroadcast) unsubBroadcast();
    };
}
