import type { StateCreator } from 'zustand';
import type { CharacterState } from '../storeTypes';
import type { PcSlice, PcPokemonSummary, SheetReviewPayload, SheetFieldDiff } from '../../types/pcStorageTypes';
import {
    createInitialPcStorageData,
    createDefaultCampaign,
    loadPcStorage,
    savePcStorage
} from '../../utils/pc/pcStorageAdapter';
import {
    applySetPartySlot,
    applySetBoxSlot,
    applySwapPcSlots,
    applyMovePokemonToParty,
    applyDepositPokemonToBox,
    applyAddBox,
    applyDeleteBox,
    applyRenameBox,
    applySetBoxTheme,
    applyAddTrainer,
    applyAddCampaign,
    applyUpdateSummary,
    applyDeleteSummary,
    applyReviewDiffsToSummary
} from '../../utils/pc/pcStateMutations';
import OBR from '@owlbear-rodeo/sdk';

export const createPcSlice: StateCreator<CharacterState, [], [], PcSlice> = (set, get) => ({
    pcData: createInitialPcStorageData(),
    activeBoxIndex: 0,
    selectedPcSlot: null,
    isPcModalOpen: false,
    pendingReview: null,
    isReviewModalOpen: false,

    initPcStorage: async () => {
        try {
            const data = await loadPcStorage();
            if (OBR.isAvailable && OBR.room?.id) {
                const roomId = OBR.room.id;
                if (!data.campaigns[roomId]) {
                    const roomCamp = createDefaultCampaign(roomId, 'Campaign Room');
                    data.campaigns[roomId] = roomCamp;
                }
                data.activeCampaignId = roomId;
                await savePcStorage(data);
            }

            set({ pcData: data });
        } catch (e) {
            console.error('[PcSlice] Failed to initialize PC storage:', e);
        }
    },

    setActiveBoxIndex: (index: number) => {
        const { pcData } = get();
        const activeCampaign = pcData.campaigns[pcData.activeCampaignId];
        if (!activeCampaign || index < 0 || index >= activeCampaign.boxes.length) return;
        set({ activeBoxIndex: index });
    },

    setSelectedPcSlot: (slot) => {
        set({ selectedPcSlot: slot });
    },

    openPcModal: () => {
        set({ isPcModalOpen: true });
    },

    closePcModal: () => {
        set({ isPcModalOpen: false, selectedPcSlot: null });
    },

    setPartySlot: (trainerId: string, slotIndex: number, entityId: string | null) => {
        try {
            const nextData = applySetPartySlot(get().pcData, trainerId, slotIndex, entityId);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to set party slot:', e);
        }
    },

    setBoxSlot: (boxIndex: number, slotIndex: number, entityId: string | null) => {
        try {
            const nextData = applySetBoxSlot(get().pcData, boxIndex, slotIndex, entityId);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to set box slot:', e);
        }
    },

    swapPcSlots: (from, to) => {
        try {
            const { pcData, activeBoxIndex } = get();
            const nextData = applySwapPcSlots(pcData, from, to, activeBoxIndex);
            set({ pcData: nextData, selectedPcSlot: null });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to swap PC slots:', e);
        }
    },

    movePokemonToParty: (entityId: string) => {
        try {
            const { nextData, success } = applyMovePokemonToParty(get().pcData, entityId);
            if (!success) {
                if (OBR.isAvailable) {
                    OBR.notification.show('Your Party is full (6/6)! Deposit a Pokémon first.', 'WARNING');
                }
                return false;
            }
            set({ pcData: nextData });
            savePcStorage(nextData);
            return true;
        } catch (e) {
            console.error('[PcSlice] Failed to move to party:', e);
            return false;
        }
    },

    depositPokemonToBox: (entityId: string, boxIndex?: number) => {
        try {
            const { pcData, activeBoxIndex } = get();
            const targetIdx = boxIndex ?? activeBoxIndex;
            const { nextData, success } = applyDepositPokemonToBox(pcData, entityId, targetIdx);
            if (!success) {
                const camp = pcData.campaigns[pcData.activeCampaignId];
                const boxName = camp?.boxes[targetIdx]?.name || 'Box';
                if (OBR.isAvailable) {
                    OBR.notification.show(`Box "${boxName}" is full (30/30)!`, 'WARNING');
                }
                return false;
            }
            set({ pcData: nextData });
            savePcStorage(nextData);
            return true;
        } catch (e) {
            console.error('[PcSlice] Failed to deposit to box:', e);
            return false;
        }
    },

    addBox: (name?: string) => {
        try {
            const { pcData } = get();
            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (!camp) return;

            const nextData = applyAddBox(pcData, name);
            set({ pcData: nextData, activeBoxIndex: camp.boxes.length });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to add box:', e);
        }
    },

    deleteBox: (boxIndex: number) => {
        try {
            const { pcData, activeBoxIndex } = get();
            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (!camp || camp.boxes.length <= 1 || boxIndex < 0 || boxIndex >= camp.boxes.length) return;

            const nextData = applyDeleteBox(pcData, boxIndex);
            const nextIdx = Math.min(activeBoxIndex, camp.boxes.length - 2);
            set({ pcData: nextData, activeBoxIndex: Math.max(0, nextIdx) });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to delete box:', e);
        }
    },

    renameBox: (boxIndex: number, name: string) => {
        try {
            const nextData = applyRenameBox(get().pcData, boxIndex, name);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to rename box:', e);
        }
    },

    setBoxTheme: (boxIndex: number, color: string, wallpaper?: string) => {
        try {
            const nextData = applySetBoxTheme(get().pcData, boxIndex, color, wallpaper);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to set box theme:', e);
        }
    },

    switchTrainer: (trainerId: string) => {
        try {
            const { pcData } = get();
            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (!camp || !camp.trainers[trainerId]) return;

            const nextData = {
                ...pcData,
                campaigns: {
                    ...pcData.campaigns,
                    [pcData.activeCampaignId]: {
                        ...camp,
                        activeTrainerId: trainerId
                    }
                }
            };
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to switch trainer:', e);
        }
    },

    addTrainer: (name: string) => {
        try {
            const { nextData } = applyAddTrainer(get().pcData, name);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to add trainer:', e);
        }
    },

    switchCampaign: (campaignId: string) => {
        try {
            const { pcData } = get();
            if (!pcData.campaigns[campaignId]) return;

            const nextData = {
                ...pcData,
                activeCampaignId: campaignId
            };
            set({ pcData: nextData, activeBoxIndex: 0 });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to switch campaign:', e);
        }
    },

    addCampaign: (name: string) => {
        try {
            const { nextData } = applyAddCampaign(get().pcData, name);
            set({ pcData: nextData, activeBoxIndex: 0 });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to add campaign:', e);
        }
    },

    updatePokemonSummary: (summary: PcPokemonSummary) => {
        try {
            const nextData = applyUpdateSummary(get().pcData, summary);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to update pokemon summary:', e);
        }
    },

    deletePokemonFromPc: (entityId: string) => {
        try {
            const nextData = applyDeleteSummary(get().pcData, entityId);
            set({ pcData: nextData, selectedPcSlot: null });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to delete pokemon from PC:', e);
        }
    },

    openReviewModal: (payload: SheetReviewPayload) => {
        set({ pendingReview: payload, isReviewModalOpen: true });
    },

    closeReviewModal: () => {
        set({ pendingReview: null, isReviewModalOpen: false });
    },

    applyReviewDiffs: (entityId: string, diffs: SheetFieldDiff[]) => {
        try {
            const { pcData } = get();
            const summary = pcData.pokemonSummaries[entityId];
            if (!summary) return;

            const updatedSummary = applyReviewDiffsToSummary(summary, diffs);
            const nextData = applyUpdateSummary(pcData, updatedSummary);

            set({
                pcData: nextData,
                pendingReview: null,
                isReviewModalOpen: false
            });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to apply review diffs:', e);
        }
    }
});
