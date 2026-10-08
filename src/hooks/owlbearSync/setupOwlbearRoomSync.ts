import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type {
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus
} from '../../store/storeTypes';
import { SCENE_SETTINGS_META_ID } from '../../utils/sync/obr';
import { ROOM_META_ID, mapRoomSettings, showDicePlusRetirementNotice } from './owlbearSyncConstants';
import { handlePlayerRoomCampaignSync } from '../../utils/pc/pcRoomSyncOps';

export interface OwlbearRoomSyncResult {
    syncSceneSettings: () => Promise<void>;
    resetSceneSyncState: () => void;
    unsubs: Array<() => void>;
}

export async function setupOwlbearRoomSync(
    role: 'PLAYER' | 'GM',
    onTokensNeedRender: (forceRebuild: boolean | 'badges-only') => Promise<void>
): Promise<OwlbearRoomSyncResult> {
    const unsubs: Array<() => void> = [];

    let lastSyncedRoomScale = useCharacterStore.getState().identity.roomDefaultScale ?? 100;
    let lastSyncedRoomOffsetX = useCharacterStore.getState().identity.roomDefaultOffsetX ?? 0;
    let lastSyncedRoomOffsetY = useCharacterStore.getState().identity.roomDefaultOffsetY ?? 0;
    let lastSyncedGmOnlyTrackers = useCharacterStore.getState().identity.gmOnlyTrackers ?? false;
    let lastSyncedSceneScale = useCharacterStore.getState().identity.sceneDefaultScale;
    let lastSyncedSceneOffsetX = useCharacterStore.getState().identity.sceneDefaultOffsetX;
    let lastSyncedSceneOffsetY = useCharacterStore.getState().identity.sceneDefaultOffsetY;

    try {
        const [roomMetaResult, sceneMetaResult] = await Promise.all([
            OBR.room.getMetadata().catch(() => ({})),
            OBR.scene
                .isReady()
                .then(async (ready) => {
                    if (!ready) return null;
                    return OBR.scene.getMetadata().catch(() => ({}));
                })
                .catch(() => null)
        ]);

        const store = useCharacterStore.getState();

        if (roomMetaResult && ROOM_META_ID in roomMetaResult) {
            const data = { ...(roomMetaResult[ROOM_META_ID] as Record<string, unknown>) };
            let roomSettingsNeedSave = false;

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
                console.log('[SyncEngine] Migrating legacy homebrew data to local storage...');
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
                    delete data.customTypes;
                    delete data.customAbilities;
                    delete data.customMoves;
                    delete data.customPokemon;
                    delete data.customItems;
                    delete data.customForms;
                    delete data.customStatuses;
                    roomSettingsNeedSave = true;

                    OBR.notification.show(
                        '[ ⚙ ] Legacy Homebrew Data successfully migrated to Local Storage!',
                        'SUCCESS'
                    );
                }
            }

            if (data.diceEngine === 'dice-plus') {
                showDicePlusRetirementNotice(
                    '[ ⚠️ ] Dice+ has been retired and removed. The room has been migrated to Custom Action Rolls (CAR): https://custom-action-rolls.narcolepticdracu.com/manifest.json'
                );
                data.diceEngine = 'car';
                if (role === 'GM') {
                    roomSettingsNeedSave = true;
                }
            }

            if (role === 'GM') {
                const defaultPermissions: Record<string, boolean> = {
                    gmOnlyGenerators: true,
                    gmOnlyLootGen: true,
                    gmOnlyDamageOverride: true,
                    gmOnlyAttributeLock: true,
                    gmOnlyMatchups: false,
                    gmOnlyTrackers: false,
                    pmdSkills: false,
                    gmDemoMode: false
                };

                for (const [key, defaultVal] of Object.entries(defaultPermissions)) {
                    if (data[key] === undefined) {
                        data[key] = defaultVal;
                        roomSettingsNeedSave = true;
                    }
                }

                if (roomSettingsNeedSave) {
                    OBR.room
                        .setMetadata({ [ROOM_META_ID]: data })
                        .catch((e) => console.warn('[SyncEngine] Failed to update room metadata on startup:', e));
                }
            }

            const mapped = mapRoomSettings(data);
            store.applyRoomSettings(mapped);
            if (role !== 'GM' && mapped.activeRoomCampaignName) {
                handlePlayerRoomCampaignSync(mapped.activeRoomCampaignName, mapped.activeRoomCampaignId);
            }
            if (mapped.roomDefaultScale !== undefined) {
                lastSyncedRoomScale = mapped.roomDefaultScale;
            }
            if (mapped.gmOnlyTrackers !== undefined) {
                lastSyncedGmOnlyTrackers = mapped.gmOnlyTrackers;
            }
        } else if (role === 'GM') {
            const initialRoomSettings: Record<string, unknown> = {
                ruleset: 'vg-vit-hp',
                painEnabled: true,
                diceEngine: 'car',
                homebrewAccess: 'Full',
                gmOnlyGenerators: true,
                gmOnlyLootGen: true,
                gmOnlyDamageOverride: true,
                gmOnlyAttributeLock: true,
                gmOnlyMatchups: false,
                gmOnlyTrackers: false,
                pmdSkills: false,
                gmDemoMode: false
            };
            OBR.room
                .setMetadata({ [ROOM_META_ID]: initialRoomSettings })
                .catch((e) => console.warn('[SyncEngine] Failed to initialize default room metadata:', e));
            const mapped = mapRoomSettings(initialRoomSettings);
            store.applyRoomSettings(mapped);
        }

        if (sceneMetaResult && SCENE_SETTINGS_META_ID in sceneMetaResult) {
            const sceneData = sceneMetaResult[SCENE_SETTINGS_META_ID] as Record<string, unknown> | undefined;
            if (
                sceneData?.sceneDefaultScale != null &&
                !isNaN(Number(sceneData.sceneDefaultScale)) &&
                Number(sceneData.sceneDefaultScale) > 0
            ) {
                const parsed = Number(sceneData.sceneDefaultScale);
                store.setSceneScale(parsed);
                lastSyncedSceneScale = parsed;
            } else {
                store.setSceneScale(null);
                lastSyncedSceneScale = null;
            }

            const incomingOffsetX =
                sceneData?.sceneDefaultOffsetX != null ? Number(sceneData.sceneDefaultOffsetX) : null;
            const incomingOffsetY =
                sceneData?.sceneDefaultOffsetY != null ? Number(sceneData.sceneDefaultOffsetY) : null;
            store.setSceneOffsets(incomingOffsetX, incomingOffsetY);
            lastSyncedSceneOffsetX = incomingOffsetX;
            lastSyncedSceneOffsetY = incomingOffsetY;
        }
    } catch (e) {
        console.error('[SyncEngine] Engine recovered from room/scene metadata crash:', e);
    }

    const unsubRoom = OBR.room.onMetadataChange((meta) => {
        try {
            if (meta[ROOM_META_ID]) {
                const data = meta[ROOM_META_ID] as Record<string, unknown>;
                if (data.diceEngine === 'dice-plus') {
                    showDicePlusRetirementNotice(
                        '[ ⚠️ ] Dice+ has been retired and removed. Please install Custom Action Rolls (CAR): https://custom-action-rolls.narcolepticdracu.com/manifest.json'
                    );
                    data.diceEngine = 'car';
                    if (role === 'GM') {
                        const cleaned = { ...data, diceEngine: 'car' };
                        OBR.room
                            .setMetadata({ [ROOM_META_ID]: cleaned })
                            .catch((e) =>
                                console.warn('[SyncEngine] Failed to auto-migrate diceEngine in room metadata:', e)
                            );
                    }
                }
                const store = useCharacterStore.getState();
                const mapped = mapRoomSettings(data);
                store.applyRoomSettings(mapped);
                if (role !== 'GM' && mapped.activeRoomCampaignName) {
                    handlePlayerRoomCampaignSync(mapped.activeRoomCampaignName, mapped.activeRoomCampaignId);
                }

                if (data.gmOnlyTrackers !== undefined) {
                    const incomingGmTrackers = Boolean(data.gmOnlyTrackers);
                    if (incomingGmTrackers !== lastSyncedGmOnlyTrackers) {
                        lastSyncedGmOnlyTrackers = incomingGmTrackers;
                        onTokensNeedRender(true).catch((err) =>
                            console.warn('[SyncEngine] Error re-rendering tokens on gmOnlyTrackers change:', err)
                        );
                    }
                }

                let roomOffsetsChanged = false;
                if (data.roomDefaultOffsetX !== undefined) {
                    const incomingX = Number(data.roomDefaultOffsetX);
                    if (incomingX !== lastSyncedRoomOffsetX) {
                        lastSyncedRoomOffsetX = incomingX;
                        roomOffsetsChanged = true;
                    }
                }
                if (data.roomDefaultOffsetY !== undefined) {
                    const incomingY = Number(data.roomDefaultOffsetY);
                    if (incomingY !== lastSyncedRoomOffsetY) {
                        lastSyncedRoomOffsetY = incomingY;
                        roomOffsetsChanged = true;
                    }
                }

                if (data.roomDefaultScale !== undefined) {
                    const incomingScale = Number(data.roomDefaultScale);
                    if (incomingScale !== lastSyncedRoomScale) {
                        lastSyncedRoomScale = incomingScale;
                        const activeSceneScale = useCharacterStore.getState().identity.sceneDefaultScale;
                        if (activeSceneScale === null || activeSceneScale === undefined) {
                            onTokensNeedRender(true).catch((err) =>
                                console.warn('[SyncEngine] Error re-rendering tokens on room scale change:', err)
                            );
                        }
                    }
                }

                if (roomOffsetsChanged) {
                    const activeSceneOffsetX = useCharacterStore.getState().identity.sceneDefaultOffsetX;
                    const activeSceneOffsetY = useCharacterStore.getState().identity.sceneDefaultOffsetY;
                    if (activeSceneOffsetX == null || activeSceneOffsetY == null) {
                        onTokensNeedRender(false).catch((err) =>
                            console.warn('[SyncEngine] Error re-rendering tokens on room offset change:', err)
                        );
                    }
                }
            }
        } catch (e) {
            console.error('[SyncEngine] Engine recovered from room metadata sync crash:', e);
        }
    });
    unsubs.push(unsubRoom);

    const syncSceneSettings = async () => {
        try {
            const sceneIsReady = await OBR.scene.isReady();
            if (!sceneIsReady) return;
            const sceneMeta = await OBR.scene.getMetadata();
            const sceneData = sceneMeta[SCENE_SETTINGS_META_ID] as Record<string, unknown> | undefined;
            const store = useCharacterStore.getState();

            if (
                sceneData?.sceneDefaultScale != null &&
                !isNaN(Number(sceneData.sceneDefaultScale)) &&
                Number(sceneData.sceneDefaultScale) > 0
            ) {
                const parsed = Number(sceneData.sceneDefaultScale);
                store.setSceneScale(parsed);
                lastSyncedSceneScale = parsed;
            } else {
                store.setSceneScale(null);
                lastSyncedSceneScale = null;
            }

            const incomingOffsetX =
                sceneData?.sceneDefaultOffsetX != null ? Number(sceneData.sceneDefaultOffsetX) : null;
            const incomingOffsetY =
                sceneData?.sceneDefaultOffsetY != null ? Number(sceneData.sceneDefaultOffsetY) : null;
            store.setSceneOffsets(incomingOffsetX, incomingOffsetY);
            lastSyncedSceneOffsetX = incomingOffsetX;
            lastSyncedSceneOffsetY = incomingOffsetY;
        } catch (e) {
            console.error('[SyncEngine] Error syncing scene metadata on ready:', e);
        }
    };

    const unsubSceneMeta = OBR.scene.onMetadataChange((meta) => {
        try {
            const sceneData = meta[SCENE_SETTINGS_META_ID] as Record<string, unknown> | undefined;
            const incomingScale =
                sceneData?.sceneDefaultScale != null &&
                !isNaN(Number(sceneData.sceneDefaultScale)) &&
                Number(sceneData.sceneDefaultScale) > 0
                    ? Number(sceneData.sceneDefaultScale)
                    : null;
            const incomingOffsetX =
                sceneData?.sceneDefaultOffsetX != null ? Number(sceneData.sceneDefaultOffsetX) : null;
            const incomingOffsetY =
                sceneData?.sceneDefaultOffsetY != null ? Number(sceneData.sceneDefaultOffsetY) : null;

            let needsUpdate = false;

            if (incomingScale !== lastSyncedSceneScale) {
                lastSyncedSceneScale = incomingScale;
                useCharacterStore.getState().setSceneScale(incomingScale);
                needsUpdate = true;
            }
            if (incomingOffsetX !== lastSyncedSceneOffsetX || incomingOffsetY !== lastSyncedSceneOffsetY) {
                lastSyncedSceneOffsetX = incomingOffsetX;
                lastSyncedSceneOffsetY = incomingOffsetY;
                useCharacterStore.getState().setSceneOffsets(incomingOffsetX, incomingOffsetY);
                needsUpdate = true;
            }

            if (needsUpdate) {
                onTokensNeedRender(false).catch((err) =>
                    console.warn('[SyncEngine] Error re-rendering tokens on scene scale/offset change:', err)
                );
            }
        } catch (e) {
            console.error('[SyncEngine] Error in scene metadata change listener:', e);
        }
    });
    unsubs.push(unsubSceneMeta);

    const resetSceneSyncState = () => {
        useCharacterStore.getState().setSceneScale(null);
        useCharacterStore.getState().setSceneOffsets(null, null);
        lastSyncedSceneScale = null;
        lastSyncedSceneOffsetX = null;
        lastSyncedSceneOffsetY = null;
    };

    return { syncSceneSettings, resetSceneSyncState, unsubs };
}
