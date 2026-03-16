import type { SkillCheck, ExtraCategory } from '../@types/index';
import { ALL_SKILLS } from '../utils';
import { createEl } from './dom';

export function renderSkillChecks(currentSkillChecks: SkillCheck[], currentExtraCategories: ExtraCategory[], saveChecksToToken: (checks: SkillCheck[]) => void, rollSkillCheck: (check: SkillCheck) => void) {
    const tbody = document.getElementById('skill-checks-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    currentSkillChecks.forEach((check) => {
        const tr = createEl('tr', { className: 'data-table__row--dynamic' });

        const nameInp = createEl('input', { type: 'text', className: 'check-input form-input--transparent', value: check.name, placeholder: 'e.g. Investigate', dataset: { field: 'name', id: check.id }});
        const tdName = createEl('td', { className: 'data-table__cell--middle' }, [nameInp]);

        const attrSel = createEl('select', { className: 'check-input form-select--bordered', dataset: { field: 'attr', id: check.id }});
        ['str', 'dex', 'vit', 'spe', 'ins', 'tou', 'coo', 'bea', 'cut', 'cle', 'will'].forEach(a => {
            attrSel.appendChild(createEl('option', { value: a, text: a.toUpperCase(), selected: check.attr === a }));
        });
        const tdAttr = createEl('td', { className: 'data-table__cell--middle' }, [attrSel]);

        const skillSel = createEl('select', { className: 'check-input form-select--bordered', dataset: { field: 'skill', id: check.id }});
        skillSel.appendChild(createEl('option', { value: 'none', text: '-- None --', selected: check.skill === 'none' }));
        ALL_SKILLS.forEach(s => {
            const cLabel = (document.getElementById(`label-${s}`) as HTMLInputElement)?.value || s.charAt(0).toUpperCase() + s.slice(1);
            skillSel.appendChild(createEl('option', { value: s, text: cLabel, selected: check.skill === s }));
        });
        currentExtraCategories.forEach(cat => cat.skills.forEach(sk => {
            skillSel.appendChild(createEl('option', { value: sk.id, text: sk.name || 'Unnamed', selected: check.skill === sk.id }));
        }));
        const tdSkill = createEl('td', { className: 'data-table__cell--middle' }, [skillSel]);

        const rollBtn = createEl('button', { type: 'button', className: 'check-roll-btn action-button action-button--dark', innerText: '🎲', style: 'padding: 2px 6px;', dataset: { id: check.id }});
        const tdRoll = createEl('td', { className: 'data-table__cell--middle' }, [rollBtn]);

        const delBtn = createEl('button', { type: 'button', className: 'check-del-btn action-button action-button--red', innerText: 'X', style: 'padding: 2px 6px;', dataset: { id: check.id }});
        const tdDel = createEl('td', { className: 'data-table__cell--middle' }, [delBtn]);

        tr.append(tdName, tdAttr, tdSkill, tdRoll, tdDel);
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.check-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement | HTMLSelectElement;
            const id = target.getAttribute('data-id')!;
            const field = target.getAttribute('data-field')! as keyof SkillCheck;
            const check = currentSkillChecks.find(c => c.id === id);
            if (check) {
                check[field] = target.value;
                saveChecksToToken(currentSkillChecks);
            }
        });
    });

    document.querySelectorAll('.check-del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
            const index = currentSkillChecks.findIndex(c => c.id === id);
            if (index !== -1) currentSkillChecks.splice(index, 1);
            renderSkillChecks(currentSkillChecks, currentExtraCategories, saveChecksToToken, rollSkillCheck);
            saveChecksToToken(currentSkillChecks);
        });
    });

    document.querySelectorAll('.check-roll-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')!;
            const check = currentSkillChecks.find(c => c.id === id);
            if (check) rollSkillCheck(check);
        });
    });
}