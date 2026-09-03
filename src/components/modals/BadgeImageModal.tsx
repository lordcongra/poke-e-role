import { useState, useRef, useEffect } from 'react';
import OBR, { type ImageDownload } from '@owlbear-rodeo/sdk';
import type { Badge } from '../../store/entityTypes';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager, autoCropTransparency } from '../../utils/imageManager';
import { Image as ImageIcon, Upload, Globe, Trash2, XCircle } from 'lucide-react';
import './BadgeImageModal.css';

interface BadgeImageModalProps {
    badge: Badge;
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (url: string) => void;
    onClearImage: () => void;
}

export function BadgeImageModal({ badge, isOpen, onClose, onSelectImage, onClearImage }: BadgeImageModalProps) {
    const [resolvedPreview, setResolvedPreview] = useState<string>('');
    const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
    const [customUrl, setCustomUrl] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isMounted = true;

        const resolvePreview = async () => {
            if (!badge.imageUrl) {
                if (isMounted) setResolvedPreview('');
                return;
            }

            if (isStandaloneMode && badge.imageUrl.startsWith('local-img:')) {
                try {
                    const url = await imageManager.getImageUrl(badge.imageUrl);
                    if (isMounted) setResolvedPreview(url || '');
                } catch (error) {
                    console.error('[BadgeImageModal] Failed to resolve preview image:', error);
                    if (isMounted) setResolvedPreview('');
                }
            } else {
                if (isMounted) setResolvedPreview(badge.imageUrl);
            }
        };

        if (isOpen) {
            resolvePreview();
            setShowUrlInput(false);
            setCustomUrl('');
        }

        return () => {
            isMounted = false;
        };
    }, [badge.imageUrl, isOpen]);

    if (!isOpen) return null;

    const handleStandaloneFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const croppedBlob = await autoCropTransparency(file, true);
            const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type });
            const imgId = await imageManager.saveImage(croppedFile);

            if (badge.imageUrl && badge.imageUrl.startsWith('local-img:')) {
                try {
                    await imageManager.deleteImage(badge.imageUrl);
                } catch (e) {
                    console.error('[BadgeImageModal] Failed to cleanup old image:', e);
                }
            }

            onSelectImage(imgId);
            onClose();
        } catch (error) {
            console.error('[BadgeImageModal] Failed to save image to IndexedDB:', error);
            alert('Failed to save badge image locally. It may be too large or your browser blocked the database.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleObrPickImage = async () => {
        if (!OBR.isAvailable) {
            setShowUrlInput(true);
            return;
        }

        try {
            if (typeof OBR.assets?.downloadImages === 'function') {
                const images: ImageDownload[] = await OBR.assets.downloadImages();
                if (images && images.length > 0) {
                    const selectedUrl = images[0].image?.url || '';
                    if (selectedUrl) {
                        onSelectImage(selectedUrl);
                        onClose();
                    }
                }
            } else {
                setShowUrlInput(true);
            }
        } catch (error) {
            console.error('[BadgeImageModal] Failed to select image from Owlbear library:', error);
        }
    };

    const handleSaveUrl = () => {
        const trimmed = customUrl.trim();
        if (!trimmed) return;

        if (badge.imageUrl && badge.imageUrl.startsWith('local-img:')) {
            imageManager.deleteImage(badge.imageUrl).catch((e) => {
                console.error('[BadgeImageModal] Failed to cleanup previous local image:', e);
            });
        }

        onSelectImage(trimmed);
        onClose();
    };

    const handleRemoveImage = async () => {
        if (badge.imageUrl && badge.imageUrl.startsWith('local-img:')) {
            try {
                await imageManager.deleteImage(badge.imageUrl);
            } catch (error) {
                console.error('[BadgeImageModal] Failed to delete image from IndexedDB:', error);
            }
        }
        onClearImage();
        onClose();
    };

    return (
        <div className="badge-image-modal__overlay">
            <div className="badge-image-modal__content">
                <h3 className="badge-image-modal__title text-title-primary">
                    <ImageIcon size={20} /> {badge.name ? `Badge: ${badge.name}` : 'Badge Artwork'}
                </h3>

                {resolvedPreview && (
                    <div className="badge-image-modal__preview-container">
                        <img
                            src={resolvedPreview}
                            alt={badge.name || 'Badge'}
                            className="badge-image-modal__preview-image"
                        />
                    </div>
                )}

                <p className="badge-image-modal__text text-subtext">
                    {badge.imageUrl
                        ? 'Update or remove the graphic image for this badge.'
                        : 'Choose an image to display instead of the emoji.'}
                </p>

                {showUrlInput ? (
                    <div className="badge-image-modal__url-container">
                        <input
                            type="text"
                            className="trainer-badge-row__input text-label"
                            placeholder="Paste image URL (https://...)"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            autoFocus
                        />
                        <div className="badge-image-modal__actions" style={{ marginTop: '8px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark badge-image-modal__action-btn"
                                onClick={() => setShowUrlInput(false)}
                            >
                                <XCircle size={16} /> Back
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--theme badge-image-modal__action-btn"
                                onClick={handleSaveUrl}
                                disabled={!customUrl.trim()}
                            >
                                Save URL
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="badge-image-modal__options">
                        {isStandaloneMode ? (
                            <>
                                <button
                                    type="button"
                                    className="action-button action-button--dark badge-image-modal__btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className="badge-image-modal__btn-title text-theme-header">
                                        <Upload size={16} /> Upload Local File
                                    </span>
                                    <span className="badge-image-modal__btn-sub text-subtext">
                                        (Auto-cropped & saved to browser database)
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--secondary badge-image-modal__btn"
                                    onClick={() => setShowUrlInput(true)}
                                >
                                    <span className="badge-image-modal__btn-title text-theme-header">
                                        <Globe size={16} /> Use Web URL
                                    </span>
                                    <span className="badge-image-modal__btn-sub text-subtext">
                                        (Direct link to online image)
                                    </span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="action-button action-button--dark badge-image-modal__btn"
                                    onClick={handleObrPickImage}
                                >
                                    <span className="badge-image-modal__btn-title text-theme-header">
                                        <ImageIcon size={16} /> Owlbear Rodeo Library
                                    </span>
                                    <span className="badge-image-modal__btn-sub text-subtext">
                                        (Select from your scene assets)
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--secondary badge-image-modal__btn"
                                    onClick={() => setShowUrlInput(true)}
                                >
                                    <span className="badge-image-modal__btn-title text-theme-header">
                                        <Globe size={16} /> Use Web URL
                                    </span>
                                    <span className="badge-image-modal__btn-sub text-subtext">
                                        (Direct link to online image)
                                    </span>
                                </button>
                            </>
                        )}

                        {Boolean(badge.imageUrl) && (
                            <button
                                type="button"
                                className="action-button action-button--red badge-image-modal__btn"
                                onClick={handleRemoveImage}
                            >
                                <span className="badge-image-modal__btn-title">
                                    <Trash2 size={16} /> Remove Image
                                </span>
                                <span className="badge-image-modal__btn-sub text-subtext" style={{ color: 'white' }}>
                                    (Revert to emoji: {badge.emoji || '🏅'})
                                </span>
                            </button>
                        )}
                    </div>
                )}

                <div className="badge-image-modal__actions" style={{ marginTop: '16px' }}>
                    <button
                        type="button"
                        className="action-button action-button--dark badge-image-modal__action-btn"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Close
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleStandaloneFileUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
}
