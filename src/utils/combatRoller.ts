import OBR from '@owlbear-rodeo/sdk';
import type { MoveData, CharacterState, StatusItem } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { useCharacterStore } from '../store/useCharacterStore';
import { ATTRIBUTE_MAPPING, parseCombatTags, getPainPenalty, getStatusPenalties, getAbilityText } from './combatMath';
import { rollDicePlus } from './diceRoller';

export async function rollStatus(status: StatusItem, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    let dicePool = 0;
    let attribute = 'ins';

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    if (status.name.includes('Burn')) {
        attribute = 'dex';
        dicePool =
            Math.max(
                1,
                state.stats.dex.base +
                    state.stats.dex.rank +
                    state.stats.dex.buff -
                    state.stats.dex.debuff +
                    (itemBuffs.stats.dex || 0)
            ) +
            state.skills.athletic.base +
            state.skills.athletic.buff +
            (itemBuffs.skills.athletic || 0);
    } else if (status.name === 'Paralysis') {
        attribute = 'str';
        dicePool =
            Math.max(
                1,
                state.stats.str.base +
                    state.stats.str.rank +
                    state.stats.str.buff -
                    state.stats.str.debuff +
                    (itemBuffs.stats.str || 0)
            ) +
            state.skills.medicine.base +
            state.skills.medicine.buff +
            (itemBuffs.skills.medicine || 0);
    } else if (status.name === 'Sleep' || status.name === 'Confusion') {
        attribute = 'ins';
        dicePool = Math.max(
            1,
            state.stats.ins.base +
                state.stats.ins.rank +
                state.stats.ins.buff -
                state.stats.ins.debuff +
                (itemBuffs.stats.ins || 0)
        );
        if (status.name === 'Sleep') useCharacterStore.getState().incrementAction();
    } else if (status.name === 'In Love') {
        attribute = 'ins';
        dicePool = Math.max(
            state.derived.loyal,
            Math.max(
                1,
                state.stats.ins.base +
                    state.stats.ins.rank +
                    state.stats.ins.buff -
                    state.stats.ins.debuff +
                    (itemBuffs.stats.ins || 0)
            )
        );
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
    const successModifier = state.trackers.globalSucc - moveLowAccuracy + statuses.confusionPenalty + pain;
    const mathModifier =
        successModifier !== 0 ? (successModifier > 0 ? `+${successModifier}` : `${successModifier}`) : '';

    let attributeTotal = 0;
    if (move.acc1 === 'will') {
        attributeTotal = state.will.willMax;
    } else if (state.stats[move.acc1 as CombatStat]) {
        const statistic = state.stats[move.acc1 as CombatStat];
        attributeTotal = Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[move.acc1] || 0)
        );
    } else if (state.socials[move.acc1 as SocialStat]) {
        const statistic = state.socials[move.acc1 as SocialStat];
        attributeTotal = Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[move.acc1] || 0)
        );
    }

    let skillTotal = 0;
    if (move.acc2 !== 'none' && state.skills[move.acc2 as Skill]) {
        const skillData = state.skills[move.acc2 as Skill];
        skillTotal = skillData.base + skillData.buff + (itemBuffs.skills[move.acc2] || 0);
    } else if (move.acc2 !== 'none') {
        for (const category of state.extraCategories) {
            const customSkill = category.skills.find((s) => s.id === move.acc2);
            if (customSkill) {
                skillTotal = customSkill.base + customSkill.buff + (itemBuffs.skills[move.acc2] || 0);
                break;
            }
        }
    }

    let dicePool = attributeTotal + skillTotal + extraDice;
    if (move.acc1 === 'dex') dicePool += statuses.paralysisDexterityPenalty;

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
    if (successModifier !== 0) tags.push(`Net Mod ${successModifier > 0 ? '+' : ''}${successModifier} Succ`);
    if (statuses.paralysisDexterityPenalty < 0 && move.acc1 === 'dex') tags.push(`Paralysis: -2 Dice`);
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

    // 🔥 NEW: Check and consume Terastallize Bonus
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
    
    // Log STAB or Tera STAB
    if (teraBonusTags) tags.push(teraBonusTags);
    else if (stabBonus > 0) tags.push(stabTag);
    
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (successModifier !== 0) tags.push(`Net Mod ${successModifier > 0 ? '+' : ''}${successModifier} Succ`);

    const moveDescription = (move.desc || '').toLowerCase();

    if (moveDescription.includes('powder') || moveDescription.includes('spore')) {
        tags.push(`POWDER: Grass-types are immune`);
    }
    if (
        moveDescription.includes('recoil') ||
        itemBuffs.dmgItemNames.some(
            (itemName) => itemName.toLowerCase().includes('life orb') || itemName.toLowerCase().includes('recoil')
        )
    ) {
        tags.push(`RECOIL: Roll success as user dmg ignoring def`);
    }

    if (statuses.paralysisDexterityPenalty < 0 && normalizedDamageStatistic === 'dex')
        tags.push(`Paralysis minus 2 Dmg`);

    if (itemBuffs.dmgItemNames.length > 0) tags.push(`Item: ${itemBuffs.dmgItemNames.join(', ')}`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';

    await rollDicePlus(
        `${actualDicePool}d6>3${mathModifier}`,
        `💥 ${nickname} rolled ${move.name || 'Damage'} (Dmg)!${finalTags}`
    );
}