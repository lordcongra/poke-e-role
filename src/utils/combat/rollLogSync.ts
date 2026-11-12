import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../sync/storageAdapter';
import { removeSettingFromIndexedDB } from '../sync/userPreferences';
import { getRollLogChannelName, getRollLogStorageKey } from '@/utils/sync/roomScopedStorage';
import { isBattleOrganizerOpen } from '../../components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import { applyRollToBattleOrganizerStorage } from '../../components/modals/battleOrganizer/battleOrganizerStorageSync';
import { EXTENSION_ID, type RollSyncData } from '../../hooks/owlbearSync/owlbearSyncConstants';

/**
 * Universal broadcast and persistence engine for all rolls, actions, and info logs across the room.
 * Ensures rolls from Regular Sheets, PC Storage, and Battle Organizer synchronize to all connected players and the GM.
 */
export async function broadcastRollLog(rollLogData: RollSyncData): Promise<void> {
    try {
        // Resolve player credentials immediately if in native Owlbear Rodeo mode
        if (OBR.isAvailable && !isStandaloneMode) {
            if (!rollLogData.playerId) {
                try {
                    rollLogData.playerId = await OBR.player.getId();
                } catch {
                    rollLogData.playerId = '';
                }
            }
            if (!rollLogData.player) {
                try {
                    rollLogData.player = await OBR.player.getName();
                } catch {
                    rollLogData.player = 'Trainer';
                }
            }
        }

        const rollLogKey = getRollLogStorageKey();
        let existingLog: RollSyncData[] = [];
        try {
            const storedLog = JSON.parse(localStorage.getItem(rollLogKey) || '[]');
            existingLog = Array.isArray(storedLog) ? storedLog : [];
        } catch (parseError) {
            console.warn('[RollLogSync] Roll log cache corrupted', parseError);
        }

        if (!existingLog.find((r) => r.id === rollLogData.id)) {
            localStorage.setItem(rollLogKey, JSON.stringify([rollLogData, ...existingLog].slice(0, 50)));
        }

        // Apply roll to Battle Organizer storage if organizer is closed so entries persist even if roll log is cleared
        applyRollToBattleOrganizerStorage(rollLogData);

        // 1. Dispatch local window events so all in-page subscribers immediately update
        window.dispatchEvent(new CustomEvent('pkr-roll-log-event', { detail: rollLogData }));
        window.dispatchEvent(new Event('pkr-roll-log-update'));

        // Broadcast to same-origin BroadcastChannel for instant popover synchronization
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel(getRollLogChannelName());
                channel.postMessage({ type: 'roll-log-sync', roll: rollLogData });
                channel.close();
            } catch (chanErr) {
                console.warn('[RollLogSync] Failed to broadcast on BroadcastChannel:', chanErr);
            }
        }

        // 2. Broadcast to Owlbear Rodeo room if in VTT mode
        if (OBR.isAvailable && !isStandaloneMode) {
            await OBR.broadcast.sendMessage(`${EXTENSION_ID}/roll-log-sync`, rollLogData, {
                destination: 'ALL'
            });
            await OBR.broadcast.sendMessage(`${EXTENSION_ID}/roll-log-update`, {}, { destination: 'LOCAL' });

            if (!isBattleOrganizerOpen()) {
                const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
                await OBR.popover
                    .open({
                        id: 'pkr-roll-log',
                        url: `${baseUrl}/roll-log.html`,
                        height: 380,
                        width: 320,
                        disableClickAway: true,
                        anchorReference: 'POSITION',
                        anchorPosition: { top: 99999, left: 99999 },
                        transformOrigin: { vertical: 'BOTTOM', horizontal: 'RIGHT' }
                    })
                    .catch((e) => console.warn('[RollLogSync] Failed to open roll log popover', e));
            }
        }
    } catch (error) {
        console.error('[RollLogSync] Failed to broadcast roll log:', error);
    }
}

/**
 * Universal purge function for clearing the roll log cache across all windows,
 * iframes, BroadcastChannels, and OBR popovers.
 */
export function clearRollLogCache(): void {
    const rollLogKey = getRollLogStorageKey();
    try {
        localStorage.setItem(rollLogKey, '[]');
        removeSettingFromIndexedDB(rollLogKey).catch(() => {});
    } catch (e) {
        console.warn('[RollLogSync] Failed to clear roll log in localStorage:', e);
    }

    try {
        window.dispatchEvent(new Event('pkr-roll-log-update'));
    } catch (e) {
        console.warn('[RollLogSync] Failed to dispatch local roll log update events:', e);
    }

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel(getRollLogChannelName());
            channel.postMessage({ type: 'roll-log-clear' });
            channel.close();
        } catch (chanErr) {
            console.warn('[RollLogSync] Failed to broadcast clear on BroadcastChannel:', chanErr);
        }
    }

    if (OBR.isAvailable) {
        try {
            OBR.broadcast
                .sendMessage(`${EXTENSION_ID}/roll-log-update`, {})
                .catch((err) => console.warn('[RollLogSync] Failed to send roll-log-update broadcast:', err));
        } catch (obrErr) {
            console.warn('[RollLogSync] Failed to broadcast clear to OBR:', obrErr);
        }
    }
}
