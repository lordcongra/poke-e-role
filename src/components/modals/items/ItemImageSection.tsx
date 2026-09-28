import React from 'react';
import { Upload, Globe, Image as ImageIcon, Trash2, Info } from 'lucide-react';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import OBR from '@owlbear-rodeo/sdk';

interface ItemImageSectionProps {
    imageUrl?: string;
    resolvedImageUrl: string | null;
    itemName: string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    showUrlInput: boolean;
    setShowUrlInput: (show: boolean) => void;
    urlText: string;
    setUrlText: (url: string) => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectObrImage: () => void;
    onSaveUrl: () => void;
    onRemoveImage: () => void;
}

export function ItemImageSection({
    imageUrl,
    resolvedImageUrl,
    itemName,
    fileInputRef,
    showUrlInput,
    setShowUrlInput,
    urlText,
    setUrlText,
    onFileUpload,
    onSelectObrImage,
    onSaveUrl,
    onRemoveImage
}: ItemImageSectionProps) {
    return (
        <div className="item-edit-modal__img-section">
            <div className="item-edit-modal__img-preview-box">
                {resolvedImageUrl ? (
                    <img
                        src={resolvedImageUrl}
                        alt={itemName || 'Item Artwork'}
                        className="item-edit-modal__preview-img"
                    />
                ) : (
                    <div className="item-edit-modal__img-placeholder">
                        <ImageIcon size={38} className="item-edit-modal__placeholder-icon" />
                        <span className="item-edit-modal__placeholder-text text-subtext">No Image</span>
                    </div>
                )}
            </div>

            <div className="item-edit-modal__img-actions">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                />

                {isStandaloneMode ? (
                    <button
                        type="button"
                        className="action-button action-button--dark item-edit-modal__img-action-btn text-theme-header"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload artwork from your device"
                    >
                        <Upload size={13} /> Upload Image
                    </button>
                ) : (
                    <>
                        {OBR.isAvailable && (
                            <button
                                type="button"
                                className="action-button action-button--dark item-edit-modal__img-action-btn text-theme-header"
                                onClick={onSelectObrImage}
                                title="Pick from Owlbear Rodeo Images"
                            >
                                <Upload size={13} /> OBR Library
                            </button>
                        )}
                        <button
                            type="button"
                            className="action-button action-button--dark item-edit-modal__img-action-btn text-theme-header"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload local image from device (Only visible to you. For other players to see it, use OBR Library or Image Link)"
                        >
                            <Upload size={13} /> Upload Local
                        </button>
                    </>
                )}

                <button
                    type="button"
                    className="action-button action-button--dark item-edit-modal__img-action-btn text-theme-header"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    title="Paste direct web image link (Visible to everyone)"
                >
                    <Globe size={13} /> Image Link
                </button>

                {imageUrl && (
                    <button
                        type="button"
                        className="action-button action-button--dark item-edit-modal__img-action-btn item-edit-modal__img-action-btn--delete"
                        onClick={onRemoveImage}
                        title="Remove image"
                    >
                        <Trash2 size={13} /> Remove
                    </button>
                )}
            </div>

            {!isStandaloneMode && (
                <div className="item-edit-modal__img-notice text-subtext">
                    <Info size={13} className="item-edit-modal__img-notice-icon" />
                    <span>
                        <strong>Upload Local</strong> is only visible on your screen. Use <strong>OBR Library</strong>{' '}
                        or <strong>Image Link</strong> if you want other players and GM to see the item artwork.
                    </span>
                </div>
            )}

            {showUrlInput && (
                <div className="item-edit-modal__url-input-container">
                    <input
                        type="text"
                        className="item-edit-modal__url-input text-label"
                        style={{ color: 'var(--text-main)' }}
                        placeholder="Paste image link (https://...)"
                        value={urlText}
                        onChange={(e) => setUrlText(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="button"
                        className="action-button action-button--theme item-edit-modal__img-action-btn text-theme-header"
                        onClick={onSaveUrl}
                        disabled={!urlText.trim()}
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
    );
}
