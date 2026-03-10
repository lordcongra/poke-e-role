import type { Move, InventoryItem, ExtraCategory, ExtraSkill, CustomInfo } from './@types/index';
import { ATTRIBUTE_MAPPING } from './@types/index';
import { ALL_SKILLS, calculateMatchups } from './utils';
import { calculateStats, updateMoveDisplays } from './math';
import { fetchMoveData } from './api';

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
    element.style.cssText = getTypeStyle(typeStr);
}

// --- DOM GENERATOR HELPER ---
export function createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, any> = {},
    children: (HTMLElement | string)[] = []
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(props)) {
        if (key === 'className') el.className = val;
        else if (key === 'dataset') {
            for (const dKey in val) el.dataset[dKey] = String(val[dKey]);
        }
        else if (key === 'style') el.style.cssText = val;
        else if (key === 'list') el.setAttribute('list', val); 
        else (el as any)[key] = val;
    }
    children.forEach(c => {
        if (typeof c === 'string') el.appendChild(document.createTextNode(c));
        else el.appendChild(c);
    });
    return el;
}

// --- ROW GENERATORS ---
export function buildExtraCategoryHeader(tr: HTMLTableRowElement, category: ExtraCategory) {
    const input = createEl('input', { type: 'text', className: 'cat-name-input form-input--transparent-white', value: category.name, placeholder: 'CAT NAME', dataset: { catid: category.id } });
    const btn = createEl('button', { type: 'button', className: 'del-cat-btn action-button action-button--transparent-white', title: 'Delete Category', innerText: 'X', dataset: { catid: category.id } });

    tr.append(
        createEl('th', { className: 'data-table__cell--top-left' }, [input]),
        createEl('th'), createEl('th'),
        createEl('th', { className: 'data-table__cell--middle' }, [btn])
    );
}

export function buildExtraSkillRow(tr: HTMLTableRowElement, categoryId: string, skill: ExtraSkill) {
    const nameInput = createEl('input', { type: 'text', className: 'extra-skill-name form-input--transparent-bold', value: skill.name, placeholder: 'Skill', dataset: { catid: categoryId, skid: skill.id } });
    const baseInput = createEl('input', { type: 'number', className: 'extra-skill-base number-spinner__input', value: skill.base, id: `${skill.id}-base`, dataset: { catid: categoryId, skid: skill.id } });
    const buffInput = createEl('input', { type: 'number', className: 'extra-skill-buff number-spinner__input', value: skill.buff, id: `${skill.id}-buff`, dataset: { catid: categoryId, skid: skill.id } });
    const totalDisplay = createEl('td', { id: `${skill.id}-total`, style: 'font-weight: bold;' }, [String(skill.base + skill.buff)]);

    tr.append(
        createEl('td', { className: 'data-table__cell--middle-left', style: 'padding-left: 5px;' }, [nameInput]),
        createEl('td', {}, [baseInput]),
        createEl('td', {}, [buffInput]),
        totalDisplay
    );
}

export function buildMoveRow(tr: HTMLTableRowElement, move: Move, index: number, extraCategories: ExtraCategory[]) {
    const accSpan = createEl('span', { className: 'acc-total-display', title: 'Base Acc Dice', innerText: '0', style: 'font-weight: bold; font-size: 0.9em; color: var(--dark); min-width: 1em;', dataset: { id: move.id }});
    const accBtn = createEl('button', { type: 'button', className: 'acc-btn action-button action-button--dark', title: 'Roll Accuracy', innerText: '🎯', style: 'padding: 2px 6px;', dataset: { id: move.id }});
    const td1 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { className: 'flex-layout--row-center' }, [accSpan, accBtn])]);

    const nameInp = createEl('input', { type: 'text', className: 'move-input form-input--transparent', list: 'move-list', value: move.name, placeholder: 'Move Name', title: move.desc || 'Enter move name to fetch data...', dataset: { field: 'name', id: move.id }});
    const td2 = createEl('td', { className: 'data-table__cell--middle' }, [nameInp]);

    const attrSel = createEl('select', { className: 'move-input form-select--bordered', dataset: { field: 'attr', id: move.id }});
    ['str', 'dex', 'vit', 'spe', 'ins', 'tou', 'coo', 'bea', 'cut', 'cle', 'will'].forEach(a => {
        attrSel.appendChild(createEl('option', { value: a, text: a.toUpperCase(), selected: move.attr === a }));
    });

    const skillSel = createEl('select', { className: 'move-input form-select--bordered', dataset: { field: 'skill', id: move.id }});
    ALL_SKILLS.forEach(s => {
        const cLabel = (document.getElementById(`label-${s}`) as HTMLInputElement)?.value || s.charAt(0).toUpperCase() + s.slice(1);
        skillSel.appendChild(createEl('option', { value: s, text: cLabel, selected: move.skill === s }));
    });
    extraCategories.forEach(cat => cat.skills.forEach(sk => {
        skillSel.appendChild(createEl('option', { value: sk.id, text: sk.name || 'Unnamed', selected: move.skill === sk.id }));
    }));
    const td3 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { className: 'flex-layout--row-start' }, [attrSel, " + ", skillSel])]);

    const typeInp = createEl('input', { type: 'text', className: 'move-input form-input--transparent', value: move.type, placeholder: 'Type', style: getTypeStyle(move.type), dataset: { field: 'type', id: move.id }});
    const td4 = createEl('td', { className: 'data-table__cell--middle', style: 'padding: 2px;' }, [typeInp]);

    const catSel = createEl('select', { className: 'move-input form-select--transparent', dataset: { field: 'cat', id: move.id }});
    ['Phys', 'Spec', 'Supp'].forEach(c => catSel.appendChild(createEl('option', { value: c, text: c, selected: move.cat === c })));
    const td5 = createEl('td', { className: 'data-table__cell--middle' }, [catSel]);

    const pwrInp = createEl('input', { type: 'number', className: 'number-spinner__input move-input form-input--power', value: move.power, placeholder: 'Pwr', dataset: { field: 'power', id: move.id }});
    const dmgStatSel = createEl('select', { className: 'move-input form-select--bordered', dataset: { field: 'dmgStat', id: move.id }});
    [{v:"", l:"-"}, {v:"str", l:"STR"}, {v:"dex", l:"DEX"}, {v:"vit", l:"VIT"}, {v:"spe", l:"SPE"}, {v:"ins", l:"INS"}].forEach(opt => {
        dmgStatSel.appendChild(createEl('option', { value: opt.v, text: opt.l, selected: (move.dmgStat === opt.v || move.dmgStat?.toLowerCase().startsWith(opt.v)) }));
    });
    const td6 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { className: 'flex-layout--row-start' }, [pwrInp, " + ", dmgStatSel])]);

    const dmgSpan = createEl('span', { className: 'dmg-total-display', title: 'Base Dmg Dice', innerText: '0', style: 'font-weight: bold; font-size: 0.9em; color: var(--primary); min-width: 1em;', dataset: { id: move.id }});
    const dmgBtn = createEl('button', { type: 'button', className: 'dmg-btn action-button action-button--red', title: 'Roll Damage', innerText: '💥', style: 'padding: 2px 6px;', dataset: { id: move.id }});
    const td7 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { className: 'flex-layout--row-center' }, [dmgSpan, dmgBtn])]);

    const upBtn = createEl('button', { type: 'button', className: 'move-up-btn action-button action-button--sort', innerText: '▲', dataset: { index: index }});
    const dnBtn = createEl('button', { type: 'button', className: 'move-down-btn action-button action-button--sort', innerText: '▼', dataset: { index: index }});
    const td8 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { className: 'flex-layout--column-center' }, [upBtn, dnBtn])]);

    const delBtn = createEl('button', { type: 'button', className: 'delete-btn action-button action-button--red', innerText: 'X', style: 'padding: 2px 6px;', dataset: { id: move.id }});
    const td9 = createEl('td', { className: 'data-table__cell--middle' }, [delBtn]);

    tr.append(td1, td2, td3, td4, td5, td6, td7, td8, td9);
}

export function buildInventoryRow(tr: HTMLTableRowElement, item: InventoryItem) {
    const qtyInp = createEl('input', { type: 'number', className: 'inv-input number-spinner__input', value: item.qty, dataset: { field: 'qty', id: item.id }});
    const td1 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; justify-content: center;' }, [qtyInp])]);

    const nameInp = createEl('input', { type: 'text', className: 'inv-input form-input--item-name', value: item.name, placeholder: 'Item Name', dataset: { field: 'name', id: item.id }});
    const td2 = createEl('td', { className: 'data-table__cell--top' }, [nameInp]);

    const descInp = createEl('textarea', { className: 'inv-input form-input--item-desc', rows: 1, value: item.desc, placeholder: 'Effect / Notes...', dataset: { field: 'desc', id: item.id }});
    const td3 = createEl('td', { style: 'padding: 4px 2px;' }, [descInp]);

    const delBtn = createEl('button', { type: 'button', className: 'del-item-btn action-button action-button--red', innerText: 'X', style: 'padding: 2px 6px;', dataset: { id: item.id }});
    const td4 = createEl('td', { className: 'data-table__cell--top' }, [delBtn]);

    tr.append(td1, td2, td3, td4);
}

export function buildCustomInfoRow(container: HTMLElement, info: CustomInfo) {
    const labelInp = createEl('input', { 
        type: 'text', 
        className: 'identity-grid__label', 
        value: info.label, 
        placeholder: 'Label', 
        style: 'width: 70px; border: none; background: transparent; outline: none; cursor: text;', 
        dataset: { id: info.id, field: 'label' } 
    });
    
    const valInp = createEl('input', { 
        type: 'text', 
        className: 'identity-grid__input', 
        value: info.value, 
        placeholder: 'Value', 
        dataset: { id: info.id, field: 'value' } 
    });
    
    const delBtn = createEl('button', { 
        type: 'button', 
        className: 'action-button action-button--red del-info-btn', 
        innerText: 'X', 
        style: 'padding: 0 4px;', 
        dataset: { id: info.id } 
    });

    const row = createEl('div', { className: 'identity-grid__row' }, [labelInp, valInp, delBtn]);
    container.appendChild(row);
}

// --- LARGE RENDERERS (Transplanted from main.ts) ---

export function renderStatuses(currentStatuses: string[], saveDataToToken: (key: string, val: string) => void) {
    const container = document.getElementById('status-container');
    if (!container) return;
    container.innerHTML = '';
    
    const options = ["Healthy", "1st Degree Burn", "2nd Degree Burn", "3rd Degree Burn", "Badly Poisoned", "Confusion", "Disable", "Flinch", "Frozen Solid", "In Love", "Paralysis", "Poison", "Sleep"];

    currentStatuses.forEach((status, index) => {
        const wrapper = createEl('div', { style: 'display: flex; gap: 2px;' });
        const select = createEl('select', { style: 'flex: 1; border: 1px solid var(--border); font-size: 0.75rem;' });
        
        options.forEach(opt => {
            select.appendChild(createEl('option', { value: opt, text: opt, selected: opt === status }));
        });

        select.addEventListener('change', (e) => {
            currentStatuses[index] = (e.target as HTMLSelectElement).value;
            saveDataToToken('status-list', JSON.stringify(currentStatuses));
        });

        wrapper.appendChild(select);

        if (index > 0) {
            const delBtn = createEl('button', { type: 'button', className: 'action-button action-button--red', innerText: 'X', style: 'padding: 0 4px;' });
            delBtn.onclick = () => {
                currentStatuses.splice(index, 1);
                renderStatuses(currentStatuses, saveDataToToken);
                saveDataToToken('status-list', JSON.stringify(currentStatuses));
            };
            wrapper.appendChild(delBtn);
        }
        
        container.appendChild(wrapper);
    });
}

export function renderCustomInfo(currentCustomInfo: CustomInfo[], saveDataToToken: (key: string, val: string) => void) {
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
            const index = currentCustomInfo.findIndex(i => i.id === id);
            if (index !== -1) currentCustomInfo.splice(index, 1);
            renderCustomInfo(currentCustomInfo, saveDataToToken);
            saveDataToToken('custom-info-data', JSON.stringify(currentCustomInfo));
        });
    });
}

export function renderInventory(currentInventory: InventoryItem[], saveInventoryToToken: (inv: InventoryItem[]) => void) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentInventory.forEach((item: InventoryItem) => {
        const tr = createEl('tr', { className: 'data-table__row--dynamic' });
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
            const index = currentInventory.findIndex(i => i.id === id);
            if (index !== -1) currentInventory.splice(index, 1);
            renderInventory(currentInventory, saveInventoryToToken); 
            saveInventoryToToken(currentInventory);
        });
    });
    setupSpinners();
}

export function renderExtraSkills(
    currentExtraCategories: ExtraCategory[],
    currentMoves: Move[],
    saveExtraSkillsToToken: (cats: ExtraCategory[]) => void,
    syncDerivedStats: () => void,
    renderMovesCallback: () => void
) {
    const tbody = document.getElementById('extra-skills-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentExtraCategories.forEach((category: ExtraCategory) => {
        const headTr = createEl('tr', { style: 'background-color: var(--primary); color: white;' });
        buildExtraCategoryHeader(headTr, category);
        tbody.appendChild(headTr);

        category.skills.forEach((skill: ExtraSkill) => {
            const tr = createEl('tr');
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
                if (skill) { skill.name = target.value; saveExtraSkillsToToken(currentExtraCategories); renderMovesCallback(); }
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
                const index = currentExtraCategories.findIndex(c => c.id === id);
                if(index !== -1) currentExtraCategories.splice(index, 1);
                renderExtraSkills(currentExtraCategories, currentMoves, saveExtraSkillsToToken, syncDerivedStats, renderMovesCallback); 
                renderMovesCallback();
                saveExtraSkillsToToken(currentExtraCategories);
            }
        });
    });
    setupSpinners();
}

export function renderMoves(
    currentMoves: Move[],
    currentExtraCategories: ExtraCategory[],
    saveMovesToToken: (moves: Move[]) => void,
    rollAccuracy: (move: Move) => void,
    rollDamage: (move: Move) => void
) {
  const tbody = document.getElementById('moves-table-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  currentMoves.forEach((move: Move, index: number) => {
    if (move.power === undefined) move.power = 0;
    if (move.dmgStat === undefined) move.dmgStat = "";

    const tr = createEl('tr', { className: 'data-table__row--dynamic' });
    buildMoveRow(tr, move, index, currentExtraCategories);
    
    const isUsed = (move as any).used ? true : false;
    const td = createEl('td', { style: 'text-align: center;' });
    td.innerHTML = `<input type="checkbox" class="move-used-checkbox" data-id="${move.id}" ${isUsed ? 'checked' : ''} style="cursor: pointer; transform: scale(1.1);" title="Mark as used this round">`;
    tr.insertBefore(td, tr.firstChild); 
    
    if (isUsed) {
        tr.style.opacity = '0.5';
        tr.style.transition = 'opacity 0.2s ease';
    }

    tbody.appendChild(tr);
  });

  document.querySelectorAll('.move-used-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          const move = currentMoves.find(m => m.id === target.getAttribute('data-id'));
          if (move) {
              (move as any).used = target.checked;
              const row = target.closest('tr');
              if (row) {
                  row.style.opacity = target.checked ? '0.5' : '1';
                  row.style.transition = 'opacity 0.2s ease';
              }
              saveMovesToToken(currentMoves);
          }
      });
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

        if (field === 'type') applyTypeStyle(target as HTMLElement, target.value);
        
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
                
                // Recursively re-render to show new values
                renderMoves(currentMoves, currentExtraCategories, saveMovesToToken, rollAccuracy, rollDamage); 
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
        const index = currentMoves.findIndex(m => m.id === id);
        if (index !== -1) currentMoves.splice(index, 1);
        renderMoves(currentMoves, currentExtraCategories, saveMovesToToken, rollAccuracy, rollDamage); 
        saveMovesToToken(currentMoves);
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
        renderMoves(currentMoves, currentExtraCategories, saveMovesToToken, rollAccuracy, rollDamage); 
        saveMovesToToken(currentMoves);
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
        renderMoves(currentMoves, currentExtraCategories, saveMovesToToken, rollAccuracy, rollDamage); 
        saveMovesToToken(currentMoves);
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

// --- STATIC UI HELPERS ---
export function renderTypeMatchups(typeStr: string) {
    const container = document.getElementById('type-matchup-container');
    const lockedContainer = document.getElementById('locked-type-matchup-container');
    
    if (!container) return;
    
    container.innerHTML = '';
    if (lockedContainer) lockedContainer.innerHTML = '';

    if (!typeStr) {
        const emptyMsg = createEl('div', { style: 'color: #888; font-style: italic; text-align: center; padding-top: 10px;' }, ["Load a Pokémon to see matchups..."]);
        container.appendChild(emptyMsg);
        if (lockedContainer) lockedContainer.appendChild(emptyMsg.cloneNode(true));
        return;
    }

    const matchups = calculateMatchups(typeStr);
    const groups: Record<number, string[]> = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };

    for (const [type, mult] of Object.entries(matchups)) {
        if (groups[mult]) groups[mult].push(type);
    }

    const buildGroup = (label: string, mult: number) => {
        if (groups[mult].length === 0) return;
        
        const groupDiv = createEl('div', { style: 'display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px;' });
        const labelSpan = createEl('span', { innerText: label, style: 'width: 40px; font-weight: bold; color: var(--dark); text-align: right; flex-shrink: 0; padding-top: 2px;' });
        const badgesContainer = createEl('div', { style: 'display: flex; gap: 4px; flex-wrap: wrap; flex: 1;' });
        
        groups[mult].forEach(t => {
            const badge = createEl('div', { innerText: t, style: getTypeStyle(t) + ' padding: 2px 6px; font-size: 0.75rem; border-radius: 4px;' });
            badgesContainer.appendChild(badge);
        });

        groupDiv.appendChild(labelSpan);
        groupDiv.appendChild(badgesContainer);
        container.appendChild(groupDiv);
    }

    buildGroup('4x', 4);
    buildGroup('2x', 2);
    buildGroup('0.5x', 0.5);
    buildGroup('0.25x', 0.25);
    buildGroup('0x', 0);
    
    if (lockedContainer) {
        lockedContainer.innerHTML = container.innerHTML;
    }
}

export function setupSpinners() {
  document.querySelectorAll('input[type="number"].number-spinner__input').forEach(input => {
    if (input.parentElement?.classList.contains('number-spinner')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'number-spinner';
    input.parentNode?.insertBefore(wrapper, input);
    
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'number-spinner__button';
    minus.innerText = '-';
    minus.onclick = () => { 
        (input as HTMLInputElement).stepDown(); 
        input.dispatchEvent(new Event('input', { bubbles: true })); 
        input.dispatchEvent(new Event('change', { bubbles: true })); 
    };
    
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'number-spinner__button';
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