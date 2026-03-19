import OBR from "@owlbear-rodeo/sdk";
import type { Item } from "@owlbear-rodeo/sdk";
import { getVal, getDerivedVal, generateId } from './utils';
import type { Move, InventoryItem, ExtraCategory, PrettyInitMetadata, DicePlusData, SkillCheck } from './@types/index';
import { updateTokenGraphics, buildGraphicsDataFromMetadata } from './managers/graphicsManager';

export const MY_EXTENSION_ID = "pokerole-pmd-extension";
export const METADATA_ID = "pokerole-extension/stats";

export let currentTokenId: string | null = null;
export let isLoading = false;

export let lastKnownMetadata: Record<string, any> = {};
export let lastKnownMetadataStr = ""; 

// Dictionary upgraded to track Scale, Rotation, AND Metadata!
const knownTransforms: Record<string, { x: number, y: number, r: number, metaStr: string }> = {};

export function setTokenId(id: string | null) { currentTokenId = id; }
export function setLoading(loading: boolean) { isLoading = loading; }

export function setLastMetadataStr(str: string) { 
    lastKnownMetadataStr = str; 
    try { lastKnownMetadata = JSON.parse(str); } catch(e) { lastKnownMetadata = {}; }
}

export async function sendToDicePlus(notation: string, rollType: string = "roll") {
    if (!notation) return;
    try {
        const rollId = `${rollType}_${generateId()}`;
        const playerId = await OBR.player.getId();
        const playerName = await OBR.player.getName();

        const targetSelect = document.getElementById('roll-target') as HTMLSelectElement;
        const targetVisibility = targetSelect ? targetSelect.value : 'everyone';

        await OBR.broadcast.sendMessage("dice-plus/roll-request", {
            rollId: rollId, playerId, playerName,
            rollTarget: targetVisibility, diceNotation: notation,
            showResults: true, timestamp: Date.now(),
            source: MY_EXTENSION_ID 
        }, { destination: 'ALL' });
    } catch (e) {
        console.error("Dice+ Error:", e);
    }
}

// --- DEBOUNCER SYSTEM ---
let saveTimeout: ReturnType<typeof setTimeout>;
let pendingUpdates: Record<string, any> = {};

export async function saveBatchDataToToken(updates: Record<string, any>) {
  if (!currentTokenId || isLoading) return; 

  Object.assign(pendingUpdates, updates);
  clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
      const updatesToPush = { ...pendingUpdates };
      pendingUpdates = {};

      const domData = {
          'hp-curr': getVal('hp-curr'), 
          'hp-max-display': getDerivedVal('hp-max-display'),
          'will-curr': getVal('will-curr'), 
          'will-max-display': getDerivedVal('will-max-display'),
          'def-total': getDerivedVal('def-total'), 
          'spd-total': getDerivedVal('spd-total'),
          'actions-used': getVal('actions-used'),
          'evasions-used': (document.getElementById('evasions-used') as HTMLInputElement)?.checked || false,
          'clashes-used': (document.getElementById('clashes-used') as HTMLInputElement)?.checked || false,
          'y-offset': getVal('y-offset'), 
      };

      await OBR.scene.items.updateItems([currentTokenId!], (items: Item[]) => {
        for (let item of items) {
          if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
          const meta = item.metadata[METADATA_ID] as Record<string, any>;
          
          Object.assign(meta, updatesToPush, domData);

          lastKnownMetadata = { ...meta };
          lastKnownMetadataStr = JSON.stringify(meta);
        }
      });
  }, 150); 
}

export async function saveMovesToToken(currentMoves: Move[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['moves-data'] = JSON.stringify(currentMoves);
      lastKnownMetadata = { ...item.metadata[METADATA_ID] as Record<string, any> };
      lastKnownMetadataStr = JSON.stringify(lastKnownMetadata);
    }
  });
}

export async function saveSkillChecksToToken(currentSkillChecks: SkillCheck[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['skill-checks-data'] = JSON.stringify(currentSkillChecks);
      lastKnownMetadata = { ...item.metadata[METADATA_ID] as Record<string, any> };
      lastKnownMetadataStr = JSON.stringify(lastKnownMetadata);
    }
  });
}

export async function saveInventoryToToken(currentInventory: InventoryItem[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['inv-data'] = JSON.stringify(currentInventory);
      lastKnownMetadata = { ...item.metadata[METADATA_ID] as Record<string, any> };
      lastKnownMetadataStr = JSON.stringify(lastKnownMetadata);
    }
  });
}

export async function saveExtraSkillsToToken(currentExtraCategories: ExtraCategory[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, any>)['extra-skills-data'] = JSON.stringify(currentExtraCategories);
      lastKnownMetadata = { ...item.metadata[METADATA_ID] as Record<string, any> };
      lastKnownMetadataStr = JSON.stringify(lastKnownMetadata);
    }
  });
}

export function setupOBR(onTokenLoad: (tokenId: string) => void) {
    OBR.onReady(async () => {
        
        // --- BULLETPROOF INITIAL RENDER PIPELINE ---
        const renderAllTokens = async () => {
            try {
                const allItems = await OBR.scene.items.getItems();
                for (const item of allItems) {
                    if (item.layer === "CHARACTER" && item.metadata[METADATA_ID]) {
                        const meta = item.metadata[METADATA_ID] as Record<string, any>;
                        knownTransforms[item.id] = { x: item.scale.x, y: item.scale.y, r: item.rotation, metaStr: JSON.stringify(meta) };
                        
                        // We await this so the OBR local engine isn't slammed with 20 parallel requests!
                        await updateTokenGraphics(item, buildGraphicsDataFromMetadata(meta));
                    }
                }
            } catch (e) {
                console.error("Error rendering tokens on load:", e);
            }
        };

        // 1. Check if the scene is ALREADY ready (happens on quick reloads)
        const isReady = await OBR.scene.isReady();
        if (isReady) {
            await renderAllTokens();
        }

        // 2. Listen for the scene BECOMING ready (happens on initial load or map changes)
        OBR.scene.onReadyChange(async (ready) => {
            if (ready) {
                await renderAllTokens();
            }
        });

        // --- STANDARD LISTENERS ---
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

        OBR.scene.items.onChange(async (items: Item[]) => {
            for (const item of items) {
                if (item.layer === "CHARACTER" && item.metadata[METADATA_ID]) {
                    const meta = item.metadata[METADATA_ID] as Record<string, any> || {};
                    
                    const lastTransform = knownTransforms[item.id];
                    const rawX = item.scale.x;
                    const rawY = item.scale.y;
                    const rawR = item.rotation;
                    const metaStr = JSON.stringify(meta);

                    let needsGraphicsUpdate = false;

                    if (!lastTransform) {
                        knownTransforms[item.id] = { x: rawX, y: rawY, r: rawR, metaStr };
                        needsGraphicsUpdate = true;
                    } else {
                        const diffX = Math.abs(lastTransform.x - rawX);
                        const diffY = Math.abs(lastTransform.y - rawY);
                        const diffR = Math.abs(lastTransform.r - rawR);
                        
                        if (diffX > 0.005 || diffY > 0.005 || diffR > 0.005 || lastTransform.metaStr !== metaStr) {
                            knownTransforms[item.id] = { x: rawX, y: rawY, r: rawR, metaStr };
                            needsGraphicsUpdate = true;
                        }
                    }

                    if (needsGraphicsUpdate) {
                        const gData = buildGraphicsDataFromMetadata(meta);
                        // Do NOT await inside high-frequency drag events to prevent input lag!
                        updateTokenGraphics(item, gData); 
                    }

                    if (currentTokenId && item.id === currentTokenId) {
                        let isDiff = false;
                        const oldKeys = Object.keys(lastKnownMetadata);
                        const newKeys = Object.keys(meta);
                        if (oldKeys.length !== newKeys.length) {
                            isDiff = true;
                        } else {
                            for (const k of newKeys) {
                                if (String(meta[k]) !== String(lastKnownMetadata[k])) { 
                                    isDiff = true; 
                                    break; 
                                }
                            }
                        }

                        if (isDiff && !isLoading) {
                            lastKnownMetadata = { ...meta };
                            lastKnownMetadataStr = JSON.stringify(meta);
                            onTokenLoad(currentTokenId);
                        }
                    }
                }
            }
        });

        // --- NEW: GENERIC SUCCESS/FAIL NOTIFICATION CATCHER ---
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
            else if (data.rollId && (data.rollId.startsWith("roll_") || data.rollId.startsWith("chance_")) && data.result) {
                const val = parseInt(String(data.result.totalValue)) || 0;
                if (val > 0) {
                    OBR.notification.show(`✅ Result: ${val} Success${val > 1 ? 'es' : ''}!`);
                } else {
                    OBR.notification.show(`❌ Result: Failure! (0)`);
                }
            }
        });

        OBR.broadcast.onMessage(`${MY_EXTENSION_ID}/roll-error`, async (event) => {
            const data = event.data as DicePlusData;
            OBR.notification.show(`Dice+ Error: ${data.error || 'Unknown syntax error.'}`);
        });
    });
}