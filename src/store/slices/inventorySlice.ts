// src/store/slices/inventorySlice.ts
import type { StateCreator } from 'zustand';
import type { CharacterState, InventorySlice, InventoryItem, CustomInfo } from '../storeTypes';
import { saveToOwlbear } from '../../utils/obr';
import { parseCombatTags } from '../../utils/combatMath';
import { CombatStat } from '../../types/enums';

const HARDCODED_TAGS: Record<string, string> = {
    "wide lens": "[Acc +2]", "zoom lens": "[Acc +2]", "life orb": "[Dmg +2]",
    "black belt": "[Dmg +1: Fighting]", "black glasses": "[Dmg +1: Dark]",
    "charcoal": "[Dmg +1: Fire]", "dragon fang": "[Dmg +1: Dragon]",
    "fairy wings": "[Dmg +1: Fairy]", "hard stone": "[Dmg +1: Rock]",
    "magnet": "[Dmg +1: Electric]", "metal coat": "[Dmg +1: Steel]",
    "miracle seed": "[Dmg +1: Grass]", "mystic water": "[Dmg +1: Water]",
    "never-melt ice": "[Dmg +1: Ice]", "poison barb": "[Dmg +1: Poison]",
    "sharp beak": "[Dmg +1: Flying]", "silk scarf": "[Dmg +1: Normal]",
    "silver powder": "[Dmg +1: Bug]", "soft sand": "[Dmg +1: Ground]",
    "spell tag": "[Dmg +1: Ghost]", "twisted spoon": "[Dmg +1: Psychic]",
    "razor claw": "[High Crit]", "leek": "[High Crit]",
    "lucky punch": "[High Crit] [Str +2]", "sharp claw": "[High Crit]",
    "ring target": "[Remove Immunities]",
    "eviolite": "[Def +1] [Spd +1]",
    "metronome": "[Combo Dmg +1]",
    "loaded dice": "[Chance +2]",
    "choice scarf": "[Init +3]",
    "iron ball": "[Dex -1] [Remove Immunity: Ground]",
    "toxic orb": "[Status: Poison]",
    "flame orb": "[Status: 1st Degree Burn]",
    "air balloon": "[Immune: Ground]",
    "expert belt": "[Dmg +1: Super Effective]",
    "thick club": "[Str +2]",
    "light ball": "[Str +1] [Spe +1]",
    "quick claw": "[Init +2]"
};

const syncHealthWill = (state: CharacterState, newInv: InventoryItem[], updatesToSave: Record<string, unknown>) => {
    // AUDIT FIX: Passed extraCategories!
    const invMods = parseCombatTags(newInv, state.extraCategories);
    const vitTotal = Math.max(1, state.stats[CombatStat.VIT].base + state.stats[CombatStat.VIT].rank + state.stats[CombatStat.VIT].buff - state.stats[CombatStat.VIT].debuff + (invMods.stats.vit || 0));
    const insTotal = Math.max(1, state.stats[CombatStat.INS].base + state.stats[CombatStat.INS].rank + state.stats[CombatStat.INS].buff - state.stats[CombatStat.INS].debuff + (invMods.stats.ins || 0));

    let hpStat = vitTotal;
    if (state.identity.ruleset === 'vg-high-hp') hpStat = Math.max(vitTotal, insTotal);

    const newHealth = { ...state.health };
    const oldHpMax = newHealth.hpMax;
    newHealth.hpMax = newHealth.hpBase + hpStat;
    if (newHealth.hpMax > oldHpMax) newHealth.hpCurr += (newHealth.hpMax - oldHpMax); 
    else if (newHealth.hpCurr > newHealth.hpMax) newHealth.hpCurr = newHealth.hpMax;

    const newWill = { ...state.will };
    const oldWillMax = newWill.willMax;
    newWill.willMax = newWill.willBase + insTotal;
    if (newWill.willMax > oldWillMax) newWill.willCurr += (newWill.willMax - oldWillMax); 
    else if (newWill.willCurr > newWill.willMax) newWill.willCurr = newWill.willMax;

    updatesToSave['hp-curr'] = newHealth.hpCurr;
    updatesToSave['hp-max-display'] = newHealth.hpMax;
    updatesToSave['will-curr'] = newWill.willCurr;
    updatesToSave['will-max-display'] = newWill.willMax;

    return { health: newHealth, will: newWill };
};

export const createInventorySlice: StateCreator<CharacterState, [], [], InventorySlice> = (set) => ({
    inventory: [], notes: "", customInfo: [], tp: 0, currency: 0,

    addInventoryItem: () => set((state) => {
        const newInv: InventoryItem[] = [...state.inventory, { id: crypto.randomUUID(), qty: 1, name: '', desc: '', active: false }];
        const updatesToSave: Record<string, unknown> = { 'inv-data': JSON.stringify(newInv) };
        const { health, will } = syncHealthWill(state, newInv, updatesToSave);
        try { saveToOwlbear(updatesToSave); } catch(e){}
        return { inventory: newInv, health, will };
    }),
    
    updateInventoryItem: (id, field, value) => set((state) => {
        let statusChanged = false;
        let newStatuses = [...state.statuses];
        
        const newInv = state.inventory.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                
                if (field === 'name') {
                    const oldNameClean = String(item.name).trim().toLowerCase();
                    const newNameClean = String(value).trim().toLowerCase();
                    const oldTag = HARDCODED_TAGS[oldNameClean];
                    const newTag = HARDCODED_TAGS[newNameClean];

                    let currentDesc = item.desc || "";
                    
                    if (oldTag && oldTag !== newTag && currentDesc.includes(oldTag)) {
                        currentDesc = currentDesc.replace(oldTag, "").trim();
                    }
                    if (newTag && !currentDesc.includes(newTag)) {
                        currentDesc = currentDesc ? `${currentDesc}\n\n${newTag}`.trim() : newTag;
                    }
                    updated.desc = currentDesc;
                }

                if (field === 'active') {
                    const desc = (item.desc || "").toLowerCase();
                    const statusMatches = Array.from(desc.matchAll(/\[status:\s*([a-zA-Z0-9\s]+)\]/gi));

                    if (statusMatches.length > 0) {
                        if (value === true) {
                            statusMatches.forEach(match => {
                                const statusName = match[1].trim();
                                const properNames = ["1st Degree Burn", "2nd Degree Burn", "3rd Degree Burn", "Poison", "Badly Poisoned", "Paralysis", "Sleep", "Frozen Solid", "Confusion", "In Love", "Flinch"];
                                const properName = properNames.find(s => s.toLowerCase() === statusName.toLowerCase()) || statusName;
                                const isCustom = !properNames.includes(properName);
                                const exists = newStatuses.some(s => s.name.toLowerCase() === properName.toLowerCase() || s.customName.toLowerCase() === properName.toLowerCase());

                                if (!exists) {
                                    if (newStatuses.length === 1 && newStatuses[0].name === "Healthy") newStatuses = [];
                                    newStatuses.push({ id: crypto.randomUUID(), name: isCustom ? "Custom..." : properName, customName: isCustom ? properName : "", rounds: 0 });
                                    statusChanged = true;
                                }
                            });
                        } else {
                            statusMatches.forEach(match => {
                                const statusName = match[1].trim().toLowerCase();
                                const idx = newStatuses.findIndex(s => (s.name === "Custom..." ? s.customName.toLowerCase() : s.name.toLowerCase()) === statusName);
                                if (idx !== -1) {
                                    newStatuses.splice(idx, 1);
                                    statusChanged = true;
                                }
                            });
                            if (newStatuses.length === 0) {
                                newStatuses.push({ id: crypto.randomUUID(), name: "Healthy", customName: "", rounds: 0 });
                                statusChanged = true;
                            }
                        }
                    }
                }
                return updated as InventoryItem;
            }
            return item;
        });

        const updatesToSave: Record<string, unknown> = {};
        const { health, will } = syncHealthWill(state, newInv, updatesToSave);
        updatesToSave['inv-data'] = JSON.stringify(newInv);
        if (statusChanged) updatesToSave['status-list'] = JSON.stringify(newStatuses);

        try { saveToOwlbear(updatesToSave); } catch(e){}
        return { inventory: newInv, health, will, ...(statusChanged ? { statuses: newStatuses } : {}) };
    }),

    removeInventoryItem: (id) => set((state) => {
        const newInv = state.inventory.filter(i => i.id !== id);
        const updatesToSave: Record<string, unknown> = { 'inv-data': JSON.stringify(newInv) };
        const { health, will } = syncHealthWill(state, newInv, updatesToSave);
        try { saveToOwlbear(updatesToSave); } catch(e){}
        return { inventory: newInv, health, will };
    }),

    moveUpInventoryItem: (id) => set((state) => {
        const index = state.inventory.findIndex(i => i.id === id);
        if (index <= 0) return state;
        const newInv = [...state.inventory];
        [newInv[index - 1], newInv[index]] = [newInv[index], newInv[index - 1]];
        try { saveToOwlbear({ 'inv-data': JSON.stringify(newInv) }); } catch(e){}
        return { inventory: newInv };
    }),
    moveDownInventoryItem: (id) => set((state) => {
        const index = state.inventory.findIndex(i => i.id === id);
        if (index < 0 || index >= state.inventory.length - 1) return state;
        const newInv = [...state.inventory];
        [newInv[index + 1], newInv[index]] = [newInv[index], newInv[index + 1]];
        try { saveToOwlbear({ 'inv-data': JSON.stringify(newInv) }); } catch(e){}
        return { inventory: newInv };
    }),
    setNotes: (text) => set(() => {
        try { saveToOwlbear({ 'notes': text }); } catch(e){}
        return { notes: text };
    }),

    setTp: (val) => set(() => {
        try { saveToOwlbear({ 'training-points': val }); } catch(e){}
        return { tp: val };
    }),
    setCurrency: (val) => set(() => {
        try { saveToOwlbear({ 'currency': val }); } catch(e){}
        return { currency: val };
    }),

    addCustomInfo: () => set((state) => {
        const newInfo = [...state.customInfo, { id: crypto.randomUUID(), label: 'New Field', value: '' }];
        try { saveToOwlbear({ 'custom-info-data': JSON.stringify(newInfo) }); } catch(e){}
        return { customInfo: newInfo };
    }),
    updateCustomInfo: (id: string, field: keyof CustomInfo, value: string) => set((state) => {
        const newInfo = state.customInfo.map(c => c.id === id ? { ...c, [field]: value } : c);
        try { saveToOwlbear({ 'custom-info-data': JSON.stringify(newInfo) }); } catch(e){}
        return { customInfo: newInfo };
    }),
    removeCustomInfo: (id: string) => set((state) => {
        const newInfo = state.customInfo.filter(c => c.id !== id);
        try { saveToOwlbear({ 'custom-info-data': JSON.stringify(newInfo) }); } catch(e){}
        return { customInfo: newInfo };
    })
});