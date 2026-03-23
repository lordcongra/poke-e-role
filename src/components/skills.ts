import type { Move, ExtraCategory, ExtraSkill } from '../@types/index';
import { debouncedCalculateStats } from '../math';
import { createEl, setupSpinners } from './dom';

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

export function renderExtraSkills(currentExtraCategories: ExtraCategory[], currentMoves: Move[], saveExtraSkillsToToken: (cats: ExtraCategory[]) => void, syncDerivedStats: () => void, renderMovesCallback: () => void) {
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
        input.addEventListener('input', () => debouncedCalculateStats(currentExtraCategories, currentMoves));
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