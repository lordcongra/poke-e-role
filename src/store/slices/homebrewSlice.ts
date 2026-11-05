import type { StateCreator } from 'zustand';
import type { CharacterState, HomebrewSlice } from '../storeTypes';
import {
    saveHomebrewLocal,
    loadHomebrewLocalOp,
    applyHomebrewSync,
    markHomebrewBackedUp,
    processHomebrewPayload,
    getHomebrewPayload
} from './homebrew/homebrewSyncOps';
import {
    addCustomType,
    updateCustomType,
    removeCustomType,
    duplicateCustomType,
    addCustomAbility,
    updateCustomAbility,
    removeCustomAbility,
    duplicateCustomAbility,
    addCustomMove,
    updateCustomMove,
    removeCustomMove,
    duplicateCustomMove,
    addCustomPokemon,
    updateCustomPokemon,
    removeCustomPokemon,
    duplicateCustomPokemon,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
    duplicateCustomItem,
    addCustomForm,
    updateCustomForm,
    removeCustomForm,
    duplicateCustomForm,
    addCustomStatus,
    updateCustomStatus,
    removeCustomStatus,
    duplicateCustomStatus,
    addCustomFieldEffect,
    updateCustomFieldEffect,
    removeCustomFieldEffect,
    duplicateCustomFieldEffect
} from './homebrew/homebrewCrudOps';
import {
    overwriteCustomTypeData,
    overwriteCustomAbilityData,
    overwriteCustomMoveData,
    overwriteCustomPokemonData,
    overwriteCustomItemData,
    overwriteCustomFormData,
    overwriteCustomStatusData,
    overwriteCustomFieldEffectData,
    overwriteAllHomebrewData,
    mergeCustomTypeData,
    mergeCustomAbilityData,
    mergeCustomMoveData,
    mergeCustomPokemonData,
    mergeCustomItemData,
    mergeCustomFormData,
    mergeCustomStatusData,
    mergeCustomFieldEffectData,
    mergeAllHomebrewData
} from './homebrew/homebrewMergeOps';

export const createHomebrewSlice: StateCreator<
    CharacterState,
    [['zustand/devtools', never]],
    [],
    HomebrewSlice
> = (set, get) => ({
    isHomebrewInitialized: false,
    roomCustomTypes: [],
    roomCustomAbilities: [],
    roomCustomMoves: [],
    roomCustomPokemon: [],
    roomCustomItems: [],
    roomCustomForms: [],
    roomCustomStatuses: [],
    roomCustomFieldEffects: [],
    needsBackup: false,

    loadHomebrewLocal: () => loadHomebrewLocalOp(set, get),
    applyHomebrewSync: (payload) => applyHomebrewSync(set, payload),
    markHomebrewBackedUp: () => markHomebrewBackedUp(set, get),
    processHomebrewPayload: (payload) => processHomebrewPayload(set, get, payload),
    getHomebrewPayload: () => getHomebrewPayload(get),

    setRoomCustomTypes: (types) => {
        set({ roomCustomTypes: types, needsBackup: true }, false, 'homebrew/setRoomCustomTypes');
        saveHomebrewLocal(get());
    },
    setRoomCustomAbilities: (abilities) => {
        set({ roomCustomAbilities: abilities, needsBackup: true }, false, 'homebrew/setRoomCustomAbilities');
        saveHomebrewLocal(get());
    },
    setRoomCustomMoves: (moves) => {
        set({ roomCustomMoves: moves, needsBackup: true }, false, 'homebrew/setRoomCustomMoves');
        saveHomebrewLocal(get());
    },
    setRoomCustomPokemon: (pokemon) => {
        set({ roomCustomPokemon: pokemon, needsBackup: true }, false, 'homebrew/setRoomCustomPokemon');
        saveHomebrewLocal(get());
    },
    setRoomCustomItems: (items) => {
        set({ roomCustomItems: items, needsBackup: true }, false, 'homebrew/setRoomCustomItems');
        saveHomebrewLocal(get());
    },
    setRoomCustomForms: (forms) => {
        set({ roomCustomForms: forms, needsBackup: true }, false, 'homebrew/setRoomCustomForms');
        saveHomebrewLocal(get());
    },
    setRoomCustomStatuses: (statuses) => {
        set({ roomCustomStatuses: statuses, needsBackup: true }, false, 'homebrew/setRoomCustomStatuses');
        saveHomebrewLocal(get());
    },
    setRoomCustomFieldEffects: (effects) => {
        set({ roomCustomFieldEffects: effects, needsBackup: true }, false, 'homebrew/setRoomCustomFieldEffects');
        saveHomebrewLocal(get());
    },

    addCustomType: (typeObject) => addCustomType(set, get, typeObject),
    updateCustomType: (oldName, newType) => updateCustomType(set, get, oldName, newType),
    removeCustomType: (name) => removeCustomType(set, get, name),
    duplicateCustomType: (name) => duplicateCustomType(set, get, name),

    addCustomAbility: () => addCustomAbility(set, get),
    updateCustomAbility: (id, field, value) => updateCustomAbility(set, get, id, field, value),
    removeCustomAbility: (id) => removeCustomAbility(set, get, id),
    duplicateCustomAbility: (id) => duplicateCustomAbility(set, get, id),

    addCustomMove: () => addCustomMove(set, get),
    updateCustomMove: (id, field, value) => updateCustomMove(set, get, id, field, value),
    removeCustomMove: (id) => removeCustomMove(set, get, id),
    duplicateCustomMove: (id) => duplicateCustomMove(set, get, id),

    addCustomPokemon: (initialData) => addCustomPokemon(set, get, initialData),
    updateCustomPokemon: (id, field, value) => updateCustomPokemon(set, get, id, field, value),
    removeCustomPokemon: (id) => removeCustomPokemon(set, get, id),
    duplicateCustomPokemon: (id) => duplicateCustomPokemon(set, get, id),

    addCustomItem: () => addCustomItem(set, get),
    updateCustomItem: (id, field, value) => updateCustomItem(set, get, id, field, value),
    removeCustomItem: (id) => removeCustomItem(set, get, id),
    duplicateCustomItem: (id) => duplicateCustomItem(set, get, id),

    addCustomForm: (template) => addCustomForm(set, get, template),
    updateCustomForm: (id, field, value) => updateCustomForm(set, get, id, field, value),
    removeCustomForm: (id) => removeCustomForm(set, get, id),
    duplicateCustomForm: (id) => duplicateCustomForm(set, get, id),

    addCustomStatus: () => addCustomStatus(set, get),
    updateCustomStatus: (id, field, value) => updateCustomStatus(set, get, id, field, value),
    removeCustomStatus: (id) => removeCustomStatus(set, get, id),
    duplicateCustomStatus: (id) => duplicateCustomStatus(set, get, id),

    addCustomFieldEffect: (initialData) => addCustomFieldEffect(set, get, initialData),
    updateCustomFieldEffect: (id, field, value) => updateCustomFieldEffect(set, get, id, field, value),
    removeCustomFieldEffect: (id) => removeCustomFieldEffect(set, get, id),
    duplicateCustomFieldEffect: (id) => duplicateCustomFieldEffect(set, get, id),

    overwriteCustomTypeData: (types) => overwriteCustomTypeData(set, get, types),
    overwriteCustomAbilityData: (abilities) => overwriteCustomAbilityData(set, get, abilities),
    overwriteCustomMoveData: (moves) => overwriteCustomMoveData(set, get, moves),
    overwriteCustomPokemonData: (pokemon) => overwriteCustomPokemonData(set, get, pokemon),
    overwriteCustomItemData: (items) => overwriteCustomItemData(set, get, items),
    overwriteCustomFormData: (forms) => overwriteCustomFormData(set, get, forms),
    overwriteCustomStatusData: (statuses) => overwriteCustomStatusData(set, get, statuses),
    overwriteCustomFieldEffectData: (effects) => overwriteCustomFieldEffectData(set, get, effects),
    overwriteAllHomebrewData: (types, abilities, moves, pokemon, items, forms, statuses, fieldEffects) =>
        overwriteAllHomebrewData(set, get, types, abilities, moves, pokemon, items, forms, statuses, fieldEffects),

    mergeCustomTypeData: (types) => mergeCustomTypeData(set, get, types),
    mergeCustomAbilityData: (abilities) => mergeCustomAbilityData(set, get, abilities),
    mergeCustomMoveData: (moves) => mergeCustomMoveData(set, get, moves),
    mergeCustomPokemonData: (pokemon) => mergeCustomPokemonData(set, get, pokemon),
    mergeCustomItemData: (items) => mergeCustomItemData(set, get, items),
    mergeCustomFormData: (forms) => mergeCustomFormData(set, get, forms),
    mergeCustomStatusData: (statuses) => mergeCustomStatusData(set, get, statuses),
    mergeCustomFieldEffectData: (effects) => mergeCustomFieldEffectData(set, get, effects),
    mergeAllHomebrewData: (types, abilities, moves, pokemon, items, forms, statuses, silent, fieldEffects) =>
        mergeAllHomebrewData(set, get, types, abilities, moves, pokemon, items, forms, statuses, silent, fieldEffects)
});
