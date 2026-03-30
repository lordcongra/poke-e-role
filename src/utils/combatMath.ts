// src/utils/combatMath.ts
import type { InventoryItem, MoveData, CharacterState, ExtraCategory, CustomAbility } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';

export const ATTRIBUTE_MAPPING: Record<string, string> = {
    "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins",
    "Tough": "tou", "Cool": "coo", "Beauty": "bea", "Cute": "cut", "Clever": "cle", "Will": "will"
};

export function getAbilityText(abilityName: string, customAbilities: CustomAbility[]): string {
    if (!abilityName) return "";
    const custom = customAbilities.find(a => a.name.trim().toLowerCase() === abilityName.trim().toLowerCase());
    return custom ? `${custom.description} ${custom.effect}` : "";
}

const safeParseInt = (val: string) => parseInt((val || "0").replace(/\s/g, '')) || 0;

export function parseCombatTags(inventory: InventoryItem[], extraCategories: ExtraCategory[], move?: MoveData, abilityText: string = "") {
    const bonuses = {
        stats: {} as Record<string, number>, skills: {} as Record<string, number>,
        def: 0, spd: 0, init: 0, dmg: 0, acc: 0, chance: 0, seDmg: 0,
        highCritStacks: 0, stackingHighCritStacks: 0, ignoreLowAcc: 0, 
        itemNames: [] as string[],
        accItemNames: [] as string[],
        dmgItemNames: [] as string[]
    };

    const moveType = (move?.type || "").trim().toLowerCase();
    const moveDesc = (move?.desc || "").toLowerCase();
    const moveName = (move?.name || "").toLowerCase();
    const isComboMove = moveDesc.includes("successive") || moveDesc.includes("double action") || moveDesc.includes("triple action") || moveName.includes("double") || moveName.includes("triple");

    const customSkillNames = extraCategories.flatMap(c => c.skills.map(s => (s.name || '').toLowerCase())).filter(Boolean);
    const skillsList = [...Object.values(Skill), ...customSkillNames];
    const escapedSkills = skillsList.map(s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

    const itemsToParse = inventory.filter(i => i.active).map(i => ({ name: i.name || "", desc: i.desc || "" }));

    if (abilityText) {
        itemsToParse.push({ name: "Ability", desc: abilityText });
    }

    itemsToParse.forEach(item => {
        const desc = item.desc.toLowerCase();
        const name = item.name.trim();
        
        let accTriggered = false;
        let dmgTriggered = false;
        let generalTriggered = false;

        const statMatches = desc.matchAll(/\[\s*(str|strength|dex|dexterity|vit|vitality|spe|special|ins|insight|tou|tough|coo|cool|bea|beauty|cut|cute|cle|clever)\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of statMatches) {
            const rawStat = match[1].toLowerCase();
            const map: Record<string, string> = { 'strength': 'str', 'dexterity': 'dex', 'vitality': 'vit', 'special': 'spe', 'insight': 'ins', 'tough': 'tou', 'cool': 'coo', 'beauty': 'bea', 'cute': 'cut', 'clever': 'cle' };
            const statKey = map[rawStat] || rawStat;
            bonuses.stats[statKey] = (bonuses.stats[statKey] || 0) + safeParseInt(match[2]);
            generalTriggered = true;
        }

        const skillMatches = desc.matchAll(new RegExp(`\\[\\s*(${escapedSkills})\\s*([+-]?\\s*\\d+)\\s*\\]`, 'gi'));
        for (const match of skillMatches) { 
            bonuses.skills[match[1].toLowerCase()] = (bonuses.skills[match[1].toLowerCase()] || 0) + safeParseInt(match[2]); 
            generalTriggered = true; 
        }

        const defMatches = desc.matchAll(/\[\s*def\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of defMatches) { bonuses.def += safeParseInt(match[1]); generalTriggered = true; }
       
        const spdMatches = desc.matchAll(/\[\s*spd\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of spdMatches) { bonuses.spd += safeParseInt(match[1]); generalTriggered = true; }

        const initMatches = desc.matchAll(/\[\s*init\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of initMatches) { bonuses.init += safeParseInt(match[1]); generalTriggered = true; }

        const chanceMatches = desc.matchAll(/\[\s*chance\s*([+-]?\s*\d+)\s*\]/gi);
        for (const match of chanceMatches) { bonuses.chance += safeParseInt(match[1]); generalTriggered = true; }

        if (move) {
            const dmgMatches = desc.matchAll(/\[\s*dmg\s*([+-]?\s*\d+)(?:\s*:\s*([\w\s]+))?\s*\]/gi);
            for (const match of dmgMatches) {
                const requirement = match[2]?.toLowerCase().trim();
                
                if (!requirement || requirement === moveType) { bonuses.dmg += safeParseInt(match[1]); dmgTriggered = true; }
                else if (requirement === "super effective") { bonuses.seDmg += safeParseInt(match[1]); dmgTriggered = true; }
                // AUDIT FIX: Checks if the move matches the requested category!
                else if (requirement === "physical" && move.category === 'Physical') { bonuses.dmg += safeParseInt(match[1]); dmgTriggered = true; }
                else if (requirement === "special" && move.category === 'Special') { bonuses.dmg += safeParseInt(match[1]); dmgTriggered = true; }
            }

            const accMatches = desc.matchAll(/\[\s*acc\s*([+-]?\s*\d+)(?:\s*:\s*([\w\s]+))?\s*\]/gi);
            for (const match of accMatches) {
                const requirement = match[2]?.toLowerCase().trim();
                
                if (!requirement || requirement === moveType) { bonuses.acc += safeParseInt(match[1]); accTriggered = true; }
                // AUDIT FIX: Added category support to accuracy tags too, just in case!
                else if (requirement === "physical" && move.category === 'Physical') { bonuses.acc += safeParseInt(match[1]); accTriggered = true; }
                else if (requirement === "special" && move.category === 'Special') { bonuses.acc += safeParseInt(match[1]); accTriggered = true; }
            }

            const comboMatches = desc.matchAll(/\[\s*combo dmg\s*([+-]?\s*\d+)\s*\]/gi);
            for (const match of comboMatches) {
                if (isComboMove) { bonuses.dmg += safeParseInt(match[1]); dmgTriggered = true; }
            }
        } else {
            const dmgMatches = desc.matchAll(/\[\s*dmg\s*([+-]?\s*\d+)\s*\]/gi);
            for (const match of dmgMatches) { bonuses.dmg += safeParseInt(match[1]); dmgTriggered = true; }
            const accMatches = desc.matchAll(/\[\s*acc\s*([+-]?\s*\d+)\s*\]/gi);
            for (const match of accMatches) { bonuses.acc += safeParseInt(match[1]); accTriggered = true; }
        }

        if (/\[\s*high crit\s*\]/i.test(desc)) { bonuses.highCritStacks += 1; accTriggered = true; }
        if (/\[\s*stacking high crit\s*\]/i.test(desc)) { bonuses.stackingHighCritStacks += 1; accTriggered = true; }
        
        const ignoreAccMatches = desc.matchAll(/\[\s*ignore low acc\s*(\d+)\s*\]/gi);
        for (const match of ignoreAccMatches) { bonuses.ignoreLowAcc += safeParseInt(match[1]); accTriggered = true; }

        if (name && name !== "Ability") {
            if (generalTriggered || accTriggered || dmgTriggered) bonuses.itemNames.push(name);
            if (generalTriggered || accTriggered) bonuses.accItemNames.push(name);
            if (generalTriggered || dmgTriggered) bonuses.dmgItemNames.push(name);
        }
    });

    return bonuses;
}

export function getPainPenalty(attr: string, state: CharacterState): number {
    if (state.identity.pain !== 'Enabled') return 0;
   
    const normAttr = attr.toLowerCase();
    if (normAttr === 'vit' || normAttr === 'will') return 0;

    const currHp = state.health.hpCurr;
    const maxHp = state.health.hpMax;
    const ignoredPain = state.trackers.ignoredPain;
   
    let rawPenalty = 0;
    if (currHp <= 1) rawPenalty = 2;
    else if (currHp <= Math.floor(maxHp / 2)) rawPenalty = 1;

    const finalPenalty = Math.max(0, rawPenalty - ignoredPain);
    return finalPenalty > 0 ? -finalPenalty : 0;
}

export function getStatusPenalties(state: CharacterState) {
    let confusionPenalty = 0; let paralysisDexPenalty = 0;
    let isAsleep = false; let isFrozen = false;
   
    const abilityStr = (state.identity.ability || "").toLowerCase();
    const activeStatuses = state.statuses.map(s => (s.name === "Custom..." ? s.customName : s.name).toLowerCase());

    activeStatuses.forEach(sName => {
        if (sName !== "healthy") {
            if (sName === "confusion") {
                const rank = state.identity.rank;
                if (["Starter", "Rookie", "Standard"].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -1);
                else if (["Advanced", "Expert", "Ace"].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -2);
                else confusionPenalty = Math.min(confusionPenalty, -3);
            }
            if (sName === "paralysis") { if (!abilityStr.includes("limber")) paralysisDexPenalty = Math.min(paralysisDexPenalty, -2); }
            if (sName === "sleep") { if (!abilityStr.includes("insomnia") && !abilityStr.includes("vital spirit") && !abilityStr.includes("sweet veil")) isAsleep = true; }
            if (sName === "frozen solid") isFrozen = true;
        }
    });

    return { confusionPenalty, paralysisDexPenalty, isAsleep, isFrozen };
}

export function calculateBaseDamage(move: MoveData, state: CharacterState): number {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move, abilityText);
    const extraDice = state.trackers.globalDmg + itemBuffs.dmg;

    let scalingVal = 0;
    const normalizedDmgStat = ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1;
    
    if (normalizedDmgStat) {
        if (state.stats[normalizedDmgStat as CombatStat]) {
            const s = state.stats[normalizedDmgStat as CombatStat];
            scalingVal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[normalizedDmgStat] || 0));
        } else if (state.socials[normalizedDmgStat as SocialStat]) {
            const s = state.socials[normalizedDmgStat as SocialStat];
            scalingVal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[normalizedDmgStat] || 0));
        }
    }

    const abilityStr = (state.identity.ability || "").toLowerCase();
    const isProtean = abilityStr.includes("protean") || abilityStr.includes("libero");
    const typingStr = `${state.identity.type1} / ${state.identity.type2}`;
    const hasTypeMatch = move.type && typingStr.includes(move.type);

    const stabBonus = (hasTypeMatch || isProtean) ? 1 : 0;
    return move.power + scalingVal + extraDice + stabBonus;
}