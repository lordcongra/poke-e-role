import type { BattleOrganizerSettings, BattleOrganizerWindowMode } from '../../../types/battleOrganizerTypes';

export const BO_SHOW_BATTLEFIELD_KEY = 'pkr_bo_show_battlefield';
export const BO_SHOW_ROUND_TRACKER_KEY = 'pkr_bo_show_round_tracker';
export const BO_WINDOW_MODE_KEY = 'pkr_bo_window_mode';
export const BO_AUTO_SYNC_ACTIONS_KEY = 'pkr_bo_auto_sync_actions';
export const BO_FULLSCREEN_KEY = 'pkr_bo_fullscreen';
export const BO_IS_OPEN_KEY = 'pkr_battle_organizer_open';
export const BO_SETTINGS_UPDATE_EVENT = 'pkr-bo-settings-update';

export function isBattleOrganizerOpen(): boolean {
    if (typeof window !== 'undefined' && window.location.pathname.includes('battle-organizer')) {
        return true;
    }
    try {
        return localStorage.getItem(BO_IS_OPEN_KEY) === 'true';
    } catch {
        return false;
    }
}

export function setBattleOrganizerOpen(isOpen: boolean): void {
    try {
        if (isOpen) {
            localStorage.setItem(BO_IS_OPEN_KEY, 'true');
        } else {
            localStorage.removeItem(BO_IS_OPEN_KEY);
        }
    } catch (e) {
        console.warn('[BattleOrganizerSettings] Failed to set BO open state:', e);
    }
}

export const DEFAULT_BO_SETTINGS: BattleOrganizerSettings = {
    showBattlefield: true,
    showRoundTracker: true,
    windowMode: 'modal',
    autoSyncActions: true,
    fullScreen: false
};

export function getBattleOrganizerSettings(): BattleOrganizerSettings {
    try {
        const rawBattlefield = localStorage.getItem(BO_SHOW_BATTLEFIELD_KEY);
        const rawRoundTracker = localStorage.getItem(BO_SHOW_ROUND_TRACKER_KEY);
        const rawWindowMode = localStorage.getItem(BO_WINDOW_MODE_KEY) as BattleOrganizerWindowMode | null;
        const rawAutoSync = localStorage.getItem(BO_AUTO_SYNC_ACTIONS_KEY);
        const rawFullScreen = localStorage.getItem(BO_FULLSCREEN_KEY);

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
        const fullScreen = rawFullScreen !== null ? rawFullScreen === 'true' : (DEFAULT_BO_SETTINGS.fullScreen ?? false);

        return {
            showBattlefield,
            showRoundTracker,
            windowMode,
            autoSyncActions,
            fullScreen
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
        if (next.fullScreen !== undefined) {
            localStorage.setItem(BO_FULLSCREEN_KEY, String(next.fullScreen));
        }

        // Dispatch local event for same-window components
        window.dispatchEvent(new CustomEvent(BO_SETTINGS_UPDATE_EVENT, { detail: next }));

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
            e.key === BO_AUTO_SYNC_ACTIONS_KEY ||
            e.key === BO_FULLSCREEN_KEY
        ) {
            callback(getBattleOrganizerSettings());
        }
    };

    window.addEventListener(BO_SETTINGS_UPDATE_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
        window.removeEventListener(BO_SETTINGS_UPDATE_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
    };
}
