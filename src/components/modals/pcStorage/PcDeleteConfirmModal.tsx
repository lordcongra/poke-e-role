import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import './PcDeleteConfirmModal.css';

interface PcDeleteConfirmModalProps {
    type: 'trainer' | 'campaign';
    name: string;
    storedCount?: number;
    partyCount?: number;
    onConfirm: (options?: { deletePc?: boolean; deleteBelt?: boolean }) => void;
    onCancel: () => void;
}

export const PcDeleteConfirmModal: React.FC<PcDeleteConfirmModalProps> = ({
    type,
    name,
    storedCount = 0,
    partyCount = 0,
    onConfirm,
    onCancel
}) => {
    const [deletePc, setDeletePc] = React.useState(false);
    const [deleteBelt, setDeleteBelt] = React.useState(false);

    return (
        <div className="modal-backdrop pc-delete-modal-backdrop" onClick={onCancel}>
            <div className="modal-container pc-delete-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header pc-delete-modal__header">
                    <div className="pc-delete-modal__title-group">
                        <AlertTriangle size={20} className="pc-delete-modal__icon" />
                        <h3 className="modal-title text-title-primary">
                            Delete {type === 'trainer' ? 'Trainer Profile' : 'Campaign'}?
                        </h3>
                    </div>
                </header>

                <div className="pc-delete-modal__body">
                    <p className="text-subtext">
                        Are you sure you want to delete <strong>{name}</strong>?
                    </p>
                    {type === 'trainer' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="pc-delete-modal__note text-subtext">
                                By default, Pokémon in {name}&apos;s PC storage and belt will be safely transferred to
                                your remaining active trainer&apos;s PC boxes so no data is lost.
                            </div>
                            {storedCount > 0 && (
                                <label
                                    className="text-subtext"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={deletePc}
                                        onChange={(e) => setDeletePc(e.target.checked)}
                                    />
                                    <span>
                                        Also delete all stored Pokémon in <strong>{name}&apos;s PC</strong> (
                                        {storedCount} Pokémon)
                                    </span>
                                </label>
                            )}
                            {partyCount > 0 && (
                                <label
                                    className="text-subtext"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={deleteBelt}
                                        onChange={(e) => setDeleteBelt(e.target.checked)}
                                    />
                                    <span>
                                        Also delete all active Pokémon on <strong>{name}&apos;s Belt</strong> (
                                        {partyCount} Pokémon)
                                    </span>
                                </label>
                            )}
                        </div>
                    ) : (
                        <div className="pc-delete-modal__note text-subtext">
                            This will remove the campaign, its trainers, and PC box layouts. This action cannot be
                            undone.
                        </div>
                    )}
                    <div
                        className="pc-delete-modal__note text-subtext"
                        style={{
                            color: 'var(--semantic-danger, #ef4444)',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '10px'
                        }}
                    >
                        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                        <span>
                            <strong>Table Sync Notice:</strong> Deleting this{' '}
                            {type === 'trainer' ? 'trainer' : 'campaign'} will synchronize across the room and remove it
                            on both Player and GM ends.
                        </span>
                    </div>
                </div>

                <footer className="modal-footer pc-delete-modal__footer">
                    <button type="button" className="action-button action-button--dark" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--danger"
                        style={{
                            background: 'var(--semantic-danger, #ef4444)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onClick={() => onConfirm({ deletePc, deleteBelt })}
                    >
                        <Trash2 size={14} /> Delete {type === 'trainer' ? 'Trainer' : 'Campaign'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
