import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@owlbear-rodeo/sdk', () => ({
    default: {
        isAvailable: false,
        broadcast: { sendMessage: vi.fn().mockResolvedValue(undefined) },
        popover: { open: vi.fn().mockResolvedValue(undefined) }
    }
}));

vi.mock('@/utils/sync/storageAdapter', () => ({
    isStandaloneMode: true
}));

import { broadcastRollLog, clearRollLogCache } from '@/utils/combat/rollLogSync';
import type { RollSyncData } from '@/hooks/owlbearSync/owlbearSyncConstants';

describe('rollLogSync event hygiene (P-07)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('broadcastRollLog emits pkr-roll-log-event and pkr-roll-log-update without dispatching fake storage events', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const rollData: RollSyncData = {
            id: 'roll-1',
            player: 'Red',
            characterName: 'Pikachu',
            label: 'Thunderbolt',
            result: '4 Successes',
            icon: '',
            rollType: 'attack'
        };

        await broadcastRollLog(rollData);

        const eventTypes = dispatchSpy.mock.calls.map(([evt]) => (evt as Event).type);
        expect(eventTypes).toContain('pkr-roll-log-event');
        expect(eventTypes).toContain('pkr-roll-log-update');
        expect(eventTypes).not.toContain('storage');
    });

    it('clearRollLogCache emits pkr-roll-log-update without dispatching fake storage events', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        clearRollLogCache();

        const eventTypes = dispatchSpy.mock.calls.map(([evt]) => (evt as Event).type);
        expect(eventTypes).toContain('pkr-roll-log-update');
        expect(eventTypes).not.toContain('storage');
    });
});

