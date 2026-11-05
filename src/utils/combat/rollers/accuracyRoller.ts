import type { MoveData, CharacterState } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import {
    getStatusPenalties,
    getAbilityText,
    getPainPenalty,
    getRankBonusStats,
    calculateBaseAccuracy,
    calculateCriticalRequirement
} from '@/utils/combat/combatMath';
import { parseCombatTags } from '@/utils/tagParser/index';
import { rollDicePlus } from '@/utils/combat/diceRoller';
import { isTargetAffectedByAbility } from '@/utils/combat/abilityTargetingUtils';
import { shouldShiftTypeForAbility } from '@/utils/combat/proteanLiberoUtils';
import { resolveCharacterSide } from '@/utils/combat/combatantSideUtils';
import {
    getCharacterNickname,
    formatMathModifier,
    formatTagString,
    checkAsleepGuard,
    hasTailwindActive,
    getStatStageModifier,
    getSkillBuffModifier
} from './rollerCommon';

export async function rollAccuracy(move: MoveData, state: CharacterState) {
    const nickname = getCharacterNickname(state);
    const actions = state.trackers.actions;
    const requiredSuccesses = actions + 1;
    const moveDescription = (move.desc || '').toLowerCase();
    const safeMoveName = (move.name || '').toLowerCase().trim();
    const abilityString = state.identity.ability || '';

    const isSleepMove = safeMoveName === 'sleep talk' || safeMoveName === 'snore';
    if (checkAsleepGuard(state, isSleepMove)) return;

    const statuses = getStatusPenalties(state);
    const hasComatose = abilityString.toLowerCase().includes('comatose');

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);

    let moveLowAccuracy = 0;
    let ignoredAccuracyPenalty = 0;

    // Stack native Low Accuracy with dynamic Low Accuracy injected via Tags
    let baseLowAccuracy = itemBuffs.addLowAcc;
    const lowAccuracyMatch = moveDescription.match(/\[?\s*low acc(?:uracy)?\s*([+-]?\s*\d+)?\s*\]?/i);
    if (lowAccuracyMatch) {
        const val = lowAccuracyMatch[1] ? Math.abs(parseInt(lowAccuracyMatch[1].replace(/\s/g, '')) || 1) : 1;
        baseLowAccuracy += val;
    }

    if (baseLowAccuracy > 0) {
        moveLowAccuracy = Math.max(0, baseLowAccuracy - itemBuffs.ignoreLowAcc);
        ignoredAccuracyPenalty = baseLowAccuracy - moveLowAccuracy;
    }

    const rawPain = getPainPenalty(move.acc1, state);
    const pain = getPainPenalty(move.acc1, state, itemBuffs, move);

    const activeBoost = state.trackers.activeCombatBoost;
    let boostAccSucc = 0;
    let boostAccTag = '';
    if (activeBoost) {
        const moveType = (move.type || '').trim().toLowerCase();
        const boostType = (activeBoost.type || '').trim().toLowerCase();
        const isMatchingType = !boostType || boostType === moveType;

        if (isMatchingType) {
            boostAccSucc = activeBoost.accSucc || 0;
            useCharacterStore.getState().setActiveCombatBoost({
                ...activeBoost,
                stage: 'pending_damage',
                moveId: move.id
            });
            if (boostAccSucc > 0) {
                boostAccTag = `Item: ${activeBoost.sourceName} (+${boostAccSucc} Acc Succ)`;
            }
        } else {
            console.warn(
                `[CombatRoller] Auto-flushing active combat boost (${activeBoost.sourceName}, ${activeBoost.type}) because rolled move (${move.name}, ${move.type}) did not match type requirement.`
            );
            useCharacterStore.getState().clearActiveCombatBoost();
        }
    }

    const genericSuccessModifier =
        state.trackers.globalSucc + statuses.confusionPenalty + pain + (itemBuffs.accSucc || 0) + boostAccSucc;
    const successModifier = genericSuccessModifier - moveLowAccuracy;
    const mathModifier = formatMathModifier(successModifier);

    const hasSkill = Boolean(move.acc2 && move.acc2.toLowerCase() !== 'none');
    const rankSkillBonus = hasSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;
    const normalizedAcc1 = String(move.acc1 || '')
        .trim()
        .toLowerCase();

    const dicePool = calculateBaseAccuracy(move, state, itemBuffs);

    const allAccSourceTexts = [
        ...(itemBuffs.accPassiveNames || []),
        ...(itemBuffs.accItemNames || []),
        ...(itemBuffs.accAbilityNames || [])
    ].join(' ');

    const hasSourcedFirstHit = /first\s*hit/i.test(allAccSourceTexts);
    const hasSourcedIgnorePain = /ignore(?:d)?\s*pain/i.test(allAccSourceTexts);
    const hasSourcedIgnoreLowAcc = /ignore\s*low\s*acc/i.test(allAccSourceTexts);
    const hasSourcedAccBank = /acc\s*\d+s\s*add/i.test(allAccSourceTexts);

    let customFirstHitAccTag = '';
    if (itemBuffs.firstHitAcc !== 0 && state.trackers.firstHitAcc) {
        const sign = itemBuffs.firstHitAcc > 0 ? '+' : '';
        if (!hasSourcedFirstHit) {
            customFirstHitAccTag = `First Hit (${sign}${itemBuffs.firstHitAcc} Dice)`;
        }
        useCharacterStore.getState().updateTracker('firstHitAcc', false);
    }

    const critResult = calculateCriticalRequirement(move, requiredSuccesses, state, itemBuffs);
    const criticalRequirement = critResult.criticalRequirement;

    useCharacterStore.getState().incrementAction();

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    const typeShift = shouldShiftTypeForAbility(
        state.identity.ability,
        state.identity.abilityActive !== false,
        move.category,
        move.type,
        state.identity.type1,
        state.identity.type2
    );
    if (typeShift.shouldShift) {
        useCharacterStore.getState().setIdentity('type1', typeShift.newType);
        useCharacterStore.getState().setIdentity('type2', '');
        tags.push(`Ability: ${typeShift.matchedAbility}`);
    }

    if (boostAccTag) tags.push(boostAccTag);

    if (rankSkillBonus > 0) tags.push('Master/Champion Rank (+2 Dice)');
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}: ${pain} Succ`);
    else if (rawPain < 0 && itemBuffs.ignorePain && !hasSourcedIgnorePain) tags.push('Ignored Pain Penalty');
    if (statuses.confusionPenalty < 0) tags.push(`Confusion: ${statuses.confusionPenalty} Succ`);
    if (ignoredAccuracyPenalty > 0 && !hasSourcedIgnoreLowAcc) tags.push(`Ignored ${ignoredAccuracyPenalty} Low Acc`);
    if (moveLowAccuracy > 0) tags.push(`Low Accuracy ${moveLowAccuracy}: -${moveLowAccuracy} Succ`);
    if (state.trackers.globalSucc !== 0) {
        tags.push(`Tracker Mod: ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }
    if (state.trackers.globalAcc !== 0) {
        const sign = state.trackers.globalAcc > 0 ? '+' : '';
        const diceWord = Math.abs(state.trackers.globalAcc) === 1 ? 'Die' : 'Dice';
        tags.push(`Tracker Mod: ${sign}${state.trackers.globalAcc} Acc ${diceWord}`);
    }
    const acc1Stage = getStatStageModifier(move.acc1, state);
    if (acc1Stage && acc1Stage.stage !== 0) {
        const sign = acc1Stage.stage > 0 ? '+' : '';
        const diceWord = Math.abs(acc1Stage.stage) === 1 ? 'Die' : 'Dice';
        const label = acc1Stage.stage > 0 ? `${acc1Stage.name} Buff` : `${acc1Stage.name} Debuff`;
        tags.push(`${label} (${sign}${acc1Stage.stage} ${diceWord})`);
    }
    const acc2Buff = getSkillBuffModifier(move.acc2, state);
    if (acc2Buff && acc2Buff.buff !== 0) {
        const sign = acc2Buff.buff > 0 ? '+' : '';
        const diceWord = Math.abs(acc2Buff.buff) === 1 ? 'Die' : 'Dice';
        tags.push(`${acc2Buff.name} Buff (${sign}${acc2Buff.buff} ${diceWord})`);
    }
    if (statuses.paralysisDexterityPenalty < 0 && normalizedAcc1 === 'dex') tags.push(`Paralysis: -2 Dice`);

    if (hasTailwindActive(state) && normalizedAcc1 === 'dex') {
        tags.push('Tailwind (+2 Dexterity)');
    }

    if (customFirstHitAccTag) tags.push(customFirstHitAccTag);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);

    tags.push(`Need ${requiredSuccesses} Succ`);
    tags.push(`Crit on ${criticalRequirement}+`);
    for (const expl of critResult.critExplanationTags) {
        if (!tags.includes(expl)) {
            tags.push(expl);
        }
    }

    const isValidForBank = itemBuffs.accFaceAddsDmg > 0 && move.category !== 'Status';

    if (isValidForBank && !hasSourcedAccBank) {
        tags.push(`Acc ${itemBuffs.accFaceAddsDmg}s Add Dmg Dice (Max ${itemBuffs.accFaceAddsDmgLimit})`);
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

    if (itemBuffs.neverMiss) {
        if (!tags.includes('CANNOT BE EVADED')) {
            tags.push('CANNOT BE EVADED');
        }
        for (const source of itemBuffs.neverMissSourceNames) {
            const sourceTag = `${source} (Never Miss)`;
            if (!tags.includes(sourceTag)) {
                tags.push(sourceTag);
            }
        }
    }

    const isPhysOrSpec = move.category === 'Physical' || move.category === 'Special';
    const sideName = resolveCharacterSide(state);
    const rollerSide: 'player' | 'foe' = sideName !== 'none' ? sideName : state.identity.isNPC ? 'foe' : 'player';
    const rollerId = [
        state.identity.entityId,
        state.tokenId,
        state.identity.nickname,
        state.identity.species
    ].filter((id): id is string => Boolean(id));
    if (isPhysOrSpec && isTargetAffectedByAbility(rollerId, rollerSide, 'victory star', state.activeBattlefield || null)) {
        if (!tags.includes('Victory Star (Never Miss)')) {
            tags.push('Victory Star (Never Miss)');
        }
        if (!tags.includes('CANNOT BE EVADED')) {
            tags.push('CANNOT BE EVADED');
        }
    }

    if (move.category === 'Special' && isTargetAffectedByAbility(rollerId, rollerSide, 'battery', state.activeBattlefield || null)) {
        if (!tags.includes('Battery (+1 Damage)')) {
            tags.push('Battery (+1 Damage)');
        }
    }
    if (
        (move.category === 'Physical' || move.category === 'Special') &&
        isTargetAffectedByAbility(rollerId, rollerSide, 'power spot', state.activeBattlefield || null)
    ) {
        if (!tags.includes('Power Spot (+1 Damage)')) {
            tags.push('Power Spot (+1 Damage)');
        }
    }
    if (
        move.type?.toLowerCase() === 'steel' &&
        isTargetAffectedByAbility(rollerId, rollerSide, 'steely spirit', state.activeBattlefield || null)
    ) {
        const hasSelfSteely =
            itemBuffs.accAbilityNames?.some((a) => a.toLowerCase().includes('steely spirit')) ||
            tags.some((t) => t.toLowerCase().includes('steely spirit'));
        if (!hasSelfSteely && !tags.includes('Steely Spirit (+1 Damage)')) {
            tags.push('Steely Spirit (+1 Damage)');
        }
    }

    const dualScaleMatch = (move.desc || '').match(/\[\s*(Dual Scale:[^\]]+)\]/i);
    if (dualScaleMatch && !tags.includes(dualScaleMatch[1])) {
        tags.push(dualScaleMatch[1]);
    }

    const pureItems = itemBuffs.accItemNames.filter((name) => !itemBuffs.accPassiveNames?.includes(name));
    if (pureItems.length > 0) {
        const uniqueItems = Array.from(new Set(pureItems));
        for (const item of uniqueItems) {
            const tagStr = `Item: ${item}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }
    if (itemBuffs.accPassiveNames && itemBuffs.accPassiveNames.length > 0) {
        const uniquePassives = Array.from(new Set(itemBuffs.accPassiveNames));
        for (const passive of uniquePassives) {
            const tagStr = `Passive: ${passive}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }
    if (itemBuffs.accAbilityNames && itemBuffs.accAbilityNames.length > 0) {
        const uniqueAbilities = Array.from(new Set(itemBuffs.accAbilityNames));
        for (const ability of uniqueAbilities) {
            const tagStr = `Ability: ${ability}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }

    const pureAccSuccItems = (itemBuffs.accSuccItemNames || []).filter(
        (name) => !itemBuffs.accSuccPassiveNames?.includes(name)
    );
    for (const item of Array.from(new Set(pureAccSuccItems))) {
        const tagStr = `Item: ${item}`;
        if (!tags.includes(tagStr)) tags.push(tagStr);
    }
    for (const passive of Array.from(new Set(itemBuffs.accSuccPassiveNames || []))) {
        const tagStr = `Passive: ${passive}`;
        if (!tags.includes(tagStr)) tags.push(tagStr);
    }
    for (const ability of Array.from(new Set(itemBuffs.accSuccAbilityNames || []))) {
        const tagStr = `Ability: ${ability}`;
        if (!tags.includes(tagStr)) tags.push(tagStr);
    }
    if (
        itemBuffs.accSucc !== 0 &&
        pureAccSuccItems.length === 0 &&
        (!itemBuffs.accSuccPassiveNames || itemBuffs.accSuccPassiveNames.length === 0) &&
        (!itemBuffs.accSuccAbilityNames || itemBuffs.accSuccAbilityNames.length === 0)
    ) {
        const sign = itemBuffs.accSucc > 0 ? '+' : '';
        tags.push(`Item: ${sign}${itemBuffs.accSucc} Acc Succ`);
    }

    const finalTags = formatTagString(tags);

    const rollType = isValidForBank ? 'acc_face' : 'roll';
    // Append the limit parameter as the third chunk of the payload so the interceptor can catch it!
    const payload = isValidForBank ? `${move.id}_${itemBuffs.accFaceAddsDmg}_${itemBuffs.accFaceAddsDmgLimit}` : '';

    // Calculate Chance Dice from move action, description, tags, item bonuses, and global trackers
    const action = move.attackAction;
    let parsedChance = 0;
    let parsedEffect = '';
    const descText = move.desc || '';
    const chanceMatch = descText.match(/roll\s*(\d+)\s*chance\s*die(?:s)?\s*(?:to|for)\s*([^.]+)/i);
    if (chanceMatch) {
        parsedChance = parseInt(chanceMatch[1], 10) || 0;
        parsedEffect = chanceMatch[2].trim();
    } else {
        const tagMatch = descText.match(/\[\s*chance\s*(\d+)(?::\s*([^\]]+))?\s*\]/i);
        if (tagMatch) {
            parsedChance = parseInt(tagMatch[1], 10) || 0;
            parsedEffect = tagMatch[2]?.trim() || '';
        }
    }
    const baseChance = action?.chanceDice ?? (parsedChance > 0 ? parsedChance : undefined);
    const resolvedEffect = action?.chanceEffect || parsedEffect || undefined;
    const globalChance = state.trackers.globalChance || 0;
    const totalChance = (baseChance !== undefined ? baseChance : 0) + itemBuffs.chance + globalChance;

    const chanceOptions =
        totalChance > 0 && (baseChance !== undefined || itemBuffs.chance > 0 || globalChance > 0)
            ? {
                  chanceDice: totalChance,
                  chanceEffect: resolvedEffect || 'Added Effect'
              }
            : undefined;

    await rollDicePlus(
        `${Math.max(1, dicePool)}d6>3${mathModifier}`,
        `${nickname} rolled ${move.name || 'a Move'} (Acc)!${finalTags}`,
        rollType,
        payload,
        chanceOptions
    );
}

