import type { Move, ExtraCategory, ExtraSkill } from './@types/index';
import { ATTRIBUTE_MAPPING } from './@types/index';
import { getVal, setText, ALL_SKILLS, COMBAT_STATS, SOCIAL_STATS } from './utils';
import { sheetView } from './view';

// Expanded names for better readability!
const getInputValue = (el: HTMLInputElement) => parseInt(el.value) || 0;
const getTextValue = (el: HTMLElement) => parseInt(el.innerText) || 0;

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

export function updateMoveDisplays(currentMoves: Move[]) {
    const extraAccDice = getInputValue(sheetView.globalMods.acc);
    const extraDmgDice = getInputValue(sheetView.globalMods.dmg);
    const typingStr = sheetView.identity.typing.value || "";
    const abilityStr = sheetView.identity.ability.value || "";
    const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");

    currentMoves.forEach((move: Move) => {
        let attrTotal = 0;
        if (move.attr === 'will') attrTotal = getTextValue(sheetView.health.will.max);
        else if (sheetView.stats[move.attr]) attrTotal = getTextValue(sheetView.stats[move.attr].total);
        
        let skillTotal = 0;
        if (sheetView.skills[move.skill]) {
            skillTotal = getTextValue(sheetView.skills[move.skill].total);
        } else {
            const extraEl = document.getElementById(`${move.skill}-total`);
            if (extraEl) skillTotal = parseInt(extraEl.innerText) || 0;
        }

        const accPool = attrTotal + skillTotal + extraAccDice;

        let dmgPool = 0;
        if (move.cat !== "Supp") {
            let scalingVal = 0;
            // Using the global map instead of mapping strings to themselves
            const normalizedStat = ATTRIBUTE_MAPPING[move.dmgStat] || move.dmgStat; 
            
            if (normalizedStat && sheetView.stats[normalizedStat]) {
                scalingVal = getTextValue(sheetView.stats[normalizedStat].total);
            }
            
            let stabBonus = (move.type && (typingStr.includes(move.type) || isProtean)) ? 1 : 0;
            dmgPool = move.power + scalingVal + extraDmgDice + stabBonus;
        }

        const accDisplay = document.querySelector(`.acc-total-display[data-id="${move.id}"]`);
        if (accDisplay) accDisplay.textContent = accPool.toString();

        const dmgDisplay = document.querySelector(`.dmg-total-display[data-id="${move.id}"]`);
        if (dmgDisplay) dmgDisplay.textContent = move.cat === "Supp" ? "-" : dmgPool.toString();
    });
}

export function calculateStats(currentExtraCategories: ExtraCategory[], currentMoves: Move[]) {
  COMBAT_STATS.forEach((stat: string) => {
      const s = sheetView.stats[stat];
      s.total.innerText = (getInputValue(s.base) + getInputValue(s.rank) + getInputValue(s.buff) - getInputValue(s.debuff)).toString();
  });

  SOCIAL_STATS.forEach((stat: string) => {
      const s = sheetView.stats[stat];
      s.total.innerText = (getInputValue(s.base) + getInputValue(s.rank) + getInputValue(s.buff) - getInputValue(s.debuff)).toString();
  });

  const str = getTextValue(sheetView.stats.str.total);
  const dex = getTextValue(sheetView.stats.dex.total);
  const vit = getTextValue(sheetView.stats.vit.total);
  const spe = getTextValue(sheetView.stats.spe.total);
  const ins = getTextValue(sheetView.stats.ins.total);

  sheetView.health.hp.max.innerText = (getInputValue(sheetView.health.hp.base) + vit).toString();
  sheetView.health.will.max.innerText = (getInputValue(sheetView.health.will.base) + ins).toString();
  
  sheetView.defenses.def.total.innerText = (vit + getInputValue(sheetView.defenses.def.buff) - getInputValue(sheetView.defenses.def.debuff)).toString();
  sheetView.defenses.spd.total.innerText = (ins + getInputValue(sheetView.defenses.spd.buff) - getInputValue(sheetView.defenses.spd.debuff)).toString();

  ALL_SKILLS.forEach((skill: string) => {
      const s = sheetView.skills[skill];
      s.total.innerText = (getInputValue(s.base) + getInputValue(s.buff)).toString();
  });

  currentExtraCategories.forEach((cat: ExtraCategory) => {
      cat.skills.forEach((sk: ExtraSkill) => {
          setText(`${sk.id}-total`, getVal(`${sk.id}-base`) + getVal(`${sk.id}-buff`));
      });
  });

  sheetView.initiative.total.innerText = (dex + getTextValue(sheetView.skills.alert.total)).toString();
  sheetView.defenses.evasion.total.innerText = (dex + getTextValue(sheetView.skills.evasion.total)).toString();
  sheetView.defenses.clashP.total.innerText = (str + getTextValue(sheetView.skills.clash.total)).toString();
  sheetView.defenses.clashS.total.innerText = (spe + getTextValue(sheetView.skills.clash.total)).toString();
  
  updateMoveDisplays(currentMoves);

  const currentRank = sheetView.identity.rank.value || "Starter";
  const currentAge = sheetView.identity.age.value || "--";
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

  const updateRemainingUI = (el: HTMLElement, max: number, spent: number) => {
      if (el) {
          const remaining = max - spent;
          el.innerText = remaining.toString();
          el.style.color = remaining < 0 ? '#C62828' : 'inherit'; 
      }
  };

  updateRemainingUI(sheetView.points.attr.remaining, maxAttr, spentAttr);
  updateRemainingUI(sheetView.points.soc.remaining, maxSoc, spentSoc);
  updateRemainingUI(sheetView.points.skill.remaining, maxSkill, spentSkill);
  sheetView.points.skill.limit.innerText = rankData.skillLimit.toString();
}