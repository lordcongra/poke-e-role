import OBR from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';

/**
 * Resolves only when the Owlbear Rodeo SDK is fully initialized.
 * Await this at the start of any saveToOwlbear or initialization function
 * to prevent race conditions during early component rendering.
 */
export const waitForObr = (): Promise<void> => {
    return new Promise((resolve) => {
        if (OBR.isReady) {
            resolve();
        } else {
            OBR.onReady(() => {
                resolve();
            });
        }
    });
};

/**
 * A highly defensive wrapper for updating Owlbear Rodeo token metadata.
 * Ensures the SDK is ready and wraps the network call in a try/catch.
 * * @param filter - Function to determine which items to update.
 * @param updateFn - Function to mutate the targeted items.
 */
export const safeUpdateItems = async (
    filter: (item: Item) => boolean,
    updateFn: (items: Item[]) => void
): Promise<void> => {
    try {
        await waitForObr();
        await OBR.scene.items.updateItems(filter, updateFn);
    } catch (error) {
        console.error('Failed to securely update OBR items:', error);
    }
};

/**
 * A highly defensive wrapper for updating Owlbear Rodeo room metadata.
 * * @param metadata - The flattened room settings object.
 */
export const safeSetRoomMetadata = async (metadata: Record<string, unknown>): Promise<void> => {
    try {
        await waitForObr();
        await OBR.room.setMetadata(metadata);
    } catch (error) {
        console.error('Failed to securely update OBR room metadata:', error);
    }
};
