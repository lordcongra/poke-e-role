import { useEffect, useState } from 'react';
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
    spawnTrainerToMap,
    recallPokemonFromMap,
    exportBoxCloud,
    syncToActiveScene,
    importBoxCloud,
    unlinkPokemonFromPcOps,
    clearTokenClaimOps
} from '../../../utils/pc/pcModalOps';
import { checkTrainerOnMap, buildLinkedTrainer } from '../../../utils/pc/pcTrainerOps';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { prepareDepositSummary } from '../../../utils/pc/pcDepositOps';
import { markBackupComplete } from '../../../utils/sync/storageAdapter';

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
        themePrimaryOverride?: string;
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
    const [isTrainerOnMap, setIsTrainerOnMap] = useState(false);

    // Detect if the trainer token is currently placed on the active battle scene
    useEffect(() => {
        let mounted = true;
        const check = async () => {
            const onMap = await checkTrainerOnMap(trainer);
            if (mounted) setIsTrainerOnMap(onMap);
        };
        check();
        if (OBR.isAvailable) {
            const unsub = OBR.scene.items.onChange(check);
            return () => {
                mounted = false;
                unsub();
            };
        }
    }, [trainer?.id, trainer?.name, trainer?.mapTokenId]);

    // Auto-sync trainer name and avatar if actively linked to current sheet
    useEffect(() => {
        if (!trainer || !campaign || !isTrainerLinked || !canLinkActiveTrainer) return;
        const currentName = identity.nickname || identity.species;
        if (!currentName) return;
        const currentAvatar = identity.tokenImageUrl || undefined;
        if (
            trainer.name !== currentName ||
            (currentAvatar && trainer.avatarUrl !== currentAvatar) ||
            trainer.fullMetadata?.['theme-primary-override'] !== identity.themePrimaryOverride
        ) {
            const store = useCharacterStore.getState();
            const nextTrainer = buildLinkedTrainer(trainer, store, currentName, currentAvatar);
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
        }
    }, [
        isTrainerLinked,
        canLinkActiveTrainer,
        trainer,
        campaign,
        identity.nickname,
        identity.species,
        identity.tokenImageUrl,
        identity.themePrimaryOverride,
        pcData
    ]);

    const handleLinkActiveTrainer = async () => {
        if (!trainer || !campaign) return;
        if (!canLinkActiveTrainer) {
            const store = useCharacterStore.getState();
            const activeTokenId = store.tokenId;
            const activeTrainerName = (identity.nickname || identity.species || '').trim();
            const otherTrainer = Object.values(campaign.trainers).find(
                (t) =>
                    t.id !== trainer.id &&
                    ((activeTokenId && (t.mapTokenId === activeTokenId || t.savedTokenItem?.id === activeTokenId)) ||
                        (t.isLinked && activeTrainerName && t.name.toLowerCase() === activeTrainerName.toLowerCase()))
            );
            if (OBR.isAvailable) {
                if (otherTrainer) {
                    OBR.notification.show(
                        `Cannot link: This token is already linked to Trainer "${otherTrainer.name}".`,
                        'WARNING'
                    );
                } else {
                    OBR.notification.show(
                        'Only tokens set to Trainer or Trainer (Special) mode can be linked to the belt.',
                        'WARNING'
                    );
                }
            }
            return;
        }
        const store = useCharacterStore.getState();
        const trainerName = identity.nickname || identity.species || 'Trainer';
        let savedItem = trainer.savedTokenItem;
        if (OBR.isAvailable && store.tokenId) {
            try {
                const items = await OBR.scene.items.getItems([store.tokenId]);
                if (items.length > 0) savedItem = items[0];
            } catch {}
        }
        const nextTrainer = {
            ...buildLinkedTrainer(trainer, store, trainerName, identity.tokenImageUrl || undefined),
            savedTokenItem: savedItem
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

        const result = await spawnPokemonToMap(summary, undefined, role || 'PLAYER', trainer);
        if (result.alreadyOnMap) {
            if (OBR.isAvailable) {
                OBR.notification.show(`${summary.name || summary.species} is already on the board!`, 'WARNING');
            }
            if (result.newMapTokenId && summary.mapTokenId !== result.newMapTokenId) {
                updatePokemonSummary({
                    ...summary,
                    isOnMap: true,
                    mapTokenId: result.newMapTokenId
                });
            }
            return;
        }
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

        const result = await recallPokemonFromMap(summary.mapTokenId, summary);
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
        const cloneName = `${summary.name || summary.species} (Clone)`;
        const clonedSummary: PcPokemonSummary = {
            ...summary,
            entityId: clonedId,
            name: cloneName,
            isOnMap: false,
            mapTokenId: undefined,
            savedTokenItem: undefined
        };

        if (!OBR.isAvailable && typeof window !== 'undefined' && window.localStorage) {
            try {
                const origRaw =
                    localStorage.getItem(`pkr_char_${entityId}`) ||
                    (summary.savedTokenItem?.id ? localStorage.getItem(`pkr_char_${summary.savedTokenItem.id}`) : null);
                const cloneMeta = origRaw ? JSON.parse(origRaw) : { ...(summary.fullMetadata || {}) };
                cloneMeta.nickname = cloneName;
                cloneMeta.name = cloneName;
                cloneMeta.entityId = clonedId;
                delete cloneMeta.parentId;
                localStorage.setItem(`pkr_char_${clonedId}`, JSON.stringify(cloneMeta));
                clonedSummary.fullMetadata = cloneMeta;
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            } catch (e) {
                console.warn('[usePcModalHandlers] Failed to create local clone sheet:', e);
            }
        }

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
        await clearTokenClaimOps(releaseConfirmPokemon.mapTokenId, releaseConfirmPokemon.entityId);
        deletePokemonFromPc(releaseConfirmPokemon.entityId);
        setReleaseConfirmPokemon(null);
        if (OBR.isAvailable) {
            OBR.notification.show(`Released "${name}" from storage.`, 'INFO');
        }
    };

    const handleDropTrainerToken = async () => {
        if (!trainer) return;
        const res = await spawnTrainerToMap(trainer, role);
        if (res.alreadyOnMap && OBR.isAvailable) {
            OBR.notification.show(`${trainer.name} is already on the board!`, 'WARNING');
        } else if (res.success && res.newMapTokenId && OBR.isAvailable) {
            OBR.notification.show(`Placed ${trainer.name} on the map!`, 'SUCCESS');
        }

        if (res.newMapTokenId && trainer.mapTokenId !== res.newMapTokenId && campaign) {
            const nextTrainer = { ...trainer, mapTokenId: res.newMapTokenId };
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
        }
    };

    const handleConfirmCloudUpload = async (
        customSceneName: string,
        includeParty: boolean = true,
        includeTrainer: boolean = true,
        targetMode: 'cloud' | 'activeScene' = 'cloud',
        backupAllBoxes: boolean = true
    ) => {
        if (!currentBox || !campaign) return;
        setIsExportModalOpen(false);
        const partyIds = includeParty && trainer ? trainer.party : undefined;
        const trainerToExport = includeTrainer && trainer ? trainer : undefined;
        const currentTrainerBoxes = trainer?.boxes && trainer.boxes.length > 0 ? trainer.boxes : campaign.boxes;
        const allBoxesToPass = backupAllBoxes ? currentTrainerBoxes : [currentBox];

        if (targetMode === 'activeScene') {
            const success = await syncToActiveScene(
                currentBox,
                campaign,
                pcData.pokemonSummaries,
                partyIds,
                trainerToExport,
                allBoxesToPass
            );
            if (success) {
                markBackupComplete();
                if (OBR.isAvailable) {
                    const label = backupAllBoxes ? 'All PC' : currentBox.name;
                    OBR.notification.show(`Updated current scene with ${label} Pokémon!`, 'SUCCESS');
                }
            }
            return;
        }

        const success = await exportBoxCloud(
            currentBox,
            campaign,
            pcData.pokemonSummaries,
            customSceneName,
            partyIds,
            trainerToExport,
            allBoxesToPass
        );
        if (success) {
            markBackupComplete();
            if (OBR.isAvailable) {
                OBR.notification.show(`Saved "${customSceneName}" to Owlbear Rodeo Cloud!`, 'SUCCESS');
            }
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
        const finalSummary = await prepareDepositSummary(
            summary,
            trainer,
            pcData.pokemonSummaries,
            useCharacterStore.getState()
        );

        // Prevent duplicate addition if already in party
        const currentParty = trainer ? trainer.party : campaign?.teamParty || [];
        if (depositTarget?.targetSlot?.type === 'party' && currentParty.includes(finalSummary.entityId)) {
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `${finalSummary.name || finalSummary.species} is already in the party!`,
                    'WARNING'
                );
            }
            return;
        }

        updatePokemonSummary(finalSummary);
        if (depositTarget?.targetSlot?.type === 'party') {
            const trId = trainer ? trainer.id : '__none__';
            setPartySlot(trId, depositTarget.targetSlot.index, finalSummary.entityId);
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
        isTrainerOnMap,
        handleLinkActiveTrainer,
        handleUnlinkTrainer,
        handleSendOut,
        handleRecall,
        handleRelinkArtwork,
        handleClonePokemon,
        handleUnlinkPokemon,
        handleReleasePokemon,
        handleConfirmRelease,
        handleDropTrainerToken,
        handleConfirmCloudUpload,
        handleDownloadBox,
        handleCompleteDeposit
    };
}
