import type { Move, ExtraCategory, ExtraSkill, InventoryItem } from './@types/index';
import { ATTRIBUTE_MAPPING } from './@types/index';
import { getVal, setText, ALL_SKILLS, COMBAT_STATS, SOCIAL_STATS } from './utils';
import { sheetView } from './view';
import { appState } from './state';
import { isLoading } from './obr';

const getInputValue = (el?: HTMLInputElement | null) => el ? (parseInt(el.value) || 0) : 0;

const RANK_CAPS: Record<string, { attr: number, soc: number, skill: number, skillLimit: number }> = {
    "Starter":  { attr: 0, soc: 0, skill: 5, skillLimit: 1 },
    "Rookie":   { attr: 2, soc: 2, skill: 10, skillLimit: 2 },
    "Standard": { attr: 4, soc: 4, skill: 14, skillLimit: 3 },
    "Advanced": { attr: 6, soc: 6, skill: 17, skillLimit: 4 },
    "Expert":   { attr: 8, soc: 8, skill: 19, skillLimit: 5 },
    "Ace":      { attr: 10, soc: 10, skill: 20, skillLimit: 5 },
    "Master":   { attr: 10, soc: 10, skill: 22, skillLimit: 5 },
    "Champion": { attr: 14, soc: 14, skill: 25, skillLimit: 5 }
};

const AGE_CAPS: Record<string, { attr: number, soc: number }> = {
    "--":       { attr: 0, soc: 0 },
    "Child":    { attr: 0, soc: 0 },
    "Teen":     { attr: 2, soc: 2 },
    "Adult":    { attr: 4, soc: 4 },
    "Senior":   { attr: 3, soc: 6 }
};

export function updateMoveDisplays(currentMoves: Move[], currentInventory?: InventoryItem[], calcStats?: Record<string, number>, calcSkills?: Record<string, number>) {
    const extraAccDice = getInputValue(sheetView.globalMods.acc);
    const extraDmgDice = getInputValue(sheetView.globalMods.dmg);
    const typingStr = sheetView.identity.typing?.value || "";
    const abilityStr = sheetView.identity.ability?.value || "";
    const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");
    
    const activeInventory = currentInventory || appState.currentInventory || [];

    currentMoves.forEach((move: Move) => {
        let attrTotal = 0;
        if (move.attr === 'will') {
            attrTotal = parseInt(sheetView.health.will.max?.innerText || "0") || 0;
        } else if (calcStats && move.attr && calcStats[move.attr] !== undefined) {
            attrTotal = calcStats[move.attr];
        } else if (move.attr && sheetView.stats[move.attr]) {
            attrTotal = parseInt(sheetView.stats[move.attr].total?.innerText || "0") || 0;
        }
        
        let skillTotal = 0;
        if (calcSkills && move.skill && calcSkills[move.skill] !== undefined) {
            skillTotal = calcSkills[move.skill];
        } else if (move.skill && sheetView.skills[move.skill]) {
            skillTotal = parseInt(sheetView.skills[move.skill].total?.innerText || "0") || 0;
        } else if (move.skill) {
            const extraEl = document.getElementById(`${move.skill}-total`);
            if (extraEl) skillTotal = parseInt(extraEl.innerText) || 0;
        }

        let itemAcc = 0;
        let itemDmg = 0;
        
        activeInventory.filter(i => i.active).forEach(item => {
            const desc = (item.desc || "").toLowerCase();
            const moveType = (move.type || "").trim().toLowerCase();

            const dmgMatches = desc.matchAll(/\[dmg\s*([+-]?\d+)(?:\s*:\s*(\w+))?\]/gi);
            for (const match of dmgMatches) {
                if (!match[2] || match[2].toLowerCase() === moveType) itemDmg += parseInt(match[1]) || 0;
            }

            const accMatches = desc.matchAll(/\[acc\s*([+-]?\d+)(?:\s*:\s*(\w+))?\]/gi);
            for (const match of accMatches) {
                if (!match[2] || match[2].toLowerCase() === moveType) itemAcc += parseInt(match[1]) || 0;
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
                    itemDmg += parseInt(match[1]) || 0; 
                }
            }
        });

        const accPool = attrTotal + skillTotal + extraAccDice + itemAcc;

        let dmgPool = 0;
        if (move.cat !== "Supp") {
            let scalingVal = 0;
            const normalizedStat = ATTRIBUTE_MAPPING[move.dmgStat] || move.dmgStat; 
            
            if (normalizedStat && calcStats && calcStats[normalizedStat] !== undefined) {
                scalingVal = calcStats[normalizedStat];
            } else if (normalizedStat && sheetView.stats[normalizedStat]) {
                scalingVal = parseInt(sheetView.stats[normalizedStat].total?.innerText || "0") || 0;
            }
            
            let stabBonus = (move.type && (typingStr.includes(move.type) || isProtean)) ? 1 : 0;
            dmgPool = (parseInt(String(move.power)) || 0) + scalingVal + extraDmgDice + stabBonus + itemDmg;
        }

        const accDisplay = document.querySelector(`.acc-total-display[data-id="${move.id}"]`);
        if (accDisplay) accDisplay.textContent = accPool.toString();

        const dmgDisplay = document.querySelector(`.dmg-total-display[data-id="${move.id}"]`);
        if (dmgDisplay) dmgDisplay.textContent = move.cat === "Supp" ? "-" : dmgPool.toString();
    });
}

export function calculateStats(currentExtraCategories: ExtraCategory[], currentMoves: Move[], currentInventory?: InventoryItem[]) {
  const activeInventory = currentInventory || appState.currentInventory || [];
  
  let itemStats: Record<string, number> = { str: 0, dex: 0, vit: 0, spe: 0, ins: 0, tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
  let itemSkills: Record<string, number> = {};
  let itemInit = 0;
  let itemDef = 0;
  let itemSpd = 0;

  ALL_SKILLS.forEach(sk => itemSkills[sk] = 0);
  
  activeInventory.filter(i => i.active).forEach(item => {
      const desc = (item.desc || "").toLowerCase();
      
      const statMatches = desc.matchAll(/\[(str|strength|dex|dexterity|vit|vitality|spe|special|ins|insight|tou|tough|coo|cool|bea|beauty|cut|cute|cle|clever)\s*([+-]?\d+)\]/gi);
      for (const match of statMatches) {
          const rawStat = match[1].toLowerCase();
          const map: Record<string, string> = { 'strength': 'str', 'dexterity': 'dex', 'vitality': 'vit', 'special': 'spe', 'insight': 'ins', 'tough': 'tou', 'cool': 'coo', 'beauty': 'bea', 'cute': 'cut', 'clever': 'cle' };
          const statKey = map[rawStat] || rawStat;
          if (itemStats[statKey] !== undefined) {
              itemStats[statKey] += parseInt(match[2]) || 0;
          }
      }

      const defMatches = desc.matchAll(/\[def\s*([+-]?\d+)\]/gi);
      for (const match of defMatches) itemDef += parseInt(match[1]) || 0;
      
      const spdMatches = desc.matchAll(/\[spd\s*([+-]?\d+)\]/gi);
      for (const match of spdMatches) itemSpd += parseInt(match[1]) || 0;

      const skillMatches = desc.matchAll(new RegExp(`\\[(${ALL_SKILLS.join('|')})\\s*([+-]?\\d+)\\]`, 'gi'));
      for (const match of skillMatches) {
          itemSkills[match[1].toLowerCase()] += parseInt(match[2]) || 0;
      }

      const initMatches = desc.matchAll(/\[init\s*([+-]?\d+)\]/gi);
      for (const match of initMatches) {
          itemInit += parseInt(match[1]) || 0;
      }
  });

  let calculatedStats: Record<string, number> = {};
  
  COMBAT_STATS.forEach((stat: string) => {
      const s = sheetView.stats[stat];
      const total = getInputValue(s.base) + getInputValue(s.rank) + getInputValue(s.buff) - getInputValue(s.debuff) + (itemStats[stat] || 0);
      if (s.total) s.total.innerText = total.toString();
      calculatedStats[stat] = total;
  });

  SOCIAL_STATS.forEach((stat: string) => {
      const s = sheetView.stats[stat];
      const total = getInputValue(s.base) + getInputValue(s.rank) + getInputValue(s.buff) - getInputValue(s.debuff) + (itemStats[stat] || 0);
      if (s.total) s.total.innerText = total.toString();
      calculatedStats[stat] = total;
  });

  const str = calculatedStats.str || 0;
  const dex = calculatedStats.dex || 0;
  const vit = calculatedStats.vit || 0;
  const spe = calculatedStats.spe || 0;
  const ins = calculatedStats.ins || 0;

  const ruleset = sheetView.identity.roomRuleset?.value || 'vg-vit-hp'; 
  let spdBase = ins;
  let hpBonus = vit; 
  
  if (ruleset === 'tabletop') {
      spdBase = vit;
      hpBonus = vit;
  } else if (ruleset === 'vg-high-hp' || ruleset === 'videogame') {
      spdBase = ins;
      hpBonus = Math.max(vit, ins);
  }

  const oldMaxHp = parseInt(sheetView.health.hp.max?.innerText || "0") || 0;
  const newMaxHp = getInputValue(sheetView.health.hp.base) + hpBonus;
  
  if (!isLoading && oldMaxHp > 0 && oldMaxHp !== newMaxHp) {
      const currHpEl = sheetView.health.hp.curr;
      if (currHpEl) {
          let currHpVal = parseInt(currHpEl.value) || 0;
          if (newMaxHp > oldMaxHp) {
              currHpVal += (newMaxHp - oldMaxHp);
          } else if (currHpVal > newMaxHp) {
              currHpVal = newMaxHp; 
          }
          currHpEl.value = currHpVal.toString();
      }
  }
  if (sheetView.health.hp.max) sheetView.health.hp.max.innerText = newMaxHp.toString();

  const oldMaxWill = parseInt(sheetView.health.will.max?.innerText || "0") || 0;
  const newMaxWill = getInputValue(sheetView.health.will.base) + ins;

  if (!isLoading && oldMaxWill > 0 && oldMaxWill !== newMaxWill) {
      const currWillEl = sheetView.health.will.curr;
      if (currWillEl) {
          let currWillVal = parseInt(currWillEl.value) || 0;
          if (newMaxWill > oldMaxWill) {
              currWillVal += (newMaxWill - oldMaxWill);
          } else if (currWillVal > newMaxWill) {
              currWillVal = newMaxWill;
          }
          currWillEl.value = currWillVal.toString();
      }
  }
  if (sheetView.health.will.max) sheetView.health.will.max.innerText = newMaxWill.toString();
  
  const maxMovesDisplay = document.getElementById('max-moves-display');
  if (maxMovesDisplay) {
      maxMovesDisplay.innerText = (ins + 3).toString();
  }
  
  if (sheetView.defenses.def.total) {
      sheetView.defenses.def.total.innerText = (vit + getInputValue(sheetView.defenses.def.buff) - getInputValue(sheetView.defenses.def.debuff) + itemDef).toString();
  }
  if (sheetView.defenses.spd.total) {
      sheetView.defenses.spd.total.innerText = (spdBase + getInputValue(sheetView.defenses.spd.buff) - getInputValue(sheetView.defenses.spd.debuff) + itemSpd).toString();
  }

  let calculatedSkills: Record<string, number> = {};
  ALL_SKILLS.forEach((skill: string) => {
      const s = sheetView.skills[skill];
      const total = getInputValue(s.base) + getInputValue(s.buff) + (itemSkills[skill] || 0);
      if (s.total) s.total.innerText = total.toString();
      calculatedSkills[skill] = total;
  });

  currentExtraCategories.forEach((cat: ExtraCategory) => {
      cat.skills.forEach((sk: ExtraSkill) => {
          setText(`${sk.id}-total`, getVal(`${sk.id}-base`) + getVal(`${sk.id}-buff`));
      });
  });

  if (sheetView.initiative.total) sheetView.initiative.total.innerText = (dex + (calculatedSkills.alert || 0) + itemInit).toString();
  if (sheetView.defenses.evasion.total) sheetView.defenses.evasion.total.innerText = (dex + (calculatedSkills.evasion || 0)).toString();
  if (sheetView.defenses.clashP.total) sheetView.defenses.clashP.total.innerText = (str + (calculatedSkills.clash || 0)).toString();
  if (sheetView.defenses.clashS.total) sheetView.defenses.clashS.total.innerText = (spe + (calculatedSkills.clash || 0)).toString();
  
  updateMoveDisplays(currentMoves, activeInventory, calculatedStats, calculatedSkills);

  const currentRank = sheetView.identity.rank?.value || "Starter";
  const currentAge = sheetView.identity.age?.value || "--";
  const rankData = RANK_CAPS[currentRank] || RANK_CAPS["Starter"];
  const ageData = AGE_CAPS[currentAge] || AGE_CAPS["--"];

  const maxAttr = rankData.attr + ageData.attr + getInputValue(sheetView.points.attr.extra);
  const maxSoc = rankData.soc + ageData.soc + getInputValue(sheetView.points.soc.extra);
  const maxSkill = rankData.skill + getInputValue(sheetView.points.skill.extra);
  
  let spentAttr = 0;
  COMBAT_STATS.forEach(s => spentAttr += getInputValue(sheetView.stats[s].rank));

  let spentSoc = 0;
  SOCIAL_STATS.forEach(s => spentSoc += getInputValue(sheetView.stats[s].rank));

  let spentSkill = 0;
  ALL_SKILLS.forEach(s => spentSkill += getInputValue(sheetView.skills[s].base));
  currentExtraCategories.forEach(cat => cat.skills.forEach(sk => spentSkill += getVal(`${sk.id}-base`)));

  const updateRemainingUI = (el: HTMLElement | null, max: number, spent: number) => {
      if (el) {
          const remaining = max - spent;
          el.innerText = remaining.toString();
          el.style.color = remaining < 0 ? '#C62828' : 'inherit'; 
      }
  };

  updateRemainingUI(sheetView.points.attr.remaining, maxAttr, spentAttr);
  updateRemainingUI(sheetView.points.soc.remaining, maxSoc, spentSoc);
  updateRemainingUI(sheetView.points.skill.remaining, maxSkill, spentSkill);
  if (sheetView.points.skill.limit) sheetView.points.skill.limit.innerText = rankData.skillLimit.toString();
}