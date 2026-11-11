import OBR from '@owlbear-rodeo/sdk';

const OFFLINE_ROOM_ID = 'offline';
const LEGACY_BATTLE_ORGANIZER_KEY = 'pkr_battle_organizer_data';
const BO_OFFLINE_MIGRATED_KEY = 'pkr_battle_organizer_offline_migrated';

/**
 * Resolves the active Owlbear Rodeo room ID, falling back to 'offline' in standalone mode.
 */
export function getEffectiveRoomId(): string {
    try {
        if (OBR.isAvailable && OBR.room && OBR.room.id) {
            return OBR.room.id;
        }
    } catch (e) {
        console.warn('[RoomScopedStorage] Failed to retrieve OBR room ID.', e);
    }
    return OFFLINE_ROOM_ID;
}

/**
 * Returns the room-scoped localStorage key for Battle Organizer state.
 */
export function getBattleOrganizerStorageKey(roomId?: string): string {
    const id = roomId || getEffectiveRoomId();
    return `pkr_battle_organizer_data_${id}`;
}

/**
 * Returns the room-scoped localStorage key for Roll Log entries.
 */
export function getRollLogStorageKey(roomId?: string): string {
    const id = roomId || getEffectiveRoomId();
    return `pkr_roll_log_${id}`;
}

/**
 * Returns the room-scoped BroadcastChannel name for Roll Log synchronization.
 */
export function getRollLogChannelName(roomId?: string): string {
    const id = roomId || getEffectiveRoomId();
    return `pkr_roll_log_channel_${id}`;
}

/**
 * Returns the room-scoped localStorage key for Battle Organizer open/closed state.
 */
export function getBattleOrganizerOpenKey(roomId?: string): string {
    const id = roomId || getEffectiveRoomId();
    return `pkr_battle_organizer_open_${id}`;
}

/**
 * Reads the raw serialized Battle Organizer state for the active (or specified) room.
 * In standalone ('offline') mode, if the scoped key is missing and migration has not yet run,
 * performs a one-time read/migrate from the legacy 'pkr_battle_organizer_data' key.
 */
export function readBattleOrganizerStateRaw(roomId?: string): string | null {
    if (typeof localStorage === 'undefined') return null;

    const effectiveId = roomId || getEffectiveRoomId();
    const scopedKey = getBattleOrganizerStorageKey(effectiveId);

    try {
        const scopedRaw = localStorage.getItem(scopedKey);
        if (scopedRaw !== null) {
            return scopedRaw;
        }

        if (effectiveId === OFFLINE_ROOM_ID) {
            const alreadyMigrated = localStorage.getItem(BO_OFFLINE_MIGRATED_KEY) === 'true';
            if (!alreadyMigrated) {
                const legacyRaw = localStorage.getItem(LEGACY_BATTLE_ORGANIZER_KEY);
                if (legacyRaw !== null) {
                    localStorage.setItem(scopedKey, legacyRaw);
                    localStorage.setItem(BO_OFFLINE_MIGRATED_KEY, 'true');
                    return legacyRaw;
                }
            }
        }
    } catch (e) {
        console.warn('[RoomScopedStorage] Failed to read Battle Organizer state:', e);
    }

    return null;
}

