import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { AlertTriangle, X } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcStorageHeader } from './PcStorageHeader';
import { PcPartyDock } from './PcPartyDock';
import { PcBoxGrid } from './PcBoxGrid';
import { PcSlotContextMenu } from './PcSlotContextMenu';
import { PcReviewModal } from './PcReviewModal';
import { PcCloudExportModal } from './PcCloudExportModal';
import { PcImportModal } from './PcImportModal';
import { PcDepositDrawerModal } from './PcDepositDrawerModal';
import { PcSheetModal } from './PcSheetModal';
import { PcReleaseConfirmModal } from './PcReleaseConfirmModal';
import { PcGuideModal } from './PcGuideModal';
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
            if (selectedPcSlot) {
                if (selectedPcSlot.type === target.type && selectedPcSlot.index === target.index) {
                    setSelectedPcSlot(null);
                } else {
                    swapPcSlots(
                        { ...selectedPcSlot, boxIndex: activeBoxIndex },
                        { ...target, boxIndex: activeBoxIndex }
                    );
                    setSelectedPcSlot(null);
                }
            } else {
                setSelectedPcSlot(target);
            }
        },
        [selectedPcSlot, activeBoxIndex, swapPcSlots, setSelectedPcSlot]
    );

    const handleEmptySlotClick = useCallback(
        (target: { type: 'party' | 'box'; index: number }) => {
            if (selectedPcSlot) {
                swapPcSlots({ ...selectedPcSlot, boxIndex: activeBoxIndex }, { ...target, boxIndex: activeBoxIndex });
                setSelectedPcSlot(null);
            } else {
                setDepositTarget({ targetSlot: target });
            }
        },
        [selectedPcSlot, activeBoxIndex, swapPcSlots, setSelectedPcSlot, setDepositTarget]
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
                        <div className="pc-modal__backup-warning">
                            <AlertTriangle size={15} className="pc-modal__warning-icon" />
                            <span className="pc-modal__warning-text text-subtext">
                                <strong>Beta Feature:</strong> PC Storage is new. Please back up your character sheets
                                before moving or storing Pokémon in case an edge case occurs!
                            </span>
                            <button
                                type="button"
                                className="pc-modal__warning-close"
                                onClick={() => {
                                    setDismissBackupWarning(true);
                                    try {
                                        localStorage.setItem('pkr_pc_backup_warn_dismissed', 'true');
                                    } catch {}
                                }}
                                title="Dismiss backup reminder"
                                aria-label="Dismiss backup reminder"
                            >
                                <X size={14} />
                            </button>
                        </div>
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
                            onDropOnSlot={(targetIndex) => {
                                if (dragSource) {
                                    swapPcSlots(
                                        { ...dragSource, boxIndex: activeBoxIndex },
                                        { type: 'party', index: targetIndex }
                                    );
                                    setDragSource(null);
                                }
                            }}
                            onDragStart={(_e, index) => setDragSource({ type: 'party', index })}
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
                            onDropOnSlot={(targetIndex) => {
                                if (dragSource) {
                                    swapPcSlots(
                                        { ...dragSource, boxIndex: activeBoxIndex },
                                        { type: 'box', index: targetIndex, boxIndex: activeBoxIndex }
                                    );
                                    setDragSource(null);
                                }
                            }}
                            onDragStart={(_e, index) => setDragSource({ type: 'box', index })}
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

            {/* Cloud Export Modal with Asset Library Folder Info */}
            {isExportModalOpen && currentBox && campaign && (
                <PcCloudExportModal
                    box={currentBox}
                    campaign={campaign}
                    pokemonSummaries={pcData.pokemonSummaries}
                    partySlots={partySlots}
                    trainer={trainer}
                    allBoxes={trainerBoxes}
                    boxTheme={boxTheme}
                    onConfirm={handleConfirmCloudUpload}
                    onClose={() => setIsExportModalOpen(false)}
                />
            )}

            {/* Import & Restore Modal (Cloud Scene Asset, Open Scene Sync, and JSON Restore) */}
            {isImportModalOpen && campaign && (
                <PcImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    pcData={pcData}
                    activeCampaign={campaign}
                    currentBoxName={currentBox?.name}
                    boxTheme={boxTheme}
                    onImportCloudScene={handleDownloadBox}
                    onImportJsonSuccess={(nextData, _count, _camps) => {
                        useCharacterStore.setState({ pcData: nextData });
                        savePcStorage(nextData);
                    }}
                    onScanSceneSuccess={(count) => {
                        if (OBR.isAvailable) {
                            OBR.notification.show(`Synced ${count} Pokémon from scene!`, 'SUCCESS');
                        }
                    }}
                />
            )}

            {/* Deposit Pokémon Drawer / Modal */}
            {depositTarget && (
                <PcDepositDrawerModal
                    targetSlot={depositTarget.targetSlot}
                    currentActiveSummary={currentActiveSummary}
                    trainerName={trainer?.name}
                    trainerPokemonSummaries={trainerPokemonSummaries}
                    pokemonSummaries={pcData.pokemonSummaries}
                    partySlots={partySlots}
                    boxTheme={boxTheme}
                    onDepositSummary={handleCompleteDeposit}
                    onClose={() => setDepositTarget(null)}
                />
            )}

            {/* Review Modal for GM Sheet Diffs */}
            {isReviewModalOpen && pendingReview && (
                <PcReviewModal
                    payload={pendingReview}
                    onApply={(diffs, notify) => {
                        applyReviewDiffs(pendingReview.entityId, diffs);
                        if (notify) {
                            console.log(`[PC Storage] Notifying player ${pendingReview.playerName} of sheet updates.`);
                        }
                    }}
                    onClose={closeReviewModal}
                />
            )}

            {/* Pokémon / Trainer Character Sheet Modal with Two-Way Sync */}
            {activeSheetSummary && (
                <PcSheetModal
                    currentSummary={activeSheetSummary}
                    allSummaries={sheetAvailableSummaries}
                    onSelectEntity={setSheetViewEntityId}
                    onUpdateSummary={handleUpdateSheetSummary}
                    onClose={() => setSheetViewEntityId(null)}
                />
            )}

            {/* Permanent Release Double-Confirmation Modal */}
            {releaseConfirmPokemon && (
                <PcReleaseConfirmModal
                    pokemon={releaseConfirmPokemon}
                    onConfirm={handleConfirmRelease}
                    onUnlink={() => handleUnlinkPokemon(releaseConfirmPokemon.entityId)}
                    onClose={() => setReleaseConfirmPokemon(null)}
                />
            )}

            {/* Workflow Guide & Help Modal */}
            {isGuideModalOpen && <PcGuideModal boxTheme={boxTheme} onClose={() => setIsGuideModalOpen(false)} />}
        </>
    );
};
