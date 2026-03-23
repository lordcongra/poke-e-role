import OBR from "@owlbear-rodeo/sdk";
import { sheetView } from '../view';
import { calculateStats } from '../math';
import { updatePainUI, updateInventoryUI } from '../ui';
import { appState, syncDerivedStats, saveDataToToken } from '../state';
import { ROOM_META_ID } from '../sync';
import { updateHealthBars } from './uiListeners';
import { DEFAULT_COLOR_ACT, DEFAULT_COLOR_EVA, DEFAULT_COLOR_CLA } from '../managers/graphicsManager';
import { 
    handleTypeChange, 
    handleFormSwap, 
    handleSheetTypeChange, 
    handleSpeciesChange, 
    handleRefreshData 
} from '../managers/characterManager';

export function setupCharacterListeners() {
    
    // --- CUSTOM TYPING LISTENER ---
    ['type1', 'type2'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', handleTypeChange);
    });

    // --- FORM SHIFT (MEGA EVOLUTION) TOGGLE ---
    const formSwapBtn = document.getElementById('form-swap-btn');
    if (formSwapBtn) {
        formSwapBtn.addEventListener('click', handleFormSwap);
        setInterval(() => {
            const isAlt = (appState.currentTokenData['is-alt-form'] as boolean) === true;
            formSwapBtn.style.backgroundColor = isAlt ? '#8e44ad' : '';
            formSwapBtn.title = isAlt ? "Swap to Base Form" : "Swap to Alt Form";
        }, 1000);
    }

    // --- COLOR RESET LISTENER ---
    document.getElementById('reset-colors-btn')?.addEventListener('click', () => {
        const actInput = document.getElementById('color-act') as HTMLInputElement;
        const evaInput = document.getElementById('color-eva') as HTMLInputElement;
        const claInput = document.getElementById('color-cla') as HTMLInputElement;
        
        if (actInput) actInput.value = DEFAULT_COLOR_ACT;
        if (evaInput) evaInput.value = DEFAULT_COLOR_EVA;
        if (claInput) claInput.value = DEFAULT_COLOR_CLA;

        const updates = {
            'color-act': DEFAULT_COLOR_ACT,
            'color-eva': DEFAULT_COLOR_EVA,
            'color-cla': DEFAULT_COLOR_CLA
        };

        Object.assign(appState.currentTokenData, updates);
        for (const [key, value] of Object.entries(updates)) {
            saveDataToToken(key, value);
        }
    });

    // --- BASIC FIELD LISTENERS ---
    const listenerInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.sheet-save');
    listenerInputs.forEach(element => {
        if (['ability', 'is-npc', 'species', 'typing'].includes(element.id)) return; 

        element.addEventListener('input', () => calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory));
        
        element.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            let valToSave: string | number | boolean = target.type === 'number' ? (parseFloat(target.value) || 0) : target.type === 'checkbox' ? target.checked : target.value;
            
            appState.currentTokenData[target.id] = valToSave;
            saveDataToToken(target.id, valToSave);
            syncDerivedStats(); 
            updateHealthBars();
            if (target.classList.contains('inv-input')) updateInventoryUI(appState.currentInventory);
        });
    });

    // --- GM & TRACKER TOGGLES ---
    document.getElementById('is-npc')?.addEventListener('change', (e) => {
        saveDataToToken('is-npc', (e.target as HTMLInputElement).checked ? "true" : "false");
    });

    document.getElementById('show-trackers')?.addEventListener('change', (e) => {
        saveDataToToken('show-trackers', (e.target as HTMLInputElement).checked);
        syncDerivedStats();
    });

    // --- HEAVY MANAGED LISTENERS ---
    sheetView.identity.sheetType.addEventListener('change', (e) => {
        handleSheetTypeChange((e.target as HTMLSelectElement).value);
    });

    sheetView.identity.species.addEventListener('change', handleSpeciesChange);

    document.getElementById('refresh-data-btn')?.addEventListener('click', async (e) => {
        await handleRefreshData(e.currentTarget as HTMLButtonElement);
    });

    // --- ABILITY INFO & ROOM SETTINGS ---
    sheetView.identity.ability.addEventListener('change', async (e) => {
        const val = (e.target as HTMLInputElement).value;
        const infoBtn = document.getElementById('ability-info-btn');
        if (infoBtn) {
            infoBtn.setAttribute('data-title', val || "Ability");
            infoBtn.setAttribute('data-desc', "Click to load description.");
        }
        saveDataToToken('ability', val);
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
        updateHealthBars();
    });

    sheetView.identity.roomRuleset.addEventListener('change', async (e) => {
        const val = (e.target as HTMLSelectElement).value;
        const meta = await OBR.room.getMetadata();
        // FIX: Cast as Record<string, unknown> safely
        const roomMeta = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
        await OBR.room.setMetadata({ [ROOM_META_ID]: { ...roomMeta, ruleset: val } });
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
        syncDerivedStats();
        updateHealthBars();
    });

    sheetView.identity.roomPain.addEventListener('change', async (e) => {
        const isEnabled = (e.target as HTMLSelectElement).value === 'true';
        const meta = await OBR.room.getMetadata();
        // FIX: Cast as Record<string, unknown> safely
        const roomMeta = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
        await OBR.room.setMetadata({ [ROOM_META_ID]: { ...roomMeta, painEnabled: isEnabled } });
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
        // FIX: updatePainUI takes 0 arguments!
        updatePainUI();
        syncDerivedStats();
        updateHealthBars();
    });
}