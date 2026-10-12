import { TrendingUp } from 'lucide-react';
import { TooltipIcon } from '../ui/TooltipIcon';
import type { BoostTrackerSource } from '../../utils/combat/combatUtils';

interface TrackerBoostsListProps {
    boostSources: BoostTrackerSource[];
    onStepSourceBoost: (source: BoostTrackerSource, delta: number) => void;
    onCycleSourceBoost: (source: BoostTrackerSource) => void;
    onShowTooltip: (info: { title: string; desc: string }) => void;
}

export function TrackerBoostsList({
    boostSources,
    onStepSourceBoost,
    onCycleSourceBoost,
    onShowTooltip
}: TrackerBoostsListProps) {
    if (boostSources.length === 0) return null;

    return (
        <div className="tracker-section__boosts-container">
            {boostSources.map((source) => (
                <div key={source.id} className="tracker-section__boost-row">
                    <div className="tracker-section__boost-label-wrap">
                        <TrendingUp size={14} className="tracker-section__boost-icon" />
                        <span className="tracker-section__action-label text-label" title={source.label}>
                            {source.label}
                        </span>
                        <TooltipIcon
                            onClick={() =>
                                onShowTooltip({
                                    title: source.label,
                                    desc: `Adjust boost level (max ${source.maxBoost} stacks) for ${source.entityName} (${source.effect}). Current level: ${source.currentLevel}.`
                                })
                            }
                        />
                        <span className="text-label">:</span>
                    </div>

                    {source.maxBoost > 1 ? (
                        <div className="ability-tracker__stepper tracker-section__boost-stepper">
                            <button
                                type="button"
                                disabled={source.currentLevel <= 0}
                                onClick={() => onStepSourceBoost(source, -1)}
                                className="action-button action-button--dark ability-tracker__step-btn"
                                title="Decrease boost stack (-1)"
                                aria-label="Decrease boost stack"
                            >
                                -
                            </button>
                            <button
                                type="button"
                                onClick={() => onCycleSourceBoost(source)}
                                className={`action-button ${
                                    source.currentLevel > 0 ? 'action-button--theme' : 'action-button--dark'
                                } ability-tracker__step-badge`}
                                title={`Boost Level: ${source.currentLevel}/${source.maxBoost} (Click to cycle, or use +/-)`}
                            >
                                {source.currentLevel > 0 ? `Boost +${source.currentLevel}` : 'Boost OFF'}
                            </button>
                            <button
                                type="button"
                                disabled={source.currentLevel >= source.maxBoost}
                                onClick={() => onStepSourceBoost(source, 1)}
                                className="action-button action-button--dark ability-tracker__step-btn"
                                title="Increase boost stack (+1)"
                                aria-label="Increase boost stack"
                            >
                                +
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onCycleSourceBoost(source)}
                            className={`action-button ${
                                source.currentLevel > 0 ? 'action-button--theme' : 'action-button--dark'
                            } tracker-section__boost-toggle-btn`}
                            title={`Click to toggle Boost ${source.currentLevel > 0 ? 'OFF' : 'ON'}`}
                        >
                            Boost {source.currentLevel > 0 ? 'ON' : 'OFF'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
