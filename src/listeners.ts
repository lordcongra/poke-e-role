import { setupUIListeners, updateHealthBars } from './listeners/uiListeners';
import { setupManagerListeners } from './listeners/managerListeners';
import { setupCharacterListeners } from './listeners/characterListeners';

// Re-export updateHealthBars so that main.ts and sync.ts can still use it!
export { updateHealthBars };

export function setupEventListeners() {
    setupUIListeners();
    setupManagerListeners();
    setupCharacterListeners();
}