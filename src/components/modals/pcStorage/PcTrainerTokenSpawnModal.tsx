import React, { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Image as ImageIcon, Disc, X, Upload, Shield } from 'lucide-react';
import './PcTrainerTokenSpawnModal.css';

interface PcTrainerTokenSpawnModalProps {
    isOpen: boolean;
    trainerName: string;
    onClose: () => void;
    onSpawnToken: (imageUrl: string) => Promise<void>;
}

export const PcTrainerTokenSpawnModal: React.FC<PcTrainerTokenSpawnModalProps> = ({
    isOpen,
    trainerName,
    onClose,
    onSpawnToken
}) => {
    const [isSpawning, setIsSpawning] = useState(false);
    const [standaloneUrl, setStandaloneUrl] = useState('');
    const [showStandaloneInput, setShowStandaloneInput] = useState(false);

    if (!isOpen) return null;

    const handleSelectFromLibrary = async () => {
        if (OBR.isAvailable && typeof OBR.assets?.downloadImages === 'function') {
            try {
                setIsSpawning(true);
                const images = await OBR.assets.downloadImages(false, trainerName, 'CHARACTER');
                if (images && images.length > 0) {
                    const url = images[0].image?.url || '';
                    if (url) {
                        await onSpawnToken(url);
                        return;
                    }
                }
            } catch (e) {
                console.warn('[PcTrainerTokenSpawnModal] Token image selection cancelled or failed:', e);
            } finally {
                setIsSpawning(false);
            }
        } else {
            setShowStandaloneInput(true);
        }
    };

    const handleUseDefaultPokeball = async () => {
        try {
            setIsSpawning(true);
            await onSpawnToken(getAbsolutePokeballUrl());
        } finally {
            setIsSpawning(false);
        }
    };

    const handleConfirmStandaloneUrl = async () => {
        const clean = standaloneUrl.trim();
        try {
            setIsSpawning(true);
            await onSpawnToken(clean || getAbsolutePokeballUrl());
        } finally {
            setIsSpawning(false);
        }
    };

    return (
        <div className="pc-spawn-modal__backdrop" onClick={onClose} role="presentation">
            <div
                className="pc-spawn-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pc-spawn-modal-title"
            >
                <div className="pc-spawn-modal__header">
                    <div className="pc-spawn-modal__title-group">
                        <Shield size={18} className="pc-spawn-modal__title-icon" />
                        <div>
                            <h3 id="pc-spawn-modal-title" className="pc-spawn-modal__title text-title-primary">
                                Link or Spawn Token
                            </h3>
                            <span className="pc-spawn-modal__subtitle text-subtext">
                                Link or spawn a token for &ldquo;{trainerName}&rdquo; to access their character sheet.
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pc-spawn-modal__close-btn"
                        onClick={onClose}
                        title="Close and skip for now"
                        aria-label="Close"
                        disabled={isSpawning}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="pc-spawn-modal__body">
                    <p className="pc-spawn-modal__description text-subtext">
                        This trainer profile currently has no active token linked. To open and edit their character
                        sheet, please choose an artwork option to spawn a token:
                    </p>

                    <div className="pc-spawn-modal__options">
                        <button
                            type="button"
                            className="pc-spawn-modal__option-card"
                            onClick={handleSelectFromLibrary}
                            disabled={isSpawning}
                        >
                            <div className="pc-spawn-modal__option-icon-wrapper">
                                {OBR.isAvailable ? <ImageIcon size={22} /> : <Upload size={22} />}
                            </div>
                            <div className="pc-spawn-modal__option-info">
                                <span className="pc-spawn-modal__option-title text-label">
                                    {OBR.isAvailable ? 'Select Token from OBR Library' : 'Custom Token Image'}
                                </span>
                                <span className="pc-spawn-modal__option-desc text-subtext">
                                    {OBR.isAvailable
                                        ? 'Pick character artwork directly from your Owlbear Rodeo asset library.'
                                        : 'Specify custom image URL for this trainer.'}
                                </span>
                            </div>
                        </button>

                        {showStandaloneInput && !OBR.isAvailable && (
                            <div className="pc-spawn-modal__standalone-input-group">
                                <input
                                    type="text"
                                    className="pc-spawn-modal__input"
                                    placeholder="Enter image URL or leave blank"
                                    value={standaloneUrl}
                                    onChange={(e) => setStandaloneUrl(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="action-button action-button--theme"
                                    onClick={handleConfirmStandaloneUrl}
                                    disabled={isSpawning}
                                >
                                    Confirm
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            className="pc-spawn-modal__option-card"
                            onClick={handleUseDefaultPokeball}
                            disabled={isSpawning}
                        >
                            <div className="pc-spawn-modal__option-icon-wrapper pc-spawn-modal__option-icon-wrapper--pokeball">
                                <Disc size={22} />
                            </div>
                            <div className="pc-spawn-modal__option-info">
                                <span className="pc-spawn-modal__option-title text-label">
                                    Use Default Pokéball Token
                                </span>
                                <span className="pc-spawn-modal__option-desc text-subtext">
                                    Spawn a standard Pokéball token placeholder on the map immediately.
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="pc-spawn-modal__footer">
                    <button
                        type="button"
                        className="action-button action-button--dark pc-spawn-modal__skip-btn"
                        onClick={onClose}
                        disabled={isSpawning}
                    >
                        Skip for Now
                    </button>
                </div>
            </div>
        </div>
    );
};
