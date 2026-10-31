import React from 'react';
import { X, Info, Dices, Check } from 'lucide-react';
import { parseRollLabel } from '../../utils/combat/rollLogParser';
import { executeChanceRoll } from '../../utils/combat/diceRoller';
import type { RollSyncData } from '../../hooks/owlbearSync/owlbearSyncConstants';

export interface RollLogEntryItemProps {
    roll: RollSyncData;
    resolvedIcon?: string;
    onDismiss: (id: string) => void;
    onOpenFactors: (factorsData: {
        title: string;
        characterName?: string;
        coreTags: string[];
        factors: string[];
        result?: string;
    }) => void;
}

export const RollLogEntryItem: React.FC<RollLogEntryItemProps> = ({ roll, resolvedIcon, onDismiss, onOpenFactors }) => {
    const isCrit = Boolean(
        roll.isCrit ||
        /critical hit/i.test(roll.result) ||
        /CRITICAL HIT/i.test(roll.label) ||
        /It's a critical hit/i.test(roll.result)
    );
    const isCritFail = Boolean(
        roll.isCritFail ||
        /critical failure/i.test(roll.result) ||
        /CRITICAL FAILURE/i.test(roll.label) ||
        /It is a critical failure/i.test(roll.result)
    );
    const { cleanLabel, coreTags, factorTags } = parseRollLabel(roll.label);

    return (
        <div
            className={`roll-log__entry ${isCrit ? 'roll-log__entry--crit' : ''} ${isCritFail ? 'roll-log__entry--crit-fail' : ''}`}
        >
            <div className="roll-log__entry-header">
                <img
                    src={resolvedIcon || roll.icon}
                    alt="Token"
                    className="roll-log__entry-icon"
                    onError={(e) => {
                        e.currentTarget.src = `${import.meta.env.BASE_URL || '/'}pokeball-token.svg`;
                    }}
                />
                <strong className="text-title-primary" style={{ fontSize: '0.9rem' }}>
                    {roll.player}
                </strong>
                {isCrit && <span className="roll-log__crit-badge">Critical Hit!</span>}
                {isCritFail && <span className="roll-log__crit-fail-badge">Critical Failure!</span>}
                <button
                    type="button"
                    onClick={() => onDismiss(roll.id)}
                    className="roll-log__entry-dismiss text-subtext"
                    title="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>
            <div className="roll-log__entry-label text-label" style={{ color: 'var(--primary)' }}>
                <span>{cleanLabel}</span>
                {coreTags.length > 0 && <span className="roll-log__core-tags">[ {coreTags.join(' | ')} ]</span>}
                {factorTags.length > 0 && (
                    <button
                        type="button"
                        className="roll-log__factors-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenFactors({
                                title: cleanLabel,
                                characterName: roll.characterName || roll.player,
                                coreTags,
                                factors: factorTags,
                                result: roll.result
                            });
                        }}
                        title="View contributing factors, items, passives, and abilities"
                    >
                        <Info size={11} />
                        <span>
                            {factorTags.length} {factorTags.length === 1 ? 'Factor' : 'Factors'}
                        </span>
                    </button>
                )}
                {roll.chanceDice && roll.chanceDice > 0 && (
                    <button
                        type="button"
                        className="roll-log__chance-btn"
                        disabled={roll.chanceRolled}
                        onClick={(e) => {
                            e.stopPropagation();
                            executeChanceRoll(roll);
                        }}
                        title={
                            roll.chanceRolled
                                ? `Chance dice already rolled (${roll.chanceDice}d6)`
                                : `Roll ${roll.chanceDice}d6 (Need 6) for ${roll.chanceEffect || 'Effect'}`
                        }
                    >
                        {roll.chanceRolled ? (
                            <>
                                <Check size={11} />
                                <span>Chance</span>
                            </>
                        ) : (
                            <>
                                <Dices size={12} />
                                <span>Chance</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            <div className="roll-log__entry-result text-subtext" style={{ color: 'var(--text-main)' }}>
                {roll.result}
            </div>
        </div>
    );
};
