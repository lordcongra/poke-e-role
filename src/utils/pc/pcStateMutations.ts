import type { PcStorageData, PcPokemonSummary, SheetFieldDiff } from '../../types/pcStorageTypes';
import { createDefaultBox, createDefaultCampaign } from './pcStorageAdapter';

export function applySetPartySlot(
    pcData: PcStorageData,
    trainerId: string,
    slotIndex: number,
    entityId: string | null
): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || !camp.trainers[trainerId] || slotIndex < 0 || slotIndex >= 6) return pcData;

    const nextTrainers = { ...camp.trainers };
    const nextParty = [...nextTrainers[trainerId].party];
    nextParty[slotIndex] = entityId;
    nextTrainers[trainerId] = { ...nextTrainers[trainerId], party: nextParty };

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                trainers: nextTrainers
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
    if (!camp || boxIndex < 0 || boxIndex >= camp.boxes.length || slotIndex < 0 || slotIndex >= 30) return pcData;

    const nextBoxes = [...camp.boxes];
    const nextSlots = [...nextBoxes[boxIndex].slots];
    nextSlots[slotIndex] = entityId;
    nextBoxes[boxIndex] = { ...nextBoxes[boxIndex], slots: nextSlots };

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
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

    const fromBoxIdx = from.boxIndex ?? defaultBoxIndex;
    const toBoxIdx = to.boxIndex ?? defaultBoxIndex;

    const fromEntity =
        from.type === 'party' ? activeTrainer.party[from.index] : camp.boxes[fromBoxIdx]?.slots[from.index];
    const toEntity = to.type === 'party' ? activeTrainer.party[to.index] : camp.boxes[toBoxIdx]?.slots[to.index];

    const nextParty = [...activeTrainer.party];
    const nextBoxes = camp.boxes.map((b) => ({ ...b, slots: [...b.slots] }));

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
                        party: nextParty
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

    const emptyIndex = trainer.party.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return { nextData: pcData, success: false };

    const nextBoxes = camp.boxes.map((b) => ({
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
                            party: nextParty
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

    const targetBox = camp.boxes[targetIdx];
    if (!targetBox) return { nextData: pcData, success: false };

    const emptySlot = targetBox.slots.findIndex((s) => s === null);
    if (emptySlot === -1) return { nextData: pcData, success: false };

    const trainer = camp.trainers[camp.activeTrainerId];
    const nextTrainers = { ...camp.trainers };
    if (trainer) {
        nextTrainers[camp.activeTrainerId] = {
            ...trainer,
            party: trainer.party.map((s) => (s === entityId ? null : s))
        };
    }

    const nextBoxes = camp.boxes.map((b, i) => {
        if (i === targetIdx) {
            const slots = [...b.slots];
            slots[emptySlot] = entityId;
            return { ...b, slots };
        }
        return { ...b, slots: b.slots.map((s) => (s === entityId ? null : s)) };
    });

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

export function applyAddBox(pcData: PcStorageData, name?: string): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp) return pcData;

    const newBox = createDefaultBox(camp.boxes.length);
    if (name) newBox.name = name;

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                boxes: [...camp.boxes, newBox]
            }
        }
    };
}

export function applyDeleteBox(pcData: PcStorageData, boxIndex: number): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || camp.boxes.length <= 1 || boxIndex < 0 || boxIndex >= camp.boxes.length) return pcData;

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                boxes: camp.boxes.filter((_, i) => i !== boxIndex)
            }
        }
    };
}

export function applyRenameBox(pcData: PcStorageData, boxIndex: number, name: string): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || boxIndex < 0 || boxIndex >= camp.boxes.length) return pcData;

    const nextBoxes = [...camp.boxes];
    nextBoxes[boxIndex] = { ...nextBoxes[boxIndex], name };

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                boxes: nextBoxes
            }
        }
    };
}

export function applySetBoxTheme(
    pcData: PcStorageData,
    boxIndex: number,
    color: string,
    wallpaper?: string
): PcStorageData {
    const camp = pcData.campaigns[pcData.activeCampaignId];
    if (!camp || boxIndex < 0 || boxIndex >= camp.boxes.length) return pcData;

    const nextBoxes = [...camp.boxes];
    nextBoxes[boxIndex] = {
        ...nextBoxes[boxIndex],
        themeColor: color,
        wallpaper: wallpaper || nextBoxes[boxIndex].wallpaper
    };

    return {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [pcData.activeCampaignId]: {
                ...camp,
                boxes: nextBoxes
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
                            party: Array(6).fill(null)
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
        for (const tId of Object.keys(nextTrainers)) {
            nextTrainers[tId] = {
                ...nextTrainers[tId],
                party: nextTrainers[tId].party.map((s) => (s === entityId ? null : s))
            };
        }
        const nextBoxes = camp.boxes.map((b) => ({
            ...b,
            slots: b.slots.map((s) => (s === entityId ? null : s))
        }));

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
