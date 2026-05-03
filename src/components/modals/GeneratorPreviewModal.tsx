import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { TempBuild } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { GeneratorPreviewStatSpinner } from './GeneratorPreviewStatSpinner';
import { GeneratorPreviewMoveRow } from './GeneratorPreviewMoveRow';
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let images: any = null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (typeof (OBR as any).assets?.downloadImages === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    images = await (OBR as any).assets.downloadImages();
                } else {
                    const url = window.prompt('Enter an Image URL:');
                    if (url) {
                        setIdentity('tokenImageUrl', url);
                        await OBR.scene.items.updateItems([tokenId!], (items) => {
                            for (const item of items) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const imgItem = item as any;
                                if (imgItem.image) imgItem.image.url = url;
                            }
                        });
                    }
                }

                if (images && images.length > 0) {
                    let selectedUrl = '';
                    const img = images[0];

                    if (typeof img === 'string') selectedUrl = img;
                    else if (img.url) selectedUrl = img.url;
                    else if (img.image?.url) selectedUrl = img.image.url;
                    else if (img.src) selectedUrl = img.src;

                    if (selectedUrl) {
                        setIdentity('tokenImageUrl', selectedUrl);
                        await OBR.scene.items.updateItems([tokenId!], (items) => {
                            for (const item of items) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const imgItem = item as any;
                                if (imgItem.image) imgItem.image.url = selectedUrl;
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
            <div className="generator-preview__content" style={{ display: showImagePrompt ? 'none' : 'flex' }}>
                <h3 className="generator-preview__title">🔍 Build Preview: {localBuild.species}</h3>

                <div className="generator-preview__scroll-container">
                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title">Attributes (Rank Added)</div>
                        <div className="generator-preview__grid-5">
                            {Object.values(CombatStat).map((statistic) => {
                                const baseVal = getBaseAttribute(statistic);
                                return (
                                    <div key={statistic} className="generator-preview__stat-column">
                                        <label
                                            className="generator-preview__stat-label"
                                            title={`Base: ${baseVal} | Total: ${baseVal + (localBuild.attr[statistic] || 0)}`}
                                        >
                                            {statistic.toUpperCase()}
                                        </label>
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                color: 'var(--text-muted)',
                                                marginBottom: '4px'
                                            }}
                                        >
                                            Base: {baseVal}
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
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                color: 'var(--text-muted)',
                                                marginBottom: '4px'
                                            }}
                                        >
                                            Base: {baseVal}
                                        </span>
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
                <div className="generator-preview-tooltip__overlay" style={{ zIndex: 1400 }}>
                    <div className="generator-preview-tooltip__content">
                        <h3 className="generator-preview-tooltip__title" style={{ textAlign: 'center' }}>
                            🖼️ Update Token Image?
                        </h3>
                        <p className="generator-preview-tooltip__desc" style={{ textAlign: 'center' }}>
                            You generated a brand new species! Would you like to select a new image for this token?
                        </p>
                        <div className="generator-preview-tooltip__actions" style={{ gap: '10px', marginTop: '15px' }}>
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
