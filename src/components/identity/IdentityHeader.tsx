import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchAbilityData, fetchNatureData } from '../../utils/api';
import { CollapsingSection } from '../ui/CollapsingSection';
import { IdentityGrid } from './IdentityGrid';
import { IdentityControls } from './IdentityControls';
import { GeneratorModal } from '../modals/GeneratorModal';
import { TrackerSettingsModal } from '../modals/TrackerSettingsModal';
import { PokedexModal } from '../modals/PokedexModal';
import { broadcastInfo } from '../../utils/diceRoller';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import './IdentityHeader.css';

export function IdentityHeader() {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const tokenId = useCharacterStore((state) => state.tokenId);
    const role = useCharacterStore((state) => state.role);
    const isGm = role === 'GM';

    const [modalConfig, setModalConfig] = useState<{ title: string; content: string | ReactNode } | null>(null);
    const [showGeneratorModal, setShowGeneratorModal] = useState<boolean>(false);
    const [showTrackerSettings, setShowTrackerSettings] = useState<boolean>(false);
    const [showPokedexModal, setShowPokedexModal] = useState<boolean>(false);
    
    // Standalone Image Picker State
    const [showImagePicker, setShowImagePicker] = useState<boolean>(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const openAbilityModal = async () => {
        if (!identityStore.ability) {
            setModalConfig({ title: 'Ability', content: 'No ability selected.' });
            return;
        }
        setModalConfig({ title: 'Ability', content: 'Loading...' });
        const data = await fetchAbilityData(identityStore.ability);

        if (data && (data.Description || data.Effect)) {
            const content = [data.Description, data.Effect].filter(Boolean).join('\n\n');
            setModalConfig({ title: identityStore.ability, content });
        } else {
            setModalConfig({ title: 'Ability', content: 'Could not load ability data.' });
        }
    };

    const openNatureModal = async () => {
        if (!identityStore.nature || identityStore.nature === '-- Select --') {
            setModalConfig({ title: 'Nature', content: 'No nature selected.' });
            return;
        }
        setModalConfig({ title: 'Nature', content: 'Loading...' });
        const data = await fetchNatureData(identityStore.nature);

        if (data) {
            const content = [];

            const safeData = data as Record<string, unknown>;
            const keywords = safeData.Keywords || safeData.keywords;
            const desc = safeData.Description || safeData.description;
            const confidence = safeData.Confidence || safeData.confidence;
            const statUp = safeData['Stat Up'] || safeData['stat up'] || safeData.StatUp;
            const statDown = safeData['Stat Down'] || safeData['stat down'] || safeData.StatDown;

            if (keywords) content.push(`Keywords: ${keywords}`);
            if (confidence) content.push(`Confidence: ${confidence}`);
            if (statUp) content.push(`Stat Up: ${statUp}`);
            if (statDown) content.push(`Stat Down: ${statDown}`);
            if (desc) content.push(String(desc));

            if (content.length === 0) content.push(JSON.stringify(data, null, 2));

            setModalConfig({ title: `Nature: ${identityStore.nature}`, content: content.join('\n\n') });
        } else {
            setModalConfig({ title: 'Nature', content: 'Could not load nature data.' });
        }
    };

    // --- STANDALONE IMAGE UPLOAD HANDLERS ---
    const handleStandaloneUrl = () => {
        const url = window.prompt('Enter an Image URL:');
        if (url) {
            setIdentity('tokenImageUrl', url);
        }
        setShowImagePicker(false);
    };

    const handleStandaloneFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        try {
            const imgId = await imageManager.saveImage(file);
            setIdentity('tokenImageUrl', imgId);
        } catch (error) {
            console.error('[IdentityHeader] Failed to save image to IndexedDB', error);
            alert('Failed to save image locally. It may be too large or your browser blocked the database.');
        }
        
        setShowImagePicker(false);
        if (imageInputRef.current) imageInputRef.current.value = ''; // Reset input so the same file can be chosen again if needed
    };

    const handleUpdateTokenImage = async () => {
        // If we are in the web app, intercept and show our custom dual-option modal
        if (isStandaloneMode) {
            setShowImagePicker(true);
            return;
        }

        // --- OWLBEAR RODEO NATIVE LOGIC ---
        if (!isGm) {
            if (OBR.isAvailable) OBR.notification.show('Only the GM can update the scene token image.', 'ERROR');
            return;
        }

        if (!OBR.isAvailable || !tokenId) {
            const url = window.prompt(`Enter an Image URL:`);
            if (url) {
                setIdentity('tokenImageUrl', url);
            }
            return;
        }

        try {
            const assetsApi = OBR.assets as unknown as { downloadImages?: () => Promise<unknown[]> };
            let images: unknown[] | null = null;

            if (typeof assetsApi?.downloadImages === 'function') {
                images = await assetsApi.downloadImages();
            } else {
                const url = window.prompt('Enter an Image URL:');
                if (url) {
                    setIdentity('tokenImageUrl', url);
                    await OBR.scene.items.updateItems([tokenId], (items) => {
                        for (const item of items) {
                            const imgItem = item as Record<string, unknown>;
                            if (imgItem.image) (imgItem.image as Record<string, unknown>).url = url;
                        }
                    });
                }
                return;
            }

            if (images && images.length > 0) {
                let selectedUrl = '';
                let selectedWidth = 0;
                let selectedHeight = 0;

                const img = images[0] as Record<string, unknown> | string;

                if (typeof img === 'string') {
                    selectedUrl = img;
                } else if (img && typeof img === 'object') {
                    if (typeof img.url === 'string') {
                        selectedUrl = img.url;
                    } else if (img.image && typeof (img.image as Record<string, unknown>).url === 'string') {
                        selectedUrl = (img.image as Record<string, unknown>).url as string;
                        selectedWidth = ((img.image as Record<string, unknown>).width as number) || 0;
                        selectedHeight = ((img.image as Record<string, unknown>).height as number) || 0;
                    } else if (typeof img.src === 'string') {
                        selectedUrl = img.src;
                    }
                }

                if (selectedUrl) {
                    setIdentity('tokenImageUrl', selectedUrl);
                    await OBR.scene.items.updateItems([tokenId], (items) => {
                        for (const item of items) {
                            const imgItem = item as Record<string, unknown>;
                            if (imgItem.image) {
                                const imageRecord = imgItem.image as Record<string, unknown>;
                                const oldWidth = (imageRecord.width as number) || 1;
                                const oldScaleX = item.scale.x || 1;
                                const oldScaleY = item.scale.y || 1;

                                imageRecord.url = selectedUrl;
                                if (selectedWidth && selectedHeight) {
                                    imageRecord.width = selectedWidth;
                                    imageRecord.height = selectedHeight;

                                    const physicalWidth = oldWidth * Math.abs(oldScaleX);
                                    const newScale = physicalWidth / selectedWidth;

                                    item.scale = {
                                        x: newScale * (oldScaleX < 0 ? -1 : 1),
                                        y: newScale * (oldScaleY < 0 ? -1 : 1)
                                    };
                                }
                            }
                        }
                    });
                } else {
                    if (OBR.isAvailable)
                        OBR.notification.show('Could not extract URL. Please check F12 Console!', 'ERROR');
                }
            }
        } catch (error) {
            console.error('[IdentityHeader] Failed to pick manual token image:', error);
        }
    };

    const headerElements = (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(isStandaloneMode || (isGm && OBR.isAvailable)) && (
                <button
                    type="button"
                    className="action-button action-button--dark identity-header__changelog-btn"
                    onClick={handleUpdateTokenImage}
                    title="Change this character's artwork."
                >
                    🖼️ Update Token Image
                </button>
            )}
        </div>
    );

    return (
        <CollapsingSection
            title="CHARACTER IDENTITY"
            headerElements={headerElements}
            className="sheet-panel identity-header"
        >
            <IdentityGrid
                onOpenGenerator={() => setShowGeneratorModal(true)}
                onOpenAbility={openAbilityModal}
                onOpenNature={openNatureModal}
                onOpenPokedex={() => setShowPokedexModal(true)}
            />

            <IdentityControls onOpenTrackerSettings={() => setShowTrackerSettings(true)} />

            {/* Main Application Modals */}
            {showGeneratorModal && <GeneratorModal onClose={() => setShowGeneratorModal(false)} />}
            {showTrackerSettings && <TrackerSettingsModal onClose={() => setShowTrackerSettings(false)} />}
            {showPokedexModal && <PokedexModal onClose={() => setShowPokedexModal(false)} />}

            {/* Info Broadcast Modal */}
            {modalConfig && (
                <div className="identity-header__modal-overlay identity-header__modal-overlay--high-z">
                    <div className="identity-header__modal-content identity-header__modal-content--large">
                        <h3 className="identity-header__modal-title identity-header__modal-title--large">
                            {modalConfig.title}
                        </h3>
                        <hr className="identity-header__modal-divider" />
                        <div className="identity-header__modal-text identity-header__modal-text--pre-wrap">
                            {modalConfig.content}
                        </div>
                        <div className="identity-header__modal-actions">
                            <button
                                className="action-button action-button--dark identity-header__modal-btn"
                                onClick={() => setModalConfig(null)}
                            >
                                Close
                            </button>
                            <button
                                className="action-button identity-header__modal-btn"
                                style={{ backgroundColor: '#1565c0', borderColor: '#1565c0', color: 'white' }}
                                onClick={() => {
                                    if (typeof modalConfig.content === 'string') {
                                        broadcastInfo(modalConfig.title, modalConfig.content);
                                        setModalConfig(null);
                                    }
                                }}
                            >
                                📢 Broadcast
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Standalone Dual Image Picker Modal */}
            {showImagePicker && (
                <div className="identity-header__modal-overlay identity-header__modal-overlay--high-z">
                    <div className="identity-header__modal-content">
                        <h3 className="identity-header__modal-title">🖼️ Update Artwork</h3>
                        <p className="identity-header__modal-text" style={{ marginBottom: '15px' }}>
                            Choose how you'd like to supply the image for this character.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                className="action-button action-button--dark"
                                style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>📁 Upload Local File</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8 }}>
                                    (Recommended - Saved safely to your browser's database)
                                </span>
                            </button>
                            
                            <button 
                                className="action-button"
                                style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                onClick={handleStandaloneUrl}
                            >
                                <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>🌐 Use Web URL</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8 }}>
                                    (Lightweight - Image breaks if the web link dies)
                                </span>
                            </button>
                        </div>

                        <hr className="identity-header__modal-divider" style={{ margin: '15px 0' }} />
                        
                        <button
                            className="action-button action-button--dark identity-header__modal-close-btn"
                            onClick={() => setShowImagePicker(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden Input for Local Uploads */}
            <input 
                type="file" 
                ref={imageInputRef} 
                onChange={handleStandaloneFile} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />
        </CollapsingSection>
    );
}