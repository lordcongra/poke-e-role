import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { rollDicePlus } from '../utils/combatUtils';
import { NumberSpinner } from './NumberSpinner';

interface TakeChancesModalProps {
    onClose: () => void;
}

export function TakeChancesModal({ onClose }: TakeChancesModalProps) {
    const trackers = useCharacterStore((state) => state.trackers);
    const [chancesToRoll, setChancesToRoll] = useState(1);

    const confirmChancesRoll = () => {
        const finalRoll = Math.min(chancesToRoll, trackers.chances);
        if (finalRoll > 0) {
            const state = useCharacterStore.getState();
            const nickname = state.identity.nickname || state.identity.species || 'Someone';
            rollDicePlus(
                `${finalRoll}d6>3`,
                `🍀 ${nickname} used Take Your Chances to reroll ${finalRoll} failed dice!`
            );
        }
        onClose();
    };

    return (
        <div className="tracker-modal__overlay">
            <div className="tracker-modal__content">
                <h3 className="tracker-modal__title">🍀 Take Your Chances</h3>
                <p className="tracker-modal__description">
                    How many failed dice are you rerolling? <br />
                    (You have {trackers.chances} stack(s) active this round)
                </p>

                <div className="tracker-modal__spinner-container">
                    <NumberSpinner
                        value={chancesToRoll}
                        onChange={(value) => setChancesToRoll(Math.max(1, Math.min(trackers.chances, value)))}
                        min={1}
                        max={trackers.chances}
                    />
                </div>

                <div className="tracker-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tracker-modal__btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirmChancesRoll}
                        className="action-button action-button--red tracker-modal__btn-confirm"
                    >
                        🎲 Reroll
                    </button>
                </div>
            </div>
        </div>
    );
}
