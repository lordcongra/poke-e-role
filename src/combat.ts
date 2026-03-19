import OBR from "@owlbear-rodeo/sdk";
import type { Move, StatusItem, SkillCheck } from './@types/index';
import { ATTRIBUTE_MAPPING } from './@types/index';
import { calculateStats } from './math';
import { sheetView } from './view';
import { appState, syncDerivedStats, saveDataToToken } from './state';
import { sendToDicePlus, METADATA_ID, saveBatchDataToToken } from './obr';

const v = (el?: HTMLInputElement | null) => el ? (parseInt(el.value) || 0) : 0;
const tv = (el?: HTMLElement | null) => el ? (parseInt(el.innerText) || 0) : 0;

export function getPainPenalty(attr: string): number {
    if (sheetView.identity.roomPain.value !== 'true') return 0;
    if (attr === 'vit' || attr === 'will') return 0; 
    
    const currHp = parseInt(sheetView.health.hp.curr.value, 10) || 0;
    const maxHp = parseInt(sheetView.health.hp.max.innerText, 10) || 1;
    const ignoredPain = parseInt(sheetView.globalMods.ignoredPain.value, 10) || 0;
    
    let rawPenalty = 0;
    if (currHp <= 1) {
        rawPenalty = 2;
    } 
    else if (currHp <= Math.floor(maxHp / 2)) {
        rawPenalty = 1;
    }
    
    const finalPenalty = Math.max(0, rawPenalty - ignoredPain);
    return finalPenalty > 0 ? -finalPenalty : 0; 
}

export function getStatusPenalties() {
    let confusionPenalty = 0;
    let paralysisDexPenalty = 0;
    let isAsleep = false;
    let isFrozen = false;
    
    const abilityStr = (sheetView.identity.ability.value || "").toLowerCase();
    const activeStatuses = appState.currentStatuses.map(s => (s.name === "Custom..." ? s.customName : s.name).toLowerCase());
    
    activeStatuses.forEach(sName => {
        if (sName !== "healthy") {
            if (sName === "confusion") {
                const rank = sheetView.identity.rank.value || "Starter";
                if (["Starter", "Rookie", "Standard"].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -1);
                else if (["Advanced", "Expert", "Ace"].includes(rank)) confusionPenalty = Math.min(confusionPenalty, -2);
                else confusionPenalty = Math.min(confusionPenalty, -3);
            }
            if (sName === "paralysis") {
                if (!abilityStr.includes("limber")) paralysisDexPenalty = Math.min(paralysisDexPenalty, -2);
            }
            if (sName === "sleep") {
                if (!abilityStr.includes("insomnia") && !abilityStr.includes("vital spirit") && !abilityStr.includes("sweet veil")) {
                    isAsleep = true;
                }
            }
            if (sName === "frozen solid") isFrozen = true;
        }
    });

    return { confusionPenalty, paralysisDexPenalty, isAsleep, isFrozen };
}

export function parseItemTags(move: Move) {
    let bonusAcc = 0;
    let bonusDmg = 0;
    let highCritStacks = 0;
    let ignoreLowAcc = 0;
    let itemNames: string[] = [];

    appState.currentInventory.filter(i => i.active).forEach(item => {
        const desc = (item.desc || "").toLowerCase();
        const moveType = (move.type || "").trim().toLowerCase();
        let triggered = false;
        
        const dmgMatches = desc.matchAll(/\[dmg\s*([+-]?\d+)(?:\s*:\s*(\w+))?\]/gi);
        for (const match of dmgMatches) {
            if (!match[2] || match[2].toLowerCase() === moveType) {
                bonusDmg += parseInt(match[1]) || 0; triggered = true;
            }
        }

        const accMatches = desc.matchAll(/\[acc\s*([+-]?\d+)(?:\s*:\s*(\w+))?\]/gi);
        for (const match of accMatches) {
            if (!match[2] || match[2].toLowerCase() === moveType) {
                bonusAcc += parseInt(match[1]) || 0; triggered = true;
            }
        }

        const ignoreAccMatches = desc.matchAll(/\[ignore low acc\s*(\d+)\]/gi);
        for (const match of ignoreAccMatches) {
            ignoreLowAcc += parseInt(match[1]) || 0; triggered = true;
        }

        const comboMatches = desc.matchAll(/\[combo dmg\s*([+-]?\d+)\]/gi);
        for (const match of comboMatches) {
            const mDesc = (move.desc || "").toLowerCase();
            const mName = (move.name || "").toLowerCase();
            const isCombo = mDesc.includes("successive") || 
                            mDesc.includes("double action") || 
                            mDesc.includes("triple action") || 
                            mName.includes("double") || 
                            mName.includes("triple");
            if (isCombo) {
                bonusDmg += parseInt(match[1]) || 0; 
                triggered = true;
            }
        }

        if (/\[high crit\]/i.test(desc)) { highCritStacks += 1; triggered = true; }
        if (triggered && item.name?.trim()) itemNames.push(item.name.trim());
    });

    return { bonusAcc, bonusDmg, highCritStacks, ignoreLowAcc, itemNames };
}

export async function spendWill(cost: number, updateFn: () => void) {
    let currentWill = v(sheetView.health.will.curr);
    if (currentWill >= cost) {
        sheetView.health.will.curr.value = (currentWill - cost).toString();
        updateFn();
        syncDerivedStats();
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    } else {
        OBR.notification.show("Not enough Will points!");
    }
}

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
    
    let attrTotal = move.attr === 'will' ? tv(sheetView.health.will.max) : (sheetView.stats[move.attr] ? tv(sheetView.stats[move.attr].total) : 0);
    
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
        saveDataToToken('actions-used', actions); 
        appState.currentTokenData['actions-used'] = actions;
    }
  
    const chancesUsed = v(sheetView.trackers.chances);
    const fateUsed = v(sheetView.trackers.fate);

    let tags = [];
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
        select.innerHTML = '<option value="manual">-- Manual Entry --</option>';
        items.forEach(item => {
            if (item.metadata[METADATA_ID] && item.metadata["com.pretty-initiative/metadata"]) {
                const meta = item.metadata[METADATA_ID] as Record<string, unknown>;
                const name = meta.nickname || meta.species || item.name;
                
                const vit = (Number(meta['vit-base']) || 2) + (Number(meta['vit-rank']) || 0) + (Number(meta['vit-buff']) || 0) - (Number(meta['vit-debuff']) || 0);
                const ins = (Number(meta['ins-base']) || 1) + (Number(meta['ins-rank']) || 0) + (Number(meta['ins-buff']) || 0) - (Number(meta['ins-debuff']) || 0);
                
                let def = vit + (Number(meta['def-buff']) || 0) - (Number(meta['def-debuff']) || 0);
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
       let a = v(sheetView.trackers.actions);
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
    let tags = [];
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

    let attrTotal = check.attr === 'will' ? tv(sheetView.health.will.max) : (sheetView.stats[check.attr] ? tv(sheetView.stats[check.attr].total) : 0);
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
    let tags = [];
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

    let tags = [];
    if (pain < 0) tags.push(`Pain Penalty ${Math.abs(pain)}`);
    const tagStr = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
    
    OBR.notification.show(`🩹 ${nickname} rolled ${status.name} Recovery!${tagStr}`);
    if (pool > 0) sendToDicePlus(`${pool}d6>3${mathMod}`, `status|${status.id}`);
}

export function setupCombatListeners() {
    document.getElementById('roll-chances-btn')?.addEventListener('click', () => {
        const maxChances = v(sheetView.trackers.chances);
        if (maxChances <= 0) {
            OBR.notification.show("No Take Your Chances stacks! Spend Willpower first.");
            return;
        }
        const input = window.prompt(`How many failed dice are you rerolling?\n(You have ${maxChances} stack(s) active this round)`, maxChances.toString());
        if (input === null) return; 
        const numToRoll = parseInt(input);
        if (isNaN(numToRoll) || numToRoll <= 0) return;
        const finalRoll = Math.min(numToRoll, maxChances);
        const nickname = sheetView.identity.nickname.value || "Someone";
        OBR.notification.show(`🍀 ${nickname} used Take Your Chances to reroll ${finalRoll} failed dice!`);
        sendToDicePlus(`${finalRoll}d6>3`);
    });

    document.getElementById('roll-init-btn')?.addEventListener('click', async () => {
        const initBonus = tv(sheetView.initiative.total);
        const nickname = sheetView.identity.nickname.value || "Someone";
        OBR.notification.show(`⚡ ${nickname} rolled Initiative!`);
        sendToDicePlus(initBonus > 0 ? `1d6+${initBonus}` : `1d6`, "init"); 
    });
    
    document.getElementById('roll-global-chance-btn')?.addEventListener('click', () => {
        const chanceDiceInput = v(sheetView.globalMods.chance);
        let chanceBonus = 0;
        
        appState.currentInventory.filter(i => i.active).forEach(item => {
            const desc = (item.desc || "").toLowerCase();
            const chanceMatches = desc.matchAll(/\[chance\s*([+-]?\d+)\]/gi);
            for (const match of chanceMatches) {
                chanceBonus += parseInt(match[1]) || 0;
            }
        });

        const chanceDice = chanceDiceInput + chanceBonus;
        if (chanceDice <= 0) return;

        const nickname = sheetView.identity.nickname.value || "Someone";
        const tags = chanceBonus > 0 ? ` [ Item Bonus +${chanceBonus} ]` : "";
        
        OBR.notification.show(`🍀 ${nickname} rolled a Chance Roll!${tags}`);
        sendToDicePlus(`${chanceDice}d6>5`, "chance"); 
    });

    document.getElementById('targeting-cancel')?.addEventListener('click', () => {
        const modal = document.getElementById('targeting-modal');
        if (modal) modal.style.display = 'none';
        appState.pendingDamageMove = null;
    });
    
    document.getElementById('targeting-confirm')?.addEventListener('click', () => {
        const modal = document.getElementById('targeting-modal');
        const input = document.getElementById('targeting-def-input') as HTMLInputElement;
        const critBox = document.getElementById('targeting-crit-checkbox') as HTMLInputElement;
        const seBox = document.getElementById('targeting-se-checkbox') as HTMLInputElement;
        
        if (modal) modal.style.display = 'none';
        if (!appState.pendingDamageMove) return;
        const move = appState.pendingDamageMove;
        appState.pendingDamageMove = null;
        
        const defReduction = parseInt(input.value) || 0;
        const isCrit = critBox.checked;
        const isSE = seBox ? seBox.checked : false;
        
        const nickname = sheetView.identity.nickname.value || "Someone";
        const typingStr = sheetView.identity.typing.value || "";
        const abilityStr = sheetView.identity.ability.value || "";
        const statuses = getStatusPenalties();
        const itemBuffs = parseItemTags(move);
        const extraDice = v(sheetView.globalMods.dmg) + itemBuffs.bonusDmg; 
        
        // --- SUPER EFFECTIVE INVENTORY PARSER ---
        let seDmgBonus = 0;
        if (isSE) {
            appState.currentInventory.filter(i => i.active).forEach(item => {
                const desc = (item.desc || "").toLowerCase();
                const seMatches = desc.matchAll(/\[dmg\s*([+-]?\d+):\s*super effective\]/gi);
                for (const match of seMatches) {
                    seDmgBonus += parseInt(match[1]) || 0;
                }
            });
        }

        let scalingVal = 0;
        const normalizedDmgStat = ATTRIBUTE_MAPPING[move.dmgStat] || move.dmgStat;
        if (normalizedDmgStat && sheetView.stats[normalizedDmgStat]) {
            scalingVal = tv(sheetView.stats[normalizedDmgStat].total);
        }
        if (normalizedDmgStat === 'dex') scalingVal += statuses.paralysisDexPenalty;
        
        const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");
        const hasTypeMatch = move.type && typingStr.includes(move.type);
        const isSniper = abilityStr.toLowerCase().includes("sniper");
        
        let stabBonus = 0; let stabTag = "";
        if (hasTypeMatch || isProtean) {
            stabBonus = 1; stabTag = isProtean && !hasTypeMatch ? " Protean STAB" : " STAB";
        }
    
        const critBonus = isSniper ? 3 : 2;
        const basePool = (parseInt(String(move.power)) || 0) + scalingVal + extraDice + stabBonus + seDmgBonus;
        let rawPool = basePool - defReduction + (isCrit ? critBonus : 0);
        let finalPool = Math.max(1, rawPool);
    
        const pain = getPainPenalty(normalizedDmgStat);
        const succMod = v(sheetView.globalMods.succ) + pain;
        const mathMod = succMod !== 0 ? (succMod > 0 ? `+${succMod}` : `${succMod}`) : "";
        
        let tags = [];
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
        if (itemBuffs.itemNames.length > 0) tags.push(`Item: ${itemBuffs.itemNames.join(', ')}`);
        
        const finalTags = tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : "";
        
        OBR.notification.show(`💥 ${nickname} rolled ${move.name || "Damage"} (Dmg)!${finalTags}`);
        sendToDicePlus(`${finalPool}d6>3${mathMod}`);
    });

    document.getElementById('btn-will-pain')?.addEventListener('click', () => spendWill(1, () => { sheetView.globalMods.ignoredPain.value = (v(sheetView.globalMods.ignoredPain) + 1).toString(); }));
    document.getElementById('btn-will-fate')?.addEventListener('click', () => {
        if (v(sheetView.trackers.chances) > 0) { OBR.notification.show("Cannot use Pushing Fate in the same round as Take Your Chances!"); return; }
        spendWill(1, () => {
            sheetView.trackers.fate.value = (v(sheetView.trackers.fate) + 1).toString();
            OBR.notification.show("Pushing Fate used! (+1 Auto Success for your next roll. Add manually to result!)");
        });
    });
    document.getElementById('btn-will-chance')?.addEventListener('click', () => {
        if (v(sheetView.trackers.fate) > 0) { OBR.notification.show("Cannot use Take Your Chances in the same round as Pushing Fate!"); return; }
        spendWill(1, () => { sheetView.trackers.chances.value = (v(sheetView.trackers.chances) + 1).toString(); });
    });

    document.getElementById('roll-clash-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('clash-modal');
        if (modal) modal.style.display = 'flex';
    });

    document.getElementById('clash-cancel-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('clash-modal');
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('clash-physical-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('clash-modal');
        if (modal) modal.style.display = 'none';
        rollGeneric("Physical Clash", tv(sheetView.stats.str.total) + tv(sheetView.skills.clash.total), "str", false, true, true); 
    });

    document.getElementById('clash-special-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('clash-modal');
        if (modal) modal.style.display = 'none';
        rollGeneric("Special Clash", tv(sheetView.stats.spe.total) + tv(sheetView.skills.clash.total), "spe", false, true, true); 
    });

    document.getElementById('roll-evade-btn')?.addEventListener('click', () => rollGeneric("Evasion", tv(sheetView.stats.dex.total) + tv(sheetView.skills.evasion.total), "dex", true, false, true));
    
    document.getElementById('roll-maneuver-btn')?.addEventListener('click', () => {
        const val = (document.getElementById('maneuver-select') as HTMLSelectElement).value;
        if (val === 'none') return;
        if (val === 'ambush') rollGeneric("Ambush", tv(sheetView.stats.dex.total) + tv(sheetView.skills.stealth.total), "dex", false, false, true);
        if (val === 'cover') rollGeneric("Cover an Ally", 3 + tv(sheetView.stats.ins.total), "will", false, false, true);
        if (val === 'grapple') rollGeneric("Grapple", tv(sheetView.stats.str.total) + tv(sheetView.skills.brawl.total), "str", false, false, true);
        if (val === 'run') rollGeneric("Run Away", tv(sheetView.stats.dex.total) + tv(sheetView.skills.athletic.total), "dex", false, false, true);
        if (val === 'stabilize') rollGeneric("Stabilize Ally", tv(sheetView.stats.cle.total) + tv(sheetView.skills.medicine.total), "cle", false, false, true);
        if (val === 'struggle') rollGeneric("Struggle (Accuracy)", tv(sheetView.stats.dex.total) + tv(sheetView.skills.brawl.total), "dex", false, false, true);
    });
}