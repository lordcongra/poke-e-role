import type { Move, ExtraCategory } from '../@types/index';
import { ATTRIBUTE_MAPPING } from '../@types/index';
import { ALL_SKILLS } from '../utils';
import { updateMoveDisplays } from '../math';
import { fetchMoveData } from '../api';
import { createEl, getTypeStyle, applyTypeStyle, setupSpinners } from './dom';

export function buildMoveRow(tr: HTMLTableRowElement, move: Move, index: number, extraCategories: ExtraCategory[]) {
    const accSpan = createEl('span', { className: 'acc-total-display', title: 'Base Acc Dice', innerText: '0', style: 'font-weight: bold; font-size: 0.9em; color: var(--text-main); min-width: 1em;', dataset: { id: move.id }});
    const accBtn = createEl('button', { type: 'button', className: 'acc-btn action-button action-button--dark', title: 'Roll Accuracy', innerText: '🎲', style: 'padding: 2px 6px;', dataset: { id: move.id }});
    const td1 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { className: 'flex-layout--row-center' }, [accSpan, accBtn])]);

    const nameInp = createEl('input', { type: 'text', className: 'move-input form-input--transparent', list: 'move-list', value: move.name, placeholder: 'Move Name', title: move.desc || 'Enter move name to fetch data...', dataset: { field: 'name', id: move.id }});
    
    const infoBtn = createEl('button', { type: 'button', className: 'action-button action-button--transparent-white', innerText: '🏷️', style: 'color: var(--primary); padding: 0 2px; font-size: 0.8rem;', title: 'Edit Move & Tags' });
    infoBtn.onclick = () => {
        const modal = document.getElementById('move-edit-modal');
        if (modal) {
            document.getElementById('move-edit-title')!.innerText = move.name || "Unknown Move";
            (document.getElementById('move-edit-desc') as HTMLTextAreaElement).value = move.desc || "";
            
            const saveBtn = document.getElementById('move-edit-save-btn') as HTMLButtonElement;
            const tagsBtn = document.getElementById('move-edit-tags-btn') as HTMLButtonElement;
            saveBtn.dataset.moveid = move.id;
            tagsBtn.dataset.moveid = move.id;
            
            modal.style.display = 'flex';
        }
    };
    const td2 = createEl('td', { className: 'data-table__cell--middle' }, [createEl('div', { style: 'display: flex; align-items: center;' }, [nameInp, infoBtn])]);

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

export function renderMoves(currentMoves: Move[], currentExtraCategories: ExtraCategory[], saveMovesToToken: (moves: Move[]) => void, rollAccuracy: (move: Move) => void, rollDamage: (move: Move) => void) {
  const tbody = document.getElementById('moves-table-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  currentMoves.forEach((move: Move, index: number) => {
    if (move.power === undefined) move.power = 0;
    if (move.dmgStat === undefined) move.dmgStat = "";

    const tr = createEl('tr', { className: 'data-table__row--dynamic' });
    buildMoveRow(tr, move, index, currentExtraCategories);

    const isUsed = move.used ? true : false;
    const checkbox = createEl('input', { type: 'checkbox', className: 'move-used-checkbox', checked: isUsed, title: 'Mark as used this round', style: 'cursor: pointer; transform: scale(1.1);', dataset: { id: move.id } });
    const td = createEl('td', { style: 'text-align: center;' }, [checkbox]);
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
              move.used = target.checked;
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
        // FIX: Safe casting via unknown
        else (move as unknown as Record<string, unknown>)[field] = target.value;

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