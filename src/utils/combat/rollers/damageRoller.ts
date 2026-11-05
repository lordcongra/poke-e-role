import type { MoveData, CharacterState } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import {
    ATTRIBUTE_MAPPING,
    getStatusPenalties,
    getAbilityText,
    getPainPenalty,
    getWeatherDamageBonus,
    getFieldAuraDamageBonus,
    calculateBaseDamage
} from '@/utils/combat/combatMath';
import { parseCombatTags } from '@/utils/tagParser/index';
import { rollDicePlus } from '@/utils/combat/diceRoller';
import { isTargetAffectedByAbility, matchesTarget } from '@/utils/combat/abilityTargetingUtils';
import { resolveCharacterSide } from '@/utils/combat/combatantSideUtils';
import {
    getCharacterNickname,
    formatTagString,
    getStatStageModifier,
    resolveAnalyticBonus
} from './rollerCommon';

export async function executeDamageRoll(
    move: MoveData,
    state: CharacterState,
    baseDamage: number,
    isCritical: boolean,
    effectiveness: number,
    reduction: number,
    override: { active: boolean; type: 'dice' | 'flat' | 'dice-ignore'; value: number },
    fieldFactors?: string[],
    flatReduction: number = 0,
    target?: string | { id?: string; tokenId?: string; entityId?: string; name?: string },
    isImmune: boolean = false
) {
    const nickname = getCharacterNickname(state);
    const abilityString = (state.identity.ability || '').toLowerCase();
    const typingString = `${state.identity.type1} / ${state.identity.type2}`;
    const statuses = getStatusPenalties(state);

    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);

    let actualDicePool = baseDamage - reduction;
    let finalFlatMod = state.trackers.globalSucc;
    const tags: string[] = [];

    if (fieldFactors && fieldFactors.length > 0) {
        const normalizedFactors = fieldFactors.map((f) => f.replace('-1 Dmg', '-1 Damage'));
        tags.push(`Factors: ${normalizedFactors.join(', ')}`);
    }

    if (flatReduction > 0) {
        finalFlatMod -= flatReduction;
    }

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

    if (itemBuffs.dmgSucc !== 0 && (!override.active || override.type !== 'flat')) {
        finalFlatMod += itemBuffs.dmgSucc;
    }

    const activeBoost = state.trackers.activeCombatBoost;
    if (activeBoost) {
        const moveType = (move.type || '').trim().toLowerCase();
        const boostType = (activeBoost.type || '').trim().toLowerCase();
        const isMatchingType = !boostType || boostType === moveType;
        const isPendingForThisMove = activeBoost.stage === 'pending_damage' && activeBoost.moveId === move.id;
        const isArmedAndMatching = activeBoost.stage === 'armed' && isMatchingType;

        if (isPendingForThisMove || isArmedAndMatching) {
            if (activeBoost.dmgSucc > 0 && (!override.active || override.type !== 'flat')) {
                finalFlatMod += activeBoost.dmgSucc;
                tags.push(`Item: ${activeBoost.sourceName} (+${activeBoost.dmgSucc} Dmg Succ)`);
            }
            useCharacterStore.getState().clearActiveCombatBoost();
        }
    }

    let superEffectiveDamageBonus = 0;
    if (effectiveness > 0) {
        superEffectiveDamageBonus = itemBuffs.seDmg;
        if (superEffectiveDamageBonus > 0 && (!override.active || override.type !== 'flat')) {
            actualDicePool += superEffectiveDamageBonus;
        }
    }

    if (isCritical) {
        const critDiceBonus = 2 + (itemBuffs.critDmg || 0);
        if (!override.active || override.type !== 'flat') {
            actualDicePool += critDiceBonus;
        }
        if (itemBuffs.critDmg > 0) {
            tags.push(`Critical Hit (+${critDiceBonus} Dice)`);
        } else {
            tags.push(`CRITICAL HIT`);
        }
    }

    const rawPain = getPainPenalty(move.dmg1, state);
    const pain = getPainPenalty(move.dmg1, state, itemBuffs, move);
    if (pain < 0) {
        finalFlatMod += pain;
        tags.push(`Pain Penalty ${Math.abs(pain)}: ${pain} Succ`);
    } else if (rawPain < 0 && itemBuffs.ignorePain) {
        tags.push('Ignored Pain Penalty');
    }

    if (state.trackers.globalSucc !== 0) {
        tags.push(`Tracker Mod: ${state.trackers.globalSucc > 0 ? '+' : ''}${state.trackers.globalSucc} Succ`);
    }
    if (state.trackers.globalDmg !== 0) {
        const sign = state.trackers.globalDmg > 0 ? '+' : '';
        const diceWord = Math.abs(state.trackers.globalDmg) === 1 ? 'Die' : 'Dice';
        tags.push(`Tracker Mod: ${sign}${state.trackers.globalDmg} Dmg ${diceWord}`);
    }
    const dmg1Stage = getStatStageModifier(move.dmg1, state);
    if (dmg1Stage && dmg1Stage.stage !== 0) {
        const sign = dmg1Stage.stage > 0 ? '+' : '';
        const diceWord = Math.abs(dmg1Stage.stage) === 1 ? 'Die' : 'Dice';
        const label = dmg1Stage.stage > 0 ? `${dmg1Stage.name} Buff` : `${dmg1Stage.name} Debuff`;
        tags.push(`${label} (${sign}${dmg1Stage.stage} ${diceWord})`);
    }

    if (isImmune) {
        actualDicePool = 0;
        finalFlatMod = 0;
        tags.push('IMMUNE: 0 Damage');
        tags.push(`${nickname} is IMMUNE to ${move.type || 'this'} attacks (0 Damage)`);
        console.log(`[CombatRoller] ${nickname} is IMMUNE to ${move.type || 'this'} attacks (0 Damage)`);
    } else if (effectiveness > 0) {
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

    const dualScaleMatch = (move.desc || '').match(/\[\s*(Dual Scale:[^\]]+)\]/i);
    if (dualScaleMatch && !tags.includes(dualScaleMatch[1])) {
        tags.push(dualScaleMatch[1]);
    }

    const sideName = resolveCharacterSide(state);
    const rollerSide: 'player' | 'foe' = sideName !== 'none' ? sideName : state.identity.isNPC ? 'foe' : 'player';
    const rollerId = [
        state.identity.entityId,
        state.tokenId,
        state.identity.nickname,
        state.identity.species
    ].filter((id): id is string => Boolean(id));

    if (!override.active || override.type !== 'flat') {
        if (move.category === 'Special' && isTargetAffectedByAbility(rollerId, rollerSide, 'battery', state.activeBattlefield || null)) {
            actualDicePool += 1;
            tags.push('Battery (+1 Damage)');
        }
        if (
            (move.category === 'Physical' || move.category === 'Special') &&
            isTargetAffectedByAbility(rollerId, rollerSide, 'power spot', state.activeBattlefield || null)
        ) {
            actualDicePool += 1;
            tags.push('Power Spot (+1 Damage)');
        }
        if (
            move.type?.toLowerCase() === 'steel' &&
            isTargetAffectedByAbility(rollerId, rollerSide, 'steely spirit', state.activeBattlefield || null)
        ) {
            const hasSelfSteely =
                itemBuffs.dmgAbilityNames?.some((a) => a.toLowerCase().includes('steely spirit')) ||
                tags.some((t) => t.toLowerCase().includes('steely spirit'));
            if (!hasSelfSteely) {
                actualDicePool += 1;
                tags.push('Steely Spirit (+1 Damage)');
            }
        }

        const cleanAbility = (state.identity.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
        if (cleanAbility === 'analytic' && state.identity.abilityActive !== false) {
            if (await resolveAnalyticBonus(state, rollerId, rollerSide)) {
                actualDicePool += 1;
                tags.push('Analytic (+1 Damage)');
            }
        }

        if (cleanAbility === 'stakeout' && state.identity.abilityActive !== false) {
            const stakeoutTargetId = state.identity.abilityTargetIds?.[0];
            const targetObj = target
                ? typeof target === 'string'
                    ? { id: target, tokenId: target, entityId: target, name: target }
                    : target
                : undefined;
            const isMatched = Boolean(
                stakeoutTargetId && targetObj && matchesTarget(targetObj, stakeoutTargetId)
            );

            const rawBase = calculateBaseDamage(move, state);
            const baseHadStakeout = baseDamage >= rawBase && rawBase > 0;

            if (isMatched) {
                if (!baseHadStakeout) {
                    actualDicePool += 1;
                }
                tags.push('Stakeout (+1 Damage)');
            } else if (baseHadStakeout) {
                actualDicePool = Math.max(1, actualDicePool - 1);
            }
        }

        if (statuses.paralysisDexterityPenalty < 0 && normalizedDamageStatistic === 'dex') {
            tags.push(`Paralysis: -2 Dice`);
        }

        // --- PULL FROM THE BANK ---
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

        if (reduction > 0 && baseDamage - reduction <= 0 && actualDicePool <= 1) {
            tags.push('Min 1 Die vs Def');
        }

        actualDicePool = Math.max(1, actualDicePool);

        const isProtean = abilityString.includes('protean') || abilityString.includes('libero');
        const hasTypeMatch = move.type && typingString.includes(move.type);

        let stabBonus = 0;
        let stabTag = '';
        if (hasTypeMatch || isProtean) {
            stabBonus = 1;
            stabTag = isProtean && !hasTypeMatch ? 'Protean STAB (+1 Die)' : 'STAB (+1 Die)';
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

        const isHalfHp = state.health.hpCurr <= Math.floor(state.health.hpMax / 2);
        const weatherInfo = getWeatherDamageBonus(
            move.type,
            state.activeBattlefield,
            isHalfHp,
            state.identity.isNPC,
            state
        );
        if (weatherInfo.diceBonus > 0) {
            actualDicePool += weatherInfo.diceBonus;
        }
        if (weatherInfo.flatPenalty > 0) {
            finalFlatMod -= weatherInfo.flatPenalty;
        }
        if (weatherInfo.tag) {
            tags.push(weatherInfo.tag);
        }

        const fieldAuraInfo = getFieldAuraDamageBonus(
            move.type,
            state.activeBattlefield,
            state.identity.isNPC,
            state
        );
        if (fieldAuraInfo.diceBonus !== 0) {
            actualDicePool += fieldAuraInfo.diceBonus;
        }
        if (fieldAuraInfo.tag) {
            tags.push(fieldAuraInfo.tag);
        }
    }

    const allDmgSourceTexts = [
        ...(itemBuffs.dmgPassiveNames || []),
        ...(itemBuffs.dmgItemNames || []),
        ...(itemBuffs.dmgAbilityNames || [])
    ].join(' ');
    const hasSourcedTempHp = /temp\s*hp/i.test(allDmgSourceTexts);

    if (itemBuffs.gainTempHp > 0 && !hasSourcedTempHp) tags.push(`Gains ${itemBuffs.gainTempHp} Temp HP`);
    if (itemBuffs.tempHpOnHit > 0 && !hasSourcedTempHp) tags.push(`Gains ${itemBuffs.tempHpOnHit} Temp HP on Hit`);
    if (itemBuffs.tempHpDmgRatio && !hasSourcedTempHp) tags.push(`Gains ${itemBuffs.tempHpDmgRatio} Dmg as Temp HP`);

    const moveDescription = (move.desc || '').toLowerCase();
    if (moveDescription.includes('powder') || moveDescription.includes('spore')) {
        tags.push(`POWDER: Grass-types are immune`);
    }

    const pureDmgItems = Array.from(
        new Set(itemBuffs.dmgItemNames.filter((name) => !itemBuffs.dmgPassiveNames?.includes(name)))
    );
    for (const item of pureDmgItems) {
        const tagStr = `Item: ${item}`;
        if (!tags.includes(tagStr)) {
            tags.push(tagStr);
        }
    }
    if (itemBuffs.dmgPassiveNames && itemBuffs.dmgPassiveNames.length > 0) {
        const uniquePassives = Array.from(new Set(itemBuffs.dmgPassiveNames));
        for (const passive of uniquePassives) {
            const tagStr = `Passive: ${passive}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }
    if (itemBuffs.dmgAbilityNames && itemBuffs.dmgAbilityNames.length > 0) {
        const uniqueAbilities = Array.from(new Set(itemBuffs.dmgAbilityNames));
        for (const ability of uniqueAbilities) {
            const tagStr = `Ability: ${ability}`;
            if (!tags.includes(tagStr)) {
                tags.push(tagStr);
            }
        }
    }

    const pureDmgSuccItems = (itemBuffs.dmgSuccItemNames || []).filter(
        (name) => !itemBuffs.dmgSuccPassiveNames?.includes(name)
    );
    for (const item of Array.from(new Set(pureDmgSuccItems))) {
        const tagStr = `Item: ${item}`;
        if (!tags.includes(tagStr)) tags.push(tagStr);
    }
    for (const passive of Array.from(new Set(itemBuffs.dmgSuccPassiveNames || []))) {
        const tagStr = `Passive: ${passive}`;
        if (!tags.includes(tagStr)) tags.push(tagStr);
    }
    for (const ability of Array.from(new Set(itemBuffs.dmgSuccAbilityNames || []))) {
        const tagStr = `Ability: ${ability}`;
        if (!tags.includes(tagStr)) tags.push(tagStr);
    }
    if (
        itemBuffs.dmgSucc !== 0 &&
        pureDmgSuccItems.length === 0 &&
        (!itemBuffs.dmgSuccPassiveNames || itemBuffs.dmgSuccPassiveNames.length === 0) &&
        (!itemBuffs.dmgSuccAbilityNames || itemBuffs.dmgSuccAbilityNames.length === 0)
    ) {
        const sign = itemBuffs.dmgSucc > 0 ? '+' : '';
        tags.push(`Item: ${sign}${itemBuffs.dmgSucc} Dmg Succ`);
    }

    if (isImmune) {
        actualDicePool = 0;
        finalFlatMod = 0;
    }

    const finalTags = formatTagString(tags);
    const mathModifier = finalFlatMod !== 0 ? (finalFlatMod > 0 ? `+${finalFlatMod}` : `${finalFlatMod}`) : '';

    // Extract the flat SE modifier so the dice engine can check if it needs to negate it on 0 base successes
    let seFlatMod = 0;
    if (!isImmune && effectiveness > 0 && (!override.active || override.type !== 'flat')) {
        seFlatMod = effectiveness;
    }

    // Bundle the flat On Hit value, the Dmg Ratio, and the SE Flat Mod into a single payload string
    const ratioPayload = itemBuffs.tempHpDmgRatio || '0';
    const flatPayload = itemBuffs.tempHpOnHit || 0;
    const payload = `${flatPayload}_${ratioPayload}_${seFlatMod}`;

    const diceToRoll = isImmune || (override.active && override.type === 'flat') ? 0 : Math.max(1, actualDicePool);

    await rollDicePlus(
        `${diceToRoll}d6>3${mathModifier}`,
        `${nickname} rolled ${move.name || 'Damage'} (Dmg)!${finalTags}`,
        'damage',
        payload
    );

    return { diceToRoll, finalTags, tags };
}
