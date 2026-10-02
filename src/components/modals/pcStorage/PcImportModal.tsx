import React, { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcStorageData, CampaignProfile } from '../../../types/pcStorageTypes';
import { importPcBackupJson } from '../../../utils/pc/pcJsonBackupOps';
import { scanSceneBackupTokens } from '../../../utils/pc/pcBackupSceneSync';
import { restoreTokensIntoPcStorage } from '../../../utils/pc/pcCloudRestoreOps';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { CloudDownload, FileJson, Upload, CheckCircle2, AlertCircle, X, Layers, Sparkles } from 'lucide-react';
import './PcImportModal.css';

interface PcImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    pcData: PcStorageData;
    activeCampaign: CampaignProfile;
    currentBoxName?: string;
    boxTheme?: string;
    onImportCloudScene: () => Promise<void>;
    onImportJsonSuccess: (nextData: PcStorageData, importedPokemonCount: number, importedCampaignCount: number) => void;
    onScanSceneSuccess?: (nextData: PcStorageData, importedCount: number, beltCount: number, boxCount: number) => void;
}

export const PcImportModal: React.FC<PcImportModalProps> = ({
    isOpen,
    onClose,
    pcData,
    activeCampaign: _activeCampaign,
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
            const res = restoreTokensIntoPcStorage(foundTokens, currentData, 0, role, myPlayerId);

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

        setIsProcessing(true);
        setResultMessage(null);
        try {
            const res = await importPcBackupJson(file, pcData);
            if (res.success && res.nextData) {
                onImportJsonSuccess(res.nextData, res.importedPokemonCount || 0, res.importedCampaignCount || 0);
                setResultMessage({
                    type: 'success',
                    text: `Successfully restored! Merged ${res.importedPokemonCount || 0} Pokémon and ${res.importedCampaignCount || 0} campaign(s).`
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div className="pc-import-card">
                                <div className="pc-import-card__header">
                                    <Sparkles size={16} />
                                    <span>Option A: Import from Owlbear Cloud Scene Asset</span>
                                </div>
                                <p className="pc-import-card__desc">
                                    Pulls Pokémon from a previously exported Owlbear Rodeo Scene Asset file (.json)
                                    saved to your Owlbear asset library and loads them into &quot;{currentBoxName}
                                    &quot;.
                                </p>
                                <button
                                    type="button"
                                    className="action-button action-button--theme"
                                    onClick={handleImportCloud}
                                    disabled={isProcessing}
                                >
                                    <Upload size={14} /> Select Cloud Scene Asset...
                                </button>
                            </div>

                            <div className="pc-import-card">
                                <div className="pc-import-card__header">
                                    <Layers size={16} />
                                    <span>Option B: Scan Open Backup Scene</span>
                                </div>
                                <p className="pc-import-card__desc">
                                    Navigate to your dedicated Owlbear Rodeo backup scene where your Pokémon tokens are
                                    placed. Once in the scene, click below to scan and sync all tokens into your PC
                                    storage.
                                </p>
                                <button
                                    type="button"
                                    className="action-button action-button--dark"
                                    onClick={handleScanOpenScene}
                                    disabled={isProcessing}
                                >
                                    <Layers size={14} /> Scan & Sync Open Scene Tokens
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'json' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div
                                className="pc-import-dropzone"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleFileSelected(file);
                                }}
                            >
                                <FileJson size={32} className="pc-import-dropzone__icon" />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                        Click or drop a PC Backup JSON file here
                                    </div>
                                    <div className="text-subtext" style={{ marginTop: '4px' }}>
                                        Accepts .json backup files exported from Poké-e-Role
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="action-button action-button--theme"
                                    style={{ marginTop: '6px' }}
                                    disabled={isProcessing}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Upload size={14} /> Browse Backup File...
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelected(file);
                                        e.target.value = '';
                                    }}
                                />
                            </div>

                            <p className="pc-import-card__desc" style={{ textAlign: 'center' }}>
                                Restoring from JSON merges new campaigns and Pokémon safely without overwriting your
                                existing data.
                            </p>
                        </div>
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
