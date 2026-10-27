import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dices, X, Shuffle, Swords, Target, Sparkles } from 'lucide-react';
import type { MoveData } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { fetchMoveLookupIndex } from '../../../utils/api/api';
import type { MoveLookupEntry } from '../../../utils/api/apiTypes';
import { TYPE_COLORS } from '../../../data/constants';
import { rollDicePlus } from '../../../utils/combat/diceRoller';
import { rollAccuracy, executeDamageRoll } from '../../../utils/combat/combatRoller';
import { calculateBaseDamage } from '../../../utils/combat/combatUtils';
import { synthesizeMetronomeMove } from '../../../utils/combat/copyMoveUtils';
import { NumberSpinner } from '../../ui/NumberSpinner';
import './MetronomeModal.css';

export interface MetronomeModalProps {
    metronomeMove: MoveData;
    onClose: () => void;
    onRollDamage: (move: MoveData) => void;
}

export function MetronomeModal({ metronomeMove, onClose, onRollDamage }: MetronomeModalProps) {
    const [allLookupMoves, setAllLookupMoves] = useState<MoveLookupEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [categoryDie, setCategoryDie] = useState<number | null>(null);
    const [powerDie, setPowerDie] = useState<number | null>(null);
    const [category, setCategory] = useState<'Physical' | 'Special'>('Physical');
    const [power, setPower] = useState<number>(3);

    const [selectedMove, setSelectedMove] = useState<MoveLookupEntry | null>(null);
    const [searchFilter, setSearchFilter] = useState('');

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const combinedColors: Record<string, string> = useMemo(() => {
        return {
            ...TYPE_COLORS,
            ...Object.fromEntries(roomCustomTypes.map((type) => [type.name, type.color]))
        };
    }, [roomCustomTypes]);

    const getTypeColor = (type?: string) => {
        if (!type) return 'var(--panel-alt)';
        const clean = type.trim();
        const title = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        return combinedColors[clean] || combinedColors[title] || 'var(--panel-alt)';
    };

    // Load move lookup catalog on mount
    useEffect(() => {
        let isMounted = true;
        fetchMoveLookupIndex()
            .then((entries) => {
                if (isMounted) {
                    setAllLookupMoves(entries);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error('[MetronomeModal] Failed to load move lookup index:', err);
                if (isMounted) setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // Filter candidate moves matching category and power
    const candidateMoves = useMemo(() => {
        if (!allLookupMoves.length) return [];
        return allLookupMoves.filter((entry) => {
            const entryCat = String(entry.category || '').toLowerCase();
            const matchesCat = category === 'Physical' ? entryCat.includes('phys') : entryCat.includes('spec');
            const entryPower = typeof entry.power === 'number' ? entry.power : parseInt(String(entry.power || '0'), 10);
            const matchesPower = entryPower === power;
            const notSelf = entry.name.toLowerCase() !== 'metronome';
            return matchesCat && matchesPower && notSelf;
        });
    }, [allLookupMoves, category, power]);

    // Filtered candidates by search input
    const displayCandidates = useMemo(() => {
        if (!searchFilter.trim()) return candidateMoves;
        const q = searchFilter.toLowerCase().trim();
        return candidateMoves.filter((m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q));
    }, [candidateMoves, searchFilter]);

    // Roll random move from current candidate pool
    const pickRandomCandidate = useCallback(
        (pool = candidateMoves) => {
            if (!pool.length) {
                setSelectedMove(null);
                return;
            }
            const randomIndex = Math.floor(Math.random() * pool.length);
            setSelectedMove(pool[randomIndex]);
        },
        [candidateMoves]
    );

    // Roll Category 1d6: 1-3 Physical, 4-6 Special
    const handleRollCategory = () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setCategoryDie(roll);
        const newCat: 'Physical' | 'Special' = roll <= 3 ? 'Physical' : 'Special';
        setCategory(newCat);
    };

    // Roll Power 1d6: 1-6
    const handleRollPower = () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setPowerDie(roll);
        setPower(roll);
    };

    // Roll both Category and Power, and pick a random candidate
    const handleRollBoth = async () => {
        const catRoll = Math.floor(Math.random() * 6) + 1;
        const pwrRoll = Math.floor(Math.random() * 6) + 1;
        setCategoryDie(catRoll);
        setPowerDie(pwrRoll);

        const newCat: 'Physical' | 'Special' = catRoll <= 3 ? 'Physical' : 'Special';
        setCategory(newCat);
        setPower(pwrRoll);

        const state = useCharacterStore.getState();
        const nickname = state.identity.nickname || state.identity.species || 'Pokémon';
        await rollDicePlus(
            `1d6+1d6`,
            `[Metronome Roll] ${nickname} waves their hands in rhythm! (Category Die: ${catRoll} -> ${newCat}, Power Die: ${pwrRoll} -> Power ${pwrRoll})`
        );

        // Find candidate from full dataset immediately
        const freshCandidates = allLookupMoves.filter((entry) => {
            const entryCat = String(entry.category || '').toLowerCase();
            const matchesCat = newCat === 'Physical' ? entryCat.includes('phys') : entryCat.includes('spec');
            const entryPower = typeof entry.power === 'number' ? entry.power : parseInt(String(entry.power || '0'), 10);
            return matchesCat && entryPower === pwrRoll && entry.name.toLowerCase() !== 'metronome';
        });

        if (freshCandidates.length > 0) {
            const chosen = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
            setSelectedMove(chosen);
        } else {
            setSelectedMove(null);
        }
    };

    // Ephemeral synthesized move for rolling
    const synthesizedMove: MoveData | null = useMemo(() => {
        if (!selectedMove) return null;
        return synthesizeMetronomeMove(metronomeMove, selectedMove, category, power);
    }, [metronomeMove, selectedMove, category, power]);

    const handleAccuracyRoll = () => {
        if (!synthesizedMove) return;
        rollAccuracy(synthesizedMove, useCharacterStore.getState());
    };

    const handleTargetAndDamage = () => {
        if (!synthesizedMove) return;
        onRollDamage(synthesizedMove);
        onClose();
    };

    const handleQuickDamage = () => {
        if (!synthesizedMove) return;
        const state = useCharacterStore.getState();
        const baseDamage = calculateBaseDamage(synthesizedMove, state);
        executeDamageRoll(synthesizedMove, state, baseDamage, false, 1, 0, {
            active: false,
            type: 'flat',
            value: 0
        });
        onClose();
    };

    return (
        <div className="metronome-modal__overlay" onClick={onClose}>
            <div className="metronome-modal__content" onClick={(e) => e.stopPropagation()}>
                <div className="metronome-modal__header">
                    <h3 className="metronome-modal__title text-title-primary" style={{ color: 'var(--primary)' }}>
                        <Dices size={20} /> Metronome Resolution
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="metronome-modal__close-btn"
                        aria-label="Close dialog"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="metronome-modal__desc text-subtext">
                    "Roll a die to determine Physical or Special category, roll a die to determine this Move's Power.
                    The appearance, Type and added effects become the same of a Move of that Power at Storyteller's
                    Discretion."
                </p>

                <div className="metronome-modal__steps-grid">
                    {/* Step 1: Category */}
                    <div className="metronome-modal__step-card">
                        <div className="metronome-modal__step-header">
                            <span>Step 1: Category</span>
                            {categoryDie !== null && (
                                <span className="metronome-modal__die-badge">1d6: {categoryDie}</span>
                            )}
                        </div>
                        <div className="metronome-modal__step-actions">
                            <button
                                type="button"
                                onClick={handleRollCategory}
                                className="action-button action-button--dark text-theme-header"
                                title="Roll 1d6 (1-3 Phys, 4-6 Spec)"
                            >
                                <Dices size={14} /> Roll 1d6
                            </button>
                        </div>
                        <div className="metronome-modal__segmented-control">
                            <button
                                type="button"
                                className={`metronome-modal__segmented-btn ${category === 'Physical' ? 'metronome-modal__segmented-btn--active' : ''}`}
                                onClick={() => setCategory('Physical')}
                            >
                                Physical (1–3)
                            </button>
                            <button
                                type="button"
                                className={`metronome-modal__segmented-btn ${category === 'Special' ? 'metronome-modal__segmented-btn--active' : ''}`}
                                onClick={() => setCategory('Special')}
                            >
                                Special (4–6)
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Power */}
                    <div className="metronome-modal__step-card">
                        <div className="metronome-modal__step-header">
                            <span>Step 2: Power</span>
                            {powerDie !== null && <span className="metronome-modal__die-badge">1d6: {powerDie}</span>}
                        </div>
                        <div className="metronome-modal__step-actions">
                            <button
                                type="button"
                                onClick={handleRollPower}
                                className="action-button action-button--dark text-theme-header"
                                title="Roll 1d6 (Power 1-6)"
                            >
                                <Dices size={14} /> Roll 1d6
                            </button>
                            <NumberSpinner value={power} onChange={(val) => setPower(Math.max(1, Math.min(6, val)))} />
                        </div>
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Power {power} (Roll: 1–6)
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleRollBoth}
                    className="action-button action-button--theme metronome-modal__roll-both-btn text-theme-header"
                >
                    <Sparkles size={16} /> Roll Both (Category + Power + Random Move)
                </button>

                {/* Step 3 & 4: Storyteller Discretion */}
                <div className="metronome-modal__discretion-section">
                    <div className="metronome-modal__discretion-header">
                        <span className="text-label" style={{ fontWeight: 600 }}>
                            Step 3 & 4: Storyteller Selection
                        </span>
                        <span className="metronome-modal__candidate-count">
                            {isLoading ? 'Loading catalog...' : `${candidateMoves.length} moves match`}
                        </span>
                    </div>

                    <div className="metronome-modal__discretion-controls">
                        <button
                            type="button"
                            onClick={() => pickRandomCandidate()}
                            disabled={!candidateMoves.length || isLoading}
                            className="action-button action-button--dark text-theme-header"
                            title="Roll Random Candidate"
                        >
                            <Shuffle size={14} /> Roll Random
                        </button>

                        <input
                            type="text"
                            placeholder="Search matching moves..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="metronome-modal__search-input"
                        />
                    </div>

                    {displayCandidates.length > 0 && !selectedMove && (
                        <select
                            className="form-select--bordered text-label"
                            onChange={(e) => {
                                const found = candidateMoves.find((m) => m.name === e.target.value);
                                if (found) setSelectedMove(found);
                            }}
                            defaultValue=""
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)' }}
                        >
                            <option value="" disabled>
                                -- Pick a move from the matching pool ({displayCandidates.length}) --
                            </option>
                            {displayCandidates.map((m) => (
                                <option key={m.name} value={m.name}>
                                    [{m.type}] {m.name} (Power {m.power})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Step 4: Preview Card */}
                    {selectedMove && (
                        <div className="metronome-modal__preview-card">
                            <div className="metronome-modal__preview-title-row">
                                <span className="metronome-modal__preview-name">{selectedMove.name}</span>
                                <div className="metronome-modal__preview-badges">
                                    <span
                                        className="metronome-modal__type-pill"
                                        style={{ background: getTypeColor(selectedMove.type) }}
                                    >
                                        {selectedMove.type}
                                    </span>
                                    <span className="metronome-modal__cat-pill">{category}</span>
                                    <span className="metronome-modal__cat-pill">Power {power}</span>
                                </div>
                            </div>

                            <div className="metronome-modal__stats-row">
                                <span>
                                    <b>Accuracy:</b> Insight + Perform
                                </span>
                                <span>
                                    <b>Damage:</b> {power} +{' '}
                                    {selectedMove.damage1
                                        ? selectedMove.damage1
                                        : category === 'Special'
                                          ? 'SPE'
                                          : 'STR'}
                                </span>
                            </div>

                            {(selectedMove.effect || selectedMove.description) && (
                                <p className="metronome-modal__preview-desc">
                                    {selectedMove.effect || selectedMove.description}
                                </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMove(null)}
                                    className="action-button action-button--dark text-theme-header"
                                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                                >
                                    Change Move
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 5: Roll Execution */}
                <div className="metronome-modal__footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark text-theme-header"
                    >
                        Cancel
                    </button>
                    {synthesizedMove && (
                        <>
                            <button
                                type="button"
                                onClick={handleAccuracyRoll}
                                className="action-button action-button--dark text-theme-header"
                                title="Roll Accuracy (Insight + Perform)"
                            >
                                <Target size={15} /> Roll Accuracy
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickDamage}
                                className="action-button action-button--dark text-theme-header"
                                title="Direct Damage Roll without Target Selection"
                            >
                                <Swords size={15} /> Quick Dmg
                            </button>
                            <button
                                type="button"
                                onClick={handleTargetAndDamage}
                                className="action-button action-button--theme text-theme-header"
                                title="Open Target Selection & Roll Damage"
                            >
                                <Swords size={15} /> Target & Roll Dmg
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
