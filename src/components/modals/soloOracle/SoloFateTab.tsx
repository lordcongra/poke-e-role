import { useState } from 'react';
import { Dices, AlertTriangle, ArrowRight } from 'lucide-react';
import { NumberSpinner } from '@/components/ui/NumberSpinner';
import { ODDS_LEVELS } from '@/data/soloOracleData';
import { getFateThresholds, type FateCheckResult } from '@/utils/solo/oracleUtils';

interface SoloFateTabProps {
    chaosFactor: number;
    onChaosChange: (val: number) => void;
    lastResult: FateCheckResult | null;
    lastQuestion?: string;
    onRollFate: (odds: number, question?: string) => void;
    onGoToPrompts: () => void;
}

export function SoloFateTab({
    chaosFactor,
    onChaosChange,
    lastResult,
    lastQuestion,
    onRollFate,
    onGoToPrompts
}: SoloFateTabProps) {
    const [selectedOdds, setSelectedOdds] = useState<number>(0);
    const [question, setQuestion] = useState<string>('');

    const { target, exceptionalYesThreshold, exceptionalNoThreshold } = getFateThresholds(selectedOdds, chaosFactor);

    const getResultBadgeClass = (resType: string) => {
        switch (resType) {
            case 'Exceptional Yes':
                return 'solo-fate__result-badge--exc-yes';
            case 'Yes':
                return 'solo-fate__result-badge--yes';
            case 'Exceptional No':
                return 'solo-fate__result-badge--exc-no';
            case 'No':
            default:
                return 'solo-fate__result-badge--no';
        }
    };

    return (
        <div className="solo-fate-tab">
            <div className="solo-fate__config-grid">
                {/* Chaos Factor Controls */}
                <div className="solo-fate__chaos-box">
                    <span className="text-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        Chaos Factor (1–9)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <NumberSpinner
                            value={chaosFactor}
                            onChange={(val) => onChaosChange(Math.max(1, Math.min(9, val)))}
                            min={1}
                            max={9}
                        />
                        <span className="text-subtext">
                            {chaosFactor <= 3
                                ? 'Calm / Controlled'
                                : chaosFactor <= 6
                                  ? 'Standard'
                                  : 'High Chaos / Danger'}
                        </span>
                    </div>
                </div>

                {/* Likelihood Odds Selector */}
                <div className="solo-fate__odds-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            Estimated Odds
                        </span>
                        <div className="solo-fate__target-preview">
                            Target: ≤ {target}% {exceptionalYesThreshold ? `(Exc: ≤ ${exceptionalYesThreshold})` : ''}
                            {exceptionalNoThreshold ? ` (Exc No: ≥ ${exceptionalNoThreshold})` : ''}
                        </div>
                    </div>

                    <div className="solo-fate__odds-grid">
                        {ODDS_LEVELS.map((item) => (
                            <button
                                key={item.odds}
                                type="button"
                                className={`solo-fate__odds-btn ${selectedOdds === item.odds ? 'solo-fate__odds-btn--active' : ''}`}
                                onClick={() => setSelectedOdds(item.odds)}
                                title={item.description}
                            >
                                {item.label} ({item.odds >= 0 ? `+${item.odds}` : item.odds})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Question Input & Action Row */}
            <div className="solo-fate__question-box">
                <input
                    type="text"
                    className="solo-fate__question-input"
                    placeholder="Type your Fate question (e.g., 'Is there shelter nearby?', 'Does the wild PKMN notice me?')..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onRollFate(selectedOdds, question)}
                />
            </div>

            <div className="solo-fate__roll-action">
                <button
                    type="button"
                    className="action-button action-button--theme solo-fate__roll-btn"
                    onClick={() => onRollFate(selectedOdds, question)}
                >
                    <Dices size={20} /> Ask the Oracle (Roll 1d100)
                </button>
            </div>

            {/* Roll Result Display */}
            {lastResult && (
                <div className="solo-fate__result-card">
                    {lastQuestion && (
                        <div className="solo-fate__result-question">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Question:</span> &ldquo;
                            <strong>{lastQuestion}</strong>&rdquo;
                        </div>
                    )}

                    <div className={`solo-fate__result-badge ${getResultBadgeClass(lastResult.result)}`}>
                        {lastResult.result}
                    </div>

                    <div className="solo-fate__result-details">
                        <span>
                            Rolled <strong>{lastResult.roll}</strong> against target{' '}
                            <strong>{lastResult.target}</strong>
                        </span>
                        <span>
                            Odds: {lastResult.oddsLabel} | Chaos Factor: {lastResult.chaosFactor}
                        </span>
                    </div>

                    {lastResult.isRandomEvent && (
                        <div className="solo-fate__random-event-alert">
                            <div className="solo-fate__random-event-title">
                                <AlertTriangle size={18} /> RANDOM EVENT TRIGGERED!
                            </div>
                            <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                                You rolled matching doubles (<strong>{lastResult.roll}</strong>) within your Chaos
                                Factor ({lastResult.chaosFactor}). An unexpected story twist interrupts the current
                                scene!
                            </div>
                            <button
                                type="button"
                                className="action-button action-button--primary"
                                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={onGoToPrompts}
                            >
                                Roll Event Focus & Meaning <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
