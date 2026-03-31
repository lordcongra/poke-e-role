import { useCharacterStore } from '../store/useCharacterStore';
import { NumberSpinner } from './NumberSpinner';
import { TooltipIcon } from './TooltipIcon';
import './GlobalModifiersModal.css';

interface GlobalModifiersModalProps {
    onClose: () => void;
    setTooltipInfo: (info: { title: string; description: string } | null) => void;
    handleGlobalChanceRoll: () => void;
}

export function GlobalModifiersModal({ onClose, setTooltipInfo, handleGlobalChanceRoll }: GlobalModifiersModalProps) {
    const trackers = useCharacterStore((state) => state.trackers);
    const updateTracker = useCharacterStore((state) => state.updateTracker);
    const painEnabled = useCharacterStore((state) => state.identity.pain) === 'Enabled';

    return (
        <div className="global-modifiers__overlay">
            <div className="global-modifiers__content">
                <h3 className="global-modifiers__title">⚙️ Global Modifiers</h3>

                <div className="global-modifiers__list">
                    <div className="global-modifiers__row">
                        <span className="global-modifiers__label">
                            Acc
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: 'Global Accuracy',
                                        description: 'Adds or removes bonus dice to all Accuracy rolls.'
                                    })
                                }
                            />
                        </span>
                        <NumberSpinner
                            value={trackers.globalAcc}
                            onChange={(value) => updateTracker('globalAcc', value)}
                        />
                    </div>

                    <div className="global-modifiers__row">
                        <span className="global-modifiers__label">
                            Dmg
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: 'Global Damage',
                                        description: 'Adds or removes bonus dice to all Damage rolls.'
                                    })
                                }
                            />
                        </span>
                        <NumberSpinner
                            value={trackers.globalDmg}
                            onChange={(value) => updateTracker('globalDmg', value)}
                        />
                    </div>

                    <div className="global-modifiers__row">
                        <span className="global-modifiers__label">
                            Succ
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: 'Global Success Modifier',
                                        description: 'Flat Bonus/Penalty to final Successes (e.g., Low Accuracy = -1).'
                                    })
                                }
                            />
                        </span>
                        <NumberSpinner
                            value={trackers.globalSucc}
                            onChange={(value) => updateTracker('globalSucc', value)}
                        />
                    </div>

                    <div className="global-modifiers__row">
                        <span className="global-modifiers__label">
                            Chance
                            <button
                                type="button"
                                onClick={handleGlobalChanceRoll}
                                className="action-button action-button--dark global-modifiers__roll-btn"
                            >
                                🎲
                            </button>
                        </span>
                        <NumberSpinner
                            value={trackers.globalChance}
                            onChange={(value) => updateTracker('globalChance', value)}
                            min={0}
                        />
                    </div>

                    {painEnabled && (
                        <div className="global-modifiers__pain-container">
                            <span className="global-modifiers__label global-modifiers__label--pain">
                                Ign.Pain
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Ignored Pain',
                                            description:
                                                "Ignored Pain Penalties (Resets per Scene). Use the 'Ign.Pain(-1W)' button in the Tracker to increase this."
                                        })
                                    }
                                />
                            </span>
                            <NumberSpinner
                                value={trackers.ignoredPain}
                                onChange={(value) => updateTracker('ignoredPain', value)}
                                min={0}
                            />
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className="action-button action-button--dark global-modifiers__close-btn"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
