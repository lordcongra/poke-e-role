import { useCharacterStore, getRankPoints, getAgePoints } from '../../store/useCharacterStore';
import { CombatStat } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { parseCombatTags, getAbilityText } from '../../utils/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import './CoreTable.css';

const STATISTIC_COLORS = {
    [CombatStat.STR]: '#E65100',
    [CombatStat.DEX]: '#2E7D32',
    [CombatStat.VIT]: '#C62828',
    [CombatStat.SPE]: '#1565C0',
    [CombatStat.INS]: '#6A1B9A'
};

export function CoreTable() {
    const statistics = useCharacterStore((state) => state.stats);
    const setStatistic = useCharacterStore((state) => state.setStat);
    const extras = useCharacterStore((state) => state.extras);
    const setExtra = useCharacterStore((state) => state.setExtra);
    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);

    const currentRank = useCharacterStore((state) => state.identity.rank);
    const currentAge = useCharacterStore((state) => state.identity.age);
    const mode = useCharacterStore((state) => state.identity.mode);

    const rankPoints = getRankPoints(currentRank).core;
    const agePoints = getAgePoints(currentAge).core;

    const abilityText = getAbilityText(ability, customAbilities);
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText);

    const visibleStatistics = Object.values(CombatStat).filter(
        (statistic) => !(mode === 'Trainer' && statistic === CombatStat.SPE)
    );

    const spentRank = visibleStatistics.reduce((accumulator, statistic) => accumulator + statistics[statistic].rank, 0);
    const remainingPoints = rankPoints + agePoints + extras.core - spentRank;

    return (
        <CollapsingSection title="CORE ATTRIBUTES">
            <div className="table-responsive-wrapper">
                <table className="data-table">
                    <thead>
                        <tr className="core-table__header-row">
                            <th className="core-table__header-cell">ATTR</th>
                            <th>Base</th>
                            <th>Limit</th>
                            <th>Rank</th>
                            <th>Buff</th>
                            <th>Debuff</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleStatistics.map((statistic) => {
                            const data = statistics[statistic];
                            const itemBonus = inventoryModifiers.stats[statistic] || 0;
                            const total = Math.max(1, data.base + data.rank + data.buff - data.debuff + itemBonus);
                            return (
                                <tr key={statistic} className="data-table__row--dynamic">
                                    <td
                                        className="core-table__statistic-label"
                                        style={{ background: STATISTIC_COLORS[statistic] }}
                                    >
                                        {statistic.toUpperCase()}
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.base}
                                            onChange={(value: number) => setStatistic(statistic, 'base', value)}
                                            min={1}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.limit}
                                            onChange={(value: number) => setStatistic(statistic, 'limit', value)}
                                            min={1}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.rank}
                                            onChange={(value: number) => setStatistic(statistic, 'rank', value)}
                                            min={0}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.buff}
                                            onChange={(value: number) => setStatistic(statistic, 'buff', value)}
                                            min={0}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.debuff}
                                            onChange={(value: number) => setStatistic(statistic, 'debuff', value)}
                                            min={0}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle core-table__total-cell">{total}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="core-table__footer">
                <span>
                    Remaining:{' '}
                    <strong className={remainingPoints < 0 ? 'core-table__negative-remaining' : ''}>
                        {remainingPoints}
                    </strong>
                </span>
                <span className="core-table__extra-container">
                    Extra:{' '}
                    <NumberSpinner value={extras.core} onChange={(value: number) => setExtra('core', value)} min={0} />
                </span>
            </div>
        </CollapsingSection>
    );
}
