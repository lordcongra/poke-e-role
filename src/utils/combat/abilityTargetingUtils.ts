/**
 * Ability Targeting Facade
 * 
 * Re-exports targeting sub-domain utilities from modular sub-files:
 * - abilityTargetStances: Stance parsing, rank targets, and matching
 * - abilityTargetPcResolution: PC presence detection and state sync
 * - abilityFieldChecks: Active aura, weather, and field condition checks
 * - abilityHeldItemResolution: Held item queries (synchronous & async OBR)
 */

export {
    RANK_TARGET_LIMITS,
    getMaxTargetsForRank,
    type AbilityTargetStance,
    parseAbilityTargetStanceFromTags,
    getAbilityTargetStance,
    getAbilityMaxTargets,
    matchesTarget,
    isTargetInList
} from './targeting/abilityTargetStances';

export {
    isCombatantInPc,
    syncCombatantSentToPc,
    syncCombatantSentToMap
} from './targeting/abilityTargetPcResolution';

export {
    RUIN_ABILITIES,
    isTargetCombatantActiveNeutralizingGas,
    isTargetCombatantImmuneToRuin,
    isTargetAffectedByAbility,
    isAbilitySuppressedByField,
    isTargetUnderIntimidate,
    isAllyAuraActive,
    isOpposingAuraActive,
    isVictoryStarActive
} from './targeting/abilityFieldChecks';

export {
    resolveTargetHeldItemInfo,
    resolveTargetHeldItemInfoAsync
} from './targeting/abilityHeldItemResolution';
