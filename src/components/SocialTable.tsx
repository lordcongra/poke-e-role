// src/components/SocialTable.tsx
import { useState } from 'react';
import { useCharacterStore, getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { SocialStat } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { parseCombatTags, getAbilityText } from '../utils/combatUtils';

const SOCIAL_COLORS = {
    [SocialStat.TOU]: '#F9E79F',
    [SocialStat.COO]: '#F5CBA7',
    [SocialStat.BEA]: '#AED6F1',
    [SocialStat.CUT]: '#F5B7B1',
    [SocialStat.CLE]: '#A9DFBF'
};
const SOCIAL_LABELS = {
    [SocialStat.TOU]: 'TOUGH',
    [SocialStat.COO]: 'COOL',
    [SocialStat.BEA]: 'BEAUTY',
    [SocialStat.CUT]: 'CUTE',
    [SocialStat.CLE]: 'CLEVER'
};

export function SocialTable() {
    const socials = useCharacterStore((state) => state.socials);
    const setSocialStat = useCharacterStore((state) => state.setSocialStat);
    const extras = useCharacterStore((state) => state.extras);
    const setExtra = useCharacterStore((state) => state.setExtra);
    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);

    const currentRank = useCharacterStore((state) => state.identity.rank);
    const currentAge = useCharacterStore((state) => state.identity.age);

    const rankPoints = getRankPoints(currentRank).social;
    const agePoints = getAgePoints(currentAge).social;

    const abilityText = getAbilityText(ability, customAbilities);
    const invMods = parseCombatTags(inventory, extraCategories, undefined, abilityText);

    const [isCollapsed, setIsCollapsed] = useState(false);

    const spentRank = Object.values(SocialStat).reduce((acc, stat) => acc + socials[stat].rank, 0);
    const remaining = rankPoints + agePoints + extras.social - spentRank;

    return (
        <div className="sheet-panel">
            <div className="sheet-panel__header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    SOCIAL ATTRIBUTES
                </span>
            </div>

            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div className="table-responsive-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr style={{ background: '#555', color: 'white' }}>
                                    <th style={{ padding: '4px' }}>SOCIAL</th>
                                    <th>Base</th>
                                    <th>Rank</th>
                                    <th>Buff</th>
                                    <th>Debuff</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(SocialStat).map((stat) => {
                                    const data = socials[stat];
                                    const itemBonus = invMods.stats[stat] || 0;
                                    const total = Math.max(
                                        1,
                                        data.base + data.rank + data.buff - data.debuff + itemBonus
                                    );
                                    return (
                                        <tr key={stat} className="data-table__row--dynamic">
                                            <td
                                                style={{
                                                    background: SOCIAL_COLORS[stat],
                                                    color: '#111',
                                                    fontWeight: 'bold',
                                                    width: '60px'
                                                }}
                                            >
                                                {SOCIAL_LABELS[stat]}
                                            </td>
                                            <td className="data-table__cell--middle">
                                                <NumberSpinner
                                                    value={data.base}
                                                    onChange={(v) => setSocialStat(stat, 'base', v)}
                                                    min={1}
                                                />
                                            </td>
                                            <td className="data-table__cell--middle">
                                                <NumberSpinner
                                                    value={data.rank}
                                                    onChange={(v) => setSocialStat(stat, 'rank', v)}
                                                    min={0}
                                                />
                                            </td>
                                            <td className="data-table__cell--middle">
                                                <NumberSpinner
                                                    value={data.buff}
                                                    onChange={(v) => setSocialStat(stat, 'buff', v)}
                                                    min={0}
                                                />
                                            </td>
                                            <td className="data-table__cell--middle">
                                                <NumberSpinner
                                                    value={data.debuff}
                                                    onChange={(v) => setSocialStat(stat, 'debuff', v)}
                                                    min={0}
                                                />
                                            </td>
                                            <td
                                                className="data-table__cell--middle"
                                                style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                            >
                                                {total}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 4px 0 4px',
                            borderTop: '1px solid var(--border)',
                            fontSize: '0.85rem',
                            marginTop: '6px'
                        }}
                    >
                        <span>
                            Remaining:{' '}
                            <strong style={{ color: remaining < 0 ? '#F44336' : 'inherit' }}>{remaining}</strong>
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                            (Max 5 per stat)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Extra:{' '}
                            <NumberSpinner value={extras.social} onChange={(v) => setExtra('social', v)} min={0} />
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
