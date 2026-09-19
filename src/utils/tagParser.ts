import type { InventoryItem, MoveData, ExtraCategory } from '../store/storeTypes';
import { Skill } from '../types/enums';
import { useCharacterStore } from '../store/useCharacterStore';
import { getKnownAbility } from '../data/abilities/knownAbilities';

export interface CombatBonuses {
    stats: Record<string, number>;
    skills: Record<string, number>;
    def: number;
    spd: number;
    init: number;
    dmg: number;
    acc: number;
    chance: number;
    seDmg: number;
    critDmg: number;
    firstHitDmg: number;
    firstHitAcc: number;
    gainTempHp: number;
    tempHpOnHit: number;
    tempHpDmgRatio: string;
    highCritStacks: number;
    stackingHighCritStacks: number;
    ignoreLowAcc: number;
    addLowAcc: number;
    ignorePain: boolean;
    roundHeal: number;
    roundDamage: number;
    roundWillRestore: number;
    roundWillDamage: number;
    loseAction: number;
    noReactions: boolean;
    extraReactions: number;
    accFaceAddsDmg: number;
    accFaceAddsDmgLimit: number;
    itemNames: string[];
    accItemNames: string[];
    dmgItemNames: string[];
    abilityNames: string[];
    accAbilityNames: string[];
    dmgAbilityNames: string[];
}

interface TagTriggers {
    general: boolean;
    accuracy: boolean;
    damage: boolean;
}

const safeParseInt = (value: string | undefined) => parseInt((value || '0').replace(/\s/g, '')) || 0;

function checkCondition(conditionStr: string | undefined, isHalfHp: boolean): boolean {
    if (!conditionStr) return true;
    const cond = conditionStr.toLowerCase().trim();

    // 1. Half HP
    if (
        cond === 'half hp' ||
        cond === 'half hp or less' ||
        cond === 'half-hp' ||
        cond === '<=50% hp' ||
        cond === '<= 50% hp' ||
        cond === '<=50%' ||
        cond === '50% hp' ||
        cond.includes('half hp') ||
        cond.includes('50%') ||
        cond.includes('half-hp')
    ) {
        return isHalfHp;
    }

    const state = useCharacterStore.getState();

    // 2. Ability Boost Trigger (e.g., Sap Sipper, Moxie, Beast Boost, Steam Engine, etc.)
    if (cond === 'boost' || cond === 'triggered' || cond === 'active' || cond === 'ability boost') {
        return state.identity.abilityBoostActive === true;
    }

    // 3. Status checks
    const activeStatuses = (state.statuses || []).filter((s) => s.name && s.name.toLowerCase() !== 'healthy');

    // Generic status: "@ Status", "@ Any Status", "@ Status Ailment"
    if (
        cond === 'status' ||
        cond === 'any status' ||
        cond === 'status ailment' ||
        cond === 'status effect' ||
        cond === 'ailment' ||
        cond === 'statused'
    ) {
        return activeStatuses.length > 0;
    }

    const hasStatus = (matcher: (name: string, custom: string) => boolean) => {
        return activeStatuses.some((s) => {
            const n = (s.name || '').toLowerCase();
            const c = (s.customName || '').toLowerCase();
            return matcher(n, c);
        });
    };

    if (cond === 'burn' || cond === 'burned') {
        return hasStatus((n, c) => n.includes('burn') || c.includes('burn'));
    }
    if (cond === '1st degree burn' || cond === '1st deg burn') {
        return hasStatus((n, c) => n.includes('1st degree burn') || c.includes('1st degree burn'));
    }
    if (cond === '2nd degree burn' || cond === '2nd deg burn') {
        return hasStatus((n, c) => n.includes('2nd degree burn') || c.includes('2nd degree burn'));
    }
    if (cond === '3rd degree burn' || cond === '3rd deg burn') {
        return hasStatus((n, c) => n.includes('3rd degree burn') || c.includes('3rd degree burn'));
    }
    if (cond === 'poison' || cond === 'poisoned') {
        return hasStatus(
            (n, c) => n.includes('poison') || c.includes('poison') || n.includes('toxic') || c.includes('toxic')
        );
    }
    if (cond === 'badly poisoned' || cond === 'toxic') {
        return hasStatus(
            (n, c) =>
                n.includes('badly poisoned') ||
                c.includes('badly poisoned') ||
                n.includes('toxic') ||
                c.includes('toxic')
        );
    }
    if (cond === 'paralysis' || cond === 'paralyzed') {
        return hasStatus((n, c) => n.includes('paraly') || c.includes('paraly'));
    }
    if (cond === 'frozen solid' || cond === 'frozen' || cond === 'freeze') {
        return hasStatus(
            (n, c) => n.includes('frozen') || c.includes('frozen') || n.includes('freeze') || c.includes('freeze')
        );
    }
    if (cond === 'sleep' || cond === 'asleep' || cond === 'sleeping') {
        return hasStatus((n, c) => n.includes('sleep') || c.includes('sleep'));
    }
    if (cond === 'confusion' || cond === 'confused') {
        return hasStatus((n, c) => n.includes('confus') || c.includes('confus'));
    }
    if (cond === 'in love' || cond === 'infatuation' || cond === 'infatuated') {
        return hasStatus(
            (n, c) => n.includes('love') || c.includes('love') || n.includes('infat') || c.includes('infat')
        );
    }
    if (cond === 'disable' || cond === 'disabled') {
        return hasStatus((n, c) => n.includes('disable') || c.includes('disable'));
    }
    if (cond === 'flinch' || cond === 'flinched') {
        return hasStatus((n, c) => n.includes('flinch') || c.includes('flinch'));
    }

    // Direct match against standard or custom status name
    if (hasStatus((n, c) => n === cond || c === cond)) {
        return true;
    }

    return false;
}

// =========================================
// REGEX TAG EXTRACTORS
// =========================================

const MOVE_MODIFIERS = [
    'charge move',
    'copy move',
    'force field',
    'basic heal',
    'complete heal',
    'minor heal',
    'high critical',
    'low accuracy',
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

function extractStats(description: string, bonuses: CombatBonuses, triggers: TagTriggers, isHalfHp: boolean) {
    const statMatches = description.matchAll(
        /\[\s*(str|strength|dex|dexterity|vit|vitality|spe|special|ins|insight|tou|tough|coo|cool|bea|beauty|cut|cute|cle|clever)\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of statMatches) {
        if (!checkCondition(match[3], isHalfHp)) continue;
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
        triggers.general = true;
    }
}

function extractSkills(
    description: string,
    escapedSkills: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean
) {
    if (!escapedSkills) return;
    const skillMatches = description.matchAll(
        new RegExp(`\\[\\s*(${escapedSkills})\\s*([+-]?\\s*\\d+)(?:\\s*@\\s*([^\\]]+))?\\s*\\]`, 'gi')
    );
    for (const match of skillMatches) {
        if (!checkCondition(match[3], isHalfHp)) continue;
        bonuses.skills[match[1].toLowerCase()] = (bonuses.skills[match[1].toLowerCase()] || 0) + safeParseInt(match[2]);
        triggers.general = true;
    }
}

function extractDefenses(description: string, bonuses: CombatBonuses, triggers: TagTriggers, isHalfHp: boolean) {
    const defenseMatches = description.matchAll(/\[\s*def\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of defenseMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.def += safeParseInt(match[1]);
        triggers.general = true;
    }

    const specialDefenseMatches = description.matchAll(/\[\s*spd\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of specialDefenseMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.spd += safeParseInt(match[1]);
        triggers.general = true;
    }
}

function extractInitiativeAndChance(
    description: string,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean
) {
    const initiativeMatches = description.matchAll(/\[\s*init\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of initiativeMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.init += safeParseInt(match[1]);
        triggers.general = true;
    }

    const chanceMatches = description.matchAll(/\[\s*chance\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of chanceMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.chance += safeParseInt(match[1]);
        triggers.general = true;
    }
}

function matchesModifier(req: string, move: MoveData | undefined): boolean {
    if (!move) return false;
    const desc = (move.desc || '').toLowerCase();
    const name = (move.name || '').toLowerCase();
    if (desc.includes(req) || name.includes(req)) return true;
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

function extractDamage(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    isComboMove: boolean,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean
) {
    const damageMatches = description.matchAll(
        /\[\s*dmg\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of damageMatches) {
        if (!checkCondition(match[3], isHalfHp)) continue;
        const requirement = match[2]?.toLowerCase().trim();

        if (!requirement || requirement === moveType) {
            bonuses.dmg += safeParseInt(match[1]);
            triggers.damage = true;
        } else if (requirement === 'super effective') {
            bonuses.seDmg += safeParseInt(match[1]);
            triggers.damage = true;
        } else if (requirement === 'stab') {
            const state = useCharacterStore.getState();
            const p1 = (state.identity.type1 || '').toLowerCase();
            const p2 = (state.identity.type2 || '').toLowerCase();
            if (moveType && (moveType === p1 || moveType === p2)) {
                bonuses.dmg += safeParseInt(match[1]);
                triggers.damage = true;
            }
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.dmg += safeParseInt(match[1]);
            triggers.damage = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.dmg += safeParseInt(match[1]);
            triggers.damage = true;
        } else if (move && (MOVE_MODIFIERS.includes(requirement) || matchesModifier(requirement, move))) {
            if (matchesModifier(requirement, move)) {
                bonuses.dmg += safeParseInt(match[1]);
                triggers.damage = true;
            }
        }
    }

    const comboMatches = description.matchAll(/\[\s*combo dmg\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of comboMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        if (isComboMove) {
            bonuses.dmg += safeParseInt(match[1]);
            triggers.damage = true;
        }
    }
}

function extractAccuracy(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean
) {
    const accuracyMatches = description.matchAll(
        /\[\s*acc\s*([+-]?\s*\d+)(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of accuracyMatches) {
        if (!checkCondition(match[3], isHalfHp)) continue;
        const requirement = match[2]?.toLowerCase().trim();

        if (!requirement || requirement === moveType) {
            bonuses.acc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (requirement === 'low accuracy') {
            const moveDesc = (move?.desc || '').toLowerCase();
            const moveName = (move?.name || '').toLowerCase();
            const hasLowAcc =
                bonuses.addLowAcc > 0 || moveDesc.includes('low accuracy') || moveName.includes('low accuracy');
            if (hasLowAcc) {
                bonuses.acc += safeParseInt(match[1]);
                triggers.accuracy = true;
            }
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.acc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.acc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && (MOVE_MODIFIERS.includes(requirement) || matchesModifier(requirement, move))) {
            if (matchesModifier(requirement, move)) {
                bonuses.acc += safeParseInt(match[1]);
                triggers.accuracy = true;
            }
        }
    }
}

function extractCritDamage(description: string, bonuses: CombatBonuses, triggers: TagTriggers, isHalfHp: boolean) {
    const critMatches = description.matchAll(
        /\[\s*crit(?:\s*dmg|\s*damage)?\s*([+-]?\s*\d+)(?:\s*(?:dmg|damage))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of critMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.critDmg += safeParseInt(match[1]);
        triggers.damage = true;
    }
}

function extractLowAccuracy(
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

function extractFirstHit(description: string, bonuses: CombatBonuses, triggers: TagTriggers, isHalfHp: boolean) {
    const firstHitDmgMatches = description.matchAll(/\[\s*first hit dmg\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of firstHitDmgMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.firstHitDmg += safeParseInt(match[1]);
        triggers.damage = true;
    }

    const firstHitAccMatches = description.matchAll(/\[\s*first hit acc\s*([+-]?\s*\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of firstHitAccMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.firstHitAcc += safeParseInt(match[1]);
        triggers.accuracy = true;
    }
}

function extractTempHp(description: string, bonuses: CombatBonuses, triggers: TagTriggers, isHalfHp: boolean) {
    const tempHpMatches = description.matchAll(/\[\s*gain temp hp\s*(\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of tempHpMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.gainTempHp += safeParseInt(match[1]);
        triggers.damage = true;
    }

    const tempHpOnHitMatches = description.matchAll(/\[\s*temp hp \+(\d+)\s*on hit(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of tempHpOnHitMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.tempHpOnHit += safeParseInt(match[1]);
        triggers.damage = true;
    }

    const tempHpDmgMatches = description.matchAll(/\[\s*temp hp\s*([\d./%]+)\s*dmg(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of tempHpDmgMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.tempHpDmgRatio = match[1].trim();
        triggers.damage = true;
    }
}

function extractRoundEffects(description: string, bonuses: CombatBonuses, triggers: TagTriggers, isHalfHp: boolean) {
    const damageMatch = description.matchAll(
        /\[\s*(?:deal\s*)?(\d+)\s*(?:damage|dmg)\s*(?:at end of round|at round end|round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of damageMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundDamage += safeParseInt(match[1]);
        triggers.general = true;
    }

    const willDmgMatch = description.matchAll(
        /\[\s*reduce\s*will\s*(?:by\s*)?(\d+)\s*(?:at end of round|at round end|round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of willDmgMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundWillDamage += safeParseInt(match[1]);
        triggers.general = true;
    }

    const healMatch = description.matchAll(
        /\[\s*heal\s*(\d+)(?:\s*hp)?\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of healMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundHeal += safeParseInt(match[1]);
        triggers.general = true;
    }

    const willHealMatch = description.matchAll(
        /\[\s*restore\s*(\d+)\s*will\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of willHealMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundWillRestore += safeParseInt(match[1]);
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

function extractMechanics(
    description: string,
    moveType: string,
    move: MoveData | undefined,
    bonuses: CombatBonuses,
    triggers: TagTriggers,
    isHalfHp: boolean
) {
    const hcMatches = description.matchAll(/\[\s*high crit(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of hcMatches) {
        if (!checkCondition(match[1], isHalfHp)) continue;
        bonuses.highCritStacks += 1;
        triggers.accuracy = true;
    }

    const stackHcMatches = description.matchAll(/\[\s*stacking high crit(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of stackHcMatches) {
        if (!checkCondition(match[1], isHalfHp)) continue;
        bonuses.stackingHighCritStacks += 1;
        triggers.accuracy = true;
    }

    const ignorePainMatches = description.matchAll(/\[\s*ignore pain(?:\s*:\s*([^\]@]+))?(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of ignorePainMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        const requirement = match[1]?.toLowerCase().trim();

        if (!requirement || requirement === moveType) {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.ignorePain = true;
            triggers.general = true;
        } else if (move && MOVE_MODIFIERS.includes(requirement)) {
            const moveDesc = (move.desc || '').toLowerCase();
            const moveName = (move.name || '').toLowerCase();
            if (moveDesc.includes(requirement) || moveName.includes(requirement)) {
                bonuses.ignorePain = true;
                triggers.general = true;
            }
        }
    }

    const ignoreAccuracyMatches = description.matchAll(/\[\s*ignore low acc\s*(\d+)(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of ignoreAccuracyMatches) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.ignoreLowAcc += safeParseInt(match[1]);
        triggers.accuracy = true;
    }

    // Capture both [Acc 6s Add Dmg] and [Acc 6s Add Dmg Limit 6]
    const accFaceMatch = description.matchAll(
        /\[\s*acc\s*(\d+)s\s*add(?:s)?\s*dmg(?:\s*limit\s*(\d+))?(?:\s*@\s*([^\]]+))?\s*\]/gi
    );
    for (const match of accFaceMatch) {
        if (!checkCondition(match[3], isHalfHp)) continue;
        bonuses.accFaceAddsDmg = safeParseInt(match[1]);
        bonuses.accFaceAddsDmgLimit = safeParseInt(match[2]) || 6; // Defaults to 6 if limit isn't explicitly defined!
        triggers.accuracy = true;
    }
}

// =========================================
// MAIN PARSING ORCHESTRATOR
// =========================================

export function parseCombatTags(
    inventory: InventoryItem[],
    extraCategories: ExtraCategory[],
    move?: MoveData,
    abilityText: string = ''
): CombatBonuses {
    const bonuses: CombatBonuses = {
        stats: {},
        skills: {},
        def: 0,
        spd: 0,
        init: 0,
        dmg: 0,
        acc: 0,
        chance: 0,
        seDmg: 0,
        critDmg: 0,
        firstHitDmg: 0,
        firstHitAcc: 0,
        gainTempHp: 0,
        tempHpOnHit: 0,
        tempHpDmgRatio: '',
        highCritStacks: 0,
        stackingHighCritStacks: 0,
        ignoreLowAcc: 0,
        addLowAcc: 0,
        ignorePain: false,
        roundHeal: 0,
        roundDamage: 0,
        roundWillRestore: 0,
        roundWillDamage: 0,
        loseAction: 0,
        noReactions: false,
        extraReactions: 0,
        accFaceAddsDmg: 0,
        accFaceAddsDmgLimit: 0,
        itemNames: [],
        accItemNames: [],
        dmgItemNames: [],
        abilityNames: [],
        accAbilityNames: [],
        dmgAbilityNames: []
    };

    const state = useCharacterStore.getState();
    const hpCurr = Number(state.health.hpCurr) || 0;
    const hpMax = Math.max(1, Number(state.health.hpMax) || 1);
    const isHalfHp = hpCurr <= Math.floor(hpMax / 2);

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

    if (state.identity.abilityActive !== false) {
        let desc = state.identity.abilityTags;
        const cleanAbility = (state.identity.ability || '').replace(/\s*\(HA\)$/i, '').trim();
        const known = getKnownAbility(cleanAbility, state.identity.rank);

        if (known) {
            desc = known.tags;
        } else if (
            !state.roomCustomAbilities?.some((ca) => ca.name.trim().toLowerCase() === cleanAbility.toLowerCase())
        ) {
            if (
                desc &&
                (desc.includes('[Str +1]') || desc.includes('[Str +2]')) &&
                cleanAbility !== 'Huge Power' &&
                cleanAbility !== 'Pure Power'
            ) {
                desc = '';
            }
        }

        if (desc) {
            if (cleanAbility === 'Huge Power' || cleanAbility === 'Pure Power') {
                const rank = (state.identity.rank || 'Starter').toLowerCase().trim();
                const isHigh = rank === 'expert' || rank === 'ace' || rank === 'master' || rank === 'champion';
                if (!isHigh && desc.includes('[Str +2]')) {
                    desc = desc.replace(/\[Str \+2\]/g, '[Str +1]');
                } else if (isHigh && desc.includes('[Str +1]')) {
                    desc = desc.replace(/\[Str \+1\]/g, '[Str +2]');
                }
            }
            const abilityDisplayName = state.identity.ability ? `Ability: ${state.identity.ability}` : 'Ability';
            itemsToParse.push({ name: abilityDisplayName, desc });
        }
    }

    if (move && move.desc) {
        itemsToParse.push({ name: move.name || 'Move', desc: move.desc });
    }

    if (state.identity.activeTransformation === 'Custom' && state.identity.activeFormId) {
        const customForm = state.roomCustomForms.find((f) => f.id === state.identity.activeFormId);
        if (customForm && customForm.tags) {
            itemsToParse.push({ name: customForm.name, desc: customForm.tags });
        }
    }

    // Automatically parse Active Status effects!
    state.statuses.forEach((status) => {
        const custom = state.roomCustomStatuses.find(
            (cs) =>
                cs.name.toLowerCase() === status.name.toLowerCase() ||
                cs.name.toLowerCase() === status.customName.toLowerCase()
        );
        if (custom && custom.effects) {
            itemsToParse.push({ name: custom.name, desc: custom.effects });
        }
    });

    itemsToParse.forEach((item) => {
        const description = item.desc.toLowerCase();
        const name = item.name.trim();

        const triggers: TagTriggers = {
            general: false,
            accuracy: false,
            damage: false
        };

        extractStats(description, bonuses, triggers, isHalfHp);
        extractSkills(description, escapedSkills, bonuses, triggers, isHalfHp);
        extractDefenses(description, bonuses, triggers, isHalfHp);
        extractInitiativeAndChance(description, bonuses, triggers, isHalfHp);
        extractDamage(description, moveType, move, isComboMove, bonuses, triggers, isHalfHp);
        extractCritDamage(description, bonuses, triggers, isHalfHp);
        extractLowAccuracy(description, moveType, move, bonuses, triggers, isHalfHp);
        extractAccuracy(description, moveType, move, bonuses, triggers, isHalfHp);
        extractFirstHit(description, bonuses, triggers, isHalfHp);
        extractTempHp(description, bonuses, triggers, isHalfHp);
        extractRoundEffects(description, bonuses, triggers, isHalfHp);
        extractMechanics(description, moveType, move, bonuses, triggers, isHalfHp);

        if (name.startsWith('Ability:')) {
            const cleanAbilityName = name.replace('Ability:', '').trim();
            if (triggers.general || triggers.accuracy || triggers.damage) bonuses.abilityNames.push(cleanAbilityName);
            if (triggers.general || triggers.accuracy) bonuses.accAbilityNames.push(cleanAbilityName);
            if (triggers.general || triggers.damage) bonuses.dmgAbilityNames.push(cleanAbilityName);
        } else if (name && name !== 'Ability' && name !== 'Move' && name !== 'Active Form') {
            if (triggers.general || triggers.accuracy || triggers.damage) bonuses.itemNames.push(name);
            if (triggers.general || triggers.accuracy) bonuses.accItemNames.push(name);
            if (triggers.general || triggers.damage) bonuses.dmgItemNames.push(name);
        }
    });

    return bonuses;
}
