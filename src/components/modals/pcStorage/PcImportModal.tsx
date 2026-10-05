import React, { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type {
    PcStorageData,
    CampaignProfile,
    TrainerRoster,
    PcImportDuplicateMode
} from '../../../types/pcStorageTypes';
import { importPcBackupJson } from '../../../utils/pc/pcJsonBackupOps';
import { scanSceneBackupTokens } from '../../../utils/pc/pcBackupSceneSync';
import { restoreTokensIntoPcStorage } from '../../../utils/pc/pcCloudRestoreOps';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PcImportCloudSection } from './PcImportCloudSection';
import { PcImportJsonSection } from './PcImportJsonSection';
import { CloudDownload, FileJson, CheckCircle2, AlertCircle, X, Layers } from 'lucide-react';
import './PcImportModal.css';

interface PcImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    pcData: PcStorageData;
    activeCampaign: CampaignProfile;
    trainer?: TrainerRoster;
    currentBoxName?: string;
    boxTheme?: string;
    onImportCloudScene: () => Promise<void>;
    onImportJsonSuccess: (
        nextData: PcStorageData,
        importedCount: number,
        importedCampCount: number,
        targetTrainerId?: string
    ) => void;
    onScanSceneSuccess?: (nextData: PcStorageData, count: number, beltCount: number, boxCount: number) => void;
}

export const PcImportModal: React.FC<PcImportModalProps> = ({
    isOpen,
    onClose,
    pcData,
    activeCampaign,
    trainer,
    currentBoxName = 'Current Box',
    boxTheme,
    onImportCloudScene,
    onImportJsonSuccess,
    onScanSceneSuccess
}) => {
    const isObr = OBR.isAvailable;
    const [activeTab, setActiveTab] = useState<'cloud' | 'json'>(isObr ? 'cloud' : 'json');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const effectiveTrainer =
        trainer ||
        (activeCampaign?.activeTrainerId ? activeCampaign.trainers[activeCampaign.activeTrainerId] : undefined) ||
        Object.values(activeCampaign?.trainers || {})[0];

    const defaultDestination = effectiveTrainer ? `trainer:${effectiveTrainer.id}` : 'new-trainer';
    const [destination, setDestination] = useState<string>(defaultDestination);
    const [duplicateMode, setDuplicateMode] = useState<PcImportDuplicateMode>('duplicate-fresh');

    useEffect(() => {
        if (effectiveTrainer && isOpen) {
            setDestination(`trainer:${effectiveTrainer.id}`);
        }
    }, [isOpen, effectiveTrainer?.id]);

    if (!isOpen) return null;

    const handleImportCloud = async () => {
        setIsProcessing(true);
        setResultMessage(null);
        try {
            await onImportCloudScene();
            setResultMessage({
                type: 'success',
                text: 'Cloud Scene Asset scan completed successfully!'
            });
        } catch (e) {
            setResultMessage({
                type: 'error',
                text: e instanceof Error ? e.message : 'Failed to import from Cloud Scene.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleScanOpenScene = async () => {
        setIsProcessing(true);
        setResultMessage(null);
        try {
            const allSceneItems = OBR.isAvailable ? await OBR.scene.items.getItems() : [];
            const foundTokens = await scanSceneBackupTokens();
            if (foundTokens.length === 0) {
                setResultMessage({
                    type: 'error',
                    text: 'No Pokémon tokens were detected in the currently open scene. Ensure you are in your backup scene!'
                });
                return;
            }

            const currentData = useCharacterStore.getState().pcData;
            const role = useCharacterStore.getState().role;
            const myPlayerId = OBR.isAvailable ? await OBR.player.getId().catch(() => undefined) : undefined;
            const res = restoreTokensIntoPcStorage(foundTokens, currentData, 0, role, myPlayerId, allSceneItems);

            if (res.success && res.nextData) {
                if (onScanSceneSuccess) {
                    onScanSceneSuccess(res.nextData, res.totalImported, res.partyCount, res.boxCount);
                }
                setResultMessage({
                    type: 'success',
                    text: `Successfully synced ${res.totalImported} Pokémon (${res.partyCount} Belt, ${res.boxCount} Box)${
                        res.trainerRestored ? ' & Trainer' : ''
                    } from the open scene!`
                });
            } else {
                setResultMessage({
                    type: 'error',
                    text: res.error || 'Failed to restore tokens from the open scene.'
                });
            }
        } catch (e) {
            setResultMessage({
                type: 'error',
                text: e instanceof Error ? e.message : 'Failed to scan the open scene.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelected = async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setResultMessage({ type: 'error', text: 'Please select a valid .json backup file.' });
            return;
        }

        let importMode: 'active-trainer' | 'new-trainer' | 'merge-by-name' | 'campaign-boxes' = 'active-trainer';
        let targetTrainerId: string | undefined = undefined;

        if (destination.startsWith('trainer:')) {
            importMode = 'active-trainer';
            targetTrainerId = destination.replace('trainer:', '');
        } else if (destination === 'new-trainer') {
            importMode = 'new-trainer';
        } else if (destination === 'merge-by-name') {
            importMode = 'merge-by-name';
        } else if (destination === 'campaign-boxes') {
            importMode = 'campaign-boxes';
        }

        setIsProcessing(true);
        setResultMessage(null);
        try {
            const res = await importPcBackupJson(file, pcData, {
                targetCampaignId: activeCampaign.id,
                targetTrainerId,
                importMode,
                duplicateMode
            });
            if (res.success && res.nextData) {
                onImportJsonSuccess(
                    res.nextData,
                    res.importedPokemonCount || 0,
                    res.importedCampaignCount || 0,
                    res.targetTrainerId || targetTrainerId
                );
                const targetMsg = res.targetTrainerName
                    ? ` into ${res.targetTrainerName}'s storage`
                    : importMode === 'campaign-boxes'
                      ? ' into Campaign boxes'
                      : '';
                const dupModeMsg =
                    duplicateMode === 'duplicate-fresh'
                        ? ' as fresh duplicate copies'
                        : duplicateMode === 'transfer-ownership'
                          ? ' with transferred ownership'
                          : '';
                setResultMessage({
                    type: 'success',
                    text: `Successfully restored! Loaded ${res.importedPokemonCount || 0} Pokémon${targetMsg}${dupModeMsg}.`
                });
            } else {
                setResultMessage({
                    type: 'error',
                    text: res.error || 'Failed to restore from JSON file.'
                });
            }
        } catch (e) {
            setResultMessage({
                type: 'error',
                text: e instanceof Error ? e.message : 'Failed to parse JSON file.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="modal-backdrop pc-import-backdrop" onClick={onClose}>
            <div
                className="pc-import-modal"
                style={
                    boxTheme ? ({ '--box-theme': boxTheme, '--primary': boxTheme } as React.CSSProperties) : undefined
                }
                onClick={(e) => e.stopPropagation()}
            >
                <header className="pc-import-modal__header">
                    <div className="pc-import-modal__title-group">
                        <CloudDownload size={20} className="pc-import-modal__icon" />
                        <h3 className="modal-title text-title-primary">Import & Restore Storage</h3>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={onClose}
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <nav className="pc-import-modal__tabs">
                    {isObr && (
                        <button
                            type="button"
                            className={`pc-import-modal__tab-btn ${activeTab === 'cloud' ? 'pc-import-modal__tab-btn--active' : ''}`}
                            onClick={() => {
                                setActiveTab('cloud');
                                setResultMessage(null);
                            }}
                        >
                            <Layers size={14} /> Cloud & Scene Backup
                        </button>
                    )}
                    <button
                        type="button"
                        className={`pc-import-modal__tab-btn ${activeTab === 'json' ? 'pc-import-modal__tab-btn--active' : ''}`}
                        onClick={() => {
                            setActiveTab('json');
                            setResultMessage(null);
                        }}
                    >
                        <FileJson size={14} /> JSON File Restore
                    </button>
                </nav>

                <div className="pc-import-modal__body">
                    {resultMessage && (
                        <div
                            className={`pc-import-result-banner ${
                                resultMessage.type === 'success'
                                    ? 'pc-import-result-banner--success'
                                    : 'pc-import-result-banner--error'
                            }`}
                        >
                            {resultMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>{resultMessage.text}</span>
                        </div>
                    )}

                    {activeTab === 'cloud' && isObr && (
                        <PcImportCloudSection
                            currentBoxName={currentBoxName}
                            isProcessing={isProcessing}
                            onImportCloud={handleImportCloud}
                            onScanOpenScene={handleScanOpenScene}
                        />
                    )}

                    {activeTab === 'json' && (
                        <PcImportJsonSection
                            activeCampaign={activeCampaign}
                            effectiveTrainer={effectiveTrainer}
                            destination={destination}
                            setDestination={setDestination}
                            duplicateMode={duplicateMode}
                            setDuplicateMode={setDuplicateMode}
                            isProcessing={isProcessing}
                            fileInputRef={fileInputRef}
                            onFileSelected={handleFileSelected}
                        />
                    )}
                </div>

                <footer className="pc-import-modal__footer">
                    <button type="button" className="action-button action-button--dark" onClick={onClose}>
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};
