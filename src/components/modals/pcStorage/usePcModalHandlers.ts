import { useEffect, useState, useRef } from 'react';
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
    unlinkPokemonFromPcOps,
    clearTokenClaimOps,
    executeRecallWorkflow,
    executeSendOutWorkflow
} from '../../../utils/pc/pcModalOps';
import {
    checkTrainerOnMap,
    executeLinkActiveTrainer,
    isTrainerLinkedToActiveSheet
} from '../../../utils/pc/pcTrainerOps';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import {
    prepareDepositSummary,
    validateDepositTargetAsync,
    clonePokemonSummaryOps,
    stampClaimOnSceneItem
} from '../../../utils/pc/pcDepositOps';
import { executeCloudExport, executeCloudRestore } from '../../../utils/pc/pcCloudModalOps';
import { relinkPokemonArtworkOps } from '../../../utils/pc/pcTokenImageOps';
import { broadcastPlayerPc, broadcastGmPc } from '../../../hooks/owlbearSync/setupOwlbearPcSync';
import {
    isOwnershipConflict,
    executeGmClaimOverride,
    type GmClaimConflict
} from '../../../utils/pc/pcClaimOverrideOps';
import { initiatePointPlacement, getPlacementModePreference } from '../../../utils/pc/pcPlacementInteraction';

interface UsePcModalHandlersParams {
    pcData: PcStorageData;
    campaign?: CampaignProfile;
    trainer?: TrainerRoster;
    currentBox?: PcBox;
    activeBoxIndex: number;
    role?: 'PLAYER' | 'GM';
    activeTokenId?: string | null;
    identity: {
        nickname?: string;
        species?: string;
        tokenImageUrl?: string | null;
        themePrimaryOverride?: string;
        mode?: string;
        entityId?: string;
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
    deletePokemonFromPc: (entityId: string, options?: { wasUnlinked?: boolean; pokemonName?: string }) => void;
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
        activeTokenId,
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

    const isTrainerLinked = isTrainerLinkedToActiveSheet(trainer, activeTokenId, identity);
    const [isTrainerOnMap, setIsTrainerOnMap] = useState(false);

    const saveTrainerProfile = (nextTrainer: TrainerRoster) => {
        const currentPcData = useCharacterStore.getState().pcData;
        const targetCampId = campaign?.id || currentPcData.activeCampaignId;
        const currentCamp = currentPcData.campaigns[targetCampId];
        if (!currentCamp) return;
        const nextData = {
            ...currentPcData,
            campaigns: {
                ...currentPcData.campaigns,
                [targetCampId]: {
                    ...currentCamp,
                    trainers: { ...currentCamp.trainers, [nextTrainer.id]: nextTrainer }
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
            const onMap = await checkTrainerOnMap(trainer);
            if (mounted) {
                setIsTrainerOnMap(onMap);
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

    // Auto-sync trainer avatar and theme override ONLY if actively linked to current sheet
    const lastSyncedTrainerRef = useRef<string>('');
    useEffect(() => {
        if (!trainer || !campaign || !isTrainerLinked || !canLinkActiveTrainer) return;
        const currentAvatar = identity.tokenImageUrl || undefined;
        const currentTheme = identity.themePrimaryOverride || '';
        const prevTheme = (trainer.fullMetadata?.['theme-primary-override'] as string) || '';

        const avatarChanged = Boolean(currentAvatar && trainer.avatarUrl !== currentAvatar);
        const themeChanged = prevTheme !== currentTheme;

        const syncKey = `${trainer.id}_${currentAvatar || ''}_${currentTheme}`;
        if (lastSyncedTrainerRef.current === syncKey) return;

        if (avatarChanged || themeChanged) {
            lastSyncedTrainerRef.current = syncKey;
            const nextTrainer: TrainerRoster = {
                ...trainer,
                avatarUrl: currentAvatar ?? trainer.avatarUrl,
                fullMetadata: {
                    ...(trainer.fullMetadata || {}),
                    ['theme-primary-override']: currentTheme
                }
            };
            saveTrainerProfile(nextTrainer);
        }
    }, [
        isTrainerLinked,
        canLinkActiveTrainer,
        trainer?.id,
        trainer?.avatarUrl,
        (trainer?.fullMetadata?.['theme-primary-override'] as string) || '',
        campaign?.id,
        identity.tokenImageUrl,
        identity.themePrimaryOverride
    ]);

    const handleLinkActiveTrainer = async () => {
        await executeLinkActiveTrainer({
            trainer,
            campaign,
            canLinkActiveTrainer,
            identity,
            role,
            saveTrainerProfile
        });
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

        const useManual = OBR.isAvailable && getPlacementModePreference() === 'manual';
        const result = useManual
            ? await initiatePointPlacement(summary, trainer, role || 'PLAYER')
            : await spawnPokemonToMap(summary, undefined, role || 'PLAYER', trainer);

        if (result.cancelled) return;
        await executeSendOutWorkflow(
            summary,
            {
                success: result.success,
                newMapTokenId: result.newMapTokenId,
                alreadyOnBoard: result.alreadyOnMap
            },
            campaign?.id || pcData.activeCampaignId,
            trainer,
            role,
            updatePokemonSummary
        );
    };

    const handleRecall = async (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        await executeRecallWorkflow(
            summary,
            campaign?.id || pcData.activeCampaignId,
            trainer,
            role,
            updatePokemonSummary
        );
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

    const [releaseModalMode, setReleaseModalMode] = useState<'release' | 'unlink'>('release');

    const handlePromptUnlinkPokemon = (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        setReleaseModalMode('unlink');
        setReleaseConfirmPokemon(summary);
    };

    const handleReleasePokemon = (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        setReleaseModalMode('release');
        setReleaseConfirmPokemon(summary);
    };

    const handleConfirmRelease = async () => {
        if (!releaseConfirmPokemon) return;
        const name = releaseConfirmPokemon.name || releaseConfirmPokemon.species;
        if (sheetViewEntityId === releaseConfirmPokemon.entityId) {
            setSheetViewEntityId(null);
        }

        if (releaseModalMode === 'unlink') {
            await unlinkPokemonFromPcOps(releaseConfirmPokemon, role || 'PLAYER', (s, ownerId, r) =>
                spawnPokemonToMap(s, ownerId, r, trainer)
            );
            deletePokemonFromPc(releaseConfirmPokemon.entityId, { wasUnlinked: true, pokemonName: name });
            setReleaseConfirmPokemon(null);
            if (OBR.isAvailable) {
                OBR.notification.show(`Unlinked "${name}" from PC. Placed on battle map.`, 'INFO');
            }
        } else {
            await clearTokenClaimOps(releaseConfirmPokemon.mapTokenId, releaseConfirmPokemon.entityId);
            deletePokemonFromPc(releaseConfirmPokemon.entityId, { wasUnlinked: false, pokemonName: name });
            setReleaseConfirmPokemon(null);
            if (OBR.isAvailable) {
                OBR.notification.show(`Released "${name}" from storage.`, 'INFO');
            }
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

    const [gmClaimConflict, setGmClaimConflict] = useState<GmClaimConflict | null>(null);
    const isDepositingRef = useRef(false);

    const handleCompleteDeposit = async (
        summary: PcPokemonSummary,
        targetSlotOverride?: { type: 'party' | 'box'; index: number }
    ) => {
        if (isDepositingRef.current) return;
        isDepositingRef.current = true;
        try {
            const effectiveTargetSlot = targetSlotOverride || depositTarget?.targetSlot;
            const myId = OBR.isAvailable ? await OBR.player.getId().catch(() => undefined) : undefined;
            const validation = await validateDepositTargetAsync(
                summary,
                trainer,
                campaign,
                effectiveTargetSlot?.type,
                pcData.campaigns,
                role,
                myId
            );
            if (!validation.allowed) {
                if (role === 'GM' && isOwnershipConflict(validation.reason)) {
                    setGmClaimConflict({
                        summary,
                        targetSlotOverride: effectiveTargetSlot,
                        reason: validation.reason || 'Ownership conflict detected.'
                    });
                    return;
                }
                if (OBR.isAvailable && validation.reason) {
                    OBR.notification.show(validation.reason, 'WARNING');
                }
                return;
            }

            const finalSummary = await prepareDepositSummary(
                summary,
                trainer,
                pcData.pokemonSummaries,
                useCharacterStore.getState(),
                campaign?.id
            );

            updatePokemonSummary(finalSummary);
            if (effectiveTargetSlot?.type === 'party') {
                const trId = trainer ? trainer.id : '__none__';
                setPartySlot(trId, effectiveTargetSlot.index, finalSummary.entityId);
            } else if (effectiveTargetSlot?.type === 'box') {
                setBoxSlot(activeBoxIndex, effectiveTargetSlot.index, finalSummary.entityId);
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
                } else {
                    const latestCamp = useCharacterStore.getState().pcData.campaigns[campaign?.id || ''];
                    const latestTrainer = trainer && latestCamp?.trainers ? latestCamp.trainers[trainer.id] : undefined;
                    broadcastGmPc({
                        campaignId: campaign?.id,
                        trainer: latestTrainer || trainer,
                        summaries: [finalSummary]
                    });
                }
                OBR.notification.show(`Deposited ${finalSummary.name || finalSummary.species} to storage!`, 'INFO');
            }
        } finally {
            isDepositingRef.current = false;
        }
    };

    const handleConfirmGmClaimOverride = async () => {
        if (!gmClaimConflict || !campaign) return;
        const conflictToResolve = gmClaimConflict;
        setGmClaimConflict(null);
        await executeGmClaimOverride({
            conflict: conflictToResolve,
            campaign,
            trainer,
            role,
            activeBoxIndex,
            updatePokemonSummary,
            setPartySlot,
            setBoxSlot,
            depositPokemonToBox,
            prepareDepositSummaryFn: prepareDepositSummary,
            savePcStorageFn: savePcStorage,
            broadcastPlayerPcFn: broadcastPlayerPc,
            broadcastGmPcFn: broadcastGmPc
        });
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
        handleUnlinkPokemon: handlePromptUnlinkPokemon,
        handleReleasePokemon,
        handleConfirmRelease,
        releaseModalMode,
        setReleaseModalMode,
        handleDropTrainerToken,
        handleConfirmCloudUpload,
        handleDownloadBox,
        handleCompleteDeposit,
        gmClaimConflict,
        setGmClaimConflict,
        handleConfirmGmClaimOverride
    };
}
