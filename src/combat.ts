import OBR from "@owlbear-rodeo/sdk";
import type { Move, StatusItem, SkillCheck } from './@types/index';
import { sheetView } from './view';
import { appState } from './state';
import { sendToDicePlus, METADATA_ID, saveBatchDataToToken } from './obr';
import { v, tv, getPainPenalty, getStatusPenalties, parseItemTags } from './combatUtils';

export function rollAccuracy(move: Move) {
    const nickname = sheetView.identity.nickname.value || "Someone";
    let actions = v(sheetView.trackers.actions);
    const requiredSuccesses = actions + 1;
    const moveDesc = (move.desc || "").toLowerCase();
    const safeMoveName = (move.name || "").toLowerCase().trim();
    const abilityStr = sheetView.identity.ability.value || "";
    
    const statuses = getStatusPenalties();
    const isSleepMove = safeMoveName === "sleep talk" || safeMoveName === "snore";
    const hasComatose = abilityStr.toLowerCase().includes("comatose");
    
    if (statuses.isAsleep && !isSleepMove && !hasComatose) OBR.notification.show("⚠️ You are Asleep and cannot perform actions!");
    if (statuses.isFrozen) OBR.notification.show("⚠️ You are Frozen Solid and cannot perform actions!");

    const itemBuffs = parseItemTags(move);
    const extraDice = v(sheetView.globalMods.acc) + itemBuffs.bonusAcc; 
    
    let moveLowAcc = 0;
    let ignoredAccPenalty = 0;
    const lowAccMatch = moveDesc.match(/low accuracy\s*(\d+)/i);
    if (lowAccMatch) {
        const baseLowAcc = parseInt(lowAccMatch[1]) || 0;
        moveLowAcc = Math.max(0, baseLowAcc - itemBuffs.ignoreLowAcc);
        ignoredAccPenalty = baseLowAcc - moveLowAcc;
    }
    
    const pain = getPainPenalty(move.attr);
    const succMod = v(sheetView.globalMods.succ) - moveLowAcc + statuses.confusionPenalty + pain; 
    const mathMod = succMod !== 0 ? (succMod > 0 ? `+${succMod}` : `${succMod}`) : "";
    
    const attrTotal = move.attr === 'will' ? tv(sheetView.health.will.max) : (sheetView.stats[move.attr] ? tv(sheetView.stats[move.attr].total) : 0);
    
    let skillTotal = 0;
    if (move.skill && sheetView.skills[move.skill]) {
        skillTotal = tv(sheetView.skills[move.skill].total);
    } else if (move.skill) {
        const extraEl = document.getElementById(`${move.skill}-total`);
        if (extraEl) skillTotal = parseInt(extraEl.innerText) || 0;
    }
  
    let dicePool = attrTotal + skillTotal + extraDice;
    if (move.attr === 'dex') dicePool += statuses.paralysisDexPenalty; 
  
    let critReq = requiredSuccesses + 3;
    let critReductions = itemBuffs.highCritStacks;
    if (moveDesc.includes("high critical")) critReductions++;
    if (sheetView.identity.ability.value.toLowerCase() === "super luck") critReductions++;
    critReq = Math.max(1, critReq - critReductions);
  
    if (actions < 5) {
        actions++;
        sheetView.trackers.actions.value = actions.toString();
        saveBatchDataToToken({ 'actions-used': actions }); 
        appState.currentTokenData['actions-used'] = actions;
    }
  
    const chancesUsed = v(sheetView.trackers.chances);
    const fateUsed = v(sheetView.trackers.fate);

    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    if (ignoredAccPenalty > 0) tags.push(`Ignored ${ignoredAccPenalty} Low Acc`);
    if (succMod !== 0) tags.push(`Net Mod ${succMod > 0 ? '+' : ''}${succMod} Succ`);
    if (statuses.paralysisDexPenalty < 0 && move.attr === 'dex') tags.push(`Paralysis -2 Dice`);
    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (fateUsed > 0) tags.push(`Fate: +1 Auto Success`);

    tags.push(`Need ${requiredSuccesses} Succ`);
    tags.push(`Crit on ${critReq}+`);
    
    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else if (isSleepMove) tags.push(`ASLEEP (Bypassed)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) tags.push(`FROZEN`);
    if (moveDesc.includes("never miss") || moveDesc.includes("cannot be evaded")) tags.push(`CANNOT BE EVADED`);
    if (itemBuffs.itemNames.length > 0) tags.push(`Item: ${itemBuffs.itemNames.join(', ')}`);
  
    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";

    OBR.notification.show(`🎯 ${nickname} rolled ${move.name || "a Move"} (Acc)!${finalTags}`);
    if (dicePool > 0) sendToDicePlus(`${dicePool}d6>3${mathMod}`);
}

export function rollDamage(move: Move) {
    if (move.cat === "Supp") { alert(`${move.name || "This"} is a Support move (No Damage).`); return; }
  
    const nickname = sheetView.identity.nickname.value || "Someone";
    const moveDesc = (move.desc || "").toLowerCase();
  
    const setDmgMatch = moveDesc.match(/set damage\s*(\d+)?/i);
    if (setDmgMatch || moveDesc.includes("set damage")) {
        const dmgVal = (setDmgMatch && setDmgMatch[1]) ? setDmgMatch[1] : move.power;
        OBR.notification.show(`💥 ${nickname} used ${move.name || "a Move"}! (Deals exactly ${dmgVal} Set Damage, ignores defenses)`);
        sendToDicePlus(`0d6+${dmgVal}`);
        return; 
    }
  
    appState.pendingDamageMove = move;
    
    const modal = document.getElementById('targeting-modal');
    const label = document.getElementById('targeting-stat-label');
    const select = document.getElementById('targeting-select') as HTMLSelectElement;
    const input = document.getElementById('targeting-def-input') as HTMLInputElement;
    const critBox = document.getElementById('targeting-crit-checkbox') as HTMLInputElement;
    const seBox = document.getElementById('targeting-se-checkbox') as HTMLInputElement;
    
    if (!modal || !label || !select || !input || !critBox) return;
    
    label.innerText = move.cat === 'Phys' ? 'Defense' : 'Special Defense';
    input.value = "0";
    critBox.checked = false;
    if (seBox) seBox.checked = false;
    
    OBR.scene.items.getItems().then(items => {
        select.replaceChildren(new Option('-- Manual Entry --', 'manual'));
        
        items.forEach(item => {
            if (item.metadata[METADATA_ID] && item.metadata["com.pretty-initiative/metadata"]) {
                const meta = item.metadata[METADATA_ID] as Record<string, unknown>;
                const name = String(meta.nickname || meta.species || item.name);
                
                const vit = (Number(meta['vit-base']) || 2) + (Number(meta['vit-rank']) || 0) + (Number(meta['vit-buff']) || 0) - (Number(meta['vit-debuff']) || 0);
                const ins = (Number(meta['ins-base']) || 1) + (Number(meta['ins-rank']) || 0) + (Number(meta['ins-buff']) || 0) - (Number(meta['ins-debuff']) || 0);
                
                const def = vit + (Number(meta['def-buff']) || 0) - (Number(meta['def-debuff']) || 0);
                let spd = ins + (Number(meta['spd-buff']) || 0) - (Number(meta['spd-debuff']) || 0);
                
                const ruleset = sheetView.identity.roomRuleset.value; 
                if (ruleset === 'tabletop') spd = vit + (Number(meta['spd-buff']) || 0) - (Number(meta['spd-debuff']) || 0);
                else if (ruleset === 'vg-high-hp' || ruleset === 'videogame') spd = ins + (Number(meta['spd-buff']) || 0) - (Number(meta['spd-debuff']) || 0);
  
                const targetDef = move.cat === 'Phys' ? def : spd;
                
                const opt = document.createElement('option');
                opt.value = targetDef.toString();
                opt.text = `${name} (${move.cat === 'Phys' ? 'DEF' : 'SPD'}: ${targetDef})`;
                select.appendChild(opt);
            }
        });
        
        select.onchange = () => { if (select.value !== 'manual') input.value = select.value; };
        modal.style.display = 'flex';
    });
}

export function rollGeneric(actionName: string, pool: number, attr: string, incrementEvade = false, incrementClash = false, incrementAction = false) {
    const nickname = sheetView.identity.nickname.value || "Someone";
    const abilityStr = sheetView.identity.ability.value || "";
    const batchUpdates: Record<string, unknown> = {};
    
    const statuses = getStatusPenalties();
    const hasComatose = abilityStr.toLowerCase().includes("comatose");

    if (statuses.isAsleep && !hasComatose) OBR.notification.show("⚠️ You are Asleep and cannot perform actions!");
    if (statuses.isFrozen) OBR.notification.show("⚠️ You are Frozen Solid and cannot perform actions!");

    if (incrementAction) {
       const a = v(sheetView.trackers.actions);
       if (a < 5) {
          sheetView.trackers.actions.value = (a+1).toString();
          batchUpdates['actions-used'] = a + 1; 
       }
    }
    if (incrementEvade) {
       sheetView.trackers.evade.checked = true;
       batchUpdates['evasions-used'] = true;
    }
    if (incrementClash) {
       sheetView.trackers.clash.checked = true;
       batchUpdates['clashes-used'] = true;
    }
 
    if (Object.keys(batchUpdates).length > 0) {
        Object.assign(appState.currentTokenData, batchUpdates);
        saveBatchDataToToken(batchUpdates);
    }
 
    let dicePool = pool;
    if (attr === 'dex') dicePool += statuses.paralysisDexPenalty;

    const pain = getPainPenalty(attr);
    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    
    const genericSuccMod = v(sheetView.globalMods.succ) + statuses.confusionPenalty + pain;
    const mathMod = genericSuccMod !== 0 ? (genericSuccMod > 0 ? `+${genericSuccMod}` : `${genericSuccMod}`) : "";

    if (genericSuccMod !== 0) tags.push(`Net Mod ${genericSuccMod > 0 ? '+' : ''}${genericSuccMod} Succ`);
    
    const chancesUsed = v(sheetView.trackers.chances);
    const fateUsed = v(sheetView.trackers.fate);

    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (fateUsed > 0) tags.push(`Fate: +1 Auto Success`);

    if (statuses.paralysisDexPenalty < 0 && attr === 'dex') tags.push(`Paralysis: -2 Dice`);
    
    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) tags.push(`FROZEN`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
 
    OBR.notification.show(`🎲 ${nickname} rolled ${actionName}!${finalTags}`);
    if (dicePool > 0) sendToDicePlus(`${dicePool}d6>3${mathMod}`);
}

export function rollSkillCheck(check: SkillCheck) {
    const nickname = sheetView.identity.nickname.value || "Someone";
    const abilityStr = sheetView.identity.ability.value || "";
    const statuses = getStatusPenalties();
    
    const hasComatose = abilityStr.toLowerCase().includes("comatose");

    if (statuses.isAsleep && !hasComatose) OBR.notification.show("⚠️ You are Asleep and cannot perform actions!");
    if (statuses.isFrozen) OBR.notification.show("⚠️ You are Frozen Solid and cannot perform actions!");

    const attrTotal = check.attr === 'will' ? tv(sheetView.health.will.max) : (sheetView.stats[check.attr] ? tv(sheetView.stats[check.attr].total) : 0);
    let skillTotal = 0;
    
    if (check.skill && check.skill !== 'none') {
        if (sheetView.skills[check.skill]) {
            skillTotal = tv(sheetView.skills[check.skill].total);
        } else {
            const extraEl = document.getElementById(`${check.skill}-total`);
            if (extraEl) skillTotal = parseInt(extraEl.innerText) || 0;
        }
    }

    let dicePool = attrTotal + skillTotal;
    if (check.attr === 'dex') dicePool += statuses.paralysisDexPenalty;

    const pain = getPainPenalty(check.attr);
    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    
    const genericSuccMod = v(sheetView.globalMods.succ) + statuses.confusionPenalty + pain;
    const mathMod = genericSuccMod !== 0 ? (genericSuccMod > 0 ? `+${genericSuccMod}` : `${genericSuccMod}`) : "";

    if (genericSuccMod !== 0) tags.push(`Net Mod ${genericSuccMod > 0 ? '+' : ''}${genericSuccMod} Succ`);
    const chancesUsed = v(sheetView.trackers.chances);
    const fateUsed = v(sheetView.trackers.fate);

    if (chancesUsed > 0) tags.push(`Chances: Max ${chancesUsed} Rerolls`);
    if (fateUsed > 0) tags.push(`Fate: +1 Auto Success`);
    if (statuses.paralysisDexPenalty < 0 && check.attr === 'dex') tags.push(`Paralysis: -2 Dice`);
    
    if (statuses.isAsleep) {
        if (hasComatose) tags.push(`ASLEEP (Comatose)`);
        else tags.push(`ASLEEP`);
    }
    if (statuses.isFrozen) tags.push(`FROZEN`);

    const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
    const rollName = (check.name || "").trim() || "Skill Check";
    
    OBR.notification.show(`🎲 ${nickname} rolled ${rollName}!${finalTags}`);
    if (dicePool > 0) sendToDicePlus(`${dicePool}d6>3${mathMod}`);
}

export function rollStatus(status: StatusItem) {
    const nickname = sheetView.identity.nickname.value || "Someone";
    let pool = 0;
    let attr = "ins"; 
 
    if (status.name.includes("Burn")) {
        attr = "dex";
        pool = tv(sheetView.stats.dex.total) + tv(sheetView.skills.athletic.total);
    } else if (status.name === "Paralysis") {
        attr = "str";
        pool = tv(sheetView.stats.str.total) + tv(sheetView.skills.medicine.total);
    } else if (status.name === "Sleep" || status.name === "Confusion") {
        attr = "ins";
        pool = tv(sheetView.stats.ins.total);
    } else if (status.name === "In Love") {
        attr = "ins";
        pool = Math.max(v(sheetView.trackers.loyalty), tv(sheetView.stats.ins.total));
    } else {
        OBR.notification.show(`⚠️ ${status.name} does not have a standard self-recovery roll.`);
        return;
    }
 
    const pain = getPainPenalty(attr);
    const mathMod = pain !== 0 ? (pain > 0 ? `+${pain}` : `${pain}`) : "";

    const tags: string[] = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    const tagStr = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
    
    OBR.notification.show(`🩹 ${nickname} rolled ${status.name} Recovery!${tagStr}`);
    if (pool > 0) sendToDicePlus(`${pool}d6>3${mathMod}`, `status|${status.id}`);
}