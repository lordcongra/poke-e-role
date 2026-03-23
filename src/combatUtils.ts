import OBR from "@owlbear-rodeo/sdk";
import type { Move } from './@types/index';
import { calculateStats } from './math';
import { sheetView } from './view';
import { appState, syncDerivedStats } from './state';

export const v = (el?: HTMLInputElement | null) => el ? (parseInt(el.value) || 0) : 0;
export const tv = (el?: HTMLElement | null) => el ? (parseInt(el.innerText) || 0) : 0;

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
    const itemNames: string[] = [];

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
    const currentWill = v(sheetView.health.will.curr);
    if (currentWill >= cost) {
        sheetView.health.will.curr.value = (currentWill - cost).toString();
        updateFn();
        syncDerivedStats();
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    } else {
        OBR.notification.show("Not enough Will points!");
    }
}