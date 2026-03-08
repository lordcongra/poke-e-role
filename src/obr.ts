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

export async function saveBatchDataToToken(updates: Record<string, string>) {
  if (!currentTokenId || isLoading) return; 

  const hpCurr = getVal('hp-curr');
  const hpMax = getDerivedVal('hp-max-display');
  const willCurr = getVal('will-curr');
  const willMax = getDerivedVal('will-max-display');
  const actions = getVal('actions-used');
  const def = getDerivedVal('def-total');
  const spdef = getDerivedVal('spd-total');
  const evade = getVal('evasions-used') > 0;
  const clash = getVal('clashes-used') > 0;

  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      const meta = item.metadata[METADATA_ID] as Record<string, string>;
      for (const [key, value] of Object.entries(updates)) {
          meta[key] = value;
      }

      lastKnownMetadataStr = JSON.stringify(meta);

      let trackers = (item.metadata["com.owl-trackers/trackers"] as OwlTracker[]) || [];
      const defaultTrackers: OwlTracker[] = [
          { id: generateId(), variant: "value-max", color: 6, value: willCurr, max: willMax, name: "Will" },
          { id: generateId(), variant: "value-max", color: 2, value: hpCurr, max: hpMax, name: "HP" },
          { id: generateId(), variant: "counter", color: 6, inlineMath: false, value: actions, name: "Actions" },
          { id: generateId(), variant: "counter", color: 5, inlineMath: false, value: def, name: "DEF" },
          { id: generateId(), variant: "counter", color: 1, inlineMath: false, value: spdef, name: "SP DEF" },
          { id: generateId(), variant: "checkbox", color: 4, checked: evade, name: "Evade" },
          { id: generateId(), variant: "checkbox", color: 3, checked: clash, name: "Clash" }
      ];

      if (trackers.length === 0) {
          trackers = defaultTrackers;
      } else {
          trackers = JSON.parse(JSON.stringify(trackers));
          defaultTrackers.forEach(dt => {
              const existing = trackers.find((t: OwlTracker) => t.name === dt.name);
              if (existing) {
                  if (existing.name === 'HP') { existing.value = hpCurr; existing.max = hpMax; }
                  if (existing.name === 'Will') { existing.value = willCurr; existing.max = willMax; }
                  if (existing.name === 'Actions') { existing.value = actions; }
                  if (existing.name === 'DEF') { existing.value = def; }
                  if (existing.name === 'SP DEF') { existing.value = spdef; }
                  if (existing.name === 'Evade') { existing.checked = evade; }
                  if (existing.name === 'Clash') { existing.checked = clash; }
              } else {
                  trackers.push(dt);
              }
          });
      }
      item.metadata["com.owl-trackers/trackers"] = trackers;
    }
  });
}

export async function saveMovesToToken(currentMoves: Move[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, string>)['moves-data'] = JSON.stringify(currentMoves);
      lastKnownMetadataStr = JSON.stringify(item.metadata[METADATA_ID]);
    }
  });
}

export async function saveInventoryToToken(currentInventory: InventoryItem[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, string>)['inv-data'] = JSON.stringify(currentInventory);
      lastKnownMetadataStr = JSON.stringify(item.metadata[METADATA_ID]);
    }
  });
}

export async function saveExtraSkillsToToken(currentExtraCategories: ExtraCategory[]) {
  if (!currentTokenId || isLoading) return;
  await OBR.scene.items.updateItems([currentTokenId], (items: Item[]) => {
    for (let item of items) {
      if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
      (item.metadata[METADATA_ID] as Record<string, string>)['extra-skills-data'] = JSON.stringify(currentExtraCategories);
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