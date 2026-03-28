// src/components/CoreTable.tsx
import { useCharacterStore, getRankPoints } from '../store/useCharacterStore';
import { CombatStat } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';

const STAT_COLORS = { [CombatStat.STR]: '#E65100', [CombatStat.DEX]: '#2E7D32', [CombatStat.VIT]: '#C62828', [CombatStat.SPE]: '#1565C0', [CombatStat.INS]: '#6A1B9A' };

export function CoreTable() {
    const stats = useCharacterStore(state => state.stats);
    const setStat = useCharacterStore(state => state.setStat);
    const extras = useCharacterStore(state => state.extras);
    const setExtra = useCharacterStore(state => state.setExtra);
    
    // NEW: Get the exact points based on the currently selected Rank!
    const currentRank = useCharacterStore(state => state.identity.rank);
    const rankPoints = getRankPoints(currentRank).core;

    const spentRank = Object.values(CombatStat).reduce((acc, stat) => acc + stats[stat].rank, 0);
    const remaining = rankPoints + extras.core - spentRank;

    return (
        <div className="sheet-panel">
            <table className="data-table">
                <thead>
                    <tr style={{ background: '#555', color: 'white' }}>
                        <th style={{ padding: '4px' }}>ATTR</th>
                        <th>Base</th><th>Limit</th><th>Rank</th><th>Buff</th><th>Debuff</th><th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.values(CombatStat).map(stat => {
                        const data = stats[stat];
                        const total = Math.max(1, data.base + data.rank + data.buff - data.debuff);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px 0 4px', borderTop: '1px solid var(--border)', fontSize: '0.85rem', marginTop: '6px' }}>
                <span>Remaining: <strong style={{ color: remaining < 0 ? '#F44336' : 'inherit' }}>{remaining}</strong></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Extra: <NumberSpinner value={extras.core} onChange={(v) => setExtra('core', v)} min={0} /></span>
            </div>
        </div>
    );
}