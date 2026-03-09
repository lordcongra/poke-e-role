import './style.css';
import OBR from "@owlbear-rodeo/sdk";
import type { Move, InventoryItem, ExtraCategory, ExtraSkill, CustomInfo } from './@types/index';
import { ATTRIBUTE_MAPPING } from './@types/index';
import { ALL_SKILLS, getVal, getDerivedVal, generateId } from './utils';
import { calculateStats, updateMoveDisplays } from './math';
import { loadUrlLists, fetchPokemonData, fetchMoveData, fetchAbilityData } from './api';
import { buildMoveRow, buildInventoryRow, buildExtraCategoryHeader, buildExtraSkillRow, setupSpinners, updateSheetTypeUI, applyTypeStyle, buildCustomInfoRow, renderTypeMatchups } from './ui';
import { 
    METADATA_ID, setLoading, setLastMetadataStr, 
    sendToDicePlus, saveBatchDataToToken, saveMovesToToken, 
    saveInventoryToToken, saveExtraSkillsToToken, setupOBR 
} from './obr';

let currentMoves: Move[] = [];
let currentInventory: InventoryItem[] = [];
let currentExtraCategories: ExtraCategory[] = [];
let currentStatuses: string[] = ["Healthy"];
let currentCustomInfo: CustomInfo[] = [];

let currentTokenData: Record<string, any> = {};

function saveDataToToken(id: string, value: any) {
    saveBatchDataToToken({ [id]: value });
}

function syncDerivedStats() {
    const updates: Record<string, any> = {};
    let hasChanges = false;
    
    const checkAndAdd = (id: string, val: number) => {
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

    ['actions-used', 'evasions-used', 'clashes-used', 'hp-curr', 'will-curr', 'hp-base', 'will-base'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) checkAndAdd(id, parseFloat(el.value) || 0);
    });

    if (hasChanges) {
        saveBatchDataToToken(updates);
    }
}

function renderStatuses() {
    const container = document.getElementById('status-container');
    if (!container) return;
    container.innerHTML = '';
    
    const options = ["Healthy", "1st Degree Burn", "2nd Degree Burn", "3rd Degree Burn", "Badly Poisoned", "Confusion", "Disable", "Flinch", "Frozen Solid", "In Love", "Paralysis", "Poison", "Sleep"];

    currentStatuses.forEach((status, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '2px';

        const select = document.createElement('select');
        select.style.flex = '1';
        select.style.border = '1px solid var(--border)';
        select.style.fontSize = '0.75rem';
        
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.text = opt;
            if (opt === status) el.selected = true;
            select.appendChild(el);
        });

        select.addEventListener('change', (e) => {
            currentStatuses[index] = (e.target as HTMLSelectElement).value;
            saveDataToToken('status-list', JSON.stringify(currentStatuses));
        });

        wrapper.appendChild(select);

        if (index > 0) {
            const delBtn = document.createElement('button');
            delBtn.innerText = 'X';
            delBtn.className = 'action-button action-button--red';
            delBtn.style.padding = '0 4px';
            delBtn.onclick = () => {
                currentStatuses.splice(index, 1);
                renderStatuses();
                saveDataToToken('status-list', JSON.stringify(currentStatuses));
            };
            wrapper.appendChild(delBtn);
        }
        
        container.appendChild(wrapper);
    });
}

document.getElementById('add-status-btn')?.addEventListener('click', () => {
    currentStatuses.push("Healthy");
    renderStatuses();
    saveDataToToken('status-list', JSON.stringify(currentStatuses));
});

function renderCustomInfo() {
    const container = document.getElementById('custom-info-container');
    if (!container) return;
    container.innerHTML = '';

    currentCustomInfo.forEach(info => {
        buildCustomInfoRow(container, info);
    });

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.dataset.id;
            const field = target.dataset.field as keyof CustomInfo;
            const item = currentCustomInfo.find(i => i.id === id);
            if (item) {
                item[field] = target.value;
                saveDataToToken('custom-info-data', JSON.stringify(currentCustomInfo));
            }
        });
    });

    container.querySelectorAll('.del-info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLButtonElement).dataset.id;
            currentCustomInfo = currentCustomInfo.filter(i => i.id !== id);
            renderCustomInfo();
            saveDataToToken('custom-info-data', JSON.stringify(currentCustomInfo));
        });
    });
}

document.getElementById('add-custom-info-btn')?.addEventListener('click', () => {
    currentCustomInfo.push({ id: generateId(), label: 'New Field', value: '' });
    renderCustomInfo();
    saveDataToToken('custom-info-data', JSON.stringify(currentCustomInfo));
});


document.getElementById('species')?.addEventListener('change', async (e) => {
    const pokemonName = (e.target as HTMLInputElement).value;
    const pokemonData = await fetchPokemonData(pokemonName);
    if (!pokemonData) return;

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
        renderMoves();
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

    for (let move of currentMoves) {
        if (move.name) {
            const moveData = await fetchMoveData(move.name.trim());
            if (moveData) {
                move.type = String(moveData.Type || "Normal");
                let rawCat = String(moveData.Category || "Physical");
                if (rawCat === "Physical") move.cat = "Phys";
                else if (rawCat === "Special") move.cat = "Spec";
                else move.cat = "Supp";
                
                move.power = Number(moveData.Power) || 0;
                move.desc = String(moveData.Effect || moveData.Description || "");
                
                const rawDmg = String(moveData.Damage1 === "None" ? "" : (moveData.Damage1 || ""));
                move.dmgStat = ATTRIBUTE_MAPPING[rawDmg] || rawDmg;
            }
        }
    }

    renderMoves();
    batchUpdates['moves-data'] = JSON.stringify(currentMoves);
    Object.assign(currentTokenData, batchUpdates);
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
    
    currentExtraCategories.forEach((category: ExtraCategory) => {
        const headTr = document.createElement('tr');
        headTr.style.backgroundColor = 'var(--primary)';
        headTr.style.color = 'white';
        buildExtraCategoryHeader(headTr, category);
        tbody.appendChild(headTr);

        category.skills.forEach((skill: ExtraSkill) => {
            const tr = document.createElement('tr');
            buildExtraSkillRow(tr, category.id, skill);
            tbody.appendChild(tr);
        });
    });

    document.querySelectorAll('.cat-name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const category = currentExtraCategories.find((c: ExtraCategory) => c.id === target.dataset.catid);
            if (category) { category.name = target.value; saveExtraSkillsToToken(currentExtraCategories); }
        });
    });

    document.querySelectorAll('.extra-skill-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const category = currentExtraCategories.find((c: ExtraCategory) => c.id === target.dataset.catid);
            if (category) {
                const skill = category.skills.find((s: ExtraSkill) => s.id === target.dataset.skid);
                if (skill) { skill.name = target.value; saveExtraSkillsToToken(currentExtraCategories); renderMoves(); }
            }
        });
    });

    document.querySelectorAll('.extra-skill-base, .extra-skill-buff').forEach(input => {
        input.addEventListener('input', () => calculateStats(currentExtraCategories, currentMoves));
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const category = currentExtraCategories.find((c: ExtraCategory) => c.id === target.dataset.catid);
            if (category) {
                const skill = category.skills.find((s: ExtraSkill) => s.id === target.dataset.skid);
                if (skill) {
                    if (target.classList.contains('extra-skill-base')) skill.base = parseInt(target.value) || 0;
                    if (target.classList.contains('extra-skill-buff')) skill.buff = parseInt(target.value) || 0;
                    saveExtraSkillsToToken(currentExtraCategories);
                }
            }
            syncDerivedStats();
        });
    });

    document.querySelectorAll('.del-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm("Delete this custom skill category?")) {
                const id = (e.currentTarget as HTMLButtonElement).dataset.catid;
                currentExtraCategories = currentExtraCategories.filter((c: ExtraCategory) => c.id !== id);
                renderExtraSkills(); renderMoves();
                saveExtraSkillsToToken(currentExtraCategories);
            }
        });
    });
    setupSpinners();
}

document.getElementById('add-cat-btn')?.addEventListener('click', () => {
    const categoryId = "cat_" + generateId();
    currentExtraCategories.push({
        id: categoryId, name: "EXTRA",
        skills: [
            { id: categoryId + "_1", name: "", base: 0, buff: 0 }, { id: categoryId + "_2", name: "", base: 0, buff: 0 },
            { id: categoryId + "_3", name: "", base: 0, buff: 0 }, { id: categoryId + "_4", name: "", base: 0, buff: 0 }
        ]
    });
    renderExtraSkills(); renderMoves();
    saveExtraSkillsToToken(currentExtraCategories);
});

function renderMoves() {
  const tbody = document.getElementById('moves-table-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  currentMoves.forEach((move: Move, index: number) => {
    if (move.power === undefined) move.power = 0;
    if (move.dmgStat === undefined) move.dmgStat = "";

    const tr = document.createElement('tr');
    tr.className = 'data-table__row--dynamic'; 
    buildMoveRow(tr, move, index, currentExtraCategories);
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.move-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const id = target.getAttribute('data-id')!;
      const field = target.getAttribute('data-field')! as keyof Move;
      const move = currentMoves.find((m: Move) => m.id === id);
      
      if (move) {
        if (field === 'power') move[field] = parseInt(target.value) || 0;
        else move[field] = target.value as never;

        if (field === 'type') {
            applyTypeStyle(target as HTMLElement, target.value);
        }
        
        if (field === 'name') {
            const moveData = await fetchMoveData(target.value.trim());
            if (moveData) {
                move.type = String(moveData.Type || "Normal");
                let rawCat = String(moveData.Category || "Physical");
                if (rawCat === "Physical") move.cat = "Phys";
                else if (rawCat === "Special") move.cat = "Spec";
                else move.cat = "Supp";
                
                move.power = Number(moveData.Power) || 0;
                move.desc = String(moveData.Effect || moveData.Description || "");
                
                const rawDmg = String(moveData.Damage1 === "None" ? "" : (moveData.Damage1 || ""));
                move.dmgStat = ATTRIBUTE_MAPPING[rawDmg] || rawDmg;
                
                const accuracyOne = String(moveData.Accuracy1 || "");
                move.attr = ATTRIBUTE_MAPPING[accuracyOne] || "str";
                move.skill = String(moveData.Accuracy2 || "brawl").toLowerCase();
                
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
        currentMoves = currentMoves.filter((m: Move) => m.id !== id);
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
      const move = currentMoves.find((m: Move) => m.id === id);
      if (move) rollAccuracy(move);
    });
  });

  document.querySelectorAll('.dmg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
      const move = currentMoves.find((m: Move) => m.id === id);
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
    
    currentInventory.forEach((item: InventoryItem) => {
        const tr = document.createElement('tr');
        tr.className = 'data-table__row--dynamic'; 
        buildInventoryRow(tr, item);
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.inv-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.getAttribute('data-id')!;
            const field = target.getAttribute('data-field')! as keyof InventoryItem;
            const item = currentInventory.find((i: InventoryItem) => i.id === id);
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
            currentInventory = currentInventory.filter((i: InventoryItem) => i.id !== id);
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
      let e = getVal('evasions-used');
      (document.getElementById('evasions-used') as HTMLInputElement).value = (e+1).toString();
      batchUpdates['evasions-used'] = e + 1; 
   }
   if (incrementClash) {
      let c = getVal('clashes-used');
      (document.getElementById('clashes-used') as HTMLInputElement).value = (c+1).toString();
      batchUpdates['clashes-used'] = c + 1; 
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

document.getElementById('reset-round-btn')?.addEventListener('click', () => {
    (document.getElementById('actions-used') as HTMLInputElement).value = "0";
    (document.getElementById('evasions-used') as HTMLInputElement).value = "0";
    (document.getElementById('clashes-used') as HTMLInputElement).value = "0";
    const updates = { 'actions-used': 0, 'evasions-used': 0, 'clashes-used': 0 }; 
    Object.assign(currentTokenData, updates);
    saveBatchDataToToken(updates);
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

    renderMoves();
    renderInventory();
    renderExtraSkills();
    renderStatuses();
    renderCustomInfo();
    renderTypeMatchups(data['typing'] || ""); 
    
    if (Object.keys(initialUpdates).length > 0) {
        Object.assign(currentTokenData, initialUpdates);
        saveBatchDataToToken(initialUpdates);
    }

    calculateStats(currentExtraCategories, currentMoves);
    syncDerivedStats();
  }
  setLoading(false); 
}

const listenerInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.sheet-save');
listenerInputs.forEach(element => {
  // IGNORE LIST: Protects the API fetching system from getting overwritten by rapid auto-saves
  if (['ability', 'is-npc', 'species', 'typing'].includes(element.id)) return; 

  element.addEventListener('input', () => calculateStats(currentExtraCategories, currentMoves));
  
  element.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      
      let valToSave: any = target.value;
      if (target.type === 'number') {
          valToSave = parseFloat(target.value) || 0;
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
renderStatuses(); 
renderCustomInfo();
const initialTyping = (document.getElementById('typing') as HTMLInputElement)?.value || "";
renderTypeMatchups(initialTyping);
calculateStats(currentExtraCategories, currentMoves);
setupOBR(loadDataFromToken);