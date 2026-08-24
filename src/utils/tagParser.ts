import type { InventoryItem, MoveData, ExtraCategory } from '../store/storeTypes';
import { Skill } from '../types/enums';
import { useCharacterStore } from '../store/useCharacterStore';

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
    if (cond === 'half hp' || cond === 'half hp or less') return isHalfHp;
    return true; // Default to true if condition is unrecognized
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
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.dmg += safeParseInt(match[1]);
            triggers.damage = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.dmg += safeParseInt(match[1]);
            triggers.damage = true;
        } else if (move && MOVE_MODIFIERS.includes(requirement)) {
            const moveDesc = (move.desc || '').toLowerCase();
            const moveName = (move.name || '').toLowerCase();
            if (moveDesc.includes(requirement) || moveName.includes(requirement)) {
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
        } else if (move && requirement === 'physical' && move.category === 'Physical') {
            bonuses.acc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && requirement === 'special' && move.category === 'Special') {
            bonuses.acc += safeParseInt(match[1]);
            triggers.accuracy = true;
        } else if (move && MOVE_MODIFIERS.includes(requirement)) {
            const moveDesc = (move.desc || '').toLowerCase();
            const moveName = (move.name || '').toLowerCase();
            if (moveDesc.includes(requirement) || moveName.includes(requirement)) {
                bonuses.acc += safeParseInt(match[1]);
                triggers.accuracy = true;
            }
        }
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
        } else if (move && MOVE_MODIFIERS.includes(requirement)) {
            const moveDesc = (move.desc || '').toLowerCase();
            const moveName = (move.name || '').toLowerCase();
            if (moveDesc.includes(requirement) || moveName.includes(requirement)) {
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
    const damageMatch = description.matchAll(/\[\s*deal (\d+) damage at end of round(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of damageMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundDamage += safeParseInt(match[1]);
        triggers.general = true;
    }

    const willDmgMatch = description.matchAll(/\[\s*reduce will by (\d+) at end of round(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of willDmgMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundWillDamage += safeParseInt(match[1]);
        triggers.general = true;
    }

    const healMatch = description.matchAll(/\[\s*heal (\d+) round end(?:\s*@\s*([^\]]+))?\s*\]/gi);
    for (const match of healMatch) {
        if (!checkCondition(match[2], isHalfHp)) continue;
        bonuses.roundHeal += safeParseInt(match[1]);
        triggers.general = true;
    }

    const willHealMatch = description.matchAll(/\[\s*restore (\d+) will round end(?:\s*@\s*([^\]]+))?\s*\]/gi);
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
        dmgItemNames: []
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
        extractAccuracy(description, moveType, move, bonuses, triggers, isHalfHp);
        extractLowAccuracy(description, moveType, move, bonuses, triggers, isHalfHp);
        extractFirstHit(description, bonuses, triggers, isHalfHp);
        extractTempHp(description, bonuses, triggers, isHalfHp);
        extractRoundEffects(description, bonuses, triggers, isHalfHp);
        extractMechanics(description, moveType, move, bonuses, triggers, isHalfHp);

        if (name && name !== 'Ability' && name !== 'Move' && name !== 'Active Form') {
            if (triggers.general || triggers.accuracy || triggers.damage) bonuses.itemNames.push(name);
            if (triggers.general || triggers.accuracy) bonuses.accItemNames.push(name);
            if (triggers.general || triggers.damage) bonuses.dmgItemNames.push(name);
        }
    });

    return bonuses;
}
