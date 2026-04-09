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
    const loadFromOwlbear = useCharacterStore((state) => state.loadFromOwlbear);
    const setRoomCustomTypes = useCharacterStore((state) => state.setRoomCustomTypes);
    const setTokenData = useCharacterStore((state) => state.setTokenData);

    const refreshSpeciesData = useCharacterStore((state) => state.refreshSpeciesData);
    const applyLearnset = useCharacterStore((state) => state.applyLearnset);

    const setRoomCustomAbilities = useCharacterStore((state) => state.setRoomCustomAbilities);
    const setRoomCustomMoves = useCharacterStore((state) => state.setRoomCustomMoves);
    const setRoomCustomPokemon = useCharacterStore((state) => state.setRoomCustomPokemon);
    const setRoomCustomItems = useCharacterStore((state) => state.setRoomCustomItems);
    const setRoomCustomForms = useCharacterStore((state) => state.setRoomCustomForms); // 🔥 NEW

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
                        setActiveTokenId(targetTokenId);
                        setTokenData(targetTokenId, role);

                        const items = await OBR.scene.items.getItems([targetTokenId]);
                        if (items.length > 0) {
                            const tokenItem = items[0];
                            const meta = tokenItem.metadata[METADATA_ID] as Record<string, unknown> | undefined;

                            const imgItem = tokenItem as Image;
                            if (imgItem.image?.url) {
                                useCharacterStore.getState().setIdentity('tokenImageUrl', imgItem.image.url);
                            } else {
                                useCharacterStore.getState().setIdentity('tokenImageUrl', null);
                            }

                            if (meta) {
                                try {
                                    loadFromOwlbear(meta);
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
                                    loadFromOwlbear({});
                                }

                                try {
                                    const isOldToken = meta['v2-migrated'] !== true;
                                    if (isOldToken) {
                                        const store = useCharacterStore.getState();
                                        for (const move of store.moves) {
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
                                        applyLearnset({ Moves: [] });
                                    }
                                } catch (e) {
                                    console.error('Error during post-load fetches:', e);
                                }
                            } else {
                                loadFromOwlbear({});
                                applyLearnset({ Moves: [] });
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
                        if (data.customTypes) setRoomCustomTypes(data.customTypes as CustomType[]);
                        if (data.customAbilities) setRoomCustomAbilities(data.customAbilities as CustomAbility[]);
                        if (data.customMoves) setRoomCustomMoves(data.customMoves as CustomMove[]);
                        if (data.customPokemon) setRoomCustomPokemon(data.customPokemon as CustomPokemon[]);
                        if (data.customItems) setRoomCustomItems(data.customItems as CustomItem[]);
                        if (data.customForms) setRoomCustomForms(data.customForms as CustomForm[]); // 🔥 NEW

                        syncHomebrewToApi(
                            (data.customPokemon as CustomPokemon[]) || [],
                            (data.customMoves as CustomMove[]) || [],
                            (data.customAbilities as CustomAbility[]) || [],
                            (data.customItems as CustomItem[]) || []
                        );

                        if (data.ruleset !== undefined)
                            useCharacterStore.getState().setIdentity('ruleset', String(data.ruleset));
                        if (data.painEnabled !== undefined)
                            useCharacterStore.getState().setIdentity('pain', data.painEnabled ? 'Enabled' : 'Disabled');
                        if (data.homebrewAccess !== undefined)
                            useCharacterStore.getState().setIdentity('homebrewAccess', String(data.homebrewAccess));
                        if (data.gmOnlyLootGen !== undefined)
                            useCharacterStore.getState().setIdentity('gmOnlyLootGen', Boolean(data.gmOnlyLootGen));
                    }
                } catch (e) {
                    console.error('Engine recovered from room metadata crash:', e);
                }

                const unsubRoom = OBR.room.onMetadataChange((meta) => {
                    try {
                        if (meta[ROOM_META_ID]) {
                            const data = meta[ROOM_META_ID] as Record<string, unknown>;
                            if (data.customTypes) setRoomCustomTypes(data.customTypes as CustomType[]);
                            if (data.customAbilities) setRoomCustomAbilities(data.customAbilities as CustomAbility[]);
                            if (data.customMoves) setRoomCustomMoves(data.customMoves as CustomMove[]);
                            if (data.customPokemon) setRoomCustomPokemon(data.customPokemon as CustomPokemon[]);
                            if (data.customItems) setRoomCustomItems(data.customItems as CustomItem[]);
                            if (data.customForms) setRoomCustomForms(data.customForms as CustomForm[]); // 🔥 NEW

                            syncHomebrewToApi(
                                (data.customPokemon as CustomPokemon[]) || [],
                                (data.customMoves as CustomMove[]) || [],
                                (data.customAbilities as CustomAbility[]) || [],
                                (data.customItems as CustomItem[]) || []
                            );

                            if (data.ruleset !== undefined)
                                useCharacterStore.getState().setIdentity('ruleset', String(data.ruleset));
                            if (data.painEnabled !== undefined)
                                useCharacterStore
                                    .getState()
                                    .setIdentity('pain', data.painEnabled ? 'Enabled' : 'Disabled');
                            if (data.homebrewAccess !== undefined)
                                useCharacterStore.getState().setIdentity('homebrewAccess', String(data.homebrewAccess));
                            if (data.gmOnlyLootGen !== undefined)
                                useCharacterStore.getState().setIdentity('gmOnlyLootGen', Boolean(data.gmOnlyLootGen));
                        }
                    } catch (e) {
                        console.error('Engine recovered from room metadata sync crash:', e);
                    }
                });
                unsubs.push(unsubRoom);

                const unsubRollResult = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-result`, async (event) => {
                    try {
                        const data = event.data as Record<string, unknown>;
                        const myId = await OBR.player.getId();
                        if (data.playerId !== myId) return;

                        if (data.rollId) {
                            const parts = String(data.rollId).split('|');
                            const rollType = parts[0];
                            const targetTokenId = parts.length > 1 ? parts[1] : null;
                            const payload = parts.length > 2 ? parts[2] : null;

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
                            } else if (rollType === 'status' && targetTokenId && payload && resultObj) {
                                const successes = parseInt(String(resultObj.totalValue)) || 0;
                                await OBR.scene.items.updateItems([targetTokenId], (items) => {
                                    for (const item of items) {
                                        const meta = (item.metadata[STATS_META_ID] as Record<string, unknown>) || {};
                                        const statusListStr = String(meta['status-list'] || '[]');
                                        try {
                                            const statuses = JSON.parse(statusListStr);
                                            let changed = false;
                                            for (const s of statuses) {
                                                if (s.id === payload) {
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
                            } else if ((rollType === 'roll' || rollType === 'chance') && resultObj) {
                                const val = parseInt(String(resultObj.totalValue)) || 0;
                                if (val > 0) OBR.notification.show(`✅ Result: ${val} Success${val > 1 ? 'es' : ''}!`);
                                else OBR.notification.show(`❌ Result: Failure! (0)`);
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
    }, [loadFromOwlbear, setRoomCustomTypes, setTokenData, applyLearnset, refreshSpeciesData]);
}
