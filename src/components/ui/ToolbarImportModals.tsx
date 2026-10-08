import React from 'react';
import { AlertTriangle, HardDrive, Upload, XCircle } from 'lucide-react';

interface ToolbarImportModalsProps {
    importData: Record<string, unknown> | null;
    showMasterBackupModal: boolean;
    onCloseImport: () => void;
    onConfirmImport: () => void | Promise<void>;
    onOpenPcStorage: () => void;
    onCloseMasterBackup: () => void;
}

export const ToolbarImportModals: React.FC<ToolbarImportModalsProps> = ({
    importData,
    showMasterBackupModal,
    onCloseImport,
    onConfirmImport,
    onOpenPcStorage,
    onCloseMasterBackup
}) => {
    return (
        <>
            {/* Standalone / Token Import Prompt */}
            {importData && (
                <div className="global-toolbar__modal-overlay">
                    <div className="global-toolbar__modal-content">
                        <h3 className="global-toolbar__modal-title">
                            <AlertTriangle size={20} /> Confirm Import
                        </h3>
                        <p className="global-toolbar__modal-text text-subtext">
                            Import character data? This will completely overwrite the current token.
                        </p>
                        <div className="global-toolbar__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark global-toolbar__modal-btn"
                                onClick={onCloseImport}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red global-toolbar__modal-btn"
                                onClick={onConfirmImport}
                            >
                                <Upload size={16} /> Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Master Backup Prompt */}
            {showMasterBackupModal && (
                <div className="global-toolbar__modal-overlay">
                    <div className="global-toolbar__modal-content global-toolbar__modal-content--master-backup">
                        <h3 className="global-toolbar__modal-title global-toolbar__modal-title--info">
                            <HardDrive size={20} color="var(--primary)" /> Master Backup File Detected
                        </h3>
                        <p className="global-toolbar__modal-text text-subtext">
                            This Token Import button is only for importing a single character sheet into the selected
                            token.
                        </p>
                        <p className="global-toolbar__modal-text text-subtext">
                            To transfer multiple Pokémon and Trainers, download a PC backup from Standalone (PC Storage
                            &gt; Backup &amp; Cloud &gt; Download JSON) and import THAT file into OBR (PC Storage &gt;
                            Import &amp; Restore). To import just this one character, use the single-character Export
                            button on their sheet in Standalone.
                        </p>
                        <div className="global-toolbar__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--theme global-toolbar__modal-btn"
                                onClick={() => {
                                    onCloseMasterBackup();
                                    onOpenPcStorage();
                                }}
                            >
                                <HardDrive size={16} /> Open PC Storage
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark global-toolbar__modal-btn"
                                onClick={onCloseMasterBackup}
                            >
                                <XCircle size={16} /> Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
