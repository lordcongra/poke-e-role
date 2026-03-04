import './style.css';
import OBR from "@owlbear-rodeo/sdk";

const MY_EXTENSION_ID = "pokerole-pmd-extension"; 
const GITHUB_TREE_URL = "https://api.github.com/repos/Pokerole-Software-Development/Pokerole-Data/git/trees/master?recursive=1";

let MOVES_DB: Record<string, string> = {};
let SPECIES_DB: Record<string, string> = {};
const ALL_SKILLS = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'magic'];

function setupSpinners() {
  document.querySelectorAll('input[type="number"].spin-input').forEach(input => {
    if (input.parentElement?.classList.contains('spin-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'spin-wrapper';
    input.parentNode?.insertBefore(wrapper, input);
    
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'spin-btn';
    minus.innerText = '-';
    minus.onclick = () => { 
        (input as HTMLInputElement).stepDown(); 
        input.dispatchEvent(new Event('input', { bubbles: true })); 
        input.dispatchEvent(new Event('change', { bubbles: true })); 
    };
    
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'spin-btn';
    plus.innerText = '+';
    plus.onclick = () => { 
        (input as HTMLInputElement).stepUp(); 
        input.dispatchEvent(new Event('input', { bubbles: true })); 
        input.dispatchEvent(new Event('change', { bubbles: true })); 
    };
    
    wrapper.appendChild(minus);
    wrapper.appendChild(input);
    wrapper.appendChild(plus);
  });
}

async function initDatabase() {
  const speciesInput = document.getElementById('species') as HTMLInputElement;
  if (!speciesInput) return;
  
  try {
    const response = await fetch(GITHUB_TREE_URL);
    const data = await response.json();

    if (data.message && data.message.includes("rate limit")) {
      speciesInput.placeholder = 'GitHub Rate Limit Exceeded';
      return;
    }

    const pokemonFiles = data.tree.filter((file: any) => 
      (file.path.includes("Version 3.0") || file.path.includes("v3.0")) && 
      (file.path.includes("/Pokemon/") || file.path.includes("/Pokedex/")) && 
      file.path.endsWith(".json")
    );

    const speciesDatalist = document.getElementById('species-list');
    let speciesHtml = '';
    pokemonFiles.forEach((file: any) => {
      const monName = file.path.split('/').pop().replace('.json', '');
      SPECIES_DB[monName] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
      speciesHtml += `<option value="${monName}"></option>`;
    });
    if (speciesDatalist) speciesDatalist.innerHTML = speciesHtml;

    const moveFiles = data.tree.filter((file: any) => 
      (file.path.includes("Version 3.0") || file.path.includes("v3.0")) && 
      file.path.includes("/Moves/") && 
      file.path.endsWith(".json")
    );

    const moveDatalist = document.getElementById('move-list');
    let datalistHtml = '';
    moveFiles.forEach((file: any) => {
      const moveName = file.path.split('/').pop().replace('.json', '');
      MOVES_DB[moveName.toLowerCase()] = `https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/${file.path}`;
      datalistHtml += `<option value="${moveName}"></option>`;
    });
    if (moveDatalist) moveDatalist.innerHTML = datalistHtml;

    speciesInput.addEventListener('change', async (e) => {
      const monName = (e.target as HTMLInputElement).value;
      const selectedUrl = SPECIES_DB[monName];
      if (!selectedUrl) return;

      try {
        const res = await fetch(selectedUrl);
        const monData = await res.json();
        
        const type1 = monData.Type1 || "Normal";
        const type2 = monData.Type2 || "";
        const typing = (type2 && type2 !== "None" && type2 !== "null") ? `${type1} / ${type2}` : type1;
        
        const hp = monData.BaseHP || (monData.BaseStats && monData.BaseStats.HP) || 4;
        const attrs = monData.Attributes || monData.BaseAttributes || monData;
        
        const str = attrs.Strength || 2;
        const dex = attrs.Dexterity || 2;
        const vit = attrs.Vitality || 2;
        const spe = attrs.Special || 2;
        const ins = attrs.Insight || 1;

        let abilityStr = "";
        if (monData.Ability1) {
            abilityStr = monData.Ability1;
            if (monData.Ability2 && monData.Ability2 !== "None" && monData.Ability2 !== "null") {
                abilityStr += ` / ${monData.Ability2}`;
            }
            if (monData.HiddenAbility && monData.HiddenAbility !== "None" && monData.HiddenAbility !== "null") {
                abilityStr += ` / ${monData.HiddenAbility} (HA)`;
            }
        } else if (Array.isArray(monData.Abilities)) {
            abilityStr = monData.Abilities.map((a: any) => typeof a === 'string' ? a : a.Name).join(" / ");
        } else if (typeof monData.Abilities === 'string') {
            abilityStr = monData.Abilities;
        }

        (document.getElementById('typing') as HTMLInputElement).value = typing;
        (document.getElementById('hp-base') as HTMLInputElement).value = hp.toString();
        (document.getElementById('str-base') as HTMLInputElement).value = str.toString();
        (document.getElementById('dex-base') as HTMLInputElement).value = dex.toString();
        (document.getElementById('vit-base') as HTMLInputElement).value = vit.toString();
        (document.getElementById('spe-base') as HTMLInputElement).value = spe.toString();
        (document.getElementById('ins-base') as HTMLInputElement).value = ins.toString();
        (document.getElementById('ability') as HTMLInputElement).value = abilityStr;

        const batchUpdates: Record<string, string> = {
            'species': monName, 
            'typing': typing,
            'hp-base': hp.toString(),
            'str-base': str.toString(),
            'dex-base': dex.toString(),
            'vit-base': vit.toString(),
            'spe-base': spe.toString(),
            'ins-base': ins.toString(),
            'ability': abilityStr
        };

        let shouldWipe = false;
        let hasStats = ALL_SKILLS.some(skill => getVal(`${skill}-base`) > 0 || getVal(`${skill}-buff`) > 0) || currentMoves.length > 0;
        
        if (hasStats) {
            shouldWipe = confirm("Warning: This token already has Skills/Moves setup.\n\nClick OK if you are loading a BRAND NEW Pokemon (Wipes Skills).\n\nClick CANCEL if you are just Mega-Evolving or changing forms (Keeps Skills).");
        } else {
            shouldWipe = true; 
        }

        if (shouldWipe) {
            ALL_SKILLS.forEach(skill => {
                const baseInput = document.getElementById(`${skill}-base`) as HTMLInputElement;
                const buffInput = document.getElementById(`${skill}-buff`) as HTMLInputElement;
                if(baseInput) { baseInput.value = "0"; batchUpdates[`${skill}-base`] = "0"; }
                if(buffInput) { buffInput.value = "0"; batchUpdates[`${skill}-buff`] = "0"; }
            });
            currentMoves = [];
            renderMoves();
            batchUpdates['moves-data'] = "[]";
        }

        calculateStats();
        saveBatchDataToToken(batchUpdates); 
        
      } catch(err) {
        console.error("Error reading Pokemon data:", err);
      }
    });

  } catch(err) {
    console.error("Error communicating with Github:", err);
    speciesInput.placeholder = 'Database Connection Failed';
  }
}

interface Move { id: string; name: string; attr: string; skill: string; type: string; cat: string; dmg: string; power: number; dmgStat: string; chanceDice: number; }
interface InventoryItem { id: string; qty: number; name: string; desc: string; }
interface ExtraSkill { id: string; name: string; base: number; buff: number; }
interface ExtraCategory { id: string; name: string; skills: ExtraSkill[]; }

let currentMoves: Move[] = [];
let currentInventory: InventoryItem[] = [];
let currentExtraCategories: ExtraCategory[] = [];

function getVal(id: string): number {
  const element = document.getElementById(id) as HTMLInputElement;
  return element && !isNaN(parseInt(element.value)) ? parseInt(element.value) : 0;
}

function setText(id: string, value: number | string) {
  const element = document.getElementById(id);
  if (element) element.innerText = value.toString();
}

function getDerivedVal(id: string): number {
  const element = document.getElementById(id);
  return element ? parseInt(element.innerText) || 0 : 0;
}

function calculateStats() {
  const str = getVal('str-base') + getVal('str-rank') + getVal('str-buff') - getVal('str-debuff');
  const dex = getVal('dex-base') + getVal('dex-rank') + getVal('dex-buff') - getVal('dex-debuff');
  const vit = getVal('vit-base') + getVal('vit-rank') + getVal('vit-buff') - getVal('vit-debuff');
  const spe = getVal('spe-base') + getVal('spe-rank') + getVal('spe-buff') - getVal('spe-debuff');
  const ins = getVal('ins-base') + getVal('ins-rank') + getVal('ins-buff') - getVal('ins-debuff');

  setText('str-total', str);
  setText('dex-total', dex);
  setText('vit-total', vit);
  setText('spe-total', spe);
  setText('ins-total', ins);

  const socials = ['tou', 'coo', 'bea', 'cut', 'cle'];
  socials.forEach(stat => {
    setText(`${stat}-total`, getVal(`${stat}-base`) + getVal(`${stat}-rank`) + getVal(`${stat}-buff`) - getVal(`${stat}-debuff`));
  });

  setText('hp-max-display', getVal('hp-base') + vit);
  setText('will-max-display', 3 + ins);
  setText('def-total', vit + getVal('def-buff') - getVal('def-debuff'));
  setText('spd-total', ins + getVal('spd-buff') - getVal('spd-debuff'));

  ALL_SKILLS.forEach(skill => {
    setText(`${skill}-total`, getVal(`${skill}-base`) + getVal(`${skill}-buff`));
  });

  currentExtraCategories.forEach(cat => {
      cat.skills.forEach(sk => {
          setText(`${sk.id}-total`, getVal(`${sk.id}-base`) + getVal(`${sk.id}-buff`));
      });
  });

  const alertSkill = getVal('alert-base') + getVal('alert-buff');
  const evasionSkill = getVal('evasion-base') + getVal('evasion-buff');
  const clashSkill = getVal('clash-base') + getVal('clash-buff');

  setText('init-total', dex + alertSkill);
  setText('evasion-derived', dex + evasionSkill);
  setText('clash-p-derived', str + clashSkill);
  setText('clash-s-derived', spe + clashSkill);
}

document.getElementById('sheet-type')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const speRow = document.getElementById('spe-row');
    const clashPRow = document.getElementById('clash-p-row');
    const clashSRow = document.getElementById('clash-s-row');
    const knowledgeHeader = document.getElementById('knowledge-header');

    if (val === 'trainer') {
        if(speRow) speRow.style.display = 'none';
        if(clashPRow) clashPRow.style.display = 'none';
        if(clashSRow) clashSRow.style.display = 'none';
        (document.getElementById('label-channel') as HTMLInputElement).value = "Throw";
        (document.getElementById('label-clash') as HTMLInputElement).value = "Weapon";
        (document.getElementById('label-charm') as HTMLInputElement).value = "Empathy";
        (document.getElementById('label-magic') as HTMLInputElement).value = "Science";
        if(knowledgeHeader) knowledgeHeader.innerText = "KNOWLEDGE";
    } else {
        if(speRow) speRow.style.display = '';
        if(clashPRow) clashPRow.style.display = '';
        if(clashSRow) clashSRow.style.display = '';
        (document.getElementById('label-channel') as HTMLInputElement).value = "Channel";
        (document.getElementById('label-clash') as HTMLInputElement).value = "Clash";
        (document.getElementById('label-charm') as HTMLInputElement).value = "Charm";
        (document.getElementById('label-magic') as HTMLInputElement).value = "Magic";
        if(knowledgeHeader) knowledgeHeader.innerText = "KNOWLEDGE (PMD)";
    }
    saveDataToToken('sheet-type', val);
    calculateStats();
});

function renderExtraSkills() {
    const tbody = document.getElementById('extra-skills-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentExtraCategories.forEach(cat => {
        const headTr = document.createElement('tr');
        headTr.style.backgroundColor = '#b92518';
        headTr.style.color = 'white';
        headTr.innerHTML = `
            <th style="text-align: left; padding-left: 5px; padding-top: 5px;">
                <input type="text" class="cat-name-input" data-catid="${cat.id}" value="${cat.name}" style="width: 80px; background: transparent; border: none; color: white; font-weight: bold; font-family: inherit;" placeholder="CAT NAME">
            </th>
            <th></th><th></th>
            <th style="text-align: center;"><button type="button" class="del-cat-btn" data-catid="${cat.id}" style="background: transparent; border: none; color: white; cursor: pointer; font-weight: bold;" title="Delete Category">X</button></th>
        `;
        tbody.appendChild(headTr);

        cat.skills.forEach(sk => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: left; padding-left: 5px;"><input type="text" class="extra-skill-name" data-catid="${cat.id}" data-skid="${sk.id}" value="${sk.name}" style="width: 65px; border:none; background:transparent; font-weight:bold; font-family:inherit;" placeholder="Skill"></td>
                <td><input type="number" class="extra-skill-base spin-input" data-catid="${cat.id}" data-skid="${sk.id}" value="${sk.base}" id="${sk.id}-base"></td>
                <td><input type="number" class="extra-skill-buff spin-input" data-catid="${cat.id}" data-skid="${sk.id}" value="${sk.buff}" id="${sk.id}-buff"></td>
                <td style="font-weight: bold;" id="${sk.id}-total">${sk.base + sk.buff}</td>
            `;
            tbody.appendChild(tr);
        });
    });

    document.querySelectorAll('.cat-name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const cat = currentExtraCategories.find(c => c.id === target.dataset.catid);
            if (cat) { cat.name = target.value; saveExtraSkillsToToken(); }
        });
    });

    document.querySelectorAll('.extra-skill-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const cat = currentExtraCategories.find(c => c.id === target.dataset.catid);
            if (cat) {
                const sk = cat.skills.find(s => s.id === target.dataset.skid);
                if (sk) { sk.name = target.value; saveExtraSkillsToToken(); renderMoves(); }
            }
        });
    });

    document.querySelectorAll('.extra-skill-base, .extra-skill-buff').forEach(input => {
        input.addEventListener('input', () => calculateStats());
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const cat = currentExtraCategories.find(c => c.id === target.dataset.catid);
            if (cat) {
                const sk = cat.skills.find(s => s.id === target.dataset.skid);
                if (sk) {
                    if (target.classList.contains('extra-skill-base')) sk.base = parseInt(target.value) || 0;
                    if (target.classList.contains('extra-skill-buff')) sk.buff = parseInt(target.value) || 0;
                    saveExtraSkillsToToken();
                }
            }
        });
    });

    document.querySelectorAll('.del-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm("Delete this custom skill category?")) {
                const id = (e.currentTarget as HTMLButtonElement).dataset.catid;
                currentExtraCategories = currentExtraCategories.filter(c => c.id !== id);
                renderExtraSkills();
                renderMoves();
                saveExtraSkillsToToken();
            }
        });
    });
    
    setupSpinners();
}

document.getElementById('add-cat-btn')?.addEventListener('click', () => {
    const catId = "cat_" + Date.now();
    currentExtraCategories.push({
        id: catId,
        name: "EXTRA",
        skills: [
            { id: catId + "_1", name: "", base: 0, buff: 0 },
            { id: catId + "_2", name: "", base: 0, buff: 0 },
            { id: catId + "_3", name: "", base: 0, buff: 0 },
            { id: catId + "_4", name: "", base: 0, buff: 0 }
        ]
    });
    renderExtraSkills();
    renderMoves();
    saveExtraSkillsToToken();
});

function renderMoves() {
  const tbody = document.getElementById('moves-table-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  currentMoves.forEach((move, index) => {
    if (move.power === undefined) move.power = 0;
    if (move.dmgStat === undefined) move.dmgStat = "";
    if (move.chanceDice === undefined) move.chanceDice = 0;

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #ccc';
    if (index % 2 === 0) tr.style.backgroundColor = '#fcfcfc';

    let skillOptions = ALL_SKILLS.map(s => {
      const customLabel = (document.getElementById(`label-${s}`) as HTMLInputElement)?.value || s.charAt(0).toUpperCase() + s.slice(1);
      return `<option value="${s}" ${move.skill === s ? 'selected' : ''}>${customLabel}</option>`;
    }).join('');

    currentExtraCategories.forEach(cat => {
        cat.skills.forEach(sk => {
            skillOptions += `<option value="${sk.id}" ${move.skill === sk.id ? 'selected' : ''}>${sk.name || 'Unnamed Skill'}</option>`;
        });
    });

    tr.innerHTML = `
      <td style="text-align: center;">
        <button type="button" class="acc-btn" data-id="${move.id}" style="cursor:pointer; background:#444; color:white; border:none; border-radius:3px; font-weight:bold; padding: 2px 6px;" title="Roll Accuracy">🎯</button>
      </td>
      <td><input type="text" list="move-list" class="move-input" data-field="name" data-id="${move.id}" value="${move.name}" style="width: 90%; border:1px solid transparent; background:transparent;" placeholder="Move Name"></td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-start; padding-top: 4px;">
            <select class="move-input" data-field="attr" data-id="${move.id}" style="border:1px solid #ccc; background:white; padding: 1px;">
            <option value="str" ${move.attr === 'str' ? 'selected' : ''}>STR</option>
            <option value="dex" ${move.attr === 'dex' ? 'selected' : ''}>DEX</option>
            <option value="vit" ${move.attr === 'vit' ? 'selected' : ''}>VIT</option>
            <option value="spe" ${move.attr === 'spe' ? 'selected' : ''}>SPE</option>
            <option value="ins" ${move.attr === 'ins' ? 'selected' : ''}>INS</option>
            </select>
            +
            <select class="move-input" data-field="skill" data-id="${move.id}" style="border:1px solid #ccc; background:white; padding: 1px;">
            ${skillOptions}
            </select>
        </div>
      </td>
      <td><input type="text" class="move-input" data-field="type" data-id="${move.id}" value="${move.type}" style="width: 80%; border:none; background:transparent;" placeholder="Type"></td>
      <td>
        <select class="move-input" data-field="cat" data-id="${move.id}" style="border:none; background:transparent;">
          <option value="Phys" ${move.cat === 'Phys' ? 'selected' : ''}>Phys</option>
          <option value="Spec" ${move.cat === 'Spec' ? 'selected' : ''}>Spec</option>
          <option value="Supp" ${move.cat === 'Supp' ? 'selected' : ''}>Supp</option>
        </select>
      </td>
      <td><input type="text" class="move-input" data-field="dmg" data-id="${move.id}" value="${move.dmg}" style="width: 80%; border:none; background:transparent;" placeholder="Dmg"></td>
      <td style="text-align: center;">
        <button type="button" class="dmg-btn" data-id="${move.id}" style="cursor:pointer; background:#b92518; color:white; border:none; border-radius:3px; font-weight:bold; padding: 2px 6px;" title="Roll Damage">💥</button>
      </td>
      <td>
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; padding-top: 4px;">
            <input type="number" class="spin-input move-input" data-field="chanceDice" data-id="${move.id}" value="${move.chanceDice}" min="0" placeholder="🎲">
            <button type="button" class="chance-btn" data-id="${move.id}" style="cursor:pointer; background:#555; color:white; border:none; border-radius:3px; font-weight:bold; padding: 2px 6px;" title="Roll Chance Dice">🎲</button>
        </div>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 2px; padding: 2px; align-items: center;">
            <button type="button" class="move-up-btn" data-index="${index}" style="cursor:pointer; background:#e0e0e0; border:1px solid #ccc; border-radius:2px; font-size: 0.7rem; padding: 0 4px;">▲</button>
            <button type="button" class="move-down-btn" data-index="${index}" style="cursor:pointer; background:#e0e0e0; border:1px solid #ccc; border-radius:2px; font-size: 0.7rem; padding: 0 4px;">▼</button>
        </div>
      </td>
      <td style="text-align: center;">
        <button type="button" class="delete-btn" data-id="${move.id}" style="cursor:pointer; background:#b92518; color:white; border:none; border-radius:3px; font-weight:bold; padding: 2px 6px;">X</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.move-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const id = target.getAttribute('data-id')!;
      const field = target.getAttribute('data-field')! as keyof Move;
      const move = currentMoves.find(m => m.id === id);
      
      if (move) {
        if (field === 'chanceDice') move[field] = parseInt(target.value) || 0;
        else move[field] = target.value as never;
        
        if (field === 'name') {
            const rawUrl = MOVES_DB[target.value.toLowerCase()];
            if (rawUrl) {
                try {
                    const res = await fetch(rawUrl);
                    const mData = await res.json();
                    
                    move.type = mData.Type || "Normal";
                    let rawCat = mData.Category || "Physical";
                    if (rawCat === "Physical") move.cat = "Phys";
                    else if (rawCat === "Special") move.cat = "Spec";
                    else move.cat = "Supp";
                    
                    move.power = mData.Power || 0;
                    move.dmgStat = mData.Damage1 === "None" ? "" : (mData.Damage1 || "");
                    
                    const shortStatMap: any = { "Strength": "STR", "Dexterity": "DEX", "Vitality": "VIT", "Special": "SPE", "Insight": "INS" };
                    let uiStat = shortStatMap[move.dmgStat] || move.dmgStat;
                    move.dmg = move.power + (uiStat ? ` + ${uiStat}` : "");
                    
                    const attrMap: any = { "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins" };
                    move.attr = attrMap[mData.Accuracy1] || "str";
                    move.skill = (mData.Accuracy2 || "brawl").toLowerCase();
                    
                    renderMoves(); 
                } catch(err) { console.error("Could not fetch specific move stats"); }
            }
        }
        saveMovesToToken();
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.confirm("Are you sure you want to delete this move?")) {
        const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
        currentMoves = currentMoves.filter(m => m.id !== id);
        renderMoves();
        saveMovesToToken();
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
        renderMoves();
        saveMovesToToken();
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
        renderMoves();
        saveMovesToToken();
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

  document.querySelectorAll('.chance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
      const move = currentMoves.find(m => m.id === id);
      if (move) rollChance(move);
    });
  });

  setupSpinners();
}

function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentInventory.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #ccc';
        if (index % 2 === 0) tr.style.backgroundColor = '#fcfcfc';
        
        tr.innerHTML = `
          <td style="text-align: center; padding: 2px;">
            <div style="display: flex; justify-content: center;">
                <input type="number" class="inv-input spin-input" data-field="qty" data-id="${item.id}" value="${item.qty}">
            </div>
          </td>
          <td><input type="text" class="inv-input" data-field="name" data-id="${item.id}" value="${item.name}" style="width: 95%; border: none; background: transparent; font-family: inherit;" placeholder="Item Name"></td>
          <td><input type="text" class="inv-input" data-field="desc" data-id="${item.id}" value="${item.desc}" style="width: 95%; border: none; background: transparent; font-family: inherit;" placeholder="Effect..."></td>
          <td style="text-align: center;"><button type="button" class="del-item-btn" data-id="${item.id}" style="cursor:pointer; background:#b92518; color:white; border:none; border-radius:3px; font-weight:bold; padding: 2px 6px;">X</button></td>
        `;
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
                saveInventoryToToken();
            }
        });
    });

    document.querySelectorAll('.del-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
            currentInventory = currentInventory.filter(i => i.id !== id);
            renderInventory();
            saveInventoryToToken();
        });
    });

    setupSpinners();
}

document.getElementById('add-item-btn')?.addEventListener('click', () => {
    currentInventory.push({ id: Date.now().toString(), qty: 1, name: '', desc: '' });
    renderInventory();
    saveInventoryToToken();
});

// --- COMBAT ROLL LOGIC & DICE+ INTEGRATION ---
async function sendToDicePlus(notation: string, rollType: string = "roll") {
    if (!notation) return;

    try {
        const rollId = `${rollType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const playerId = await OBR.player.getId();
        const playerName = await OBR.player.getName();

        const targetSelect = document.getElementById('roll-target') as HTMLSelectElement;
        const targetVisibility = targetSelect ? targetSelect.value : 'everyone';

        await OBR.broadcast.sendMessage("dice-plus/roll-request", {
            rollId: rollId,
            playerId: playerId,
            playerName: playerName,
            rollTarget: targetVisibility, 
            diceNotation: notation,
            showResults: true, 
            timestamp: Date.now(),
            source: MY_EXTENSION_ID 
        }, { destination: 'ALL' });
        
    } catch (e) {
        console.error("Dice+ Error:", e);
    }
}

document.getElementById('roll-init-btn')?.addEventListener('click', async () => {
    const initBonus = getDerivedVal('init-total');
    const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
    
    const notation = initBonus > 0 ? `1d6+${initBonus}` : `1d6`;
    OBR.notification.show(`🎲 ${nickname} rolled Initiative!`);
    sendToDicePlus(notation, "init"); 
});

function rollAccuracy(move: Move) {
  const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
  let actions = getVal('actions-used');
  const requiredSuccesses = actions + 1;
  
  const extraDice = getVal('global-acc-mod'); 
  const attrTotal = getDerivedVal(`${move.attr}-total`);
  const skillTotal = getDerivedVal(`${move.skill}-total`);
  const dicePool = attrTotal + skillTotal + extraDice;
  
  if (actions < 5) {
      actions++;
      (document.getElementById('actions-used') as HTMLInputElement).value = actions.toString();
      saveDataToToken('actions-used', actions.toString());
  }

  if (dicePool > 0) {
      sendToDicePlus(`${dicePool}d6>3 # ${nickname} ${move.name} Acc (Needs ${requiredSuccesses})`);
  }
}

function rollDamage(move: Move) {
  if (move.cat === "Supp") {
    alert(`${move.name} is a Support move (No Damage).`);
    return;
  }

  const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
  const typingStr = (document.getElementById('typing') as HTMLInputElement).value || "";
  const abilityStr = (document.getElementById('ability') as HTMLInputElement).value || ""; 
  
  const extraDice = getVal('global-dmg-mod'); 
  const attrMap: any = { "str": "str", "dex": "dex", "vit": "vit", "spe": "spe", "ins": "ins", "Strength": "str", "Dexterity": "dex", "Vitality": "vit", "Special": "spe", "Insight": "ins" };
  let scalingVal = 0;
  if (move.dmgStat && attrMap[move.dmgStat]) {
      scalingVal = getDerivedVal(`${attrMap[move.dmgStat]}-total`);
  }
  
  let stabBonus = 0;
  let stabTag = "";
  const isProtean = abilityStr.toLowerCase().includes("protean") || abilityStr.toLowerCase().includes("libero");

  if (move.type && (typingStr.includes(move.type) || isProtean)) {
      stabBonus = 1;
      stabTag = isProtean && !typingStr.includes(move.type) ? " (Protean STAB)" : " (STAB)";
  }

  const basePool = move.power + scalingVal + extraDice + stabBonus;

  const defStr = prompt(`Enter Target's ${move.cat === 'Phys' ? 'Defense' : 'Special Defense'} reduction (or 0):`, "0");
  if (defStr === null) return; 
  const defReduction = parseInt(defStr) || 0;

  const isCrit = confirm("Was this a Critical Hit? (OK for Yes, Cancel for No)");
  let finalPool = basePool - defReduction + (isCrit ? 2 : 0);
  if (finalPool < 0) finalPool = 0;

  if (finalPool > 0) {
      sendToDicePlus(`${finalPool}d6>3 # ${nickname} ${move.name} Dmg${stabTag}`);
  }
}

function rollChance(move: Move) {
    if (move.chanceDice <= 0) return;
    const nickname = (document.getElementById('nickname') as HTMLInputElement).value || "Someone";
    sendToDicePlus(`${move.chanceDice}d6>5 # ${nickname} ${move.name} Chance`, "chance"); 
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

   if (Object.keys(batchUpdates).length > 0) {
       saveBatchDataToToken(batchUpdates);
   }

   if (pool > 0) {
       sendToDicePlus(`${pool}d6>3 # ${nickname} ${actionName}`);
   }
}

document.getElementById('roll-evade-btn')?.addEventListener('click', () => {
  const pool = getDerivedVal('dex-total') + getDerivedVal('evasion-total');
  rollGeneric("Evasion", pool, true, false, true); 
});

document.getElementById('roll-clash-btn')?.addEventListener('click', () => {
  const isSpec = confirm("Is this a Special Clash? (Cancel for Physical)");
  const attr = isSpec ? getDerivedVal('spe-total') : getDerivedVal('str-total');
  const pool = attr + getDerivedVal('clash-total');
  rollGeneric(isSpec ? "Special Clash" : "Physical Clash", pool, false, true, true); 
});

document.getElementById('roll-maneuver-btn')?.addEventListener('click', () => {
   const val = (document.getElementById('maneuver-select') as HTMLSelectElement).value;
   if (val === 'none') return;
   
   let pool = 0; let name = "";
   if (val === 'ambush') { pool = getDerivedVal('dex-total') + getDerivedVal('stealth-total'); name = "Ambush"; }
   else if (val === 'cover') { pool = 3 + getDerivedVal('ins-total'); name = "Cover an Ally"; }
   else if (val === 'grapple') { pool = getDerivedVal('str-total') + getDerivedVal('brawl-total'); name = "Grapple"; }
   else if (val === 'run') { pool = getDerivedVal('dex-total') + getDerivedVal('athletic-total'); name = "Run Away"; }
   else if (val === 'stabilize') { pool = getDerivedVal('cle-total') + getDerivedVal('medicine-total'); name = "Stabilize Ally"; }
   else if (val === 'struggle') { pool = getDerivedVal('dex-total') + getDerivedVal('brawl-total'); name = "Struggle (Accuracy)"; }
   
   rollGeneric(name, pool, false, false, true); 
});

document.getElementById('reset-round-btn')?.addEventListener('click', () => {
    (document.getElementById('actions-used') as HTMLInputElement).value = "0";
    (document.getElementById('evasions-used') as HTMLInputElement).value = "0";
    (document.getElementById('clashes-used') as HTMLInputElement).value = "0";
    
    saveBatchDataToToken({
        'actions-used': "0",
        'evasions-used': "0",
        'clashes-used': "0"
    });
});

document.getElementById('add-move-btn')?.addEventListener('click', () => {
  if (currentMoves.length >= 20) { alert("You've reached the max of 20 moves."); return; }
  currentMoves.push({ id: Date.now().toString(), name: '', attr: 'str', skill: 'brawl', type: '', cat: 'Phys', dmg: '', power: 0, dmgStat: '', chanceDice: 0 });
  renderMoves();
  saveMovesToToken();
});

// --- OWLBEAR MEMORY SYSTEM ---
const METADATA_ID = "pokerole-extension/stats";
let currentTokenId: string | null = null;

async function loadDataFromToken(tokenId: string) {
  const items = await OBR.scene.items.getItems([tokenId]);
  if (items.length > 0) {
    const token = items[0];
    const data = (token.metadata[METADATA_ID] as Record<string, string>) || {};

    const role = await OBR.player.getRole();
    const isNPC = data['is-npc'] === 'true';

    if (role === 'GM') {
        const gmTools = document.getElementById('gm-tools');
        if (gmTools) gmTools.style.display = 'block';
    } else if (role === 'PLAYER' && isNPC) {
        document.getElementById('app')!.style.display = 'none';
        document.getElementById('gm-lock-screen')!.style.display = 'block';
        return;
    } 
    
    document.getElementById('app')!.style.display = 'block';
    const lockScreen = document.getElementById('gm-lock-screen');
    if (lockScreen) lockScreen.style.display = 'none';
    
    document.querySelectorAll('input:not(.move-input):not(.inv-input):not(.cat-name-input):not(.extra-skill-name):not(.extra-skill-base):not(.extra-skill-buff):not(#is-npc), select:not(.move-input), textarea').forEach(element => {
      if (element.classList.contains('skill-label')) return;

      if (element.tagName === 'SELECT') {
        const sel = element as HTMLSelectElement;
        sel.value = sel.querySelector('option[selected]') ? sel.querySelector('option[selected]')!.getAttribute('value') || '' : '';
      } else if (element.tagName === 'TEXTAREA') {
        const ta = element as HTMLTextAreaElement;
        ta.value = ta.defaultValue; 
      } else {
        const inp = element as HTMLInputElement;
        inp.value = inp.defaultValue; 
      }
    });

    const npcCheck = document.getElementById('is-npc') as HTMLInputElement;
    if (npcCheck) npcCheck.checked = isNPC;

    Object.keys(data).forEach(id => {
      if (id === 'moves-data' || id === 'inv-data' || id === 'extra-skills-data' || id === 'is-npc') return; 
      const input = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (input) {
          let val = data[id];
          if (id === 'species' && val && val.includes('http')) {
              val = val.split('/').pop()?.replace('.json', '') || val;
          }
          input.value = val;

          if (id === 'sheet-type') {
              input.dispatchEvent(new Event('change'));
          }
      }
    });

    const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
    if (nicknameInput) {
        if (data['nickname']) {
            nicknameInput.value = data['nickname'];
        } else if (token.name) {
            nicknameInput.value = token.name;
        } else {
            nicknameInput.value = "";
        }
    }

    if (data['moves-data']) {
      try { currentMoves = JSON.parse(data['moves-data']); } 
      catch (e) { currentMoves = []; }
    } else { currentMoves = []; }
    
    if (data['inv-data']) {
      try { currentInventory = JSON.parse(data['inv-data']); }
      catch (e) { currentInventory = []; }
    } else { currentInventory = []; }

    if (data['extra-skills-data']) {
      try { currentExtraCategories = JSON.parse(data['extra-skills-data']); }
      catch (e) { currentExtraCategories = []; }
    } else { currentExtraCategories = []; }

    renderMoves();
    renderInventory();
    renderExtraSkills();
    calculateStats();
  }
}

async function saveBatchDataToToken(updates: Record<string, string>) {
  if (!currentTokenId) return; 

  const hpCurr = getVal('hp-curr');
  const hpMax = getDerivedVal('hp-max-display');
  const willCurr = getVal('will-curr');
  const willMax = getDerivedVal('will-max-display');
  const actions = getVal('actions-used');
  const def = getDerivedVal('def-total');
  const spdef = getDerivedVal('spd-total');
  const evade = getVal('evasions-used') > 0;
  const clash = getVal('clashes-used') > 0;

  await OBR.scene.items.updateItems([currentTokenId], (items) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      const meta = item.metadata[METADATA_ID] as Record<string, string>;
      for (const [key, value] of Object.entries(updates)) {
          meta[key] = value;
      }

      let trackers = item.metadata["com.owl-trackers/trackers"] as any[];
      
      if (!trackers || !Array.isArray(trackers) || trackers.length === 0) {
          trackers = [
              { id: Date.now() + "-1", variant: "value-max", color: 6, value: willCurr, max: willMax, name: "Will" },
              { id: Date.now() + "-2", variant: "value-max", color: 2, value: hpCurr, max: hpMax, name: "HP" },
              { id: Date.now() + "-3", variant: "counter", color: 6, inlineMath: false, value: actions, name: "Actions" },
              { id: Date.now() + "-4", variant: "counter", color: 5, inlineMath: false, value: def, name: "DEF" },
              { id: Date.now() + "-5", variant: "counter", color: 1, inlineMath: false, value: spdef, name: "SP DEF" },
              { id: Date.now() + "-6", variant: "checkbox", color: 4, checked: evade, name: "Evade" },
              { id: Date.now() + "-7", variant: "checkbox", color: 3, checked: clash, name: "Clash" }
          ];
      } else {
          trackers.forEach(t => {
              if (t.name === 'HP') { t.value = hpCurr; t.max = hpMax; }
              if (t.name === 'Will') { t.value = willCurr; t.max = willMax; }
              if (t.name === 'Actions') { t.value = actions; }
              if (t.name === 'DEF') { t.value = def; }
              if (t.name === 'SP DEF') { t.value = spdef; }
              if (t.name === 'Evade') { t.checked = evade; }
              if (t.name === 'Clash') { t.checked = clash; }
          });
      }
      item.metadata["com.owl-trackers/trackers"] = trackers;
    }
  });
}

function saveDataToToken(id: string, value: string) {
    saveBatchDataToToken({ [id]: value });
}

async function saveMovesToToken() {
  if (!currentTokenId) return;
  await OBR.scene.items.updateItems([currentTokenId], (items) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, string>)['moves-data'] = JSON.stringify(currentMoves);
    }
  });
}

async function saveInventoryToToken() {
  if (!currentTokenId) return;
  await OBR.scene.items.updateItems([currentTokenId], (items) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, string>)['inv-data'] = JSON.stringify(currentInventory);
    }
  });
}

async function saveExtraSkillsToToken() {
  if (!currentTokenId) return;
  await OBR.scene.items.updateItems([currentTokenId], (items) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, string>)['extra-skills-data'] = JSON.stringify(currentExtraCategories);
    }
  });
}

OBR.onReady(async () => {
  const selected = await OBR.player.getSelection();
  if (selected && selected.length > 0) {
    currentTokenId = selected[0];
    loadDataFromToken(currentTokenId);
  }

  OBR.player.onChange(async (player) => {
    if (player.selection && player.selection.length > 0) {
      if (currentTokenId !== player.selection[0]) {
        currentTokenId = player.selection[0];
        loadDataFromToken(currentTokenId);
      }
    }
  });

  OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-result`, async (event) => {
      const data = event.data as any;
      if (data.rollId && data.rollId.startsWith("init_")) {
          const total = data.result.totalValue;
          
          const tiebreaker = Math.floor(Math.random() * 6) + 1;
          const finalInit = total + (tiebreaker / 10); 
          
          if (currentTokenId) {
              await OBR.scene.items.updateItems([currentTokenId], (items) => {
                  for (let item of items) {
                      const existing = (item.metadata["com.pretty-initiative/metadata"] as any) || {};
                      item.metadata["com.pretty-initiative/metadata"] = {
                          ...existing,
                          count: finalInit.toString(),
                          active: existing.active !== undefined ? existing.active : false,
                          group: existing.group !== undefined ? existing.group : 1
                      };
                  }
              });
          }
      }
  });

  OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-error`, async (event) => {
      const data = event.data as any;
      OBR.notification.show(`Dice+ Error: ${data.error || 'Unknown syntax error.'}`);
  });
});

document.getElementById('is-npc')?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    saveDataToToken('is-npc', target.checked.toString());
});

document.querySelectorAll('input:not(.move-input):not(.inv-input):not(.cat-name-input):not(.extra-skill-name):not(.extra-skill-base):not(.extra-skill-buff):not(#is-npc), select:not(.move-input), textarea').forEach(element => {
  element.addEventListener('input', () => {
    calculateStats(); 
  });
  element.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    saveDataToToken(target.id, target.value);
  });
});

// INITIALIZE
initDatabase();
setupSpinners();
calculateStats();
renderMoves();