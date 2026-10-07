import type { StateCreator } from 'zustand';
import type { CharacterState } from '../storeTypes';
import type { PcSlice, PcStorageData, PcPokemonSummary } from '../../types/pcStorageTypes';
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
    applyEditCampaign,
    applyUpdateSummary,
    applyDeleteSummary,
    getTrainerBoxes
} from '../../utils/pc/pcStateMutations';
import { EXTENSION_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';
import {
    applyDeleteCampaign,
    applyDeleteTrainer,
    applyRenameTrainer,
    applyReorderTrainers,
    getCachedObrPlayerId,
    setCachedObrPlayerId,
    persistTrainerSwitch
} from '../../utils/pc/pcCampaignTrainerOps';
import { syncSwappedSlotsToSidebar, syncBoxRenameToSidebar } from '../../utils/pc/pcSidebarSync';
import {
    syncSidebarOnMoveToParty,
    syncSidebarOnDeposit,
    syncStandaloneSummaryUpdate,
    initStandaloneTrainerSheet,
    syncStandaloneTrainerRename,
    broadcastPcPokemonDelete,
    syncCampaignRoomSettingsOnEdit
} from '../../utils/pc/pcStorageStoreOps';
import { markDataChanged } from '../../utils/sync/storageAdapter';
import { broadcastGmPc, triggerDebouncedPcBroadcast } from '../../hooks/owlbearSync/owlbearPcBroadcastOps';
import OBR from '@owlbear-rodeo/sdk';

export const createPcSlice: StateCreator<CharacterState, [], [], PcSlice> = (set, get) => ({
    pcData: createInitialPcStorageData(),
    activeBoxIndex: 0,
    selectedPcSlot: null,
    isPcModalOpen: false,

    initPcStorage: async () => {
        try {
            const data = await loadPcStorage();

            // Ensure valid campaigns structure
            if (!data.campaigns || Object.keys(data.campaigns).length === 0) {
                const def = createDefaultCampaign('default', 'Main Adventure');
                data.campaigns = { default: def };
                data.activeCampaignId = 'default';
            } else if (!data.campaigns[data.activeCampaignId]) {
                // If active campaign ID is invalid or missing, fallback to the first existing campaign
                data.activeCampaignId = Object.keys(data.campaigns)[0];
            }

            set({ pcData: data });
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('pkr-local-data-changed'));
        } catch (e) {
            console.error('[PcSlice] Failed to initialize PC storage:', e);
        }
    },

    setActiveBoxIndex: (index: number) => {
        const { pcData } = get();
        const activeCampaign = pcData.campaigns[pcData.activeCampaignId];
        if (!activeCampaign) return;
        const activeTrainer = activeCampaign.trainers[activeCampaign.activeTrainerId];
        const boxes =
            activeTrainer?.boxes && activeTrainer.boxes.length > 0 ? activeTrainer.boxes : activeCampaign.boxes;
        if (index < 0 || index >= boxes.length) return;
        set({ activeBoxIndex: index });
    },

    setSelectedPcSlot: (slot) => set({ selectedPcSlot: slot }),
    openPcModal: () => set({ isPcModalOpen: true }),
    closePcModal: () => set({ isPcModalOpen: false, selectedPcSlot: null }),

    setPartySlot: (trainerId: string, slotIndex: number, entityId: string | null) => {
        try {
            const nextData = applySetPartySlot(get().pcData, trainerId, slotIndex, entityId);
            set({ pcData: nextData });
            savePcStorage(nextData);
            markDataChanged();
            if (!OBR.isAvailable && entityId) {
                const camp = nextData.campaigns[nextData.activeCampaignId];
                syncSidebarOnMoveToParty(camp?.trainers[trainerId], entityId);
            }
        } catch (e) {
            console.error('[PcSlice] Failed to set party slot:', e);
        }
    },

    setBoxSlot: (boxIndex: number, slotIndex: number, entityId: string | null) => {
        try {
            const nextData = applySetBoxSlot(get().pcData, boxIndex, slotIndex, entityId);
            set({ pcData: nextData });
            savePcStorage(nextData);
            markDataChanged();
            if (!OBR.isAvailable && entityId) {
                const camp = nextData.campaigns[nextData.activeCampaignId];
                syncSidebarOnDeposit(camp, camp?.trainers[camp?.activeTrainerId], entityId, boxIndex);
            }
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
            markDataChanged();

            if (!OBR.isAvailable) {
                const camp = nextData.campaigns[nextData.activeCampaignId];
                const tr = camp?.trainers[camp?.activeTrainerId];
                if (tr) syncSwappedSlotsToSidebar(tr, from, to, nextData, activeBoxIndex).catch(console.warn);
            } else {
                triggerDebouncedPcBroadcast();
            }
        } catch (e) {
            console.error('[PcSlice] Failed to swap PC slots:', e);
        }
    },

    movePokemonToParty: (entityId: string, trainerId?: string) => {
        try {
            const { nextData, success } = applyMovePokemonToParty(get().pcData, entityId, trainerId);
            if (!success) {
                if (OBR.isAvailable) {
                    OBR.notification.show('Your Party is full (6/6)! Deposit a Pokémon first.', 'WARNING');
                }
                return false;
            }
            set({ pcData: nextData });
            savePcStorage(nextData);
            markDataChanged();

            const camp = nextData.campaigns[nextData.activeCampaignId];
            const targetTr = camp?.trainers[trainerId || camp?.activeTrainerId];
            syncSidebarOnMoveToParty(targetTr, entityId);
            if (OBR.isAvailable) triggerDebouncedPcBroadcast();
            return true;
        } catch (e) {
            console.error('[PcSlice] Failed to move to party:', e);
            return false;
        }
    },

    depositPokemonToBox: (entityId: string, boxIndex?: number, trainerId?: string) => {
        try {
            const { pcData, activeBoxIndex } = get();
            const targetIdx = boxIndex ?? activeBoxIndex;
            const { nextData, success } = applyDepositPokemonToBox(pcData, entityId, targetIdx, trainerId);
            if (!success) {
                const camp = pcData.campaigns[pcData.activeCampaignId];
                const targetTr = camp?.trainers[trainerId || camp?.activeTrainerId];
                const boxName = (targetTr?.boxes?.[targetIdx] || camp?.boxes?.[targetIdx])?.name || 'Box';
                if (OBR.isAvailable) {
                    OBR.notification.show(`Box "${boxName}" is full (30/30)!`, 'WARNING');
                }
                return false;
            }
            set({ pcData: nextData });
            savePcStorage(nextData);
            markDataChanged();

            const camp = nextData.campaigns[nextData.activeCampaignId];
            const targetTr = camp?.trainers[trainerId || camp?.activeTrainerId];
            syncSidebarOnDeposit(camp, targetTr, entityId, targetIdx);
            if (OBR.isAvailable) triggerDebouncedPcBroadcast();
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
            if (!camp) return;

            const activeTrainer = camp.trainers[camp.activeTrainerId];
            const boxes = getTrainerBoxes(activeTrainer, camp);
            if (boxes.length <= 1 || boxIndex < 0 || boxIndex >= boxes.length) return;

            const targetBox = boxes[boxIndex];
            if (targetBox?.slots?.some(Boolean)) {
                if (OBR.isAvailable) {
                    OBR.notification.show('Cannot delete box: please empty or move stored Pokémon first.', 'WARNING');
                } else if (typeof window !== 'undefined' && window.alert) {
                    window.alert('Cannot delete box: please empty or move stored Pokémon first.');
                }
                return;
            }

            const nextData = applyDeleteBox(pcData, boxIndex);
            const nextIdx = Math.min(activeBoxIndex, boxes.length - 2);
            set({ pcData: nextData, activeBoxIndex: Math.max(0, nextIdx) });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to delete box:', e);
        }
    },

    renameBox: (boxIndex: number, name: string) => {
        try {
            const { pcData } = get();
            const camp = pcData.campaigns[pcData.activeCampaignId];
            const tr = camp?.trainers[camp?.activeTrainerId];
            const oldName = (tr?.boxes?.[boxIndex] || camp?.boxes[boxIndex])?.name;

            const nextData = applyRenameBox(pcData, boxIndex, name);
            set({ pcData: nextData });
            savePcStorage(nextData);

            if (!OBR.isAvailable && tr && oldName) {
                syncBoxRenameToSidebar(tr, oldName, name).catch(console.warn);
            }
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
            if (!camp || (trainerId !== '__none__' && !camp.trainers[trainerId])) return;

            const campId = pcData.activeCampaignId;
            const pid = getCachedObrPlayerId();
            persistTrainerSwitch(campId, trainerId, pid);

            if (OBR.isAvailable && !pid) {
                OBR.player.getId().then((id) => {
                    setCachedObrPlayerId(id);
                    persistTrainerSwitch(campId, trainerId, id);
                }).catch(() => {});
            }

            const nextData = {
                ...pcData,
                campaigns: {
                    ...pcData.campaigns,
                    [campId]: {
                        ...camp,
                        activeTrainerId: trainerId,
                        activeTrainerByPlayer: pid
                            ? { ...(camp.activeTrainerByPlayer || {}), [pid]: trainerId }
                            : camp.activeTrainerByPlayer
                    }
                }
            };
            set({ pcData: nextData, activeBoxIndex: 0 });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to switch trainer:', e);
        }
    },

    addTrainer: (name: string, options?: { existingCharacterId?: string; isLinked?: boolean }) => {
        try {
            const { nextData, newId } = applyAddTrainer(get().pcData, name, options);
            if (!options?.existingCharacterId) initStandaloneTrainerSheet(newId, name);
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to add trainer:', e);
        }
    },

    deleteTrainer: (trainerId: string, options?: { deletePc?: boolean; deleteBelt?: boolean }) => {
        try {
            const { pcData } = get();
            const res = applyDeleteTrainer(pcData, pcData.activeCampaignId, trainerId, options);
            if (!res.success) {
                if (OBR.isAvailable && res.error) {
                    OBR.notification.show(res.error, 'WARNING');
                }
                return false;
            }
            set({ pcData: res.nextData });
            savePcStorage(res.nextData);
            if (OBR.isAvailable) {
                OBR.broadcast
                    .sendMessage(
                        `${EXTENSION_ID}/pc-trainer-delete`,
                        { campaignId: pcData.activeCampaignId, trainerId },
                        { destination: 'REMOTE' }
                    )
                    .catch(() => {});
            }
            return true;
        } catch (e) {
            console.error('[PcSlice] Failed to delete trainer:', e);
            return false;
        }
    },

    renameTrainer: (trainerId: string, newName: string) => {
        try {
            const res = applyRenameTrainer(get().pcData, trainerId, newName);
            if (!res.success) return;
            set({ pcData: res.nextData });
            savePcStorage(res.nextData);
            syncStandaloneTrainerRename(trainerId, newName);
        } catch (e) {
            console.error('[PcSlice] Failed to rename trainer:', e);
        }
    },

    reorderTrainers: (campaignId: string, trainerOrder: string[]) => {
        try {
            const nextData = applyReorderTrainers(get().pcData, campaignId, trainerOrder);
            set({ pcData: nextData });
            savePcStorage(nextData);
            if (OBR.isAvailable) {
                broadcastGmPc({ campaignId }).catch(() => {});
            }
        } catch (e) {
            console.error('[PcSlice] Failed to reorder trainers:', e);
        }
    },

    switchCampaign: (campaignId: string) => {
        try {
            const { pcData } = get();
            const targetCamp = pcData.campaigns[campaignId];
            if (!targetCamp) return;

            let activeTrainerId = targetCamp.activeTrainerId;
            if (typeof window !== 'undefined' && window.localStorage) {
                const localTr = localStorage.getItem(`pkr_active_trainer_${campaignId}`);
                if (localTr && (localTr === '__none__' || targetCamp.trainers?.[localTr])) activeTrainerId = localTr;
            }
            if (activeTrainerId !== '__none__' && (!targetCamp.trainers || !targetCamp.trainers[activeTrainerId])) {
                activeTrainerId = Object.keys(targetCamp.trainers || {})[0] || '__none__';
            }

            const nextData: PcStorageData = {
                ...pcData,
                activeCampaignId: campaignId,
                campaigns: { ...pcData.campaigns, [campaignId]: { ...targetCamp, activeTrainerId } }
            };
            set({ pcData: nextData, activeBoxIndex: 0, selectedPcSlot: null });
            savePcStorage(nextData);
            markDataChanged();
        } catch (e) {
            console.error('[PcSlice] Failed to switch campaign:', e);
        }
    },

    addCampaign: (name: string, options?: { isPrivate?: boolean; isRoomActive?: boolean }) => {
        try {
            const { pcData, role } = get();
            const { nextData, newId } = applyAddCampaign(pcData, name, options);
            set({ pcData: nextData, activeBoxIndex: 0 });
            savePcStorage(nextData);

            if (OBR.isAvailable && role === 'GM' && options?.isRoomActive && !options.isPrivate) {
                get().updateRoomSetting('activeRoomCampaignId', newId);
                get().updateRoomSetting('activeRoomCampaignName', name.trim());
            }
        } catch (e) {
            console.error('[PcSlice] Failed to add campaign:', e);
        }
    },

    editCampaign: (campaignId: string, updates: { name?: string; isPrivate?: boolean; isRoomActive?: boolean }) => {
        try {
            const { pcData, role, identity } = get();
            const res = applyEditCampaign(pcData, campaignId, updates);
            if (!res.success) return;

            set({ pcData: res.nextData });
            savePcStorage(res.nextData);

            syncCampaignRoomSettingsOnEdit(
                role === 'GM',
                campaignId,
                res.nextData.campaigns[campaignId],
                updates,
                identity.activeRoomCampaignId,
                get().updateRoomSetting
            );
        } catch (e) {
            console.error('[PcSlice] Failed to edit campaign:', e);
        }
    },

    deleteCampaign: (campaignId: string) => {
        try {
            const { pcData, role, identity } = get();
            const deleted = pcData.campaigns[campaignId];
            const res = applyDeleteCampaign(pcData, campaignId);
            if (!res.success) {
                if (OBR.isAvailable && res.error) OBR.notification.show(res.error, 'WARNING');
                return false;
            }
            set({ pcData: res.nextData, activeBoxIndex: 0 });
            savePcStorage(res.nextData);

            if (OBR.isAvailable && role === 'GM' && (deleted?.isRoomActive || identity.activeRoomCampaignId === campaignId)) {
                get().updateRoomSetting('activeRoomCampaignId', '');
                get().updateRoomSetting('activeRoomCampaignName', '');
            }
            return true;
        } catch (e) {
            console.error('[PcSlice] Failed to delete campaign:', e);
            return false;
        }
    },

    updatePokemonSummary: (summary: PcPokemonSummary) => {
        try {
            const nextData = applyUpdateSummary(get().pcData, summary);
            set({ pcData: nextData });
            savePcStorage(nextData);
            syncStandaloneSummaryUpdate(summary);
        } catch (e) {
            console.error('[PcSlice] Failed to update pokemon summary:', e);
        }
    },

    updateTrainerProfile: (trainerId: string, updates: Partial<import('../../types/pcStorageTypes').TrainerRoster>) => {
        try {
            const { pcData } = get();
            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (!camp || !camp.trainers[trainerId]) return;

            const trainers = { ...camp.trainers, [trainerId]: { ...camp.trainers[trainerId], ...updates } };
            const nextData = { ...pcData, campaigns: { ...pcData.campaigns, [pcData.activeCampaignId]: { ...camp, trainers } } };
            set({ pcData: nextData });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to update trainer profile:', e);
        }
    },

    deletePokemonFromPc: (entityId: string, options?: { wasUnlinked?: boolean; pokemonName?: string }) => {
        try {
            const { pcData } = get();
            const summary = pcData.pokemonSummaries[entityId];
            const nextData = applyDeleteSummary(pcData, entityId);
            set({ pcData: nextData, selectedPcSlot: null });
            savePcStorage(nextData);
            broadcastPcPokemonDelete(pcData.activeCampaignId, entityId, options, summary);
        } catch (e) {
            console.error('[PcSlice] Failed to delete pokemon from PC:', e);
        }
    }
});
