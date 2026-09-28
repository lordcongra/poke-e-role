import { GmScreenTypeMatrix } from './GmScreenTypeMatrix';
import { GmScreenCatchCalculator } from './GmScreenCatchCalculator';
import { GmCombatCards } from '../gmCards/GmCombatCards';
import { GmTrainerCards } from '../gmCards/GmTrainerCards';
import { GmManeuverCards } from '../gmCards/GmManeuverCards';
import { GmStatusCards } from '../gmCards/GmStatusCards';
import { GmReferenceCards } from '../gmCards/GmReferenceCards';
import { GmHomebrewCards } from '../gmCards/GmHomebrewCards';
import { GmRangersCards } from '../gmCards/GmRangersCards';
import {
    broadcastWill,
    broadcastCombatFlowStep,
    broadcastHoldingBack,
    broadcastReactionExample,
    broadcastReactionCoreRules,
    broadcastTrainerAction,
    broadcastStatusRules,
    broadcastStatus,
    broadcastWeather,
    broadcastHazard,
    broadcastCover,
    broadcastHealing,
    broadcastCharacterRule,
    broadcastTreasureBagCapacity,
    broadcastItemWeight,
    broadcastFoodItem,
    broadcastWeaponModel,
    broadcastSwitcherModel,
    broadcastDispositionRank,
    broadcastRangerStyle,
    broadcastStyler,
    broadcastDangerousBuff,
    broadcastManeuver,
    broadcastFieldAssist,
    broadcastPartnerBond
} from './gmScreenBroadcastUtils';

interface GmScreenCardContentProps {
    itemId: string;
}

export function GmScreenCardContent({ itemId }: GmScreenCardContentProps) {
    if (itemId === 'type-matchup-chart') {
        return <GmScreenTypeMatrix />;
    }

    if (itemId === 'catching-mechanics') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <GmScreenCatchCalculator />
                <div className="gm-table-wrapper">
                    <table className="gm-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Seal Potency</th>
                                <th>Wild Condition</th>
                                <th>Bonus Successes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Pokéball</td>
                                <td>4 dice</td>
                                <td>Half HP or lower</td>
                                <td>+1 Success</td>
                            </tr>
                            <tr>
                                <td>Greatball</td>
                                <td>6 dice</td>
                                <td>At 1 HP</td>
                                <td>+2 Successes</td>
                            </tr>
                            <tr>
                                <td>Ultraball</td>
                                <td>8 dice</td>
                                <td>Status Ailment</td>
                                <td>+1 Success / ailment</td>
                            </tr>
                            <tr>
                                <td>Other / Custom Ball</td>
                                <td>Custom Seal Power</td>
                                <td>—</td>
                                <td>—</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const combatIds = [
        'skills-and-attributes',
        'attribute-benchmarks-lifting-speed',
        'successes-required',
        'will-points',
        'combat-flow',
        'using-a-move',
        'move-clarifications-core',
        'holding-back-attack',
        'reactions-late-reactions',
        'pain-penalties',
        'lethal-damage'
    ];
    if (combatIds.includes(itemId)) {
        return (
            <GmCombatCards
                itemId={itemId}
                onBroadcastWill={broadcastWill}
                onBroadcastCombatFlowStep={broadcastCombatFlowStep}
                onBroadcastHoldingBack={broadcastHoldingBack}
                onBroadcastReactionExample={broadcastReactionExample}
                onBroadcastReactionCoreRules={broadcastReactionCoreRules}
            />
        );
    }

    const trainerIds = [
        'trainer-actions-table',
        'trainer-initiative',
        'trainer-commanding',
        'trainer-switching',
        'humans-in-combat',
        'pokeball-throwing-timing'
    ];
    if (trainerIds.includes(itemId)) {
        return <GmTrainerCards itemId={itemId} onBroadcastTrainerAction={broadcastTrainerAction} />;
    }

    const maneuverIds = ['maneuvers-core-rules', 'maneuvers-list-all'];
    if (maneuverIds.includes(itemId) || itemId.startsWith('maneuver-')) {
        return <GmManeuverCards itemId={itemId} />;
    }

    const statusIds = ['status-effects-all', 'weather-conditions-all', 'environmental-hazards-all'];
    if (statusIds.includes(itemId)) {
        return (
            <GmStatusCards
                itemId={itemId}
                onBroadcastStatusRules={broadcastStatusRules}
                onBroadcastStatus={broadcastStatus}
                onBroadcastWeather={broadcastWeather}
                onBroadcastHazard={broadcastHazard}
            />
        );
    }

    const referenceIds = [
        'cover-mechanics',
        'healing-rates',
        'training-points-guide',
        'rank-summary-table',
        'encounter-balancing-chart'
    ];
    if (referenceIds.includes(itemId)) {
        return (
            <GmReferenceCards itemId={itemId} onBroadcastCover={broadcastCover} onBroadcastHealing={broadcastHealing} />
        );
    }

    const homebrewIds = [
        'pmd-character-creation',
        'pmd-treasure-bag-weight',
        'pmd-dungeon-economy-food',
        'pmd-weapons-equipment',
        'pmd-switcher-moves'
    ];
    if (homebrewIds.includes(itemId)) {
        return (
            <GmHomebrewCards
                itemId={itemId}
                onBroadcastCharacterRule={broadcastCharacterRule}
                onBroadcastTreasureBagCapacity={broadcastTreasureBagCapacity}
                onBroadcastItemWeight={broadcastItemWeight}
                onBroadcastFoodItem={broadcastFoodItem}
                onBroadcastWeaponModel={broadcastWeaponModel}
                onBroadcastSwitcherModel={broadcastSwitcherModel}
            />
        );
    }

    const rangersIds = [
        'rangers-core-mechanics',
        'rangers-stylers-gear',
        'rangers-maneuvers-list',
        'rangers-assists-bonds'
    ];
    if (rangersIds.includes(itemId)) {
        return (
            <GmRangersCards
                itemId={itemId}
                onBroadcastDispositionRank={broadcastDispositionRank}
                onBroadcastRangerStyle={broadcastRangerStyle}
                onBroadcastStyler={broadcastStyler}
                onBroadcastDangerousBuff={broadcastDangerousBuff}
                onBroadcastManeuver={broadcastManeuver}
                onBroadcastFieldAssist={broadcastFieldAssist}
                onBroadcastPartnerBond={broadcastPartnerBond}
            />
        );
    }

    return null;
}
