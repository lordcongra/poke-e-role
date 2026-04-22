import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { NumberSpinner } from '../ui/NumberSpinner';
import { CombatStat, Skill } from '../../types/enums';
import { rollGeneric, parseCombatTags, getAbilityText, getStatusPenalties } from '../../utils/combatUtils';
import { STATUS_COLORS } from '../../data/constants';
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
    const health = useCharacterStore((state) => state.health);
    const updateWill = useCharacterStore((state) => state.updateWill);

    const stats = useCharacterStore((state) => state.stats);
    const derived = useCharacterStore((state) => state.derived);
    const activeStatuses = useCharacterStore((state) => state.statuses);

    const [maneuver, setManeuver] = useState('none');
    const [showClashModal, setShowClashModal] = useState(false);
    const [showRestModal, setShowRestModal] = useState(false);
    const [chancesModalOpen, setChancesModalOpen] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    const handleWillSpend = (cost: number, action: () => void) => {
        const totalWill = will.willCurr + (will.temporaryWill || 0);

        if (totalWill >= cost) {
            let remainingCost = cost;
            let newTemp = will.temporaryWill || 0;
            let newCurr = will.willCurr;

            if (newTemp > 0) {
                const deduct = Math.min(newTemp, remainingCost);
                newTemp -= deduct;
                remainingCost -= deduct;
                updateWill('temporaryWill', newTemp);
            }

            if (remainingCost > 0) {
                newCurr -= remainingCost;
                updateWill('willCurr', newCurr);
            }

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

    // --- DERIVE ACTIVE CONDITIONS ---
    const conditions: Array<{ id: string; label: string; bg: string; text: string }> = [];

    // 1. Pain Penalty
    if (painEnabled) {
        const hpCurr = health.hpCurr;
        const hpMax = Math.max(1, health.hpMax);
        let rawPenalty = 0;

        if (hpCurr <= 1) rawPenalty = 3;
        else if (hpCurr <= Math.floor(hpMax / 2)) rawPenalty = 1;

        const finalPenalty = Math.max(0, rawPenalty - trackers.ignoredPain);
        if (finalPenalty > 0) {
            conditions.push({ id: 'pain', label: `Pain (-${finalPenalty} Succ)`, bg: '#c62828', text: '#fff' });
        }
    }

    // 2. Status Effects
    const statusPenalties = getStatusPenalties(useCharacterStore.getState());
    activeStatuses.forEach((status) => {
        if (status.name !== 'Healthy') {
            const name = status.name === 'Custom...' ? status.customName || 'Custom' : status.name;
            let label = name;

            // Inject mechanical hints for the two statuses that strictly deduct math
            if (status.name === 'Paralysis' && statusPenalties.paralysisDexterityPenalty < 0) {
                label = `Paralysis (${statusPenalties.paralysisDexterityPenalty} Dex)`;
            } else if (status.name === 'Confusion' && statusPenalties.confusionPenalty < 0) {
                label = `Confusion (${statusPenalties.confusionPenalty} Succ)`;
            }

            const colors = STATUS_COLORS[status.name] || { bg: '#9C27B0', text: '#fff' };
            conditions.push({ id: status.id, label, bg: colors.bg, text: colors.text });
        }
    });

    // 3. Stat Buffs & Debuffs
    const addStatCondition = (label: string, buff: number, debuff: number) => {
        if (buff > 0) conditions.push({ id: `buff-${label}`, label: `${label} +${buff}`, bg: '#1976d2', text: '#fff' });
        if (debuff > 0)
            conditions.push({ id: `debuff-${label}`, label: `${label} -${debuff}`, bg: '#d32f2f', text: '#fff' });
    };

    addStatCondition('STR', stats[CombatStat.STR].buff, stats[CombatStat.STR].debuff);
    addStatCondition('DEX', stats[CombatStat.DEX].buff, stats[CombatStat.DEX].debuff);
    addStatCondition('VIT', stats[CombatStat.VIT].buff, stats[CombatStat.VIT].debuff);
    addStatCondition('SPE', stats[CombatStat.SPE].buff, stats[CombatStat.SPE].debuff);
    addStatCondition('INS', stats[CombatStat.INS].buff, stats[CombatStat.INS].debuff);
    addStatCondition('DEF', derived.defBuff, derived.defDebuff);
    addStatCondition('S.DEF', derived.sdefBuff, derived.sdefDebuff);

    return (
        <CollapsingSection title="ROUND TRACKER" className="sheet-panel tracker-section">
            <div className="tracker-section__horizontal-wrapper">
                {/* LEFT COLUMN: Turn Economy (Evade, Clash, Actions, Maneuvers, Reset) */}
                <div className="tracker-section__horizontal-col">
                    {/* Row 1: Evade & Clash (Left) | Actions (Right) */}
                    <div className="tracker-section__row-space-between">
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

                        <div className="tracker-section__action-group tracker-section__action-group--right">
                            <span className="tracker-section__action-label">Actions</span>
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
                    </div>

                    {/* Row 2: Maneuvers (Left) | 1st Hit (Right) */}
                    <div className="tracker-section__row-space-between">
                        <div className="tracker-section__maneuver-subrow">
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
                        </div>

                        <div className="tracker-section__first-hit-group">
                            <span className="tracker-section__first-hit-label">
                                1st Hit
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: '1st Hit Modifiers',
                                            desc: "1st Hit modifiers are primarily used for calculating bonus damage upon Terastallizing. The Accuracy toggle exists for Homebrew items. If you aren't using these mechanics, you can safely ignore these checkboxes!"
                                        })
                                    }
                                />
                                :
                            </span>
                            <label className="tracker-section__first-hit-check">
                                <input
                                    type="checkbox"
                                    checked={trackers.firstHitAcc}
                                    onChange={(event) => updateTracker('firstHitAcc', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />{' '}
                                Acc
                            </label>
                            <label className="tracker-section__first-hit-check">
                                <input
                                    type="checkbox"
                                    checked={trackers.firstHitDmg}
                                    onChange={(event) => updateTracker('firstHitDmg', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />{' '}
                                Dmg
                            </label>
                        </div>
                    </div>

                    {/* Row 3: Reset & Rest */}
                    <div className="tracker-section__reset-rest-row">
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
                </div>

                {/* RIGHT COLUMN: Meta Currency & Conditions */}
                <div className="tracker-section__horizontal-col tracker-section__horizontal-col--right">
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

                    <div className="tracker-section__conditions-container">
                        <span className="tracker-section__conditions-label">Conditions:</span>
                        <div className="tracker-section__conditions-list">
                            {conditions.length === 0 ? (
                                <span className="tracker-section__conditions-empty">None</span>
                            ) : (
                                conditions.map((c) => (
                                    <span
                                        key={c.id}
                                        className="tracker-section__condition-pill"
                                        style={{ background: c.bg, color: c.text }}
                                    >
                                        {c.label}
                                    </span>
                                ))
                            )}
                        </div>
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
