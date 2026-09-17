import { useState, useEffect } from 'react';
import {
    UserCheck,
    XCircle,
    Dices,
    Hourglass,
    Award,
    Shield,
    Sparkles,
    Flame
} from 'lucide-react';
import { TooltipIcon } from '../ui/TooltipIcon';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NATURES } from '../../data/constants';
import {
    TRAINER_CLASSES,
    SAMPLE_FIRST_NAMES,
    type TrainerProfileType
} from '../../data/trainerClasses';
import {
    RANK_ORDER,
    ALL_POKEMON_TYPES,
    generateFullTrainerTeam,
    type TrainerGeneratorConfig,
    type PokedexLookupItem
} from '../../utils/trainerGeneratorLogic';
import { spawnTrainerAndTeam } from '../../utils/trainerTokenSpawner';
import { fetchPokemonLookupIndex } from '../../utils/api';
import { isStandaloneMode } from '../../utils/storageAdapter';
import type { Rank } from '../../store/entityTypes';
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
    const [assignBadges, setAssignBadges] = useState<boolean>(true);

    // Pokémon Team Form State
    const [generateTeam, setGenerateTeam] = useState<boolean>(true);
    const [teamSize, setTeamSize] = useState<number>(3);
    const [typeSpecialtyMode, setTypeSpecialtyMode] = useState<'concept' | 'monotype' | 'dual' | 'variety' | 'manual'>('concept');
    const [manualTypes, setManualTypes] = useState<string[]>([]);
    const [teamRankMode, setTeamRankMode] = useState<'match_trainer' | 'random'>('match_trainer');
    const [capPokemonRank, setCapPokemonRank] = useState<boolean>(true);

    // Evolution Stage Filters
    const [allowedLineLengths, setAllowedLineLengths] = useState<number[]>([1, 2, 3]);
    const [allowedStageIndices, setAllowedStageIndices] = useState<number[]>([1, 2, 3]);

    // Exclusions
    const [includeLegendaries, setIncludeLegendaries] = useState<boolean>(false);
    const [includeMythicals, setIncludeMythicals] = useState<boolean>(false);
    const [includeMegas, setIncludeMegas] = useState<boolean>(false);

    // Loyalty / Happiness Scaling
    const [scaleLoyaltyHappiness, setScaleLoyaltyHappiness] = useState<boolean>(true);

    // Destination (Standalone mode)
    const [destination, setDestination] = useState<'new' | 'overwrite'>('new');

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

    const handleToggleAutoSpecial = (enabled: boolean) => {
        setAutoSpecialForMystic(enabled);
        if (enabled) {
            const chosen = TRAINER_CLASSES.find((c) => c.id === conceptId);
            if (chosen && chosen.isSupernatural) {
                setIsSpecialTrainer(true);
            }
        }
    };

    const handleRandomizeName = () => {
        const randomName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
        setTrainerName(randomName);
    };

    const handleRandomizeConcept = () => {
        const randomClass = TRAINER_CLASSES[Math.floor(Math.random() * TRAINER_CLASSES.length)];
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
        setAllowedLineLengths((prev) =>
            prev.includes(len) ? (prev.length > 1 ? prev.filter((l) => l !== len) : prev) : [...prev, len]
        );
    };

    const handleToggleStageIndex = (stage: number) => {
        setAllowedStageIndices((prev) =>
            prev.includes(stage) ? (prev.length > 1 ? prev.filter((s) => s !== stage) : prev) : [...prev, stage]
        );
    };

    const handleToggleManualType = (t: string) => {
        setManualTypes((prev) => {
            if (prev.includes(t)) {
                return prev.filter((x) => x !== t);
            }
            if (prev.length >= 2) {
                return [prev[1], t];
            }
            return [...prev, t];
        });
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
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
                typeSpecialtyMode,
                manualTypes,
                teamRankMode,
                capPokemonRank,
                allowedLineLengths,
                allowedStageIndices,
                includeLegendaries,
                includeMythicals,
                includeMegas,
                scaleLoyaltyHappiness
            };

            const result = await generateFullTrainerTeam(config, store, pokedexLookup);
            await spawnTrainerAndTeam(result, destination);
            onClose();
        } catch (error) {
            console.error('[TrainerGeneratorModal] Generation failed:', error);
            alert('Failed to generate trainer. See console for details.');
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedConcept = TRAINER_CLASSES.find((c) => c.id === conceptId);

    return (
        <div className="trainer-gen-modal__overlay">
            <div className="trainer-gen-modal__content">
                {/* Modal Header */}
                <div className="trainer-gen-modal__header">
                    <h2 className="trainer-gen-modal__title text-title-primary">
                        <UserCheck size={22} color="var(--primary)" /> Trainer & Team Generator
                    </h2>
                    <p className="trainer-gen-modal__subtitle text-subtext">
                        Create full Pokerole Trainer sheets and generate matching battle teams in one click.
                    </p>
                </div>

                {/* 1. TRAINER IDENTITY SECTION */}
                <div className="trainer-gen-modal__section">
                    <div className="trainer-gen-modal__section-header">
                        <h3 className="trainer-gen-modal__section-title text-title-primary">
                            <Shield size={16} color="var(--primary)" /> Trainer Identity
                        </h3>
                        <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                            Core Concept & Attributes
                        </span>
                    </div>

                    <div className="trainer-gen-modal__grid--2col">
                        <div className="trainer-gen-modal__field">
                            <label className="trainer-gen-modal__field-label text-label">
                                Trainer Concept / Class:
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Trainer Class / Concept',
                                            desc: 'Select an iconic Pokémon trainer class. Classes come with natural type preferences, typical ranks, and suggested stat/skill profiles.'
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
                                    <option value="random">Random Concept</option>
                                    <option value="none">Custom / Independent Trainer</option>
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
                                    title="Roll a random concept"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="trainer-gen-modal__field">
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
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input
                                    type="text"
                                    value={trainerName}
                                    onChange={(e) => setTrainerName(e.target.value)}
                                    placeholder={selectedConcept ? selectedConcept.name : 'e.g. Ace Trainer (default)'}
                                    className="trainer-gen-modal__input"
                                />
                                <button
                                    type="button"
                                    onClick={handleRandomizeName}
                                    title="Roll a random first name"
                                    className="action-button action-button--dark"
                                    style={{ padding: '4px 8px' }}
                                >
                                    <Dices size={15} />
                                </button>
                            </div>
                        </div>
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
                                    onChange={(e) => setAge(e.target.value as 'Child' | 'Teen' | 'Adult' | 'Senior' | 'random')}
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
                                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Non-Binary' | 'random')}
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
                        <label className="trainer-gen-modal__checkbox-label" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                            <input
                                type="checkbox"
                                checked={generateTeam}
                                onChange={(e) => setGenerateTeam(e.target.checked)}
                            />
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
                            {/* Team Size Slider & Presets */}
                            <div className="trainer-gen-modal__field">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="trainer-gen-modal__field-label text-label">
                                        Team Size ({teamSize} Pokémon):
                                    </label>
                                    <div className="trainer-gen-modal__presets">
                                        <button
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${teamSize === 0 ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setTeamSize(0)}
                                        >
                                            None (0)
                                        </button>
                                        <button
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${teamSize === 1 ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setTeamSize(1)}
                                        >
                                            Solo (1)
                                        </button>
                                        <button
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${teamSize === 2 ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setTeamSize(2)}
                                        >
                                            Duo (2)
                                        </button>
                                        <button
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${teamSize === 3 ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setTeamSize(3)}
                                        >
                                            Trio (3)
                                        </button>
                                        <button
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${teamSize === 4 ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setTeamSize(4)}
                                        >
                                            Squad (4)
                                        </button>
                                        <button
                                            type="button"
                                            className={`trainer-gen-modal__preset-btn ${teamSize === 6 ? 'trainer-gen-modal__preset-btn--active' : ''}`}
                                            onClick={() => setTeamSize(6)}
                                        >
                                            Full (6)
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={6}
                                    value={teamSize}
                                    onChange={(e) => setTeamSize(Number(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '4px' }}
                                />
                            </div>

                            {/* Type Specialty & Rank Rules */}
                            <div className="trainer-gen-modal__grid--2col">
                                <div className="trainer-gen-modal__field">
                                    <label className="trainer-gen-modal__field-label text-label">
                                        Type Specialty:
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Type Specialty',
                                                    desc: 'Determines the types of Pokémon chosen. Concept Default uses the class preference (e.g. Flying for Bird Keeper). Random Monotype picks 1 random type, Dual-Type picks 2 types, and Variety allows all types.'
                                                })
                                            }
                                        />
                                    </label>
                                    <select
                                        value={typeSpecialtyMode}
                                        onChange={(e) => setTypeSpecialtyMode(e.target.value as typeof typeSpecialtyMode)}
                                        className="trainer-gen-modal__select"
                                    >
                                        <option value="concept">Concept Default {selectedConcept ? `(${selectedConcept.typePreferences.join(', ')})` : ''}</option>
                                        <option value="monotype">Random Monotype (Single Type Team)</option>
                                        <option value="dual">Random Dual-Type (Two Types Mixed)</option>
                                        <option value="variety">High Variety (Any / All Types)</option>
                                        <option value="manual">Pick Specific Types</option>
                                    </select>
                                </div>

                                <div className="trainer-gen-modal__field">
                                    <label className="trainer-gen-modal__field-label text-label">
                                        Pokémon Rank Rule:
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Pokémon Rank Rules',
                                                    desc: 'Match Trainer Rank gives all Pokémon the exact same rank as the Trainer. Randomized Ranks picks varied ranks. The obedience guard ensures no Pokémon exceeds the Trainer rank.'
                                                })
                                            }
                                        />
                                    </label>
                                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '4px' }}>
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
                                    </div>
                                    {teamRankMode === 'random' && (
                                        <label className="trainer-gen-modal__checkbox-label" style={{ marginTop: '4px' }}>
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
                                </div>
                            </div>

                            {/* Manual Type Picker (if manual selected) */}
                            {typeSpecialtyMode === 'manual' && (
                                <div className="trainer-gen-modal__field">
                                    <label className="trainer-gen-modal__field-label text-label">
                                        Select 1 or 2 Types:
                                    </label>
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
                                            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
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
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Standalone Destination Switch */}
                {isStandaloneMode && (
                    <div className="trainer-gen-modal__section" style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="trainer-gen-modal__field-label text-label">
                                Destination in Sidebar:
                            </span>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label className="trainer-gen-modal__checkbox-label">
                                    <input
                                        type="radio"
                                        name="destination"
                                        checked={destination === 'new'}
                                        onChange={() => setDestination('new')}
                                    />
                                    <span>Create New Sheet (Nested Team)</span>
                                </label>
                                {(!generateTeam || teamSize === 0) && (
                                    <label className="trainer-gen-modal__checkbox-label">
                                        <input
                                            type="radio"
                                            name="destination"
                                            checked={destination === 'overwrite'}
                                            onChange={() => setDestination('overwrite')}
                                        />
                                        <span>Overwrite Active Sheet</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
