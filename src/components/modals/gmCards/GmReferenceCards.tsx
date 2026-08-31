import React from 'react';
import { Megaphone } from 'lucide-react';
import {
    TRAINER_ACTIONS_TABLE,
    COVER_TABLE,
    HEALING_TABLE,
    BATTLE_TP_TABLE,
    RANK_UP_TP_TABLE,
    LEARN_MOVES_TP_TABLE,
    RANK_SUMMARY_TABLE,
    ENCOUNTER_BALANCE_TABLE
} from '../../../data/gmScreenData';

interface GmReferenceCardsProps {
    itemId: string;
    onBroadcastTrainerAction: (t: (typeof TRAINER_ACTIONS_TABLE)[0]) => void;
    onBroadcastCover: (c: (typeof COVER_TABLE)[0]) => void;
    onBroadcastHealing: (h: (typeof HEALING_TABLE)[0]) => void;
}

export const GmReferenceCards: React.FC<GmReferenceCardsProps> = ({
    itemId,
    onBroadcastTrainerAction,
    onBroadcastCover,
    onBroadcastHealing
}) => {
    switch (itemId) {
        case 'trainer-actions':
            return (
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
                                            onClick={() => onBroadcastTrainerAction(t)}
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
            );

        case 'cover-mechanics':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Body Coverage</th>
                                <th>Bonus Def / Sp.Def vs Attacks</th>
                                <th>Takes Added Effects</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {COVER_TABLE.map((c) => (
                                <tr key={c.coverage}>
                                    <td>
                                        <strong>{c.coverage}</strong>
                                    </td>
                                    <td className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                        {c.defBonus}
                                    </td>
                                    <td>{c.addedEffects}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() => onBroadcastCover(c)}
                                            title={`Broadcast ${c.coverage} to chat/roll log`}
                                            aria-label={`Broadcast ${c.coverage}`}
                                        >
                                            <Megaphone size={12} /> Broadcast
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'healing-rates':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Damage Type</th>
                                <th>Natural Healing Over Time</th>
                                <th>Potion Units Required</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {HEALING_TABLE.map((h) => (
                                <tr key={h.damageType}>
                                    <td>
                                        <strong>{h.damageType}</strong>
                                    </td>
                                    <td>{h.natural}</td>
                                    <td>{h.potion}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() => onBroadcastHealing(h)}
                                            title={`Broadcast ${h.damageType} to chat/roll log`}
                                            aria-label={`Broadcast ${h.damageType}`}
                                        >
                                            <Megaphone size={12} /> Broadcast
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'training-points-guide':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Circumstance After Battle</th>
                                    <th>TP Earned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {BATTLE_TP_TABLE.map((b) => (
                                    <tr key={b.circumstance}>
                                        <td>{b.circumstance}</td>
                                        <td className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                            {b.tp}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>TP to Next Rank</th>
                                    <th>Retraining Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RANK_UP_TP_TABLE.map((r) => (
                                    <tr key={r.rank}>
                                        <td>
                                            <strong>{r.rank}</strong>
                                        </td>
                                        <td>{r.tpNextRank}</td>
                                        <td>{r.retraining}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Pokémon Stage</th>
                                    <th>Current Rank Move</th>
                                    <th>Prior Rank Move</th>
                                    <th>Pre-Evo Move</th>
                                    <th>TM</th>
                                    <th>Overrank Move</th>
                                </tr>
                            </thead>
                            <tbody>
                                {LEARN_MOVES_TP_TABLE.map((l) => (
                                    <tr key={l.stage}>
                                        <td>
                                            <strong>{l.stage}</strong>
                                        </td>
                                        <td>{l.currentRank}</td>
                                        <td>{l.priorRank}</td>
                                        <td>{l.preEvo}</td>
                                        <td>{l.tm}</td>
                                        <td>{l.overrank}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

        case 'rank-summary-table':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Max Targets</th>
                                <th>Skill Max</th>
                                <th>Attribute Points</th>
                                <th>Skill Points</th>
                                <th>All Foes Target Max</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RANK_SUMMARY_TABLE.map((r) => (
                                <tr key={r.rank}>
                                    <td>
                                        <strong>{r.rank}</strong>
                                    </td>
                                    <td>{r.maxTargets}</td>
                                    <td>{r.skillMax}</td>
                                    <td>{r.attrPoints}</td>
                                    <td>{r.skillPoints}</td>
                                    <td>{r.allFoesMax}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'encounter-balancing-chart':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Foe Receives Damage</th>
                                <th>Lower Rank</th>
                                <th>Same Rank</th>
                                <th>One Rank Higher</th>
                                <th>Two + Ranks Higher</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ENCOUNTER_BALANCE_TABLE.map((e) => {
                                const renderDiff = (diff: string) => {
                                    const slug = diff.toLowerCase().replace(/\+/g, '').replace(/\s+/g, '-');
                                    return <span className={`diff-pill diff-pill--${slug}`}>{diff}</span>;
                                };
                                return (
                                    <tr key={e.effectiveness}>
                                        <td>
                                            <strong>{e.effectiveness}</strong>
                                        </td>
                                        <td>{renderDiff(e.lower)}</td>
                                        <td>{renderDiff(e.same)}</td>
                                        <td>{renderDiff(e.oneHigher)}</td>
                                        <td>{renderDiff(e.twoHigher)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );

        default:
            return null;
    }
};
