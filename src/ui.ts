import type { Move, InventoryItem, ExtraCategory } from './types';
import { ALL_SKILLS } from './utils';

// --- POKEMON TYPE COLORS ---
export const TYPE_COLORS: Record<string, string> = {
    "Normal": "#A8A878", "Fire": "#F08030", "Water": "#6890F0",
    "Electric": "#F8D030", "Grass": "#78C850", "Ice": "#98D8D8",
    "Fighting": "#C03028", "Poison": "#A040A0", "Ground": "#E0C068",
    "Flying": "#A890F0", "Psychic": "#F85888", "Bug": "#A8B820",
    "Rock": "#B8A038", "Ghost": "#705898", "Dragon": "#7038F8",
    "Dark": "#705848", "Steel": "#B8B8D0", "Fairy": "#EE99AC"
};

export function getTypeStyle(typeStr: string): string {
    if (!typeStr) return `background: transparent;`;
    const types = typeStr.split('/').map(t => t.trim());
    if (types.length === 1 && TYPE_COLORS[types[0]]) {
        return `background: ${TYPE_COLORS[types[0]]}; color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.8); border-radius: 4px; text-align: center; font-weight: bold;`;
    } else if (types.length === 2 && TYPE_COLORS[types[0]] && TYPE_COLORS[types[1]]) {
        return `background: linear-gradient(90deg, ${TYPE_COLORS[types[0]]} 50%, ${TYPE_COLORS[types[1]]} 50%); color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.8); border-radius: 4px; text-align: center; font-weight: bold;`;
    }
    return `background: transparent;`;
}

export function applyTypeStyle(element: HTMLElement | null, typeStr: string) {
    if (!element) return;
    const types = typeStr ? typeStr.split('/').map(t => t.trim()) : [];
    if (types.length === 1 && TYPE_COLORS[types[0]]) {
        element.style.background = TYPE_COLORS[types[0]];
        element.style.color = 'white';
        element.style.textShadow = '1px 1px 1px rgba(0,0,0,0.8)';
        element.style.borderRadius = '4px';
        element.style.textAlign = 'center';
        element.style.fontWeight = 'bold';
    } else if (types.length === 2 && TYPE_COLORS[types[0]] && TYPE_COLORS[types[1]]) {
        element.style.background = `linear-gradient(90deg, ${TYPE_COLORS[types[0]]} 50%, ${TYPE_COLORS[types[1]]} 50%)`;
        element.style.color = 'white';
        element.style.textShadow = '1px 1px 1px rgba(0,0,0,0.8)';
        element.style.borderRadius = '4px';
        element.style.textAlign = 'center';
        element.style.fontWeight = 'bold';
    } else {
        element.style.background = 'transparent';
        element.style.color = '';
        element.style.textShadow = 'none';
        element.style.textAlign = 'left';
        element.style.fontWeight = 'normal';
    }
}
// ----------------------------

export function buildExtraCategoryHeader(cat: ExtraCategory): string {
    return `
        <th style="text-align: left; padding-left: 5px; padding-top: 5px;">
            <input type="text" class="cat-name-input" data-catid="${cat.id}" value="${cat.name}" style="width: 80px; background: transparent; border: none; color: white; font-weight: bold; font-family: inherit;" placeholder="CAT NAME">
        </th>
        <th></th><th></th>
        <th style="text-align: center;"><button type="button" class="del-cat-btn" data-catid="${cat.id}" style="background: transparent; border: none; color: white; cursor: pointer; font-weight: bold;" title="Delete Category">X</button></th>
    `;
}

export function buildExtraSkillRow(catId: string, sk: any): string {
    return `
        <td style="text-align: left; padding-left: 5px;"><input type="text" class="extra-skill-name" data-catid="${catId}" data-skid="${sk.id}" value="${sk.name}" style="width: 65px; border:none; background:transparent; font-weight:bold; font-family:inherit;" placeholder="Skill"></td>
        <td><input type="number" class="extra-skill-base spin-input" data-catid="${catId}" data-skid="${sk.id}" value="${sk.base}" id="${sk.id}-base"></td>
        <td><input type="number" class="extra-skill-buff spin-input" data-catid="${catId}" data-skid="${sk.id}" value="${sk.buff}" id="${sk.id}-buff"></td>
        <td style="font-weight: bold;" id="${sk.id}-total">${sk.base + sk.buff}</td>
    `;
}

export function buildMoveRow(move: Move, index: number, extraCategories: ExtraCategory[]): string {
    let skillOptions = ALL_SKILLS.map(s => {
        const customLabel = (document.getElementById(`label-${s}`) as HTMLInputElement)?.value || s.charAt(0).toUpperCase() + s.slice(1);
        return `<option value="${s}" ${move.skill === s ? 'selected' : ''}>${customLabel}</option>`;
    }).join('');

    extraCategories.forEach(cat => {
        cat.skills.forEach(sk => {
            skillOptions += `<option value="${sk.id}" ${move.skill === sk.id ? 'selected' : ''}>${sk.name || 'Unnamed Skill'}</option>`;
        });
    });

    // We clean the description here to ensure quotes don't break the HTML string!
    const cleanDesc = (move.desc || 'Enter move name to fetch data...').replace(/"/g, '&quot;');

    return `
        <td style="text-align: center; vertical-align: middle;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span class="acc-total-display" data-id="${move.id}" style="font-weight: bold; font-size: 0.9em; color: var(--dark); min-width: 1em;" title="Base Acc Dice">0</span>
            <button type="button" class="acc-btn btn-dark" data-id="${move.id}" style="padding: 2px 6px;" title="Roll Accuracy">🎯</button>
        </div>
        </td>
        <td style="vertical-align: middle;"><input type="text" list="move-list" class="move-input" data-field="name" data-id="${move.id}" value="${move.name}" title="${cleanDesc}" style="width: 90%; border:1px solid transparent; background:transparent;" placeholder="Move Name"></td>
        <td style="vertical-align: middle;">
        <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-start; padding-top: 4px;">
            <select class="move-input" data-field="attr" data-id="${move.id}" style="border:1px solid var(--border); background:white; padding: 1px;">
                <option value="str" ${move.attr === 'str' ? 'selected' : ''}>STR</option>
                <option value="dex" ${move.attr === 'dex' ? 'selected' : ''}>DEX</option>
                <option value="vit" ${move.attr === 'vit' ? 'selected' : ''}>VIT</option>
                <option value="spe" ${move.attr === 'spe' ? 'selected' : ''}>SPE</option>
                <option value="ins" ${move.attr === 'ins' ? 'selected' : ''}>INS</option>
                <option value="tou" ${move.attr === 'tou' ? 'selected' : ''}>TOU</option>
                <option value="coo" ${move.attr === 'coo' ? 'selected' : ''}>COO</option>
                <option value="bea" ${move.attr === 'bea' ? 'selected' : ''}>BEA</option>
                <option value="cut" ${move.attr === 'cut' ? 'selected' : ''}>CUT</option>
                <option value="cle" ${move.attr === 'cle' ? 'selected' : ''}>CLE</option>
                <option value="will" ${move.attr === 'will' ? 'selected' : ''}>WILL</option>
            </select>
            +
            <select class="move-input" data-field="skill" data-id="${move.id}" style="border:1px solid var(--border); background:white; padding: 1px;">
                ${skillOptions}
            </select>
        </div>
        </td>
        <td style="padding: 2px; vertical-align: middle;"><input type="text" class="move-input" data-field="type" data-id="${move.id}" value="${move.type}" style="width: 90%; border:none; ${getTypeStyle(move.type)}" placeholder="Type"></td>
        <td style="vertical-align: middle;">
        <select class="move-input" data-field="cat" data-id="${move.id}" style="border:none; background:transparent;">
            <option value="Phys" ${move.cat === 'Phys' ? 'selected' : ''}>Phys</option>
            <option value="Spec" ${move.cat === 'Spec' ? 'selected' : ''}>Spec</option>
            <option value="Supp" ${move.cat === 'Supp' ? 'selected' : ''}>Supp</option>
        </select>
        </td>
        <td style="vertical-align: middle;">
        <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-start; padding-top: 4px;">
            <input type="number" class="spin-input move-input" data-field="power" data-id="${move.id}" value="${move.power}" style="width: 30px; text-align: center; border:1px solid var(--border); padding: 1px;" placeholder="Pwr">
            +
            <select class="move-input" data-field="dmgStat" data-id="${move.id}" style="border:1px solid var(--border); background:white; padding: 1px;">
                <option value="" ${move.dmgStat === '' ? 'selected' : ''}>-</option>
                <option value="str" ${move.dmgStat === 'str' || move.dmgStat === 'Strength' ? 'selected' : ''}>STR</option>
                <option value="dex" ${move.dmgStat === 'dex' || move.dmgStat === 'Dexterity' ? 'selected' : ''}>DEX</option>
                <option value="vit" ${move.dmgStat === 'vit' || move.dmgStat === 'Vitality' ? 'selected' : ''}>VIT</option>
                <option value="spe" ${move.dmgStat === 'spe' || move.dmgStat === 'Special' ? 'selected' : ''}>SPE</option>
                <option value="ins" ${move.dmgStat === 'ins' || move.dmgStat === 'Insight' ? 'selected' : ''}>INS</option>
            </select>
        </div>
        </td>
        <td style="text-align: center; vertical-align: middle;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span class="dmg-total-display" data-id="${move.id}" style="font-weight: bold; font-size: 0.9em; color: var(--primary); min-width: 1em;" title="Base Dmg Dice">0</span>
            <button type="button" class="dmg-btn btn-red" data-id="${move.id}" style="padding: 2px 6px;" title="Roll Damage">💥</button>
        </div>
        </td>
        <td style="vertical-align: middle;">
        <div style="display: flex; flex-direction: column; gap: 2px; padding: 2px; align-items: center;">
            <button type="button" class="move-up-btn" data-index="${index}" style="cursor:pointer; background:#e0e0e0; border:1px solid var(--border); border-radius:2px; font-size: 0.7rem; padding: 0 4px;">▲</button>
            <button type="button" class="move-down-btn" data-index="${index}" style="cursor:pointer; background:#e0e0e0; border:1px solid var(--border); border-radius:2px; font-size: 0.7rem; padding: 0 4px;">▼</button>
        </div>
        </td>
        <td style="text-align: center; vertical-align: middle;">
        <button type="button" class="delete-btn btn-red" data-id="${move.id}" style="padding: 2px 6px;">X</button>
        </td>
    `;
}

export function buildInventoryRow(item: InventoryItem): string {
    return `
        <td style="text-align: center; padding: 2px; vertical-align: top; padding-top: 6px;">
        <div style="display: flex; justify-content: center;">
            <input type="number" class="inv-input spin-input" data-field="qty" data-id="${item.id}" value="${item.qty}">
        </div>
        </td>
        <td style="vertical-align: top; padding-top: 6px;">
            <input type="text" class="inv-input" data-field="name" data-id="${item.id}" value="${item.name}" style="width: 95%; border: none; background: transparent; font-family: inherit; outline: none;" placeholder="Item Name">
        </td>
        <td style="padding: 4px 2px;">
            <textarea class="inv-input" data-field="desc" data-id="${item.id}" rows="1" style="width: 95%; border: 1px solid var(--border); border-radius: 3px; background: transparent; font-family: inherit; resize: vertical; padding: 4px; box-sizing: border-box; outline: none;" placeholder="Effect / Notes...">${item.desc}</textarea>
        </td>
        <td style="text-align: center; vertical-align: top; padding-top: 6px;">
            <button type="button" class="del-item-btn btn-red" data-id="${item.id}" style="padding: 2px 6px;">X</button>
        </td>
    `;
}

export function setupSpinners() {
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

export function updateSheetTypeUI(val: string) {
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
}