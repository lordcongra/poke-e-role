import type { Move, InventoryItem, ExtraCategory, ExtraSkill } from './@types/index';
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
    const types = typeStr.split('/').map((t: string) => t.trim());
    if (types.length === 1 && TYPE_COLORS[types[0]]) {
        return `background: ${TYPE_COLORS[types[0]]}; color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.8); border-radius: 4px; text-align: center; font-weight: bold;`;
    } else if (types.length === 2 && TYPE_COLORS[types[0]] && TYPE_COLORS[types[1]]) {
        return `background: linear-gradient(90deg, ${TYPE_COLORS[types[0]]} 50%, ${TYPE_COLORS[types[1]]} 50%); color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.8); border-radius: 4px; text-align: center; font-weight: bold;`;
    }
    return `background: transparent;`;
}

export function applyTypeStyle(element: HTMLElement | null, typeStr: string) {
    if (!element) return;
    const types = typeStr ? typeStr.split('/').map((t: string) => t.trim()) : [];
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

// --- SUB-COMPONENTS FOR MOVES ---
function buildAttrSelect(move: Move): string {
    const attrs = ['str', 'dex', 'vit', 'spe', 'ins', 'tou', 'coo', 'bea', 'cut', 'cle', 'will'];
    const options = attrs.map(a => `<option value="${a}" ${move.attr === a ? 'selected' : ''}>${a.toUpperCase()}</option>`).join('');
    return `<select class="move-input stat-select" data-field="attr" data-id="${move.id}">${options}</select>`;
}

function buildSkillSelect(move: Move, extraCategories: ExtraCategory[]): string {
    let options = ALL_SKILLS.map((s: string) => {
        const customLabel = (document.getElementById(`label-${s}`) as HTMLInputElement)?.value || s.charAt(0).toUpperCase() + s.slice(1);
        return `<option value="${s}" ${move.skill === s ? 'selected' : ''}>${customLabel}</option>`;
    }).join('');

    extraCategories.forEach((category: ExtraCategory) => {
        category.skills.forEach((skill: ExtraSkill) => {
            options += `<option value="${skill.id}" ${move.skill === skill.id ? 'selected' : ''}>${skill.name || 'Unnamed'}</option>`;
        });
    });
    return `<select class="move-input stat-select" data-field="skill" data-id="${move.id}">${options}</select>`;
}

function buildDmgStatSelect(move: Move): string {
    const attrs = [
        { val: "", label: "-" }, { val: "str", label: "STR" }, { val: "dex", label: "DEX" }, 
        { val: "vit", label: "VIT" }, { val: "spe", label: "SPE" }, { val: "ins", label: "INS" }
    ];
    const options = attrs.map(a => `<option value="${a.val}" ${(move.dmgStat === a.val || move.dmgStat?.toLowerCase().startsWith(a.val)) ? 'selected' : ''}>${a.label}</option>`).join('');
    return `<select class="move-input stat-select" data-field="dmgStat" data-id="${move.id}">${options}</select>`;
}

// --- ROW GENERATORS ---
export function buildExtraCategoryHeader(category: ExtraCategory): string {
    return `
        <th class="table-cell-top-left">
            <input type="text" class="cat-name-input input-transparent-white" data-catid="${category.id}" value="${category.name}" placeholder="CAT NAME">
        </th>
        <th></th><th></th>
        <th class="table-cell-middle">
            <button type="button" class="del-cat-btn btn-transparent-white" data-catid="${category.id}" title="Delete Category">X</button>
        </th>
    `;
}

export function buildExtraSkillRow(categoryId: string, skill: ExtraSkill): string {
    return `
        <td class="table-cell-middle-left" style="padding-left: 5px;">
            <input type="text" class="extra-skill-name input-transparent-bold" data-catid="${categoryId}" data-skid="${skill.id}" value="${skill.name}" placeholder="Skill">
        </td>
        <td><input type="number" class="extra-skill-base spin-input" data-catid="${categoryId}" data-skid="${skill.id}" value="${skill.base}" id="${skill.id}-base"></td>
        <td><input type="number" class="extra-skill-buff spin-input" data-catid="${categoryId}" data-skid="${skill.id}" value="${skill.buff}" id="${skill.id}-buff"></td>
        <td style="font-weight: bold;" id="${skill.id}-total">${skill.base + skill.buff}</td>
    `;
}

export function buildMoveRow(move: Move, index: number, extraCategories: ExtraCategory[]): string {
    const cleanDesc = (move.desc || 'Enter move name to fetch data...').replace(/"/g, '&quot;');

    return `
        <td class="table-cell-middle">
            <div class="flex-row-center">
                <span class="acc-total-display" data-id="${move.id}" style="font-weight: bold; font-size: 0.9em; color: var(--dark); min-width: 1em;" title="Base Acc Dice">0</span>
                <button type="button" class="acc-btn btn-dark" data-id="${move.id}" style="padding: 2px 6px;" title="Roll Accuracy">🎯</button>
            </div>
        </td>
        <td class="table-cell-middle">
            <input type="text" list="move-list" class="move-input input-transparent" data-field="name" data-id="${move.id}" value="${move.name}" title="${cleanDesc}" placeholder="Move Name">
        </td>
        <td class="table-cell-middle">
            <div class="flex-row-start">
                ${buildAttrSelect(move)} + ${buildSkillSelect(move, extraCategories)}
            </div>
        </td>
        <td class="table-cell-middle" style="padding: 2px;">
            <input type="text" class="move-input input-transparent" data-field="type" data-id="${move.id}" value="${move.type}" style="${getTypeStyle(move.type)}" placeholder="Type">
        </td>
        <td class="table-cell-middle">
            <select class="move-input cat-select" data-field="cat" data-id="${move.id}">
                <option value="Phys" ${move.cat === 'Phys' ? 'selected' : ''}>Phys</option>
                <option value="Spec" ${move.cat === 'Spec' ? 'selected' : ''}>Spec</option>
                <option value="Supp" ${move.cat === 'Supp' ? 'selected' : ''}>Supp</option>
            </select>
        </td>
        <td class="table-cell-middle">
            <div class="flex-row-start">
                <input type="number" class="spin-input move-input power-input" data-field="power" data-id="${move.id}" value="${move.power}" placeholder="Pwr">
                + ${buildDmgStatSelect(move)}
            </div>
        </td>
        <td class="table-cell-middle">
            <div class="flex-row-center">
                <span class="dmg-total-display" data-id="${move.id}" style="font-weight: bold; font-size: 0.9em; color: var(--primary); min-width: 1em;" title="Base Dmg Dice">0</span>
                <button type="button" class="dmg-btn btn-red" data-id="${move.id}" style="padding: 2px 6px;" title="Roll Damage">💥</button>
            </div>
        </td>
        <td class="table-cell-middle">
            <div class="flex-col-center">
                <button type="button" class="move-up-btn sort-btn" data-index="${index}">▲</button>
                <button type="button" class="move-down-btn sort-btn" data-index="${index}">▼</button>
            </div>
        </td>
        <td class="table-cell-middle">
            <button type="button" class="delete-btn btn-red" data-id="${move.id}" style="padding: 2px 6px;">X</button>
        </td>
    `;
}

export function buildInventoryRow(item: InventoryItem): string {
    return `
        <td class="table-cell-top">
            <div style="display: flex; justify-content: center;">
                <input type="number" class="inv-input spin-input" data-field="qty" data-id="${item.id}" value="${item.qty}">
            </div>
        </td>
        <td class="table-cell-top">
            <input type="text" class="inv-input item-name-input" data-field="name" data-id="${item.id}" value="${item.name}" placeholder="Item Name">
        </td>
        <td style="padding: 4px 2px;">
            <textarea class="inv-input textarea-desc" data-field="desc" data-id="${item.id}" rows="1" placeholder="Effect / Notes...">${item.desc}</textarea>
        </td>
        <td class="table-cell-top">
            <button type="button" class="del-item-btn btn-red" data-id="${item.id}" style="padding: 2px 6px;">X</button>
        </td>
    `;
}

// --- SPINNER & UI TOGGLES ---
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