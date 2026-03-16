import OBR from "@owlbear-rodeo/sdk";
import { generateId } from '../utils';
import { calculateStats } from '../math';
import { sheetView } from '../view';
import { renderStatuses, renderEffects, renderCustomInfo, renderInventory, updateInventoryUI } from '../ui';
import { saveBatchDataToToken, saveMovesToToken, saveInventoryToToken, saveExtraSkillsToToken, saveSkillChecksToToken, repairTrackers } from '../obr';
import { appState, syncDerivedStats, saveDataToToken } from '../state';
import { rollStatus } from '../combat';
import { reRenderMoves, reRenderSkillChecks } from '../sync';
import { updateHealthBars } from './uiListeners';

export function setupManagerListeners() {

    // --- IMPORT / EXPORT LOGIC ---
    document.getElementById('export-btn')?.addEventListener('click', () => {
        const dataStr = JSON.stringify(appState.currentTokenData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nickname = (document.getElementById('nickname') as HTMLInputElement)?.value;
        const species = (document.getElementById('species') as HTMLInputElement)?.value;
        const name = nickname || species || "character";
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    const importFile = document.getElementById('import-file') as HTMLInputElement;
    document.getElementById('import-btn')?.addEventListener('click', () => {
        importFile?.click();
    });
    
    importFile?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const importedData = JSON.parse(ev.target?.result as string);
                if(confirm("Import character data? This will completely overwrite the current token.")) {
                    Object.assign(appState.currentTokenData, importedData);
                    saveBatchDataToToken(importedData);
                    OBR.notification.show("📥 Character imported successfully! Reloading sheet...");
                    setTimeout(() => window.location.reload(), 500);
                }
            } catch(err) {
                alert("Invalid JSON file.");
            }
            importFile.value = ''; 
        };
        reader.readAsText(file);
    });

    // --- DELEGATED INVENTORY LISTENER ---
    const invTableBody = document.getElementById('inventory-table-body');
    if (invTableBody) {
        invTableBody.addEventListener('change', () => {
            setTimeout(() => {
                calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
                syncDerivedStats();
                repairTrackers();
                updateHealthBars();
            }, 50);
        });
        
        invTableBody.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('del-item-btn')) {
                setTimeout(() => {
                    updateInventoryUI(appState.currentInventory);
                    calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
                    syncDerivedStats();
                    repairTrackers();
                    updateHealthBars();
                }, 50);
            }
        });
    }

    // --- ADD BUTTONS ---
    document.getElementById('add-status-btn')?.addEventListener('click', () => {
        appState.currentStatuses.push({ id: generateId(), name: "Healthy", customName: "", rounds: 0 });
        renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus);
        saveDataToToken('status-list', JSON.stringify(appState.currentStatuses));
    });

    document.getElementById('add-effect-btn')?.addEventListener('click', () => {
        appState.currentEffects.push({ id: generateId(), name: "", rounds: 0 });
        renderEffects(appState.currentEffects, saveDataToToken);
        saveDataToToken('effects-data', JSON.stringify(appState.currentEffects));
    });

    document.getElementById('add-custom-info-btn')?.addEventListener('click', () => {
        appState.currentCustomInfo.push({ id: generateId(), label: 'New Field', value: '' });
        renderCustomInfo(appState.currentCustomInfo, saveDataToToken);
        saveDataToToken('custom-info-data', JSON.stringify(appState.currentCustomInfo));
    });

    document.getElementById('add-cat-btn')?.addEventListener('click', () => {
        const categoryId = "cat_" + generateId();
        appState.currentExtraCategories.push({
            id: categoryId, name: "EXTRA",
            skills: [
                { id: categoryId + "_1", name: "", base: 0, buff: 0 }, { id: categoryId + "_2", name: "", base: 0, buff: 0 },
                { id: categoryId + "_3", name: "", base: 0, buff: 0 }, { id: categoryId + "_4", name: "", base: 0, buff: 0 }
            ]
        });
        // We trigger a re-render by saving and reloading via the view lifecycle in sync
        saveExtraSkillsToToken(appState.currentExtraCategories);
        setTimeout(() => window.location.reload(), 100);
    });

    document.getElementById('add-move-btn')?.addEventListener('click', () => {
        if (appState.currentMoves.length >= 20) { alert("You've reached the max of 20 moves."); return; }
        appState.currentMoves.push({ id: generateId(), name: '', attr: 'str', skill: 'brawl', type: '', cat: 'Phys', dmg: '', power: 0, dmgStat: '' });
        reRenderMoves();
        saveMovesToToken(appState.currentMoves);
    });
    
    document.getElementById('add-skill-check-btn')?.addEventListener('click', () => {
        if (appState.currentSkillChecks.length >= 10) { alert("You've reached the max of 10 Custom Action Rolls."); return; }
        appState.currentSkillChecks.push({ id: generateId(), name: '', attr: 'ins', skill: 'none' });
        reRenderSkillChecks();
        saveSkillChecksToToken(appState.currentSkillChecks);
    });

    document.getElementById('add-item-btn')?.addEventListener('click', () => {
        appState.currentInventory.push({ id: generateId(), qty: 1, name: '', desc: '', active: false });
        renderInventory(appState.currentInventory, saveInventoryToToken); 
        saveInventoryToToken(appState.currentInventory);
        updateInventoryUI(appState.currentInventory);
    });

    // --- ROUND RESET & REST ---
    document.getElementById('reset-round-btn')?.addEventListener('click', () => {
        sheetView.trackers.actions.value = "0";
        sheetView.trackers.evade.checked = false;
        sheetView.trackers.clash.checked = false;
        sheetView.trackers.fate.value = "0";
        sheetView.trackers.chances.value = "0";
        
        let updates: Record<string, string | number | boolean> = { 
            'actions-used': 0, 'evasions-used': false, 'clashes-used': false, 'chances-used': 0, 'fate-used': 0
        }; 

        let timersChanged = false;
        appState.currentEffects.forEach(e => {
            if (e.rounds > 0) { e.rounds--; timersChanged = true; }
        });

        if (timersChanged) {
            renderEffects(appState.currentEffects, saveDataToToken);
            updates['effects-data'] = JSON.stringify(appState.currentEffects);
        }

        Object.assign(appState.currentTokenData, updates);
        saveBatchDataToToken(updates);

        let movesChanged = false;
        appState.currentMoves.forEach(m => {
            if (m.used) { m.used = false; movesChanged = true; }
        });
        
        if (movesChanged) {
            reRenderMoves();
            saveMovesToToken(appState.currentMoves);
        }
    });

    document.getElementById('long-rest-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('rest-modal');
        if (modal) modal.style.display = 'flex';
    });

    document.getElementById('rest-cancel-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('rest-modal');
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('rest-confirm-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('rest-modal');
        if (modal) modal.style.display = 'none';

        const maxHp = document.getElementById('hp-max-display')?.innerText || "0";
        const maxWill = document.getElementById('will-max-display')?.innerText || "0";
        
        sheetView.health.hp.curr.value = maxHp;
        sheetView.health.will.curr.value = maxWill;
        sheetView.globalMods.ignoredPain.value = "0";

        appState.currentStatuses = appState.currentStatuses.filter(s => s.name === "Healthy");
        
        const updates: Record<string, string | number | boolean> = {
            'hp-curr': parseInt(maxHp),
            'will-curr': parseInt(maxWill),
            'ignored-pain-mod': 0,
            'status-list': JSON.stringify(appState.currentStatuses)
        };

        renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus);
        Object.assign(appState.currentTokenData, updates);
        saveBatchDataToToken(updates);
        syncDerivedStats();
        updateHealthBars();
        
        OBR.notification.show("🏕️ Long Rest complete! HP, Will, and Statuses restored.");
    });
}