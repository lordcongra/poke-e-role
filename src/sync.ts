import OBR from "@owlbear-rodeo/sdk";
import type { DicePlusData } from './@types/index';
import { generateId } from './utils';
import { calculateStats } from './math';
import { fetchPokemonData, populateLearnset, ALL_ABILITIES } from './api';
import { sheetView } from './view';
import { 
    updateSheetTypeUI, applyTypeStyle, renderTypeMatchups, renderStatuses, 
    renderEffects, renderCustomInfo, renderInventory, renderExtraSkills, renderMoves,
    updatePainUI, updateInventoryUI, renderSkillChecks 
} from './ui';
import { 
    MY_EXTENSION_ID, METADATA_ID, setLoading, setLastMetadataStr, 
    saveBatchDataToToken, saveInventoryToToken, saveExtraSkillsToToken, saveMovesToToken,
    saveSkillChecksToToken
} from './obr';
import { appState, syncDerivedStats, saveDataToToken } from './state';
import { rollAccuracy, rollDamage, rollStatus, rollSkillCheck } from './combat';

export const ROOM_META_ID = `${MY_EXTENSION_ID}/room-settings`;

export function reRenderMoves() {
    renderMoves(appState.currentMoves, appState.currentExtraCategories, saveMovesToToken, rollAccuracy, rollDamage);
}

export function reRenderSkillChecks() {
    renderSkillChecks(appState.currentSkillChecks, appState.currentExtraCategories, saveSkillChecksToToken, rollSkillCheck);
}

export function applyStatLimits(pokemonData: Record<string, unknown>) {
    const getLimit = (stat: string) => {
        const val = pokemonData[`Max${stat}`] || pokemonData[`Max ${stat}`] || 
            ((pokemonData.MaxAttributes as Record<string, unknown>)?.[stat]) || 
            ((pokemonData.MaxStats as Record<string, unknown>)?.[stat]);
        return val ? parseInt(String(val)) : 5; 
    };

    const limits: Record<string, number> = {
        'str-limit': getLimit("Strength"),
        'dex-limit': getLimit("Dexterity"),
        'vit-limit': getLimit("Vitality"),
        'spe-limit': getLimit("Special"),
        'ins-limit': getLimit("Insight")
    };

    const updates: Record<string, unknown> = {};

    for (const [id, val] of Object.entries(limits)) {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) el.value = val.toString();
        appState.currentTokenData[id] = val;
        updates[id] = val;
    }

    saveBatchDataToToken(updates);
}

export async function loadDataFromToken(tokenId: string) {
  setLoading(true);
  try {
      const items = await OBR.scene.items.getItems([tokenId]);
      
      if (items.length > 0) {
        const token = items[0];
        const data = (token.metadata[METADATA_ID] as Record<string, unknown>) || {};
        
        appState.currentTokenData = data; 
        setLastMetadataStr(JSON.stringify(data)); 

        if (!data['type1'] && data['typing']) {
            const parts = String(data['typing']).split('/');
            data['type1'] = parts[0].trim();
            data['type2'] = parts.length > 1 ? parts[1].trim() : "None";
            appState.currentTokenData['type1'] = data['type1'];
            appState.currentTokenData['type2'] = data['type2'];
        }

        const role = await OBR.player.getRole();
        const isNPC = String(data['is-npc']) === 'true';

        const gmTools = document.getElementById('gm-tools');
        if (gmTools) gmTools.style.display = (role === 'GM') ? 'block' : 'none';

        const gmOnlySettings = document.querySelectorAll('.gm-only-setting');
        gmOnlySettings.forEach(el => {
            (el as HTMLElement).style.display = (role === 'GM') ? 'flex' : 'none';
        });

        if (role === 'PLAYER' && isNPC) {
            document.getElementById('app')!.style.display = 'none';
            document.getElementById('gm-lock-screen')!.style.display = 'block';
            renderTypeMatchups(String(data['typing'] || "")); 
            return;
        } 
        
        document.getElementById('app')!.style.display = 'block';
        const lockScreen = document.getElementById('gm-lock-screen');
        if (lockScreen) lockScreen.style.display = 'none';
        
        const sheetInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.sheet-save');
        const initialUpdates: Record<string, unknown> = {}; 

        sheetInputs.forEach(element => {
          const isDynamic = ['move-input', 'check-input', 'inv-input', 'cat-name-input', 'extra-skill-name', 'extra-skill-base', 'extra-skill-buff', 'skill-label'].some((cls: string) => element.classList.contains(cls));
          if (isDynamic) return;
          
          const id = element.id;
          let val = data[id];

          if (id === 'chances-used' && (val === true || val === 'true')) val = 1;
          if (id === 'chances-used' && (val === false || val === 'false')) val = 0;

          if (id === 'ability' && val) {
              const dataList = document.getElementById('ability-list');
              if (dataList) {
                  dataList.innerHTML = '';
                  const nativeNames: string[] = [];
                  
                  if (data['ability-list']) {
                      String(data['ability-list']).split(',').forEach((ab: string) => {
                          if (!ab.trim()) return;
                          const cleanName = ab.replace(" (HA)", "").trim();
                          nativeNames.push(cleanName.toLowerCase());
                          
                          const opt = document.createElement('option');
                          opt.value = cleanName;
                          opt.text = `${cleanName} (${ab.includes("(HA)") ? "Hidden Ability" : "Native Ability"})`;
                          dataList.appendChild(opt);
                      });
                  }
                  
                  ALL_ABILITIES.forEach(abName => {
                      if (!nativeNames.includes(abName.toLowerCase())) {
                          const opt = document.createElement('option');
                          opt.value = abName;
                          dataList.appendChild(opt);
                      }
                  });
              }
              element.value = String(val);
          }
          else if (element.type === 'checkbox') {
              const chk = element as HTMLInputElement;
              if (val !== undefined) chk.checked = (val === true || val === 'true');
              else initialUpdates[id] = chk.checked;
          }
          else if (val !== undefined) {
              element.value = String(val);
          } 
          else if (element instanceof HTMLSelectElement) {
              element.value = element.querySelector('option[selected]')?.getAttribute('value') || element.options[0]?.value || '';
              initialUpdates[id] = element.value; 
          } 
          else {
              element.value = element.defaultValue; 
              initialUpdates[id] = element.type === 'number' ? (parseFloat(element.value) || 0) : element.value; 
          }

          if (id === 'type1') applyTypeStyle(element, String(val || ""));
          if (id === 'type2') applyTypeStyle(element, val === "None" ? "" : String(val || ""));
        });

        const npcCheck = document.getElementById('is-npc') as HTMLInputElement;
        if (npcCheck) npcCheck.checked = isNPC;
        
        sheetView.identity.nickname.value = String(data['nickname'] || token.name || "");

        if (data['sheet-type']) updateSheetTypeUI(String(data['sheet-type']));

        try { appState.currentMoves = data['moves-data'] ? JSON.parse(String(data['moves-data'])) : []; } catch(e) { appState.currentMoves = []; }
        try { appState.currentSkillChecks = data['skill-checks-data'] ? JSON.parse(String(data['skill-checks-data'])) : []; } catch(e) { appState.currentSkillChecks = []; }
        try { appState.currentInventory = data['inv-data'] ? JSON.parse(String(data['inv-data'])) : []; } catch(e) { appState.currentInventory = []; }
        try { appState.currentExtraCategories = data['extra-skills-data'] ? JSON.parse(String(data['extra-skills-data'])) : []; } catch(e) { appState.currentExtraCategories = []; }
        try { appState.currentCustomInfo = data['custom-info-data'] ? JSON.parse(String(data['custom-info-data'])) : []; } catch(e) { appState.currentCustomInfo = []; }
        try { appState.currentEffects = data['effects-data'] ? JSON.parse(String(data['effects-data'])) : []; } catch(e) { appState.currentEffects = []; }

        try { 
            const parsedStatuses = data['status-list'] ? JSON.parse(String(data['status-list'])) : [{ id: generateId(), name: "Healthy", customName: "", rounds: 0 }]; 
            if (parsedStatuses.length > 0 && typeof parsedStatuses[0] === 'string') {
                appState.currentStatuses = parsedStatuses.map((s: string) => ({ id: generateId(), name: s, customName: "", rounds: 0 }));
            } else {
                appState.currentStatuses = parsedStatuses;
            }
        } catch(e) { 
            appState.currentStatuses = [{ id: generateId(), name: "Healthy", customName: "", rounds: 0 }]; 
        }

        reRenderMoves();
        reRenderSkillChecks();
        renderInventory(appState.currentInventory, saveInventoryToToken);
        updateInventoryUI(appState.currentInventory);
        renderExtraSkills(appState.currentExtraCategories, appState.currentMoves, saveExtraSkillsToToken, syncDerivedStats, reRenderMoves);
        renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus);
        renderEffects(appState.currentEffects, saveDataToToken);
        renderCustomInfo(appState.currentCustomInfo, saveDataToToken);
        
        let combinedTyping = String(data['typing'] || "");
        if (!combinedTyping && data['type1']) {
            combinedTyping = data['type2'] && data['type2'] !== "None" ? `${data['type1']} / ${data['type2']}` : String(data['type1']);
            sheetView.identity.typing.value = combinedTyping;
        }
        renderTypeMatchups(combinedTyping); 
        
        calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);

        const currentSpeciesName = String(data['species'] || "");
        if (currentSpeciesName) {
            fetchPokemonData(currentSpeciesName).then(pokemonData => {
                if (pokemonData) {
                    populateLearnset(pokemonData);
                }
            });
        }

        if (Object.keys(initialUpdates).length > 0) {
            Object.assign(appState.currentTokenData, initialUpdates);
            saveBatchDataToToken(initialUpdates);
        }
        
        syncDerivedStats();
      }
  } catch (err) {
      console.error("Critical error in loadDataFromToken:", err);
  } finally {
      setLoading(false); 
  }
}

export function initializeRoomSync() {
    OBR.room.getMetadata().then(meta => {
        const roomMeta = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
        if (roomMeta) {
            if (roomMeta.painEnabled !== undefined) sheetView.identity.roomPain.value = roomMeta.painEnabled ? 'true' : 'false';
            if (roomMeta.ruleset !== undefined) sheetView.identity.roomRuleset.value = String(roomMeta.ruleset);
        }
        updatePainUI();
    });

    OBR.room.onMetadataChange(meta => {
        const roomMeta = (meta[ROOM_META_ID] as Record<string, unknown>) || {};
        if (roomMeta) {
            let changed = false;
            if (roomMeta.painEnabled !== undefined && sheetView.identity.roomPain.value !== (roomMeta.painEnabled ? 'true' : 'false')) {
                sheetView.identity.roomPain.value = roomMeta.painEnabled ? 'true' : 'false';
                changed = true;
            }
            if (roomMeta.ruleset !== undefined && sheetView.identity.roomRuleset.value !== String(roomMeta.ruleset)) {
                sheetView.identity.roomRuleset.value = String(roomMeta.ruleset);
                changed = true;
            }
            if (changed) {
                calculateStats(appState.currentExtraCategories, appState.currentMoves, appState.currentInventory);
                updatePainUI();
                syncDerivedStats();
            }
        }
    });

    OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-result`, async (event) => {
        const data = event.data as DicePlusData;
        const myId = await OBR.player.getId();
        if (data.playerId !== myId) return; 

        if (data.rollId && data.rollId.startsWith("status|") && data.result) {
            const statusId = data.rollId.split("_")[0].split("|")[1];
            const successes = parseInt(String(data.result.totalValue)) || 0; 
            
            let statusChanged = false;
            appState.currentStatuses.forEach(s => {
                if (s.id === statusId) {
                    s.rounds += successes; 
                    statusChanged = true;
                }
            });

            if (statusChanged) {
                renderStatuses(appState.currentStatuses, saveDataToToken, rollStatus);
                const updates = { 'status-list': JSON.stringify(appState.currentStatuses) };
                Object.assign(appState.currentTokenData, updates);
                saveBatchDataToToken(updates);
            }
        }
    });
}