import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import './TrainerGeneratorModal.css';

export interface TrainerTokenSectionProps {
    tokenImageMode: 'default' | 'prompt_each' | 'fallback_pokeball';
    setTokenImageMode: (mode: 'default' | 'prompt_each' | 'fallback_pokeball') => void;
    defaultImage: { url: string; width: number; height: number; name?: string } | null;
    setDefaultImage: (img: { url: string; width: number; height: number; name?: string } | null) => void;
    autoMatchSceneImages: boolean;
    setAutoMatchSceneImages: (val: boolean) => void;
    destination: 'new' | 'overwrite';
    setDestination: (dest: 'new' | 'overwrite') => void;
    generateTeam: boolean;
    teamSize: number;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export const TrainerTokenSection: React.FC<TrainerTokenSectionProps> = ({
    tokenImageMode,
    setTokenImageMode,
    defaultImage,
    setDefaultImage,
    autoMatchSceneImages,
    setAutoMatchSceneImages,
    destination,
    setDestination,
    generateTeam,
    teamSize,
    onOpenTooltip
}) => {
    const handlePickDefaultImage = async () => {
        if (!OBR.isAvailable) return;
        if (typeof OBR.assets?.downloadImages === 'function') {
            try {
                const images = await OBR.assets.downloadImages(false, undefined, 'CHARACTER');
                if (images && images.length > 0) {
                    setDefaultImage({
                        url: images[0].image.url,
                        width: images[0].image.width,
                        height: images[0].image.height,
                        name: images[0].name
                    });
                    setTokenImageMode('default');
                }
            } catch (err) {
                console.warn('[TrainerTokenSection] Image selection cancelled:', err);
            }
        }
    };

    return (
        <>
            {/* 3. TOKEN ARTWORK SECTION (Owlbear Rodeo Mode) */}
            {!isStandaloneMode && (
                <div className="trainer-gen-modal__section">
                    <div className="trainer-gen-modal__section-header">
                        <h3 className="trainer-gen-modal__section-title text-title-primary">
                            <ImageIcon size={16} color="var(--primary)" /> Token Artwork & Images
                        </h3>
                        <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                            Owlbear Rodeo Assets
                        </span>
                    </div>

                    <div className="trainer-gen-modal__grid--2col">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Artwork Strategy:
                                <TooltipIcon
                                    onClick={() =>
                                        onOpenTooltip({
                                            title: 'Token Artwork Strategy',
                                            desc: 'Default Image: Applies a chosen library image to all generated tokens that are not already auto-matched from the scene.\n\nPrompt Each Token: Opens your OBR library for each token with its species/trainer name pre-filled in search.\n\nPokéball Icon: Uses the standard Pokéball SVG.'
                                        })
                                    }
                                />
                            </label>
                            <select
                                value={tokenImageMode}
                                onChange={(e) =>
                                    setTokenImageMode(e.target.value as 'default' | 'prompt_each' | 'fallback_pokeball')
                                }
                                className="trainer-gen-modal__select"
                            >
                                <option value="default">Use Default Image for Tokens</option>
                                <option value="prompt_each">Prompt for Each Token (Pre-fills Name)</option>
                                <option value="fallback_pokeball">Use Default Pokéball Icon</option>
                            </select>
                        </div>

                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">Default Image Asset:</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '34px' }}>
                                {defaultImage ? (
                                    <>
                                        <img
                                            src={defaultImage.url}
                                            alt="Default token preview"
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '4px',
                                                objectFit: 'cover',
                                                border: '1px solid var(--border)'
                                            }}
                                        />
                                        <span
                                            className="text-subtext"
                                            style={{
                                                fontSize: '0.8rem',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={defaultImage.name || 'Selected Image'}
                                        >
                                            {defaultImage.name || 'Selected Asset'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handlePickDefaultImage}
                                            className="action-button action-button--dark"
                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                            title="Choose a different image from library"
                                        >
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDefaultImage(null)}
                                            className="action-button action-button--dark"
                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                            title="Clear default image"
                                        >
                                            Clear
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePickDefaultImage}
                                        className="action-button action-button--dark"
                                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                                    >
                                        <Upload size={14} /> Choose Default Image from OBR Library
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={autoMatchSceneImages}
                                onChange={(e) => setAutoMatchSceneImages(e.target.checked)}
                            />
                            <span>
                                Auto-match images from existing tokens on map (e.g. if 'Kingler' is on the scene, reuse
                                its art)
                            </span>
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip({
                                        title: 'Auto-Match Scene Tokens',
                                        desc: 'Scans active tokens currently placed on the Owlbear map to automatically reuse existing artwork. Due to Owlbear Rodeo SDK limitations, extensions cannot silently query or browse your asset library in the background without opening the interactive file picker, making scanning the active scene the only automated solution available.'
                                    })
                                }
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* Destination Switch */}
            <div className="trainer-gen-modal__section" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="trainer-gen-modal__field-label text-label">
                        {isStandaloneMode ? 'Destination in Sidebar:' : 'Token Destination:'}
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="radio"
                                name="destination"
                                checked={destination === 'new'}
                                onChange={() => setDestination('new')}
                            />
                            <span>{isStandaloneMode ? 'Create New Sheet (Nested Team)' : 'Spawn New Token(s)'}</span>
                        </label>
                        {(!generateTeam || teamSize === 0) && (
                            <label className="trainer-gen-modal__checkbox-label">
                                <input
                                    type="radio"
                                    name="destination"
                                    checked={destination === 'overwrite'}
                                    onChange={() => setDestination('overwrite')}
                                />
                                <span>{isStandaloneMode ? 'Overwrite Active Sheet' : 'Overwrite Selected Token'}</span>
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
