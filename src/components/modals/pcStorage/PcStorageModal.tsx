import React, { useState, useMemo, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcStorageHeader } from './PcStorageHeader';
import { PcStorageLayout } from './PcStorageLayout';
import { PcBackupWarningBanner } from './PcBackupWarningBanner';
import { PcStorageMobileTabs } from './PcStorageMobileTabs';
import { PcStorageSubModals } from './PcStorageSubModals';
import { PcStorageFallback } from './PcStorageFallback';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import {
    buildActiveCharacterSummary,
    filterTrainerPokemonSummaries,
    findOtherLinkedTrainer
} from '../../../utils/pc/pcModalOps';
import { createDefaultBox } from '../../../utils/pc/pcStorageAdapter';
import { buildTrainerSummary } from '../../../utils/pc/pcTrainerOps';
import { broadcastPlayerPc, broadcastGmPc, requestPlayerPcSync } from '../../../hooks/owlbearSync/setupOwlbearPcSync';
import { buildSheetAvailableSummaries, isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { runOrganizeFoldersAction } from '../../../utils/pc/pcSidebarSync';
import { resolveEffectiveActiveTrainer, filterTrainersForRole } from '../../../utils/pc/pcCampaignTrainerOps';
import { linkAndSpawnTrainerToken } from '../../../utils/pc/pcTrainerTokenOps';
import { cancelPointPlacement } from '../../../utils/pc/pcPlacementInteraction';
import { usePcDragHandlers } from './usePcDragHandlers';
import { PcPlacementBanner } from './PcPlacementBanner';
import { PcMoveModeBanner } from './PcMoveModeBanner';
import { usePcMoveMode } from './usePcMoveMode';
import { usePcModalHandlers } from './usePcModalHandlers';
import { usePcStorageModalSetup } from './usePcStorageModalSetup';
import './PcStorageModal.css';

interface PcStorageModalProps {
    onClose: () => void;
}

export const PcStorageModal: React.FC<PcStorageModalProps> = ({ onClose }) => {
    const pcData = useCharacterStore((s) => s.pcData);
    const activeBoxIndex = useCharacterStore((s) => s.activeBoxIndex);
    const selectedPcSlot = useCharacterStore((s) => s.selectedPcSlot);
    const role = useCharacterStore((s) => s.role);
    const identity = useCharacterStore((s) => s.identity);
    const health = useCharacterStore((s) => s.health);
    const will = useCharacterStore((s) => s.will);
    const activeTokenId = useCharacterStore((s) => s.tokenId);

    // Store Actions
    const {
        setActiveBoxIndex,
        setSelectedPcSlot,
        swapPcSlots,
        movePokemonToParty,
        depositPokemonToBox,
        setPartySlot,
        setBoxSlot,
        addBox,
        deleteBox,
        renameBox,
        setBoxTheme,
        switchTrainer,
        addTrainer,
        deleteTrainer,
        switchCampaign,
        addCampaign,
        editCampaign,
        deleteCampaign,
        updatePokemonSummary,
        updateTrainerProfile,
        renameTrainer,
        reorderTrainers,
        deletePokemonFromPc
    } = useCharacterStore.getState();

    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        isPartySlot: boolean;
        index: number;
        entityId: string;
    } | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [depositTarget, setDepositTarget] = useState<{
        targetSlot?: { type: 'party' | 'box'; index: number };
    } | null>(null);
    const [sheetViewEntityId, setSheetViewEntityId] = useState<string | null>(null);
    const [releaseConfirmPokemon, setReleaseConfirmPokemon] = useState<PcPokemonSummary | null>(null);
    const [mobileTab, setMobileTab] = useState<'party' | 'box'>('party');
    const [isTokenSpawnModalOpen, setIsTokenSpawnModalOpen] = useState(false);

    const {
        myPlayerId,
        isActiveTokenLocked,
        dismissBackupWarning,
        handleDismissWarning,
        desktopPartyLayout,
        handleTogglePartyLayout,
        effectiveIsGm
    } = usePcStorageModalSetup(pcData, activeTokenId, role);

    // Active Campaign & Trainer resolution
    const campaign = pcData.campaigns[pcData.activeCampaignId] || Object.values(pcData.campaigns)[0];
    const isGm = effectiveIsGm;
    const visibleTrainers = useMemo(
        () => filterTrainersForRole(campaign?.trainers, myPlayerId, isGm, activeTokenId),
        [campaign?.trainers, myPlayerId, isGm, activeTokenId]
    );
    const activeRoster =
        campaign?.activeTrainerId === '__none__'
            ? undefined
            : visibleTrainers[campaign?.activeTrainerId] ||
              resolveEffectiveActiveTrainer(campaign, myPlayerId, visibleTrainers);
    const isStorageProfile = Boolean(activeRoster?.profileType === 'storage' || activeRoster?.id?.startsWith('__pmd_'));
    const isPmdMode = Boolean(campaign?.activeTrainerId === '__none__' || isStorageProfile);
    const trainer = isPmdMode ? undefined : activeRoster;

    const handleModalClose = () => {
        cancelPointPlacement().catch(() => {});
        if (OBR.isAvailable) {
            !isGm ? broadcastPlayerPc() : broadcastGmPc({ campaignId: campaign?.id, trainer });
        }
        onClose();
    };
    const partySlots = activeRoster ? activeRoster.party : campaign?.teamParty || Array(6).fill(null);
    const trainerBoxes =
        activeRoster?.boxes && activeRoster.boxes.length > 0 ? activeRoster.boxes : campaign?.boxes || [];
    const currentBox = trainerBoxes[activeBoxIndex] || trainerBoxes[0] || createDefaultBox(0);

    React.useEffect(() => {
        if (campaign && trainerBoxes.length === 0) {
            addBox();
        }
    }, [campaign, trainerBoxes.length, addBox]);

    const currentActiveSummary = buildActiveCharacterSummary(
        identity,
        health,
        will,
        activeTokenId,
        flattenStateToMetadata(useCharacterStore.getState()),
        pcData.pokemonSummaries,
        partySlots
    );
    const trainerPokemonSummaries = filterTrainerPokemonSummaries(pcData.pokemonSummaries, activeRoster, campaign);

    const otherLinkedTrainer = findOtherLinkedTrainer(campaign, trainer?.id, activeTokenId, identity);
    const canLinkActiveTrainer =
        (identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)') &&
        !otherLinkedTrainer &&
        (isGm || !isActiveTokenLocked);

    const {
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
        releaseModalMode,
        handleDropTrainerToken,
        handleConfirmCloudUpload,
        handleDownloadBox,
        handleCompleteDeposit,
        gmClaimConflict,
        setGmClaimConflict,
        handleConfirmGmClaimOverride
    } = usePcModalHandlers({
        pcData,
        campaign,
        trainer,
        currentBox,
        activeBoxIndex,
        role: isGm ? 'GM' : 'PLAYER',
        activeTokenId,
        identity: {
            nickname: identity.nickname,
            species: identity.species,
            mode: identity.mode,
            entityId: identity.entityId,
            tokenImageUrl: identity.tokenImageUrl,
            themePrimaryOverride: identity.themePrimaryOverride
        },
        canLinkActiveTrainer,
        depositTarget,
        setDepositTarget,
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
    });

    const handleOpenCharacterSheet = async (entityId: string) => {
        const currentRole = OBR.isAvailable ? await OBR.player.getRole().catch(() => role) : role;
        const sum = pcData.pokemonSummaries[entityId] || (trainer?.id === entityId ? trainerSummary : null);
        let isLocked = isEntityLockedByGm(sum);
        if (!isLocked && currentRole !== 'GM' && OBR.isAvailable && sum?.mapTokenId) {
            try {
                const sceneItems = await OBR.scene.items.getItems([sum.mapTokenId]);
                if (sceneItems[0] && isEntityLockedByGm(sceneItems[0])) isLocked = true;
            } catch {}
        }
        if (currentRole !== 'GM' && isLocked) {
            if (OBR.isAvailable) {
                OBR.notification.show('This character token is locked by the GM. Ask your GM to unlock it.', 'WARNING');
            }
            return;
        }
        setSheetViewEntityId(entityId);
    };

    const handleOpenTrainerSheet = () => {
        if (!trainer) return;
        if (!isTrainerLinked) {
            setIsTokenSpawnModalOpen(true);
        } else {
            handleOpenCharacterSheet(trainer.id);
        }
    };

    const handleSpawnTrainerToken = async (imageUrl: string) => {
        if (!trainer || !campaign) return;
        const { newMapTokenId } = await linkAndSpawnTrainerToken({
            trainer,
            imageUrl,
            role: role || 'PLAYER',
            pcData,
            campaignId: campaign.id
        });
        setIsTokenSpawnModalOpen(false);
        if (newMapTokenId || !OBR.isAvailable) {
            handleOpenCharacterSheet(trainer.id);
        }
    };

    const trainerSummary: PcPokemonSummary | null = useMemo(
        () => (!isPmdMode && trainer ? buildTrainerSummary(trainer) : null),
        [trainer, isPmdMode]
    );
    const rawActiveSheetSummary =
        (sheetViewEntityId && pcData.pokemonSummaries[sheetViewEntityId]) ||
        (sheetViewEntityId === trainer?.id ? trainerSummary : null);
    const activeSheetSummary = !isGm && isEntityLockedByGm(rawActiveSheetSummary) ? null : rawActiveSheetSummary;

    const sheetAvailableSummaries = useMemo(
        () =>
            buildSheetAvailableSummaries(
                trainer,
                trainerSummary,
                pcData.pokemonSummaries,
                partySlots,
                trainerBoxes,
                isGm ? 'GM' : 'PLAYER'
            ),
        [trainer, trainerSummary, pcData.pokemonSummaries, partySlots, trainerBoxes, isGm]
    );

    const { movingSlot, startMoveMode, handleSlotClick, handleEmptySlotClick, cancelMoveMode } = usePcMoveMode(
        activeBoxIndex,
        swapPcSlots,
        selectedPcSlot,
        setSelectedPcSlot,
        setDepositTarget
    );

    const trainerRef = useRef(trainer);
    trainerRef.current = trainer;

    const handleUpdateSheetSummary = useCallback(
        (summary: PcPokemonSummary) => {
            const currentTrainer = trainerRef.current;
            if (currentTrainer && summary.entityId === currentTrainer.id) {
                updateTrainerProfile(currentTrainer.id, {
                    name: summary.name,
                    avatarUrl: summary.tokenImageUrl,
                    fullMetadata: summary.fullMetadata,
                    savedTokenItem: summary.savedTokenItem
                });
            } else {
                updatePokemonSummary(summary);
            }
        },
        [updateTrainerProfile, updatePokemonSummary]
    );

    const handleOpenContextMenu = (e: React.MouseEvent, isParty: boolean, index: number, entityId: string) => {
        setContextMenu({ x: e.clientX, y: e.clientY, isPartySlot: isParty, index, entityId });
    };

    const handleOrganizeFolders = useCallback(() => {
        runOrganizeFoldersAction(trainer, partySlots, trainerBoxes);
    }, [trainer, partySlots, trainerBoxes]);

    const handleAssignTrainer = useCallback(
        (trainerId: string, playerId?: string, playerName?: string) => {
            updateTrainerProfile(trainerId, {
                playerId: playerId || undefined,
                playerName: playerName || undefined
            });
            if (OBR.isAvailable && role === 'GM') {
                const camp = pcData.campaigns[pcData.activeCampaignId];
                const tr = camp?.trainers[trainerId];
                if (tr) {
                    broadcastGmPc({
                        campaignId: pcData.activeCampaignId,
                        trainer: { ...tr, playerId: playerId || undefined, playerName: playerName || undefined }
                    }).catch(console.warn);
                }
            }
        },
        [pcData, role, updateTrainerProfile]
    );

    const { handlePartyDrop, handleBoxDrop, handleTabDrop, handlePartyDragStart, handleBoxDragStart, handleDragEnd } =
        usePcDragHandlers(activeBoxIndex, swapPcSlots, partySlots, currentBox?.slots);

    if (!campaign || !currentBox) {
        return (
            <PcStorageFallback
                onClose={handleModalClose}
                onCreateCampaign={() => {
                    if (!campaign) addCampaign('Main Adventure');
                    else addBox();
                }}
            />
        );
    }

    const contextSummary = contextMenu ? pcData.pokemonSummaries[contextMenu.entityId] : null;
    const boxTheme = currentBox?.themeColor || 'var(--primary)';

    return (
        <>
            <div className="pc-modal-backdrop" onClick={handleModalClose}>
                <div
                    className={`pc-modal pc-modal--mobile-show-${mobileTab}`}
                    style={{ '--box-theme': boxTheme } as React.CSSProperties}
                    onClick={(e) => e.stopPropagation()}
                >
                    <PcStorageHeader
                        campaigns={pcData.campaigns}
                        activeCampaignId={pcData.activeCampaignId}
                        onSwitchCampaign={switchCampaign}
                        onAddCampaign={addCampaign}
                        onEditCampaign={editCampaign}
                        onDeleteCampaign={deleteCampaign}
                        isGm={isGm}
                        activeRoomCampaignId={identity.activeRoomCampaignId}
                        activeRoomCampaignName={identity.activeRoomCampaignName}
                        activeTrainer={activeRoster}
                        trainers={visibleTrainers}
                        trainerOrder={campaign?.trainerOrder}
                        onReorderTrainers={(order) => campaign && reorderTrainers(campaign.id, order)}
                        onSwitchTrainer={switchTrainer}
                        onAddTrainer={addTrainer}
                        onRenameTrainer={renameTrainer}
                        onDeleteTrainer={deleteTrainer}
                        onAssignTrainer={handleAssignTrainer}
                        boxes={trainerBoxes}
                        activeBoxIndex={activeBoxIndex}
                        onSelectBox={setActiveBoxIndex}
                        onAddBox={addBox}
                        onDeleteBox={deleteBox}
                        onRenameBox={renameBox}
                        onSetBoxTheme={setBoxTheme}
                        onUploadCloud={() => setIsExportModalOpen(true)}
                        onOpenImport={() => setIsImportModalOpen(true)}
                        onSyncPlayers={isGm && OBR.isAvailable ? () => requestPlayerPcSync() : undefined}
                        onOpenGuide={() => setIsGuideModalOpen(true)}
                        onClose={handleModalClose}
                    />

                    <PcPlacementBanner />

                    {movingSlot && <PcMoveModeBanner pokemonName={movingSlot.name} onCancel={cancelMoveMode} />}

                    {!dismissBackupWarning && <PcBackupWarningBanner onDismiss={handleDismissWarning} />}

                    <PcStorageMobileTabs
                        activeTab={mobileTab}
                        onSelectTab={setMobileTab}
                        boxName={currentBox.name}
                        partyCount={partySlots.filter(Boolean).length}
                        isPmdMode={isPmdMode}
                        onTabDrop={handleTabDrop}
                    />

                    <PcStorageLayout
                        desktopPartyLayout={desktopPartyLayout}
                        onTogglePartyLayout={handleTogglePartyLayout}
                        partySlots={partySlots}
                        pokemonSummaries={pcData.pokemonSummaries}
                        selectedPcSlot={selectedPcSlot}
                        trainerName={trainer?.name}
                        trainerSummary={trainerSummary}
                        isPmdMode={isPmdMode}
                        isStorageProfile={isStorageProfile}
                        activeStorageName={isStorageProfile ? activeRoster?.name : undefined}
                        trainerAvatarUrl={trainer?.avatarUrl}
                        activeCharacterName={identity.nickname || identity.species}
                        activeCharacterAvatarUrl={identity.tokenImageUrl || undefined}
                        canLinkActiveTrainer={canLinkActiveTrainer}
                        otherLinkedTrainerName={otherLinkedTrainer?.name}
                        onSelectSlot={handleSlotClick}
                        onEmptySlotClick={handleEmptySlotClick}
                        onContextMenu={handleOpenContextMenu}
                        onOpenSheet={handleOpenCharacterSheet}
                        onRelease={handleReleasePokemon}
                        onSendOut={handleSendOut}
                        onRecall={handleRecall}
                        onPartyDrop={handlePartyDrop}
                        onPartyDragStart={handlePartyDragStart}
                        onDragEnd={handleDragEnd}
                        onLinkActiveTrainer={handleLinkActiveTrainer}
                        isTrainerLinked={isTrainerLinked}
                        isTrainerOnMap={isTrainerOnMap}
                        onUnlinkTrainer={handleUnlinkTrainer}
                        onOpenTrainerSheet={trainer ? handleOpenTrainerSheet : undefined}
                        onDropTrainerToken={handleDropTrainerToken}
                        onOrganizeFolders={!OBR.isAvailable ? handleOrganizeFolders : undefined}
                        currentBox={currentBox}
                        onOpenDepositDrawer={() => setDepositTarget({})}
                        onMoveToParty={movePokemonToParty}
                        onBoxDrop={handleBoxDrop}
                        onBoxDragStart={handleBoxDragStart}
                    />
                </div>
            </div>

            <PcStorageSubModals
                isExportModalOpen={isExportModalOpen}
                setIsExportModalOpen={setIsExportModalOpen}
                currentBox={currentBox}
                campaign={campaign}
                pcData={pcData}
                partySlots={partySlots}
                trainer={trainer}
                trainerBoxes={trainerBoxes}
                boxTheme={boxTheme}
                handleConfirmCloudUpload={handleConfirmCloudUpload}
                isImportModalOpen={isImportModalOpen}
                setIsImportModalOpen={setIsImportModalOpen}
                handleDownloadBox={handleDownloadBox}
                depositTarget={depositTarget}
                setDepositTarget={setDepositTarget}
                currentActiveSummary={currentActiveSummary}
                trainerPokemonSummaries={trainerPokemonSummaries}
                handleCompleteDeposit={handleCompleteDeposit}
                activeSheetSummary={activeSheetSummary}
                sheetAvailableSummaries={sheetAvailableSummaries}
                setSheetViewEntityId={setSheetViewEntityId}
                handleUpdateSheetSummary={handleUpdateSheetSummary}
                releaseConfirmPokemon={releaseConfirmPokemon}
                setReleaseConfirmPokemon={setReleaseConfirmPokemon}
                releaseModalMode={releaseModalMode}
                handleConfirmRelease={handleConfirmRelease}
                handleUnlinkPokemon={handleUnlinkPokemon}
                isGuideModalOpen={isGuideModalOpen}
                setIsGuideModalOpen={setIsGuideModalOpen}
                contextMenu={contextMenu}
                contextSummary={contextSummary}
                role={role}
                activeBoxIndex={activeBoxIndex}
                onCloseContextMenu={() => setContextMenu(null)}
                onOpenCharacterSheet={handleOpenCharacterSheet}
                depositPokemonToBox={depositPokemonToBox}
                movePokemonToParty={movePokemonToParty}
                handleRecall={handleRecall}
                handleSendOut={handleSendOut}
                handleRelinkArtwork={handleRelinkArtwork}
                handleClonePokemon={handleClonePokemon}
                handleReleasePokemon={handleReleasePokemon}
                gmClaimConflict={gmClaimConflict}
                onCloseGmClaimConflict={() => setGmClaimConflict(null)}
                onConfirmGmClaimOverride={handleConfirmGmClaimOverride}
                isTokenSpawnModalOpen={isTokenSpawnModalOpen}
                onCloseTokenSpawnModal={() => setIsTokenSpawnModalOpen(false)}
                onSpawnTrainerToken={handleSpawnTrainerToken}
                onStartMoveMode={() => {
                    if (contextMenu && contextSummary) {
                        startMoveMode(
                            {
                                type: contextMenu.isPartySlot ? 'party' : 'box',
                                index: contextMenu.index
                            },
                            contextSummary.name || contextSummary.species
                        );
                    }
                }}
            />
        </>
    );
};
