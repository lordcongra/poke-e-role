import { useCharacterStore } from '@/store/useCharacterStore';
import {
    getStatusPenalties,
    getAbilityText,
    getRankBonusStats,
    getPainPenalty
} from '@/utils/combat/combatMath';
import { parseCombatTags } from '@/utils/tagParser/index';
import { rollDicePlus } from '@/utils/combat/diceRoller';
import {
    getCharacterNickname,
    formatMathModifier,
    formatTagString,
    checkAsleepGuard,
    hasTailwindActive
} from './rollerCommon';

export async function rollGeneric(
    actionName: string,
    dicePool: number,
    attribute: string,
    incrementEvade = false,
    incrementClash = false,
    incrementAction = false,
    hasSkill = false,
    options?: {
        requiredSuccesses?: number;
        criticalRequirement?: number;
        critExplanationTags?: string[];
        isOutOfCombat?: boolean;
    }
) {
    const state = useCharacterStore.getState();
    const nickname = getCharacterNickname(state);
    const abilityString = (state.identity.ability || '').toLowerCase();

    if (checkAsleepGuard(state)) return;

    const statuses = getStatusPenalties(state);
    const hasComatose = abilityString.includes('comatose');

    if (incrementAction) {
        useCharacterStore.getState().incrementAction();
    }
    if (incrementEvade) useCharacterStore.getState().updateTracker('evade', true);
    if (incrementClash) useCharacterStore.getState().updateTracker('clash', true);

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const rankSkillBonus = hasSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;
    let finalDicePool = dicePool + rankSkillBonus;
    if (attribute.toLowerCase() === 'dex') finalDicePool += statuses.paralysisDexterityPenalty;

    const pain = getPainPenalty(attribute, state, itemBuffs);

    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathModifier = formatMathModifier(genericSuccessModifier);

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}: ${pain} Succ`);
    if (statuses.confusionPenalty < 0) tags.push(`Confusion: ${statuses.confusionPenalty} Succ`);
    if (state.trackers.globalSucc !== 0) {
        tags.push(`Tracker Mod: ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexterityPenalty < 0 && attribute.toLowerCase() === 'dex') tags.push(`Paralysis: -2 Dice`);

    const actionLower = actionName.toLowerCase();
    const isEvasion = actionLower.includes('evas');
    const isSpd = actionLower.includes('spd') || actionLower.includes('special def') || actionLower.includes('sdef');
    const isDef = (actionLower.includes('def') || actionLower.includes('defense')) && !isSpd;

    if (isDef) {
        if (itemBuffs.defAbilityNames && itemBuffs.defAbilityNames.length > 0) {
            for (const ab of Array.from(new Set(itemBuffs.defAbilityNames))) {
                const tagStr = ab.startsWith('Ability:') ? ab : `Ability: ${ab}`;
                if (!tags.includes(tagStr)) tags.push(tagStr);
            }
        }
        for (const ab of Array.from(new Set(itemBuffs.abilityNames || []))) {
            if (/\b(?:def|defense|vit|vitality)\b/i.test(ab)) {
                const tagStr = ab.startsWith('Ability:') ? ab : `Ability: ${ab}`;
                if (!tags.includes(tagStr)) tags.push(tagStr);
            }
        }
        if (abilityString.includes('fur coat') && !tags.some((t) => t.toLowerCase().includes('fur coat'))) {
            tags.push('Ability: Fur Coat (-2 Phys Dmg Taken)');
        }
    }

    if (isSpd) {
        if (itemBuffs.spdAbilityNames && itemBuffs.spdAbilityNames.length > 0) {
            for (const ab of Array.from(new Set(itemBuffs.spdAbilityNames))) {
                const tagStr = ab.startsWith('Ability:') ? ab : `Ability: ${ab}`;
                if (!tags.includes(tagStr)) tags.push(tagStr);
            }
        }
        for (const ab of Array.from(new Set(itemBuffs.abilityNames || []))) {
            if (/\b(?:spd|sdef|special defense|spdef|ins|insight)\b/i.test(ab)) {
                const tagStr = ab.startsWith('Ability:') ? ab : `Ability: ${ab}`;
                if (!tags.includes(tagStr)) tags.push(tagStr);
            }
        }
        if (abilityString.includes('ice scales') && !tags.some((t) => t.toLowerCase().includes('ice scales'))) {
            tags.push('Ability: Ice Scales (-2 Special Dmg Taken)');
        }
    }

    if (isEvasion) {
        for (const ab of Array.from(new Set(itemBuffs.abilityNames || []))) {
            if (/\b(?:evas|evasion|dex|dexterity)\b/i.test(ab)) {
                const tagStr = ab.startsWith('Ability:') ? ab : `Ability: ${ab}`;
                if (!tags.includes(tagStr)) tags.push(tagStr);
            }
        }
        if (abilityString.includes('tangled feet') && !tags.some((t) => t.toLowerCase().includes('tangled feet'))) {
            if (statuses.confusionPenalty < 0) {
                tags.push('Ability: Tangled Feet (Foe Low Acc)');
            }
        }
        if (abilityString.includes('sand veil') && !tags.some((t) => t.toLowerCase().includes('sand veil'))) {
            const isSand = Boolean(state.activeBattlefield?.weather?.name?.toLowerCase().includes('sand'));
            if (isSand) {
                tags.push('Ability: Sand Veil (Evasion up to 5/Round)');
            }
        }
    }

    if (actionName.toLowerCase().includes('evas')) {
        const isGravityActive = Boolean(
            state.activeBattlefield &&
            ((state.activeBattlefield.other?.name?.toLowerCase().includes('gravity') &&
                (state.activeBattlefield.other.remainingRounds > 0 ||
                    state.activeBattlefield.other.remainingRounds === -1)) ||
                state.activeBattlefield.extraOther?.some(
                    (o) =>
                        o.name.toLowerCase().includes('gravity') && (o.remainingRounds > 0 || o.remainingRounds === -1)
                ))
        );
        if (isGravityActive) {
            finalDicePool = Math.max(1, finalDicePool - 2);
            tags.push('Gravity (-2 Evasion Dice)');
        }
    }

    if (hasTailwindActive(state) && attribute.toLowerCase() === 'dex') {
        tags.push('Tailwind (+2 Dexterity)');
    }

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }

    if (statuses.isFrozen) {
        tags.push(`FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    if (options?.requiredSuccesses !== undefined) {
        tags.push(`Need ${options.requiredSuccesses} Succ`);
    }
    if (options?.criticalRequirement !== undefined) {
        tags.push(`Crit on ${options.criticalRequirement}+`);
    }
    if (options?.critExplanationTags && options.critExplanationTags.length > 0) {
        for (const expl of options.critExplanationTags) {
            if (!tags.includes(expl)) {
                tags.push(expl);
            }
        }
    }
    if (options?.isOutOfCombat) {
        tags.push('Out of Combat');
    }

    const finalTags = formatTagString(tags);

    await rollDicePlus(
        `${Math.max(1, finalDicePool)}d6>3${mathModifier}`,
        `${nickname} rolled ${actionName}!${finalTags}`
    );
}

