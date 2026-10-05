import { FolderTree, FolderPlus, Layers, Wand2, Clock } from 'lucide-react';
import './LegacyNestingModal.css';

interface LegacyNestingModalProps {
    count: number;
    onAutoFolder: () => void;
    onFlatten: () => void;
    onClose: () => void;
}

export function LegacyNestingModal({ count, onAutoFolder, onFlatten, onClose }: LegacyNestingModalProps) {
    return (
        <div className="legacy-modal__overlay" onClick={onClose}>
            <div className="legacy-modal__content" onClick={(e) => e.stopPropagation()}>
                <h3 className="legacy-modal__title text-title-primary modal-title-with-icon">
                    <FolderTree size={20} style={{ color: 'var(--primary)' }} /> Legacy Nested Sheets Detected
                </h3>

                <p className="legacy-modal__desc text-label" style={{ color: 'var(--text-main)' }}>
                    In earlier versions, character sheets could be dragged directly inside other character sheets.
                    Pokérole now organizes sheets using folders to keep your directory clean, fast, and easy to
                    navigate.
                </p>

                <div className="legacy-modal__badge text-subtext">
                    Detected <strong>{count}</strong> sheet{count === 1 ? '' : 's'} currently nested inside another
                    character.
                </div>

                <div className="legacy-modal__options">
                    <div className="legacy-modal__option">
                        <div className="legacy-modal__option-header">
                            <FolderPlus size={18} style={{ color: 'var(--primary)' }} />
                            <h4 className="text-label" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                                Keep Structure with Folders (Recommended)
                            </h4>
                        </div>
                        <p className="text-subtext">
                            Preserves your current organization. Dedicated folders (like{' '}
                            <em>&quot;Character&apos;s Sub-Sheets&quot;</em>) will be automatically created under each
                            parent sheet to hold its nested characters, keeping everything right where you expect it.
                        </p>
                        <button
                            type="button"
                            className="action-button action-button--theme legacy-modal__btn text-theme-header"
                            onClick={onAutoFolder}
                        >
                            <Wand2 size={16} /> Auto-Folder Sheets
                        </button>
                    </div>

                    <div className="legacy-modal__option">
                        <div className="legacy-modal__option-header">
                            <Layers size={18} style={{ color: 'var(--secondary)' }} />
                            <h4 className="text-label" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                                Flatten Into One Layer
                            </h4>
                        </div>
                        <p className="text-subtext">
                            Moves all nested sheets out into the main directory (or parent folder) so every sheet sits
                            at the same top level side-by-side, with no sheets tucked inside other characters.
                        </p>
                        <button
                            type="button"
                            className="action-button action-button--dark legacy-modal__btn text-theme-header"
                            onClick={onFlatten}
                        >
                            <Layers size={16} /> Flatten to One Layer
                        </button>
                    </div>
                </div>

                <div className="legacy-modal__actions">
                    <button
                        type="button"
                        className="action-button legacy-modal__btn-cancel text-label"
                        style={{ color: 'var(--text-main)' }}
                        onClick={onClose}
                    >
                        <Clock size={16} /> Decide Later
                    </button>
                </div>
            </div>
        </div>
    );
}
