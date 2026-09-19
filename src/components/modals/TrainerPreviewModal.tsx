import { useState } from 'react';
import { User, Shield, Sparkles, Dices, XCircle, CheckCircle, Award, Compass } from 'lucide-react';
import type { Rank } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill, SKILL_CATEGORIES } from '../../types/enums';
import { RANKS, NATURES, TYPE_COLORS } from '../../data/constants';
import { BIOME_MAP } from '../../data/biomeData';
import {
    type GeneratedTrainerResult,
    type TrainerGeneratorConfig,
    type PokedexLookupItem,
    pickAndGenerateTeamMember,
    allocateTrainerStats,
    getEligibleTeamPool
} from '../../utils/trainerGeneratorLogic';
import { spawnTrainerAndTeam, type TrainerSpawnImageOptions } from '../../utils/trainerTokenSpawner';
import { buildTokenMetadataFromBuild } from '../../utils/generatorUtils';
import { useCharacterStore } from '../../store/useCharacterStore';
import { GeneratorPreviewStatSpinner } from './GeneratorPreviewStatSpinner';
import { GeneratorPreviewMoveRow } from './GeneratorPreviewMoveRow';
import './TrainerPreviewModal.css';

function getMemberTypes(
    member: { species: string; build: any; metadata?: Record<string, unknown> },
    lookupList: PokedexLookupItem[]
): string[] {
    const pd = member.build.pokemonData as Record<string, any> | undefined;
    const t1 = String(pd?.Type1 || pd?.type1 || member.metadata?.type1 || '').trim();
    const t2 = String(pd?.Type2 || pd?.type2 || member.metadata?.type2 || '').trim();
    const types = [t1, t2].filter((t) => t && t.toLowerCase() !== 'none' && t.toLowerCase() !== 'undefined');
    if (types.length > 0) return types;
    const lookup = lookupList.find((p) => p.name.toLowerCase() === member.species.toLowerCase());
    if (lookup) {
        return [lookup.type1, lookup.type2].filter(
            (t) => t && t.toLowerCase() !== 'none' && t.toLowerCase() !== 'undefined'
        );
    }
    return [];
}

function getMemberBaseStat(
    build: { baseStats?: Record<string, number>; pokemonData?: Record<string, unknown> },
    statKey: string,
    fallback: number = 2
): number {
    const lowerKey = statKey.toLowerCase();
    if (build.baseStats && build.baseStats[lowerKey] !== undefined) {
        return Number(build.baseStats[lowerKey]);
    }
    const pd = build.pokemonData as Record<string, any> | undefined;
    if (pd?.BaseStats) {
        const fullKeyMap: Record<string, string> = {
            str: 'Strength',
            dex: 'Dexterity',
            vit: 'Vitality',
            spe: 'Special',
            ins: 'Insight'
        };
        const mappedName = fullKeyMap[lowerKey];
        if (mappedName && pd.BaseStats[mappedName] !== undefined) {
            return Number(pd.BaseStats[mappedName]);
        }
        if (pd.BaseStats[statKey.toUpperCase()] !== undefined) {
            return Number(pd.BaseStats[statKey.toUpperCase()]);
        }
    }
    return fallback;
}

interface TrainerPreviewModalProps {
    result: GeneratedTrainerResult;
    config: TrainerGeneratorConfig;
    pokedexLookup: PokedexLookupItem[];
    destination: 'new' | 'overwrite';
    imageOptions: TrainerSpawnImageOptions;
    onClose: () => void;
}

export function TrainerPreviewModal({
    result,
    config,
    pokedexLookup,
    destination,
    imageOptions,
    onClose
}: TrainerPreviewModalProps) {
    const store = useCharacterStore();

    // Active tab: 'trainer' or team member index (0..N-1)
    const [activeTab, setActiveTab] = useState<'trainer' | number>('trainer');

    // Trainer Form State
    const [trainerName, setTrainerName] = useState<string>(result.trainerName);
    const [trainerRank, setTrainerRank] = useState<Rank>(result.resolvedRank);
    const [trainerAge, setTrainerAge] = useState<string>(String(result.trainerMetadata['age'] || 'Adult'));
    const [trainerGender, setTrainerGender] = useState<string>(String(result.trainerMetadata['gender'] || 'Male'));
    const [trainerNature, setTrainerNature] = useState<string>(String(result.trainerMetadata['nature'] || 'Hardy'));

    const initialAttr: Record<string, number> = {
        str: Number(result.trainerMetadata['str-rank'] || 0),
        dex: Number(result.trainerMetadata['dex-rank'] || 0),
        vit: Number(result.trainerMetadata['vit-rank'] || 0),
        spe: Number(result.trainerMetadata['spe-rank'] || 0),
        ins: Number(result.trainerMetadata['ins-rank'] || 0)
    };
    const [trainerAttr, setTrainerAttr] = useState<Record<string, number>>(initialAttr);

    const initialSoc: Record<string, number> = {
        tou: Number(result.trainerMetadata['tou-rank'] || 0),
        coo: Number(result.trainerMetadata['coo-rank'] || 0),
        bea: Number(result.trainerMetadata['bea-rank'] || 0),
        cut: Number(result.trainerMetadata['cut-rank'] || 0),
        cle: Number(result.trainerMetadata['cle-rank'] || 0)
    };
    const [trainerSoc, setTrainerSoc] = useState<Record<string, number>>(initialSoc);

    const [trainerSkills, setTrainerSkills] = useState<Record<string, number>>(() => {
        const skillsFromObj = (result.trainerMetadata['skills-ranks'] as Record<string, number>) || {};
        const extracted: Record<string, number> = {};
        Object.values(Skill).forEach((s) => {
            extracted[s] =
                skillsFromObj[s] !== undefined
                    ? Number(skillsFromObj[s])
                    : Number(result.trainerMetadata[`${s}-base`] || 0);
        });
        return extracted;
    });

    // Pokémon Team State
    const [teamMembers, setTeamMembers] = useState(result.teamMembers);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const [isSpawning, setIsSpawning] = useState(false);

    const isSpecialTrainer =
        String(result.trainerMetadata['mode'] || '').includes('Special') || config.isSpecialTrainer;

    // --- Trainer Tinker Handlers ---
    const updateTrainerAttr = (attr: string, val: number) => {
        setTrainerAttr((prev) => ({ ...prev, [attr]: Math.max(0, val) }));
    };

    const updateTrainerSoc = (soc: string, val: number) => {
        setTrainerSoc((prev) => ({ ...prev, [soc]: Math.max(0, val) }));
    };

    const updateTrainerSkill = (skill: string, val: number) => {
        setTrainerSkills((prev) => ({ ...prev, [skill]: Math.max(0, val) }));
    };

    // --- Reroll Trainer Logic ---
    const handleRerollTrainer = () => {
        const validNatures = NATURES.filter((n) => n && n.trim() !== '');
        const newNature = validNatures[Math.floor(Math.random() * validNatures.length)];
        const profile = config.profile === 'auto' ? result.concept?.suggestedProfile || 'battler' : config.profile;
        const { attr, soc, skills } = allocateTrainerStats(trainerRank, trainerAge, profile, isSpecialTrainer);

        setTrainerNature(newNature);
        setTrainerAttr(attr);
        setTrainerSoc(soc);
        setTrainerSkills(skills);
    };

    // --- Reroll Team Member Logic ---
    const activeConfig = result.config || config;

    const handleRerollMember = async (slotIdx: number) => {
        const usedSpecies = new Set(
            teamMembers.filter((_, idx) => idx !== slotIdx).map((m) => m.species.toLowerCase())
        );
        const slotPool = getEligibleTeamPool(activeConfig, pokedexLookup, result.concept, slotIdx);
        const newMember = await pickAndGenerateTeamMember(
            slotIdx,
            activeConfig,
            trainerRank,
            store,
            slotPool,
            usedSpecies
        );
        if (newMember) {
            setTeamMembers((prev) => {
                const next = [...prev];
                next[slotIdx] = newMember;
                return next;
            });
        }
    };

    // --- Reroll All Team Members Logic ---
    const handleRerollAllMembers = async () => {
        const usedSpecies = new Set<string>();
        const nextMembers = [];
        for (let i = 0; i < teamMembers.length; i++) {
            const slotPool = getEligibleTeamPool(activeConfig, pokedexLookup, result.concept, i);
            const member = await pickAndGenerateTeamMember(i, activeConfig, trainerRank, store, slotPool, usedSpecies);
            if (member) {
                usedSpecies.add(member.species.toLowerCase());
                nextMembers.push(member);
            }
        }
        if (nextMembers.length > 0) {
            setTeamMembers(nextMembers);
        }
    };

    // --- Pokémon Member Tinker Handlers ---
    const updateActiveMemberAttr = (attr: string, val: number) => {
        if (typeof activeTab !== 'number') return;
        setTeamMembers((prev) => {
            const next = [...prev];
            const current = next[activeTab];
            if (!current) return prev;
            next[activeTab] = {
                ...current,
                build: {
                    ...current.build,
                    attr: { ...current.build.attr, [attr]: Math.max(0, val) }
                }
            };
            return next;
        });
    };

    const updateActiveMemberSoc = (soc: string, val: number) => {
        if (typeof activeTab !== 'number') return;
        setTeamMembers((prev) => {
            const next = [...prev];
            const current = next[activeTab];
            if (!current) return prev;
            next[activeTab] = {
                ...current,
                build: {
                    ...current.build,
                    soc: { ...current.build.soc, [soc]: Math.max(0, val) }
                }
            };
            return next;
        });
    };

    const updateActiveMemberSkill = (skill: string, val: number) => {
        if (typeof activeTab !== 'number') return;
        setTeamMembers((prev) => {
            const next = [...prev];
            const current = next[activeTab];
            if (!current) return prev;
            next[activeTab] = {
                ...current,
                build: {
                    ...current.build,
                    skills: { ...current.build.skills, [skill]: Math.max(0, val) }
                }
            };
            return next;
        });
    };

    // --- Final Spawn / Apply ---
    const handleApply = async () => {
        setIsSpawning(true);
        try {
            const vitTotal = 1 + (trainerAttr['vit'] || 0);
            const insTotal = 1 + (trainerAttr['ins'] || 0);
            const maxHp = 4 + vitTotal;
            const maxWill = insTotal + 2;

            const updatedTrainerMetadata: Record<string, unknown> = {
                ...result.trainerMetadata,
                nickname: trainerName.trim() || 'Trainer',
                rank: trainerRank,
                age: trainerAge,
                gender: trainerGender,
                nature: trainerNature,
                'str-rank': trainerAttr['str'] || 0,
                'dex-rank': trainerAttr['dex'] || 0,
                'vit-rank': trainerAttr['vit'] || 0,
                'spe-rank': trainerAttr['spe'] || 0,
                'ins-rank': trainerAttr['ins'] || 0,
                'tou-rank': trainerSoc['tou'] || 0,
                'coo-rank': trainerSoc['coo'] || 0,
                'bea-rank': trainerSoc['bea'] || 0,
                'cut-rank': trainerSoc['cut'] || 0,
                'cle-rank': trainerSoc['cle'] || 0,
                'skills-ranks': trainerSkills,
                'hp-max': maxHp,
                'will-max': maxWill
            };

            Object.entries(trainerSkills).forEach(([s, val]) => {
                updatedTrainerMetadata[`${s}-base`] = val;
            });

            const updatedTeamMembers = teamMembers.map((member) => {
                const freshMeta = buildTokenMetadataFromBuild(
                    member.build,
                    member.species,
                    String(member.metadata['token-image-url'] || `${import.meta.env.BASE_URL || '/'}pokeball.svg`)
                );
                freshMeta['age'] = '';
                if (member.metadata['loyalty-curr'] !== undefined) {
                    freshMeta['loyalty-curr'] = member.metadata['loyalty-curr'];
                    freshMeta['happiness-curr'] = member.metadata['happiness-curr'];
                }
                return {
                    species: member.species,
                    build: member.build,
                    metadata: freshMeta
                };
            });

            const finalResult: GeneratedTrainerResult = {
                trainerName: trainerName.trim() || 'Trainer',
                resolvedRank: trainerRank,
                concept: result.concept,
                trainerMetadata: updatedTrainerMetadata,
                teamMembers: updatedTeamMembers
            };

            await spawnTrainerAndTeam(finalResult, destination, imageOptions);
            onClose();
        } catch (err) {
            console.error('[TrainerPreviewModal] Failed to spawn:', err);
            setTooltipInfo({
                title: 'Spawning Failed',
                desc: 'An error occurred while spawning the Trainer & team. Check browser console for details.'
            });
        } finally {
            setIsSpawning(false);
        }
    };

    const activeMember = typeof activeTab === 'number' ? teamMembers[activeTab] : null;

    return (
        <div className="trainer-preview__overlay">
            <div className="trainer-preview__content">
                {/* Header */}
                <h3 className="trainer-preview__title text-title-primary">
                    <Shield size={20} color="var(--primary)" /> Trainer & Team Preview
                </h3>

                {/* Tabs */}
                <div className="trainer-preview__tabs">
                    <button
                        type="button"
                        className={`trainer-preview__tab-btn ${activeTab === 'trainer' ? 'trainer-preview__tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('trainer')}
                    >
                        <User size={14} /> Trainer: {trainerName || 'Trainer'}
                    </button>
                    {teamMembers.map((member, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className={`trainer-preview__tab-btn ${activeTab === idx ? 'trainer-preview__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab(idx)}
                        >
                            #{idx + 1}: {member.species}
                        </button>
                    ))}
                </div>

                {/* Scrollable Body */}
                <div className="trainer-preview__scroll-container">
                    {/* --- TRAINER VIEW --- */}
                    {activeTab === 'trainer' && (
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
                                    {(() => {
                                        const originBiomeId = (result.originBiomeId ||
                                            activeConfig.trainerBiomeId ||
                                            result.trainerMetadata?.['origin-biome']) as string | undefined;
                                        const originBiomeDef =
                                            originBiomeId && originBiomeId !== 'none'
                                                ? BIOME_MAP[originBiomeId]
                                                : undefined;
                                        if (!originBiomeDef) return null;
                                        return (
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
                                        );
                                    })()}
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
                                <span className="trainer-preview__section-title text-title-primary">
                                    Social Attributes
                                </span>
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
                                <span className="trainer-preview__section-title text-title-primary">
                                    Trainer Skills
                                </span>
                                <div className="trainer-preview__skill-categories">
                                    {SKILL_CATEGORIES.map((category) => (
                                        <div key={category.name} className="trainer-preview__skill-group">
                                            <span className="trainer-preview__skill-group-title">{category.name}</span>
                                            <div className="trainer-preview__grid-4">
                                                {category.skills.map((skill) => {
                                                    const currentVal = trainerSkills[skill.key] || 0;
                                                    const isSpecialTrainer =
                                                        result.trainerMetadata['mode'] === 'Trainer (Special)';
                                                    const displayLabel =
                                                        isSpecialTrainer && skill.specialTrainerLabel
                                                            ? skill.specialTrainerLabel
                                                            : skill.trainerLabel;
                                                    return (
                                                        <div key={skill.key} className="trainer-preview__stat-col">
                                                            <span
                                                                className="text-label"
                                                                style={{ fontSize: '0.75rem' }}
                                                            >
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
                            {Array.isArray(result.trainerMetadata['badges']) &&
                                (result.trainerMetadata['badges'] as unknown[]).length > 0 && (
                                    <div className="trainer-preview__section">
                                        <span className="trainer-preview__section-title text-title-primary">
                                            <Award size={14} color="var(--primary)" /> Gym Badges
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {(
                                                result.trainerMetadata['badges'] as { name: string; emoji?: string }[]
                                            ).map((b, i) => (
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
                                <button
                                    type="button"
                                    className="action-button action-button--dark"
                                    onClick={handleRerollTrainer}
                                >
                                    <Dices size={14} /> Reroll Trainer Stats & Nature
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--dark"
                                    onClick={handleRerollAllMembers}
                                >
                                    <Dices size={14} /> Reroll Entire Pokémon Team
                                </button>
                            </div>
                        </>
                    )}

                    {/* --- POKÉMON MEMBER VIEW --- */}
                    {activeMember && typeof activeTab === 'number' && (
                        <>
                            {/* Identity Header */}
                            <div className="trainer-preview__section">
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                flexWrap: 'wrap'
                                            }}
                                        >
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--primary)' }}>
                                                {activeMember.species}
                                            </h4>
                                            {(() => {
                                                const memberTypes = getMemberTypes(activeMember, pokedexLookup);
                                                if (memberTypes.length === 0) return null;
                                                return (
                                                    <div
                                                        style={{
                                                            display: 'inline-flex',
                                                            gap: '4px',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        {memberTypes.map((t) => (
                                                            <span
                                                                key={t}
                                                                className="trainer-preview__type-pill"
                                                                style={{
                                                                    backgroundColor: TYPE_COLORS[t] || 'var(--primary)'
                                                                }}
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <span className="text-subtext" style={{ fontSize: '0.8rem' }}>
                                            Rank: {activeMember.build.rank} | Nature: {activeMember.build.nature} |
                                            Ability:{' '}
                                            {String(
                                                activeMember.build.pokemonData?.Ability1 ||
                                                    activeMember.build.pokemonData?.ability1 ||
                                                    'Default'
                                            )}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--theme"
                                        onClick={() => handleRerollMember(activeTab)}
                                    >
                                        <Dices size={14} /> Reroll This Pokémon
                                    </button>
                                </div>
                            </div>

                            {/* Combat Attributes */}
                            <div className="trainer-preview__section">
                                <span className="trainer-preview__section-title text-title-primary">
                                    Combat Attributes
                                </span>
                                <div className="trainer-preview__grid-5">
                                    {Object.values(CombatStat).map((stat) => {
                                        const baseVal = getMemberBaseStat(
                                            activeMember.build,
                                            stat,
                                            stat === 'ins' ? 1 : 2
                                        );
                                        const rankVal = activeMember.build.attr[stat] || 0;
                                        return (
                                            <div key={stat} className="trainer-preview__stat-col">
                                                <span className="text-label" style={{ fontSize: '0.75rem' }}>
                                                    {stat.toUpperCase()}
                                                </span>
                                                <GeneratorPreviewStatSpinner
                                                    value={baseVal + rankVal}
                                                    onChange={(val) => updateActiveMemberAttr(stat, val - baseVal)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Social Attributes */}
                            <div className="trainer-preview__section">
                                <span className="trainer-preview__section-title text-title-primary">
                                    Social Attributes
                                </span>
                                <div className="trainer-preview__grid-5">
                                    {Object.values(SocialStat).map((stat) => {
                                        const baseVal = Number(store.socials[stat]?.base || 1);
                                        const rankVal = activeMember.build.soc[stat] || 0;
                                        return (
                                            <div key={stat} className="trainer-preview__stat-col">
                                                <span className="text-label" style={{ fontSize: '0.75rem' }}>
                                                    {stat.toUpperCase()}
                                                </span>
                                                <GeneratorPreviewStatSpinner
                                                    value={baseVal + rankVal}
                                                    onChange={(val) => updateActiveMemberSoc(stat, val - baseVal)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Skills */}
                            <div className="trainer-preview__section">
                                <span className="trainer-preview__section-title text-title-primary">
                                    Pokémon Skills
                                </span>
                                <div className="trainer-preview__skill-categories">
                                    {SKILL_CATEGORIES.map((category) => (
                                        <div key={category.name} className="trainer-preview__skill-group">
                                            <span className="trainer-preview__skill-group-title">{category.name}</span>
                                            <div className="trainer-preview__grid-4">
                                                {category.skills.map((skill) => {
                                                    const baseVal = Number(store.skills[skill.key]?.base || 0);
                                                    const rankVal = activeMember.build.skills[skill.key] || 0;
                                                    return (
                                                        <div key={skill.key} className="trainer-preview__stat-col">
                                                            <span
                                                                className="text-label"
                                                                style={{ fontSize: '0.75rem' }}
                                                            >
                                                                {skill.label}
                                                            </span>
                                                            <GeneratorPreviewStatSpinner
                                                                value={baseVal + rankVal}
                                                                onChange={(val) =>
                                                                    updateActiveMemberSkill(skill.key, val - baseVal)
                                                                }
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Moves */}
                            <div className="trainer-preview__section">
                                <span className="trainer-preview__section-title text-title-primary">
                                    Drafted Moves ({activeMember.build.moves.length})
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {activeMember.build.moves.map((move, mIdx) => {
                                        const statKey = (move.attr || 'dex').toLowerCase();
                                        const skillKey = (move.skill || 'brawl').toLowerCase();
                                        const baseAttr = getMemberBaseStat(
                                            activeMember.build,
                                            statKey,
                                            statKey === 'ins' ? 1 : 2
                                        );
                                        const allocatedAttr = activeMember.build.attr[statKey] || 0;
                                        const skillVal = activeMember.build.skills[skillKey] || 0;
                                        const accuracyPool = baseAttr + allocatedAttr + skillVal;

                                        const damageStatKey = move.dmgStat ? move.dmgStat.toLowerCase() : '';
                                        let damagePool: string | number = 'N/A';
                                        if (damageStatKey) {
                                            const baseDmg = getMemberBaseStat(
                                                activeMember.build,
                                                damageStatKey,
                                                damageStatKey === 'ins' ? 1 : 2
                                            );
                                            const allocatedDmg = activeMember.build.attr[damageStatKey] || 0;
                                            damagePool = baseDmg + allocatedDmg + (move.power || 0);
                                        }

                                        return (
                                            <GeneratorPreviewMoveRow
                                                key={mIdx}
                                                move={move}
                                                accuracyPool={accuracyPool}
                                                damagePool={damagePool}
                                                onOpenTooltip={setTooltipInfo}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="trainer-preview__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onClose}
                        disabled={isSpawning}
                    >
                        <XCircle size={15} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red"
                        onClick={handleApply}
                        disabled={isSpawning}
                    >
                        <CheckCircle size={15} />{' '}
                        {isSpawning ? 'Spawning...' : `Spawn Trainer & Team (${teamMembers.length} Pokémon)`}
                    </button>
                </div>

                {/* Tooltip Overlay */}
                {tooltipInfo && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.6)',
                            zIndex: 1100,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                        onClick={() => setTooltipInfo(null)}
                    >
                        <div
                            style={{
                                background: 'var(--panel-bg)',
                                padding: '16px 20px',
                                borderRadius: '8px',
                                border: '2px solid var(--primary)',
                                maxWidth: '380px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>{tooltipInfo.title}</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', whiteSpace: 'pre-line' }}>
                                {tooltipInfo.desc}
                            </p>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
