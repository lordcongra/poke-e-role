import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { savePcStorage } from '../../utils/pc/pcStorageAdapter';
import { resolveGmTargetCampaignId } from '../../utils/pc/pcCampaignTrainerOps';
import { EXTENSION_ID, METADATA_ID } from './owlbearSyncConstants';
import { registerSafeBroadcastListener } from './owlbearBroadcastUtils';
import { applyDeleteSummary, stripEntityFromTrainer } from '../../utils/pc/pcStateMutations';
import {
    type PlayerPcSyncPayload,
    type GmPcSyncPayload,
    sanitizeTrainerForSync,
    mergeIncomingPlayerSummaries
} from './owlbearPcSyncUtils';
import { reconcileSceneTokens } from './reconcileSceneTokens';
import { broadcastPlayerPc, broadcastGmPc, requestPlayerPcSync } from './owlbearPcBroadcastOps';
import type { PcPokemonSummary } from '../../types/pcStorageTypes';

export { broadcastPlayerPc, broadcastGmPc, requestPlayerPcSync };
export type { PlayerPcSyncPayload, GmPcSyncPayload };

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
                if (!payload) return;

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

                    let updatedTrainers = { ...currentCamp.trainers };
                    let trainersChanged = false;

                    if (payload.trainer && payload.trainer.id && !payload.trainer.id.startsWith('__player_')) {
                        const cleanIncoming = sanitizeTrainerForSync(payload.trainer);
                        const existingTrainer = currentCamp.trainers[cleanIncoming.id];
                        updatedTrainers[cleanIncoming.id] = existingTrainer
                            ? { ...existingTrainer, ...cleanIncoming }
                            : cleanIncoming;

                        // Prevent cross-trainer duplication bugs: strip claimed entity IDs from other trainers
                        const incomingIds = new Set<string>();
                        for (const s of cleanIncoming.party) if (s) incomingIds.add(s);
                        for (const b of cleanIncoming.boxes || []) {
                            for (const s of b.slots) if (s) incomingIds.add(s);
                        }
                        for (const otherId of Object.keys(updatedTrainers)) {
                            if (otherId === cleanIncoming.id) continue;
                            for (const entityId of incomingIds) {
                                updatedTrainers[otherId] = stripEntityFromTrainer(updatedTrainers[otherId], entityId);
                            }
                        }
                        trainersChanged = JSON.stringify(currentCamp.trainers) !== JSON.stringify(updatedTrainers);
                    }

                    const { updatedSummaries, hasChanges } = mergeIncomingPlayerSummaries(
                        pcData.pokemonSummaries || {},
                        payload.summaries || [],
                        targetCampId
                    );

                    if (hasChanges || trainersChanged) {
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

                        // Rehydrate active sheet if GM currently has this character open in PcSheetModal!
                        const currentTokenId = state.tokenId;
                        const currentEntityId = state.identity.entityId;
                        for (const incoming of payload.summaries || []) {
                            if (!incoming || !incoming.entityId) continue;
                            const merged = updatedSummaries[incoming.entityId];
                            if (!merged || !merged.fullMetadata) continue;

                            const existingMod = Number(pcData.pokemonSummaries?.[incoming.entityId]?.lastModified) || 0;
                            const incomingMod = Number(incoming.lastModified) || 0;

                            if (
                                currentTokenId === incoming.entityId ||
                                currentEntityId === incoming.entityId ||
                                (merged.mapTokenId && currentTokenId === merged.mapTokenId)
                            ) {
                                if (incomingMod >= existingMod) {
                                    if (typeof window !== 'undefined') {
                                        window.dispatchEvent(
                                            new CustomEvent('pkr-remote-summary-applied', {
                                                detail: { entityId: merged.entityId, summary: merged }
                                            })
                                        );
                                    }
                                    useCharacterStore.getState().loadFromOwlbear(merged.fullMetadata);
                                }
                            }
                        }

                        // Re-broadcast to all other connected players so everyone in the room stays synchronized!
                        if (payload.summaries && payload.summaries.length > 0) {
                            broadcastGmPc({
                                campaignId: targetCampId,
                                trainer: payload.trainer,
                                summaries: payload.summaries
                            }).catch(() => {});
                        }

                        // Reconcile scene tokens so any outdated map tokens instantly adopt the newer player PC info
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

        // GM listens for player connection handshake and responds with campaign PC data
        const unsubPlayerHandshake = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-request-gm-sync`, async () => {
            try {
                const state = useCharacterStore.getState();
                const { pcData, identity } = state;
                const targetCampId =
                    identity.activeRoomCampaignId && pcData.campaigns[identity.activeRoomCampaignId]
                        ? identity.activeRoomCampaignId
                        : pcData.activeCampaignId;
                const camp = pcData.campaigns[targetCampId];
                if (!camp || camp.isPrivate) return;

                if (camp.activeTrainerId === '__none__') {
                    await broadcastGmPc({ campaignId: targetCampId });
                } else {
                    for (const tr of Object.values(camp.trainers || {})) {
                        await broadcastGmPc({ campaignId: targetCampId, trainer: tr });
                    }
                }
            } catch (e) {
                console.warn('[PcSync] Failed to respond to player handshake:', e);
            }
        });
        unsubs.push(unsubPlayerHandshake);

        // GM triggers request from connected players on mount
        setTimeout(() => {
            OBR.broadcast.sendMessage(`${EXTENSION_ID}/pc-request-sync`, {}, { destination: 'REMOTE' }).catch(() => {});
        }, 500);
    }

    // 2. Players listen for GM PC updates with automatic chunk reassembly, timestamp guard & live rehydration
    if (role !== 'GM') {
        const unsubGmSync = registerSafeBroadcastListener<GmPcSyncPayload>(
            `${EXTENSION_ID}/pc-gm-sync`,
            async (payload) => {
                if (!payload || !payload.campaignId) return;

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
                    let currentCamp = pcData.campaigns[targetCampId];
                    if (!currentCamp) return;

                    let campChanged = false;
                    const updatedTrainers = { ...currentCamp.trainers };

                    if (payload.trainer && payload.trainer.id) {
                        const cleanIncoming = sanitizeTrainerForSync(payload.trainer);
                        const existingTrainer = currentCamp.trainers[cleanIncoming.id];

                        if (existingTrainer) {
                            updatedTrainers[cleanIncoming.id] = {
                                ...existingTrainer,
                                ...cleanIncoming,
                                party: cleanIncoming.party,
                                boxes: cleanIncoming.boxes
                            };
                            campChanged = true;
                        } else if (cleanIncoming.id === '__pmd_team__' || cleanIncoming.id.startsWith('__pmd_')) {
                            currentCamp = {
                                ...currentCamp,
                                teamParty: cleanIncoming.party,
                                boxes: cleanIncoming.boxes || currentCamp.boxes
                            };
                            campChanged = true;
                        } else {
                            // New trainer created by GM that the player didn't have yet
                            updatedTrainers[cleanIncoming.id] = cleanIncoming;
                            campChanged = true;
                        }

                        // Prevent cross-trainer duplication bugs: strip claimed entity IDs from other trainers
                        const incomingIds = new Set<string>();
                        for (const s of cleanIncoming.party) if (s) incomingIds.add(s);
                        for (const b of cleanIncoming.boxes || []) {
                            for (const s of b.slots) if (s) incomingIds.add(s);
                        }
                        for (const otherId of Object.keys(updatedTrainers)) {
                            if (otherId === cleanIncoming.id) continue;
                            for (const entityId of incomingIds) {
                                updatedTrainers[otherId] = stripEntityFromTrainer(updatedTrainers[otherId], entityId);
                            }
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

                        // Anti-Reversion Guard: if local summary is strictly newer than incoming packet, skip
                        if (existing && existingMod > incomingMod) {
                            continue;
                        }

                        const mergedSummary: PcPokemonSummary = {
                            ...existing,
                            ...incoming,
                            isOnMap: incoming.isOnMap !== undefined ? incoming.isOnMap : existing?.isOnMap,
                            mapTokenId:
                                incoming.isOnMap === false ? undefined : (incoming.mapTokenId ?? existing?.mapTokenId),
                            savedTokenItem:
                                incoming.isOnMap === false
                                    ? incoming.savedTokenItem || existing?.savedTokenItem
                                    : (existing?.savedTokenItem ?? incoming.savedTokenItem),
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

                        for (const activeSum of rehydratableSummaries) {
                            if (activeSum.fullMetadata) {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(
                                        new CustomEvent('pkr-remote-summary-applied', {
                                            detail: { entityId: activeSum.entityId, summary: activeSum }
                                        })
                                    );
                                }
                                useCharacterStore.getState().loadFromOwlbear(activeSum.fullMetadata);
                            }
                        }

                        // Synchronize live scene tokens on canvas with incoming GM metadata
                        if (OBR.isAvailable) {
                            const updatedMapTokens = (payload.summaries || []).filter(
                                (s) => s.isOnMap && s.mapTokenId && s.fullMetadata
                            );
                            for (const s of updatedMapTokens) {
                                OBR.scene.items
                                    .updateItems([s.mapTokenId!], (items) => {
                                        for (const it of items) {
                                            if (!it.metadata[METADATA_ID]) it.metadata[METADATA_ID] = {};
                                            Object.assign(
                                                it.metadata[METADATA_ID] as Record<string, unknown>,
                                                s.fullMetadata!
                                            );
                                            if (it.metadata['pokerole-pmd-extension/stats']) {
                                                Object.assign(
                                                    it.metadata['pokerole-pmd-extension/stats'] as Record<
                                                        string,
                                                        unknown
                                                    >,
                                                    s.fullMetadata!
                                                );
                                            }
                                        }
                                    })
                                    .catch(() => {});
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

        // Player handshake on mount: request latest PC data from GM and broadcast local player PC
        OBR.broadcast.sendMessage(`${EXTENSION_ID}/pc-request-gm-sync`, {}, { destination: 'REMOTE' }).catch(() => {});
        setTimeout(() => {
            broadcastPlayerPc().catch(() => {});
        }, 300);

        // Player listens for GM sync request and responds with active PC data
        const unsubRequestSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-request-sync`, () => {
            broadcastPlayerPc().catch(() => {});
        });
        unsubs.push(unsubRequestSync);
    }

    // 3. Both GM and Players listen for trainer deletions across the room
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

    // 4. Both GM and Players listen for Pokémon release / unlinking across the room
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

    return { unsubs };
}
