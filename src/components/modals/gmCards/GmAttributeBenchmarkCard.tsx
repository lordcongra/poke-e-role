import React from 'react';
import { Megaphone, Dumbbell, Gauge } from 'lucide-react';
import {
    STRENGTH_LIFTING_CHART,
    DEXTERITY_SPEED_CHART,
    STRENGTH_RULES,
    DEXTERITY_RULES
} from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/diceRoller';

export const GmAttributeBenchmarkCard: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
                style={{
                    fontSize: '0.85rem',
                    padding: '10px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    color: 'var(--text-sub)',
                    lineHeight: '1.45'
                }}
            >
                Narrative benchmarks for maximum lifting capacity and top running speed for humans and most Pokémon.
                Certain species can lift varying amounts or move at different speeds at the Narrator&apos;s discretion.
            </div>

            {/* Strength Lifting Capacity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Dumbbell size={18} color="var(--primary)" />
                        <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                            Strength: Narrative Lifting Capacity
                        </strong>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                'GM Screen: Strength Lifting Capacity',
                                '**Strength Lifting Capacity Chart**:\n' +
                                    STRENGTH_LIFTING_CHART.map(
                                        (s) =>
                                            `• Score ${s.score} (${s.dots}): **${s.valueImperial}** / **${s.valueMetric}**`
                                    ).join('\n') +
                                    '\n\n• ' +
                                    STRENGTH_RULES.join('\n• ')
                            )
                        }
                        title="Broadcast Strength Chart"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>

                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Score</th>
                                <th>Rating</th>
                                <th>Max Weight (Imperial)</th>
                                <th>Max Weight (Metric)</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {STRENGTH_LIFTING_CHART.map((s) => (
                                <tr key={s.score}>
                                    <td>
                                        <strong>{s.score}</strong>
                                    </td>
                                    <td style={{ letterSpacing: '2px', color: 'var(--primary)' }}>{s.dots}</td>
                                    <td>
                                        <strong>{s.valueImperial}</strong>
                                    </td>
                                    <td>{s.valueMetric}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() =>
                                                broadcastInfo(
                                                    `Strength Benchmark: ${s.score}`,
                                                    `**Strength ${s.score}** (${s.dots}): Max Lifting Capacity is **${s.valueImperial}** / **${s.valueMetric}**.`
                                                )
                                            }
                                            title={`Broadcast Strength ${s.score}`}
                                        >
                                            <Megaphone size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ul
                    style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '0.82rem',
                        color: 'var(--text-sub)',
                        lineHeight: '1.4'
                    }}
                >
                    {STRENGTH_RULES.map((rule, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {rule}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Dexterity Maximum Speed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Gauge size={18} color="var(--primary)" />
                        <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                            Dexterity: Narrative Maximum Speed
                        </strong>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                'GM Screen: Dexterity Maximum Speed',
                                '**Dexterity Maximum Speed Chart**:\n' +
                                    DEXTERITY_SPEED_CHART.map(
                                        (d) =>
                                            `• Score ${d.score} (${d.dots}): **${d.valueImperial}** / **${d.valueMetric}**`
                                    ).join('\n') +
                                    '\n\n• ' +
                                    DEXTERITY_RULES.join('\n• ')
                            )
                        }
                        title="Broadcast Dexterity Speed Chart"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>

                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Score</th>
                                <th>Rating</th>
                                <th>Max Speed (Imperial)</th>
                                <th>Max Speed (Metric)</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DEXTERITY_SPEED_CHART.map((d) => (
                                <tr key={d.score}>
                                    <td>
                                        <strong>{d.score}</strong>
                                    </td>
                                    <td style={{ letterSpacing: '2px', color: 'var(--primary)' }}>{d.dots}</td>
                                    <td>
                                        <strong>{d.valueImperial}</strong>
                                    </td>
                                    <td>{d.valueMetric}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() =>
                                                broadcastInfo(
                                                    `Dexterity Benchmark: ${d.score}`,
                                                    `**Dexterity ${d.score}** (${d.dots}): Narrative Max Speed is **${d.valueImperial}** / **${d.valueMetric}**.`
                                                )
                                            }
                                            title={`Broadcast Dexterity ${d.score}`}
                                        >
                                            <Megaphone size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ul
                    style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '0.82rem',
                        color: 'var(--text-sub)',
                        lineHeight: '1.4'
                    }}
                >
                    {DEXTERITY_RULES.map((rule, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {rule}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
