import { NumberSpinner } from '../ui/NumberSpinner';
import { TooltipIcon } from '../ui/TooltipIcon';
import type { Trackers } from '../../store/storeTypes';

interface MovesTableModifiersProps {
    maxMoves: number;
    trackers: Trackers;
    updateTracker: <K extends keyof Trackers>(field: K, value: Trackers[K]) => void;
    handleGlobalChanceRoll: () => void;
    painEnabled: boolean;
    setTooltipInfo: (info: { title: string; description: string } | null) => void;
    setShowModifiersModal: (show: boolean) => void;
}

export function MovesTableModifiers({
    maxMoves,
    trackers,
    updateTracker,
    handleGlobalChanceRoll,
    painEnabled,
    setTooltipInfo,
    setShowModifiersModal
}: MovesTableModifiersProps) {
    return (
        <>
            <span className="moves-table__max-label">(Max: {maxMoves})</span>
            <div className="desktop-only-flex moves-table__desktop-modifiers">
                <span className="moves-table__modifier-item">
                    Acc
                    <TooltipIcon
                        onClick={() =>
                            setTooltipInfo({
                                title: 'Global Accuracy',
                                description: 'Adds or removes bonus dice to all Accuracy rolls.'
                            })
                        }
                    />
                    :{' '}
                    <NumberSpinner
                        value={trackers.globalAcc}
                        onChange={(value: number) => updateTracker('globalAcc', value)}
                        min={-99}
                    />
                </span>
                <span className="moves-table__modifier-item">
                    Dmg
                    <TooltipIcon
                        onClick={() =>
                            setTooltipInfo({
                                title: 'Global Damage',
                                description: 'Adds or removes bonus dice to all Damage rolls.'
                            })
                        }
                    />
                    :{' '}
                    <NumberSpinner
                        value={trackers.globalDmg}
                        onChange={(value: number) => updateTracker('globalDmg', value)}
                        min={-99}
                    />
                </span>
                <span className="moves-table__modifier-item">
                    Succ
                    <TooltipIcon
                        onClick={() =>
                            setTooltipInfo({
                                title: 'Global Success Modifier',
                                description: 'Flat Bonus/Penalty to final Successes (e.g., Low Accuracy = -1).'
                            })
                        }
                    />
                    :{' '}
                    <NumberSpinner
                        value={trackers.globalSucc}
                        onChange={(value: number) => updateTracker('globalSucc', value)}
                        min={-99}
                    />
                </span>
                <span className="moves-table__modifier-item">
                    Chance
                    <TooltipIcon
                        onClick={() =>
                            setTooltipInfo({
                                title: 'Global Chance',
                                description: 'Adds bonus dice to all Chance rolls.'
                            })
                        }
                    />
                    :{' '}
                    <NumberSpinner
                        value={trackers.globalChance}
                        onChange={(value: number) => updateTracker('globalChance', value)}
                        min={0}
                    />
                    <button
                        type="button"
                        onClick={handleGlobalChanceRoll}
                        className="action-button action-button--dark moves-table__chance-roll-btn"
                    >
                        🎲
                    </button>
                </span>
                {painEnabled && (
                    <span className="moves-table__modifier-pain">
                        Pain
                        <TooltipIcon
                            onClick={() =>
                                setTooltipInfo({
                                    title: 'Ignored Pain',
                                    description:
                                        "Ignored Pain Penalties (Resets per Scene). Use the 'Ign.Pain(-1W)' button in the Tracker to increase this."
                                })
                            }
                        />
                        :{' '}
                        <NumberSpinner
                            value={trackers.ignoredPain}
                            onChange={(value: number) => updateTracker('ignoredPain', value)}
                            min={0}
                        />
                    </span>
                )}
            </div>

            <button
                type="button"
                className="mobile-only-flex action-button action-button--dark moves-table__mobile-modifiers-btn"
                onClick={() => setShowModifiersModal(true)}
            >
                ⚙️ Modifiers
            </button>
        </>
    );
}
