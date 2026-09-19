import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import {
    UserCheck,
    User,
    Compass,
    Layers,
    XCircle,
    Dices,
    Hourglass,
    Award,
    Shield,
    Sparkles,
    Flame,
    Image as ImageIcon,
    Upload
} from 'lucide-react';
import { TooltipIcon } from '../ui/TooltipIcon';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NATURES } from '../../data/constants';
import { TRAINER_CLASSES, type TrainerProfileType } from '../../data/trainerClasses';
import {
    RANK_ORDER,
    ALL_POKEMON_TYPES,
    generateFullTrainerTeam,
    type TrainerGeneratorConfig,
    type PokedexLookupItem,
    type BiomeConceptMixMode,
    type SlotMixMode
} from '../../utils/trainerGeneratorLogic';

export type TeamThemeStrategy = 'concept' | 'biome' | 'mix' | 'custom';
import { type TrainerSpawnImageOptions } from '../../utils/trainerTokenSpawner';
import { fetchPokemonLookupIndex } from '../../utils/api';
import { isStandaloneMode } from '../../utils/storageAdapter';
import type { Rank } from '../../store/entityTypes';
import { BIOMES, BIOME_MAP, getTrainerClassesForBiome } from '../../data/biomeData';
import { TrainerPreviewModal } from './TrainerPreviewModal';
import './TrainerGeneratorModal.css';

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
    const [previewResult, setPreviewResult] = useState<any | null>(null);
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

    // Exclusions
    const [includeLegendaries, setIncludeLegendaries] = useState<boolean>(false);
    const [includeMythicals, setIncludeMythicals] = useState<boolean>(false);
    const [includeMegas, setIncludeMegas] = useState<boolean>(false);

    // Loyalty / Happiness Scaling
    const [scaleLoyaltyHappiness, setScaleLoyaltyHappiness] = useState<boolean>(true);

    // Destination
    const [destination, setDestination] = useState<'new' | 'overwrite'>('new');

    // Artwork & Token Image State (OBR mode)
    const [tokenImageMode, setTokenImageMode] = useState<'default' | 'prompt_each' | 'fallback_pokeball'>('default');
    const [defaultImage, setDefaultImage] = useState<{
        url: string;
        width: number;
        height: number;
        name?: string;
    } | null>(null);
    const [autoMatchSceneImages, setAutoMatchSceneImages] = useState<boolean>(true);

    const effectiveTeamBiomeValue =
        teamThemeStrategy === 'concept' || teamThemeStrategy === 'custom'
            ? 'none'
            : teamBiomeId === 'none'
              ? trainerBiomeId !== 'none'
                  ? 'match_trainer'
                  : 'random'
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

    // When concept changes and autoSpecialForMystic is enabled, update isSpecialTrainer accordingly
    const handleConceptChange = (newConceptId: string) => {
        setConceptId(newConceptId);
        if (autoSpecialForMystic) {
            const chosen = TRAINER_CLASSES.find((c) => c.id === newConceptId);
            if (chosen && chosen.isSupernatural) {
                setIsSpecialTrainer(true);
            } else {
                setIsSpecialTrainer(false);
            }
        }
    };

    const handleTrainerBiomeChange = (newBiomeId: string) => {
        setTrainerBiomeId(newBiomeId);
        if (newBiomeId !== 'none') {
            if (conceptId === 'random' || conceptId === 'biome_match') {
                setConceptId('biome_match');
            }
        } else if (conceptId === 'biome_match') {
            setConceptId('random');
        }
    };

    const handleToggleAutoSpecial = (enabled: boolean) => {
        setAutoSpecialForMystic(enabled);
        if (enabled) {
            const chosen = TRAINER_CLASSES.find((c) => c.id === conceptId);
            if (chosen && chosen.isSupernatural) {
                setIsSpecialTrainer(true);
            }
        }
    };

    const handleRandomizeConcept = () => {
        let pool = TRAINER_CLASSES;
        if (trainerBiomeId && trainerBiomeId !== 'none') {
            const bClasses = getTrainerClassesForBiome(trainerBiomeId);
            if (bClasses.length > 0) {
                pool = bClasses;
            }
        }
        const randomClass = pool[Math.floor(Math.random() * pool.length)];
        handleConceptChange(randomClass.id);
    };

    const handleRandomizeRank = () => {
        setRank(RANK_ORDER[Math.floor(Math.random() * RANK_ORDER.length)]);
    };

    const handleRandomizeAge = () => {
        const ages: ('Child' | 'Teen' | 'Adult' | 'Senior')[] = ['Child', 'Teen', 'Adult', 'Senior'];
        setAge(ages[Math.floor(Math.random() * ages.length)]);
    };

    const handleRandomizeGender = () => {
        const genders: ('Male' | 'Female' | 'Non-Binary')[] = ['Male', 'Female', 'Non-Binary'];
        setGender(genders[Math.floor(Math.random() * genders.length)]);
    };

    const handleRandomizeNature = () => {
        const validNatures = NATURES.filter((n) => n && n.trim() !== '');
        setNature(validNatures[Math.floor(Math.random() * validNatures.length)]);
    };

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

    const handleSlotMixModeChange = (slotIndex: number, mode: SlotMixMode) => {
        setCustomSlotMixModes((prev) => {
            const next = [...prev];
            next[slotIndex] = mode;
            return next;
        });
    };

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
            'scholar',
            'mystic',
            'socialite',
            'balanced'
        ];
        setProfile(profiles[Math.floor(Math.random() * profiles.length)]);

        // 5. Team Options
        setGenerateTeam(true);
        const randomTeamSize = Math.floor(Math.random() * 5) + 2; // 2 to 6
        setTeamSize(randomTeamSize);

        // 6. Theme Strategy
        const strategies: TeamThemeStrategy[] = ['concept', 'biome', 'mix', 'custom'];
        const chosenStrategy = strategies[Math.floor(Math.random() * strategies.length)];
        setTeamThemeStrategy(chosenStrategy);

        // Biome for team
        const targetTeamBiome = randomBiome
            ? Math.random() < 0.6
                ? 'match_trainer'
                : BIOMES[Math.floor(Math.random() * BIOMES.length)].id
            : BIOMES[Math.floor(Math.random() * BIOMES.length)].id;
        setTeamBiomeId(targetTeamBiome);

        // Mix modes
        const mixModes: BiomeConceptMixMode[] = ['union', 'combo', 'split'];
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

    const handlePickDefaultImage = async () => {
        if (!OBR.isAvailable) return;
        if (typeof OBR.assets?.downloadImages === 'function') {
            try {
                const images = await OBR.assets.downloadImages(false, undefined, 'CHARACTER');
                if (images && images.length > 0) {
                    setDefaultImage({
                        url: images[0].image.url,
                        width: images[0].image.width,
                        height: images[0].image.height,
                        name: images[0].name
                    });
                    setTokenImageMode('default');
                }
            } catch (err) {
                console.warn('[TrainerGeneratorModal] Image selection cancelled:', err);
            }
        }
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
                includeMegas,
                scaleLoyaltyHappiness,
                trainerBiomeId: actualTrainerBiomeId,
                teamBiomeId: effectiveTeamBiomeId,
                biomeId: effectiveTeamBiomeId,
                biomeConceptMixMode: effectiveMixMode,
                customSlotMixModes
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
                    includeMegas,
                    scaleLoyaltyHappiness,
                    trainerBiomeId: trainerBiomeId !== 'none' ? trainerBiomeId : undefined,
                    teamBiomeId: effectiveTeamBiomeId,
                    biomeId: effectiveTeamBiomeId,
                    biomeConceptMixMode: effectiveMixMode,
                    customSlotMixModes
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

    const selectedConcept = TRAINER_CLASSES.find((c) => c.id === conceptId);
    const selectedTrainerBiomeDef =
        trainerBiomeId !== 'none' && trainerBiomeId !== 'random' ? BIOME_MAP[trainerBiomeId] : null;
    const biomeClasses =
        trainerBiomeId !== 'none' && trainerBiomeId !== 'random' ? getTrainerClassesForBiome(trainerBiomeId) : [];
    const selectedTeamBiomeDef =
        resolvedTeamBiomeId &&
        resolvedTeamBiomeId !== 'none' &&
        resolvedTeamBiomeId !== 'random' &&
        resolvedTeamBiomeId !== 'match_trainer'
            ? BIOME_MAP[resolvedTeamBiomeId]
            : null;

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
                <div className="trainer-gen-modal__section">
                    <div className="trainer-gen-modal__section-header">
                        <h3 className="trainer-gen-modal__section-title text-title-primary">
                            <Shield size={16} color="var(--primary)" /> Trainer Identity & Biome
                        </h3>
                        <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                            Core Concept, Biome & Attributes
                        </span>
                    </div>

                    <div className="trainer-gen-modal__grid--2col">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Trainer Origin / Biome:
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Trainer Origin / Biome',
                                            desc: 'Sets the environmental origin of the Trainer, surfacing thematic trainer classes and concepts that fit this biome. (Does not restrict Pokémon species unless you choose to match it in Section 2).'
                                        })
                                    }
                                />
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={trainerBiomeId}
                                    onChange={(e) => handleTrainerBiomeChange(e.target.value)}
                                    className="trainer-gen-modal__select"
                                    style={{ flex: 1 }}
                                >
                                    <option value="random">Random Biome / Origin (Flavor)</option>
                                    <option value="none">Any Biome / Origin (None)</option>
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
                                        handleTrainerBiomeChange(randomB.id);
                                    }}
                                    title="Roll and lock a specific random biome"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Trainer Concept / Class:
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Trainer Class / Concept',
                                            desc: "Select an iconic Pokémon trainer class. Classes come with natural type preferences, typical ranks, and suggested stat/skill profiles. When a Biome is selected, clicking the dice button rolls from that biome's thematic concepts!"
                                        })
                                    }
                                />
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={conceptId}
                                    onChange={(e) => handleConceptChange(e.target.value)}
                                    className="trainer-gen-modal__select"
                                    style={{ flex: 1 }}
                                >
                                    {trainerBiomeId === 'random' ? (
                                        <>
                                            <option value="random">Random Concept (Thematic to Origin Biome)</option>
                                            <option value="biome_match">Strictly Thematic to Rolled Biome</option>
                                            <option value="any_random">Random Concept (Any Class Worldwide)</option>
                                        </>
                                    ) : (
                                        <>
                                            {biomeClasses.length > 0 && (
                                                <option value="biome_match">
                                                    Random from Biome Match ({selectedTrainerBiomeDef?.name})
                                                </option>
                                            )}
                                            <option value="random">
                                                {biomeClasses.length > 0
                                                    ? 'Random Concept (Thematic / Any Class)'
                                                    : 'Random Concept'}
                                            </option>
                                        </>
                                    )}
                                    <option value="none">Custom / Independent Trainer</option>
                                    {biomeClasses.length > 0 && (
                                        <optgroup
                                            label={`Thematic for ${selectedTrainerBiomeDef?.name || 'Selected Biome'}`}
                                        >
                                            {biomeClasses.map((c) => (
                                                <option key={`biome-${c.id}`} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    <optgroup label="Wild & Nature">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Wild').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Martial & Combat">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Martial').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Urban & Specialist">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Urban').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Scholar & Tech">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Scholar').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Social & Show">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Social').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Villains & Grunts">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Villain').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Elite & Universal">
                                        {TRAINER_CLASSES.filter((c) => c.category === 'Elite').map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleRandomizeConcept}
                                    title={
                                        biomeClasses.length > 0
                                            ? `Roll a random concept from ${selectedTrainerBiomeDef?.name}`
                                            : 'Roll a random concept'
                                    }
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={15} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Thematic Concept Quick-Pick Chips */}
                    {biomeClasses.length > 0 && (
                        <div
                            style={{
                                marginTop: '8px',
                                marginBottom: '4px',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '6px'
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Sparkles size={13} /> Thematic Trainer Concepts for {selectedTrainerBiomeDef?.name}
                                    :
                                </span>
                                <span className="text-subtext" style={{ fontSize: '0.72rem' }}>
                                    Click chip to choose
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleConceptChange('biome_match')}
                                    style={{
                                        fontSize: '0.74rem',
                                        padding: '3px 9px',
                                        borderRadius: '12px',
                                        border:
                                            conceptId === 'biome_match'
                                                ? '1px solid var(--primary)'
                                                : '1px solid var(--border)',
                                        background:
                                            conceptId === 'biome_match' ? 'var(--primary)' : 'rgba(0, 0, 0, 0.25)',
                                        color: conceptId === 'biome_match' ? '#fff' : 'var(--text-color)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: conceptId === 'biome_match' ? 600 : 400,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Dices size={12} />
                                    Random Biome Match
                                </button>
                                {biomeClasses.map((c) => {
                                    const isSelected = conceptId === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleConceptChange(c.id)}
                                            style={{
                                                fontSize: '0.74rem',
                                                padding: '3px 9px',
                                                borderRadius: '12px',
                                                border: isSelected
                                                    ? '1px solid var(--primary)'
                                                    : '1px solid var(--border)',
                                                background: isSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.25)',
                                                color: isSelected ? '#fff' : 'var(--text-color)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {c.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="trainer-gen-modal__field" style={{ marginTop: '8px' }}>
                        <label className="trainer-gen-modal__field-label text-label">
                            Trainer Name / Nickname:
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: 'Trainer Name',
                                        desc: 'Custom name for the Trainer sheet/token. Leave blank to default to the selected concept class (e.g. "Bird Keeper").'
                                    })
                                }
                            />
                        </label>
                        <input
                            type="text"
                            value={trainerName}
                            onChange={(e) => setTrainerName(e.target.value)}
                            placeholder={
                                selectedConcept
                                    ? selectedConcept.name
                                    : conceptId === 'biome_match'
                                      ? `e.g. Random ${selectedTrainerBiomeDef?.name || 'Biome'} Concept`
                                      : 'e.g. Ace Trainer (default)'
                            }
                            className="trainer-gen-modal__input"
                        />
                    </div>

                    <div className="trainer-gen-modal__grid">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Trainer Rank:
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Trainer Rank',
                                            desc: 'Governs attribute points, social points, and skill limits per the Pokerole Corebook.'
                                        })
                                    }
                                />
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={rank}
                                    onChange={(e) => setRank(e.target.value as Rank | 'random')}
                                    className="trainer-gen-modal__select"
                                    style={{ flex: 1 }}
                                >
                                    <option value="random">Random Rank</option>
                                    {RANK_ORDER.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleRandomizeRank}
                                    title="Roll a random rank"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Age Category:
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Age Category',
                                            desc: 'In Pokerole, age grants bonus attribute and social points (Child: 0, Teen: +2/+2, Adult: +4/+4, Senior: +3/+6).'
                                        })
                                    }
                                />
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={age}
                                    onChange={(e) =>
                                        setAge(e.target.value as 'Child' | 'Teen' | 'Adult' | 'Senior' | 'random')
                                    }
                                    className="trainer-gen-modal__select"
                                    style={{ flex: 1 }}
                                >
                                    <option value="random">Random Age</option>
                                    <option value="Child">Child (8–12)</option>
                                    <option value="Teen">Teen (13–18)</option>
                                    <option value="Adult">Adult (19–59)</option>
                                    <option value="Senior">Senior (60+)</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleRandomizeAge}
                                    title="Roll a random age"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">Gender:</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={gender}
                                    onChange={(e) =>
                                        setGender(e.target.value as 'Male' | 'Female' | 'Non-Binary' | 'random')
                                    }
                                    className="trainer-gen-modal__select"
                                    style={{ flex: 1 }}
                                >
                                    <option value="random">Random Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Non-Binary">Non-Binary</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleRandomizeGender}
                                    title="Roll a random gender"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">Nature:</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value={nature}
                                    onChange={(e) => setNature(e.target.value)}
                                    className="trainer-gen-modal__select"
                                    style={{ flex: 1 }}
                                >
                                    <option value="random">Random Nature</option>
                                    {NATURES.filter((n) => n && n.trim() !== '').map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleRandomizeNature}
                                    title="Roll a random nature"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="trainer-gen-modal__grid--2col">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Stat & Skill Profile:
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Stat & Skill Profiles',
                                            desc: 'Biases point allocation towards specific thematic skill groups: Battler (physical/combat), Survivalist (nature/alert), Socialite (empathy/perform), Scholar (science/medicine), Mystic (throw/lore), or Balanced.'
                                        })
                                    }
                                />
                            </label>
                            <select
                                value={profile}
                                onChange={(e) => setProfile(e.target.value as TrainerProfileType | 'auto')}
                                className="trainer-gen-modal__select"
                            >
                                <option value="auto">Auto (Matches Selected Concept)</option>
                                <option value="battler">Battler / Athlete (STR/DEX, Brawl, Weapon)</option>
                                <option value="survivalist">Survivalist (DEX/INS, Nature, Alert, Stealth)</option>
                                <option value="socialite">Socialite (INS/DEX, Empathy, Etiquette, Perform)</option>
                                <option value="scholar">Scholar / Medic (INS/VIT, Science, Medicine, Lore)</option>
                                <option value="mystic">Mystic (INS/SPE, Throw/Channel, Lore)</option>
                                <option value="balanced">Balanced / All-Rounder</option>
                            </select>
                        </div>

                        {/* Special Trainer & Auto-Special Controls */}
                        <div className="trainer-gen-modal__field" style={{ justifyContent: 'center' }}>
                            <label className="trainer-gen-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isSpecialTrainer}
                                    onChange={(e) => setIsSpecialTrainer(e.target.checked)}
                                />
                                <span style={{ fontWeight: isSpecialTrainer ? 'bold' : 'normal' }}>
                                    Special Trainer (Enables Special Stat / SPE)
                                </span>
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Special Trainer',
                                            desc: 'In Pokerole, standard Trainers do not possess the Special attribute (SPE). Special Trainers (like Psychics, Channelers, or Aura users) gain Special starting at 1.'
                                        })
                                    }
                                />
                            </label>

                            <label className="trainer-gen-modal__checkbox-label" style={{ marginTop: '6px' }}>
                                <input
                                    type="checkbox"
                                    checked={autoSpecialForMystic}
                                    onChange={(e) => handleToggleAutoSpecial(e.target.checked)}
                                />
                                <span className="text-subtext">
                                    Auto-enable Special Trainer for Supernatural classes
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Badges Toggle */}
                    <div style={{ paddingTop: '4px' }}>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={assignBadges}
                                onChange={(e) => setAssignBadges(e.target.checked)}
                            />
                            <span>
                                <Award size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Assign Corebook Suggested Gym Badges for Rank (Standard: 1, Advanced: 4, Expert+: 8)
                            </span>
                        </label>
                    </div>
                </div>

                {/* 2. POKÉMON TEAM SECTION */}
                <div className="trainer-gen-modal__section">
                    <div className="trainer-gen-modal__section-header">
                        <label
                            className="trainer-gen-modal__checkbox-label"
                            style={{ fontSize: '0.95rem', fontWeight: 'bold' }}
                        >
                            <input
                                type="checkbox"
                                checked={generateTeam}
                                onChange={(e) => setGenerateTeam(e.target.checked)}
                            />
                            <span
                                className="text-title-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
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
                                <label
                                    className="trainer-gen-modal__field-label text-label"
                                    style={{ marginBottom: '4px' }}
                                >
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
                                                setTooltipInfo({
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
                                        <p
                                            className="text-subtext"
                                            style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.4 }}
                                        >
                                            {selectedConcept
                                                ? `Team will be drafted strictly from ${selectedConcept.name}'s signature types (${selectedConcept.typePreferences.join(', ')}) worldwide, without environmental habitat restrictions.`
                                                : conceptId === 'biome_match'
                                                  ? `Team will match the signature concept types of the rolled ${selectedTrainerBiomeDef?.name || 'biome'} class worldwide.`
                                                  : 'Team will automatically adapt to match the preferred signature types of the rolled trainer class worldwide.'}
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
                                                    Select Native Habitat / Biome:
                                                    <TooltipIcon
                                                        onClick={() =>
                                                            setTooltipInfo({
                                                                title: 'Native Habitat / Biome',
                                                                desc: 'Drafts wild Pokémon native to this specific habitat ecosystem, regardless of the trainer class.'
                                                            })
                                                        }
                                                    />
                                                </label>
                                                {selectedTeamBiomeDef && (
                                                    <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                                        Native Types:{' '}
                                                        <strong>{selectedTeamBiomeDef.types.join(', ')}</strong>
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
                                                        const randomB =
                                                            BIOMES[Math.floor(Math.random() * BIOMES.length)];
                                                        setTeamBiomeId(randomB.id);
                                                    }}
                                                    title="Roll and lock a specific random habitat"
                                                    className="action-button action-button--dark"
                                                    style={{ padding: '4px 8px' }}
                                                >
                                                    <Dices size={15} />
                                                </button>
                                            </div>
                                            <span
                                                className="text-subtext"
                                                style={{ fontSize: '0.75rem', marginTop: '3px', display: 'block' }}
                                            >
                                                {teamBiomeId === 'random' ? (
                                                    <>
                                                        A random habitat will be selected during generation, drafting
                                                        wild species native to that ecosystem.
                                                    </>
                                                ) : teamBiomeId === 'match_trainer' ? (
                                                    <>
                                                        Pokémon will be wild species native to{' '}
                                                        <strong>
                                                            {selectedTrainerBiomeDef
                                                                ? selectedTrainerBiomeDef.name
                                                                : "the trainer's rolled origin habitat"}
                                                        </strong>
                                                        .
                                                    </>
                                                ) : (
                                                    <>
                                                        Pokémon will be wild species native to{' '}
                                                        <strong>
                                                            {selectedTeamBiomeDef?.name || 'the selected habitat'}
                                                        </strong>
                                                        , reflecting the local route or dungeon fauna.
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
                                                        const randomB =
                                                            BIOMES[Math.floor(Math.random() * BIOMES.length)];
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
                                                        setTooltipInfo({
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
                                                        Pokémon strictly match trainer concept. The selected biome
                                                        serves as origin/theming.
                                                    </>
                                                )}
                                                {biomeConceptMixMode === 'biome_only' && (
                                                    <>
                                                        Pokémon strictly match{' '}
                                                        <strong>{selectedTeamBiomeDef?.name || 'biome'}</strong> native
                                                        types and habitat.
                                                    </>
                                                )}
                                                {biomeConceptMixMode === 'union' && (
                                                    <>
                                                        Pokémon pool expands to include both trainer concept types and{' '}
                                                        <strong>{selectedTeamBiomeDef?.name || 'biome'}</strong> types.
                                                    </>
                                                )}
                                                {biomeConceptMixMode === 'combo' && (
                                                    <>
                                                        Pokémon must share both trainer concept typing and{' '}
                                                        <strong>{selectedTeamBiomeDef?.name || 'biome'}</strong> typing
                                                        (e.g. Grass/Poison in Swamp).
                                                    </>
                                                )}
                                                {biomeConceptMixMode === 'split' && (
                                                    <>
                                                        Granularly select the generation mode for each individual
                                                        Pokémon slot below:
                                                    </>
                                                )}
                                            </div>

                                            {biomeConceptMixMode === 'split' && teamSize > 0 && (
                                                <div className="trainer-gen-modal__slot-mix-grid">
                                                    {Array.from({ length: teamSize }).map((_, slotIdx) => (
                                                        <div key={slotIdx} className="trainer-gen-modal__slot-mix-card">
                                                            <div className="trainer-gen-modal__slot-mix-header">
                                                                <span className="trainer-gen-modal__slot-mix-title text-title-secondary">
                                                                    Slot #{slotIdx + 1}
                                                                </span>
                                                            </div>
                                                            <select
                                                                value={customSlotMixModes[slotIdx] || 'concept_only'}
                                                                onChange={(e) =>
                                                                    handleSlotMixModeChange(
                                                                        slotIdx,
                                                                        e.target.value as SlotMixMode
                                                                    )
                                                                }
                                                                className="trainer-gen-modal__select trainer-gen-modal__slot-select"
                                                            >
                                                                <option value="concept_only">Concept Only</option>
                                                                <option value="biome_only">Biome Only</option>
                                                                <option value="union">Wider Pool (Both)</option>
                                                                <option value="combo">Combo Hybrid (Shared)</option>
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {teamThemeStrategy === 'custom' && (
                                    <div className="trainer-gen-modal__strategy-card">
                                        <div className="trainer-gen-modal__field">
                                            <label className="trainer-gen-modal__field-label text-label">
                                                Select Type Specialty:
                                                <TooltipIcon
                                                    onClick={() =>
                                                        setTooltipInfo({
                                                            title: 'Type Specialty',
                                                            desc: 'Determines the types of Pokémon chosen. Random Monotype picks 1 random type, Dual-Type picks 2 types, and Variety allows all types.'
                                                        })
                                                    }
                                                />
                                            </label>
                                            <select
                                                value={typeSpecialtyMode === 'concept' ? 'monotype' : typeSpecialtyMode}
                                                onChange={(e) =>
                                                    setTypeSpecialtyMode(e.target.value as typeof typeSpecialtyMode)
                                                }
                                                className="trainer-gen-modal__select"
                                            >
                                                <option value="monotype">Random Monotype (Single Type Team)</option>
                                                <option value="dual">Random Dual-Type (Two Types Mixed)</option>
                                                <option value="variety">High Variety (Any / All Types)</option>
                                                <option value="manual">Pick Specific Types Manually</option>
                                            </select>

                                            {typeSpecialtyMode === 'manual' && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <span
                                                        className="text-subtext"
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            display: 'block',
                                                            marginBottom: '4px'
                                                        }}
                                                    >
                                                        Select 1 or 2 Types ({manualTypes.length}/2):
                                                    </span>
                                                    <div className="trainer-gen-modal__type-grid">
                                                        {ALL_POKEMON_TYPES.map((t) => (
                                                            <div
                                                                key={t}
                                                                onClick={() => handleToggleManualType(t)}
                                                                className={`trainer-gen-modal__type-pill ${manualTypes.includes(t) ? 'trainer-gen-modal__type-pill--selected' : ''}`}
                                                            >
                                                                {t}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pokémon Build Tier */}
                            <div className="trainer-gen-modal__field" style={{ marginTop: '8px' }}>
                                <label className="trainer-gen-modal__field-label text-label">
                                    Pokémon Build Tier:
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
                                                title: 'Pokémon Build Tier',
                                                desc: 'Min-Max (Competent / Default): Evaluates base stats and limits to auto-detect whether the species is a Physical or Special attacker and smart defense bias (Evasion vs Clash), optimizing points for battle-readiness.\n\nAverage (Balanced): Distributes points evenly across attributes and skills for standard encounters.\n\nWild (Untrained): Completely randomizes stat and skill distribution, mimicking raw wild Pokémon.'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    value={buildType}
                                    onChange={(e) => setBuildType(e.target.value as 'minmax' | 'average' | 'wild')}
                                    className="trainer-gen-modal__select"
                                >
                                    <option value="minmax">Min-Max (Smart Bias / Competent)</option>
                                    <option value="average">Average (Balanced)</option>
                                    <option value="wild">Wild (Random / Untrained)</option>
                                </select>
                            </div>

                            {/* Pokémon Rank Rule */}
                            <div className="trainer-gen-modal__field" style={{ marginTop: '8px' }}>
                                <label className="trainer-gen-modal__field-label text-label">
                                    Pokémon Rank Rule:
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
                                                title: 'Pokémon Rank Rules',
                                                desc: 'Match Trainer: Gives all Pokémon the exact same rank as the Trainer.\n\nRandom Ranks: Varied ranks with an optional obedience guard.\n\nSpecify Per Pokémon: Gives individual dropdowns for each slot on the team (e.g. 3 Standard and 3 Rookie).'
                                            })
                                        }
                                    />
                                </label>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '14px',
                                        alignItems: 'center',
                                        marginTop: '4px',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <label className="trainer-gen-modal__checkbox-label">
                                        <input
                                            type="radio"
                                            name="teamRankMode"
                                            checked={teamRankMode === 'match_trainer'}
                                            onChange={() => setTeamRankMode('match_trainer')}
                                        />
                                        <span>Match Trainer</span>
                                    </label>
                                    <label className="trainer-gen-modal__checkbox-label">
                                        <input
                                            type="radio"
                                            name="teamRankMode"
                                            checked={teamRankMode === 'random'}
                                            onChange={() => setTeamRankMode('random')}
                                        />
                                        <span>Random Ranks</span>
                                    </label>
                                    <label className="trainer-gen-modal__checkbox-label">
                                        <input
                                            type="radio"
                                            name="teamRankMode"
                                            checked={teamRankMode === 'custom'}
                                            onChange={() => setTeamRankMode('custom')}
                                        />
                                        <span>Specify Per Pokémon</span>
                                    </label>
                                </div>

                                {teamRankMode === 'random' && (
                                    <label className="trainer-gen-modal__checkbox-label" style={{ marginTop: '6px' }}>
                                        <input
                                            type="checkbox"
                                            checked={capPokemonRank}
                                            onChange={(e) => setCapPokemonRank(e.target.checked)}
                                        />
                                        <span className="text-subtext">
                                            Cap Rank ≤ Trainer Rank (Prevents Disobedience)
                                        </span>
                                    </label>
                                )}

                                {teamRankMode === 'custom' && (
                                    <div
                                        style={{
                                            marginTop: '8px',
                                            padding: '10px 12px',
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        <span
                                            className="text-subtext"
                                            style={{ display: 'block', marginBottom: '8px', fontSize: '0.78rem' }}
                                        >
                                            Select rank for each Pokémon slot in the party:
                                        </span>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                gap: '8px'
                                            }}
                                        >
                                            {Array.from({ length: teamSize }).map((_, slotIdx) => (
                                                <div
                                                    key={slotIdx}
                                                    style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                                                >
                                                    <span className="text-label" style={{ fontSize: '0.75rem' }}>
                                                        Slot {slotIdx + 1} Rank:
                                                    </span>
                                                    <select
                                                        value={
                                                            customPokemonRanks[slotIdx] ||
                                                            (rank !== 'random' ? rank : 'Starter')
                                                        }
                                                        onChange={(e) =>
                                                            handleCustomRankChange(slotIdx, e.target.value as Rank)
                                                        }
                                                        className="trainer-gen-modal__select"
                                                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
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
                                    </div>
                                )}
                            </div>

                            {/* Evolutionary Filters */}
                            <div className="trainer-gen-modal__grid--2col">
                                <div className="trainer-gen-modal__field">
                                    <label className="trainer-gen-modal__field-label text-label">
                                        Evolution Line Length:
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Evolution Line Length',
                                                    desc: 'Filter Pokémon based on how many stages exist in their evolutionary family (e.g. Kangaskhan is Single-Stage; Lucario is 2-Stage; Charizard is 3-Stage).'
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
                                                setTooltipInfo({
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
                                            <Sparkles
                                                size={14}
                                                style={{ verticalAlign: 'middle', marginRight: '4px' }}
                                            />
                                            Scale Pokémon Loyalty & Happiness with Rank
                                        </span>
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
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
                                                setTooltipInfo({
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

                {/* 3. TOKEN ARTWORK SECTION (Owlbear Rodeo Mode) */}
                {!isStandaloneMode && (
                    <div className="trainer-gen-modal__section">
                        <div className="trainer-gen-modal__section-header">
                            <h3 className="trainer-gen-modal__section-title text-title-primary">
                                <ImageIcon size={16} color="var(--primary)" /> Token Artwork & Images
                            </h3>
                            <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                                Owlbear Rodeo Assets
                            </span>
                        </div>

                        <div className="trainer-gen-modal__grid--2col">
                            <div className="trainer-gen-modal__field">
                                <label className="trainer-gen-modal__field-label text-label">
                                    Artwork Strategy:
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
                                                title: 'Token Artwork Strategy',
                                                desc: 'Default Image: Applies a chosen library image to all generated tokens that are not already auto-matched from the scene.\n\nPrompt Each Token: Opens your OBR library for each token with its species/trainer name pre-filled in search.\n\nPokéball Icon: Uses the standard Pokéball SVG.'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    value={tokenImageMode}
                                    onChange={(e) =>
                                        setTokenImageMode(
                                            e.target.value as 'default' | 'prompt_each' | 'fallback_pokeball'
                                        )
                                    }
                                    className="trainer-gen-modal__select"
                                >
                                    <option value="default">Use Default Image for Tokens</option>
                                    <option value="prompt_each">Prompt for Each Token (Pre-fills Name)</option>
                                    <option value="fallback_pokeball">Use Default Pokéball Icon</option>
                                </select>
                            </div>

                            <div className="trainer-gen-modal__field">
                                <label className="trainer-gen-modal__field-label text-label">
                                    Default Image Asset:
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '34px' }}>
                                    {defaultImage ? (
                                        <>
                                            <img
                                                src={defaultImage.url}
                                                alt="Default token preview"
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '4px',
                                                    objectFit: 'cover',
                                                    border: '1px solid var(--border)'
                                                }}
                                            />
                                            <span
                                                className="text-subtext"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title={defaultImage.name || 'Selected Image'}
                                            >
                                                {defaultImage.name || 'Selected Asset'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handlePickDefaultImage}
                                                className="action-button action-button--dark"
                                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                title="Choose a different image from library"
                                            >
                                                Change
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDefaultImage(null)}
                                                className="action-button action-button--dark"
                                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                title="Clear default image"
                                            >
                                                Clear
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handlePickDefaultImage}
                                            className="action-button action-button--dark"
                                            style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                                        >
                                            <Upload size={14} /> Choose Default Image from OBR Library
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label className="trainer-gen-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={autoMatchSceneImages}
                                    onChange={(e) => setAutoMatchSceneImages(e.target.checked)}
                                />
                                <span>
                                    Auto-match images from existing tokens on map (e.g. if 'Kingler' is on the scene,
                                    reuse its art)
                                </span>
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Auto-Match Scene Tokens',
                                            desc: 'Scans active tokens currently placed on the Owlbear map to automatically reuse existing artwork. Due to Owlbear Rodeo SDK limitations, extensions cannot silently query or browse your asset library in the background without opening the interactive file picker, making scanning the active scene the only automated solution available.'
                                        })
                                    }
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Destination Switch */}
                <div className="trainer-gen-modal__section" style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="trainer-gen-modal__field-label text-label">
                            {isStandaloneMode ? 'Destination in Sidebar:' : 'Token Destination:'}
                        </span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label className="trainer-gen-modal__checkbox-label">
                                <input
                                    type="radio"
                                    name="destination"
                                    checked={destination === 'new'}
                                    onChange={() => setDestination('new')}
                                />
                                <span>
                                    {isStandaloneMode ? 'Create New Sheet (Nested Team)' : 'Spawn New Token(s)'}
                                </span>
                            </label>
                            {(!generateTeam || teamSize === 0) && (
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="radio"
                                        name="destination"
                                        checked={destination === 'overwrite'}
                                        onChange={() => setDestination('overwrite')}
                                    />
                                    <span>
                                        {isStandaloneMode ? 'Overwrite Active Sheet' : 'Overwrite Selected Token'}
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>

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
