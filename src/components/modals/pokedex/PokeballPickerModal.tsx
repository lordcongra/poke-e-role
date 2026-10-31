import { useState, useRef, useMemo } from 'react';
import OBR, { type ImageDownload } from '@owlbear-rodeo/sdk';
import { imageManager, autoCropTransparency } from '../../../utils/graphics/imageManager';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import {
    POKEBALL_PRESETS,
    resolvePokeballUrl,
    DEFAULT_POKEBALL_ID
} from '../../../utils/graphics/pokeballConstants';
import { Upload, Globe, Image as ImageIcon, Trash2, Info, X } from 'lucide-react';
import './PokeballPickerModal.css';

export interface PokeballPickerModalProps {
    isOpen: boolean;
    pokemonName: string;
    currentBall?: string;
    onClose: () => void;
    onSelectBall: (ball: string | undefined) => void;
}

export function PokeballPickerModal({
    isOpen,
    pokemonName,
    currentBall,
    onClose,
    onSelectBall
}: PokeballPickerModalProps) {
    const [customUrl, setCustomUrl] = useState<string>('');
    const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeBallIdOrUrl = currentBall || DEFAULT_POKEBALL_ID;
    const resolvedRawUrl = useMemo(() => resolvePokeballUrl(activeBallIdOrUrl), [activeBallIdOrUrl]);
    const resolvedPreview = useResolvedImageUrl(resolvedRawUrl);

    const activePreset = useMemo(() => {
        if (!currentBall) return POKEBALL_PRESETS.find((p) => p.id === DEFAULT_POKEBALL_ID);
        const norm = currentBall.replace(/\.svg$/i, '').toLowerCase();
        return POKEBALL_PRESETS.find((p) => p.id === norm);
    }, [currentBall]);

    if (!isOpen) return null;

    const cleanupPreviousLocalImage = () => {
        if (currentBall && currentBall.startsWith('local-img:')) {
            imageManager.deleteImage(currentBall).catch((e) => {
                console.error('[PokeballPickerModal] Failed to cleanup previous local image:', e);
            });
        }
    };

    const handleSelectPreset = (presetId: string) => {
        cleanupPreviousLocalImage();
        onSelectBall(presetId === DEFAULT_POKEBALL_ID ? undefined : presetId);
        onClose();
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
                        cleanupPreviousLocalImage();
                        onSelectBall(selectedUrl);
                        onClose();
                    }
                }
            } else {
                setShowUrlInput(true);
            }
        } catch (error) {
            console.error('[PokeballPickerModal] Failed to select image from Owlbear library:', error);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const croppedBlob = await autoCropTransparency(file, true);
            const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type });
            const imgId = await imageManager.saveImage(croppedFile);

            cleanupPreviousLocalImage();
            onSelectBall(imgId);
            onClose();
        } catch (error) {
            console.error('[PokeballPickerModal] Failed to save Pokéball image locally:', error);
            alert('Failed to save Pokéball image locally. It may be too large or database storage was denied.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveUrl = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = customUrl.trim();
        if (!trimmed) return;

        cleanupPreviousLocalImage();
        onSelectBall(trimmed);
        onClose();
    };

    const handleClearBall = () => {
        cleanupPreviousLocalImage();
        onSelectBall(undefined);
        onClose();
    };

    return (
        <div className="pokeball-picker-modal__overlay" onClick={onClose}>
            <div className="pokeball-picker-modal__content" onClick={(e) => e.stopPropagation()}>
                <div className="pokeball-picker-modal__header">
                    <h3 className="pokeball-picker-modal__title text-title-primary">
                        Pokéball: {pokemonName}
                    </h3>
                    <button
                        type="button"
                        className="pokeball-picker-modal__close-btn"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="pokeball-picker-modal__body">
                    {/* Current ball preview row */}
                    <div className="pokeball-picker-modal__preview-row">
                        <div className="pokeball-picker-modal__preview-box">
                            <img
                                src={resolvedPreview}
                                alt="Current Pokéball"
                                className="pokeball-picker-modal__preview-img"
                            />
                        </div>
                        <div className="pokeball-picker-modal__preview-meta">
                            <span className="pokeball-picker-modal__preview-name text-label">
                                {activePreset ? activePreset.name : 'Custom Pokéball Artwork'}
                            </span>
                            <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                {currentBall ? `Type: ${activePreset ? 'Preset' : 'Custom Image'}` : 'Standard Poké Ball'}
                            </span>
                        </div>
                    </div>

                    {/* Presets grid */}
                    <div>
                        <div className="pokeball-picker-modal__section-title">Classic Pokéball Presets</div>
                        <div className="pokeball-picker-modal__preset-grid">
                            {POKEBALL_PRESETS.map((preset) => {
                                const isCurrent =
                                    (currentBall && currentBall.toLowerCase() === preset.id) ||
                                    (!currentBall && preset.id === DEFAULT_POKEBALL_ID);
                                return (
                                    <button
                                        key={`pokeball-preset-${preset.id}`}
                                        type="button"
                                        className={`pokeball-picker-modal__preset-btn ${
                                            isCurrent ? 'pokeball-picker-modal__preset-btn--active' : ''
                                        }`}
                                        onClick={() => handleSelectPreset(preset.id)}
                                        title={preset.name}
                                    >
                                        <img
                                            src={resolvePokeballUrl(preset.id)}
                                            alt={preset.name}
                                            className="pokeball-picker-modal__preset-icon"
                                            loading="lazy"
                                        />
                                        <span className="pokeball-picker-modal__preset-label">
                                            {preset.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom upload controls */}
                    <div className="pokeball-picker-modal__custom-controls">
                        <div className="pokeball-picker-modal__section-title">Custom Artwork</div>
                        <div className="pokeball-picker-modal__custom-buttons">
                            {OBR.isAvailable && (
                                <button
                                    type="button"
                                    className="action-button action-button--dark pokeball-picker-modal__custom-btn"
                                    onClick={handleObrPickImage}
                                    title="Choose artwork from Owlbear Rodeo image library"
                                >
                                    <ImageIcon size={14} /> Owlbear Library
                                </button>
                            )}

                            <button
                                type="button"
                                className="action-button action-button--dark pokeball-picker-modal__custom-btn"
                                onClick={() => fileInputRef.current?.click()}
                                title="Upload custom image from your device"
                            >
                                <Upload size={14} /> Upload Device
                            </button>

                            <button
                                type="button"
                                className="action-button action-button--dark pokeball-picker-modal__custom-btn"
                                onClick={() => setShowUrlInput((prev) => !prev)}
                                title="Enter custom web image URL"
                            >
                                <Globe size={14} /> Web URL
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </div>

                        {showUrlInput && (
                            <form className="pokeball-picker-modal__url-form" onSubmit={handleSaveUrl}>
                                <input
                                    type="url"
                                    className="pokeball-picker-modal__url-input"
                                    placeholder="https://example.com/ball.png"
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="action-button action-button--theme"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    disabled={!customUrl.trim()}
                                >
                                    Save
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Teammate visibility info notice */}
                    <div className="pokeball-picker-modal__notice">
                        <Info size={14} />
                        <span>
                            Presets, Owlbear Library assets, and Web URLs are visible to all players in the room. Local device uploads are stored in your browser.
                        </span>
                    </div>
                </div>

                <div className="pokeball-picker-modal__footer">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={handleClearBall}
                        title="Revert to standard Poké Ball"
                    >
                        <Trash2 size={14} /> Revert to Default
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

