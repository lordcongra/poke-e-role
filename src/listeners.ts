import { setupUIListeners, updateHealthBars } from './listeners/uiListeners';
import { setupManagerListeners } from './listeners/managerListeners';
import { setupCharacterListeners } from './listeners/characterListeners';
import { setupGeneratorListeners } from './components/generator/index'; 
import { setupCombatListeners } from './listeners/combatListeners';

export { updateHealthBars };

export function setupEventListeners() {
    setupUIListeners();
    setupManagerListeners();
    setupCharacterListeners();
    setupGeneratorListeners();
    setupCombatListeners();
}