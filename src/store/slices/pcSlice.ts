import type { StateCreator } from 'zustand';
import type { CharacterState } from '../storeTypes';
import type {
    PcSlice,
    PcStorageData,
    PcPokemonSummary,
    SheetReviewPayload,
    SheetFieldDiff
} from '../../types/pcStorageTypes';
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
    applyDeleteSummary
} from '../../utils/pc/pcStateMutations';
import { applyReviewDiffsToSummary } from '../../utils/pc/pcDiffUtils';
import { EXTENSION_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';
import {
    applyDeleteCampaign,
    applyDeleteTrainer,
    getCachedObrPlayerId,
    setCachedObrPlayerId
} from '../../utils/pc/pcCampaignTrainerOps';
import {
    relocateSidebarPokemon,
    syncSwappedSlotsToSidebar,
    syncBoxRenameToSidebar
} from '../../utils/pc/pcSidebarSync';
import { relocatePmdSidebarPokemon } from '../../utils/pc/pcPmdSidebarSync';
import { markDataChanged } from '../../utils/sync/storageAdapter';
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

            // Notify Standalone Sidebar that full PC storage is loaded so belt auto-heal can run
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
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
            markDataChanged();
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
                if (tr) {
                    syncSwappedSlotsToSidebar(tr, from, to, nextData, activeBoxIndex).catch(console.warn);
                }
            }
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
            markDataChanged();

            if (!OBR.isAvailable) {
                const camp = nextData.campaigns[nextData.activeCampaignId];
                const tr = camp?.trainers[camp?.activeTrainerId];
                if (tr) {
                    relocateSidebarPokemon(tr, entityId, { type: 'party' }).catch(console.warn);
                } else {
                    relocatePmdSidebarPokemon(entityId, { type: 'party' }).catch(console.warn);
                }
            }
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
            markDataChanged();

            if (!OBR.isAvailable) {
                const camp = nextData.campaigns[nextData.activeCampaignId];
                const tr = camp?.trainers[camp?.activeTrainerId];
                const boxName = (tr?.boxes?.[targetIdx] || camp?.boxes[targetIdx])?.name || `Box ${targetIdx + 1}`;
                if (tr) {
                    relocateSidebarPokemon(tr, entityId, {
                        type: 'box',
                        boxIndex: targetIdx,
                        boxName
                    }).catch(console.warn);
                } else {
                    relocatePmdSidebarPokemon(entityId, {
                        type: 'box',
                        boxIndex: targetIdx,
                        boxName
                    }).catch(console.warn);
                }
            }
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
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    localStorage.setItem(`pkr_active_trainer_${campId}`, trainerId);
                    if (pid) localStorage.setItem(`pkr_active_trainer_${pid}_${campId}`, trainerId);
                } catch {}
            }
            if (OBR.isAvailable && !pid) {
                OBR.player
                    .getId()
                    .then((id) => {
                        setCachedObrPlayerId(id);
                        try {
                            localStorage.setItem(`pkr_active_trainer_${id}_${campId}`, trainerId);
                        } catch {}
                    })
                    .catch(() => {});
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

    addTrainer: (name: string) => {
        try {
            const { nextData, newId } = applyAddTrainer(get().pcData, name);
            if (!OBR.isAvailable && typeof window !== 'undefined' && window.localStorage) {
                const cleanName = name.trim();
                const initialMetadata = {
                    nickname: cleanName,
                    name: cleanName,
                    species: cleanName,
                    mode: 'Trainer',
                    rank: 'Trainer',
                    'hp-curr': 10,
                    'hp-max-display': 10,
                    'will-curr': 5,
                    'will-max-display': 5,
                    'v2-migrated': true
                };
                localStorage.setItem(`pkr_char_${newId}`, JSON.stringify(initialMetadata));
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
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

    switchCampaign: (campaignId: string) => {
        try {
            const { pcData } = get();
            const targetCamp = pcData.campaigns[campaignId];
            if (!targetCamp) return;

            let activeTrainerId = targetCamp.activeTrainerId;
            if (typeof window !== 'undefined' && window.localStorage) {
                const localTr = localStorage.getItem(`pkr_active_trainer_${campaignId}`);
                if (localTr && (localTr === '__none__' || targetCamp.trainers?.[localTr])) {
                    activeTrainerId = localTr;
                }
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

    addCampaign: (name: string) => {
        try {
            const { nextData } = applyAddCampaign(get().pcData, name);
            set({ pcData: nextData, activeBoxIndex: 0 });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to add campaign:', e);
        }
    },

    deleteCampaign: (campaignId: string) => {
        try {
            const { pcData } = get();
            const res = applyDeleteCampaign(pcData, campaignId);
            if (!res.success) {
                if (OBR.isAvailable && res.error) {
                    OBR.notification.show(res.error, 'WARNING');
                }
                return false;
            }
            set({ pcData: res.nextData, activeBoxIndex: 0 });
            savePcStorage(res.nextData);
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

            if (!OBR.isAvailable && summary.entityId) {
                const localKey = `pkr_char_${summary.entityId}`;
                const existing = localStorage.getItem(localKey);
                if (existing) {
                    try {
                        const parsed = JSON.parse(existing);
                        const merged = {
                            ...parsed,
                            ...(summary.fullMetadata || {}),
                            nickname: summary.name || parsed.nickname
                        };
                        localStorage.setItem(localKey, JSON.stringify(merged));
                        window.dispatchEvent(new Event('pkr-local-data-changed'));
                    } catch {}
                }
            }
        } catch (e) {
            console.error('[PcSlice] Failed to update pokemon summary:', e);
        }
    },

    updateTrainerProfile: (trainerId: string, updates: Partial<import('../../types/pcStorageTypes').TrainerRoster>) => {
        try {
            const { pcData } = get();
            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (!camp || !camp.trainers[trainerId]) return;

            const existing = camp.trainers[trainerId];
            const updatedTrainer = { ...existing, ...updates };
            const nextData = {
                ...pcData,
                campaigns: {
                    ...pcData.campaigns,
                    [pcData.activeCampaignId]: {
                        ...camp,
                        trainers: {
                            ...camp.trainers,
                            [trainerId]: updatedTrainer
                        }
                    }
                }
            };
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

            if (OBR.isAvailable) {
                OBR.broadcast
                    .sendMessage(
                        `${EXTENSION_ID}/pc-pokemon-delete`,
                        {
                            campaignId: pcData.activeCampaignId,
                            entityId,
                            pokemonName: options?.pokemonName || summary?.name || summary?.species,
                            wasUnlinked: options?.wasUnlinked
                        },
                        { destination: 'REMOTE' }
                    )
                    .catch(() => {});
            }
        } catch (e) {
            console.error('[PcSlice] Failed to delete pokemon from PC:', e);
        }
    },

    setPendingReview: (payload: SheetReviewPayload | null) => {
        set({ pendingReview: payload });
    },

    openReviewModal: (payload: SheetReviewPayload) => {
        set({ pendingReview: payload, isReviewModalOpen: true });
    },

    closeReviewModal: () => {
        set({ pendingReview: null, isReviewModalOpen: false });
    },

    applyReviewDiffs: (entityId: string, diffs: SheetFieldDiff[]) => {
        try {
            const { pcData, pendingReview } = get();
            const summary = pcData.pokemonSummaries[entityId];
            if (!summary) return;

            const updatedSummary = applyReviewDiffsToSummary(summary, diffs, pendingReview?.incomingSummary);
            const nextData = applyUpdateSummary(pcData, updatedSummary);

            set({ pcData: nextData, pendingReview: null, isReviewModalOpen: false });
            savePcStorage(nextData);
        } catch (e) {
            console.error('[PcSlice] Failed to apply review diffs:', e);
        }
    }
});
