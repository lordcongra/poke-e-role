import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcStorageHeader } from './PcStorageHeader';
import { PcPartyDock } from './PcPartyDock';
import { PcBoxGrid } from './PcBoxGrid';
import { PcBackupWarningBanner } from './PcBackupWarningBanner';
import { PcStorageSubModals } from './PcStorageSubModals';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import {
    buildActiveCharacterSummary,
    filterTrainerPokemonSummaries,
    findOtherLinkedTrainer
} from '../../../utils/pc/pcModalOps';
import { buildTrainerSummary } from '../../../utils/pc/pcTrainerOps';
import { savePcStorage, sanitizePcData } from '../../../utils/pc/pcStorageAdapter';
import { broadcastPlayerPc, broadcastGmPc, requestPlayerPcSync } from '../../../hooks/owlbearSync/setupOwlbearPcSync';
import {
    refreshSummariesFromLocalStorage,
    buildSheetAvailableSummaries,
    isEntityLockedByGm
} from '../../../utils/pc/pcCandidateMatching';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { runOrganizeFoldersAction } from '../../../utils/pc/pcSidebarSync';
import { resolveEffectiveActiveTrainer, setCachedObrPlayerId } from '../../../utils/pc/pcCampaignTrainerOps';
import { handlePcDragStart, handlePcDrop, type PcDragItem } from '../../../utils/pc/pcDragDropUtils';
import { usePcModalHandlers } from './usePcModalHandlers';
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
        deletePokemonFromPc
    } = useCharacterStore.getState();

    const [dragSource, setDragSource] = useState<PcDragItem | null>(null);
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
    const [myPlayerId, setMyPlayerId] = useState<string | undefined>();

    useEffect(() => {
        document.body.classList.add('pc-modal-open');
        document.documentElement.classList.add('pc-modal-open');
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        if (OBR.isAvailable)
            OBR.player
                .getId()
                .then((id) => {
                    setMyPlayerId(id);
                    setCachedObrPlayerId(id);
                })
                .catch(() => {});
        return () => {
            document.body.classList.remove('pc-modal-open');
            document.documentElement.classList.remove('pc-modal-open');
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    // Active Campaign & Trainer resolution
    const campaign = pcData.campaigns[pcData.activeCampaignId] || Object.values(pcData.campaigns)[0];
    const isPmdMode = campaign?.activeTrainerId === '__none__';
    const trainer = isPmdMode
        ? undefined
        : resolveEffectiveActiveTrainer(campaign, myPlayerId) || Object.values(campaign?.trainers || {})[0];

    const handleModalClose = () => {
        if (OBR.isAvailable) {
            if (role !== 'GM') {
                broadcastPlayerPc();
            } else {
                broadcastGmPc({ campaignId: campaign?.id, trainer });
            }
        }
        onClose();
    };
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

    const [isActiveTokenLocked, setIsActiveTokenLocked] = useState(false);
    useEffect(() => {
        if (!OBR.isAvailable || role === 'GM') {
            setIsActiveTokenLocked(false);
            return;
        }
        if (activeTokenId) {
            OBR.scene.items
                .getItems([activeTokenId])
                .then((items) => {
                    setIsActiveTokenLocked(items[0] ? isEntityLockedByGm(items[0]) : false);
                })
                .catch(() => setIsActiveTokenLocked(false));
        } else {
            setIsActiveTokenLocked(false);
        }
    }, [activeTokenId, role]);

    const otherLinkedTrainer = findOtherLinkedTrainer(campaign, trainer?.id, activeTokenId, identity);
    const canLinkActiveTrainer =
        (identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)') &&
        !otherLinkedTrainer &&
        (role === 'GM' || !isActiveTokenLocked);

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

    const trainerSummary: PcPokemonSummary | null = useMemo(
        () => (trainer ? buildTrainerSummary(trainer) : null),
        [trainer]
    );
    const rawActiveSheetSummary =
        (sheetViewEntityId && pcData.pokemonSummaries[sheetViewEntityId]) ||
        (sheetViewEntityId === trainer?.id ? trainerSummary : null);
    const activeSheetSummary =
        role !== 'GM' && isEntityLockedByGm(rawActiveSheetSummary) ? null : rawActiveSheetSummary;

    const sheetAvailableSummaries = useMemo(
        () =>
            buildSheetAvailableSummaries(
                trainer,
                trainerSummary,
                pcData.pokemonSummaries,
                partySlots,
                trainerBoxes,
                role || 'PLAYER'
            ),
        [trainer, trainerSummary, pcData.pokemonSummaries, partySlots, trainerBoxes, role]
    );

    const handleSlotClick = useCallback(
        (target: { type: 'party' | 'box'; index: number }) => {
            setSelectedPcSlot(
                selectedPcSlot?.type === target.type && selectedPcSlot?.index === target.index ? null : target
            );
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
        return (
            typeof localStorage !== 'undefined' && localStorage.getItem('pkr_pc_backup_warn_dismissed_v2') === 'true'
        );
    });

    const handleDismissWarning = useCallback(() => {
        setDismissBackupWarning(true);
        try {
            localStorage.setItem('pkr_pc_backup_warn_dismissed_v2', 'true');
        } catch {}
    }, []);

    useEffect(() => {
        const sanitized = sanitizePcData(pcData);
        const { updated, hasChanges } = refreshSummariesFromLocalStorage(sanitized.pokemonSummaries || {});
        if (hasChanges || JSON.stringify(sanitized) !== JSON.stringify(pcData)) {
            const nextData = { ...sanitized, pokemonSummaries: updated };
            useCharacterStore.setState({ pcData: nextData });
            savePcStorage(nextData);
        }
    }, []);

    const handleOrganizeFolders = useCallback(() => {
        runOrganizeFoldersAction(trainer, partySlots, trainerBoxes);
    }, [trainer, partySlots, trainerBoxes]);

    if (!campaign || !currentBox) {
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
                        onEditCampaign={editCampaign}
                        onDeleteCampaign={deleteCampaign}
                        isGm={role === 'GM'}
                        activeRoomCampaignId={identity.activeRoomCampaignId}
                        activeRoomCampaignName={identity.activeRoomCampaignName}
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

                    {!dismissBackupWarning && <PcBackupWarningBanner onDismiss={handleDismissWarning} />}

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
                                handlePcDrop(
                                    e,
                                    { type: 'party', index: targetIndex },
                                    activeBoxIndex,
                                    dragSource,
                                    swapPcSlots
                                );
                                setDragSource(null);
                            }}
                            onDragStart={(e, index) => {
                                handlePcDragStart(e, { type: 'party', index });
                                setDragSource({ type: 'party', index });
                            }}
                            onDragEnd={() => setDragSource(null)}
                            onLinkActiveTrainer={handleLinkActiveTrainer}
                            isTrainerLinked={isTrainerLinked}
                            isTrainerOnMap={isTrainerOnMap}
                            onUnlinkTrainer={handleUnlinkTrainer}
                            onOpenTrainerSheet={trainer ? () => handleOpenCharacterSheet(trainer.id) : undefined}
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
                                handlePcDrop(
                                    e,
                                    { type: 'box', index: targetIndex },
                                    activeBoxIndex,
                                    dragSource,
                                    swapPcSlots
                                );
                                setDragSource(null);
                            }}
                            onDragStart={(e, index) => {
                                handlePcDragStart(e, { type: 'box', index });
                                setDragSource({ type: 'box', index });
                            }}
                            onDragEnd={() => setDragSource(null)}
                        />
                    </div>
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
            />
        </>
    );
};
