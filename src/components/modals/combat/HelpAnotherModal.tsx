import React, { useState, useEffect, useMemo } from 'react';
import { Users, X, Dices, AlertCircle } from 'lucide-react';
import type { MoveData } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ALL_MOVES, loadLocalDataset, fetchMoveData } from '../../../utils/api/api';
import type { MoveApiResponse } from '../../../utils/api/apiTypes';
import { TYPE_COLORS } from '../../../data/constants';
import { extractMoveFields, mapAttrOptions, mapSkillOptions } from '../../../utils/combat/copyMoveUtils';
import {
    calculateBaseAccuracy,
    calculateStatTotal,
    calculateSkillTotal,
    getAbilityText,
    parseCombatTags
} from '../../../utils/combat/combatMath';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { rollDicePlus } from '../../../utils/combat/diceRoller';
import { NumberSpinner } from '../../ui/NumberSpinner';
import './HelpAnotherModal.css';

export interface HelpAnotherModalProps {
    onClose: () => void;
}

export const HelpAnotherModal: React.FC<HelpAnotherModalProps> = ({ onClose }) => {
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const role = useCharacterStore((state) => state.role);

    const [searchTerm, setSearchTerm] = useState('');
    const [targetMoveData, setTargetMoveData] = useState<MoveApiResponse | null>(null);
    const [isLoadingMove, setIsLoadingMove] = useState(false);
    const [selectedAcc1, setSelectedAcc1] = useState<string>('');
    const [selectedAcc2, setSelectedAcc2] = useState<string>('');
    const [situationalMod, setSituationalMod] = useState<number>(0);

    // Ensure datasets are loaded
    useEffect(() => {
        if (ALL_MOVES.length === 0) {
            loadLocalDataset().catch((err) => console.error('[HelpAnotherModal] Failed to load dataset:', err));
        }
    }, []);

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

    const allMoveOptions = useMemo(() => {
        const customNames = roomCustomMoves
            .filter((m) => isStandaloneMode || role === 'GM' || !m.gmOnly)
            .map((m) => m.name);
        return Array.from(new Set([...ALL_MOVES, ...customNames])).sort();
    }, [roomCustomMoves, isStandaloneMode, role]);

    const handleSelectMoveName = async (name: string) => {
        setSearchTerm(name);
        if (!name.trim()) {
            setTargetMoveData(null);
            setSelectedAcc1('');
            setSelectedAcc2('');
            return;
        }
        setIsLoadingMove(true);
        try {
            const data = await fetchMoveData(name);
            setTargetMoveData(data);
            if (data) {
                const fields = extractMoveFields(data);
                const a1Opts = mapAttrOptions(fields.accuracy1);
                const a2Opts = mapSkillOptions(fields.accuracy2, extraCategories);
                setSelectedAcc1(a1Opts[0] || 'str');
                setSelectedAcc2(a2Opts[0] || 'none');
            }
        } catch (err) {
            console.error('[HelpAnotherModal] Failed to fetch move data:', err);
            setTargetMoveData(null);
        } finally {
            setIsLoadingMove(false);
        }
    };

    const extractedFields = useMemo(() => {
        if (!targetMoveData) return null;
        return extractMoveFields(targetMoveData);
    }, [targetMoveData]);

    const acc1Options = useMemo(() => {
        if (!extractedFields) return [];
        return mapAttrOptions(extractedFields.accuracy1);
    }, [extractedFields]);

    const acc2Options = useMemo(() => {
        if (!extractedFields) return [];
        return mapSkillOptions(extractedFields.accuracy2, extraCategories);
    }, [extractedFields, extraCategories]);

    const isNoAcc = useMemo(() => {
        if (!targetMoveData) return false;
        const a1 = (targetMoveData.Accuracy1 || '').trim().toLowerCase();
        const a2 = (targetMoveData.Accuracy2 || '').trim().toLowerCase();
        return (!a1 || a1 === 'none' || a1 === '-') && (!a2 || a2 === 'none' || a2 === '-');
    }, [targetMoveData]);

    // Live calculation of user's accuracy pool for this move
    const calculation = useMemo(() => {
        if (!targetMoveData || isNoAcc) return null;
        const fullState = useCharacterStore.getState();

        const tempMove: MoveData = {
            id: 'help-another-temp',
            active: true,
            name: targetMoveData.Name || 'Ally Move',
            type: targetMoveData.Type || 'Normal',
            category: (targetMoveData.Category as 'Physical' | 'Special' | 'Status') || 'Physical',
            acc1: selectedAcc1 || 'str',
            acc2: selectedAcc2 || 'none',
            dmg1: '',
            power: 0,
            desc: targetMoveData.Description || targetMoveData.Effect || ''
        };

        const abilityText = getAbilityText(fullState.identity.ability, fullState.roomCustomAbilities);
        const itemBuffs = parseCombatTags(
            fullState.inventory,
            fullState.extraCategories,
            tempMove,
            abilityText,
            fullState.passives
        );

        const totalAcc = calculateBaseAccuracy(tempMove, fullState, itemBuffs);
        const attrVal = calculateStatTotal(selectedAcc1, fullState, itemBuffs);
        const skillVal = calculateSkillTotal(selectedAcc2, fullState, itemBuffs);

        return {
            totalAcc,
            attrVal,
            skillVal
        };
    }, [targetMoveData, isNoAcc, selectedAcc1, selectedAcc2]);

    const finalPool = calculation ? Math.max(1, calculation.totalAcc + situationalMod) : 0;

    const handleRoll = async () => {
        if (!targetMoveData || isNoAcc || finalPool <= 0) return;
        const fullState = useCharacterStore.getState();
        const nickname = fullState.identity.nickname || fullState.identity.species || 'Someone';
        const moveName = targetMoveData.Name || 'Ally Move';

        fullState.incrementAction();
        await rollDicePlus(
            `${finalPool}d6>5`,
            `[Help Another] ${nickname} rolled Help Another for ally's ${moveName} (Chance dice)!`,
            'chance'
        );
        onClose();
    };

    return (
        <div className="help-another-modal__overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div
                className="help-another-modal__content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-another-title"
            >
                {/* Header */}
                <div className="help-another-modal__header">
                    <h3
                        id="help-another-title"
                        className="help-another-modal__title text-title-primary"
                        style={{ color: 'var(--primary)' }}
                    >
                        <Users size={20} /> Help Another - Ally Move
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="help-another-modal__close-btn"
                        aria-label="Close dialog"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="help-another-modal__desc text-subtext">
                    Roll your Accuracy as Chance dice (6s succeed) for an Ally&apos;s attempted move. Each success adds
                    +1 die to your ally&apos;s Accuracy roll (max 6 dice across all helpers).
                </p>

                {/* Search Move */}
                <div className="help-another-modal__picker-section">
                    <label className="text-label" htmlFor="help-another-search">
                        Select Ally&apos;s Attempted Move:
                    </label>
                    <div className="help-another-modal__input-row">
                        <input
                            id="help-another-search"
                            type="text"
                            list="help-another-options-list"
                            placeholder="Type to search ally's move (e.g. Thunderbolt)..."
                            value={searchTerm}
                            onChange={(e) => handleSelectMoveName(e.target.value)}
                            className="help-another-modal__search-input"
                            autoFocus
                        />
                        <datalist id="help-another-options-list">
                            {allMoveOptions.map((opt) => (
                                <option key={opt} value={opt} />
                            ))}
                        </datalist>
                    </div>
                    {isLoadingMove && (
                        <span className="text-subtext" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                            Loading move details...
                        </span>
                    )}
                </div>

                {/* Move Preview & Calculation */}
                {targetMoveData && extractedFields && (
                    <div className="help-another-modal__preview-card">
                        <div className="help-another-modal__preview-title-row">
                            <span className="help-another-modal__preview-name">{targetMoveData.Name}</span>
                            <div className="help-another-modal__preview-badges">
                                <span
                                    className="help-another-modal__type-pill"
                                    style={{ background: getTypeColor(extractedFields.type) }}
                                >
                                    {extractedFields.type}
                                </span>
                                <span className="help-another-modal__cat-pill">{extractedFields.category}</span>
                            </div>
                        </div>

                        {isNoAcc ? (
                            <div className="help-another-modal__no-acc-alert">
                                <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                <strong>No Accuracy Roll:</strong> This move does not require an Accuracy check. Help
                                Another is only applicable when assisting an action that rolls Accuracy.
                            </div>
                        ) : (
                            <>
                                {/* Scaling Selectors (if choice available) */}
                                <div className="help-another-modal__scaling-row">
                                    <span className="help-another-modal__scaling-title">Move Accuracy Scaling:</span>
                                    <div className="help-another-modal__selectors">
                                        <div className="help-another-modal__select-group">
                                            <span className="text-subtext">Attribute:</span>
                                            {acc1Options.length > 1 ? (
                                                <select
                                                    value={selectedAcc1}
                                                    onChange={(e) => setSelectedAcc1(e.target.value)}
                                                    className="form-select--bordered help-another-modal__select text-label"
                                                >
                                                    {acc1Options.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt.toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <strong className="text-label">
                                                    {(selectedAcc1 || extractedFields.accuracy1 || 'STR').toUpperCase()}
                                                </strong>
                                            )}
                                        </div>

                                        <span className="text-muted">+</span>

                                        <div className="help-another-modal__select-group">
                                            <span className="text-subtext">Skill:</span>
                                            {acc2Options.length > 1 ? (
                                                <select
                                                    value={selectedAcc2}
                                                    onChange={(e) => setSelectedAcc2(e.target.value)}
                                                    className="form-select--bordered help-another-modal__select text-label"
                                                >
                                                    {acc2Options.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt.toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <strong className="text-label">
                                                    {(
                                                        selectedAcc2 ||
                                                        extractedFields.accuracy2 ||
                                                        'NONE'
                                                    ).toUpperCase()}
                                                </strong>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Pool Summary */}
                                {calculation && (
                                    <div className="help-another-modal__pool-card">
                                        <div className="help-another-modal__pool-header">
                                            <span className="text-label">Your Help Accuracy Pool:</span>
                                            <span className="help-another-modal__pool-value">{finalPool}d6</span>
                                        </div>

                                        <div className="help-another-modal__pool-breakdown">
                                            <span className="help-another-modal__breakdown-chip">
                                                {selectedAcc1.toUpperCase()}: {calculation.attrVal}
                                            </span>
                                            {selectedAcc2 && selectedAcc2 !== 'none' && (
                                                <span className="help-another-modal__breakdown-chip">
                                                    {selectedAcc2.toUpperCase()}: {calculation.skillVal}
                                                </span>
                                            )}
                                            <span className="help-another-modal__breakdown-chip">
                                                Base Pool: {calculation.totalAcc}
                                            </span>
                                            {situationalMod !== 0 && (
                                                <span className="help-another-modal__breakdown-chip">
                                                    Modifier:{' '}
                                                    {situationalMod > 0 ? `+${situationalMod}` : situationalMod}
                                                </span>
                                            )}
                                        </div>

                                        {/* Situational Modifier Spinner */}
                                        <div className="help-another-modal__modifier-row">
                                            <span className="text-subtext">Situational Modifier:</span>
                                            <NumberSpinner
                                                value={situationalMod}
                                                onChange={(val) => setSituationalMod(val)}
                                                min={-10}
                                                max={10}
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="help-another-modal__actions">
                    <button type="button" onClick={onClose} className="action-button action-button--dark">
                        Cancel
                    </button>
                    {targetMoveData && !isNoAcc && (
                        <button
                            type="button"
                            onClick={handleRoll}
                            className="action-button action-button--theme help-another-modal__roll-btn text-theme-header"
                        >
                            <Dices size={16} /> Roll Help Another ({finalPool}d6)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
