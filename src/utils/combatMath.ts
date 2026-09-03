import type { MoveData, CharacterState, CustomAbility } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { parseCombatTags, type CombatBonuses } from './tagParser';

// PROXY EXPORT: Prevents app crashes if a file is still directly importing from combatMath!
export { parseCombatTags };

export const ATTRIBUTE_MAPPING: Record<string, string> = {
    Strength: 'str',
    Dexterity: 'dex',
    Vitality: 'vit',
    Special: 'spe',
    Insight: 'ins',
    Tough: 'tou',
    Cool: 'coo',
    Beauty: 'bea',
    Cute: 'cut',
    Clever: 'cle',
    Will: 'will'
};

export function getAbilityText(abilityName: string, customAbilities: CustomAbility[]): string {
    if (!abilityName) return '';
    const cleanName = abilityName
        .replace(/\s*\(HA\)$/i, '')
        .trim()
        .toLowerCase();
    const custom = customAbilities.find((ability) => ability.name.trim().toLowerCase() === cleanName);
    return custom ? `${custom.description} ${custom.effect}` : '';
}

export function getPainPenalty(attribute: string, state: CharacterState): number {
    const painSetting = String(state.identity.pain || 'Enabled').toLowerCase();
    if (painSetting !== 'enabled') return 0;

    const normalizedAttribute = String(attribute || '')
        .toLowerCase()
        .trim();
    if (normalizedAttribute === 'vit' || normalizedAttribute === 'will') return 0;

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
    const activeStatuses = state.statuses.map((status) =>
        (status.name === 'Custom...' ? status.customName : status.name).toLowerCase()
    );

    activeStatuses.forEach((statusName) => {
        if (statusName !== 'healthy') {
            if (statusName === 'confusion') {
                const rank = state.identity.rank;
                if (['Starter', 'Rookie', 'Standard'].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -1);
                else if (['Advanced', 'Expert', 'Ace'].includes(rank))
                    confusionPenalty = Math.min(confusionPenalty, -2);
                else confusionPenalty = Math.min(confusionPenalty, -3);
            }
            if (statusName === 'paralysis') {
                if (!abilityString.includes('limber'))
                    paralysisDexterityPenalty = Math.min(paralysisDexterityPenalty, -2);
            }
            if (statusName === 'sleep') {
                if (
                    !abilityString.includes('insomnia') &&
                    !abilityString.includes('vital spirit') &&
                    !abilityString.includes('sweet veil')
                )
                    isAsleep = true;
            }
            if (statusName === 'frozen solid') isFrozen = true;
        }
    });

    return { confusionPenalty, paralysisDexterityPenalty, isAsleep, isFrozen };
}

export function calculateStatTotal(statKey: string, state: CharacterState, itemBuffs: CombatBonuses): number {
    if (!statKey) return 0;
    const normalizedStat = ATTRIBUTE_MAPPING[statKey] || statKey.toLowerCase().trim();
    if (!normalizedStat || normalizedStat === 'none') return 0;
    if (normalizedStat === 'will') return state.will.willMax;

    if (Object.values(CombatStat).includes(normalizedStat as CombatStat)) {
        const statistic = state.stats[normalizedStat as CombatStat];
        return Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[normalizedStat] || 0)
        );
    }

    if (Object.values(SocialStat).includes(normalizedStat as SocialStat)) {
        const statistic = state.socials[normalizedStat as SocialStat];
        return Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[normalizedStat] || 0)
        );
    }

    return 0;
}

export function calculateSkillTotal(skillKey: string, state: CharacterState, itemBuffs: CombatBonuses): number {
    if (!skillKey || skillKey === 'none') return 0;

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
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalDmg + invMods.dmg;
    const statuses = getStatusPenalties(state);

    let scalingValue = 0;
    const normalizedDamageStatistic = (ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1 || '').toLowerCase().trim();

    if (normalizedDamageStatistic) {
        scalingValue = calculateStatTotal(normalizedDamageStatistic, state, invMods);
    }

    const abilityString = (state.identity.ability || '').toLowerCase();
    const isProtean = abilityString.includes('protean') || abilityString.includes('libero');
    const typingString = `${state.identity.type1} / ${state.identity.type2}`;
    const hasTypeMatch = move.type && typingString.includes(move.type);

    const sameTypeAttackBonus = hasTypeMatch || isProtean ? 1 : 0;

    let teraBonus = 0;
    const isTera = state.identity.activeTransformation === 'Terastallize';

    if (isTera && move.type === state.identity.terastallizeAffinity) {
        if (state.identity.terastallizeBonusActive) {
            const matchesOriginal =
                state.identity.type1 === state.identity.terastallizeAffinity ||
                state.identity.type2 === state.identity.terastallizeAffinity;
            teraBonus = matchesOriginal ? 3 : 2;
        } else {
            teraBonus = 1;
        }
    }

    let customFirstHitTag = 0;
    if (invMods.firstHitDmg !== 0 && state.trackers.firstHitDmg) {
        customFirstHitTag = invMods.firstHitDmg;
    }

    const paralysisPenalty = normalizedDamageStatistic === 'dex' ? statuses.paralysisDexterityPenalty : 0;

    return Math.max(
        1,
        move.power + scalingValue + extraDice + sameTypeAttackBonus + teraBonus + customFirstHitTag + paralysisPenalty
    );
}

export const isMasterOrChampionRank = (rank: string): boolean => ['Master', 'Champion'].includes(rank);

export const getRankBonusStats = (rank: string) => {
    if (isMasterOrChampionRank(rank)) {
        return { hp: 3, will: 3, init: 3, def: 3, sdef: 3, skillDice: 2 };
    }
    return { hp: 0, will: 0, init: 0, def: 0, sdef: 0, skillDice: 0 };
};

export function calculateMaxHp(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const vitTotal = calculateStatTotal(CombatStat.VIT, state, invMods);
    const insTotal = calculateStatTotal(CombatStat.INS, state, invMods);

    let hpStat = vitTotal;
    if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

    const rankBonus = getRankBonusStats(state.identity.rank).hp;
    const currentHp = state.health.hpBase + hpStat + rankBonus;

    // Stance Change / Shared Highest HP logic:
    // 1. If currently in a Custom Form with shareHighestHp enabled, compare with baseFormData
    if (state.identity.activeTransformation === 'Custom' && state.identity.activeFormId) {
        const activeForm = state.roomCustomForms?.find((f) => f.id === state.identity.activeFormId);
        if (activeForm?.shareHighestHp && state.identity.baseFormData) {
            try {
                const baseData = JSON.parse(state.identity.baseFormData) as { hpMax?: number; health?: { hpMax?: number } };
                const baseHpMax = Number(baseData.hpMax ?? baseData.health?.hpMax) || 0;
                if (baseHpMax > 0) return Math.max(currentHp, baseHpMax);
            } catch {
                // Ignore parse errors safely
            }
        }
    }

    // 2. If currently in Base Form, check if any saved form with shareHighestHp had a higher Max HP
    if (state.identity.activeTransformation === 'None' && state.identity.formSaves) {
        let highestSavedHp = 0;
        state.roomCustomForms?.forEach((f) => {
            if (f.shareHighestHp && state.identity.formSaves?.[f.id]) {
                try {
                    const savedData = JSON.parse(state.identity.formSaves[f.id]) as { hpMax?: number; health?: { hpMax?: number } };
                    const savedHpMax = Number(savedData.hpMax ?? savedData.health?.hpMax) || 0;
                    if (savedHpMax > highestSavedHp) highestSavedHp = savedHpMax;
                } catch {
                    // Ignore parse errors safely
                }
            }
        });
        if (highestSavedHp > 0) return Math.max(currentHp, highestSavedHp);
    }

    return currentHp;
}

export function calculateMaxWill(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const insTotal = calculateStatTotal(CombatStat.INS, state, invMods);

    const rankBonus = getRankBonusStats(state.identity.rank).will;
    const currentWill = state.will.willBase + insTotal + rankBonus;

    // Stance Change / Shared Highest Will logic:
    // 1. If currently in a Custom Form with shareHighestWill enabled, compare with baseFormData
    if (state.identity.activeTransformation === 'Custom' && state.identity.activeFormId) {
        const activeForm = state.roomCustomForms?.find((f) => f.id === state.identity.activeFormId);
        if (activeForm?.shareHighestWill && state.identity.baseFormData) {
            try {
                const baseData = JSON.parse(state.identity.baseFormData) as { willMax?: number; will?: { willMax?: number } };
                const baseWillMax = Number(baseData.willMax ?? baseData.will?.willMax) || 0;
                if (baseWillMax > 0) return Math.max(currentWill, baseWillMax);
            } catch {
                // Ignore parse errors safely
            }
        }
    }

    // 2. If currently in Base Form, check if any saved form with shareHighestWill had a higher Max Will
    if (state.identity.activeTransformation === 'None' && state.identity.formSaves) {
        let highestSavedWill = 0;
        state.roomCustomForms?.forEach((f) => {
            if (f.shareHighestWill && state.identity.formSaves?.[f.id]) {
                try {
                    const savedData = JSON.parse(state.identity.formSaves[f.id]) as { willMax?: number; will?: { willMax?: number } };
                    const savedWillMax = Number(savedData.willMax ?? savedData.will?.willMax) || 0;
                    if (savedWillMax > highestSavedWill) highestSavedWill = savedWillMax;
                } catch {
                    // Ignore parse errors safely
                }
            }
        });
        if (highestSavedWill > 0) return Math.max(currentWill, highestSavedWill);
    }

    return currentWill;
}

export function calculateDefTotal(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const vitTotal = calculateStatTotal(CombatStat.VIT, state, invMods);
    const rankBonus = getRankBonusStats(state.identity.rank).def;

    return Math.max(1, vitTotal + state.derived.defBuff - state.derived.defDebuff + invMods.def + rankBonus);
}

export function calculateSDefTotal(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);
    const vitTotal = calculateStatTotal(CombatStat.VIT, state, invMods);
    const insTotal = calculateStatTotal(CombatStat.INS, state, invMods);

    let sdefBase = insTotal;
    if (state.identity.ruleset === 'tabletop') sdefBase = vitTotal;
    const rankBonus = getRankBonusStats(state.identity.rank).sdef;

    return Math.max(1, sdefBase + state.derived.sdefBuff - state.derived.sdefDebuff + invMods.spd + rankBonus);
}

export function calculateBaseInitiative(state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText);

    const dex = calculateStatTotal(CombatStat.DEX, state, invMods);
    const alertSkill = calculateSkillTotal(Skill.ALERT, state, invMods);
    const rankBonus = getRankBonusStats(state.identity.rank).init;

    return Math.max(1, dex) + Math.max(0, alertSkill) + invMods.init + rankBonus;
}

export function calculateBaseAccuracy(move: MoveData, state: CharacterState, itemBuffs?: CombatBonuses): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const invMods = itemBuffs || parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const statuses = getStatusPenalties(state);

    const attributeTotal = calculateStatTotal(move.acc1, state, invMods);
    const skillTotal = calculateSkillTotal(move.acc2, state, invMods);

    const hasSkill = Boolean(move.acc2 && move.acc2.toLowerCase() !== 'none');
    const rankSkillBonus = hasSkill ? getRankBonusStats(state.identity.rank).skillDice : 0;

    let customFirstHitAccTag = 0;
    if (invMods.firstHitAcc !== 0 && state.trackers.firstHitAcc) {
        customFirstHitAccTag = invMods.firstHitAcc;
    }

    const normalizedAcc1 = (ATTRIBUTE_MAPPING[move.acc1] || move.acc1 || '').toLowerCase().trim();
    const paralysisPenalty = normalizedAcc1 === 'dex' ? statuses.paralysisDexterityPenalty : 0;

    return Math.max(
        1,
        attributeTotal +
            skillTotal +
            state.trackers.globalAcc +
            invMods.acc +
            customFirstHitAccTag +
            rankSkillBonus +
            paralysisPenalty
    );
}
