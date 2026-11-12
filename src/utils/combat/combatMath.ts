import type { MoveData, CharacterState, CustomAbility, Rank, StatData } from '@/store/storeTypes';
import { CombatStat, SocialStat, Skill } from '@/types/enums';
import { parseCombatTags, type CombatBonuses } from '@/utils/tagParser/index';
import { getEffectsByCategory } from '@/utils/combat/fieldEffectsData';
import { resolveCharacterSide, isFlowerGiftActiveForSide } from '@/utils/combat/combatantSideUtils';
import { isAbilitySuppressedByField, isTargetUnderIntimidate, isTargetAffectedByAbility } from '@/utils/combat/abilityTargetingUtils';
import { shouldShiftTypeForAbility } from '@/utils/combat/proteanLiberoUtils';

// Sub-module math re-exports
export * from './math/combatWeatherMath';
export * from './math/combatAuraMath';
export * from './math/combatCritMath';
export * from './math/combatDefenseMath';
export * from './math/combatHurtModifierMath';

import { getWeatherDamageBonus } from './math/combatWeatherMath';
import { getFieldAuraDamageBonus } from './math/combatAuraMath';
import { getRankBonusStats } from './math/combatDefenseMath';
import { parseMissingHpHurtModifier } from './math/combatHurtModifierMath';

// Backward compatibility proxy exports
export {
    parseCombatTags,
    resolveCharacterSide,
    isFlowerGiftActiveForSide,
    isAbilitySuppressedByField,
    isTargetUnderIntimidate,
    isTargetAffectedByAbility
};

export const ATTRIBUTE_MAPPING: Record<string, string> = {
    Strength: 'str', Dexterity: 'dex', Vitality: 'vit', Special: 'spe',
    Insight: 'ins', Tough: 'tou', Cool: 'coo', Beauty: 'bea',
    Cute: 'cut', Clever: 'cle', Will: 'will'
};

export function getAbilityText(abilityName: string, customAbilities?: CustomAbility[]): string {
    if (!abilityName || !customAbilities) return '';
    const cleanName = abilityName.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    const custom = customAbilities.find((ability) => ability.name.trim().toLowerCase() === cleanName);
    return custom ? `${custom.description} ${custom.effect}` : '';
}

/**
 * Returns whether the character's ability is currently active (not manually toggled off
 * and not suppressed by an active field effect like Neutralizing Gas).
 */
export function isCharacterAbilityActive(state: CharacterState): boolean {
    if (state.identity.abilityActive === false) return false;
    const side = resolveCharacterSide(state);
    const effectiveSide: 'player' | 'foe' = side !== 'none' ? side : state.identity.isNPC ? 'foe' : 'player';
    const charIdentifiers = [
        state.identity.entityId, state.tokenId, state.identity.nickname, state.identity.species
    ].filter(Boolean) as string[];
    return !isAbilitySuppressedByField(effectiveSide, state.activeBattlefield || null, charIdentifiers);
}

/**
 * Returns the effective ability text for a character, accounting for:
 * 1. User manual ability active toggle
 * 2. Neutralizing Gas suppression from opposing side
 */
export function getEffectiveAbilityText(state: CharacterState): string {
    if (!isCharacterAbilityActive(state)) return '';
    return getAbilityText(state.identity.ability, state.roomCustomAbilities);
}

export function getPainPenalty(
    attribute: string,
    state: CharacterState,
    itemBuffs?: CombatBonuses,
    move?: MoveData
): number {
    if (String(state.identity.pain || 'Enabled').toLowerCase() !== 'enabled') return 0;
    if (itemBuffs?.ignorePain) return 0;

    if (move && !itemBuffs) {
        const abilityText = getEffectiveAbilityText(state);
        const buffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
        if (buffs.ignorePain) return 0;
    }

    const mappedAttr = (ATTRIBUTE_MAPPING[attribute] || attribute || '').toLowerCase().trim();
    if (!mappedAttr || ['none', 'vit', 'vitality', 'will'].includes(mappedAttr)) return 0;

    const currentHealth = Number(state.health.hpCurr) || 0;
    const maxHealth = Math.max(1, Number(state.health.hpMax) || 1);
    const ignoredPain = Number(state.trackers.ignoredPain) || 0;

    let rawPenalty = 0;
    if (currentHealth <= 1) rawPenalty = 3;
    else if (currentHealth <= Math.floor(maxHealth / 2)) rawPenalty = 1;

    const finalPenalty = Math.max(0, rawPenalty - ignoredPain);
    return finalPenalty > 0 ? -finalPenalty : 0;
}

export function getStatusPenalties(state: CharacterState) {
    let confusionPenalty = 0;
    let paralysisDexterityPenalty = 0;
    let isAsleep = false;
    let isFrozen = false;

    const abilityString = (state.identity.ability || '').toLowerCase();
    const charSide = resolveCharacterSide(state);
    const effectiveSide: 'player' | 'foe' = charSide !== 'none' ? charSide : state.identity.isNPC ? 'foe' : 'player';
    const targetId = [
        state.identity.entityId, state.tokenId, state.identity.nickname, state.identity.species
    ].filter(Boolean) as string[];

    const activeStatuses = state.statuses.map((status) =>
        (status.name === 'Custom...' ? status.customName : status.name).toLowerCase()
    );

    activeStatuses.forEach((statusName) => {
        if (statusName === 'healthy') return;
        if (statusName === 'confusion') {
            const rank = state.identity.rank;
            if (['Starter', 'Rookie', 'Standard'].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -1);
            else if (['Advanced', 'Expert', 'Ace'].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -2);
            else confusionPenalty = Math.min(confusionPenalty, -3);
        } else if (statusName === 'paralysis') {
            if (!abilityString.includes('limber')) paralysisDexterityPenalty = Math.min(paralysisDexterityPenalty, -2);
        } else if (statusName === 'sleep') {
            if (
                !abilityString.includes('insomnia') && !abilityString.includes('vital spirit') &&
                !abilityString.includes('sweet veil') && !isTargetAffectedByAbility(targetId, effectiveSide, 'sweet veil', state.activeBattlefield || null)
            ) {
                isAsleep = true;
            }
        } else if (statusName === 'frozen solid') {
            isFrozen = true;
        }
    });

    return { confusionPenalty, paralysisDexterityPenalty, isAsleep, isFrozen };
}

export function calculateStatTotal(
    statKey: string,
    state: CharacterState,
    itemBuffs: CombatBonuses,
    factorTags?: string[]
): number {
    if (!statKey) return 0;
    if (statKey.includes('/')) {
        const parts = statKey.split('/').map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
            return Math.max(0, ...parts.map((p) => calculateStatTotal(p, state, itemBuffs, factorTags)));
        }
    }
    const normalizedStat = ATTRIBUTE_MAPPING[statKey] || statKey.toLowerCase().trim();
    if (!normalizedStat || normalizedStat === 'none') return 0;
    if (normalizedStat === 'will') return state.will.willMax;

    if (Object.values(CombatStat).includes(normalizedStat as CombatStat)) {
        const statistic =
            state.stats?.[normalizedStat as CombatStat] ||
            (state.stats as Record<string, StatData> | undefined)?.[statKey.toLowerCase().trim()];
        if (!statistic) return 0;
        let total =
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[normalizedStat] || 0);

        if (normalizedStat === CombatStat.DEX && state.activeBattlefield) {
            const sideName = resolveCharacterSide(state);
            const side = sideName === 'foe' ? state.activeBattlefield.foeSide : sideName === 'player' ? state.activeBattlefield.playerSide : undefined;
            const hasTailwind = Boolean(
                side?.forceFields?.some((ff) => ff?.name?.toLowerCase().includes('tailwind') && (ff.remainingRounds > 0 || ff.remainingRounds === -1)) ||
                side?.extraForceFields?.some((ff) => ff?.name?.toLowerCase().includes('tailwind') && (ff.remainingRounds > 0 || ff.remainingRounds === -1))
            );
            if (hasTailwind) {
                total += 2;
                factorTags?.push('Tailwind (+2 Dexterity)');
            }
        }

        const charSide = resolveCharacterSide(state);
        const effectiveSide: 'player' | 'foe' = charSide !== 'none' ? charSide : state.identity.isNPC ? 'foe' : 'player';
        const targetId = [state.identity.entityId, state.tokenId, state.identity.nickname, state.identity.species].filter(Boolean) as string[];
        const isDondozo = (state.identity.species || '').trim().toLowerCase() === 'dondozo' || (state.identity.nickname || '').trim().toLowerCase() === 'dondozo';
        const checkAbility = (ability: string) => isTargetAffectedByAbility(targetId, effectiveSide, ability, state.activeBattlefield || null);

        if (normalizedStat === CombatStat.STR) {
            if (checkAbility('flower gift')) { total += 2; factorTags?.push('Flower Gift (+2 Strength)'); }
            if (checkAbility('intimidate')) { total -= 1; factorTags?.push('Intimidate (-1 Strength)'); }
            if (checkAbility('tablets of ruin')) { total -= 2; factorTags?.push('Tablets of Ruin (-2 Strength)'); }
            if (isDondozo && checkAbility('commander')) { total += 2; factorTags?.push('Commander (+2 Strength)'); }
        } else if (normalizedStat === CombatStat.DEX) {
            if (isDondozo && checkAbility('commander')) { total += 2; factorTags?.push('Commander (+2 Dexterity)'); }
        } else if (normalizedStat === CombatStat.SPE) {
            if (checkAbility('battery')) { total += 1; factorTags?.push('Battery (+1 Special)'); }
            if (checkAbility('vessel of ruin')) { total -= 2; factorTags?.push('Vessel of Ruin (-2 Special)'); }
            if (isDondozo && checkAbility('commander')) { total += 2; factorTags?.push('Commander (+2 Special)'); }
        }

        return Math.max(1, total);
    }

    if (Object.values(SocialStat).includes(normalizedStat as SocialStat)) {
        const statistic = state.socials[normalizedStat as SocialStat];
        return Math.max(1, statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[normalizedStat] || 0));
    }

    return 0;
}

export function calculateSkillTotal(skillKey: string, state: CharacterState, itemBuffs: CombatBonuses): number {
    if (!skillKey || skillKey === 'none') return 0;
    if (skillKey.includes('/')) {
        const parts = skillKey.split('/').map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
            return Math.max(0, ...parts.map((p) => calculateSkillTotal(p, state, itemBuffs)));
        }
    }

    if (Object.values(Skill).includes(skillKey as Skill)) {
        const skillData = state.skills[skillKey as Skill];
        return skillData.base + skillData.buff + (itemBuffs.skills[skillKey] || 0);
    }

    for (const category of state.extraCategories) {
        const customSkill = category.skills.find((s) => s.id === skillKey);
        if (customSkill) {
            return customSkill.base + customSkill.buff + (itemBuffs.skills[skillKey] || 0);
        }
    }

    return 0;
}

export function calculateBaseDamage(move: MoveData, state: CharacterState, itemBuffs?: CombatBonuses): number {
    if (move.category === 'Status' || (move.power === 0 && !move.dmg1)) return 0;

    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalDmg + invMods.dmg;
    const statuses = getStatusPenalties(state);

    const normalizedDamageStatistic = (ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1 || '').toLowerCase().trim();
    const scalingValue = normalizedDamageStatistic ? calculateStatTotal(normalizedDamageStatistic, state, invMods) : 0;

    const normalizeType = (t?: string) => (t || '').trim().toLowerCase();
    const moveTypeNorm = normalizeType(move.type);
    const ignoredTypes = new Set(['', 'none', 'typeless']);
    const type1Norm = normalizeType(state.identity.type1);
    const type2Norm = normalizeType(state.identity.type2);
    const hasTypeMatch =
        !ignoredTypes.has(moveTypeNorm) &&
        ((!ignoredTypes.has(type1Norm) && type1Norm === moveTypeNorm) ||
            (!ignoredTypes.has(type2Norm) && type2Norm === moveTypeNorm));

    const abilityIsActive = isCharacterAbilityActive(state);
    const proteanResult = shouldShiftTypeForAbility(
        state.identity.ability || '',
        abilityIsActive,
        move.category,
        move.type,
        state.identity.type1,
        state.identity.type2
    );
    const hasProteanStab =
        abilityIsActive &&
        !ignoredTypes.has(moveTypeNorm) &&
        (proteanResult.matchedAbility === 'Protean' || proteanResult.matchedAbility === 'Libero') &&
        proteanResult.shouldShift;
    const sameTypeAttackBonus = hasTypeMatch || hasProteanStab ? 1 : 0;

    let teraBonus = 0;
    if (state.identity.activeTransformation === 'Terastallize' && move.type === state.identity.terastallizeAffinity) {
        if (state.identity.terastallizeBonusActive) {
            const matchesOriginal = state.identity.type1 === state.identity.terastallizeAffinity || state.identity.type2 === state.identity.terastallizeAffinity;
            teraBonus = matchesOriginal ? 3 : 2;
        } else {
            teraBonus = 1;
        }
    }

    const customFirstHitTag = (invMods.firstHitDmg !== 0 && state.trackers.firstHitDmg) ? invMods.firstHitDmg : 0;
    const cleanAbility = (state.identity.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    const stakeoutBonus = (cleanAbility === 'stakeout' && state.identity.abilityActive !== false && Boolean(state.identity.abilityTargetIds?.[0])) ? 1 : 0;
    const paralysisPenalty = normalizedDamageStatistic === 'dex' ? statuses.paralysisDexterityPenalty : 0;
    const hurtMod = parseMissingHpHurtModifier(move, state);

    return Math.max(1, move.power + scalingValue + extraDice + sameTypeAttackBonus + teraBonus + customFirstHitTag + paralysisPenalty + stakeoutBonus + hurtMod.diceModifier);
}

export function calculateTotalDamage(move: MoveData, state: CharacterState, itemBuffs?: CombatBonuses): number {
    if (move.category === 'Status' || (move.power === 0 && !move.dmg1)) {
        return 0;
    }
    const isHalfHp = state.health.hpCurr <= Math.floor(state.health.hpMax / 2);
    const weather = getWeatherDamageBonus(move.type, state.activeBattlefield, isHalfHp, state.identity.isNPC, state);
    const fieldAura = getFieldAuraDamageBonus(move.type, state.activeBattlefield, state.identity.isNPC, state);
    return Math.max(1, calculateBaseDamage(move, state, itemBuffs) + weather.diceBonus + fieldAura.diceBonus);
}

/** Helper for Stance Change / Shared Highest resource checks across forms */
function getSharedHighestResource(
    currentValue: number,
    resourceKey: 'hpMax' | 'willMax',
    flagKey: 'shareHighestHp' | 'shareHighestWill',
    state: CharacterState
): number {
    if (state.identity.activeTransformation === 'Custom' && state.identity.activeFormId) {
        const activeForm = state.roomCustomForms?.find((f) => f.id === state.identity.activeFormId);
        if (activeForm?.[flagKey] && state.identity.baseFormData) {
            try {
                const baseData = JSON.parse(state.identity.baseFormData) as Record<string, unknown>;
                const poolObj = (resourceKey === 'hpMax' ? baseData.health : baseData.will) as Record<string, unknown> | undefined;
                const baseVal = Number(baseData[resourceKey] ?? poolObj?.[resourceKey]) || 0;
                if (baseVal > 0) return Math.max(currentValue, baseVal);
            } catch {
                // Ignore parse errors safely
            }
        }
    }

    if (state.identity.activeTransformation === 'None' && state.identity.formSaves) {
        let highestSaved = 0;
        state.roomCustomForms?.forEach((f) => {
            if (f[flagKey] && state.identity.formSaves?.[f.id]) {
                try {
                    const savedData = JSON.parse(state.identity.formSaves[f.id]) as Record<string, unknown>;
                    const poolObj = (resourceKey === 'hpMax' ? savedData.health : savedData.will) as Record<string, unknown> | undefined;
                    const savedVal = Number(savedData[resourceKey] ?? poolObj?.[resourceKey]) || 0;
                    if (savedVal > highestSaved) highestSaved = savedVal;
                } catch {
                    // Ignore parse errors safely
                }
            }
        });
        if (highestSaved > 0) return Math.max(currentValue, highestSaved);
    }

    return currentValue;
}

export function calculateMaxHp(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const vitTotal = calculateStatTotal(CombatStat.VIT, state, invMods);
    const insTotal = calculateStatTotal(CombatStat.INS, state, invMods);

    let hpStat = vitTotal;
    if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

    const rankBonus = getRankBonusStats(state.identity.rank).hp;
    const currentHp = state.health.hpBase + hpStat + rankBonus + (invMods.hp || 0);

    return getSharedHighestResource(currentHp, 'hpMax', 'shareHighestHp', state);
}

export function calculateMaxWill(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const insTotal = calculateStatTotal(CombatStat.INS, state, invMods);

    const rankBonus = getRankBonusStats(state.identity.rank).will;
    const currentWill = state.will.willBase + insTotal + rankBonus + (invMods.will || 0);

    return getSharedHighestResource(currentWill, 'willMax', 'shareHighestWill', state);
}

export function calculateDefTotal(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const vitTotal = calculateStatTotal(CombatStat.VIT, state, invMods);
    const rankBonus = getRankBonusStats(state.identity.rank).def;

    let weatherBonus = 0;
    if (state.activeBattlefield) {
        const activeWeathers = getEffectsByCategory(state.activeBattlefield, 'weather');
        const isSnowy = activeWeathers.some((w) => {
            const clean = (w.name || '').trim().toLowerCase();
            return (clean.includes('snow') || clean === 'snowy') && !clean.includes('hail');
        });
        const isIce = state.identity.type1?.toLowerCase() === 'ice' || state.identity.type2?.toLowerCase() === 'ice';
        if (isSnowy && isIce) weatherBonus = 1;
    }

    const charSide = resolveCharacterSide(state);
    const effectiveSide: 'player' | 'foe' = charSide !== 'none' ? charSide : state.identity.isNPC ? 'foe' : 'player';
    const targetId = [state.identity.entityId, state.tokenId, state.identity.nickname, state.identity.species].filter(Boolean) as string[];
    const isDondozo = (state.identity.species || '').trim().toLowerCase() === 'dondozo' || (state.identity.nickname || '').trim().toLowerCase() === 'dondozo';

    const checkAbility = (ability: string) => isTargetAffectedByAbility(targetId, effectiveSide, ability, state.activeBattlefield || null);
    const ruinPenalty = checkAbility('sword of ruin') ? 2 : 0;
    const commanderBonus = isDondozo && checkAbility('commander') ? 2 : 0;

    return Math.max(1, vitTotal + state.derived.defBuff - state.derived.defDebuff + invMods.def + rankBonus + weatherBonus - ruinPenalty + commanderBonus);
}

export function calculateSDefTotal(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const vitTotal = calculateStatTotal(CombatStat.VIT, state, invMods);
    const insTotal = calculateStatTotal(CombatStat.INS, state, invMods);

    const sdefBase = state.identity.ruleset === 'tabletop' ? vitTotal : insTotal;
    const rankBonus = getRankBonusStats(state.identity.rank).sdef;

    let weatherBonus = 0;
    if (state.activeBattlefield) {
        const activeWeathers = getEffectsByCategory(state.activeBattlefield, 'weather');
        const isSand = activeWeathers.some((w) => (w.name || '').trim().toLowerCase().includes('sand'));
        const isRock = state.identity.type1?.toLowerCase() === 'rock' || state.identity.type2?.toLowerCase() === 'rock';
        if (isSand && isRock) weatherBonus = 1;
    }

    let flowerGiftBonus = 0;
    if (state.activeBattlefield) {
        const sideName = resolveCharacterSide(state);
        if (isFlowerGiftActiveForSide(sideName, state.activeBattlefield, state.identity.ability, state.identity.abilityActive)) {
            flowerGiftBonus = 2;
        }
    }

    const charSide = resolveCharacterSide(state);
    const effectiveSide: 'player' | 'foe' = charSide !== 'none' ? charSide : state.identity.isNPC ? 'foe' : 'player';
    const targetId = [state.identity.entityId, state.tokenId, state.identity.nickname, state.identity.species].filter(Boolean) as string[];
    const isDondozo = (state.identity.species || '').trim().toLowerCase() === 'dondozo' || (state.identity.nickname || '').trim().toLowerCase() === 'dondozo';

    const checkAbility = (ability: string) => isTargetAffectedByAbility(targetId, effectiveSide, ability, state.activeBattlefield || null);
    const ruinSDefPenalty = checkAbility('beads of ruin') ? 2 : 0;
    const commanderSDefBonus = isDondozo && checkAbility('commander') ? 2 : 0;

    return Math.max(
        1,
        sdefBase +
            state.derived.sdefBuff -
            state.derived.sdefDebuff +
            invMods.spd +
            rankBonus +
            weatherBonus +
            flowerGiftBonus -
            ruinSDefPenalty +
            commanderSDefBonus
    );
}

export function calculateBaseInitiative(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const dex = calculateStatTotal(CombatStat.DEX, state, invMods);
    const alertSkill = calculateSkillTotal(Skill.ALERT, state, invMods);
    const rankBonus = getRankBonusStats(state.identity.rank).init;

    return Math.max(1, dex) + Math.max(0, alertSkill) + invMods.init + rankBonus;
}

export function calculateBaseAccuracy(move: MoveData, state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getEffectiveAbilityText(state);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const statuses = getStatusPenalties(state);

    const attributeTotal = calculateStatTotal(move.acc1, state, invMods);
    const skillTotal = calculateSkillTotal(move.acc2, state, invMods);
    const rankSkillBonus = Boolean(move.acc2 && move.acc2.toLowerCase() !== 'none') ? getRankBonusStats(state.identity.rank).skillDice : 0;
    const customFirstHitAccTag = (invMods.firstHitAcc !== 0 && state.trackers.firstHitAcc) ? invMods.firstHitAcc : 0;
    const normalizedAcc1 = (ATTRIBUTE_MAPPING[move.acc1] || move.acc1 || '').toLowerCase().trim();
    const paralysisPenalty = normalizedAcc1 === 'dex' ? statuses.paralysisDexterityPenalty : 0;

    return Math.max(1, attributeTotal + skillTotal + state.trackers.globalAcc + invMods.acc + customFirstHitAccTag + rankSkillBonus + paralysisPenalty);
}

/**
 * Calculates scalar Loyalty and Happiness for a Pokémon based on rank and team slot index.
 * - Starter / Rookie: Loyalty 1, Happiness 1–2
 * - Standard: Partner/Ace (slot 0) has Loyalty 5, Happiness 4; others have Loyalty 2, Happiness 2–3
 * - Advanced: Ace has 5/5, second member has 4/4, others have Loyalty 3, Happiness 3
 * - Expert: Top 2 members have 5/4 or 5/5, others 4/4
 * - Ace / Master / Champion: Full loyalty (5) and happiness (5)
 */
export function calculateScalarLoyaltyHappiness(
    rank: Rank,
    memberIndex: number = 0
): { loyalty: number; happiness: number } {
    switch (rank) {
        case 'Starter':
        case 'Rookie':
            return { loyalty: 1, happiness: Math.floor(Math.random() * 2) + 1 };
        case 'Standard':
            return memberIndex === 0 ? { loyalty: 5, happiness: 4 } : { loyalty: 2, happiness: Math.floor(Math.random() * 2) + 2 };
        case 'Advanced':
            return memberIndex === 0 ? { loyalty: 5, happiness: 5 } : memberIndex === 1 ? { loyalty: 4, happiness: 4 } : { loyalty: 3, happiness: 3 };
        case 'Expert':
            return { loyalty: memberIndex < 2 ? 5 : 4, happiness: memberIndex < 2 ? 5 : 4 };
        case 'Ace':
        case 'Master':
        case 'Champion':
            return { loyalty: 5, happiness: 5 };
        default:
            return { loyalty: 1, happiness: 1 };
    }
}
