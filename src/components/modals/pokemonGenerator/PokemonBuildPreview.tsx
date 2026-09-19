import React from 'react';
import type { TempBuild, TempMove } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill, SKILL_CATEGORIES } from '../../../types/enums';
import { TYPE_COLORS } from '../../../data/constants';
import type { PokedexLookupItem } from '../../../utils/pokemonFilterUtils';
import { GeneratorPreviewStatSpinner } from './GeneratorPreviewStatSpinner';
import { GeneratorPreviewMoveRow } from './GeneratorPreviewMoveRow';
import './GeneratorPreviewModal.css';

export interface PokemonBuildPreviewProps {
    build: TempBuild;
    metadata?: Record<string, unknown>;
    pokedexLookup?: PokedexLookupItem[];
    onUpdateAttr: (attr: string, val: number) => void;
    onUpdateSoc: (soc: string, val: number) => void;
    onUpdateSkill: (skill: string, val: number) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
    actionSlot?: React.ReactNode;
}

export function getPokemonBaseStat(
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

export function getPokemonTypes(
    speciesName: string,
    build: TempBuild,
    metadata?: Record<string, unknown>,
    lookupList?: PokedexLookupItem[]
): string[] {
    const pd = build.pokemonData as Record<string, any> | undefined;
    const t1 = String(pd?.Type1 || pd?.type1 || metadata?.type1 || '').trim();
    const t2 = String(pd?.Type2 || pd?.type2 || metadata?.type2 || '').trim();
    const types = [t1, t2].filter((t) => t && t.toLowerCase() !== 'none' && t.toLowerCase() !== 'undefined');
    if (types.length > 0) return types;
    if (lookupList && lookupList.length > 0) {
        const lookup = lookupList.find((p) => p.name.toLowerCase() === speciesName.toLowerCase());
        if (lookup) {
            return [lookup.type1, lookup.type2].filter(
                (t) => t && t.toLowerCase() !== 'none' && t.toLowerCase() !== 'undefined'
            );
        }
    }
    return [];
}

export const PokemonBuildPreview: React.FC<PokemonBuildPreviewProps> = ({
    build,
    metadata,
    pokedexLookup,
    onUpdateAttr,
    onUpdateSoc,
    onUpdateSkill,
    onOpenTooltip,
    actionSlot
}) => {
    const baseSocials = useCharacterStore((state) => state.socials);
    const baseSkills = useCharacterStore((state) => state.skills);
    const willMax = useCharacterStore((state) => state.will.willMax);

    const species = build.species;
    const types = getPokemonTypes(species, build, metadata, pokedexLookup);

    return (
        <>
            {/* Identity Header */}
            <div className="generator-preview__section">
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
                            <h4
                                style={{
                                    margin: 0,
                                    fontSize: '1.05rem',
                                    color: 'var(--primary)'
                                }}
                            >
                                {species}
                            </h4>
                            {types.length > 0 && (
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        gap: '4px',
                                        alignItems: 'center'
                                    }}
                                >
                                    {types.map((t) => (
                                        <span
                                            key={t}
                                            className="generator-preview__type-pill"
                                            style={{
                                                backgroundColor: TYPE_COLORS[t] || 'var(--primary)'
                                            }}
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className="text-subtext" style={{ fontSize: '0.8rem' }}>
                            Rank: {build.rank} | Nature: {build.nature} | Ability:{' '}
                            {String(build.pokemonData?.Ability1 || build.pokemonData?.ability1 || 'Default')}
                            {build.loyalty !== undefined && (
                                <>
                                    {' '}
                                    | Loyalty: {build.loyalty} | Happiness: {build.happiness}
                                </>
                            )}
                        </span>
                    </div>
                    {actionSlot}
                </div>
            </div>

            {/* Combat Attributes (Base + Rank) */}
            <div className="generator-preview__section">
                <span className="generator-preview__section-title text-title-primary">
                    Combat Attributes (Base + Rank)
                </span>
                <div className="generator-preview__grid-5">
                    {Object.values(CombatStat).map((statistic) => {
                        const baseValue = getPokemonBaseStat(build, statistic, statistic === 'ins' ? 1 : 2);
                        const allocated = build.attr[statistic] || 0;
                        return (
                            <div key={statistic} className="generator-preview__stat-column">
                                <span className="generator-preview__stat-label text-label">
                                    {statistic.toUpperCase()}
                                </span>
                                <GeneratorPreviewStatSpinner
                                    value={baseValue + allocated}
                                    onChange={(val) => onUpdateAttr(statistic, val - baseValue)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Social Attributes (Base + Rank) */}
            <div className="generator-preview__section">
                <span className="generator-preview__section-title text-title-primary">
                    Social Attributes (Base + Rank)
                </span>
                <div className="generator-preview__grid-5">
                    {Object.values(SocialStat).map((statistic) => {
                        const baseValue = Number(baseSocials[statistic]?.base || 1);
                        const allocated = build.soc[statistic] || 0;
                        return (
                            <div key={statistic} className="generator-preview__stat-column">
                                <span className="generator-preview__stat-label text-label">
                                    {statistic.toUpperCase()}
                                </span>
                                <GeneratorPreviewStatSpinner
                                    value={baseValue + allocated}
                                    onChange={(val) => onUpdateSoc(statistic, val - baseValue)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Skills (Base + Rank) */}
            <div className="generator-preview__section">
                <span className="generator-preview__section-title text-title-primary">Skills (Base + Rank)</span>
                <div className="generator-preview__skill-categories">
                    {SKILL_CATEGORIES.map((category) => (
                        <div key={category.name} className="generator-preview__skill-group">
                            <span className="generator-preview__skill-group-title">{category.name}</span>
                            <div className="generator-preview__grid-4">
                                {category.skills.map((skill) => {
                                    const baseValue =
                                        (build.pokemonData?.[skill.label] as number) ??
                                        (build.pokemonData?.[skill.key] as number) ??
                                        Number(baseSkills[skill.key]?.base || 0);
                                    const allocated = build.skills[skill.key] || 0;
                                    return (
                                        <div key={skill.key} className="generator-preview__stat-column">
                                            <span className="generator-preview__stat-label text-label">
                                                {skill.label}
                                            </span>
                                            <GeneratorPreviewStatSpinner
                                                value={baseValue + allocated}
                                                onChange={(val) => onUpdateSkill(skill.key, val - baseValue)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Drafted Moves */}
            <div className="generator-preview__section">
                <span className="generator-preview__section-title generator-preview__section-title--spaced text-title-primary">
                    Drafted Moves ({build.moves.length})
                </span>
                <div className="generator-preview__grid-2">
                    {build.moves.map((move: TempMove, index: number) => {
                        const statKey = move.attr ? move.attr.toLowerCase() : 'str';
                        const skillKey = move.skill ? move.skill.toLowerCase() : 'brawl';
                        const isCombatStat = Object.values(CombatStat).includes(statKey as CombatStat);
                        const baseAttrVal = isCombatStat
                            ? getPokemonBaseStat(build, statKey, statKey === 'ins' ? 1 : 2)
                            : Number(baseSocials[statKey as SocialStat]?.base || (statKey === 'will' ? willMax : 1));
                        const allocatedAttrVal = build.attr[statKey] || build.soc[statKey] || 0;
                        const baseSkillVal =
                            (build.pokemonData?.[skillKey] as number) ??
                            Number(baseSkills[skillKey as Skill]?.base || 0);
                        const allocatedSkillVal = build.skills[skillKey] || 0;
                        const accuracyPool = baseAttrVal + allocatedAttrVal + baseSkillVal + allocatedSkillVal;

                        const damageStatistic = move.dmgStat ? move.dmgStat.toLowerCase() : '';
                        let damagePool: string | number = 'N/A';
                        if (damageStatistic) {
                            const baseDmgAttr = getPokemonBaseStat(
                                build,
                                damageStatistic,
                                damageStatistic === 'ins' ? 1 : 2
                            );
                            const allocatedDmgAttr = build.attr[damageStatistic] || 0;
                            damagePool = baseDmgAttr + allocatedDmgAttr + (move.power || 0);
                        }

                        return (
                            <GeneratorPreviewMoveRow
                                key={index}
                                move={move}
                                accuracyPool={accuracyPool}
                                damagePool={damagePool}
                                onOpenTooltip={onOpenTooltip}
                            />
                        );
                    })}
                </div>
            </div>
        </>
    );
};
