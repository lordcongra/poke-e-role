import React from 'react';
import { Shield, Dices, Sparkles, Award } from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { BIOMES, BIOME_MAP, getTrainerClassesForBiome } from '../../../data/biomeData';
import { TRAINER_CLASSES, type TrainerProfileType } from '../../../data/trainerClasses';
import { NATURES } from '../../../data/constants';
import { RANK_ORDER } from '../../../utils/trainerGeneratorLogic';
import type { Rank } from '../../../store/entityTypes';
import './TrainerGeneratorModal.css';

export interface TrainerIdentitySectionProps {
    trainerBiomeId: string;
    setTrainerBiomeId: (id: string) => void;
    conceptId: string;
    setConceptId: (id: string) => void;
    trainerName: string;
    setTrainerName: (name: string) => void;
    rank: Rank | 'random';
    setRank: (rank: Rank | 'random') => void;
    age: 'Child' | 'Teen' | 'Adult' | 'Senior' | 'random';
    setAge: (age: 'Child' | 'Teen' | 'Adult' | 'Senior' | 'random') => void;
    gender: 'Male' | 'Female' | 'Non-Binary' | 'random';
    setGender: (gender: 'Male' | 'Female' | 'Non-Binary' | 'random') => void;
    nature: string;
    setNature: (nature: string) => void;
    profile: TrainerProfileType | 'auto';
    setProfile: (profile: TrainerProfileType | 'auto') => void;
    isSpecialTrainer: boolean;
    setIsSpecialTrainer: (val: boolean) => void;
    autoSpecialForMystic: boolean;
    setAutoSpecialForMystic: (val: boolean) => void;
    assignBadges: boolean;
    setAssignBadges: (val: boolean) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export const TrainerIdentitySection: React.FC<TrainerIdentitySectionProps> = ({
    trainerBiomeId,
    setTrainerBiomeId,
    conceptId,
    setConceptId,
    trainerName,
    setTrainerName,
    rank,
    setRank,
    age,
    setAge,
    gender,
    setGender,
    nature,
    setNature,
    profile,
    setProfile,
    isSpecialTrainer,
    setIsSpecialTrainer,
    autoSpecialForMystic,
    setAutoSpecialForMystic,
    assignBadges,
    setAssignBadges,
    onOpenTooltip
}) => {
    const selectedConcept = TRAINER_CLASSES.find((c) => c.id === conceptId);
    const selectedTrainerBiomeDef =
        trainerBiomeId !== 'none' && trainerBiomeId !== 'random' ? BIOME_MAP[trainerBiomeId] : null;
    const biomeClasses =
        trainerBiomeId !== 'none' && trainerBiomeId !== 'random' ? getTrainerClassesForBiome(trainerBiomeId) : [];

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

    return (
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
                                onOpenTooltip({
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
                                onOpenTooltip({
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
                                <optgroup label={`Thematic for ${selectedTrainerBiomeDef?.name || 'Selected Biome'}`}>
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
                            <Sparkles size={13} /> Thematic Trainer Concepts for {selectedTrainerBiomeDef?.name}:
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
                                background: conceptId === 'biome_match' ? 'var(--primary)' : 'rgba(0, 0, 0, 0.25)',
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
                                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
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
                            onOpenTooltip({
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
                                onOpenTooltip({
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
                                onOpenTooltip({
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
                                onOpenTooltip({
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
                                onOpenTooltip({
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
                        <span className="text-subtext">Auto-enable Special Trainer for Supernatural classes</span>
                    </label>
                </div>
            </div>

            {/* Badges Toggle */}
            <div style={{ paddingTop: '4px' }}>
                <label className="trainer-gen-modal__checkbox-label">
                    <input type="checkbox" checked={assignBadges} onChange={(e) => setAssignBadges(e.target.checked)} />
                    <span>
                        <Award size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Assign Corebook Suggested Gym Badges for Rank (Standard: 1, Advanced: 4, Expert+: 8)
                    </span>
                </label>
            </div>
        </div>
    );
};
