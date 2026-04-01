import { useCharacterStore } from '../../store/useCharacterStore';
import './SpeciesChangeModal.css';

interface SpeciesChangeModalProps {
    pendingSpeciesData: Record<string, unknown>;
    onClose: () => void;
}

export function SpeciesChangeModal({ pendingSpeciesData, onClose }: SpeciesChangeModalProps) {
    const applySpeciesData = useCharacterStore((state) => state.applySpeciesData);

    return (
        <div className="species-change__overlay">
            <div className="species-change__content">
                <h3 className="species-change__title">🧬 Species Changed</h3>
                <p className="species-change__desc">
                    You loaded a new Pokémon. How do you want to handle your existing sheet data?
                </p>

                <div className="species-change__btn-group">
                    <button
                        type="button"
                        onClick={() => {
                            // Evolution/Mega: Keeps skills/moves (wipeData=false), but updates stats & limits (updateStats=true)
                            applySpeciesData(pendingSpeciesData, false, true);
                            onClose();
                        }}
                        className="action-button species-change__btn-evolve"
                    >
                        ✨ Evolve / Mega / Form Shift
                        <br />
                        <span className="species-change__btn-subtitle">
                            (Updates Stats, Limits & Typing. Keeps Moves/Skills)
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            // Type Shift: Keeps skills/moves (wipeData=false), AND keeps custom stats/limits (updateStats=false)
                            applySpeciesData(pendingSpeciesData, false, false);
                            onClose();
                        }}
                        className="action-button species-change__btn-form"
                    >
                        🧬 Type / Ability Shift Only
                        <br />
                        <span className="species-change__btn-subtitle">
                            (Updates Typing & Abilities ONLY. Keeps current Stats)
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            // Brand New: Wipes skills/moves (wipeData=true), and applies new stats (updateStats=true)
                            applySpeciesData(pendingSpeciesData, true, true);
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
            </div>
        </div>
    );
}
