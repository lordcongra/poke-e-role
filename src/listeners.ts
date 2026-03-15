import { ALL_SKILLS, generateId } from './utils';
import { calculateStats } from './math';
import { fetchPokemonData, fetchAbilityData, populateLearnset, ALL_ABILITIES } from './api';
import { sheetView } from './view';
import { 
    updateSheetTypeUI, applyTypeStyle, renderTypeMatchups, renderStatuses, 
    renderEffects, renderCustomInfo, renderInventory, renderExtraSkills, updatePainUI, updateInventoryUI 
} from './ui';
import { 
    saveBatchDataToToken, saveMovesToToken, saveInventoryToToken, 
    saveExtraSkillsToToken, repairTrackers
} from './obr';
import { appState, syncDerivedStats, saveDataToToken } from './state';
import { rollStatus } from './combat';
import { ROOM_META_ID, reRenderMoves, applyStatLimits } from './sync';
import OBR from "@owlbear-rodeo/sdk";

const v = (el: HTMLInputElement) => parseInt(el.value) || 0;

export function setupEventListeners() {
    // --- DELEGATED INVENTORY LISTENER ---
    const invTableBody = document.getElementById('inventory-table-body');
    if (invTableBody) {
        invTableBody.addEventListener('change', () => {
            setTimeout(() => {
                calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
                syncDerivedStats();
                repairTrackers();
            }, 50);
        });
        
        invTableBody.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('del-item-btn')) {
                setTimeout(() => {
                    updateInventoryUI(appState.currentInventory);
                    calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
                    syncDerivedStats();
                    repairTrackers();
                }, 50);
            }
        });
    }

    // --- TOP-LEVEL BUTTON LISTENERS ---
    document.getElementById('toggle-learnset-btn')?.addEventListener('click', () => {
        const container = document.getElementById('learnset-container');
        const btn = document.getElementById('toggle-learnset-btn');
        if (container && btn) {
            if (container.style.display === 'none') {
                container.style.display = 'block';
                btn.innerText = "📖 Hide Learnset";
            } else {
                container.style.display = 'none';
                btn.innerText = "📖 View Learnset";
            }
        }
    });

    document.getElementById('add-status-btn')?.addEventListener('click', () => {
        appState.currentStatuses.push({ id: generateId(), name: "Healthy", customName: "", rounds: 0 });
        renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus);
        saveDataToToken('status-list', JSON.stringify(appState.currentStatuses));
    });

    document.getElementById('add-effect-btn')?.addEventListener('click', () => {
        appState.currentEffects.push({ id: generateId(), name: "", rounds: 0 });
        renderEffects(appState.currentEffects, saveDataToToken);
        saveDataToToken('effects-data', JSON.stringify(appState.currentEffects));
    });

    document.getElementById('add-custom-info-btn')?.addEventListener('click', () => {
        appState.currentCustomInfo.push({ id: generateId(), label: 'New Field', value: '' });
        renderCustomInfo(appState.currentCustomInfo, saveDataToToken);
        saveDataToToken('custom-info-data', JSON.stringify(appState.currentCustomInfo));
    });

    document.getElementById('add-cat-btn')?.addEventListener('click', () => {
        const categoryId = "cat_" + generateId();
        appState.currentExtraCategories.push({
            id: categoryId, name: "EXTRA",
            skills: [
                { id: categoryId + "_1", name: "", base: 0, buff: 0 }, { id: categoryId + "_2", name: "", base: 0, buff: 0 },
                { id: categoryId + "_3", name: "", base: 0, buff: 0 }, { id: categoryId + "_4", name: "", base: 0, buff: 0 }
            ]
        });
        renderExtraSkills(appState.currentExtraCategories, appState.currentMoves, saveExtraSkillsToToken, syncDerivedStats, reRenderMoves);
        reRenderMoves();
        saveExtraSkillsToToken(appState.currentExtraCategories);
    });

    document.getElementById('add-move-btn')?.addEventListener('click', () => {
        if (appState.currentMoves.length >= 20) { alert("You've reached the max of 20 moves."); return; }
        appState.currentMoves.push({ id: generateId(), name: '', attr: 'str', skill: 'brawl', type: '', cat: 'Phys', dmg: '', power: 0, dmgStat: '' });
        reRenderMoves();
        saveMovesToToken(appState.currentMoves);
    });

    document.getElementById('add-item-btn')?.addEventListener('click', () => {
        appState.currentInventory.push({ id: generateId(), qty: 1, name: '', desc: '', active: false });
        renderInventory(appState.currentInventory, saveInventoryToToken); 
        saveInventoryToToken(appState.currentInventory);
        updateInventoryUI(appState.currentInventory);
    });

    // --- ROUND RESET UNCHECKS BOXES & TICKS TIMERS ---
    document.getElementById('reset-round-btn')?.addEventListener('click', () => {
        sheetView.trackers.actions.value = "0";
        sheetView.trackers.evade.checked = false;
        sheetView.trackers.clash.checked = false;
        sheetView.trackers.fate.value = "0";
        sheetView.trackers.chances.value = "0";
        
        let updates: Record<string, any> = { 
            'actions-used': 0, 'evasions-used': false, 'clashes-used': false, 'chances-used': 0, 'fate-used': 0
        }; 

        let timersChanged = false;
        appState.currentEffects.forEach(e => {
            if (e.rounds > 0) { e.rounds--; timersChanged = true; }
        });

        if (timersChanged) {
            renderEffects(appState.currentEffects, saveDataToToken);
            updates['effects-data'] = JSON.stringify(appState.currentEffects);
        }

        Object.assign(appState.currentTokenData, updates);
        saveBatchDataToToken(updates);

        let movesChanged = false;
        appState.currentMoves.forEach(m => {
            if (m.used) { m.used = false; movesChanged = true; }
        });
        
        if (movesChanged) {
            reRenderMoves();
            saveMovesToToken(appState.currentMoves);
        }
    });

    // --- BASIC FIELD LISTENERS ---
    const listenerInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.sheet-save');
    listenerInputs.forEach(element => {
        if (['ability', 'is-npc', 'species', 'typing'].includes(element.id)) return; 

        element.addEventListener('input', () => calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory));
        
        element.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            let valToSave: any = target.type === 'number' ? (parseFloat(target.value) || 0) : target.type === 'checkbox' ? target.checked : target.value;
            
            appState.currentTokenData[target.id] = valToSave;
            saveDataToToken(target.id, valToSave);
            syncDerivedStats(); 
            repairTrackers(); 
            if (target.classList.contains('inv-input')) updateInventoryUI(appState.currentInventory);
        });
    });

    const npcCheckbox = document.getElementById('is-npc') as HTMLInputElement;
    if (npcCheckbox) {
        npcCheckbox.addEventListener('change', (e) => {
            saveDataToToken('is-npc', (e.target as HTMLInputElement).checked ? "true" : "false");
        });
    }

    const showTrackersCheckbox = document.getElementById('show-trackers') as HTMLInputElement;
    if (showTrackersCheckbox) {
        showTrackersCheckbox.addEventListener('change', (e) => {
            saveDataToToken('show-trackers', (e.target as HTMLInputElement).checked);
            syncDerivedStats();
        });
    }

    sheetView.identity.species.addEventListener('change', async () => {
        const pokemonName = sheetView.identity.species.value;
        const pokemonData = await fetchPokemonData(pokemonName);
        if (!pokemonData) return;

        populateLearnset(pokemonData);
        applyStatLimits(pokemonData); 

        const type1 = String(pokemonData.Type1 || "Normal");
        const type2 = String(pokemonData.Type2 || "");
        const hasSecondType = type2 && type2 !== "None" && type2 !== "null";
        const typing = hasSecondType ? `${type1} / ${type2}` : type1;
        
        const baseStats = pokemonData.BaseStats;
        const baseAttrs = pokemonData.Attributes || pokemonData.BaseAttributes || pokemonData;
        const hp = pokemonData.BaseHP || (baseStats && baseStats.HP) || 4;
        
        // Update ability datalist
        const abilityList = document.getElementById('ability-list');
        if (abilityList) abilityList.innerHTML = '';
        const abilities: string[] = [];
        
        const hasAbility1 = !!pokemonData.Ability1;
        const hasAbility2 = pokemonData.Ability2 && pokemonData.Ability2 !== "None" && pokemonData.Ability2 !== "null";
        const hasHiddenAbility = pokemonData.HiddenAbility && pokemonData.HiddenAbility !== "None" && pokemonData.HiddenAbility !== "null";

        if (hasAbility1) abilities.push(String(pokemonData.Ability1));
        if (hasAbility2) abilities.push(String(pokemonData.Ability2));
        if (hasHiddenAbility) abilities.push(String(pokemonData.HiddenAbility) + " (HA)");

        if (abilities.length === 0 && Array.isArray(pokemonData.Abilities)) {
            pokemonData.Abilities.forEach((a: string | { Name: string }) => {
                abilities.push(typeof a === 'string' ? a : a.Name);
            });
        }

        const nativeNames = abilities.map(a => a.replace(" (HA)", "").toLowerCase());

        // 1. Append native abilities first
        abilities.forEach((ab: string) => {
            const opt = document.createElement('option');
            opt.value = ab.replace(" (HA)", "");
            if (abilityList) abilityList.appendChild(opt);
        });

        // 2. Append all other global abilities below them
        ALL_ABILITIES.forEach(abName => {
            if (!nativeNames.includes(abName.toLowerCase())) {
                const opt = document.createElement('option');
                opt.value = abName;
                if (abilityList) abilityList.appendChild(opt);
            }
        });

        let defaultAbility = "";
        if (abilities.length > 0) {
            defaultAbility = abilities[0].replace(" (HA)", "");
            sheetView.identity.ability.value = defaultAbility;
            const abilityData = await fetchAbilityData(defaultAbility);
            if (abilityData) sheetView.identity.ability.title = String(abilityData.Effect || abilityData.Description || "No description found.");
        } else {
            sheetView.identity.ability.value = "";
        }

        sheetView.identity.typing.value = typing;
        applyTypeStyle(sheetView.identity.typing, typing); 
        renderTypeMatchups(typing); 

        sheetView.health.hp.base.value = String(hp);
        sheetView.stats.str.base.value = String(baseAttrs.Strength || 2);
        sheetView.stats.dex.base.value = String(baseAttrs.Dexterity || 2);
        sheetView.stats.vit.base.value = String(baseAttrs.Vitality || 2);
        sheetView.stats.spe.base.value = String(baseAttrs.Special || 2);
        sheetView.stats.ins.base.value = String(baseAttrs.Insight || 1);

        const batchUpdates: Record<string, any> = {
            'species': pokemonName, 'typing': typing, 'hp-base': hp,
            'str-base': baseAttrs.Strength || 2, 'dex-base': baseAttrs.Dexterity || 2, 
            'vit-base': baseAttrs.Vitality || 2, 'spe-base': baseAttrs.Special || 2, 
            'ins-base': baseAttrs.Insight || 1, 'ability': defaultAbility,
            'ability-list': abilities.join(',')
        };

        const hasExistingSkills = ALL_SKILLS.some((skill: string) => v(sheetView.skills[skill].base) > 0 || v(sheetView.skills[skill].buff) > 0);
        const hasExistingMoves = appState.currentMoves.length > 0;
        
        let shouldWipe = false;
        if (hasExistingSkills || hasExistingMoves) {
            shouldWipe = confirm("Warning: This token already has Skills/Moves setup.\n\nClick OK if loading a BRAND NEW Pokemon (Wipes Skills).\n\nClick CANCEL if Mega-Evolving/Form change (Keeps Skills).");
        } else {
            shouldWipe = true; 
        }

        if (shouldWipe) {
            ALL_SKILLS.forEach((skill: string) => {
                sheetView.skills[skill].base.value = "0"; batchUpdates[`${skill}-base`] = 0;
                sheetView.skills[skill].buff.value = "0"; batchUpdates[`${skill}-buff`] = 0;
            });
            appState.currentMoves = [];
            reRenderMoves();
            batchUpdates['moves-data'] = "[]";
        }

        Object.assign(appState.currentTokenData, batchUpdates);
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
        saveBatchDataToToken(batchUpdates); 
        syncDerivedStats();
        repairTrackers();
    });

    sheetView.identity.ability.addEventListener('change', async (e) => {
        const val = (e.target as HTMLInputElement).value;
        const abilityData = await fetchAbilityData(val);
        if (abilityData) (e.target as HTMLInputElement).title = String(abilityData.Effect || abilityData.Description || "No description found.");
        saveDataToToken('ability', val);
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory); 
    });

    sheetView.identity.sheetType.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        updateSheetTypeUI(val);
        saveDataToToken('sheet-type', val);
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    });

    // ROOM WIDE SYNC SETTINGS
    sheetView.identity.roomRuleset.addEventListener('change', async (e) => {
        const val = (e.target as HTMLSelectElement).value;
        const meta = await OBR.room.getMetadata();
        const roomMeta = (meta[ROOM_META_ID] as any) || {};
        await OBR.room.setMetadata({ [ROOM_META_ID]: { ...roomMeta, ruleset: val } });
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    });

    sheetView.identity.roomPain.addEventListener('change', async (e) => {
        const isEnabled = (e.target as HTMLSelectElement).value === 'true';
        const meta = await OBR.room.getMetadata();
        const roomMeta = (meta[ROOM_META_ID] as any) || {};
        await OBR.room.setMetadata({ [ROOM_META_ID]: { ...roomMeta, painEnabled: isEnabled } });
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
        updatePainUI(sheetView);
    });

    // --- DEFIBRILLATOR BUTTON ---
    document.getElementById('refresh-data-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refresh-data-btn') as HTMLButtonElement;
        btn.innerText = "⏳ Refreshing...";
        btn.disabled = true;

        const batchUpdates: Record<string, any> = {};
        const typingStr = sheetView.identity.typing.value;

        if (typingStr) {
            applyTypeStyle(sheetView.identity.typing, typingStr);
            renderTypeMatchups(typingStr); 
        }

        const pokemonName = sheetView.identity.species.value;
        const currentAbility = sheetView.identity.ability.value;

        if (pokemonName) {
            const pokemonData = await fetchPokemonData(pokemonName);
            if (pokemonData) {
                populateLearnset(pokemonData);
                applyStatLimits(pokemonData); 

                const abilityList = document.getElementById('ability-list');
                if (abilityList) abilityList.innerHTML = '';
                const abilities: string[] = [];
                
                const hasAbility1 = !!pokemonData.Ability1;
                const hasAbility2 = pokemonData.Ability2 && pokemonData.Ability2 !== "None" && pokemonData.Ability2 !== "null";
                const hasHiddenAbility = pokemonData.HiddenAbility && pokemonData.HiddenAbility !== "None" && pokemonData.HiddenAbility !== "null";

                if (hasAbility1) abilities.push(String(pokemonData.Ability1));
                if (hasAbility2) abilities.push(String(pokemonData.Ability2));
                if (hasHiddenAbility) abilities.push(String(pokemonData.HiddenAbility) + " (HA)");

                if (abilities.length === 0 && Array.isArray(pokemonData.Abilities)) {
                    pokemonData.Abilities.forEach((a: string | { Name: string }) => {
                        abilities.push(typeof a === 'string' ? a : a.Name);
                    });
                }

                const nativeNames = abilities.map(a => a.replace(" (HA)", "").toLowerCase());

                // 1. Append native abilities first
                abilities.forEach((ab: string) => {
                    const opt = document.createElement('option');
                    opt.value = ab.replace(" (HA)", "");
                    if (abilityList) abilityList.appendChild(opt);
                });

                // 2. Append all other global abilities below them
                ALL_ABILITIES.forEach(abName => {
                    if (!nativeNames.includes(abName.toLowerCase())) {
                        const opt = document.createElement('option');
                        opt.value = abName;
                        if (abilityList) abilityList.appendChild(opt);
                    }
                });

                if (currentAbility && abilities.some((a: string) => a.replace(" (HA)", "") === currentAbility)) {
                    sheetView.identity.ability.value = currentAbility;
                } else if (abilities.length > 0) {
                    sheetView.identity.ability.value = abilities[0].replace(" (HA)", "");
                    batchUpdates['ability'] = sheetView.identity.ability.value;
                } else {
                    sheetView.identity.ability.value = "";
                }
                batchUpdates['ability-list'] = abilities.join(',');
            }
        }

        if (sheetView.identity.ability.value) {
            const abilityData = await fetchAbilityData(sheetView.identity.ability.value);
            if (abilityData) sheetView.identity.ability.title = String(abilityData.Effect || abilityData.Description || "No description found.");
        }

        reRenderMoves();
        batchUpdates['moves-data'] = JSON.stringify(appState.currentMoves);
        Object.assign(appState.currentTokenData, batchUpdates);
        
        saveBatchDataToToken(batchUpdates); 
        syncDerivedStats(); 
        repairTrackers(); 
        
        btn.innerText = "✅ Done!";
        setTimeout(() => { btn.innerText = "🔄 Refresh Token Data"; btn.disabled = false; }, 2000);
    });
}