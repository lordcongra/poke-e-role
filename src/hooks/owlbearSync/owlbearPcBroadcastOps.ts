import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';
import { resolveEffectiveActiveTrainer } from '../../utils/pc/pcCampaignTrainerOps';
import { EXTENSION_ID } from './owlbearSyncConstants';
import { sendSafeBroadcastPayload } from './owlbearBroadcastUtils';
import { LOCAL_CLIENT_ID, getIsPcSheetActive, getIsRemoteSyncActive } from '../../utils/sync/obr';
import { hasCharacterSheetChanged, buildSummaryFromStore } from '../../components/modals/pcStorage/pcSheetSyncUtils';
import {
    type PlayerPcSyncPayload,
    type GmPcSyncPayload,
    sanitizeSummaryForSync,
    sanitizeTrainerForSync
} from './owlbearPcSyncUtils';

/**
 * Broadcasts the active player's PC trainer, party, and Pokémon summaries to the GM.
 * Slices into safe 16kB chunks.
 */
export async function broadcastPlayerPc(params?: {
    campaignId?: string;
    trainer?: TrainerRoster;
    summaries?: PcPokemonSummary[];
    senderId?: string;
}): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        const state = useCharacterStore.getState();
        const { pcData, identity } = state;

        let targetCampId = params?.campaignId;
        if (!targetCampId || !pcData.campaigns[targetCampId]) {
            const designatedId = identity.activeRoomCampaignId;
            if (designatedId && pcData.campaigns[designatedId] && !pcData.campaigns[designatedId].isPrivate) {
                targetCampId = designatedId;
            } else if (
                pcData.campaigns[pcData.activeCampaignId] &&
                !pcData.campaigns[pcData.activeCampaignId].isPrivate
            ) {
                targetCampId = pcData.activeCampaignId;
            } else {
                targetCampId =
                    Object.keys(pcData.campaigns || {}).find((k) => !pcData.campaigns[k]?.isPrivate) ||
                    pcData.activeCampaignId;
            }
        }

        const campaign = pcData.campaigns[targetCampId];
        if (!campaign || campaign.isPrivate) return;

        const myPlayerId = await OBR.player.getId().catch(() => undefined);
        let rawTrainer: TrainerRoster | undefined = params?.trainer;
        if (!rawTrainer) {
            rawTrainer = resolveEffectiveActiveTrainer(campaign, myPlayerId);
        }
        const isPmd = !rawTrainer && campaign.activeTrainerId === '__none__';

        if (isPmd && !rawTrainer) {
            const myName = (await OBR.player.getName().catch(() => 'Player')) || 'Player';
            rawTrainer = {
                id: `__pmd_${myName.toLowerCase().replace(/\s+/g, '_')}__`,
                name: `${myName}'s Team`,
                party: campaign.teamParty || [],
                boxes: campaign.boxes || [],
                isLinked: false
            };
        }

        if (!rawTrainer) {
            const myName = (await OBR.player.getName().catch(() => 'Player')) || 'Player';
            rawTrainer = {
                id: `__player_${myPlayerId || 'anon'}__`,
                name: myName,
                party: [],
                boxes: [],
                isLinked: false
            };
        }

        const trainer = sanitizeTrainerForSync(rawTrainer);
        let cleanSummaries: PcPokemonSummary[] = [];

        if (params?.summaries && params.summaries.length > 0) {
            cleanSummaries = params.summaries.map((s) =>
                sanitizeSummaryForSync({
                    ...s,
                    lastModified: s.lastModified || Date.now()
                })
            );
        } else {
            // Gather all summaries belonging to this trainer (party + trainer boxes + campaign boxes)
            const referencedIds = new Set<string>();
            for (const s of rawTrainer.party || []) {
                if (s) referencedIds.add(s);
            }
            if (Array.isArray(rawTrainer.boxes)) {
                for (const b of rawTrainer.boxes) {
                    for (const s of b.slots || []) {
                        if (s) referencedIds.add(s);
                    }
                }
            }
            if (Array.isArray(campaign.boxes)) {
                for (const b of campaign.boxes) {
                    for (const s of b.slots || []) {
                        if (s) referencedIds.add(s);
                    }
                }
            }

            for (const id of referencedIds) {
                const sum = pcData.pokemonSummaries[id];
                if (sum) {
                    cleanSummaries.push(
                        sanitizeSummaryForSync({
                            ...sum,
                            lastModified: sum.lastModified || Date.now()
                        })
                    );
                }
            }
        }

        if (cleanSummaries.length === 0 && !params?.trainer) return;

        const CHUNK_SIZE = 1;
        const totalChunks = Math.max(1, Math.ceil(cleanSummaries.length / CHUNK_SIZE));

        for (let i = 0; i < totalChunks; i++) {
            const chunkSlice = cleanSummaries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const payload: PlayerPcSyncPayload = {
                campaignId: targetCampId,
                campaignName: campaign.name,
                trainer,
                summaries: chunkSlice,
                chunkIndex: i,
                totalChunks,
                senderId: params?.senderId || LOCAL_CLIENT_ID
            };

            await sendSafeBroadcastPayload(`${EXTENSION_ID}/pc-player-sync`, payload).catch((err) => {
                console.warn(`[PcSync] Failed to broadcast PC chunk ${i + 1}/${totalChunks}:`, err);
            });
        }
    } catch (e) {
        console.warn('[PcSync] Failed to broadcast player PC data:', e);
    }
}

/**
 * Broadcasts GM edits to player PC storage (trainer party/boxes or specific Pokémon summaries).
 * Fetches fresh trainer data from the store to prevent transmitting stale React props.
 */
export async function broadcastGmPc(params?: {
    campaignId?: string;
    trainer?: TrainerRoster;
    summaries?: PcPokemonSummary[];
    senderId?: string;
}): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        const state = useCharacterStore.getState();
        const effectiveRole =
            state.role || (OBR.isAvailable ? await OBR.player.getRole().catch(() => undefined) : undefined);
        if (effectiveRole !== 'GM') return;

        const { pcData, identity } = state;
        let targetCampId = params?.campaignId;
        if (!targetCampId || !pcData.campaigns[targetCampId]) {
            const designatedId = identity.activeRoomCampaignId;
            if (designatedId && pcData.campaigns[designatedId] && !pcData.campaigns[designatedId].isPrivate) {
                targetCampId = designatedId;
            } else if (
                pcData.campaigns[pcData.activeCampaignId] &&
                !pcData.campaigns[pcData.activeCampaignId].isPrivate
            ) {
                targetCampId = pcData.activeCampaignId;
            } else {
                targetCampId =
                    Object.keys(pcData.campaigns || {}).find((k) => !pcData.campaigns[k]?.isPrivate) ||
                    pcData.activeCampaignId;
            }
        }
        const campaign = pcData.campaigns[targetCampId];
        if (!campaign) return;

        // Resolve freshest trainer from state to avoid stale props
        let activeTrainer: TrainerRoster | undefined = undefined;
        if (params?.trainer) {
            activeTrainer = campaign.trainers?.[params.trainer.id] || params.trainer;
        } else if (params?.summaries?.[0]?.trainerId && campaign.trainers?.[params.summaries[0].trainerId]) {
            activeTrainer = campaign.trainers[params.summaries[0].trainerId];
        } else if (campaign.activeTrainerId && campaign.activeTrainerId !== '__none__') {
            activeTrainer = campaign.trainers?.[campaign.activeTrainerId];
        }

        const isPmd = campaign.activeTrainerId === '__none__';
        if (!activeTrainer && isPmd) {
            activeTrainer = {
                id: `__pmd_team__`,
                name: 'Expedition Team',
                party: campaign.teamParty || [],
                boxes: campaign.boxes || [],
                isLinked: false
            };
        }

        const cleanTrainer = activeTrainer ? sanitizeTrainerForSync(activeTrainer) : undefined;
        let cleanSummaries: PcPokemonSummary[] = [];

        if (params?.summaries && params.summaries.length > 0) {
            cleanSummaries = params.summaries.map((s) =>
                sanitizeSummaryForSync({ ...s, lastModified: s.lastModified || Date.now() })
            );
        } else if (cleanTrainer) {
            const referencedIds = new Set<string>();
            for (const s of cleanTrainer.party || []) {
                if (s) referencedIds.add(s);
            }
            if (Array.isArray(cleanTrainer.boxes)) {
                for (const b of cleanTrainer.boxes) {
                    for (const s of b.slots || []) {
                        if (s) referencedIds.add(s);
                    }
                }
            }
            for (const id of referencedIds) {
                const sum = pcData.pokemonSummaries[id];
                if (sum) {
                    cleanSummaries.push(
                        sanitizeSummaryForSync({ ...sum, lastModified: sum.lastModified || Date.now() })
                    );
                }
            }
        }

        if (!cleanTrainer && cleanSummaries.length === 0) return;

        const CHUNK_SIZE = 1;
        const totalChunks = Math.max(1, Math.ceil(cleanSummaries.length / CHUNK_SIZE));
        const syncTimestamp = Date.now();

        for (let i = 0; i < totalChunks; i++) {
            const chunkSlice = cleanSummaries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const payload: GmPcSyncPayload = {
                campaignId: targetCampId,
                campaignName: campaign.name,
                trainer: cleanTrainer,
                summaries: chunkSlice,
                chunkIndex: i,
                totalChunks,
                timestamp: syncTimestamp,
                senderId: params?.senderId || LOCAL_CLIENT_ID
            };

            await sendSafeBroadcastPayload(`${EXTENSION_ID}/pc-gm-sync`, payload).catch((err) => {
                console.warn(`[PcSync] Failed to broadcast GM PC chunk ${i + 1}/${totalChunks}:`, err);
            });
        }
    } catch (e) {
        console.warn('[PcSync] Failed to broadcast GM PC data:', e);
    }
}

/**
 * GM action to trigger an on-demand PC sync request to all connected players.
 */
export function requestPlayerPcSync(): void {
    if (!OBR.isAvailable) return;
    try {
        OBR.broadcast
            .sendMessage(`${EXTENSION_ID}/pc-request-sync`, {}, { destination: 'REMOTE' })
            .catch((err) => console.warn('[PcSync] Failed to send PC sync request to players:', err));
        OBR.notification.show('Requested PC sync from connected players...', 'DEFAULT');
    } catch (e) {
        console.warn('[PcSync] Failed to send PC sync request to players:', e);
    }
}

/**
 * Automatically syncs any active sheet edits made outside of the PC modal
 * (such as in App.tsx or CombatantSheetModal) back to the PC summary and broadcasts to peers.
 */
export function setupActiveSheetStoreSync(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useCharacterStore.subscribe((state, prevState) => {
        if (getIsPcSheetActive() || getIsRemoteSyncActive()) return;
        const entityId = state.identity.entityId;
        if (!entityId || !state.pcData?.pokemonSummaries?.[entityId]) return;

        if (hasCharacterSheetChanged(state, prevState)) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const currentStore = useCharacterStore.getState();
                const currSummary = currentStore.pcData?.pokemonSummaries?.[entityId];
                if (!currSummary) return;
                const { updatedSummary } = buildSummaryFromStore(currentStore, currSummary);
                currentStore.updatePokemonSummary(updatedSummary);

                const effectiveRole = (currentStore.role as 'PLAYER' | 'GM') || 'PLAYER';
                if (effectiveRole === 'GM') {
                    broadcastGmPc({ summaries: [updatedSummary], senderId: LOCAL_CLIENT_ID }).catch(() => {});
                } else {
                    broadcastPlayerPc({ summaries: [updatedSummary], senderId: LOCAL_CLIENT_ID }).catch(() => {});
                }
            }, 250);
        }
    });

    return () => {
        if (timer) clearTimeout(timer);
        unsub();
    };
}
