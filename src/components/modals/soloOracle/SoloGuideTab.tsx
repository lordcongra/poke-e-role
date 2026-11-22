import { useState } from 'react';
import { Compass, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { TooltipIcon } from '@/components/ui/TooltipIcon';

export function SoloGuideTab() {
    const [infoModal, setInfoModal] = useState<{ title: string; text: string } | null>(null);

    return (
        <div className="solo-guide-tab">
            {/* 3-Step Solo Loop */}
            <div className="solo-guide__section">
                <h4 className="solo-guide__header">
                    <Compass size={18} /> The 3-Step Solo Loop
                    <TooltipIcon
                        onClick={() =>
                            setInfoModal({
                                title: 'The Solo Gameplay Loop',
                                text: 'Solo roleplaying simulates a Game Master by posing questions to an Oracle whenever your character needs information about the environment, NPCs, or complications.'
                            })
                        }
                    />
                </h4>
                <ol className="solo-guide__step-list">
                    <li>
                        <strong>1. Frame the Scene:</strong> Establish where your Trainer and Pokémon are, your
                        immediate goal, and any obvious obstacles.
                    </li>
                    <li>
                        <strong>2. Ask the Oracle:</strong> When you need information that a GM would normally describe,
                        formulate a clear Yes/No question and gauge its likelihood (e.g., <em>Likely</em>,{' '}
                        <em>50/50</em>, or <em>Unlikely</em>).
                    </li>
                    <li>
                        <strong>3. Interpret & Build:</strong> Use the Oracle's answer to shape what happens next:
                        <ul style={{ marginTop: '4px', paddingLeft: '18px' }}>
                            <li>
                                <strong>Exceptional Yes:</strong> An overwhelming success or fortunate windfall beyond
                                expectations.
                            </li>
                            <li>
                                <strong>Yes:</strong> The condition is met or the question is true.
                            </li>
                            <li>
                                <strong>No:</strong> The condition is false or an obstacle blocks your path.
                            </li>
                            <li>
                                <strong>Exceptional No:</strong> A dire complication, danger, or sudden turn for the
                                worse.
                            </li>
                        </ul>
                    </li>
                </ol>

                <div className="solo-guide__example-box">
                    <strong>Example:</strong> "Is there an old campsite inside Viridian Forest where we can rest?"
                    <br />
                    <em>Odds: 50/50, Chaos 5.</em> Roll gives <strong>Exceptional Yes</strong>: Not only is there a safe
                    clearing, but a friendly wild Oddish left behind an Oran Berry!
                </div>
            </div>

            {/* Understanding Chaos Factor */}
            <div className="solo-guide__section">
                <h4 className="solo-guide__header">
                    <Sparkles size={18} /> Managing the Chaos Factor (1 to 9)
                    <TooltipIcon
                        onClick={() =>
                            setInfoModal({
                                title: 'Chaos Factor Mechanics',
                                text: 'Chaos Factor measures how chaotic or uncontrolled the situation is. Higher values make "Yes" answers more probable and trigger Random Events far more frequently.'
                            })
                        }
                    />
                </h4>
                <p className="text-subtext" style={{ color: 'var(--text-main)', margin: 0 }}>
                    Start your adventure at <strong>Chaos Factor 5</strong>. At the end of each scene:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>
                        <strong>Lower Chaos (-1):</strong> If your Trainer remained in control, overcame the encounter,
                        and achieved their goal peacefully.
                    </li>
                    <li>
                        <strong>Raise Chaos (+1):</strong> If the scene spiraled into panic, battle retreat, critical
                        injuries, or sudden complications.
                    </li>
                </ul>

                <div className="solo-guide__example-box">
                    <strong>Random Events on Doubles:</strong> If your 1d100 roll is a matching double (11, 22, 33,
                    etc.) and the digit is <em>less than or equal to your Chaos Factor</em>, a{' '}
                    <strong>Random Event</strong> interrupts! Switch to the <strong>Prompts</strong> tab to roll on the
                    Event Focus and Meaning tables.
                </div>
            </div>

            {/* Combining with Pokérole Mechanics */}
            <div className="solo-guide__section">
                <h4 className="solo-guide__header">
                    <BookOpen size={18} /> Combining Solo Play with Pokérole
                    <TooltipIcon
                        onClick={() =>
                            setInfoModal({
                                title: 'Pokérole Integration',
                                text: 'Use Pokérole skill and combat checks for character actions, and use the Solo Oracle for external world state and narrative surprises.'
                            })
                        }
                    />
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>
                        <strong>Character Actions:</strong> Roll normal Pokérole dice pools (e.g., Alert + Perception to
                        spot tracks, or Strength + Brawl to climb a ledge).
                    </li>
                    <li>
                        <strong>World Truths:</strong> Ask the Solo Oracle (e.g., "Does the wild Ursaring hear my branch
                        snap?").
                    </li>
                    <li>
                        <strong>Campaign Lists:</strong> Keep 2–5 active Threads (quests/goals) and Characters (allies,
                        rivals, and wild encounters) on the <em>Lists</em> tab. Use the "Random" button when an Event
                        Focus specifies an NPC Action or Thread resolution.
                    </li>
                </ul>
            </div>

            {/* Info Modal / Popup */}
            {infoModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                        padding: '16px'
                    }}
                    onClick={() => setInfoModal(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--panel-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            maxWidth: '420px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 700,
                                color: 'var(--primary)'
                            }}
                        >
                            <AlertCircle size={18} /> {infoModal.title}
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                            {infoModal.text}
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--primary"
                            style={{ alignSelf: 'flex-end', padding: '6px 14px' }}
                            onClick={() => setInfoModal(null)}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
