import type {
    BattleOrganizerSettings,
    BattleOrganizerWindowMode,
    RollLogLayoutMode
} from '../../../types/battleOrganizerTypes';
import { getBattleOrganizerOpenKey, getEffectiveRoomId } from '@/utils/sync/roomScopedStorage';

export const BO_SHOW_BATTLEFIELD_KEY = 'pkr_bo_show_battlefield';
export const BO_SHOW_ROUND_TRACKER_KEY = 'pkr_bo_show_round_tracker';
export const BO_WINDOW_MODE_KEY = 'pkr_bo_window_mode';
export const BO_AUTO_SYNC_ACTIONS_KEY = 'pkr_bo_auto_sync_actions';
export const BO_FULLSCREEN_KEY = 'pkr_bo_fullscreen';
export const BO_ROLL_LOG_MODE_KEY = 'pkr_bo_roll_log_mode';
export const BO_SHOW_CRITICAL_MARKS_KEY = 'pkr_bo_show_critical_marks';
export const BO_SHOW_COMBATANT_CHIPS_KEY = 'pkr_bo_show_combatant_chips';
export const BO_IS_OPEN_KEY = 'pkr_battle_organizer_open';
export const BO_SETTINGS_UPDATE_EVENT = 'pkr-bo-settings-update';

const BO_HEARTBEAT_INTERVAL_MS = 4000;
const BO_PRESENCE_TTL_MS = 12000;

interface BoPresenceMessage {
    type: 'open' | 'heartbeat' | 'close';
    roomId: string;
    ts: number;
}

let isBoModalOpenInMemory = false;
let boHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activePresenceChannel: BroadcastChannel | null = null;
let activePresenceChannelName = '';
let activeOpenRoomId: string | null = null;
const remotePresenceTimestamps = new Map<string, number>();

function ensurePresenceChannel(roomId: string): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null;
    const channelName = `pkr_bo_presence_${roomId}`;
    if (activePresenceChannel && activePresenceChannelName === channelName) {
        return activePresenceChannel;
    }
    if (activePresenceChannel) {
        try {
            activePresenceChannel.close();
        } catch {
            // Ignore close errors
        }
        activePresenceChannel = null;
        activePresenceChannelName = '';
    }
    try {
        const channel = new BroadcastChannel(channelName);
        channel.onmessage = (event: MessageEvent<BoPresenceMessage>) => {
            const msg = event.data;
            if (!msg || typeof msg !== 'object') return;
            const msgRoomId = msg.roomId || roomId;
            if (msg.type === 'open' || msg.type === 'heartbeat') {
                remotePresenceTimestamps.set(msgRoomId, typeof msg.ts === 'number' ? msg.ts : Date.now());
            } else if (msg.type === 'close') {
                remotePresenceTimestamps.delete(msgRoomId);
            }
        };
        activePresenceChannel = channel;
        activePresenceChannelName = channelName;
        return channel;
    } catch {
        return null;
    }
}

function broadcastBoPresence(type: BoPresenceMessage['type'], roomId: string, ts: number): void {
    const channel = ensurePresenceChannel(roomId);
    if (!channel) return;
    try {
        channel.postMessage({ type, roomId, ts } satisfies BoPresenceMessage);
    } catch {
        // Ignore BroadcastChannel post errors
    }
}

function refreshHeartbeat(): void {
    const roomId = getEffectiveRoomId();
    const openKey = getBattleOrganizerOpenKey(roomId);
    const now = Date.now();
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(openKey, 'true');
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(openKey, now.toString());
        }
    } catch (e) {
        console.warn('[BattleOrganizerSettings] Failed to refresh BO open heartbeat:', e);
    }
    activeOpenRoomId = roomId;
    broadcastBoPresence('heartbeat', roomId, now);
}

export function isBattleOrganizerOpen(): boolean {
    if (typeof window !== 'undefined') {
        if (window.location?.pathname?.includes('battle-organizer')) {
            return true;
        }
        if (isBoModalOpenInMemory) {
            return true;
        }
        if (
            typeof document !== 'undefined' &&
            document.querySelector(
                '.bo-modal__overlay, .bo-modal__content, .battle-organizer-modal__overlay, .battle-organizer-modal'
            )
        ) {
            return true;
        }
    }

    const roomId = getEffectiveRoomId();
    const openKey = getBattleOrganizerOpenKey(roomId);
    ensurePresenceChannel(roomId);

    const remoteTs = remotePresenceTimestamps.get(roomId);
    if (remoteTs !== undefined) {
        if (Date.now() - remoteTs < BO_PRESENCE_TTL_MS) {
            return true;
        }
        remotePresenceTimestamps.delete(roomId);
    }

    try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(openKey) === 'true') {
            return true;
        }
        if (typeof localStorage !== 'undefined') {
            const boTs = localStorage.getItem(openKey);
            if (boTs) {
                const age = Date.now() - parseInt(boTs, 10);
                if (!isNaN(age) && age < BO_PRESENCE_TTL_MS) {
                    return true;
                }
                if (!isNaN(age) && age >= BO_PRESENCE_TTL_MS) {
                    localStorage.removeItem(openKey);
                }
            }
        }
        return false;
    } catch {
        return false;
    }
}

export function setBattleOrganizerOpen(isOpen: boolean): void {
    isBoModalOpenInMemory = isOpen;
    const roomId = getEffectiveRoomId();
    const openKey = getBattleOrganizerOpenKey(roomId);

    if (boHeartbeatTimer !== null) {
        clearInterval(boHeartbeatTimer);
        boHeartbeatTimer = null;
    }

    try {
        if (isOpen) {
            const now = Date.now();
            activeOpenRoomId = roomId;
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(openKey, 'true');
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(openKey, now.toString());
            }
            broadcastBoPresence('open', roomId, now);
            boHeartbeatTimer = setInterval(refreshHeartbeat, BO_HEARTBEAT_INTERVAL_MS);
        } else {
            const keysToRemove = new Set<string>([openKey, BO_IS_OPEN_KEY]);
            if (activeOpenRoomId && activeOpenRoomId !== roomId) {
                keysToRemove.add(getBattleOrganizerOpenKey(activeOpenRoomId));
            }
            keysToRemove.forEach((key) => {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem(key);
                }
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(key);
                }
            });
            remotePresenceTimestamps.delete(roomId);
            broadcastBoPresence('close', roomId, Date.now());
            if (activeOpenRoomId && activeOpenRoomId !== roomId) {
                remotePresenceTimestamps.delete(activeOpenRoomId);
                broadcastBoPresence('close', activeOpenRoomId, Date.now());
            }
            activeOpenRoomId = null;
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
    fullScreen: false,
    rollLogMode: 'floating',
    showCriticalMarks: true,
    showCombatantChips: true
};

export function getBattleOrganizerSettings(): BattleOrganizerSettings {
    try {
        const rawBattlefield = localStorage.getItem(BO_SHOW_BATTLEFIELD_KEY);
        const rawRoundTracker = localStorage.getItem(BO_SHOW_ROUND_TRACKER_KEY);
        const rawWindowMode = localStorage.getItem(BO_WINDOW_MODE_KEY) as BattleOrganizerWindowMode | null;
        const rawAutoSync = localStorage.getItem(BO_AUTO_SYNC_ACTIONS_KEY);
        const rawFullScreen = localStorage.getItem(BO_FULLSCREEN_KEY);
        const rawRollLogMode = localStorage.getItem(BO_ROLL_LOG_MODE_KEY) as RollLogLayoutMode | null;
        const rawCritMarks = localStorage.getItem(BO_SHOW_CRITICAL_MARKS_KEY);
        const rawCombatantChips = localStorage.getItem(BO_SHOW_COMBATANT_CHIPS_KEY);

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
        const fullScreen =
            rawFullScreen !== null ? rawFullScreen === 'true' : (DEFAULT_BO_SETTINGS.fullScreen ?? false);
        const rollLogMode: RollLogLayoutMode =
            rawRollLogMode === 'floating' ||
            rawRollLogMode === 'full-sidebar' ||
            rawRollLogMode === 'battlefield-nested' ||
            rawRollLogMode === 'rounds-nested'
                ? rawRollLogMode
                : (DEFAULT_BO_SETTINGS.rollLogMode ?? 'floating');
        const showCriticalMarks =
            rawCritMarks !== null ? rawCritMarks === 'true' : (DEFAULT_BO_SETTINGS.showCriticalMarks ?? true);
        const showCombatantChips =
            rawCombatantChips !== null ? rawCombatantChips === 'true' : (DEFAULT_BO_SETTINGS.showCombatantChips ?? true);

        return {
            showBattlefield,
            showRoundTracker,
            windowMode,
            autoSyncActions,
            fullScreen,
            rollLogMode,
            showCriticalMarks,
            showCombatantChips
        };
    } catch (e) {
        console.error('[BattleOrganizerSettings] Failed to load settings from localStorage:', e);
        return { ...DEFAULT_BO_SETTINGS };
    }
}

export function saveBattleOrganizerSettings(partial: Partial<BattleOrganizerSettings>): BattleOrganizerSettings {
    try {
        const current = getBattleOrganizerSettings();
        const next: BattleOrganizerSettings = {
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
        if (next.rollLogMode !== undefined) {
            localStorage.setItem(BO_ROLL_LOG_MODE_KEY, next.rollLogMode);
        }
        if (next.showCriticalMarks !== undefined) {
            localStorage.setItem(BO_SHOW_CRITICAL_MARKS_KEY, String(next.showCriticalMarks));
        }
        if (next.showCombatantChips !== undefined) {
            localStorage.setItem(BO_SHOW_COMBATANT_CHIPS_KEY, String(next.showCombatantChips));
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
            e.key === BO_FULLSCREEN_KEY ||
            e.key === BO_ROLL_LOG_MODE_KEY ||
            e.key === BO_SHOW_CRITICAL_MARKS_KEY
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
