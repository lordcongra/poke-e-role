import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import './SpeciesChangeModal.css';

interface SpeciesChangeModalProps {
    pendingSpeciesData: Record<string, unknown>;
    onClose: () => void;
}

export function SpeciesChangeModal({ pendingSpeciesData, onClose }: SpeciesChangeModalProps) {
    const applySpeciesData = useCharacterStore((state) => state.applySpeciesData);
    const [swapUpdateStats, setSwapUpdateStats] = useState(true);

    return (
        <div className="species-change__overlay">
            <div className="species-change__content">
                <h3 className="species-change__title">🧬 Species Changed</h3>
                <p className="species-change__desc">
                    You loaded a new Pokémon. How do you want to handle existing data?
                </p>

                <div className="species-change__btn-group">
                    <button
                        type="button"
                        onClick={() => {
                            applySpeciesData(pendingSpeciesData, false, swapUpdateStats);
                            onClose();
                        }}
                        className="action-button action-button--dark species-change__btn-form"
                    >
                        🔄 Form Change / Mega Evolve
                        <br />
                        <span className="species-change__btn-subtitle">
                            (Updates Typing/Ability, Keeps Moves/Skills)
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            applySpeciesData(pendingSpeciesData, true, swapUpdateStats);
                            onClose();
                        }}
                        className="action-button action-button--red species-change__btn-new"
                    >
                        ⚠️ Brand New Pokémon
                        <br />
                        <span className="species-change__btn-subtitle">(Wipes Moves & Skills completely)</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark species-change__btn-cancel"
                    >
                        Cancel Change
                    </button>
                </div>

                <div className="species-change__checkbox-container">
                    <label className="species-change__checkbox-label">
                        <input
                            type="checkbox"
                            checked={swapUpdateStats}
                            onChange={(e) => setSwapUpdateStats(e.target.checked)}
                            className="species-change__checkbox"
                        />
                        Overwrite Base Stats & Limits
                    </label>
                </div>
            </div>
        </div>
    );
}
