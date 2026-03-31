import { useCharacterStore } from '../store/useCharacterStore';
import { CombatStat, Skill } from '../types/enums';
import { rollGeneric, parseCombatTags, getAbilityText } from '../utils/combatUtils';

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
        const statTotal = Math.max(
            1,
            state.stats[statistic].base +
                state.stats[statistic].rank +
                state.stats[statistic].buff -
                state.stats[statistic].debuff +
                (itemBuffs.stats[statistic] || 0)
        );
        const clashTotal =
            state.skills[Skill.CLASH].base + state.skills[Skill.CLASH].buff + (itemBuffs.skills.clash || 0);
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
                <h3 className="tracker-modal__title">⚔️ Select Clash Type</h3>
                <p className="tracker-modal__description">Which attribute are you using to Clash?</p>
                <div className="tracker-modal__clash-actions">
                    <button
                        type="button"
                        onClick={() => handleClashRoll(true)}
                        className="action-button action-button--dark tracker-modal__clash-btn-phys"
                    >
                        💪 Physical (STR)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleClashRoll(false)}
                        className="action-button action-button--dark tracker-modal__clash-btn-spec"
                    >
                        ✨ Special (SPE)
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tracker-modal__clash-btn-cancel"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
