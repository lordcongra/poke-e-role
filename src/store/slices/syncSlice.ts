import type { StateCreator } from 'zustand';
import type { CharacterState, SyncSlice } from '../storeTypes';
import { hydrateStateFromMetadata } from '../../utils/sync/stateMapper';

export const createSyncSlice: StateCreator<CharacterState, [], [], SyncSlice> = (set) => ({
    loadFromOwlbear: (meta) =>
        set((state) => ({
            ...state,
            ...hydrateStateFromMetadata(meta, state)
        }))
});
