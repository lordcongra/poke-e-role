import type { BattlefieldData, BattleOrganizerState, CombatantRowData } from '@/types/battleOrganizerTypes';
import type { CharacterState } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { getKnownAbility } from '@/data/abilities/knownAbilities';
import { getEffectsByCategory } from '@/utils/combat/fieldEffectsData';
import { resolveCharacterSide } from '@/utils/combat/combatantSideUtils';
import { matchesTarget, isTargetInList, getAbilityTargetStance } from './abilityTargetStances';
import { isCombatantInPc } from './abilityTargetPcResolution';

export const RUIN_ABILITIES = new Set([
    'tablets of ruin',
    'sword of ruin',
    'vessel of ruin',
    'beads of ruin'
]);

/**
 * Checks whether a target combatant has active Neutralizing Gas.
 * In canonical rules, Neutralizing Gas cannot negate another Neutralizing Gas.
 */
export function isTargetCombatantActiveNeutralizingGas(
    targetId: string | string[],
    allCombatants?: CombatantRowData[],
    activeCharState?: CharacterState | null
): boolean {
    if (!targetId) return false;
    const targetIds = Array.isArray(targetId) ? targetId.filter(Boolean) : [targetId];
    if (targetIds.length === 0) return false;

    let resolvedChar = activeCharState;
    if (resolvedChar === undefined) {
        try {
            resolvedChar = useCharacterStore.getState();
        } catch {
            resolvedChar = null;
        }
    }

    let combatants = allCombatants;
    if (!combatants && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const bo = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
                combatants = activeRound?.combatants;
            }
        } catch {
            // ignore
        }
    }

    if (combatants && combatants.length > 0) {
        const matched = combatants.find((c) => matchesTarget(c, targetIds));
        if (matched) {
            if (isCombatantInPc(matched, resolvedChar?.pcData) || matched.isFainted) {
                return false;
            }
            let ability = matched.ability;
            let active = matched.abilityActive !== false;
            if (resolvedChar) {
                const activeTokenId = resolvedChar.tokenId;
                const activeEntityId = resolvedChar.identity?.entityId;
                if (
                    (activeTokenId && (matched.tokenId === activeTokenId || matched.id === activeTokenId)) ||
                    (activeEntityId && (matched.entityId === activeEntityId || matched.id === activeEntityId))
                ) {
                    if (resolvedChar.identity?.ability) ability = resolvedChar.identity.ability;
                    if (resolvedChar.identity?.abilityActive !== undefined) active = resolvedChar.identity.abilityActive;
                }
            }
            const clean = (ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            return clean === 'neutralizing gas' && active;
        }
    }

    if (resolvedChar) {
        const activeTokenId = resolvedChar.tokenId;
        const activeEntityId = resolvedChar.identity?.entityId;
        const activeName = resolvedChar.identity?.nickname || resolvedChar.identity?.species;
        if (
            matchesTarget(
                { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
                targetIds
            )
        ) {
            const clean = (resolvedChar.identity?.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            const active = resolvedChar.identity?.abilityActive !== false;
            return clean === 'neutralizing gas' && active;
        }
    }

    return false;
}

/**
 * Checks whether a target combatant is immune to Ruin abilities (has an active Ruin ability).
 */
export function isTargetCombatantImmuneToRuin(
    targetId: string | string[],
    allCombatants?: CombatantRowData[],
    activeCharState?: CharacterState | null
): boolean {
    if (!targetId) return false;
    const targetIds = Array.isArray(targetId) ? targetId.filter(Boolean) : [targetId];
    if (targetIds.length === 0) return false;

    let resolvedChar = activeCharState;
    if (resolvedChar === undefined) {
        try {
            resolvedChar = useCharacterStore.getState();
        } catch {
            resolvedChar = null;
        }
    }

    let combatants = allCombatants;
    if (!combatants && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const bo = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
                combatants = activeRound?.combatants;
            }
        } catch {
            // ignore
        }
    }

    if (combatants && combatants.length > 0) {
        const matched = combatants.find((c) => matchesTarget(c, targetIds));
        if (matched) {
            if (isCombatantInPc(matched, resolvedChar?.pcData) || matched.isFainted) {
                return false;
            }
            let ability = matched.ability;
            let active = matched.abilityActive !== false;
            if (resolvedChar) {
                const activeTokenId = resolvedChar.tokenId;
                const activeEntityId = resolvedChar.identity?.entityId;
                if (
                    (activeTokenId && (matched.tokenId === activeTokenId || matched.id === activeTokenId)) ||
                    (activeEntityId && (matched.entityId === activeEntityId || matched.id === activeEntityId))
                ) {
                    if (resolvedChar.identity?.ability) ability = resolvedChar.identity.ability;
                    if (resolvedChar.identity?.abilityActive !== undefined) active = resolvedChar.identity.abilityActive;
                }
            }
            const clean = (ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            return RUIN_ABILITIES.has(clean) && active;
        }
    }

    if (resolvedChar) {
        const activeTokenId = resolvedChar.tokenId;
        const activeEntityId = resolvedChar.identity?.entityId;
        const activeName = resolvedChar.identity?.nickname || resolvedChar.identity?.species;
        if (
            matchesTarget(
                { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
                targetIds
            )
        ) {
            const clean = (resolvedChar.identity?.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            const active = resolvedChar.identity?.abilityActive !== false;
            return RUIN_ABILITIES.has(clean) && active;
        }
    }

    return false;
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

    // Neutralizing Gas self-immunity: Neutralizing Gas cannot negate another active Neutralizing Gas
    if (cleanAbility === 'neutralizing gas' && isTargetCombatantActiveNeutralizingGas(targetId)) {
        return false;
    }

    // Ruin Quartet mutual immunity: A combatant with a Ruin ability is immune to all Ruin abilities
    if (RUIN_ABILITIES.has(cleanAbility) && isTargetCombatantImmuneToRuin(targetId)) {
        return false;
    }

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

                    // Combatants in the PC cannot receive or be affected by auras
                    if (targetId) {
                        const matchedTargetCombatant = allCombatants.find((c) => matchesTarget(c, targetId));
                        if (matchedTargetCombatant && isCombatantInPc(matchedTargetCombatant, activeCharState?.pcData)) {
                            return false;
                        }
                    }

                    const isCombatantAbilityActive = (c: CombatantRowData): boolean => {
                        if (isCombatantInPc(c, activeCharState?.pcData)) {
                            return false;
                        }
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
                        if (isCombatantInPc(c, activeCharState?.pcData)) return false;
                        if (!isCombatantAbilityActive(c)) return false;
                        const cAb = (c.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
                        return cAb === cleanAbility;
                    });

                    for (const source of potentialSources) {
                        const sourceTags = source.abilityTags || getKnownAbility(source.ability || '')?.tags || '';
                        const stance = getAbilityTargetStance(source.ability || cleanAbility, sourceTags);
                        if (stance === 'none') {
                            continue;
                        }

                        const sourceIsPlayer = typeof source.isPlayerSide === 'boolean' ? source.isPlayerSide : !source.isNPC;
                        const sourceSide: 'player' | 'foe' = sourceIsPlayer ? 'player' : 'foe';

                        // Verify stance match
                        if (stance === 'foes') {
                            if (sourceSide === targetSide) continue;
                        } else if (stance === 'allies-only' || stance === 'allies-and-self') {
                            if (sourceSide !== targetSide) continue;
                        } else if (stance === 'all-except-self' || stance === 'all-on-field') {
                            // Both sides are eligible
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

                        // If allies-only or all-except-self, source itself is never affected
                        if ((stance === 'allies-only' || stance === 'all-except-self') && isTargetSelf) {
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
        let inPc = false;
        try {
            const char = useCharacterStore.getState();
            if (char) {
                const dummyCombatant: CombatantRowData = {
                    id: char.identity.entityId || char.tokenId || '',
                    entityId: char.identity.entityId,
                    tokenId: char.tokenId || undefined,
                    name: char.identity.nickname || char.identity.species || '',
                    actions: [
                        { text: '', status: 'none' },
                        { text: '', status: 'none' },
                        { text: '', status: 'none' },
                        { text: '', status: 'none' },
                        { text: '', status: 'none' }
                    ],
                    evadeUsed: false,
                    clashUsed: false,
                    heldItem: '',
                    initiative: '0',
                    status: 'Normal'
                };
                inPc = isCombatantInPc(dummyCombatant, char.pcData);
            }
        } catch {
            // ignore
        }

        if (!inPc) {
            const cleanUserAb = userAbility.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            if (cleanUserAb === cleanAbility) {
                if (!isAbilitySuppressedByField(side, battlefield)) {
                    return true;
                }
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

