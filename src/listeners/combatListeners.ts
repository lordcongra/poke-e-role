import OBR from "@owlbear-rodeo/sdk";
import { ATTRIBUTE_MAPPING } from '../@types/index';
import { sheetView } from '../view';
import { appState } from '../state';
import { sendToDicePlus } from '../obr';
import { v, tv, getPainPenalty, getStatusPenalties, parseItemTags, spendWill } from '../combatUtils';
import { rollGeneric } from '../combat';

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
        const rawPool = basePool - defReduction + (isCrit ? critBonus : 0);
        const finalPool = Math.max(1, rawPool);
    
        const pain = getPainPenalty(normalizedDmgStat);
        const succMod = v(sheetView.globalMods.succ) + pain;
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