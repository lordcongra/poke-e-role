// src/utils/rollEngine.ts
import OBR from "@owlbear-rodeo/sdk";
import type { MoveData, CharacterState, SkillCheck, StatusItem } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { useCharacterStore } from '../store/useCharacterStore';
import { ATTRIBUTE_MAPPING, parseCombatTags, getPainPenalty, getStatusPenalties } from './combatMath';

export async function rollDicePlus(notation: string, label: string, rollType = "roll", payload = "") {
    if (!OBR.isAvailable) {
        console.log(`[Offline Roll] ${notation} for ${label}`);
        return;
    }
    try {
        OBR.notification.show(label); 

        const state = useCharacterStore.getState();
        const rollId = `${rollType}|${state.tokenId}|${payload || crypto.randomUUID()}`;
        
        const playerId = await OBR.player.getId();
        const playerName = await OBR.player.getName();
        const targetVisibility = state.identity.rolls === 'Private (GM)' ? 'gm_only' : 'everyone';
        
        await OBR.broadcast.sendMessage("dice-plus/roll-request", {
            rollId: rollId, playerId, playerName, rollTarget: targetVisibility,
            diceNotation: notation, showResults: true, timestamp: Date.now(), source: 'pokerole-pmd-extension'
        }, { destination: 'ALL' });
    } catch (e) { 
        console.error("Dice+ Error:", e); 
    }
}

export async function rollGeneric(actionName: string, pool: number, attr: string, incrementEvade = false, incrementClash = false, incrementAction = false) {
    const state = useCharacterStore.getState();
    const nickname = state.identity.nickname || state.identity.species || "Someone";
    const abilityStr = (state.identity.ability || "").toLowerCase();

    const statuses = getStatusPenalties(state);
    const hasComatose = abilityStr.includes("comatose");

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show("⚠️ You are Asleep and cannot perform actions!", "WARNING"); 
        return;
    }
    if (statuses.isFrozen) {
        if (OBR.isAvailable) OBR.notification.show("⚠️ You are Frozen Solid and cannot perform actions!", "WARNING"); 
        return;
    }

    if (incrementAction) {
        useCharacterStore.getState().incrementAction();
    }
    if (incrementEvade) useCharacterStore.getState().updateTracker('evade', true);
    if (incrementClash) useCharacterStore.getState().updateTracker('clash', true);

    let dicePool = pool;
    if (attr.toLowerCase() === 'dex') dicePool += statuses.paralysisDexPenalty;

    const pain = getPainPenalty(attr, state);
    const genericSuccMod = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathMod = genericSuccMod !== 0 ? (genericSuccMod > 0 ? `+${genericSuccMod}` : `${genericSuccMod}`) : "";

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (genericSuccMod !== 0) tags.push(`Net Mod ${genericSuccMod > 0 ? '+' : ''}${genericSuccMod} Succ`);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexPenalty < 0 && attr.toLowerCase() === 'dex') tags.push(`Paralysis: -2 Dice`);
    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) tags.push(`FROZEN`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";

    await rollDicePlus(`${Math.max(1, dicePool)}d6>3${mathMod}`, `🎲 ${nickname} rolled ${actionName}!${finalTags}`);
}

export async function rollSkillCheck(check: SkillCheck, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || "Someone";
    const abilityStr = state.identity.ability || "";
    const statuses = getStatusPenalties(state);
    const hasComatose = abilityStr.toLowerCase().includes("comatose");

    if (statuses.isAsleep && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show("⚠️ You are Asleep and cannot perform actions!", "WARNING"); 
        return;
    }
    if (statuses.isFrozen) {
        if (OBR.isAvailable) OBR.notification.show("⚠️ You are Frozen Solid and cannot perform actions!", "WARNING"); 
        return;
    }

    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories);
    
    let attrTotal = 0;
    if (check.attr === 'will') attrTotal = state.will.willMax;
    else if (state.stats[check.attr as CombatStat]) {
        const s = state.stats[check.attr as CombatStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[check.attr] || 0));
    } else if (state.socials[check.attr as SocialStat]) {
        const s = state.socials[check.attr as SocialStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[check.attr] || 0));
    }

    let skillTotal = 0;
    if (check.skill && check.skill !== 'none') {
        if (state.skills[check.skill as Skill]) {
            const sk = state.skills[check.skill as Skill];
            skillTotal = sk.base + sk.buff + (itemBuffs.skills[check.skill] || 0);
        } else {
            for (const cat of state.extraCategories) {
                const sk = cat.skills.find(s => s.id === check.skill);
                if (sk) { skillTotal = sk.base + sk.buff + (itemBuffs.skills[check.skill] || 0); break; }
            }
        }
    }

    let dicePool = attrTotal + skillTotal;
    if (check.attr === 'dex') dicePool += statuses.paralysisDexPenalty;

    const pain = getPainPenalty(check.attr, state);
    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    
    const genericSuccMod = state.trackers.globalSucc + statuses.confusionPenalty + pain;
    const mathMod = genericSuccMod !== 0 ? (genericSuccMod > 0 ? `+${genericSuccMod}` : `${genericSuccMod}`) : "";
    if (genericSuccMod !== 0) tags.push(`Net Mod ${genericSuccMod > 0 ? '+' : ''}${genericSuccMod} Succ`);
    
    const chancesUsed = state.trackers.chances;

    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (statuses.paralysisDexPenalty < 0 && check.attr === 'dex') tags.push(`Paralysis: -2 Dice`);
    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) tags.push(`FROZEN`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
    const rollName = (check.name || "").trim() || "Skill Check";
    
    await rollDicePlus(`${Math.max(1, dicePool)}d6>3${mathMod}`, `🎲 ${nickname} rolled ${rollName}!${finalTags}`);
}

export async function rollStatus(status: StatusItem, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || "Someone";
    let pool = 0;
    let attr = "ins"; 

    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories);
 
    if (status.name.includes("Burn")) {
        attr = "dex";
        pool = Math.max(1, state.stats.dex.base + state.stats.dex.rank + state.stats.dex.buff - state.stats.dex.debuff + (itemBuffs.stats.dex || 0)) + state.skills.athletic.base + state.skills.athletic.buff + (itemBuffs.skills.athletic || 0);
    } else if (status.name === "Paralysis") {
        attr = "str";
        pool = Math.max(1, state.stats.str.base + state.stats.str.rank + state.stats.str.buff - state.stats.str.debuff + (itemBuffs.stats.str || 0)) + state.skills.medicine.base + state.skills.medicine.buff + (itemBuffs.skills.medicine || 0);
    } else if (status.name === "Sleep" || status.name === "Confusion") {
        attr = "ins";
        pool = Math.max(1, state.stats.ins.base + state.stats.ins.rank + state.stats.ins.buff - state.stats.ins.debuff + (itemBuffs.stats.ins || 0));
        if (status.name === "Sleep") useCharacterStore.getState().incrementAction();
    } else if (status.name === "In Love") {
        attr = "ins";
        pool = Math.max(state.derived.loyal, Math.max(1, state.stats.ins.base + state.stats.ins.rank + state.stats.ins.buff - state.stats.ins.debuff + (itemBuffs.stats.ins || 0)));
    } else {
        if (OBR.isAvailable) OBR.notification.show(`⚠️ ${status.name} does not have a standard self-recovery roll.`, "WARNING");
        return;
    }
 
    const pain = getPainPenalty(attr, state);
    const mathMod = pain !== 0 ? (pain > 0 ? `+${pain}` : `${pain}`) : "";

    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    const tagStr = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
    
    await rollDicePlus(`${pool}d6>3${mathMod}`, `🩹 ${nickname} rolled ${status.name} Recovery!${tagStr}`, "status", status.id);
}

export async function rollAccuracy(move: MoveData, state: CharacterState) {
    const nickname = state.identity.nickname || state.identity.species || "Someone";
    const actions = state.trackers.actions;
    const requiredSuccesses = actions + 1;
    const moveDesc = (move.desc || "").toLowerCase();
    const safeMoveName = (move.name || "").toLowerCase().trim();
    const abilityStr = state.identity.ability || "";

    const statuses = getStatusPenalties(state);
    const isSleepMove = safeMoveName === "sleep talk" || safeMoveName === "snore";
    const hasComatose = abilityStr.toLowerCase().includes("comatose");

    if (statuses.isAsleep && !isSleepMove && !hasComatose) {
        if (OBR.isAvailable) OBR.notification.show("⚠️ You are Asleep and cannot perform actions!", "WARNING"); 
        return;
    }
    if (statuses.isFrozen) {
        if (OBR.isAvailable) OBR.notification.show("⚠️ You are Frozen Solid and cannot perform actions!", "WARNING"); 
        return;
    }

    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move);
    const extraDice = state.trackers.globalAcc + itemBuffs.acc;

    let moveLowAcc = 0;
    let ignoredAccPenalty = 0;
    const lowAccMatch = moveDesc.match(/low accuracy\s*(\d+)/i);
    if (lowAccMatch) {
        const baseLowAcc = parseInt(lowAccMatch[1]) || 0;
        moveLowAcc = Math.max(0, baseLowAcc - itemBuffs.ignoreLowAcc);
        ignoredAccPenalty = baseLowAcc - moveLowAcc;
    }

    const pain = getPainPenalty(move.acc1, state);
    const succMod = state.trackers.globalSucc - moveLowAcc + statuses.confusionPenalty + pain;
    const mathMod = succMod !== 0 ? (succMod > 0 ? `+${succMod}` : `${succMod}`) : "";

    let attrTotal = 0;
    if (move.acc1 === 'will') attrTotal = state.will.willMax;
    else if (state.stats[move.acc1 as CombatStat]) {
        const s = state.stats[move.acc1 as CombatStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[move.acc1] || 0));
    } else if (state.socials[move.acc1 as SocialStat]) {
        const s = state.socials[move.acc1 as SocialStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[move.acc1] || 0));
    }

    let skillTotal = 0;
    if (move.acc2 !== 'none' && state.skills[move.acc2 as Skill]) {
        const sk = state.skills[move.acc2 as Skill];
        skillTotal = sk.base + sk.buff + (itemBuffs.skills[move.acc2] || 0);
    } else if (move.acc2 !== 'none') {
        for (const cat of state.extraCategories) {
            const sk = cat.skills.find(s => s.id === move.acc2);
            if (sk) { skillTotal = sk.base + sk.buff + (itemBuffs.skills[move.acc2] || 0); break; }
        }
    }

    let dicePool = attrTotal + skillTotal + extraDice;
    if (move.acc1 === 'dex') dicePool += statuses.paralysisDexPenalty;

    let critReq = requiredSuccesses + 3;
    let hasItemHighCrit = itemBuffs.highCritStacks > 0;
    let hasMoveHighCrit = moveDesc.includes("high critical");
    let baseCritReductions = (hasItemHighCrit || hasMoveHighCrit) ? 1 : 0;
    let totalCritReductions = baseCritReductions + itemBuffs.stackingHighCritStacks;
    
    if (abilityStr.includes("super luck")) totalCritReductions++;
    critReq = Math.max(1, critReq - totalCritReductions);

    useCharacterStore.getState().incrementAction();

    const chancesUsed = state.trackers.chances;
    const tags: string[] = [];

    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (ignoredAccPenalty > 0) tags.push(`Ignored ${ignoredAccPenalty} Low Acc`);
    if (succMod !== 0) tags.push(`Net Mod ${succMod > 0 ? '+' : ''}${succMod} Succ`);
    if (statuses.paralysisDexPenalty < 0 && move.acc1 === 'dex') tags.push(`Paralysis: -2 Dice`);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);

    tags.push(`Need ${requiredSuccesses} Succ`);
    tags.push(`Crit on ${critReq}+`);

    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else if (isSleepMove) tags.push(`ASLEEP (Bypassed)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) tags.push(`FROZEN`);
    if (moveDesc.includes("never miss") || moveDesc.includes("cannot be evaded")) tags.push(`CANNOT BE EVADED`);
    
    if (itemBuffs.accItemNames.length > 0) tags.push(`Item: ${itemBuffs.accItemNames.join(', ')}`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";

    await rollDicePlus(`${Math.max(1, dicePool)}d6>3${mathMod}`, `🎯 ${nickname} rolled ${move.name || "a Move"} (Acc)!${finalTags}`);
}

export async function executeDamageRoll(move: MoveData, state: CharacterState, baseDamage: number, isCrit: boolean, isSE: boolean, reduction: number) {
    const nickname = state.identity.nickname || state.identity.species || "Someone";
    const abilityStr = (state.identity.ability || "").toLowerCase();
    const typingStr = `${state.identity.type1} / ${state.identity.type2}`;
    const statuses = getStatusPenalties(state);
    
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, move);
    
    let actualPool = baseDamage - reduction;
    
    let seDmgBonus = 0;
    if (isSE) {
        state.inventory.filter(i => i.active).forEach(item => {
            const desc = (item.desc || "").toLowerCase();
            const seMatches = desc.matchAll(/\[dmg\s*([+-]?\d+):\s*super effective\]/gi);
            for (const match of seMatches) seDmgBonus += parseInt(match[1]) || 0;
        });
        actualPool += seDmgBonus;
    }

    const isProtean = abilityStr.includes("protean") || abilityStr.includes("libero");
    const hasTypeMatch = move.type && typingStr.includes(move.type);
    const isSniper = abilityStr.includes("sniper");
    const normalizedDmgStat = ATTRIBUTE_MAPPING[move.dmg1] || move.dmg1;
    
    if (isCrit) actualPool += (isSniper ? 3 : 2);
    
    if (normalizedDmgStat === 'dex' && statuses.paralysisDexPenalty < 0) {
        actualPool += statuses.paralysisDexPenalty;
    }
    
    actualPool = Math.max(1, actualPool); 
    
    let stabBonus = 0; let stabTag = "";
    if (hasTypeMatch || isProtean) {
        stabBonus = 1;
        stabTag = isProtean && !hasTypeMatch ? " Protean STAB" : " STAB";
    }
    
    const pain = getPainPenalty(normalizedDmgStat, state);
    const succMod = state.trackers.globalSucc + pain;
    const mathMod = succMod !== 0 ? (succMod > 0 ? `+${succMod}` : `${succMod}`) : "";
    
    const tags: string[] = [];
    if (isCrit) {
        if (isSniper) tags.push(`Sniper Crit (+3 Dice)`);
        else tags.push(`CRITICAL HIT`);
    }
    if (isSE) tags.push(`Super Effective`);
    if (seDmgBonus > 0) tags.push(`Item SE Dmg +${seDmgBonus}`);
    if (stabBonus > 0) tags.push(stabTag);
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (succMod !== 0) tags.push(`Net Mod ${succMod > 0 ? '+' : ''}${succMod} Succ`);
    
    const moveDesc = (move.desc || "").toLowerCase();
    if (moveDesc.includes("recoil")) tags.push(`APPLY RECOIL`);
    
    if (statuses.paralysisDexPenalty < 0 && normalizedDmgStat === 'dex') tags.push(`Paralysis minus 2 Dmg`);
    
    if (itemBuffs.dmgItemNames.length > 0) tags.push(`Item: ${itemBuffs.dmgItemNames.join(', ')}`);
    
    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
    
    await rollDicePlus(`${actualPool}d6>3${mathMod}`, `💥 ${nickname} rolled ${move.name || "Damage"} (Dmg)!${finalTags}`);
}