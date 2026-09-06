import { Save, AlertTriangle, Info, Folder, FileText, XCircle, Download } from 'lucide-react';
import './BackupModal.css';

interface BackupModalProps {
    characterCount: number;
    folderCount: number;
    onConfirm: () => void;
    onClose: () => void;
}

export function BackupModal({ characterCount, folderCount, onConfirm, onClose }: BackupModalProps) {
    return (
        <div className="backup-modal__overlay" onClick={onClose}>
            <div className="backup-modal__content" onClick={(e) => e.stopPropagation()}>
                <h3 className="backup-modal__title text-title-primary">
                    <Save size={20} /> Master Directory Backup
                </h3>

                <p className="backup-modal__desc text-label" style={{ color: 'var(--text-main)' }}>
                    Export your entire directory hierarchy into a unified master backup JSON file that can be restored
                    at any time.
                </p>

                <div className="backup-modal__summary">
                    <div className="backup-modal__summary-item text-label">
                        <FileText size={16} />
                        <span>
                            <strong className="text-value-highlight">{characterCount}</strong> Character Sheet
                            {characterCount === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="backup-modal__summary-item text-label">
                        <Folder size={16} />
                        <span>
                            <strong className="text-value-highlight">{folderCount}</strong> Folder
                            {folderCount === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>

                <div className="backup-modal__notice backup-modal__notice--warning">
                    <AlertTriangle size={18} className="backup-modal__notice-icon backup-modal__notice-icon--warning" />
                    <div className="backup-modal__notice-body">
                        <strong className="text-label backup-modal__notice-heading">
                            Homebrew Data Is Not Included
                        </strong>
                        <p className="text-subtext backup-modal__notice-text">
                            This master backup saves your directory sheets and folder organization, but does{' '}
                            <strong>NOT</strong> include custom Pokémon, Moves, Abilities, Items, Forms, Statuses, or
                            Types created in the Homebrew Manager. Please back up your homebrew data separately via the{' '}
                            <strong>Homebrew Manager</strong> in the top bar.
                        </p>
                    </div>
                </div>

                <div className="backup-modal__notice backup-modal__notice--info">
                    <Info size={18} className="backup-modal__notice-icon backup-modal__notice-icon--info" />
                    <div className="backup-modal__notice-body">
                        <strong className="text-label backup-modal__notice-heading">Local Custom Images Notice</strong>
                        <p className="text-subtext backup-modal__notice-text">
                            Locally uploaded custom images are stored inside browser storage and cannot be embedded into
                            backup files. Only external image URLs will be fully preserved across different devices.
                        </p>
                    </div>
                </div>

                <div className="backup-modal__actions">
                    <button
                        type="button"
                        className="action-button backup-modal__btn-cancel text-label"
                        style={{ color: 'var(--text-main)' }}
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--theme backup-modal__btn text-theme-header"
                        onClick={onConfirm}
                    >
                        <Download size={16} /> Download Master Backup
                    </button>
                </div>
            </div>
        </div>
    );
}
