import React from 'react';
import { Megaphone, AlertCircle, Zap } from 'lucide-react';
import {
    MANEUVERS_CORE_RULES,
    CORE_MANEUVERS_DATA,
    formatManeuverBroadcast,
    type ManeuverData
} from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/diceRoller';
import { GmManeuverCardItem } from './GmManeuverCardItem';

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
                    {CORE_MANEUVERS_DATA.map((m) => (
                        <GmManeuverCardItem key={m.id} maneuver={m} onBroadcast={handleBroadcastManeuver} />
                    ))}
                </div>
            </div>
        );
    }

    // Check if itemId corresponds to a single maneuver (e.g. 'maneuver-ambush', 'maneuver-struggle', etc.)
    const singleManeuver = CORE_MANEUVERS_DATA.find((m) => m.id === itemId);
    if (singleManeuver) {
        return <GmManeuverCardItem maneuver={singleManeuver} onBroadcast={handleBroadcastManeuver} />;
    }

    return null;
};
