import type { MoveData, CharacterState } from '@/store/storeTypes';
import type { CombatBonuses } from '@/utils/tagParser/index';

// =========================================
// CRITICAL HIT MECHANICS & CALCULATIONS
// =========================================

export const HIGH_CRITICAL_MOVES = new Set([
    'aeroblast',
    'air cutter',
    'aqua cutter',
    'attack order',
    'blaze kick',
    'ceaseless edge',
    'crabhammer',
    'cross chop',
    'cross poison',
    'dire claw',
    'dragon cheer',
    'drill run',
    'esper wing',
    'focus energy',
    'karate chop',
    'leaf blade',
    'night slash',
    'oblivion wing',
    'poison tail',
    'psycho cut',
    'razor leaf',
    'razor wind',
    'shadow claw',
    'sky attack',
    'slash',
    'snipe shot',
    'spacial rend',
    'stone axe',
    'stone edge',
    'triple arrows'
]);

export function isHighCriticalMove(move?: MoveData | null): boolean {
    if (!move) return false;
    const moveName = (move.name || '').trim().toLowerCase();
    if (HIGH_CRITICAL_MOVES.has(moveName)) return true;

    const moveDesc = (move.desc || '').toLowerCase();
    if (
        moveDesc.includes('high critical') ||
        moveDesc.includes('high crit') ||
        /\[\s*(?:stacking\s+)?high crit(?:ical)?(?:\s*@\s*[^\]]+)?\s*\]/i.test(moveDesc)
    ) {
        return true;
    }

    const attrs = (move as unknown as Record<string, unknown>).attributes as Record<string, unknown> | undefined;
    if (attrs?.HighCritical === true) return true;

    return false;
}

export interface CriticalRequirementResult {
    criticalRequirement: number;
    baseRequirement: number;
    totalReductions: number;
    hasMoveHighCrit: boolean;
    hasItemHighCrit: boolean;
    hasSuperLuck: boolean;
    stackingHighCritStacks: number;
    critExplanationTags: string[];
}

export function calculateCriticalRequirement(
    move: MoveData,
    requiredSuccesses: number,
    state: CharacterState,
    itemBuffs: CombatBonuses
): CriticalRequirementResult {
    const baseRequirement = requiredSuccesses + 3;

    const hasMoveHighCrit = isHighCriticalMove(move);
    const hasItemHighCrit = itemBuffs.highCritStacks > 0;

    const cleanAbility = (state.identity.ability || '')
        .replace(/\s*\(HA\)$/i, '')
        .trim()
        .toLowerCase();
    const abilityActive = state.identity.abilityActive !== false;
    const isSuperLuck = abilityActive && cleanAbility === 'super luck';

    // Super Luck provides 1 stack of stacking high crit when active
    let stackingStacks = itemBuffs.stackingHighCritStacks || 0;
    if (isSuperLuck && stackingStacks === 0) {
        stackingStacks = 1;
    }

    // Base High Critical reduction (from move OR non-stacking item like Razor Claw) reduces requirement by 1
    const baseCriticalReductions = hasItemHighCrit || hasMoveHighCrit ? 1 : 0;
    const totalReductions = baseCriticalReductions + stackingStacks;

    const criticalRequirement = Math.max(1, baseRequirement - totalReductions);

    const critExplanationTags: string[] = [];
    if (hasMoveHighCrit) {
        critExplanationTags.push('Move: High Critical');
    }
    if (hasItemHighCrit && !hasMoveHighCrit) {
        if (itemBuffs.highCritItemNames && itemBuffs.highCritItemNames.length > 0) {
            critExplanationTags.push('Item: High Critical');
        }
        if (itemBuffs.highCritPassiveNames && itemBuffs.highCritPassiveNames.length > 0) {
            const unique = Array.from(
                new Set(itemBuffs.highCritPassiveNames.map((p) => p.replace(/^Passive:\s*/i, '').trim()))
            );
            critExplanationTags.push(`Passive: ${unique.join(', ')} (High Critical)`);
        }
    }
    if (itemBuffs.highCritAbilityNames && itemBuffs.highCritAbilityNames.length > 0) {
        const abilityNames = itemBuffs.highCritAbilityNames.map((a) => a.replace(/^Ability:\s*/i, '').trim());
        const unique = Array.from(new Set(abilityNames));
        critExplanationTags.push(`Ability: ${unique.join(', ')} (High Critical)`);
        for (const name of unique) {
            if (!itemBuffs.accAbilityNames.some((a) => a.toLowerCase().includes(name.toLowerCase()))) {
                itemBuffs.accAbilityNames.push(name);
            }
        }
    } else if (isSuperLuck) {
        critExplanationTags.push('Ability: Super Luck (High Critical)');
        if (!itemBuffs.accAbilityNames.some((a) => a.toLowerCase().includes('super luck'))) {
            itemBuffs.accAbilityNames.push('Super Luck');
        }
    }
    if (stackingStacks > (isSuperLuck ? 1 : 0)) {
        critExplanationTags.push(`Stacking High Crit (${stackingStacks})`);
    }

    return {
        criticalRequirement,
        baseRequirement,
        totalReductions,
        hasMoveHighCrit,
        hasItemHighCrit,
        hasSuperLuck: isSuperLuck,
        stackingHighCritStacks: stackingStacks,
        critExplanationTags
    };
}

