import { RANK_TARGET_LIMITS, getMaxTargetsForRank } from '../../components/modals/combat/targetingModalUtils';
import type { BattlefieldData, BattleOrganizerState, CombatantRowData } from '../../types/battleOrganizerTypes';
import type { CharacterState } from '../../store/storeTypes';
import { getEffectsByCategory } from './fieldEffectsData';
import { resolveCharacterSide } from './combatantSideUtils';
import { useCharacterStore } from '../../store/useCharacterStore';

export { RANK_TARGET_LIMITS, getMaxTargetsForRank };

export type AbilityTargetStance = 'allies-and-self' | 'allies-only' | 'foes' | 'none';

/**
 * Returns the targeting stance for unified range-based abilities.
 */
export function getAbilityTargetStance(ability: string): AbilityTargetStance {
    if (!ability) return 'none';
    const clean = ability.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    switch (clean) {
        case 'flower gift':
        case 'steely spirit':
        case 'armor tail':
        case 'sweet veil':
        case 'pastel veil':
        case 'aroma veil':
        case 'flower veil':
        case 'victory star':
            return 'allies-and-self';
        case 'battery':
        case 'power spot':
            return 'allies-only';
        case 'intimidate':
        case 'supersweet syrup':
        case 'neutralizing gas':
            return 'foes';
        default:
            return 'none';
    }
}

/**
 * Checks whether a combatant matches a given targetId or list of targetIds (by id, tokenId, entityId, or name).
 */
export function matchesTarget(
    c: { id?: string; tokenId?: string; entityId?: string; name?: string },
    targetId: string | string[]
): boolean {
    if (!targetId) return false;
    const targetIds = Array.isArray(targetId) ? targetId : [targetId];
    return targetIds.some((tId) => {
        if (!tId) return false;
        const clean = tId.trim().toLowerCase();
        if (c.id && c.id.toLowerCase() === clean) return true;
        if (c.tokenId && c.tokenId.toLowerCase() === clean) return true;
        if (c.entityId && c.entityId.toLowerCase() === clean) return true;
        if (c.name && c.name.trim().toLowerCase() === clean) return true;
        return false;
    });
}

/**
 * Checks whether targetId is explicitly selected in a target IDs array.
 */
export function isTargetInList(
    targetIds: string[],
    targetId: string | string[],
    combatants: CombatantRowData[]
): boolean {
    if (!targetId) return true;
    const rawTargets = Array.isArray(targetId) ? targetId : [targetId];
    const targets = rawTargets.filter(Boolean);
    if (targets.length === 0) return true;
    return targets.some((t) => {
        const clean = t.trim().toLowerCase();
        if (targetIds.some((id) => id.toLowerCase() === clean)) return true;
        const matched = combatants.find((c) => matchesTarget(c, t));
        if (matched) {
            return targetIds.some(
                (id) =>
                    id.toLowerCase() === matched.id.toLowerCase() ||
                    (matched.tokenId && id.toLowerCase() === matched.tokenId.toLowerCase()) ||
                    (matched.entityId && id.toLowerCase() === matched.entityId.toLowerCase()) ||
                    (matched.name && id.toLowerCase() === matched.name.trim().toLowerCase())
            );
        }
        return false;
    });
}

/**
 * Core unified engine for range-based and aura abilities.
 * Determines if targetId on targetSide is affected by abilityName under rank limits and targeting stance.
 */
export function isTargetAffectedByAbility(
    targetId: string | string[],
    targetSide: 'player' | 'foe' | 'none',
    abilityName: string,
    battlefield?: BattlefieldData | null
): boolean {
    if (!targetSide || (targetSide !== 'player' && targetSide !== 'foe') || !abilityName) {
        return false;
    }

    const cleanAbility = abilityName.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    const stance = getAbilityTargetStance(cleanAbility);
    if (stance === 'none') return false;

    // 1. Flower Gift requires Sunny / Harsh Sunlight / Desolate weather
    if (cleanAbility === 'flower gift') {
        const activeWeathers = battlefield ? getEffectsByCategory(battlefield, 'weather') : [];
        const hasSun = activeWeathers.some((w) => {
            const clean = (w?.name || '').trim().toLowerCase();
            return clean.includes('sun') || clean.includes('desolate');
        });
        if (!hasSun) return false;
    }

    // 2. Check Battlefield Side ForceFields / Notes
    if (battlefield) {
        const sideData = targetSide === 'player' ? battlefield.playerSide : battlefield.foeSide;
        if (sideData) {
            const inFf = sideData.forceFields?.some(
                (ff) => ff?.name?.toLowerCase().includes(cleanAbility) && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            );
            const inExtraFf = sideData.extraForceFields?.some(
                (ff) => ff?.name?.toLowerCase().includes(cleanAbility) && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            );
            const inOther = Boolean(sideData.other && sideData.other.toLowerCase().includes(cleanAbility));
            const inExtraOther = Boolean(sideData.extraOther?.some((o) => o?.toLowerCase().includes(cleanAbility)));
            if (inFf || inExtraFf || inOther || inExtraOther) {
                return true;
            }
        }

        if (cleanAbility === 'neutralizing gas') {
            if (
                battlefield.other?.name?.toLowerCase().includes('neutralizing gas') &&
                (battlefield.other.remainingRounds > 0 || battlefield.other.remainingRounds === -1)
            ) {
                return true;
            }
            if (
                battlefield.extraOther?.some(
                    (o) => o?.name?.toLowerCase().includes('neutralizing gas') && (o.remainingRounds > 0 || o.remainingRounds === -1)
                )
            ) {
                return true;
            }
        }
    }

    // 3. Check active round combatants in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                if (activeRound?.combatants && activeRound.combatants.length > 0) {
                    const allCombatants = activeRound.combatants;

                    let activeCharState: CharacterState | null = null;
                    try {
                        activeCharState = useCharacterStore.getState();
                    } catch {
                        // Ignore if store not ready
                    }

                    const isCombatantAbilityActive = (c: CombatantRowData): boolean => {
                        if (activeCharState) {
                            const activeTokenId = activeCharState.tokenId;
                            const activeEntityId = activeCharState.identity?.entityId;
                            if (
                                (activeTokenId && (c.tokenId === activeTokenId || c.id === activeTokenId)) ||
                                (activeEntityId && (c.entityId === activeEntityId || c.id === activeEntityId))
                            ) {
                                return activeCharState.identity?.abilityActive !== false;
                            }
                        }
                        return c.abilityActive !== false;
                    };

                    const getCombatantTargets = (c: CombatantRowData): string[] | undefined => {
                        if (activeCharState) {
                            const activeTokenId = activeCharState.tokenId;
                            const activeEntityId = activeCharState.identity?.entityId;
                            if (
                                (activeTokenId && (c.tokenId === activeTokenId || c.id === activeTokenId)) ||
                                (activeEntityId && (c.entityId === activeEntityId || c.id === activeEntityId))
                            ) {
                                if (activeCharState.identity?.abilityTargetIds !== undefined) {
                                    return activeCharState.identity.abilityTargetIds;
                                }
                            }
                        }
                        return c.abilityTargetIds;
                    };

                    const potentialSources = allCombatants.filter((c) => {
                        if (c.isFainted) return false;
                        if (!isCombatantAbilityActive(c)) return false;
                        const cAb = (c.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
                        return cAb === cleanAbility;
                    });

                    for (const source of potentialSources) {
                        const sourceIsPlayer = typeof source.isPlayerSide === 'boolean' ? source.isPlayerSide : !source.isNPC;
                        const sourceSide: 'player' | 'foe' = sourceIsPlayer ? 'player' : 'foe';

                        // Verify stance match
                        if (stance === 'foes') {
                            if (sourceSide === targetSide) continue;
                        } else {
                            if (sourceSide !== targetSide) continue;
                        }

                        // Check Neutralizing Gas suppression of source (unless source itself is Neutralizing Gas)
                        if (cleanAbility !== 'neutralizing gas') {
                            const sourceIdentifiers = [source.id, source.tokenId, source.entityId, source.name].filter(
                                Boolean
                            ) as string[];
                            if (isTargetAffectedByAbility(sourceIdentifiers, sourceSide, 'neutralizing gas', battlefield)) {
                                continue;
                            }
                        }

                        const isTargetSelf = matchesTarget(source, targetId);

                        // If allies-only, source itself is never affected
                        if (stance === 'allies-only' && isTargetSelf) {
                            continue;
                        }

                        // Check explicit targeting configuration:
                        // If configuredTargets is empty ([]) or undefined, treat it as 0 targets selected (do NOT fall back to auto-targeting candidates)
                        const configuredTargets = getCombatantTargets(source);
                        if (!configuredTargets || configuredTargets.length === 0) {
                            continue;
                        }

                        if (isTargetInList(configuredTargets, targetId, allCombatants)) {
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[abilityTargetingUtils] Failed to check ability targets from storage:', e);
        }
    }

    return false;
}

/**
 * Losslessly detects whether a side or specific character is suppressed by active opposing Neutralizing Gas,
 * delegating to the unified isTargetAffectedByAbility engine.
 */
export function isAbilitySuppressedByField(
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined,
    targetId: string | string[] = ''
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;
    return isTargetAffectedByAbility(targetId, side, 'neutralizing gas', battlefield);
}

/**
 * Checks whether a combatant/target on a given side is affected by an opposing active Intimidate.
 */
export function isTargetUnderIntimidate(
    targetId: string,
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;
    return isTargetAffectedByAbility(targetId, side, 'intimidate', battlefield);
}

/**
 * Checks whether an ally on the same side has an active aura ability in range.
 */
export function isAllyAuraActive(
    abilityName: string,
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined,
    userAbility?: string,
    userAbilityActive?: boolean
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;

    const cleanAbility = abilityName.trim().toLowerCase();

    if (userAbility && userAbilityActive !== false) {
        const cleanUserAb = userAbility.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
        if (cleanUserAb === cleanAbility) {
            if (!isAbilitySuppressedByField(side, battlefield)) {
                return true;
            }
        }
    }

    return isTargetAffectedByAbility('', side, abilityName, battlefield);
}

/**
 * Checks whether an opposing combatant on the field has an active aura ability.
 */
export function isOpposingAuraActive(
    abilityName: string,
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;
    return isTargetAffectedByAbility('', side, abilityName, battlefield);
}

/**
 * Evaluates whether Victory Star is active for the character (either from self or an ally in range).
 */
export function isVictoryStarActive(state: CharacterState): boolean {
    const sideName = resolveCharacterSide(state);
    const resolvedSide: 'player' | 'foe' = sideName !== 'none' ? sideName : state.identity.isNPC ? 'foe' : 'player';
    const rollerId = state.identity.entityId || state.tokenId || state.identity.nickname || state.identity.species || '';
    return isTargetAffectedByAbility(rollerId, resolvedSide, 'victory star', state.activeBattlefield || null);
}
