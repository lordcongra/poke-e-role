import React from 'react';
import { Megaphone, AlertCircle, Zap } from 'lucide-react';
import {
    MANEUVERS_CORE_RULES,
    CORE_MANEUVERS_DATA,
    formatManeuverBroadcast,
    type ManeuverData
} from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/diceRoller';

interface GmManeuverCardsProps {
    itemId: string;
    onBroadcastManeuver?: (m: ManeuverData) => void;
}

export const GmManeuverCards: React.FC<GmManeuverCardsProps> = ({ itemId, onBroadcastManeuver }) => {
    const handleBroadcastManeuver = (m: ManeuverData) => {
        if (onBroadcastManeuver) {
            onBroadcastManeuver(m);
        } else {
            broadcastInfo(`Maneuver: ${m.name}`, formatManeuverBroadcast(m));
        }
    };

    const renderSingleManeuverCard = (m: ManeuverData) => (
        <div
            key={m.id}
            style={{
                backgroundColor: 'var(--panel-alt)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Top Bar: Name, Power, Type, Category, Reaction */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderBottom: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '6px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{m.name}</strong>
                    <span
                        style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--row-even)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-sub)'
                        }}
                    >
                        {m.category}
                    </span>
                    {m.reaction && (
                        <span
                            style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#10b981',
                                fontWeight: 'bold'
                            }}
                        >
                            {m.reaction}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--dark, #1f2937)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            fontWeight: 600
                        }}
                    >
                        POWER: <strong>{m.power}</strong>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() => handleBroadcastManeuver(m)}
                        title={`Broadcast ${m.name} to chat`}
                        aria-label={`Broadcast ${m.name}`}
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
            </div>

            {/* Middle: Accuracy, Damage Pool, Target, Effect */}
            <div
                style={{
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.85rem'
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '6px',
                        backgroundColor: 'var(--panel-bg)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem', display: 'block' }}>
                            ACCURACY:
                        </span>
                        <strong>{m.accuracy}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem', display: 'block' }}>
                            DAMAGE POOL:
                        </span>
                        <strong>{m.damagePool}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem', display: 'block' }}>TARGET:</span>
                        <strong>{m.target}</strong>
                    </div>
                </div>

                <div>
                    <span
                        style={{
                            color: 'var(--text-sub)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: '2px'
                        }}
                    >
                        ADDED EFFECT:
                    </span>
                    <p style={{ margin: 0, lineHeight: '1.45', color: 'var(--text-main)' }}>{m.addedEffect}</p>
                </div>

                {m.note && (
                    <div
                        style={{
                            padding: '6px 8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--semantic-danger, #ef4444)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{m.note}</span>
                    </div>
                )}
            </div>

            {/* Bottom: Flavor text */}
            <div
                style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: 'var(--text-sub)',
                    lineHeight: '1.4'
                }}
            >
                "{m.flavor}"
            </div>
        </div>
    );

    if (itemId === 'maneuvers-core-rules') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                    style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontSize: '0.88rem',
                        lineHeight: '1.5'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={18} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                                {MANEUVERS_CORE_RULES.title}
                            </strong>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${MANEUVERS_CORE_RULES.title}`,
                                    `**${MANEUVERS_CORE_RULES.title}**\n${MANEUVERS_CORE_RULES.summary}\n\n` +
                                        MANEUVERS_CORE_RULES.rules.map((r) => `• ${r}`).join('\n')
                                )
                            }
                            title="Broadcast Core Maneuvers Rules"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>

                    <p style={{ margin: '0 0 10px 0', color: 'var(--text-sub)' }}>{MANEUVERS_CORE_RULES.summary}</p>

                    {/* Prominent Golden Rule Callout: CANNOT Clash */}
                    <div
                        style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '6px',
                            marginBottom: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--semantic-danger, #ef4444)',
                                fontWeight: 'bold'
                            }}
                        >
                            <AlertCircle size={16} />
                            <span>Golden Rule: Maneuvers CANNOT Clash nor be Clashed</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
                            Maneuvers can <strong>NEVER</strong> be used to Clash against an incoming attack, nor can an
                            opponent Clash against a Maneuver. Because <strong>Struggle</strong> is officially
                            classified as a Maneuver (not a Move), <strong>Struggle cannot be used to Clash!</strong>
                        </p>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5', color: 'var(--text-main)' }}>
                        {MANEUVERS_CORE_RULES.rules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    if (itemId === 'maneuvers-list-all') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                    style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontSize: '0.82rem',
                        color: 'var(--text-sub)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                    }}
                >
                    <span>
                        All 9 core typeless maneuvers from the official Pokerole rulebook. Universal to both Pokémon and
                        Humans.
                    </span>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                'GM Screen: Official Typeless Maneuvers',
                                '**Official Typeless Maneuvers (Pokerole Core)**:\n' +
                                    CORE_MANEUVERS_DATA.map(
                                        (m) =>
                                            `• **${m.name}** [${m.category}] — Acc: ${m.accuracy} | Target: ${m.target}`
                                    ).join('\n') +
                                    '\n\n*Note: Maneuvers can only be used once per round and CANNOT clash nor be clashed!*'
                            )
                        }
                        title="Broadcast List of All Maneuvers"
                    >
                        <Megaphone size={12} /> Broadcast All
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {CORE_MANEUVERS_DATA.map((m) => renderSingleManeuverCard(m))}
                </div>
            </div>
        );
    }

    // Check if itemId corresponds to a single maneuver (e.g. 'maneuver-ambush', 'maneuver-struggle', etc.)
    const singleManeuver = CORE_MANEUVERS_DATA.find((m) => m.id === itemId);
    if (singleManeuver) {
        return renderSingleManeuverCard(singleManeuver);
    }

    return null;
};
