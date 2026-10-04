import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, TrainerRoster } from '../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../generators/trainerTokenSpawner';
import { spawnPokemonToMap } from './pcModalOps';

export const PLACEMENT_TOOL_ID = 'pokerole-extension/place-pokemon-tool';
export const PLACEMENT_MODE_ID = 'pokerole-extension/place-pokemon-mode';

const PLACEMENT_PREF_KEY = 'pkr_pc_placement_mode';

export function getPlacementModePreference(): 'manual' | 'auto' {
    if (typeof localStorage === 'undefined') return 'manual';
    const saved = localStorage.getItem(PLACEMENT_PREF_KEY);
    return saved === 'auto' ? 'auto' : 'manual';
}

export function setPlacementModePreference(mode: 'manual' | 'auto'): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PLACEMENT_PREF_KEY, mode);
        window.dispatchEvent(new CustomEvent('pkr-placement-pref-changed', { detail: mode }));
    }
}

let isToolRegistered = false;
let placementTimeout: ReturnType<typeof setTimeout> | null = null;
let activePlacementRequest: {
    summary: PcPokemonSummary;
    trainer?: TrainerRoster;
    role: 'PLAYER' | 'GM';
    previousTool: string;
    resolve: (result: {
        success: boolean;
        newMapTokenId?: string;
        alreadyOnMap?: boolean;
        cancelled?: boolean;
    }) => void;
} | null = null;

export async function dismissPlacementTool(previousTool?: string): Promise<void> {
    if (placementTimeout) {
        clearTimeout(placementTimeout);
        placementTimeout = null;
    }
    if (!OBR.isAvailable) return;
    try {
        const candidates = [
            previousTool && previousTool !== PLACEMENT_TOOL_ID ? previousTool : null,
            'com.owlbear.rodeo:select',
            'com.owlbear-rodeo.select',
            'com.owlbear.tool/select',
            'select'
        ].filter(Boolean) as string[];

        for (const candidate of candidates) {
            try {
                await OBR.tool.activateTool(candidate);
                break;
            } catch {}
        }

        await OBR.tool.removeMode(PLACEMENT_MODE_ID).catch(() => {});
        await OBR.tool.remove(PLACEMENT_TOOL_ID).catch(() => {});
    } catch (e) {
        console.warn('[pcPlacementInteraction] Error during tool cleanup:', e);
    } finally {
        isToolRegistered = false;
    }
}

/**
 * Ensures the OBR Placement Tool and ToolMode are registered on demand.
 */
async function ensurePlacementToolRegistered(): Promise<void> {
    if (!OBR.isAvailable || isToolRegistered) return;

    try {
        const iconUrl = getAbsolutePokeballUrl();

        await OBR.tool.create({
            id: PLACEMENT_TOOL_ID,
            icons: [
                {
                    icon: iconUrl,
                    label: 'Place Pokémon'
                }
            ],
            defaultMode: PLACEMENT_MODE_ID
        });

        await OBR.tool.createMode({
            id: PLACEMENT_MODE_ID,
            icons: [
                {
                    icon: iconUrl,
                    label: 'Place Pokémon'
                }
            ],
            cursors: [{ cursor: 'crosshair' }],
            onDeactivate: async () => {
                if (activePlacementRequest) {
                    const req = activePlacementRequest;
                    activePlacementRequest = null;
                    await dismissPlacementTool(req.previousTool);
                    req.resolve({ success: false, cancelled: true });
                }
            },
            onToolClick: async (_context, event) => {
                if (!activePlacementRequest) return;
                const req = activePlacementRequest;
                activePlacementRequest = null;

                try {
                    let landingPos = event.pointerPosition;
                    try {
                        landingPos = await OBR.scene.grid.snapPosition(event.pointerPosition, undefined, false, true);
                    } catch {}

                    const res = await spawnPokemonToMap(req.summary, undefined, req.role, req.trainer, landingPos);

                    await dismissPlacementTool(req.previousTool);
                    if (OBR.isAvailable) {
                        const name = req.summary.name || req.summary.species;
                        OBR.notification.show(`Sent out ${name}!`, 'INFO');
                    }
                    req.resolve(res);
                } catch (err) {
                    console.error('[pcPlacementInteraction] Failed to place Pokémon on click:', err);
                    await dismissPlacementTool(req.previousTool);
                    req.resolve({ success: false });
                }
            },
            onKeyDown: async (_context, event) => {
                if (event.key === 'Escape' && activePlacementRequest) {
                    const req = activePlacementRequest;
                    activePlacementRequest = null;
                    await dismissPlacementTool(req.previousTool);
                    if (OBR.isAvailable) {
                        OBR.notification.show('Placement cancelled.', 'INFO');
                    }
                    req.resolve({ success: false, cancelled: true });
                }
            }
        });

        isToolRegistered = true;
    } catch (e) {
        console.warn('[pcPlacementInteraction] Tool registration warning (may already exist):', e);
        isToolRegistered = true;
    }
}

/**
 * Initiates an interactive point-and-click placement workflow on the Owlbear Rodeo map.
 * Activates a crosshair tool and waits for the user to click a coordinate on the map.
 */
export async function initiatePointPlacement(
    summary: PcPokemonSummary,
    trainer?: TrainerRoster,
    role: 'PLAYER' | 'GM' = 'PLAYER'
): Promise<{ success: boolean; newMapTokenId?: string; alreadyOnMap?: boolean; cancelled?: boolean }> {
    if (!OBR.isAvailable) {
        return spawnPokemonToMap(summary, undefined, role, trainer);
    }

    try {
        const sceneItems = await OBR.scene.items.getItems();
        // Check if already on map
        if (summary.mapTokenId && sceneItems.some((it) => it.id === summary.mapTokenId)) {
            await OBR.player.select([summary.mapTokenId]);
            return { success: true, newMapTokenId: summary.mapTokenId, alreadyOnMap: true };
        }

        await ensurePlacementToolRegistered();

        const previousTool = (await OBR.tool.getActiveTool().catch(() => 'default')) || 'default';

        return await new Promise((resolve) => {
            activePlacementRequest = {
                summary,
                trainer,
                role,
                previousTool,
                resolve
            };

            placementTimeout = setTimeout(async () => {
                if (activePlacementRequest) {
                    const req = activePlacementRequest;
                    activePlacementRequest = null;
                    await dismissPlacementTool(req.previousTool);
                    if (OBR.isAvailable) {
                        OBR.notification.show('Placement timed out.', 'INFO');
                    }
                    req.resolve({ success: false, cancelled: true });
                }
            }, 60000);

            OBR.tool.activateTool(PLACEMENT_TOOL_ID).catch(() => {});
            OBR.tool.activateMode(PLACEMENT_TOOL_ID, PLACEMENT_MODE_ID).catch(() => {});

            const name = summary.name || summary.species || 'Pokémon';
            OBR.notification.show(`Click on the map to place ${name} (Esc to cancel)`, 'INFO');
        });
    } catch (e) {
        console.error('[pcPlacementInteraction] Failed to initiate point placement:', e);
        return spawnPokemonToMap(summary, undefined, role, trainer);
    }
}
