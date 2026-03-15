import './style.css';
import OBR from "@owlbear-rodeo/sdk";
import { loadUrlLists } from './api';
import { setupSpinners, renderStatuses, renderEffects, renderCustomInfo, renderTypeMatchups } from './ui';
import { setupOBR } from './obr';
import { appState, saveDataToToken } from './state';
import { rollStatus, setupCombatListeners } from './combat';
import { calculateStats } from './math';
import { sheetView } from './view';

import { loadDataFromToken, initializeRoomSync } from './sync';
import { setupEventListeners } from './listeners';

// 1. Initialize UI and Local Lists
loadUrlLists();
setupSpinners();
setupCombatListeners();
setupEventListeners();

renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus); 
renderEffects(appState.currentEffects, saveDataToToken);
renderCustomInfo(appState.currentCustomInfo, saveDataToToken);
const initialTyping = sheetView.identity.typing.value || "";
renderTypeMatchups(initialTyping);
calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);

// 2. Connect to Owlbear Rodeo Data
setupOBR((tokenId) => {
    loadDataFromToken(tokenId);
});

// 3. Start the App!
OBR.onReady(() => {
    initializeRoomSync();
});