import OBR from "@owlbear-rodeo/sdk";
import { ALL_SKILLS } from '../utils';
import { calculateStats } from '../math';
import { fetchPokemonData, fetchAbilityData, populateLearnset, ALL_ABILITIES } from '../api';
import { sheetView } from '../view';
import { updateSheetTypeUI, applyTypeStyle, renderTypeMatchups } from '../ui';
import { saveBatchDataToToken } from '../obr';
import { appState, syncDerivedStats, saveDataToToken } from '../state';
import { reRenderMoves } from '../sync';
import { updateHealthBars } from '../listeners/uiListeners';

const v = (el: HTMLInputElement) => parseInt(el.value) || 0;

export function handleTypeChange() {
    const t1 = (document.getElementById('type1') as HTMLSelectElement).value;
    const t2 = (document.getElementById('type2') as HTMLSelectElement).value;
    
    let combined = "";
    if (t1 !== "None" && t2 !== "None") combined = `${t1} / ${t2}`;
    else if (t1 !== "None") combined = t1;
    else if (t2 !== "None") combined = t2;
    
    const hiddenTyping = document.getElementById('typing') as HTMLInputElement;
    if (hiddenTyping) {
        hiddenTyping.value = combined;
        saveDataToToken('typing', combined);
        appState.currentTokenData['typing'] = combined;
    }

    applyTypeStyle(document.getElementById('type1'), t1 === "None" ? "" : t1);
    applyTypeStyle(document.getElementById('type2'), t2 === "None" ? "" : t2);
    renderTypeMatchups(combined);
    
    calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
}

export function handleFormSwap() {
    const swapFields = [
        'species', 'typing', 'type1', 'type2', 'ability', 'hp-base', 'str-base', 'dex-base', 'vit-base', 'spe-base', 'ins-base', 
        'str-limit', 'dex-limit', 'vit-limit', 'spe-limit', 'ins-limit', 'ability-list'
    ];
    const isAltForm = (appState.currentTokenData['is-alt-form'] as boolean) === true;
    const currentSaveKey = isAltForm ? 'alt-form-data' : 'base-form-data';
    const targetLoadKey = isAltForm ? 'base-form-data' : 'alt-form-data';
    
    const currentDataToSave: Record<string, string | number | boolean> = {};
    swapFields.forEach(f => {
        const val = appState.currentTokenData[f];
        currentDataToSave[f] = val !== undefined ? (val as string | number | boolean) : (document.getElementById(f) as HTMLInputElement)?.value;
    });
    
    let rawTargetData = appState.currentTokenData[targetLoadKey];
    let loadedData: Record<string, string | number | boolean> | null = null;
    
    if (typeof rawTargetData === 'string') {
        try { loadedData = JSON.parse(rawTargetData) as Record<string, string | number | boolean>; } 
        catch(e) { loadedData = null; }
    } else if (rawTargetData && typeof rawTargetData === 'object') {
        loadedData = rawTargetData as Record<string, string | number | boolean>;
    }

    if (loadedData && !loadedData['type1'] && loadedData['typing']) {
        const parts = String(loadedData['typing']).split('/');
        loadedData['type1'] = parts[0].trim();
        loadedData['type2'] = parts.length > 1 ? parts[1].trim() : "None";
    }
    
    if (!loadedData) {
        loadedData = { ...currentDataToSave };
        OBR.notification.show("🧬 Created new Alt Form from current stats!");
    } else {
        OBR.notification.show(`🧬 Swapped to ${isAltForm ? 'Base' : 'Alt'} Form!`);
    }
    
    const batchUpdates: Record<string, string | number | boolean> = {
        [currentSaveKey]: JSON.stringify(currentDataToSave),
        'is-alt-form': !isAltForm
    };
    
    swapFields.forEach(f => {
        if (loadedData && loadedData[f] !== undefined) {
            batchUpdates[f] = loadedData[f];
            const el = document.getElementById(f) as HTMLInputElement;
            if (el) {
                el.value = String(loadedData[f]);
                if (f === 'type1') {
                    applyTypeStyle(el, String(loadedData![f]));
                } else if (f === 'type2') {
                    applyTypeStyle(el, String(loadedData![f]) === "None" ? "" : String(loadedData![f]));
                }
            }
        }
    });
    
    if (loadedData && loadedData['ability-list']) {
        const abilityList = document.getElementById('ability-list');
        if (abilityList) {
            abilityList.innerHTML = '';
            const nativeNames: string[] = [];
            
            String(loadedData['ability-list']).split(',').forEach((ab: string) => {
                if(ab.trim()) {
                    const cleanName = ab.replace(" (HA)", "").trim();
                    nativeNames.push(cleanName.toLowerCase());
                    const opt = document.createElement('option');
                    opt.value = cleanName;
                    opt.text = `${cleanName} (${ab.includes("(HA)") ? "Hidden Ability" : "Native Ability"})`;
                    abilityList.appendChild(opt);
                }
            });
            
            ALL_ABILITIES.forEach(abName => {
                if (!nativeNames.includes(abName.toLowerCase())) {
                    const opt = document.createElement('option');
                    opt.value = abName;
                    abilityList.appendChild(opt);
                }
            });
        }
    }

    Object.assign(appState.currentTokenData, batchUpdates);
    saveBatchDataToToken(batchUpdates);
    
    if (batchUpdates['typing']) {
        renderTypeMatchups(String(batchUpdates['typing']));
    }

    calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    syncDerivedStats();
    updateHealthBars();
}

export function handleSheetTypeChange(val: string) {
    const batchUpdates: Record<string, string | number | boolean> = { 'sheet-type': val };

    const currentStats = {
        'type1': String((document.getElementById('type1') as HTMLSelectElement)?.value || "None"),
        'type2': String((document.getElementById('type2') as HTMLSelectElement)?.value || "None"),
        'typing': String((document.getElementById('typing') as HTMLInputElement)?.value || ""),
        'str-base': Number((document.getElementById('str-base') as HTMLInputElement)?.value || 2),
        'dex-base': Number((document.getElementById('dex-base') as HTMLInputElement)?.value || 2),
        'vit-base': Number((document.getElementById('vit-base') as HTMLInputElement)?.value || 2),
        'spe-base': Number((document.getElementById('spe-base') as HTMLInputElement)?.value || 2),
        'ins-base': Number((document.getElementById('ins-base') as HTMLInputElement)?.value || 1),
        'str-limit': Number((document.getElementById('str-limit') as HTMLInputElement)?.value || 5),
        'dex-limit': Number((document.getElementById('dex-limit') as HTMLInputElement)?.value || 5),
        'vit-limit': Number((document.getElementById('vit-limit') as HTMLInputElement)?.value || 5),
        'spe-limit': Number((document.getElementById('spe-limit') as HTMLInputElement)?.value || 5),
        'ins-limit': Number((document.getElementById('ins-limit') as HTMLInputElement)?.value || 5)
    };

    if (val === 'trainer') {
        const backupStr = JSON.stringify(currentStats);
        appState.currentTokenData['pokemon-backup'] = backupStr;
        batchUpdates['pokemon-backup'] = backupStr;

        const rawTrainerBackup = appState.currentTokenData['trainer-backup'];
        if (rawTrainerBackup && typeof rawTrainerBackup === 'string') {
            try {
                const tBackup = JSON.parse(rawTrainerBackup);
                ['str', 'dex', 'vit', 'spe', 'ins'].forEach(s => {
                    if (tBackup[`${s}-base`] !== undefined) {
                        const el = document.getElementById(`${s}-base`) as HTMLInputElement;
                        if (el) el.value = String(tBackup[`${s}-base`]);
                        appState.currentTokenData[`${s}-base`] = Number(tBackup[`${s}-base`]);
                        batchUpdates[`${s}-base`] = Number(tBackup[`${s}-base`]);
                    }
                    if (tBackup[`${s}-limit`] !== undefined) {
                        const el = document.getElementById(`${s}-limit`) as HTMLInputElement;
                        if (el) el.value = String(tBackup[`${s}-limit`]);
                        appState.currentTokenData[`${s}-limit`] = Number(tBackup[`${s}-limit`]);
                        batchUpdates[`${s}-limit`] = Number(tBackup[`${s}-limit`]);
                    }
                });
            } catch(err) {}
        } else {
            ['str', 'dex', 'vit', 'spe', 'ins'].forEach(s => {
                const baseEl = document.getElementById(`${s}-base`) as HTMLInputElement;
                const limitEl = document.getElementById(`${s}-limit`) as HTMLInputElement;
                if (baseEl) baseEl.value = "1";
                if (limitEl) limitEl.value = "5";
                appState.currentTokenData[`${s}-base`] = 1;
                appState.currentTokenData[`${s}-limit`] = 5;
                batchUpdates[`${s}-base`] = 1;
                batchUpdates[`${s}-limit`] = 5;
            });
        }

        const t1 = document.getElementById('type1') as HTMLSelectElement;
        const t2 = document.getElementById('type2') as HTMLSelectElement;
        const typ = document.getElementById('typing') as HTMLInputElement;
        if (t1) t1.value = "None";
        if (t2) t2.value = "None";
        if (typ) typ.value = "";
        
        appState.currentTokenData['type1'] = "None";
        appState.currentTokenData['type2'] = "None";
        appState.currentTokenData['typing'] = "";
        batchUpdates['type1'] = "None";
        batchUpdates['type2'] = "None";
        batchUpdates['typing'] = "";

    } else {
        const backupStr = JSON.stringify(currentStats);
        appState.currentTokenData['trainer-backup'] = backupStr;
        batchUpdates['trainer-backup'] = backupStr;

        const rawBackup = appState.currentTokenData['pokemon-backup'];
        if (rawBackup && typeof rawBackup === 'string') {
            try {
                const backup = JSON.parse(rawBackup);
                ['str', 'dex', 'vit', 'spe', 'ins'].forEach(s => {
                    if (backup[`${s}-base`] !== undefined) {
                        const el = document.getElementById(`${s}-base`) as HTMLInputElement;
                        if (el) el.value = String(backup[`${s}-base`]);
                        appState.currentTokenData[`${s}-base`] = Number(backup[`${s}-base`]);
                        batchUpdates[`${s}-base`] = Number(backup[`${s}-base`]);
                    }
                    if (backup[`${s}-limit`] !== undefined) {
                        const el = document.getElementById(`${s}-limit`) as HTMLInputElement;
                        if (el) el.value = String(backup[`${s}-limit`]);
                        appState.currentTokenData[`${s}-limit`] = Number(backup[`${s}-limit`]);
                        batchUpdates[`${s}-limit`] = Number(backup[`${s}-limit`]);
                    }
                });
                if (backup['type1'] !== undefined) {
                    const el = document.getElementById('type1') as HTMLSelectElement;
                    if (el) el.value = String(backup['type1']);
                    appState.currentTokenData['type1'] = String(backup['type1']);
                    batchUpdates['type1'] = String(backup['type1']);
                }
                if (backup['type2'] !== undefined) {
                    const el = document.getElementById('type2') as HTMLSelectElement;
                    if (el) el.value = String(backup['type2']);
                    appState.currentTokenData['type2'] = String(backup['type2']);
                    batchUpdates['type2'] = String(backup['type2']);
                }
                if (backup['typing'] !== undefined) {
                    const el = document.getElementById('typing') as HTMLInputElement;
                    if (el) el.value = String(backup['typing']);
                    appState.currentTokenData['typing'] = String(backup['typing']);
                    batchUpdates['typing'] = String(backup['typing']);
                }
            } catch(err) {}
        }
    }

    updateSheetTypeUI(val);
    applyTypeStyle(document.getElementById('type1'), String(appState.currentTokenData['type1'] || ""));
    applyTypeStyle(document.getElementById('type2'), String(appState.currentTokenData['type2']) === "None" ? "" : String(appState.currentTokenData['type2'] || ""));
    renderTypeMatchups(String(appState.currentTokenData['typing'] || ""));

    saveBatchDataToToken(batchUpdates);
    calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
    syncDerivedStats();
    updateHealthBars();
}

export async function handleSpeciesChange() {
    const pokemonName = sheetView.identity.species.value;
    const pokemonData = await fetchPokemonData(pokemonName);
    if (!pokemonData) return;

    populateLearnset(pokemonData);
    
    const getLimit = (stat: string) => {
        const pd = pokemonData as Record<string, unknown>;
        const maxAttr = pd.MaxAttributes as Record<string, string | number> | undefined;
        const maxStats = pd.MaxStats as Record<string, string | number> | undefined;
        const val = pd[`Max${stat}`] || pd[`Max ${stat}`] || (maxAttr && maxAttr[stat]) || (maxStats && maxStats[stat]);
        return val ? parseInt(String(val)) : 5;
    };
    
    const strLimit = getLimit("Strength");
    const dexLimit = getLimit("Dexterity");
    const vitLimit = getLimit("Vitality");
    const speLimit = getLimit("Special");
    const insLimit = getLimit("Insight");

    const type1 = String(pokemonData.Type1 || "Normal");
    const type2 = String(pokemonData.Type2 || "None");
    const hasSecondType = type2 && type2 !== "None" && type2 !== "null";
    const typing = hasSecondType ? `${type1} / ${type2}` : type1;
    
    const baseStats = pokemonData.BaseStats;
    const baseAttrs = pokemonData.Attributes || pokemonData.BaseAttributes || pokemonData;
    const hp = pokemonData.BaseHP || (baseStats && baseStats.HP) || 4;
    
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
        pokemonData.Abilities.forEach((a: string | Record<string, unknown>) => {
            abilities.push(typeof a === 'string' ? a : String(a.Name || ""));
        });
    }

    const nativeNames = abilities.map(a => a.replace(" (HA)", "").toLowerCase());

    abilities.forEach((ab: string) => {
        const cleanName = ab.replace(" (HA)", "");
        const opt = document.createElement('option');
        opt.value = cleanName;
        opt.text = `${cleanName} (${ab.includes("(HA)") ? "Hidden Ability" : "Native Ability"})`;
        if (abilityList) abilityList.appendChild(opt);
    });

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
    }

    const batchUpdates: Record<string, string | number | boolean> = {
        'species': pokemonName, 'typing': typing, 'type1': type1, 'type2': type2, 'hp-base': hp,
        'str-base': baseAttrs.Strength || 2, 'dex-base': baseAttrs.Dexterity || 2, 
        'vit-base': baseAttrs.Vitality || 2, 'spe-base': baseAttrs.Special || 2, 
        'ins-base': baseAttrs.Insight || 1, 'ability': defaultAbility,
        'ability-list': abilities.join(','),
        'str-limit': strLimit, 'dex-limit': dexLimit, 'vit-limit': vitLimit, 'spe-limit': speLimit, 'ins-limit': insLimit
    };

    const hasExistingSkills = ALL_SKILLS.some((skill: string) => v(sheetView.skills[skill].base) > 0 || v(sheetView.skills[skill].buff) > 0);
    const hasExistingMoves = appState.currentMoves.length > 0;
    
    const applySpeciesData = (shouldWipe: boolean, updateStats: boolean) => {
        sheetView.identity.ability.value = defaultAbility;
        const infoBtn = document.getElementById('ability-info-btn');
        if (infoBtn) {
            infoBtn.setAttribute('data-title', defaultAbility || "Ability");
            infoBtn.setAttribute('data-desc', "Click to load description.");
        }
        
        const hiddenTyping = document.getElementById('typing') as HTMLInputElement;
        if (hiddenTyping) hiddenTyping.value = typing;
        
        const t1El = document.getElementById('type1') as HTMLSelectElement;
        const t2El = document.getElementById('type2') as HTMLSelectElement;
        if (t1El) t1El.value = type1;
        if (t2El) t2El.value = type2;
        
        applyTypeStyle(t1El, type1);
        applyTypeStyle(t2El, type2 === "None" ? "" : type2);
        renderTypeMatchups(typing);

        if (!updateStats) {
            ['hp-base', 'str-base', 'dex-base', 'vit-base', 'spe-base', 'ins-base', 'str-limit', 'dex-limit', 'vit-limit', 'spe-limit', 'ins-limit'].forEach(k => delete batchUpdates[k]);
        } else {
            sheetView.health.hp.base.value = String(hp);
            sheetView.stats.str.base.value = String(baseAttrs.Strength || 2);
            sheetView.stats.dex.base.value = String(baseAttrs.Dexterity || 2);
            sheetView.stats.vit.base.value = String(baseAttrs.Vitality || 2);
            sheetView.stats.spe.base.value = String(baseAttrs.Special || 2);
            sheetView.stats.ins.base.value = String(baseAttrs.Insight || 1);
            (document.getElementById('str-limit') as HTMLInputElement).value = String(strLimit);
            (document.getElementById('dex-limit') as HTMLInputElement).value = String(dexLimit);
            (document.getElementById('vit-limit') as HTMLInputElement).value = String(vitLimit);
            (document.getElementById('spe-limit') as HTMLInputElement).value = String(speLimit);
            (document.getElementById('ins-limit') as HTMLInputElement).value = String(insLimit);
        }

        if (shouldWipe) {
            ALL_SKILLS.forEach((skill: string) => {
                sheetView.skills[skill].base.value = "0"; batchUpdates[`${skill}-base`] = 0;
                sheetView.skills[skill].buff.value = "0"; batchUpdates[`${skill}-buff`] = 0;
            });
            appState.currentMoves = [];
            appState.currentSkillChecks = [];
            reRenderMoves();
            batchUpdates['moves-data'] = "[]";
            batchUpdates['skill-checks-data'] = "[]";
        }

        Object.assign(appState.currentTokenData, batchUpdates);
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
        saveBatchDataToToken(batchUpdates); 
        syncDerivedStats();
        updateHealthBars();
    };

    if (hasExistingSkills || hasExistingMoves) {
        const modal = document.getElementById('species-swap-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            const onFormChange = () => { 
                const updateStats = (document.getElementById('swap-update-stats') as HTMLInputElement)?.checked ?? true;
                cleanup(); applySpeciesData(false, updateStats); 
            };
            const onNewToken = () => { 
                const updateStats = (document.getElementById('swap-update-stats') as HTMLInputElement)?.checked ?? true;
                cleanup(); applySpeciesData(true, updateStats); 
            };
            const onCancel = () => { 
                cleanup(); 
                sheetView.identity.species.value = String(appState.currentTokenData['species'] || ""); 
            };
            
            const cleanup = () => {
                modal.style.display = 'none';
                document.getElementById('swap-form-btn')?.removeEventListener('click', onFormChange);
                document.getElementById('swap-new-btn')?.removeEventListener('click', onNewToken);
                document.getElementById('swap-cancel-btn')?.removeEventListener('click', onCancel);
            };

            document.getElementById('swap-form-btn')?.addEventListener('click', onFormChange);
            document.getElementById('swap-new-btn')?.addEventListener('click', onNewToken);
            document.getElementById('swap-cancel-btn')?.addEventListener('click', onCancel);
        } else {
            applySpeciesData(true, true);
        }
    } else {
        applySpeciesData(true, true);
    }
}

export async function handleRefreshData(btn: HTMLButtonElement) {
    btn.innerText = "⏳ Refreshing...";
    btn.disabled = true;

    const batchUpdates: Record<string, string | number | boolean> = {};
    const typingStr = (document.getElementById('typing') as HTMLInputElement)?.value;

    if (typingStr) {
        renderTypeMatchups(typingStr); 
    }

    const pokemonName = sheetView.identity.species.value;
    const currentAbility = sheetView.identity.ability.value;

    if (pokemonName) {
        const pokemonData = await fetchPokemonData(pokemonName);
        if (pokemonData) {
            populateLearnset(pokemonData);
            
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
                pokemonData.Abilities.forEach((a: string | Record<string, unknown>) => {
                    abilities.push(typeof a === 'string' ? a : String(a.Name || ""));
                });
            }

            const nativeNames = abilities.map(a => a.replace(" (HA)", "").toLowerCase());

            abilities.forEach((ab: string) => {
                const cleanName = ab.replace(" (HA)", "");
                const opt = document.createElement('option');
                opt.value = cleanName;
                opt.text = `${cleanName} (${ab.includes("(HA)") ? "Hidden Ability" : "Native Ability"})`;
                if (abilityList) abilityList.appendChild(opt);
            });

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
        const val = sheetView.identity.ability.value;
        const abilityData = await fetchAbilityData(val);
        const infoBtn = document.getElementById('ability-info-btn');
        if (infoBtn) {
            infoBtn.setAttribute('data-title', val || "Ability");
            infoBtn.setAttribute('data-desc', abilityData ? String(abilityData.Effect || abilityData.Description || "No description found.") : "No description found.");
        }
    }

    reRenderMoves();
    batchUpdates['moves-data'] = JSON.stringify(appState.currentMoves);
    Object.assign(appState.currentTokenData, batchUpdates);
    
    saveBatchDataToToken(batchUpdates); 
    syncDerivedStats(); 
    updateHealthBars();
    
    btn.innerText = "✅ Done!";
    setTimeout(() => { btn.innerText = "🔄 Refresh Token Data"; btn.disabled = false; }, 2000);
}