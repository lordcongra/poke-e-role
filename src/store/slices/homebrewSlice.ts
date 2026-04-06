import type { StateCreator } from 'zustand';
import type { CharacterState, HomebrewSlice, CustomMove, CustomPokemon, CustomItem } from '../storeTypes';
import { syncHomebrewToApi } from '../../utils/api';
import OBR from '@owlbear-rodeo/sdk';

const ROOM_META_ID = 'pokerole-pmd-extension/room-settings';

const saveRoomMeta = async (key: string, data: unknown) => {
    if (!OBR.isAvailable) return;
    try {
        const meta = await OBR.room.getMetadata();
        const roomSettings = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
        roomSettings[key] = data;
        await OBR.room.setMetadata({ [ROOM_META_ID]: roomSettings });
    } catch (error) {
        console.error('Failed to save room metadata:', error);
    }
};

export const createHomebrewSlice: StateCreator<CharacterState, [], [], HomebrewSlice> = (set, get) => ({
    roomCustomTypes: [],
    roomCustomAbilities: [],
    roomCustomMoves: [],
    roomCustomPokemon: [],
    roomCustomItems: [],

    setRoomCustomTypes: (types) => set({ roomCustomTypes: types }),
    setRoomCustomAbilities: (abilities) => set({ roomCustomAbilities: abilities }),
    setRoomCustomMoves: (moves) => set({ roomCustomMoves: moves }),
    setRoomCustomPokemon: (pokemon) => set({ roomCustomPokemon: pokemon }),
    setRoomCustomItems: (items) => set({ roomCustomItems: items }),

    addCustomType: (typeObject) => {
        const currentTypes = get().roomCustomTypes;
        if (currentTypes.find((customType) => customType.name.toLowerCase() === typeObject.name.toLowerCase())) return;
        const newTypes = [...currentTypes, typeObject];
        set({ roomCustomTypes: newTypes });
        saveRoomMeta('customTypes', newTypes);
    },
    updateCustomType: (oldName, newType) => {
        const currentTypes = get().roomCustomTypes;
        const newTypes = currentTypes.map((customType) => (customType.name === oldName ? newType : customType));
        set({ roomCustomTypes: newTypes });
        saveRoomMeta('customTypes', newTypes);
    },
    removeCustomType: (name) => {
        const newTypes = get().roomCustomTypes.filter((customType) => customType.name !== name);
        set({ roomCustomTypes: newTypes });
        saveRoomMeta('customTypes', newTypes);
    },

    addCustomAbility: () => {
        const newAbilities = [
            ...get().roomCustomAbilities,
            { id: crypto.randomUUID(), name: 'New Ability', description: '', effect: '' }
        ];
        set({ roomCustomAbilities: newAbilities });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveRoomMeta('customAbilities', newAbilities);
    },
    updateCustomAbility: (id, field, value) => {
        const newAbilities = get().roomCustomAbilities.map((ability) =>
            ability.id === id ? { ...ability, [field]: value } : ability
        );
        set({ roomCustomAbilities: newAbilities });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveRoomMeta('customAbilities', newAbilities);
    },
    removeCustomAbility: (id) => {
        const newAbilities = get().roomCustomAbilities.filter((ability) => ability.id !== id);
        set({ roomCustomAbilities: newAbilities });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbilities, get().roomCustomItems);
        saveRoomMeta('customAbilities', newAbilities);
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
        set({ roomCustomMoves: newMoves });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', newMoves);
    },
    updateCustomMove: (id, field, value) => {
        const newMoves = get().roomCustomMoves.map((move) => (move.id === id ? { ...move, [field]: value } : move));
        set({ roomCustomMoves: newMoves });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', newMoves);
    },
    removeCustomMove: (id) => {
        const newMoves = get().roomCustomMoves.filter((move) => move.id !== id);
        set({ roomCustomMoves: newMoves });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', newMoves);
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
                Moves: []
            }
        ];
        set({ roomCustomPokemon: newPokemon });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', newPokemon);
    },
    updateCustomPokemon: (id, field, value) => {
        const newPokemon = get().roomCustomPokemon.map((pokemonData) =>
            pokemonData.id === id ? { ...pokemonData, [field]: value } : pokemonData
        );
        set({ roomCustomPokemon: newPokemon });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', newPokemon);
    },
    removeCustomPokemon: (id) => {
        const newPokemon = get().roomCustomPokemon.filter((pokemonData) => pokemonData.id !== id);
        set({ roomCustomPokemon: newPokemon });
        syncHomebrewToApi(newPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', newPokemon);
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
        set({ roomCustomItems: newItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveRoomMeta('customItems', newItems);
    },
    updateCustomItem: (id, field, value) => {
        const newItems = get().roomCustomItems.map((item) => (item.id === id ? { ...item, [field]: value } : item));
        set({ roomCustomItems: newItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveRoomMeta('customItems', newItems);
    },
    removeCustomItem: (id) => {
        const newItems = get().roomCustomItems.filter((item) => item.id !== id);
        set({ roomCustomItems: newItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveRoomMeta('customItems', newItems);
    },

    overwriteCustomTypeData: (types) => {
        set({ roomCustomTypes: types });
        saveRoomMeta('customTypes', types);
    },
    overwriteCustomAbilityData: (abilities) => {
        set({ roomCustomAbilities: abilities });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, abilities, get().roomCustomItems);
        saveRoomMeta('customAbilities', abilities);
    },
    overwriteCustomMoveData: (moves) => {
        set({ roomCustomMoves: moves });
        syncHomebrewToApi(get().roomCustomPokemon, moves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', moves);
    },
    overwriteCustomPokemonData: (pokemon) => {
        set({ roomCustomPokemon: pokemon });
        syncHomebrewToApi(pokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', pokemon);
    },
    overwriteCustomItemData: (items) => {
        set({ roomCustomItems: items });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, items);
        saveRoomMeta('customItems', items);
    },
    overwriteAllHomebrewData: async (types, abilities, moves, pokemon, items) => {
        set({
            roomCustomTypes: types,
            roomCustomAbilities: abilities,
            roomCustomMoves: moves,
            roomCustomPokemon: pokemon,
            roomCustomItems: items
        });
        syncHomebrewToApi(pokemon, moves, abilities, items);

        if (!OBR.isAvailable) return;
        try {
            const meta = await OBR.room.getMetadata();
            const roomSettings = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
            Object.assign(roomSettings, {
                customTypes: types,
                customAbilities: abilities,
                customMoves: moves,
                customPokemon: pokemon,
                customItems: items
            });
            await OBR.room.setMetadata({ [ROOM_META_ID]: roomSettings });
            OBR.notification.show('✅ Homebrew Workshop fully restored!');
        } catch (error) {
            console.error(error);
        }
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
        set({ roomCustomTypes: mergedTypes });
        saveRoomMeta('customTypes', mergedTypes);
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
        set({ roomCustomAbilities: mergedAbilities });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, mergedAbilities, get().roomCustomItems);
        saveRoomMeta('customAbilities', mergedAbilities);
    },
    mergeCustomMoveData: (moves) => {
        const mergedMoves = [...get().roomCustomMoves];
        moves.forEach((move) => {
            const index = mergedMoves.findIndex((existing) => existing.name.toLowerCase() === move.name.toLowerCase());
            if (index !== -1) mergedMoves[index] = { ...move, id: mergedMoves[index].id };
            else mergedMoves.push({ ...move, id: crypto.randomUUID() });
        });
        set({ roomCustomMoves: mergedMoves });
        syncHomebrewToApi(get().roomCustomPokemon, mergedMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', mergedMoves);
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
        set({ roomCustomPokemon: mergedPokemon });
        syncHomebrewToApi(mergedPokemon, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', mergedPokemon);
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
        set({ roomCustomItems: mergedItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, mergedItems);
        saveRoomMeta('customItems', mergedItems);
    },
    mergeAllHomebrewData: async (types, abilities, moves, pokemon, items) => {
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

        set({
            roomCustomTypes: mergedTypes,
            roomCustomAbilities: mergedAbilities,
            roomCustomMoves: mergedMoves,
            roomCustomPokemon: mergedPokemon,
            roomCustomItems: mergedItems
        });
        syncHomebrewToApi(mergedPokemon, mergedMoves, mergedAbilities, mergedItems);

        if (!OBR.isAvailable) return;
        try {
            const meta = await OBR.room.getMetadata();
            const roomSettings = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
            Object.assign(roomSettings, {
                customTypes: mergedTypes,
                customAbilities: mergedAbilities,
                customMoves: mergedMoves,
                customPokemon: mergedPokemon,
                customItems: mergedItems
            });
            await OBR.room.setMetadata({ [ROOM_META_ID]: roomSettings });
            OBR.notification.show('✅ Homebrew Workshop successfully merged!');
        } catch (error) {
            console.error(error);
        }
    }
});
