import React from 'react';
import { Megaphone, ArrowUp, ArrowDown } from 'lucide-react';
import { REACTION_RULES_EXAMPLES, REACTION_CORE_RULES, type ReactionRuleExample } from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/diceRoller';

interface GmReactionRulesCardProps {
    onBroadcastReactionExample?: (ex: ReactionRuleExample) => void;
    onBroadcastReactionCoreRules?: () => void;
}

export const GmReactionRulesCard: React.FC<GmReactionRulesCardProps> = ({
    onBroadcastReactionExample,
    onBroadcastReactionCoreRules
}) => {
    const handleBroadcastExample = (ex: ReactionRuleExample) => {
        if (onBroadcastReactionExample) {
            onBroadcastReactionExample(ex);
        } else {
            broadcastInfo(
                `Reaction Timing: ${ex.title}`,
                `**${ex.title}**\n*Scenario:* "${ex.scenario}"\n• **Order:** ${ex.orderSteps.join(' ➔ ')}\n• **Resolution:** ${ex.explanation}`
            );
        }
    };

    const handleBroadcastCoreRules = () => {
        if (onBroadcastReactionCoreRules) {
            onBroadcastReactionCoreRules();
        } else {
            broadcastInfo(
                'Key Reaction & Late Reaction Rules',
                '**Core Reaction Rules Checklist**:\n' +
                    REACTION_CORE_RULES.map((r) => `• **${r.title}**: ${r.desc}`).join('\n')
            );
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            {/* Comparison Overview Banner */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '10px'
                }}
            >
                {/* Reactions Box */}
                <div
                    style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--panel-alt)',
                        border: '1px solid #00ACC1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            style={{
                                backgroundColor: '#00ACC1',
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <ArrowUp size={13} /> Reaction [1..6]
                        </span>
                        <strong style={{ color: '#00ACC1' }}>Resolves BEFORE Action</strong>
                    </div>
                    <p
                        style={{
                            margin: '0',
                            color: 'var(--text-main)',
                            lineHeight: '1.4',
                            fontSize: '0.82rem'
                        }}
                    >
                        Almost instantaneous movements used when it is not your turn yet (range from 1 to 6). Higher
                        Reaction numbers resolve <strong>FIRST</strong>.
                    </p>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                        <em>
                            Examples: Quick Attack / Water Shuriken (↑1), Extreme Speed (↑2), Upper Hand (↑3),
                            King&apos;s Shield (↑4), Protect (↑5), Evade / Clash maneuvers (↑6).
                        </em>
                    </div>
                </div>

                {/* Late Reactions Box */}
                <div
                    style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--panel-alt)',
                        border: '1px solid #7E57C2',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            style={{
                                backgroundColor: '#7E57C2',
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <ArrowDown size={13} /> Late Reaction [1..6]
                        </span>
                        <strong style={{ color: '#7E57C2' }}>Resolves AFTER Action</strong>
                    </div>
                    <p
                        style={{
                            margin: '0',
                            color: 'var(--text-main)',
                            lineHeight: '1.4',
                            fontSize: '0.82rem'
                        }}
                    >
                        Delayed counter-attacks & traps that trigger after taking the hit (range from 1 to 6). Higher
                        Late Reaction numbers resolve <strong>LATER</strong> (Lower numbers resolve first!).
                    </p>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        <em>
                            Examples: Circle Throw / Feint (&darr;1), Shell Trap (&darr;3), Avalanche (&darr;4), Counter
                            / Mirror Coat (&darr;5), Dragon Tail / Roar (&darr;6).
                        </em>
                    </div>
                </div>
            </div>

            {/* Interactive Timing Rules & Examples */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                    Resolution Chains & Battle Scenarios:
                </strong>

                {REACTION_RULES_EXAMPLES.map((ex) => (
                    <div
                        key={ex.id}
                        style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{ex.title}</strong>
                            <button
                                type="button"
                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                onClick={() => handleBroadcastExample(ex)}
                                title="Broadcast scenario to chat/roll log"
                                aria-label={`Broadcast ${ex.title}`}
                            >
                                <Megaphone size={12} /> Broadcast
                            </button>
                        </div>

                        <div
                            style={{
                                color: 'var(--text-main)',
                                fontSize: '0.8rem',
                                fontStyle: 'italic',
                                lineHeight: '1.35'
                            }}
                        >
                            &ldquo;{ex.scenario}&rdquo;
                        </div>

                        {/* Resolution Flow Badges */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexWrap: 'wrap',
                                padding: '6px 10px',
                                backgroundColor: 'var(--panel-bg)',
                                borderRadius: '4px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                Order:
                            </span>
                            {ex.orderSteps.map((step, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        fontSize: '0.76rem',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor:
                                            idx === 0
                                                ? 'color-mix(in srgb, var(--primary) 20%, var(--panel-alt))'
                                                : 'var(--panel-alt)',
                                        border: idx === 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        color: idx === 0 ? 'var(--primary)' : 'var(--text-main)',
                                        fontWeight: idx === 0 ? 'bold' : 'normal'
                                    }}
                                >
                                    {step}
                                </span>
                            ))}
                        </div>

                        <p
                            style={{
                                margin: '0',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                                lineHeight: '1.35'
                            }}
                        >
                            {ex.explanation}
                        </p>
                    </div>
                ))}
            </div>

            {/* Core Rules Checklist */}
            <div
                style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--panel-alt)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '6px'
                    }}
                >
                    <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                        Key Tactical Rules & Limitations
                    </strong>
                    <button
                        type="button"
                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                        onClick={handleBroadcastCoreRules}
                        title="Broadcast Core Reaction Rules to chat/roll log"
                        aria-label="Broadcast Core Reaction Rules"
                    >
                        <Megaphone size={12} /> Broadcast Rules
                    </button>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '8px'
                    }}
                >
                    {REACTION_CORE_RULES.map((r, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '8px 10px',
                                backgroundColor: 'var(--panel-bg)',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px'
                            }}
                        >
                            <strong style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>• {r.title}</strong>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                {r.desc}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
