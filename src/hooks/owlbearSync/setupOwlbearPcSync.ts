import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';
import { savePcStorage } from '../../utils/pc/pcStorageAdapter';
import { EXTENSION_ID } from './owlbearSyncConstants';

export interface PlayerPcSyncPayload {
    campaignId: string;
    trainer: TrainerRoster;
    summaries: PcPokemonSummary[];
}

/**
 * Broadcasts the active player's PC trainer, party, and Pokémon summaries to the GM.
 */
export function broadcastPlayerPc(): void {
    if (!OBR.isAvailable) return;
    try {
        const state = useCharacterStore.getState();
        const { pcData } = state;
        const campaign = pcData.campaigns[pcData.activeCampaignId];
        if (!campaign) return;

        const trainer = campaign.trainers[campaign.activeTrainerId];
        if (!trainer) return;

        // Gather all summaries belonging to this trainer (party + trainer boxes)
        const referencedIds = new Set<string>();
        for (const s of trainer.party || []) {
            if (s) referencedIds.add(s);
        }
        if (Array.isArray(trainer.boxes)) {
            for (const b of trainer.boxes) {
                for (const s of b.slots || []) {
                    if (s) referencedIds.add(s);
                }
            }
        }

        const summaries: PcPokemonSummary[] = [];
        for (const id of referencedIds) {
            const sum = pcData.pokemonSummaries[id];
            if (sum) summaries.push(sum);
        }

        const payload: PlayerPcSyncPayload = {
            campaignId: pcData.activeCampaignId,
            trainer,
            summaries
        };

        OBR.broadcast.sendMessage(`${EXTENSION_ID}/pc-player-sync`, payload, {
            destination: 'REMOTE'
        });
    } catch (e) {
        console.warn('[PcSync] Failed to broadcast player PC data:', e);
    }
}

/**
 * GM action to trigger an on-demand PC sync request to all connected players.
 */
export function requestPlayerPcSync(): void {
    if (!OBR.isAvailable) return;
    try {
        OBR.broadcast.sendMessage(`${EXTENSION_ID}/pc-request-sync`, {}, { destination: 'REMOTE' });
        OBR.notification.show('Requested PC sync from connected players...', 'DEFAULT');
    } catch (e) {
        console.warn('[PcSync] Failed to send PC sync request to players:', e);
    }
}

export interface OwlbearPcSyncResult {
    unsubs: Array<() => void>;
}

export function setupOwlbearPcSync(role: 'PLAYER' | 'GM'): OwlbearPcSyncResult {
    const unsubs: Array<() => void> = [];

    // 1. GM listens for player PC updates and merges them
    const unsubPlayerSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-player-sync`, async (event) => {
        if (role !== 'GM') return; // Players must only see their own belt and PC!

        const payload = event.data as PlayerPcSyncPayload;
        if (!payload || !payload.trainer || !payload.trainer.id) return;

        try {
            const state = useCharacterStore.getState();
            const { pcData } = state;
            const targetCampId = pcData.campaigns[payload.campaignId] ? payload.campaignId : pcData.activeCampaignId;
            const currentCamp = pcData.campaigns[targetCampId];
            if (!currentCamp) return;

            const updatedTrainers = {
                ...currentCamp.trainers,
                [payload.trainer.id]: payload.trainer
            };

            const updatedSummaries = { ...pcData.pokemonSummaries };
            for (const s of payload.summaries || []) {
                if (s && s.entityId) {
                    updatedSummaries[s.entityId] = s;
                }
            }

            const nextData = {
                ...pcData,
                campaigns: {
                    ...pcData.campaigns,
                    [targetCampId]: {
                        ...currentCamp,
                        trainers: updatedTrainers
                    }
                },
                pokemonSummaries: updatedSummaries
            };

            useCharacterStore.setState({ pcData: nextData });
            await savePcStorage(nextData);
            OBR.notification.show(`Synced PC for ${payload.trainer.name}!`, 'INFO');
        } catch (e) {
            console.error('[PcSync] Failed to merge remote player PC payload:', e);
        }
    });
    unsubs.push(unsubPlayerSync);

    // 2. Players listen for GM sync request and respond with their active PC data
    const unsubRequestSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-request-sync`, () => {
        if (role !== 'GM') {
            broadcastPlayerPc();
        }
    });
    unsubs.push(unsubRequestSync);

    return { unsubs };
}
