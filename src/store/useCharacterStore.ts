// src/store/useCharacterStore.ts
import { create } from 'zustand';
import type { CharacterState, Rank } from './storeTypes';
import { createCoreSlice } from './slices/coreSlice';
import { createMovesSlice } from './slices/movesSlice';
import { createInventorySlice } from './slices/inventorySlice';
import { createTrackerSlice } from './slices/trackerSlice';
import { createHomebrewSlice } from './slices/homebrewSlice';
import { createIdentitySlice } from './slices/identitySlice';
import { createMacroSlice } from './slices/macroSlice';
import { createSyncSlice } from './slices/syncSlice';

export * from './storeTypes';

export const getRankPoints = (rank: Rank) => {
    switch (rank) {
        case 'Starter': return { core: 0, social: 0, skills: 5, skillLimit: 1 }; 
        case 'Rookie': return { core: 2, social: 2, skills: 10, skillLimit: 2 };
        case 'Standard': return { core: 4, social: 4, skills: 14, skillLimit: 3 }; 
        case 'Advanced': return { core: 6, social: 6, skills: 17, skillLimit: 4 };
        case 'Expert': return { core: 8, social: 8, skills: 19, skillLimit: 5 }; 
        case 'Ace': return { core: 10, social: 10, skills: 20, skillLimit: 5 };
        case 'Master': return { core: 10, social: 10, skills: 22, skillLimit: 5 }; 
        case 'Champion': return { core: 14, social: 14, skills: 25, skillLimit: 5 };
        default: return { core: 0, social: 0, skills: 0, skillLimit: 1 };
    }
};

export const getAgePoints = (age: string) => {
    switch (age) {
        case 'Teen': return { core: 2, social: 2 };
        case 'Adult': return { core: 4, social: 4 };
        case 'Senior': return { core: 3, social: 6 };
        default: return { core: 0, social: 0 };
    }
};

export const useCharacterStore = create<CharacterState>()((set, get, api) => ({
    ...createCoreSlice(set, get, api),
    ...createMovesSlice(set, get, api),
    ...createInventorySlice(set, get, api),
    ...createTrackerSlice(set, get, api),
    ...createHomebrewSlice(set, get, api),
    ...createIdentitySlice(set, get, api),
    ...createMacroSlice(set, get, api),
    ...createSyncSlice(set, get, api)
}));