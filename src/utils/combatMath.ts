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
    if (statKey === 'will') return state.will.willMax;

    const normalizedStat = ATTRIBUTE_MAPPING[statKey] || statKey;

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

    return 1;
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

export function calculateBaseDamage(move: MoveData, state: CharacterState): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalDmg + itemBuffs.dmg;

    let scalingValue = 0;
    const normalizedDamageStatistic = ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1;

    if (normalizedDamageStatistic) {
        scalingValue = calculateStatTotal(normalizedDamageStatistic, state, itemBuffs);
    }

    const abilityString = (state.identity.ability || '').toLowerCase();
    const isProtean = abilityString.includes('protean') || abilityString.includes('libero');
    const typingString = `${state.identity.type1} / ${state.identity.type2}`;
    const hasTypeMatch = move.type && typingString.includes(move.type);

    let sameTypeAttackBonus = hasTypeMatch || isProtean ? 1 : 0;

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
    if (itemBuffs.firstHitDmg !== 0 && state.trackers.firstHitDmg) {
        customFirstHitTag = itemBuffs.firstHitDmg;
    }

    return move.power + scalingValue + extraDice + sameTypeAttackBonus + teraBonus + customFirstHitTag;
}
