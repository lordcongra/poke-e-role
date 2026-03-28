// src/hooks/useOwlbearSync.ts
import { useEffect } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';

const METADATA_ID = "pokerole-extension/stats";

export function useOwlbearSync() {
    const loadFromOwlbear = useCharacterStore(state => state.loadFromOwlbear);

    useEffect(() => {
        if (OBR.isAvailable) {
            OBR.onReady(async () => {
                // 1. Grab token on initial load
                const selected = await OBR.player.getSelection();
                if (selected && selected.length > 0) {
                    const items = await OBR.scene.items.getItems([selected[0]]);
                    if (items.length > 0 && items[0].metadata[METADATA_ID]) {
                        loadFromOwlbear(items[0].metadata[METADATA_ID] as Record<string, unknown>);
                    }
                }

                // 2. Listen for when the user clicks a different token
                OBR.player.onChange(async (player) => {
                    if (player.selection && player.selection.length > 0) {
                        const items = await OBR.scene.items.getItems([player.selection[0]]);
                        if (items.length > 0 && items[0].metadata[METADATA_ID]) {
                            loadFromOwlbear(items[0].metadata[METADATA_ID] as Record<string, unknown>);
                        }
                    }
                });
            });
        }
    }, [loadFromOwlbear]);
}