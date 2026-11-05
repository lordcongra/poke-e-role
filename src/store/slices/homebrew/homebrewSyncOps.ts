import type { StateCreator } from 'zustand';
import type { CharacterState, HomebrewSlice } from '@/store/storeTypes';
import type { HomebrewPayload } from '@/types/homebrewTypes';
import { homebrewStorage, type HomebrewStorageData } from '@/utils/sync/homebrewStorage';
import { syncHomebrewToApi } from '@/utils/api/api';

export type HomebrewSet = Parameters<
    StateCreator<CharacterState, [['zustand/devtools', never]], [], HomebrewSlice>
>[0];

export type HomebrewGet = Parameters<
    StateCreator<CharacterState, [['zustand/devtools', never]], [], HomebrewSlice>
>[1];

export const saveHomebrewLocal = (state: CharacterState): void => {
    if (!state.isHomebrewInitialized) return;
    try {
        const data: HomebrewStorageData = {
            customTypes: state.roomCustomTypes,
            customAbilities: state.roomCustomAbilities,
            customMoves: state.roomCustomMoves,
            customPokemon: state.roomCustomPokemon,
            customItems: state.roomCustomItems,
            customForms: state.roomCustomForms,
            customStatuses: state.roomCustomStatuses,
            customFieldEffects: state.roomCustomFieldEffects,
            needsBackup: state.needsBackup
        };
        homebrewStorage.saveHomebrew(data).catch((error) => {
            console.error('[HomebrewSlice] Failed to save homebrew data to storage.', error);
        });
    } catch (error) {
        console.error('[HomebrewSlice] Failed to queue save homebrew data.', error);
    }
};

export const loadHomebrewLocalOp = async (set: HomebrewSet, _get: HomebrewGet): Promise<void> => {
    try {
        const data = await homebrewStorage.loadHomebrew();
        if (data) {
            const types = data.customTypes || [];
            const abilities = data.customAbilities || [];
            const moves = data.customMoves || [];
            const pokemon = data.customPokemon || [];
            const items = data.customItems || [];
            const forms = data.customForms || [];
            const statuses = data.customStatuses || [];
            const fieldEffects = data.customFieldEffects || [];
            const needsBkp = data.needsBackup || false;

            set(
                {
                    roomCustomTypes: types,
                    roomCustomAbilities: abilities,
                    roomCustomMoves: moves,
                    roomCustomPokemon: pokemon,
                    roomCustomItems: items,
                    roomCustomForms: forms,
                    roomCustomStatuses: statuses,
                    roomCustomFieldEffects: fieldEffects,
                    needsBackup: needsBkp,
                    isHomebrewInitialized: true
                },
                false,
                'homebrew/loadLocal'
            );

            syncHomebrewToApi(pokemon, moves, abilities, items);
        }
    } catch (error) {
        console.error('[HomebrewSlice] Failed to load homebrew data from storage.', error);
    } finally {
        set({ isHomebrewInitialized: true }, false, 'homebrew/initComplete');
    }
};

export const applyHomebrewSync = (
    set: HomebrewSet,
    payload: HomebrewPayload & { needsBackup?: boolean }
): void => {
    const types = payload.customTypes || [];
    const abilities = payload.customAbilities || [];
    const moves = payload.customMoves || [];
    const pokemon = payload.customPokemon || [];
    const items = payload.customItems || [];
    const forms = payload.customForms || [];
    const statuses = payload.customStatuses || [];
    const fieldEffects = payload.customFieldEffects || [];
    const needsBkp = payload.needsBackup ?? false;

    set(
        {
            roomCustomTypes: types,
            roomCustomAbilities: abilities,
            roomCustomMoves: moves,
            roomCustomPokemon: pokemon,
            roomCustomItems: items,
            roomCustomForms: forms,
            roomCustomStatuses: statuses,
            roomCustomFieldEffects: fieldEffects,
            needsBackup: needsBkp
        },
        false,
        'homebrew/applySync'
    );

    syncHomebrewToApi(pokemon, moves, abilities, items);
};

export const markHomebrewBackedUp = (set: HomebrewSet, get: HomebrewGet): void => {
    set({ needsBackup: false }, false, 'homebrew/markBackedUp');
    saveHomebrewLocal(get());
};

export const processHomebrewPayload = (
    set: HomebrewSet,
    get: HomebrewGet,
    payload: HomebrewPayload
): void => {
    set(
        {
            roomCustomTypes: payload.customTypes || [],
            roomCustomAbilities: payload.customAbilities || [],
            roomCustomMoves: payload.customMoves || [],
            roomCustomPokemon: payload.customPokemon || [],
            roomCustomItems: payload.customItems || [],
            roomCustomForms: payload.customForms || [],
            roomCustomStatuses: payload.customStatuses || [],
            roomCustomFieldEffects: payload.customFieldEffects || [],
            needsBackup: true
        },
        false,
        'homebrew/processPayload'
    );
    syncHomebrewToApi(
        payload.customPokemon || [],
        payload.customMoves || [],
        payload.customAbilities || [],
        payload.customItems || []
    );
    saveHomebrewLocal(get());
};

export const getHomebrewPayload = (get: HomebrewGet): HomebrewPayload => {
    const state = get();
    return {
        customTypes: state.roomCustomTypes,
        customAbilities: state.roomCustomAbilities,
        customMoves: state.roomCustomMoves,
        customPokemon: state.roomCustomPokemon,
        customItems: state.roomCustomItems,
        customForms: state.roomCustomForms,
        customStatuses: state.roomCustomStatuses,
        customFieldEffects: state.roomCustomFieldEffects
    };
};
