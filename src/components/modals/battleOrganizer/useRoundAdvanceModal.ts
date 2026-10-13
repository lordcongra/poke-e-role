import { useState } from 'react';
import type { BattlefieldData, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import { getEffectsByCategory } from '../../../utils/combat/fieldEffectsData';
import {
    hasPotentialRoundAdvanceTriggers,
    getCombatantCharacterDataMap,
    resolveCombatantRoundTriggers
} from './roundAdvanceTriggerUtils';

interface UseRoundAdvanceModalProps {
    battlefield: BattlefieldData;
    currentRound?: BattleRoundData;
    advanceRound: () => void;
    updateCombatant: (c: CombatantRowData) => void;
}

export function useRoundAdvanceModal({
    battlefield,
    currentRound,
    advanceRound,
    updateCombatant
}: UseRoundAdvanceModalProps) {
    const [showWeatherDamageModal, setShowWeatherDamageModal] = useState(false);
    const [hazardWeatherName, setHazardWeatherName] = useState('Weather');

    const handleAdvanceRoundRequest = async () => {
        if (!currentRound?.combatants || currentRound.combatants.length === 0) {
            advanceRound();
            return;
        }

        if (hasPotentialRoundAdvanceTriggers(battlefield)) {
            const dataMap = await getCombatantCharacterDataMap();
            const triggers = resolveCombatantRoundTriggers(currentRound.combatants, battlefield, dataMap);
            const hasActiveTriggers = triggers.some(
                (t) => (t.hasDamageTrigger && !t.isDamageImmune) || (t.hasHealingTrigger && !t.isHealingIneligible)
            );

            if (hasActiveTriggers) {
                const activeWeathers = getEffectsByCategory(battlefield, 'weather');
                setHazardWeatherName(
                    activeWeathers.map((w) => w.name).filter(Boolean).join(' & ') || 'Battlefield'
                );
                setShowWeatherDamageModal(true);
                return;
            }
        }

        advanceRound();
    };

    const handleApplyRoundTriggersAndAdvance = (selectedDamageIds: string[], selectedHealIds: string[]) => {
        if (currentRound?.combatants) {
            const affectedIds = new Set([...selectedDamageIds, ...selectedHealIds]);
            affectedIds.forEach((id) => {
                const c = currentRound.combatants.find((item) => item.id === id);
                if (!c || c.hpCurr === undefined) return;
                const isDamaged = selectedDamageIds.includes(id) && c.hpCurr > 0;
                const isHealed = selectedHealIds.includes(id) && !c.isFainted && c.hpCurr > 0;

                let hp = c.hpCurr;
                let tempHp = c.tempHp || 0;
                const maxHp = c.hpMax ?? c.hpCurr;

                if (isDamaged) {
                    if (tempHp > 0) {
                        tempHp = Math.max(0, tempHp - 1);
                    } else {
                        hp = Math.max(0, hp - 1);
                    }
                }
                if (isHealed && hp > 0) {
                    hp = Math.min(maxHp, hp + 1);
                }
                updateCombatant({
                    ...c,
                    hpCurr: hp,
                    tempHp,
                    isFainted: hp <= 0
                });
            });
        }
        setShowWeatherDamageModal(false);
        advanceRound();
    };

    const handleSkipWeatherDamageAndAdvance = () => {
        setShowWeatherDamageModal(false);
        advanceRound();
    };

    return {
        showWeatherDamageModal,
        setShowWeatherDamageModal,
        hazardWeatherName,
        handleAdvanceRoundRequest,
        handleApplyRoundTriggersAndAdvance,
        handleSkipWeatherDamageAndAdvance
    };
}
