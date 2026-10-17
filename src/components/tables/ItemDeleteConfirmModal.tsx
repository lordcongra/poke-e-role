import type { InventoryItem } from '../../store/storeTypes';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';

interface ItemDeleteConfirmModalProps {
    item?: InventoryItem;
    onCancel: () => void;
    onConfirm: () => void;
}

export function ItemDeleteConfirmModal({ item, onCancel, onConfirm }: ItemDeleteConfirmModalProps) {
    return (
        <div className="inventory-table__modal-overlay">
            <div className="inventory-table__modal-content">
                <h3
                    className="inventory-table__modal-title modal-title-with-icon text-title-primary"
                    style={{ color: 'var(--semantic-danger)' }}
                >
                    <AlertTriangle size={20} /> Confirm Deletion
                </h3>
                <p
                    className="inventory-table__modal-text text-subtext"
                    style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}
                >
                    Are you sure you want to delete &ldquo;{item?.name || 'this Item'}&rdquo;?
                </p>
                <div className="inventory-table__modal-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark inventory-table__modal-btn text-theme-header"
                        onClick={onCancel}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red inventory-table__modal-btn text-theme-header"
                        onClick={onConfirm}
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
