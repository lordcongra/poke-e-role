import type { Move, ExtraCategory } from './types';
import { getVal, setText, getDerivedVal, ALL_SKILLS, COMBAT_STATS, SOCIAL_STATS } from './utils';

export function updateMoveDisplays(currentMoves: Move[]) {
    const extraAccDice = getVal('global-acc-mod');
    const extraDmgDice = getVal('global-dmg-mod');
    const typingStr = (document.getElementById('typing') as HTMLInputElement)?.value || "";
    const abilityStr = (document.getElementById('ability') as HTMLInputElement)?.value || "";
    const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");

    currentMoves.forEach(move => {
        let attrTotal = move.attr === 'will' ? getDerivedVal('will-max-display') : getDerivedVal(`${move.attr}-total`);
        const skillTotal = getDerivedVal(`${move.skill}-total`);
        const accPool = attrTotal + skillTotal + extraAccDice;

        let dmgPool = 0;
        if (move.cat !== "Supp") {
            const attrMap: any = { "str": "str", "dex": "dex", "vit": "vit", "spe": "spe", "ins": "ins", "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins", "Tough": "tou", "Cool": "coo", "Beauty": "bea", "Cute": "cut", "Clever": "cle", "Will": "will" };
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
  // 1. Loop through all Base Stats and calculate them
  COMBAT_STATS.forEach(stat => {
      setText(`${stat}-total`, getVal(`${stat}-base`) + getVal(`${stat}-rank`) + getVal(`${stat}-buff`) - getVal(`${stat}-debuff`));
  });

  // 2. Loop through all Social Stats and calculate them
  SOCIAL_STATS.forEach(stat => {
      setText(`${stat}-total`, getVal(`${stat}-base`) + getVal(`${stat}-rank`) + getVal(`${stat}-buff`) - getVal(`${stat}-debuff`));
  });

  // 3. Grab the newly calculated totals to use for Derived Math
  const str = getDerivedVal('str-total');
  const dex = getDerivedVal('dex-total');
  const vit = getDerivedVal('vit-total');
  const spe = getDerivedVal('spe-total');
  const ins = getDerivedVal('ins-total');

  // 4. Calculate Derived Health/Defenses
  setText('hp-max-display', getVal('hp-base') + vit);
  setText('will-max-display', getVal('will-base') + ins);
  setText('def-total', vit + getVal('def-buff') - getVal('def-debuff'));
  setText('spd-total', ins + getVal('spd-buff') - getVal('spd-debuff'));

  // 5. Loop through and calculate all Skills
  ALL_SKILLS.forEach(skill => {
      setText(`${skill}-total`, getVal(`${skill}-base`) + getVal(`${skill}-buff`));
  });

  currentExtraCategories.forEach(cat => {
      cat.skills.forEach(sk => {
          setText(`${sk.id}-total`, getVal(`${sk.id}-base`) + getVal(`${sk.id}-buff`));
      });
  });

  // 6. Calculate Sub-derived Combat stats
  setText('init-total', dex + getDerivedVal('alert-total'));
  setText('evasion-derived', dex + getDerivedVal('evasion-total'));
  setText('clash-p-derived', str + getDerivedVal('clash-total'));
  setText('clash-s-derived', spe + getDerivedVal('clash-total'));
  
  updateMoveDisplays(currentMoves);
}