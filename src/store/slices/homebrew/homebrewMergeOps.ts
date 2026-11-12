import OBR from '@owlbear-rodeo/sdk';
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
import { normalizeCustomForm, mergeNamedEntityList } from './homebrewEntityUtils';

// ----------------- Overwrite Operations -----------------

export function overwriteCustomTypeData(set: HomebrewSet, get: HomebrewGet, types: CustomType[]): void {
    set({ roomCustomTypes: types, needsBackup: true }, false, 'homebrew/overwriteCustomTypeData');
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomAbilityData(set: HomebrewSet, get: HomebrewGet, abilities: CustomAbility[]): void {
    set({ roomCustomAbilities: abilities, needsBackup: true }, false, 'homebrew/overwriteCustomAbilityData');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, abilities, get().roomCustomItems);
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomMoveData(set: HomebrewSet, get: HomebrewGet, moves: CustomMove[]): void {
    set({ roomCustomMoves: moves, needsBackup: true }, false, 'homebrew/overwriteCustomMoveData');
    syncHomebrewToApi(get().roomCustomPokemon, moves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomPokemonData(set: HomebrewSet, get: HomebrewGet, pokemon: CustomPokemon[]): void {
    set({ roomCustomPokemon: pokemon, needsBackup: true }, false, 'homebrew/overwriteCustomPokemonData');
    syncHomebrewToApi(pokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomItemData(set: HomebrewSet, get: HomebrewGet, items: CustomItem[]): void {
    set({ roomCustomItems: items, needsBackup: true }, false, 'homebrew/overwriteCustomItemData');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, items);
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomFormData(set: HomebrewSet, get: HomebrewGet, forms: CustomForm[]): void {
    const safeForms = forms.map(normalizeCustomForm);
    set({ roomCustomForms: safeForms, needsBackup: true }, false, 'homebrew/overwriteCustomFormData');
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomStatusData(set: HomebrewSet, get: HomebrewGet, statuses: CustomStatus[]): void {
    set({ roomCustomStatuses: statuses, needsBackup: true }, false, 'homebrew/overwriteCustomStatusData');
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteCustomFieldEffectData(set: HomebrewSet, get: HomebrewGet, effects: CustomFieldEffect[]): void {
    set({ roomCustomFieldEffects: effects, needsBackup: true }, false, 'homebrew/overwriteCustomFieldEffectData');
    saveHomebrewLocal(get(), { allowEmpty: true });
}

export function overwriteAllHomebrewData(
    set: HomebrewSet,
    get: HomebrewGet,
    types: CustomType[],
    abilities: CustomAbility[],
    moves: CustomMove[],
    pokemon: CustomPokemon[],
    items: CustomItem[],
    forms: CustomForm[],
    statuses: CustomStatus[],
    fieldEffects?: CustomFieldEffect[]
): void {
    const safeForms = forms.map(normalizeCustomForm);
    set(
        {
            roomCustomTypes: types,
            roomCustomAbilities: abilities,
            roomCustomMoves: moves,
            roomCustomPokemon: pokemon,
            roomCustomItems: items,
            roomCustomForms: safeForms,
            roomCustomStatuses: statuses,
            roomCustomFieldEffects: fieldEffects || get().roomCustomFieldEffects,
            needsBackup: true
        },
        false,
        'homebrew/overwriteAllHomebrewData'
    );
    syncHomebrewToApi(pokemon, moves, abilities, items);
    saveHomebrewLocal(get(), { allowEmpty: true });

    if (OBR.isAvailable) OBR.notification.show('[ ✓ ] Homebrew Workshop fully restored!', 'SUCCESS');
}

// ----------------- Merge Operations -----------------

export function mergeCustomTypeData(set: HomebrewSet, get: HomebrewGet, types: CustomType[]): void {
    const mergedTypes = [...get().roomCustomTypes];
    types.forEach((customType) => {
        const index = mergedTypes.findIndex(
            (existing) => existing.name.toLowerCase() === customType.name.toLowerCase()
        );
        if (index !== -1) mergedTypes[index] = customType;
        else mergedTypes.push(customType);
    });
    set({ roomCustomTypes: mergedTypes, needsBackup: true }, false, 'homebrew/mergeCustomTypeData');
    saveHomebrewLocal(get());
}

export function mergeCustomAbilityData(set: HomebrewSet, get: HomebrewGet, abilities: CustomAbility[]): void {
    const mergedAbilities = mergeNamedEntityList(get().roomCustomAbilities, abilities, (a) => a.name);
    set({ roomCustomAbilities: mergedAbilities, needsBackup: true }, false, 'homebrew/mergeCustomAbilityData');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, mergedAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function mergeCustomMoveData(set: HomebrewSet, get: HomebrewGet, moves: CustomMove[]): void {
    const mergedMoves = mergeNamedEntityList(get().roomCustomMoves, moves, (m) => m.name);
    set({ roomCustomMoves: mergedMoves, needsBackup: true }, false, 'homebrew/mergeCustomMoveData');
    syncHomebrewToApi(get().roomCustomPokemon, mergedMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function mergeCustomPokemonData(set: HomebrewSet, get: HomebrewGet, pokemon: CustomPokemon[]): void {
    const mergedPokemon = mergeNamedEntityList(get().roomCustomPokemon, pokemon, (p) => p.Name);
    set({ roomCustomPokemon: mergedPokemon, needsBackup: true }, false, 'homebrew/mergeCustomPokemonData');
    syncHomebrewToApi(mergedPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
    saveHomebrewLocal(get());
}

export function mergeCustomItemData(set: HomebrewSet, get: HomebrewGet, items: CustomItem[]): void {
    const mergedItems = mergeNamedEntityList(get().roomCustomItems, items, (i) => i.name, (item) => ({
        ...item,
        pocket: item.pocket || 'Misc',
        category: item.category || 'Misc',
        rarity: item.rarity || 'Uncommon'
    }));
    set({ roomCustomItems: mergedItems, needsBackup: true }, false, 'homebrew/mergeCustomItemData');
    syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, mergedItems);
    saveHomebrewLocal(get());
}

export function mergeCustomFormData(set: HomebrewSet, get: HomebrewGet, forms: CustomForm[]): void {
    const mergedForms = mergeNamedEntityList(get().roomCustomForms, forms, (f) => f.name, normalizeCustomForm);
    set({ roomCustomForms: mergedForms, needsBackup: true }, false, 'homebrew/mergeCustomFormData');
    saveHomebrewLocal(get());
}

export function mergeCustomStatusData(set: HomebrewSet, get: HomebrewGet, statuses: CustomStatus[]): void {
    const mergedStatuses = mergeNamedEntityList(get().roomCustomStatuses, statuses, (s) => s.name);
    set({ roomCustomStatuses: mergedStatuses, needsBackup: true }, false, 'homebrew/mergeCustomStatusData');
    saveHomebrewLocal(get());
}

export function mergeCustomFieldEffectData(set: HomebrewSet, get: HomebrewGet, effects: CustomFieldEffect[]): void {
    const mergedEffects = mergeNamedEntityList(get().roomCustomFieldEffects, effects, (e) => e.name);
    set({ roomCustomFieldEffects: mergedEffects, needsBackup: true }, false, 'homebrew/mergeCustomFieldEffectData');
    saveHomebrewLocal(get());
}

export function mergeAllHomebrewData(
    set: HomebrewSet,
    get: HomebrewGet,
    types: CustomType[],
    abilities: CustomAbility[],
    moves: CustomMove[],
    pokemon: CustomPokemon[],
    items: CustomItem[],
    forms: CustomForm[],
    statuses: CustomStatus[],
    silent?: boolean,
    fieldEffects?: CustomFieldEffect[]
): void {
    const mergedTypes = [...get().roomCustomTypes];
    types.forEach((customType) => {
        const index = mergedTypes.findIndex(
            (existing) => existing.name.toLowerCase() === customType.name.toLowerCase()
        );
        if (index !== -1) mergedTypes[index] = customType;
        else mergedTypes.push(customType);
    });

    const mergedAbilities = mergeNamedEntityList(get().roomCustomAbilities, abilities, (a) => a.name);
    const mergedMoves = mergeNamedEntityList(get().roomCustomMoves, moves, (m) => m.name);
    const mergedPokemon = mergeNamedEntityList(get().roomCustomPokemon, pokemon, (p) => p.Name);
    const mergedItems = mergeNamedEntityList(get().roomCustomItems, items, (i) => i.name, (item) => ({
        ...item,
        pocket: item.pocket || 'Misc',
        category: item.category || 'Misc',
        rarity: item.rarity || 'Uncommon'
    }));
    const mergedForms = mergeNamedEntityList(get().roomCustomForms, forms, (f) => f.name, normalizeCustomForm);
    const mergedStatuses = mergeNamedEntityList(get().roomCustomStatuses, statuses, (s) => s.name);
    const mergedFieldEffects =
        fieldEffects && Array.isArray(fieldEffects)
            ? mergeNamedEntityList(get().roomCustomFieldEffects, fieldEffects, (e) => e.name)
            : [...get().roomCustomFieldEffects];

    set(
        {
            roomCustomTypes: mergedTypes,
            roomCustomAbilities: mergedAbilities,
            roomCustomMoves: mergedMoves,
            roomCustomPokemon: mergedPokemon,
            roomCustomItems: mergedItems,
            roomCustomForms: mergedForms,
            roomCustomStatuses: mergedStatuses,
            roomCustomFieldEffects: mergedFieldEffects,
            needsBackup: true
        },
        false,
        'homebrew/mergeAllHomebrewData'
    );
    syncHomebrewToApi(mergedPokemon, mergedMoves, mergedAbilities, mergedItems);
    saveHomebrewLocal(get());

    if (!silent && OBR.isAvailable)
        OBR.notification.show('[ ✓ ] Homebrew Workshop successfully merged!', 'SUCCESS');
}

