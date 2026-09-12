import React from 'react';
import { BookOpen, X, Monitor, AlertTriangle, Zap } from 'lucide-react';

export interface BattleOrganizerInstructionsProps {
    onClose: () => void;
    onWheel?: (e: React.WheelEvent) => void;
}

export function BattleOrganizerInstructions({ onClose, onWheel }: BattleOrganizerInstructionsProps) {
    return (
        <div className="bo-help-banner" onWheel={onWheel}>
            <div className="bo-help-banner__content text-subtext">
                <div className="bo-help-banner__header">
                    <span className="bo-help-banner__title text-title-primary">
                        <BookOpen size={16} color="var(--primary)" /> Battle Organizer Guide & Optimal Setup
                    </span>
                    <button
                        type="button"
                        className="action-button action-button--ghost bo-help-close"
                        onClick={onClose}
                        title="Close Guide"
                        aria-label="Close Guide"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="bo-help-banner__grid">
                    <div className="bo-help-banner__section">
                        <h4 className="bo-help-section-title">
                            <Monitor size={14} color="var(--primary)" /> Optimal Dual-Screen Setup (Private Window)
                        </h4>
                        <p>
                            Want to keep your battle map and 3D dice rolls visible while running the Battle Organizer on
                            a second screen or side-by-side window?
                        </p>
                        <ol>
                            <li>
                                Open your room link in a <strong>Private / Incognito browser window</strong> (or
                                separate browser profile) and join as a guest.
                            </li>
                            <li>
                                On your primary GM screen, click the guest user in the player list and grant them{' '}
                                <strong>GM permissions</strong>.
                            </li>
                            <li>
                                Open and run the Battle Organizer on that screen! Live state synchronizes across both
                                windows in real time.
                            </li>
                        </ol>
                        <div className="bo-help-alert">
                            <AlertTriangle
                                size={14}
                                color="var(--semantic-danger, #ef5350)"
                                style={{ flexShrink: 0, marginTop: 2 }}
                            />
                            <span>
                                <strong>Why avoid duplicating your logged-in tab?</strong> Owlbear Rodeo enforces strict
                                per-account connection limits. Opening multiple tabs under the exact same logged-in
                                account triggers concurrent real-time room sessions that lead to{' '}
                                <code>Realtime error: 4003 Rate limited</code> disconnections. A private guest session
                                has an independent connection that avoids this completely.
                            </span>
                        </div>
                    </div>

                    <div className="bo-help-banner__section">
                        <h4 className="bo-help-section-title">
                            <Zap size={14} color="var(--primary)" /> Round Tracker & Moves
                        </h4>
                        <ul>
                            <li>
                                <strong>Auto-Sync Moves:</strong> Rolling move accuracy checks automatically populates
                                that combatant's next open action slot. Damage rolls resolve the move without using
                                extra slots.
                            </li>
                            <li>
                                <strong>Multi-Action Moves:</strong> Moves used multiple times in a round (such as
                                Successive Actions, Double Actions, or homebrew refreshes) automatically allocate into
                                subsequent action slots with each new accuracy roll.
                            </li>
                            <li>
                                <strong>Hit / Miss Marking:</strong> Use the <strong>✓</strong> (success) and{' '}
                                <strong>✗</strong> (fail) buttons on any slot or directly from the in-modal Roll Log to
                                resolve actions.
                            </li>
                            <li>
                                <strong>Environmental Timers:</strong> Remaining Rounds boxes (1–4) on Weathers,
                                Terrains, and Force Fields automatically decrement when you click{' '}
                                <strong>Advance / End Round</strong>.
                            </li>
                            <li>
                                <strong>Pull from Initiative:</strong> Automatically imports all active scene
                                characters, held items, statuses, and rolled initiatives in descending order.
                            </li>
                            <li>
                                <strong>Push Actions to Sheets:</strong> Transfers actions used and reaction states
                                (Evade/Clash) from this organizer to character sheets and tokens, allowing you to
                                seamlessly resume tabletop play.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
