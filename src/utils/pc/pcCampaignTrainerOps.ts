import type { PcStorageData } from '../../types/pcStorageTypes';
import { createDefaultBox, createDefaultCampaign } from './pcStorageAdapter';

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

export function applyAddTrainer(pcData: PcStorageData, name: string): { nextData: PcStorageData; newId: string } {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    const newId = `trainer-${crypto.randomUUID().slice(0, 8)}`;
    if (!camp) return { nextData: pcData, newId };

    return {
        nextData: {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...camp,
                    activeTrainerId: newId,
                    trainers: {
                        ...camp.trainers,
                        [newId]: {
                            id: newId,
                            name,
                            party: Array(6).fill(null),
                            boxes: Array.from({ length: 8 }, (_, i) => createDefaultBox(i))
                        }
                    }
                }
            }
        },
        newId
    };
}

export function applyAddCampaign(pcData: PcStorageData, name: string): { nextData: PcStorageData; newId: string } {
    const newCampId = `camp-${crypto.randomUUID().slice(0, 8)}`;
    const newCamp = createDefaultCampaign(newCampId, name);

    return {
        nextData: {
            ...pcData,
            activeCampaignId: newCampId,
            campaigns: {
                ...pcData.campaigns,
                [newCampId]: newCamp
            }
        },
        newId: newCampId
    };
}
