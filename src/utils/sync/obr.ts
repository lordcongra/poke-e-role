import { storageAdapter } from './storageAdapter';

export const METADATA_ID = 'pokerole-extension/stats';

let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, unknown> = {};
let pendingTokenId: string | null = null;

let activeTokenId: string | null = null;
let isPcSheetActive = false;

export function setIsPcSheetActive(active: boolean) {
    isPcSheetActive = active;
}

export function getIsPcSheetActive() {
    return isPcSheetActive;
}

export const LOCAL_CLIENT_ID =
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

let isRemoteSyncActive = false;
let remoteSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function setIsRemoteSyncActive(active: boolean, timeoutMs = 0) {
    isRemoteSyncActive = active;
    if (remoteSyncTimer) {
        clearTimeout(remoteSyncTimer);
        remoteSyncTimer = null;
    }
    if (active && timeoutMs > 0) {
        remoteSyncTimer = setTimeout(() => {
            isRemoteSyncActive = false;
            remoteSyncTimer = null;
        }, timeoutMs);
    }
}

export function getIsRemoteSyncActive() {
    return isRemoteSyncActive;
}

export function setActiveTokenId(id: string | null) {
    if (activeTokenId !== id) {
        if (activeTokenId && Object.keys(pendingUpdates).length > 0) {
            const tokenToFlush = pendingTokenId || activeTokenId;
            const updatesToPush = { ...pendingUpdates, lastModified: Date.now() };
            clearTimeout(saveTimeout);
            pendingUpdates = {};
            pendingTokenId = null;
            storageAdapter.saveCharacter(tokenToFlush, updatesToPush, METADATA_ID).catch((error) => {
                console.error('[OBR Engine] Failed to flush pending updates before token switch:', error);
            });
        } else {
            clearTimeout(saveTimeout);
            pendingUpdates = {};
            pendingTokenId = null;
        }
    }
    activeTokenId = id;
}

let isSaveInFlight = false;
let lastSaveTimestamp = 0;

export function hasPendingUpdates() {
    return Object.keys(pendingUpdates).length > 0 || isSaveInFlight;
}

export function getLastSaveTimestamp() {
    return lastSaveTimestamp;
}

export async function saveToOwlbear(updates: Record<string, unknown>) {
    const currentToken = activeTokenId;
    if (!currentToken) return;

    // If there were pending updates from a different token, flush them first
    if (pendingTokenId && pendingTokenId !== currentToken && Object.keys(pendingUpdates).length > 0) {
        const oldToken = pendingTokenId;
        const now = Date.now();
        lastSaveTimestamp = now;
        const oldUpdates = { ...pendingUpdates, lastModified: now };
        clearTimeout(saveTimeout);
        pendingUpdates = {};
        pendingTokenId = null;
        storageAdapter.saveCharacter(oldToken, oldUpdates, METADATA_ID).catch((error) => {
            console.error('[OBR Engine] Failed to flush old token updates before saving new token:', error);
        });
    }

    pendingTokenId = currentToken;
    Object.assign(pendingUpdates, updates);
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        const now = Date.now();
        lastSaveTimestamp = now;
        const updatesToPush = { ...pendingUpdates, lastModified: now };
        const tokenToSave = pendingTokenId || currentToken;
        pendingUpdates = {};
        pendingTokenId = null;
        isSaveInFlight = true;
        try {
            await storageAdapter.saveCharacter(tokenToSave, updatesToPush, METADATA_ID);
        } catch (error) {
            console.warn('[OBR Engine] Failed to securely save data via adapter:', error);
            pendingUpdates = {};
            pendingTokenId = null;
        } finally {
            isSaveInFlight = false;
        }
    }, 150);
}

export const ROOM_SETTINGS_META_ID = 'pokerole-pmd-extension/room-settings';

export { applyRoomUpdatesToMeta } from './roomSettingsMeta';
import { applyRoomUpdatesToMeta } from './roomSettingsMeta';

let roomSaveTimeout: ReturnType<typeof setTimeout>;
let pendingRoomUpdates: Record<string, unknown> = {};
let roomSavePromise: Promise<void> = Promise.resolve();

function queueRoomSave(updatesToPush: Record<string, unknown>): Promise<void> {
    if (Object.keys(updatesToPush).length === 0) {
        return roomSavePromise;
    }

    roomSavePromise = roomSavePromise
        .then(async () => {
            const { default: OBR } = await import('@owlbear-rodeo/sdk');
            if (!OBR.isAvailable) return;

            const role = await OBR.player.getRole();
            if (role !== 'GM') return;

            const meta = await OBR.room.getMetadata();
            const roomMeta = (meta[ROOM_SETTINGS_META_ID] as Record<string, unknown>) || {};
            applyRoomUpdatesToMeta(roomMeta, updatesToPush);
            await OBR.room.setMetadata({ [ROOM_SETTINGS_META_ID]: roomMeta });
        })
        .catch((error) => {
            console.error('[OBR Engine] Failed to securely save room settings:', error);
        });

    return roomSavePromise;
}

export async function saveRoomSettingsToOwlbear(updates: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    try {
        const { default: OBR } = await import('@owlbear-rodeo/sdk');
        if (!OBR.isAvailable) return;

        Object.assign(pendingRoomUpdates, updates);
        clearTimeout(roomSaveTimeout);

        roomSaveTimeout = setTimeout(() => {
            const updatesToPush = { ...pendingRoomUpdates };
            pendingRoomUpdates = {};
            queueRoomSave(updatesToPush).catch((error) => {
                console.error('[OBR Engine] Error in scheduled room settings save:', error);
            });
        }, 250);
    } catch (err) {
        console.error('[OBR Engine] Failed to import OBR SDK for room settings save:', err);
    }
}

export async function flushRoomSettingsToOwlbear(updates?: Record<string, unknown>): Promise<void> {
    try {
        const { default: OBR } = await import('@owlbear-rodeo/sdk');
        if (!OBR.isAvailable) return;

        clearTimeout(roomSaveTimeout);
        if (updates) {
            Object.assign(pendingRoomUpdates, updates);
        }
        const updatesToPush = { ...pendingRoomUpdates };
        pendingRoomUpdates = {};

        if (Object.keys(updatesToPush).length === 0) {
            return roomSavePromise;
        }

        return queueRoomSave(updatesToPush);
    } catch (error) {
        console.error('[OBR Engine] Failed to flush room settings:', error);
    }
}

export const SCENE_SETTINGS_META_ID = 'pokerole-pmd-extension/scene-settings';

export async function flushSceneSettingsToOwlbear(updates: {
    sceneDefaultScale?: number | null;
    sceneDefaultOffsetX?: number | null;
    sceneDefaultOffsetY?: number | null;
}) {
    try {
        const { default: OBR } = await import('@owlbear-rodeo/sdk');
        if (!OBR.isAvailable) return;
        const role = await OBR.player.getRole();
        if (role !== 'GM') return;
        const isReady = await OBR.scene.isReady();
        if (!isReady) return;

        const meta = await OBR.scene.getMetadata();
        const sceneMeta = (meta[SCENE_SETTINGS_META_ID] as Record<string, unknown>) || {};
        if (updates.sceneDefaultScale !== undefined) {
            sceneMeta.sceneDefaultScale = updates.sceneDefaultScale === null ? null : Number(updates.sceneDefaultScale);
        }
        if (updates.sceneDefaultOffsetX !== undefined) {
            sceneMeta.sceneDefaultOffsetX =
                updates.sceneDefaultOffsetX === null ? null : Number(updates.sceneDefaultOffsetX);
        }
        if (updates.sceneDefaultOffsetY !== undefined) {
            sceneMeta.sceneDefaultOffsetY =
                updates.sceneDefaultOffsetY === null ? null : Number(updates.sceneDefaultOffsetY);
        }

        await OBR.scene.setMetadata({ [SCENE_SETTINGS_META_ID]: sceneMeta });
    } catch (error) {
        console.error('[OBR Engine] Failed to flush scene settings:', error);
    }
}

export async function clearSceneScaleFromOwlbear() {
    try {
        const { default: OBR } = await import('@owlbear-rodeo/sdk');
        if (!OBR.isAvailable) return;
        const role = await OBR.player.getRole();
        if (role !== 'GM') return;
        const isReady = await OBR.scene.isReady();
        if (!isReady) return;

        await OBR.scene.setMetadata({ [SCENE_SETTINGS_META_ID]: { sceneDefaultScale: null } });
    } catch (error) {
        console.error('[OBR Engine] Failed to clear scene scale:', error);
    }
}

export async function clearSceneOffsetsFromOwlbear() {
    try {
        const { default: OBR } = await import('@owlbear-rodeo/sdk');
        if (!OBR.isAvailable) return;
        const role = await OBR.player.getRole();
        if (role !== 'GM') return;
        const isReady = await OBR.scene.isReady();
        if (!isReady) return;

        const meta = await OBR.scene.getMetadata();
        const sceneMeta = (meta[SCENE_SETTINGS_META_ID] as Record<string, unknown>) || {};
        sceneMeta.sceneDefaultOffsetX = null;
        sceneMeta.sceneDefaultOffsetY = null;
        await OBR.scene.setMetadata({ [SCENE_SETTINGS_META_ID]: sceneMeta });
    } catch (error) {
        console.error('[OBR Engine] Failed to clear scene offsets:', error);
    }
}
