import type { CombatantRowData, BattlefieldData } from '@/types/battleOrganizerTypes';
import type { CharacterState } from '@/store/storeTypes';
import { createEmptyBonuses } from '@/utils/tagParser/parseCombatTags';
import { extractMechanics, normalizeStatKey } from '@/utils/tagParser/tagExtractors';
import { synthesizeAbilityTags } from '@/utils/tagParser/abilityTagSynthesizer';
import { getKnownAbility } from '@/data/abilities/knownAbilities';
import { matchesTarget } from './abilityTargetStances';
import { isCombatantInPc } from './abilityTargetPcResolution';

export const AURA_LOWERED_STAT: Record<string, string> = {
    'tablets of ruin': 'str',
    'sword of ruin': 'def',
    'vessel of ruin': 'spe',
    'beads of ruin': 'spd',
    intimidate: 'str'
};

export interface TargetProtectionResult {
    hasProtection: boolean;
    isProtectionUnique: boolean;
    targetWill: number;
}

export function getCombatantWill(combatant?: CombatantRowData, activeCharState?: CharacterState | null): number {
    if (activeCharState && combatant) {
        const activeTokenId = activeCharState.tokenId;
        const activeEntityId = activeCharState.identity?.entityId;
        if (
            (activeTokenId && (combatant.tokenId === activeTokenId || combatant.id === activeTokenId)) ||
            (activeEntityId && (combatant.entityId === activeEntityId || combatant.id === activeEntityId))
        ) {
            return (
                activeCharState.will?.willCurr ??
                activeCharState.will?.willMax ??
                combatant.willCurr ??
                combatant.willMax ??
                0
            );
        }
    }
    if (activeCharState && !combatant) {
        return activeCharState.will?.willCurr ?? activeCharState.will?.willMax ?? 0;
    }
    return combatant?.willCurr ?? combatant?.willMax ?? 0;
}

/**
 * Resolves whether a target combatant has active protection against stat reductions (total or specific stat).
 */
export function resolveTargetProtection(
    targetId: string | string[],
    targetSide: 'player' | 'foe' | 'none',
    loweredStat: string,
    allCombatants?: CombatantRowData[],
    activeCharState?: CharacterState | null,
    battlefield?: BattlefieldData | null,
    isTargetAffectedByAbilityFn?: (
        targetId: string | string[],
        targetSide: 'player' | 'foe' | 'none',
        abilityName: string,
        battlefield?: BattlefieldData | null
    ) => boolean
): TargetProtectionResult {
    const targetIds = Array.isArray(targetId) ? targetId.filter(Boolean) : [targetId];
    const statKey = normalizeStatKey(loweredStat);
    let hasProtection = false;
    let isProtectionUnique = false;

    const matchedTarget = allCombatants?.find((c) => matchesTarget(c, targetIds));
    const targetWill = getCombatantWill(matchedTarget, activeCharState);

    // 1. Check target combatant's active ability
    if (matchedTarget && !matchedTarget.isFainted && !isCombatantInPc(matchedTarget, activeCharState?.pcData)) {
        let abilityName = matchedTarget.ability || '';
        let abilityActive = matchedTarget.abilityActive !== false;
        let abilityTags = matchedTarget.abilityTags || '';

        if (activeCharState) {
            const activeTokenId = activeCharState.tokenId;
            const activeEntityId = activeCharState.identity?.entityId;
            if (
                (activeTokenId && (matchedTarget.tokenId === activeTokenId || matchedTarget.id === activeTokenId)) ||
                (activeEntityId && (matchedTarget.entityId === activeEntityId || matchedTarget.id === activeEntityId))
            ) {
                if (activeCharState.identity?.ability) abilityName = activeCharState.identity.ability;
                if (activeCharState.identity?.abilityActive !== undefined)
                    abilityActive = activeCharState.identity.abilityActive;
                if (activeCharState.identity?.abilityTags) abilityTags = activeCharState.identity.abilityTags;
            }
        }

        if (abilityActive && abilityName) {
            const cleanAb = abilityName
                .replace(/\s*\(HA\)$/i, '')
                .trim()
                .toLowerCase();
            let fullTags = abilityTags;
            if (cleanAb === 'clear body' || cleanAb === 'white smoke') {
                fullTags = synthesizeAbilityTags(
                    'Other Pokemon cannot reduce the Attributes of this Pokemon.',
                    '',
                    fullTags
                );
            } else if (cleanAb === 'full metal body') {
                fullTags = synthesizeAbilityTags(
                    'Other Pokemon cannot Reduce the Attributes of this Pokemon. Unique Ability.',
                    '',
                    fullTags
                );
            } else if (cleanAb === 'hyper cutter') {
                fullTags = synthesizeAbilityTags(
                    "This Pokemon can't have its Strength Attribute reduced by Moves, Abilities, or Items.",
                    '',
                    fullTags
                );
            } else if (cleanAb === 'big pecks') {
                fullTags = synthesizeAbilityTags('This Pokemon cannot have its Defense reduced.', '', fullTags);
            } else if (cleanAb === 'keen eye') {
                fullTags = synthesizeAbilityTags("cannot reduce this Pokemon's Accuracy", '', fullTags);
            } else if (getKnownAbility(cleanAb)?.tags) {
                fullTags = synthesizeAbilityTags('', '', `${fullTags} ${getKnownAbility(cleanAb)!.tags}`);
            }

            const bonuses = createEmptyBonuses();
            const triggers = { general: false, accuracy: false, damage: false };
            extractMechanics(fullTags, '', undefined, bonuses, triggers, false, 'ability', abilityName);

            const protectsThisStat =
                bonuses.ignoreAllStatReductions ||
                bonuses.ignoredStatReductions.has(statKey) ||
                bonuses.ignoredStatReductions.has(loweredStat) ||
                (statKey === 'str' && bonuses.ignoredStatReductions.has('strength')) ||
                (statKey === 'def' && bonuses.ignoredStatReductions.has('defense')) ||
                (statKey === 'spd' &&
                    (bonuses.ignoredStatReductions.has('special defense') ||
                        bonuses.ignoredStatReductions.has('sp. def') ||
                        bonuses.ignoredStatReductions.has('sp def'))) ||
                (statKey === 'spe' && bonuses.ignoredStatReductions.has('special')) ||
                (statKey === 'acc' && bonuses.ignoredStatReductions.has('accuracy'));

            if (protectsThisStat) {
                hasProtection = true;
                if (bonuses.isUnique) {
                    isProtectionUnique = true;
                }
            }
        }
    } else if (activeCharState && !matchedTarget) {
        const activeTokenId = activeCharState.tokenId;
        const activeEntityId = activeCharState.identity?.entityId;
        const activeName = activeCharState.identity?.nickname || activeCharState.identity?.species;
        if (
            matchesTarget(
                { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
                targetIds
            )
        ) {
            if (activeCharState.identity?.abilityActive !== false && activeCharState.identity?.ability) {
                const cleanAb = activeCharState.identity.ability
                    .replace(/\s*\(HA\)$/i, '')
                    .trim()
                    .toLowerCase();
                let fullTags = activeCharState.identity.abilityTags || '';
                if (cleanAb === 'clear body' || cleanAb === 'white smoke') {
                    fullTags = synthesizeAbilityTags(
                        'Other Pokemon cannot reduce the Attributes of this Pokemon.',
                        '',
                        fullTags
                    );
                } else if (cleanAb === 'full metal body') {
                    fullTags = synthesizeAbilityTags(
                        'Other Pokemon cannot Reduce the Attributes of this Pokemon. Unique Ability.',
                        '',
                        fullTags
                    );
                } else if (cleanAb === 'hyper cutter') {
                    fullTags = synthesizeAbilityTags(
                        "This Pokemon can't have its Strength Attribute reduced by Moves, Abilities, or Items.",
                        '',
                        fullTags
                    );
                } else if (cleanAb === 'big pecks') {
                    fullTags = synthesizeAbilityTags('This Pokemon cannot have its Defense reduced.', '', fullTags);
                } else if (cleanAb === 'keen eye') {
                    fullTags = synthesizeAbilityTags("cannot reduce this Pokemon's Accuracy", '', fullTags);
                }

                const bonuses = createEmptyBonuses();
                const triggers = { general: false, accuracy: false, damage: false };
                extractMechanics(fullTags, '', undefined, bonuses, triggers, false, 'ability', cleanAb);

                const protectsThisStat =
                    bonuses.ignoreAllStatReductions ||
                    bonuses.ignoredStatReductions.has(statKey) ||
                    bonuses.ignoredStatReductions.has(loweredStat);

                if (protectsThisStat) {
                    hasProtection = true;
                    if (bonuses.isUnique) {
                        isProtectionUnique = true;
                    }
                }
            }
        }
    }

    // 2. Check target's passives (if target matches activeCharState)
    if (activeCharState?.passives && activeCharState.passives.length > 0) {
        for (const passive of activeCharState.passives) {
            if (passive.active === false) continue;
            const pText = `${passive.desc || ''} ${passive.name || ''}`;
            const bonuses = createEmptyBonuses();
            const triggers = { general: false, accuracy: false, damage: false };
            extractMechanics(pText, '', undefined, bonuses, triggers, false, 'passive', passive.name);
            if (
                bonuses.ignoreAllStatReductions ||
                bonuses.ignoredStatReductions.has(statKey) ||
                bonuses.ignoredStatReductions.has(loweredStat)
            ) {
                hasProtection = true;
                if (bonuses.isUnique) {
                    isProtectionUnique = true;
                }
            }
        }
    }

    // 3. Check active Flower Veil (aura or battlefield forcefield)
    if (isTargetAffectedByAbilityFn && isTargetAffectedByAbilityFn(targetId, targetSide, 'flower veil', battlefield)) {
        hasProtection = true;
    }

    return { hasProtection, isProtectionUnique, targetWill };
}

/**
 * Resolves combat contest between a stat-lowering aura source and a target's stat protection.
 * - Common source vs protected target: Blocked.
 * - Unique source vs non-Unique protection: Pierces.
 * - Unique source vs Unique protection: Will contest (targetWill >= sourceWill blocks; else pierces).
 */
export function evaluateStatAuraContest(
    protection: TargetProtectionResult,
    isSourceUnique: boolean,
    sourceWill: number
): { isBlocked: boolean; isPiercing: boolean } {
    if (!protection.hasProtection) {
        return { isBlocked: false, isPiercing: true };
    }
    if (!isSourceUnique) {
        return { isBlocked: true, isPiercing: false };
    }
    if (!protection.isProtectionUnique) {
        return { isBlocked: false, isPiercing: true };
    }
    if (protection.targetWill >= sourceWill) {
        return { isBlocked: true, isPiercing: false };
    }
    return { isBlocked: false, isPiercing: true };
}
