import type { Move, ExtraCategory, ExtraSkill } from './@types/index';
import { getVal, setText, getDerivedVal, ALL_SKILLS, COMBAT_STATS, SOCIAL_STATS } from './utils';

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
}