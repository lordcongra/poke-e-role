import type { MoveData } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CombatBonuses, TagTriggers } from './tagTypes';
import { safeParseInt, getBoostMultiplier, checkCondition } from './conditionChecker';

export const MOVE_MODIFIERS = [
    'charge move',
    'copy move',
    'force field',
    'basic heal',
    'complete heal',
    'minor heal',
    'high critical',
    'low accuracy',
    'low acc',
    'bite move',
    'cutter move',
    'fist move',
    'projectile move',
    'wind move',
    'never miss',
    'must recharge',
    'ongoing damage',
    'out of range',
    'powder move',
    'rampage',
    'ranged move',
    'reaction',
    'late reaction',
    'recoil',
    'set damage',
    'sound move',
    'shield move',
    'successive actions',
    'double action',
    'triple action',
    'switcher move',
    'unique move'
];

export function matchesModifier(req: string, move: MoveData | undefined): boolean {
    if (!move) return false;
    const desc = (move.desc || '').toLowerCase();
    const name = (move.name || '').toLowerCase();
    if (desc.includes(req) || name.includes(req)) return true;
    if (
        (req === 'low accuracy' || req === 'low acc') &&
        (desc.includes('low accuracy') ||
            desc.includes('low acc') ||
            name.includes('low accuracy') ||
            name.includes('low acc'))
    )
        return true;
    if (
        req === 'fist move' &&
        (desc.includes('punch') || name.includes('punch') || desc.includes('fist') || name.includes('fist'))
    )
        return true;
    if (
        req === 'bite move' &&
        (desc.includes('bite') ||
            name.includes('bite') ||
            desc.includes('fang') ||
            name.includes('fang') ||
            desc.includes('jaw') ||
            name.includes('jaw'))
    )
        return true;
    if (
        req === 'cutter move' &&
        (desc.includes('slicing') ||
            desc.includes('cutter') ||
            desc.includes('slash') ||
            name.includes('cutter') ||
            name.includes('slash') ||
            name.includes('blade'))
    )
        return true;
    if (
        req === 'sound move' &&
        (desc.includes('sound') ||
            desc.includes('voice') ||
            desc.includes('song') ||
            desc.includes('roar') ||
            desc.includes('screech') ||
            name.includes('sound') ||
            name.includes('song') ||
            name.includes('roar'))
    )
        return true;
    if (
        req === 'projectile move' &&
        (desc.includes('projectile') ||
            desc.includes('pulse') ||
            desc.includes('aura') ||
            desc.includes('bullet') ||
            desc.includes('cannon') ||
            desc.includes('blast') ||
            name.includes('pulse') ||
            name.includes('cannon') ||
            name.includes('blast'))
    )
        return true;
    if (
        req === 'wind move' &&
        (desc.includes('wind') ||
            desc.includes('gust') ||
            desc.includes('cyclone') ||
            desc.includes('hurricane') ||
            desc.includes('breeze') ||
            name.includes('wind') ||
            name.includes('gust') ||
            name.includes('hurricane'))
    )
        return true;
    if (req === 'recoil' && desc.includes('recoil')) return true;
    return false;
}

export function extractStats(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const statMatches = description.matchAll(
        /\[\s*(str|strength|dex|dexterity|vit|vitality|spe|special|ins|insight|tou|tough|coo|cool|bea|beauty|cut|cute|cle|clever)\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of statMatches) {
        if (!checkCondition(match[3], isHalfHp, sourceBoostActive)) continue;
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
        const mult = getBoostMultiplier(match[3], boostLevel, maxBoost);
        bonuses.stats[statisticKey] = (bonuses.stats[statisticKey] || 0) + safeParseInt(match[2]) * mult;
        triggers.general = true;
    }
}

export function extractSkills(
    description: string,
    escapedSkills: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    if (!escapedSkills) return;
    const skillMatches = description.matchAll(
        new RegExp(`\\[\\s*(${escapedSkills})\\s*([+-]?\\s*\\d+)(?:\\s*@\\s*([^\\]]+))?\\s*\\]`, 'gi')
    );
    for (const match of skillMatches) {
        if (!checkCondition(match[3], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[3], boostLevel, maxBoost);
        bonuses.skills[match[1].toLowerCase()] =
            (bonuses.skills[match[1].toLowerCase()] || 0) + safeParseInt(match[2]) * mult;
        triggers.general = true;
    }
}

export function extractDefenses(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const defenseMatches = description.matchAll(/\[\s*def\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of defenseMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.def += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }

    const specialDefenseMatches = description.matchAll(/\[\s*spd\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of specialDefenseMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.spd += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }
}

export function extractInitiativeAndChance(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const initiativeMatches = description.matchAll(/\[\s*init\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of initiativeMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.init += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }

    const chanceMatches = description.matchAll(/\[\s*chance\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of chanceMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.chance += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }
}

export function extractDamage(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    isComboMove: boolean,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const damageMatches = description.matchAll(
        /\[\s*dmg\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of damageMatches) {
        if (!checkCondition(match[3], isHalfHp, sourceBoostActive)) continue;
        const requirement = match[2]?.toLowerCase().trim();
        const mult = getBoostMultiplier(match[3], boostLevel, maxBoost);

        if (!requirement || requirement === moveType) {
            bonuses.dmg += safeParseInt(match[1]) * mult;
            triggers.damage = true;
        } else if (requirement === 'super effective') {
            bonuses.seDmg += safeParseInt(match[1]) * mult;
            triggers.damage = true;
        } else if (requirement === 'stab') {
            const state = useCharacterStore.getState();
            const p1 = (state.identity.type1 || '').toLowerCase();
            const p2 = (state.identity.type2 || '').toLowerCase();
            if (moveType && (moveType === p1 || moveType === p2)) {
                bonuses.dmg += safeParseInt(match[1]) * mult;
                triggers.damage = true;
            }
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.dmg += safeParseInt(match[1]) * mult;
            triggers.damage = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.dmg += safeParseInt(match[1]) * mult;
            triggers.damage = true;
        } else if (move && (MOVE_MODIFIERS.includes(requirement) || matchesModifier(requirement, move))) {
            if (matchesModifier(requirement, move)) {
                bonuses.dmg += safeParseInt(match[1]) * mult;
                triggers.damage = true;
            }
        }
    }

    const comboMatches = description.matchAll(/\[\s*combo dmg\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of comboMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        if (isComboMove) {
            const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
            bonuses.dmg += safeParseInt(match[1]) * mult;
            triggers.damage = true;
        }
    }
}

export function extractAccuracy(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const accuracyMatches = description.matchAll(
        /\[\s*acc\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of accuracyMatches) {
        if (!checkCondition(match[3], isHalfHp, sourceBoostActive)) continue;
        const requirement = match[2]?.toLowerCase().trim();
        const mult = getBoostMultiplier(match[3], boostLevel, maxBoost);

        if (!requirement || requirement === moveType) {
            bonuses.acc += safeParseInt(match[1]) * mult;
            triggers.accuracy = true;
        } else if (requirement === 'low accuracy' || requirement === 'low acc') {
            const moveDesc = (move?.desc || '').toLowerCase();
            const moveName = (move?.name || '').toLowerCase();
            const hasLowAcc =
                bonuses.addLowAcc > 0 ||
                moveDesc.includes('low accuracy') ||
                moveDesc.includes('low acc') ||
                moveName.includes('low accuracy') ||
                moveName.includes('low acc');
            if (hasLowAcc) {
                bonuses.acc += safeParseInt(match[1]) * mult;
                triggers.accuracy = true;
            }
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.acc += safeParseInt(match[1]) * mult;
            triggers.accuracy = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.acc += safeParseInt(match[1]) * mult;
            triggers.accuracy = true;
        } else if (move && (MOVE_MODIFIERS.includes(requirement) || matchesModifier(requirement, move))) {
            if (matchesModifier(requirement, move)) {
                bonuses.acc += safeParseInt(match[1]) * mult;
                triggers.accuracy = true;
            }
        }
    }
}

export function extractCritDamage(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const critMatches = description.matchAll(
        /\[\s*crit(?:\s*dmg|\s*damage)?\s*([+-]?\s*\d+)(?:\s*(?:dmg|damage))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of critMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.critDmg += safeParseInt(match[1]) * mult;
        triggers.damage = true;
    }
}

export function extractLowAccuracy(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean
) {
    const lowAccMatches = description.matchAll(
        /\[\s*low acc(?:uracy)?\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of lowAccMatches) {
        if (!checkCondition(match[3], isHalfHp)) continue;
        const requirement = match[2]?.toLowerCase().trim();

        if (!requirement || requirement === moveType) {
            bonuses.addLowAcc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.addLowAcc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.addLowAcc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && (MOVE_MODIFIERS.includes(requirement) || matchesModifier(requirement, move))) {
            if (matchesModifier(requirement, move)) {
                bonuses.addLowAcc += safeParseInt(match[1]);
                triggers.accuracy = true;
            }
        }
    }
}

export function extractFirstHit(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const firstHitDmgMatches = description.matchAll(/\[\s*first hit dmg\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of firstHitDmgMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.firstHitDmg += safeParseInt(match[1]) * mult;
        triggers.damage = true;
    }

    const firstHitAccMatches = description.matchAll(/\[\s*first hit acc\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of firstHitAccMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.firstHitAcc += safeParseInt(match[1]) * mult;
        triggers.accuracy = true;
    }
}

export function extractTempHp(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const tempHpMatches = description.matchAll(/\[\s*gain temp hp\s*(\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of tempHpMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.gainTempHp += safeParseInt(match[1]) * mult;
        triggers.damage = true;
    }

    const tempHpOnHitMatches = description.matchAll(/\[\s*temp hp \+(\d+)\s*on hit(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of tempHpOnHitMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.tempHpOnHit += safeParseInt(match[1]) * mult;
        triggers.damage = true;
    }

    const tempHpDmgMatches = description.matchAll(/\[\s*temp hp\s*([\d./%]+)\s*dmg(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of tempHpDmgMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        bonuses.tempHpDmgRatio = match[1].trim();
        triggers.damage = true;
    }
}

export function extractRoundEffects(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    boostLevel: number = 1,
    maxBoost: number = 1,
    sourceBoostActive?: boolean
) {
    const damageMatch = description.matchAll(
        /\[\s*(?:deal\s*)?(\d+)\s*(?:damage|dmg)\s*(?:at end of round|at round end|round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of damageMatch) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.roundDamage += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }

    const willDmgMatch = description.matchAll(
        /\[\s*reduce\s*will\s*(?:by\s*)?(\d+)\s*(?:at end of round|at round end|round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of willDmgMatch) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.roundWillDamage += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }

    const healMatch = description.matchAll(
        /\[\s*heal\s*(\d+)(?:\s*hp)?\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of healMatch) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.roundHeal += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }

    const willHealMatch = description.matchAll(
        /\[\s*restore\s*(\d+)\s*will\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of willHealMatch) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const mult = getBoostMultiplier(match[2], boostLevel, maxBoost);
        bonuses.roundWillRestore += safeParseInt(match[1]) * mult;
        triggers.general = true;
    }

    const loseActionMatch = description.matchAll(/\[\s*lose (\d+) action(?:s)?(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of loseActionMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.loseAction += safeParseInt(match[1]);
        triggers.general = true;
    }

    const noReactMatch = description.matchAll(/\[\s*no reactions(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of noReactMatch) {
        if (!checkCondition(match[1], isHalfHp)) continue;
        bonuses.noReactions = true;
        triggers.general = true;
    }

    const extraReactionsMatch = description.matchAll(
        /\[\s*(\d+) extra reaction(?:s)? per turn(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of extraReactionsMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.extraReactions += safeParseInt(match[1]);
        triggers.general = true;
    }
}

export function extractMechanics(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean,
    kind: 'item' | 'passive' | 'ability' | 'move' | 'form' | 'status' = 'item',
    sourceName: string = '',
    showInRollLog: boolean = true,
    sourceBoostActive?: boolean
) {
    const hcMatches = description.matchAll(/\[\s*high crit(?:ical)?(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of hcMatches) {
        if (!checkCondition(match[1], isHalfHp, sourceBoostActive)) continue;
        bonuses.highCritStacks += 1;
        triggers.accuracy = true;
        if (showInRollLog) {
            if (kind === 'item') bonuses.highCritItemNames.push(sourceName);
            else if (kind === 'passive') bonuses.highCritPassiveNames.push(sourceName);
            else if (kind === 'ability') bonuses.highCritAbilityNames.push(sourceName);
        }
    }

    const stackHcMatches = description.matchAll(/\[\s*stacking high crit(?:ical)?(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of stackHcMatches) {
        if (!checkCondition(match[1], isHalfHp, sourceBoostActive)) continue;
        bonuses.stackingHighCritStacks += 1;
        triggers.accuracy = true;
        if (showInRollLog) {
            if (kind === 'item') bonuses.highCritItemNames.push(sourceName);
            else if (kind === 'passive') bonuses.highCritPassiveNames.push(sourceName);
            else if (kind === 'ability') bonuses.highCritAbilityNames.push(sourceName);
        }
    }

    const ignorePainMatches = description.matchAll(/\[\s*ignore pain(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of ignorePainMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        const requirement = match[1]?.toLowerCase().trim();

        if (!requirement) {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (
            moveType &&
            (requirement === moveType ||
                requirement.replace(/\s*move$/i, '').trim() === moveType ||
                requirement.replace(/\s*-\s*type$/i, '').trim() === moveType)
        ) {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (move && (MOVE_MODIFIERS.includes(requirement) || matchesModifier(requirement, move))) {
            if (matchesModifier(requirement, move)) {
                bonuses.ignorePain = true;
                triggers.general = true;
            }
        }
    }

    const ignoreAccuracyMatches = description.matchAll(/\[\s*ignore low acc\s*(\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of ignoreAccuracyMatches) {
        if (!checkCondition(match[2], isHalfHp, sourceBoostActive)) continue;
        bonuses.ignoreLowAcc += safeParseInt(match[1]);
        triggers.accuracy = true;
    }

    // Capture both [Acc 6s Add Dmg] and [Acc 6s Add Dmg Limit 6]
    const accFaceMatch = description.matchAll(
        /\[\s*acc\s*(\d+)s\s*add(?:s)?\s*dmg(?:\s*limit\s*(\d+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of accFaceMatch) {
        if (!checkCondition(match[3], isHalfHp, sourceBoostActive)) continue;
        bonuses.accFaceAddsDmg = safeParseInt(match[1]);
        bonuses.accFaceAddsDmgLimit = safeParseInt(match[2]) || 6; // Defaults to 6 if limit isn't explicitly defined!
        triggers.accuracy = true;
    }
}
