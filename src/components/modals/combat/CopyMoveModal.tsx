import { useState, useEffect, useMemo } from 'react';
import { Copy, X, Swords, Target, Sliders, CheckCheck } from 'lucide-react';
import type { MoveData } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ALL_MOVES, loadLocalDataset, fetchMoveData } from '../../../utils/api/api';
import type { MoveApiResponse } from '../../../utils/api/apiTypes';
import { TYPE_COLORS } from '../../../data/constants';
import { rollAccuracy, executeDamageRoll } from '../../../utils/combat/combatRoller';
import { calculateBaseDamage } from '../../../utils/combat/combatUtils';
import { getCopyMoveKind, synthesizeCopyMove, type SynthesizedMoveResult } from '../../../utils/combat/copyMoveUtils';
import './CopyMoveModal.css';

export interface CopyMoveModalProps {
    copyMove: MoveData;
    initialAction?: 'accuracy' | 'damage';
    onClose: () => void;
    onRollDamage: (move: MoveData) => void;
}

export function CopyMoveModal({ copyMove, initialAction = 'damage', onClose, onRollDamage }: CopyMoveModalProps) {
    const kind = getCopyMoveKind(copyMove);
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const setPendingDualScale = useCharacterStore((state) => state.setPendingDualScale);
    const applyMoveData = useCharacterStore((state) => state.applyMoveData);

    const [searchTerm, setSearchTerm] = useState('');
    const [targetMoveData, setTargetMoveData] = useState<MoveApiResponse | null>(null);
    const [isLoadingMove, setIsLoadingMove] = useState(false);

    // Ensure datasets are loaded
    useEffect(() => {
        if (ALL_MOVES.length === 0) {
            loadLocalDataset().catch((err) => console.error('[CopyMoveModal] Failed to load dataset:', err));
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
        const customNames = roomCustomMoves.map((m) => m.name);
        return Array.from(new Set([...ALL_MOVES, ...customNames])).sort();
    }, [roomCustomMoves]);

    const handleSelectMoveName = async (name: string) => {
        setSearchTerm(name);
        if (!name.trim()) {
            setTargetMoveData(null);
            return;
        }
        setIsLoadingMove(true);
        try {
            const data = await fetchMoveData(name);
            setTargetMoveData(data);
        } catch (err) {
            console.error('[CopyMoveModal] Failed to fetch move data:', err);
            setTargetMoveData(null);
        } finally {
            setIsLoadingMove(false);
        }
    };

    // Synthesize move with character stats
    const synthResult: SynthesizedMoveResult | null = useMemo(() => {
        if (!targetMoveData) return null;
        const fullState = useCharacterStore.getState();
        return synthesizeCopyMove(copyMove, targetMoveData, fullState);
    }, [copyMove, targetMoveData]);

    const synthesizedMove = synthResult?.move;

    const handleOpenDualScale = () => {
        if (synthResult?.pendingDualScale) {
            setPendingDualScale(synthResult.pendingDualScale);
        }
    };

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

    const handleApplyToSlot = () => {
        if (!targetMoveData) return;
        if (kind === 'mimic') {
            const backup: MoveData = {
                id: copyMove.id,
                active: copyMove.active,
                name: copyMove.name,
                type: copyMove.type,
                category: copyMove.category,
                acc1: copyMove.acc1,
                acc2: copyMove.acc2,
                dmg1: copyMove.dmg1,
                power: copyMove.power,
                desc: copyMove.desc,
                marker: copyMove.marker,
                dualScaleSelected: copyMove.dualScaleSelected
            };
            applyMoveData(copyMove.id, targetMoveData as Record<string, unknown>, backup);
        } else {
            applyMoveData(copyMove.id, targetMoveData as Record<string, unknown>);
        }
        onClose();
    };

    const getKindDescription = () => {
        switch (kind) {
            case 'copycat':
                return 'Copies both the Accuracy and Damage scaling from the target move.';
            case 'mirror-move':
                return "Uses your Insight + Perform for Accuracy; copies the target move's damage and type.";
            case 'me-first':
                return "Uses your Insight + Athletic for Accuracy; copies target move's damage and adds +1 bonus die.";
            case 'mimic':
                return 'Replaces "Mimic" with the copied move for the whole scene duration.';
            case 'sketch':
                return 'Permanently replaces "Sketch" with the chosen move.';
            default:
                return 'Copies the attributes of the selected move.';
        }
    };

    return (
        <div className="copy-move-modal__overlay" onClick={onClose}>
            <div className="copy-move-modal__content" onClick={(e) => e.stopPropagation()}>
                <div className="copy-move-modal__header">
                    <h3 className="copy-move-modal__title text-title-primary" style={{ color: 'var(--primary)' }}>
                        <Copy size={20} /> {copyMove.name} Resolution
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="copy-move-modal__close-btn"
                        aria-label="Close dialog"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="copy-move-modal__desc text-subtext">{getKindDescription()}</p>

                {/* Move Autocomplete Input */}
                <div className="copy-move-modal__picker-section">
                    <label className="text-label" htmlFor="copy-move-search">
                        Select Move to Copy:
                    </label>
                    <div className="copy-move-modal__input-row">
                        <input
                            id="copy-move-search"
                            type="text"
                            list="copy-move-options-list"
                            placeholder="Type to search move (e.g. Flamethrower)..."
                            value={searchTerm}
                            onChange={(e) => handleSelectMoveName(e.target.value)}
                            className="copy-move-modal__search-input"
                            autoFocus
                        />
                        <datalist id="copy-move-options-list">
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

                {/* Selected Move Preview */}
                {targetMoveData && synthesizedMove && (
                    <div className="copy-move-modal__preview-card">
                        <div className="copy-move-modal__preview-title-row">
                            <span className="copy-move-modal__preview-name">{targetMoveData.Name || ''}</span>
                            <div className="copy-move-modal__preview-badges">
                                <span
                                    className="copy-move-modal__type-pill"
                                    style={{ background: getTypeColor(synthesizedMove.type) }}
                                >
                                    {synthesizedMove.type}
                                </span>
                                <span className="copy-move-modal__cat-pill">{synthesizedMove.category}</span>
                                {kind === 'me-first' && (
                                    <span className="copy-move-modal__bonus-badge">+1 Bonus Die</span>
                                )}
                            </div>
                        </div>

                        <div className="copy-move-modal__stats-grid">
                            <div className="copy-move-modal__stat-item">
                                <span className="copy-move-modal__stat-label">Resolved Accuracy</span>
                                <span className="copy-move-modal__stat-val">
                                    {synthesizedMove.acc1.toUpperCase()} + {synthesizedMove.acc2.toUpperCase()}
                                </span>
                            </div>
                            <div className="copy-move-modal__stat-item">
                                <span className="copy-move-modal__stat-label">Resolved Damage</span>
                                <span className="copy-move-modal__stat-val">
                                    Power {synthesizedMove.power} + {synthesizedMove.dmg1.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {synthResult?.hasDualScale && (
                            <div className="copy-move-modal__dual-scale-alert">
                                <span>This move has variable / dual scaling choices.</span>
                                <button
                                    type="button"
                                    onClick={handleOpenDualScale}
                                    className="action-button action-button--theme text-theme-header"
                                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                                >
                                    <Sliders size={13} /> Select Scaling
                                </button>
                            </div>
                        )}

                        {(targetMoveData.Effect || targetMoveData.Description) && (
                            <p
                                className="text-subtext"
                                style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-main)',
                                    lineHeight: 1.4,
                                    margin: 0,
                                    maxHeight: '100px',
                                    overflowY: 'auto'
                                }}
                            >
                                {targetMoveData.Effect || targetMoveData.Description}
                            </p>
                        )}

                        {/* Mimic / Sketch replacement options */}
                        {kind === 'mimic' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={handleApplyToSlot}
                                    className="action-button action-button--dark text-theme-header"
                                    style={{ fontSize: '0.8rem' }}
                                    title="Replaces Mimic for this scene"
                                >
                                    <CheckCheck size={14} /> Replace Slot for Scene (Mimic)
                                </button>
                            </div>
                        )}

                        {kind === 'sketch' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={handleApplyToSlot}
                                    className="action-button action-button--red text-theme-header"
                                    style={{ fontSize: '0.8rem' }}
                                    title="Permanently learns this move in the slot"
                                >
                                    <CheckCheck size={14} /> Permanently Learn Move (Sketch)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="copy-move-modal__footer">
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
                                className={`action-button ${initialAction === 'accuracy' ? 'action-button--theme' : 'action-button--dark'} text-theme-header`}
                                title="Roll Accuracy"
                            >
                                <Target size={15} /> Roll Accuracy
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickDamage}
                                className="action-button action-button--dark text-theme-header"
                                title="Roll Damage directly"
                            >
                                <Swords size={15} /> Quick Dmg
                            </button>
                            <button
                                type="button"
                                onClick={handleTargetAndDamage}
                                className={`action-button ${initialAction === 'damage' ? 'action-button--theme' : 'action-button--dark'} text-theme-header`}
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
