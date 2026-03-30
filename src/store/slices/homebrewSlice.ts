// src/store/slices/homebrewSlice.ts
import type { StateCreator } from 'zustand';
import type { CharacterState, HomebrewSlice, ExtraCategory, MoveData, CustomMove, CustomPokemon, CustomItem } from '../storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { saveToOwlbear } from '../../utils/obr';
import { syncHomebrewToApi } from '../../utils/api';
import OBR from "@owlbear-rodeo/sdk";

const ROOM_META_ID = "pokerole-pmd-extension/room-settings";

const saveRoomMeta = async (key: string, data: unknown) => {
    if (!OBR.isAvailable) return;
    try {
        const meta = await OBR.room.getMetadata();
        const roomSettings = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
        roomSettings[key] = data;
        await OBR.room.setMetadata({ [ROOM_META_ID]: roomSettings });
    } catch (e) {
        console.error("Failed to save room metadata:", e);
    }
};

export const createHomebrewSlice: StateCreator<CharacterState, [], [], HomebrewSlice> = (set, get) => ({
    roomCustomTypes: [], 
    roomCustomAbilities: [],
    roomCustomMoves: [],
    roomCustomPokemon: [],
    roomCustomItems: [],
    extraCategories: [],
    generatorConfig: { buildType: 'wild', combatBias: 'balanced', targetAtkCount: 2, targetSupCount: 2, includePmd: false, includeCustom: true },

    setRoomCustomTypes: (types) => set({ roomCustomTypes: types }),
    setRoomCustomAbilities: (abs) => set({ roomCustomAbilities: abs }),
    setRoomCustomMoves: (moves) => set({ roomCustomMoves: moves }),
    setRoomCustomPokemon: (mons) => set({ roomCustomPokemon: mons }),
    setRoomCustomItems: (items) => set({ roomCustomItems: items }),

    addCustomType: (typeObj) => {
        const current = get().roomCustomTypes;
        if (current.find(t => t.name.toLowerCase() === typeObj.name.toLowerCase())) return;
        const newTypes = [...current, typeObj];
        set({ roomCustomTypes: newTypes });
        saveRoomMeta('customTypes', newTypes);
    },
    updateCustomType: (oldName, newType) => {
        const current = get().roomCustomTypes;
        const newTypes = current.map(t => t.name === oldName ? newType : t);
        set({ roomCustomTypes: newTypes });
        saveRoomMeta('customTypes', newTypes);
    },
    removeCustomType: (name) => {
        const newTypes = get().roomCustomTypes.filter(t => t.name !== name);
        set({ roomCustomTypes: newTypes });
        saveRoomMeta('customTypes', newTypes);
    },

    addCustomAbility: () => {
        const newAbs = [...get().roomCustomAbilities, { id: crypto.randomUUID(), name: 'New Ability', description: '', effect: '' }];
        set({ roomCustomAbilities: newAbs });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbs, get().roomCustomItems);
        saveRoomMeta('customAbilities', newAbs);
    },
    updateCustomAbility: (id, field, value) => {
        const newAbs = get().roomCustomAbilities.map(a => a.id === id ? { ...a, [field]: value } : a);
        set({ roomCustomAbilities: newAbs });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbs, get().roomCustomItems);
        saveRoomMeta('customAbilities', newAbs);
    },
    removeCustomAbility: (id) => {
        const newAbs = get().roomCustomAbilities.filter(a => a.id !== id);
        set({ roomCustomAbilities: newAbs });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, newAbs, get().roomCustomItems);
        saveRoomMeta('customAbilities', newAbs);
    },

    addCustomMove: () => {
        const newMoves: CustomMove[] = [...get().roomCustomMoves, { 
            id: crypto.randomUUID(), name: 'New Move', type: 'Normal', category: 'Physical', 
            power: 2, acc1: 'dex', acc2: 'brawl', dmg1: 'str', desc: '' 
        }];
        set({ roomCustomMoves: newMoves });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', newMoves);
    },
    updateCustomMove: (id, field, value) => {
        const newMoves = get().roomCustomMoves.map(m => m.id === id ? { ...m, [field]: value } : m);
        set({ roomCustomMoves: newMoves });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', newMoves);
    },
    removeCustomMove: (id) => {
        const newMoves = get().roomCustomMoves.filter(m => m.id !== id);
        set({ roomCustomMoves: newMoves });
        syncHomebrewToApi(get().roomCustomPokemon, newMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', newMoves);
    },

    addCustomPokemon: () => {
        const newMons: CustomPokemon[] = [...get().roomCustomPokemon, {
            id: crypto.randomUUID(), Name: 'New Pokemon', Type1: 'Normal', Type2: '',
            BaseHP: 4, Strength: 2, MaxStrength: 5, Dexterity: 2, MaxDexterity: 5,
            Vitality: 2, MaxVitality: 5, Special: 2, MaxSpecial: 5, Insight: 1, MaxInsight: 5,
            Ability1: '', Ability2: '', HiddenAbility: '', EventAbilities: '', Moves: []
        }];
        set({ roomCustomPokemon: newMons });
        syncHomebrewToApi(newMons, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', newMons);
    },
    updateCustomPokemon: (id, field, value) => {
        const newMons = get().roomCustomPokemon.map(p => p.id === id ? { ...p, [field]: value } : p);
        set({ roomCustomPokemon: newMons });
        syncHomebrewToApi(newMons, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', newMons);
    },
    removeCustomPokemon: (id) => {
        const newMons = get().roomCustomPokemon.filter(p => p.id !== id);
        set({ roomCustomPokemon: newMons });
        syncHomebrewToApi(newMons, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', newMons);
    },

    addCustomItem: () => {
        const newItems: CustomItem[] = [...get().roomCustomItems, { id: crypto.randomUUID(), name: 'New Item', description: '' }];
        set({ roomCustomItems: newItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveRoomMeta('customItems', newItems);
    },
    updateCustomItem: (id, field, value) => {
        const newItems = get().roomCustomItems.map(i => i.id === id ? { ...i, [field]: value } : i);
        set({ roomCustomItems: newItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveRoomMeta('customItems', newItems);
    },
    removeCustomItem: (id) => {
        const newItems = get().roomCustomItems.filter(i => i.id !== id);
        set({ roomCustomItems: newItems });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, newItems);
        saveRoomMeta('customItems', newItems);
    },

    overwriteCustomTypeData: (types) => {
        set({ roomCustomTypes: types });
        saveRoomMeta('customTypes', types);
    },
    overwriteCustomAbilityData: (abs) => {
        set({ roomCustomAbilities: abs });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, abs, get().roomCustomItems);
        saveRoomMeta('customAbilities', abs);
    },
    overwriteCustomMoveData: (moves) => {
        set({ roomCustomMoves: moves });
        syncHomebrewToApi(get().roomCustomPokemon, moves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', moves);
    },
    overwriteCustomPokemonData: (mons) => {
        set({ roomCustomPokemon: mons });
        syncHomebrewToApi(mons, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', mons);
    },
    overwriteCustomItemData: (items) => {
        set({ roomCustomItems: items });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, items);
        saveRoomMeta('customItems', items);
    },
    overwriteAllHomebrewData: async (types, abs, moves, mons, items) => {
        set({ roomCustomTypes: types, roomCustomAbilities: abs, roomCustomMoves: moves, roomCustomPokemon: mons, roomCustomItems: items });
        syncHomebrewToApi(mons, moves, abs, items);
        
        if (!OBR.isAvailable) return;
        try {
            const meta = await OBR.room.getMetadata();
            const roomSettings = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
            Object.assign(roomSettings, { customTypes: types, customAbilities: abs, customMoves: moves, customPokemon: mons, customItems: items });
            await OBR.room.setMetadata({ [ROOM_META_ID]: roomSettings });
            OBR.notification.show("✅ Homebrew Workshop fully restored!");
        } catch (e) { console.error(e); }
    },

    mergeCustomTypeData: (types) => {
        const merged = [...get().roomCustomTypes];
        types.forEach(t => {
            const idx = merged.findIndex(existing => existing.name.toLowerCase() === t.name.toLowerCase());
            if (idx !== -1) merged[idx] = t; else merged.push(t);
        });
        set({ roomCustomTypes: merged });
        saveRoomMeta('customTypes', merged);
    },
    mergeCustomAbilityData: (abs) => {
        const merged = [...get().roomCustomAbilities];
        abs.forEach(a => {
            const idx = merged.findIndex(existing => existing.name.toLowerCase() === a.name.toLowerCase());
            if (idx !== -1) merged[idx] = { ...a, id: merged[idx].id }; else merged.push({ ...a, id: crypto.randomUUID() });
        });
        set({ roomCustomAbilities: merged });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, merged, get().roomCustomItems);
        saveRoomMeta('customAbilities', merged);
    },
    mergeCustomMoveData: (moves) => {
        const merged = [...get().roomCustomMoves];
        moves.forEach(m => {
            const idx = merged.findIndex(existing => existing.name.toLowerCase() === m.name.toLowerCase());
            if (idx !== -1) merged[idx] = { ...m, id: merged[idx].id }; else merged.push({ ...m, id: crypto.randomUUID() });
        });
        set({ roomCustomMoves: merged });
        syncHomebrewToApi(get().roomCustomPokemon, merged, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customMoves', merged);
    },
    mergeCustomPokemonData: (mons) => {
        const merged = [...get().roomCustomPokemon];
        mons.forEach(p => {
            const idx = merged.findIndex(existing => existing.Name.toLowerCase() === p.Name.toLowerCase());
            if (idx !== -1) merged[idx] = { ...p, id: merged[idx].id }; else merged.push({ ...p, id: crypto.randomUUID() });
        });
        set({ roomCustomPokemon: merged });
        syncHomebrewToApi(merged, get().roomCustomMoves, get().roomCustomAbilities, get().roomCustomItems);
        saveRoomMeta('customPokemon', merged);
    },
    mergeCustomItemData: (items) => {
        const merged = [...get().roomCustomItems];
        items.forEach(i => {
            const idx = merged.findIndex(existing => existing.name.toLowerCase() === i.name.toLowerCase());
            if (idx !== -1) merged[idx] = { ...i, id: merged[idx].id }; else merged.push({ ...i, id: crypto.randomUUID() });
        });
        set({ roomCustomItems: merged });
        syncHomebrewToApi(get().roomCustomPokemon, get().roomCustomMoves, get().roomCustomAbilities, merged);
        saveRoomMeta('customItems', merged);
    },
    mergeAllHomebrewData: async (types, abs, moves, mons, items) => {
        const mergedTypes = [...get().roomCustomTypes];
        types.forEach(t => {
            const idx = mergedTypes.findIndex(existing => existing.name.toLowerCase() === t.name.toLowerCase());
            if (idx !== -1) mergedTypes[idx] = t; else mergedTypes.push(t);
        });

        const mergedAbs = [...get().roomCustomAbilities];
        abs.forEach(a => {
            const idx = mergedAbs.findIndex(existing => existing.name.toLowerCase() === a.name.toLowerCase());
            if (idx !== -1) mergedAbs[idx] = { ...a, id: mergedAbs[idx].id }; else mergedAbs.push({ ...a, id: crypto.randomUUID() });
        });

        const mergedMoves = [...get().roomCustomMoves];
        moves.forEach(m => {
            const idx = mergedMoves.findIndex(existing => existing.name.toLowerCase() === m.name.toLowerCase());
            if (idx !== -1) mergedMoves[idx] = { ...m, id: mergedMoves[idx].id }; else mergedMoves.push({ ...m, id: crypto.randomUUID() });
        });

        const mergedMons = [...get().roomCustomPokemon];
        mons.forEach(p => {
            const idx = mergedMons.findIndex(existing => existing.Name.toLowerCase() === p.Name.toLowerCase());
            if (idx !== -1) mergedMons[idx] = { ...p, id: mergedMons[idx].id }; else mergedMons.push({ ...p, id: crypto.randomUUID() });
        });
        
        const mergedItems = [...get().roomCustomItems];
        items.forEach(i => {
            const idx = mergedItems.findIndex(existing => existing.name.toLowerCase() === i.name.toLowerCase());
            if (idx !== -1) mergedItems[idx] = { ...i, id: mergedItems[idx].id }; else mergedItems.push({ ...i, id: crypto.randomUUID() });
        });

        set({ roomCustomTypes: mergedTypes, roomCustomAbilities: mergedAbs, roomCustomMoves: mergedMoves, roomCustomPokemon: mergedMons, roomCustomItems: mergedItems });
        syncHomebrewToApi(mergedMons, mergedMoves, mergedAbs, mergedItems);
        
        if (!OBR.isAvailable) return;
        try {
            const meta = await OBR.room.getMetadata();
            const roomSettings = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
            Object.assign(roomSettings, { customTypes: mergedTypes, customAbilities: mergedAbs, customMoves: mergedMoves, customPokemon: mergedMons, customItems: mergedItems });
            await OBR.room.setMetadata({ [ROOM_META_ID]: roomSettings });
            OBR.notification.show("✅ Homebrew Workshop successfully merged!");
        } catch (e) { console.error(e); }
    },

    addExtraCategory: () => set((state) => {
        const catId = `cat_${crypto.randomUUID()}`;
        const newCats: ExtraCategory[] = [...state.extraCategories, {
            id: catId, name: "EXTRA",
            skills: [
                { id: `${catId}_1`, name: "", base: 0, buff: 0 },
                { id: `${catId}_2`, name: "", base: 0, buff: 0 },
                { id: `${catId}_3`, name: "", base: 0, buff: 0 },
                { id: `${catId}_4`, name: "", base: 0, buff: 0 }
            ]
        }];
        try { saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCats) }); } catch(e){}
        return { extraCategories: newCats };
    }),
    updateExtraCategory: (id, name) => set((state) => {
        const newCats = state.extraCategories.map(c => c.id === id ? { ...c, name } : c);
        try { saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCats) }); } catch(e){}
        return { extraCategories: newCats };
    }),
    updateExtraSkill: (catId, skillId, field, value) => set((state) => {
        const newCats = state.extraCategories.map(c => {
            if (c.id === catId) {
                return { ...c, skills: c.skills.map(s => s.id === skillId ? { ...s, [field]: value } : s) };
            }
            return c;
        });
        try { saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCats) }); } catch(e){}
        return { extraCategories: newCats };
    }),
    removeExtraCategory: (id) => set((state) => {
        const newCats = state.extraCategories.filter(c => c.id !== id);
        try { saveToOwlbear({ 'extra-skills-data': JSON.stringify(newCats) }); } catch(e){}
        return { extraCategories: newCats };
    }),

    setGeneratorConfig: (config) => set((state) => ({ generatorConfig: { ...state.generatorConfig, ...config } })),

    applyGeneratedBuild: (build) => set((state) => {
        const newStats = { ...state.stats };
        const newSocials = { ...state.socials };
        const newSkills = { ...state.skills };
        const updatesToSave: Record<string, unknown> = {};

        Object.values(CombatStat).forEach(stat => {
            if (build.attr[stat] !== undefined) {
                newStats[stat].rank = build.attr[stat];
                updatesToSave[`${stat}-rank`] = build.attr[stat];
            }
        });

        Object.values(SocialStat).forEach(stat => {
            if (build.soc[stat] !== undefined) {
                newSocials[stat].rank = build.soc[stat];
                updatesToSave[`${stat}-rank`] = build.soc[stat];
            }
        });

        Object.values(Skill).forEach(skill => {
            if (build.skills[skill] !== undefined) {
                newSkills[skill].base = build.skills[skill];
                updatesToSave[`${skill}-base`] = build.skills[skill];
            }
        });

        const newExtraCats = [...state.extraCategories];
        build.customSkillsList.forEach(skId => {
            if (build.skills[skId] !== undefined) {
                newExtraCats.forEach(cat => {
                    const sk = cat.skills.find(s => s.id === skId);
                    if (sk) {
                        sk.base = build.skills[skId];
                        updatesToSave[`${skId}-base`] = build.skills[skId];
                    }
                });
            }
        });

        const newMoves: MoveData[] = build.moves.map(m => {
            const catStr = String(m.cat);
            const properCat = catStr.startsWith('Phys') ? 'Physical' : (catStr.startsWith('Spec') ? 'Special' : 'Status');
            
            return {
                ...m, id: crypto.randomUUID(), active: false, category: properCat as 'Physical' | 'Special' | 'Status',
                accBonus: 0, acc1: m.attr, acc2: m.skill, dmg1: m.dmgStat
            };
        });
        
        updatesToSave['moves-data'] = JSON.stringify(newMoves);
        if (newExtraCats !== state.extraCategories) updatesToSave['extra-skills-data'] = JSON.stringify(newExtraCats);

        try { saveToOwlbear(updatesToSave); } catch(e){}

        return { stats: newStats, socials: newSocials, skills: newSkills, moves: newMoves, extraCategories: newExtraCats };
    })
});