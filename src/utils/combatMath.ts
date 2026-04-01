import type { InventoryItem, MoveData, CharacterState, ExtraCategory, CustomAbility } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';

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
    // Strip out the (HA) tag so we can accurately find Homebrew abilities too
    const cleanName = abilityName
        .replace(/\s*\(HA\)$/i, '')
        .trim()
        .toLowerCase();
    const custom = customAbilities.find((ability) => ability.name.trim().toLowerCase() === cleanName);
    return custom ? `${custom.description} ${custom.effect}` : '';
}

const safeParseInt = (value: string) => parseInt((value || '0').replace(/\s/g, '')) || 0;

export function parseCombatTags(
    inventory: InventoryItem[],
    extraCategories: ExtraCategory[],
    move?: MoveData,
    abilityText: string = ''
) {
    const bonuses = {
        stats: {} as Record<string, number>,
        skills: {} as Record<string, number>,
        def: 0,
        spd: 0,
        init: 0,
        dmg: 0,
        acc: 0,
        chance: 0,
        seDmg: 0,
        highCritStacks: 0,
        stackingHighCritStacks: 0,
        ignoreLowAcc: 0,
        itemNames: [] as string[],
        accItemNames: [] as string[],
        dmgItemNames: [] as string[]
    };

    const moveType = (move?.type || '').trim().toLowerCase();
    const moveDescription = (move?.desc || '').toLowerCase();
    const moveName = (move?.name || '').toLowerCase();
    const isComboMove =
        moveDescription.includes('successive') ||
        moveDescription.includes('double action') ||
        moveDescription.includes('triple action') ||
        moveName.includes('double') ||
        moveName.includes('triple');

    const customSkillNames = extraCategories
        .flatMap((category) => category.skills.map((skill) => (skill.name || '').toLowerCase()))
        .filter(Boolean);
    const skillsList = [...Object.values(Skill), ...customSkillNames];
    const escapedSkills = skillsList.map((skill) => skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

    const itemsToParse = inventory
        .filter((item) => item.active)
        .map((item) => ({ name: item.name || '', desc: item.desc || '' }));

    if (abilityText) {
        itemsToParse.push({ name: 'Ability', desc: abilityText });
    }

    itemsToParse.forEach((item) => {
        const description = item.desc.toLowerCase();
        const name = item.name.trim();

        let accuracyTriggered = false;
        let damageTriggered = false;
        let generalTriggered = false;

        const statMatches = description.matchAll(
            /\[\s*(str|strength|dex|dexterity|vit|vitality|spe|special|ins|insight|tou|tough|coo|cool|bea|beauty|cut|cute|cle|clever)\s*([+-]?\s*\d+)\s*\]/gi
        );
        for (const match of statMatches) {
            const rawStatistic = match[1].toLowerCase();
            const map: Record<string, string> = {
                strength: 'str',
                dexterity: 'dex',
                vitality: 'vit',
                special: 'spe',
                insight: 'ins',
                tough: 'tou',
                cool: 'coo',
                beauty: 'bea',
                cute: 'cut',
                clever: 'cle'
            };
            const statisticKey = map[rawStatistic] || rawStatistic;
            bonuses.stats[statisticKey] = (bonuses.stats[statisticKey] || 0) + safeParseInt(match[2]);
            generalTriggered = true;
        }

        const skillMatches = description.matchAll(
            new RegExp(`\\[\\s*(${escapedSkills})\\s*([+-]?\\s*\\d+)\\s*\\]`, 'gi')
        );
        for (const match of skillMatches) {
            bonuses.skills[match[1].toLowerCase()] =
                (bonuses.skills[match[1].toLowerCase()] || 0) + safeParseInt(match[2]);
            generalTriggered = true;
        }

        const defenseMatches = description.matchAll(/\[\s*def\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of defenseMatches) {
            bonuses.def += safeParseInt(match[1]);
            generalTriggered = true;
        }

        const specialDefenseMatches = description.matchAll(/\[\s*spd\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of specialDefenseMatches) {
            bonuses.spd += safeParseInt(match[1]);
            generalTriggered = true;
        }

        const initiativeMatches = description.matchAll(/\[\s*init\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of initiativeMatches) {
            bonuses.init += safeParseInt(match[1]);
            generalTriggered = true;
        }

        const chanceMatches = description.matchAll(/\[\s*chance\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of chanceMatches) {
            bonuses.chance += safeParseInt(match[1]);
            generalTriggered = true;
        }

        if (move) {
            const damageMatches = description.matchAll(/\[\s*dmg\s*([+-]?\s*\d+)(?:\s*:\s*([\w\s]+))?\s*\]/gi);
            for (const match of damageMatches) {
                const requirement = match[2]?.toLowerCase().trim();

                if (!requirement || requirement === moveType) {
                    bonuses.dmg += safeParseInt(match[1]);
                    damageTriggered = true;
                } else if (requirement === 'super effective') {
                    bonuses.seDmg += safeParseInt(match[1]);
                    damageTriggered = true;
                } else if (requirement === 'physical' && move.category === 'Physical') {
                    bonuses.dmg += safeParseInt(match[1]);
                    damageTriggered = true;
                } else if (requirement === 'special' && move.category === 'Special') {
                    bonuses.dmg += safeParseInt(match[1]);
                    damageTriggered = true;
                }
            }

            const accuracyMatches = description.matchAll(/\[\s*acc\s*([+-]?\s*\d+)(?:\s*:\s*([\w\s]+))?\s*\]/gi);
            for (const match of accuracyMatches) {
                const requirement = match[2]?.toLowerCase().trim();

                if (!requirement || requirement === moveType) {
                    bonuses.acc += safeParseInt(match[1]);
                    accuracyTriggered = true;
                } else if (requirement === 'physical' && move.category === 'Physical') {
                    bonuses.acc += safeParseInt(match[1]);
                    accuracyTriggered = true;
                } else if (requirement === 'special' && move.category === 'Special') {
                    bonuses.acc += safeParseInt(match[1]);
                    accuracyTriggered = true;
                }
            }

            const comboMatches = description.matchAll(/\[\s*combo dmg\s*([+-]?\s*\d+)\s*\]/gi);
            for (const match of comboMatches) {
                if (isComboMove) {
                    bonuses.dmg += safeParseInt(match[1]);
                    damageTriggered = true;
                }
            }
        } else {
            const damageMatches = description.matchAll(/\[\s*dmg\s*([+-]?\s*\d+)\s*\]/gi);
            for (const match of damageMatches) {
                bonuses.dmg += safeParseInt(match[1]);
                damageTriggered = true;
            }
            const accuracyMatches = description.matchAll(/\[\s*acc\s*([+-]?\s*\d+)\s*\]/gi);
            for (const match of accuracyMatches) {
                bonuses.acc += safeParseInt(match[1]);
                accuracyTriggered = true;
            }
        }

        if (/\[\s*high crit\s*\]/i.test(description)) {
            bonuses.highCritStacks += 1;
            accuracyTriggered = true;
        }
        if (/\[\s*stacking high crit\s*\]/i.test(description)) {
            bonuses.stackingHighCritStacks += 1;
            accuracyTriggered = true;
        }

        const ignoreAccuracyMatches = description.matchAll(/\[\s*ignore low acc\s*(\d+)\s*\]/gi);
        for (const match of ignoreAccuracyMatches) {
            bonuses.ignoreLowAcc += safeParseInt(match[1]);
            accuracyTriggered = true;
        }

        if (name && name !== 'Ability') {
            if (generalTriggered || accuracyTriggered || damageTriggered) bonuses.itemNames.push(name);
            if (generalTriggered || accuracyTriggered) bonuses.accItemNames.push(name);
            if (generalTriggered || damageTriggered) bonuses.dmgItemNames.push(name);
        }
    });

    return bonuses;
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

export function calculateBaseDamage(move: MoveData, state: CharacterState): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalDmg + itemBuffs.dmg;

    let scalingValue = 0;
    const normalizedDamageStatistic = ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1;

    if (normalizedDamageStatistic) {
        if (state.stats[normalizedDamageStatistic as CombatStat]) {
            const statistic = state.stats[normalizedDamageStatistic as CombatStat];
            scalingValue = Math.max(
                1,
                statistic.base +
                    statistic.rank +
                    statistic.buff -
                    statistic.debuff +
                    (itemBuffs.stats[normalizedDamageStatistic] || 0)
            );
        } else if (state.socials[normalizedDamageStatistic as SocialStat]) {
            const statistic = state.socials[normalizedDamageStatistic as SocialStat];
            scalingValue = Math.max(
                1,
                statistic.base +
                    statistic.rank +
                    statistic.buff -
                    statistic.debuff +
                    (itemBuffs.stats[normalizedDamageStatistic] || 0)
            );
        }
    }

    const abilityString = (state.identity.ability || '').toLowerCase();
    const isProtean = abilityString.includes('protean') || abilityString.includes('libero');
    const typingString = `${state.identity.type1} / ${state.identity.type2}`;
    const hasTypeMatch = move.type && typingString.includes(move.type);

    const sameTypeAttackBonus = hasTypeMatch || isProtean ? 1 : 0;
    return move.power + scalingValue + extraDice + sameTypeAttackBonus;
}
