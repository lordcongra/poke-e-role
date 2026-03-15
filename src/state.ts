import type { Move, InventoryItem, ExtraCategory, CustomInfo, StatusItem, EffectItem } from './@types/index';
import { generateId } from './utils';
import { saveBatchDataToToken } from './obr';

export const appState = {
    currentMoves: [] as Move[],
    currentInventory: [] as InventoryItem[],
    currentExtraCategories: [] as ExtraCategory[],
    currentStatuses: [{ id: generateId(), name: "Healthy", customName: "", rounds: 0 }] as StatusItem[],
    currentEffects: [] as EffectItem[],
    currentCustomInfo: [] as CustomInfo[],
    currentTokenData: {} as Record<string, any>,
    pendingDamageMove: null as Move | null
};

export function saveDataToToken(id: string, value: any) {
    saveBatchDataToToken({ [id]: value });
}

export function syncDerivedStats() {
    const updates: Record<string, any> = {};
    let hasChanges = false;
    
    const checkAndAdd = (id: string, val: any) => {
        if (appState.currentTokenData[id] !== val) {
            updates[id] = val;
            hasChanges = true;
            appState.currentTokenData[id] = val;
        }
    };

    const spans = document.querySelectorAll<HTMLElement>('span[id$="-display"], span[id$="-total"], span[id$="-derived"], td[id$="-total"]');
    spans.forEach(span => {
        if (span.id) checkAndAdd(span.id, parseInt(span.innerText) || 0);
    });

    ['actions-used', 'hp-curr', 'will-curr', 'hp-base', 'will-base', 'happiness-curr', 'loyalty-curr', 'ignored-pain-mod', 'global-succ-mod', 'chances-used', 'fate-used'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) checkAndAdd(id, parseFloat(el.value) || 0);
    });

    ['evasions-used', 'clashes-used'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) checkAndAdd(id, el.checked);
    });

    if (hasChanges) {
        saveBatchDataToToken(updates);
    }
}