import { CombatStat, SocialStat } from '../../types/enums';
import {
    calculateStatTotal,
    calculateDefTotal,
    calculateSDefTotal,
    calculateBaseInitiative
} from '../../utils/combat/combatUtils';
import { renderStat } from './printHelpers';
import type { CharacterState, PrintConfig } from '../../store/storeTypes';
import type { CombatBonuses } from '../../utils/tagParser/tagTypes';

interface PrintStatsGridProps {
    resolvedTokenUrl: string;
    fullState: CharacterState;
    inventoryModifiers: CombatBonuses;
    config: PrintConfig;
}

export function PrintStatsGrid({ resolvedTokenUrl, fullState, inventoryModifiers, config }: PrintStatsGridProps) {
    const statStyle = config.statStyle || 'dots';
    const isTrainer = fullState.identity.mode === 'Trainer';

    const strTotal = calculateStatTotal(CombatStat.STR, fullState, inventoryModifiers);
    const dexTotal = calculateStatTotal(CombatStat.DEX, fullState, inventoryModifiers);
    const vitTotal = calculateStatTotal(CombatStat.VIT, fullState, inventoryModifiers);
    const speTotal = calculateStatTotal(CombatStat.SPE, fullState, inventoryModifiers);
    const insTotal = calculateStatTotal(CombatStat.INS, fullState, inventoryModifiers);

    const touTotal = calculateStatTotal(SocialStat.TOU, fullState, inventoryModifiers);
    const cooTotal = calculateStatTotal(SocialStat.COO, fullState, inventoryModifiers);
    const beaTotal = calculateStatTotal(SocialStat.BEA, fullState, inventoryModifiers);
    const cutTotal = calculateStatTotal(SocialStat.CUT, fullState, inventoryModifiers);
    const cleTotal = calculateStatTotal(SocialStat.CLE, fullState, inventoryModifiers);

    const defTotal = calculateDefTotal(fullState, inventoryModifiers);
    const sdefTotal = calculateSDefTotal(fullState, inventoryModifiers);
    const initTotal = calculateBaseInitiative(fullState, inventoryModifiers);

    const showPortrait = !config.hidePortrait;
    const showCoreStats = !config.hideCoreStats;
    const showSocialStats = !config.hideSocialStats;
    const showCombatVitals = !config.hideCombatVitals;

    const visibleStatsCount = (showCoreStats ? 1 : 0) + (showSocialStats ? 1 : 0) + (showCombatVitals ? 1 : 0);

    if (!showPortrait && visibleStatsCount === 0) {
        return null;
    }

    return (
        <div className={`print-sheet__top-grid ${!showPortrait ? 'print-sheet__top-grid--no-portrait' : ''}`}>
            {showPortrait && (
                <div className="print-sheet__portrait-box">
                    {resolvedTokenUrl && (
                        <img src={resolvedTokenUrl} className="print-sheet__portrait-img" alt="Token" />
                    )}
                </div>
            )}

            {visibleStatsCount > 0 && (
                <div
                    className="print-sheet__stats-grid"
                    style={{ gridTemplateColumns: `repeat(${visibleStatsCount}, 1fr)` }}
                >
                    {/* Core Stats */}
                    {showCoreStats && (
                        <div className="print-sheet__section">
                            <h4 className="print-sheet__section-title">Core Stats</h4>
                            {renderStat(
                                'Strength',
                                strTotal,
                                fullState.stats[CombatStat.STR]?.limit ?? 5,
                                config.blankStats,
                                statStyle
                            )}
                            {renderStat(
                                'Dexterity',
                                dexTotal,
                                fullState.stats[CombatStat.DEX]?.limit ?? 5,
                                config.blankStats,
                                statStyle
                            )}
                            {renderStat(
                                'Vitality',
                                vitTotal,
                                fullState.stats[CombatStat.VIT]?.limit ?? 5,
                                config.blankStats,
                                statStyle
                            )}
                            {isTrainer ? (
                                <div className="print-sheet__stat-row">
                                    <span className="print-sheet__stat-name">Special</span>
                                    <span className="print-sheet__vitals-val" style={{ color: '#888' }}>
                                        -
                                    </span>
                                </div>
                            ) : (
                                renderStat(
                                    'Special',
                                    speTotal,
                                    fullState.stats[CombatStat.SPE]?.limit ?? 5,
                                    config.blankStats,
                                    statStyle
                                )
                            )}
                            {renderStat(
                                'Insight',
                                insTotal,
                                fullState.stats[CombatStat.INS]?.limit ?? 5,
                                config.blankStats,
                                statStyle
                            )}
                        </div>
                    )}

                    {/* Social Stats */}
                    {showSocialStats && (
                        <div className="print-sheet__section">
                            <h4 className="print-sheet__section-title">Social Stats</h4>
                            {renderStat(
                                'Tough',
                                touTotal,
                                fullState.socials[SocialStat.TOU]?.limit ?? 5,
                                config.blankSocials,
                                statStyle
                            )}
                            {renderStat(
                                'Cool',
                                cooTotal,
                                fullState.socials[SocialStat.COO]?.limit ?? 5,
                                config.blankSocials,
                                statStyle
                            )}
                            {renderStat(
                                'Beauty',
                                beaTotal,
                                fullState.socials[SocialStat.BEA]?.limit ?? 5,
                                config.blankSocials,
                                statStyle
                            )}
                            {renderStat(
                                'Cute',
                                cutTotal,
                                fullState.socials[SocialStat.CUT]?.limit ?? 5,
                                config.blankSocials,
                                statStyle
                            )}
                            {renderStat(
                                'Clever',
                                cleTotal,
                                fullState.socials[SocialStat.CLE]?.limit ?? 5,
                                config.blankSocials,
                                statStyle
                            )}
                        </div>
                    )}

                    {/* Combat Vitals */}
                    {showCombatVitals && (
                        <div className="print-sheet__section">
                            <h4 className="print-sheet__section-title">Combat Vitals</h4>
                            <div className="print-sheet__stat-row">
                                <span className="print-sheet__stat-name">HP Max</span>
                                <span className="print-sheet__vitals-val">
                                    {config.blankStats ? '___' : fullState.health.hpMax}
                                </span>
                            </div>
                            <div className="print-sheet__stat-row">
                                <span className="print-sheet__stat-name">Will Max</span>
                                <span className="print-sheet__vitals-val">
                                    {config.blankStats ? '___' : fullState.will.willMax}
                                </span>
                            </div>
                            <div className="print-sheet__stat-row">
                                <span className="print-sheet__stat-name">Defense</span>
                                <span className="print-sheet__vitals-val">{config.blankStats ? '___' : defTotal}</span>
                            </div>
                            <div className="print-sheet__stat-row">
                                <span className="print-sheet__stat-name">Sp. Def</span>
                                <span className="print-sheet__vitals-val">{config.blankStats ? '___' : sdefTotal}</span>
                            </div>
                            <div className="print-sheet__stat-row">
                                <span className="print-sheet__stat-name">Initiative</span>
                                <span className="print-sheet__vitals-val">{config.blankStats ? '___' : initTotal}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
