import type {
    PcStorageData,
    PcPokemonSummary,
    SheetFieldDiff,
    TrainerRoster,
    CampaignProfile,
    PcBox
} from '../../types/pcStorageTypes';
import { createDefaultBox, createDefaultCampaign } from './pcStorageAdapter';

export function getTrainerBoxes(trainer?: TrainerRoster, camp?: CampaignProfile): PcBox[] {
    if (trainer?.boxes && trainer.boxes.length > 0) return trainer.boxes;
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
    if (!camp || !camp.trainers[trainerId] || slotIndex < 0 || slotIndex >= 6) return pcData;

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
                boxes: nextBoxes
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
        nextBoxes = (stripEntityFromBoxes(trainerBoxes, entityId) || trainerBoxes).map((b, bIdx) => {
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
                boxes: nextBoxes
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
    if (!activeTrainer) return pcData;

    const trainerBoxes = getTrainerBoxes(activeTrainer, camp);
    const fromBoxIdx = from.boxIndex ?? defaultBoxIndex;
    const toBoxIdx = to.boxIndex ?? defaultBoxIndex;

    const fromEntity =
        from.type === 'party' ? activeTrainer.party[from.index] : trainerBoxes[fromBoxIdx]?.slots[from.index];
    const toEntity = to.type === 'party' ? activeTrainer.party[to.index] : trainerBoxes[toBoxIdx]?.slots[to.index];

    const nextParty = [...activeTrainer.party];
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

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                trainers: {
                    ...camp.trainers,
                    [camp.activeTrainerId]: {
                        ...activeTrainer,
                        party: nextParty,
                        boxes: nextBoxes
                    }
                },
                boxes: nextBoxes
            }
        }
    };
}

export function applyMovePokemonToParty(
    pcData: PcStorageData,
    entityId: string
): { nextData: PcStorageData; success: boolean } {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return { nextData: pcData, success: false };
    const trainer = camp.trainers[camp.activeTrainerId];
    if (!trainer) return { nextData: pcData, success: false };

    // Prevent duplicate: if already on belt, do nothing
    if (trainer.party.includes(entityId)) return { nextData: pcData, success: false };

    const emptyIndex = trainer.party.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return { nextData: pcData, success: false };

    const trainerBoxes = getTrainerBoxes(trainer, camp);
    const nextBoxes = trainerBoxes.map((b) => ({
        ...b,
        slots: b.slots.map((s) => (s === entityId ? null : s))
    }));

    const nextParty = [...trainer.party];
    nextParty[emptyIndex] = entityId;

    return {
        nextData: {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...camp,
                    trainers: {
                        ...camp.trainers,
                        [camp.activeTrainerId]: {
                            ...trainer,
                            party: nextParty,
                            boxes: nextBoxes
                        }
                    },
                    boxes: nextBoxes
                }
            }
        },
        success: true
    };
}

export function applyDepositPokemonToBox(
    pcData: PcStorageData,
    entityId: string,
    targetIdx: number
): { nextData: PcStorageData; success: boolean } {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return { nextData: pcData, success: false };

    const trainer = camp.trainers[camp.activeTrainerId];
    const trainerBoxes = getTrainerBoxes(trainer, camp);
    if (targetIdx < 0 || targetIdx >= trainerBoxes.length) return { nextData: pcData, success: false };

    const nextTrainers = { ...camp.trainers };
    let nextParty = trainer ? [...trainer.party] : [];
    if (trainer) {
        nextParty = trainer.party.map((s) => (s === entityId ? null : s));
    }

    const nextBoxes = trainerBoxes.map((b) => ({
        ...b,
        slots: b.slots.map((s) => (s === entityId ? null : s))
    }));

    const emptySlot = nextBoxes[targetIdx].slots.findIndex((s) => s === null);
    if (emptySlot === -1) return { nextData: pcData, success: false };
    nextBoxes[targetIdx].slots[emptySlot] = entityId;

    if (trainer && nextTrainers[camp.activeTrainerId]) {
        nextTrainers[camp.activeTrainerId] = {
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
                    boxes: nextBoxes
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
                boxes: nextBoxes
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
    if (name) newBox.name = name;
    return updateCampaignBoxes(pcData, camp, activeTrainer, [...currentBoxes, newBox]);
}

export function applyDeleteBox(pcData: PcStorageData, boxIndex: number): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;
    const activeTrainer = camp.trainers[camp.activeTrainerId];
    const currentBoxes = getTrainerBoxes(activeTrainer, camp);
    if (currentBoxes.length <= 1 || boxIndex < 0 || boxIndex >= currentBoxes.length) return pcData;

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

export function applyUpdateSummary(pcData: PcStorageData, summary: PcPokemonSummary): PcStorageData {
    return {
        ...pcData,
        pokemonSummaries: {
            ...pcData.pokemonSummaries,
            [summary.entityId]: {
                ...summary,
                lastModified: Date.now()
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

        nextCampaigns[cId] = {
            ...camp,
            trainers: nextTrainers,
            boxes: nextBoxes
        };
    }

    return {
        ...pcData,
        campaigns: nextCampaigns,
        pokemonSummaries: nextSummaries
    };
}

export function applyReviewDiffsToSummary(summary: PcPokemonSummary, diffs: SheetFieldDiff[]): PcPokemonSummary {
    const updated = { ...summary };
    for (const diff of diffs) {
        if (!diff.accepted) continue;
        if (diff.id === 'hp') updated.hp = Number(diff.playerValue);
        else if (diff.id === 'maxHp') updated.maxHp = Number(diff.playerValue);
        else if (diff.id === 'will') updated.will = Number(diff.playerValue);
        else if (diff.id === 'maxWill') updated.maxWill = Number(diff.playerValue);
        else if (diff.id === 'name') updated.name = String(diff.playerValue);
        else if (diff.id === 'species') updated.species = String(diff.playerValue);
        else if (diff.id === 'rank') updated.rank = String(diff.playerValue);
    }
    return updated;
}
