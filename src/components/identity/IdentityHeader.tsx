import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchPokemonData, fetchAbilityData, fetchNatureData, fetchMoveData, loadLocalDataset } from '../../utils/api';
import { CollapsingSection } from '../ui/CollapsingSection';
import { IdentityGrid } from './IdentityGrid';
import { IdentityControls } from './IdentityControls';
import { TrackerSettingsModal } from '../modals/TrackerSettingsModal';
import { PokedexModal } from '../modals/PokedexModal';
import { TransformationModal } from '../modals/TransformationModal';
import { broadcastInfo } from '../../utils/diceRoller';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager, autoCropTransparency } from '../../utils/imageManager';
import { saveToOwlbear } from '../../utils/obr';
import { Image as ImageIcon, Radio, Upload, Globe, RefreshCw, Dna } from 'lucide-react';
import './IdentityHeader.css';

export function IdentityHeader() {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const refreshSpeciesData = useCharacterStore((state) => state.refreshSpeciesData);
    const tokenId = useCharacterStore((state) => state.tokenId);
    const role = useCharacterStore((state) => state.role);
    const isGm = role === 'GM';

    const [modalConfig, setModalConfig] = useState<{ title: string; content: string | ReactNode } | null>(null);
    const [showTrackerSettings, setShowTrackerSettings] = useState<boolean>(false);
    const [showPokedexModal, setShowPokedexModal] = useState<boolean>(false);
    const [showTransformationModal, setShowTransformationModal] = useState<boolean>(false);

    const [showImagePicker, setShowImagePicker] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await loadLocalDataset();
            const store = useCharacterStore.getState();

            for (const move of store.moves) {
                if (move.name) {
                    const data = await fetchMoveData(move.name);
                    if (data) store.applyMoveData(move.id, data as Record<string, unknown>);
                }
            }

            if (identityStore.species && identityStore.mode === 'Pokémon') {
                const data = await fetchPokemonData(identityStore.species);
                if (data) refreshSpeciesData(data as Record<string, unknown>);
            }

            if (identityStore.ability) {
                await fetchAbilityData(identityStore.ability);
            }
        } catch (error) {
            console.error('[IdentityHeader] Refresh failed:', error);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    };

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

    const handleStandaloneUrl = async () => {
        const url = window.prompt('Enter an Image URL:');
        if (url) {
            if (identityStore.tokenImageUrl && identityStore.tokenImageUrl.startsWith('local-img:')) {
                await imageManager.deleteImage(identityStore.tokenImageUrl);
            }

            setIdentity('tokenImageUrl', url);
            saveToOwlbear({ 'token-image-url': url });
        }
        setShowImagePicker(false);
    };

    const handleStandaloneFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const croppedBlob = await autoCropTransparency(file);
            const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type });

            const imgId = await imageManager.saveImage(croppedFile);

            if (identityStore.tokenImageUrl && identityStore.tokenImageUrl.startsWith('local-img:')) {
                await imageManager.deleteImage(identityStore.tokenImageUrl);
            }

            setIdentity('tokenImageUrl', imgId);
            saveToOwlbear({ 'token-image-url': imgId });
        } catch (error) {
            console.error('[IdentityHeader] Failed to save image to IndexedDB', error);
            alert('Failed to save image locally. It may be too large or your browser blocked the database.');
        }

        setShowImagePicker(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleUpdateTokenImage = async () => {
        if (isStandaloneMode) {
            setShowImagePicker(true);
            return;
        }

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
                    saveToOwlbear({ 'token-image-url': url });
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
                    saveToOwlbear({ 'token-image-url': selectedUrl });
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

    const isTransformed = identityStore.activeTransformation !== 'None';

    const headerElements = (
        <div className="identity-header__actions-wrapper">
            <button
                type="button"
                className={`action-button ${isTransformed ? 'action-button--theme' : 'action-button--dark'} identity-header__btn`}
                onClick={() => setShowTransformationModal(true)}
                title={isTransformed ? 'Manage Active Transformation' : 'Transform (Mega, Dynamax, Tera, etc.)'}
            >
                <Dna size={14} /> Formshift
            </button>
            <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="action-button action-button--dark identity-header__btn"
                title="Sync and Refresh API Data"
            >
                <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
            </button>

            {(isStandaloneMode || (isGm && OBR.isAvailable)) && (
                <button
                    type="button"
                    className="action-button action-button--dark identity-header__changelog-btn"
                    onClick={handleUpdateTokenImage}
                    title="Change this character's artwork."
                >
                    <ImageIcon size={14} /> Update Token Image
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
                onOpenAbility={openAbilityModal}
                onOpenNature={openNatureModal}
                onOpenPokedex={() => setShowPokedexModal(true)}
            />

            <IdentityControls onOpenTrackerSettings={() => setShowTrackerSettings(true)} />

            {showTrackerSettings && <TrackerSettingsModal onClose={() => setShowTrackerSettings(false)} />}
            {showPokedexModal && <PokedexModal onClose={() => setShowPokedexModal(false)} />}
            {showTransformationModal && <TransformationModal onClose={() => setShowTransformationModal(false)} />}

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
                                className="action-button identity-header__modal-btn identity-header__modal-btn--broadcast"
                                onClick={() => {
                                    if (typeof modalConfig.content === 'string') {
                                        broadcastInfo(modalConfig.title, modalConfig.content);
                                        setModalConfig(null);
                                    }
                                }}
                            >
                                <Radio size={16} /> Broadcast
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showImagePicker && (
                <div className="identity-header__modal-overlay identity-header__modal-overlay--high-z">
                    <div className="identity-header__modal-content">
                        <h3 className="identity-header__modal-title modal-title-with-icon">
                            <ImageIcon size={20} /> Update Artwork
                        </h3>
                        <p className="identity-header__modal-text identity-header__picker-desc">
                            Choose how you'd like to supply the image for this character.
                        </p>

                        <div className="identity-header__picker-options">
                            <button
                                className="action-button action-button--dark identity-header__picker-btn"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <span className="identity-header__picker-btn-title">
                                    <Upload size={16} /> Upload Local File
                                </span>
                                <span className="identity-header__picker-btn-sub">
                                    (Recommended - Saved safely to your browser's database)
                                </span>
                            </button>

                            <button
                                className="action-button identity-header__picker-btn identity-header__picker-btn--web"
                                onClick={handleStandaloneUrl}
                            >
                                <span className="identity-header__picker-btn-title">
                                    <Globe size={16} /> Use Web URL
                                </span>
                                <span className="identity-header__picker-btn-sub">
                                    (Lightweight - Image breaks if the web link dies)
                                </span>
                            </button>
                        </div>

                        <hr className="identity-header__modal-divider identity-header__picker-divider" />

                        <button
                            className="action-button action-button--dark identity-header__modal-close-btn"
                            onClick={() => setShowImagePicker(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={imageInputRef}
                onChange={handleStandaloneFile}
                accept="image/*"
                className="identity-header__file-input"
            />
        </CollapsingSection>
    );
}
