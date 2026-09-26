import React from 'react';
import { Megaphone, AlertTriangle, Swords, Clock, Users, Target } from 'lucide-react';
import {
    TRAINER_ACTIONS_TABLE,
    TRAINER_INITIATIVE_RULES,
    TRAINER_COMMANDING_RULES,
    TRAINER_SWITCHING_RULES,
    POKEBALL_THROWING_RULES,
    HUMAN_COMBAT_RULES,
    type TrainerActionRow
} from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/diceRoller';

interface GmTrainerCardsProps {
    itemId: string;
    onBroadcastTrainerAction?: (t: TrainerActionRow) => void;
}

export const GmTrainerCards: React.FC<GmTrainerCardsProps> = ({ itemId, onBroadcastTrainerAction }) => {
    const handleBroadcastAction = (t: TrainerActionRow) => {
        if (onBroadcastTrainerAction) {
            onBroadcastTrainerAction(t);
        } else {
            broadcastInfo(
                `Trainer Action: ${t.action}`,
                `**Trainer Action: ${t.action}**\n• **In Trainer Area**: ${t.trainerArea}\n• **In the Fray**: ${t.inFray}`
            );
        }
    };

    switch (itemId) {
        case 'trainer-actions-table':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Trainer Action</th>
                                    <th>In a Trainer Area</th>
                                    <th>In the Fray</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TRAINER_ACTIONS_TABLE.map((t) => (
                                    <tr key={t.action}>
                                        <td>
                                            <strong>{t.action}</strong>
                                        </td>
                                        <td>{t.trainerArea}</td>
                                        <td>{t.inFray}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => handleBroadcastAction(t)}
                                                title={`Broadcast ${t.action} to chat/roll log`}
                                                aria-label={`Broadcast ${t.action}`}
                                            >
                                                <Megaphone size={12} /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div
                        style={{
                            fontSize: '0.85rem',
                            padding: '10px 14px',
                            backgroundColor: 'var(--panel-alt)',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            lineHeight: '1.5'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Users size={16} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)' }}>Action Economy Limit:</strong>
                        </div>
                        Just like Pokémon, a Trainer can take up to <strong>5 Actions per Round</strong> (bound to the
                        Multiple Action Difficulty chart). Actions taken while in the fray or ordering items/switches
                        all draw from this pool.
                    </div>
                </div>
            );

        case 'trainer-initiative':
            return (
                <div
                    style={{
                        fontSize: '0.85rem',
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                                {TRAINER_INITIATIVE_RULES.title}
                            </strong>
                            <span
                                className="gm-card-badge"
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--row-even)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-sub)'
                                }}
                            >
                                {TRAINER_INITIATIVE_RULES.badge}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${TRAINER_INITIATIVE_RULES.title}`,
                                    `**${TRAINER_INITIATIVE_RULES.title}**\n` +
                                        TRAINER_INITIATIVE_RULES.rules.map((r) => `• ${r}`).join('\n')
                                )
                            }
                            title="Broadcast Initiative Rules"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                        {TRAINER_INITIATIVE_RULES.rules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            );

        case 'trainer-commanding':
            return (
                <div
                    style={{
                        fontSize: '0.85rem',
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                                {TRAINER_COMMANDING_RULES.title}
                            </strong>
                            <span
                                className="gm-card-badge"
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--row-even)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-sub)'
                                }}
                            >
                                {TRAINER_COMMANDING_RULES.badge}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${TRAINER_COMMANDING_RULES.title}`,
                                    `**${TRAINER_COMMANDING_RULES.title}**\n` +
                                        TRAINER_COMMANDING_RULES.rules.map((r) => `• ${r}`).join('\n')
                                )
                            }
                            title="Broadcast Commanding Rules"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                        {TRAINER_COMMANDING_RULES.rules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>
                                {rule.startsWith('Homebrew Note:') ? (
                                    <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>{rule}</span>
                                ) : (
                                    rule
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            );

        case 'trainer-switching':
            return (
                <div
                    style={{
                        fontSize: '0.85rem',
                        padding: '12px 14px',
                        backgroundColor: 'rgba(234, 179, 8, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} color="#eab308" />
                            <strong style={{ color: '#eab308', fontSize: '0.95rem' }}>
                                {TRAINER_SWITCHING_RULES.title}
                            </strong>
                            <span
                                className="gm-card-badge"
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(234, 179, 8, 0.2)',
                                    border: '1px solid rgba(234, 179, 8, 0.4)',
                                    color: '#eab308',
                                    fontWeight: 'bold'
                                }}
                            >
                                {TRAINER_SWITCHING_RULES.badge}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${TRAINER_SWITCHING_RULES.title}`,
                                    `⚠️ **${TRAINER_SWITCHING_RULES.title}**\n` +
                                        TRAINER_SWITCHING_RULES.rules.map((r) => `• ${r}`).join('\n')
                                )
                            }
                            title="Broadcast Switching Rules"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>

                    <div
                        style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(234, 179, 8, 0.15)',
                            borderRadius: '4px',
                            fontWeight: 600,
                            color: '#eab308'
                        }}
                    >
                        {TRAINER_SWITCHING_RULES.warning}
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                        {TRAINER_SWITCHING_RULES.rules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            );

        case 'humans-in-combat':
            return (
                <div
                    style={{
                        fontSize: '0.85rem',
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Swords size={16} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                                {HUMAN_COMBAT_RULES.title}
                            </strong>
                            <span
                                className="gm-card-badge"
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--row-even)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-sub)'
                                }}
                            >
                                {HUMAN_COMBAT_RULES.badge}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${HUMAN_COMBAT_RULES.title}`,
                                    `**${HUMAN_COMBAT_RULES.title}**\n` +
                                        HUMAN_COMBAT_RULES.rules.map((r) => `• ${r}`).join('\n')
                                )
                            }
                            title="Broadcast Human Combat Rules"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                        {HUMAN_COMBAT_RULES.rules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>
                                {rule.includes('CANNOT Clash') ? (
                                    <span style={{ color: 'var(--semantic-danger, #ef4444)', fontWeight: 600 }}>
                                        {rule}
                                    </span>
                                ) : (
                                    rule
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            );

        case 'pokeball-throwing-timing':
            return (
                <div
                    style={{
                        fontSize: '0.85rem',
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={16} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                                {POKEBALL_THROWING_RULES.title}
                            </strong>
                            <span
                                className="gm-card-badge"
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--row-even)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-sub)'
                                }}
                            >
                                {POKEBALL_THROWING_RULES.badge}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${POKEBALL_THROWING_RULES.title}`,
                                    `**${POKEBALL_THROWING_RULES.title}**\n` +
                                        POKEBALL_THROWING_RULES.rules.map((r) => `• ${r}`).join('\n')
                                )
                            }
                            title="Broadcast Pokéball Throwing Rules"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                        {POKEBALL_THROWING_RULES.rules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: '6px' }}>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            );

        default:
            return null;
    }
};
