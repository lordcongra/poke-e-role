import React from 'react';
import { Megaphone, Lightbulb, ShieldAlert } from 'lucide-react';
import {
    FLING_DAMAGE_TABLE,
    ENVIRONMENT_POWER_TABLE,
    BERRY_FLAVORS_TABLE,
    ENCORE_CLARIFICATION,
    FLING_CLARIFICATION,
    HIDDEN_POWER_CLARIFICATION,
    NATURE_SECRET_POWER_CLARIFICATION,
    NATURAL_GIFT_CLARIFICATION,
    SNATCH_CLARIFICATION,
    SUBSTITUTE_DECOY_CLARIFICATION,
    NARRATIVE_MOVES_GUIDE
} from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/diceRoller';

export const GmMoveClarificationsCard: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Encore */}
            <div
                style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {ENCORE_CLARIFICATION.title}
                    </strong>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                `GM Screen: ${ENCORE_CLARIFICATION.title}`,
                                `**${ENCORE_CLARIFICATION.title}**\n*Added Effect:* ${ENCORE_CLARIFICATION.addedEffect}\n\n` +
                                    ENCORE_CLARIFICATION.rules.map((r) => `• ${r}`).join('\n')
                            )
                        }
                        title="Broadcast Encore Rules"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-sub)', fontStyle: 'italic' }}>
                    &ldquo;{ENCORE_CLARIFICATION.addedEffect}&rdquo;
                </p>
                <ul
                    style={{
                        margin: '4px 0 0 0',
                        paddingLeft: '20px',
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        lineHeight: '1.45'
                    }}
                >
                    {ENCORE_CLARIFICATION.rules.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {r}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Fling */}
            <div
                style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {FLING_CLARIFICATION.title}
                    </strong>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                `GM Screen: ${FLING_CLARIFICATION.title}`,
                                `**${FLING_CLARIFICATION.title}**:\n` +
                                    FLING_DAMAGE_TABLE.map(
                                        (f) => `• ${f.itemType}: **${f.extraDice}** to Damage Pool`
                                    ).join('\n') +
                                    '\n\n• ' +
                                    FLING_CLARIFICATION.rules.join('\n• ')
                            )
                        }
                        title="Broadcast Fling Rules"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Kind of Held Item</th>
                                <th>Extra Damage Dice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {FLING_DAMAGE_TABLE.map((f) => (
                                <tr key={f.itemType}>
                                    <td>
                                        <strong>{f.itemType}</strong>
                                    </td>
                                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{f.extraDice}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul
                    style={{
                        margin: '4px 0 0 0',
                        paddingLeft: '20px',
                        fontSize: '0.82rem',
                        color: 'var(--text-sub)',
                        lineHeight: '1.45'
                    }}
                >
                    {FLING_CLARIFICATION.rules.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {r}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Nature Power & Secret Power */}
            <div
                style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {NATURE_SECRET_POWER_CLARIFICATION.title}
                    </strong>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                'GM Screen: Nature & Secret Power Environments',
                                '**Nature Power & Secret Power Alignment**:\n' +
                                    ENVIRONMENT_POWER_TABLE.map(
                                        (e) =>
                                            `• ${e.environment}: Nature Type [**${e.energyType}**] | Secret Status: [**${e.statusAilment}**]`
                                    ).join('\n')
                            )
                        }
                        title="Broadcast Environment Power Table"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Environment / Terrain</th>
                                <th>Energy Type (Nature Power)</th>
                                <th>Status Ailment (Secret Power)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ENVIRONMENT_POWER_TABLE.map((e) => (
                                <tr key={e.environment}>
                                    <td>
                                        <strong>{e.environment}</strong>
                                    </td>
                                    <td>
                                        <span
                                            className="type-badge"
                                            style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                        >
                                            {e.energyType}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{e.statusAilment}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul
                    style={{
                        margin: '4px 0 0 0',
                        paddingLeft: '20px',
                        fontSize: '0.82rem',
                        color: 'var(--text-sub)',
                        lineHeight: '1.45'
                    }}
                >
                    {NATURE_SECRET_POWER_CLARIFICATION.rules.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {r}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Natural Gift */}
            <div
                style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {NATURAL_GIFT_CLARIFICATION.title}
                    </strong>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                'GM Screen: Natural Gift Berry Flavors',
                                '**Natural Gift Berry Flavors & Types**:\n' +
                                    BERRY_FLAVORS_TABLE.map((b) => `• ${b.flavor}: **${b.type}**`).join('\n')
                            )
                        }
                        title="Broadcast Natural Gift Flavors"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-sub)' }}>
                    {NATURAL_GIFT_CLARIFICATION.rule}
                </p>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: '6px',
                        marginTop: '4px'
                    }}
                >
                    {BERRY_FLAVORS_TABLE.map((b) => (
                        <div
                            key={b.flavor}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                backgroundColor: 'var(--panel-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                fontSize: '0.78rem'
                            }}
                        >
                            <span>{b.flavor}</span>
                            <strong style={{ color: 'var(--primary)' }}>{b.type}</strong>
                        </div>
                    ))}
                </div>
            </div>

            {/* Snatch */}
            <div
                style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {SNATCH_CLARIFICATION.title}
                    </strong>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                `GM Screen: ${SNATCH_CLARIFICATION.title}`,
                                `**${SNATCH_CLARIFICATION.title}**:\n` +
                                    SNATCH_CLARIFICATION.rules.map((r) => `• ${r}`).join('\n')
                            )
                        }
                        title="Broadcast Snatch Rules"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
                <ul
                    style={{
                        margin: '4px 0 0 0',
                        paddingLeft: '20px',
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        lineHeight: '1.45'
                    }}
                >
                    {SNATCH_CLARIFICATION.rules.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {r}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Substitute Decoys */}
            <div
                style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--panel-alt)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldAlert size={16} color="var(--primary)" />
                        <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                            {SUBSTITUTE_DECOY_CLARIFICATION.title}
                        </strong>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={() =>
                            broadcastInfo(
                                `GM Screen: ${SUBSTITUTE_DECOY_CLARIFICATION.title}`,
                                `**${SUBSTITUTE_DECOY_CLARIFICATION.title}**:\n` +
                                    SUBSTITUTE_DECOY_CLARIFICATION.rules.map((r) => `• ${r}`).join('\n')
                            )
                        }
                        title="Broadcast Substitute Decoy Rules"
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
                <ul
                    style={{
                        margin: '4px 0 0 0',
                        paddingLeft: '20px',
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        lineHeight: '1.45'
                    }}
                >
                    {SUBSTITUTE_DECOY_CLARIFICATION.rules.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                            {r}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Hidden Power & Narrative Moves Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {/* Hidden Power */}
                <div
                    style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                            {HIDDEN_POWER_CLARIFICATION.title}
                        </strong>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${HIDDEN_POWER_CLARIFICATION.title}`,
                                    `**${HIDDEN_POWER_CLARIFICATION.title}**: ${HIDDEN_POWER_CLARIFICATION.rule}`
                                )
                            }
                            title="Broadcast Hidden Power Rule"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
                        {HIDDEN_POWER_CLARIFICATION.rule}
                    </p>
                </div>

                {/* Narrative Moves */}
                <div
                    style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lightbulb size={16} color="var(--primary)" />
                            <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                                {NARRATIVE_MOVES_GUIDE.title}
                            </strong>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                            onClick={() =>
                                broadcastInfo(
                                    `GM Screen: ${NARRATIVE_MOVES_GUIDE.title}`,
                                    `**${NARRATIVE_MOVES_GUIDE.title}**\n${NARRATIVE_MOVES_GUIDE.summary}\n\n` +
                                        NARRATIVE_MOVES_GUIDE.examples.map((ex) => `• ${ex}`).join('\n')
                                )
                            }
                            title="Broadcast Narrative Moves"
                        >
                            <Megaphone size={12} /> Broadcast
                        </button>
                    </div>
                    <ul
                        style={{
                            margin: 0,
                            paddingLeft: '18px',
                            fontSize: '0.8rem',
                            color: 'var(--text-main)',
                            lineHeight: '1.4'
                        }}
                    >
                        {NARRATIVE_MOVES_GUIDE.examples.map((ex, idx) => (
                            <li key={idx} style={{ marginBottom: '3px' }}>
                                {ex}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
