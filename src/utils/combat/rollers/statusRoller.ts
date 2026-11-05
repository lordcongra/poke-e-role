import OBR from '@owlbear-rodeo/sdk';
import type { CharacterState, StatusItem } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import {
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal,
    getRankBonusStats,
    getPainPenalty
} from '@/utils/combat/combatMath';
import { parseCombatTags } from '@/utils/tagParser/index';
import { rollDicePlus } from '@/utils/combat/diceRoller';
import { getCharacterNickname, formatMathModifier, formatTagString } from './rollerCommon';

export async function rollStatus(status: StatusItem, state: CharacterState) {
    const nickname = getCharacterNickname(state);
    let dicePool = 0;
    let attribute = 'ins';
    let usesSkill = false;

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const customStatus = state.roomCustomStatuses.find((s) => s.name === status.name || s.name === status.customName);

    if (customStatus && customStatus.recoveryAttr && customStatus.recoveryAttr !== 'none') {
        attribute = customStatus.recoveryAttr;
        if (customStatus.recoverySkill && customStatus.recoverySkill !== 'none') {
            usesSkill = true;
        }
        dicePool =
            calculateStatTotal(customStatus.recoveryAttr, state, itemBuffs) +
            calculateSkillTotal(customStatus.recoverySkill || 'none', state, itemBuffs);
    } else if (status.name.includes('Burn')) {
        attribute = 'dex';
        usesSkill = true;
        dicePool = calculateStatTotal('dex', state, itemBuffs) + calculateSkillTotal('athletic', state, itemBuffs);
        useCharacterStore.getState().incrementAction();
    } else if (status.name === 'Paralysis') {
        attribute = 'str';
        usesSkill = true;
        dicePool = calculateStatTotal('str', state, itemBuffs) + calculateSkillTotal('medicine', state, itemBuffs);
    } else if (status.name === 'Sleep' || status.name === 'Confusion') {
        attribute = 'ins';
        dicePool = calculateStatTotal('ins', state, itemBuffs);
        if (status.name === 'Sleep') useCharacterStore.getState().incrementAction();
    } else if (status.name === 'In Love') {
        attribute = 'ins';
        dicePool = Math.max(state.derived.loyal, calculateStatTotal('ins', state, itemBuffs));
    } else {
        if (OBR.isAvailable) {
            OBR.notification.show(`[WARNING] ${status.name} does not have a standard self-recovery roll.`, 'WARNING');
        }
        return;
    }

    const rankSkillBonus = usesSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;
    if (rankSkillBonus > 0) {
        dicePool += rankSkillBonus;
    }

    const pain = getPainPenalty(attribute, state, itemBuffs);

    const successModifier = state.trackers.globalSucc + pain;
    const mathModifier = formatMathModifier(successModifier);

    const tags: string[] = [];
    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}: ${pain} Succ`);
    if (state.trackers.globalSucc !== 0) {
        tags.push(`Tracker Mod: ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }

    const tagString = formatTagString(tags);
    const rollType = status.name === 'Confusion' ? 'roll' : 'status';

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `${nickname} rolled ${status.name} Recovery!${tagString}`,
        rollType,
        status.id
    );
}

