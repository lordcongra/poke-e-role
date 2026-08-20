import { Swords, Dumbbell, Sparkles, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, Skill } from '../../types/enums';
import {
    rollGeneric,
    parseCombatTags,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal
} from '../../utils/combatUtils';
import './ClashModal.css';

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
        <div className="clash-modal__overlay">
            <div className="clash-modal__content">
                <h3 className="clash-modal__title modal-title-with-icon">
                    <Swords size={20} /> Select Clash Type
                </h3>
                <p className="clash-modal__description">Which attribute are you using to Clash?</p>
                <div className="clash-modal__actions">
                    <button
                        type="button"
                        onClick={() => handleClashRoll(true)}
                        className="action-button action-button--theme clash-modal__btn"
                    >
                        <Dumbbell size={18} /> Physical (STR)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleClashRoll(false)}
                        className="action-button action-button--secondary clash-modal__btn"
                    >
                        <Sparkles size={18} /> Special (SPE)
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark clash-modal__btn"
                    >
                        <XCircle size={18} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
