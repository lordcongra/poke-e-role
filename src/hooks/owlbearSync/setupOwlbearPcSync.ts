import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { TrainerRoster, PcPokemonSummary, SheetFieldDiff } from '../../types/pcStorageTypes';
import { savePcStorage } from '../../utils/pc/pcStorageAdapter';
import { resolveEffectiveActiveTrainer } from '../../utils/pc/pcCampaignTrainerOps';
import { EXTENSION_ID } from './owlbearSyncConstants';
import { sendSafeBroadcastPayload, registerSafeBroadcastListener } from './owlbearBroadcastUtils';
import { computeSheetFieldDiffs } from '../../utils/pc/pcDiffUtils';

export interface PlayerPcSyncPayload {
    campaignId: string;
    trainer: TrainerRoster;
    summaries: PcPokemonSummary[];
    chunkIndex?: number;
    totalChunks?: number;
}

/**
 * Strips bulky canvas attachments, raw scene items, and massive base64 URIs
 * before transmitting summaries over the Owlbear broadcast channel.
 */
function sanitizeSummaryForSync(s: PcPokemonSummary): PcPokemonSummary {
    const cleanImageUrl =
        s.tokenImageUrl && s.tokenImageUrl.startsWith('data:') && s.tokenImageUrl.length > 2048
            ? undefined
            : s.tokenImageUrl;

    let slimMeta: Record<string, unknown> | undefined = undefined;
    if (s.fullMetadata && typeof s.fullMetadata === 'object') {
        slimMeta = {};
        for (const [k, v] of Object.entries(s.fullMetadata)) {
            if (typeof v === 'string' && v.startsWith('data:') && v.length > 1024) continue;
            if (k === 'savedTokenItem' || k === 'attachedItems') continue;
            slimMeta[k] = v;
        }
    }

    return {
        entityId: s.entityId,
        name: s.name,
        species: s.species,
        rank: s.rank,
        type1: s.type1,
        type2: s.type2,
        hp: s.hp,
        maxHp: s.maxHp,
        will: s.will,
        maxWill: s.maxWill,
        tokenImageUrl: cleanImageUrl,
        shiny: s.shiny,
        heldItem: s.heldItem,
        isOnMap: s.isOnMap,
        mapTokenId: s.mapTokenId,
        trainerId: s.trainerId,
        campaignId: s.campaignId,
        lastModified: s.lastModified,
        fullMetadata: slimMeta
    };
}

function sanitizeTrainerForSync(t: TrainerRoster): TrainerRoster {
    const cleanAvatar =
        t.avatarUrl && t.avatarUrl.startsWith('data:') && t.avatarUrl.length > 2048 ? undefined : t.avatarUrl;
    return {
        id: t.id,
        name: t.name,
        avatarUrl: cleanAvatar,
        party: t.party || [],
        boxes: t.boxes || [],
        isLinked: t.isLinked,
        mapTokenId: t.mapTokenId
    };
}

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
        if (!campaign) return;

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

    const processPayload = async (payload: PlayerPcSyncPayload) => {
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
            let diffFoundForReview: { summary: PcPokemonSummary; diffs: SheetFieldDiff[] } | null = null;

            for (const s of payload.summaries || []) {
                if (s && s.entityId) {
                    const existing = pcData.pokemonSummaries[s.entityId];
                    if (existing) {
                        const diffs = computeSheetFieldDiffs(existing, s);
                        if (diffs.length > 0 && !diffFoundForReview) {
                            diffFoundForReview = { summary: s, diffs };
                            // Preserve GM copy until GM reviews diffs
                            continue;
                        }
                    }
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

            if (diffFoundForReview) {
                state.openReviewModal({
                    entityId: diffFoundForReview.summary.entityId,
                    pokemonName: diffFoundForReview.summary.name || diffFoundForReview.summary.species,
                    playerName: payload.trainer.name,
                    diffs: diffFoundForReview.diffs,
                    incomingSummary: diffFoundForReview.summary
                });
                OBR.notification.show(
                    `Sheet changes detected for ${diffFoundForReview.summary.name || diffFoundForReview.summary.species}!`,
                    'INFO'
                );
            }
        } catch (e) {
            console.error('[PcSync] Failed to merge remote player PC payload:', e);
        }
    };

    // 1. GM listens for player PC updates with automatic chunk reassembly
    if (role === 'GM') {
        const unsubPlayerSync = registerSafeBroadcastListener<PlayerPcSyncPayload>(
            `${EXTENSION_ID}/pc-player-sync`,
            async (payload) => {
                await processPayload(payload);
            }
        );
        unsubs.push(unsubPlayerSync);

        // GM listens for player trainer deletion broadcasts
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

                const nextTrainers = { ...camp.trainers };
                delete nextTrainers[trainerId];

                const nextData = {
                    ...pcData,
                    campaigns: {
                        ...pcData.campaigns,
                        [targetCampId]: {
                            ...camp,
                            trainers: nextTrainers
                        }
                    }
                };

                useCharacterStore.setState({ pcData: nextData });
                await savePcStorage(nextData);
            } catch (e) {
                console.error('[PcSync] Failed to purge deleted trainer on GM end:', e);
            }
        });
        unsubs.push(unsubTrainerDelete);
    }

    // 2. Players listen for GM sync request and respond with their active PC data
    const unsubRequestSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/pc-request-sync`, () => {
        if (role !== 'GM') {
            broadcastPlayerPc();
        }
    });
    unsubs.push(unsubRequestSync);

    return { unsubs };
}
