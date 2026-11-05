import type {
    CustomType,
    CustomAbility,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus,
    CustomFieldEffect
} from '@/types/homebrewTypes';
import { syncHomebrewToApi } from '@/utils/api/api';
import { saveHomebrewLocal, type HomebrewSet, type HomebrewGet } from './homebrewSyncOps';
import {
    findUniqueCopyName,
    updateItemField,
    filterOutById,
    duplicateEntity,
    createDefaultCustomPokemon,
    createDefaultCustomForm,
    createDefaultCustomMove,
    createDefaultCustomItem,
    createDefaultCustomStatus,
    createDefaultCustomFieldEffect
} from './homebrewEntityUtils';

// ----------------- Custom Type Ops -----------------

export function addCustomType(set: HomebrewSet, get: HomebrewGet, typeObject: CustomType): void {
    const currentTypes = get().roomCustomTypes;
    if (currentTypes.find((customType) => customType.name.toLowerCase() === typeObject.name.toLowerCase())) return;
    const newTypes = [...currentTypes, typeObject];
    set({ roomCustomTypes: newTypes, needsBackup: true }, false, 'homebrew/addCustomType');
    saveHomebrewLocal(get());
}

export function updateCustomType(
    set: HomebrewSet,
    get: HomebrewGet,
    oldName: string,
    newType: CustomType
): void {
    const currentTypes = get().roomCustomTypes;
    const newTypes = currentTypes.map((customType) => (customType.name === oldName ? newType : customType));
    set({ roomCustomTypes: newTypes, needsBackup: true }, false, 'homebrew/updateCustomType');
    saveHomebrewLocal(get());
}

export function removeCustomType(set: HomebrewSet, get: HomebrewGet, name: string): void {
    const newTypes = get().roomCustomTypes.filter((customType) => customType.name !== name);
    set({ roomCustomTypes: newTypes, needsBackup: true }, false, 'homebrew/removeCustomType');
    saveHomebrewLocal(get());
}

export function duplicateCustomType(set: HomebrewSet, get: HomebrewGet, name: string): void {
    const currentTypes = get().roomCustomTypes;
    const target = currentTypes.find((t) => t.name === name);
    if (!target) return;

    const copyName = findUniqueCopyName(currentTypes.map((t) => t.name), target.name);
    const newType = { ...target, name: copyName };
    const newTypes = [...currentTypes, newType];
    set({ roomCustomTypes: newTypes, needsBackup: true }, false, 'homebrew/duplicateCustomType');
    saveHomebrewLocal(get());
}

// ----------------- Custom Ability Ops -----------------

export function addCustomAbility(set: HomebrewSet, get: HomebrewGet): void {
    const newAbilities: CustomAbility[] = [
        ...get().roomCustomAbilities,
        { id: crypto.randomUUID(), name: 'New Ability', description: '', effect: '' }
    ];
    set({ roomCustomAbilities: newAbilities, needsBackup: true }, false, 'homebrew/addCustomAbility');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function updateCustomAbility<K extends keyof CustomAbility>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomAbility[K]
): void {
    const newAbilities = updateItemField(get().roomCustomAbilities, id, field, value);
    const updatedAbility = newAbilities.find((a) => a.id === id);
    set({ roomCustomAbilities: newAbilities, needsBackup: true }, false, 'homebrew/updateCustomAbility');
    if (
        updatedAbility &&
        get().identity.ability?.trim().toLowerCase() === updatedAbility.name.trim().toLowerCase()
    ) {
        const customTags = `${updatedAbility.effect || ''} ${updatedAbility.description || ''}`.trim();
        get().setIdentity('abilityTags', customTags);
    }
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function removeCustomAbility(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newAbilities = filterOutById(get().roomCustomAbilities, id);
    set({ roomCustomAbilities: newAbilities, needsBackup: true }, false, 'homebrew/removeCustomAbility');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function duplicateCustomAbility(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newAbilities = duplicateEntity(
        get().roomCustomAbilities,
        id,
        (a) => a.name,
        (target, name, newId) => ({ ...target, id: newId, name })
    );
    if (!newAbilities) return;
    set({ roomCustomAbilities: newAbilities, needsBackup: true }, false, 'homebrew/duplicateCustomAbility');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

// ----------------- Custom Move Ops -----------------

export function addCustomMove(set: HomebrewSet, get: HomebrewGet): void {
    const newMoves: CustomMove[] = [...get().roomCustomMoves, createDefaultCustomMove()];
    set({ roomCustomMoves: newMoves, needsBackup: true }, false, 'homebrew/addCustomMove');
    syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function updateCustomMove<K extends keyof CustomMove>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomMove[K]
): void {
    const newMoves = updateItemField(get().roomCustomMoves, id, field, value);
    set({ roomCustomMoves: newMoves, needsBackup: true }, false, 'homebrew/updateCustomMove');
    syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function removeCustomMove(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newMoves = filterOutById(get().roomCustomMoves, id);
    set({ roomCustomMoves: newMoves, needsBackup: true }, false, 'homebrew/removeCustomMove');
    syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function duplicateCustomMove(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newMoves = duplicateEntity(
        get().roomCustomMoves,
        id,
        (m) => m.name,
        (target, name, newId) => ({ ...target, id: newId, name })
    );
    if (!newMoves) return;
    set({ roomCustomMoves: newMoves, needsBackup: true }, false, 'homebrew/duplicateCustomMove');
    syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

// ----------------- Custom Pokémon Ops -----------------

export function addCustomPokemon(
    set: HomebrewSet,
    get: HomebrewGet,
    initialData?: Partial<CustomPokemon>
): void {
    const newPokemonItem = createDefaultCustomPokemon(get().roomCustomPokemon, initialData);
    const newPokemon = [...get().roomCustomPokemon, newPokemonItem];
    set({ roomCustomPokemon: newPokemon, needsBackup: true }, false, 'homebrew/addCustomPokemon');
    syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function updateCustomPokemon<K extends keyof CustomPokemon>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomPokemon[K]
): void {
    const newPokemon = updateItemField(get().roomCustomPokemon, id, field, value);
    set({ roomCustomPokemon: newPokemon, needsBackup: true }, false, 'homebrew/updateCustomPokemon');
    syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function removeCustomPokemon(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newPokemon = filterOutById(get().roomCustomPokemon, id);
    set({ roomCustomPokemon: newPokemon, needsBackup: true }, false, 'homebrew/removeCustomPokemon');
    syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function duplicateCustomPokemon(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newPokemon = duplicateEntity(
        get().roomCustomPokemon,
        id,
        (p) => p.Name,
        (target, name, newId) => ({ ...target, id: newId, Name: name }),
        2,
        true
    );
    if (!newPokemon) return;
    set({ roomCustomPokemon: newPokemon, needsBackup: true }, false, 'homebrew/duplicateCustomPokemon');
    syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

// ----------------- Custom Item Ops -----------------

export function addCustomItem(set: HomebrewSet, get: HomebrewGet): void {
    const newItem = createDefaultCustomItem();
    const newItems: CustomItem[] = [newItem, ...get().roomCustomItems];
    set({ roomCustomItems: newItems, needsBackup: true }, false, 'homebrew/addCustomItem');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
    saveHomebrewLocal(get());
}

export function updateCustomItem<K extends keyof CustomItem>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomItem[K]
): void {
    const newItems = updateItemField(get().roomCustomItems, id, field, value);
    set({ roomCustomItems: newItems, needsBackup: true }, false, 'homebrew/updateCustomItem');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
    saveHomebrewLocal(get());
}

export function removeCustomItem(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newItems = filterOutById(get().roomCustomItems, id);
    set({ roomCustomItems: newItems, needsBackup: true }, false, 'homebrew/removeCustomItem');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
    saveHomebrewLocal(get());
}

export function duplicateCustomItem(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newItems = duplicateEntity(
        get().roomCustomItems,
        id,
        (i) => i.name,
        (target, name, newId) => ({ ...target, id: newId, name })
    );
    if (!newItems) return;
    set({ roomCustomItems: newItems, needsBackup: true }, false, 'homebrew/duplicateCustomItem');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
    saveHomebrewLocal(get());
}

// ----------------- Custom Form Ops -----------------

export function addCustomForm(
    set: HomebrewSet,
    get: HomebrewGet,
    template: boolean | 'mega' | 'aegislash' | 'stance' = false
): void {
    const newForms: CustomForm[] = [...get().roomCustomForms, createDefaultCustomForm(template)];
    set({ roomCustomForms: newForms, needsBackup: true }, false, 'homebrew/addCustomForm');
    saveHomebrewLocal(get());
}

export function updateCustomForm<K extends keyof CustomForm>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomForm[K]
): void {
    const newForms = updateItemField(get().roomCustomForms, id, field, value);
    set({ roomCustomForms: newForms, needsBackup: true }, false, 'homebrew/updateCustomForm');
    saveHomebrewLocal(get());
}

export function removeCustomForm(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newForms = filterOutById(get().roomCustomForms, id);
    set({ roomCustomForms: newForms, needsBackup: true }, false, 'homebrew/removeCustomForm');
    saveHomebrewLocal(get());
}

export function duplicateCustomForm(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newForms = duplicateEntity(
        get().roomCustomForms,
        id,
        (f) => f.name,
        (target, name, newId) => ({ ...target, id: newId, name })
    );
    if (!newForms) return;
    set({ roomCustomForms: newForms, needsBackup: true }, false, 'homebrew/duplicateCustomForm');
    saveHomebrewLocal(get());
}

// ----------------- Custom Status Ops -----------------

export function addCustomStatus(set: HomebrewSet, get: HomebrewGet): void {
    const newStatuses: CustomStatus[] = [...get().roomCustomStatuses, createDefaultCustomStatus()];
    set({ roomCustomStatuses: newStatuses, needsBackup: true }, false, 'homebrew/addCustomStatus');
    saveHomebrewLocal(get());
}

export function updateCustomStatus<K extends keyof CustomStatus>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomStatus[K]
): void {
    const newStatuses = updateItemField(get().roomCustomStatuses, id, field, value);
    set({ roomCustomStatuses: newStatuses, needsBackup: true }, false, 'homebrew/updateCustomStatus');
    saveHomebrewLocal(get());
}

export function removeCustomStatus(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newStatuses = filterOutById(get().roomCustomStatuses, id);
    set({ roomCustomStatuses: newStatuses, needsBackup: true }, false, 'homebrew/removeCustomStatus');
    saveHomebrewLocal(get());
}

export function duplicateCustomStatus(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newStatuses = duplicateEntity(
        get().roomCustomStatuses,
        id,
        (s) => s.name,
        (target, name, newId) => ({ ...target, id: newId, name })
    );
    if (!newStatuses) return;
    set({ roomCustomStatuses: newStatuses, needsBackup: true }, false, 'homebrew/duplicateCustomStatus');
    saveHomebrewLocal(get());
}

// ----------------- Custom Field Effect Ops -----------------

export function addCustomFieldEffect(
    set: HomebrewSet,
    get: HomebrewGet,
    initialData?: Partial<CustomFieldEffect>
): void {
    const newEffect = createDefaultCustomFieldEffect(initialData);
    const newEffects = [...get().roomCustomFieldEffects, newEffect];
    set({ roomCustomFieldEffects: newEffects, needsBackup: true }, false, 'homebrew/addCustomFieldEffect');
    saveHomebrewLocal(get());
}

export function updateCustomFieldEffect<K extends keyof CustomFieldEffect>(
    set: HomebrewSet,
    get: HomebrewGet,
    id: string,
    field: K,
    value: CustomFieldEffect[K]
): void {
    const newEffects = updateItemField(get().roomCustomFieldEffects, id, field, value);
    set({ roomCustomFieldEffects: newEffects, needsBackup: true }, false, 'homebrew/updateCustomFieldEffect');
    saveHomebrewLocal(get());
}

export function removeCustomFieldEffect(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const newEffects = filterOutById(get().roomCustomFieldEffects, id);
    set({ roomCustomFieldEffects: newEffects, needsBackup: true }, false, 'homebrew/removeCustomFieldEffect');
    saveHomebrewLocal(get());
}

export function duplicateCustomFieldEffect(set: HomebrewSet, get: HomebrewGet, id: string): void {
    const currentEffects = get().roomCustomFieldEffects;
    const target = currentEffects.find((e) => e.id === id);
    if (!target) return;

    const copyName = findUniqueCopyName(currentEffects.map((e) => e.name), target.name);
    const newEffects = [
        ...currentEffects,
        {
            ...target,
            id: crypto.randomUUID(),
            name: copyName,
            triggerMoves: target.triggerMoves ? [...target.triggerMoves] : []
        }
    ];
    set({ roomCustomFieldEffects: newEffects, needsBackup: true }, false, 'homebrew/duplicateCustomFieldEffect');
    saveHomebrewLocal(get());
}
