import { Shield, Swords, HelpCircle } from 'lucide-react';
import { ODDS_LEVELS } from '@/data/soloOracleData';

export interface SoloBattleReactionsProps {
    onEvade: () => void;
    onClash: () => void;
    reactionOdds: number;
    onChangeReactionOdds: (odds: number) => void;
    onRollFateReaction: () => void;
    onManeuver: (m: 'cover' | 'struggle') => void;
}

export function SoloBattleReactions({
    onEvade,
    onClash,
    reactionOdds,
    onChangeReactionOdds,
    onRollFateReaction,
    onManeuver
}: SoloBattleReactionsProps) {
    return (
        <div className="solo-battle__reactions-section">
            <span className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={15} color="var(--primary)" /> Defensive Reactions & Reactions Oracle
            </span>

            <div className="solo-battle__reaction-buttons">
                <button
                    type="button"
                    className="action-button action-button--dark solo-battle__react-btn"
                    onClick={onEvade}
                >
                    <Shield size={15} /> Evade Decision
                </button>
                <button
                    type="button"
                    className="action-button action-button--dark solo-battle__react-btn"
                    onClick={onClash}
                >
                    <Swords size={15} /> Clash Decision
                </button>
            </div>

            {/* "Does it React?" Fate Oracle Roll */}
            <div className="solo-battle__fate-react-card">
                <div className="solo-battle__fate-react-header">
                    <span
                        className="text-subtext"
                        style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <HelpCircle size={14} /> Does It React? (Fate Oracle)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                            className="solo-fate__odds-select"
                            value={reactionOdds}
                            onChange={(e) => onChangeReactionOdds(Number(e.target.value))}
                            style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                        >
                            {ODDS_LEVELS.map((level) => (
                                <option key={level.odds} value={level.odds}>
                                    {level.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="action-button action-button--secondary solo-battle__fate-btn"
                            onClick={onRollFateReaction}
                        >
                            Roll Reaction Check
                        </button>
                    </div>
                </div>
            </div>

            {/* Situational Maneuvers */}
            <div className="solo-battle__maneuvers-row">
                <span className="text-subtext" style={{ fontSize: '0.78rem', minWidth: '85px' }}>
                    Maneuvers:
                </span>
                <button
                    type="button"
                    className="action-button action-button--dark solo-battle__maneuver-btn"
                    onClick={() => onManeuver('cover')}
                >
                    Cover an Ally
                </button>
                <button
                    type="button"
                    className="action-button action-button--dark solo-battle__maneuver-btn"
                    onClick={() => onManeuver('struggle')}
                >
                    Desperation Struggle
                </button>
            </div>
        </div>
    );
}
