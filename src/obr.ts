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

// --- NEW DEBOUNCER SYSTEM (Fixes flickering stats!) ---
let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, any> = {};

export async function saveBatchDataToToken(updates: Record<string, any>) {
  if (!currentTokenId || isLoading) return; 

  // Queue all incoming changes
  Object.assign(pendingUpdates, updates);

  // Restart the timer every time a new change comes in
  clearTimeout(saveTimeout);
  
  // Wait 400ms after the user stops clicking before sending to OBR
  saveTimeout = setTimeout(async () => {
      const updatesToPush = { ...pendingUpdates };
      pendingUpdates = {}; // Clear queue

      const hpCurr = getVal('hp-curr');
      const hpMax = getDerivedVal('hp-max-display');
      const willCurr = getVal('will-curr');
      const willMax = getDerivedVal('will-max-display');
      const actions = getVal('actions-used');
      const def = getDerivedVal('def-total');
      const spdef = getDerivedVal('spd-total');
      
      // Strict Numbers for the new Counters
      const evade = Number(getVal('evasions-used')) || 0;
      const clash = Number(getVal('clashes-used')) || 0;

      await OBR.scene.items.updateItems([currentTokenId!], (items: Item[]) => {
        for (let item of items) {
          if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
          
          const meta = item.metadata[METADATA_ID] as Record<string, any>;
          for (const [key, value] of Object.entries(updatesToPush)) {
              meta[key] = value;
          }

          lastKnownMetadataStr = JSON.stringify(meta);

          let trackers = (item.metadata["com.owl-trackers/trackers"] as OwlTracker[]) || [];
          
          const updateTracker = (name: string, variant: string, color: number, value: number, max?: number) => {
              let t = trackers.find(x => x.name === name);
              if (t) {
                  t.variant = variant;
                  t.value = value;
                  if (max !== undefined) t.max = max;
                  delete t.checked; // Scrub old broken checkbox data
              } else {
                  trackers.push({ id: generateId(), name, variant, color, value, max });
              }
          };

          updateTracker("Will", "value-max", 6, willCurr, willMax);
          updateTracker("HP", "value-max", 2, hpCurr, hpMax);
          updateTracker("Actions", "counter", 6, actions);
          updateTracker("DEF", "counter", 5, def);
          updateTracker("SP DEF", "counter", 1, spdef);
          
          // CONVERTED TO COUNTERS! No more X-Boxes!
          updateTracker("Evade", "counter", 4, evade);
          updateTracker("Clash", "counter", 3, clash);

          item.metadata["com.owl-trackers/trackers"] = trackers;
        }
      });
  }, 400); 
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