import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { POKEMON_TYPES } from '../../data/constants';
import type { TransformationType } from '../../store/storeTypes';
import './TransformationModal.css';

interface TransformationModalProps {
    onClose: () => void;
}

export function TransformationModal({ onClose }: TransformationModalProps) {
    const activeTrans = useCharacterStore((state) => state.identity.activeTransformation);
    const toggleTransformation = useCharacterStore((state) => state.toggleTransformation);
    const willCurr = useCharacterStore((state) => state.will.willCurr);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);

    const [selectedTrans, setSelectedTrans] = useState<TransformationType>(
        activeTrans !== 'None' ? activeTrans : 'Mega'
    );
    const [affinity, setAffinity] = useState('Stellar');
    const [autoMaxMoves, setAutoMaxMoves] = useState(true);

    const allTypes = [
        ...POKEMON_TYPES.filter((t) => t !== ''),
        ...roomCustomTypes.filter((t) => role === 'GM' || !t.gmOnly).map((t) => t.name)
    ];

    const handleApply = () => {
        toggleTransformation(selectedTrans, affinity, autoMaxMoves);
        onClose();
    };

    const handleRevert = () => {
        toggleTransformation('None');
        onClose();
    };

    const isTransforming = activeTrans === 'None';
    const willCost = selectedTrans === 'Mega' || selectedTrans === 'Terastallize' ? 1 : 0;
    const canAfford = willCurr >= willCost;

    return (
        <div className="transformation-modal__overlay">
            <div className="transformation-modal__content">
                <div className="transformation-modal__header">
                    <h3 className="transformation-modal__title">
                        🧬 {isTransforming ? 'Transform' : 'Manage Transformation'}
                    </h3>
                    <button onClick={onClose} className="transformation-modal__close-btn" title="Close">
                        X
                    </button>
                </div>

                {isTransforming ? (
                    <div className="transformation-modal__section">
                        <label className="transformation-modal__label">Transformation Type:</label>
                        <select
                            value={selectedTrans}
                            onChange={(e) => setSelectedTrans(e.target.value as TransformationType)}
                            className="transformation-modal__select"
                        >
                            <option value="Mega">Mega Evolution</option>
                            <option value="Dynamax">Dynamax</option>
                            <option value="Gigantamax">Gigantamax</option>
                            <option value="Terastallize">Terastallization</option>
                            <option value="Custom">Custom / Homebrew Form</option>
                        </select>

                        {selectedTrans === 'Terastallize' && (
                            <>
                                <label className="transformation-modal__label">Tera Affinity:</label>
                                <select
                                    value={affinity}
                                    onChange={(e) => setAffinity(e.target.value)}
                                    className="transformation-modal__select"
                                >
                                    {allTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}

                        {(selectedTrans === 'Dynamax' || selectedTrans === 'Gigantamax') && (
                            <label
                                className="transformation-modal__label"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    marginTop: '6px'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={autoMaxMoves}
                                    onChange={(e) => setAutoMaxMoves(e.target.checked)}
                                    style={{ transform: 'scale(1.2)' }}
                                />
                                Auto-Convert to Max Moves?
                            </label>
                        )}

                        <div className="transformation-modal__desc-box">
                            {selectedTrans === 'Mega' && (
                                <>
                                    Backs up your current stats, heals all HP/Will to full, and clears statuses.
                                    <span className="transformation-modal__cost-warning">Costs 1 Willpower.</span>
                                </>
                            )}
                            {selectedTrans === 'Dynamax' && (
                                <>Grants 6 Temporary HP, triggers a 3-round timer, and prevents Evasion/Clashing.</>
                            )}
                            {selectedTrans === 'Gigantamax' && (
                                <>
                                    Grants 12 Temporary HP, +2 to STR/SPE/DEX/DEF/SPD, triggers a 3-round timer, and
                                    prevents Evasion/Clashing.
                                </>
                            )}
                            {selectedTrans === 'Terastallize' && (
                                <>
                                    Replaces your typing with Stellar, applies STAB to your affinity type, and grants
                                    bonus damage to your next attack.
                                    <span className="transformation-modal__cost-warning">Costs 1 Willpower.</span>
                                </>
                            )}
                            {selectedTrans === 'Custom' && (
                                <>
                                    Safely backs up your current stats so you can freely edit your sheet for a homebrew
                                    form.
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="transformation-modal__section">
                        <div className="transformation-modal__desc-box" style={{ textAlign: 'center' }}>
                            You are currently transformed into your <strong>{activeTrans}</strong> form!
                            <br />
                            <br />
                            Reverting will safely restore your original Base Stats, Typing, Moves, and Skills.
                        </div>
                    </div>
                )}

                <div className="transformation-modal__actions">
                    {isTransforming ? (
                        <>
                            <button
                                type="button"
                                className="action-button action-button--dark transformation-modal__btn"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red transformation-modal__btn"
                                onClick={handleApply}
                                disabled={!canAfford}
                            >
                                ✨ Activate
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="action-button transformation-modal__btn transformation-modal__btn--revert"
                            onClick={handleRevert}
                        >
                            🔄 Revert to Base Form
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
