import type { InventoryItem } from '../@types/index';
import { createEl, setupSpinners } from './dom';

export function buildInventoryRow(tr: HTMLTableRowElement, item: InventoryItem, index: number) {
    const actInp = createEl('input', { type: 'checkbox', className: 'inv-input', checked: item.active ? true : false, dataset: { field: 'active', id: item.id }, style: 'cursor:pointer; transform: scale(1.1);' });
    const td0 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; justify-content: center; padding-top: 4px;' }, [actInp])]);

    const qtyInp = createEl('input', { type: 'number', className: 'inv-input number-spinner__input', value: item.qty, dataset: { field: 'qty', id: item.id }});
    const td1 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; justify-content: center;' }, [qtyInp])]);

    const nameInp = createEl('input', { type: 'text', className: 'inv-input form-input--item-name', list: 'item-list', value: item.name, placeholder: 'Item Name', dataset: { field: 'name', id: item.id }});
    
    const infoBtn = createEl('button', { type: 'button', className: 'action-button action-button--transparent-white', innerText: '❔', style: 'color: var(--primary); padding: 0 2px; font-size: 0.8rem;', title: 'Read Description' });
    infoBtn.onclick = () => {
        const modal = document.getElementById('info-modal');
        if (modal) {
            document.getElementById('info-modal-title')!.innerText = item.name || "Unknown Item";
            document.getElementById('info-modal-desc')!.innerText = item.desc || "No description/effect listed.";
            modal.style.display = 'flex';
        }
    };
    const td2 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; align-items: center;' }, [nameInp, infoBtn])]);

    const descInp = createEl('textarea', { className: 'inv-input form-input--item-desc', rows: 1, value: item.desc, placeholder: 'Effect / Notes...', dataset: { field: 'desc', id: item.id }});
    const td3 = createEl('td', { style: 'padding: 4px 2px;' }, [descInp]);

    const upBtn = createEl('button', { type: 'button', className: 'inv-up-btn action-button action-button--sort', innerText: '▲', dataset: { index: index }});
    const dnBtn = createEl('button', { type: 'button', className: 'inv-down-btn action-button action-button--sort', innerText: '▼', dataset: { index: index }});
    const tdSort = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { className: 'flex-layout--column-center', style: 'padding-top: 4px;' }, [upBtn, dnBtn])]);

    const delBtn = createEl('button', { type: 'button', className: 'del-item-btn action-button action-button--red', innerText: 'X', style: 'padding: 2px 6px;', dataset: { id: item.id }});
    const td4 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'padding-top: 4px;' }, [delBtn])]);

    tr.append(td0, td1, td2, td3, tdSort, td4);
}

export function renderInventory(currentInventory: InventoryItem[], saveInventoryToToken: (inv: InventoryItem[]) => void) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    currentInventory.forEach((item: InventoryItem, index: number) => {
        const tr = createEl('tr', { className: 'data-table__row--dynamic' });
        buildInventoryRow(tr, item, index);
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.inv-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-index')!);
            if (idx > 0) {
                const temp = currentInventory[idx];
                currentInventory[idx] = currentInventory[idx - 1];
                currentInventory[idx - 1] = temp;
                renderInventory(currentInventory, saveInventoryToToken);
                saveInventoryToToken(currentInventory);
            }
        });
    });

    document.querySelectorAll('.inv-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-index')!);
            if (idx < currentInventory.length - 1) {
                const temp = currentInventory[idx];
                currentInventory[idx] = currentInventory[idx + 1];
                currentInventory[idx + 1] = temp;
                renderInventory(currentInventory, saveInventoryToToken);
                saveInventoryToToken(currentInventory);
            }
        });
    });

    document.querySelectorAll('.inv-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.getAttribute('data-id')!;
            const field = target.getAttribute('data-field')! as keyof InventoryItem;
            const item = currentInventory.find((i: InventoryItem) => i.id === id);
            if (item) {
                if (field === 'qty') {
                    item[field] = parseInt(target.value) || 0;
                } else if (field === 'active') {
                    item[field] = target.checked as never; 
                } else {
                    item[field] = target.value as never;
                }
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