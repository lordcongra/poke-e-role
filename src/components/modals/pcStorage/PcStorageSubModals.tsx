import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { PcCloudExportModal } from './PcCloudExportModal';
import { PcImportModal } from './PcImportModal';
import { PcDepositDrawerModal } from './PcDepositDrawerModal';
import { PcSheetModal } from './PcSheetModal';
import { PcReleaseConfirmModal } from './PcReleaseConfirmModal';
import { PcGuideModal } from './PcGuideModal';
import { PcSlotContextMenu } from './PcSlotContextMenu';
import { GmClaimOverrideModal } from './GmClaimOverrideModal';
import { PcTrainerTokenSpawnModal } from './PcTrainerTokenSpawnModal';
import type { GmClaimConflict } from '../../../utils/pc/pcClaimOverrideOps';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import type {
    PcBox,
    CampaignProfile,
    TrainerRoster,
    PcPokemonSummary,
    PcStorageData
} from '../../../types/pcStorageTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { generateSidebarSheetsFromPc } from '../../../utils/pc/pcSidebarGenerator';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';

interface PcStorageSubModalsProps {
    isExportModalOpen: boolean;
    setIsExportModalOpen: (open: boolean) => void;
    currentBox?: PcBox;
    campaign?: CampaignProfile;
    pcData: PcStorageData;
    partySlots: (string | null)[];
    trainer?: TrainerRoster;
    trainerBoxes: PcBox[];
    boxTheme: string;
    handleConfirmCloudUpload: (
        customSceneName: string,
        includeParty: boolean,
        includeTrainer: boolean,
        targetMode: 'cloud' | 'activeScene',
        backupAllBoxes: boolean
    ) => Promise<void> | void;
    isImportModalOpen: boolean;
    setIsImportModalOpen: (open: boolean) => void;
    handleDownloadBox: () => Promise<void>;
    depositTarget: { targetSlot?: { type: 'party' | 'box'; index: number } } | null;
    setDepositTarget: (target: { targetSlot?: { type: 'party' | 'box'; index: number } } | null) => void;
    currentActiveSummary: PcPokemonSummary | null;
    trainerPokemonSummaries: PcPokemonSummary[];
    handleCompleteDeposit: (
        summary: PcPokemonSummary,
        targetSlotOverride?: { type: 'party' | 'box'; index: number }
    ) => Promise<void>;
    activeSheetSummary: PcPokemonSummary | null;
    sheetAvailableSummaries: PcPokemonSummary[];
    setSheetViewEntityId: (id: string | null) => void;
    handleUpdateSheetSummary: (summary: PcPokemonSummary) => void;
    releaseConfirmPokemon: PcPokemonSummary | null;
    setReleaseConfirmPokemon: (p: PcPokemonSummary | null) => void;
    releaseModalMode?: 'release' | 'unlink';
    handleConfirmRelease: () => void;
    handleUnlinkPokemon: (id: string) => void;
    isGuideModalOpen: boolean;
    setIsGuideModalOpen: (open: boolean) => void;
    contextMenu?: {
        x: number;
        y: number;
        isPartySlot: boolean;
        index: number;
        entityId: string;
    } | null;
    contextSummary?: PcPokemonSummary | null;
    role?: string;
    activeBoxIndex?: number;
    onCloseContextMenu?: () => void;
    onOpenCharacterSheet?: (entityId: string) => void;
    depositPokemonToBox?: (entityId: string, boxIndex: number) => void;
    movePokemonToParty?: (entityId: string) => void;
    handleRecall?: (entityId: string) => void;
    handleSendOut?: (entityId: string) => void;
    handleRelinkArtwork?: (entityId: string) => void;
    handleClonePokemon?: (entityId: string) => void;
    handleReleasePokemon?: (entityId: string) => void;
    gmClaimConflict?: GmClaimConflict | null;
    onCloseGmClaimConflict?: () => void;
    onConfirmGmClaimOverride?: () => void;
    isTokenSpawnModalOpen?: boolean;
    onCloseTokenSpawnModal?: () => void;
    onSpawnTrainerToken?: (imageUrl: string) => Promise<void>;
}

export const PcStorageSubModals: React.FC<PcStorageSubModalsProps> = ({
    isExportModalOpen,
    setIsExportModalOpen,
    currentBox,
    campaign,
    pcData,
    partySlots,
    trainer,
    trainerBoxes,
    boxTheme,
    handleConfirmCloudUpload,
    isImportModalOpen,
    setIsImportModalOpen,
    handleDownloadBox,
    depositTarget,
    setDepositTarget,
    currentActiveSummary,
    trainerPokemonSummaries,
    handleCompleteDeposit,
    activeSheetSummary,
    sheetAvailableSummaries,
    setSheetViewEntityId,
    handleUpdateSheetSummary,
    releaseConfirmPokemon,
    setReleaseConfirmPokemon,
    releaseModalMode,
    handleConfirmRelease,
    handleUnlinkPokemon,
    isGuideModalOpen,
    setIsGuideModalOpen,
    contextMenu,
    contextSummary,
    role,
    activeBoxIndex,
    onCloseContextMenu,
    onOpenCharacterSheet,
    depositPokemonToBox,
    movePokemonToParty,
    handleRecall,
    handleSendOut,
    handleRelinkArtwork,
    handleClonePokemon,
    handleReleasePokemon,
    gmClaimConflict,
    onCloseGmClaimConflict,
    onConfirmGmClaimOverride,
    isTokenSpawnModalOpen,
    onCloseTokenSpawnModal,
    onSpawnTrainerToken
}) => {
    return (
        <>
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
                    trainer={trainer}
                    currentBoxName={currentBox?.name}
                    boxTheme={boxTheme}
                    onImportCloudScene={handleDownloadBox}
                    onImportJsonSuccess={(nextData, _count, _campCount, targetTrainerId) => {
                        useCharacterStore.setState({ pcData: nextData, activeBoxIndex: 0 });
                        savePcStorage(nextData);
                        if (targetTrainerId) {
                            useCharacterStore.getState().switchTrainer(targetTrainerId);
                        }
                        if (isStandaloneMode) {
                            generateSidebarSheetsFromPc(nextData, {
                                targetTrainerId,
                                includeBoxes: false,
                                organizeFolders: true
                            }).catch((err) => {
                                console.warn(
                                    '[PcStorageSubModals] Failed to auto-generate sidebar sheets from imported PC:',
                                    err
                                );
                            });
                        }
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('pkr-local-data-changed'));
                        }
                    }}
                    onScanSceneSuccess={(nextData, count, beltCount, boxCount) => {
                        useCharacterStore.setState({ pcData: nextData });
                        savePcStorage(nextData);
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('pkr-local-data-changed'));
                        }
                        if (OBR.isAvailable) {
                            OBR.notification.show(
                                `Synced ${count} Pokémon (${beltCount} Belt, ${boxCount} Box) from scene!`,
                                'SUCCESS'
                            );
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
                    activeTrainerId={trainer?.id}
                    trainers={campaign ? Object.values(campaign.trainers || {}) : undefined}
                    campaign={campaign}
                    allCampaigns={pcData.campaigns}
                    trainerPokemonSummaries={trainerPokemonSummaries}
                    pokemonSummaries={pcData.pokemonSummaries}
                    partySlots={partySlots}
                    boxTheme={boxTheme}
                    onDepositSummary={handleCompleteDeposit}
                    onClose={() => setDepositTarget(null)}
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

            {/* Permanent Release / Unlink Double-Confirmation Modal */}
            {releaseConfirmPokemon && (
                <PcReleaseConfirmModal
                    pokemon={releaseConfirmPokemon}
                    mode={releaseModalMode}
                    onConfirm={handleConfirmRelease}
                    onUnlink={() => handleUnlinkPokemon(releaseConfirmPokemon.entityId)}
                    onClose={() => setReleaseConfirmPokemon(null)}
                />
            )}

            {/* Workflow Guide & Help Modal */}
            {isGuideModalOpen && <PcGuideModal boxTheme={boxTheme} onClose={() => setIsGuideModalOpen(false)} />}

            {/* Right-click Context Menu */}
            {contextMenu && contextSummary && (
                <PcSlotContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isPartySlot={contextMenu.isPartySlot}
                    isOnMap={!!contextSummary.isOnMap}
                    isLocked={role !== 'GM' && isEntityLockedByGm(contextSummary)}
                    pokemonName={contextSummary.name || contextSummary.species}
                    onClose={onCloseContextMenu || (() => {})}
                    onOpenSheet={() => onOpenCharacterSheet?.(contextMenu.entityId)}
                    onTogglePartyBox={() => {
                        if (contextMenu.isPartySlot) {
                            depositPokemonToBox?.(contextMenu.entityId, activeBoxIndex || 0);
                        } else {
                            movePokemonToParty?.(contextMenu.entityId);
                        }
                    }}
                    onToggleMap={() => {
                        if (contextSummary.isOnMap) {
                            handleRecall?.(contextMenu.entityId);
                        } else {
                            handleSendOut?.(contextMenu.entityId);
                        }
                    }}
                    onRelinkArtwork={() => handleRelinkArtwork?.(contextMenu.entityId)}
                    onClone={() => handleClonePokemon?.(contextMenu.entityId)}
                    onUnlink={() => handleUnlinkPokemon(contextMenu.entityId)}
                    onRelease={() => handleReleasePokemon?.(contextMenu.entityId)}
                />
            )}

            {/* GM Ownership Conflict Override Modal */}
            {gmClaimConflict && (
                <GmClaimOverrideModal
                    conflict={gmClaimConflict}
                    onClose={onCloseGmClaimConflict || (() => {})}
                    onConfirmForceTransfer={onConfirmGmClaimOverride || (() => {})}
                />
            )}

            {/* Link or Spawn Token Modal for Unlinked Trainers */}
            {isTokenSpawnModalOpen && trainer && onCloseTokenSpawnModal && onSpawnTrainerToken && (
                <PcTrainerTokenSpawnModal
                    isOpen={isTokenSpawnModalOpen}
                    trainerName={trainer.name}
                    onClose={onCloseTokenSpawnModal}
                    onSpawnToken={onSpawnTrainerToken}
                />
            )}
        </>
    );
};
