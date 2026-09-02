import { useState, useEffect } from 'react';
import OBR, { buildImage, type ImageDownload } from '@owlbear-rodeo/sdk';
import { Search, Dices, CheckCircle, XCircle, ImagePlus, FilePlus } from 'lucide-react';
import type { TempBuild } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { GeneratorPreviewStatSpinner } from './GeneratorPreviewStatSpinner';
import { GeneratorPreviewMoveRow } from './GeneratorPreviewMoveRow';
import { getLimit } from '../../utils/macroHelpers';
import { isStandaloneMode, storageAdapter } from '../../utils/storageAdapter';
import { setActiveTokenId, METADATA_ID } from '../../utils/obr';
import { buildTokenMetadataFromBuild } from '../../utils/generatorUtils';
import { buildGraphicsFromMeta, renderTokenGraphics } from '../../utils/graphicsManager';
import './GeneratorPreviewModal.css';

interface GeneratorPreviewModalProps {
    build: TempBuild;
    destination?: 'new' | 'overwrite';
    sheetName?: string;
    onClose: () => void;
    onReroll: () => void;
}

export function GeneratorPreviewModal({
    build,
    destination = 'overwrite',
    sheetName,
    onClose,
    onReroll
}: GeneratorPreviewModalProps) {
    const applyGeneratedBuild = useCharacterStore((state) => state.applyGeneratedBuild);
    const mode = useCharacterStore((state) => state.identity.mode);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const config = useCharacterStore((state) => state.generatorConfig);
    const tokenId = useCharacterStore((state) => state.tokenId);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const baseStats = useCharacterStore((state) => state.stats);
    const baseSocials = useCharacterStore((state) => state.socials);
    const baseSkills = useCharacterStore((state) => state.skills);
    const willMax = useCharacterStore((state) => state.will.willMax);

    const [localBuild, setLocalBuild] = useState<TempBuild>(build);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const [showImagePrompt, setShowImagePrompt] = useState(false);

    useEffect(() => {
        setLocalBuild(build);
    }, [build]);

    const updateAttribute = (statistic: string, value: number) => {
        setLocalBuild((previous) => ({ ...previous, attr: { ...previous.attr, [statistic]: Math.max(0, value) } }));
    };

    const updateSocial = (statistic: string, value: number) => {
        setLocalBuild((previous) => ({ ...previous, soc: { ...previous.soc, [statistic]: Math.max(0, value) } }));
    };

    const updateSkill = (skillName: string, value: number) => {
        setLocalBuild((previous) => ({ ...previous, skills: { ...previous.skills, [skillName]: Math.max(0, value) } }));
    };

    const handleApply = async () => {
        if (destination === 'new') {
            if (isStandaloneMode) {
                try {
                    const providedNickname = sheetName?.trim() || '';
                    const newId = await storageAdapter.createLocalCharacter(providedNickname, null);
                    setActiveTokenId(newId);
                    const store = useCharacterStore.getState();
                    store.setTokenData(newId, 'PLAYER');
                    store.loadFromOwlbear({
                        nickname: providedNickname,
                        species: localBuild.species,
                        rank: localBuild.rank || 'Starter',
                        gender: localBuild.gender || '',
                        nature: localBuild.nature || '-- Select --',
                        parentId: null,
                        'v2-migrated': true
                    });
                    store.applyGeneratedBuild(localBuild);
                    onClose();
                } catch (e) {
                    console.error('[GeneratorPreviewModal] Failed to create new Pokémon sheet:', e);
                    alert('Failed to create new character sheet.');
                }
                return;
            }

            // Owlbear Rodeo Mode - Generate New Token
            try {
                const providedNickname = sheetName?.trim() || '';
                const tokenItemName = providedNickname || localBuild.species || 'Pokémon';

                // Prompt user to pick token image from their OBR asset library
                let images: ImageDownload[] | null = null;
                let selectedUrl = '';
                let selectedWidth = 0;
                let selectedHeight = 0;

                if (typeof OBR.assets?.downloadImages === 'function') {
                    images = await OBR.assets.downloadImages();
                } else {
                    const url = window.prompt('Enter an Image URL for the new Token:');
                    if (url) selectedUrl = url;
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

                // Resolve image dimensions to set proper grid dpi and center offset
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

                // Determine viewport center position in world coordinates
                const vpWidth = await OBR.viewport.getWidth();
                const vpHeight = await OBR.viewport.getHeight();
                const centerPos = await OBR.viewport.inverseTransformPoint({
                    x: vpWidth / 2,
                    y: vpHeight / 2
                });

                // Build metadata dictionary
                const metadata = buildTokenMetadataFromBuild(localBuild, providedNickname, selectedUrl);

                // In Owlbear Rodeo, character tokens use center offset: (width / 2, height / 2)
                // and grid dpi = resolvedWidth so the token occupies 1 standard grid cell with its origin at the center.
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

                const tokenItem = buildImage(imageContent, grid)
                    .name(tokenItemName)
                    .position(centerPos)
                    .layer('CHARACTER')
                    .metadata({
                        [METADATA_ID]: metadata
                    })
                    .build();

                await OBR.scene.items.addItems([tokenItem]);
                setActiveTokenId(tokenItem.id);
                const store = useCharacterStore.getState();
                store.setTokenData(tokenItem.id, store.role || 'PLAYER');
                store.setIdentity('tokenImageUrl', selectedUrl);
                store.loadFromOwlbear(metadata);
                await OBR.player.select([tokenItem.id]);

                // Immediately render tracker graphics on the new token
                const gData = buildGraphicsFromMeta(metadata);
                await renderTokenGraphics(tokenItem, gData, store.role || 'PLAYER', true);

                if (OBR.isAvailable) {
                    OBR.notification.show(`Created ${tokenItemName} token!`, 'SUCCESS');
                }
                onClose();
            } catch (e) {
                console.error('[GeneratorPreviewModal] Failed to spawn new token on Owlbear Rodeo:', e);
                alert('Failed to spawn new token.');
            }
            return;
        }

        applyGeneratedBuild(localBuild);

        if (config.randomizeSpecies && OBR.isAvailable && tokenId) {
            setShowImagePrompt(true);
        } else {
            onClose();
        }
    };

    const handleImageConfirm = async (wantsNewImage: boolean) => {
        if (wantsNewImage) {
            try {
                let images: ImageDownload[] | null = null;

                if (typeof OBR.assets?.downloadImages === 'function') {
                    images = await OBR.assets.downloadImages();
                } else {
                    const url = window.prompt('Enter an Image URL:');
                    if (url) {
                        setIdentity('tokenImageUrl', url);
                        await OBR.scene.items.updateItems([tokenId!], (items) => {
                            for (const item of items) {
                                const imgItem = item as Record<string, unknown>;
                                if (imgItem.image) (imgItem.image as Record<string, unknown>).url = url;
                            }
                        });
                    }
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
                        OBR.notification.show('Could not extract URL. Please check F12 Console!', 'ERROR');
                    }
                }
            } catch (e) {
                console.error('[GeneratorPreviewModal] Failed to pick image:', e);
            }
        }

        setShowImagePrompt(false);
        onClose();
    };

    const isTrainer = mode !== 'Pokémon';

    const getSkillLabel = (skillName: string) => {
        if (localBuild.customSkillMap[skillName]) return localBuild.customSkillMap[skillName] || 'Unnamed';
        if (isTrainer) {
            if (skillName === 'channel') return 'Throw';
            if (skillName === 'clash') return 'Weapon';
            if (skillName === 'charm') return 'Empathy';
            if (skillName === 'magic') return 'Science';
        }
        return skillName.charAt(0).toUpperCase() + skillName.slice(1);
    };

    const getBaseAttribute = (attribute: string) => {
        if (attribute === 'will') return willMax;

        if (localBuild.baseStats && Object.values(CombatStat).includes(attribute as CombatStat)) {
            return localBuild.baseStats[attribute as string] || 1;
        }

        if (Object.values(CombatStat).includes(attribute as CombatStat)) {
            return baseStats[attribute as CombatStat]?.base || 1;
        }
        if (Object.values(SocialStat).includes(attribute as SocialStat)) {
            return baseSocials[attribute as SocialStat]?.base || 1;
        }
        return 0;
    };

    const STAT_NAMES: Record<string, string> = {
        str: 'Strength',
        dex: 'Dexterity',
        vit: 'Vitality',
        spe: 'Special',
        ins: 'Insight'
    };

    const getStatLimit = (attribute: string) => {
        if (localBuild.pokemonData) {
            return getLimit(localBuild.pokemonData as Record<string, unknown>, STAT_NAMES[attribute] || '') || 5;
        }
        if (Object.values(CombatStat).includes(attribute as CombatStat)) {
            return baseStats[attribute as CombatStat]?.limit || 5;
        }
        return 5;
    };

    const getBaseSkill = (skillName: string) => {
        if (baseSkills[skillName as Skill]) return baseSkills[skillName as Skill].base;
        for (const category of extraCategories) {
            const foundSkill = category.skills.find((s) => s.id === skillName);
            if (foundSkill) return foundSkill.base;
        }
        return 0;
    };

    const skillCategories = [
        { title: 'FIGHT', skills: ['brawl', 'channel', 'clash', 'evasion'] },
        { title: 'SURVIVE', skills: ['alert', 'athletic', 'nature', 'stealth'] },
        { title: 'SOCIAL', skills: ['charm', 'etiquette', 'intimidate', 'perform'] }
    ];

    if (build.includePmd) {
        skillCategories.push({
            title: isTrainer ? 'KNOWLEDGE' : 'KNOWLEDGE (PMD)',
            skills: ['crafts', 'lore', 'medicine', 'magic']
        });
    }

    const mappedExtraCategories = extraCategories.map((category) => ({
        title: (category.name || 'CUSTOM').toUpperCase(),
        skills: category.skills.map((extraSkill) => extraSkill.id)
    }));

    const allCategories = [...skillCategories, ...mappedExtraCategories];
    const baseInsForMoves = localBuild.baseStats ? localBuild.baseStats['ins'] : baseStats[CombatStat.INS]?.base || 1;
    const dynamicMaxMoves = baseInsForMoves + (localBuild.attr['ins'] || 0) + 3;

    return (
        <div className="generator-preview__overlay">
            {/* The style object here is dynamic and permitted by our architectural rules */}
            <div className="generator-preview__content" style={{ display: showImagePrompt ? 'none' : 'flex' }}>
                <h3 className="generator-preview__title modal-title-with-icon text-title-primary">
                    <Search size={20} /> Build Preview: {localBuild.species}
                    {(localBuild.gender || localBuild.nature) && (
                        <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                            ({[localBuild.gender, localBuild.nature].filter(Boolean).join(', ')})
                        </span>
                    )}
                </h3>

                <div className="generator-preview__scroll-container">
                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title text-title-primary">
                            Attributes (Rank Added)
                        </div>
                        <div className="generator-preview__grid-5">
                            {Object.values(CombatStat).map((statistic) => {
                                const baseVal = getBaseAttribute(statistic);
                                const limitVal = getStatLimit(statistic);
                                return (
                                    <div key={statistic} className="generator-preview__stat-column">
                                        <label
                                            className="text-label"
                                            title={`Base: ${baseVal} | Limit: ${limitVal} | Total: ${baseVal + (localBuild.attr[statistic] || 0)}`}
                                        >
                                            {statistic.toUpperCase()}
                                        </label>
                                        <span className="generator-preview__stat-subtext--nowrap text-subtext">
                                            Base: {baseVal} | Limit: {limitVal}
                                        </span>
                                        <GeneratorPreviewStatSpinner
                                            value={localBuild.attr[statistic] || 0}
                                            onChange={(value) => updateAttribute(statistic, value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title text-title-primary">Socials (Rank Added)</div>
                        <div className="generator-preview__grid-5">
                            {Object.values(SocialStat).map((statistic) => {
                                const baseVal = getBaseAttribute(statistic);
                                return (
                                    <div key={statistic} className="generator-preview__stat-column">
                                        <label
                                            className="text-label"
                                            title={`Base: ${baseVal} | Total: ${baseVal + (localBuild.soc[statistic] || 0)}`}
                                        >
                                            {statistic.toUpperCase()}
                                        </label>
                                        <span className="text-subtext">Base: {baseVal}</span>
                                        <GeneratorPreviewStatSpinner
                                            value={localBuild.soc[statistic] || 0}
                                            onChange={(value) => updateSocial(statistic, value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title generator-preview__section-title--spaced text-title-primary">
                            Skills
                        </div>
                        <div className="generator-preview__grid-4">
                            {allCategories.map((category, index) => (
                                <div key={`${category.title}-${index}`} className="generator-preview__skill-category">
                                    <div className="generator-preview__skill-category-title text-label">
                                        {category.title}
                                    </div>
                                    {category.skills.map((skillName) => (
                                        <div key={skillName} className="generator-preview__skill-row">
                                            <label
                                                className="generator-preview__skill-label text-label"
                                                style={{ color: 'var(--text-main)' }}
                                                title={getSkillLabel(skillName)}
                                            >
                                                {getSkillLabel(skillName)}
                                            </label>
                                            <GeneratorPreviewStatSpinner
                                                value={localBuild.skills[skillName] || 0}
                                                onChange={(value) => updateSkill(skillName, value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title text-title-primary">
                            Moves (Max: {dynamicMaxMoves})
                        </div>
                        <div className="generator-preview__grid-2">
                            {localBuild.moves.map((move, index) => {
                                const accuracyAttributeTotal =
                                    getBaseAttribute(move.attr) +
                                    (localBuild.attr[move.attr] || localBuild.soc[move.attr] || 0);
                                const accuracySkillTotal =
                                    getBaseSkill(move.skill) + (localBuild.skills[move.skill] || 0);
                                const accuracyPool = accuracyAttributeTotal + accuracySkillTotal;

                                const damageAttributeTotal =
                                    getBaseAttribute(move.dmgStat) +
                                    (localBuild.attr[move.dmgStat] || localBuild.soc[move.dmgStat] || 0);
                                const damagePool = move.cat === 'Status' ? '-' : move.power + damageAttributeTotal;

                                return (
                                    <GeneratorPreviewMoveRow
                                        key={index}
                                        move={move}
                                        accuracyPool={accuracyPool}
                                        damagePool={damagePool}
                                        onOpenTooltip={setTooltipInfo}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="generator-preview__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark generator-preview__btn-cancel"
                    >
                        <XCircle size={16} /> Discard
                    </button>
                    <button
                        type="button"
                        onClick={onReroll}
                        className="action-button action-button--secondary generator-preview__btn-reroll"
                    >
                        <Dices size={16} /> Reroll
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className={`action-button ${destination === 'new' ? 'action-button--theme' : 'action-button--red'} generator-preview__btn-apply`}
                    >
                        {destination === 'new' ? (
                            isStandaloneMode ? (
                                <>
                                    <FilePlus size={16} /> Create Sheet
                                </>
                            ) : (
                                <>
                                    <ImagePlus size={16} /> Select Image & Create Token
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

            {tooltipInfo && (
                <div className="generator-preview-tooltip__overlay">
                    <div className="generator-preview-tooltip__content">
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
        </div>
    );
}
