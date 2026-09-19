import React from 'react';
import { Shield, Sparkles, Award, Dices, Compass } from 'lucide-react';
import type { Rank } from '../../../store/storeTypes';
import { SKILL_CATEGORIES } from '../../../types/enums';
import { RANKS, NATURES } from '../../../data/constants';
import { BIOME_MAP } from '../../../data/biomeData';
import { GeneratorPreviewStatSpinner } from '../pokemonGenerator';
import type { GeneratedTrainerResult, TrainerGeneratorConfig } from '../../../utils/trainerGeneratorLogic';
import './TrainerPreviewModal.css';

export interface TrainerSheetPreviewProps {
    result: GeneratedTrainerResult;
    activeConfig: TrainerGeneratorConfig;
    trainerName: string;
    setTrainerName: (name: string) => void;
    trainerRank: Rank;
    setTrainerRank: (rank: Rank) => void;
    trainerAge: string;
    setTrainerAge: (age: string) => void;
    trainerGender: string;
    setTrainerGender: (gender: string) => void;
    trainerNature: string;
    setTrainerNature: (nature: string) => void;
    trainerAttr: Record<string, number>;
    updateTrainerAttr: (statKey: string, val: number) => void;
    trainerSoc: Record<string, number>;
    updateTrainerSoc: (statKey: string, val: number) => void;
    trainerSkills: Record<string, number>;
    updateTrainerSkill: (skillKey: string, val: number) => void;
    handleRerollTrainer: () => void;
    handleRerollAllMembers: () => void;
}

export const TrainerSheetPreview: React.FC<TrainerSheetPreviewProps> = ({
    result,
    activeConfig,
    trainerName,
    setTrainerName,
    trainerRank,
    setTrainerRank,
    trainerAge,
    setTrainerAge,
    trainerGender,
    setTrainerGender,
    trainerNature,
    setTrainerNature,
    trainerAttr,
    updateTrainerAttr,
    trainerSoc,
    updateTrainerSoc,
    trainerSkills,
    updateTrainerSkill,
    handleRerollTrainer,
    handleRerollAllMembers
}) => {
    const isSpecialTrainer = result.trainerMetadata?.['mode'] === 'Trainer (Special)';

    const originBiomeId = (result.originBiomeId ||
        activeConfig.trainerBiomeId ||
        result.trainerMetadata?.['origin-biome']) as string | undefined;
    const originBiomeDef = originBiomeId && originBiomeId !== 'none' ? BIOME_MAP[originBiomeId] : undefined;

    return (
        <>
            {/* Concept & Identity */}
            <div className="trainer-preview__section">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}
                >
                    <span className="trainer-preview__section-title text-title-primary">
                        <Shield size={14} color="var(--primary)" /> Trainer Profile
                    </span>
                    {originBiomeDef && (
                        <span
                            style={{
                                fontSize: '0.78rem',
                                color: 'var(--subtext)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <Compass size={13} color="var(--primary)" /> Origin Biome:{' '}
                            <strong style={{ color: 'var(--text-main)' }}>
                                [{originBiomeDef.tag}] {originBiomeDef.name}
                            </strong>
                        </span>
                    )}
                </div>
                <div className="trainer-preview__grid-3" style={{ marginBottom: '8px' }}>
                    <div>
                        <label className="text-label" style={{ fontSize: '0.78rem' }}>
                            Name:
                        </label>
                        <input
                            type="text"
                            value={trainerName}
                            onChange={(e) => setTrainerName(e.target.value)}
                            className="trainer-preview__input"
                        />
                    </div>
                    <div>
                        <label className="text-label" style={{ fontSize: '0.78rem' }}>
                            Rank:
                        </label>
                        <select
                            value={trainerRank}
                            onChange={(e) => setTrainerRank(e.target.value as Rank)}
                            className="trainer-preview__select"
                        >
                            {RANKS.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-label" style={{ fontSize: '0.78rem' }}>
                            Concept:
                        </label>
                        <div
                            className="trainer-preview__input"
                            style={{ background: 'var(--panel-bg)', opacity: 0.85 }}
                        >
                            {result.concept ? result.concept.name : 'Independent'}
                        </div>
                    </div>
                </div>
                <div className="trainer-preview__grid-3">
                    <div>
                        <label className="text-label" style={{ fontSize: '0.78rem' }}>
                            Age:
                        </label>
                        <select
                            value={trainerAge}
                            onChange={(e) => setTrainerAge(e.target.value)}
                            className="trainer-preview__select"
                        >
                            <option value="Child">Child</option>
                            <option value="Teen">Teen</option>
                            <option value="Adult">Adult</option>
                            <option value="Senior">Senior</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-label" style={{ fontSize: '0.78rem' }}>
                            Gender:
                        </label>
                        <select
                            value={trainerGender}
                            onChange={(e) => setTrainerGender(e.target.value)}
                            className="trainer-preview__select"
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-Binary">Non-Binary</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-label" style={{ fontSize: '0.78rem' }}>
                            Nature:
                        </label>
                        <select
                            value={trainerNature}
                            onChange={(e) => setTrainerNature(e.target.value)}
                            className="trainer-preview__select"
                        >
                            {NATURES.filter((n) => n && n.trim() !== '').map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Combat Attributes */}
            <div className="trainer-preview__section">
                <span className="trainer-preview__section-title text-title-primary">
                    <Sparkles size={14} color="var(--primary)" /> Combat Attributes
                </span>
                <div className="trainer-preview__grid-5">
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Strength
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerAttr['str'] || 0)}
                            onChange={(val) => updateTrainerAttr('str', val - 1)}
                        />
                    </div>
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Dexterity
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerAttr['dex'] || 0)}
                            onChange={(val) => updateTrainerAttr('dex', val - 1)}
                        />
                    </div>
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Vitality
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerAttr['vit'] || 0)}
                            onChange={(val) => updateTrainerAttr('vit', val - 1)}
                        />
                    </div>
                    {isSpecialTrainer && (
                        <div className="trainer-preview__stat-col">
                            <span className="text-label" style={{ fontSize: '0.75rem' }}>
                                Special
                            </span>
                            <GeneratorPreviewStatSpinner
                                value={1 + (trainerAttr['spe'] || 0)}
                                onChange={(val) => updateTrainerAttr('spe', val - 1)}
                            />
                        </div>
                    )}
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Insight
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerAttr['ins'] || 0)}
                            onChange={(val) => updateTrainerAttr('ins', val - 1)}
                        />
                    </div>
                </div>
            </div>

            {/* Social Attributes */}
            <div className="trainer-preview__section">
                <span className="trainer-preview__section-title text-title-primary">Social Attributes</span>
                <div className="trainer-preview__grid-5">
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Tough
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerSoc['tou'] || 0)}
                            onChange={(val) => updateTrainerSoc('tou', val - 1)}
                        />
                    </div>
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Cool
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerSoc['coo'] || 0)}
                            onChange={(val) => updateTrainerSoc('coo', val - 1)}
                        />
                    </div>
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Beauty
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerSoc['bea'] || 0)}
                            onChange={(val) => updateTrainerSoc('bea', val - 1)}
                        />
                    </div>
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Cute
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerSoc['cut'] || 0)}
                            onChange={(val) => updateTrainerSoc('cut', val - 1)}
                        />
                    </div>
                    <div className="trainer-preview__stat-col">
                        <span className="text-label" style={{ fontSize: '0.75rem' }}>
                            Clever
                        </span>
                        <GeneratorPreviewStatSpinner
                            value={1 + (trainerSoc['cle'] || 0)}
                            onChange={(val) => updateTrainerSoc('cle', val - 1)}
                        />
                    </div>
                </div>
            </div>

            {/* Skills */}
            <div className="trainer-preview__section">
                <span className="trainer-preview__section-title text-title-primary">Trainer Skills</span>
                <div className="trainer-preview__skill-categories">
                    {SKILL_CATEGORIES.map((category) => (
                        <div key={category.name} className="trainer-preview__skill-group">
                            <span className="trainer-preview__skill-group-title">{category.name}</span>
                            <div className="trainer-preview__grid-4">
                                {category.skills.map((skill) => {
                                    const currentVal = trainerSkills[skill.key] || 0;
                                    const displayLabel =
                                        isSpecialTrainer && skill.specialTrainerLabel
                                            ? skill.specialTrainerLabel
                                            : skill.trainerLabel;
                                    return (
                                        <div key={skill.key} className="trainer-preview__stat-col">
                                            <span className="text-label" style={{ fontSize: '0.75rem' }}>
                                                {displayLabel}
                                            </span>
                                            <GeneratorPreviewStatSpinner
                                                value={currentVal}
                                                onChange={(val) => updateTrainerSkill(skill.key, val)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Badges Summary */}
            {Array.isArray(result.trainerMetadata?.['badges']) &&
                (result.trainerMetadata['badges'] as unknown[]).length > 0 && (
                    <div className="trainer-preview__section">
                        <span className="trainer-preview__section-title text-title-primary">
                            <Award size={14} color="var(--primary)" /> Gym Badges
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(result.trainerMetadata['badges'] as { name: string; emoji?: string }[]).map((b, i) => (
                                <span key={i} className="trainer-preview__badge-chip">
                                    <Award
                                        size={13}
                                        style={{
                                            marginRight: '4px',
                                            verticalAlign: 'middle',
                                            color: 'var(--primary)'
                                        }}
                                    />{' '}
                                    {b.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

            {/* Trainer Actions */}
            <div className="trainer-preview__reroll-bar">
                <button type="button" className="action-button action-button--dark" onClick={handleRerollTrainer}>
                    <Dices size={14} /> Reroll Trainer Stats & Nature
                </button>
                <button type="button" className="action-button action-button--dark" onClick={handleRerollAllMembers}>
                    <Dices size={14} /> Reroll Entire Pokémon Team
                </button>
            </div>
        </>
    );
};
