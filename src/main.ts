import './style.css';
import OBR from "@owlbear-rodeo/sdk";
import type { Move, InventoryItem, ExtraCategory } from './types';
import { ALL_SKILLS, getVal, getDerivedVal, generateId } from './utils';
import { calculateStats, updateMoveDisplays } from './math';
import { loadDatabaseLists, fetchPokemonData, fetchMoveData, fetchAbilityData } from './api';
import { buildMoveRow, buildInventoryRow, buildExtraCategoryHeader, buildExtraSkillRow, setupSpinners, updateSheetTypeUI, applyTypeStyle } from './ui';
import { 
    METADATA_ID, setLoading, setLastMetadataStr, 
    sendToDicePlus, saveBatchDataToToken, saveMovesToToken, 
    saveInventoryToToken, saveExtraSkillsToToken, setupOBR 
} from './obr';

let currentMoves: Move[] = [];
let currentInventory: InventoryItem[] = [];
let currentExtraCategories: ExtraCategory[] = [];

function saveDataToToken(id: string, value: string) {
    saveBatchDataToToken({ [id]: value });
}

// --- DATABASE BINDINGS ---
document.getElementById('species')?.addEventListener('change', async (e) => {
    const monName = (e.target as HTMLInputElement).value;
    const monData = await fetchPokemonData(monName);
    if (!monData) return;

    const type1 = monData.Type1 || "Normal";
    const type2 = monData.Type2 || "";
    const typing = (type2 && type2 !== "None" && type2 !== "null") ? `${type1} / ${type2}` : type1;
    const hp = monData.BaseHP || (monData.BaseStats && monData.BaseStats.HP) || 4;
    const attrs = monData.Attributes || monData.BaseAttributes || monData;
    
    const abilitySelect = document.getElementById('ability') as HTMLSelectElement;
    abilitySelect.innerHTML = '';
    const abilities: string[] = [];
    
    if (monData.Ability1) abilities.push(monData.Ability1);
    if (monData.Ability2 && monData.Ability2 !== "None" && monData.Ability2 !== "null") abilities.push(monData.Ability2);
    if (monData.HiddenAbility && monData.HiddenAbility !== "None" && monData.HiddenAbility !== "null") abilities.push(monData.HiddenAbility + " (HA)");

    if (abilities.length === 0 && Array.isArray(monData.Abilities)) {
        monData.Abilities.forEach((a:any) => abilities.push(typeof a === 'string' ? a : a.Name));
    }

    abilities.forEach(ab => {
        const opt = document.createElement('option');
        opt.value = ab.replace(" (HA)", "");
        opt.text = ab;
        abilitySelect.appendChild(opt);
    });

    let defaultAbility = "";
    if (abilities.length > 0) {
        defaultAbility = abilities[0].replace(" (HA)", "");
        const abData = await fetchAbilityData(defaultAbility);
        if (abData) abilitySelect.title = abData.Effect || abData.Description || "No description found.";
    }

    const typingInput = document.getElementById('typing') as HTMLInputElement;
    typingInput.value = typing;
    applyTypeStyle(typingInput, typing); // Colorize!

    (document.getElementById('hp-base') as HTMLInputElement).value = hp.toString();
    (document.getElementById('str-base') as HTMLInputElement).value = (attrs.Strength || 2).toString();
    (document.getElementById('dex-base') as HTMLInputElement).value = (attrs.Dexterity || 2).toString();
    (document.getElementById('vit-base') as HTMLInputElement).value = (attrs.Vitality || 2).toString();
    (document.getElementById('spe-base') as HTMLInputElement).value = (attrs.Special || 2).toString();
    (document.getElementById('ins-base') as HTMLInputElement).value = (attrs.Insight || 1).toString();

    const batchUpdates: Record<string, string> = {
        'species': monName, 'typing': typing, 'hp-base': hp.toString(),
        'str-base': (attrs.Strength || 2).toString(), 'dex-base': (attrs.Dexterity || 2).toString(), 
        'vit-base': (attrs.Vitality || 2).toString(), 'spe-base': (attrs.Special || 2).toString(), 
        'ins-base': (attrs.Insight || 1).toString(), 'ability': defaultAbility,
        'ability-list': abilities.join(',')
    };

    let shouldWipe = false;
    if (ALL_SKILLS.some(skill => getVal(`${skill}-base`) > 0 || getVal(`${skill}-buff`) > 0) || currentMoves.length > 0) {
        shouldWipe = confirm("Warning: This token already has Skills/Moves setup.\n\nClick OK if loading a BRAND NEW Pokemon (Wipes Skills).\n\nClick CANCEL if Mega-Evolving/Form change (Keeps Skills).");
    } else {
        shouldWipe = true; 
    }

    if (shouldWipe) {
        ALL_SKILLS.forEach(skill => {
            const baseInput = document.getElementById(`${skill}-base`) as HTMLInputElement;
            const buffInput = document.getElementById(`${skill}-buff`) as HTMLInputElement;
            if(baseInput) { baseInput.value = "0"; batchUpdates[`skill-base`] = "0"; }
            if(buffInput) { buffInput.value = "0"; batchUpdates[`skill-buff`] = "0"; }
        });
        currentMoves = [];
        renderMoves();
        batchUpdates['moves-data'] = "[]";
    }

    calculateStats(currentExtraCategories, currentMoves);
    saveBatchDataToToken(batchUpdates); 
});

document.getElementById('ability')?.addEventListener('change', async (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const abData = await fetchAbilityData(val);
    if (abData) {
        (e.target as HTMLSelectElement).title = abData.Effect || abData.Description || "No description found.";
    }
    saveDataToToken('ability', val);
});

document.getElementById('sheet-type')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    updateSheetTypeUI(val);
    saveDataToToken('sheet-type', val);
    calculateStats(currentExtraCategories, currentMoves);
});

// --- FIXED DATA REFRESH BUTTON (NO RACE CONDITIONS!) ---
document.getElementById('refresh-data-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refresh-data-btn') as HTMLButtonElement;
    btn.innerText = "⏳ Refreshing...";
    btn.disabled = true;

    // We build ONE single object to save to the database
    const batchUpdates: Record<string, string> = {};

    // Refresh Typing Box
    const typingInput = document.getElementById('typing') as HTMLInputElement;
    if (typingInput && typingInput.value) {
        applyTypeStyle(typingInput, typingInput.value);
    }

    // Refresh Ability Dropdown completely
    const speciesName = (document.getElementById('species') as HTMLInputElement).value;
    const abilitySelect = document.getElementById('ability') as HTMLSelectElement;
    const currentAbility = abilitySelect.value;

    if (speciesName) {
        const monData = await fetchPokemonData(speciesName);
        if (monData) {
            abilitySelect.innerHTML = '';
            const abilities: string[] = [];
            
            if (monData.Ability1) abilities.push(monData.Ability1);
            if (monData.Ability2 && monData.Ability2 !== "None" && monData.Ability2 !== "null") abilities.push(monData.Ability2);
            if (monData.HiddenAbility && monData.HiddenAbility !== "None" && monData.HiddenAbility !== "null") abilities.push(monData.HiddenAbility + " (HA)");

            if (abilities.length === 0 && Array.isArray(monData.Abilities)) {
                monData.Abilities.forEach((a:any) => abilities.push(typeof a === 'string' ? a : a.Name));
            }

            abilities.forEach(ab => {
                const opt = document.createElement('option');
                opt.value = ab.replace(" (HA)", "");
                opt.text = ab;
                abilitySelect.appendChild(opt);
            });

            if (currentAbility && abilities.some(a => a.replace(" (HA)", "") === currentAbility)) {
                abilitySelect.value = currentAbility;
            } else if (abilities.length > 0) {
                abilitySelect.value = abilities[0].replace(" (HA)", "");
                batchUpdates['ability'] = abilitySelect.value;
            }
            batchUpdates['ability-list'] = abilities.join(',');
        }
    }

    if (abilitySelect.value) {
        const abData = await fetchAbilityData(abilitySelect.value);
        if (abData) abilitySelect.title = abData.Effect || abData.Description || "No description found.";
    }

    // Refresh Moves (Safely trimming whitespace just in case)
    for (let move of currentMoves) {
        if (move.name) {
            const mData = await fetchMoveData(move.name.trim());
            if (mData) {
                // Update basic data, but DO NOT overwrite their selected Accuracy/Skill!
                move.type = mData.Type || "Normal";
                let rawCat = mData.Category || "Physical";
                if (rawCat === "Physical") move.cat = "Phys";
                else if (rawCat === "Special") move.cat = "Spec";
                else move.cat = "Supp";
                
                move.power = mData.Power || 0;
                move.desc = mData.Effect || mData.Description || "";
                
                const rawDmg = mData.Damage1 === "None" ? "" : (mData.Damage1 || "");
                const attrMapDmg: any = { "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins" };
                move.dmgStat = attrMapDmg[rawDmg] || rawDmg;
            }
        }
    }

    renderMoves();
    batchUpdates['moves-data'] = JSON.stringify(currentMoves);
    
    // SEND THE SINGLE SAVE BATCH!
    saveBatchDataToToken(batchUpdates); 
    
    btn.innerText = "✅ Done!";
    setTimeout(() => {
        btn.innerText = "🔄 Refresh Token Data";
        btn.disabled = false;
    }, 2000);
});

// --- RENDERING ---
function renderExtraSkills() {
    const tbody = document.getElementById('extra-skills-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentExtraCategories.forEach(cat => {
        const headTr = document.createElement('tr');
        headTr.style.backgroundColor = 'var(--primary)';
        headTr.style.color = 'white';
        headTr.innerHTML = buildExtraCategoryHeader(cat);
        tbody.appendChild(headTr);

        cat.skills.forEach(sk => {
            const tr = document.createElement('tr');
            tr.innerHTML = buildExtraSkillRow(cat.id, sk);
            tbody.appendChild(tr);
        });
    });

    document.querySelectorAll('.cat-name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const cat = currentExtraCategories.find(c => c.id === target.dataset.catid);
            if (cat) { cat.name = target.value; saveExtraSkillsToToken(currentExtraCategories); }
        });
    });

    document.querySelectorAll('.extra-skill-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const cat = currentExtraCategories.find(c => c.id === target.dataset.catid);
            if (cat) {
                const sk = cat.skills.find(s => s.id === target.dataset.skid);
                if (sk) { sk.name = target.value; saveExtraSkillsToToken(currentExtraCategories); renderMoves(); }
            }
        });
    });

    document.querySelectorAll('.extra-skill-base, .extra-skill-buff').forEach(input => {
        input.addEventListener('input', () => calculateStats(currentExtraCategories, currentMoves));
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const cat = currentExtraCategories.find(c => c.id === target.dataset.catid);
            if (cat) {
                const sk = cat.skills.find(s => s.id === target.dataset.skid);
                if (sk) {
                    if (target.classList.contains('extra-skill-base')) sk.base = parseInt(target.value) || 0;
                    if (target.classList.contains('extra-skill-buff')) sk.buff = parseInt(target.value) || 0;
                    saveExtraSkillsToToken(currentExtraCategories);
                }
            }
        });
    });

    document.querySelectorAll('.del-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm("Delete this custom skill category?")) {
                const id = (e.currentTarget as HTMLButtonElement).dataset.catid;
                currentExtraCategories = currentExtraCategories.filter(c => c.id !== id);
                renderExtraSkills(); renderMoves();
                saveExtraSkillsToToken(currentExtraCategories);
            }
        });
    });
    setupSpinners();
}

document.getElementById('add-cat-btn')?.addEventListener('click', () => {
    const catId = "cat_" + generateId();
    currentExtraCategories.push({
        id: catId, name: "EXTRA",
        skills: [
            { id: catId + "_1", name: "", base: 0, buff: 0 }, { id: catId + "_2", name: "", base: 0, buff: 0 },
            { id: catId + "_3", name: "", base: 0, buff: 0 }, { id: catId + "_4", name: "", base: 0, buff: 0 }
        ]
    });
    renderExtraSkills(); renderMoves();
    saveExtraSkillsToToken(currentExtraCategories);
});

function renderMoves() {
  const tbody = document.getElementById('moves-table-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  currentMoves.forEach((move, index) => {
    if (move.power === undefined) move.power = 0;
    if (move.dmgStat === undefined) move.dmgStat = "";

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #eee';
    if (index % 2 === 0) tr.style.backgroundColor = '#fafafa';
    
    tr.innerHTML = buildMoveRow(move, index, currentExtraCategories);
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.move-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const id = target.getAttribute('data-id')!;
      const field = target.getAttribute('data-field')! as keyof Move;
      const move = currentMoves.find(m => m.id === id);
      
      if (move) {
        if (field === 'power') move[field] = parseInt(target.value) || 0;
        else move[field] = target.value as never;

        if (field === 'type') {
            applyTypeStyle(target as HTMLElement, target.value);
        }
        
        if (field === 'name') {
            const mData = await fetchMoveData(target.value.trim());
            if (mData) {
                move.type = mData.Type || "Normal";
                let rawCat = mData.Category || "Physical";
                if (rawCat === "Physical") move.cat = "Phys";
                else if (rawCat === "Special") move.cat = "Spec";
                else move.cat = "Supp";
                
                move.power = mData.Power || 0;
                move.desc = mData.Effect || mData.Description || "";
                
                const rawDmg = mData.Damage1 === "None" ? "" : (mData.Damage1 || "");
                const attrMapDmg: any = { "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins" };
                move.dmgStat = attrMapDmg[rawDmg] || rawDmg;
                
                const attrMap: any = { "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins", "Tough": "tou", "Cool": "coo", "Beauty": "bea", "Cute": "cut", "Clever": "cle", "Will": "will" };
                move.attr = attrMap[mData.Accuracy1] || "str";
                move.skill = (mData.Accuracy2 || "brawl").toLowerCase();
                
                renderMoves(); 
            }
        }
        updateMoveDisplays(currentMoves);
        saveMovesToToken(currentMoves);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.confirm("Are you sure you want to delete this move?")) {
        const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
        currentMoves = currentMoves.filter(m => m.id !== id);
        renderMoves(); saveMovesToToken(currentMoves);
      }
    });
  });

  document.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-index')!);
      if (idx > 0) {
        const temp = currentMoves[idx];
        currentMoves[idx] = currentMoves[idx - 1];
        currentMoves[idx - 1] = temp;
        renderMoves(); saveMovesToToken(currentMoves);
      }
    });
  });

  document.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-index')!);
      if (idx < currentMoves.length - 1) {
        const temp = currentMoves[idx];
        currentMoves[idx] = currentMoves[idx + 1];
        currentMoves[idx + 1] = temp;
        renderMoves(); saveMovesToToken(currentMoves);
      }
    });
  });

  document.querySelectorAll('.acc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
      const move = currentMoves.find(m => m.id === id);
      if (move) rollAccuracy(move);
    });
  });

  document.querySelectorAll('.dmg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
      const move = currentMoves.find(m => m.id === id);
      if (move) rollDamage(move);
    });
  });

  setupSpinners();
  updateMoveDisplays(currentMoves);
}

document.getElementById('add-move-btn')?.addEventListener('click', () => {
  if (currentMoves.length >= 20) { alert("You've reached the max of 20 moves."); return; }
  currentMoves.push({ id: generateId(), name: '', attr: 'str', skill: 'brawl', type: '', cat: 'Phys', dmg: '', power: 0, dmgStat: '' });
  renderMoves();
  saveMovesToToken(currentMoves);
});

function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentInventory.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        if (index % 2 === 0) tr.style.backgroundColor = '#fafafa';
        tr.innerHTML = buildInventoryRow(item);
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.inv-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.getAttribute('data-id')!;
            const field = target.getAttribute('data-field')! as keyof InventoryItem;
            const item = currentInventory.find(i => i.id === id);
            if (item) {
                if (field === 'qty') item[field] = parseInt(target.value) || 0;
                else item[field] = target.value as never;
                saveInventoryToToken(currentInventory);
            }
        });
    });

    document.querySelectorAll('.del-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
            currentInventory = currentInventory.filter(i => i.id !== id);
            renderInventory(); saveInventoryToToken(currentInventory);
        });
    });
    setupSpinners();
}

document.getElementById('add-item-btn')?.addEventListener('click', () => {
    currentInventory.push({ id: generateId(), qty: 1, name: '', desc: '' });
    renderInventory(); saveInventoryToToken(currentInventory);
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
      saveDataToToken('actions-used', actions.toString());
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
  
  const attrMap: any = { "str": "str", "dex": "dex", "vit": "vit", "spe": "spe", "ins": "ins" };
  let scalingVal = move.dmgStat && attrMap[move.dmgStat] ? getDerivedVal(`${attrMap[move.dmgStat]}-total`) : 0;
  
  let stabBonus = 0; let stabTag = "";
  const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");
  if (move.type && (typingStr.includes(move.type) || isProtean)) {
      stabBonus = 1; stabTag = isProtean && !typingStr.includes(move.type) ? " (Protean STAB)" : " (STAB)";
  }

  const basePool = move.power + scalingVal + extraDice + stabBonus;
  const defStr = prompt(`Enter Target's ${move.cat === 'Phys' ? 'Defense' : 'Special Defense'} reduction (or 0):`, "0");
  if (defStr === null) return; 
  
  let finalPool = basePool - (parseInt(defStr) || 0) + (confirm("Was this a Critical Hit? (OK for Yes, Cancel for No)") ? 2 : 0);
  if (finalPool > 0) sendToDicePlus(`${finalPool}d6>3 # ${nickname}: ${move.name} Dmg${stabTag}`);
}

function rollGeneric(actionName: string, pool: number, incrementEvade = false, incrementClash = false, incrementAction = false) {
   const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
   const batchUpdates: Record<string, string> = {};
   
   if (incrementAction) {
      let a = getVal('actions-used');
      if (a < 5) {
         (document.getElementById('actions-used') as HTMLInputElement).value = (a+1).toString();
         batchUpdates['actions-used'] = (a+1).toString();
      }
   }
   if (incrementEvade) {
      let e = getVal('evasions-used');
      (document.getElementById('evasions-used') as HTMLInputElement).value = (e+1).toString();
      batchUpdates['evasions-used'] = (e+1).toString();
   }
   if (incrementClash) {
      let c = getVal('clashes-used');
      (document.getElementById('clashes-used') as HTMLInputElement).value = (c+1).toString();
      batchUpdates['clashes-used'] = (c+1).toString();
   }

   if (Object.keys(batchUpdates).length > 0) saveBatchDataToToken(batchUpdates);
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

document.getElementById('reset-round-btn')?.addEventListener('click', () => {
    (document.getElementById('actions-used') as HTMLInputElement).value = "0";
    (document.getElementById('evasions-used') as HTMLInputElement).value = "0";
    (document.getElementById('clashes-used') as HTMLInputElement).value = "0";
    saveBatchDataToToken({ 'actions-used': "0", 'evasions-used': "0", 'clashes-used': "0" });
});

// --- DATA INJECTION ---
async function loadDataFromToken(tokenId: string) {
  setLoading(true);
  const items = await OBR.scene.items.getItems([tokenId]);
  
  if (items.length > 0) {
    const token = items[0];
    const data = (token.metadata[METADATA_ID] as Record<string, string>) || {};
    setLastMetadataStr(JSON.stringify(data)); 

    const role = await OBR.player.getRole();
    const isNPC = data['is-npc'] === 'true';

    if (role === 'GM') {
        const gmTools = document.getElementById('gm-tools');
        if (gmTools) gmTools.style.display = 'block';
    } else if (role === 'PLAYER' && isNPC) {
        document.getElementById('app')!.style.display = 'none';
        document.getElementById('gm-lock-screen')!.style.display = 'block';
        setLoading(false); 
        return;
    } 
    
    document.getElementById('app')!.style.display = 'block';
    const lockScreen = document.getElementById('gm-lock-screen');
    if (lockScreen) lockScreen.style.display = 'none';
    
    document.querySelectorAll('input:not(.move-input):not(.inv-input):not(.cat-name-input):not(.extra-skill-name):not(.extra-skill-base):not(.extra-skill-buff):not(#is-npc), select:not(.move-input), textarea').forEach(element => {
      if (element.classList.contains('skill-label')) return;
      
      const id = element.id;
      const val = data[id];

      if (id === 'ability' && val) {
          const sel = element as HTMLSelectElement;
          sel.innerHTML = '';
          
          // Use the saved list of abilities if it exists!
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

          fetchAbilityData(val).then(abData => {
              if (abData) sel.title = abData.Effect || abData.Description || "No description found.";
          });
      }
      else if (element.tagName === 'SELECT') {
        const sel = element as HTMLSelectElement;
        if (val !== undefined) sel.value = val;
        else sel.value = sel.querySelector('option[selected]') ? sel.querySelector('option[selected]')!.getAttribute('value') || '' : '';
      } 
      else if (element.tagName === 'TEXTAREA') {
        const ta = element as HTMLTextAreaElement;
        ta.value = val !== undefined ? val : ta.defaultValue; 
      } 
      else {
        const inp = element as HTMLInputElement;
        if (id === 'species' && val && val.includes('http')) inp.value = val.split('/').pop()?.replace('.json', '') || val;
        else inp.value = val !== undefined ? val : inp.defaultValue; 

        // IF IT'S THE MAIN TYPING BOX, COLOR IT UPON LOAD!
        if (id === 'typing') applyTypeStyle(inp, inp.value);
      }
    });

    const npcCheck = document.getElementById('is-npc') as HTMLInputElement;
    if (npcCheck) npcCheck.checked = isNPC;
    
    const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
    if (nicknameInput) nicknameInput.value = data['nickname'] || token.name || "";

    if (data['sheet-type']) updateSheetTypeUI(data['sheet-type']);

    try { currentMoves = data['moves-data'] ? JSON.parse(data['moves-data']) : []; } catch(e) { currentMoves = []; }
    try { currentInventory = data['inv-data'] ? JSON.parse(data['inv-data']) : []; } catch(e) { currentInventory = []; }
    try { currentExtraCategories = data['extra-skills-data'] ? JSON.parse(data['extra-skills-data']) : []; } catch(e) { currentExtraCategories = []; }

    renderMoves();
    renderInventory();
    renderExtraSkills();
    calculateStats(currentExtraCategories, currentMoves);
  }
  setLoading(false); 
}

document.getElementById('is-npc')?.addEventListener('change', (e) => {
    saveDataToToken('is-npc', (e.target as HTMLInputElement).checked.toString());
});

document.querySelectorAll('input:not(.move-input):not(.inv-input):not(.cat-name-input):not(.extra-skill-name):not(.extra-skill-base):not(.extra-skill-buff):not(#is-npc), select:not(.move-input):not(#ability), textarea').forEach(element => {
  element.addEventListener('input', () => calculateStats(currentExtraCategories, currentMoves));
  element.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      saveDataToToken(target.id, target.value);
  });
});

// INITIALIZE
loadDatabaseLists();
setupSpinners();
calculateStats(currentExtraCategories, currentMoves);
setupOBR(loadDataFromToken);