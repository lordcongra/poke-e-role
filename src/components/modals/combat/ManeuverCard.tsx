import React from 'react';
import {
    Dices,
    Megaphone,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Shield,
    Footprints,
    HeartPulse,
    Dumbbell,
    Search
} from 'lucide-react';
import type { ManeuverData } from '../../../data/gm/gmManeuversData';
import type { ManeuverPools } from './maneuversModalUtils';
import { NumberSpinner } from '../../ui/NumberSpinner';

interface ManeuverCardProps {
    maneuver: ManeuverData;
    pools: ManeuverPools;
    isExpanded: boolean;
    onToggleExpand: () => void;
    reactionBlocked: boolean;
    helpDice: number;
    onChangeHelpDice: (val: number) => void;
    onRoll: (id: string, option?: string, extra?: number) => void;
    onOpenHelpAnother: () => void;
    onBroadcast: (m: ManeuverData) => void;
}

export const ManeuverCard: React.FC<ManeuverCardProps> = ({
    maneuver: m,
    pools,
    isExpanded,
    onToggleExpand,
    reactionBlocked,
    helpDice,
    onChangeHelpDice,
    onRoll,
    onOpenHelpAnother,
    onBroadcast
}) => {
    const renderPoolBadge = () => {
        switch (m.id) {
            case 'maneuver-ambush':
                return <span className="maneuvers-modal__pool-preview">Pool: {pools.ambushTotal}d6</span>;
            case 'maneuver-clash':
                return (
                    <span className="maneuvers-modal__pool-preview">
                        Phys: {pools.clashPhysicalTotal}d6 | Spec: {pools.clashSpecialTotal}d6
                    </span>
                );
            case 'maneuver-cover-an-ally':
                return <span className="maneuvers-modal__pool-preview">Pool: {pools.coverTotal}d6</span>;
            case 'maneuver-evasion':
                return <span className="maneuvers-modal__pool-preview">Pool: {pools.evasionTotal}d6</span>;
            case 'maneuver-grapple':
                return <span className="maneuvers-modal__pool-preview">Pool: {pools.grappleTotal}d6</span>;
            case 'maneuver-help-another':
                return <span className="maneuvers-modal__pool-preview">Chance: 6s Succeed</span>;
            case 'maneuver-run-away':
                return <span className="maneuvers-modal__pool-preview">Pool: {pools.runAwayTotal}d6</span>;
            case 'maneuver-stabilize-an-ally':
                return <span className="maneuvers-modal__pool-preview">Pool: {pools.stabilizeTotal}d6</span>;
            case 'maneuver-struggle':
                return (
                    <span className="maneuvers-modal__pool-preview">
                        Acc: {pools.struggleAccTotal}d6 | Dmg: {pools.struggleDmgPhysTotal}/{pools.struggleDmgSpecTotal}
                    </span>
                );
            default:
                return null;
        }
    };

    const renderActionButtons = () => {
        if (m.id === 'maneuver-clash') {
            return (
                <div className="maneuvers-modal__roll-group">
                    <button
                        type="button"
                        disabled={reactionBlocked}
                        onClick={() => onRoll(m.id, 'physical')}
                        className="action-button action-button--dark maneuvers-modal__action-btn"
                        title={reactionBlocked ? 'Reactions disabled' : 'Roll Physical Clash'}
                    >
                        <Dices size={14} /> Phys ({pools.clashPhysicalTotal}d6)
                    </button>
                    <button
                        type="button"
                        disabled={reactionBlocked}
                        onClick={() => onRoll(m.id, 'special')}
                        className="action-button action-button--dark maneuvers-modal__action-btn"
                        title={reactionBlocked ? 'Reactions disabled' : 'Roll Special Clash'}
                    >
                        <Sparkles size={14} /> Spec ({pools.clashSpecialTotal}d6)
                    </button>
                </div>
            );
        }

        if (m.id === 'maneuver-struggle') {
            return (
                <div className="maneuvers-modal__roll-group">
                    <button
                        type="button"
                        onClick={() => onRoll(m.id, 'acc')}
                        className="action-button action-button--theme maneuvers-modal__action-btn"
                        title="Roll Struggle Accuracy"
                    >
                        <Dices size={14} /> Acc ({pools.struggleAccTotal}d6)
                    </button>
                    <button
                        type="button"
                        onClick={() => onRoll(m.id, 'damage-phys')}
                        className="action-button action-button--dark maneuvers-modal__action-btn"
                        title="Roll Physical Struggle Damage (Typeless)"
                    >
                        <Dumbbell size={14} /> Phys Dmg ({pools.struggleDmgPhysTotal}d6)
                    </button>
                    <button
                        type="button"
                        onClick={() => onRoll(m.id, 'damage-spec')}
                        className="action-button action-button--dark maneuvers-modal__action-btn"
                        title="Roll Special Struggle Damage (Typeless)"
                    >
                        <Sparkles size={14} /> Spec Dmg ({pools.struggleDmgSpecTotal}d6)
                    </button>
                </div>
            );
        }

        if (m.id === 'maneuver-help-another') {
            return (
                <div className="maneuvers-modal__roll-group">
                    <button
                        type="button"
                        disabled={reactionBlocked}
                        onClick={onOpenHelpAnother}
                        className="action-button action-button--dark maneuvers-modal__action-btn"
                        title={
                            reactionBlocked
                                ? 'Reactions disabled'
                                : "Look up Ally's Move to calculate Help Another dice"
                        }
                    >
                        <Search size={14} /> Ally Move
                    </button>
                    <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                        Dice:
                    </span>
                    <div className="maneuvers-modal__help-spinner">
                        <NumberSpinner value={helpDice} onChange={onChangeHelpDice} min={1} max={6} />
                    </div>
                    <button
                        type="button"
                        disabled={reactionBlocked}
                        onClick={() => onRoll(m.id, undefined, helpDice)}
                        className="action-button action-button--theme maneuvers-modal__action-btn"
                        title="Roll Chance dice for Help Another"
                    >
                        <Dices size={14} /> Roll Chance ({helpDice}d6)
                    </button>
                </div>
            );
        }

        let rollLabel = 'Roll';
        let rollIcon = <Dices size={14} />;

        if (m.id === 'maneuver-evasion') {
            rollLabel = `Evade (${pools.evasionTotal}d6)`;
        } else if (m.id === 'maneuver-cover-an-ally') {
            rollLabel = `Cover (${pools.coverTotal}d6)`;
            rollIcon = <Shield size={14} />;
        } else if (m.id === 'maneuver-run-away') {
            rollLabel = `Run (${pools.runAwayTotal}d6)`;
            rollIcon = <Footprints size={14} />;
        } else if (m.id === 'maneuver-stabilize-an-ally') {
            rollLabel = `Stabilize (${pools.stabilizeTotal}d6)`;
            rollIcon = <HeartPulse size={14} />;
        } else if (m.id === 'maneuver-ambush') {
            rollLabel = `Ambush (${pools.ambushTotal}d6)`;
        } else if (m.id === 'maneuver-grapple') {
            rollLabel = `Grapple (${pools.grappleTotal}d6)`;
        }

        return (
            <div className="maneuvers-modal__roll-group">
                <button
                    type="button"
                    disabled={reactionBlocked}
                    onClick={() => onRoll(m.id)}
                    className="action-button action-button--theme maneuvers-modal__action-btn"
                    title={reactionBlocked ? 'Reactions disabled' : rollLabel}
                >
                    {rollIcon} {rollLabel}
                </button>
            </div>
        );
    };

    return (
        <div className="maneuvers-modal__card">
            <div className="maneuvers-modal__card-header">
                <div className="maneuvers-modal__card-name-group">
                    <span className="maneuvers-modal__card-name">{m.name}</span>
                    <span className="maneuvers-modal__badge maneuvers-modal__badge--category">{m.category}</span>
                    {m.reaction && (
                        <span
                            className={`maneuvers-modal__badge ${
                                reactionBlocked
                                    ? 'maneuvers-modal__badge--disabled'
                                    : 'maneuvers-modal__badge--reaction'
                            }`}
                        >
                            {m.reaction} {reactionBlocked ? '(Disabled)' : ''}
                        </span>
                    )}
                </div>
                {renderPoolBadge()}
            </div>

            <div className="maneuvers-modal__card-body">
                <div className="maneuvers-modal__card-stats-row">
                    <span>
                        Accuracy: <strong>{m.accuracy}</strong>
                    </span>
                    <span>
                        Target: <strong>{m.target}</strong>
                    </span>
                    {m.power !== '—' && (
                        <span>
                            Power: <strong>{m.power}</strong>
                        </span>
                    )}
                </div>

                <p className="maneuvers-modal__card-effect">{m.addedEffect}</p>

                {(m.description || m.ifSuccessful || m.cannotBeUsedAgainst || m.example || m.note) && (
                    <>
                        <button type="button" onClick={onToggleExpand} className="maneuvers-modal__accordion-btn">
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? 'Hide Details' : 'View Rules & Examples'}
                        </button>

                        {isExpanded && (
                            <div className="maneuvers-modal__card-details">
                                {m.description && <p style={{ margin: 0 }}>{m.description}</p>}
                                {m.ifSuccessful && m.ifSuccessful.length > 0 && (
                                    <div>
                                        <strong style={{ color: '#10b981' }}>If Successful:</strong>
                                        <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                                            {m.ifSuccessful.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {m.cannotBeUsedAgainst && (
                                    <div>
                                        <strong style={{ color: 'var(--semantic-danger)' }}>
                                            {m.cannotBeUsedAgainst.title}:
                                        </strong>
                                        <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                                            {m.cannotBeUsedAgainst.items.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {m.example && (
                                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                        Scenario: {m.example.scenario} ({m.example.roll})
                                    </div>
                                )}
                                {m.note && <div style={{ color: 'var(--semantic-danger)' }}>* {m.note}</div>}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="maneuvers-modal__card-actions">
                {renderActionButtons()}
                <button
                    type="button"
                    onClick={() => onBroadcast(m)}
                    className="action-button action-button--dark maneuvers-modal__broadcast-btn"
                    title={`Broadcast ${m.name} to chat`}
                >
                    <Megaphone size={12} /> Broadcast
                </button>
            </div>
        </div>
    );
};
