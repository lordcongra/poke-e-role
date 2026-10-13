import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import {
    rollGeneric,
    parseCombatTags,
    getAbilityText,
    getStatusPenalties,
    calculateStatTotal,
    calculateSkillTotal,
    getActiveBoostSources,
    type BoostTrackerSource
} from '../../utils/combat/combatUtils';
import { STATUS_COLORS } from '../../data/constants';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TooltipIcon } from '../ui/TooltipIcon';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TakeChancesModal } from '../modals/combat/TakeChancesModal';
import { ClashModal } from '../modals/combat/ClashModal';
import { RestModal } from '../modals/combat/RestModal';
import { Dices, RotateCcw, Tent, XCircle } from 'lucide-react';
import { AbilityTrackerControl } from '../abilities/AbilityTrackerControl';
import { getAbilityBenefitSummary } from '../../data/abilities/knownAbilities';
import { ActiveFieldEffectsRow } from './ActiveFieldEffectsRow';
import { TrackerBoostsList } from './TrackerBoostsList';
import { TrackerConditionsList } from './TrackerConditionsList';
import { RoundEndTriggerModal } from '../modals/character/RoundEndTriggerModal';
import { findRoundEndTriggers, type RoundEndTrigger } from '../modals/character/roundEndTriggerUtils';
import './TrackerSection.css';

export function TrackerSection() {
    const trackers = useCharacterStore((state) => state.trackers);
    const updateTracker = useCharacterStore((state) => state.updateTracker);
    const resetRound = useCharacterStore((state) => state.resetRound);

    const abilityName = useCharacterStore((state) => state.identity.ability);
    const abilityActive = useCharacterStore((state) => state.identity.abilityActive ?? true);
    const abilityBoostActive = useCharacterStore((state) => state.identity.abilityBoostActive ?? false);
    const abilityBoostLevel = useCharacterStore(
        (state) => state.identity.abilityBoostLevel ?? (state.identity.abilityBoostActive ? 1 : 0)
    );
    const abilityTags = useCharacterStore((state) => state.identity.abilityTags || '');
    const rank = useCharacterStore((state) => state.identity.rank);

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
    const customStatuses = useCharacterStore((state) => state.roomCustomStatuses);
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

    const [maneuver, setManeuver] = useState('none');
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

    const rollManeuver = () => {
        if (maneuver === 'none') return;

        const state = useCharacterStore.getState();
        const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
        const itemBuffs = parseCombatTags(
            state.inventory,
            state.extraCategories,
            undefined,
            abilityText,
            state.passives
        );

        if (maneuver === 'ambush')
            rollGeneric(
                'Ambush',
                calculateStatTotal(CombatStat.DEX, state, itemBuffs) +
                    calculateSkillTotal(Skill.STEALTH, state, itemBuffs),
                'dex',
                false,
                false,
                true,
                true
            );
        else if (maneuver === 'cover')
            rollGeneric(
                'Cover an Ally',
                calculateStatTotal('will', state, itemBuffs),
                'will',
                false,
                false,
                true,
                false
            );
        else if (maneuver === 'grapple')
            rollGeneric(
                'Grapple',
                calculateStatTotal(CombatStat.STR, state, itemBuffs) +
                    calculateSkillTotal(Skill.BRAWL, state, itemBuffs),
                'str',
                false,
                false,
                true,
                true
            );
        else if (maneuver === 'run')
            rollGeneric(
                'Run Away',
                calculateStatTotal(CombatStat.DEX, state, itemBuffs) +
                    calculateSkillTotal(Skill.ATHLETIC, state, itemBuffs),
                'dex',
                false,
                false,
                true,
                true
            );
        else if (maneuver === 'stabilize')
            rollGeneric(
                'Stabilize Ally',
                calculateStatTotal(SocialStat.CLE, state, itemBuffs) +
                    calculateSkillTotal(Skill.MEDICINE, state, itemBuffs),
                'cle',
                false,
                false,
                true,
                true
            );
        else if (maneuver === 'struggle')
            rollGeneric(
                'Struggle (Accuracy)',
                calculateStatTotal(CombatStat.DEX, state, itemBuffs) +
                    calculateSkillTotal(Skill.BRAWL, state, itemBuffs),
                'dex',
                false,
                false,
                true,
                true
            );
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

    const conditions: Array<{ id: string; label: string; bg: string; text: string }> = [];

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

    const statusPenalties = getStatusPenalties(useCharacterStore.getState());
    activeStatuses.forEach((status) => {
        if (status.name !== 'Healthy') {
            const customStatusData = customStatuses.find((s) => s.name === status.name || s.name === status.customName);

            if (customStatusData) {
                let label = customStatusData.shorthand || customStatusData.name;

                const parsedEffects = parseCombatTags([], [], undefined, customStatusData.effects);
                const penalties: string[] = [];
                Object.entries(parsedEffects.stats).forEach(([stat, val]) => {
                    if (val !== 0) penalties.push(`${val > 0 ? '+' : ''}${val} ${stat.toUpperCase()}`);
                });

                if (penalties.length > 0) label += ` (${penalties.join(', ')})`;

                conditions.push({ id: status.id, label, bg: customStatusData.color, text: customStatusData.textColor });
            } else {
                const name = status.name === 'Custom...' ? status.customName || 'Custom' : status.name;
                let label = name;

                if (status.name === 'Paralysis' && statusPenalties.paralysisDexterityPenalty < 0) {
                    label = `Paralysis (${statusPenalties.paralysisDexterityPenalty} Dex)`;
                } else if (status.name === 'Confusion' && statusPenalties.confusionPenalty < 0) {
                    label = `Confusion (${statusPenalties.confusionPenalty} Succ)`;
                }

                const colors = STATUS_COLORS[status.name] || { bg: '#9C27B0', text: '#fff' };
                conditions.push({ id: status.id, label, bg: colors.bg, text: colors.text });
            }
        }
    });

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

    if (abilityName && abilityActive) {
        const hpCurr = Number(health.hpCurr) || 0;
        const hpMax = Math.max(1, Number(health.hpMax) || 1);
        const isHalfHp = hpCurr <= Math.floor(hpMax / 2);
        const benefit = getAbilityBenefitSummary(
            abilityName,
            abilityTags,
            rank,
            isHalfHp,
            abilityBoostActive,
            abilityBoostLevel
        );
        const abilityLabel = benefit ? `Ability: ${abilityName} (${benefit})` : `Ability: ${abilityName}`;
        conditions.push({ id: 'active-ability', label: abilityLabel, bg: '#2563eb', text: '#fff' });
    }

    boostSources.forEach((source) => {
        if (source.currentLevel > 0) {
            const badgeLabel =
                source.maxBoost > 1 ? `${source.label}: +${source.currentLevel}` : `${source.label}: Active`;
            conditions.push({
                id: `boost-${source.id}`,
                label: badgeLabel,
                bg: '#f59e0b',
                text: '#000000'
            });
        }
    });

    passives?.forEach((passive) => {
        if (passive.active && passive.showInConditions) {
            const rawTags = (passive.desc || '').match(/\[.*?\]/g);
            let label = `Passive: ${passive.name || 'Passive'}`;
            if (rawTags && rawTags.length > 0) {
                const cleanedTags = rawTags.map((t) => t.replace(/[\[\]]/g, '').trim()).filter(Boolean);
                if (cleanedTags.length > 0 && !passive.name.toLowerCase().includes(cleanedTags[0].toLowerCase())) {
                    label = `Passive: ${passive.name || 'Passive'} (${cleanedTags.join(', ')})`;
                }
            }
            conditions.push({
                id: `passive-${passive.id}`,
                label,
                bg: '#0d9488',
                text: '#fff'
            });
        }
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
                        <div className="tracker-section__maneuver-subrow">
                            <select
                                value={maneuver}
                                onChange={(event) => setManeuver(event.target.value)}
                                className="tracker-section__maneuver-select text-label"
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
                                <Dices size={16} />
                            </button>
                        </div>

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
                            onChange={(value) => updateTracker('chances', value)}
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
                    <TrackerConditionsList conditions={conditions} />
                </div>
            </div>

            {chancesModalOpen && <TakeChancesModal onClose={() => setChancesModalOpen(false)} />}
            {showClashModal && <ClashModal onClose={() => setShowClashModal(false)} />}
            {showRestModal && <RestModal onClose={() => setShowRestModal(false)} />}

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
