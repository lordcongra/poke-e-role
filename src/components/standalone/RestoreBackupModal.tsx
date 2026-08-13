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
                <h3 className="restore-modal__title">📂 Restore Master Backup</h3>

                <p className="restore-modal__desc">How would you like to apply this backup to your directory?</p>

                <div className="restore-modal__options">
                    <div className="restore-modal__option">
                        <h4>Merge (Recommended)</h4>
                        <p>
                            Adds new files and folders from the backup while keeping your current ones intact.
                            Characters that share the same ID will be updated.
                        </p>
                        <button className="action-button action-button--dark restore-modal__btn" onClick={onMerge}>
                            🪄 Merge Files
                        </button>
                    </div>

                    <div className="restore-modal__option">
                        <h4>Overwrite</h4>
                        <p>
                            Replaces your directory structure completely. Existing files and folders will be permanently
                            lost if they are not included in the backup.
                        </p>
                        <button className="action-button action-button--red restore-modal__btn" onClick={onOverwrite}>
                            ⚠️ Overwrite All
                        </button>
                    </div>
                </div>

                <div className="restore-modal__actions">
                    <button type="button" className="action-button restore-modal__btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
