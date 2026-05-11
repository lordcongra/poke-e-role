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
    itemNames: string[];
    accItemNames: string[];
    dmgItemNames: string[];
}

interface TagTriggers {
    general: boolean;
    accuracy: boolean;
    damage: boolean;
}

const safeParseInt = (value: string) => parseInt((value || '0').replace(/\s/g, '')) || 0;

// =========================================
// REGEX TAG EXTRACTORS
// =========================================

function extractStats(description: string, bonuses: CombatBonuses, triggers: TagTriggers) {
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
        triggers.general = true;
    }
}

function extractSkills(description: string, escapedSkills: string, bonuses: CombatBonuses, triggers: TagTriggers) {
    if (!escapedSkills) return;
    const skillMatches = description.matchAll(new RegExp(`\\[\\s*(${escapedSkills})\\s*([+-]?\\s*\\d+)\\s*\\]`, 'gi'));
    for (const match of skillMatches) {
        bonuses.skills[match[1].toLowerCase()] = (bonuses.skills[match[1].toLowerCase()] || 0) + safeParseInt(match[2]);
        triggers.general = true;
    }
}

function extractDefenses(description: string, bonuses: CombatBonuses, triggers: TagTriggers) {
    const defenseMatches = description.matchAll(/\[\s*def\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of defenseMatches) {
        bonuses.def += safeParseInt(match[1]);
        triggers.general = true;
    }

    const specialDefenseMatches = description.matchAll(/\[\s*spd\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of specialDefenseMatches) {
        bonuses.spd += safeParseInt(match[1]);
        triggers.general = true;
    }
}

function extractInitiativeAndChance(description: string, bonuses: CombatBonuses, triggers: TagTriggers) {
    const initiativeMatches = description.matchAll(/\[\s*init\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of initiativeMatches) {
        bonuses.init += safeParseInt(match[1]);
        triggers.general = true;
    }

    const chanceMatches = description.matchAll(/\[\s*chance\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of chanceMatches) {
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
    triggers: TagTriggers
) {
    const damageMatches = description.matchAll(/\[\s*dmg\s*([+-]?\s*\d+)(?:\s*:\s*([\w\s]+))?\s*\]/gi);
    for (const match of damageMatches) {
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
        }
    }

    const comboMatches = description.matchAll(/\[\s*combo dmg\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of comboMatches) {
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
    triggers: TagTriggers
) {
    const accuracyMatches = description.matchAll(/\[\s*acc\s*([+-]?\s*\d+)(?:\s*:\s*([\w\s]+))?\s*\]/gi);
    for (const match of accuracyMatches) {
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
        }
    }
}

function extractFirstHit(description: string, bonuses: CombatBonuses, triggers: TagTriggers) {
    const firstHitDmgMatches = description.matchAll(/\[\s*first hit dmg\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of firstHitDmgMatches) {
        bonuses.firstHitDmg += safeParseInt(match[1]);
        triggers.damage = true;
    }

    const firstHitAccMatches = description.matchAll(/\[\s*first hit acc\s*([+-]?\s*\d+)\s*\]/gi);
    for (const match of firstHitAccMatches) {
        bonuses.firstHitAcc += safeParseInt(match[1]);
        triggers.accuracy = true;
    }
}

function extractTempHp(description: string, bonuses: CombatBonuses, triggers: TagTriggers) {
    const tempHpMatches = description.matchAll(/\[\s*gain temp hp\s*(\d+)\s*\]/gi);
    for (const match of tempHpMatches) {
        bonuses.gainTempHp += safeParseInt(match[1]);
        triggers.damage = true;
    }

    const tempHpOnHitMatches = description.matchAll(/\[\s*temp hp \+(\d+)\s*on hit\s*\]/gi);
    for (const match of tempHpOnHitMatches) {
        bonuses.tempHpOnHit += safeParseInt(match[1]);
        triggers.damage = true;
    }

    const tempHpDmgMatches = description.matchAll(/\[\s*temp hp\s*([\d./%]+)\s*dmg\s*\]/gi);
    for (const match of tempHpDmgMatches) {
        bonuses.tempHpDmgRatio = match[1].trim();
        triggers.damage = true;
    }
}

function extractMechanics(description: string, bonuses: CombatBonuses, triggers: TagTriggers) {
    if (/\[\s*high crit\s*\]/i.test(description)) {
        bonuses.highCritStacks += 1;
        triggers.accuracy = true;
    }
    if (/\[\s*stacking high crit\s*\]/i.test(description)) {
        bonuses.stackingHighCritStacks += 1;
        triggers.accuracy = true;
    }

    const ignoreAccuracyMatches = description.matchAll(/\[\s*ignore low acc\s*(\d+)\s*\]/gi);
    for (const match of ignoreAccuracyMatches) {
        bonuses.ignoreLowAcc += safeParseInt(match[1]);
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
        itemNames: [],
        accItemNames: [],
        dmgItemNames: []
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

    if (move && move.desc) {
        itemsToParse.push({ name: move.name || 'Move', desc: move.desc });
    }

    const state = useCharacterStore.getState();
    if (state.identity.activeTransformation === 'Custom' && state.identity.activeFormId) {
        const customForm = state.roomCustomForms.find((f) => f.id === state.identity.activeFormId);
        if (customForm && customForm.tags) {
            itemsToParse.push({ name: customForm.name, desc: customForm.tags });
        }
    }

    itemsToParse.forEach((item) => {
        const description = item.desc.toLowerCase();
        const name = item.name.trim();

        const triggers: TagTriggers = {
            general: false,
            accuracy: false,
            damage: false
        };

        extractStats(description, bonuses, triggers);
        extractSkills(description, escapedSkills, bonuses, triggers);
        extractDefenses(description, bonuses, triggers);
        extractInitiativeAndChance(description, bonuses, triggers);
        extractDamage(description, moveType, move, isComboMove, bonuses, triggers);
        extractAccuracy(description, moveType, move, bonuses, triggers);
        extractFirstHit(description, bonuses, triggers);
        extractTempHp(description, bonuses, triggers);
        extractMechanics(description, bonuses, triggers);

        if (name && name !== 'Ability' && name !== 'Move' && name !== 'Active Form') {
            if (triggers.general || triggers.accuracy || triggers.damage) bonuses.itemNames.push(name);
            if (triggers.general || triggers.accuracy) bonuses.accItemNames.push(name);
            if (triggers.general || triggers.damage) bonuses.dmgItemNames.push(name);
        }
    });

    return bonuses;
}
