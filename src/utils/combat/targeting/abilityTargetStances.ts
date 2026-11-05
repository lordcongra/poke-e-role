import { RANK_TARGET_LIMITS, getMaxTargetsForRank } from '@/components/modals/combat/targetingModalUtils';
import type { CombatantRowData } from '@/types/battleOrganizerTypes';
import { getKnownAbility } from '@/data/abilities/knownAbilities';
import { useCharacterStore } from '@/store/useCharacterStore';

export { RANK_TARGET_LIMITS, getMaxTargetsForRank };

export type AbilityTargetStance = 'allies-and-self' | 'allies-only' | 'foes' | 'all-except-self' | 'all-on-field' | 'none';

/**
 * Helper to parse ability target stance from tag strings.
 */
export function parseAbilityTargetStanceFromTags(tags: string): AbilityTargetStance {
    if (!tags) return 'none';
    const lowerTags = tags.toLowerCase();
    if (lowerTags.includes('[target: all foes]') || lowerTags.includes('[target: single foe]')) {
        return 'foes';
    }
    if (lowerTags.includes('[target: all allies]') || lowerTags.includes('[target: single ally]')) {
        return 'allies-only';
    }
    if (lowerTags.includes('[target: allies & self]') || lowerTags.includes('[target: allies and self]')) {
        return 'allies-and-self';
    }
    if (lowerTags.includes('[target: all except self]')) {
        return 'all-except-self';
    }
    if (lowerTags.includes('[target: all on field]') || lowerTags.includes('[target: field]')) {
        return 'all-on-field';
    }
    if (/\[target:\s*(?:all\s+)?foes?\]/i.test(tags)) return 'foes';
    if (/\[target:\s*(?:all\s+)?allies(?:-only)?\]/i.test(tags)) return 'allies-only';
    if (/\[target:\s*allies\s*(?:&|and)\s*self\]/i.test(tags)) return 'allies-and-self';
    if (/\[target:\s*all\s+(?:on\s+)?field\]/i.test(tags)) return 'all-on-field';
    if (/\[target:\s*all\s+except\s+self\]/i.test(tags)) return 'all-except-self';
    return 'none';
}

/**
 * Returns the targeting stance for unified range-based abilities.
 */
export function getAbilityTargetStance(ability: string, tags?: string): AbilityTargetStance {
    if (tags) {
        const fromTags = parseAbilityTargetStanceFromTags(tags);
        if (fromTags !== 'none') return fromTags;
    }

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
        case 'costar':
        case 'hospitality':
        case 'commander':
            return 'allies-only';
        case 'intimidate':
        case 'supersweet syrup':
        case 'neutralizing gas':
        case 'frisk':
        case 'analytic':
        case 'unaware':
        case 'stakeout':
            return 'foes';
        case 'tablets of ruin':
        case 'sword of ruin':
        case 'vessel of ruin':
        case 'beads of ruin':
            return 'all-except-self';
        case 'dark aura':
        case 'fairy aura':
        case 'aura break':
            return 'all-on-field';
    }

    // Fall back to known ability tags or custom room abilities
    const known = getKnownAbility(clean);
    if (known?.tags) {
        const fromKnown = parseAbilityTargetStanceFromTags(known.tags);
        if (fromKnown !== 'none') return fromKnown;
    }

    try {
        const roomCustomAbilities = useCharacterStore.getState()?.roomCustomAbilities;
        const custom = roomCustomAbilities?.find(
            (ca) => ca.name?.trim().toLowerCase() === clean
        );
        if (custom) {
            const customTags = `${custom.effect || ''} ${custom.description || ''}`.trim();
            const fromCustom = parseAbilityTargetStanceFromTags(customTags);
            if (fromCustom !== 'none') return fromCustom;
        }
    } catch {
        // Ignore if store not available
    }

    return 'none';
}

/**
 * Calculates max target count for an ability based on its tags, canonical type, and rank.
 */
export function getAbilityMaxTargets(ability: string, tags?: string, rank?: string): number {
    const cleanTags = (tags || '').toLowerCase();
    if (cleanTags.includes('[target: single') || /\[target:\s*single\b/i.test(cleanTags)) {
        return 1;
    }
    const cleanAbility = (ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    const singleTargetAbilities = new Set([
        'analytic',
        'costar',
        'hospitality',
        'frisk',
        'commander',
        'unaware',
        'stakeout'
    ]);
    if (singleTargetAbilities.has(cleanAbility)) {
        return 1;
    }
    return getMaxTargetsForRank(rank);
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

