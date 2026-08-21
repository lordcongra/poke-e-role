import { FolderOpen, Wand2, AlertTriangle, XCircle } from 'lucide-react';
import './RestoreBackupModal.css';

interface RestoreBackupModalProps {
    onMerge: () => void;
    onOverwrite: () => void;
    onCancel: () => void;
}

export function RestoreBackupModal({ onMerge, onOverwrite, onCancel }: RestoreBackupModalProps) {
    return (
        <div className="restore-modal__overlay" onClick={onCancel}>
            <div className="restore-modal__content" onClick={(e) => e.stopPropagation()}>
                <h3 className="restore-modal__title text-title-primary modal-title-with-icon">
                    <FolderOpen size={20} /> Restore Master Backup
                </h3>

                <p className="restore-modal__desc text-label" style={{ color: 'var(--text-main)' }}>
                    How would you like to apply this backup to your directory?
                </p>

                <div className="restore-modal__options">
                    <div className="restore-modal__option">
                        <h4 className="text-label" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                            Merge (Recommended)
                        </h4>
                        <p className="text-subtext">
                            Adds new files and folders from the backup while keeping your current ones intact.
                            Characters that share the same ID will be updated.
                        </p>
                        <button
                            className="action-button action-button--dark restore-modal__btn text-theme-header"
                            onClick={onMerge}
                        >
                            <Wand2 size={16} /> Merge Files
                        </button>
                    </div>

                    <div className="restore-modal__option">
                        <h4 className="text-label" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                            Overwrite
                        </h4>
                        <p className="text-subtext">
                            Replaces your directory structure completely. Existing files and folders will be permanently
                            lost if they are not included in the backup.
                        </p>
                        <button
                            className="action-button action-button--red restore-modal__btn text-theme-header"
                            onClick={onOverwrite}
                        >
                            <AlertTriangle size={16} /> Overwrite All
                        </button>
                    </div>
                </div>

                <div className="restore-modal__actions">
                    <button
                        type="button"
                        className="action-button restore-modal__btn-cancel text-label"
                        style={{ color: 'var(--text-main)' }}
                        onClick={onCancel}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
