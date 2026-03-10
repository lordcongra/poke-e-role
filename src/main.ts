import './style.css';
import OBR from "@owlbear-rodeo/sdk";
import type { Move, InventoryItem, ExtraCategory, CustomInfo } from './@types/index';
import { ALL_SKILLS, getVal, getDerivedVal, generateId } from './utils';
import { calculateStats } from './math';
import { loadUrlLists, fetchPokemonData, fetchAbilityData, populateLearnset, populateMoveDatalist } from './api';
import { 
    setupSpinners, updateSheetTypeUI, applyTypeStyle, 
    renderTypeMatchups, renderStatuses, renderCustomInfo, 
    renderInventory, renderExtraSkills, renderMoves 
} from './ui';
import { 
    METADATA_ID, setLoading, setLastMetadataStr, 
    sendToDicePlus, saveBatchDataToToken, saveMovesToToken, 
    saveInventoryToToken, saveExtraSkillsToToken, setupOBR, repairTrackers
} from './obr';

// --- STATE MANAGEMENT ---
let currentMoves: Move[] = [];
let currentInventory: InventoryItem[] = [];
let currentExtraCategories: ExtraCategory[] = [];
let currentStatuses: string[] = ["Healthy"];
let currentCustomInfo: CustomInfo[] = [];
let currentTokenData: Record<string, any> = {};

// --- GLOBAL HELPERS ---
function saveDataToToken(id: string, value: any) {
    saveBatchDataToToken({ [id]: value });
}

function syncDerivedStats() {
    const updates: Record<string, any> = {};
    let hasChanges = false;
    
    // Changed val to 'any' to cleanly handle our new booleans
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

    ['actions-used', 'hp-curr', 'will-curr', 'hp-base', 'will-base'].forEach(id => {
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
    currentStatuses.push("Healthy");
    renderStatuses(currentStatuses, saveDataToToken);
    saveDataToToken('status-list', JSON.stringify(currentStatuses));
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
document.getElementById('species')?.addEventListener('change', async (e) => {
    const pokemonName = (e.target as HTMLInputElement).value;
    const pokemonData = await fetchPokemonData(pokemonName);
    if (!pokemonData) return;

    populateLearnset(pokemonData);
    populateMoveDatalist(pokemonData);

    const type1 = String(pokemonData.Type1 || "Normal");
    const type2 = String(pokemonData.Type2 || "");
    const hasSecondType = type2 && type2 !== "None" && type2 !== "null";
    const typing = hasSecondType ? `${type1} / ${type2}` : type1;
    
    const baseStats = pokemonData.BaseStats;
    const baseAttrs = pokemonData.Attributes || pokemonData.BaseAttributes || pokemonData;
    const hp = pokemonData.BaseHP || (baseStats && baseStats.HP) || 4;
    
    const abilitySelect = document.getElementById('ability') as HTMLSelectElement;
    abilitySelect.innerHTML = '';
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
        abilitySelect.appendChild(opt);
    });

    let defaultAbility = "";
    if (abilities.length > 0) {
        defaultAbility = abilities[0].replace(" (HA)", "");
        const abilityData = await fetchAbilityData(defaultAbility);
        if (abilityData) abilitySelect.title = String(abilityData.Effect || abilityData.Description || "No description found.");
    }

    const typingInput = document.getElementById('typing') as HTMLInputElement;
    typingInput.value = typing;
    applyTypeStyle(typingInput, typing); 
    renderTypeMatchups(typing); 

    (document.getElementById('hp-base') as HTMLInputElement).value = String(hp);
    (document.getElementById('str-base') as HTMLInputElement).value = String(baseAttrs.Strength || 2);
    (document.getElementById('dex-base') as HTMLInputElement).value = String(baseAttrs.Dexterity || 2);
    (document.getElementById('vit-base') as HTMLInputElement).value = String(baseAttrs.Vitality || 2);
    (document.getElementById('spe-base') as HTMLInputElement).value = String(baseAttrs.Special || 2);
    (document.getElementById('ins-base') as HTMLInputElement).value = String(baseAttrs.Insight || 1);

    const batchUpdates: Record<string, any> = {
        'species': pokemonName, 'typing': typing, 'hp-base': hp,
        'str-base': baseAttrs.Strength || 2, 'dex-base': baseAttrs.Dexterity || 2, 
        'vit-base': baseAttrs.Vitality || 2, 'spe-base': baseAttrs.Special || 2, 
        'ins-base': baseAttrs.Insight || 1, 'ability': defaultAbility,
        'ability-list': abilities.join(',')
    };

    const hasExistingSkills = ALL_SKILLS.some((skill: string) => getVal(`${skill}-base`) > 0 || getVal(`${skill}-buff`) > 0);
    const hasExistingMoves = currentMoves.length > 0;
    
    let shouldWipe = false;
    if (hasExistingSkills || hasExistingMoves) {
        shouldWipe = confirm("Warning: This token already has Skills/Moves setup.\n\nClick OK if loading a BRAND NEW Pokemon (Wipes Skills).\n\nClick CANCEL if Mega-Evolving/Form change (Keeps Skills).");
    } else {
        shouldWipe = true; 
    }

    if (shouldWipe) {
        ALL_SKILLS.forEach((skill: string) => {
            const baseInput = document.getElementById(`${skill}-base`) as HTMLInputElement;
            const buffInput = document.getElementById(`${skill}-buff`) as HTMLInputElement;
            if(baseInput) { baseInput.value = "0"; batchUpdates[`${skill}-base`] = 0; }
            if(buffInput) { buffInput.value = "0"; batchUpdates[`${skill}-buff`] = 0; }
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

document.getElementById('ability')?.addEventListener('change', async (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const abilityData = await fetchAbilityData(val);
    if (abilityData) {
        (e.target as HTMLSelectElement).title = String(abilityData.Effect || abilityData.Description || "No description found.");
    }
    saveDataToToken('ability', val);
});

document.getElementById('sheet-type')?.addEventListener('change', (e) => {
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

    const typingInput = document.getElementById('typing') as HTMLInputElement;
    if (typingInput && typingInput.value) {
        applyTypeStyle(typingInput, typingInput.value);
        renderTypeMatchups(typingInput.value); 
    }

    const pokemonName = (document.getElementById('species') as HTMLInputElement).value;
    const abilitySelect = document.getElementById('ability') as HTMLSelectElement;
    const currentAbility = abilitySelect.value;

    if (pokemonName) {
        const pokemonData = await fetchPokemonData(pokemonName);
        if (pokemonData) {
            populateLearnset(pokemonData);
            populateMoveDatalist(pokemonData);

            abilitySelect.innerHTML = '';
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
                abilitySelect.appendChild(opt);
            });

            if (currentAbility && abilities.some((a: string) => a.replace(" (HA)", "") === currentAbility)) {
                abilitySelect.value = currentAbility;
            } else if (abilities.length > 0) {
                abilitySelect.value = abilities[0].replace(" (HA)", "");
                batchUpdates['ability'] = abilitySelect.value;
            }
            batchUpdates['ability-list'] = abilities.join(',');
        }
    }

    if (abilitySelect.value) {
        const abilityData = await fetchAbilityData(abilitySelect.value);
        if (abilityData) abilitySelect.title = String(abilityData.Effect || abilityData.Description || "No description found.");
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
    const initBonus = getDerivedVal('init-total');
    const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
    const notation = initBonus > 0 ? `1d6+${initBonus}` : `1d6`;
    OBR.notification.show(`🎲 ${nickname} rolled Initiative!`);
    sendToDicePlus(notation, "init"); 
});

document.getElementById('roll-global-chance-btn')?.addEventListener('click', () => {
    const chanceDice = getVal('global-chance-mod');
    if (chanceDice <= 0) return;
    const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
    sendToDicePlus(`${chanceDice}d6>5 # ${nickname}: Chance Roll`, "chance"); 
});

function rollAccuracy(move: Move) {
  const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
  let actions = getVal('actions-used');
  const requiredSuccesses = actions + 1;
  const extraDice = getVal('global-acc-mod'); 
  const succMod = getVal('global-succ-mod'); 
  
  let attrTotal = move.attr === 'will' ? getDerivedVal('will-max-display') : getDerivedVal(`${move.attr}-total`);
  const skillTotal = getDerivedVal(`${move.skill}-total`);
  const dicePool = attrTotal + skillTotal + extraDice;
  
  if (actions < 5) {
      actions++;
      (document.getElementById('actions-used') as HTMLInputElement).value = actions.toString();
      saveDataToToken('actions-used', actions); 
      currentTokenData['actions-used'] = actions;
  }

  const notation = succMod !== 0 ? `${dicePool}d6>3+${succMod}` : `${dicePool}d6>3`;
  if (dicePool > 0) sendToDicePlus(`${notation} # ${nickname}: ${move.name} Acc (Needs ${requiredSuccesses})`);
}

function rollDamage(move: Move) {
  if (move.cat === "Supp") { alert(`${move.name} is a Support move (No Damage).`); return; }

  const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
  const typingStr = (document.getElementById('typing') as HTMLInputElement).value || "";
  const abilitySelect = document.getElementById('ability') as HTMLSelectElement; 
  const abilityStr = abilitySelect ? abilitySelect.value : "";
  const extraDice = getVal('global-dmg-mod'); 
  
  let scalingVal = move.dmgStat ? getDerivedVal(`${move.dmgStat}-total`) : 0;
  
  const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");
  const hasTypeMatch = move.type && typingStr.includes(move.type);
  
  let stabBonus = 0; let stabTag = "";
  if (hasTypeMatch || isProtean) {
      stabBonus = 1; stabTag = isProtean && !hasTypeMatch ? " (Protean STAB)" : " (STAB)";
  }

  const basePool = move.power + scalingVal + extraDice + stabBonus;
  const defStr = prompt(`Enter Target's ${move.cat === 'Phys' ? 'Defense' : 'Special Defense'} reduction (or 0):`, "0");
  if (defStr === null) return; 
  
  let finalPool = basePool - (parseInt(defStr) || 0) + (confirm("Was this a Critical Hit? (OK for Yes, Cancel for No)") ? 2 : 0);
  if (finalPool > 0) sendToDicePlus(`${finalPool}d6>3 # ${nickname}: ${move.name} Dmg${stabTag}`);
}

function rollGeneric(actionName: string, pool: number, incrementEvade = false, incrementClash = false, incrementAction = false) {
   const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
   const batchUpdates: Record<string, any> = {};
   
   if (incrementAction) {
      let a = getVal('actions-used');
      if (a < 5) {
         (document.getElementById('actions-used') as HTMLInputElement).value = (a+1).toString();
         batchUpdates['actions-used'] = a + 1; 
      }
   }
   if (incrementEvade) {
      const el = document.getElementById('evasions-used') as HTMLInputElement;
      if (el) {
          el.checked = true;
          batchUpdates['evasions-used'] = true;
      }
   }
   if (incrementClash) {
      const el = document.getElementById('clashes-used') as HTMLInputElement;
      if (el) {
          el.checked = true;
          batchUpdates['clashes-used'] = true;
      }
   }

   if (Object.keys(batchUpdates).length > 0) {
       Object.assign(currentTokenData, batchUpdates);
       saveBatchDataToToken(batchUpdates);
   }
   if (pool > 0) sendToDicePlus(`${pool}d6>3 # ${nickname}: ${actionName}`);
}

document.getElementById('roll-evade-btn')?.addEventListener('click', () => { rollGeneric("Evasion", getDerivedVal('dex-total') + getDerivedVal('evasion-total'), true, false, true); });
document.getElementById('roll-clash-btn')?.addEventListener('click', () => {
  const isSpec = confirm("Is this a Special Clash? (Cancel for Physical)");
  rollGeneric(isSpec ? "Special Clash" : "Physical Clash", (isSpec ? getDerivedVal('spe-total') : getDerivedVal('str-total')) + getDerivedVal('clash-total'), false, true, true); 
});
document.getElementById('roll-maneuver-btn')?.addEventListener('click', () => {
   const val = (document.getElementById('maneuver-select') as HTMLSelectElement).value;
   if (val === 'none') return;
   if (val === 'ambush') rollGeneric("Ambush", getDerivedVal('dex-total') + getDerivedVal('stealth-total'), false, false, true);
   if (val === 'cover') rollGeneric("Cover an Ally", 3 + getDerivedVal('ins-total'), false, false, true);
   if (val === 'grapple') rollGeneric("Grapple", getDerivedVal('str-total') + getDerivedVal('brawl-total'), false, false, true);
   if (val === 'run') rollGeneric("Run Away", getDerivedVal('dex-total') + getDerivedVal('athletic-total'), false, false, true);
   if (val === 'stabilize') rollGeneric("Stabilize Ally", getDerivedVal('cle-total') + getDerivedVal('medicine-total'), false, false, true);
   if (val === 'struggle') rollGeneric("Struggle (Accuracy)", getDerivedVal('dex-total') + getDerivedVal('brawl-total'), false, false, true);
});

// --- ROUND RESET UNCHECKS ALL BOXES ---
document.getElementById('reset-round-btn')?.addEventListener('click', () => {
    (document.getElementById('actions-used') as HTMLInputElement).value = "0";
    (document.getElementById('evasions-used') as HTMLInputElement).checked = false;
    (document.getElementById('clashes-used') as HTMLInputElement).checked = false;
    
    const updates = { 'actions-used': 0, 'evasions-used': false, 'clashes-used': false }; 
    Object.assign(currentTokenData, updates);
    saveBatchDataToToken(updates);

    let movesChanged = false;
    currentMoves.forEach(m => {
        if ((m as any).used) {
            (m as any).used = false;
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

    if (role === 'GM') {
        const gmTools = document.getElementById('gm-tools');
        if (gmTools) gmTools.style.display = 'block';
    } else if (role === 'PLAYER' && isNPC) {
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
    
    const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
    if (nicknameInput) nicknameInput.value = data['nickname'] || token.name || "";

    if (data['sheet-type']) updateSheetTypeUI(data['sheet-type']);

    try { currentMoves = data['moves-data'] ? JSON.parse(data['moves-data']) : []; } catch(e) { currentMoves = []; }
    try { currentInventory = data['inv-data'] ? JSON.parse(data['inv-data']) : []; } catch(e) { currentInventory = []; }
    try { currentExtraCategories = data['extra-skills-data'] ? JSON.parse(data['extra-skills-data']) : []; } catch(e) { currentExtraCategories = []; }
    
    try { currentStatuses = data['status-list'] ? JSON.parse(data['status-list']) : ["Healthy"]; } catch(e) { currentStatuses = ["Healthy"]; }
    try { currentCustomInfo = data['custom-info-data'] ? JSON.parse(data['custom-info-data']) : []; } catch(e) { currentCustomInfo = []; }

    reRenderMoves();
    renderInventory(currentInventory, saveInventoryToToken);
    renderExtraSkills(currentExtraCategories, currentMoves, saveExtraSkillsToToken, syncDerivedStats, reRenderMoves);
    renderStatuses(currentStatuses, saveDataToToken);
    renderCustomInfo(currentCustomInfo, saveDataToToken);
    renderTypeMatchups(data['typing'] || ""); 
    calculateStats(currentExtraCategories, currentMoves);

    const currentSpeciesName = data['species'];
    if (currentSpeciesName) {
        fetchPokemonData(currentSpeciesName).then(pokemonData => {
            if (pokemonData) {
                populateLearnset(pokemonData);
                populateMoveDatalist(pokemonData);
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

// INITIALIZE
loadUrlLists();
setupSpinners();
renderStatuses(currentStatuses, saveDataToToken); 
renderCustomInfo(currentCustomInfo, saveDataToToken);
const initialTyping = (document.getElementById('typing') as HTMLInputElement)?.value || "";
renderTypeMatchups(initialTyping);
calculateStats(currentExtraCategories, currentMoves);
setupOBR(loadDataFromToken);