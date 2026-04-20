import { useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { Image } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomType, CustomAbility, CustomMove, CustomPokemon, CustomItem, CustomForm } from '../store/storeTypes';
import { fetchPokemonData, fetchMoveData, syncHomebrewToApi } from '../utils/api';
import { buildGraphicsFromMeta, renderTokenGraphics, STATS_META_ID } from '../utils/graphicsManager';
import { saveToOwlbear, setActiveTokenId, hasPendingUpdates } from '../utils/obr';

const METADATA_ID = STATS_META_ID;
const ROOM_META_ID = 'pokerole-pmd-extension/room-settings';
const EXTENSION_ID = 'pokerole-pmd-extension';

const knownTransforms: Record<string, { x: number; y: number; r: number; metaStr: string }> = {};

export function useOwlbearSync() {
    useEffect(() => {
        let unsubs: Array<() => void> = [];
        let isMounted = true;

        if (OBR.isAvailable) {
            OBR.onReady(async () => {
                if (!isMounted) return;

                const role = await OBR.player.getRole();

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

                        if (data.customTypes) store.setRoomCustomTypes(data.customTypes as CustomType[]);
                        if (data.customAbilities) store.setRoomCustomAbilities(data.customAbilities as CustomAbility[]);
                        if (data.customMoves) store.setRoomCustomMoves(data.customMoves as CustomMove[]);
                        if (data.customPokemon) store.setRoomCustomPokemon(data.customPokemon as CustomPokemon[]);
                        if (data.customItems) store.setRoomCustomItems(data.customItems as CustomItem[]);
                        if (data.customForms) store.setRoomCustomForms(data.customForms as CustomForm[]);

                        syncHomebrewToApi(
                            (data.customPokemon as CustomPokemon[]) || [],
                            (data.customMoves as CustomMove[]) || [],
                            (data.customAbilities as CustomAbility[]) || [],
                            (data.customItems as CustomItem[]) || []
                        );

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

                            if (data.customTypes) store.setRoomCustomTypes(data.customTypes as CustomType[]);
                            if (data.customAbilities)
                                store.setRoomCustomAbilities(data.customAbilities as CustomAbility[]);
                            if (data.customMoves) store.setRoomCustomMoves(data.customMoves as CustomMove[]);
                            if (data.customPokemon) store.setRoomCustomPokemon(data.customPokemon as CustomPokemon[]);
                            if (data.customItems) store.setRoomCustomItems(data.customItems as CustomItem[]);
                            if (data.customForms) store.setRoomCustomForms(data.customForms as CustomForm[]);

                            syncHomebrewToApi(
                                (data.customPokemon as CustomPokemon[]) || [],
                                (data.customMoves as CustomMove[]) || [],
                                (data.customAbilities as CustomAbility[]) || [],
                                (data.customItems as CustomItem[]) || []
                            );

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
                    const rollData = event.data as any;

                    // GM PRIVACY FILTER
                    const myId = await OBR.player.getId();
                    const myRole = await OBR.player.getRole();
                    if (rollData.targetVisibility === 'gm_only' && myRole !== 'GM' && rollData.playerId !== myId) {
                        return; // Ignore this broadcast entirely if we aren't allowed to see it!
                    }

                    const existing = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                    if (!existing.find((r: any) => r.id === rollData.id)) {
                        localStorage.setItem('pkr_roll_log', JSON.stringify([rollData, ...existing].slice(0, 50)));
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

                            if (rollType === 'init' && targetTokenId && resultObj) {
                                const total = parseInt(String(resultObj.totalValue)) || 0;
                                const tiebreaker = Math.floor(Math.random() * 6) + 1;
                                const finalInit = total + tiebreaker / 10;

                                await OBR.scene.items.updateItems([targetTokenId], (items) => {
                                    for (const item of items) {
                                        const existing =
                                            (item.metadata['com.pretty-initiative/metadata'] as Record<
                                                string,
                                                unknown
                                            >) || {};
                                        item.metadata['com.pretty-initiative/metadata'] = {
                                            ...existing,
                                            count: finalInit.toString(),
                                            active: existing.active !== undefined ? existing.active : false,
                                            group: existing.group !== undefined ? existing.group : 1
                                        };
                                    }
                                });
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
