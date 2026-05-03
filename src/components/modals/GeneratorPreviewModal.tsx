import { useState, useEffect } from 'react';
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

    const baseStats = useCharacterStore((state) => state.stats);
    const baseSocials = useCharacterStore((state) => state.socials);
    const baseSkills = useCharacterStore((state) => state.skills);
    const willMax = useCharacterStore((state) => state.will.willMax);

    const [localBuild, setLocalBuild] = useState<TempBuild>(build);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    // Sync the local state whenever the parent generates a new build via Reroll!
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
    const dynamicMaxMoves = (baseStats[CombatStat.INS]?.base || 1) + (localBuild.attr['ins'] || 0) + 3;

    return (
        <div className="generator-preview__overlay">
            <div className="generator-preview__content">
                <h3 className="generator-preview__title">🔍 Build Preview</h3>

                <div className="generator-preview__scroll-container">
                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title">Attributes (Rank Added)</div>
                        <div className="generator-preview__grid-5">
                            {Object.values(CombatStat).map((statistic) => (
                                <div key={statistic} className="generator-preview__stat-column">
                                    <label className="generator-preview__stat-label">{statistic.toUpperCase()}</label>
                                    <GeneratorPreviewStatSpinner
                                        value={localBuild.attr[statistic] || 0}
                                        onChange={(value) => updateAttribute(statistic, value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="generator-preview__section">
                        <div className="generator-preview__section-title">Socials (Rank Added)</div>
                        <div className="generator-preview__grid-5">
                            {Object.values(SocialStat).map((statistic) => (
                                <div key={statistic} className="generator-preview__stat-column">
                                    <label className="generator-preview__stat-label">{statistic.toUpperCase()}</label>
                                    <GeneratorPreviewStatSpinner
                                        value={localBuild.soc[statistic] || 0}
                                        onChange={(value) => updateSocial(statistic, value)}
                                    />
                                </div>
                            ))}
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
                        onClick={() => {
                            applyGeneratedBuild(localBuild);
                            onClose();
                        }}
                        className="action-button action-button--red generator-preview__btn-apply"
                    >
                        ✅ Apply Build
                    </button>
                </div>
            </div>

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