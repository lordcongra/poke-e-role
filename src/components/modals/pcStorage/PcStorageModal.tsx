import React, { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
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
import {
    spawnPokemonToMap,
    recallPokemonFromMap,
    exportBoxCloud,
    importBoxCloud,
    buildActiveCharacterSummary,
    filterTrainerPokemonSummaries
} from '../../../utils/pc/pcModalOps';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
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

    // Handlers
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
            avatarUrl: identity.tokenImageUrl || trainer.avatarUrl
        };
        const nextData = {
            ...pcData,
            campaigns: {
                ...pcData.campaigns,
                [pcData.activeCampaignId]: {
                    ...campaign,
                    trainers: {
                        ...campaign.trainers,
                        [trainer.id]: nextTrainer
                    }
                }
            }
        };
        useCharacterStore.setState({ pcData: nextData });
        savePcStorage(nextData);

        if (OBR.isAvailable) {
            OBR.notification.show(`Linked "${trainerName}" to Pokéball Belt!`, 'SUCCESS');
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
                attachedItems: result.attachedItems ?? summary.attachedItems,
                hp: result.currentHp ?? summary.hp,
                maxHp: result.maxHp ?? summary.maxHp,
                will: result.currentWill ?? summary.will,
                maxWill: result.maxWill ?? summary.maxWill,
                savedTokenItem: result.savedTokenItem ?? summary.savedTokenItem,
                fullMetadata: result.fullMetadata ?? summary.fullMetadata
            });
        }
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
                console.error('[PcStorageModal] Failed to pick image from Owlbear:', e);
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

    const handleReleasePokemon = (entityId: string) => {
        const summary = pcData.pokemonSummaries[entityId];
        if (!summary) return;
        setReleaseConfirmPokemon(summary);
    };

    const handleConfirmRelease = () => {
        if (!releaseConfirmPokemon) return;
        const name = releaseConfirmPokemon.name || releaseConfirmPokemon.species;
        if (sheetViewEntityId === releaseConfirmPokemon.entityId) {
            setSheetViewEntityId(null);
        }
        deletePokemonFromPc(releaseConfirmPokemon.entityId);
        setReleaseConfirmPokemon(null);
        if (OBR.isAvailable) {
            OBR.notification.show(`Released "${name}" from storage.`, 'INFO');
        }
    };

    const handleOpenCharacterSheet = (entityId: string) => {
        setSheetViewEntityId(entityId);
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
        if (!campaign) return;
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
                console.warn('[PcStorageModal] Failed to get map token for deposit:', e);
            }
        }

        updatePokemonSummary(finalSummary);
        if (depositTarget?.targetSlot?.type === 'party') {
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
                    onClose={() => setReleaseConfirmPokemon(null)}
                />
            )}
        </div>
    );
};
