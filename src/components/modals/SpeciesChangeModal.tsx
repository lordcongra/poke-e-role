import { Dna, Sparkles, AlertTriangle, XCircle } from 'lucide-react';
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
                <h3 className="species-change__title modal-title-with-icon text-title-primary">
                    <Dna size={20} /> Species Changed
                </h3>
                <p className="species-change__desc text-subtext">
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
                        className="action-button action-button--secondary species-change__btn-evolve"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={16} /> Evolve / Mega / Form Shift
                        </div>
                        <span className="text-subtext" style={{ color: 'inherit' }}>
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
                        className="action-button action-button--theme species-change__btn-form"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Dna size={16} /> Type / Ability Shift Only
                        </div>
                        <span className="text-subtext" style={{ color: 'inherit' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={16} /> Brand New Pokémon
                        </div>
                        <span className="text-subtext" style={{ color: 'inherit' }}>
                            (Wipes Moves & Skills completely)
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark species-change__btn-cancel text-theme-header"
                    >
                        <XCircle size={16} /> Cancel Change
                    </button>
                </div>
            </div>
        </div>
    );
}
