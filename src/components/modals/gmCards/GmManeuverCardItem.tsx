import { Megaphone, AlertCircle } from 'lucide-react';
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
}
