import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OBR from '@owlbear-rodeo/sdk';
import {
    getEffectiveRoomId,
    getBattleOrganizerStorageKey,
    getRollLogStorageKey,
    getRollLogChannelName,
    getBattleOrganizerOpenKey,
    readBattleOrganizerStateRaw
} from '@/utils/sync/roomScopedStorage';
import { isPersistentSettingKey } from '@/utils/sync/userPreferences';
import {
    isBattleOrganizerOpen,
    setBattleOrganizerOpen
} from '@/components/modals/battleOrganizer/battleOrganizerSettingsHelper';

function setMockRoomId(id: string): void {
    Object.defineProperty(OBR.room, 'id', {
        value: id,
        writable: true,
        configurable: true
    });
}

describe('roomScopedStorage', () => {
    const originalIsAvailable = OBR.isAvailable;
    const originalRoomId = OBR.room.id;

    beforeEach(() => {
        localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
        OBR.isAvailable = originalIsAvailable;
        setMockRoomId(originalRoomId);
    });

    afterEach(() => {
        OBR.isAvailable = originalIsAvailable;
        setMockRoomId(originalRoomId);
    });

    it('resolves OBR.room.id when available and produces distinct keys per room', () => {
        OBR.isAvailable = true;
        setMockRoomId('room-alpha');

        expect(getEffectiveRoomId()).toBe('room-alpha');
        expect(getBattleOrganizerStorageKey()).toBe('pkr_battle_organizer_data_room-alpha');
        expect(getRollLogStorageKey()).toBe('pkr_roll_log_room-alpha');
        expect(getRollLogChannelName()).toBe('pkr_roll_log_channel_room-alpha');
        expect(getBattleOrganizerOpenKey()).toBe('pkr_battle_organizer_open_room-alpha');

        setMockRoomId('room-beta');

        expect(getEffectiveRoomId()).toBe('room-beta');
        expect(getBattleOrganizerStorageKey()).toBe('pkr_battle_organizer_data_room-beta');
        expect(getRollLogStorageKey()).toBe('pkr_roll_log_room-beta');
        expect(getRollLogChannelName()).toBe('pkr_roll_log_channel_room-beta');
        expect(getBattleOrganizerOpenKey()).toBe('pkr_battle_organizer_open_room-beta');
    });

    it('falls back to offline when OBR is unavailable or room id is missing', () => {
        OBR.isAvailable = false;
        expect(getEffectiveRoomId()).toBe('offline');
        expect(getBattleOrganizerStorageKey()).toBe('pkr_battle_organizer_data_offline');
        expect(getRollLogStorageKey()).toBe('pkr_roll_log_offline');
        expect(getRollLogChannelName()).toBe('pkr_roll_log_channel_offline');
        expect(getBattleOrganizerOpenKey()).toBe('pkr_battle_organizer_open_offline');

        OBR.isAvailable = true;
        setMockRoomId('');
        expect(getEffectiveRoomId()).toBe('offline');
    });

    it('performs one-time offline migration from legacy pkr_battle_organizer_data without leaking into OBR rooms', () => {
        const legacyPayload = JSON.stringify({ rounds: [{ id: 'r1', name: 'Round 1', combatants: [] }] });
        localStorage.setItem('pkr_battle_organizer_data', legacyPayload);

        // Named OBR rooms must NOT inherit legacy standalone data
        OBR.isAvailable = true;
        setMockRoomId('named-room-123');
        expect(readBattleOrganizerStateRaw()).toBeNull();
        expect(localStorage.getItem('pkr_battle_organizer_data_named-room-123')).toBeNull();

        // Standalone offline mode migrates legacy data once
        OBR.isAvailable = false;
        expect(readBattleOrganizerStateRaw()).toBe(legacyPayload);
        expect(localStorage.getItem('pkr_battle_organizer_data_offline')).toBe(legacyPayload);

        // Subsequent reads return the scoped key value even if updated
        const updatedPayload = JSON.stringify({ rounds: [{ id: 'r2', name: 'Round 2', combatants: [] }] });
        localStorage.setItem('pkr_battle_organizer_data_offline', updatedPayload);
        expect(readBattleOrganizerStateRaw()).toBe(updatedPayload);

        // If offline key is later removed, legacy data does not re-migrate (one-time migration)
        localStorage.removeItem('pkr_battle_organizer_data_offline');
        expect(readBattleOrganizerStateRaw()).toBeNull();
    });

    it('excludes Battle Organizer state and open-window presence keys from userPreferences persistence', () => {
        expect(isPersistentSettingKey('pkr_battle_organizer_data')).toBe(false);
        expect(isPersistentSettingKey('pkr_battle_organizer_data_room-alpha')).toBe(false);
        expect(isPersistentSettingKey('pkr_battle_organizer_open')).toBe(false);
        expect(isPersistentSettingKey('pkr_battle_organizer_open_room-alpha')).toBe(false);
        expect(isPersistentSettingKey('pkr_battle_organizer_offline_migrated')).toBe(false);
        expect(isPersistentSettingKey('pkr_bo_show_battlefield')).toBe(true);
    });

    it('manages room-scoped BO open-window presence with heartbeat lease and clean close', () => {
        vi.useFakeTimers();
        try {
            OBR.isAvailable = true;
            setMockRoomId('room-presence-1');

            setBattleOrganizerOpen(true);
            expect(isBattleOrganizerOpen()).toBe(true);
            expect(localStorage.getItem('pkr_battle_organizer_open_room-presence-1')).not.toBeNull();

            // Switching to another room does not report open
            setMockRoomId('room-presence-2');
            // Clear in-memory flag by simulating another window via localStorage check on room-presence-2
            expect(localStorage.getItem('pkr_battle_organizer_open_room-presence-2')).toBeNull();

            // Switch back and close cleanly
            setMockRoomId('room-presence-1');
            setBattleOrganizerOpen(false);
            expect(localStorage.getItem('pkr_battle_organizer_open_room-presence-1')).toBeNull();
            expect(isBattleOrganizerOpen()).toBe(false);

            // Simulate stale timestamp > 12000ms from crashed window
            localStorage.setItem('pkr_battle_organizer_open_room-presence-1', (Date.now() - 13000).toString());
            expect(isBattleOrganizerOpen()).toBe(false);
            expect(localStorage.getItem('pkr_battle_organizer_open_room-presence-1')).toBeNull();

            // Simulate fresh heartbeat timestamp < 12000ms from another window
            localStorage.setItem('pkr_battle_organizer_open_room-presence-1', Date.now().toString());
            expect(isBattleOrganizerOpen()).toBe(true);
        } finally {
            setBattleOrganizerOpen(false);
            vi.useRealTimers();
        }
    });
});
