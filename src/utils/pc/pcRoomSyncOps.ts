import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';

/**
 * Automatically synchronizes a non-GM player's active campaign with the GM's
 * designated active room campaign (e.g. "Thursday Hoenn Adventure").
 * If the player already has a campaign with that name, it swaps to it.
 * If not, it creates a new matching campaign for that adventure.
 */
export function handlePlayerRoomCampaignSync(roomCampaignName?: string, roomCampaignId?: string): void {
    if (!roomCampaignName || !roomCampaignName.trim()) return;

    try {
        const store = useCharacterStore.getState();
        const { pcData, switchCampaign, addCampaign } = store;
        if (!pcData || !pcData.campaigns) return;

        const trimmedName = roomCampaignName.trim();
        const normalizedTarget = trimmedName.toLowerCase();

        // Check if player's current active campaign already matches
        const currentActive = pcData.campaigns[pcData.activeCampaignId];
        if (
            currentActive &&
            (currentActive.name.trim().toLowerCase() === normalizedTarget ||
                (roomCampaignId && currentActive.id === roomCampaignId))
        ) {
            return;
        }

        // Search for an existing campaign matching by ID or by name (case-insensitive)
        const existing = Object.values(pcData.campaigns).find(
            (c) => (roomCampaignId && c.id === roomCampaignId) || c.name.trim().toLowerCase() === normalizedTarget
        );

        if (existing) {
            switchCampaign(existing.id);
            if (OBR.isAvailable) {
                OBR.notification.show(`Switched to Room Campaign: ${existing.name}`, 'DEFAULT');
            }
        } else {
            addCampaign(trimmedName, { isPrivate: false });
            if (OBR.isAvailable) {
                OBR.notification.show(`Created & switched to Room Campaign: ${trimmedName}`, 'DEFAULT');
            }
        }
    } catch (e) {
        console.error('[PcRoomSyncOps] Failed to sync player to room campaign:', e);
    }
}
