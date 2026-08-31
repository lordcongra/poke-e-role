import React from 'react';
import { Megaphone, Layers, Sparkles, Pill } from 'lucide-react';
import {
    STATUS_CATEGORIES_DATA,
    STATUS_RULES_INFO,
    STATUS_EFFECTS_DATA,
    WEATHER_CONDITIONS_DATA,
    ENVIRONMENTAL_HAZARDS_DATA,
    type StatusEffectData
} from '../../../data/gmScreenData';

interface GmStatusCardsProps {
    itemId: string;
    onBroadcastStatusRules: () => void;
    onBroadcastStatus: (s: StatusEffectData) => void;
    onBroadcastWeather: (w: (typeof WEATHER_CONDITIONS_DATA)[0]) => void;
    onBroadcastHazard: (h: (typeof ENVIRONMENTAL_HAZARDS_DATA)[0]) => void;
}

export const GmStatusCards: React.FC<GmStatusCardsProps> = ({
    itemId,
    onBroadcastStatusRules,
    onBroadcastStatus,
    onBroadcastWeather,
    onBroadcastHazard
}) => {
    switch (itemId) {
        case 'status-effects-all':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Status Categories & Rules Banner */}
                    <div className="status-rules-box">
                        <div className="status-rules-box__header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={16} color="var(--primary)" />
                                <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                                    Status Ailments & Conditions Categories
                                </strong>
                            </div>
                            <button
                                type="button"
                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                onClick={onBroadcastStatusRules}
                                title="Broadcast Status Categories & Rules to chat/roll log"
                                aria-label="Broadcast Status Categories & Rules"
                            >
                                <Megaphone size={12} /> Broadcast Rules
                            </button>
                        </div>

                        <div className="status-categories-grid">
                            {STATUS_CATEGORIES_DATA.map((cat) => (
                                <div key={cat.category} className="status-category-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <span
                                            className={`status-category-pill status-category-pill--${cat.category.toLowerCase()}`}
                                            style={{ color: cat.color }}
                                        >
                                            {cat.title}
                                        </span>
                                    </div>
                                    <p className="text-subtext" style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                        {cat.desc}
                                    </p>
                                    <span className="text-subtext" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        <em>Examples: {cat.examples}</em>
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="status-rules-box__notes">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>
                                    <strong>Status Stacking:</strong> {STATUS_RULES_INFO.stacking}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                <Pill size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>
                                    <strong>Curing Multiple Conditions:</strong> {STATUS_RULES_INFO.curing}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Individual Status Grid */}
                    <div className="status-grid">
                        {STATUS_EFFECTS_DATA.map((s) => (
                            <div key={s.id} className="status-card">
                                <div className="status-card__header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                                        <span
                                            className="status-card__badge"
                                            style={{ backgroundColor: s.color, color: s.textColor }}
                                        >
                                            {s.name}
                                        </span>
                                        <span
                                            className={`status-category-pill status-category-pill--${s.categoryType.toLowerCase()}`}
                                            style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                            title={`Category: ${s.categoryType}`}
                                        >
                                            {s.categoryType}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => onBroadcastStatus(s)}
                                        title={`Broadcast ${s.name} to chat/roll log`}
                                        aria-label={`Broadcast ${s.name}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>
                                <div className="status-card__text">
                                    <strong>Effect:</strong> {s.effect}
                                </div>
                                {s.id === 'status-in-love' && (
                                    <div
                                        style={{
                                            padding: '6px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: 'color-mix(in srgb, #F48FB1 15%, var(--panel-bg))',
                                            border: '1px dashed #F48FB1',
                                            fontSize: '0.74rem',
                                            color: 'var(--text-main)',
                                            lineHeight: '1.35',
                                            marginTop: '2px'
                                        }}
                                    >
                                        <strong>💕 Storyteller Note:</strong> Being <em>In Love</em> means trying to earn their crush’s favor. At the GM’s discretion, they deal <strong>Half Damage</strong> or apply <strong>all Holding Back options</strong> (no crits, no poison/added effects—poisoning your crush is a massive red flag!). Refer to the <strong>“Holding Back an Attack”</strong> section for details.
                                    </div>
                                )}
                                <div className="status-card__text">
                                    <strong>Resist:</strong> {s.resist}
                                </div>
                                <div className="status-card__text" style={{ color: 'var(--text-muted)' }}>
                                    <strong>Duration:</strong> {s.duration}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'weather-conditions-all':
            return (
                <div className="weather-grid">
                    {WEATHER_CONDITIONS_DATA.map((w) => (
                        <div key={w.id} className="weather-card">
                            <div className="weather-card__header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                                    <span className="weather-card__title" style={{ color: w.color }}>
                                        {w.name}
                                    </span>
                                    <span className="gm-screen-modal__card-badge text-theme-header">{w.badge}</span>
                                </div>
                                <button
                                    type="button"
                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                    onClick={() => onBroadcastWeather(w)}
                                    title={`Broadcast ${w.name} Weather to chat/roll log`}
                                    aria-label={`Broadcast ${w.name}`}
                                >
                                    <Megaphone size={12} /> Broadcast
                                </button>
                            </div>
                            <ul className="weather-card__list">
                                {w.effects.map((e, idx) => (
                                    <li key={idx}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );

        case 'environmental-hazards-all':
            return (
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Hazard / Condition</th>
                                <th>Battlefield Effect</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ENVIRONMENTAL_HAZARDS_DATA.map((h) => (
                                <tr key={h.id}>
                                    <td>
                                        <strong>{h.name}</strong>
                                    </td>
                                    <td>{h.effect}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() => onBroadcastHazard(h)}
                                            title={`Broadcast ${h.name} to chat/roll log`}
                                            aria-label={`Broadcast ${h.name}`}
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

        default:
            return null;
    }
};
