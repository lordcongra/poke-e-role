import OBR, { isImage } from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import type { CharacterState } from '../store/storeTypes';
import { buildGraphicsFromState, type GraphicsData } from './graphicsDataBuilder';
import { GRAPHICS_META_ID, STATS_META_ID } from './graphicsManager';
import { buildGraphicDefinitions, type TokenBounds } from './graphicsLayout';
import { applyGraphicsToOwlbear } from './graphicsEngine';

const renderMutex: Record<string, Promise<void>> = {};

export async function updateTokenGraphics(tokenId: string, state: CharacterState) {
    if (!OBR.isAvailable) return;
    try {
        const items = await OBR.scene.items.getItems([tokenId]);
        if (items.length === 0) return;
        const token = items[0];
        const metadata = (token.metadata[STATS_META_ID] as Record<string, unknown>) || {};
        const role = await OBR.player.getRole();

        const data = buildGraphicsFromState(metadata, state);
        await renderTokenGraphics(token, data, role, false);
    } catch (error) {
        console.error('[GraphicsRenderer] Token Graphics Sync Error:', error);
    }
}

export async function renderTokenGraphics(
    token: Item,
    data: GraphicsData,
    role: 'PLAYER' | 'GM',
    forceRebuild = false
) {
    if (!OBR.isAvailable) return;

    if (!renderMutex[token.id]) {
        renderMutex[token.id] = Promise.resolve();
    }

    renderMutex[token.id] = renderMutex[token.id].then(async () => {
        try {
            const tokenId = token.id;

            let localAttached = (await OBR.scene.local.getItems()).filter(
                (item) => item.attachedTo === tokenId && item.metadata[GRAPHICS_META_ID] !== undefined
            );

            if (!data.showTrackers || !data.hasSpeciesOrTrainer) {
                if (localAttached.length > 0) {
                    await OBR.scene.local.deleteItems(localAttached.map((item) => item.id));
                }
                return;
            }

            if (forceRebuild && localAttached.length > 0) {
                await OBR.scene.local.deleteItems(localAttached.map((item) => item.id));
                localAttached = [];
            }

            const isTokenVisible = token.visible !== false;
            const scale = Math.abs(token.scale.x || 1);
            let tokenBounds: TokenBounds | undefined = undefined;

            if (isImage(token)) {
                const sceneDpi = await OBR.scene.grid.getDpi().catch(() => 150);
                const tokenDpi = token.grid?.dpi || sceneDpi || 150;
                const rawWidth = token.image?.width || tokenDpi;
                const rawHeight = token.image?.height || tokenDpi;
                const scaleX = Math.abs(token.scale?.x || 1);
                const scaleY = Math.abs(token.scale?.y || 1);

                const pixelToScene = sceneDpi / tokenDpi;
                const sceneWidth = rawWidth * pixelToScene * scaleX;

                const offsetX = token.grid?.offset?.x ?? rawWidth / 2;
                const offsetY = token.grid?.offset?.y ?? rawHeight / 2;

                const bottomY = (rawHeight - offsetY) * pixelToScene * scaleY;
                const centerX = (rawWidth / 2 - offsetX) * pixelToScene * scaleX;
                const scaleFactor = Math.max(0.2, sceneWidth / Math.max(1, sceneDpi));

                tokenBounds = {
                    bottomY,
                    centerX,
                    scaleFactor
                };
            }

            const graphicDefinitions = buildGraphicDefinitions(data, role, isTokenVisible, scale, tokenBounds);
            await applyGraphicsToOwlbear(token, graphicDefinitions, localAttached);
        } catch (error) {
            console.error('[GraphicsRenderer] Token Graphics Sync Error:', error);
        }
    });

    await renderMutex[token.id];
}
