import './style.css';
import OBR from "@owlbear-rodeo/sdk";
import type { Move, InventoryItem, ExtraCategory, CustomInfo, DicePlusData, StatusItem, EffectItem } from './@types/index';
import { ALL_SKILLS, generateId } from './utils';
import { calculateStats } from './math';
import { loadUrlLists, fetchPokemonData, fetchAbilityData, populateLearnset } from './api';
import { sheetView } from './view';
import { 
    setupSpinners, updateSheetTypeUI, applyTypeStyle, 
    renderTypeMatchups, renderStatuses, renderEffects, renderCustomInfo, 
    renderInventory, renderExtraSkills, renderMoves 
} from './ui';
import { 
    MY_EXTENSION_ID, METADATA_ID, setLoading, setLastMetadataStr, 
    sendToDicePlus, saveBatchDataToToken, saveMovesToToken, 
    saveInventoryToToken, saveExtraSkillsToToken, setupOBR, repairTrackers
} from './obr';

// --- TINY HELPERS ---
const v = (el: HTMLInputElement) => parseInt(el.value) || 0;
const tv = (el: HTMLElement) => parseInt(el.innerText) || 0;

// --- STATE MANAGEMENT ---
let currentMoves: Move[] = [];
let currentInventory: InventoryItem[] = [];
let currentExtraCategories: ExtraCategory[] = [];
let currentStatuses: StatusItem[] = [{ id: generateId(), name: "Healthy", customName: "", rounds: 0 }];
let currentEffects: EffectItem[] = [];
let currentCustomInfo: CustomInfo[] = [];
let currentTokenData: Record<string, any> = {};

// --- GLOBAL HELPERS ---
function saveDataToToken(id: string, value: any) {
    saveBatchDataToToken({ [id]: value });
}

function syncDerivedStats() {
    const updates: Record<string, any> = {};
    let hasChanges = false;
    
    const checkAndAdd = (id: string, val: any) => {
        if (currentTokenData[id] !== val) {
            updates[id] = val;
            hasChanges = true;
            currentTokenData[id] = val;
        }
    };

    const spans = document.querySelectorAll<HTMLElement>('span[id$="-display"], span[id$="-total"], span[id$="-derived"], td[id$="-total"]');
    spans.forEach(span => {
        if (span.id) checkAndAdd(span.id, parseInt(span.innerText) || 0);
    });

    ['actions-used', 'hp-curr', 'will-curr', 'hp-base', 'will-base', 'happiness-curr', 'loyalty-curr'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) checkAndAdd(id, parseFloat(el.value) || 0);
    });

    ['evasions-used', 'clashes-used'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) checkAndAdd(id, el.checked);
    });

    if (hasChanges) {
        saveBatchDataToToken(updates);
    }
}

function reRenderMoves() {
    renderMoves(currentMoves, currentExtraCategories, saveMovesToToken, rollAccuracy, rollDamage);
}

function applyStatLimits(pokemonData: Record<string, any>) {
    const getLimit = (stat: string) => 
        pokemonData[`Max${stat}`] || 
        pokemonData[`Max ${stat}`] || 
        (pokemonData.MaxAttributes && pokemonData.MaxAttributes[stat]) || 
        (pokemonData.MaxStats && pokemonData.MaxStats[stat]) || 
        "?";

    if (sheetView.stats.str.limit) sheetView.stats.str.limit.innerText = getLimit("Strength");
    if (sheetView.stats.dex.limit) sheetView.stats.dex.limit.innerText = getLimit("Dexterity");
    if (sheetView.stats.vit.limit) sheetView.stats.vit.limit.innerText = getLimit("Vitality");
    if (sheetView.stats.spe.limit) sheetView.stats.spe.limit.innerText = getLimit("Special");
    if (sheetView.stats.ins.limit) sheetView.stats.ins.limit.innerText = getLimit("Insight");
}

// --- TOP-LEVEL BUTTON LISTENERS ---
document.getElementById('toggle-learnset-btn')?.addEventListener('click', () => {
    const container = document.getElementById('learnset-container');
    const btn = document.getElementById('toggle-learnset-btn');
    if (container && btn) {
        if (container.style.display === 'none') {
            container.style.display = 'block';
            btn.innerText = "📖 Hide Learnset";
        } else {
            container.style.display = 'none';
            btn.innerText = "📖 View Learnset";
        }
    }
});

document.getElementById('add-status-btn')?.addEventListener('click', () => {
    currentStatuses.push({ id: generateId(), name: "Healthy", customName: "", rounds: 0 });
    renderStatuses(currentStatuses, saveDataToToken, rollStatus);
    saveDataToToken('status-list', JSON.stringify(currentStatuses));
});

document.getElementById('add-effect-btn')?.addEventListener('click', () => {
    currentEffects.push({ id: generateId(), name: "", rounds: 0 });
    renderEffects(currentEffects, saveDataToToken);
    saveDataToToken('effects-data', JSON.stringify(currentEffects));
});

document.getElementById('add-custom-info-btn')?.addEventListener('click', () => {
    currentCustomInfo.push({ id: generateId(), label: 'New Field', value: '' });
    renderCustomInfo(currentCustomInfo, saveDataToToken);
    saveDataToToken('custom-info-data', JSON.stringify(currentCustomInfo));
});

document.getElementById('add-cat-btn')?.addEventListener('click', () => {
    const categoryId = "cat_" + generateId();
    currentExtraCategories.push({
        id: categoryId, name: "EXTRA",
        skills: [
            { id: categoryId + "_1", name: "", base: 0, buff: 0 }, { id: categoryId + "_2", name: "", base: 0, buff: 0 },
            { id: categoryId + "_3", name: "", base: 0, buff: 0 }, { id: categoryId + "_4", name: "", base: 0, buff: 0 }
        ]
    });
    renderExtraSkills(currentExtraCategories, currentMoves, saveExtraSkillsToToken, syncDerivedStats, reRenderMoves);
    reRenderMoves();
    saveExtraSkillsToToken(currentExtraCategories);
});

document.getElementById('add-move-btn')?.addEventListener('click', () => {
  if (currentMoves.length >= 20) { alert("You've reached the max of 20 moves."); return; }
  currentMoves.push({ id: generateId(), name: '', attr: 'str', skill: 'brawl', type: '', cat: 'Phys', dmg: '', power: 0, dmgStat: '' });
  reRenderMoves();
  saveMovesToToken(currentMoves);
});

document.getElementById('add-item-btn')?.addEventListener('click', () => {
    currentInventory.push({ id: generateId(), qty: 1, name: '', desc: '' });
    renderInventory(currentInventory, saveInventoryToToken); 
    saveInventoryToToken(currentInventory);
});

// --- IDENTITY & DATA FETCHING ---
sheetView.identity.species.addEventListener('change', async () => {
    const pokemonName = sheetView.identity.species.value;
    const pokemonData = await fetchPokemonData(pokemonName);
    if (!pokemonData) return;

    populateLearnset(pokemonData);
    applyStatLimits(pokemonData); 

    const type1 = String(pokemonData.Type1 || "Normal");
    const type2 = String(pokemonData.Type2 || "");
    const hasSecondType = type2 && type2 !== "None" && type2 !== "null";
    const typing = hasSecondType ? `${type1} / ${type2}` : type1;
    
    const baseStats = pokemonData.BaseStats;
    const baseAttrs = pokemonData.Attributes || pokemonData.BaseAttributes || pokemonData;
    const hp = pokemonData.BaseHP || (baseStats && baseStats.HP) || 4;
    
    sheetView.identity.ability.innerHTML = '';
    const abilities: string[] = [];
    
    const hasAbility1 = !!pokemonData.Ability1;
    const hasAbility2 = pokemonData.Ability2 && pokemonData.Ability2 !== "None" && pokemonData.Ability2 !== "null";
    const hasHiddenAbility = pokemonData.HiddenAbility && pokemonData.HiddenAbility !== "None" && pokemonData.HiddenAbility !== "null";

    if (hasAbility1) abilities.push(String(pokemonData.Ability1));
    if (hasAbility2) abilities.push(String(pokemonData.Ability2));
    if (hasHiddenAbility) abilities.push(String(pokemonData.HiddenAbility) + " (HA)");

    if (abilities.length === 0 && Array.isArray(pokemonData.Abilities)) {
        pokemonData.Abilities.forEach((a: string | { Name: string }) => {
            abilities.push(typeof a === 'string' ? a : a.Name);
        });
    }

    abilities.forEach((ab: string) => {
        const opt = document.createElement('option');
        opt.value = ab.replace(" (HA)", "");
        opt.text = ab;
        sheetView.identity.ability.appendChild(opt);
    });

    let defaultAbility = "";
    if (abilities.length > 0) {
        defaultAbility = abilities[0].replace(" (HA)", "");
        const abilityData = await fetchAbilityData(defaultAbility);
        if (abilityData) sheetView.identity.ability.title = String(abilityData.Effect || abilityData.Description || "No description found.");
    }

    sheetView.identity.typing.value = typing;
    applyTypeStyle(sheetView.identity.typing, typing); 
    renderTypeMatchups(typing); 

    sheetView.health.hp.base.value = String(hp);
    sheetView.stats.str.base.value = String(baseAttrs.Strength || 2);
    sheetView.stats.dex.base.value = String(baseAttrs.Dexterity || 2);
    sheetView.stats.vit.base.value = String(baseAttrs.Vitality || 2);
    sheetView.stats.spe.base.value = String(baseAttrs.Special || 2);
    sheetView.stats.ins.base.value = String(baseAttrs.Insight || 1);

    const batchUpdates: Record<string, any> = {
        'species': pokemonName, 'typing': typing, 'hp-base': hp,
        'str-base': baseAttrs.Strength || 2, 'dex-base': baseAttrs.Dexterity || 2, 
        'vit-base': baseAttrs.Vitality || 2, 'spe-base': baseAttrs.Special || 2, 
        'ins-base': baseAttrs.Insight || 1, 'ability': defaultAbility,
        'ability-list': abilities.join(',')
    };

    const hasExistingSkills = ALL_SKILLS.some((skill: string) => v(sheetView.skills[skill].base) > 0 || v(sheetView.skills[skill].buff) > 0);
    const hasExistingMoves = currentMoves.length > 0;
    
    let shouldWipe = false;
    if (hasExistingSkills || hasExistingMoves) {
        shouldWipe = confirm("Warning: This token already has Skills/Moves setup.\n\nClick OK if loading a BRAND NEW Pokemon (Wipes Skills).\n\nClick CANCEL if Mega-Evolving/Form change (Keeps Skills).");
    } else {
        shouldWipe = true; 
    }

    if (shouldWipe) {
        ALL_SKILLS.forEach((skill: string) => {
            sheetView.skills[skill].base.value = "0"; batchUpdates[`${skill}-base`] = 0;
            sheetView.skills[skill].buff.value = "0"; batchUpdates[`${skill}-buff`] = 0;
        });
        currentMoves = [];
        reRenderMoves();
        batchUpdates['moves-data'] = "[]";
    }

    Object.assign(currentTokenData, batchUpdates);
    calculateStats(currentExtraCategories, currentMoves);
    saveBatchDataToToken(batchUpdates); 
    syncDerivedStats();
});

sheetView.identity.ability.addEventListener('change', async (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const abilityData = await fetchAbilityData(val);
    if (abilityData) {
        (e.target as HTMLSelectElement).title = String(abilityData.Effect || abilityData.Description || "No description found.");
    }
    saveDataToToken('ability', val);
    calculateStats(currentExtraCategories, currentMoves);
});

sheetView.identity.sheetType.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    updateSheetTypeUI(val);
    saveDataToToken('sheet-type', val);
    calculateStats(currentExtraCategories, currentMoves);
});

// --- DEFIBRILLATOR BUTTON ---
document.getElementById('refresh-data-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refresh-data-btn') as HTMLButtonElement;
    btn.innerText = "⏳ Refreshing...";
    btn.disabled = true;

    const batchUpdates: Record<string, any> = {};
    const typingStr = sheetView.identity.typing.value;

    if (typingStr) {
        applyTypeStyle(sheetView.identity.typing, typingStr);
        renderTypeMatchups(typingStr); 
    }

    const pokemonName = sheetView.identity.species.value;
    const currentAbility = sheetView.identity.ability.value;

    if (pokemonName) {
        const pokemonData = await fetchPokemonData(pokemonName);
        if (pokemonData) {
            populateLearnset(pokemonData);
            applyStatLimits(pokemonData); 

            sheetView.identity.ability.innerHTML = '';
            const abilities: string[] = [];
            
            const hasAbility1 = !!pokemonData.Ability1;
            const hasAbility2 = pokemonData.Ability2 && pokemonData.Ability2 !== "None" && pokemonData.Ability2 !== "null";
            const hasHiddenAbility = pokemonData.HiddenAbility && pokemonData.HiddenAbility !== "None" && pokemonData.HiddenAbility !== "null";

            if (hasAbility1) abilities.push(String(pokemonData.Ability1));
            if (hasAbility2) abilities.push(String(pokemonData.Ability2));
            if (hasHiddenAbility) abilities.push(String(pokemonData.HiddenAbility) + " (HA)");

            if (abilities.length === 0 && Array.isArray(pokemonData.Abilities)) {
                pokemonData.Abilities.forEach((a: string | { Name: string }) => {
                    abilities.push(typeof a === 'string' ? a : a.Name);
                });
            }

            abilities.forEach((ab: string) => {
                const opt = document.createElement('option');
                opt.value = ab.replace(" (HA)", "");
                opt.text = ab;
                sheetView.identity.ability.appendChild(opt);
            });

            if (currentAbility && abilities.some((a: string) => a.replace(" (HA)", "") === currentAbility)) {
                sheetView.identity.ability.value = currentAbility;
            } else if (abilities.length > 0) {
                sheetView.identity.ability.value = abilities[0].replace(" (HA)", "");
                batchUpdates['ability'] = sheetView.identity.ability.value;
            }
            batchUpdates['ability-list'] = abilities.join(',');
        }
    }

    if (sheetView.identity.ability.value) {
        const abilityData = await fetchAbilityData(sheetView.identity.ability.value);
        if (abilityData) sheetView.identity.ability.title = String(abilityData.Effect || abilityData.Description || "No description found.");
    }

    reRenderMoves();
    batchUpdates['moves-data'] = JSON.stringify(currentMoves);
    Object.assign(currentTokenData, batchUpdates);
    
    saveBatchDataToToken(batchUpdates); 
    syncDerivedStats(); 
    repairTrackers(); 
    
    btn.innerText = "✅ Done!";
    setTimeout(() => {
        btn.innerText = "🔄 Refresh Token Data";
        btn.disabled = false;
    }, 2000);
});

// --- COMBAT ROLL LOGIC ---
document.getElementById('roll-init-btn')?.addEventListener('click', async () => {
    const initBonus = tv(sheetView.initiative.total);
    const nickname = sheetView.identity.nickname.value || "Someone";
    const notation = initBonus > 0 ? `1d6+${initBonus}` : `1d6`;
    OBR.notification.show(`🎲 ${nickname} rolled Initiative!`);
    sendToDicePlus(notation, "init"); 
});

document.getElementById('roll-global-chance-btn')?.addEventListener('click', () => {
    const chanceDice = v(sheetView.globalMods.chance);
    if (chanceDice <= 0) return;
    const nickname = sheetView.identity.nickname.value || "Someone";
    sendToDicePlus(`${chanceDice}d6>5 # ${nickname}: Chance Roll`, "chance"); 
});

function rollAccuracy(move: Move) {
  const nickname = sheetView.identity.nickname.value || "Someone";
  let actions = v(sheetView.trackers.actions);
  const requiredSuccesses = actions + 1;
  const extraDice = v(sheetView.globalMods.acc); 
  const succMod = v(sheetView.globalMods.succ); 
  
  let attrTotal = move.attr === 'will' ? tv(sheetView.health.will.max) : tv(sheetView.stats[move.attr].total);
  
  let skillTotal = 0;
  if (sheetView.skills[move.skill]) {
      skillTotal = tv(sheetView.skills[move.skill].total);
  } else {
      const extraEl = document.getElementById(`${move.skill}-total`);
      if (extraEl) skillTotal = parseInt(extraEl.innerText) || 0;
  }

  const dicePool = attrTotal + skillTotal + extraDice;
  
  if (actions < 5) {
      actions++;
      sheetView.trackers.actions.value = actions.toString();
      saveDataToToken('actions-used', actions); 
      currentTokenData['actions-used'] = actions;
  }

  const notation = succMod !== 0 ? `${dicePool}d6>3+${succMod}` : `${dicePool}d6>3`;
  if (dicePool > 0) sendToDicePlus(`${notation} # ${nickname}: ${move.name} Acc (Needs ${requiredSuccesses})`);
}

function rollDamage(move: Move) {
  if (move.cat === "Supp") { alert(`${move.name} is a Support move (No Damage).`); return; }

  const nickname = sheetView.identity.nickname.value || "Someone";
  const typingStr = sheetView.identity.typing.value || "";
  const abilityStr = sheetView.identity.ability.value || "";
  const extraDice = v(sheetView.globalMods.dmg); 
  
  let scalingVal = 0;
  const attrMap: Record<string, string> = { "str": "str", "dex": "dex", "vit": "vit", "spe": "spe", "ins": "ins", "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins" };
  if (move.dmgStat && attrMap[move.dmgStat] && sheetView.stats[attrMap[move.dmgStat]]) {
      scalingVal = tv(sheetView.stats[attrMap[move.dmgStat]].total);
  }
  
  const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");
  const hasTypeMatch = move.type && typingStr.includes(move.type);
  
  let stabBonus = 0; let stabTag = "";
  if (hasTypeMatch || isProtean) {
      stabBonus = 1; stabTag = isProtean && !hasTypeMatch ? " (Protean STAB)" : " (STAB)";
  }

  const basePool = move.power + scalingVal + extraDice + stabBonus;
  const defStr = prompt(`Enter Target's ${move.cat === 'Phys' ? 'Defense' : 'Special Defense'} reduction (or 0):`, "0");
  if (defStr === null) return; 
  
  // Calculate the raw pool
  let rawPool = basePool - (parseInt(defStr) || 0) + (confirm("Was this a Critical Hit? (OK for Yes, Cancel for No)") ? 2 : 0);
  
  // Enforce the Pokerole Minimum 1 Damage Die rule!
  let finalPool = Math.max(1, rawPool);
  
  // Send the roll to Dice+ (No need to check if > 0 anymore, since it's guaranteed to be at least 1!)
  sendToDicePlus(`${finalPool}d6>3 # ${nickname}: ${move.name} Dmg${stabTag}`);
}

function rollGeneric(actionName: string, pool: number, incrementEvade = false, incrementClash = false, incrementAction = false) {
   const nickname = sheetView.identity.nickname.value || "Someone";
   const batchUpdates: Record<string, any> = {};
   
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
       Object.assign(currentTokenData, batchUpdates);
       saveBatchDataToToken(batchUpdates);
   }
   if (pool > 0) sendToDicePlus(`${pool}d6>3 # ${nickname}: ${actionName}`);
}

function rollStatus(status: StatusItem) {
    const nickname = sheetView.identity.nickname.value || "Someone";
    let pool = 0;

    if (status.name.includes("Burn")) {
        pool = tv(sheetView.stats.dex.total) + tv(sheetView.skills.athletic.total);
    } else if (status.name === "Paralysis") {
        pool = tv(sheetView.stats.str.total) + tv(sheetView.skills.medicine.total);
    } else if (status.name === "Sleep" || status.name === "Confusion") {
        pool = tv(sheetView.stats.ins.total);
    } else if (status.name === "In Love") {
        pool = Math.max(v(sheetView.trackers.loyalty), tv(sheetView.stats.ins.total));
    } else {
        OBR.notification.show(`⚠️ ${status.name} does not have a standard self-recovery roll.`);
        return;
    }

    if (pool > 0) {
        const rollId = `status|${status.id}`;
        sendToDicePlus(`${pool}d6>3 # ${nickname}: ${status.name} Recovery`, rollId);
    }
}

document.getElementById('roll-evade-btn')?.addEventListener('click', () => { rollGeneric("Evasion", tv(sheetView.stats.dex.total) + tv(sheetView.skills.evasion.total), true, false, true); });
document.getElementById('roll-clash-btn')?.addEventListener('click', () => {
  const isSpec = confirm("Is this a Special Clash? (Cancel for Physical)");
  rollGeneric(isSpec ? "Special Clash" : "Physical Clash", (isSpec ? tv(sheetView.stats.spe.total) : tv(sheetView.stats.str.total)) + tv(sheetView.skills.clash.total), false, true, true); 
});
document.getElementById('roll-maneuver-btn')?.addEventListener('click', () => {
   const val = (document.getElementById('maneuver-select') as HTMLSelectElement).value;
   if (val === 'none') return;
   if (val === 'ambush') rollGeneric("Ambush", tv(sheetView.stats.dex.total) + tv(sheetView.skills.stealth.total), false, false, true);
   if (val === 'cover') rollGeneric("Cover an Ally", 3 + tv(sheetView.stats.ins.total), false, false, true);
   if (val === 'grapple') rollGeneric("Grapple", tv(sheetView.stats.str.total) + tv(sheetView.skills.brawl.total), false, false, true);
   if (val === 'run') rollGeneric("Run Away", tv(sheetView.stats.dex.total) + tv(sheetView.skills.athletic.total), false, false, true);
   if (val === 'stabilize') rollGeneric("Stabilize Ally", tv(sheetView.stats.cle.total) + tv(sheetView.skills.medicine.total), false, false, true);
   if (val === 'struggle') rollGeneric("Struggle (Accuracy)", tv(sheetView.stats.dex.total) + tv(sheetView.skills.brawl.total), false, false, true);
});

// --- ROUND RESET UNCHECKS BOXES & TICKS TIMERS ---
document.getElementById('reset-round-btn')?.addEventListener('click', () => {
    sheetView.trackers.actions.value = "0";
    sheetView.trackers.evade.checked = false;
    sheetView.trackers.clash.checked = false;
    
    let updates: Record<string, any> = { 'actions-used': 0, 'evasions-used': false, 'clashes-used': false }; 

    // Auto-Tick Timers (ONLY EFFECTS, NOT STATUSES)
    let timersChanged = false;
    currentEffects.forEach(e => {
        if (e.rounds > 0) { e.rounds--; timersChanged = true; }
    });

    if (timersChanged) {
        renderEffects(currentEffects, saveDataToToken);
        updates['effects-data'] = JSON.stringify(currentEffects);
    }

    Object.assign(currentTokenData, updates);
    saveBatchDataToToken(updates);

    let movesChanged = false;
    currentMoves.forEach(m => {
        if (m.used) {
            m.used = false;
            movesChanged = true;
        }
    });
    
    if (movesChanged) {
        reRenderMoves();
        saveMovesToToken(currentMoves);
    }
});

// --- DATA INJECTION ---
async function loadDataFromToken(tokenId: string) {
  setLoading(true);
  const items = await OBR.scene.items.getItems([tokenId]);
  
  if (items.length > 0) {
    const token = items[0];
    const data = (token.metadata[METADATA_ID] as Record<string, any>) || {};
    
    currentTokenData = data; 
    setLastMetadataStr(JSON.stringify(data)); 

    const role = await OBR.player.getRole();
    const isNPC = String(data['is-npc']) === 'true';

    const gmTools = document.getElementById('gm-tools');
    if (gmTools) gmTools.style.display = (role === 'GM') ? 'block' : 'none';

    if (role === 'PLAYER' && isNPC) {
        document.getElementById('app')!.style.display = 'none';
        document.getElementById('gm-lock-screen')!.style.display = 'block';
        renderTypeMatchups(data['typing'] || ""); 
        setLoading(false); 
        return;
    } 
    
    document.getElementById('app')!.style.display = 'block';
    const lockScreen = document.getElementById('gm-lock-screen');
    if (lockScreen) lockScreen.style.display = 'none';
    
    const sheetInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.sheet-save');
    const initialUpdates: Record<string, any> = {}; 

    sheetInputs.forEach(element => {
      const isDynamic = ['move-input', 'inv-input', 'cat-name-input', 'extra-skill-name', 'extra-skill-base', 'extra-skill-buff', 'skill-label'].some((cls: string) => element.classList.contains(cls));
      if (isDynamic) return;
      
      const id = element.id;
      const val = data[id];

      if (id === 'ability' && val) {
          const sel = element as HTMLSelectElement;
          sel.innerHTML = '';
          
          if (data['ability-list']) {
              data['ability-list'].split(',').forEach((ab: string) => {
                  const opt = document.createElement('option');
                  opt.value = ab.replace(" (HA)", "");
                  opt.text = ab;
                  sel.appendChild(opt);
              });
          } else {
              sel.innerHTML = `<option value="${val}">${val}</option>`;
          }
          sel.value = val;

          fetchAbilityData(val).then(abilityData => {
              if (abilityData) sel.title = String(abilityData.Effect || abilityData.Description || "No description found.");
          });
      }
      else if (element.type === 'checkbox') {
          const chk = element as HTMLInputElement;
          if (val !== undefined) {
              chk.checked = (val === true || val === 'true');
          } else {
              initialUpdates[id] = chk.checked;
          }
      }
      else if (val !== undefined) {
          element.value = val;
      } 
      else if (element instanceof HTMLSelectElement) {
          element.value = element.querySelector('option[selected]')?.getAttribute('value') || element.options[0]?.value || '';
          initialUpdates[id] = element.value; 
      } 
      else {
          element.value = element.defaultValue; 
          initialUpdates[id] = element.type === 'number' ? (parseFloat(element.value) || 0) : element.value; 
      }

      if (id === 'typing') applyTypeStyle(element, element.value);
    });

    const npcCheck = document.getElementById('is-npc') as HTMLInputElement;
    if (npcCheck) npcCheck.checked = isNPC;
    
    sheetView.identity.nickname.value = data['nickname'] || token.name || "";

    if (data['sheet-type']) updateSheetTypeUI(data['sheet-type']);

    try { currentMoves = data['moves-data'] ? JSON.parse(data['moves-data']) : []; } catch(e) { currentMoves = []; }
    try { currentInventory = data['inv-data'] ? JSON.parse(data['inv-data']) : []; } catch(e) { currentInventory = []; }
    try { currentExtraCategories = data['extra-skills-data'] ? JSON.parse(data['extra-skills-data']) : []; } catch(e) { currentExtraCategories = []; }
    try { currentCustomInfo = data['custom-info-data'] ? JSON.parse(data['custom-info-data']) : []; } catch(e) { currentCustomInfo = []; }
    try { currentEffects = data['effects-data'] ? JSON.parse(data['effects-data']) : []; } catch(e) { currentEffects = []; }

    try { 
        const parsedStatuses = data['status-list'] ? JSON.parse(data['status-list']) : [{ id: generateId(), name: "Healthy", customName: "", rounds: 0 }]; 
        if (parsedStatuses.length > 0 && typeof parsedStatuses[0] === 'string') {
            currentStatuses = parsedStatuses.map((s: string) => ({ id: generateId(), name: s, customName: "", rounds: 0 }));
        } else {
            currentStatuses = parsedStatuses;
        }
    } catch(e) { 
        currentStatuses = [{ id: generateId(), name: "Healthy", customName: "", rounds: 0 }]; 
    }

    reRenderMoves();
    renderInventory(currentInventory, saveInventoryToToken);
    renderExtraSkills(currentExtraCategories, currentMoves, saveExtraSkillsToToken, syncDerivedStats, reRenderMoves);
    renderStatuses(currentStatuses, saveDataToToken, rollStatus);
    renderEffects(currentEffects, saveDataToToken);
    renderCustomInfo(currentCustomInfo, saveDataToToken);
    renderTypeMatchups(data['typing'] || ""); 
    calculateStats(currentExtraCategories, currentMoves);

    const currentSpeciesName = data['species'];
    if (currentSpeciesName) {
        fetchPokemonData(currentSpeciesName).then(pokemonData => {
            if (pokemonData) {
                populateLearnset(pokemonData);
                applyStatLimits(pokemonData); 
            }
        });
    }

    setLoading(false);

    if (Object.keys(initialUpdates).length > 0) {
        Object.assign(currentTokenData, initialUpdates);
        saveBatchDataToToken(initialUpdates);
    }
    
    syncDerivedStats();
    return; 
  }
  setLoading(false); 
}

// --- BASIC FIELD LISTENERS ---
const listenerInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.sheet-save');
listenerInputs.forEach(element => {
  if (['ability', 'is-npc', 'species', 'typing'].includes(element.id)) return; 

  element.addEventListener('input', () => calculateStats(currentExtraCategories, currentMoves));
  
  element.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      
      let valToSave: any = target.value;
      if (target.type === 'number') {
          valToSave = parseFloat(target.value) || 0;
      } else if (target.type === 'checkbox') {
          valToSave = target.checked;
      }
      
      currentTokenData[target.id] = valToSave;
      saveDataToToken(target.id, valToSave);
      syncDerivedStats(); 
  });
});

const npcCheckbox = document.getElementById('is-npc') as HTMLInputElement;
if (npcCheckbox) {
    npcCheckbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        saveDataToToken('is-npc', isChecked ? "true" : "false");
    });
}

const showTrackersCheckbox = document.getElementById('show-trackers') as HTMLInputElement;
if (showTrackersCheckbox) {
    showTrackersCheckbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        saveDataToToken('show-trackers', isChecked);
        syncDerivedStats();
    });
}

// INITIALIZE
loadUrlLists();
setupSpinners();
renderStatuses(currentStatuses, saveDataToToken, rollStatus); 
renderEffects(currentEffects, saveDataToToken);
renderCustomInfo(currentCustomInfo, saveDataToToken);
const initialTyping = sheetView.identity.typing.value || "";
renderTypeMatchups(initialTyping);
calculateStats(currentExtraCategories, currentMoves);

// INITIALIZE OBR & ROLL CATCHER
setupOBR((tokenId) => {
    loadDataFromToken(tokenId);
});

OBR.onReady(() => {
    OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-result`, async (event) => {
        const data = event.data as DicePlusData;
        const myId = await OBR.player.getId();
        if (data.playerId !== myId) return; 

        // Catch Status Recovery rolls!
        if (data.rollId && data.rollId.startsWith("status|") && data.result) {
            const statusId = data.rollId.split("_")[0].split("|")[1];
            const successes = parseInt(String(data.result.totalValue)) || 0; 
            
            let statusChanged = false;
            currentStatuses.forEach(s => {
                if (s.id === statusId) {
                    s.rounds += successes; 
                    statusChanged = true;
                }
            });

            if (statusChanged) {
                renderStatuses(currentStatuses, saveDataToToken, rollStatus);
                const updates = { 'status-list': JSON.stringify(currentStatuses) };
                Object.assign(currentTokenData, updates);
                saveBatchDataToToken(updates);
            }
        }
    });
});