import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../sync/storageAdapter';
import { isBattleOrganizerOpen } from '../../components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import { EXTENSION_ID, type RollSyncData } from '../../hooks/owlbearSync/owlbearSyncConstants';

/**
 * Universal broadcast and persistence engine for all rolls, actions, and info logs across the room.
 * Ensures rolls from Regular Sheets, PC Storage, and Battle Organizer synchronize to all connected players and the GM.
 */
export async function broadcastRollLog(rollLogData: RollSyncData): Promise<void> {
    try {
        let existingLog: RollSyncData[] = [];
        try {
            const storedLog = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            existingLog = Array.isArray(storedLog) ? storedLog : [];
        } catch (parseError) {
            console.warn('[RollLogSync] Roll log cache corrupted', parseError);
        }

        if (!existingLog.find((r) => r.id === rollLogData.id)) {
            localStorage.setItem('pkr_roll_log', JSON.stringify([rollLogData, ...existingLog].slice(0, 50)));
        }

        // 1. Dispatch local window events so all in-page subscribers immediately update
        window.dispatchEvent(new CustomEvent('pkr-roll-log-event', { detail: rollLogData }));
        window.dispatchEvent(new Event('pkr-roll-log-update'));
        window.dispatchEvent(new Event('storage'));

        // Broadcast to same-origin BroadcastChannel for instant popover synchronization
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('pkr_roll_log_channel');
                channel.postMessage({ type: 'roll-log-sync', roll: rollLogData });
                channel.close();
            } catch (chanErr) {
                console.warn('[RollLogSync] Failed to broadcast on BroadcastChannel:', chanErr);
            }
        }

        // 2. Broadcast to Owlbear Rodeo room if in VTT mode
        if (OBR.isAvailable && !isStandaloneMode) {
            if (!rollLogData.playerId) {
                try {
                    rollLogData.playerId = await OBR.player.getId();
                } catch {
                    rollLogData.playerId = '';
                }
            }

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
