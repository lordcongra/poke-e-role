import OBR from "@owlbear-rodeo/sdk";
import type { Item } from "@owlbear-rodeo/sdk";
import { getVal, getDerivedVal, generateId } from './utils';
import type { Move, InventoryItem, ExtraCategory, OwlTracker, PrettyInitMetadata, DicePlusData } from './@types/index';

export const MY_EXTENSION_ID = "pokerole-pmd-extension";
export const METADATA_ID = "pokerole-extension/stats";

export let currentTokenId: string | null = null;
export let isLoading = false;
export let lastKnownMetadataStr = "";

export function setTokenId(id: string | null) { currentTokenId = id; }
export function setLoading(loading: boolean) { isLoading = loading; }
export function setLastMetadataStr(str: string) { lastKnownMetadataStr = str; }

export async function sendToDicePlus(notation: string, rollType: string = "roll") {
    if (!notation) return;
    try {
        const rollId = `${rollType}_${generateId()}`;
        const playerId = await OBR.player.getId();
        const playerName = await OBR.player.getName();

        const targetSelect = document.getElementById('roll-target') as HTMLSelectElement;
        const targetVisibility = targetSelect ? targetSelect.value : 'everyone';

        await OBR.broadcast.sendMessage("dice-plus/roll-request", {
            rollId: rollId,
            playerId: playerId,
            playerName: playerName,
            rollTarget: targetVisibility, 
            diceNotation: notation,
            showResults: true, 
            timestamp: Date.now(),
            source: MY_EXTENSION_ID 
        }, { destination: 'ALL' });
    } catch (e) {
        console.error("Dice+ Error:", e);
    }
}

// --- DEBOUNCER SYSTEM ---
let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, any> = {};

// OBR Colors: 0=Red, 1=Orange, 2=Yellow, 3=Green, 4=Cyan, 5=Blue, 6=Purple, 7=Pink, 8=Grey
const getTrackerColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('3rd degree')) return 0;
    if (lower.includes('2nd degree')) return 0;
    if (lower.includes('1st degree')) return 1;
    if (lower.includes('badly poisoned')) return 6;
    if (lower.includes('poison')) return 6;
    if (lower.includes('paralysis')) return 2;
    if (lower.includes('frozen')) return 4;
    if (lower.includes('sleep')) return 5;
    if (lower.includes('love')) return 7;
    return 8; 
};

export async function saveBatchDataToToken(updates: Record<string, any>) {
  if (!currentTokenId || isLoading) return; 

  Object.assign(pendingUpdates, updates);
  clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
      const updatesToPush = { ...pendingUpdates };
      pendingUpdates = {};

      const hpCurr = getVal('hp-curr');
      const hpMax = getDerivedVal('hp-max-display');
      const willCurr = getVal('will-curr');
      const willMax = getDerivedVal('will-max-display');
      const actions = getVal('actions-used');
      const def = getDerivedVal('def-total');
      const spdef = getDerivedVal('spd-total');

      await OBR.scene.items.updateItems([currentTokenId!], (items: Item[]) => {
        for (let item of items) {
          if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
          
          const meta = item.metadata[METADATA_ID] as Record<string, any>;
          for (const [key, value] of Object.entries(updatesToPush)) {
              meta[key] = value;
          }

          lastKnownMetadataStr = JSON.stringify(meta);

          const rawTrackers = item.metadata["com.owl-trackers/trackers"];
          let trackers: OwlTracker[] = rawTrackers ? JSON.parse(JSON.stringify(rawTrackers)) : [];
          
          const showTrackers = meta['show-trackers'] === undefined ? true : (meta['show-trackers'] === true || meta['show-trackers'] === 'true');
          const hasSpecies = meta['species'] && meta['species'].trim() !== "";

          const effectsDataRaw = meta['effects-data'];
          let effectsData: any[] = [];
          try { effectsData = effectsDataRaw ? (typeof effectsDataRaw === 'string' ? JSON.parse(effectsDataRaw) : effectsDataRaw) : []; } catch(e) {}
          
          const statusDataRaw = meta['status-list'];
          let statusData: any[] = [];
          try { statusData = statusDataRaw ? (typeof statusDataRaw === 'string' ? JSON.parse(statusDataRaw) : statusDataRaw) : []; } catch(e) {}

          const standardTrackers = ["HP", "Will", "Actions", "DEF", "SP DEF", "Evade", "Clash"];
          let activeDynamicNames = new Set<string>();

          effectsData.forEach(e => { 
              if (Number(e.rounds) > 0 && e.name?.trim()) activeDynamicNames.add(e.name.trim()); 
          });
          statusData.forEach(s => {
              if (Number(s.rounds) > 0) {
                  const sName = s.name === 'Custom...' ? s.customName : s.name;
                  if (sName?.trim()) activeDynamicNames.add(sName.trim());
              }
          });

          if (hasSpecies && showTrackers) {
              
              const evadeChecked = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
              const clashChecked = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

              trackers = trackers.filter(t => standardTrackers.includes(t.name) || activeDynamicNames.has(t.name));

              const updateTracker = (name: string, variant: string, color: number, value?: any, checked?: boolean, max?: number) => {
                  let tIndex = trackers.findIndex(x => x.name === name);
                  
                  if (tIndex !== -1 && trackers[tIndex].variant !== variant) {
                      trackers.splice(tIndex, 1);
                      tIndex = -1; 
                  }

                  if (tIndex !== -1) {
                      let t = trackers[tIndex];
                      t.variant = variant;
                      
                      if (value !== undefined) t.value = value;
                      else delete t.value;
                      
                      if (checked !== undefined) t.checked = checked;
                      else delete t.checked;
                      
                      if (max !== undefined) t.max = max;
                      else delete t.max;
                      
                      if (variant === 'counter') t.inlineMath = false;
                      else delete t.inlineMath;

                  } else {
                      let newT: any = { id: generateId(), name, variant, color };
                      if (value !== undefined) newT.value = value;
                      if (checked !== undefined) newT.checked = checked;
                      if (max !== undefined) newT.max = max;
                      if (variant === 'counter') newT.inlineMath = false;
                      trackers.push(newT);
                  }
              };

              updateTracker("Will", "value-max", 6, willCurr, undefined, willMax);
              updateTracker("HP", "value-max", 2, hpCurr, undefined, hpMax);
              updateTracker("Actions", "counter", 6, actions);
              updateTracker("DEF", "counter", 5, def);
              updateTracker("SP DEF", "counter", 1, spdef);
              updateTracker("Evade", "checkbox", 4, undefined, evadeChecked);
              updateTracker("Clash", "checkbox", 3, undefined, clashChecked);

              // Effects (Timers) are now Cyan (4)
              effectsData.forEach(e => {
                  if (Number(e.rounds) > 0 && e.name?.trim()) {
                      updateTracker(e.name.trim(), "counter", 4, Number(e.rounds));
                  }
              });

              // Statuses map dynamically!
              statusData.forEach(s => {
                  if (Number(s.rounds) > 0) {
                      const sName = s.name === 'Custom...' ? s.customName : s.name;
                      if (sName?.trim()) {
                          updateTracker(sName.trim(), "counter", getTrackerColor(s.name), Number(s.rounds));
                      }
                  }
              });

              item.metadata["com.owl-trackers/trackers"] = trackers;
          } else {
              trackers = trackers.filter(t => !standardTrackers.includes(t.name) && !activeDynamicNames.has(t.name));
              item.metadata["com.owl-trackers/trackers"] = trackers;
          }
        }
      });
  }, 150); 
}

export async function repairTrackers() {
    if (!currentTokenId || isLoading) return;
    
    await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
        for (let item of items) {
            let trackers = (item.metadata["com.owl-trackers/trackers"] as OwlTracker[]) || [];
            trackers = trackers.filter(t => t.name !== "Evade" && t.name !== "Clash");
            item.metadata["com.owl-trackers/trackers"] = trackers;
        }
    });

    setTimeout(() => {
        saveBatchDataToToken({ "_force_rebuild": Date.now() }); 
    }, 300);
}

export async function saveMovesToToken(currentMoves: Move[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['moves-data'] = JSON.stringify(currentMoves);
      lastKnownMetadataStr = JSON.stringify(item.metadata[METADATA_ID]);
    }
  });
}

export async function saveInventoryToToken(currentInventory: InventoryItem[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['inv-data'] = JSON.stringify(currentInventory);
      lastKnownMetadataStr = JSON.stringify(item.metadata[METADATA_ID]);
    }
  });
}

export async function saveExtraSkillsToToken(currentExtraCategories: ExtraCategory[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['extra-skills-data'] = JSON.stringify(currentExtraCategories);
      lastKnownMetadataStr = JSON.stringify(item.metadata[METADATA_ID]);
    }
  });
}

export function setupOBR(onTokenLoad: (tokenId: string) => void) {
    OBR.onReady(async () => {
        const selected = await OBR.player.getSelection();
        if (selected && selected.length > 0) {
            setTokenId(selected[0]);
            onTokenLoad(selected[0]);
        }

        OBR.player.onChange(async (player) => {
            if (player.selection && player.selection.length > 0) {
                if (currentTokenId !== player.selection[0]) {
                    setTokenId(player.selection[0]);
                    onTokenLoad(player.selection[0]);
                }
            }
        });

        OBR.scene.items.onChange((items: Item[]) => {
            if (!currentTokenId) return;
            const currentItem = items.find(i => i.id === currentTokenId);
            if (currentItem) {
                const newMeta = currentItem.metadata[METADATA_ID] || {};
                const newMetaStr = JSON.stringify(newMeta);
                if (newMetaStr !== lastKnownMetadataStr && !isLoading) {
                    onTokenLoad(currentTokenId);
                }
            }
        });

        OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-result`, async (event) => {
            const data = event.data as DicePlusData;
            const myId = await OBR.player.getId();
            
            if (data.playerId !== myId) return; 

            if (data.rollId && data.rollId.startsWith("init_") && data.result) {
                const total = parseInt(String(data.result.totalValue)) || 0;
                const tiebreaker = Math.floor(Math.random() * 6) + 1;
                const finalInit = total + (tiebreaker / 10); 
                
                if (currentTokenId) {
                    await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
                        for (let item of items) {
                            const existing = (item.metadata["com.pretty-initiative/metadata"] as PrettyInitMetadata) || {};
                            item.metadata["com.pretty-initiative/metadata"] = {
                                ...existing,
                                count: finalInit.toString(),
                                active: existing.active !== undefined ? existing.active : false,
                                group: existing.group !== undefined ? existing.group : 1
                            };
                        }
                    });
                }
            }
        });

        OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-error`, async (event) => {
            const data = event.data as DicePlusData;
            OBR.notification.show(`Dice+ Error: ${data.error || 'Unknown syntax error.'}`);
        });
    });
}