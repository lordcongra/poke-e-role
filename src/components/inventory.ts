import type { InventoryItem } from '../@types/index';
import { createEl, setupSpinners } from './dom';
import { fetchItemData } from '../api';
import { appState, saveDataToToken } from '../state';
import { generateId } from '../utils';
import { renderStatuses } from './status';
import { rollStatus } from '../combat';

export const HARDCODED_TAGS: Record<string, string> = {
    "wide lens": "[Acc +2]", "zoom lens": "[Acc +2]", "life orb": "[Dmg +2]",
    "black belt": "[Dmg +1: Fighting]", "black glasses": "[Dmg +1: Dark]",
    "charcoal": "[Dmg +1: Fire]", "dragon fang": "[Dmg +1: Dragon]",
    "fairy wings": "[Dmg +1: Fairy]", "hard stone": "[Dmg +1: Rock]",
    "magnet": "[Dmg +1: Electric]", "metal coat": "[Dmg +1: Steel]",
    "miracle seed": "[Dmg +1: Grass]", "mystic water": "[Dmg +1: Water]",
    "never-melt ice": "[Dmg +1: Ice]", "poison barb": "[Dmg +1: Poison]",
    "sharp beak": "[Dmg +1: Flying]", "silk scarf": "[Dmg +1: Normal]",
    "silver powder": "[Dmg +1: Bug]", "soft sand": "[Dmg +1: Ground]",
    "spell tag": "[Dmg +1: Ghost]", "twisted spoon": "[Dmg +1: Psychic]",
    "razor claw": "[High Crit]", "leek": "[High Crit]",
    "lucky punch": "[High Crit] [Str +2]", "sharp claw": "[High Crit]",
    "ring target": "[Remove Immunities]",
    "eviolite": "[Def +1] [Spd +1]",
    "metronome": "[Combo Dmg +1]",
    "loaded dice": "[Chance +2]",
    "choice scarf": "[Init +3]",
    "iron ball": "[Dex -1] [Remove Immunity: Ground]",
    "toxic orb": "[Status: Poison]",
    "flame orb": "[Status: 1st Degree Burn]",
    "air balloon": "[Immune: Ground]",
    "expert belt": "[Dmg +1: Super Effective]",
    "thick club": "[Str +2]",
    "light ball": "[Str +1] [Spe +1]",
    "quick claw": "[Init +2]"
};

export function buildInventoryRow(tr: HTMLTableRowElement, item: InventoryItem, index: number) {
    const actInp = createEl('input', { type: 'checkbox', className: 'inv-input', checked: item.active ? true : false, dataset: { field: 'active', id: item.id }, style: 'cursor:pointer; transform: scale(1.1);' });
    const td0 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; justify-content: center; padding-top: 4px;' }, [actInp])]);

    const qtyInp = createEl('input', { type: 'number', className: 'inv-input number-spinner__input', value: item.qty, dataset: { field: 'qty', id: item.id }});
    const td1 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; justify-content: center;' }, [qtyInp])]);

    const nameInp = createEl('input', { type: 'text', className: 'inv-input form-input--item-name', list: 'item-list', value: item.name, placeholder: 'Item Name', dataset: { field: 'name', id: item.id }});
    
    const infoBtn = createEl('button', { type: 'button', className: 'action-button action-button--transparent-white', innerText: '❔', style: 'color: var(--primary); padding: 2px 6px; font-size: 1.1rem; margin-left: 4px;', title: 'Read Description' });
    infoBtn.onclick = async () => {
        const modal = document.getElementById('info-modal');
        if (modal) {
            document.getElementById('info-modal-title')!.innerText = item.name || "Unknown Item";
            document.getElementById('info-modal-desc')!.innerText = "Loading data...";
            modal.style.display = 'flex';

            if (item.name) {
                const itemData = await fetchItemData(item.name.trim());
                if (itemData) {
                    document.getElementById('info-modal-desc')!.innerText = itemData.Description || itemData.Effect || item.desc || "No description found.";
                } else {
                    document.getElementById('info-modal-desc')!.innerText = item.desc || "No description/effect listed.";
                }
            } else {
                document.getElementById('info-modal-desc')!.innerText = item.desc || "No description/effect listed.";
            }
        }
    };
    
    const tagBtn = createEl('button', { type: 'button', className: 'action-button action-button--transparent-white', innerText: '🏷️', style: 'padding: 2px 6px; font-size: 1.1rem;', title: 'Tag Builder' });
    tagBtn.onclick = () => {
        const modal = document.getElementById('tag-builder-modal');
        const confirmBtn = document.getElementById('tag-builder-confirm');
        if (modal && confirmBtn) {
            confirmBtn.dataset.itemid = item.id;
            modal.style.display = 'flex';
        }
    };

    const td2 = createEl('td', { className: 'data-table__cell--top' }, [createEl('div', { style: 'display: flex; align-items: center;' }, [nameInp, infoBtn, tagBtn])]);

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
        input.addEventListener('change', async (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.getAttribute('data-id')!;
            const field = target.getAttribute('data-field')! as keyof InventoryItem;
            const item = currentInventory.find((i: InventoryItem) => i.id === id);
            
            if (item) {
                if (field === 'qty') {
                    item[field] = parseInt(target.value) || 0;
                } else if (field === 'active') {
                    item[field] = target.checked as never; 
                    
                    // --- AUTO STATUS INJECTION LOGIC ---
                    const desc = (item.desc || "").toLowerCase();
                    const statusMatches = Array.from(desc.matchAll(/\[status:\s*([a-zA-Z0-9\s]+)\]/gi));
                    
                    if (statusMatches.length > 0) {
                        let statusChanged = false;
                        
                        if (target.checked) {
                            statusMatches.forEach(match => {
                                const statusName = match[1].trim().toLowerCase();
                                const properName = ["1st Degree Burn", "2nd Degree Burn", "3rd Degree Burn", "Poison", "Badly Poisoned", "Paralysis", "Sleep", "Frozen Solid", "Confusion", "In Love", "Flinch"].find(s => s.toLowerCase() === statusName) || match[1].trim();
                                const exists = appState.currentStatuses.some(s => s.name.toLowerCase() === statusName || s.customName.toLowerCase() === statusName);
                                
                                if (!exists) {
                                    if (appState.currentStatuses.length === 1 && appState.currentStatuses[0].name === "Healthy") {
                                        appState.currentStatuses = [];
                                    }
                                    const isCustom = !["1st Degree Burn", "2nd Degree Burn", "3rd Degree Burn", "Poison", "Badly Poisoned", "Paralysis", "Sleep", "Frozen Solid", "Confusion", "In Love", "Flinch"].includes(properName);
                                    appState.currentStatuses.push({
                                        id: generateId(),
                                        name: isCustom ? "Custom..." : properName,
                                        customName: isCustom ? properName : "",
                                        rounds: 0
                                    });
                                    statusChanged = true;
                                }
                            });
                        } else {
                            statusMatches.forEach(match => {
                                const statusName = match[1].trim().toLowerCase();
                                const idx = appState.currentStatuses.findIndex(s => (s.name === "Custom..." ? s.customName.toLowerCase() : s.name.toLowerCase()) === statusName);
                                if (idx !== -1) {
                                    appState.currentStatuses.splice(idx, 1);
                                    statusChanged = true;
                                }
                            });
                            if (appState.currentStatuses.length === 0) {
                                appState.currentStatuses.push({ id: generateId(), name: "Healthy", customName: "", rounds: 0 });
                                statusChanged = true;
                            }
                        }
                        
                        if (statusChanged) {
                            renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus);
                            saveDataToToken('status-list', JSON.stringify(appState.currentStatuses));
                        }
                    }
                    
                } else {
                    item[field] = target.value as never;
                    
                    if (field === 'name') {
                        const cleanName = target.value.trim().toLowerCase();
                        const itemData = await fetchItemData(cleanName);
                        const autoTag = HARDCODED_TAGS[cleanName];

                        let newDesc = itemData ? (itemData.Description || itemData.Effect || "") : "";
                        if (autoTag) {
                            newDesc = newDesc ? `${newDesc}\n\n${autoTag}` : autoTag;
                        }

                        if (!item.desc || item.desc.trim() === '') {
                            item.desc = newDesc;
                            renderInventory(currentInventory, saveInventoryToToken);
                        }
                    }
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

export function setupTagBuilder(saveInventoryToToken: (inv: InventoryItem[]) => void, renderInventoryFn: Function) {
    const catSelect = document.getElementById('tag-builder-category') as HTMLSelectElement;
    const targetSelect = document.getElementById('tag-builder-target') as HTMLSelectElement;
    const typeSelect = document.getElementById('tag-builder-type') as HTMLSelectElement;
    const valueInput = document.getElementById('tag-builder-value') as HTMLInputElement;
    const valueContainer = document.getElementById('tag-builder-value-container') as HTMLElement;
    const confirmBtn = document.getElementById('tag-builder-confirm') as HTMLButtonElement;
    const cancelBtn = document.getElementById('tag-builder-cancel') as HTMLButtonElement;
    const modal = document.getElementById('tag-builder-modal');

    if (!catSelect || !targetSelect || !modal) return;

    const updateOptions = () => {
        const cat = catSelect.value;
        targetSelect.innerHTML = '';
        targetSelect.onchange = null; 
        typeSelect.style.display = 'none';
        valueContainer.style.display = 'flex';

        if (cat === 'stat') {
            ['Str', 'Dex', 'Vit', 'Spe', 'Ins', 'Tou', 'Coo', 'Bea', 'Cut', 'Cle', 'Def', 'Spd'].forEach(s => targetSelect.appendChild(new Option(s, s)));
        } else if (cat === 'skill') {
            ['Brawl', 'Channel', 'Clash', 'Evasion', 'Alert', 'Athletic', 'Nature', 'Stealth', 'Charm', 'Etiquette', 'Intimidate', 'Perform', 'Crafts', 'Lore', 'Medicine', 'Magic'].forEach(s => targetSelect.appendChild(new Option(s, s)));
        } else if (cat === 'combat') {
            ['Dmg', 'Acc', 'Init', 'Chance', 'Combo Dmg'].forEach(s => targetSelect.appendChild(new Option(s, s)));
            typeSelect.style.display = 'block'; 
            targetSelect.onchange = () => {
                if (targetSelect.value === 'Init' || targetSelect.value === 'Chance' || targetSelect.value === 'Combo Dmg') {
                    typeSelect.style.display = 'none';
                } else {
                    typeSelect.style.display = 'block';
                }
            };
            targetSelect.onchange(new Event('change'));
        } else if (cat === 'matchup') {
            ['Immune', 'Resist', 'Weak', 'Remove Immunities', 'Remove Immunity'].forEach(s => targetSelect.appendChild(new Option(s, s)));
            typeSelect.style.display = 'block';
            valueContainer.style.display = 'none'; 
            targetSelect.onchange = () => {
                if (targetSelect.value === 'Remove Immunities') {
                    typeSelect.style.display = 'none';
                } else {
                    typeSelect.style.display = 'block';
                }
            };
            targetSelect.onchange(new Event('change'));
        } else if (cat === 'mechanic') {
            ['High Crit', 'Ignore Low Acc'].forEach(s => targetSelect.appendChild(new Option(s, s)));
            targetSelect.onchange = () => {
                valueContainer.style.display = targetSelect.value === 'Ignore Low Acc' ? 'flex' : 'none';
            };
            targetSelect.onchange(new Event('change'));
        } else if (cat === 'status') {
            ['1st Degree Burn', '2nd Degree Burn', '3rd Degree Burn', 'Poison', 'Badly Poisoned', 'Paralysis', 'Sleep', 'Frozen Solid', 'Confusion', 'In Love', 'Flinch'].forEach(s => targetSelect.appendChild(new Option(s, s)));
            valueContainer.style.display = 'none';
            typeSelect.style.display = 'none';
        }
    };

    catSelect.addEventListener('change', updateOptions);
    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    confirmBtn.addEventListener('click', () => {
        const itemId = confirmBtn.dataset.itemid;
        const liveInventory = appState.currentInventory; 
        const item = liveInventory.find(i => i.id === itemId);
        
        if (!item) return;

        let tag = "";
        const cat = catSelect.value;
        const tgt = targetSelect.value;
        const typ = typeSelect.value;
        const val = parseInt(valueInput.value) || 0;
        const sign = val >= 0 ? `+${val}` : `${val}`;

        if (cat === 'stat' || cat === 'skill') {
            tag = `[${tgt} ${sign}]`;
        } else if (cat === 'combat') {
            if (tgt === 'Init') tag = `[Init ${sign}]`;
            else if (tgt === 'Chance') tag = `[Chance ${sign}]`;
            else if (tgt === 'Combo Dmg') tag = `[Combo Dmg ${sign}]`;
            else if (typ) tag = `[${tgt} ${sign}: ${typ}]`;
            else tag = `[${tgt} ${sign}]`;
        } else if (cat === 'matchup') {
            if (tgt === 'Remove Immunities') tag = `[Remove Immunities]`;
            else if (typ) tag = `[${tgt}: ${typ}]`;
            else { alert("Must select a type for matchups!"); return; }
        } else if (cat === 'mechanic') {
            if (tgt === 'High Crit') tag = `[High Crit]`;
            else if (tgt === 'Ignore Low Acc') tag = `[Ignore Low Acc ${Math.abs(val)}]`;
        } else if (cat === 'status') {
            tag = `[Status: ${tgt}]`;
        }

        if (tag) {
            item.desc = item.desc ? `${item.desc} ${tag}`.trim() : tag;
            saveInventoryToToken(liveInventory);
            renderInventoryFn(liveInventory, saveInventoryToToken);
            
            const descEl = document.querySelector(`.inv-input[data-field="desc"][data-id="${item.id}"]`) as HTMLTextAreaElement;
            if (descEl) {
                descEl.value = item.desc;
                descEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        modal.style.display = 'none';
    });

    updateOptions();
}