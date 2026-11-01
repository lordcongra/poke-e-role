import { useState, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, Skill } from '../../types/enums';
import {
    rollGeneric,
    parseCombatTags,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal,
    getActiveBoostSources,
    type BoostTrackerSource
} from '../../utils/combat/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TooltipIcon } from '../ui/TooltipIcon';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TakeChancesModal } from '../modals/combat/TakeChancesModal';
import { ClashModal } from '../modals/combat/ClashModal';
import { ManeuversModal } from '../modals/combat/ManeuversModal';
import { RestModal } from '../modals/combat/RestModal';
import { Dices, RotateCcw, Swords, Tent, XCircle } from 'lucide-react';
import { AbilityTrackerControl } from '../abilities/AbilityTrackerControl';
import { ActiveFieldEffectsRow } from './ActiveFieldEffectsRow';
import { TrackerBoostsList } from './TrackerBoostsList';
import { TrackerConditionsList } from './TrackerConditionsList';
import { buildTrackerConditions } from './trackerConditionUtils';
import { refreshAndCleanAuraAssociations } from './trackerAuraUtils';
import { RoundEndTriggerModal } from '../modals/character/RoundEndTriggerModal';
import { findRoundEndTriggers, type RoundEndTrigger } from '../modals/character/roundEndTriggerUtils';
import './TrackerSection.css';

export function TrackerSection() {
    const trackers = useCharacterStore((state) => state.trackers);
    const updateTracker = useCharacterStore((state) => state.updateTracker);
    const resetRound = useCharacterStore((state) => state.resetRound);
    const clearActiveCombatBoost = useCharacterStore((state) => state.clearActiveCombatBoost);

    const activeTransformation = useCharacterStore((state) => state.identity.activeTransformation);
    const isMaxed = activeTransformation === 'Dynamax' || activeTransformation === 'Gigantamax';

    const painEnabled =
        String(useCharacterStore((state) => state.identity.pain || 'Enabled')).toLowerCase() === 'enabled';
    const will = useCharacterStore((state) => state.will);
    const updateWill = useCharacterStore((state) => state.updateWill);

    const passives = useCharacterStore((state) => state.passives);
    const inventory = useCharacterStore((state) => state.inventory);

    // Detect active boost sources across passives and inventory items
    const boostSources = getActiveBoostSources(passives, inventory, trackers.boostLevels || {});

    const handleStepSourceBoost = (source: BoostTrackerSource, delta: number) => {
        const nextLevel = Math.max(0, Math.min(source.maxBoost, source.currentLevel + delta));
        const updated = {
            ...(trackers.boostLevels || {}),
            [source.id]: nextLevel
        };
        updateTracker('boostLevels', updated);
    };

    const handleCycleSourceBoost = (source: BoostTrackerSource) => {
        if (source.maxBoost <= 1) {
            const nextLevel = source.currentLevel > 0 ? 0 : 1;
            const updated = {
                ...(trackers.boostLevels || {}),
                [source.id]: nextLevel
            };
            updateTracker('boostLevels', updated);
        } else {
            const nextLevel = source.currentLevel >= source.maxBoost ? 0 : source.currentLevel + 1;
            const updated = {
                ...(trackers.boostLevels || {}),
                [source.id]: nextLevel
            };
            updateTracker('boostLevels', updated);
        }
    };

    const [showManeuversModal, setShowManeuversModal] = useState(false);
    const [showClashModal, setShowClashModal] = useState(false);
    const [showRestModal, setShowRestModal] = useState(false);
    const [chancesModalOpen, setChancesModalOpen] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const [pendingTriggers, setPendingTriggers] = useState<RoundEndTrigger[] | null>(null);

    const handleResetRoundClick = () => {
        const triggers = findRoundEndTriggers(useCharacterStore.getState());
        if (triggers.length > 0) {
            setPendingTriggers(triggers);
        } else {
            resetRound(true);
        }
    };

    const handleConfirmTriggers = (confirmed: RoundEndTrigger[]) => {
        const store = useCharacterStore.getState();

        let totalHpDamage = 0;
        let totalHpHeal = 0;
        let totalWillLoss = 0;
        let totalWillRestore = 0;

        confirmed.forEach((t) => {
            if (t.type === 'damageHp') totalHpDamage += t.amount;
            else if (t.type === 'healHp') totalHpHeal += t.amount;
            else if (t.type === 'reduceWill') totalWillLoss += t.amount;
            else if (t.type === 'restoreWill') totalWillRestore += t.amount;
        });

        // 1. Process all damage triggers first (draining temporaryHitPoints completely before hpCurr), then healing up to hpMax
        if (totalHpDamage > 0 || totalHpHeal > 0) {
            let curHp = store.health.hpCurr;
            let tempHp = store.health.temporaryHitPoints || 0;
            const maxHp = store.health.hpMax;

            if (totalHpDamage > 0) {
                let dmgRemaining = totalHpDamage;
                if (tempHp > 0) {
                    const deduct = Math.min(tempHp, dmgRemaining);
                    tempHp -= deduct;
                    dmgRemaining -= deduct;
                }
                if (dmgRemaining > 0) {
                    curHp = Math.max(0, curHp - dmgRemaining);
                }
            }

            if (totalHpHeal > 0) {
                curHp = Math.min(maxHp, curHp + totalHpHeal);
            }

            if (tempHp !== (store.health.temporaryHitPoints || 0)) {
                store.updateHealth('temporaryHitPoints', tempHp);
            }
            if (curHp !== store.health.hpCurr) {
                store.updateHealth('hpCurr', curHp);
            }
        }

        // 2. Process all reduceWill triggers first (draining temporaryWill completely before willCurr), then restoreWill up to willMax
        if (totalWillLoss > 0 || totalWillRestore > 0) {
            let curWill = store.will.willCurr;
            let tempWill = store.will.temporaryWill || 0;
            const maxWill = store.will.willMax;

            if (totalWillLoss > 0) {
                let willLossRemaining = totalWillLoss;
                if (tempWill > 0) {
                    const deduct = Math.min(tempWill, willLossRemaining);
                    tempWill -= deduct;
                    willLossRemaining -= deduct;
                }
                if (willLossRemaining > 0) {
                    curWill = Math.max(0, curWill - willLossRemaining);
                }
            }

            if (totalWillRestore > 0) {
                curWill = Math.min(maxWill, curWill + totalWillRestore);
            }

            if (tempWill !== (store.will.temporaryWill || 0)) {
                store.updateWill('temporaryWill', tempWill);
            }
            if (curWill !== store.will.willCurr) {
                store.updateWill('willCurr', curWill);
            }
        }

        if (confirmed.some((t) => t.type === 'resetIgnoredPain')) {
            store.updateTracker('ignoredPain', 0);
        }

        setPendingTriggers(null);
        resetRound(true);
    };

    const handleSkipTriggers = () => {
        setPendingTriggers(null);
        resetRound(true);
    };

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
        const itemBuffs = parseCombatTags(
            state.inventory,
            state.extraCategories,
            undefined,
            abilityText,
            state.passives
        );

        const dexTotal = calculateStatTotal(CombatStat.DEX, state, itemBuffs);
        const evadeTotal = calculateSkillTotal(Skill.EVASION, state, itemBuffs);

        rollGeneric('Evasion', dexTotal + evadeTotal, 'dex', true, false, true, true);
    };

    const currentState = useCharacterStore.getState();
    const abilityTxt = getAbilityText(currentState.identity.ability, currentState.roomCustomAbilities);
    const parsedGlobals = parseCombatTags(
        currentState.inventory,
        currentState.extraCategories,
        undefined,
        abilityTxt,
        passives
    );

    const disableReactions = isMaxed || parsedGlobals.noReactions;

    const [, setRefreshNonce] = useState(0);

    const handleRefreshConditions = useCallback(() => {
        refreshAndCleanAuraAssociations(currentState, () => {
            setRefreshNonce((n) => n + 1);
        });
    }, [currentState]);

    const conditions = buildTrackerConditions({
        state: currentState,
        boostSources,
        updateTracker,
        clearActiveCombatBoost,
        onRefresh: () => setRefreshNonce((n) => n + 1)
    });

    return (
        <CollapsingSection title="ROUND TRACKER" className="sheet-panel tracker-section">
            <div className="tracker-section__horizontal-wrapper">
                <div className="tracker-section__horizontal-col">
                    <div className="tracker-section__row-space-between">
                        <div className="tracker-section__buttons-group">
                            <div className="tracker-section__toggle-group">
                                <button
                                    type="button"
                                    onClick={handleEvadeRoll}
                                    disabled={disableReactions}
                                    style={{
                                        opacity: disableReactions ? 0.5 : 1,
                                        cursor: disableReactions ? 'not-allowed' : 'pointer'
                                    }}
                                    title={
                                        disableReactions ? 'Reactions disabled by current Tags or Transformations!' : ''
                                    }
                                    className="action-button action-button--dark tracker-section__toggle-btn"
                                >
                                    <Dices size={14} style={{ marginRight: '4px' }} /> Evade
                                </button>
                                <input
                                    type="checkbox"
                                    checked={trackers.evade}
                                    disabled={disableReactions}
                                    style={{
                                        opacity: disableReactions ? 0.5 : 1,
                                        cursor: disableReactions ? 'not-allowed' : 'pointer'
                                    }}
                                    title={
                                        disableReactions ? 'Reactions disabled by current Tags or Transformations!' : ''
                                    }
                                    onChange={(event) => updateTracker('evade', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />
                            </div>

                            <div className="tracker-section__toggle-group">
                                <button
                                    type="button"
                                    onClick={() => setShowClashModal(true)}
                                    disabled={disableReactions}
                                    style={{
                                        opacity: disableReactions ? 0.5 : 1,
                                        cursor: disableReactions ? 'not-allowed' : 'pointer'
                                    }}
                                    title={
                                        disableReactions ? 'Reactions disabled by current Tags or Transformations!' : ''
                                    }
                                    className="action-button action-button--dark tracker-section__toggle-btn"
                                >
                                    <Dices size={14} style={{ marginRight: '4px' }} /> Clash
                                </button>
                                <input
                                    type="checkbox"
                                    checked={trackers.clash}
                                    disabled={disableReactions}
                                    style={{
                                        opacity: disableReactions ? 0.5 : 1,
                                        cursor: disableReactions ? 'not-allowed' : 'pointer'
                                    }}
                                    title={
                                        disableReactions ? 'Reactions disabled by current Tags or Transformations!' : ''
                                    }
                                    onChange={(event) => updateTracker('clash', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />
                            </div>
                        </div>

                        <div className="tracker-section__action-group tracker-section__action-group--right">
                            <span className="tracker-section__action-label text-label">Actions</span>
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

                    <div className="tracker-section__row-space-between">
                        <button
                            type="button"
                            onClick={() => setShowManeuversModal(true)}
                            className="action-button action-button--dark tracker-section__maneuvers-btn"
                        >
                            <Swords size={14} style={{ marginRight: '4px' }} /> Maneuvers
                        </button>

                        <div className="tracker-section__first-hit-group">
                            <span className="tracker-section__first-hit-label text-label">
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
                            <label className="tracker-section__first-hit-check text-label">
                                <input
                                    type="checkbox"
                                    checked={trackers.firstHitAcc}
                                    onChange={(event) => updateTracker('firstHitAcc', event.target.checked)}
                                    className="sheet-save tracker-section__checkbox"
                                />{' '}
                                Acc
                            </label>
                            <label className="tracker-section__first-hit-check text-label">
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

                    <AbilityTrackerControl />

                    <div className="tracker-section__reset-rest-row">
                        <button
                            type="button"
                            onClick={handleResetRoundClick}
                            className="action-button action-button--theme tracker-section__reset-btn"
                        >
                            <RotateCcw size={14} /> Reset
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRestModal(true)}
                            className="action-button action-button--secondary tracker-section__rest-btn"
                            title="Fully heal HP/Will and clear statuses"
                        >
                            <Tent size={14} /> Rest
                        </button>
                    </div>
                </div>

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
                        <span className="tracker-section__action-label text-label">Take your Chances</span>
                        <TooltipIcon
                            onClick={() =>
                                setTooltipInfo({
                                    title: 'Take Your Chances',
                                    desc: 'Reroll failed dice. Max uses equals the number of Willpower spent.'
                                })
                            }
                        />
                        <span className="text-label">:</span>
                        <NumberSpinner
                            value={trackers.chances}
                            onChange={(value) => {
                                if (value > 0 && trackers.fate > 0) {
                                    if (OBR.isAvailable)
                                        OBR.notification.show(
                                            'Cannot use Take Your Chances in the same round as Pushing Fate!',
                                            'WARNING'
                                        );
                                    return;
                                }
                                updateTracker('chances', value);
                            }}
                            min={0}
                        />
                        <button
                            type="button"
                            onClick={openChancesModal}
                            className="action-button action-button--dark tracker-section__roll-btn"
                        >
                            <Dices size={14} /> Roll
                        </button>
                    </div>

                    <TrackerBoostsList
                        boostSources={boostSources}
                        onStepSourceBoost={handleStepSourceBoost}
                        onCycleSourceBoost={handleCycleSourceBoost}
                        onShowTooltip={setTooltipInfo}
                    />

                    <ActiveFieldEffectsRow />
                    <TrackerConditionsList conditions={conditions} onRefresh={handleRefreshConditions} />
                </div>
            </div>

            {chancesModalOpen && <TakeChancesModal onClose={() => setChancesModalOpen(false)} />}
            {showClashModal && <ClashModal onClose={() => setShowClashModal(false)} />}
            {showRestModal && <RestModal onClose={() => setShowRestModal(false)} />}
            {showManeuversModal && <ManeuversModal onClose={() => setShowManeuversModal(false)} />}

            {pendingTriggers && (
                <RoundEndTriggerModal
                    isOpen={true}
                    triggers={pendingTriggers}
                    onConfirm={handleConfirmTriggers}
                    onSkip={handleSkipTriggers}
                    onClose={() => setPendingTriggers(null)}
                />
            )}

            {tooltipInfo && (
                <div className="tracker-modal__overlay">
                    <div className="tracker-modal__content">
                        <h3 className="tracker-modal__title text-title-primary">{tooltipInfo.title}</h3>
                        <p className="tracker-modal__description text-subtext">{tooltipInfo.desc}</p>
                        <div className="tracker-modal__actions tracker-modal__actions--center">
                            <button
                                type="button"
                                className="action-button action-button--dark tracker-modal__btn-cancel"
                                onClick={() => setTooltipInfo(null)}
                            >
                                <XCircle size={16} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsingSection>
    );
}
