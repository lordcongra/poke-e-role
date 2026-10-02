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
    unlinkPokemonFromPcOps,
    clearTokenClaimOps
} from '../../../utils/pc/pcModalOps';
import { checkTrainerOnMap, buildLinkedTrainer } from '../../../utils/pc/pcTrainerOps';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import {
    prepareDepositSummary,
    validateDepositTarget,
    clonePokemonSummaryOps,
    stampClaimOnSceneItem
} from '../../../utils/pc/pcDepositOps';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import { executeCloudExport, executeCloudRestore } from '../../../utils/pc/pcCloudModalOps';
import { relinkPokemonArtworkOps } from '../../../utils/pc/pcTokenImageOps';
import { broadcastPlayerPc } from '../../../hooks/owlbearSync/setupOwlbearPcSync';

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

    const saveTrainerProfile = (nextTrainer: TrainerRoster) => {
        if (!campaign) return;
        const nextData = {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...campaign,
                    trainers: { ...campaign.trainers, [nextTrainer.id]: nextTrainer }
                }
            }
        };
        useCharacterStore.setState({ pcData: nextData });
        savePcStorage(nextData);
    };

    // Detect if the trainer token is currently placed on the active battle scene
    useEffect(() => {
        let mounted = true;
        const check = async () => {
            const prevHp = trainer?.fullMetadata?.['hp-curr'];
            const onMap = await checkTrainerOnMap(trainer);
            if (mounted) {
                setIsTrainerOnMap(onMap);
                if (onMap && trainer && campaign && trainer.fullMetadata?.['hp-curr'] !== prevHp) {
                    saveTrainerProfile({ ...trainer });
                }
            }
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
            saveTrainerProfile(nextTrainer);
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
        if (role !== 'GM') {
            if (isEntityLockedByGm(savedItem) || isEntityLockedByGm(trainer)) {
                if (OBR.isAvailable) {
                    OBR.notification.show(
                        'Cannot link: This trainer token is locked by the GM. Ask your GM to unlock it.',
                        'WARNING'
                    );
                }
                return;
            }
            const myId = OBR.isAvailable ? await OBR.player.getId().catch(() => undefined) : undefined;
            const claim = savedItem?.metadata?.['pokerole-pmd-extension/claimed-by'] as
                | { playerId?: string }
                | undefined;
            if (claim?.playerId && myId && claim.playerId !== myId) {
                if (OBR.isAvailable) {
                    OBR.notification.show('Cannot link: This trainer token belongs to another player.', 'WARNING');
                }
                return;
            }
        }
        const nextTrainer = {
            ...buildLinkedTrainer(trainer, store, trainerName, identity.tokenImageUrl || undefined),
            savedTokenItem: savedItem
        };
        saveTrainerProfile(nextTrainer);

        if (OBR.isAvailable) {
            OBR.notification.show(`Linked "${trainerName}" to Pokéball Belt!`, 'SUCCESS');
        }
    };

    const handleUnlinkTrainer = () => {
        if (!trainer || !campaign) return;
        saveTrainerProfile({ ...trainer, isLinked: false, avatarUrl: undefined });

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
        if (result.success && result.newMapTokenId) {
            updatePokemonSummary({
                ...summary,
                isOnMap: true,
                mapTokenId: result.newMapTokenId
            });
        } else {
            console.error('[usePcModalHandlers] Failed to send out Pokémon to map:', summary);
            if (OBR.isAvailable) {
                OBR.notification.show(`Failed to send out ${summary.name || summary.species} to the map.`, 'ERROR');
            }
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

        try {
            const updated = await relinkPokemonArtworkOps(summary);
            if (updated) {
                updatePokemonSummary(updated);
                if (OBR.isAvailable) {
                    OBR.notification.show(
                        `Relinked artwork for ${updated.name || updated.species || 'Pokémon'}!`,
                        'INFO'
                    );
                }
            }
        } catch (e) {
            console.error('[PcModalHandlers] Failed to relink artwork:', e);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to relink token artwork.', 'ERROR');
            }
        }
    };

    const handleClonePokemon = (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;

        const { clonedSummary, clonedId } = clonePokemonSummaryOps(summary);
        updatePokemonSummary(clonedSummary);
        depositPokemonToBox(clonedId, activeBoxIndex);
    };

    const handleUnlinkPokemon = async (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        await unlinkPokemonFromPcOps(summary, role || 'PLAYER', (s, ownerId, r) =>
            spawnPokemonToMap(s, ownerId, r, trainer)
        );
        deletePokemonFromPc(entityId);
        if (sheetViewEntityId === entityId) setSheetViewEntityId(null);
        if (releaseConfirmPokemon?.entityId === entityId) setReleaseConfirmPokemon(null);
        if (OBR.isAvailable) {
            OBR.notification.show(
                `Unlinked "${summary.name || summary.species}" from PC. Placed on battle map.`,
                'INFO'
            );
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
        await executeCloudExport(
            customSceneName,
            currentBox,
            campaign,
            pcData,
            trainer,
            includeParty,
            includeTrainer,
            targetMode,
            backupAllBoxes
        );
    };

    const handleDownloadBox = async () => {
        if (!campaign) return;
        const myId = OBR.isAvailable ? await OBR.player.getId().catch(() => undefined) : undefined;
        await executeCloudRestore(campaign.name, pcData, activeBoxIndex, role, myId);
    };

    const handleCompleteDeposit = async (summary: PcPokemonSummary) => {
        const finalSummary = await prepareDepositSummary(
            summary,
            trainer,
            pcData.pokemonSummaries,
            useCharacterStore.getState(),
            campaign?.id
        );

        const myId = OBR.isAvailable ? await OBR.player.getId().catch(() => undefined) : undefined;
        const validation = validateDepositTarget(
            finalSummary,
            trainer,
            campaign,
            depositTarget?.targetSlot?.type,
            pcData.campaigns,
            role,
            myId
        );
        if (!validation.allowed) {
            if (OBR.isAvailable && validation.reason) {
                OBR.notification.show(validation.reason, 'WARNING');
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
            const mapTokenId = finalSummary.mapTokenId || finalSummary.savedTokenItem?.id;
            if (mapTokenId) {
                const claimTrainerName =
                    trainer?.name || (campaign?.activeTrainerId === '__none__' ? 'Expedition Team' : undefined);
                stampClaimOnSceneItem(mapTokenId, finalSummary.entityId, claimTrainerName).catch(() => {});
            }
            if (role !== 'GM') {
                broadcastPlayerPc();
            }
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
