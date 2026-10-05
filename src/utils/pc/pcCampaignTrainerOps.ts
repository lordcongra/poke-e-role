import type { PcStorageData, CampaignProfile, TrainerRoster } from '../../types/pcStorageTypes';
import { createDefaultBox, createDefaultCampaign } from './pcStorageAdapter';
import { getCachedObrPlayerId } from './pcActiveTrainerOps';

/**
 * Deletes a campaign from PC Storage, ensuring at least one campaign remains.
 */
export function applyDeleteCampaign(
    pcData: PcStorageData,
    campaignId: string
): { success: boolean; nextData: PcStorageData; error?: string } {
    const campaignKeys = Object.keys(pcData.campaigns);
    if (campaignKeys.length <= 1) {
        return {
            success: false,
            nextData: pcData,
            error: 'Cannot delete the only campaign. At least one campaign must exist.'
        };
    }

    if (!pcData.campaigns[campaignId]) {
        return { success: false, nextData: pcData, error: 'Campaign not found.' };
    }

    const nextCampaigns = { ...pcData.campaigns };
    delete nextCampaigns[campaignId];

    const nextActiveCampaignId =
        pcData.activeCampaignId === campaignId ? Object.keys(nextCampaigns)[0] : pcData.activeCampaignId;

    return {
        success: true,
        nextData: {
            ...pcData,
            activeCampaignId: nextActiveCampaignId,
            campaigns: nextCampaigns
        }
    };
}

export interface DeleteTrainerOptions {
    deletePc?: boolean;
    deleteBelt?: boolean;
}

/**
 * Deletes a trainer profile from a campaign.
 * By default, preserves Pokémon on their belt and in their private PC boxes by moving
 * them into the remaining active trainer's PC storage boxes.
 * Optionally allows deleting the belt or PC Pokémon if specified in options.
 */
export function applyDeleteTrainer(
    pcData: PcStorageData,
    campaignId: string,
    trainerId: string,
    options?: DeleteTrainerOptions
): { success: boolean; nextData: PcStorageData; error?: string } {
    const campaign = pcData.campaigns[campaignId];
    if (!campaign) {
        return { success: false, nextData: pcData, error: 'Campaign not found.' };
    }

    const trainerKeys = Object.keys(campaign.trainers);
    if (trainerKeys.length <= 1) {
        return {
            success: false,
            nextData: pcData,
            error: 'Cannot delete the only trainer profile. At least one trainer must remain in this campaign.'
        };
    }

    const trainer = campaign.trainers[trainerId];
    if (!trainer) {
        return { success: false, nextData: pcData, error: 'Trainer not found.' };
    }

    const nextActiveTrainerId =
        campaign.activeTrainerId === trainerId
            ? trainerKeys.find((id) => id !== trainerId) || trainerKeys[0]
            : campaign.activeTrainerId;

    const remainingTrainer = campaign.trainers[nextActiveTrainerId];
    const targetBoxes = (
        remainingTrainer.boxes && remainingTrainer.boxes.length > 0 ? remainingTrainer.boxes : campaign.boxes
    ).map((b) => ({ ...b, slots: [...b.slots] }));

    const partyIds = (trainer.party || []).filter((id): id is string => Boolean(id));
    const pcIds: string[] = [];
    for (const b of trainer.boxes || []) {
        for (const s of b.slots || []) {
            if (s) pcIds.push(s);
        }
    }

    const nextSummaries = { ...pcData.pokemonSummaries };

    // Handle belt Pokémon
    const toPreserveIds: string[] = [];
    if (options?.deleteBelt) {
        for (const id of partyIds) {
            delete nextSummaries[id];
        }
    } else {
        toPreserveIds.push(...partyIds);
    }

    // Handle PC Pokémon
    if (options?.deletePc) {
        for (const id of pcIds) {
            delete nextSummaries[id];
        }
    } else {
        toPreserveIds.push(...pcIds);
    }

    // Preserve and transfer Pokémon into the remaining trainer's PC storage boxes
    for (const entityId of toPreserveIds) {
        let placed = false;
        for (const box of targetBoxes) {
            const emptyIdx = box.slots.findIndex((s) => !s);
            if (emptyIdx !== -1) {
                box.slots[emptyIdx] = entityId;
                placed = true;
                break;
            }
        }
        if (!placed && targetBoxes.length > 0) {
            targetBoxes[targetBoxes.length - 1].slots.push(entityId);
        }

        if (nextSummaries[entityId]) {
            nextSummaries[entityId] = {
                ...nextSummaries[entityId],
                trainerId: nextActiveTrainerId,
                lastModified: Date.now()
            };
        }
    }

    const nextTrainers = { ...campaign.trainers };
    delete nextTrainers[trainerId];

    nextTrainers[nextActiveTrainerId] = {
        ...remainingTrainer,
        boxes: targetBoxes
    };

    return {
        success: true,
        nextData: {
            ...pcData,
            pokemonSummaries: nextSummaries,
            campaigns: {
                ...pcData.campaigns,
                [campaignId]: {
                    ...campaign,
                    activeTrainerId: nextActiveTrainerId,
                    trainers: nextTrainers,
                    boxes: campaign.boxes
                }
            }
        }
    };
}

export function applyAddTrainer(
    pcData: PcStorageData,
    name: string,
    options?: { existingCharacterId?: string; isLinked?: boolean; playerId?: string }
): { nextData: PcStorageData; newId: string } {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    const newId = options?.existingCharacterId || `trainer-${crypto.randomUUID().slice(0, 8)}`;
    if (!camp) return { nextData: pcData, newId };

    const assignedPlayerId = options?.playerId || getCachedObrPlayerId();

    const newTrainer: TrainerRoster = {
        id: newId,
        name,
        isLinked: options?.isLinked ?? Boolean(options?.existingCharacterId),
        mapTokenId: options?.existingCharacterId,
        playerId: assignedPlayerId,
        party: Array(6).fill(null),
        boxes: Array.from({ length: 8 }, (_, i) => createDefaultBox(i)),
        fullMetadata: {
            entityId: options?.existingCharacterId,
            name,
            nickname: name,
            species: name,
            mode: 'Trainer',
            rank: 'Starter',
            'str-base': 1,
            'dex-base': 1,
            'vit-base': 1,
            'ins-base': 1,
            'spe-base': 1,
            'hp-curr': 10,
            'hp-max-display': 10,
            'will-curr': 5,
            'will-max-display': 5
        }
    };

    const nextTrainerOrder = camp.trainerOrder ? [...camp.trainerOrder, newId] : undefined;

    return {
        nextData: {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...camp,
                    activeTrainerId: newId,
                    trainerOrder: nextTrainerOrder,
                    trainers: {
                        ...camp.trainers,
                        [newId]: newTrainer
                    }
                }
            }
        },
        newId
    };
}

export function applyAddCampaign(
    pcData: PcStorageData,
    name: string,
    options?: { isPrivate?: boolean; isRoomActive?: boolean }
): { nextData: PcStorageData; newId: string } {
    const newCampId = `camp-${crypto.randomUUID().slice(0, 8)}`;
    const newCamp = createDefaultCampaign(newCampId, name.trim());
    if (options?.isPrivate) {
        newCamp.isPrivate = true;
    }
    if (options?.isRoomActive && !options.isPrivate) {
        newCamp.isRoomActive = true;
    }

    const nextCampaigns = { ...pcData.campaigns };
    if (newCamp.isRoomActive) {
        for (const [id, c] of Object.entries(nextCampaigns)) {
            if (c.isRoomActive) {
                nextCampaigns[id] = { ...c, isRoomActive: false };
            }
        }
    }
    nextCampaigns[newCampId] = newCamp;

    return {
        nextData: {
            ...pcData,
            activeCampaignId: newCampId,
            campaigns: nextCampaigns
        },
        newId: newCampId
    };
}

export function applyEditCampaign(
    pcData: PcStorageData,
    campaignId: string,
    updates: { name?: string; isPrivate?: boolean; isRoomActive?: boolean }
): { success: boolean; nextData: PcStorageData; error?: string } {
    const campaign = pcData.campaigns[campaignId];
    if (!campaign) {
        return { success: false, nextData: pcData, error: 'Campaign not found.' };
    }

    const nextCampaigns = { ...pcData.campaigns };
    const updatedCampaign: CampaignProfile = {
        ...campaign,
        ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
        ...(updates.isPrivate !== undefined ? { isPrivate: updates.isPrivate } : {})
    };

    if (updatedCampaign.isPrivate) {
        updatedCampaign.isRoomActive = false;
    } else if (updates.isRoomActive !== undefined) {
        updatedCampaign.isRoomActive = updates.isRoomActive;
    }

    if (updatedCampaign.isRoomActive) {
        for (const [id, c] of Object.entries(nextCampaigns)) {
            if (id !== campaignId && c.isRoomActive) {
                nextCampaigns[id] = { ...c, isRoomActive: false };
            }
        }
    }

    nextCampaigns[campaignId] = updatedCampaign;

    return {
        success: true,
        nextData: {
            ...pcData,
            campaigns: nextCampaigns
        }
    };
}

/**
 * Checks if a campaign is designated as the active room campaign.
 * Private campaigns are NEVER room active.
 */
export function isCampaignRoomActive(
    campaign?: CampaignProfile,
    activeRoomCampaignId?: string,
    activeRoomCampaignName?: string
): boolean {
    if (!campaign || campaign.isPrivate) return false;
    if (campaign.isRoomActive) return true;
    if (activeRoomCampaignId && campaign.id === activeRoomCampaignId) return true;
    if (
        activeRoomCampaignName &&
        activeRoomCampaignName.trim() &&
        campaign.name.trim().toLowerCase() === activeRoomCampaignName.trim().toLowerCase()
    ) {
        return true;
    }
    return false;
}

/**
 * Resolves the target campaign for incoming player PC syncs on the GM side.
 * Shields GM private campaigns (encounter prep/boss vaults) from player trainers.
 * Routing priority:
 * 1. Designated Public Active Room Campaign (isRoomActive or matching activeRoomCampaignId/activeRoomCampaignName)
 * 2. Matching Public campaign by payload.campaignId
 * 3. Matching Public campaign by payload.campaignName
 * 4. GM's current active campaign (if public)
 * 5. First available public campaign
 * 6. Fallback to GM activeCampaignId if no public campaigns exist
 */
export function resolveGmTargetCampaignId(
    pcData: PcStorageData,
    payloadCampaignId: string,
    payloadCampaignName?: string,
    activeRoomCampaignId?: string,
    activeRoomCampaignName?: string
): string {
    const campaigns = pcData.campaigns || {};
    const campaignList = Object.values(campaigns);

    // 1. Check for GM's designated Active Room Campaign
    const designated = campaignList.find(
        (c) => !c.isPrivate && isCampaignRoomActive(c, activeRoomCampaignId, activeRoomCampaignName)
    );
    if (designated) return designated.id;

    // 2. Check if payload campaignId matches an existing public campaign
    if (campaigns[payloadCampaignId] && !campaigns[payloadCampaignId].isPrivate) {
        return payloadCampaignId;
    }

    // 3. Check if payload campaignName matches an existing public campaign
    if (payloadCampaignName && payloadCampaignName.trim()) {
        const normPayloadName = payloadCampaignName.trim().toLowerCase();
        const nameMatch = campaignList.find((c) => !c.isPrivate && c.name.trim().toLowerCase() === normPayloadName);
        if (nameMatch) return nameMatch.id;
    }

    // 4. GM current active campaign if public
    const currentActive = campaigns[pcData.activeCampaignId];
    if (currentActive && !currentActive.isPrivate) {
        return pcData.activeCampaignId;
    }

    // 5. First available public campaign
    const firstPublic = campaignList.find((c) => !c.isPrivate);
    if (firstPublic) return firstPublic.id;

    // 6. Absolute fallback
    return pcData.activeCampaignId;
}

/**
 * Renames a trainer profile within the active campaign.
 */
export function applyRenameTrainer(
    pcData: PcStorageData,
    trainerId: string,
    newName: string
): { success: boolean; nextData: PcStorageData; error?: string } {
    const trimmed = newName.trim();
    if (!trimmed) {
        return { success: false, nextData: pcData, error: 'Trainer name cannot be empty.' };
    }
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || !camp.trainers?.[trainerId]) {
        return { success: false, nextData: pcData, error: 'Trainer not found.' };
    }
    const nextTrainer = {
        ...camp.trainers[trainerId],
        name: trimmed
    };
    const nextCampaigns = {
        ...pcData.campaigns,
        [pcData.activeCampaignId]: {
            ...camp,
            trainers: {
                ...camp.trainers,
                [trainerId]: nextTrainer
            }
        }
    };
    return {
        success: true,
        nextData: {
            ...pcData,
            campaigns: nextCampaigns
        }
    };
}

export function applyReorderTrainers(pcData: PcStorageData, campaignId: string, trainerOrder: string[]): PcStorageData {
    const camp = pcData.campaigns[campaignId];
    if (!camp) return pcData;
    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [campaignId]: {
                ...camp,
                trainerOrder
            }
        }
    };
}

export {
    persistTrainerSwitch,
    setCachedObrPlayerId,
    getCachedObrPlayerId,
    resolveEffectiveActiveTrainer,
    filterTrainersForRole
} from './pcActiveTrainerOps';
