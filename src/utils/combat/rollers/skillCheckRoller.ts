import type { SkillCheck, CharacterState } from '@/store/storeTypes';
import {
    ATTRIBUTE_MAPPING,
    getStatusPenalties,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal,
    getRankBonusStats,
    getPainPenalty
} from '@/utils/combat/combatMath';
import { parseCombatTags, isStatOrSkillMatch } from '@/utils/tagParser/index';
import { rollDicePlus } from '@/utils/combat/diceRoller';
import {
    getCharacterNickname,
    formatMathModifier,
    formatTagString,
    checkAsleepGuard,
    hasTailwindActive
} from './rollerCommon';

export async function rollSkillCheck(check: SkillCheck, state: CharacterState) {
    const nickname = getCharacterNickname(state);
    if (checkAsleepGuard(state)) return;

    const statuses = getStatusPenalties(state);
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const attributeTotal = calculateStatTotal(check.attr, state, itemBuffs);
    const skillTotal = calculateSkillTotal(check.skill, state, itemBuffs);

    const hasSkill = Boolean(check.skill && check.skill.toLowerCase() !== 'none');
    const rankSkillBonus = hasSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;

    const normalizedAttr = (ATTRIBUTE_MAPPING[check.attr] || check.attr || '').toLowerCase().trim();
    let dicePool = attributeTotal + skillTotal + rankSkillBonus;
    if (normalizedAttr === 'dex') dicePool += statuses.paralysisDexterityPenalty;

    const pain = getPainPenalty(check.attr, state, itemBuffs);

    const tags: string[] = [];
    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    for (const ab of Array.from(new Set(itemBuffs.abilityNames || []))) {
        if (isStatOrSkillMatch(ab, check.attr) || isStatOrSkillMatch(ab, check.skill)) {
            const tagStr = ab.startsWith('Ability:') ? ab : `Ability: ${ab}`;
            if (!tags.includes(tagStr)) tags.push(tagStr);
        }
    }
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}: ${pain} Succ`);
    if (statuses.confusionPenalty < 0) tags.push(`Confusion: ${statuses.confusionPenalty} Succ`);
    if (state.trackers.globalSucc !== 0) {
        tags.push(`Tracker Mod: ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }

    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathModifier = formatMathModifier(genericSuccessModifier);

    const chancesUsed = state.trackers.chances;
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexterityPenalty < 0 && normalizedAttr === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (hasTailwindActive(state) && normalizedAttr === 'dex') {
        tags.push('Tailwind (+2 Dexterity)');
    }

    if (statuses.isAsleep) {
        const abilityString = (state.identity.ability || '').toLowerCase();
        const hasComatose = abilityString.includes('comatose');
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) {
        tags.push(`FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    const finalTags = formatTagString(tags);
    const rollName = (check.name || '').trim() || 'Skill Check';

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `[Action Roll] ${nickname} rolled ${rollName}!${finalTags}`,
        'action_roll',
        check.id
    );
}

