import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { PcCloudExportModal } from './PcCloudExportModal';
import { PcImportModal } from './PcImportModal';
import { PcDepositDrawerModal } from './PcDepositDrawerModal';
import { PcReviewModal } from './PcReviewModal';
import { PcSheetModal } from './PcSheetModal';
import { PcReleaseConfirmModal } from './PcReleaseConfirmModal';
import { PcGuideModal } from './PcGuideModal';
import type {
    PcBox,
    CampaignProfile,
    TrainerRoster,
    PcPokemonSummary,
    PcStorageData,
    SheetReviewPayload,
    SheetFieldDiff
} from '../../../types/pcStorageTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { savePcStorage } from '../../../utils/pc/pcStorageAdapter';

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
    handleCompleteDeposit: (summary: PcPokemonSummary) => Promise<void>;
    isReviewModalOpen: boolean;
    pendingReview: SheetReviewPayload | null;
    applyReviewDiffs: (entityId: string, diffs: SheetFieldDiff[]) => void;
    closeReviewModal: () => void;
    activeSheetSummary: PcPokemonSummary | null;
    sheetAvailableSummaries: PcPokemonSummary[];
    setSheetViewEntityId: (id: string | null) => void;
    handleUpdateSheetSummary: (summary: PcPokemonSummary) => void;
    releaseConfirmPokemon: PcPokemonSummary | null;
    setReleaseConfirmPokemon: (p: PcPokemonSummary | null) => void;
    handleConfirmRelease: () => void;
    handleUnlinkPokemon: (id: string) => void;
    isGuideModalOpen: boolean;
    setIsGuideModalOpen: (open: boolean) => void;
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
    isReviewModalOpen,
    pendingReview,
    applyReviewDiffs,
    closeReviewModal,
    activeSheetSummary,
    sheetAvailableSummaries,
    setSheetViewEntityId,
    handleUpdateSheetSummary,
    releaseConfirmPokemon,
    setReleaseConfirmPokemon,
    handleConfirmRelease,
    handleUnlinkPokemon,
    isGuideModalOpen,
    setIsGuideModalOpen
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
                    currentBoxName={currentBox?.name}
                    boxTheme={boxTheme}
                    onImportCloudScene={handleDownloadBox}
                    onImportJsonSuccess={(nextData) => {
                        useCharacterStore.setState({ pcData: nextData });
                        savePcStorage(nextData);
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
