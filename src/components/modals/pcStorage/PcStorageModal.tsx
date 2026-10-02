import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcStorageHeader } from './PcStorageHeader';
import { PcPartyDock } from './PcPartyDock';
import { PcBoxGrid } from './PcBoxGrid';
import { PcSlotContextMenu } from './PcSlotContextMenu';
import { PcBackupWarningBanner } from './PcBackupWarningBanner';
import { PcStorageSubModals } from './PcStorageSubModals';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { buildActiveCharacterSummary, filterTrainerPokemonSummaries } from '../../../utils/pc/pcModalOps';
import { buildTrainerSummary } from '../../../utils/pc/pcTrainerOps';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { broadcastPlayerPc, requestPlayerPcSync } from '../../../hooks/owlbearSync/setupOwlbearPcSync';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { runOrganizeFoldersAction } from '../../../utils/pc/pcSidebarSync';
import { refreshSummariesFromLocalStorage, buildSheetAvailableSummaries } from '../../../utils/pc/pcCandidateMatching';
import { usePcModalHandlers } from './usePcModalHandlers';
import './PcStorageModal.css';

interface PcStorageModalProps {
    onClose: () => void;
}

export const PcStorageModal: React.FC<PcStorageModalProps> = ({ onClose }) => {
    const pcData = useCharacterStore((s) => s.pcData);
    const activeBoxIndex = useCharacterStore((s) => s.activeBoxIndex);
    const selectedPcSlot = useCharacterStore((s) => s.selectedPcSlot);
    const pendingReview = useCharacterStore((s) => s.pendingReview);
    const isReviewModalOpen = useCharacterStore((s) => s.isReviewModalOpen);
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
        renameBox,
        setBoxTheme,
        switchTrainer,
        addTrainer,
        deleteTrainer,
        switchCampaign,
        addCampaign,
        deleteCampaign,
        updatePokemonSummary,
        updateTrainerProfile,
        deletePokemonFromPc,
        closeReviewModal,
        applyReviewDiffs
    } = useCharacterStore.getState();

    // Modal & Popover state
    const [dragSource, setDragSource] = useState<{
        type: 'party' | 'box';
        index: number;
    } | null>(null);

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

    const handleModalClose = () => {
        if (OBR.isAvailable && role !== 'GM') {
            broadcastPlayerPc();
        }
        onClose();
    };

    // Active Campaign & Trainer resolution
    const campaign = pcData.campaigns[pcData.activeCampaignId] || Object.values(pcData.campaigns)[0];
    const isPmdMode = campaign?.activeTrainerId === '__none__';
    const trainer = isPmdMode
        ? undefined
        : campaign?.trainers[campaign.activeTrainerId] || Object.values(campaign?.trainers || {})[0];
    const partySlots = trainer ? trainer.party : campaign?.teamParty || Array(6).fill(null);
    const trainerBoxes = trainer?.boxes && trainer.boxes.length > 0 ? trainer.boxes : campaign?.boxes || [];
    const currentBox = trainerBoxes[activeBoxIndex] || trainerBoxes[0];

    const currentActiveSummary = buildActiveCharacterSummary(
        identity,
        health,
        will,
        activeTokenId,
        flattenStateToMetadata(useCharacterStore.getState()),
        pcData.pokemonSummaries,
        partySlots
    );
    const trainerPokemonSummaries = filterTrainerPokemonSummaries(pcData.pokemonSummaries, trainer, campaign);

    const activeTrainerName = (identity.nickname || identity.species || '').trim();
    const isTrainerMode = identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)';
    const otherLinkedTrainer =
        isTrainerMode && trainer
            ? Object.values(campaign?.trainers || {}).find((t) => {
                  if (t.id === trainer.id) return false;
                  if (activeTokenId && (t.mapTokenId === activeTokenId || t.savedTokenItem?.id === activeTokenId))
                      return true;
                  const meta = identity as Record<string, unknown>;
                  if (meta?.trainerId && meta.trainerId === t.id) return true;
                  if (t.isLinked && activeTrainerName && t.name.toLowerCase() === activeTrainerName.toLowerCase())
                      return true;
                  return false;
              })
            : undefined;
    const canLinkActiveTrainer = isTrainerMode && !otherLinkedTrainer;

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
        handleDropTrainerToken,
        handleConfirmCloudUpload,
        handleDownloadBox,
        handleCompleteDeposit
    } = usePcModalHandlers({
        pcData,
        campaign,
        trainer,
        currentBox,
        activeBoxIndex,
        role: role || 'PLAYER',
        identity: {
            nickname: identity.nickname,
            species: identity.species,
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

    const handleOpenCharacterSheet = (entityId: string) => {
        setSheetViewEntityId(entityId);
    };

    const trainerSummary: PcPokemonSummary | null = useMemo(() => {
        if (!trainer) return null;
        return buildTrainerSummary(trainer);
    }, [trainer]);

    const activeSheetSummary =
        (sheetViewEntityId && pcData.pokemonSummaries[sheetViewEntityId]) ||
        (sheetViewEntityId === trainer?.id ? trainerSummary : null);

    const sheetAvailableSummaries = useMemo(
        () => buildSheetAvailableSummaries(trainer, trainerSummary, pcData.pokemonSummaries, partySlots, trainerBoxes),
        [trainer, trainerSummary, pcData.pokemonSummaries, partySlots, trainerBoxes]
    );

    const handleSlotClick = useCallback(
        (target: { type: 'party' | 'box'; index: number }) => {
            if (selectedPcSlot?.type === target.type && selectedPcSlot?.index === target.index) {
                setSelectedPcSlot(null);
            } else {
                setSelectedPcSlot(target);
            }
        },
        [selectedPcSlot, setSelectedPcSlot]
    );

    const handleEmptySlotClick = useCallback(
        (target: { type: 'party' | 'box'; index: number }) => {
            setSelectedPcSlot(null);
            setDepositTarget({ targetSlot: target });
        },
        [setSelectedPcSlot, setDepositTarget]
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
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            isPartySlot: isParty,
            index,
            entityId
        });
    };

    const [dismissBackupWarning, setDismissBackupWarning] = useState(() => {
        return typeof localStorage !== 'undefined' && localStorage.getItem('pkr_pc_backup_warn_dismissed') === 'true';
    });

    useEffect(() => {
        const { updated, hasChanges } = refreshSummariesFromLocalStorage(pcData.pokemonSummaries || {});
        if (hasChanges) {
            const nextData = { ...pcData, pokemonSummaries: updated };
            useCharacterStore.setState({ pcData: nextData });
            savePcStorage(nextData);
        }
    }, []);

    const handleOrganizeFolders = useCallback(() => {
        runOrganizeFoldersAction(trainer, partySlots, trainerBoxes);
    }, [trainer, partySlots, trainerBoxes]);

    if (!campaign || (!trainer && !isPmdMode) || !currentBox) {
        return null;
    }

    const contextSummary = contextMenu ? pcData.pokemonSummaries[contextMenu.entityId] : null;
    const boxTheme = currentBox?.themeColor || 'var(--dynamic-type-color, var(--base-primary-dark, #8b1c1c))';

    return (
        <>
            <div className="pc-modal-backdrop" onClick={handleModalClose}>
                <div
                    className="pc-modal"
                    style={{ '--box-theme': boxTheme } as React.CSSProperties}
                    onClick={(e) => e.stopPropagation()}
                >
                    <PcStorageHeader
                        campaigns={pcData.campaigns}
                        activeCampaignId={pcData.activeCampaignId}
                        onSwitchCampaign={switchCampaign}
                        onAddCampaign={addCampaign}
                        onDeleteCampaign={deleteCampaign}
                        activeTrainer={trainer}
                        trainers={campaign.trainers}
                        onSwitchTrainer={switchTrainer}
                        onAddTrainer={addTrainer}
                        onDeleteTrainer={deleteTrainer}
                        boxes={trainerBoxes}
                        activeBoxIndex={activeBoxIndex}
                        onSelectBox={setActiveBoxIndex}
                        onAddBox={() => addBox()}
                        onRenameBox={renameBox}
                        onSetBoxTheme={setBoxTheme}
                        onUploadCloud={() => setIsExportModalOpen(true)}
                        onOpenImport={() => setIsImportModalOpen(true)}
                        onSyncPlayers={role === 'GM' && OBR.isAvailable ? () => requestPlayerPcSync() : undefined}
                        onOpenGuide={() => setIsGuideModalOpen(true)}
                        onClose={handleModalClose}
                    />

                    {!dismissBackupWarning && (
                        <PcBackupWarningBanner
                            onDismiss={() => {
                                setDismissBackupWarning(true);
                                try {
                                    localStorage.setItem('pkr_pc_backup_warn_dismissed', 'true');
                                } catch {}
                            }}
                        />
                    )}

                    <div className="pc-modal__layout">
                        <PcPartyDock
                            partySlots={partySlots}
                            pokemonSummaries={pcData.pokemonSummaries}
                            selectedSlot={selectedPcSlot}
                            trainerName={trainer?.name}
                            trainerSummary={trainerSummary}
                            isPmdMode={isPmdMode}
                            trainerAvatarUrl={trainer?.avatarUrl}
                            activeCharacterName={identity.nickname || identity.species}
                            activeCharacterAvatarUrl={identity.tokenImageUrl || undefined}
                            canLinkActiveTrainer={canLinkActiveTrainer}
                            otherLinkedTrainerName={otherLinkedTrainer?.name}
                            onSelectSlot={(index) => handleSlotClick({ type: 'party', index })}
                            onEmptySlotClick={(index) => handleEmptySlotClick({ type: 'party', index })}
                            onContextMenu={(e, index, id) => handleOpenContextMenu(e, true, index, id)}
                            onOpenSheet={handleOpenCharacterSheet}
                            onRelease={handleReleasePokemon}
                            onSendOut={handleSendOut}
                            onRecall={handleRecall}
                            onDropOnSlot={(e, targetIndex) => {
                                let source = dragSource;
                                try {
                                    const raw = e.dataTransfer.getData('application/json');
                                    if (raw) source = JSON.parse(raw);
                                } catch {}
                                if (source) {
                                    swapPcSlots(
                                        { ...source, boxIndex: activeBoxIndex },
                                        { type: 'party', index: targetIndex }
                                    );
                                    setDragSource(null);
                                }
                            }}
                            onDragStart={(e, index) => {
                                try {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData(
                                        'application/json',
                                        JSON.stringify({ type: 'party', index })
                                    );
                                    e.dataTransfer.clearData('text/uri-list');
                                } catch {}
                                setDragSource({ type: 'party', index });
                            }}
                            onDragEnd={() => setDragSource(null)}
                            onLinkActiveTrainer={handleLinkActiveTrainer}
                            isTrainerLinked={isTrainerLinked}
                            isTrainerOnMap={isTrainerOnMap}
                            onUnlinkTrainer={handleUnlinkTrainer}
                            onOpenTrainerSheet={trainer ? () => setSheetViewEntityId(trainer.id) : undefined}
                            onDropTrainerToken={handleDropTrainerToken}
                            onOrganizeFolders={!OBR.isAvailable ? handleOrganizeFolders : undefined}
                        />

                        <PcBoxGrid
                            box={currentBox}
                            pokemonSummaries={pcData.pokemonSummaries}
                            selectedSlot={selectedPcSlot}
                            onSelectSlot={(index) => handleSlotClick({ type: 'box', index })}
                            onEmptySlotClick={(index) => handleEmptySlotClick({ type: 'box', index })}
                            onOpenDepositDrawer={() => setDepositTarget({})}
                            onContextMenu={(e, index, id) => handleOpenContextMenu(e, false, index, id)}
                            onOpenSheet={handleOpenCharacterSheet}
                            onMoveToParty={movePokemonToParty}
                            onSendOut={handleSendOut}
                            onRecall={handleRecall}
                            onDropOnSlot={(e, targetIndex) => {
                                let source = dragSource;
                                try {
                                    const raw = e.dataTransfer.getData('application/json');
                                    if (raw) source = JSON.parse(raw);
                                } catch {}
                                if (source) {
                                    swapPcSlots(
                                        { ...source, boxIndex: activeBoxIndex },
                                        { type: 'box', index: targetIndex, boxIndex: activeBoxIndex }
                                    );
                                    setDragSource(null);
                                }
                            }}
                            onDragStart={(e, index) => {
                                try {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'box', index }));
                                    e.dataTransfer.clearData('text/uri-list');
                                } catch {}
                                setDragSource({ type: 'box', index });
                            }}
                            onDragEnd={() => setDragSource(null)}
                        />
                    </div>

                    {contextMenu && contextSummary && (
                        <PcSlotContextMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            isPartySlot={contextMenu.isPartySlot}
                            isOnMap={!!contextSummary.isOnMap}
                            pokemonName={contextSummary.name || contextSummary.species}
                            onClose={() => setContextMenu(null)}
                            onOpenSheet={() => handleOpenCharacterSheet(contextMenu.entityId)}
                            onTogglePartyBox={() => {
                                if (contextMenu.isPartySlot) {
                                    depositPokemonToBox(contextMenu.entityId, activeBoxIndex);
                                } else {
                                    movePokemonToParty(contextMenu.entityId);
                                }
                            }}
                            onToggleMap={() => {
                                if (contextSummary.isOnMap) {
                                    handleRecall(contextMenu.entityId);
                                } else {
                                    handleSendOut(contextMenu.entityId);
                                }
                            }}
                            onRelinkArtwork={() => handleRelinkArtwork(contextMenu.entityId)}
                            onClone={() => handleClonePokemon(contextMenu.entityId)}
                            onUnlink={() => handleUnlinkPokemon(contextMenu.entityId)}
                            onRelease={() => handleReleasePokemon(contextMenu.entityId)}
                        />
                    )}
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
                isReviewModalOpen={isReviewModalOpen}
                pendingReview={pendingReview}
                applyReviewDiffs={applyReviewDiffs}
                closeReviewModal={closeReviewModal}
                activeSheetSummary={activeSheetSummary}
                sheetAvailableSummaries={sheetAvailableSummaries}
                setSheetViewEntityId={setSheetViewEntityId}
                handleUpdateSheetSummary={handleUpdateSheetSummary}
                releaseConfirmPokemon={releaseConfirmPokemon}
                setReleaseConfirmPokemon={setReleaseConfirmPokemon}
                handleConfirmRelease={handleConfirmRelease}
                handleUnlinkPokemon={handleUnlinkPokemon}
                isGuideModalOpen={isGuideModalOpen}
                setIsGuideModalOpen={setIsGuideModalOpen}
            />
        </>
    );
};
