import { useState, useEffect } from 'react';
import OBR, { buildImage, type ImageDownload, type Item } from '@owlbear-rodeo/sdk';
import { Search, Dices, CheckCircle, XCircle, ImagePlus, FilePlus } from 'lucide-react';
import type { TempBuild } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { setActiveTokenId, METADATA_ID } from '../../../utils/obr';
import { buildTokenMetadataFromBuild } from '../../../utils/generatorUtils';
import { calculateFormationOffsets } from '../../../utils/trainerTokenSpawner';
import { buildGraphicsFromMeta, renderTokenGraphics } from '../../../utils/graphicsManager';
import { PromptModal } from '../PromptModal';
import { PokemonBuildPreview } from './PokemonBuildPreview';
import './GeneratorPreviewModal.css';

interface GeneratorPreviewModalProps {
    build?: TempBuild;
    builds?: TempBuild[];
    destination?: 'new' | 'overwrite';
    sheetName?: string;
    onClose: () => void;
    onReroll?: () => void;
    onRerollIndex?: (index: number) => void;
}

export function GeneratorPreviewModal({
    build,
    builds,
    destination = 'overwrite',
    sheetName,
    onClose,
    onReroll,
    onRerollIndex
}: GeneratorPreviewModalProps) {
    const applyGeneratedBuild = useCharacterStore((state) => state.applyGeneratedBuild);
    const config = useCharacterStore((state) => state.generatorConfig);
    const tokenId = useCharacterStore((state) => state.tokenId);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [localBuilds, setLocalBuilds] = useState<TempBuild[]>(() => {
        if (builds && builds.length > 0) return builds;
        if (build) return [build];
        return [];
    });
    const [activeIndex, setActiveIndex] = useState<number>(0);

    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const [showImagePrompt, setShowImagePrompt] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    // PromptModal state for URL inputs
    const [promptConfig, setPromptConfig] = useState<{
        isOpen: boolean;
        title: string;
        message?: string;
        defaultValue?: string;
        onConfirm: (val: string) => void;
    }>({
        isOpen: false,
        title: '',
        onConfirm: () => {}
    });

    useEffect(() => {
        if (builds && builds.length > 0) {
            setLocalBuilds(builds);
        } else if (build) {
            setLocalBuilds([build]);
        }
    }, [build, builds]);

    const localBuild = localBuilds[activeIndex] || localBuilds[0];
    if (!localBuild) return null;

    const updateAttribute = (statistic: string, value: number) => {
        setLocalBuilds((prev) => {
            const next = [...prev];
            const current = next[activeIndex];
            if (!current) return prev;
            next[activeIndex] = {
                ...current,
                attr: { ...current.attr, [statistic]: Math.max(0, value) }
            };
            return next;
        });
    };

    const updateSocial = (statistic: string, value: number) => {
        setLocalBuilds((prev) => {
            const next = [...prev];
            const current = next[activeIndex];
            if (!current) return prev;
            next[activeIndex] = {
                ...current,
                soc: { ...current.soc, [statistic]: Math.max(0, value) }
            };
            return next;
        });
    };

    const updateSkill = (skillName: string, value: number) => {
        setLocalBuilds((prev) => {
            const next = [...prev];
            const current = next[activeIndex];
            if (!current) return prev;
            next[activeIndex] = {
                ...current,
                skills: { ...current.skills, [skillName]: Math.max(0, value) }
            };
            return next;
        });
    };

    const handleApply = async () => {
        setIsApplying(true);
        try {
            if (destination === 'new') {
                if (isStandaloneMode) {
                    try {
                        const store = useCharacterStore.getState();
                        for (let idx = 0; idx < localBuilds.length; idx++) {
                            const b = localBuilds[idx];
                            const providedNickname =
                                localBuilds.length > 1
                                    ? sheetName
                                        ? `${sheetName} ${idx + 1}`
                                        : b.species
                                    : sheetName?.trim() || b.species;

                            const newId = await storageAdapter.createLocalCharacter(providedNickname, null);

                            const metadata = buildTokenMetadataFromBuild(
                                b,
                                providedNickname,
                                `${import.meta.env.BASE_URL || '/'}pokeball.svg`
                            );
                            await storageAdapter.saveCharacter(newId, metadata, METADATA_ID);

                            if (idx === 0) {
                                setActiveTokenId(newId);
                                store.setTokenData(newId, 'PLAYER');
                                store.loadFromOwlbear({
                                    nickname: providedNickname,
                                    species: b.species,
                                    rank: b.rank || 'Starter',
                                    gender: b.gender || '',
                                    nature: b.nature || '-- Select --',
                                    parentId: null,
                                    'v2-migrated': true
                                });
                                store.applyGeneratedBuild(b);
                            }
                        }

                        onClose();
                    } catch (e) {
                        console.error('[GeneratorPreviewModal] Failed to create Pokémon sheet(s):', e);
                        setTooltipInfo({
                            title: 'Creation Failed',
                            desc: 'Failed to create new character sheet(s) in Standalone storage.'
                        });
                    }
                    return;
                }

                // Owlbear Rodeo Mode - Generate New Token(s)
                try {
                    let images: ImageDownload[] | null = null;
                    let selectedUrl = '';
                    let selectedWidth = 0;
                    let selectedHeight = 0;

                    if (typeof OBR.assets?.downloadImages === 'function') {
                        images = await OBR.assets.downloadImages();
                    }

                    if (images && images.length > 0) {
                        const img = images[0];
                        selectedUrl = img.image?.url || '';
                        selectedWidth = img.image?.width || 0;
                        selectedHeight = img.image?.height || 0;
                    }

                    if (!selectedUrl) {
                        selectedUrl = `${import.meta.env.BASE_URL || '/'}pokeball.svg`;
                    }

                    let resolvedWidth = selectedWidth;
                    let resolvedHeight = selectedHeight;

                    if (!resolvedWidth || !resolvedHeight) {
                        const loadedDim = await new Promise<{ width: number; height: number }>((resolve) => {
                            const img = new window.Image();
                            img.onload = () =>
                                resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 300 });
                            img.onerror = () => resolve({ width: 300, height: 300 });
                            img.src = selectedUrl;
                        });
                        resolvedWidth = loadedDim.width;
                        resolvedHeight = loadedDim.height;
                    }

                    const vpWidth = await OBR.viewport.getWidth();
                    const vpHeight = await OBR.viewport.getHeight();
                    const centerPos = await OBR.viewport.inverseTransformPoint({
                        x: vpWidth / 2,
                        y: vpHeight / 2
                    });

                    const count = localBuilds.length;
                    const offsets = calculateFormationOffsets(count, 200);
                    const imageContent = {
                        url: selectedUrl,
                        mime: 'image/png',
                        width: resolvedWidth,
                        height: resolvedHeight
                    };
                    const grid = {
                        dpi: resolvedWidth,
                        offset: {
                            x: resolvedWidth / 2,
                            y: resolvedHeight / 2
                        }
                    };

                    const tokenItems: Item[] = [];
                    const builtMetas: Record<string, unknown>[] = [];

                    for (let idx = 0; idx < count; idx++) {
                        const b = localBuilds[idx];
                        const offset = offsets[idx] || { dx: 0, dy: 0 };
                        const pos = { x: centerPos.x + offset.dx, y: centerPos.y + offset.dy };
                        const tokenItemName =
                            count > 1
                                ? sheetName
                                    ? `${sheetName} ${idx + 1}`
                                    : b.species
                                : sheetName?.trim() || b.species || 'Pokémon';

                        const metadata = buildTokenMetadataFromBuild(b, tokenItemName, selectedUrl);
                        builtMetas.push(metadata);

                        const tokenItem = buildImage(imageContent, grid)
                            .name(tokenItemName)
                            .position(pos)
                            .layer('CHARACTER')
                            .metadata({
                                [METADATA_ID]: metadata
                            })
                            .build();

                        tokenItems.push(tokenItem);
                    }

                    await OBR.scene.items.addItems(tokenItems);

                    if (tokenItems.length > 0) {
                        const firstItem = tokenItems[0];
                        setActiveTokenId(firstItem.id);
                        const store = useCharacterStore.getState();
                        store.setTokenData(firstItem.id, store.role || 'PLAYER');
                        store.setIdentity('tokenImageUrl', selectedUrl);
                        store.loadFromOwlbear(builtMetas[0]);
                        await OBR.player.select(tokenItems.map((t) => t.id));

                        for (let i = 0; i < tokenItems.length; i++) {
                            const gData = buildGraphicsFromMeta(builtMetas[i]);
                            await renderTokenGraphics(tokenItems[i], gData, store.role || 'PLAYER', true);
                        }

                        if (OBR.isAvailable) {
                            OBR.notification.show(
                                count > 1 ? `Created ${count} Pokémon tokens!` : `Created ${tokenItems[0].name} token!`,
                                'SUCCESS'
                            );
                        }
                    }
                    onClose();
                } catch (e) {
                    console.error('[GeneratorPreviewModal] Failed to spawn new token(s) on Owlbear Rodeo:', e);
                    setTooltipInfo({
                        title: 'Token Spawning Failed',
                        desc: 'Failed to spawn new token(s) onto the Owlbear Rodeo scene.'
                    });
                }
                return;
            }

            // Destination = overwrite
            applyGeneratedBuild(localBuild);

            if (config.randomizeSpecies && OBR.isAvailable && tokenId) {
                setShowImagePrompt(true);
            } else {
                onClose();
            }
        } finally {
            setIsApplying(false);
        }
    };

    const handleImageConfirm = async (wantsNewImage: boolean) => {
        if (wantsNewImage) {
            try {
                let images: ImageDownload[] | null = null;

                if (typeof OBR.assets?.downloadImages === 'function') {
                    images = await OBR.assets.downloadImages();
                } else {
                    setPromptConfig({
                        isOpen: true,
                        title: 'Enter Image URL',
                        message: 'Enter a valid image URL for the token:',
                        onConfirm: async (url) => {
                            setPromptConfig((p) => ({ ...p, isOpen: false }));
                            if (url.trim()) {
                                setIdentity('tokenImageUrl', url.trim());
                                await OBR.scene.items.updateItems([tokenId!], (items) => {
                                    for (const item of items) {
                                        const imgItem = item as Record<string, unknown>;
                                        if (imgItem.image) (imgItem.image as Record<string, unknown>).url = url.trim();
                                    }
                                });
                            }
                            onClose();
                        }
                    });
                    return;
                }

                if (images && images.length > 0) {
                    const img = images[0];
                    const selectedUrl = img.image?.url || '';
                    if (selectedUrl) {
                        setIdentity('tokenImageUrl', selectedUrl);
                        await OBR.scene.items.updateItems([tokenId!], (items) => {
                            for (const item of items) {
                                const imgItem = item as Record<string, unknown>;
                                if (imgItem.image) (imgItem.image as Record<string, unknown>).url = selectedUrl;
                            }
                        });
                    } else {
                        OBR.notification.show('Could not extract URL from asset library.', 'ERROR');
                    }
                }
            } catch (e) {
                console.error('[GeneratorPreviewModal] Failed to pick image:', e);
            }
        }
        setShowImagePrompt(false);
        onClose();
    };

    const isMultiple = localBuilds.length > 1;

    return (
        <div className="generator-preview__overlay">
            <div className="generator-preview__content">
                <h3 className="generator-preview__title text-title-primary">
                    <Search size={20} /> Pokémon Auto-Build Preview
                </h3>

                {/* Batch Tabs if multiple Pokémon generated */}
                {isMultiple && (
                    <div className="generator-preview__tabs">
                        {localBuilds.map((b, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`generator-preview__tab-btn ${activeIndex === idx ? 'generator-preview__tab-btn--active' : ''}`}
                                onClick={() => setActiveIndex(idx)}
                            >
                                #{idx + 1}: {b.species}
                            </button>
                        ))}
                    </div>
                )}

                <div className="generator-preview__scroll-container">
                    <PokemonBuildPreview
                        build={localBuild}
                        onUpdateAttr={updateAttribute}
                        onUpdateSoc={updateSocial}
                        onUpdateSkill={updateSkill}
                        onOpenTooltip={setTooltipInfo}
                        actionSlot={
                            isMultiple && onRerollIndex ? (
                                <button
                                    type="button"
                                    className="action-button action-button--theme"
                                    onClick={() => onRerollIndex(activeIndex)}
                                    style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                >
                                    <Dices size={14} /> Reroll This #{activeIndex + 1}
                                </button>
                            ) : undefined
                        }
                    />
                </div>

                {/* Footer Controls */}
                <div className="generator-preview__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isApplying}
                        className="action-button action-button--dark generator-preview__btn-cancel"
                    >
                        <XCircle size={16} /> Cancel
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {isMultiple && onRerollIndex && (
                            <button
                                type="button"
                                onClick={() => onRerollIndex(activeIndex)}
                                disabled={isApplying}
                                className="action-button action-button--theme"
                            >
                                <Dices size={16} /> Reroll #{activeIndex + 1}
                            </button>
                        )}
                        {onReroll && (
                            <button
                                type="button"
                                onClick={onReroll}
                                disabled={isApplying}
                                className="action-button action-button--theme"
                            >
                                <Dices size={16} /> {isMultiple ? `Reroll All (${localBuilds.length})` : 'Reroll'}
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={isApplying}
                        className={`action-button ${destination === 'new' ? 'action-button--theme' : 'action-button--red'} generator-preview__btn-apply`}
                    >
                        {destination === 'new' ? (
                            isStandaloneMode ? (
                                <>
                                    <FilePlus size={16} />{' '}
                                    {isMultiple ? `Create All (${localBuilds.length}) Sheets` : 'Create Sheet'}
                                </>
                            ) : (
                                <>
                                    <ImagePlus size={16} />{' '}
                                    {isMultiple
                                        ? `Select Image & Spawn All (${localBuilds.length})`
                                        : 'Select Image & Create Token'}
                                </>
                            )
                        ) : (
                            <>
                                <CheckCircle size={16} /> Overwrite {isStandaloneMode ? 'Sheet' : 'Token'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Overwrite image prompt */}
            {showImagePrompt && (
                <div className="generator-preview-tooltip__overlay generator-preview-tooltip__overlay--high-z">
                    <div className="generator-preview-tooltip__content">
                        <h3 className="generator-preview-tooltip__title generator-preview-tooltip__title--center text-title-primary">
                            <ImagePlus size={20} /> Update Token Image?
                        </h3>
                        <p className="generator-preview-tooltip__desc generator-preview-tooltip__desc--center text-subtext">
                            You generated a brand new species! Would you like to select a new image for this token?
                        </p>
                        <div className="generator-preview-tooltip__actions generator-preview-tooltip__actions--spaced">
                            <button
                                type="button"
                                className="action-button action-button--dark generator-preview-tooltip__btn"
                                onClick={() => handleImageConfirm(false)}
                            >
                                No Thanks
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red generator-preview-tooltip__btn"
                                onClick={() => handleImageConfirm(true)}
                            >
                                Yes, Choose Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tooltip Overlay */}
            {tooltipInfo && (
                <div className="generator-preview-tooltip__overlay" onClick={() => setTooltipInfo(null)}>
                    <div className="generator-preview-tooltip__content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="generator-preview-tooltip__title text-title-primary">{tooltipInfo.title}</h3>
                        <p className="generator-preview-tooltip__desc text-subtext">{tooltipInfo.desc}</p>
                        <div className="generator-preview-tooltip__actions">
                            <button
                                type="button"
                                className="action-button action-button--dark generator-preview-tooltip__btn"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PromptModal (in-app dialog replacing window.prompt) */}
            <PromptModal
                isOpen={promptConfig.isOpen}
                title={promptConfig.title}
                message={promptConfig.message}
                defaultValue={promptConfig.defaultValue}
                onConfirm={promptConfig.onConfirm}
                onCancel={() => setPromptConfig((p) => ({ ...p, isOpen: false }))}
            />
        </div>
    );
}
