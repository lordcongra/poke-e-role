import OBR from '@owlbear-rodeo/sdk';

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
    if (!OBR.isAvailable || !currentToken) return;

    Object.assign(pendingUpdates, updates);
    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        const updatesToPush = { ...pendingUpdates };
        pendingUpdates = {};

        // 👇 FOOLPROOF TEST: This prints the exact flat payload right before it hits the database!
        console.log('🚀 PUSHING TO OWLBEAR:', updatesToPush);

        await OBR.scene.items.updateItems([currentToken!], (items) => {
            for (const item of items) {
                if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
                Object.assign(item.metadata[METADATA_ID] as Record<string, unknown>, updatesToPush);
            }
        });
    }, 150);
}
