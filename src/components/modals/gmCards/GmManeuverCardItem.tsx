import { Megaphone, AlertCircle, CheckCircle2, ShieldAlert, Zap, BookOpen, Info } from 'lucide-react';
import type { ManeuverData } from '../../../data/gmScreenData';

interface GmManeuverCardItemProps {
    maneuver: ManeuverData;
    onBroadcast: (m: ManeuverData) => void;
}

export function GmManeuverCardItem({ maneuver: m, onBroadcast }: GmManeuverCardItemProps) {
    return (
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
                        onClick={() => onBroadcast(m)}
                        title={`Broadcast ${m.name} to chat`}
                        aria-label={`Broadcast ${m.name}`}
                    >
                        <Megaphone size={12} /> Broadcast
                    </button>
                </div>
            </div>

            {/* Middle: Accuracy, Damage Pool, Target, Effect, Details */}
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

                {m.description && (
                    <p style={{ margin: 0, lineHeight: '1.45', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                        {m.description}
                    </p>
                )}

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

                {m.ifSuccessful && m.ifSuccessful.length > 0 && (
                    <div
                        style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '6px',
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
                                color: '#10b981',
                                fontWeight: 700,
                                fontSize: '0.78rem'
                            }}
                        >
                            <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                            <span>IF SUCCESSFUL:</span>
                        </div>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: '18px',
                                fontSize: '0.82rem',
                                color: 'var(--text-main)',
                                lineHeight: '1.45'
                            }}
                        >
                            {m.ifSuccessful.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: idx === m.ifSuccessful!.length - 1 ? 0 : '3px' }}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {m.cannotBeUsedAgainst && m.cannotBeUsedAgainst.items.length > 0 && (
                    <div
                        style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
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
                                fontWeight: 700,
                                fontSize: '0.78rem'
                            }}
                        >
                            <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                            <span>{m.cannotBeUsedAgainst.title.toUpperCase()}</span>
                        </div>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: '18px',
                                fontSize: '0.82rem',
                                color: 'var(--text-main)',
                                lineHeight: '1.45'
                            }}
                        >
                            {m.cannotBeUsedAgainst.items.map((item, idx) => (
                                <li
                                    key={idx}
                                    style={{
                                        marginBottom: idx === m.cannotBeUsedAgainst!.items.length - 1 ? 0 : '3px'
                                    }}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {m.actionEconomyNote && (
                    <div
                        style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '0.82rem',
                            color: 'var(--text-main)',
                            lineHeight: '1.4'
                        }}
                    >
                        <Zap size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong style={{ color: '#3b82f6', marginRight: '6px', fontSize: '0.78rem' }}>
                                ACTION ECONOMY:
                            </strong>
                            <span>{m.actionEconomyNote}</span>
                        </div>
                    </div>
                )}

                {m.example && (
                    <div
                        style={{
                            padding: '8px 10px',
                            backgroundColor: 'var(--row-even)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '0.82rem',
                            lineHeight: '1.4'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: '0.78rem'
                            }}
                        >
                            <BookOpen size={14} style={{ flexShrink: 0 }} />
                            <span>CANONICAL EXAMPLE:</span>
                        </div>
                        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-main)' }}>
                            "{m.example.scenario}"
                        </p>
                        <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.8rem' }}>
                            <strong style={{ color: 'var(--text-main)' }}>Roll:</strong> {m.example.roll}
                        </p>
                    </div>
                )}

                {m.additionalNotes && m.additionalNotes.length > 0 && (
                    <div
                        style={{
                            padding: '6px 8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--text-sub)'
                        }}
                    >
                        {m.additionalNotes.map((note, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <Info size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
                                <span style={{ lineHeight: '1.4' }}>{note}</span>
                            </div>
                        ))}
                    </div>
                )}

                {m.note && (!m.additionalNotes || !m.additionalNotes.includes(m.note)) && (
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
}
