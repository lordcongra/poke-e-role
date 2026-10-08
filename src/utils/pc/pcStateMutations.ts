import type {
    PcStorageData,
    PcPokemonSummary,
    TrainerRoster,
    CampaignProfile,
    PcBox
} from '../../types/pcStorageTypes';
import { createDefaultBox } from './pcStorageAdapter';

export function getTrainerBoxes(trainer?: TrainerRoster, camp?: CampaignProfile): PcBox[] {
    if (trainer) {
        if (trainer.boxes && trainer.boxes.length > 0) return trainer.boxes;
        return Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
    }
    if (camp?.boxes && camp.boxes.length > 0) return camp.boxes;
    return Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
}

export function stripEntityFromBoxes(boxes: PcBox[] | undefined, entityId: string): PcBox[] | undefined {
    if (!boxes) return undefined;
    return boxes.map((b) => ({
        ...b,
        slots: b.slots.map((s) => (s === entityId ? null : s))
    }));
}

export function stripEntityFromTrainer(tr: TrainerRoster, entityId: string): TrainerRoster {
    return {
        ...tr,
        party: tr.party.map((s) => (s === entityId ? null : s)),
        boxes: stripEntityFromBoxes(tr.boxes, entityId) || tr.boxes
    };
}

export function applySetPartySlot(
    pcData: PcStorageData,
    trainerId: string,
    slotIndex: number,
    entityId: string | null
): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || slotIndex < 0 || slotIndex >= 6) return pcData;

    // PMD / No-Trainer Mode
    if (trainerId === '__none__') {
        const team = camp.teamParty || Array(6).fill(null);
        let nextTeam = [...team];
        let nextBoxes = camp.boxes;

        if (entityId) {
            nextTeam = nextTeam.map((s, i) => (i === slotIndex ? entityId : s === entityId ? null : s));
            nextBoxes = stripEntityFromBoxes(camp.boxes, entityId) || camp.boxes;
        } else {
            nextTeam[slotIndex] = null;
        }

        return {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...camp,
                    teamParty: nextTeam,
                    boxes: nextBoxes
                }
            }
        };
    }

    if (!camp.trainers[trainerId]) return pcData;

    const nextTrainers = { ...camp.trainers };
    const currentTrainer = nextTrainers[trainerId];
    const trainerBoxes = getTrainerBoxes(currentTrainer, camp);
    let nextBoxes = trainerBoxes;

    if (entityId) {
        for (const [tId, tr] of Object.entries(nextTrainers)) {
            const stripped = stripEntityFromTrainer(tr, entityId);
            nextTrainers[tId] = {
                ...stripped,
                party: stripped.party.map((s, i) => (tId === trainerId && i === slotIndex ? entityId : s))
            };
        }
        nextBoxes = stripEntityFromBoxes(trainerBoxes, entityId) || trainerBoxes;
    } else {
        const nextParty = [...currentTrainer.party];
        nextParty[slotIndex] = null;
        nextTrainers[trainerId] = { ...currentTrainer, party: nextParty };
    }

    if (nextTrainers[trainerId]) {
        nextTrainers[trainerId] = {
            ...nextTrainers[trainerId],
            boxes: nextBoxes
        };
    }

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                trainers: nextTrainers,
                boxes: camp.boxes
            }
        }
    };
}

export function applySetBoxSlot(
    pcData: PcStorageData,
    boxIndex: number,
    slotIndex: number,
    entityId: string | null
): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || slotIndex < 0 || slotIndex >= 30) return pcData;

    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const trainerBoxes = getTrainerBoxes(activeTrainer, camp);
    if (boxIndex < 0 || boxIndex >= trainerBoxes.length) return pcData;

    let nextTrainers = { ...camp.trainers };
    let nextBoxes = [...trainerBoxes];

    if (entityId) {
        for (const [tId, tr] of Object.entries(nextTrainers)) {
            nextTrainers[tId] = stripEntityFromTrainer(tr, entityId);
        }
        const baseBoxes = activeTrainer ? trainerBoxes : camp.boxes;
        nextBoxes = (stripEntityFromBoxes(baseBoxes, entityId) || baseBoxes).map((b, bIdx) => {
            if (bIdx === boxIndex) {
                const slots = [...b.slots];
                slots[slotIndex] = entityId;
                return { ...b, slots };
            }
            return b;
        });
    } else {
        const slots = [...nextBoxes[boxIndex].slots];
        slots[slotIndex] = null;
        nextBoxes[boxIndex] = { ...nextBoxes[boxIndex], slots };
    }

    if (activeTrainer && nextTrainers[camp.activeTrainerId]) {
        nextTrainers[camp.activeTrainerId] = {
            ...nextTrainers[camp.activeTrainerId],
            boxes: nextBoxes
        };
    }

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                trainers: nextTrainers,
                boxes: activeTrainer ? camp.boxes : nextBoxes
            }
        }
    };
}

export function applySwapPcSlots(
    pcData: PcStorageData,
    from: { type: 'party' | 'box'; index: number; boxIndex?: number },
    to: { type: 'party' | 'box'; index: number; boxIndex?: number },
    defaultBoxIndex: number
): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;

    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const party = activeTrainer ? activeTrainer.party : camp.teamParty || Array(6).fill(null);
    const trainerBoxes = getTrainerBoxes(activeTrainer, camp);
    const fromBoxIdx = from.boxIndex ?? defaultBoxIndex;
    const toBoxIdx = to.boxIndex ?? defaultBoxIndex;

    const fromEntity = from.type === 'party' ? party[from.index] : trainerBoxes[fromBoxIdx]?.slots[from.index];
    const toEntity = to.type === 'party' ? party[to.index] : trainerBoxes[toBoxIdx]?.slots[to.index];

    const nextParty = [...party];
    const nextBoxes = trainerBoxes.map((b) => ({ ...b, slots: [...b.slots] }));

    if (to.type === 'party') {
        nextParty[to.index] = fromEntity;
    } else if (nextBoxes[toBoxIdx]) {
        nextBoxes[toBoxIdx].slots[to.index] = fromEntity;
    }

    if (from.type === 'party') {
        nextParty[from.index] = toEntity;
    } else if (nextBoxes[fromBoxIdx]) {
        nextBoxes[fromBoxIdx].slots[from.index] = toEntity;
    }

    const nextTrainers = { ...camp.trainers };
    if (activeTrainer && nextTrainers[camp.activeTrainerId]) {
        nextTrainers[camp.activeTrainerId] = {
            ...activeTrainer,
            party: nextParty,
            boxes: nextBoxes
        };
    }

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                trainers: nextTrainers,
                teamParty: activeTrainer ? camp.teamParty : nextParty,
                boxes: activeTrainer ? camp.boxes : nextBoxes
            }
        }
    };
}

export function applyMovePokemonToParty(
    pcData: PcStorageData,
    entityId: string,
    targetTrainerId?: string
): { nextData: PcStorageData; success: boolean } {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return { nextData: pcData, success: false };
    const effectiveTrainerId = targetTrainerId || camp.activeTrainerId;
    const trainer = camp.trainers[effectiveTrainerId];
    const party = trainer ? trainer.party : camp.teamParty || Array(6).fill(null);

    // Prevent duplicate: if already in party, do nothing
    if (party.includes(entityId)) return { nextData: pcData, success: false };

    const emptyIndex = party.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return { nextData: pcData, success: false };

    const boxes = getTrainerBoxes(trainer, camp);
    const nextBoxes = boxes.map((b) => ({
        ...b,
        slots: b.slots.map((s) => (s === entityId ? null : s))
    }));

    const nextParty = [...party];
    nextParty[emptyIndex] = entityId;

    const nextTrainers = { ...camp.trainers };
    if (trainer && nextTrainers[effectiveTrainerId]) {
        nextTrainers[effectiveTrainerId] = {
            ...trainer,
            party: nextParty,
            boxes: nextBoxes
        };
    }

    return {
        nextData: {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...camp,
                    trainers: nextTrainers,
                    teamParty: trainer ? camp.teamParty : nextParty,
                    boxes: trainer ? camp.boxes : nextBoxes
                }
            }
        },
        success: true
    };
}

export function applyDepositPokemonToBox(
    pcData: PcStorageData,
    entityId: string,
    targetIdx: number,
    targetTrainerId?: string
): { nextData: PcStorageData; success: boolean } {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return { nextData: pcData, success: false };

    const effectiveTrainerId = targetTrainerId || camp.activeTrainerId;
    const trainer = camp.trainers[effectiveTrainerId];
    const party = trainer ? trainer.party : camp.teamParty || Array(6).fill(null);
    const trainerBoxes = getTrainerBoxes(trainer, camp);
    if (targetIdx < 0 || targetIdx >= trainerBoxes.length) return { nextData: pcData, success: false };

    const nextParty = party.map((s) => (s === entityId ? null : s));
    const nextBoxes = trainerBoxes.map((b) => ({
        ...b,
        slots: b.slots.map((s) => (s === entityId ? null : s))
    }));

    const emptySlot = nextBoxes[targetIdx].slots.findIndex((s) => s === null);
    if (emptySlot === -1) return { nextData: pcData, success: false };
    nextBoxes[targetIdx].slots[emptySlot] = entityId;

    const nextTrainers = { ...camp.trainers };
    if (trainer && nextTrainers[effectiveTrainerId]) {
        nextTrainers[effectiveTrainerId] = {
            ...trainer,
            party: nextParty,
            boxes: nextBoxes
        };
    }

    return {
        nextData: {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...camp,
                    trainers: nextTrainers,
                    teamParty: trainer ? camp.teamParty : nextParty,
                    boxes: trainer ? camp.boxes : nextBoxes
                }
            }
        },
        success: true
    };
}

function updateCampaignBoxes(
    pcData: PcStorageData,
    camp: CampaignProfile,
    activeTrainer: TrainerRoster | undefined,
    nextBoxes: PcBox[]
): PcStorageData {
    const nextTrainers = { ...camp.trainers };
    if (activeTrainer && nextTrainers[camp.activeTrainerId]) {
        nextTrainers[camp.activeTrainerId] = {
            ...activeTrainer,
            boxes: nextBoxes
        };
    }
    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                trainers: nextTrainers,
                boxes: activeTrainer ? camp.boxes : nextBoxes
            }
        }
    };
}

export function applyAddBox(pcData: PcStorageData, name?: string): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;
    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const currentBoxes = getTrainerBoxes(activeTrainer, camp);

    const newBox = createDefaultBox(currentBoxes.length);
    if (typeof name === 'string' && name.trim()) newBox.name = name.trim();
    return updateCampaignBoxes(pcData, camp, activeTrainer, [...currentBoxes, newBox]);
}

export function applyDeleteBox(pcData: PcStorageData, boxIndex: number): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;
    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const currentBoxes = getTrainerBoxes(activeTrainer, camp);
    if (currentBoxes.length <= 1 || boxIndex < 0 || boxIndex >= currentBoxes.length) return pcData;

    const targetBox = currentBoxes[boxIndex];
    if (targetBox?.slots?.some(Boolean)) return pcData;

    return updateCampaignBoxes(
        pcData,
        camp,
        activeTrainer,
        currentBoxes.filter((_, i) => i !== boxIndex)
    );
}

export function applyRenameBox(pcData: PcStorageData, boxIndex: number, name: string): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;
    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const currentBoxes = getTrainerBoxes(activeTrainer, camp);
    if (boxIndex < 0 || boxIndex >= currentBoxes.length) return pcData;

    const nextBoxes = [...currentBoxes];
    nextBoxes[boxIndex] = { ...nextBoxes[boxIndex], name };
    return updateCampaignBoxes(pcData, camp, activeTrainer, nextBoxes);
}

export function applySetBoxTheme(
    pcData: PcStorageData,
    boxIndex: number,
    color: string,
    wallpaper?: string
): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;
    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const currentBoxes = getTrainerBoxes(activeTrainer, camp);
    if (boxIndex < 0 || boxIndex >= currentBoxes.length) return pcData;

    const nextBoxes = [...currentBoxes];
    nextBoxes[boxIndex] = {
        ...nextBoxes[boxIndex],
        themeColor: color,
        wallpaper: wallpaper || nextBoxes[boxIndex].wallpaper
    };
    return updateCampaignBoxes(pcData, camp, activeTrainer, nextBoxes);
}

export { applyAddTrainer, applyAddCampaign, applyEditCampaign } from './pcCampaignTrainerOps';

export function applyUpdateSummary(pcData: PcStorageData, summary: PcPokemonSummary): PcStorageData {
    return {
        ...pcData,
        pokemonSummaries: {
            ...pcData.pokemonSummaries,
            [summary.entityId]: {
                ...summary,
                lastModified: summary.lastModified || Date.now()
            }
        }
    };
}

export function applyDeleteSummary(pcData: PcStorageData, entityId: string): PcStorageData {
    const nextSummaries = { ...pcData.pokemonSummaries };
    delete nextSummaries[entityId];

    const nextCampaigns = { ...pcData.campaigns };
    for (const cId of Object.keys(nextCampaigns)) {
        const camp = nextCampaigns[cId];
        const nextTrainers = { ...camp.trainers };
        for (const [tId, tr] of Object.entries(nextTrainers)) {
            nextTrainers[tId] = stripEntityFromTrainer(tr, entityId);
        }
        const nextBoxes = stripEntityFromBoxes(camp.boxes, entityId) || camp.boxes;
        const nextTeamParty = (camp.teamParty || []).map((slot) => (slot === entityId ? null : slot));

        nextCampaigns[cId] = {
            ...camp,
            trainers: nextTrainers,
            boxes: nextBoxes,
            teamParty: nextTeamParty
        };
    }

    return {
        ...pcData,
        campaigns: nextCampaigns,
        pokemonSummaries: nextSummaries
    };
}
