import { useState } from 'react';
import { Zap, Sliders, RotateCcw, Users } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getAbilityBenefitSummary, getMaxBoost } from '../../data/abilities/knownAbilities';
import { getAbilityTargetStance } from '../../utils/combat/abilityTargetingUtils';
import { getMaxTargetsForRank } from '../modals/combat/targetingModalUtils';
import { AbilityMenuModal } from './AbilityMenuModal';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import { PressureDrainModal } from '../modals/combat/PressureDrainModal';
import { CuriousMedicineModal } from '../modals/combat/CuriousMedicineModal';
import { AbilityTargetSelectorModal } from '../modals/combat/AbilityTargetSelectorModal';
import './AbilityTrackerControl.css';

const EMPTY_TARGET_IDS: string[] = [];

export function AbilityTrackerControl() {
    const ability = useCharacterStore((state) => state.identity.ability);
    const abilityActive = useCharacterStore((state) => state.identity.abilityActive ?? true);
    const abilityBoostActive = useCharacterStore((state) => state.identity.abilityBoostActive ?? false);
    const abilityBoostLevel = useCharacterStore(
        (state) => state.identity.abilityBoostLevel ?? (state.identity.abilityBoostActive ? 1 : 0)
    );
    const abilityTags = useCharacterStore((state) => state.identity.abilityTags || '');
    const abilityTargetIds = useCharacterStore((state) => state.identity.abilityTargetIds) ?? EMPTY_TARGET_IDS;
    const rank = useCharacterStore((state) => state.identity.rank);
    const hpCurr = useCharacterStore((state) => state.health.hpCurr);
    const hpMax = useCharacterStore((state) => state.health.hpMax);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [tagBuilderInitialTag, setTagBuilderInitialTag] = useState<string | undefined>(undefined);
    const [isTagBuilderOpen, setIsTagBuilderOpen] = useState(false);
    const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);
    const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

    if (!ability) return null;

    const cleanAbility = (ability || '').toLowerCase().trim();
    const isPressure = cleanAbility === 'pressure';
    const isCuriousMedicine = cleanAbility === 'curious medicine';
    const stance = getAbilityTargetStance(ability);
    const hasTargetStance = stance !== 'none';
    const maxTargets = getMaxTargetsForRank(rank);

    const isHalfHp = (hpCurr || 0) <= Math.floor(Math.max(1, hpMax || 1) / 2);
    const maxBoost = getMaxBoost(ability, abilityTags);
    const hasBoostTag = /@\s*(?:stacking\s+)?boost|@\s*stacks/i.test(abilityTags) || maxBoost > 1;
    const effectiveBoostLevel = abilityBoostActive ? Math.max(1, abilityBoostLevel) : 0;
    const benefit = getAbilityBenefitSummary(
        ability,
        abilityTags,
        rank,
        isHalfHp,
        abilityBoostActive,
        effectiveBoostLevel
    );

    const handleCycleBoost = () => {
        if (maxBoost <= 1) {
            setIdentity('abilityBoostActive', !abilityBoostActive);
        } else {
            const nextLevel = effectiveBoostLevel >= maxBoost ? 0 : effectiveBoostLevel + 1;
            setIdentity('abilityBoostLevel', nextLevel);
        }
    };

    const handleStepBoost = (delta: number) => {
        const nextLevel = Math.max(0, Math.min(maxBoost, effectiveBoostLevel + delta));
        setIdentity('abilityBoostLevel', nextLevel);
    };

    const boostTooltip =
        effectiveBoostLevel > 0
            ? `${ability}: ${benefit || `+${effectiveBoostLevel} Boost`} (Level ${effectiveBoostLevel}/${maxBoost} - click badge to cycle, or use +/-)`
            : `${ability}: Boost is OFF (Click badge or use + to activate)`;

    const singleBoostTooltip = abilityBoostActive
        ? `${ability}: ${benefit || 'Boost Active'} (Click to turn off)`
        : `${ability}: Boost is OFF (Click to turn on)`;

    return (
        <>
            <div className={`ability-tracker ${abilityActive ? 'ability-tracker--active' : ''}`}>
                <label className="ability-tracker__toggle-wrap text-label">
                    <input
                        type="checkbox"
                        checked={abilityActive}
                        onChange={(e) => setIdentity('abilityActive', e.target.checked)}
                        className="ability-tracker__checkbox"
                        title={
                            abilityActive
                                ? 'Ability is active (click to turn off)'
                                : 'Ability is inactive (click to turn on)'
                        }
                    />
                    <Zap size={14} className="ability-tracker__icon" />
                    <span className="ability-tracker__name" title={ability}>
                        {ability}
                    </span>
                </label>

                <div className="ability-tracker__controls">
                    {abilityActive &&
                        hasBoostTag &&
                        (maxBoost > 1 ? (
                            <div className="ability-tracker__stepper" title={boostTooltip}>
                                <button
                                    type="button"
                                    disabled={effectiveBoostLevel <= 0}
                                    onClick={() => handleStepBoost(-1)}
                                    className="action-button action-button--dark ability-tracker__step-btn"
                                    title="Decrease boost stack (-1)"
                                    aria-label="Decrease boost stack"
                                >
                                    -
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCycleBoost}
                                    className={`action-button ${
                                        effectiveBoostLevel > 0 ? 'action-button--theme' : 'action-button--dark'
                                    } ability-tracker__step-badge`}
                                    title={boostTooltip}
                                >
                                    {effectiveBoostLevel > 0 ? `Boost +${effectiveBoostLevel}` : 'Boost OFF'}
                                </button>
                                <button
                                    type="button"
                                    disabled={effectiveBoostLevel >= maxBoost}
                                    onClick={() => handleStepBoost(1)}
                                    className="action-button action-button--dark ability-tracker__step-btn"
                                    title="Increase boost stack (+1)"
                                    aria-label="Increase boost stack"
                                >
                                    +
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIdentity('abilityBoostActive', !abilityBoostActive)}
                                className={`action-button ${
                                    abilityBoostActive ? 'action-button--theme' : 'action-button--dark'
                                } ability-tracker__boost-toggle-btn`}
                                title={singleBoostTooltip}
                            >
                                Boost {abilityBoostActive ? 'ON' : 'OFF'}
                            </button>
                        ))}

                    {abilityActive && benefit && !hasBoostTag && (
                        <span className="ability-tracker__benefit" title={benefit}>
                            {benefit}
                        </span>
                    )}

                    {abilityActive && isPressure && (
                        <button
                            type="button"
                            onClick={() => setIsPressureModalOpen(true)}
                            className="action-button action-button--theme"
                            style={{ padding: '2px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Trigger Pressure: Drain opposing Will"
                        >
                            <Zap size={11} /> Drain Will
                        </button>
                    )}

                    {abilityActive && isCuriousMedicine && (
                        <button
                            type="button"
                            onClick={() => setIsMedicineModalOpen(true)}
                            className="action-button action-button--theme"
                            style={{ padding: '2px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Trigger Curious Medicine: Reset allies' buffs & debuffs"
                        >
                            <RotateCcw size={11} /> Reset Allies
                        </button>
                    )}

                    {abilityActive && hasTargetStance && (
                        <button
                            type="button"
                            onClick={() => setIsTargetModalOpen(true)}
                            className="action-button action-button--theme"
                            style={{ padding: '2px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title={`Configure Ability Targets (${abilityTargetIds.length}/${maxTargets} selected)`}
                        >
                            <Users size={11} /> Targets ({abilityTargetIds.length}/{maxTargets})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(true)}
                        className="action-button action-button--dark ability-tracker__btn-menu"
                        title="Open Ability Details and Settings"
                        aria-label="Open Ability Details"
                    >
                        <Sliders size={13} />
                    </button>
                </div>
            </div>

            {isPressureModalOpen && (
                <PressureDrainModal
                    isOpen={isPressureModalOpen}
                    onClose={() => setIsPressureModalOpen(false)}
                />
            )}

            {isMedicineModalOpen && (
                <CuriousMedicineModal
                    isOpen={isMedicineModalOpen}
                    onClose={() => setIsMedicineModalOpen(false)}
                />
            )}

            {isTargetModalOpen && (
                <AbilityTargetSelectorModal
                    isOpen={isTargetModalOpen}
                    onClose={() => setIsTargetModalOpen(false)}
                    abilityName={ability}
                    sourceRank={rank}
                />
            )}

            {isMenuOpen && (
                <AbilityMenuModal
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    onOpenTagBuilder={(initTag) => {
                        setTagBuilderInitialTag(initTag);
                        setIsTagBuilderOpen(true);
                    }}
                />
            )}

            {isTagBuilderOpen && (
                <TagBuilderModal
                    targetId="ability"
                    targetType="ability"
                    initialTag={tagBuilderInitialTag}
                    onClose={() => {
                        setIsTagBuilderOpen(false);
                        setTagBuilderInitialTag(undefined);
                    }}
                />
            )}
        </>
    );
}
