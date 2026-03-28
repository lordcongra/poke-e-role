// src/utils/obr.ts
import OBR from "@owlbear-rodeo/sdk";

export const METADATA_ID = "pokerole-extension/stats";

let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, unknown> = {};

export async function saveToOwlbear(updates: Record<string, unknown>) {
    if (!OBR.isAvailable) return;
    
    const selected = await OBR.player.getSelection();
    if (!selected || selected.length === 0) return;

    const tokenId = selected[0];

    // Merge new updates into the pending queue
    Object.assign(pendingUpdates, updates);
    
    // Clear the previous timer
    clearTimeout(saveTimeout);
    
    // Wait 150ms after the user stops clicking to push the batch to OBR
    saveTimeout = setTimeout(async () => {
        const updatesToPush = { ...pendingUpdates };
        pendingUpdates = {};

        await OBR.scene.items.updateItems([tokenId], (items) => {
            for (const item of items) {
                if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
                Object.assign(item.metadata[METADATA_ID] as Record<string, unknown>, updatesToPush);
            }
        });
    }, 150);
}