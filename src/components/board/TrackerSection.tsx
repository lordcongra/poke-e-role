import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NumberSpinner } from '../ui/NumberSpinner';
import { CombatStat, Skill } from '../../types/enums';
import { rollGeneric, parseCombatTags, getAbilityText } from '../../utils/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TooltipIcon } from '../ui/TooltipIcon';
import { TakeChancesModal } from '../modals/TakeChancesModal';
import { ClashModal } from '../modals/ClashModal';
import { RestModal } from '../modals/RestModal';
import './TrackerSection.css';

export function TrackerSection() {
    const trackers = useCharacterStore((state) => state.trackers);
    const updateTracker = useCharacterStore((state) => state.updateTracker);
    const resetRound = useCharacterStore((state) => state.resetRound);

    const activeTransformation = useCharacterStore((state) => state.identity.activeTransformation);
    const isMaxed = activeTransformation === 'Dynamax' || activeTransformation === 'Gigantamax';

    const painEnabled =
        String(useCharacterStore((state) => state.identity.pain || 'Enabled')).toLowerCase() === 'enabled';
    const will = useCharacterStore((state) => state.will);
    const updateWill = useCharacterStore((state) => state.updateWill);

    const [maneuver, setManeuver] = useState('none');
    const [showClashModal, setShowClashModal] = useState(false);
    const [showRestModal, setShowRestModal] = useState(false);
    const [chancesModalOpen, setChancesModalOpen] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    const handleWillSpend = (cost: number, action: () => void) => {
        if (will.willCurr >= cost) {
            updateWill('willCurr', will.willCurr - cost);
            action();
        } else {
            if (OBR.isAvailable) OBR.notification.show('Not enough Will points!', 'WARNING');
        }
    };

    const handleFateSpend = () => {
        if (trackers.chances > 0) {
            if (OBR.isAvailable)
                OBR.notification.show('Cannot use Pushing Fate in the same round as Take Your Chances!', 'WARNING');
            return;
        }
        handleWillSpend(1, () => updateTracker('fate', trackers.fate + 1));
    };

    const handleChanceSpend = () => {
        if (trackers.fate > 0) {
            if (OBR.isAvailable)
                OBR.notification.show('Cannot use Take Your Chances in the same round as Pushing Fate!', 'WARNING');
            return;
        }
        handleWillSpend(1, () => updateTracker('chances', trackers.chances + 1));
    };

    const openChancesModal = () => {
        if (trackers.chances <= 0) {
            if (OBR.isAvailable)
                OBR.notification.show('No Take Your Chances stacks! Spend Willpower first.', 'WARNING');
            return;
        }
        setChancesModalOpen(true);
    };

    const handleEvadeRoll = () => {
        const state = useCharacterStore.getState();
        const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
        const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

        const dexTotal = Math.max(
            1,
            state.stats[CombatStat.DEX].base +
                state.stats[CombatStat.DEX].rank +
                state.stats[CombatStat.DEX].buff -
                state.stats[CombatStat.DEX].debuff +
                (itemBuffs.stats.dex || 0)
        );
        const evadeTotal =
            state.skills[Skill.EVASION].base + state.skills[Skill.EVASION].buff + (itemBuffs.skills.evasion || 0);
        rollGeneric('Evasion', dexTotal + evadeTotal, 'dex', true, false, true);
    };

    const rollManeuver = () => {
        if (maneuver === 'none') return;

        const state = useCharacterStore.getState();
        const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
        const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

        const getStatistic = (statistic: CombatStat) =>
            Math.max(
                1,
                state.stats[statistic].base +
                    state.stats[statistic].rank +
                    state.stats[statistic].buff -
                    state.stats[statistic].debuff +
                    (itemBuffs.stats[statistic] || 0)
            );
        const getSkill = (skillName: Skill) =>
            state.skills[skillName].base + state.skills[skillName].buff + (itemBuffs.skills[skillName] || 0);
        const getSocialStatistic = (statistic: 'cle') =>
            Math.max(
                1,
                state.socials[statistic].base +
                    state.socials[statistic].rank +
                    state.socials[statistic].buff -
                    state.socials[statistic].debuff +
                    (itemBuffs.stats[statistic] || 0)
            );

        if (maneuver === 'ambush')
            rollGeneric('Ambush', getStatistic(CombatStat.DEX) + getSkill(Skill.STEALTH), 'dex', false, false, true);
        else if (maneuver === 'cover')
            rollGeneric('Cover an Ally', 3 + getStatistic(CombatStat.INS), 'will', false, false, true);
        else if (maneuver === 'grapple')
            rollGeneric('Grapple', getStatistic(CombatStat.STR) + getSkill(Skill.BRAWL), 'str', false, false, true);
        else if (maneuver === 'run')
            rollGeneric('Run Away', getStatistic(CombatStat.DEX) + getSkill(Skill.ATHLETIC), 'dex', false, false, true);
        else if (maneuver === 'stabilize')
            rollGeneric(
                'Stabilize Ally',
                getSocialStatistic('cle') + getSkill(Skill.MEDICINE),
                'cle',
                false,
                false,
                true
            );
        else if (maneuver === 'struggle')
            rollGeneric(
                'Struggle (Accuracy)',
                getStatistic(CombatStat.DEX) + getSkill(Skill.BRAWL),
                'dex',
                false,
                false,
                true
            );
    };

    return (
        <CollapsingSection title="ROUND TRACKER" className="sheet-panel tracker-section">
            <div className="tracker-section__horizontal-wrapper">
                {/* LEFT COLUMN: Actions & Chances */}
                <div className="tracker-section__horizontal-col">
                    <div className="tracker-section__actions-row">
                        <div className="tracker-section__action-group">
                            <span className="tracker-section__action-label">Act</span>
                            <TooltipIcon
                                onClick={() => setTooltipInfo({ title: 'Actions', desc: 'Actions taken this round.' })}
                            />
                            :
                            <NumberSpinner
                                value={trackers.actions}
                                onChange={(value) => updateTracker('actions', Math.max(0, Math.min(5, value)))}
                                min={0}
                                max={5}
                            />
                        </div>

                        <div className="tracker-section__buttons-group">
                            <div className="tracker-section__toggle-group">
                                <button
                                    type="button"
                                    onClick={handleEvadeRoll}
                                    disabled={isMaxed}
                                    style={{ opacity: isMaxed ? 0.5 : 1, cursor: isMaxed ? 'not-allowed' : 'pointer' }}
                                    title={isMaxed ? 'Cannot Evade while Dynamaxed/Gigantamaxed' : ''}
                                    className="action-button action-button--dark tracker-section__toggle-btn"
                                >
                                    🎲 Evade
                                </button>
                                <input
                                    type="checkbox"
                                    checked={trackers.evade}
                                    disabled={isMaxed}
                                    style={{ opacity: isMaxed ? 0.5 : 1, cursor: isMaxed ? 'not-allowed' : 'pointer' }}
                                    title={isMaxed ? 'Cannot Evade while Dynamaxed/Gigantamaxed' : ''}
                                    onChange={(event) => updateTracker('evade', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />
                            </div>

                            <div className="tracker-section__toggle-group">
                                <button
                                    type="button"
                                    onClick={() => setShowClashModal(true)}
                                    disabled={isMaxed}
                                    style={{ opacity: isMaxed ? 0.5 : 1, cursor: isMaxed ? 'not-allowed' : 'pointer' }}
                                    title={isMaxed ? 'Cannot Clash while Dynamaxed/Gigantamaxed' : ''}
                                    className="action-button action-button--dark tracker-section__toggle-btn"
                                >
                                    🎲 Clash
                                </button>
                                <input
                                    type="checkbox"
                                    checked={trackers.clash}
                                    disabled={isMaxed}
                                    style={{ opacity: isMaxed ? 0.5 : 1, cursor: isMaxed ? 'not-allowed' : 'pointer' }}
                                    title={isMaxed ? 'Cannot Clash while Dynamaxed/Gigantamaxed' : ''}
                                    onChange={(event) => updateTracker('clash', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="tracker-section__chances-row">
                        <span className="tracker-section__action-label">Take your Chances</span>
                        <TooltipIcon
                            onClick={() =>
                                setTooltipInfo({
                                    title: 'Take Your Chances',
                                    desc: 'Reroll failed dice. Max uses equals the number of Willpower spent.'
                                })
                            }
                        />
                        :
                        <NumberSpinner
                            value={trackers.chances}
                            onChange={(value) => updateTracker('chances', value)}
                            min={0}
                        />
                        <button
                            type="button"
                            onClick={openChancesModal}
                            className="action-button action-button--dark tracker-section__roll-btn"
                        >
                            🎲 Roll
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Maneuvers & Willpower */}
                <div className="tracker-section__horizontal-col">
                    <div className="tracker-section__maneuver-row">
                        <select
                            value={maneuver}
                            onChange={(event) => setManeuver(event.target.value)}
                            className="tracker-section__maneuver-select"
                        >
                            <option value="none">-- Maneuver --</option>
                            <option value="ambush">Ambush (Dex+Stl)</option>
                            <option value="cover">Cover Ally (Will)</option>
                            <option value="grapple">Grapple (Str+Bwl)</option>
                            <option value="run">Run (Dex+Ath)</option>
                            <option value="stabilize">Stabilize (Cle+Med)</option>
                            <option value="struggle">Struggle (Accuracy)</option>
                        </select>
                        <button
                            type="button"
                            onClick={rollManeuver}
                            className="action-button action-button--dark tracker-section__maneuver-btn"
                        >
                            🎲
                        </button>
                        <button
                            type="button"
                            onClick={resetRound}
                            className="action-button action-button--red tracker-section__reset-btn"
                        >
                            🔄 Reset
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRestModal(true)}
                            className="action-button tracker-section__rest-btn"
                            title="Fully heal HP/Will and clear statuses"
                        >
                            🏕️ Rest
                        </button>
                    </div>

                    <div className="mobile-stack tracker-section__will-row">
                        {painEnabled && (
                            <button
                                type="button"
                                onClick={() =>
                                    handleWillSpend(1, () => updateTracker('ignoredPain', trackers.ignoredPain + 1))
                                }
                                className="action-button action-button--dark tracker-section__will-btn"
                                title="Power Through the Pain: Ignore 1 Pain Penalization for the rest of the Scene (-1 Will)"
                            >
                                Ignore Pain Penalties
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleFateSpend}
                            className="action-button action-button--dark tracker-section__will-btn"
                            title="Pushing Fate: Get 1 automatic un-removable success on a single roll (-1 Will). (Does not stack with Take Your Chances)"
                        >
                            Pushing Fate
                        </button>
                        <button
                            type="button"
                            onClick={handleChanceSpend}
                            className="action-button action-button--dark tracker-section__will-btn"
                            title="Take Your Chances: Re-roll 1 unsuccessful die from all Action Rolls of the Round (-1 Will). (Does not stack with Pushing Fate)"
                        >
                            Take Your Chances
                        </button>
                    </div>
                </div>
            </div>

            {chancesModalOpen && <TakeChancesModal onClose={() => setChancesModalOpen(false)} />}
            {showClashModal && <ClashModal onClose={() => setShowClashModal(false)} />}
            {showRestModal && <RestModal onClose={() => setShowRestModal(false)} />}

            {tooltipInfo && (
                <div className="tracker-modal__overlay">
                    <div className="tracker-modal__content">
                        <h3 className="tracker-modal__title">{tooltipInfo.title}</h3>
                        <p className="tracker-modal__description">{tooltipInfo.desc}</p>
                        <div className="tracker-modal__actions tracker-modal__actions--center">
                            <button
                                type="button"
                                className="action-button action-button--dark tracker-modal__btn-cancel"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsingSection>
    );
}
