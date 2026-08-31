import React, { useState } from 'react';
import {
    Megaphone,
    ExternalLink,
    Info,
    Shield,
    Flame,
    Zap,
    Heart,
    Handshake,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import {
    RANGER_RANK_PROGRESSION,
    RANGER_STYLES,
    RANGER_STYLERS,
    RANGER_DANGEROUS_BUFFS,
    RANGER_MANEUVERS,
    RANGER_FIELD_ASSISTS,
    RANGER_PARTNER_BOND_LEVELS,
    DRAKE_RANGERS_DOC_URL,
    type RangerDispositionRank,
    type RangerStyler,
    type RangerStyle,
    type RangerManeuver,
    type RangerFieldAssist,
    type RangerPartnerBondLevel,
    type RangerDangerousBuff
} from '../../../data/gmScreenData';

interface GmRangersCardsProps {
    itemId: string;
    onBroadcastDispositionRank: (r: RangerDispositionRank) => void;
    onBroadcastRangerStyle: (s: RangerStyle) => void;
    onBroadcastStyler: (st: RangerStyler) => void;
    onBroadcastDangerousBuff: (b: RangerDangerousBuff) => void;
    onBroadcastManeuver: (m: RangerManeuver) => void;
    onBroadcastFieldAssist: (a: RangerFieldAssist) => void;
    onBroadcastPartnerBond: (b: RangerPartnerBondLevel) => void;
}

export const GmRangersCards: React.FC<GmRangersCardsProps> = ({
    itemId,
    onBroadcastDispositionRank,
    onBroadcastRangerStyle,
    onBroadcastStyler,
    onBroadcastDangerousBuff,
    onBroadcastManeuver,
    onBroadcastFieldAssist,
    onBroadcastPartnerBond
}) => {
    const [maneuverCategory, setManeuverCategory] = useState<string>('All');

    switch (itemId) {
        case 'rangers-core-mechanics':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Header Banner */}
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} color="var(--primary)" />
                                <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                    Pokémon Rangers: Emotion & Aura Befriending
                                </strong>
                            </div>
                            <a
                                href={DRAKE_RANGERS_DOC_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-button action-button--theme pmd-link-btn"
                                style={{ margin: 0 }}
                                title="Open Prof. Drake's Pokémon Rangers Supplement in Google Docs"
                            >
                                <ExternalLink size={12} />
                                <span>Prof. Drake's Ranger Supplement (Google Doc)</span>
                            </a>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}>
                            Unlike standard trainers, Pokémon Rangers do not harm or reduce a Pokémon’s HP in combat.
                            Instead, they use the Capture Styler to convey their nature and feelings, targeting the
                            Pokémon's <strong>Disposition Meter (DM)</strong> to calm its emotions and befriend it.
                        </p>
                    </div>

                    {/* Disposition Meter & Rank Progression */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Heart size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Disposition Meter (DM = Will + Rank Bonus) & Slots
                            </strong>
                        </div>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Guild Rank</th>
                                        <th style={{ textAlign: 'center' }}>DM Rank Bonus</th>
                                        <th style={{ textAlign: 'center' }}>Total Disposition Formula</th>
                                        <th style={{ textAlign: 'center' }}>Maneuver Slots</th>
                                        <th style={{ textAlign: 'center' }}>Max Wild Assists</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANGER_RANK_PROGRESSION.map((r) => (
                                        <tr key={r.rank}>
                                            <td>
                                                <strong>{r.rank}</strong>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="pmd-weight-pill text-value-highlight">+{r.bonus}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <code>Will + {r.bonus}</code>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <strong>{r.maneuversCount}</strong>
                                                {r.rank === 'Expert' || r.rank === 'Ace' || r.rank === 'Master' || r.rank === 'Champion'
                                                    ? ' (+1 Master)'
                                                    : ''}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{r.assistsCount}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastDispositionRank(r)}
                                                    title={`Broadcast ${r.rank} Rank Disposition`}
                                                    aria-label={`Broadcast ${r.rank} Rank Disposition`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ranger Styles */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Zap size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                The Three Ranger Styles
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Whenever a Ranger Maneuver states <strong>"Style"</strong> for Accuracy or Damage, replace it with
                            your Style's associated Stat. If a maneuver states <strong>"Social"</strong>, the Ranger chooses any Social Attribute.
                        </p>
                        <div className="pmd-rules-grid">
                            {RANGER_STYLES.map((style) => (
                                <div key={style.name} className="pmd-rule-card">
                                    <div className="pmd-rule-card__header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <strong className="text-label" style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>
                                                {style.name}
                                            </strong>
                                            <span className="pmd-rule-badge text-theme-header">Stat: {style.stat}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() => onBroadcastRangerStyle(style)}
                                            title={`Broadcast ${style.name}`}
                                            aria-label={`Broadcast ${style.name}`}
                                        >
                                            <Megaphone size={12} /> Broadcast
                                        </button>
                                    </div>
                                    <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}>
                                        {style.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Styler Charge & Critical Failure Rule */}
                    <div className="pmd-app-tip-box">
                        <CheckCircle2 size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                            <strong>Styler Damage & Critical Failures:</strong> A Styler’s Charge represents its HP. If a Ranger rolls a
                            <strong> Critical Failure</strong> on a Ranger Maneuver, the Styler immediately suffers <strong>1 point of damage</strong>.
                        </span>
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> These mechanics are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole, not official corebook requirements.
                        </span>
                    </div>
                </div>
            );

        case 'rangers-stylers-gear':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Capture Styler Catalog */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Shield size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Capture Styler Catalog & Upgrades
                            </strong>
                        </div>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Styler Model</th>
                                        <th style={{ textAlign: 'center' }}>Charge (HP)</th>
                                        <th style={{ textAlign: 'center' }}>Cost (P$)</th>
                                        <th>Effect & Aura Enhancements</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANGER_STYLERS.map((s) => (
                                        <tr key={s.name}>
                                            <td>
                                                <strong>{s.name}</strong>
                                                <div className="text-subtext" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    <em>{s.flavor}</em>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="pmd-weight-pill text-value-highlight">{s.charge} HP</span>
                                            </td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {s.cost === '—' ? <span className="text-subtext">Issued</span> : `${s.cost} P$`}
                                            </td>
                                            <td>{s.effect}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastStyler(s)}
                                                    title={`Broadcast ${s.name}`}
                                                    aria-label={`Broadcast ${s.name}`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dangerous Encounters (Boss Fights) */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Flame size={14} color="var(--semantic-danger)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Dangerous Encounters (Boss & Enraged Pokémon)
                            </strong>
                        </div>
                        <div className="pmd-callout-box" style={{ marginBottom: '10px' }}>
                            <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                                Enraged or enhanced Pokémon have intensely turbulent auras that resist standard capture loops.
                                Attempts to tame these wild Pokémon usually fail until their enhanced aura is calmed.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                                <span className="pmd-weight-pill"><strong>Low:</strong> +10 DM & 1 Buff</span>
                                <span className="pmd-weight-pill"><strong>Medium:</strong> +20 DM & 2 Buffs</span>
                                <span className="pmd-weight-pill"><strong>High:</strong> +30 DM & 3 Buffs</span>
                            </div>
                        </div>

                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Boss Aura Buff</th>
                                        <th>Mechanical Effect</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANGER_DANGEROUS_BUFFS.map((b) => (
                                        <tr key={b.name}>
                                            <td>
                                                <strong style={{ color: 'var(--semantic-danger)' }}>{b.name}</strong>
                                            </td>
                                            <td>{b.effect}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastDangerousBuff(b)}
                                                    title={`Broadcast ${b.name}`}
                                                    aria-label={`Broadcast ${b.name}`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Styler gear and encounter buffs are optional guidelines from Prof. Drake’s Pokémon Rangers supplement.
                        </span>
                    </div>
                </div>
            );

        case 'rangers-maneuvers-list': {
            const categories = ['All', 'Basic', 'Advanced', 'Agile', 'Brute', 'Tricky', 'Master'];
            const displayedManeuvers =
                maneuverCategory === 'All'
                    ? RANGER_MANEUVERS
                    : RANGER_MANEUVERS.filter((m) => m.category === maneuverCategory);

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Ranger Maneuvers & Capture Techniques
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                            Rangers wield unique loop maneuvers depending on their style. <strong>Basic Maneuvers</strong> are
                            free to all Rangers and do not count against learned maneuver limits. <strong>Master Maneuvers</strong> require
                            Expert rank and 1 day of mentorship with a Top Ranger.
                        </p>
                    </div>

                    {/* Category Filter Pills */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                className={`action-button ${maneuverCategory === cat ? 'action-button--theme' : 'action-button--dark'}`}
                                style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px' }}
                                onClick={() => setManeuverCategory(cat)}
                            >
                                {cat} ({cat === 'All' ? RANGER_MANEUVERS.length : RANGER_MANEUVERS.filter((m) => m.category === cat).length})
                            </button>
                        ))}
                    </div>

                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Maneuver</th>
                                    <th>Category</th>
                                    <th>Accuracy</th>
                                    <th>Power / Effect</th>
                                    <th>Description</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedManeuvers.map((m) => (
                                    <tr key={m.name}>
                                        <td>
                                            <strong>{m.name}</strong>
                                            {m.flavor && (
                                                <div className="text-subtext" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    <em>{m.flavor}</em>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`pmd-food-pill pmd-food-pill--${m.category.toLowerCase()}`}>
                                                {m.category}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <code>{m.accuracy}</code>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <strong className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                                {m.power}
                                            </strong>
                                        </td>
                                        <td>{m.description}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => onBroadcastManeuver(m)}
                                                title={`Broadcast ${m.name}`}
                                                aria-label={`Broadcast ${m.name}`}
                                            >
                                                <Megaphone size={12} /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Maneuvers and technique rules are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.
                        </span>
                    </div>
                </div>
            );
        }

        case 'rangers-assists-bonds':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Assists Overview */}
                    <div className="pmd-callout-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Handshake size={16} color="var(--primary)" />
                            <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                                Pokémon Assists & Partner Bond Progression
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: 0, color: 'var(--text-main)' }}>
                            Rangers gain assistance from wild Pokémon roaming the region and deep bonds forged with their
                            Partner Pokémon. <strong>1 Combat Assist</strong> can be used per turn right before a maneuver
                            (Applying a Type or Using an Ability is free; using a Move costs a full action). Wild Pokémon depart after the encounter.
                        </p>
                    </div>

                    {/* Field Assists Reference */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Zap size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Common Field Assists Reference
                            </strong>
                        </div>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Field Assist</th>
                                        <th>Environmental Effect</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANGER_FIELD_ASSISTS.map((a) => (
                                        <tr key={a.name}>
                                            <td>
                                                <strong>{a.name}</strong>
                                            </td>
                                            <td>{a.effect}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastFieldAssist(a)}
                                                    title={`Broadcast Field Assist: ${a.name}`}
                                                    aria-label={`Broadcast Field Assist: ${a.name}`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Partner Bond Loyalty Levels (1 to 5) */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Heart size={14} color="var(--primary)" />
                            <strong className="text-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                Partner Pokémon Bond Progression (Loyalty & Happiness Levels 1–5)
                            </strong>
                        </div>
                        <p className="text-subtext" style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Partner Pokémon can Clash once per round to protect your Styler (reducing DM instead of dealing damage).
                            As Happiness and Loyalty grow, they unlock unique scene-level bond abilities:
                        </p>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center' }}>Bond Level</th>
                                        <th>Requirement</th>
                                        <th>Partner Bond Ability (Usable 1x per Scene)</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANGER_PARTNER_BOND_LEVELS.map((b) => (
                                        <tr key={b.level}>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="pmd-weight-pill text-value-highlight">Level {b.level}</span>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <strong>{b.requirement}</strong>
                                            </td>
                                            <td>{b.ability}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => onBroadcastPartnerBond(b)}
                                                    title={`Broadcast Level ${b.level} Bond`}
                                                    aria-label={`Broadcast Level ${b.level} Bond`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pmd-disclaimer-box">
                        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <strong>GM Note:</strong> Assist and partner rules are from Prof. Drake’s optional Pokémon Rangers supplement for Pokerole.
                        </span>
                    </div>
                </div>
            );

        default:
            return null;
    }
};
