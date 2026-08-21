import { useState } from 'react';
import { Clover, Dices, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { rollDicePlus } from '../../utils/combatUtils';
import { NumberSpinner } from '../ui/NumberSpinner';
import './TakeChancesModal.css';

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
            rollDicePlus(`${finalRoll}d6>3`, `[Take Chances] ${nickname} rerolled ${finalRoll} failed dice!`);
        }
        onClose();
    };

    return (
        <div className="take-chances__overlay">
            <div className="take-chances__content">
                <h3 className="take-chances__title modal-title-with-icon text-title-primary">
                    <Clover size={20} /> Take Your Chances
                </h3>
                <p className="take-chances__description text-subtext" style={{ color: 'var(--text-main)' }}>
                    How many failed dice are you rerolling? <br />
                    <span className="text-subtext">(You have {trackers.chances} stack(s) active this round)</span>
                </p>

                <div className="take-chances__spinner-container">
                    <NumberSpinner
                        value={chancesToRoll}
                        onChange={(value) => setChancesToRoll(Math.max(1, Math.min(trackers.chances, value)))}
                        min={1}
                        max={trackers.chances}
                    />
                </div>

                <div className="take-chances__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark take-chances__btn"
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirmChancesRoll}
                        className="action-button action-button--theme take-chances__btn"
                    >
                        <Dices size={16} /> Reroll
                    </button>
                </div>
            </div>
        </div>
    );
}
