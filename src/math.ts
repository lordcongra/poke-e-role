import type { Move, ExtraCategory, ExtraSkill } from './@types/index';
import { getVal, setText, getDerivedVal, ALL_SKILLS, COMBAT_STATS, SOCIAL_STATS } from './utils';

// --- BASE RULESET DATA ---
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
    const extraAccDice = getVal('global-acc-mod');
    const extraDmgDice = getVal('global-dmg-mod');
    const typingStr = (document.getElementById('typing') as HTMLInputElement)?.value || "";
    const abilityStr = (document.getElementById('ability') as HTMLInputElement)?.value || "";
    const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");

    currentMoves.forEach((move: Move) => {
        let attrTotal = move.attr === 'will' ? getDerivedVal('will-max-display') : getDerivedVal(`${move.attr}-total`);
        const skillTotal = getDerivedVal(`${move.skill}-total`);
        const accPool = attrTotal + skillTotal + extraAccDice;

        let dmgPool = 0;
        if (move.cat !== "Supp") {
            const attrMap: Record<string, string> = { "str": "str", "dex": "dex", "vit": "vit", "spe": "spe", "ins": "ins", "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins", "Tough": "tou", "Cool": "coo", "Beauty": "bea", "Cute": "cut", "Clever": "cle", "Will": "will" };
            let scalingVal = move.dmgStat && attrMap[move.dmgStat] ? getDerivedVal(`${attrMap[move.dmgStat]}-total`) : 0;
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
  // 1. Calculate Standard Row Totals
  COMBAT_STATS.forEach((stat: string) => {
      setText(`${stat}-total`, getVal(`${stat}-base`) + getVal(`${stat}-rank`) + getVal(`${stat}-buff`) - getVal(`${stat}-debuff`));
  });

  SOCIAL_STATS.forEach((stat: string) => {
      setText(`${stat}-total`, getVal(`${stat}-base`) + getVal(`${stat}-rank`) + getVal(`${stat}-buff`) - getVal(`${stat}-debuff`));
  });

  const str = getDerivedVal('str-total');
  const dex = getDerivedVal('dex-total');
  const vit = getDerivedVal('vit-total');
  const spe = getDerivedVal('spe-total');
  const ins = getDerivedVal('ins-total');

  setText('hp-max-display', getVal('hp-base') + vit);
  setText('will-max-display', getVal('will-base') + ins);
  setText('def-total', vit + getVal('def-buff') - getVal('def-debuff'));
  setText('spd-total', ins + getVal('spd-buff') - getVal('spd-debuff'));

  ALL_SKILLS.forEach((skill: string) => {
      setText(`${skill}-total`, getVal(`${skill}-base`) + getVal(`${skill}-buff`));
  });

  currentExtraCategories.forEach((cat: ExtraCategory) => {
      cat.skills.forEach((sk: ExtraSkill) => {
          setText(`${sk.id}-total`, getVal(`${sk.id}-base`) + getVal(`${sk.id}-buff`));
      });
  });

  setText('init-total', dex + getDerivedVal('alert-total'));
  setText('evasion-derived', dex + getDerivedVal('evasion-total'));
  setText('clash-p-derived', str + getDerivedVal('clash-total'));
  setText('clash-s-derived', spe + getDerivedVal('clash-total'));
  
  updateMoveDisplays(currentMoves);

  // --- 2. CALCULATE BUDGETS & SOFT CAPS ---
  const currentRank = (document.getElementById('rank') as HTMLSelectElement)?.value || "Starter";
  const currentAge = (document.getElementById('age') as HTMLSelectElement)?.value || "--";
  const rankData = RANK_CAPS[currentRank] || RANK_CAPS["Starter"];
  const ageData = AGE_CAPS[currentAge] || AGE_CAPS["--"];

  // Add the Base allowances + Extra Custom inputs
  const maxAttr = rankData.attr + ageData.attr + getVal('extra-attr-points');
  const maxSoc = rankData.soc + ageData.soc + getVal('extra-soc-points');
  const maxSkill = rankData.skill + getVal('extra-skill-points');
  
  // Calculate how many points the player has actually spent
  let spentAttr = 0;
  COMBAT_STATS.forEach(s => spentAttr += getVal(`${s}-rank`));

  let spentSoc = 0;
  SOCIAL_STATS.forEach(s => spentSoc += getVal(`${s}-rank`));

  let spentSkill = 0;
  ALL_SKILLS.forEach(s => spentSkill += getVal(`${s}-base`));
  currentExtraCategories.forEach(cat => cat.skills.forEach(sk => spentSkill += getVal(`${sk.id}-base`)));

  // Helper to update the UI text and turn red if they are negative
  const updateRemainingUI = (id: string, max: number, spent: number) => {
      const el = document.getElementById(id);
      if (el) {
          const remaining = max - spent;
          el.innerText = remaining.toString();
          el.style.color = remaining < 0 ? '#C62828' : 'inherit'; // Turns red if over budget
      }
  };

  updateRemainingUI('attr-remaining-display', maxAttr, spentAttr);
  updateRemainingUI('soc-remaining-display', maxSoc, spentSoc);
  updateRemainingUI('skill-remaining-display', maxSkill, spentSkill);
  setText('skill-limit-display', rankData.skillLimit);
}