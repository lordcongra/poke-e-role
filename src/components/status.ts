import type { CustomInfo, StatusItem, EffectItem } from '../@types/index';
import { createEl } from './dom';

const getStatusColor = (name: string) => {
    if (name === "Healthy") return { bg: "#A5D6A7", text: "#000" };
    if (name === "1st Degree Burn") return { bg: "#FFCC80", text: "#000" };
    if (name === "2nd Degree Burn") return { bg: "#FF8A65", text: "#000" };
    if (name === "3rd Degree Burn") return { bg: "#D32F2F", text: "#FFF" };
    if (name === "Poison") return { bg: "#CE93D8", text: "#000" };
    if (name === "Badly Poisoned") return { bg: "#8E24AA", text: "#FFF" };
    if (name === "Paralysis") return { bg: "#FFF59D", text: "#000" };
    if (name === "Frozen Solid") return { bg: "#81D4FA", text: "#000" };
    if (name === "Sleep") return { bg: "#9FA8DA", text: "#000" };
    if (name === "In Love") return { bg: "#F48FB1", text: "#000" };
    if (name === "Confusion") return { bg: "#80CBC4", text: "#000" };
    if (name === "Disable") return { bg: "#E0E0E0", text: "#000" };
    if (name === "Flinch") return { bg: "#B0BEC5", text: "#000" };
    return { bg: "#FFFFFF", text: "#000" }; 
};

export function buildCustomInfoRow(container: HTMLElement, info: CustomInfo) {
    const labelInp = createEl('input', { 
        type: 'text', className: 'identity-grid__label', value: info.label, placeholder: 'Label', 
        style: 'width: 70px; border: none; background: transparent; outline: none; cursor: text;', 
        dataset: { id: info.id, field: 'label' } 
    });
    const valInp = createEl('input', { type: 'text', className: 'identity-grid__input', value: info.value, placeholder: 'Value', dataset: { id: info.id, field: 'value' } });
    const delBtn = createEl('button', { type: 'button', className: 'action-button action-button--red del-info-btn', innerText: 'X', style: 'padding: 0 4px;', dataset: { id: info.id } });
    const row = createEl('div', { className: 'identity-grid__row' }, [labelInp, valInp, delBtn]);
    container.appendChild(row);
}

export function renderStatuses(currentStatuses: StatusItem[], saveDataToToken: (key: string, val: string) => void, rollStatus: (status: StatusItem) => void) {
    const container = document.getElementById('status-container');
    if (!container) return;
    container.innerHTML = '';
    
    const options = ["Healthy", "1st Degree Burn", "2nd Degree Burn", "3rd Degree Burn", "Poison", "Badly Poisoned", "Confusion", "Disable", "Flinch", "Frozen Solid", "In Love", "Paralysis", "Sleep", "Custom..."];

    currentStatuses.forEach((status, index) => {
        const wrapper = createEl('div', { style: 'display: flex; gap: 2px; align-items: center;' });
        
        const colors = getStatusColor(status.name);
        const select = createEl('select', { style: `flex: 1; border: 1px solid var(--border); font-size: 0.75rem; min-width: 60px; background-color: ${colors.bg}; color: ${colors.text};` });
        
        options.forEach(opt => select.appendChild(createEl('option', { value: opt, text: opt, selected: opt === status.name })));

        select.addEventListener('change', (e) => {
            currentStatuses[index].name = (e.target as HTMLSelectElement).value;
            renderStatuses(currentStatuses, saveDataToToken, rollStatus);
            saveDataToToken('status-list', JSON.stringify(currentStatuses));
        });
        wrapper.appendChild(select);

        if (status.name === "Custom...") {
            const customInput = createEl('input', { type: 'text', value: status.customName, placeholder: 'Effect Name', style: 'flex: 1; border: 1px solid var(--border); font-size: 0.75rem; padding: 2px; min-width: 60px;' });
            customInput.addEventListener('change', (e) => {
                currentStatuses[index].customName = (e.target as HTMLInputElement).value;
                saveDataToToken('status-list', JSON.stringify(currentStatuses));
            });
            wrapper.appendChild(customInput);
        }

        const roundInp = createEl('input', { type: 'number', value: status.rounds, min: 0, style: 'width: 35px; border: 1px solid var(--border); font-size: 0.75rem; text-align: center;', title: 'Successes / Tracker' });
        roundInp.addEventListener('change', (e) => {
            currentStatuses[index].rounds = parseInt((e.target as HTMLInputElement).value) || 0;
            saveDataToToken('status-list', JSON.stringify(currentStatuses));
        });
        wrapper.appendChild(roundInp);

        if (status.name !== "Healthy") {
            const rollBtn = createEl('button', { type: 'button', className: 'action-button action-button--dark', innerText: '🎲', style: 'padding: 0 4px; margin: 0;', title: 'Roll Recovery' });
            rollBtn.onclick = () => rollStatus(currentStatuses[index]);
            wrapper.appendChild(rollBtn);
        }

        if (index > 0) {
            const delBtn = createEl('button', { type: 'button', className: 'action-button action-button--red', innerText: 'X', style: 'padding: 0 4px; margin: 0;' });
            delBtn.onclick = () => {
                currentStatuses.splice(index, 1);
                renderStatuses(currentStatuses, saveDataToToken, rollStatus);
                saveDataToToken('status-list', JSON.stringify(currentStatuses));
            };
            wrapper.appendChild(delBtn);
        }
        
        container.appendChild(wrapper);
    });
}

export function renderEffects(currentEffects: EffectItem[], saveDataToToken: (key: string, val: string) => void) {
    const container = document.getElementById('effects-container');
    if (!container) return;
    container.innerHTML = '';

    if (currentEffects.length === 0) {
        container.innerHTML = '<span style="color: var(--text-muted); font-style: italic; font-size: 0.8rem; padding-left: 4px;">No active effects.</span>';
        return;
    }

    currentEffects.forEach((effect, index) => {
        const wrapper = createEl('div', { style: 'display: flex; gap: 4px; align-items: center; background: var(--panel-bg); border: 1px solid var(--border); padding: 4px; border-radius: 6px;' });
        
        const nameInp = createEl('input', { type: 'text', value: effect.name, placeholder: 'Effect Name', style: 'width: 110px; border: 1px solid var(--border); font-size: 0.75rem; padding: 2px; border-radius: 3px; background: transparent; color: var(--text-main);' });
        nameInp.addEventListener('change', (e) => {
            currentEffects[index].name = (e.target as HTMLInputElement).value;
            saveDataToToken('effects-data', JSON.stringify(currentEffects));
        });

        const roundInp = createEl('input', { type: 'number', value: effect.rounds, min: 0, style: 'width: 40px; border: 1px solid var(--border); font-size: 0.75rem; text-align: center; border-radius: 3px; background: transparent; color: var(--text-main);', title: 'Rounds left' });
        roundInp.addEventListener('change', (e) => {
            currentEffects[index].rounds = parseInt((e.target as HTMLInputElement).value) || 0;
            saveDataToToken('effects-data', JSON.stringify(currentEffects));
        });

        const delBtn = createEl('button', { type: 'button', className: 'action-button action-button--red', innerText: 'X', style: 'padding: 0 4px; margin: 0; height: 100%; border-radius: 3px;' });
        delBtn.onclick = () => {
            currentEffects.splice(index, 1);
            renderEffects(currentEffects, saveDataToToken);
            saveDataToToken('effects-data', JSON.stringify(currentEffects));
        };

        const labelSpan = createEl('span', { innerText: 'Rds:', style: 'font-size: 0.7rem; color: var(--text-muted);' });

        wrapper.append(nameInp, labelSpan, roundInp, delBtn);
        container.appendChild(wrapper);
    });
}

export function renderCustomInfo(currentCustomInfo: CustomInfo[], saveDataToToken: (key: string, val: string) => void) {
    const container = document.getElementById('custom-info-container');
    if (!container) return;
    container.innerHTML = '';

    currentCustomInfo.forEach(info => { buildCustomInfoRow(container, info); });

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const item = currentCustomInfo.find(i => i.id === target.dataset.id);
            if (item) {
                item[target.dataset.field as keyof CustomInfo] = target.value;
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