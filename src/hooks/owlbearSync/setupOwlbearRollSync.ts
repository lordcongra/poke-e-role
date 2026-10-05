import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { assignInitiative } from '../../utils/combat/diceRoller';
import { isBattleOrganizerOpen } from '../../components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import { EXTENSION_ID, METADATA_ID, type RollSyncData } from './owlbearSyncConstants';

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

    const unsubRollResult = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-result`, async (event) => {
        try {
            const data = event.data as Record<string, unknown>;
            const myId = await OBR.player.getId();
            if (data.playerId !== myId) return;

            if (data.rollId) {
                const parts = String(data.rollId).split('|');
                const rollType = parts[0];
                const targetTokenId = parts.length > 1 ? parts[1] : null;
                const payload = parts.length > 3 ? parts.slice(2, -1).join('|') : null;

                const resultObj = data.result as Record<string, unknown> | undefined;

                // [ Initiative Intercept ]
                if (rollType === 'init' && targetTokenId && resultObj) {
                    const rollTotal = parseInt(String(resultObj.totalValue)) || 0;
                    const baseInit = parseInt(String(payload)) || 0;
                    await assignInitiative(targetTokenId, rollTotal, baseInit);
                } else if (rollType === 'status' && targetTokenId && parts.length > 2 && resultObj) {
                    const statusId = parts[2];
                    const successes = parseInt(String(resultObj.totalValue)) || 0;
                    await OBR.scene.items.updateItems([targetTokenId], (items) => {
                        for (const item of items) {
                            const meta = (item.metadata[METADATA_ID] as Record<string, unknown>) || {};
                            const statusListStr = String(meta['status-list'] || '[]');
                            try {
                                const statuses = JSON.parse(statusListStr);
                                let changed = false;
                                for (const s of statuses) {
                                    if (s.id === statusId) {
                                        s.rounds += successes;
                                        changed = true;
                                    }
                                }
                                if (changed) meta['status-list'] = JSON.stringify(statuses);
                            } catch (e) {
                                console.warn('[SyncEngine] Failed to parse status list for update:', e);
                            }
                        }
                    });
                } else if (rollType === 'acc_face' && targetTokenId && payload && resultObj) {
                    const store = useCharacterStore.getState();
                    if (store.identity.diceEngine === 'dice-plus') {
                        OBR.notification.show(
                            '[ ! ] The [Acc Xs Add Dmg] tag requires Custom Action Rolls (CAR) to read individual die faces. Please switch your Dice Engine in the Room Rules menu!',
                            'WARNING'
                        );
                    }
                } else if ((rollType === 'roll' || rollType === 'chance' || rollType === 'damage') && resultObj) {
                    const val = parseInt(String(resultObj.totalValue)) || 0;
                    let msg =
                        val > 0 ? `[ ✓ ] Result: ${val} Success${val > 1 ? 'es' : ''}!` : `[ ✕ ] Result: Failure! (0)`;

                    if (rollType === 'damage' && payload && val > 0) {
                        const [flatStr, ratioStr] = payload.split('_');
                        const flatGained = parseInt(flatStr) || 0;

                        let ratio = 0;
                        if (ratioStr) {
                            if (ratioStr.includes('%')) {
                                ratio = parseFloat(ratioStr.replace('%', '')) / 100;
                            } else if (ratioStr.includes('/')) {
                                const [num, den] = ratioStr.split('/');
                                ratio = parseFloat(num) / parseFloat(den);
                            } else {
                                ratio = parseFloat(ratioStr);
                            }
                        }

                        let tempGained = flatGained;
                        if (!isNaN(ratio) && ratio > 0) {
                            tempGained += Math.floor(val * ratio);
                        }

                        if (tempGained > 0) {
                            const store = useCharacterStore.getState();
                            const currentTempMax = store.health.temporaryHitPointsMax || 0;

                            if (tempGained > currentTempMax) {
                                store.updateHealth('temporaryHitPointsMax', tempGained);
                                store.updateHealth('temporaryHitPoints', tempGained);
                                msg = `[ ✓ ] Result: ${val} Successes! (Gained ${tempGained} Temp HP [ ⛨ ])`;
                            } else {
                                msg = `[ ✓ ] Result: ${val} Successes! (Current Shield Holds [ ⛨ ])`;
                            }
                        }
                    }

                    OBR.notification.show(msg);
                }
            }
        } catch (e) {
            console.error('[SyncEngine] Engine recovered from roll result sync crash:', e);
        }
    });
    unsubs.push(unsubRollResult);

    const unsubRollError = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-error`, async (event) => {
        const data = event.data as Record<string, unknown>;
        OBR.notification.show(`Dice+ Error: ${data.error || 'Unknown syntax error.'}`, 'ERROR');
    });
    unsubs.push(unsubRollError);

    return { unsubs };
}
