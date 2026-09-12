import { storageAdapter } from './storageAdapter';

export const METADATA_ID = 'pokerole-extension/stats';

let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, unknown> = {};
let pendingTokenId: string | null = null;

let activeTokenId: string | null = null;

export function setActiveTokenId(id: string | null) {
    if (activeTokenId !== id) {
        if (activeTokenId && Object.keys(pendingUpdates).length > 0) {
            const tokenToFlush = pendingTokenId || activeTokenId;
            const updatesToPush = { ...pendingUpdates };
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

export function hasPendingUpdates() {
    return Object.keys(pendingUpdates).length > 0;
}

export async function saveToOwlbear(updates: Record<string, unknown>) {
    const currentToken = activeTokenId;
    if (!currentToken) return;

    // If there were pending updates from a different token, flush them first
    if (pendingTokenId && pendingTokenId !== currentToken && Object.keys(pendingUpdates).length > 0) {
        const oldToken = pendingTokenId;
        const oldUpdates = { ...pendingUpdates };
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
        const updatesToPush = { ...pendingUpdates };
        const tokenToSave = pendingTokenId || currentToken;
        pendingUpdates = {};
        pendingTokenId = null;

        console.log('🚀 PUSHING DATA VIA ADAPTER:', updatesToPush);

        try {
            await storageAdapter.saveCharacter(tokenToSave, updatesToPush, METADATA_ID);
        } catch (error) {
            console.error('[OBR Engine] Failed to securely save data. Queuing for retry...', error);
            Object.assign(pendingUpdates, { ...updatesToPush, ...pendingUpdates });
            pendingTokenId = tokenToSave;
        }
    }, 150);
}

export const ROOM_SETTINGS_META_ID = 'pokerole-pmd-extension/room-settings';

let roomSaveTimeout: ReturnType<typeof setTimeout>;
let pendingRoomUpdates: Record<string, unknown> = {};

export async function saveRoomSettingsToOwlbear(updates: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    try {
        const { default: OBR } = await import('@owlbear-rodeo/sdk');
        if (!OBR.isAvailable) return;

        Object.assign(pendingRoomUpdates, updates);
        clearTimeout(roomSaveTimeout);

        roomSaveTimeout = setTimeout(async () => {
            const updatesToPush = { ...pendingRoomUpdates };
            pendingRoomUpdates = {};

            try {
                const meta = await OBR.room.getMetadata();
                const roomMeta = (meta[ROOM_SETTINGS_META_ID] as Record<string, unknown>) || {};

                for (const [k, v] of Object.entries(updatesToPush)) {
                    if (k === 'ruleset') roomMeta.ruleset = v;
                    else if (k === 'pain') roomMeta.painEnabled = v === 'Enabled';
                    else if (k === 'diceEngine') roomMeta.diceEngine = v;
                    else if (k === 'homebrewAccess') roomMeta.homebrewAccess = v;
                    else if (k === 'gmOnlyLootGen') roomMeta.gmOnlyLootGen = Boolean(v);
                    else if (k === 'gmOnlyMatchups') roomMeta.gmOnlyMatchups = Boolean(v);
                    else if (k === 'gmOnlyDamageOverride') roomMeta.gmOnlyDamageOverride = Boolean(v);
                    else if (k === 'gmDemoMode') roomMeta.gmDemoMode = Boolean(v);
                    else roomMeta[k] = v;
                }

                await OBR.room.setMetadata({ [ROOM_SETTINGS_META_ID]: roomMeta });
            } catch (error) {
                console.error('[OBR Engine] Failed to securely save room settings:', error);
            }
        }, 250);
    } catch (err) {
        console.error('[OBR Engine] Failed to import OBR SDK for room settings save:', err);
    }
}
