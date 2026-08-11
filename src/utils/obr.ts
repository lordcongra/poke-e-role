import { storageAdapter } from './storageAdapter';

export const METADATA_ID = 'pokerole-extension/stats';

let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, unknown> = {};

let activeTokenId: string | null = null;

export function setActiveTokenId(id: string | null) {
    activeTokenId = id;
}

export function hasPendingUpdates() {
    return Object.keys(pendingUpdates).length > 0;
}

export async function saveToOwlbear(updates: Record<string, unknown>) {
    const currentToken = activeTokenId;
    if (!currentToken) return;

    Object.assign(pendingUpdates, updates);
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        const updatesToPush = { ...pendingUpdates };
        pendingUpdates = {};

        console.log('🚀 PUSHING DATA VIA ADAPTER:', updatesToPush);

        try {
            await storageAdapter.saveCharacter(currentToken, updatesToPush, METADATA_ID);
        } catch (error) {
            console.error('[OBR Engine] Failed to securely save data. Queuing for retry...', error);
            Object.assign(pendingUpdates, { ...updatesToPush, ...pendingUpdates });
        }
    }, 150);
}