import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { isBattleOrganizerOpen } from '../../components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import { parseRollLogEntry } from '../../components/modals/battleOrganizer/battleOrganizerRollParser';
import { isStandaloneMode, storageAdapter, LOCAL_STORAGE_PREFIX } from '../../utils/sync/storageAdapter';
import { idbGetCharacter } from '../../utils/sync/standaloneIdb';
import { EXTENSION_ID, type RollSyncData, showDicePlusRetirementNotice } from './owlbearSyncConstants';

export interface OwlbearRollSyncResult {
    unsubs: Array<() => void>;
}

const processedDamageRollIds = new Set<string>();

/**
 * Extracts incoming damage from parsed roll metadata, explicit damage fields, or roll result text.
 */
export function extractIncomingDamage(logData: Record<string, unknown>): number {
    if (typeof logData.damage === 'number' && !isNaN(logData.damage)) {
        return Math.max(0, logData.damage);
    }
    if (typeof logData.damageValue === 'number' && !isNaN(logData.damageValue)) {
        return Math.max(0, logData.damageValue);
    }
    if (typeof logData.incomingDamage === 'number' && !isNaN(logData.incomingDamage)) {
        return Math.max(0, logData.incomingDamage);
    }
    const res = logData.result;
    if (typeof res === 'number' && !isNaN(res)) return Math.max(0, res);
    const str = typeof res === 'string' ? res : String(res || '');
    if (!str.trim()) return 0;

    const totalMatch = str.match(/(\d+)\s+Total\s+Damage/i);
    if (totalMatch) return parseInt(totalMatch[1], 10);

    const dealsMatch = str.match(/(?:Deals|deals)\s+(\d+)\s+(?:Base\s+)?Damage/i);
    if (dealsMatch) return parseInt(dealsMatch[1], 10);

    const dmgMatch = str.match(/(\d+)\s+(?:Damage|Dmg)\b/i);
    if (dmgMatch) return parseInt(dmgMatch[1], 10);

    const arrowMatch = str.match(/->\s*(\d+)/);
    if (arrowMatch) return parseInt(arrowMatch[1], 10);

    const num = Number(str.trim());
    if (!isNaN(num) && num > 0) return num;

    return 0;
}

/**
 * Resolves the target token and applies Temp HP damage barrier absorption,
 * explicitly serializing 'temporary-hit-points' and 'hp-curr' to token metadata
 * and synchronizing the active character sheet in useCharacterStore.
 */
async function processDamageAbsorption(rollData: RollSyncData, myRole: string): Promise<void> {
    try {
        const rawEntry = rollData as unknown as Record<string, unknown>;
        const parsedRoll = parseRollLogEntry(rawEntry);
        const isDamageRoll =
            Boolean(parsedRoll?.isDamageRoll) ||
            rollData.rollType === 'damage' ||
            typeof rawEntry.damage === 'number' ||
            typeof rawEntry.damageValue === 'number' ||
            typeof rawEntry.incomingDamage === 'number';

        if (!isDamageRoll) return;

        const incomingDamage = extractIncomingDamage(rawEntry);
        if (incomingDamage <= 0) return;

        // Resolve target token ID
        let targetTokenId =
            (rawEntry.targetTokenId as string | undefined) ||
            (rawEntry.targetId as string | undefined) ||
            (rawEntry.targetCombatantId as string | undefined);

        if (!targetTokenId && (rawEntry.targetName || rawEntry.target)) {
            const searchName = String(rawEntry.targetName || rawEntry.target)
                .toLowerCase()
                .trim();
            if (OBR.isAvailable && !isStandaloneMode) {
                try {
                    const items = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
                    const match = items.find((item) => {
                        const meta = (item.metadata['pokerole-extension/stats'] ||
                            item.metadata['pokerole-pmd-extension/stats'] ||
                            item.metadata) as Record<string, unknown>;
                        const name = String(meta.name || meta.nickname || item.name || '')
                            .toLowerCase()
                            .trim();
                        return name === searchName;
                    });
                    if (match) {
                        targetTokenId = match.id;
                    }
                } catch (e) {
                    console.warn('[SyncEngine] Failed to resolve targetTokenId by name:', e);
                }
            }
        }

        if (
            !targetTokenId &&
            rawEntry.tokenId &&
            (rawEntry.isDirectDamage || rawEntry.isTarget || rawEntry.applyDamage)
        ) {
            targetTokenId = String(rawEntry.tokenId);
        }

        if (!targetTokenId) return;

        const globalStore = useCharacterStore.getState();
        const isTargetActiveSheet = globalStore.tokenId === targetTokenId;
        const canUpdateToken = myRole === 'GM' || isTargetActiveSheet || isStandaloneMode;

        let appliedNextTempHp: number | null = null;
        let appliedNextHp: number | null = null;

        if (OBR.isAvailable && !isStandaloneMode) {
            try {
                const items = await OBR.scene.items.getItems([targetTokenId]);
                const targetItem = items[0];
                if (targetItem) {
                    const rawMeta = (targetItem.metadata['pokerole-extension/stats'] ||
                        targetItem.metadata['pokerole-pmd-extension/stats'] ||
                        targetItem.metadata) as Record<string, unknown>;

                    const tempHp =
                        rawMeta['temporary-hit-points'] !== undefined && !isNaN(Number(rawMeta['temporary-hit-points']))
                            ? Number(rawMeta['temporary-hit-points'])
                            : 0;

                    const baseHp =
                        rawMeta['hp-curr'] !== undefined && !isNaN(Number(rawMeta['hp-curr']))
                            ? Number(rawMeta['hp-curr'])
                            : 0;

                    const absorbed = Math.min(tempHp, incomingDamage);
                    const remainingDamage = incomingDamage - absorbed;
                    const nextTempHp = tempHp - absorbed;
                    const nextHp = Math.max(0, baseHp - remainingDamage);

                    appliedNextTempHp = nextTempHp;
                    appliedNextHp = nextHp;

                    if (canUpdateToken) {
                        await OBR.scene.items.updateItems([targetTokenId], (sceneItems) => {
                            for (const item of sceneItems) {
                                if (!item.metadata['pokerole-extension/stats']) {
                                    item.metadata['pokerole-extension/stats'] = {};
                                }
                                const sMeta = item.metadata['pokerole-extension/stats'] as Record<string, unknown>;
                                sMeta['temporary-hit-points'] = nextTempHp;
                                sMeta['hp-curr'] = nextHp;

                                if (!item.metadata['pokerole-pmd-extension/stats']) {
                                    item.metadata['pokerole-pmd-extension/stats'] = {};
                                }
                                const pMeta = item.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>;
                                pMeta['temporary-hit-points'] = nextTempHp;
                                pMeta['hp-curr'] = nextHp;
                            }
                        });
                    }
                }
            } catch (obrErr) {
                console.error('[SyncEngine] Failed to apply damage absorption to OBR token:', obrErr);
            }
        } else {
            // Standalone mode persistence
            try {
                let tempHp = 0;
                let baseHp = 0;
                if (globalStore.tokenId === targetTokenId) {
                    tempHp = globalStore.health.temporaryHitPoints ?? 0;
                    baseHp = globalStore.health.hpCurr ?? 0;
                } else {
                    let charMeta: Record<string, unknown> | undefined;
                    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${targetTokenId}`);
                    if (raw) {
                        try {
                            charMeta = JSON.parse(raw) as Record<string, unknown>;
                        } catch {}
                    }
                    if (!charMeta) {
                        const idbChar = await idbGetCharacter(targetTokenId).catch(() => undefined);
                        if (idbChar?.metadata) {
                            charMeta = idbChar.metadata as Record<string, unknown>;
                        }
                    }
                    const finalMeta = charMeta || {};
                    tempHp = Number(finalMeta['temporary-hit-points'] ?? 0);
                    baseHp = Number(finalMeta['hp-curr'] ?? 0);
                }

                const absorbed = Math.min(tempHp, incomingDamage);
                const remainingDamage = incomingDamage - absorbed;
                const nextTempHp = tempHp - absorbed;
                const nextHp = Math.max(0, baseHp - remainingDamage);

                appliedNextTempHp = nextTempHp;
                appliedNextHp = nextHp;

                await storageAdapter.saveCharacter(
                    targetTokenId,
                    {
                        'temporary-hit-points': nextTempHp,
                        'hp-curr': nextHp
                    },
                    'pokerole-extension/stats'
                );
            } catch (storageErr) {
                console.error('[SyncEngine] Failed to apply damage absorption in storageAdapter:', storageErr);
            }
        }

        // In-Memory Store Synchronization for currently open sheet
        if (globalStore.tokenId === targetTokenId) {
            if (appliedNextTempHp !== null && appliedNextHp !== null) {
                globalStore.updateHealth('temporaryHitPoints', appliedNextTempHp);
                globalStore.updateHealth('hpCurr', appliedNextHp);
            } else {
                const currentTemp = globalStore.health.temporaryHitPoints ?? 0;
                const currentHp = globalStore.health.hpCurr ?? 0;
                const absorbed = Math.min(currentTemp, incomingDamage);
                const remainingDamage = incomingDamage - absorbed;
                const nextTempHp = currentTemp - absorbed;
                const nextHp = Math.max(0, currentHp - remainingDamage);

                globalStore.updateHealth('temporaryHitPoints', nextTempHp);
                globalStore.updateHealth('hpCurr', nextHp);
            }
        }
    } catch (dmgErr) {
        console.error('[SyncEngine] Recovered from damage absorption error:', dmgErr);
    }
}

export function setupOwlbearRollSync(): OwlbearRollSyncResult {
    const unsubs: Array<() => void> = [];

    // Receive the Roll Sync broadcast from REMOTE players
    const unsubRollLogSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-log-sync`, async (event) => {
        try {
            const rollData = event.data as RollSyncData;
            if (!rollData || !rollData.id) return;

            let myRole = useCharacterStore.getState().role;
            let myId = '';
            try {
                myId = await OBR.player.getId();
                myRole = (await OBR.player.getRole()) || myRole;
            } catch (roleErr) {
                console.warn('[SyncEngine] Failed to resolve player role/id during roll sync:', roleErr);
            }

            // GM PRIVACY FILTER
            if (rollData.targetVisibility === 'gm_only') {
                if (myRole !== 'GM' && rollData.playerId !== myId) {
                    return; // Ignore this broadcast entirely if we aren't allowed to see it!
                }
            }

            // Apply Temp HP barrier absorption on damage roll events
            if (rollData.id) {
                if (!processedDamageRollIds.has(rollData.id)) {
                    processedDamageRollIds.add(rollData.id);
                    if (processedDamageRollIds.size > 200) {
                        const first = processedDamageRollIds.values().next().value;
                        if (first) processedDamageRollIds.delete(first);
                    }
                    await processDamageAbsorption(rollData, myRole);
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
