import OBR from '@owlbear-rodeo/sdk';
import type { MoveData, CharacterState, StatusItem, SkillCheck } from '../store/storeTypes';
import { useCharacterStore } from '../store/useCharacterStore';
import {
    ATTRIBUTE_MAPPING,
    getPainPenalty,
    getStatusPenalties,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal
} from './combatMath';
import { parseCombatTags } from './tagParser';
import { rollDicePlus } from './diceRoller';

export async function rollStatus(status: StatusItem, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    let dicePool = 0;
    let attribute = 'ins';

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const customStatus = state.roomCustomStatuses.find((s) => s.name === status.name || s.name === status.customName);

    if (customStatus && customStatus.recoveryAttr && customStatus.recoveryAttr !== 'none') {
        attribute = customStatus.recoveryAttr;
        dicePool =
            calculateStatTotal(customStatus.recoveryAttr, state, itemBuffs) +
            calculateSkillTotal(customStatus.recoverySkill || 'none', state, itemBuffs);
    } else if (status.name.includes('Burn')) {
        attribute = 'dex';
        dicePool = calculateStatTotal('dex', state, itemBuffs) + calculateSkillTotal('athletic', state, itemBuffs);
    } else if (status.name === 'Paralysis') {
        attribute = 'str';
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
            OBR.notification.show(`⚠️ ${status.name} does not have a standard self-recovery roll.`, 'WARNING');
        }
        return;
    }

    const pain = getPainPenalty(attribute, state);
    const successModifier = state.trackers.globalSucc + pain;
    const mathModifier =
        successModifier !== 0 ? (successModifier > 0 ? `+${successModifier}` : `${successModifier}`) : '';

    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (state.trackers.globalSucc !== 0)
        tags.push(`Net Mod ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);

    const tagString = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    const rollType = status.name === 'Confusion' ? 'roll' : 'status';

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `🩹 ${nickname} rolled ${status.name} Recovery!${tagString}`,
        rollType,
        status.id
    );
}

export async function rollAccuracy(move: MoveData, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const actions = state.trackers.actions;
    const requiredSuccesses = actions + 1;
    const moveDescription = (move.desc || '').toLowerCase();
    const safeMoveName = (move.name || '').toLowerCase().trim();
    const abilityString = state.identity.ability || '';

    const statuses = getStatusPenalties(state);
    const isSleepMove = safeMoveName === 'sleep talk' || safeMoveName === 'snore';
    const hasComatose = abilityString.toLowerCase().includes('comatose');

    if (statuses.isAsleep && !isSleepMove && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show('⚠️ You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalAcc + itemBuffs.acc;

    let moveLowAccuracy = 0;
    let ignoredAccuracyPenalty = 0;
    const lowAccuracyMatch = moveDescription.match(/low accuracy\s*(\d+)/i);
    if (lowAccuracyMatch) {
        const baseLowAccuracy = parseInt(lowAccuracyMatch[1]) || 0;
        moveLowAccuracy = Math.max(0, baseLowAccuracy - itemBuffs.ignoreLowAcc);
        ignoredAccuracyPenalty = baseLowAccuracy - moveLowAccuracy;
    }

    const pain = getPainPenalty(move.acc1, state);
    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const successModifier = genericSuccessModifier - moveLowAccuracy;
    const mathModifier =
        successModifier !== 0 ? (successModifier > 0 ? `+${successModifier}` : `${successModifier}`) : '';

    const attributeTotal = calculateStatTotal(move.acc1, state, itemBuffs);
    const skillTotal = calculateSkillTotal(move.acc2, state, itemBuffs);

    let dicePool = attributeTotal + skillTotal + extraDice;
    if (move.acc1 === 'dex') dicePool += statuses.paralysisDexterityPenalty;

    let customFirstHitAccTag = '';
    if (itemBuffs.firstHitAcc !== 0 && state.trackers.firstHitAcc) {
        dicePool += itemBuffs.firstHitAcc;
        const sign = itemBuffs.firstHitAcc > 0 ? '+' : '';
        customFirstHitAccTag = `First Hit (${sign}${itemBuffs.firstHitAcc} Dice)`;
        useCharacterStore.getState().updateTracker('firstHitAcc', false);
    }

    let criticalRequirement = requiredSuccesses + 3;
    const hasItemHighCrit = itemBuffs.highCritStacks > 0;
    const hasMoveHighCrit = moveDescription.includes('high critical');
    const baseCriticalReductions = hasItemHighCrit || hasMoveHighCrit ? 1 : 0;
    let totalCriticalReductions = baseCriticalReductions + itemBuffs.stackingHighCritStacks;

    if (abilityString.includes('super luck')) totalCriticalReductions++;
    criticalRequirement = Math.max(1, criticalRequirement - totalCriticalReductions);

    useCharacterStore.getState().incrementAction();

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (ignoredAccuracyPenalty > 0) tags.push(`Ignored ${ignoredAccuracyPenalty} Low Acc`);
    if (moveLowAccuracy > 0) tags.push(`Low Accuracy ${moveLowAccuracy}`);
    if (genericSuccessModifier !== 0)
        tags.push(`Net Mod ${genericSuccessModifier > 0 ? '+' : ''}${genericSuccessModifier} Succ`);
    if (statuses.paralysisDexterityPenalty < 0 && move.acc1 === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (customFirstHitAccTag) tags.push(customFirstHitAccTag);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);

    tags.push(`Need ${requiredSuccesses} Succ`);
    tags.push(`Crit on ${criticalRequirement}+`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else if (isSleepMove) tags.push(`ASLEEP (Bypassed)`);
        else tags.push(`ASLEEP`);
    }

    if (statuses.isFrozen) {
        tags.push(`❄️ FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    if (moveDescription.includes('never miss') || moveDescription.includes('cannot be evaded')) {
        tags.push(`CANNOT BE EVADED`);
    }

    if (itemBuffs.accItemNames.length > 0) tags.push(`Item: ${itemBuffs.accItemNames.join(', ')}`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `🎯 ${nickname} rolled ${move.name || 'a Move'} (Acc)!${finalTags}`
    );
}

export async function executeDamageRoll(
    move: MoveData,
    state: CharacterState,
    baseDamage: number,
    isCritical: boolean,
    isSuperEffective: boolean,
    reduction: number
) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityString = (state.identity.ability || '').toLowerCase();
    const typingString = `${state.identity.type1} / ${state.identity.type2}`;
    const statuses = getStatusPenalties(state);

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);

    let actualDicePool = baseDamage - reduction;

    let superEffectiveDamageBonus = 0;
    if (isSuperEffective) {
        state.inventory
            .filter((item) => item.active)
            .forEach((item) => {
                const itemDescription = (item.desc || '').toLowerCase();
                const superEffectiveMatches = itemDescription.matchAll(/\[dmg\s*([+-]?\d+):\s*super effective\]/gi);
                for (const match of superEffectiveMatches) {
                    superEffectiveDamageBonus += parseInt(match[1]) || 0;
                }
            });
        actualDicePool += superEffectiveDamageBonus;
    }

    const isProtean = abilityString.includes('protean') || abilityString.includes('libero');
    const hasTypeMatch = move.type && typingString.includes(move.type);
    const isSniper = abilityString.includes('sniper');
    const normalizedDamageStatistic = ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1;

    if (isCritical) {
        actualDicePool += isSniper ? 3 : 2;
    }

    if (normalizedDamageStatistic === 'dex' && statuses.paralysisDexterityPenalty < 0) {
        actualDicePool += statuses.paralysisDexterityPenalty;
    }

    actualDicePool = Math.max(1, actualDicePool);

    let stabBonus = 0;
    let stabTag = '';
    if (hasTypeMatch || isProtean) {
        stabBonus = 1;
        stabTag = isProtean && !hasTypeMatch ? ' Protean STAB' : ' STAB';
    }

    const isTera = state.identity.activeTransformation === 'Terastallize';
    const teraAffinity = state.identity.terastallizeAffinity;
    const teraBonusActive = state.identity.terastallizeBonusActive;
    let teraBonusTags = '';

    if (isTera && move.type === teraAffinity) {
        if (teraBonusActive) {
            const matchesOriginal = state.identity.type1 === teraAffinity || state.identity.type2 === teraAffinity;
            teraBonusTags = matchesOriginal ? 'Tera Burst (+3 Dice)' : 'Tera Burst (+2 Dice)';
            useCharacterStore.getState().setIdentity('terastallizeBonusActive', false);
        } else {
            teraBonusTags = 'Tera Boost (+1 Dice)';
        }
    }

    let customFirstHitTag = '';
    if (itemBuffs.firstHitDmg !== 0 && state.trackers.firstHitDmg) {
        const sign = itemBuffs.firstHitDmg > 0 ? '+' : '';
        customFirstHitTag = `First Hit (${sign}${itemBuffs.firstHitDmg} Dice)`;
        useCharacterStore.getState().updateTracker('firstHitDmg', false);
    }

    const pain = getPainPenalty(normalizedDamageStatistic, state);
    const successModifier = state.trackers.globalSucc + pain;
    const mathModifier =
        successModifier !== 0 ? (successModifier > 0 ? `+${successModifier}` : `${successModifier}`) : '';

    const tags: string[] = [];
    if (isCritical) {
        if (isSniper) tags.push(`Sniper Crit (+3 Dice)`);
        else tags.push(`CRITICAL HIT`);
    }
    if (isSuperEffective) tags.push(`Super Effective`);
    if (superEffectiveDamageBonus > 0) tags.push(`Item SE Dmg +${superEffectiveDamageBonus}`);

    if (teraBonusTags) tags.push(teraBonusTags);
    else if (stabBonus > 0) tags.push(stabTag);

    if (customFirstHitTag) tags.push(customFirstHitTag);

    if (itemBuffs.gainTempHp > 0) tags.push(`🛡️ Gains ${itemBuffs.gainTempHp} Temp HP`);
    if (itemBuffs.tempHpOnHit > 0) tags.push(`🛡️ Gains ${itemBuffs.tempHpOnHit} Temp HP on Hit`);
    if (itemBuffs.tempHpDmgRatio) tags.push(`🛡️ Gains ${itemBuffs.tempHpDmgRatio} Dmg as Temp HP`);

    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (successModifier !== 0) tags.push(`Net Mod ${successModifier > 0 ? '+' : ''}${successModifier} Succ`);

    const moveDescription = (move.desc || '').toLowerCase();

    if (moveDescription.includes('powder') || moveDescription.includes('spore')) {
        tags.push(`POWDER: Grass-types are immune`);
    }
    if (
        moveDescription.includes('recoil') ||
        itemBuffs.dmgItemNames.some(
            (itemName: string) =>
                itemName.toLowerCase().includes('life orb') || itemName.toLowerCase().includes('recoil')
        )
    ) {
        tags.push(`RECOIL: Roll success as user dmg ignoring def`);
    }

    if (statuses.paralysisDexterityPenalty < 0 && normalizedDamageStatistic === 'dex')
        tags.push(`Paralysis minus 2 Dmg`);

    if (itemBuffs.dmgItemNames.length > 0) tags.push(`Item: ${itemBuffs.dmgItemNames.join(', ')}`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    // Bundle the flat On Hit value and the Dmg Ratio into a single payload string
    const ratioPayload = itemBuffs.tempHpDmgRatio || '0';
    const flatPayload = itemBuffs.tempHpOnHit || 0;
    const payload = `${flatPayload}_${ratioPayload}`;

    await rollDicePlus(
        `${actualDicePool}d6>3${mathModifier}`,
        `💥 ${nickname} rolled ${move.name || 'Damage'} (Dmg)!${finalTags}`,
        'damage',
        payload
    );
}

export async function rollSkillCheck(check: SkillCheck, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityString = state.identity.ability || '';
    const statuses = getStatusPenalties(state);
    const hasComatose = abilityString.toLowerCase().includes('comatose');

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show('⚠️ You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const attributeTotal = calculateStatTotal(check.attr, state, itemBuffs);
    const skillTotal = calculateSkillTotal(check.skill, state, itemBuffs);

    let dicePool = attributeTotal + skillTotal;
    if (check.attr === 'dex') dicePool += statuses.paralysisDexterityPenalty;

    const pain = getPainPenalty(check.attr, state);
    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);

    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathModifier =
        genericSuccessModifier !== 0
            ? genericSuccessModifier > 0
                ? `+${genericSuccessModifier}`
                : `${genericSuccessModifier}`
            : '';
    if (genericSuccessModifier !== 0)
        tags.push(`Net Mod ${genericSuccessModifier > 0 ? '+' : ''}${genericSuccessModifier} Succ`);

    const chancesUsed = state.trackers.chances;

    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexterityPenalty < 0 && check.attr === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) {
        tags.push(`❄️ FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';
    const rollName = (check.name || '').trim() || 'Skill Check';

    await rollDicePlus(`${Math.max(1, dicePool)}d6>3${mathModifier}`, `🎲 ${nickname} rolled ${rollName}!${finalTags}`);
}
