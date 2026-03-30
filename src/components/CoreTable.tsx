// src/components/CoreTable.tsx
import { useState } from 'react';
import { useCharacterStore, getRankPoints, getAgePoints } from '../store/useCharacterStore';
import { CombatStat } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { parseCombatTags, getAbilityText } from '../utils/combatUtils';

const STAT_COLORS = { [CombatStat.STR]: '#E65100', [CombatStat.DEX]: '#2E7D32', [CombatStat.VIT]: '#C62828', [CombatStat.SPE]: '#1565C0', [CombatStat.INS]: '#6A1B9A' };

export function CoreTable() {
    const stats = useCharacterStore(state => state.stats);
    const setStat = useCharacterStore(state => state.setStat);
    const extras = useCharacterStore(state => state.extras);
    const setExtra = useCharacterStore(state => state.setExtra);
    const inventory = useCharacterStore(state => state.inventory);
    const extraCategories = useCharacterStore(state => state.extraCategories);
    const customAbilities = useCharacterStore(state => state.roomCustomAbilities);
    const ability = useCharacterStore(state => state.identity.ability);
    
    const currentRank = useCharacterStore(state => state.identity.rank);
    const currentAge = useCharacterStore(state => state.identity.age);
    const mode = useCharacterStore(state => state.identity.mode);
    
    const rankPoints = getRankPoints(currentRank).core;
    const agePoints = getAgePoints(currentAge).core;
    
    const abilityText = getAbilityText(ability, customAbilities);
    const invMods = parseCombatTags(inventory, extraCategories, undefined, abilityText);

    const [isCollapsed, setIsCollapsed] = useState(false);

    const visibleStats = Object.values(CombatStat).filter(stat => !(mode === 'Trainer' && stat === CombatStat.SPE));

    const spentRank = visibleStats.reduce((acc, stat) => acc + stats[stat].rank, 0);
    const remaining = rankPoints + agePoints + extras.core - spentRank;

    return (
        <div className="sheet-panel">
            <div className="sheet-panel__header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button type="button" className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                    CORE ATTRIBUTES
                </span>
            </div>
            
            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div className="table-responsive-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr style={{ background: '#555', color: 'white' }}>
                                    <th style={{ padding: '4px' }}>ATTR</th>
                                    <th>Base</th><th>Limit</th><th>Rank</th><th>Buff</th><th>Debuff</th><th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleStats.map(stat => {
                                    const data = stats[stat];
                                    const itemBonus = invMods.stats[stat] || 0;
                                    const total = Math.max(1, data.base + data.rank + data.buff - data.debuff + itemBonus);
                                    return (
                                        <tr key={stat} className="data-table__row--dynamic">
                                            <td style={{ background: STAT_COLORS[stat], color: 'white', fontWeight: 'bold', width: '45px' }}>{stat.toUpperCase()}</td>
                                            <td className="data-table__cell--middle"><NumberSpinner value={data.base} onChange={v => setStat(stat, 'base', v)} min={1} /></td>
                                            <td className="data-table__cell--middle"><NumberSpinner value={data.limit} onChange={v => setStat(stat, 'limit', v)} min={1} /></td>
                                            <td className="data-table__cell--middle"><NumberSpinner value={data.rank} onChange={v => setStat(stat, 'rank', v)} min={0} /></td>
                                            <td className="data-table__cell--middle"><NumberSpinner value={data.buff} onChange={v => setStat(stat, 'buff', v)} min={0} /></td>
                                            <td className="data-table__cell--middle"><NumberSpinner value={data.debuff} onChange={v => setStat(stat, 'debuff', v)} min={0} /></td>
                                            <td className="data-table__cell--middle" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px 0 4px', borderTop: '1px solid var(--border)', fontSize: '0.85rem', marginTop: '6px' }}>
                        <span>Remaining: <strong style={{ color: remaining < 0 ? '#F44336' : 'inherit' }}>{remaining}</strong></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Extra: <NumberSpinner value={extras.core} onChange={(v) => setExtra('core', v)} min={0} /></span>
                    </div>
                </div>
            )}
        </div>
    );
}