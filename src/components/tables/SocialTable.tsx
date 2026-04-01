import { useCharacterStore, getRankPoints, getAgePoints } from '../../store/useCharacterStore';
import { SocialStat } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { parseCombatTags, getAbilityText } from '../../utils/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import './SocialTable.css';

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
    const setSocialStatistic = useCharacterStore((state) => state.setSocialStat);
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
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText);

    const spentRank = Object.values(SocialStat).reduce(
        (accumulator, statistic) => accumulator + socials[statistic].rank,
        0
    );
    const remainingPoints = rankPoints + agePoints + extras.social - spentRank;

    return (
        <CollapsingSection title="SOCIAL ATTRIBUTES">
            <div className="table-responsive-wrapper">
                <table className="data-table">
                    <thead>
                        <tr className="social-table__header-row">
                            <th className="social-table__header-cell">SOCIAL</th>
                            <th>Base</th>
                            <th>Rank</th>
                            <th>Buff</th>
                            <th>Debuff</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(SocialStat).map((statistic) => {
                            const data = socials[statistic];
                            const itemBonus = inventoryModifiers.stats[statistic] || 0;
                            const total = Math.max(1, data.base + data.rank + data.buff - data.debuff + itemBonus);
                            return (
                                <tr key={statistic} className="data-table__row--dynamic">
                                    <td
                                        className="social-table__statistic-label"
                                        style={{ background: SOCIAL_COLORS[statistic] }}
                                    >
                                        {SOCIAL_LABELS[statistic]}
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.base}
                                            onChange={(value: number) => setSocialStatistic(statistic, 'base', value)}
                                            min={1}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.rank}
                                            onChange={(value: number) => setSocialStatistic(statistic, 'rank', value)}
                                            min={0}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.buff}
                                            onChange={(value: number) => setSocialStatistic(statistic, 'buff', value)}
                                            min={0}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle">
                                        <NumberSpinner
                                            value={data.debuff}
                                            onChange={(value: number) => setSocialStatistic(statistic, 'debuff', value)}
                                            min={0}
                                        />
                                    </td>
                                    <td className="data-table__cell--middle social-table__total-cell">{total}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="social-table__footer">
                <span>
                    Remaining:{' '}
                    <strong className={remainingPoints < 0 ? 'social-table__negative-remaining' : ''}>
                        {remainingPoints}
                    </strong>
                </span>
                <span className="social-table__max-label">(Max 5 per stat)</span>
                <span className="social-table__extra-container">
                    Extra:{' '}
                    <NumberSpinner
                        value={extras.social}
                        onChange={(value: number) => setExtra('social', value)}
                        min={0}
                    />
                </span>
            </div>
        </CollapsingSection>
    );
}
