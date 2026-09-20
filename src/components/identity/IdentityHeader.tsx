import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CollapsingSection } from '../ui/CollapsingSection';
import { IdentityGrid } from './IdentityGrid';
import { IdentityControls } from './IdentityControls';
import { TrackerSettingsModal } from '../modals/trackers/TrackerSettingsModal';
import { PokedexModal } from '../modals/species/PokedexModal';
import { TransformationModal } from '../modals/species/TransformationModal';
import { AbilityMenuModal } from '../abilities/AbilityMenuModal';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { NatureInfoModal } from '../modals/identity/NatureInfoModal';
import { TokenImageModal } from '../modals/identity/TokenImageModal';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { syncCharacterDataset } from '../../utils/syncService';
import {
    updateObrTokenImage,
    saveStandaloneTokenFile,
    saveStandaloneTokenUrl,
    deleteStandaloneTokenImage
} from '../../utils/tokenImageService';
import { Image as ImageIcon, RefreshCw, Dna } from 'lucide-react';
import './IdentityHeader.css';

export function IdentityHeader() {
    const identityStore = useCharacterStore((state) => state.identity) || {};
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const tokenId = useCharacterStore((state) => state.tokenId);

    const [natureModalOpen, setNatureModalOpen] = useState(false);
    const [showTrackerSettings, setShowTrackerSettings] = useState(false);
    const [showPokedexModal, setShowPokedexModal] = useState(false);
    const [showTransformationModal, setShowTransformationModal] = useState(false);
    const [showAbilityMenuModal, setShowAbilityMenuModal] = useState(false);
    const [showAbilityTagBuilder, setShowAbilityTagBuilder] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await syncCharacterDataset();
        } catch (error) {
            console.error('[IdentityHeader] Refresh failed:', error);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    };

    const handleUpdateTokenImage = async () => {
        if (isStandaloneMode) {
            setShowImagePicker(true);
            return;
        }
        if (tokenId) {
            await updateObrTokenImage(tokenId, setIdentity);
        }
    };

    const handleStandaloneUploadFile = async (file: File) => {
        try {
            await saveStandaloneTokenFile(file, tokenId || null, identityStore.tokenImageUrl || '', setIdentity);
        } catch (error) {
            console.error('[IdentityHeader] Failed to save image to IndexedDB:', error);
            alert('Failed to save image locally. It may be too large or your browser blocked the database.');
        }
        setShowImagePicker(false);
    };

    const handleStandaloneEnterUrl = async () => {
        const url = window.prompt('Enter an Image URL:');
        if (url) {
            await saveStandaloneTokenUrl(url, tokenId || null, identityStore.tokenImageUrl || '', setIdentity);
        }
        setShowImagePicker(false);
    };

    const handleStandaloneDeleteImage = async () => {
        await deleteStandaloneTokenImage(tokenId || null, identityStore.tokenImageUrl || '', setIdentity);
        setShowImagePicker(false);
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
                className="action-button action-button--dark identity-header__btn identity-header__btn--icon"
                title="Sync and Refresh API Data"
            >
                <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
            </button>

            {(isStandaloneMode || OBR.isAvailable) && (
                <button
                    type="button"
                    className="action-button action-button--dark identity-header__btn"
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
                onOpenAbility={() => setShowAbilityMenuModal(true)}
                onOpenNature={() => setNatureModalOpen(true)}
                onOpenPokedex={() => setShowPokedexModal(true)}
                onOpenImagePicker={() => setShowImagePicker(true)}
            />

            <IdentityControls onOpenTrackerSettings={() => setShowTrackerSettings(true)} />

            {showTrackerSettings && <TrackerSettingsModal onClose={() => setShowTrackerSettings(false)} />}
            {showPokedexModal && <PokedexModal onClose={() => setShowPokedexModal(false)} />}
            {showTransformationModal && <TransformationModal onClose={() => setShowTransformationModal(false)} />}
            {showAbilityMenuModal && (
                <AbilityMenuModal
                    isOpen={showAbilityMenuModal}
                    onClose={() => setShowAbilityMenuModal(false)}
                    onOpenTagBuilder={() => setShowAbilityTagBuilder(true)}
                />
            )}
            {showAbilityTagBuilder && (
                <TagBuilderModal
                    targetId="ability"
                    targetType="ability"
                    onClose={() => setShowAbilityTagBuilder(false)}
                />
            )}

            <NatureInfoModal
                isOpen={natureModalOpen}
                nature={identityStore.nature || ''}
                onClose={() => setNatureModalOpen(false)}
            />

            <TokenImageModal
                isOpen={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                hasCurrentImage={Boolean(identityStore.tokenImageUrl)}
                onUploadFile={handleStandaloneUploadFile}
                onEnterUrl={handleStandaloneEnterUrl}
                onDeleteImage={handleStandaloneDeleteImage}
            />
        </CollapsingSection>
    );
}
