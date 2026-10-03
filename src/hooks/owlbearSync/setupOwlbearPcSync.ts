import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';
import { savePcStorage } from '../../utils/pc/pcStorageAdapter';
import { resolveEffectiveActiveTrainer, resolveGmTargetCampaignId } from '../../utils/pc/pcCampaignTrainerOps';
import { EXTENSION_ID } from './owlbearSyncConstants';
import { sendSafeBroadcastPayload, registerSafeBroadcastListener } from './owlbearBroadcastUtils';
import { applyDeleteSummary } from '../../utils/pc/pcStateMutations';
import { hasPendingUpdates } from '../../utils/sync/obr';
import {
    type PlayerPcSyncPayload,
    type GmPcSyncPayload,
    sanitizeSummaryForSync,
    sanitizeTrainerForSync,
    mergeIncomingPlayerSummaries
} from './owlbearPcSyncUtils';
import { reconcileSceneTokens } from './reconcileSceneTokens';

export type { PlayerPcSyncPayload, GmPcSyncPayload };

/**
 * Broadcasts the active player's PC trainer, party, and Pokémon summaries to the GM.
 * Automatically slices large packets into safe 16kB chunks.
 */
export async function broadcastPlayerPc(): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        const state = useCharacterStore.getState();
        const { pcData } = state;
        const campaign = pcData.campaigns[pcData.activeCampaignId];
        if (!campaign || campaign.isPrivate) return;

        const myPlayerId = await OBR.player.getId().catch(() => undefined);
        const resolvedTrainer = resolveEffectiveActiveTrainer(campaign, myPlayerId);
        const isPmd = !resolvedTrainer && campaign.activeTrainerId === '__none__';
        let rawTrainer: TrainerRoster | undefined = resolvedTrainer;

        if (isPmd) {
            const myName = (await OBR.player.getName().catch(() => 'Player')) || 'Player';
            rawTrainer = {
                id: `__pmd_${myName.toLowerCase().replace(/\s+/g, '_')}__`,
                name: `${myName}'s Team`,
                party: campaign.teamParty || [],
                boxes: campaign.boxes || [],
                isLinked: false
            };
        }

        if (!rawTrainer) return;
        const trainer = sanitizeTrainerForSync(rawTrainer);

        // Gather all summaries belonging to this trainer (party + trainer boxes)
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

        const cleanSummaries: PcPokemonSummary[] = [];
        for (const id of referencedIds) {
            const sum = pcData.pokemonSummaries[id];
            if (sum) cleanSummaries.push(sanitizeSummaryForSync(sum));
        }

        const CHUNK_SIZE = 1;
        const totalChunks = Math.max(1, Math.ceil(cleanSummaries.length / CHUNK_SIZE));

        for (let i = 0; i < totalChunks; i++) {
            const chunkSlice = cleanSummaries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const payload: PlayerPcSyncPayload = {
                campaignId: pcData.activeCampaignId,
                campaignName: campaign.name,
                trainer,
                summaries: chunkSlice,
                chunkIndex: i,
                totalChunks
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
 * Slices into safe 16kB chunks for Owlbear broadcast channel.
 */
export async function broadcastGmPc(params: {
    campaignId?: string;
    trainer?: TrainerRoster;
    summaries?: PcPokemonSummary[];
}): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        const state = useCharacterStore.getState();
        if (state.role !== 'GM') return;

        const { pcData, identity } = state;
        let targetCampId = params.campaignId;
        if (!targetCampId) {
            const designatedId = identity.activeRoomCampaignId;
            if (designatedId && pcData.campaigns[designatedId] && !pcData.campaigns[designatedId].isPrivate) {
                targetCampId = designatedId;
            } else {
                targetCampId = pcData.activeCampaignId;
            }
        }
        const campaign = pcData.campaigns[targetCampId];
        if (!campaign) return;

        const cleanTrainer = params.trainer ? sanitizeTrainerForSync(params.trainer) : undefined;
        let cleanSummaries: PcPokemonSummary[] = [];

        if (params.summaries && params.summaries.length > 0) {
            cleanSummaries = params.summaries.map(sanitizeSummaryForSync);
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
                if (sum) cleanSummaries.push(sanitizeSummaryForSync(sum));
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
                trainer: cleanTrainer,
                summaries: chunkSlice,
                chunkIndex: i,
                totalChunks,
                timestamp: syncTimestamp
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

export interface OwlbearPcSyncResult {
    unsubs: Array<() => void>;
}

export function setupOwlbearPcSync(role: 'PLAYER' | 'GM'): OwlbearPcSyncResult {
    const unsubs: Array<() => void> = [];

    // 1. GM listens for player PC updates with automatic chunk reassembly and timestamp guard
    if (role === 'GM') {
        const unsubPlayerSync = registerSafeBroadcastListener<PlayerPcSyncPayload>(
            `${EXTENSION_ID}/pc-player-sync`,
            async (payload) => {
                if (!payload || !payload.trainer || !payload.trainer.id) return;

                try {
                    const state = useCharacterStore.getState();
                    const { pcData, identity } = state;
                    const targetCampId = resolveGmTargetCampaignId(
                        pcData,
                        payload.campaignId,
                        payload.campaignName,
                        identity.activeRoomCampaignId,
                        identity.activeRoomCampaignName
                    );
                    const currentCamp = pcData.campaigns[targetCampId];
                    if (!currentCamp) return;

                    const existingTrainer = currentCamp.trainers[payload.trainer.id];
                    const updatedTrainers = {
                        ...currentCamp.trainers,
                        [payload.trainer.id]: existingTrainer
                            ? { ...existingTrainer, ...payload.trainer }
                            : payload.trainer
                    };

                    const { updatedSummaries, hasChanges } = mergeIncomingPlayerSummaries(
                        pcData.pokemonSummaries || {},
                        payload.summaries || [],
                        targetCampId
                    );

                    if (hasChanges) {
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
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('pkr-local-data-changed'));
                        }

                        // Reconcile scene tokens so any outdated map tokens instantly adopt the newer player PC info!
                        if (OBR.isAvailable) {
                            const sceneItems = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
                            await reconcileSceneTokens(sceneItems, 'GM');
                        }
                    }
                } catch (e) {
                    console.error('[PcSync] Failed to merge remote player PC payload:', e);
                }
            }
        );
        unsubs.push(unsubPlayerSync);
    }

    // 2. Players listen for GM PC updates with automatic chunk reassembly, timestamp guard & live rehydration
    if (role !== 'GM') {
        const unsubGmSync = registerSafeBroadcastListener<GmPcSyncPayload>(
            `${EXTENSION_ID}/pc-gm-sync`,
            async (payload) => {
                if (!payload || !payload.campaignId) return;

                try {
                    const state = useCharacterStore.getState();
                    const { pcData } = state;
                    const targetCampId = pcData.campaigns[payload.campaignId]
                        ? payload.campaignId
                        : pcData.activeCampaignId;
                    let currentCamp = pcData.campaigns[targetCampId];
                    if (!currentCamp) return;

                    let campChanged = false;
                    let updatedTrainers = currentCamp.trainers;

                    if (payload.trainer && payload.trainer.id) {
                        const existingTrainer = currentCamp.trainers[payload.trainer.id];
                        if (existingTrainer) {
                            updatedTrainers = {
                                ...currentCamp.trainers,
                                [payload.trainer.id]: {
                                    ...existingTrainer,
                                    ...payload.trainer,
                                    party: payload.trainer.party || existingTrainer.party,
                                    boxes: payload.trainer.boxes || existingTrainer.boxes
                                }
                            };
                            campChanged = true;
                        } else if (
                            currentCamp.activeTrainerId === '__none__' &&
                            payload.trainer.id.startsWith('__pmd_')
                        ) {
                            currentCamp = {
                                ...currentCamp,
                                teamParty: payload.trainer.party || currentCamp.teamParty,
                                boxes: payload.trainer.boxes || currentCamp.boxes
                            };
                            campChanged = true;
                        }
                    }

                    const updatedSummaries = { ...pcData.pokemonSummaries };
                    let summariesChanged = false;
                    const rehydratableSummaries: PcPokemonSummary[] = [];

                    for (const incoming of payload.summaries || []) {
                        if (!incoming || !incoming.entityId) continue;

                        const existing = pcData.pokemonSummaries[incoming.entityId];
                        const existingMod = Number(existing?.lastModified) || 0;
                        const incomingMod = Number(incoming.lastModified) || Number(payload.timestamp) || Date.now();

                        // Anti-Reversion Guard: if local summary is strictly newer than incoming packet, skip!
                        if (existing && existingMod > incomingMod) {
                            continue;
                        }

                        const mergedSummary: PcPokemonSummary = {
                            ...existing,
                            ...incoming,
                            isOnMap: existing?.isOnMap ?? incoming.isOnMap,
                            mapTokenId: existing?.mapTokenId ?? incoming.mapTokenId,
                            savedTokenItem: existing?.savedTokenItem ?? incoming.savedTokenItem,
                            lastModified: incomingMod
                        };

                        updatedSummaries[incoming.entityId] = mergedSummary;
                        summariesChanged = true;

                        const currentTokenId = state.tokenId;
                        const currentEntityId = state.identity.entityId;
                        if (
                            currentTokenId === incoming.entityId ||
                            currentEntityId === incoming.entityId ||
                            (mergedSummary.mapTokenId && currentTokenId === mergedSummary.mapTokenId)
                        ) {
                            rehydratableSummaries.push(mergedSummary);
                        }
                    }

                    if (campChanged || summariesChanged) {
                        const nextData = {
                            ...pcData,
                            campaigns: campChanged
                                ? {
                                      ...pcData.campaigns,
                                      [targetCampId]: {
                                          ...currentCamp,
                                          trainers: updatedTrainers
                                      }
                                  }
                                : pcData.campaigns,
                            pokemonSummaries: updatedSummaries
                        };

                        useCharacterStore.setState({ pcData: nextData });
                        await savePcStorage(nextData);

                        // If player currently viewing this Pokémon, reload sheet safely
                        for (const activeSum of rehydratableSummaries) {
                            if (!hasPendingUpdates() && activeSum.fullMetadata) {
                                useCharacterStore.getState().loadFromOwlbear(activeSum.fullMetadata);
                            }
                        }

                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('pkr-local-data-changed'));
                        }
                    }
                } catch (e) {
                    console.error('[PcSync] Failed to process GM PC sync payload:', e);
                }
            }
        );
        unsubs.push(unsubGmSync);
    }

    // 2. Both GM and Players listen for trainer deletions across the room
    const unsubTrainerDelete = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-trainer-delete`, async (event) => {
        const { campaignId, trainerId } = (event.data || {}) as {
            campaignId?: string;
            trainerId?: string;
        };
        if (!trainerId) return;

        try {
            const state = useCharacterStore.getState();
            const { pcData } = state;
            const targetCampId = campaignId && pcData.campaigns[campaignId] ? campaignId : pcData.activeCampaignId;
            const camp = pcData.campaigns[targetCampId];
            if (!camp || !camp.trainers[trainerId]) return;

            const deletedName = camp.trainers[trainerId]?.name || 'Trainer';
            const nextTrainers = { ...camp.trainers };
            delete nextTrainers[trainerId];

            const remainingKeys = Object.keys(nextTrainers);
            const nextActiveTrainerId =
                camp.activeTrainerId === trainerId ? remainingKeys[0] || '__none__' : camp.activeTrainerId;

            const nextData = {
                ...pcData,
                campaigns: {
                    ...pcData.campaigns,
                    [targetCampId]: {
                        ...camp,
                        activeTrainerId: nextActiveTrainerId,
                        trainers: nextTrainers
                    }
                }
            };

            useCharacterStore.setState({ pcData: nextData });
            await savePcStorage(nextData);
            OBR.notification.show(`Trainer "${deletedName}" was removed from the campaign.`, 'INFO');
        } catch (e) {
            console.error('[PcSync] Failed to purge deleted trainer:', e);
        }
    });
    unsubs.push(unsubTrainerDelete);

    // 3. Both GM and Players listen for Pokémon release / unlinking across the room
    const unsubPokemonDelete = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-pokemon-delete`, async (event) => {
        const { entityId, pokemonName, wasUnlinked } = (event.data || {}) as {
            campaignId?: string;
            entityId?: string;
            pokemonName?: string;
            wasUnlinked?: boolean;
        };
        if (!entityId) return;

        try {
            const state = useCharacterStore.getState();
            const { pcData } = state;
            if (!pcData.pokemonSummaries[entityId]) return;

            const nextData = applyDeleteSummary(pcData, entityId);
            useCharacterStore.setState({ pcData: nextData, selectedPcSlot: null });
            await savePcStorage(nextData);

            if (wasUnlinked) {
                OBR.notification.show(`"${pokemonName || 'Pokémon'}" was unlinked from PC.`, 'INFO');
            } else {
                OBR.notification.show(`"${pokemonName || 'Pokémon'}" was released from PC.`, 'INFO');
            }
        } catch (e) {
            console.error('[PcSync] Failed to process remote pokemon deletion:', e);
        }
    });
    unsubs.push(unsubPokemonDelete);

    // 2. Players listen for GM sync request and respond with their active PC data
    const unsubRequestSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-request-sync`, () => {
        if (role !== 'GM') {
            broadcastPlayerPc();
        }
    });
    unsubs.push(unsubRequestSync);

    return { unsubs };
}
