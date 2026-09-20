import { useState, useEffect } from 'react';
import { UserCheck, Dices, Hourglass, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { NATURES } from '../../../data/constants';
import { TRAINER_CLASSES, type TrainerProfileType } from '../../../data/trainerClasses';
import {
    RANK_ORDER,
    generateFullTrainerTeam,
    type TrainerGeneratorConfig,
    type PokedexLookupItem,
    type BiomeConceptMixMode,
    type SlotMixMode,
    type GeneratedTrainerResult
} from '../../../utils/trainerGeneratorLogic';
import { type TrainerSpawnImageOptions } from '../../../utils/trainerTokenSpawner';
import { fetchPokemonLookupIndex } from '../../../utils/api';
import type { Rank } from '../../../store/entityTypes';
import { BIOMES, getTrainerClassesForBiome } from '../../../data/biomeData';
import { TrainerPreviewModal } from './TrainerPreviewModal';
import { TrainerIdentitySection } from './TrainerIdentitySection';
import { TrainerTeamSection, type TeamThemeStrategy } from './TrainerTeamSection';
import { TrainerTokenSection } from './TrainerTokenSection';
import './TrainerGeneratorModal.css';

export type { TeamThemeStrategy };

interface TrainerGeneratorModalProps {
    onClose: () => void;
}

export function TrainerGeneratorModal({ onClose }: TrainerGeneratorModalProps) {
    const store = useCharacterStore();

    // Data Loading State
    const [pokedexLookup, setPokedexLookup] = useState<PokedexLookupItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const [trainerBiomeId, setTrainerBiomeId] = useState<string>('random');
    const [teamBiomeId, setTeamBiomeId] = useState<string>('match_trainer');
    const [previewResult, setPreviewResult] = useState<GeneratedTrainerResult | null>(null);
    const [spawnImageOptions, setSpawnImageOptions] = useState<TrainerSpawnImageOptions | null>(null);
    const [spawnDestination, setSpawnDestination] = useState<'new' | 'overwrite'>('new');

    // Trainer Identity Form State
    const [conceptId, setConceptId] = useState<string>('random');
    const [trainerName, setTrainerName] = useState<string>('');
    const [rank, setRank] = useState<Rank | 'random'>('random');
    const [age, setAge] = useState<'Child' | 'Teen' | 'Adult' | 'Senior' | 'random'>('random');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Non-Binary' | 'random'>('random');
    const [nature, setNature] = useState<string>('random');
    const [isSpecialTrainer, setIsSpecialTrainer] = useState<boolean>(false);
    const [autoSpecialForMystic, setAutoSpecialForMystic] = useState<boolean>(false);
    const [profile, setProfile] = useState<TrainerProfileType | 'auto'>('auto');
    const [assignBadges, setAssignBadges] = useState<boolean>(false);

    // Pokémon Team Form State
    const [generateTeam, setGenerateTeam] = useState<boolean>(true);
    const [teamSize, setTeamSize] = useState<number>(3);
    const [teamThemeStrategy, setTeamThemeStrategy] = useState<TeamThemeStrategy>('concept');
    const [typeSpecialtyMode, setTypeSpecialtyMode] = useState<'concept' | 'monotype' | 'dual' | 'variety' | 'manual'>(
        'concept'
    );
    const [manualTypes, setManualTypes] = useState<string[]>([]);
    const [teamRankMode, setTeamRankMode] = useState<'match_trainer' | 'random' | 'custom'>('match_trainer');
    const [customPokemonRanks, setCustomPokemonRanks] = useState<Rank[]>([
        'Starter',
        'Starter',
        'Starter',
        'Starter',
        'Starter',
        'Starter'
    ]);
    const [capPokemonRank, setCapPokemonRank] = useState<boolean>(true);
    const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);
    const [buildType, setBuildType] = useState<'minmax' | 'average' | 'wild'>('minmax');
    const [biomeConceptMixMode, setBiomeConceptMixMode] = useState<BiomeConceptMixMode>('concept_only');
    const [customSlotMixModes, setCustomSlotMixModes] = useState<SlotMixMode[]>([
        'concept_only',
        'concept_only',
        'concept_only',
        'concept_only',
        'concept_only',
        'concept_only'
    ]);

    // Evolution Stage Filters
    const [allowedLineLengths, setAllowedLineLengths] = useState<number[]>([1, 2, 3]);
    const [allowedStageIndices, setAllowedStageIndices] = useState<number[]>([1, 2, 3]);

    // Exclusions & Special Toggles
    const [includeLegendaries, setIncludeLegendaries] = useState<boolean>(false);
    const [includeMythicals, setIncludeMythicals] = useState<boolean>(false);
    const [includeUltraBeasts, setIncludeUltraBeasts] = useState<boolean>(false);
    const [includeParadox, setIncludeParadox] = useState<boolean>(false);
    const [includeMegas, setIncludeMegas] = useState<boolean>(false);
    const [scaleLoyaltyHappiness, setScaleLoyaltyHappiness] = useState<boolean>(true);
    const [filterRecommendedRank, setFilterRecommendedRank] = useState<boolean>(false);
    const [recommendedRankMode, setRecommendedRankMode] = useState<'match_pokemon' | 'exact' | 'custom'>(
        'match_pokemon'
    );
    const [exactRecommendedRank, setExactRecommendedRank] = useState<Rank>('Standard');
    const [customSlotRecommendedRanks, setCustomSlotRecommendedRanks] = useState<(Rank | 'match_pokemon')[]>([
        'match_pokemon',
        'match_pokemon',
        'match_pokemon',
        'match_pokemon',
        'match_pokemon',
        'match_pokemon'
    ]);

    // Destination & Spawning Options
    const [destination, setDestination] = useState<'new' | 'overwrite'>('new');
    const [tokenImageMode, setTokenImageMode] = useState<'default' | 'prompt_each' | 'fallback_pokeball'>('default');
    const [defaultImage, setDefaultImage] = useState<{
        url: string;
        width: number;
        height: number;
        name?: string;
    } | null>(null);
    const [autoMatchSceneImages, setAutoMatchSceneImages] = useState<boolean>(true);

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

    useEffect(() => {
        fetchPokemonLookupIndex()
            .then((data) => {
                setPokedexLookup(data as PokedexLookupItem[]);
            })
            .catch((err) => {
                console.error('[TrainerGeneratorModal] Failed to load pokedex lookup:', err);
            });
    }, []);

    const handleSurpriseMe = () => {
        // 1. Trainer Origin / Biome (60% chance of having a specific biome)
        const hasBiome = Math.random() < 0.6;
        const randomBiome = hasBiome ? BIOMES[Math.floor(Math.random() * BIOMES.length)] : null;
        const newTrainerBiomeId = randomBiome ? randomBiome.id : 'none';
        setTrainerBiomeId(newTrainerBiomeId);

        // 2. Trainer Concept (thematic for biome or any class)
        let conceptPool = TRAINER_CLASSES;
        if (randomBiome) {
            const bClasses = getTrainerClassesForBiome(randomBiome.id);
            if (bClasses.length > 0 && Math.random() < 0.75) {
                conceptPool = bClasses;
            }
        }
        const chosenClass = conceptPool[Math.floor(Math.random() * conceptPool.length)];
        setConceptId(chosenClass.id);
        if (chosenClass.isSupernatural) {
            setIsSpecialTrainer(true);
        } else {
            setIsSpecialTrainer(false);
        }

        // 3. Trainer Rank (respect minimum rank of class)
        const minRankIdx = chosenClass.minRank ? RANK_ORDER.indexOf(chosenClass.minRank) : 0;
        const availableRanks = RANK_ORDER.slice(Math.max(0, minRankIdx));
        const chosenRank = availableRanks[Math.floor(Math.random() * availableRanks.length)];
        setRank(chosenRank);

        // 4. Age, Gender, Nature, Profile
        const ages: ('Child' | 'Teen' | 'Adult' | 'Senior')[] = ['Child', 'Teen', 'Adult', 'Senior'];
        setAge(ages[Math.floor(Math.random() * ages.length)]);

        const genders: ('Male' | 'Female' | 'Non-Binary')[] = ['Male', 'Female', 'Non-Binary'];
        setGender(genders[Math.floor(Math.random() * genders.length)]);

        const validNatures = NATURES.filter((n) => n && n.trim() !== '');
        setNature(validNatures[Math.floor(Math.random() * validNatures.length)]);

        const profiles: (TrainerProfileType | 'auto')[] = [
            'auto',
            'battler',
            'survivalist',
            'socialite',
            'scholar',
            'mystic',
            'balanced'
        ];
        setProfile(profiles[Math.floor(Math.random() * profiles.length)]);

        // 5. Badges
        setAssignBadges(Math.random() < 0.5);

        // 6. Team Settings
        setGenerateTeam(true);
        const randomSizes = [1, 2, 3, 4, 5, 6];
        setTeamSize(randomSizes[Math.floor(Math.random() * randomSizes.length)]);

        const strategies: TeamThemeStrategy[] = ['concept', 'biome', 'mix', 'custom'];
        const chosenStrategy = strategies[Math.floor(Math.random() * strategies.length)];
        setTeamThemeStrategy(chosenStrategy);

        if (chosenStrategy === 'biome' || chosenStrategy === 'mix') {
            const hasTeamBiome = Math.random() < 0.8;
            if (hasTeamBiome) {
                if (Math.random() < 0.4 && newTrainerBiomeId !== 'none') {
                    setTeamBiomeId('match_trainer');
                } else {
                    const rB = BIOMES[Math.floor(Math.random() * BIOMES.length)];
                    setTeamBiomeId(rB.id);
                }
            } else {
                setTeamBiomeId('random');
            }
        }

        const mixModes: BiomeConceptMixMode[] = ['concept_only', 'biome_only', 'union', 'combo', 'split'];
        const chosenMixMode = mixModes[Math.floor(Math.random() * mixModes.length)];
        setBiomeConceptMixMode(chosenMixMode);

        if (chosenMixMode === 'split') {
            const slotOptions: SlotMixMode[] = ['concept_only', 'biome_only', 'union', 'combo'];
            setCustomSlotMixModes([
                slotOptions[Math.floor(Math.random() * slotOptions.length)],
                slotOptions[Math.floor(Math.random() * slotOptions.length)],
                slotOptions[Math.floor(Math.random() * slotOptions.length)],
                slotOptions[Math.floor(Math.random() * slotOptions.length)],
                slotOptions[Math.floor(Math.random() * slotOptions.length)],
                slotOptions[Math.floor(Math.random() * slotOptions.length)]
            ]);
        }

        // Custom types
        const typeModes: ('monotype' | 'dual' | 'variety')[] = ['monotype', 'dual', 'variety'];
        setTypeSpecialtyMode(typeModes[Math.floor(Math.random() * typeModes.length)]);

        // Build Tier & Rank Mode
        const buildTiers: ('minmax' | 'average')[] = ['minmax', 'average'];
        setBuildType(buildTiers[Math.floor(Math.random() * buildTiers.length)]);

        const rankModes: ('match_trainer' | 'random')[] = ['match_trainer', 'random'];
        setTeamRankMode(rankModes[Math.floor(Math.random() * rankModes.length)]);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const rollBiome = () => BIOMES[Math.floor(Math.random() * BIOMES.length)].id;

            let actualTrainerBiomeId: string | undefined = undefined;
            if (trainerBiomeId === 'random') {
                actualTrainerBiomeId = rollBiome();
            } else if (trainerBiomeId !== 'none') {
                actualTrainerBiomeId = trainerBiomeId;
            }

            let effectiveTeamBiomeId: string | undefined = undefined;
            let effectiveTypeSpecialtyMode = typeSpecialtyMode;
            let effectiveMixMode: BiomeConceptMixMode = 'concept_only';

            if (teamThemeStrategy === 'concept') {
                effectiveTeamBiomeId = undefined;
                effectiveTypeSpecialtyMode = 'concept';
                effectiveMixMode = 'concept_only';
            } else if (teamThemeStrategy === 'biome') {
                if (teamBiomeId === 'match_trainer') {
                    effectiveTeamBiomeId = actualTrainerBiomeId || rollBiome();
                } else if (teamBiomeId === 'random') {
                    effectiveTeamBiomeId = rollBiome();
                } else if (teamBiomeId && teamBiomeId !== 'none') {
                    effectiveTeamBiomeId = teamBiomeId;
                } else {
                    effectiveTeamBiomeId = actualTrainerBiomeId || rollBiome();
                }
                effectiveTypeSpecialtyMode = 'variety';
                effectiveMixMode = 'biome_only';
            } else if (teamThemeStrategy === 'mix') {
                if (teamBiomeId === 'match_trainer') {
                    effectiveTeamBiomeId = actualTrainerBiomeId || rollBiome();
                } else if (teamBiomeId === 'random') {
                    effectiveTeamBiomeId = rollBiome();
                } else if (teamBiomeId && teamBiomeId !== 'none') {
                    effectiveTeamBiomeId = teamBiomeId;
                } else {
                    effectiveTeamBiomeId = actualTrainerBiomeId || rollBiome();
                }
                effectiveTypeSpecialtyMode = 'concept';
                effectiveMixMode = biomeConceptMixMode;
            } else if (teamThemeStrategy === 'custom') {
                effectiveTeamBiomeId = undefined;
                effectiveTypeSpecialtyMode = typeSpecialtyMode === 'concept' ? 'monotype' : typeSpecialtyMode;
                effectiveMixMode = 'concept_only';
            }

            const config: TrainerGeneratorConfig = {
                trainerName: trainerName.trim() || undefined,
                conceptId,
                rank,
                age,
                gender,
                nature,
                isSpecialTrainer,
                autoSpecialForMystic,
                profile,
                assignBadges,

                generateTeam,
                teamSize: generateTeam ? teamSize : 0,
                typeSpecialtyMode: effectiveTypeSpecialtyMode,
                manualTypes,
                teamRankMode,
                customPokemonRanks,
                capPokemonRank,
                allowDuplicates,
                buildType,
                allowedLineLengths,
                allowedStageIndices,
                includeLegendaries,
                includeMythicals,
                includeUltraBeasts,
                includeParadox,
                includeMegas,
                scaleLoyaltyHappiness,
                trainerBiomeId: actualTrainerBiomeId,
                teamBiomeId: effectiveTeamBiomeId,
                biomeId: effectiveTeamBiomeId,
                biomeConceptMixMode: effectiveMixMode,
                customSlotMixModes,
                filterRecommendedRank,
                recommendedRankMode,
                exactRecommendedRank,
                customSlotRecommendedRanks
            };

            const imageOptions: TrainerSpawnImageOptions = {
                imageMode: tokenImageMode,
                defaultImageUrl: defaultImage?.url,
                defaultImageWidth: defaultImage?.width,
                defaultImageHeight: defaultImage?.height,
                autoMatchExisting: autoMatchSceneImages
            };

            const result = await generateFullTrainerTeam(config, store, pokedexLookup);
            setSpawnImageOptions(imageOptions);
            setSpawnDestination(destination);
            setPreviewResult(result);
        } catch (error) {
            console.error('[TrainerGeneratorModal] Generation failed:', error);
            setTooltipInfo({
                title: 'Generation Failed',
                desc: 'Failed to generate trainer. See browser console for details.'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (previewResult && spawnImageOptions) {
        let effectiveTeamBiomeId: string | undefined = undefined;
        let effectiveTypeSpecialtyMode = typeSpecialtyMode;
        let effectiveMixMode: BiomeConceptMixMode = 'concept_only';

        if (teamThemeStrategy === 'concept') {
            effectiveTeamBiomeId = undefined;
            effectiveTypeSpecialtyMode = 'concept';
            effectiveMixMode = 'concept_only';
        } else if (teamThemeStrategy === 'biome') {
            effectiveTeamBiomeId = resolvedTeamBiomeId;
            effectiveTypeSpecialtyMode = 'variety';
            effectiveMixMode = 'biome_only';
        } else if (teamThemeStrategy === 'mix') {
            effectiveTeamBiomeId = resolvedTeamBiomeId;
            effectiveTypeSpecialtyMode = 'concept';
            effectiveMixMode = biomeConceptMixMode;
        } else if (teamThemeStrategy === 'custom') {
            effectiveTeamBiomeId = undefined;
            effectiveTypeSpecialtyMode = typeSpecialtyMode === 'concept' ? 'monotype' : typeSpecialtyMode;
            effectiveMixMode = 'concept_only';
        }

        return (
            <TrainerPreviewModal
                result={previewResult}
                config={{
                    trainerName: trainerName.trim() || undefined,
                    conceptId,
                    rank,
                    age,
                    gender,
                    nature,
                    isSpecialTrainer,
                    autoSpecialForMystic,
                    profile,
                    assignBadges,
                    generateTeam,
                    teamSize,
                    typeSpecialtyMode: effectiveTypeSpecialtyMode,
                    manualTypes,
                    teamRankMode,
                    customPokemonRanks,
                    capPokemonRank,
                    allowDuplicates,
                    buildType,
                    allowedLineLengths,
                    allowedStageIndices,
                    includeLegendaries,
                    includeMythicals,
                    includeUltraBeasts,
                    includeParadox,
                    includeMegas,
                    scaleLoyaltyHappiness,
                    trainerBiomeId: trainerBiomeId !== 'none' ? trainerBiomeId : undefined,
                    teamBiomeId: effectiveTeamBiomeId,
                    biomeId: effectiveTeamBiomeId,
                    biomeConceptMixMode: effectiveMixMode,
                    customSlotMixModes,
                    filterRecommendedRank,
                    recommendedRankMode,
                    exactRecommendedRank,
                    customSlotRecommendedRanks
                }}
                pokedexLookup={pokedexLookup}
                destination={spawnDestination}
                imageOptions={spawnImageOptions}
                onClose={() => {
                    setPreviewResult(null);
                    onClose();
                }}
            />
        );
    }

    return (
        <div className="trainer-gen-modal__overlay">
            <div className="trainer-gen-modal__content">
                {/* Modal Header */}
                <div className="trainer-gen-modal__header">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}
                    >
                        <div>
                            <h2 className="trainer-gen-modal__title text-title-primary">
                                <UserCheck size={22} color="var(--primary)" /> Trainer & Team Generator
                            </h2>
                            <p className="trainer-gen-modal__subtitle text-subtext">
                                Create full Pokerole Trainer sheets and generate matching battle teams in one click.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="trainer-gen-modal__surprise-btn"
                            onClick={handleSurpriseMe}
                            title="Roll a completely random, thematic Trainer and Team across all factors"
                        >
                            <Dices size={16} /> Surprise Me!
                        </button>
                    </div>
                </div>

                {/* 1. TRAINER IDENTITY SECTION */}
                <TrainerIdentitySection
                    trainerBiomeId={trainerBiomeId}
                    setTrainerBiomeId={setTrainerBiomeId}
                    conceptId={conceptId}
                    setConceptId={setConceptId}
                    trainerName={trainerName}
                    setTrainerName={setTrainerName}
                    rank={rank}
                    setRank={setRank}
                    age={age}
                    setAge={setAge}
                    gender={gender}
                    setGender={setGender}
                    nature={nature}
                    setNature={setNature}
                    profile={profile}
                    setProfile={setProfile}
                    isSpecialTrainer={isSpecialTrainer}
                    setIsSpecialTrainer={setIsSpecialTrainer}
                    autoSpecialForMystic={autoSpecialForMystic}
                    setAutoSpecialForMystic={setAutoSpecialForMystic}
                    assignBadges={assignBadges}
                    setAssignBadges={setAssignBadges}
                    onOpenTooltip={setTooltipInfo}
                />

                {/* 2. POKÉMON TEAM SECTION */}
                <TrainerTeamSection
                    generateTeam={generateTeam}
                    setGenerateTeam={setGenerateTeam}
                    teamSize={teamSize}
                    setTeamSize={setTeamSize}
                    teamThemeStrategy={teamThemeStrategy}
                    setTeamThemeStrategy={setTeamThemeStrategy}
                    trainerBiomeId={trainerBiomeId}
                    conceptId={conceptId}
                    teamBiomeId={teamBiomeId}
                    setTeamBiomeId={setTeamBiomeId}
                    biomeConceptMixMode={biomeConceptMixMode}
                    setBiomeConceptMixMode={setBiomeConceptMixMode}
                    customSlotMixModes={customSlotMixModes}
                    setCustomSlotMixModes={setCustomSlotMixModes}
                    typeSpecialtyMode={typeSpecialtyMode}
                    setTypeSpecialtyMode={setTypeSpecialtyMode}
                    manualTypes={manualTypes}
                    setManualTypes={setManualTypes}
                    teamRankMode={teamRankMode}
                    setTeamRankMode={setTeamRankMode}
                    customPokemonRanks={customPokemonRanks}
                    setCustomPokemonRanks={setCustomPokemonRanks}
                    capPokemonRank={capPokemonRank}
                    setCapPokemonRank={setCapPokemonRank}
                    buildType={buildType}
                    setBuildType={setBuildType}
                    allowedLineLengths={allowedLineLengths}
                    setAllowedLineLengths={setAllowedLineLengths}
                    allowedStageIndices={allowedStageIndices}
                    setAllowedStageIndices={setAllowedStageIndices}
                    includeLegendaries={includeLegendaries}
                    setIncludeLegendaries={setIncludeLegendaries}
                    includeMythicals={includeMythicals}
                    setIncludeMythicals={setIncludeMythicals}
                    includeUltraBeasts={includeUltraBeasts}
                    setIncludeUltraBeasts={setIncludeUltraBeasts}
                    includeParadox={includeParadox}
                    setIncludeParadox={setIncludeParadox}
                    includeMegas={includeMegas}
                    setIncludeMegas={setIncludeMegas}
                    scaleLoyaltyHappiness={scaleLoyaltyHappiness}
                    setScaleLoyaltyHappiness={setScaleLoyaltyHappiness}
                    allowDuplicates={allowDuplicates}
                    setAllowDuplicates={setAllowDuplicates}
                    filterRecommendedRank={filterRecommendedRank}
                    setFilterRecommendedRank={setFilterRecommendedRank}
                    recommendedRankMode={recommendedRankMode}
                    setRecommendedRankMode={setRecommendedRankMode}
                    exactRecommendedRank={exactRecommendedRank}
                    setExactRecommendedRank={setExactRecommendedRank}
                    customSlotRecommendedRanks={customSlotRecommendedRanks}
                    setCustomSlotRecommendedRanks={setCustomSlotRecommendedRanks}
                    onOpenTooltip={setTooltipInfo}
                />

                {/* 3. TOKEN ARTWORK & DESTINATION SECTION */}
                <TrainerTokenSection
                    tokenImageMode={tokenImageMode}
                    setTokenImageMode={setTokenImageMode}
                    defaultImage={defaultImage}
                    setDefaultImage={setDefaultImage}
                    autoMatchSceneImages={autoMatchSceneImages}
                    setAutoMatchSceneImages={setAutoMatchSceneImages}
                    destination={destination}
                    setDestination={setDestination}
                    generateTeam={generateTeam}
                    teamSize={teamSize}
                    onOpenTooltip={setTooltipInfo}
                />

                {/* Modal Footer Actions */}
                <div className="trainer-gen-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark trainer-gen-modal__btn"
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="action-button action-button--red trainer-gen-modal__btn"
                    >
                        {isGenerating ? (
                            <>
                                <Hourglass size={16} /> Generating Trainer & Team...
                            </>
                        ) : (
                            <>
                                <Dices size={16} /> Generate Trainer
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tooltip Overlay */}
            {tooltipInfo && (
                <div className="trainer-gen-modal__tooltip-overlay" onClick={() => setTooltipInfo(null)}>
                    <div className="trainer-gen-modal__tooltip-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="trainer-gen-modal__tooltip-title text-title-primary">{tooltipInfo.title}</h3>
                        <p className="trainer-gen-modal__tooltip-desc text-subtext">{tooltipInfo.desc}</p>
                        <div className="trainer-gen-modal__tooltip-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark"
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
