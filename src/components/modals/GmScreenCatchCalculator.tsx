import { useState } from 'react';
import { Calculator, Copy, Megaphone, Check } from 'lucide-react';
import { CATCH_BALLS_TABLE, CATCH_RANKS_TABLE } from '../../data/gmScreenData';
import { broadcastInfo } from '../../utils/diceRoller';
import './GmScreenCatchCalculator.css';

export function GmScreenCatchCalculator() {
    const [selectedBallIndex, setSelectedBallIndex] = useState<number>(0);
    const [customSealPower, setCustomSealPower] = useState<number>(9);
    const [selectedRankIndex, setSelectedRankIndex] = useState<number>(0);
    const [hpCondition, setHpCondition] = useState<'full' | 'half' | 'one'>('half');
    const [statusCount, setStatusCount] = useState<number>(0);
    const [copied, setCopied] = useState<boolean>(false);

    const isCustomBall = selectedBallIndex === 3; // Index 3 is 'Other / Custom Ball'
    const ball = CATCH_BALLS_TABLE[selectedBallIndex] || CATCH_BALLS_TABLE[0];
    const rank = CATCH_RANKS_TABLE[selectedRankIndex] || CATCH_RANKS_TABLE[0];

    const hpBonus = hpCondition === 'one' ? 2 : hpCondition === 'half' ? 1 : 0;
    const totalBonusSuccesses = hpBonus + statusCount;
    const totalDice = isCustomBall ? Math.max(1, customSealPower || 1) : ball.val;
    const requiredSuccesses = rank.val;
    const ballLabel = isCustomBall ? `Other Ball (${totalDice} Dice)` : `${ball.item} (${totalDice} Dice)`;

    const copyDiscordSummary = async () => {
        const hpText = hpCondition === 'one' ? '1 HP (+2)' : hpCondition === 'half' ? 'Half HP (+1)' : 'Full HP (+0)';
        const statusText = statusCount > 0 ? `${statusCount} Status Ailment(s) (+${statusCount})` : 'None (+0)';

        const text = `## 🔴 **Catching Attempt: ${rank.rank} Pokémon**
> **Pokéball:** ${ballLabel}
> **HP Condition:** ${hpText}
> **Status:** ${statusText}
> **Total Bonus Successes:** +${totalBonusSuccesses}
> **Required Successes:** ${requiredSuccesses}

**Roll Formula:** Roll **${totalDice}d6** (4-6 = Success) + **${totalBonusSuccesses} Bonus Successes** >= **${requiredSuccesses}** to capture!`;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('[GmScreenCatchCalculator] Failed to copy text to clipboard:', error);
        }
    };

    const handleBroadcast = () => {
        const broadcastText = `Catching ${rank.rank} Pokémon: ${ballLabel} + ${totalBonusSuccesses} Bonus Successes vs ${requiredSuccesses} Required.`;
        broadcastInfo(`Catch Attempt (${rank.rank})`, broadcastText);
    };

    return (
        <div className="catch-calc">
            <div className="catch-calc__header">
                <div className="catch-calc__title text-title-primary">
                    <Calculator size={18} /> Interactive Catch Calculator
                </div>
            </div>

            <div className="catch-calc__grid">
                <div className="catch-calc__field">
                    <label className="text-label" htmlFor="catch-calc-ball">
                        Pokéball Type
                    </label>
                    <select
                        id="catch-calc-ball"
                        className="catch-calc__select text-subtext"
                        value={selectedBallIndex}
                        onChange={(e) => setSelectedBallIndex(Number(e.target.value))}
                    >
                        <option value={0}>Pokéball (4 dice)</option>
                        <option value={1}>Greatball (6 dice)</option>
                        <option value={2}>Ultraball (8 dice)</option>
                        <option value={3}>Other / Custom Ball (Fill-in Dice)</option>
                    </select>
                </div>

                {isCustomBall ? (
                    <div className="catch-calc__field">
                        <label className="text-label" htmlFor="catch-calc-custom-seal">
                            Custom Seal Power (Dice)
                        </label>
                        <input
                            id="catch-calc-custom-seal"
                            type="number"
                            min={1}
                            max={30}
                            className="catch-calc__input text-subtext"
                            value={customSealPower}
                            onChange={(e) => setCustomSealPower(Math.max(1, Number(e.target.value) || 1))}
                            placeholder="Enter dice (e.g. 9)"
                        />
                    </div>
                ) : (
                    <div className="catch-calc__field">
                        <label className="text-label" htmlFor="catch-calc-rank">
                            Wild Target Rank
                        </label>
                        <select
                            id="catch-calc-rank"
                            className="catch-calc__select text-subtext"
                            value={selectedRankIndex}
                            onChange={(e) => setSelectedRankIndex(Number(e.target.value))}
                        >
                            {CATCH_RANKS_TABLE.map((r, idx) => (
                                <option key={r.rank} value={idx}>
                                    {r.rank} ({r.required})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {isCustomBall && (
                    <div className="catch-calc__field">
                        <label className="text-label" htmlFor="catch-calc-rank-custom">
                            Wild Target Rank
                        </label>
                        <select
                            id="catch-calc-rank-custom"
                            className="catch-calc__select text-subtext"
                            value={selectedRankIndex}
                            onChange={(e) => setSelectedRankIndex(Number(e.target.value))}
                        >
                            {CATCH_RANKS_TABLE.map((r, idx) => (
                                <option key={r.rank} value={idx}>
                                    {r.rank} ({r.required})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="catch-calc__field">
                    <label className="text-label" htmlFor="catch-calc-hp">
                        HP Condition
                    </label>
                    <select
                        id="catch-calc-hp"
                        className="catch-calc__select text-subtext"
                        value={hpCondition}
                        onChange={(e) => setHpCondition(e.target.value as 'full' | 'half' | 'one')}
                    >
                        <option value="full">Full / Above Half HP (+0)</option>
                        <option value="half">Half HP or lower (+1 Success)</option>
                        <option value="one">At 1 HP (+2 Successes)</option>
                    </select>
                </div>

                <div className="catch-calc__field">
                    <label className="text-label" htmlFor="catch-calc-status">
                        Status Ailments
                    </label>
                    <select
                        id="catch-calc-status"
                        className="catch-calc__select text-subtext"
                        value={statusCount}
                        onChange={(e) => setStatusCount(Number(e.target.value))}
                    >
                        <option value={0}>No Status Ailment (+0)</option>
                        <option value={1}>1 Status Ailment (+1 Success)</option>
                        <option value={2}>2 Status Ailments (+2 Successes)</option>
                        <option value={3}>3 Status Ailments (+3 Successes)</option>
                    </select>
                </div>
            </div>

            <div className="catch-calc__result-box">
                <div className="catch-calc__result-summary">
                    <span className="text-label">Catch Formula:</span>
                    <span className="text-value-highlight" style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                        {totalDice} Dice + {totalBonusSuccesses} Bonus Successes
                    </span>
                </div>
                <div className="catch-calc__formula text-subtext">
                    Roll <strong>{totalDice}d6</strong> (4, 5, or 6 = 1 success) and add{' '}
                    <strong>{totalBonusSuccesses}</strong> flat successes. Needs{' '}
                    <strong style={{ color: 'var(--primary)' }}>{requiredSuccesses} total successes</strong> to capture
                    the <strong>{rank.rank}</strong> Pokémon.
                </div>
            </div>

            <div className="catch-calc__actions">
                <button
                    type="button"
                    className="action-button action-button--dark catch-calc__btn"
                    onClick={copyDiscordSummary}
                    title="Copy formatted summary for Discord"
                >
                    {copied ? (
                        <>
                            <Check size={14} color="var(--primary)" /> Copied!
                        </>
                    ) : (
                        <>
                            <Copy size={14} /> Copy for Discord
                        </>
                    )}
                </button>
                <button
                    type="button"
                    className="action-button action-button--theme catch-calc__btn"
                    onClick={handleBroadcast}
                    title="Broadcast catch summary to Owlbear table / chat"
                >
                    <Megaphone size={14} /> Broadcast
                </button>
            </div>
        </div>
    );
}
