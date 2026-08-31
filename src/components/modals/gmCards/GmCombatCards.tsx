import React from 'react';
import { Megaphone, Sparkles } from 'lucide-react';
import {
    DIFFICULTY_TABLE,
    WILL_SPENDING,
    COMBAT_FLOW_STEPS,
    MOVE_RESOLUTION_STEPS,
    HOLDING_BACK_OPTIONS,
    REACTION_RULES_EXAMPLES,
    REACTION_CORE_RULES,
    type HoldingBackOption,
    type ReactionRuleExample
} from '../../../data/gmScreenData';

interface GmCombatCardsProps {
    itemId: string;
    onBroadcastWill: (w: (typeof WILL_SPENDING)[0]) => void;
    onBroadcastCombatFlowStep: (s: (typeof COMBAT_FLOW_STEPS)[0]) => void;
    onBroadcastHoldingBack: (opt: HoldingBackOption) => void;
    onBroadcastReactionExample: (ex: ReactionRuleExample) => void;
    onBroadcastReactionCoreRules: () => void;
}

export const GmCombatCards: React.FC<GmCombatCardsProps> = ({
    itemId,
    onBroadcastWill,
    onBroadcastCombatFlowStep,
    onBroadcastHoldingBack,
    onBroadcastReactionExample,
    onBroadcastReactionCoreRules
}) => {
    switch (itemId) {
        case 'skills-and-attributes':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Attributes</th>
                                <th>Fight</th>
                                <th>Survival</th>
                                <th>Social</th>
                                <th>Knowledge</th>
                                <th>Social Attributes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>Strength</strong>
                                </td>
                                <td>Brawl</td>
                                <td>Alert</td>
                                <td>Charm</td>
                                <td>Crafts</td>
                                <td>Tough</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Dexterity</strong>
                                </td>
                                <td>Throw (Human*)</td>
                                <td>Athletic</td>
                                <td>Empathy</td>
                                <td>Lore</td>
                                <td>Cool</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Vitality</strong>
                                </td>
                                <td>Weapons (Human*)</td>
                                <td>Nature</td>
                                <td>Etiquette</td>
                                <td>Medicine</td>
                                <td>Clever</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Special</strong>
                                </td>
                                <td>Evasion</td>
                                <td>Stealth</td>
                                <td>Intimidate</td>
                                <td>Science</td>
                                <td>Beauty</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Insight</strong>
                                </td>
                                <td>Clash (Pokémon^)</td>
                                <td>—</td>
                                <td>Perform</td>
                                <td>—</td>
                                <td>Cute</td>
                            </tr>
                            <tr>
                                <td>—</td>
                                <td>Channel (Pokémon^)</td>
                                <td>—</td>
                                <td>—</td>
                                <td>—</td>
                                <td>—</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-subtext" style={{ marginTop: '6px', marginBottom: 0 }}>
                        * Typically a human skill &nbsp;|&nbsp; ^ Typically a Pokémon skill
                    </p>
                </div>
            );

        case 'successes-required':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Action This Round</th>
                                <th>Required Successes</th>
                                <th>Difficulty Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DIFFICULTY_TABLE.map((d) => (
                                <tr key={d.action}>
                                    <td>
                                        <strong>{d.action}</strong>
                                    </td>
                                    <td className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                        {d.successes}
                                    </td>
                                    <td>{d.difficulty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'will-points':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Spending Option</th>
                                    <th>Cost</th>
                                    <th>Mechanical Effect</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {WILL_SPENDING.map((w) => (
                                    <tr key={w.name}>
                                        <td>
                                            <strong>{w.name}</strong>
                                        </td>
                                        <td>{w.cost}</td>
                                        <td>{w.effect}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => onBroadcastWill(w)}
                                                title={`Broadcast ${w.name} to chat/roll log`}
                                                aria-label={`Broadcast ${w.name}`}
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
                            padding: '8px 12px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--primary)',
                            fontSize: '0.8rem',
                            lineHeight: '1.4'
                        }}
                    >
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Important Rules:</span>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                            <li>
                                In a single round, you may only use <em>Take Your Chances</em> OR{' '}
                                <em>Pushing Fate</em>—not both!
                            </li>
                            <li>
                                Spending all your Will Points in a scene causes the character to faint at the end of
                                the scene.
                            </li>
                        </ul>
                    </div>
                </div>
            );

        case 'combat-flow':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {COMBAT_FLOW_STEPS.map((s) => (
                        <div
                            key={s.step}
                            style={{
                                fontSize: '0.85rem',
                                padding: '8px 10px',
                                backgroundColor: 'var(--panel-alt)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    marginBottom: '4px'
                                }}
                            >
                                <strong style={{ color: 'var(--primary)' }}>
                                    {s.step}. {s.title}
                                </strong>
                                <button
                                    type="button"
                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                    onClick={() => onBroadcastCombatFlowStep(s)}
                                    title={`Broadcast Step ${s.step} to chat/roll log`}
                                    aria-label={`Broadcast Step ${s.step}`}
                                >
                                    <Megaphone size={12} /> Broadcast
                                </button>
                            </div>
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: 'var(--text-main)' }}>
                                {s.items.map((it, idx) => (
                                    <li key={idx}>{it}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );

        case 'using-a-move':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {MOVE_RESOLUTION_STEPS.map((s) => (
                        <div
                            key={s.step}
                            style={{
                                fontSize: '0.85rem',
                                padding: '8px 10px',
                                backgroundColor: 'var(--panel-alt)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
                                Step {s.step}: {s.title}
                            </strong>
                            <p
                                style={{
                                    margin: '0',
                                    color: 'var(--text-main)',
                                    lineHeight: '1.45',
                                    whiteSpace: 'pre-line'
                                }}
                            >
                                {s.desc}
                            </p>
                        </div>
                    ))}

                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '0.82rem',
                            lineHeight: '1.4'
                        }}
                    >
                        <span
                            style={{
                                color: 'var(--primary)',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Sparkles size={15} /> Key Move & Damage Resolution Reminders
                        </span>
                        <ul style={{ margin: '0', paddingLeft: '18px', color: 'var(--text-main)' }}>
                            <li>
                                <strong>0 Successes Minimum Damage:</strong> Even if you roll <strong>0 successes</strong> on your damage dice pool, a successful hit still deals <strong>1 base damage</strong> (unless the foe has Resistance or Immunity).
                            </li>
                            <li>
                                <strong>1+ Success Requirement:</strong> You <strong>must</strong> score at least <strong>1 success</strong> on the damage roll for any <strong>Added Effects</strong> on the target to trigger, or for <strong>Super Effective (+1) / Extremely Effective (+2)</strong> weakness damage bonuses to apply.
                            </li>
                            <li>
                                <strong>Resistance:</strong> Each Resistance subtracts 1 flat damage (reducing 1 base damage down to 0).
                            </li>
                        </ul>
                    </div>
                </div>
            );

        case 'holding-back-attack':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--border)',
                            lineHeight: '1.45'
                        }}
                    >
                        <p style={{ margin: '0 0 6px 0', color: 'var(--text-main)', fontStyle: 'italic' }}>
                            “Sometimes it will be more convenient to contain the full force of your Pokémon attacks.”
                        </p>
                        <p style={{ margin: '0', color: 'var(--text-muted)' }}>
                            Give the command to <strong>“Hold Back!”</strong>, <strong>“Restrain yourself!”</strong>, or <strong>“Don’t use full force!”</strong> in order to choose one or a combination of the options below:
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {HOLDING_BACK_OPTIONS.map((opt) => (
                            <div
                                key={opt.id}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--panel-alt)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '10px'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '3px' }}>
                                        • {opt.title}
                                    </strong>
                                    <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                                        {opt.desc}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                    onClick={() => onBroadcastHoldingBack(opt)}
                                    title={`Broadcast ${opt.title} to chat/roll log`}
                                    aria-label={`Broadcast ${opt.title}`}
                                    style={{ flexShrink: 0, marginTop: '2px' }}
                                >
                                    <Megaphone size={12} /> Broadcast
                                </button>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'color-mix(in srgb, #F48FB1 12%, var(--panel-bg))',
                            border: '1px dashed #F48FB1',
                            fontSize: '0.78rem',
                            color: 'var(--text-main)',
                            lineHeight: '1.35'
                        }}
                    >
                        <strong style={{ color: '#E91E63' }}>💕 In Love Status Condition (Storyteller Discretion):</strong> When a Pokémon is <strong>In Love</strong>, they are trying to earn their crush’s favor. At the Storyteller’s discretion, this can mean dealing <strong>Half Damage</strong> or enforcing <strong>all Holding Back restrictions</strong> (forfeiting crits & added effects—poisoning your crush or landing crits is a massive red flag!). Pokémon can bypass this by succeeding on a Loyalty or Insight roll (3+ successes) when attacking.
                    </div>
                </div>
            );

        case 'reactions-late-reactions':
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
                                    ⬆️ Reaction [1..N]
                                </span>
                                <strong style={{ color: '#00ACC1' }}>Resolves BEFORE Action</strong>
                            </div>
                            <p style={{ margin: '0', color: 'var(--text-main)', lineHeight: '1.4', fontSize: '0.82rem' }}>
                                Almost instantaneous movements used when it is not your turn yet. Higher Reaction numbers resolve <strong>FIRST</strong>.
                            </p>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                <em>Examples: Quick Attack (⬆️1), Extreme Speed (⬆️2), Sucker Punch (⬆️1).</em>
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
                                    ⬇️ Late Reaction [1..N]
                                </span>
                                <strong style={{ color: '#7E57C2' }}>Resolves AFTER Action</strong>
                            </div>
                            <p style={{ margin: '0', color: 'var(--text-main)', lineHeight: '1.4', fontSize: '0.82rem' }}>
                                Delayed counter-attacks & traps that trigger after taking the hit. Higher Late Reaction numbers resolve <strong>LATER</strong> (Lower numbers resolve first!).
                            </p>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                <em>Examples: Avalanche (⬇️4), Dragon Tail (⬇️6), Counter (⬇️5), Revenge (⬇️4).</em>
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                                        {ex.title}
                                    </strong>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => onBroadcastReactionExample(ex)}
                                        title="Broadcast scenario to chat/roll log"
                                        aria-label={`Broadcast ${ex.title}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>

                                <div style={{ color: 'var(--text-main)', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.35' }}>
                                    “{ex.scenario}”
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

                                <p style={{ margin: '0', fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                                Key Tactical Rules & Limitations
                            </strong>
                            <button
                                type="button"
                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                onClick={onBroadcastReactionCoreRules}
                                title="Broadcast Core Reaction Rules to chat/roll log"
                                aria-label="Broadcast Core Reaction Rules"
                            >
                                <Megaphone size={12} /> Broadcast Rules
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
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
                                    <strong style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>
                                        • {r.title}
                                    </strong>
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                        {r.desc}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'pain-penalties':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div>
                        <strong style={{ color: 'var(--primary)' }}>Pain Penalty Thresholds:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                            <li>
                                <strong>&le; Half Total HP:</strong> Suffer 1st Pain Penalty (-1 success on all
                                Action Rolls).
                            </li>
                            <li>
                                <strong>1 HP:</strong> Suffer 2nd Pain Penalty (-1 additional success on all Action
                                Rolls, total -2).
                            </li>
                            <li>
                                <strong>Power Through the Pain:</strong> Pay <strong>1 Will Point</strong> to ignore
                                one Pain Penalty for the rest of the scene.
                            </li>
                        </ul>
                    </div>
                </div>
            );

        case 'lethal-damage':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--panel-alt)',
                            border: '1px solid var(--semantic-danger)',
                            lineHeight: '1.45'
                        }}
                    >
                        <span
                            style={{
                                color: 'var(--semantic-danger)',
                                fontWeight: 'bold',
                                display: 'block',
                                marginBottom: '4px'
                            }}
                        >
                            Lethal Damage Rules (Optional):
                        </span>
                        <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            <li>
                                <strong>Trigger:</strong> If you or a Pokémon fall unconscious and keep receiving
                                damage, that damage becomes <strong>Lethal Damage</strong>. Some Pokémon can also
                                learn devastating moves that deal Lethal Damage directly when used with lethal
                                intent.
                            </li>
                            <li>
                                <strong>Risk of Death:</strong> If you suffer Lethal Damage equal to your{' '}
                                <strong>Total HP</strong>, your character is at risk of dying.{' '}
                                <strong>1 more Damage and the character dies.</strong>
                            </li>
                            <li>
                                <strong>Unattended Worsening:</strong> If a character suffers 1+ lethal damage and
                                is left unattended, they will suffer{' '}
                                <strong>another lethal damage every hour</strong> until their body can’t hold any
                                longer.
                            </li>
                            <li>
                                <strong>Twice as Costly to Heal:</strong>
                                <ul style={{ margin: '2px 0 0 0', paddingLeft: '16px' }}>
                                    <li>
                                        <strong>Potions:</strong> Requires <strong>2 Potion Units</strong> to heal 1
                                        point of Lethal Damage (instead of 1).
                                    </li>
                                    <li>
                                        <strong>Natural Recovery:</strong> If stabilized or with medical care, heals{' '}
                                        <strong>1 lethal damage every 16 hours</strong> (instead of 8 hours).
                                    </li>
                                </ul>
                            </li>
                            <li>
                                <strong>Setting Note:</strong> Lethal Damage is <strong>banned</strong> from
                                official League matches. However, ruthless Trainers or wild Pokémon will give no
                                mercy.
                            </li>
                        </ul>
                    </div>
                </div>
            );

        default:
            return null;
    }
};
