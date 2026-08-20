import { Swords, Dumbbell, Sparkles, X } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, Skill } from '../../types/enums';
import {
    rollGeneric,
    parseCombatTags,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal
} from '../../utils/combatUtils';

interface ClashModalProps {
    onClose: () => void;
}

export function ClashModal({ onClose }: ClashModalProps) {
    const handleClashRoll = (isPhysical: boolean) => {
        onClose();
        const state = useCharacterStore.getState();
        const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
        const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

        const statistic = isPhysical ? CombatStat.STR : CombatStat.SPE;

        const statTotal = calculateStatTotal(statistic, state, itemBuffs);
        const clashTotal = calculateSkillTotal(Skill.CLASH, state, itemBuffs);

        rollGeneric(
            isPhysical ? 'Physical Clash' : 'Special Clash',
            statTotal + clashTotal,
            statistic,
            false,
            true,
            true
        );
    };

    return (
        <div className="tracker-modal__overlay">
            <div className="tracker-modal__content tracker-modal__content--clash">
                <h3 className="tracker-modal__title modal-title-with-icon">
                    <Swords size={20} /> Select Clash Type
                </h3>
                <p className="tracker-modal__description">Which attribute are you using to Clash?</p>
                <div className="tracker-modal__clash-actions">
                    <button
                        type="button"
                        onClick={() => handleClashRoll(true)}
                        className="action-button action-button--dark tracker-modal__clash-btn-phys"
                    >
                        <Dumbbell size={16} /> Physical (STR)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleClashRoll(false)}
                        className="action-button action-button--dark tracker-modal__clash-btn-spec"
                    >
                        <Sparkles size={16} /> Special (SPE)
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--ghost tracker-modal__clash-btn-cancel"
                    >
                        <X size={16} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
