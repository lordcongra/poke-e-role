import { AlertTriangle } from 'lucide-react';

interface CustomInfoDeleteModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export function CustomInfoDeleteModal({ onConfirm, onCancel }: CustomInfoDeleteModalProps) {
    return (
        <div className="identity-header__modal-overlay">
            <div className="identity-header__modal-content">
                <h3
                    className="identity-header__modal-title text-title-primary"
                    style={{
                        color: 'var(--semantic-danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <AlertTriangle size={20} /> Confirm Deletion
                </h3>
                <p className="identity-header__modal-text text-subtext">
                    Are you sure you want to delete this Custom Field?
                </p>
                <div className="identity-header__modal-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark identity-header__modal-btn"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red identity-header__modal-btn"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
