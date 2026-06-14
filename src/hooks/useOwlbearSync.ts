import { useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Image } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type {
    HomebrewPayload,
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus
} from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData } from '../utils/api';
import { buildGraphicsFromMeta, renderTokenGraphics, STATS_META_ID } from '../utils/graphicsManager';
import { saveToOwlbear, setActiveTokenId, hasPendingUpdates } from '../utils/obr';
import { assignInitiative } from '../utils/diceRoller';

const METADATA_ID = STATS_META_ID;
const ROOM_META_ID = 'pokerole-pmd-extension/room-settings';
const EXTENSION_ID = 'pokerole-pmd-extension';

const knownTransforms: Record<string, { x: number; y: number; r: number; metaStr: string }> = {};

interface RollSyncData {
    id: string;
    targetVisibility: string;
    playerId: string;
    player: string;
    label: string;
    result: string;
    icon: string;
}

export function useOwlbearSync() {
    useEffect(() => {
        let unsubs: Array<() => void> = [];
        let isMounted = true;

        // 1. Load Local Homebrew for this specific room immediately
        useCharacterStore.getState().loadHomebrewLocal();

        if (OBR.isAvailable) {
            OBR.onReady(async () => {
                if (!isMounted) return;

                const role = await OBR.player.getRole();

                // 2. Setup Peer-to-Peer Homebrew Handshake
                const unsubHomebrewRequest = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-request`, () => {
                    if (role === 'GM') {
                        const payload = useCharacterStore.getState().getHomebrewPayload();
                        OBR.broadcast.sendMessage(`${EXTENSION_ID}/homebrew-payload`, payload, {
                            destination: 'REMOTE'
                        });
                    }
                });
                unsubs.push(unsubHomebrewRequest);

                const unsubHomebrewPayload = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-payload`, (event) => {
                    if (role !== 'GM') {
                        const payload = event.data as unknown as HomebrewPayload;
                        useCharacterStore.getState().mergeAllHomebrewData(
                            payload.customTypes || [],
                            payload.customAbilities || [],
                            payload.customMoves || [],
                            payload.customPokemon || [],
                            payload.customItems || [],
                            payload.customForms || [],
                            payload.customStatuses || [],
                            true // silent flag
                        );
                        OBR.notification.show('📥 Homebrew data synced from GM!', 'SUCCESS');
                    }
                });
                unsubs.push(unsubHomebrewPayload);

                const unsubHomebrewShare = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-share`, (event) => {
                    const payload = event.data as unknown as HomebrewPayload;
                    useCharacterStore.getState().mergeAllHomebrewData(
                        payload.customTypes || [],
                        payload.customAbilities || [],
                        payload.customMoves || [],
                        payload.customPokemon || [],
                        payload.customItems || [],
                        payload.customForms || [],
                        payload.customStatuses || [],
                        true // silent flag
                    );
                    OBR.notification.show('📥 New Homebrew shared to table!', 'SUCCESS');
                });
                unsubs.push(unsubHomebrewShare);

                // 3. Fire the request if we are a player
                if (role !== 'GM') {
                    OBR.broadcast.sendMessage(`${EXTENSION_ID}/homebrew-request`, {}, { destination: 'REMOTE' });
                }

                const renderAllTokens = async (forceRebuild = false) => {
                    try {
                        const allItems = await OBR.scene.items.getItems(
                            (i) => i.layer === 'CHARACTER' && i.metadata[METADATA_ID] !== undefined
                        );
                        for (const item of allItems) {
                            const meta = item.metadata[METADATA_ID] as Record<string, unknown>;
                            knownTransforms[item.id] = {
                                x: item.scale.x,
                                y: item.scale.y,
                                r: item.rotation,
                                metaStr: JSON.stringify(meta)
                            };
                            const gData = buildGraphicsFromMeta(meta);
                            await renderTokenGraphics(item, gData, role, forceRebuild);
                        }
                    } catch (e) {
                        console.error('Error rendering tokens on load:', e);
                    }
                };

                const isReady = await OBR.scene.isReady();
                if (isReady) {
                    await renderAllTokens();
                    setTimeout(() => renderAllTokens(true), 1500);
                }

                const unsubReady = OBR.scene.onReadyChange(async (ready) => {
                    if (ready) {
                        await renderAllTokens();
                        setTimeout(() => renderAllTokens(true), 1500);
                    }
                });
                unsubs.push(unsubReady);

                const loadTokenAndLearnset = async (targetTokenId: string) => {
                    try {
                        const store = useCharacterStore.getState();
                        setActiveTokenId(targetTokenId);
                        store.setTokenData(targetTokenId, role);

                        const items = await OBR.scene.items.getItems([targetTokenId]);
                        if (items.length > 0) {
                            const tokenItem = items[0];
                            const meta = tokenItem.metadata[METADATA_ID] as Record<string, unknown> | undefined;

                            const imgItem = tokenItem as Image;
                            if (imgItem.image?.url) {
                                store.setIdentity('tokenImageUrl', imgItem.image.url);
                            } else {
                                store.setIdentity('tokenImageUrl', null);
                            }

                            if (meta) {
                                try {
                                    store.loadFromOwlbear(meta);
                                } catch (e) {
                                    console.error(
                                        'CRITICAL: Corrupted token metadata detected. Resetting sheet to protect engine.',
                                        e
                                    );
                                    if (OBR.isAvailable)
                                        OBR.notification.show(
                                            '⚠️ Token data corrupted. Sheet reset to prevent crash.',
                                            'ERROR'
                                        );
                                    store.loadFromOwlbear({});
                                }

                                try {
                                    const isOldToken = meta['v2-migrated'] !== true;
                                    if (isOldToken) {
                                        const currentStore = useCharacterStore.getState();
                                        for (const move of currentStore.moves) {
                                            if (move.name) {
                                                fetchMoveData(move.name)
                                                    .then((data) => {
                                                        if (data)
                                                            useCharacterStore
                                                                .getState()
                                                                .applyMoveData(
                                                                    move.id,
                                                                    data as Record<string, unknown>
                                                                );
                                                    })
                                                    .catch(() => {});
                                            }
                                        }
                                        saveToOwlbear({ 'v2-migrated': true });
                                    }

                                    if (meta['species']) {
                                        fetchPokemonData(String(meta['species']))
                                            .then((data) => {
                                                if (data)
                                                    useCharacterStore
                                                        .getState()
                                                        .refreshSpeciesData(data as Record<string, unknown>);
                                            })
                                            .catch((e) =>
                                                console.warn('Failed to fetch species data on token load:', e)
                                            );
                                    } else {
                                        store.applyLearnset({ Moves: [] });
                                    }
                                } catch (e) {
                                    console.error('Error during post-load fetches:', e);
                                }
                            } else {
                                store.loadFromOwlbear({});
                                store.applyLearnset({ Moves: [] });
                            }
                        }
                    } catch (error) {
                        console.error('FATAL: Engine prevented from crashing during token load.', error);
                    }
                };

                try {
                    const selected = await OBR.player.getSelection();
                    if (selected && selected.length > 0) {
                        await loadTokenAndLearnset(selected[0]);
                    }
                } catch (e) {
                    console.error('Engine recovered from startup selection crash:', e);
                }

                const unsubPlayer = OBR.player.onChange(async (player) => {
                    if (player.selection && player.selection.length > 0) {
                        try {
                            await loadTokenAndLearnset(player.selection[0]);
                        } catch (e) {
                            console.error('Engine recovered from token click crash:', e);
                        }
                    }
                });
                unsubs.push(unsubPlayer);

                const unsubItems = OBR.scene.items.onChange(async (items) => {
                    for (const item of items) {
                        if (item.layer === 'CHARACTER' && item.metadata[METADATA_ID]) {
                            try {
                                const meta = (item.metadata[METADATA_ID] as Record<string, unknown>) || {};
                                const lastTransform = knownTransforms[item.id];

                                const rawX = item.scale.x;
                                const rawY = item.scale.y;
                                const rawR = item.rotation;
                                const metaStr = JSON.stringify(meta);

                                let needsGraphicsUpdate = false;

                                if (!lastTransform) {
                                    knownTransforms[item.id] = { x: rawX, y: rawY, r: rawR, metaStr };
                                    needsGraphicsUpdate = true;
                                } else {
                                    const diffX = Math.abs(lastTransform.x - rawX);
                                    const diffY = Math.abs(lastTransform.y - rawY);
                                    const diffR = Math.abs(lastTransform.r - rawR);

                                    if (
                                        diffX > 0.005 ||
                                        diffY > 0.005 ||
                                        diffR > 0.005 ||
                                        lastTransform.metaStr !== metaStr
                                    ) {
                                        knownTransforms[item.id] = { x: rawX, y: rawY, r: rawR, metaStr };
                                        needsGraphicsUpdate = true;
                                    }
                                }

                                if (needsGraphicsUpdate) {
                                    const gData = buildGraphicsFromMeta(meta);
                                    renderTokenGraphics(item, gData, role);
                                }

                                const storeState = useCharacterStore.getState();
                                if (item.id === storeState.tokenId) {
                                    const lastKnown = lastTransform?.metaStr;

                                    if (lastKnown !== metaStr && !hasPendingUpdates()) {
                                        storeState.loadFromOwlbear(meta);
                                    }

                                    const imgItem = item as Image;
                                    if (imgItem.image?.url && imgItem.image.url !== storeState.identity.tokenImageUrl) {
                                        storeState.setIdentity('tokenImageUrl', imgItem.image.url);
                                    }
                                }
                            } catch (e) {
                                console.error('Engine recovered from background item sync crash:', e);
                            }
                        }
                    }
                });
                unsubs.push(unsubItems);

                try {
                    const roomMeta = await OBR.room.getMetadata();
                    if (roomMeta[ROOM_META_ID]) {
                        const data = roomMeta[ROOM_META_ID] as Record<string, unknown>;
                        const store = useCharacterStore.getState();

                        // --- MIGRATION SCRIPT ---
                        const hasLegacyHomebrew =
                            data.customTypes ||
                            data.customAbilities ||
                            data.customMoves ||
                            data.customPokemon ||
                            data.customItems ||
                            data.customForms ||
                            data.customStatuses;

                        if (hasLegacyHomebrew) {
                            console.log('Migrating legacy homebrew data to local storage...');
                            store.mergeAllHomebrewData(
                                (data.customTypes as CustomType[]) || [],
                                (data.customAbilities as CustomAbility[]) || [],
                                (data.customMoves as CustomMove[]) || [],
                                (data.customPokemon as CustomPokemon[]) || [],
                                (data.customItems as CustomItem[]) || [],
                                (data.customForms as CustomForm[]) || [],
                                (data.customStatuses as CustomStatus[]) || [],
                                true // silent flag
                            );

                            if (role === 'GM') {
                                const cleanedRoomSettings = { ...data };
                                delete cleanedRoomSettings.customTypes;
                                delete cleanedRoomSettings.customAbilities;
                                delete cleanedRoomSettings.customMoves;
                                delete cleanedRoomSettings.customPokemon;
                                delete cleanedRoomSettings.customItems;
                                delete cleanedRoomSettings.customForms;
                                delete cleanedRoomSettings.customStatuses;

                                await OBR.room.setMetadata({ [ROOM_META_ID]: cleanedRoomSettings });
                                OBR.notification.show(
                                    '⚙️ Legacy Homebrew Data successfully migrated to Local Storage!',
                                    'SUCCESS'
                                );
                            }
                        }

                        if (data.ruleset !== undefined) store.setIdentity('ruleset', String(data.ruleset));
                        if (data.painEnabled !== undefined)
                            store.setIdentity('pain', data.painEnabled ? 'Enabled' : 'Disabled');
                        if (data.diceEngine !== undefined)
                            store.setIdentity('diceEngine', String(data.diceEngine) as 'dice-plus' | 'car');
                        if (data.homebrewAccess !== undefined)
                            store.setIdentity('homebrewAccess', String(data.homebrewAccess));
                        if (data.gmOnlyLootGen !== undefined)
                            store.setIdentity('gmOnlyLootGen', Boolean(data.gmOnlyLootGen));
                        if (data.gmOnlyMatchups !== undefined)
                            store.setIdentity('gmOnlyMatchups', Boolean(data.gmOnlyMatchups));
                    }
                } catch (e) {
                    console.error('Engine recovered from room metadata crash:', e);
                }

                const unsubRoom = OBR.room.onMetadataChange((meta) => {
                    try {
                        if (meta[ROOM_META_ID]) {
                            const data = meta[ROOM_META_ID] as Record<string, unknown>;
                            const store = useCharacterStore.getState();

                            if (data.ruleset !== undefined) store.setIdentity('ruleset', String(data.ruleset));
                            if (data.painEnabled !== undefined)
                                store.setIdentity('pain', data.painEnabled ? 'Enabled' : 'Disabled');
                            if (data.diceEngine !== undefined)
                                store.setIdentity('diceEngine', String(data.diceEngine) as 'dice-plus' | 'car');
                            if (data.homebrewAccess !== undefined)
                                store.setIdentity('homebrewAccess', String(data.homebrewAccess));
                            if (data.gmOnlyLootGen !== undefined)
                                store.setIdentity('gmOnlyLootGen', Boolean(data.gmOnlyLootGen));
                            if (data.gmOnlyMatchups !== undefined)
                                store.setIdentity('gmOnlyMatchups', Boolean(data.gmOnlyMatchups));
                        }
                    } catch (e) {
                        console.error('Engine recovered from room metadata sync crash:', e);
                    }
                });
                unsubs.push(unsubRoom);

                // Receive the Roll Sync broadcast from REMOTE players
                const unsubRollLogSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-log-sync`, async (event) => {
                    const rollData = event.data as unknown as RollSyncData;

                    // GM PRIVACY FILTER
                    const myId = await OBR.player.getId();
                    const myRole = await OBR.player.getRole();
                    if (rollData.targetVisibility === 'gm_only' && myRole !== 'GM' && rollData.playerId !== myId) {
                        return; // Ignore this broadcast entirely if we aren't allowed to see it!
                    }

                    // Defensive parsing
                    let existing: RollSyncData[] = [];
                    try {
                        const stored = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                        existing = Array.isArray(stored) ? stored : [];
                    } catch (error) {
                        console.error('Failed to parse roll log on sync. Resetting cache.', error);
                        existing = [];
                    }

                    if (!existing.find((r) => r.id === rollData.id)) {
                        try {
                            localStorage.setItem('pkr_roll_log', JSON.stringify([rollData, ...existing].slice(0, 50)));
                        } catch (error) {
                            console.error('Failed to save synced roll to cache.', error);
                        }
                    }

                    OBR.broadcast.sendMessage(`${EXTENSION_ID}/roll-log-update`, {}, { destination: 'LOCAL' });

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

                            // ⚔️ INITIATIVE INTERCEPT
                            if (rollType === 'init' && targetTokenId && resultObj) {
                                const rollTotal = parseInt(String(resultObj.totalValue)) || 0;
                                const baseInit = parseInt(String(payload)) || 0;
                                await assignInitiative(targetTokenId, rollTotal, baseInit);
                            } else if (rollType === 'status' && targetTokenId && parts.length > 2 && resultObj) {
                                const statusId = parts[2];
                                const successes = parseInt(String(resultObj.totalValue)) || 0;
                                await OBR.scene.items.updateItems([targetTokenId], (items) => {
                                    for (const item of items) {
                                        const meta = (item.metadata[STATS_META_ID] as Record<string, unknown>) || {};
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
                                            console.warn('Failed to parse status list for update:', e);
                                        }
                                    }
                                });
                            } else if (rollType === 'acc_face' && targetTokenId && payload && resultObj) {
                                const store = useCharacterStore.getState();
                                if (store.identity.diceEngine === 'dice-plus') {
                                    OBR.notification.show(
                                        '⚠️ The [Acc Xs Add Dmg] tag requires Custom Action Rolls (CAR) to read individual die faces. Please switch your Dice Engine in the Room Rules menu!',
                                        'WARNING'
                                    );
                                }
                            } else if (
                                (rollType === 'roll' || rollType === 'chance' || rollType === 'damage') &&
                                resultObj
                            ) {
                                const val = parseInt(String(resultObj.totalValue)) || 0;
                                let msg =
                                    val > 0
                                        ? `✅ Result: ${val} Success${val > 1 ? 'es' : ''}!`
                                        : `❌ Result: Failure! (0)`;

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
                                            msg = `✅ Result: ${val} Successes! (Gained ${tempGained} Temp HP 🛡️)`;
                                        } else {
                                            msg = `✅ Result: ${val} Successes! (Current Shield Holds 🛡️)`;
                                        }
                                    }
                                }

                                OBR.notification.show(msg);
                            }
                        }
                    } catch (e) {
                        console.error('Engine recovered from roll result sync crash:', e);
                    }
                });
                unsubs.push(unsubRollResult);

                const unsubRollError = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-error`, async (event) => {
                    const data = event.data as Record<string, unknown>;
                    OBR.notification.show(`Dice+ Error: ${data.error || 'Unknown syntax error.'}`, 'ERROR');
                });
                unsubs.push(unsubRollError);
            });
        }

        return () => {
            isMounted = false;
            unsubs.forEach((unsub) => unsub());
        };
    }, []);
}
