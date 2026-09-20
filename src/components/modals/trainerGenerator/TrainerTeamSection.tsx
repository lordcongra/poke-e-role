import React from 'react';
import { Flame, Compass, User, Layers, Sparkles, Dices, Shield } from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { BIOMES, BIOME_MAP } from '../../../data/biomeData';
import { TRAINER_CLASSES } from '../../../data/trainerClasses';
import {
    ALL_POKEMON_TYPES,
    RANK_ORDER,
    type BiomeConceptMixMode,
    type SlotMixMode
} from '../../../utils/trainerGeneratorLogic';
import type { Rank } from '../../../store/entityTypes';
import './TrainerGeneratorModal.css';

export type TeamThemeStrategy = 'concept' | 'biome' | 'mix' | 'custom';

export interface TrainerTeamSectionProps {
    generateTeam: boolean;
    setGenerateTeam: (val: boolean) => void;
    teamSize: number;
    setTeamSize: (val: number) => void;
    teamThemeStrategy: TeamThemeStrategy;
    setTeamThemeStrategy: (strat: TeamThemeStrategy) => void;
    trainerBiomeId: string;
    conceptId: string;
    teamBiomeId: string;
    setTeamBiomeId: (biomeId: string) => void;
    biomeConceptMixMode: BiomeConceptMixMode;
    setBiomeConceptMixMode: (mode: BiomeConceptMixMode) => void;
    customSlotMixModes: SlotMixMode[];
    setCustomSlotMixModes: React.Dispatch<React.SetStateAction<SlotMixMode[]>>;
    typeSpecialtyMode: 'concept' | 'monotype' | 'dual' | 'variety' | 'manual';
    setTypeSpecialtyMode: (mode: 'concept' | 'monotype' | 'dual' | 'variety' | 'manual') => void;
    manualTypes: string[];
    setManualTypes: React.Dispatch<React.SetStateAction<string[]>>;
    teamRankMode: 'match_trainer' | 'random' | 'custom';
    setTeamRankMode: (mode: 'match_trainer' | 'random' | 'custom') => void;
    customPokemonRanks: Rank[];
    setCustomPokemonRanks: React.Dispatch<React.SetStateAction<Rank[]>>;
    capPokemonRank: boolean;
    setCapPokemonRank: (val: boolean) => void;
    buildType: 'minmax' | 'average' | 'wild';
    setBuildType: (val: 'minmax' | 'average' | 'wild') => void;
    allowedLineLengths: number[];
    setAllowedLineLengths: React.Dispatch<React.SetStateAction<number[]>>;
    allowedStageIndices: number[];
    setAllowedStageIndices: React.Dispatch<React.SetStateAction<number[]>>;
    includeLegendaries: boolean;
    setIncludeLegendaries: (val: boolean) => void;
    includeMythicals: boolean;
    setIncludeMythicals: (val: boolean) => void;
    includeUltraBeasts: boolean;
    setIncludeUltraBeasts: (val: boolean) => void;
    includeParadox: boolean;
    setIncludeParadox: (val: boolean) => void;
    includeMegas: boolean;
    setIncludeMegas: (val: boolean) => void;
    scaleLoyaltyHappiness: boolean;
    setScaleLoyaltyHappiness: (val: boolean) => void;
    allowDuplicates: boolean;
    setAllowDuplicates: (val: boolean) => void;
    filterRecommendedRank: boolean;
    setFilterRecommendedRank: (val: boolean) => void;
    recommendedRankMode: 'match_pokemon' | 'exact' | 'custom';
    setRecommendedRankMode: (mode: 'match_pokemon' | 'exact' | 'custom') => void;
    exactRecommendedRank: Rank;
    setExactRecommendedRank: (rank: Rank) => void;
    customSlotRecommendedRanks: (Rank | 'match_pokemon')[];
    setCustomSlotRecommendedRanks: React.Dispatch<React.SetStateAction<(Rank | 'match_pokemon')[]>>;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export const TrainerTeamSection: React.FC<TrainerTeamSectionProps> = ({
    generateTeam,
    setGenerateTeam,
    teamSize,
    setTeamSize,
    teamThemeStrategy,
    setTeamThemeStrategy,
    trainerBiomeId,
    conceptId,
    teamBiomeId,
    setTeamBiomeId,
    biomeConceptMixMode,
    setBiomeConceptMixMode,
    customSlotMixModes,
    setCustomSlotMixModes,
    typeSpecialtyMode,
    setTypeSpecialtyMode,
    manualTypes,
    setManualTypes,
    teamRankMode,
    setTeamRankMode,
    customPokemonRanks,
    setCustomPokemonRanks,
    capPokemonRank,
    setCapPokemonRank,
    buildType,
    setBuildType,
    allowedLineLengths,
    setAllowedLineLengths,
    allowedStageIndices,
    setAllowedStageIndices,
    includeLegendaries,
    setIncludeLegendaries,
    includeMythicals,
    setIncludeMythicals,
    includeUltraBeasts,
    setIncludeUltraBeasts,
    includeParadox,
    setIncludeParadox,
    includeMegas,
    setIncludeMegas,
    scaleLoyaltyHappiness,
    setScaleLoyaltyHappiness,
    allowDuplicates,
    setAllowDuplicates,
    filterRecommendedRank,
    setFilterRecommendedRank,
    recommendedRankMode,
    setRecommendedRankMode,
    exactRecommendedRank,
    setExactRecommendedRank,
    customSlotRecommendedRanks,
    setCustomSlotRecommendedRanks,
    onOpenTooltip
}) => {
    const selectedConcept = TRAINER_CLASSES.find((c) => c.id === conceptId);
    const selectedTrainerBiomeDef =
        trainerBiomeId !== 'none' && trainerBiomeId !== 'random' ? BIOME_MAP[trainerBiomeId] : null;

    const effectiveTeamBiomeValue =
        teamThemeStrategy === 'biome'
            ? teamBiomeId === 'match_trainer'
                ? trainerBiomeId !== 'none'
                    ? trainerBiomeId
                    : 'random'
                : teamBiomeId
            : teamBiomeId;

    const resolvedTeamBiomeId =
        effectiveTeamBiomeValue === 'match_trainer'
            ? trainerBiomeId !== 'none'
                ? trainerBiomeId
                : 'random'
            : effectiveTeamBiomeValue !== 'none'
              ? effectiveTeamBiomeValue
              : undefined;

    const selectedTeamBiomeDef =
        resolvedTeamBiomeId &&
        resolvedTeamBiomeId !== 'none' &&
        resolvedTeamBiomeId !== 'random' &&
        resolvedTeamBiomeId !== 'match_trainer'
            ? BIOME_MAP[resolvedTeamBiomeId]
            : null;

    const handleToggleLineLength = (len: number) => {
        setAllowedLineLengths((prev: number[]) =>
            prev.includes(len) ? (prev.length > 1 ? prev.filter((l: number) => l !== len) : prev) : [...prev, len]
        );
    };

    const handleToggleStageIndex = (stage: number) => {
        setAllowedStageIndices((prev: number[]) =>
            prev.includes(stage) ? (prev.length > 1 ? prev.filter((s: number) => s !== stage) : prev) : [...prev, stage]
        );
    };

    const handleToggleManualType = (t: string) => {
        setManualTypes((prev: string[]) => {
            if (prev.includes(t)) {
                return prev.filter((x: string) => x !== t);
            }
            if (prev.length >= 2) {
                return [prev[1], t];
            }
            return [...prev, t];
        });
    };

    const handleCustomRankChange = (slotIndex: number, newRank: Rank) => {
        setCustomPokemonRanks((prev) => {
            const next = [...prev];
            next[slotIndex] = newRank;
            return next;
        });
    };

    const handleCustomRecRankChange = (slotIndex: number, newRank: Rank | 'match_pokemon') => {
        setCustomSlotRecommendedRanks((prev) => {
            const next = [...prev];
            next[slotIndex] = newRank;
            return next;
        });
    };

    const handleSlotMixModeChange = (slotIndex: number, mode: SlotMixMode) => {
        setCustomSlotMixModes((prev) => {
            const next = [...prev];
            next[slotIndex] = mode;
            return next;
        });
    };

    return (
        <div className="trainer-gen-modal__section">
            <div className="trainer-gen-modal__section-header">
                <label
                    className="trainer-gen-modal__checkbox-label"
                    style={{ fontSize: '0.95rem', fontWeight: 'bold' }}
                >
                    <input type="checkbox" checked={generateTeam} onChange={(e) => setGenerateTeam(e.target.checked)} />
                    <span className="text-title-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Flame size={16} color="var(--primary)" /> Generate Pokémon Team
                    </span>
                </label>
                <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                    {generateTeam ? `${teamSize} Pokémon on Roster` : 'Trainer Only (No Pokémon)'}
                </span>
            </div>

            {generateTeam && (
                <>
                    {/* Team Size Buttons */}
                    <div className="trainer-gen-modal__field">
                        <label className="trainer-gen-modal__field-label text-label" style={{ marginBottom: '4px' }}>
                            Team Size ({teamSize === 0 ? '0 Pokémon / Trainer Only' : `${teamSize} Pokémon`}):
                        </label>
                        <div className="trainer-gen-modal__presets">
                            {[
                                { count: 0, label: 'None (0)' },
                                { count: 1, label: 'Solo (1)' },
                                { count: 2, label: 'Duo (2)' },
                                { count: 3, label: 'Trio (3)' },
                                { count: 4, label: 'Squad (4)' },
                                { count: 5, label: 'Team (5)' },
                                { count: 6, label: 'Full (6)' }
                            ].map((preset) => (
                                <button
                                    key={preset.count}
                                    type="button"
                                    className={`trainer-gen-modal__preset-btn ${teamSize === preset.count ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                    onClick={() => setTeamSize(preset.count)}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Team Theme Strategy Master Selector */}
                    <div className="trainer-gen-modal__field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="trainer-gen-modal__field-label text-label">
                                Team Theme & Composition:
                                <TooltipIcon
                                    onClick={() =>
                                        onOpenTooltip({
                                            title: 'Team Theme & Composition',
                                            desc: 'Select the primary rule that determines how Pokémon are drafted for this team:\n\n• Trainer Concept (Default): Pokémon strictly match the trainer’s class (e.g. Bug types for Bug Catcher) from any habitat worldwide.\n• Local Habitat / Biome: Pokémon are wild species native to a specific biome/environment.\n• Concept + Biome Mix: Blends trainer concept types with a local habitat (e.g. Camper on a Beach).\n• Custom Types: Pick specific types, Monotype, Dual-Type, or high variety.'
                                        })
                                    }
                                />
                            </label>
                            <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                Active Theme:{' '}
                                <strong>
                                    {teamThemeStrategy === 'concept'
                                        ? 'Trainer Concept'
                                        : teamThemeStrategy === 'biome'
                                          ? 'Local Habitat / Biome'
                                          : teamThemeStrategy === 'mix'
                                            ? 'Concept + Biome Mix'
                                            : 'Custom Types / Variety'}
                                </strong>
                            </span>
                        </div>

                        <div className="trainer-gen-modal__strategy-presets">
                            <button
                                type="button"
                                className={`trainer-gen-modal__strategy-btn ${teamThemeStrategy === 'concept' ? 'trainer-gen-modal__strategy-btn--active' : ''}`}
                                onClick={() => setTeamThemeStrategy('concept')}
                            >
                                <User size={14} /> Trainer Concept
                            </button>
                            <button
                                type="button"
                                className={`trainer-gen-modal__strategy-btn ${teamThemeStrategy === 'biome' ? 'trainer-gen-modal__strategy-btn--active' : ''}`}
                                onClick={() => setTeamThemeStrategy('biome')}
                            >
                                <Compass size={14} /> Local Habitat
                            </button>
                            <button
                                type="button"
                                className={`trainer-gen-modal__strategy-btn ${teamThemeStrategy === 'mix' ? 'trainer-gen-modal__strategy-btn--active' : ''}`}
                                onClick={() => setTeamThemeStrategy('mix')}
                            >
                                <Layers size={14} /> Concept + Biome Mix
                            </button>
                            <button
                                type="button"
                                className={`trainer-gen-modal__strategy-btn ${teamThemeStrategy === 'custom' ? 'trainer-gen-modal__strategy-btn--active' : ''}`}
                                onClick={() => setTeamThemeStrategy('custom')}
                            >
                                <Sparkles size={14} /> Custom Types
                            </button>
                        </div>

                        {/* Dynamic Strategy Configuration Panel */}
                        {teamThemeStrategy === 'concept' && (
                            <div className="trainer-gen-modal__strategy-card">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '6px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Shield size={15} color="var(--primary)" />
                                        <span className="text-title-secondary" style={{ fontWeight: 600 }}>
                                            {selectedConcept
                                                ? selectedConcept.name
                                                : conceptId === 'biome_match'
                                                  ? `Thematic ${selectedTrainerBiomeDef?.name || 'Biome'} Concept`
                                                  : 'Trainer Class Specialty'}
                                        </span>
                                    </div>
                                    {selectedConcept && selectedConcept.typePreferences.length > 0 && (
                                        <div className="trainer-gen-modal__type-tags">
                                            {selectedConcept.typePreferences.map((t) => (
                                                <span key={t} className="trainer-gen-modal__type-tag">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-subtext" style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.4 }}>
                                    {selectedConcept
                                        ? selectedConcept.typePreferences.length > 0
                                            ? `Pokémon will be drafted matching ${selectedConcept.name}'s signature typings (${selectedConcept.typePreferences.join(', ')}). Biome restrictions are bypassed so iconic species from any habitat can join.`
                                            : `${selectedConcept.name} does not favor specific types; Pokémon will be drafted with balanced variety across all types.`
                                        : 'Pokémon will be drafted matching the trainer’s rolled concept class. Biome restrictions are bypassed so iconic species from any habitat can join.'}
                                </p>
                            </div>
                        )}

                        {teamThemeStrategy === 'biome' && (
                            <div className="trainer-gen-modal__strategy-card">
                                <div className="trainer-gen-modal__field">
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <label className="trainer-gen-modal__field-label text-label">
                                            Local Habitat / Ecosystem:
                                        </label>
                                        {selectedTeamBiomeDef && (
                                            <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                                Habitat Types: <strong>{selectedTeamBiomeDef.name}</strong> (
                                                {selectedTeamBiomeDef.types.join(', ')})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <select
                                            value={teamBiomeId}
                                            onChange={(e) => setTeamBiomeId(e.target.value)}
                                            className="trainer-gen-modal__select"
                                            style={{ flex: 1 }}
                                        >
                                            {trainerBiomeId !== 'none' && (
                                                <option value="match_trainer">
                                                    Match Trainer Origin{' '}
                                                    {selectedTrainerBiomeDef
                                                        ? `(${selectedTrainerBiomeDef.name})`
                                                        : '(Rolled with Trainer)'}
                                                </option>
                                            )}
                                            <option value="random">Random Biome / Habitat</option>
                                            {BIOMES.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    [{b.tag}] {b.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const randomB = BIOMES[Math.floor(Math.random() * BIOMES.length)];
                                                setTeamBiomeId(randomB.id);
                                            }}
                                            title="Roll and lock a specific random habitat"
                                            className="action-button action-button--dark"
                                            style={{ padding: '4px 8px' }}
                                        >
                                            <Dices size={15} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ marginTop: '6px' }}>
                                    <span className="text-subtext" style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                                        {effectiveTeamBiomeValue === 'match_trainer' ? (
                                            <>
                                                Pokémon will be drafted exclusively from species native to the trainer’s
                                                origin biome{' '}
                                                <strong>
                                                    {selectedTrainerBiomeDef
                                                        ? `(${selectedTrainerBiomeDef.name})`
                                                        : '(rolled with Trainer)'}
                                                </strong>
                                                . Concept type preferences are superseded by local wildlife.
                                            </>
                                        ) : effectiveTeamBiomeValue === 'random' ? (
                                            <>
                                                A random biome will be chosen at generation time, and all Pokémon will
                                                be native to that environment.
                                            </>
                                        ) : selectedTeamBiomeDef ? (
                                            <>
                                                Pokémon will be drafted exclusively from species native to{' '}
                                                <strong>{selectedTeamBiomeDef.name}</strong> (
                                                {selectedTeamBiomeDef.types.join(', ')}). Concept type preferences are
                                                superseded by local wildlife.
                                            </>
                                        ) : (
                                            <>
                                                Pokémon will be drafted strictly from the chosen habitat. Concept type
                                                preferences are superseded by local wildlife.
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {teamThemeStrategy === 'mix' && (
                            <div className="trainer-gen-modal__strategy-card">
                                <div className="trainer-gen-modal__field">
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <label className="trainer-gen-modal__field-label text-label">
                                            1. Select Habitat Ecosystem:
                                        </label>
                                        {selectedTeamBiomeDef && (
                                            <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                                Habitat Pool: <strong>{selectedTeamBiomeDef.name}</strong> (
                                                {selectedTeamBiomeDef.types.join(', ')})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <select
                                            value={teamBiomeId}
                                            onChange={(e) => setTeamBiomeId(e.target.value)}
                                            className="trainer-gen-modal__select"
                                            style={{ flex: 1 }}
                                        >
                                            {trainerBiomeId !== 'none' && (
                                                <option value="match_trainer">
                                                    Match Trainer Origin{' '}
                                                    {selectedTrainerBiomeDef
                                                        ? `(${selectedTrainerBiomeDef.name})`
                                                        : '(Rolled with Trainer)'}
                                                </option>
                                            )}
                                            <option value="random">Random Biome / Habitat</option>
                                            {BIOMES.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    [{b.tag}] {b.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const randomB = BIOMES[Math.floor(Math.random() * BIOMES.length)];
                                                setTeamBiomeId(randomB.id);
                                            }}
                                            title="Roll and lock a specific random habitat"
                                            className="action-button action-button--dark"
                                            style={{ padding: '4px 8px' }}
                                        >
                                            <Dices size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div className="trainer-gen-modal__field" style={{ marginTop: '8px' }}>
                                    <label className="trainer-gen-modal__field-label text-label">
                                        2. Biome & Concept Mixing Mode:
                                        <TooltipIcon
                                            onClick={() =>
                                                onOpenTooltip({
                                                    title: 'Biome & Concept Mixing',
                                                    desc: 'Fine-tune how Pokémon are drafted when a Team Biome is selected:\n\n• Concept Only: Biome serves as cosmetic origin/theming; Pokémon stick strictly to the trainer class typing.\n• Biome Only: Pokémon are selected solely from the biome types and native habitat.\n• Wider Pool: Merges trainer concept types with biome types for a diverse roster.\n• Combo Hybrid: Selects Pokémon that fit BOTH the trainer concept and the biome.\n• Split Pick: Granularly configure the generation mode for each individual Pokémon slot.'
                                                })
                                            }
                                        />
                                    </label>

                                    <div className="trainer-gen-modal__mix-presets">
                                        {[
                                            {
                                                mode: 'concept_only' as const,
                                                label: 'Concept Only',
                                                title: 'Stick to trainer concept (biome is cosmetic)'
                                            },
                                            {
                                                mode: 'biome_only' as const,
                                                label: 'Biome Only',
                                                title: 'Stick to biome habitat & native types'
                                            },
                                            {
                                                mode: 'union' as const,
                                                label: 'Wider Pool',
                                                title: 'Combine concept + biome types into a larger pool'
                                            },
                                            {
                                                mode: 'combo' as const,
                                                label: 'Combo Hybrid',
                                                title: 'Require Pokémon to match both concept and biome'
                                            },
                                            {
                                                mode: 'split' as const,
                                                label: 'Split Pick',
                                                title: 'Choose drafting mode per Pokémon slot'
                                            }
                                        ].map((opt) => (
                                            <button
                                                key={opt.mode}
                                                type="button"
                                                className={`trainer-gen-modal__mix-btn ${biomeConceptMixMode === opt.mode ? 'trainer-gen-modal__mix-btn--active' : ''}`}
                                                onClick={() => setBiomeConceptMixMode(opt.mode)}
                                                title={opt.title}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="trainer-gen-modal__mix-hint text-subtext">
                                        {biomeConceptMixMode === 'concept_only' && (
                                            <>
                                                Pokémon strictly match trainer concept. The selected biome serves as
                                                origin/theming.
                                            </>
                                        )}
                                        {biomeConceptMixMode === 'biome_only' && (
                                            <>
                                                Pokémon strictly match{' '}
                                                <strong>{selectedTeamBiomeDef?.name || 'biome'}</strong> native types
                                                and habitat.
                                            </>
                                        )}
                                        {biomeConceptMixMode === 'union' && (
                                            <>
                                                Combines <strong>{selectedConcept?.name || 'trainer concept'}</strong>{' '}
                                                types with <strong>{selectedTeamBiomeDef?.name || 'biome'}</strong>{' '}
                                                types. Pokémon may match either.
                                            </>
                                        )}
                                        {biomeConceptMixMode === 'combo' && (
                                            <>
                                                Pokémon must share a typing with{' '}
                                                <strong>{selectedConcept?.name || 'concept'}</strong> and be native to{' '}
                                                <strong>{selectedTeamBiomeDef?.name || 'biome'}</strong>.
                                            </>
                                        )}
                                        {biomeConceptMixMode === 'split' && (
                                            <>
                                                Assign an independent drafting rule for each of the {teamSize} Pokémon
                                                slots below.
                                            </>
                                        )}
                                    </div>

                                    {/* Granular Split Pick per-slot selector */}
                                    {biomeConceptMixMode === 'split' && teamSize > 0 && (
                                        <div
                                            style={{
                                                marginTop: '8px',
                                                padding: '8px 10px',
                                                background: 'rgba(0, 0, 0, 0.25)',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)'
                                            }}
                                        >
                                            <span
                                                className="text-label"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    marginBottom: '6px',
                                                    display: 'block'
                                                }}
                                            >
                                                Per-Slot Mix Mode:
                                            </span>
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                    gap: '6px'
                                                }}
                                            >
                                                {Array.from({ length: teamSize }).map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px'
                                                        }}
                                                    >
                                                        <span className="text-subtext" style={{ fontSize: '0.72rem' }}>
                                                            Slot #{idx + 1}:
                                                        </span>
                                                        <select
                                                            value={customSlotMixModes[idx] || 'concept_only'}
                                                            onChange={(e) =>
                                                                handleSlotMixModeChange(
                                                                    idx,
                                                                    e.target.value as SlotMixMode
                                                                )
                                                            }
                                                            className="trainer-gen-modal__select"
                                                            style={{ fontSize: '0.74rem', padding: '3px 6px' }}
                                                        >
                                                            <option value="concept_only">Concept</option>
                                                            <option value="biome_only">Biome</option>
                                                            <option value="union">Wider Pool</option>
                                                            <option value="combo">Combo Hybrid</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {teamThemeStrategy === 'custom' && (
                            <div className="trainer-gen-modal__strategy-card">
                                <div className="trainer-gen-modal__field">
                                    <label className="trainer-gen-modal__field-label text-label">
                                        Type Drafting Preset:
                                        <TooltipIcon
                                            onClick={() =>
                                                onOpenTooltip({
                                                    title: 'Custom Type Drafting',
                                                    desc: 'Choose how Pokémon types are selected when not using a concept or biome theme:\n\n• Monotype: Generates a team focusing on one random type.\n• Dual-Type: Focuses on two shared types.\n• High Variety: Fully random types across all Pokémon.\n• Manual Selection: Hand-pick 1 or 2 specific types.'
                                                })
                                            }
                                        />
                                    </label>
                                    <div className="trainer-gen-modal__strategy-presets">
                                        {[
                                            { mode: 'monotype' as const, label: 'Monotype' },
                                            { mode: 'dual' as const, label: 'Dual-Type' },
                                            { mode: 'variety' as const, label: 'High Variety' },
                                            { mode: 'manual' as const, label: 'Manual Types' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.mode}
                                                type="button"
                                                className={`trainer-gen-modal__strategy-btn ${typeSpecialtyMode === opt.mode ? 'trainer-gen-modal__strategy-btn--active' : ''}`}
                                                onClick={() => setTypeSpecialtyMode(opt.mode)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {typeSpecialtyMode === 'manual' && (
                                    <div style={{ marginTop: '8px' }}>
                                        <span
                                            className="text-subtext"
                                            style={{
                                                fontSize: '0.75rem',
                                                marginBottom: '4px',
                                                display: 'block'
                                            }}
                                        >
                                            Pick up to 2 specialty types:
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {ALL_POKEMON_TYPES.map((t) => {
                                                const isSel = manualTypes.includes(t);
                                                return (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => handleToggleManualType(t)}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            border: isSel
                                                                ? '1px solid var(--primary)'
                                                                : '1px solid var(--border)',
                                                            background: isSel
                                                                ? 'var(--primary)'
                                                                : 'rgba(0, 0, 0, 0.25)',
                                                            color: isSel ? '#fff' : 'var(--text-color)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Team Rank Progression Mode */}
                    <div className="trainer-gen-modal__field">
                        <label className="trainer-gen-modal__field-label text-label">
                            Team Rank Progression:
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip({
                                        title: 'Team Rank Progression',
                                        desc: 'Match Trainer: All Pokémon generate at the same rank as the Trainer.\n\nRandom: Pokémon generate at varied ranks.\n\nCustom: Choose the exact rank for each Pokémon slot individually.'
                                    })
                                }
                            />
                        </label>
                        <div className="trainer-gen-modal__presets">
                            {[
                                { mode: 'match_trainer' as const, label: 'Match Trainer Rank' },
                                { mode: 'random' as const, label: 'Randomized Ranks' },
                                { mode: 'custom' as const, label: 'Custom Per Slot' }
                            ].map((opt) => (
                                <button
                                    key={opt.mode}
                                    type="button"
                                    className={`trainer-gen-modal__preset-btn ${teamRankMode === opt.mode ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                    onClick={() => setTeamRankMode(opt.mode)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {teamRankMode === 'random' && (
                            <div style={{ marginTop: '8px' }}>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={capPokemonRank}
                                        onChange={(e) => setCapPokemonRank(e.target.checked)}
                                    />
                                    <span>Cap Pokémon Rank at Trainer Rank (No overranked mons)</span>
                                </label>
                            </div>
                        )}

                        {teamRankMode === 'custom' && teamSize > 0 && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '6px'
                                }}
                            >
                                {Array.from({ length: teamSize }).map((_, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span className="text-subtext" style={{ fontSize: '0.72rem' }}>
                                            Slot #{idx + 1} Rank:
                                        </span>
                                        <select
                                            value={customPokemonRanks[idx] || 'Starter'}
                                            onChange={(e) => handleCustomRankChange(idx, e.target.value as Rank)}
                                            className="trainer-gen-modal__select"
                                            style={{ fontSize: '0.74rem', padding: '3px 6px' }}
                                        >
                                            {RANK_ORDER.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filter by Recommended Rank */}
                    <div className="trainer-gen-modal__field">
                        <label
                            className="trainer-gen-modal__checkbox-label"
                            style={{ fontWeight: 600, fontSize: '0.85rem' }}
                        >
                            <input
                                type="checkbox"
                                checked={filterRecommendedRank}
                                onChange={(e) => setFilterRecommendedRank(e.target.checked)}
                            />
                            <span>Filter Pokémon by Recommended Rank</span>
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip({
                                        title: 'Recommended Rank Filter',
                                        desc: "These are purely suggested ranks from the core rules and Pokédex, and are not necessarily 100% reflective of the rank these Pokémon absolutely should be used at — they're just suggestions. When enabled, Pokémon generated for the team will be filtered to match the chosen recommended rank criteria."
                                    })
                                }
                            />
                        </label>

                        {filterRecommendedRank && (
                            <div
                                style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid var(--primary)' }}
                            >
                                <div className="trainer-gen-modal__presets">
                                    {[
                                        { mode: 'match_pokemon' as const, label: 'Match Pokémon Rank' },
                                        { mode: 'exact' as const, label: 'Same for Team' },
                                        { mode: 'custom' as const, label: 'Custom Per Slot' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.mode}
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${recommendedRankMode === opt.mode ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setRecommendedRankMode(opt.mode)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {recommendedRankMode === 'exact' && (
                                    <div
                                        style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                                            Team Recommended Rank:
                                        </span>
                                        <select
                                            value={exactRecommendedRank}
                                            onChange={(e) => setExactRecommendedRank(e.target.value as Rank)}
                                            className="trainer-gen-modal__select"
                                            style={{ width: 'auto', minWidth: '140px' }}
                                        >
                                            {RANK_ORDER.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {recommendedRankMode === 'custom' && teamSize > 0 && (
                                    <div
                                        style={{
                                            marginTop: '8px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                            gap: '6px'
                                        }}
                                    >
                                        {Array.from({ length: teamSize }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                                            >
                                                <span className="text-subtext" style={{ fontSize: '0.72rem' }}>
                                                    Slot #{idx + 1} Rec. Rank:
                                                </span>
                                                <select
                                                    value={customSlotRecommendedRanks[idx] || 'match_pokemon'}
                                                    onChange={(e) =>
                                                        handleCustomRecRankChange(
                                                            idx,
                                                            e.target.value as Rank | 'match_pokemon'
                                                        )
                                                    }
                                                    className="trainer-gen-modal__select"
                                                    style={{ fontSize: '0.74rem', padding: '3px 6px' }}
                                                >
                                                    <option value="match_pokemon">Match Slot Rank</option>
                                                    {RANK_ORDER.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Build Optimization Strategy */}
                    <div className="trainer-gen-modal__field">
                        <label className="trainer-gen-modal__field-label text-label">
                            Build Optimization:
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip({
                                        title: 'Build Optimization Strategy',
                                        desc: 'MinMax: Spreads points into highest stats and STAB attacks with high synergy.\n\nAverage: Distributes points evenly across core attributes and basic moves.\n\nWild: Chaotic spread simulating wild encounters.'
                                    })
                                }
                            />
                        </label>
                        <div className="trainer-gen-modal__presets">
                            {[
                                { type: 'minmax' as const, label: 'MinMax (Competitive)' },
                                { type: 'average' as const, label: 'Average (Balanced)' },
                                { type: 'wild' as const, label: 'Wild (Casual)' }
                            ].map((opt) => (
                                <button
                                    key={opt.type}
                                    type="button"
                                    className={`trainer-gen-modal__preset-btn ${buildType === opt.type ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                    onClick={() => setBuildType(opt.type)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Evolutionary Filter Controls */}
                    <div className="trainer-gen-modal__grid--2col">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Evolution Line Length:
                                <TooltipIcon
                                    onClick={() =>
                                        onOpenTooltip({
                                            title: 'Line Length Filter',
                                            desc: 'Single-Stage: Pokémon that do not evolve (e.g. Lapras, Heracross).\n\n2-Stage: Two forms (e.g. Rattata -> Raticate).\n\n3-Stage: Three forms (e.g. Charmander -> Charmeleon -> Charizard).'
                                        })
                                    }
                                />
                            </label>
                            <div className="trainer-gen-modal__checkbox-group">
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allowedLineLengths.includes(1)}
                                        onChange={() => handleToggleLineLength(1)}
                                    />
                                    <span>Single-Stage</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allowedLineLengths.includes(2)}
                                        onChange={() => handleToggleLineLength(2)}
                                    />
                                    <span>2-Stage Line</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allowedLineLengths.includes(3)}
                                        onChange={() => handleToggleLineLength(3)}
                                    />
                                    <span>3-Stage Line</span>
                                </label>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Evolution Stage Level:
                                <TooltipIcon
                                    onClick={() =>
                                        onOpenTooltip({
                                            title: 'Stage Level',
                                            desc: 'Filter species based on their current stage position. 1st Evo = Basic/Baby Pokémon; 2nd Evo = Middle Stage; 3rd Evo = Final Evolution.'
                                        })
                                    }
                                />
                            </label>
                            <div className="trainer-gen-modal__checkbox-group">
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allowedStageIndices.includes(1)}
                                        onChange={() => handleToggleStageIndex(1)}
                                    />
                                    <span>1st Evo / Basic</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allowedStageIndices.includes(2)}
                                        onChange={() => handleToggleStageIndex(2)}
                                    />
                                    <span>2nd Evo / Middle</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={allowedStageIndices.includes(3)}
                                        onChange={() => handleToggleStageIndex(3)}
                                    />
                                    <span>3rd Evo / Final</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Exclusions & Scalar Loyalty */}
                    <div className="trainer-gen-modal__grid--2col">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Special Forms & Species:
                            </label>
                            <div className="trainer-gen-modal__checkbox-group">
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeLegendaries}
                                        onChange={(e) => setIncludeLegendaries(e.target.checked)}
                                    />
                                    <span>Legendaries</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeMythicals}
                                        onChange={(e) => setIncludeMythicals(e.target.checked)}
                                    />
                                    <span>Mythicals</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeUltraBeasts}
                                        onChange={(e) => setIncludeUltraBeasts(e.target.checked)}
                                    />
                                    <span>Ultra Beasts</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeParadox}
                                        onChange={(e) => setIncludeParadox(e.target.checked)}
                                    />
                                    <span>Paradox</span>
                                </label>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeMegas}
                                        onChange={(e) => setIncludeMegas(e.target.checked)}
                                    />
                                    <span>Megas / Special Forms</span>
                                </label>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field" style={{ justifyContent: 'center' }}>
                            <label className="trainer-gen-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={scaleLoyaltyHappiness}
                                    onChange={(e) => setScaleLoyaltyHappiness(e.target.checked)}
                                />
                                <span>
                                    <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    Scale Pokémon Loyalty & Happiness with Rank
                                </span>
                                <TooltipIcon
                                    onClick={() =>
                                        onOpenTooltip({
                                            title: 'Scalar Loyalty & Happiness',
                                            desc: 'Scales bond according to corebook rank achievements: Starter/Rookie Pokémon start at 1–2; Standard rank has 1 maxed partner (5) with others at 2–3; Expert and Ace+ rosters feature loyal 5/5 partners.'
                                        })
                                    }
                                />
                            </label>

                            <label className="trainer-gen-modal__checkbox-label" style={{ marginTop: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={allowDuplicates}
                                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                                />
                                <span>Allow Duplicate Pokémon</span>
                                <TooltipIcon
                                    onClick={() =>
                                        onOpenTooltip({
                                            title: 'Allow Duplicate Pokémon',
                                            desc: 'When unchecked (default), each Pokémon generated for the team will be a unique species. Check this box if you want to allow trainers to carry multiple Pokémon of the exact same species (e.g. two Lapras).'
                                        })
                                    }
                                />
                            </label>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
