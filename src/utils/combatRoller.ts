import OBR from '@owlbear-rodeo/sdk';
import type { MoveData, CharacterState, StatusItem, SkillCheck } from '../store/storeTypes';
import { useCharacterStore } from '../store/useCharacterStore';
import {
    ATTRIBUTE_MAPPING,
    getPainPenalty,
    getStatusPenalties,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal,
    getRankBonusStats
} from './combatMath';
import { parseCombatTags } from './tagParser';
import { rollDicePlus } from './diceRoller';

export async function rollStatus(status: StatusItem, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
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

    let pain = getPainPenalty(attribute, state);
    if (itemBuffs.ignorePain) pain = 0;

    const successModifier = state.trackers.globalSucc + pain;
    const mathModifier =
        successModifier !== 0 ? (successModifier > 0 ? `+${successModifier}` : `${successModifier}`) : '';

    const tags: string[] = [];
    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (state.trackers.globalSucc !== 0)
        tags.push(`Net Mod ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);

    const tagString = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    const rollType = status.name === 'Confusion' ? 'roll' : 'status';

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `${nickname} rolled ${status.name} Recovery!${tagString}`,
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
        if (OBR.isAvailable) OBR.notification.show('[WARNING] You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalAcc + itemBuffs.acc;

    let moveLowAccuracy = 0;
    let ignoredAccuracyPenalty = 0;

    // Stack native Low Accuracy with dynamic Low Accuracy injected via Tags
    let baseLowAccuracy = itemBuffs.addLowAcc;
    const lowAccuracyMatch = moveDescription.match(/low accuracy\s*(\d+)/i);
    if (lowAccuracyMatch) {
        baseLowAccuracy += parseInt(lowAccuracyMatch[1]) || 0;
    }

    if (baseLowAccuracy > 0) {
        moveLowAccuracy = Math.max(0, baseLowAccuracy - itemBuffs.ignoreLowAcc);
        ignoredAccuracyPenalty = baseLowAccuracy - moveLowAccuracy;
    }

    let pain = getPainPenalty(move.acc1, state);
    if (itemBuffs.ignorePain) pain = 0;

    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const successModifier = genericSuccessModifier - moveLowAccuracy;
    const mathModifier =
        successModifier !== 0 ? (successModifier > 0 ? `+${successModifier}` : `${successModifier}`) : '';

    const attributeTotal = calculateStatTotal(move.acc1, state, itemBuffs);
    const skillTotal = calculateSkillTotal(move.acc2, state, itemBuffs);

    const hasSkill = Boolean(move.acc2 && move.acc2.toLowerCase() !== 'none');
    const rankSkillBonus = hasSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;

    const normalizedAcc1 = (ATTRIBUTE_MAPPING[move.acc1] || move.acc1 || '').toLowerCase().trim();
    let dicePool = attributeTotal + skillTotal + extraDice + rankSkillBonus;
    if (normalizedAcc1 === 'dex') dicePool += statuses.paralysisDexterityPenalty;

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

    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (ignoredAccuracyPenalty > 0) tags.push(`Ignored ${ignoredAccuracyPenalty} Low Acc`);
    if (moveLowAccuracy > 0) tags.push(`Low Accuracy ${moveLowAccuracy}`);
    if (genericSuccessModifier !== 0)
        tags.push(`Net Mod ${genericSuccessModifier > 0 ? '+' : ''}${genericSuccessModifier} Succ`);
    if (statuses.paralysisDexterityPenalty < 0 && normalizedAcc1 === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (customFirstHitAccTag) tags.push(customFirstHitAccTag);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);

    tags.push(`Need ${requiredSuccesses} Succ`);
    tags.push(`Crit on ${criticalRequirement}+`);

    const isValidForBank = itemBuffs.accFaceAddsDmg > 0 && move.category !== 'Status';

    if (isValidForBank) {
        tags.push(`Acc ${itemBuffs.accFaceAddsDmg}s Add Dmg (Max ${itemBuffs.accFaceAddsDmgLimit})`);
    }

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else if (isSleepMove) tags.push(`ASLEEP (Bypassed)`);
        else tags.push(`ASLEEP`);
    }

    if (statuses.isFrozen) {
        tags.push(`FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    if (moveDescription.includes('never miss') || moveDescription.includes('cannot be evaded')) {
        tags.push(`CANNOT BE EVADED`);
    }

    if (itemBuffs.accItemNames.length > 0) tags.push(`Item: ${itemBuffs.accItemNames.join(', ')}`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    const rollType = isValidForBank ? 'acc_face' : 'roll';
    // Append the limit parameter as the third chunk of the payload so the interceptor can catch it!
    const payload = isValidForBank ? `${move.id}_${itemBuffs.accFaceAddsDmg}_${itemBuffs.accFaceAddsDmgLimit}` : '';

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `${nickname} rolled ${move.name || 'a Move'} (Acc)!${finalTags}`,
        rollType,
        payload
    );
}

export async function executeDamageRoll(
    move: MoveData,
    state: CharacterState,
    baseDamage: number,
    isCritical: boolean,
    effectiveness: number,
    reduction: number,
    override: { active: boolean; type: 'dice' | 'flat' | 'dice-ignore'; value: number }
) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityString = (state.identity.ability || '').toLowerCase();
    const typingString = `${state.identity.type1} / ${state.identity.type2}`;
    const statuses = getStatusPenalties(state);

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);

    let actualDicePool = baseDamage - reduction;
    let finalFlatMod = state.trackers.globalSucc;
    const tags: string[] = [];

    // Deal with Overrides
    if (override.active) {
        if (override.type === 'flat') {
            actualDicePool = 0;
            finalFlatMod = override.value; // Ignore all standard logic for True Damage
            tags.push(`Manual Override: ${override.value} True Damage`);
        } else if (override.type === 'dice') {
            actualDicePool = override.value - reduction;
            finalFlatMod += effectiveness;
            tags.push(`Manual Override: ${override.value} Base Dice`);
        } else if (override.type === 'dice-ignore') {
            actualDicePool = override.value; // Ignore Defense reduction completely
            finalFlatMod += effectiveness;
            tags.push(`Manual Override: ${override.value} Dice (Ignores Def)`);
        }
    } else {
        finalFlatMod += effectiveness;
    }

    let superEffectiveDamageBonus = 0;
    if (effectiveness > 0) {
        superEffectiveDamageBonus = itemBuffs.seDmg;
        if (superEffectiveDamageBonus > 0 && (!override.active || override.type !== 'flat')) {
            actualDicePool += superEffectiveDamageBonus;
        }
    }

    const isSniper = abilityString.includes('sniper');
    if (isCritical) {
        if (!override.active || override.type !== 'flat') {
            actualDicePool += isSniper ? 3 : 2;
        }
        tags.push(isSniper ? `Sniper Crit (+3 Dice)` : `CRITICAL HIT`);
    }

    let pain = getPainPenalty(move.dmg1, state);
    if (itemBuffs.ignorePain) pain = 0;
    if (pain < 0) {
        finalFlatMod += pain;
        tags.push(`Pain Penalty ${Math.abs(pain)}`);
    }

    if (state.trackers.globalSucc !== 0) {
        tags.push(`Net Mod ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }

    if (effectiveness > 0) {
        tags.push(`SUPER EFFECTIVE (+${effectiveness} Succ)`);
        if (superEffectiveDamageBonus > 0 && (!override.active || override.type !== 'flat')) {
            tags.push(`Super Effective Bonus (+${superEffectiveDamageBonus} Dice)`);
        }
    } else if (effectiveness < 0) {
        tags.push(`NOT VERY EFFECTIVE (${effectiveness} Succ)`);
    }

    if (itemBuffs.firstHitDmg !== 0 && state.trackers.firstHitDmg) {
        const sign = itemBuffs.firstHitDmg > 0 ? '+' : '';
        tags.push(`First Hit (${sign}${itemBuffs.firstHitDmg} Dice)`);
        useCharacterStore.getState().updateTracker('firstHitDmg', false);
    }

    const normalizedDamageStatistic = (ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1 || '').toLowerCase().trim();

    if (
        itemBuffs.dmgItemNames.some(
            (itemName: string) =>
                itemName.toLowerCase().includes('life orb') || itemName.toLowerCase().includes('recoil')
        )
    ) {
        tags.push(`RECOIL: Roll success as user dmg ignoring def`);
    }

    if (!override.active || override.type !== 'flat') {
        if (
            statuses.paralysisDexterityPenalty < 0 &&
            normalizedDamageStatistic === 'dex'
        ) {
            tags.push(`Paralysis minus 2 Dmg Dice`);
        }

        // ✨ PULL FROM THE BANK ✨
        let bankedDiceTag = '';
        const bankedDice = state.trackers.bankedAccDice[move.id] || 0;
        if (bankedDice > 0) {
            actualDicePool += bankedDice;
            bankedDiceTag = `Banked Excess Acc (+${bankedDice} Dmg)`;
            // Clear the bank immediately!
            const newBank = { ...state.trackers.bankedAccDice };
            delete newBank[move.id];
            useCharacterStore.getState().updateTracker('bankedAccDice', newBank);
            tags.push(bankedDiceTag);
        }

        actualDicePool = Math.max(1, actualDicePool);

        const isProtean = abilityString.includes('protean') || abilityString.includes('libero');
        const hasTypeMatch = move.type && typingString.includes(move.type);

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

        if (teraBonusTags) tags.push(teraBonusTags);
        else if (stabBonus > 0) tags.push(stabTag);
    }

    if (itemBuffs.gainTempHp > 0) tags.push(`Gains ${itemBuffs.gainTempHp} Temp HP`);
    if (itemBuffs.tempHpOnHit > 0) tags.push(`Gains ${itemBuffs.tempHpOnHit} Temp HP on Hit`);
    if (itemBuffs.tempHpDmgRatio) tags.push(`Gains ${itemBuffs.tempHpDmgRatio} Dmg as Temp HP`);

    const moveDescription = (move.desc || '').toLowerCase();
    if (moveDescription.includes('powder') || moveDescription.includes('spore')) {
        tags.push(`POWDER: Grass-types are immune`);
    }

    if (itemBuffs.dmgItemNames.length > 0) tags.push(`Item: ${itemBuffs.dmgItemNames.join(', ')}`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';
    const mathModifier = finalFlatMod !== 0 ? (finalFlatMod > 0 ? `+${finalFlatMod}` : `${finalFlatMod}`) : '';

    // Extract the flat SE modifier so the dice engine can check if it needs to negate it on 0 base successes
    let seFlatMod = 0;
    if (effectiveness > 0 && (!override.active || override.type !== 'flat')) {
        seFlatMod = effectiveness;
    }

    // Bundle the flat On Hit value, the Dmg Ratio, and the SE Flat Mod into a single payload string
    const ratioPayload = itemBuffs.tempHpDmgRatio || '0';
    const flatPayload = itemBuffs.tempHpOnHit || 0;
    const payload = `${flatPayload}_${ratioPayload}_${seFlatMod}`;

    await rollDicePlus(
        `${actualDicePool}d6>3${mathModifier}`,
        `${nickname} rolled ${move.name || 'Damage'} (Dmg)!${finalTags}`,
        'damage',
        payload
    );
}

export async function rollSkillCheck(check: SkillCheck, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const statuses = getStatusPenalties(state);
    const hasComatose = (state.identity.ability || '').toLowerCase().includes('comatose');

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show('[WARNING] You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const attributeTotal = calculateStatTotal(check.attr, state, itemBuffs);
    const skillTotal = calculateSkillTotal(check.skill, state, itemBuffs);

    const hasSkill = Boolean(check.skill && check.skill.toLowerCase() !== 'none');
    const rankSkillBonus = hasSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;

    const normalizedAttr = (ATTRIBUTE_MAPPING[check.attr] || check.attr || '').toLowerCase().trim();
    let dicePool = attributeTotal + skillTotal + rankSkillBonus;
    if (normalizedAttr === 'dex') dicePool += statuses.paralysisDexterityPenalty;

    let pain = getPainPenalty(check.attr, state);
    if (itemBuffs.ignorePain) pain = 0;

    const tags: string[] = [];
    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
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
    if (statuses.paralysisDexterityPenalty < 0 && normalizedAttr === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) {
        tags.push(`FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';
    const rollName = (check.name || '').trim() || 'Skill Check';

    await rollDicePlus(`${Math.max(1, dicePool)}d6>3${mathModifier}`, `${nickname} rolled ${rollName}!${finalTags}`);
}

export async function rollGeneric(
    actionName: string,
    dicePool: number,
    attribute: string,
    incrementEvade = false,
    incrementClash = false,
    incrementAction = false,
    hasSkill = false
) {
    const state = useCharacterStore.getState();
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const abilityString = (state.identity.ability || '').toLowerCase();

    const statuses = getStatusPenalties(state);
    const hasComatose = abilityString.includes('comatose');

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show('[WARNING] You are Asleep and cannot perform actions!', 'WARNING');
        return;
    }

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

    let pain = getPainPenalty(attribute, state);
    if (itemBuffs.ignorePain) pain = 0;

    const genericSuccessModifier = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathModifier =
        genericSuccessModifier !== 0
            ? genericSuccessModifier > 0
                ? `+${genericSuccessModifier}`
                : `${genericSuccessModifier}`
            : '';

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (genericSuccessModifier !== 0)
        tags.push(`Net Mod ${genericSuccessModifier > 0 ? '+' : ''}${genericSuccessModifier} Succ`);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexterityPenalty < 0 && attribute.toLowerCase() === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }

    if (statuses.isFrozen) {
        tags.push(`FROZEN: Attacking Ice Block (5HP/2DEF). Fire/Super-Effective breaks instantly.`);
    }

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    await rollDicePlus(
        `${Math.max(1, finalDicePool)}d6>3${mathModifier}`,
        `${nickname} rolled ${actionName}!${finalTags}`
    );
}
