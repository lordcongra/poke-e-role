import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type {
    PcPokemonSummary,
    PcBox,
    CampaignProfile,
    TrainerRoster,
    PcStorageData
} from '../../../types/pcStorageTypes';
import {
    spawnPokemonToMap,
    recallPokemonFromMap,
    exportBoxCloud,
    importBoxCloud,
    unlinkPokemonFromPcOps,
    clearTokenClaimOps
} from '../../../utils/pc/pcModalOps';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';

interface UsePcModalHandlersParams {
    pcData: PcStorageData;
    campaign?: CampaignProfile;
    trainer?: TrainerRoster;
    currentBox?: PcBox;
    activeBoxIndex: number;
    role?: 'PLAYER' | 'GM';
    identity: {
        nickname?: string;
        species?: string;
        tokenImageUrl?: string | null;
    };
    canLinkActiveTrainer: boolean;
    depositTarget: { targetSlot?: { type: 'party' | 'box'; index: number } } | null;
    setDepositTarget: (target: { targetSlot?: { type: 'party' | 'box'; index: number } } | null) => void;
    releaseConfirmPokemon: PcPokemonSummary | null;
    setReleaseConfirmPokemon: (p: PcPokemonSummary | null) => void;
    sheetViewEntityId: string | null;
    setSheetViewEntityId: (id: string | null) => void;
    setIsExportModalOpen: (open: boolean) => void;
    updatePokemonSummary: (summary: PcPokemonSummary) => void;
    deletePokemonFromPc: (entityId: string) => void;
    depositPokemonToBox: (entityId: string, boxIndex?: number) => boolean;
    setPartySlot: (trainerId: string, slotIndex: number, entityId: string | null) => void;
    setBoxSlot: (boxIndex: number, slotIndex: number, entityId: string | null) => void;
}

export function usePcModalHandlers(params: UsePcModalHandlersParams) {
    const {
        pcData,
        campaign,
        trainer,
        currentBox,
        activeBoxIndex,
        role,
        identity,
        canLinkActiveTrainer,
        depositTarget,
        releaseConfirmPokemon,
        setReleaseConfirmPokemon,
        sheetViewEntityId,
        setSheetViewEntityId,
        setIsExportModalOpen,
        updatePokemonSummary,
        deletePokemonFromPc,
        depositPokemonToBox,
        setPartySlot,
        setBoxSlot
    } = params;

    const isTrainerLinked = !!trainer?.isLinked || !!trainer?.avatarUrl;

    const handleLinkActiveTrainer = () => {
        if (!trainer || !campaign) return;
        if (!canLinkActiveTrainer) {
            if (OBR.isAvailable) {
                OBR.notification.show(
                    'Only tokens set to Trainer or Trainer (Special) mode can be linked to the belt.',
                    'WARNING'
                );
            }
            return;
        }
        const trainerName = identity.nickname || identity.species || 'Trainer';
        const nextTrainer = {
            ...trainer,
            name: trainerName,
            avatarUrl: identity.tokenImageUrl || trainer.avatarUrl,
            isLinked: true
        };
        const nextData = {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...campaign,
                    trainers: { ...campaign.trainers, [trainer.id]: nextTrainer }
                }
            }
        };
        useCharacterStore.setState({ pcData: nextData });
        savePcStorage(nextData);

        if (OBR.isAvailable) {
            OBR.notification.show(`Linked "${trainerName}" to Pokéball Belt!`, 'SUCCESS');
        }
    };

    const handleUnlinkTrainer = () => {
        if (!trainer || !campaign) return;
        const nextTrainer = { ...trainer, isLinked: false, avatarUrl: undefined };
        const nextData = {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...campaign,
                    trainers: { ...campaign.trainers, [trainer.id]: nextTrainer }
                }
            }
        };
        useCharacterStore.setState({ pcData: nextData });
        savePcStorage(nextData);

        if (OBR.isAvailable) {
            OBR.notification.show(`Unlinked "${trainer.name}" from Belt.`, 'INFO');
        }
    };

    const handleSendOut = async (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;

        const result = await spawnPokemonToMap(summary, undefined, role || 'PLAYER');
        if (result.success) {
            updatePokemonSummary({
                ...summary,
                isOnMap: true,
                mapTokenId: result.newMapTokenId
            });
        }
    };

    const handleRecall = async (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;

        const result = await recallPokemonFromMap(summary.mapTokenId);
        if (result.success) {
            updatePokemonSummary({
                ...summary,
                isOnMap: false,
                mapTokenId: undefined,
                attachedItems: result.attachedItems !== undefined ? result.attachedItems : summary.attachedItems,
                hp: result.currentHp ?? summary.hp,
                maxHp: result.maxHp ?? summary.maxHp,
                will: result.currentWill ?? summary.will,
                maxWill: result.maxWill ?? summary.maxWill,
                savedTokenItem: result.savedTokenItem ?? summary.savedTokenItem,
                fullMetadata: result.fullMetadata ?? summary.fullMetadata
            });
        }
    };

    const handleRelinkArtwork = async (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;

        if (OBR.isAvailable) {
            try {
                const images = await OBR.assets.downloadImages(false);
                if (images && images.length > 0) {
                    const selectedUrl = images[0].image?.url;
                    if (selectedUrl) {
                        updatePokemonSummary({
                            ...summary,
                            tokenImageUrl: selectedUrl
                        });
                    }
                }
            } catch (e) {
                console.error('[PcModalHandlers] Failed to pick image from Owlbear:', e);
            }
        }
    };

    const handleClonePokemon = (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;

        const clonedId = crypto.randomUUID();
        const clonedSummary = {
            ...summary,
            entityId: clonedId,
            name: `${summary.name || summary.species} (Clone)`,
            isOnMap: false,
            mapTokenId: undefined
        };
        updatePokemonSummary(clonedSummary);
        depositPokemonToBox(clonedId, activeBoxIndex);
    };

    const handleUnlinkPokemon = async (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        await unlinkPokemonFromPcOps(summary, role || 'PLAYER');
        deletePokemonFromPc(entityId);
        if (sheetViewEntityId === entityId) setSheetViewEntityId(null);
        if (releaseConfirmPokemon?.entityId === entityId) setReleaseConfirmPokemon(null);
        if (OBR.isAvailable) {
            OBR.notification.show(`Unlinked "${summary.name || summary.species}" from PC. Left on battle map.`, 'INFO');
        }
    };

    const handleReleasePokemon = (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        setReleaseConfirmPokemon(summary);
    };

    const handleConfirmRelease = async () => {
        if (!releaseConfirmPokemon) return;
        const name = releaseConfirmPokemon.name || releaseConfirmPokemon.species;
        if (sheetViewEntityId === releaseConfirmPokemon.entityId) {
            setSheetViewEntityId(null);
        }
        await clearTokenClaimOps(releaseConfirmPokemon.mapTokenId);
        deletePokemonFromPc(releaseConfirmPokemon.entityId);
        setReleaseConfirmPokemon(null);
        if (OBR.isAvailable) {
            OBR.notification.show(`Released "${name}" from storage.`, 'INFO');
        }
    };

    const handleConfirmCloudUpload = async (customSceneName: string) => {
        if (!currentBox || !campaign) return;
        setIsExportModalOpen(false);
        const success = await exportBoxCloud(currentBox, campaign, pcData.pokemonSummaries, customSceneName);
        if (success && OBR.isAvailable) {
            OBR.notification.show(`Saved "${customSceneName}" to Owlbear Rodeo Cloud!`, 'SUCCESS');
        }
    };

    const handleDownloadBox = async () => {
        if (!campaign || !currentBox) return;
        const imported = await importBoxCloud(campaign);
        if (imported.length > 0) {
            for (const sum of imported) {
                updatePokemonSummary(sum);
                depositPokemonToBox(sum.entityId, activeBoxIndex);
            }
            if (OBR.isAvailable) {
                OBR.notification.show(`Imported ${imported.length} Pokémon into "${currentBox.name}"!`, 'SUCCESS');
            }
        }
    };

    const handleCompleteDeposit = async (summary: PcPokemonSummary) => {
        let finalSummary = { ...summary };
        if (trainer && !finalSummary.trainerId) {
            finalSummary.trainerId = trainer.id;
        }
        if (!finalSummary.fullMetadata) {
            finalSummary.fullMetadata = flattenStateToMetadata(useCharacterStore.getState());
        }
        if (!finalSummary.savedTokenItem && OBR.isAvailable && finalSummary.mapTokenId) {
            try {
                const items = await OBR.scene.items.getItems([finalSummary.mapTokenId]);
                if (items.length > 0) {
                    finalSummary.savedTokenItem = items[0];
                }
            } catch (e) {
                console.warn('[PcModalHandlers] Failed to get map token for deposit:', e);
            }
        }

        // Stamp claim on map token
        if (OBR.isAvailable && finalSummary.mapTokenId) {
            try {
                const myId = await OBR.player.getId();
                const myName = await OBR.player.getName();
                await OBR.scene.items.updateItems([finalSummary.mapTokenId], (items) => {
                    for (const it of items) {
                        it.metadata['pokerole-pmd-extension/claimed-by'] = {
                            playerId: myId,
                            playerName: myName,
                            entityId: finalSummary.entityId,
                            trainerName: trainer?.name
                        };
                    }
                });
            } catch (e) {
                console.warn('[PcModalHandlers] Failed to stamp claimed-by on deposit:', e);
            }
        }

        updatePokemonSummary(finalSummary);
        if (depositTarget?.targetSlot?.type === 'party' && trainer) {
            setPartySlot(trainer.id, depositTarget.targetSlot.index, finalSummary.entityId);
        } else if (depositTarget?.targetSlot?.type === 'box') {
            setBoxSlot(activeBoxIndex, depositTarget.targetSlot.index, finalSummary.entityId);
        } else {
            depositPokemonToBox(finalSummary.entityId, activeBoxIndex);
        }

        if (OBR.isAvailable) {
            OBR.notification.show(`Deposited ${finalSummary.name || finalSummary.species} to storage!`, 'INFO');
        }
    };

    return {
        isTrainerLinked,
        handleLinkActiveTrainer,
        handleUnlinkTrainer,
        handleSendOut,
        handleRecall,
        handleRelinkArtwork,
        handleClonePokemon,
        handleUnlinkPokemon,
        handleReleasePokemon,
        handleConfirmRelease,
        handleConfirmCloudUpload,
        handleDownloadBox,
        handleCompleteDeposit
    };
}
