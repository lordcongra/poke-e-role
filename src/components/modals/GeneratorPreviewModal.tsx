import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { TempBuild } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { GeneratorPreviewStatSpinner } from './GeneratorPreviewStatSpinner';
import { GeneratorPreviewMoveRow } from './GeneratorPreviewMoveRow';
import { getLimit } from '../../utils/macroHelpers';
import './GeneratorPreviewModal.css';

interface GeneratorPreviewModalProps {
    build: TempBuild;
    onClose: () => void;
    onReroll: () => void;
}

export function GeneratorPreviewModal({ build, onClose, onReroll }: GeneratorPreviewModalProps) {
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

    const handleApply = () => {
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
                // Strictly type the undocumented assets API to avoid 'any'
                const assetsApi = OBR.assets as unknown as { downloadImages?: () => Promise<unknown[]> };
                let images: unknown[] | null = null;

                if (typeof assetsApi?.downloadImages === 'function') {
                    images = await assetsApi.downloadImages();
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
                    let selectedUrl = '';
                    const img = images[0] as Record<string, unknown> | string;

                    if (typeof img === 'string') {
                        selectedUrl = img;
                    } else if (img && typeof img === 'object') {
                        if (typeof img.url === 'string') selectedUrl = img.url;
                        else if (img.image && typeof (img.image as Record<string, unknown>).url === 'string') {
                            selectedUrl = (img.image as Record<string, unknown>).url as string;
                        } else if (typeof img.src === 'string') {
                            selectedUrl = img.src;
                        }
                    }

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
                console.error('Failed to pick image:', e);
            }
        }

        setShowImagePrompt(false);
        onClose();
    };

    const isTrainer = mode === 'Trainer';

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
                <h3 className="generator-preview__title">🔍 Build Preview: {localBuild.species}</h3>

                <div className="generator-preview__scroll-container">
                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title">Attributes (Rank Added)</div>
                        <div className="generator-preview__grid-5">
                            {Object.values(CombatStat).map((statistic) => {
                                const baseVal = getBaseAttribute(statistic);
                                const limitVal = getStatLimit(statistic);
                                return (
                                    <div key={statistic} className="generator-preview__stat-column">
                                        <label
                                            className="generator-preview__stat-label"
                                            title={`Base: ${baseVal} | Limit: ${limitVal} | Total: ${baseVal + (localBuild.attr[statistic] || 0)}`}
                                        >
                                            {statistic.toUpperCase()}
                                        </label>
                                        <span className="generator-preview__stat-subtext generator-preview__stat-subtext--nowrap">
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
                        <div className="generator-preview__section-title">Socials (Rank Added)</div>
                        <div className="generator-preview__grid-5">
                            {Object.values(SocialStat).map((statistic) => {
                                const baseVal = getBaseAttribute(statistic);
                                return (
                                    <div key={statistic} className="generator-preview__stat-column">
                                        <label
                                            className="generator-preview__stat-label"
                                            title={`Base: ${baseVal} | Total: ${baseVal + (localBuild.soc[statistic] || 0)}`}
                                        >
                                            {statistic.toUpperCase()}
                                        </label>
                                        <span className="generator-preview__stat-subtext">Base: {baseVal}</span>
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
                        <div className="generator-preview__section-title generator-preview__section-title--spaced">
                            Skills
                        </div>
                        <div className="generator-preview__grid-4">
                            {allCategories.map((category, index) => (
                                <div key={`${category.title}-${index}`} className="generator-preview__skill-category">
                                    <div className="generator-preview__skill-category-title">{category.title}</div>
                                    {category.skills.map((skillName) => (
                                        <div key={skillName} className="generator-preview__skill-row">
                                            <label
                                                className="generator-preview__skill-label"
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
                        <div className="generator-preview__section-title">Moves (Max: {dynamicMaxMoves})</div>
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
                        Discard
                    </button>
                    <button
                        type="button"
                        onClick={onReroll}
                        className="action-button action-button--dark generator-preview__btn-reroll"
                    >
                        🎲 Reroll
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="action-button action-button--red generator-preview__btn-apply"
                    >
                        ✅ Apply Build
                    </button>
                </div>
            </div>

            {showImagePrompt && (
                <div className="generator-preview-tooltip__overlay generator-preview-tooltip__overlay--high-z">
                    <div className="generator-preview-tooltip__content">
                        <h3 className="generator-preview-tooltip__title generator-preview-tooltip__title--center">
                            🖼️ Update Token Image?
                        </h3>
                        <p className="generator-preview-tooltip__desc generator-preview-tooltip__desc--center">
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
                        <h3 className="generator-preview-tooltip__title">{tooltipInfo.title}</h3>
                        <p className="generator-preview-tooltip__desc">{tooltipInfo.desc}</p>
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
