import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { isBattleOrganizerOpen } from '../../components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import { EXTENSION_ID, type RollSyncData, showDicePlusRetirementNotice } from './owlbearSyncConstants';

export interface OwlbearRollSyncResult {
    unsubs: Array<() => void>;
}

export function setupOwlbearRollSync(): OwlbearRollSyncResult {
    const unsubs: Array<() => void> = [];

    // Receive the Roll Sync broadcast from REMOTE players
    const unsubRollLogSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-log-sync`, async (event) => {
        try {
            const rollData = event.data as RollSyncData;
            if (!rollData || !rollData.id) return;

            // GM PRIVACY FILTER
            if (rollData.targetVisibility === 'gm_only') {
                let myRole = useCharacterStore.getState().role;
                let myId = '';
                try {
                    myId = await OBR.player.getId();
                    myRole = (await OBR.player.getRole()) || myRole;
                } catch (roleErr) {
                    console.warn('[SyncEngine] Failed to resolve player role/id during roll sync:', roleErr);
                }

                if (myRole !== 'GM' && rollData.playerId !== myId) {
                    return; // Ignore this broadcast entirely if we aren't allowed to see it!
                }
            }

            // Defensive parsing
            let existing: RollSyncData[] = [];
            try {
                const stored = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                existing = Array.isArray(stored) ? stored : [];
            } catch (error) {
                console.error('[SyncEngine] Failed to parse roll log on sync. Resetting cache.', error);
                existing = [];
            }

            if (!existing.find((r) => r.id === rollData.id)) {
                try {
                    localStorage.setItem('pkr_roll_log', JSON.stringify([rollData, ...existing].slice(0, 50)));
                } catch (error) {
                    console.error('[SyncEngine] Failed to save synced roll to cache.', error);
                }
            }

            // Dispatch local window events so all active UI components (Battle Organizer, RollLogWidget) update immediately
            window.dispatchEvent(new CustomEvent('pkr-roll-log-event', { detail: rollData }));
            window.dispatchEvent(new Event('pkr-roll-log-update'));
            window.dispatchEvent(new Event('storage'));

            // Notify local popover instances
            OBR.broadcast.sendMessage(`${EXTENSION_ID}/roll-log-update`, {}, { destination: 'LOCAL' }).catch(() => {});

            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const channel = new BroadcastChannel('pkr_roll_log_channel');
                    channel.postMessage({ type: 'roll-log-sync', roll: rollData });
                    channel.close();
                } catch (chanErr) {
                    console.warn('[SyncEngine] Failed to broadcast on BroadcastChannel:', chanErr);
                }
            }

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
                    .catch(() => {});
            }
        } catch (e) {
            console.error('[SyncEngine] Recovered from roll sync broadcast handler failure:', e);
        }
    });
    unsubs.push(unsubRollLogSync);

    // Fallback handlers to inform users if legacy Dice+ extension events arrive
    const unsubRollResult = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-result`, async () => {
        showDicePlusRetirementNotice(
            '[ ⚠️ ] Dice+ has been retired and is no longer supported. Please install Custom Action Rolls (CAR): https://custom-action-rolls.narcolepticdracu.com/manifest.json'
        );
    });
    unsubs.push(unsubRollResult);

    const unsubRollError = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-error`, async () => {
        showDicePlusRetirementNotice(
            '[ ⚠️ ] Dice+ has been retired and is no longer supported. Please install Custom Action Rolls (CAR): https://custom-action-rolls.narcolepticdracu.com/manifest.json'
        );
    });
    unsubs.push(unsubRollError);

    return { unsubs };
}
