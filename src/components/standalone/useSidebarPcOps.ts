import { useState, useEffect, useMemo, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { filterTrainersForRole, getCachedObrPlayerId, setCachedObrPlayerId } from '@/utils/pc/pcActiveTrainerOps';
import {
    isTrainerMetadata,
    organizeTrainerSidebarFolders,
    syncSidebarFolderRenameToPc,
    syncSidebarCharacterRenameToPc,
    syncSidebarMoveToPc,
    autoHealTrainerBeltPokemon
} from '@/utils/pc/pcSidebarSync';
import type { LocalCharacter, LocalFolder } from '@/utils/sync/storageAdapter';
import type { TreeItem } from './sidebarTypes';

export function useSidebarPcOps() {
    const pcData = useCharacterStore((state) => state.pcData);
    const role = useCharacterStore((state) => state.role);
    const activeTokenId = useCharacterStore((state) => state.tokenId);

    // PC Storage Modal Docking & Selection State
    const isPcModalOpen = useCharacterStore((state) => state.isPcModalOpen);
    const openPcModal = useCharacterStore((state) => state.openPcModal);
    const closePcModal = useCharacterStore((state) => state.closePcModal);
    const activeBoxIndex = useCharacterStore((state) => state.activeBoxIndex);
    const setActiveBoxIndex = useCharacterStore((state) => state.setActiveBoxIndex);
    const selectedPcSlot = useCharacterStore((state) => state.selectedPcSlot);
    const setSelectedPcSlot = useCharacterStore((state) => state.setSelectedPcSlot);

    // Deposit / Withdraw & Mutators
    const switchTrainer = useCharacterStore((state) => state.switchTrainer);
    const movePokemonToParty = useCharacterStore((state) => state.movePokemonToParty);
    const depositPokemonToBox = useCharacterStore((state) => state.depositPokemonToBox);
    const setPartySlot = useCharacterStore((state) => state.setPartySlot);
    const setBoxSlot = useCharacterStore((state) => state.setBoxSlot);
    const swapPcSlots = useCharacterStore((state) => state.swapPcSlots);
    const addTrainer = useCharacterStore((state) => state.addTrainer);
    const deleteTrainer = useCharacterStore((state) => state.deleteTrainer);
    const deletePokemonFromPc = useCharacterStore((state) => state.deletePokemonFromPc);

    const [myPlayerId, setMyPlayerId] = useState<string | undefined>(() => getCachedObrPlayerId());

    useEffect(() => {
        if (OBR.isAvailable) {
            OBR.player
                .getId()
                .then((id) => {
                    setMyPlayerId(id);
                    setCachedObrPlayerId(id);
                })
                .catch(() => {});
        }
    }, []);

    const isGm = role === 'GM' || !OBR.isAvailable;

    // Party synchronization: Map of entityId -> active Belt slot number and Trainer name
    // Strictly adheres to Non-GM Trainer Isolation via filterTrainersForRole
    const partyMemberMap = useMemo(() => {
        const map: Record<string, { trainerName: string; slotNumber: number }> = {};
        if (!pcData?.campaigns) return map;
        const summaries = pcData.pokemonSummaries || {};

        for (const camp of Object.values(pcData.campaigns)) {
            const visibleTrainers = filterTrainersForRole(camp.trainers, myPlayerId, isGm, activeTokenId);
            for (const tr of Object.values(visibleTrainers)) {
                if (!tr.party) continue;
                tr.party.forEach((entityId, idx) => {
                    if (entityId) {
                        map[entityId] = { trainerName: tr.name, slotNumber: idx + 1 };
                        const sum = summaries[entityId];
                        if (sum) {
                            if (sum.savedTokenItem?.id) {
                                map[sum.savedTokenItem.id] = { trainerName: tr.name, slotNumber: idx + 1 };
                            }
                            if (sum.mapTokenId) {
                                map[sum.mapTokenId] = { trainerName: tr.name, slotNumber: idx + 1 };
                            }
                            if (sum.name) {
                                map[`__name_${sum.name.trim().toLowerCase()}`] = {
                                    trainerName: tr.name,
                                    slotNumber: idx + 1
                                };
                            }
                            if (sum.species) {
                                map[`__species_${sum.species.trim().toLowerCase()}`] = {
                                    trainerName: tr.name,
                                    slotNumber: idx + 1
                                };
                            }
                        }
                    }
                });
            }
        }
        return map;
    }, [pcData, isGm, myPlayerId, activeTokenId]);

    const handleOpenPc = useCallback(
        (item: TreeItem) => {
            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (camp) {
                let matchedTrainer = Object.values(camp.trainers).find(
                    (t) =>
                        t.id === item.id ||
                        t.savedTokenItem?.id === item.id ||
                        t.mapTokenId === item.id ||
                        t.fullMetadata?.entityId === item.id ||
                        t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                if (!matchedTrainer) {
                    addTrainer(item.name, {
                        existingCharacterId: item.id,
                        isLinked: true
                    });
                    const updatedCamp =
                        useCharacterStore.getState().pcData.campaigns[
                            useCharacterStore.getState().pcData.activeCampaignId
                        ];
                    matchedTrainer = Object.values(updatedCamp?.trainers || {}).find(
                        (t) =>
                            t.id === item.id ||
                            t.savedTokenItem?.id === item.id ||
                            t.mapTokenId === item.id ||
                            t.fullMetadata?.entityId === item.id ||
                            t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                    );
                }
                if (matchedTrainer) {
                    switchTrainer(matchedTrainer.id);
                }
            }
            openPcModal();
        },
        [pcData, addTrainer, switchTrainer, openPcModal]
    );

    const handleOrganizeTrainerFolders = useCallback(
        async (item: TreeItem, onOrganized?: () => void) => {
            if (item.type !== 'character' || !isTrainerMetadata(item.meta)) return;

            const camp = pcData.campaigns[pcData.activeCampaignId];
            if (!camp) return;

            let matchedTrainer = Object.values(camp.trainers).find(
                (t) =>
                    t.id === item.id ||
                    t.savedTokenItem?.id === item.id ||
                    t.mapTokenId === item.id ||
                    t.fullMetadata?.entityId === item.id ||
                    t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
            );

            if (!matchedTrainer) {
                addTrainer(item.name, {
                    existingCharacterId: item.id,
                    isLinked: true
                });
                const updatedCamp =
                    useCharacterStore.getState().pcData.campaigns[useCharacterStore.getState().pcData.activeCampaignId];
                matchedTrainer = Object.values(updatedCamp?.trainers || {}).find(
                    (t) =>
                        t.id === item.id ||
                        t.savedTokenItem?.id === item.id ||
                        t.mapTokenId === item.id ||
                        t.fullMetadata?.entityId === item.id ||
                        t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
            }

            if (!matchedTrainer) {
                matchedTrainer = {
                    id: item.id,
                    name: item.name,
                    isLinked: true,
                    mapTokenId: item.id,
                    party: [null, null, null, null, null, null],
                    boxes: [{ id: `box_1_${Date.now()}`, name: 'Box 1', slots: new Array(30).fill(null) }]
                };
            }

            const activeBoxes =
                matchedTrainer.boxes && matchedTrainer.boxes.length > 0 ? matchedTrainer.boxes : camp.boxes || [];
            const res = await organizeTrainerSidebarFolders(matchedTrainer, activeBoxes);
            if (res.success) {
                onOrganized?.();
                alert(
                    `Organized folders for ${item.name}!\n` +
                        (res.createdBelt ? '• Created Belt folder\n' : '') +
                        (res.createdBoxes > 0 ? `• Created ${res.createdBoxes} Box folder(s)\n` : '') +
                        `• Moved ${res.movedPokemonCount} Pokémon sheet(s) into their matching folders.`
                );
            } else {
                alert(`Unable to organize folders for ${item.name}. Please ensure Pokémon are assigned in PC Storage.`);
            }
        },
        [pcData, addTrainer]
    );

    const syncFolderRename = useCallback((id: string, oldName: string, newName: string) => {
        syncSidebarFolderRenameToPc(id, oldName, newName, useCharacterStore.getState().pcData).catch(console.warn);
    }, []);

    const syncCharacterRename = useCallback((id: string, newName: string) => {
        syncSidebarCharacterRenameToPc(id, newName, useCharacterStore.getState().pcData).catch(console.warn);
    }, []);

    const syncMoveToPc = useCallback((id: string, newParentId: string | null) => {
        syncSidebarMoveToPc(id, newParentId, useCharacterStore.getState().pcData).catch(console.warn);
    }, []);

    const autoHealBelt = useCallback(async (chars: LocalCharacter[], flds: LocalFolder[]) => {
        await autoHealTrainerBeltPokemon(chars, flds, useCharacterStore.getState().pcData);
    }, []);

    const cleanUpPcOnDelete = useCallback(
        (item: TreeItem) => {
            deletePokemonFromPc(item.id);
            if (isTrainerMetadata(item.meta)) {
                const camp = pcData.campaigns[pcData.activeCampaignId];
                if (camp) {
                    const match = Object.values(camp.trainers).find(
                        (t) =>
                            t.id === item.id ||
                            t.mapTokenId === item.id ||
                            t.savedTokenItem?.id === item.id ||
                            t.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                    );
                    if (match) {
                        deleteTrainer(match.id, { deleteBelt: false, deletePc: false });
                    }
                }
            }
        },
        [deletePokemonFromPc, deleteTrainer, pcData]
    );

    return {
        pcData,
        partyMemberMap,
        isPcModalOpen,
        openPcModal,
        closePcModal,
        activeBoxIndex,
        setActiveBoxIndex,
        selectedPcSlot,
        setSelectedPcSlot,
        movePokemonToParty,
        depositPokemonToBox,
        setPartySlot,
        setBoxSlot,
        swapPcSlots,
        handleOpenPc,
        handleOrganizeTrainerFolders,
        syncFolderRename,
        syncCharacterRename,
        syncMoveToPc,
        autoHealBelt,
        cleanUpPcOnDelete,
        isGm,
        myPlayerId
    };
}

