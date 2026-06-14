import type { StateCreator } from 'zustand';
import type {
    CharacterState,
    HomebrewSlice,
    CustomMove,
    CustomPokemon,
    CustomItem,
    CustomForm,
    CustomStatus
} from '../storeTypes';
import { syncHomebrewToApi } from '../../utils/api';
import OBR from '@owlbear-rodeo/sdk';

const getStorageKey = () => {
    try {
        if (OBR.isAvailable && OBR.room && OBR.room.id) {
            return `pkr_homebrew_${OBR.room.id}`;
        }
    } catch (e) {}
    return 'pkr_homebrew_offline';
};

const saveHomebrewLocal = (state: CharacterState) => {
    try {
        const data = {
            customTypes: state.roomCustomTypes,
            customAbilities: state.roomCustomAbilities,
            customMoves: state.roomCustomMoves,
            customPokemon: state.roomCustomPokemon,
            customItems: state.roomCustomItems,
            customForms: state.roomCustomForms,
            customStatuses: state.roomCustomStatuses,
            needsBackup: state.needsBackup
        };
        localStorage.setItem(getStorageKey(), JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save homebrew data locally:', error);
    }
};

export const createHomebrewSlice: StateCreator<CharacterState, [], [], HomebrewSlice> = (set, get) => ({
    roomCustomTypes: [],
    roomCustomAbilities: [],
    roomCustomMoves: [],
    roomCustomPokemon: [],
    roomCustomItems: [],
    roomCustomForms: [],
    roomCustomStatuses: [],
    needsBackup: false,

    loadHomebrewLocal: () => {
        try {
            const stored = localStorage.getItem(getStorageKey());
            if (stored) {
                const parsed = JSON.parse(stored);
                const types = parsed.customTypes || [];
                const abilities = parsed.customAbilities || [];
                const moves = parsed.customMoves || [];
                const pokemon = parsed.customPokemon || [];
                const items = parsed.customItems || [];
                const forms = parsed.customForms || [];
                const statuses = parsed.customStatuses || [];
                const needsBkp = parsed.needsBackup || false;

                set({
                    roomCustomTypes: types,
                    roomCustomAbilities: abilities,
                    roomCustomMoves: moves,
                    roomCustomPokemon: pokemon,
                    roomCustomItems: items,
                    roomCustomForms: forms,
                    roomCustomStatuses: statuses,
                    needsBackup: needsBkp
                });

                syncHomebrewToApi(pokemon, moves, abilities, items);
            }
        } catch (error) {
            console.error('Failed to load homebrew data from local storage:', error);
        }
    },

    markHomebrewBackedUp: () => {
        set({ needsBackup: false });
        saveHomebrewLocal(get());
    },

    processHomebrewPayload: (payload) => {
        set({
            roomCustomTypes: payload.customTypes || [],
            roomCustomAbilities: payload.customAbilities || [],
            roomCustomMoves: payload.customMoves || [],
            roomCustomPokemon: payload.customPokemon || [],
            roomCustomItems: payload.customItems || [],
            roomCustomForms: payload.customForms || [],
            roomCustomStatuses: payload.customStatuses || [],
            needsBackup: true
        });
        syncHomebrewToApi(
            payload.customPokemon || [],
            payload.customMoves || [],
            payload.customAbilities || [],
            payload.customItems || []
        );
        saveHomebrewLocal(get());
    },

    getHomebrewPayload: () => {
        return {
            customTypes: get().roomCustomTypes,
            customAbilities: get().roomCustomAbilities,
            customMoves: get().roomCustomMoves,
            customPokemon: get().roomCustomPokemon,
            customItems: get().roomCustomItems,
            customForms: get().roomCustomForms,
            customStatuses: get().roomCustomStatuses
        };
    },

    setRoomCustomTypes: (types) => {
        set({ roomCustomTypes: types, needsBackup: true });
        saveHomebrewLocal(get());
    },
    setRoomCustomAbilities: (abilities) => {
        set({ roomCustomAbilities: abilities, needsBackup: true });
        saveHomebrewLocal(get());
    },
    setRoomCustomMoves: (moves) => {
        set({ roomCustomMoves: moves, needsBackup: true });
        saveHomebrewLocal(get());
    },
    setRoomCustomPokemon: (pokemon) => {
        set({ roomCustomPokemon: pokemon, needsBackup: true });
        saveHomebrewLocal(get());
    },
    setRoomCustomItems: (items) => {
        set({ roomCustomItems: items, needsBackup: true });
        saveHomebrewLocal(get());
    },
    setRoomCustomForms: (forms) => {
        set({ roomCustomForms: forms, needsBackup: true });
        saveHomebrewLocal(get());
    },
    setRoomCustomStatuses: (statuses) => {
        set({ roomCustomStatuses: statuses, needsBackup: true });
        saveHomebrewLocal(get());
    },

    addCustomType: (typeObject) => {
        const currentTypes = get().roomCustomTypes;
        if (currentTypes.find((customType) => customType.name.toLowerCase() === typeObject.name.toLowerCase())) return;
        const newTypes = [...currentTypes, typeObject];
        set({ roomCustomTypes: newTypes, needsBackup: true });
        saveHomebrewLocal(get());
    },
    updateCustomType: (oldName, newType) => {
        const currentTypes = get().roomCustomTypes;
        const newTypes = currentTypes.map((customType) => (customType.name === oldName ? newType : customType));
        set({ roomCustomTypes: newTypes, needsBackup: true });
        saveHomebrewLocal(get());
    },
    removeCustomType: (name) => {
        const newTypes = get().roomCustomTypes.filter((customType) => customType.name !== name);
        set({ roomCustomTypes: newTypes, needsBackup: true });
        saveHomebrewLocal(get());
    },
    duplicateCustomType: (name) => {
        const currentTypes = get().roomCustomTypes;
        const target = currentTypes.find((t) => t.name === name);
        if (!target) return;

        let copyName = `${target.name} (Copy)`;
        let counter = 1;
        while (currentTypes.some((t) => t.name === copyName)) {
            counter++;
            copyName = `${target.name} (Copy ${counter})`;
        }

        const newType = { ...target, name: copyName };
        const newTypes = [...currentTypes, newType];
        set({ roomCustomTypes: newTypes, needsBackup: true });
        saveHomebrewLocal(get());
    },

    addCustomAbility: () => {
        const newAbilities = [
            ...get().roomCustomAbilities,
            { id: crypto.randomUUID(), name: 'New Ability', description: '', effect: '' }
        ];
        set({ roomCustomAbilities: newAbilities, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    updateCustomAbility: (id, field, value) => {
        const newAbilities = get().roomCustomAbilities.map((ability) =>
            ability.id === id ? { ...ability, [field]: value } : ability
        );
        set({ roomCustomAbilities: newAbilities, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    removeCustomAbility: (id) => {
        const newAbilities = get().roomCustomAbilities.filter((ability) => ability.id !== id);
        set({ roomCustomAbilities: newAbilities, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    duplicateCustomAbility: (id) => {
        const currentAbilities = get().roomCustomAbilities;
        const target = currentAbilities.find((a) => a.id === id);
        if (!target) return;

        let copyName = `${target.name} (Copy)`;
        let counter = 1;
        while (currentAbilities.some((a) => a.name === copyName)) {
            counter++;
            copyName = `${target.name} (Copy ${counter})`;
        }

        const newAbilities = [...currentAbilities, { ...target, id: crypto.randomUUID(), name: copyName }];
        set({ roomCustomAbilities: newAbilities, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },

    addCustomMove: () => {
        const newMoves: CustomMove[] = [
            ...get().roomCustomMoves,
            {
                id: crypto.randomUUID(),
                name: 'New Move',
                type: 'Normal',
                category: 'Physical',
                power: 2,
                acc1: 'dex',
                acc2: 'brawl',
                dmg1: 'str',
                desc: ''
            }
        ];
        set({ roomCustomMoves: newMoves, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    updateCustomMove: (id, field, value) => {
        const newMoves = get().roomCustomMoves.map((move) => (move.id === id ? { ...move, [field]: value } : move));
        set({ roomCustomMoves: newMoves, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    removeCustomMove: (id) => {
        const newMoves = get().roomCustomMoves.filter((move) => move.id !== id);
        set({ roomCustomMoves: newMoves, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    duplicateCustomMove: (id) => {
        const currentMoves = get().roomCustomMoves;
        const target = currentMoves.find((m) => m.id === id);
        if (!target) return;

        let copyName = `${target.name} (Copy)`;
        let counter = 1;
        while (currentMoves.some((m) => m.name === copyName)) {
            counter++;
            copyName = `${target.name} (Copy ${counter})`;
        }

        const newMoves = [...currentMoves, { ...target, id: crypto.randomUUID(), name: copyName }];
        set({ roomCustomMoves: newMoves, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },

    addCustomPokemon: () => {
        const newPokemon: CustomPokemon[] = [
            ...get().roomCustomPokemon,
            {
                id: crypto.randomUUID(),
                Name: 'New Pokemon',
                Type1: 'Normal',
                Type2: '',
                BaseHP: 4,
                Strength: 2,
                MaxStrength: 5,
                Dexterity: 2,
                MaxDexterity: 5,
                Vitality: 2,
                MaxVitality: 5,
                Special: 2,
                MaxSpecial: 5,
                Insight: 1,
                MaxInsight: 5,
                Ability1: '',
                Ability2: '',
                HiddenAbility: '',
                EventAbilities: '',
                Moves: [],
                DexID: '',
                DexCategory: '',
                Height: '',
                Weight: '',
                DexDescription: ''
            }
        ];
        set({ roomCustomPokemon: newPokemon, needsBackup: true });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    updateCustomPokemon: (id, field, value) => {
        const newPokemon = get().roomCustomPokemon.map((pokemonData) =>
            pokemonData.id === id ? { ...pokemonData, [field]: value } : pokemonData
        );
        set({ roomCustomPokemon: newPokemon, needsBackup: true });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    removeCustomPokemon: (id) => {
        const newPokemon = get().roomCustomPokemon.filter((pokemonData) => pokemonData.id !== id);
        set({ roomCustomPokemon: newPokemon, needsBackup: true });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    duplicateCustomPokemon: (id) => {
        const currentPokemon = get().roomCustomPokemon;
        const target = currentPokemon.find((p) => p.id === id);
        if (!target) return;

        let copyName = `${target.Name} (Copy)`;
        let counter = 1;
        while (currentPokemon.some((p) => p.Name === copyName)) {
            counter++;
            copyName = `${target.Name} (Copy ${counter})`;
        }

        const newPokemon = [...currentPokemon, { ...target, id: crypto.randomUUID(), Name: copyName }];
        set({ roomCustomPokemon: newPokemon, needsBackup: true });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },

    addCustomItem: () => {
        const newItems: CustomItem[] = [
            ...get().roomCustomItems,
            {
                id: crypto.randomUUID(),
                name: 'New Item',
                description: '',
                pocket: 'Misc',
                category: 'Misc',
                rarity: 'Uncommon'
            }
        ];
        set({ roomCustomItems: newItems, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveHomebrewLocal(get());
    },
    updateCustomItem: (id, field, value) => {
        const newItems = get().roomCustomItems.map((item) => (item.id === id ? { ...item, [field]: value } : item));
        set({ roomCustomItems: newItems, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveHomebrewLocal(get());
    },
    removeCustomItem: (id) => {
        const newItems = get().roomCustomItems.filter((item) => item.id !== id);
        set({ roomCustomItems: newItems, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveHomebrewLocal(get());
    },
    duplicateCustomItem: (id) => {
        const currentItems = get().roomCustomItems;
        const target = currentItems.find((i) => i.id === id);
        if (!target) return;

        let copyName = `${target.name} (Copy)`;
        let counter = 1;
        while (currentItems.some((i) => i.name === copyName)) {
            counter++;
            copyName = `${target.name} (Copy ${counter})`;
        }

        const newItems = [...currentItems, { ...target, id: crypto.randomUUID(), name: copyName }];
        set({ roomCustomItems: newItems, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveHomebrewLocal(get());
    },

    addCustomForm: (isMegaTemplate = false) => {
        const newForms: CustomForm[] = [
            ...get().roomCustomForms,
            {
                id: crypto.randomUUID(),
                name: isMegaTemplate ? 'New Mega Evolution' : 'New Form',
                description: isMegaTemplate ? 'Backs up current stats, restores HP/Will, and clears statuses.' : '',
                swapBaseStats: isMegaTemplate,
                swapStatLimits: isMegaTemplate,
                swapStatRanks: isMegaTemplate,
                swapSkills: isMegaTemplate,
                swapMoves: isMegaTemplate,
                swapTyping: isMegaTemplate,
                swapAbilities: isMegaTemplate,
                swapBuffs: false,
                swapDebuffs: false,
                freshBuffs: false,
                freshDebuffs: false,
                wipeBuffs: false,
                wipeDebuffs: false,
                swapStatuses: false,
                freshStatuses: isMegaTemplate,
                wipeStatuses: false,
                restoreHp: isMegaTemplate,
                restoreWill: isMegaTemplate,
                healHp: isMegaTemplate,
                healWill: isMegaTemplate,
                activationCostHp: 0,
                activationCostWill: isMegaTemplate ? 1 : 0,
                grantedMoves: [],
                tags: '',
                tempHp: 0,
                tempWill: 0,
                gmOnly: false
            }
        ];
        set({ roomCustomForms: newForms, needsBackup: true });
        saveHomebrewLocal(get());
    },
    updateCustomForm: (id, field, value) => {
        const newForms = get().roomCustomForms.map((form) => (form.id === id ? { ...form, [field]: value } : form));
        set({ roomCustomForms: newForms, needsBackup: true });
        saveHomebrewLocal(get());
    },
    removeCustomForm: (id) => {
        const newForms = get().roomCustomForms.filter((form) => form.id !== id);
        set({ roomCustomForms: newForms, needsBackup: true });
        saveHomebrewLocal(get());
    },
    duplicateCustomForm: (id) => {
        const currentForms = get().roomCustomForms;
        const target = currentForms.find((f) => f.id === id);
        if (!target) return;

        let copyName = `${target.name} (Copy)`;
        let counter = 1;
        while (currentForms.some((f) => f.name === copyName)) {
            counter++;
            copyName = `${target.name} (Copy ${counter})`;
        }

        const newForms = [...currentForms, { ...target, id: crypto.randomUUID(), name: copyName }];
        set({ roomCustomForms: newForms, needsBackup: true });
        saveHomebrewLocal(get());
    },

    addCustomStatus: () => {
        const newStatuses: CustomStatus[] = [
            ...get().roomCustomStatuses,
            {
                id: crypto.randomUUID(),
                name: 'New Status',
                shorthand: '',
                description: '',
                effects: '',
                recoveryAttr: 'none',
                recoverySkill: 'none',
                color: '#9C27B0',
                textColor: '#ffffff',
                gmOnly: false
            }
        ];
        set({ roomCustomStatuses: newStatuses, needsBackup: true });
        saveHomebrewLocal(get());
    },
    updateCustomStatus: (id, field, value) => {
        const newStatuses = get().roomCustomStatuses.map((s) => (s.id === id ? { ...s, [field]: value } : s));
        set({ roomCustomStatuses: newStatuses, needsBackup: true });
        saveHomebrewLocal(get());
    },
    removeCustomStatus: (id) => {
        const newStatuses = get().roomCustomStatuses.filter((s) => s.id !== id);
        set({ roomCustomStatuses: newStatuses, needsBackup: true });
        saveHomebrewLocal(get());
    },
    duplicateCustomStatus: (id) => {
        const currentStatuses = get().roomCustomStatuses;
        const target = currentStatuses.find((s) => s.id === id);
        if (!target) return;

        let copyName = `${target.name} (Copy)`;
        let counter = 1;
        while (currentStatuses.some((s) => s.name === copyName)) {
            counter++;
            copyName = `${target.name} (Copy ${counter})`;
        }

        const newStatuses = [...currentStatuses, { ...target, id: crypto.randomUUID(), name: copyName }];
        set({ roomCustomStatuses: newStatuses, needsBackup: true });
        saveHomebrewLocal(get());
    },

    overwriteCustomTypeData: (types) => {
        set({ roomCustomTypes: types, needsBackup: true });
        saveHomebrewLocal(get());
    },
    overwriteCustomAbilityData: (abilities) => {
        set({ roomCustomAbilities: abilities, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, abilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    overwriteCustomMoveData: (moves) => {
        set({ roomCustomMoves: moves, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, moves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    overwriteCustomPokemonData: (pokemon) => {
        set({ roomCustomPokemon: pokemon, needsBackup: true });
        syncHomebrewToApi(pokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    overwriteCustomItemData: (items) => {
        set({ roomCustomItems: items, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, items);
        saveHomebrewLocal(get());
    },
    overwriteCustomFormData: (forms) => {
        const safeForms = forms.map((f) => ({
            ...f,
            swapStatuses: f.swapStatuses ?? false,
            freshStatuses: f.freshStatuses ?? false,
            wipeStatuses: f.wipeStatuses ?? false,
            swapBuffs: f.swapBuffs ?? false,
            swapDebuffs: f.swapDebuffs ?? false,
            freshBuffs: f.freshBuffs ?? false,
            freshDebuffs: f.freshDebuffs ?? false,
            wipeBuffs: f.wipeBuffs ?? false,
            wipeDebuffs: f.wipeDebuffs ?? false,
            restoreHp: f.restoreHp ?? false,
            restoreWill: f.restoreWill ?? false,
            healHp: f.healHp ?? false,
            healWill: f.healWill ?? false,
            activationCostHp: f.activationCostHp ?? 0,
            activationCostWill: f.activationCostWill ?? 0,
            tempHp: f.tempHp ?? 0,
            tempWill: f.tempWill ?? 0,
            grantedMoves: Array.isArray(f.grantedMoves) ? f.grantedMoves : []
        }));
        set({ roomCustomForms: safeForms, needsBackup: true });
        saveHomebrewLocal(get());
    },
    overwriteCustomStatusData: (statuses) => {
        set({ roomCustomStatuses: statuses, needsBackup: true });
        saveHomebrewLocal(get());
    },
    overwriteAllHomebrewData: (types, abilities, moves, pokemon, items, forms, statuses) => {
        const safeForms = forms.map((f) => ({
            ...f,
            swapStatuses: f.swapStatuses ?? false,
            freshStatuses: f.freshStatuses ?? false,
            wipeStatuses: f.wipeStatuses ?? false,
            swapBuffs: f.swapBuffs ?? false,
            swapDebuffs: f.swapDebuffs ?? false,
            freshBuffs: f.freshBuffs ?? false,
            freshDebuffs: f.freshDebuffs ?? false,
            wipeBuffs: f.wipeBuffs ?? false,
            wipeDebuffs: f.wipeDebuffs ?? false,
            restoreHp: f.restoreHp ?? false,
            restoreWill: f.restoreWill ?? false,
            healHp: f.healHp ?? false,
            healWill: f.healWill ?? false,
            activationCostHp: f.activationCostHp ?? 0,
            activationCostWill: f.activationCostWill ?? 0,
            tempHp: f.tempHp ?? 0,
            tempWill: f.tempWill ?? 0,
            grantedMoves: Array.isArray(f.grantedMoves) ? f.grantedMoves : []
        }));

        set({
            roomCustomTypes: types,
            roomCustomAbilities: abilities,
            roomCustomMoves: moves,
            roomCustomPokemon: pokemon,
            roomCustomItems: items,
            roomCustomForms: safeForms,
            roomCustomStatuses: statuses,
            needsBackup: true
        });
        syncHomebrewToApi(pokemon, moves, abilities, items);
        saveHomebrewLocal(get());

        if (OBR.isAvailable) OBR.notification.show('✅ Homebrew Workshop fully restored!');
    },

    mergeCustomTypeData: (types) => {
        const mergedTypes = [...get().roomCustomTypes];
        types.forEach((customType) => {
            const index = mergedTypes.findIndex(
                (existing) => existing.name.toLowerCase() === customType.name.toLowerCase()
            );
            if (index !== -1) mergedTypes[index] = customType;
            else mergedTypes.push(customType);
        });
        set({ roomCustomTypes: mergedTypes, needsBackup: true });
        saveHomebrewLocal(get());
    },
    mergeCustomAbilityData: (abilities) => {
        const mergedAbilities = [...get().roomCustomAbilities];
        abilities.forEach((ability) => {
            const index = mergedAbilities.findIndex(
                (existing) => existing.name.toLowerCase() === ability.name.toLowerCase()
            );
            if (index !== -1) mergedAbilities[index] = { ...ability, id: mergedAbilities[index].id };
            else mergedAbilities.push({ ...ability, id: crypto.randomUUID() });
        });
        set({ roomCustomAbilities: mergedAbilities, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, mergedAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    mergeCustomMoveData: (moves) => {
        const mergedMoves = [...get().roomCustomMoves];
        moves.forEach((move) => {
            const index = mergedMoves.findIndex((existing) => existing.name.toLowerCase() === move.name.toLowerCase());
            if (index !== -1) mergedMoves[index] = { ...move, id: mergedMoves[index].id };
            else mergedMoves.push({ ...move, id: crypto.randomUUID() });
        });
        set({ roomCustomMoves: mergedMoves, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, mergedMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    mergeCustomPokemonData: (pokemon) => {
        const mergedPokemon = [...get().roomCustomPokemon];
        pokemon.forEach((pokemonData) => {
            const index = mergedPokemon.findIndex(
                (existing) => existing.Name.toLowerCase() === pokemonData.Name.toLowerCase()
            );
            if (index !== -1) mergedPokemon[index] = { ...pokemonData, id: mergedPokemon[index].id };
            else mergedPokemon.push({ ...pokemonData, id: crypto.randomUUID() });
        });
        set({ roomCustomPokemon: mergedPokemon, needsBackup: true });
        syncHomebrewToApi(mergedPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveHomebrewLocal(get());
    },
    mergeCustomItemData: (items) => {
        const mergedItems = [...get().roomCustomItems];
        items.forEach((item) => {
            const index = mergedItems.findIndex((existing) => existing.name.toLowerCase() === item.name.toLowerCase());
            const guaranteedPocket = item.pocket || 'Misc';
            const guaranteedCategory = item.category || 'Misc';
            const guaranteedRarity = item.rarity || 'Uncommon';
            if (index !== -1) {
                mergedItems[index] = {
                    ...item,
                    id: mergedItems[index].id,
                    pocket: guaranteedPocket,
                    category: guaranteedCategory,
                    rarity: guaranteedRarity
                };
            } else {
                mergedItems.push({
                    ...item,
                    id: crypto.randomUUID(),
                    pocket: guaranteedPocket,
                    category: guaranteedCategory,
                    rarity: guaranteedRarity
                });
            }
        });
        set({ roomCustomItems: mergedItems, needsBackup: true });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, mergedItems);
        saveHomebrewLocal(get());
    },
    mergeCustomFormData: (forms) => {
        const mergedForms = [...get().roomCustomForms];
        forms.forEach((form) => {
            const index = mergedForms.findIndex((existing) => existing.name.toLowerCase() === form.name.toLowerCase());

            const safeForm = {
                ...form,
                swapStatuses: form.swapStatuses ?? false,
                freshStatuses: form.freshStatuses ?? false,
                wipeStatuses: form.wipeStatuses ?? false,
                swapBuffs: form.swapBuffs ?? false,
                swapDebuffs: form.swapDebuffs ?? false,
                freshBuffs: form.freshBuffs ?? false,
                freshDebuffs: form.freshDebuffs ?? false,
                wipeBuffs: form.wipeBuffs ?? false,
                wipeDebuffs: form.wipeDebuffs ?? false,
                restoreHp: form.restoreHp ?? false,
                restoreWill: form.restoreWill ?? false,
                healHp: form.healHp ?? false,
                healWill: form.healWill ?? false,
                activationCostHp: form.activationCostHp ?? 0,
                activationCostWill: form.activationCostWill ?? 0,
                tempHp: form.tempHp ?? 0,
                tempWill: form.tempWill ?? 0,
                grantedMoves: Array.isArray(form.grantedMoves) ? form.grantedMoves : []
            };

            if (index !== -1) mergedForms[index] = { ...safeForm, id: mergedForms[index].id };
            else mergedForms.push({ ...safeForm, id: crypto.randomUUID() });
        });
        set({ roomCustomForms: mergedForms, needsBackup: true });
        saveHomebrewLocal(get());
    },
    mergeCustomStatusData: (statuses) => {
        const mergedStatuses = [...get().roomCustomStatuses];
        statuses.forEach((status) => {
            const index = mergedStatuses.findIndex(
                (existing) => existing.name.toLowerCase() === status.name.toLowerCase()
            );
            if (index !== -1) mergedStatuses[index] = { ...status, id: mergedStatuses[index].id };
            else mergedStatuses.push({ ...status, id: crypto.randomUUID() });
        });
        set({ roomCustomStatuses: mergedStatuses, needsBackup: true });
        saveHomebrewLocal(get());
    },
    mergeAllHomebrewData: (types, abilities, moves, pokemon, items, forms, statuses, silent) => {
        const mergedTypes = [...get().roomCustomTypes];
        types.forEach((customType) => {
            const index = mergedTypes.findIndex(
                (existing) => existing.name.toLowerCase() === customType.name.toLowerCase()
            );
            if (index !== -1) mergedTypes[index] = customType;
            else mergedTypes.push(customType);
        });

        const mergedAbilities = [...get().roomCustomAbilities];
        abilities.forEach((ability) => {
            const index = mergedAbilities.findIndex(
                (existing) => existing.name.toLowerCase() === ability.name.toLowerCase()
            );
            if (index !== -1) mergedAbilities[index] = { ...ability, id: mergedAbilities[index].id };
            else mergedAbilities.push({ ...ability, id: crypto.randomUUID() });
        });

        const mergedMoves = [...get().roomCustomMoves];
        moves.forEach((move) => {
            const index = mergedMoves.findIndex((existing) => existing.name.toLowerCase() === move.name.toLowerCase());
            if (index !== -1) mergedMoves[index] = { ...move, id: mergedMoves[index].id };
            else mergedMoves.push({ ...move, id: crypto.randomUUID() });
        });

        const mergedPokemon = [...get().roomCustomPokemon];
        pokemon.forEach((pokemonData) => {
            const index = mergedPokemon.findIndex(
                (existing) => existing.Name.toLowerCase() === pokemonData.Name.toLowerCase()
            );
            if (index !== -1) mergedPokemon[index] = { ...pokemonData, id: mergedPokemon[index].id };
            else mergedPokemon.push({ ...pokemonData, id: crypto.randomUUID() });
        });

        const mergedItems = [...get().roomCustomItems];
        items.forEach((item) => {
            const index = mergedItems.findIndex((existing) => existing.name.toLowerCase() === item.name.toLowerCase());
            const guaranteedPocket = item.pocket || 'Misc';
            const guaranteedCategory = item.category || 'Misc';
            const guaranteedRarity = item.rarity || 'Uncommon';
            if (index !== -1) {
                mergedItems[index] = {
                    ...item,
                    id: mergedItems[index].id,
                    pocket: guaranteedPocket,
                    category: guaranteedCategory,
                    rarity: guaranteedRarity
                };
            } else {
                mergedItems.push({
                    ...item,
                    id: crypto.randomUUID(),
                    pocket: guaranteedPocket,
                    category: guaranteedCategory,
                    rarity: guaranteedRarity
                });
            }
        });

        const mergedForms = [...get().roomCustomForms];
        forms.forEach((form) => {
            const index = mergedForms.findIndex((existing) => existing.name.toLowerCase() === form.name.toLowerCase());

            const safeForm = {
                ...form,
                swapStatuses: form.swapStatuses ?? false,
                freshStatuses: form.freshStatuses ?? false,
                wipeStatuses: form.wipeStatuses ?? false,
                swapBuffs: form.swapBuffs ?? false,
                swapDebuffs: form.swapDebuffs ?? false,
                freshBuffs: form.freshBuffs ?? false,
                freshDebuffs: form.freshDebuffs ?? false,
                wipeBuffs: form.wipeBuffs ?? false,
                wipeDebuffs: form.wipeDebuffs ?? false,
                restoreHp: form.restoreHp ?? false,
                restoreWill: form.restoreWill ?? false,
                healHp: form.healHp ?? false,
                healWill: form.healWill ?? false,
                activationCostHp: form.activationCostHp ?? 0,
                activationCostWill: form.activationCostWill ?? 0,
                tempHp: form.tempHp ?? 0,
                tempWill: form.tempWill ?? 0,
                grantedMoves: Array.isArray(form.grantedMoves) ? form.grantedMoves : []
            };

            if (index !== -1) mergedForms[index] = { ...safeForm, id: mergedForms[index].id };
            else mergedForms.push({ ...safeForm, id: crypto.randomUUID() });
        });

        const mergedStatuses = [...get().roomCustomStatuses];
        statuses.forEach((status) => {
            const index = mergedStatuses.findIndex(
                (existing) => existing.name.toLowerCase() === status.name.toLowerCase()
            );
            if (index !== -1) mergedStatuses[index] = { ...status, id: mergedStatuses[index].id };
            else mergedStatuses.push({ ...status, id: crypto.randomUUID() });
        });

        set({
            roomCustomTypes: mergedTypes,
            roomCustomAbilities: mergedAbilities,
            roomCustomMoves: mergedMoves,
            roomCustomPokemon: mergedPokemon,
            roomCustomItems: mergedItems,
            roomCustomForms: mergedForms,
            roomCustomStatuses: mergedStatuses,
            needsBackup: true
        });
        syncHomebrewToApi(mergedPokemon, mergedMoves, mergedAbilities, mergedItems);
        saveHomebrewLocal(get());

        if (!silent && OBR.isAvailable) OBR.notification.show('✅ Homebrew Workshop successfully merged!');
    }
});
