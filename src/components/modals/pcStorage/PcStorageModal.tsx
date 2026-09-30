import React, { useState } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcStorageHeader } from './PcStorageHeader';
import { PcPartyDock } from './PcPartyDock';
import { PcBoxGrid } from './PcBoxGrid';
import { PcSlotContextMenu } from './PcSlotContextMenu';
import { PcReviewModal } from './PcReviewModal';
import { PcCloudExportModal } from './PcCloudExportModal';
import { PcDepositDrawerModal } from './PcDepositDrawerModal';
import { PcSheetModal } from './PcSheetModal';
import { PcReleaseConfirmModal } from './PcReleaseConfirmModal';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { buildActiveCharacterSummary, filterTrainerPokemonSummaries } from '../../../utils/pc/pcModalOps';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
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
    const setActiveBoxIndex = useCharacterStore((s) => s.setActiveBoxIndex);
    const setSelectedPcSlot = useCharacterStore((s) => s.setSelectedPcSlot);
    const swapPcSlots = useCharacterStore((s) => s.swapPcSlots);
    const movePokemonToParty = useCharacterStore((s) => s.movePokemonToParty);
    const depositPokemonToBox = useCharacterStore((s) => s.depositPokemonToBox);
    const setPartySlot = useCharacterStore((s) => s.setPartySlot);
    const setBoxSlot = useCharacterStore((s) => s.setBoxSlot);
    const addBox = useCharacterStore((s) => s.addBox);
    const renameBox = useCharacterStore((s) => s.renameBox);
    const setBoxTheme = useCharacterStore((s) => s.setBoxTheme);
    const switchTrainer = useCharacterStore((s) => s.switchTrainer);
    const addTrainer = useCharacterStore((s) => s.addTrainer);
    const switchCampaign = useCharacterStore((s) => s.switchCampaign);
    const addCampaign = useCharacterStore((s) => s.addCampaign);
    const updatePokemonSummary = useCharacterStore((s) => s.updatePokemonSummary);
    const deletePokemonFromPc = useCharacterStore((s) => s.deletePokemonFromPc);
    const closeReviewModal = useCharacterStore((s) => s.closeReviewModal);
    const applyReviewDiffs = useCharacterStore((s) => s.applyReviewDiffs);

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
    const [depositTarget, setDepositTarget] = useState<{
        targetSlot?: { type: 'party' | 'box'; index: number };
    } | null>(null);
    const [sheetViewEntityId, setSheetViewEntityId] = useState<string | null>(null);
    const [releaseConfirmPokemon, setReleaseConfirmPokemon] = useState<PcPokemonSummary | null>(null);

    // Active Campaign & Trainer resolution
    const campaign = pcData.campaigns[pcData.activeCampaignId] || Object.values(pcData.campaigns)[0];
    const trainer = campaign?.trainers[campaign.activeTrainerId] || Object.values(campaign?.trainers || {})[0];
    const currentBox = campaign?.boxes[activeBoxIndex] || campaign?.boxes[0];

    // Current active character summary if loaded in sheet
    const currentActiveSummary = buildActiveCharacterSummary(
        identity,
        health,
        will,
        activeTokenId,
        flattenStateToMetadata(useCharacterStore.getState())
    );

    // All stored Pokémon that either belong to this trainer or are in PC boxes (and not in the active party)
    const trainerPokemonSummaries = filterTrainerPokemonSummaries(pcData.pokemonSummaries, trainer, campaign);

    const canLinkActiveTrainer = identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)';

    const {
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
            tokenImageUrl: identity.tokenImageUrl
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

    const handleOpenContextMenu = (e: React.MouseEvent, isParty: boolean, index: number, entityId: string) => {
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            isPartySlot: isParty,
            index,
            entityId
        });
    };

    if (!campaign || !trainer || !currentBox) {
        return null;
    }

    const contextSummary = contextMenu ? pcData.pokemonSummaries[contextMenu.entityId] : null;
    const boxTheme = currentBox?.themeColor || 'var(--dynamic-type-color, var(--base-primary-dark, #8b1c1c))';

    return (
        <div className="pc-modal-backdrop" onClick={onClose}>
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
                    activeTrainer={trainer}
                    trainers={campaign.trainers}
                    onSwitchTrainer={switchTrainer}
                    onAddTrainer={addTrainer}
                    boxes={campaign.boxes}
                    activeBoxIndex={activeBoxIndex}
                    onSelectBox={setActiveBoxIndex}
                    onAddBox={() => addBox()}
                    onRenameBox={renameBox}
                    onSetBoxTheme={setBoxTheme}
                    onUploadCloud={() => setIsExportModalOpen(true)}
                    onDownloadCloud={handleDownloadBox}
                    onClose={onClose}
                />

                <div className="pc-modal__layout">
                    <PcPartyDock
                        partySlots={trainer.party}
                        pokemonSummaries={pcData.pokemonSummaries}
                        selectedSlot={selectedPcSlot}
                        trainerName={trainer.name}
                        trainerAvatarUrl={trainer.avatarUrl}
                        activeCharacterName={identity.nickname || identity.species}
                        activeCharacterAvatarUrl={identity.tokenImageUrl || undefined}
                        canLinkActiveTrainer={canLinkActiveTrainer}
                        onSelectSlot={(index) => setSelectedPcSlot({ type: 'party', index })}
                        onEmptySlotClick={(index) => setDepositTarget({ targetSlot: { type: 'party', index } })}
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
                        onUnlinkTrainer={handleUnlinkTrainer}
                    />

                    <PcBoxGrid
                        box={currentBox}
                        pokemonSummaries={pcData.pokemonSummaries}
                        selectedSlot={selectedPcSlot}
                        onSelectSlot={(index) => setSelectedPcSlot({ type: 'box', index })}
                        onEmptySlotClick={(index) => setDepositTarget({ targetSlot: { type: 'box', index } })}
                        onOpenDepositDrawer={() => setDepositTarget({})}
                        onContextMenu={(e, index, id) => handleOpenContextMenu(e, false, index, id)}
                        onOpenSheet={handleOpenCharacterSheet}
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

            {/* Cloud Export Modal with Asset Library Folder Info */}
            {isExportModalOpen && currentBox && campaign && (
                <PcCloudExportModal
                    box={currentBox}
                    campaign={campaign}
                    pokemonSummaries={pcData.pokemonSummaries}
                    onConfirm={handleConfirmCloudUpload}
                    onClose={() => setIsExportModalOpen(false)}
                />
            )}

            {/* Deposit Pokémon Drawer / Modal */}
            {depositTarget && (
                <PcDepositDrawerModal
                    targetSlot={depositTarget.targetSlot}
                    currentActiveSummary={currentActiveSummary}
                    trainerName={trainer?.name}
                    trainerPokemonSummaries={trainerPokemonSummaries}
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

            {/* Pokémon Character Sheet Modal with Two-Way Sync */}
            {sheetViewEntityId && pcData.pokemonSummaries[sheetViewEntityId] && (
                <PcSheetModal
                    currentSummary={pcData.pokemonSummaries[sheetViewEntityId]}
                    allSummaries={Object.values(pcData.pokemonSummaries)}
                    onSelectEntity={setSheetViewEntityId}
                    onUpdateSummary={updatePokemonSummary}
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
        </div>
    );
};
