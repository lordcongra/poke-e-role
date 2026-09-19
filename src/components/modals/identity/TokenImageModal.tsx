import { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Globe, Trash2, AlertTriangle } from 'lucide-react';

interface TokenImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    hasCurrentImage: boolean;
    onUploadFile: (file: File) => void;
    onEnterUrl: () => void;
    onDeleteImage: () => void;
}

export function TokenImageModal({
    isOpen,
    onClose,
    hasCurrentImage,
    onUploadFile,
    onEnterUrl,
    onDeleteImage
}: TokenImageModalProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadFile(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <div className="identity-header__modal-overlay identity-header__modal-overlay--high-z">
                <div className="identity-header__modal-content">
                    <h3
                        className="identity-header__modal-title text-title-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <ImageIcon size={20} /> Update Artwork
                    </h3>
                    <p className="identity-header__modal-text identity-header__picker-desc text-subtext">
                        Choose how you'd like to supply or manage the image for this character.
                    </p>

                    <div className="identity-header__picker-options">
                        <button
                            type="button"
                            className="action-button action-button--dark identity-header__picker-btn"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span className="identity-header__picker-btn-title text-theme-header">
                                <Upload size={16} /> Upload Local File
                            </span>
                            <span className="identity-header__picker-btn-sub text-subtext" style={{ color: 'white' }}>
                                (Recommended - Saved safely to your browser's database)
                            </span>
                        </button>

                        <button
                            type="button"
                            className="action-button identity-header__picker-btn identity-header__picker-btn--web"
                            onClick={onEnterUrl}
                        >
                            <span className="identity-header__picker-btn-title text-theme-header">
                                <Globe size={16} /> Use Web URL
                            </span>
                            <span className="identity-header__picker-btn-sub text-subtext" style={{ color: 'white' }}>
                                (Lightweight - Image breaks if the web link dies)
                            </span>
                        </button>

                        {hasCurrentImage && !confirmDelete && (
                            <button
                                type="button"
                                className="action-button action-button--red identity-header__picker-btn identity-header__picker-btn--danger"
                                onClick={() => setConfirmDelete(true)}
                            >
                                <span className="identity-header__picker-btn-title identity-header__picker-btn-title--danger">
                                    <Trash2 size={16} /> Remove Current Image
                                </span>
                                <span className="identity-header__picker-btn-sub text-subtext">
                                    (Revert to the default placeholder avatar)
                                </span>
                            </button>
                        )}

                        {confirmDelete && (
                            <div className="identity-header__delete-confirm-box">
                                <div className="identity-header__delete-confirm-msg">
                                    <AlertTriangle size={16} color="var(--semantic-danger)" />
                                    <span>Are you sure you want to remove this artwork?</span>
                                </div>
                                <div className="identity-header__delete-confirm-actions">
                                    <button
                                        type="button"
                                        className="action-button action-button--red"
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        onClick={() => {
                                            setConfirmDelete(false);
                                            onDeleteImage();
                                        }}
                                    >
                                        Yes, Remove
                                    </button>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark"
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="identity-header__modal-actions" style={{ marginTop: '12px' }}>
                        <button
                            type="button"
                            className="action-button action-button--dark identity-header__modal-btn"
                            onClick={() => {
                                setConfirmDelete(false);
                                onClose();
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="identity-header__file-input"
            />
        </>
    );
}
