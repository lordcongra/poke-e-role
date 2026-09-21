import OBR, { isImage } from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import type { CharacterState } from '../store/storeTypes';
import { buildGraphicsFromState, buildGraphicsFromMeta, type GraphicsData } from './graphicsDataBuilder';
import { GRAPHICS_META_ID, STATS_META_ID } from './graphicsManager';
import { buildGraphicDefinitions } from './graphicsLayout';
import { applyGraphicsToOwlbear } from './graphicsEngine';
import { detectImageVisualBounds } from './imageBoundsDetector';
import { SCENE_SETTINGS_META_ID } from './obr';

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
    forceRebuild: boolean | 'badges-only' = false
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

            if (!data.showTrackers || !data.hasSpeciesOrTrainer || (data.gmOnlyTrackers && role !== 'GM')) {
                if (localAttached.length > 0) {
                    await OBR.scene.local.deleteItems(localAttached.map((item) => item.id));
                }
                return;
            }

            if (forceRebuild === true && localAttached.length > 0) {
                await OBR.scene.local.deleteItems(localAttached.map((item) => item.id));
                localAttached = [];
            } else if (forceRebuild === 'badges-only' && localAttached.length > 0) {
                const badgeFgItems = localAttached.filter((item) => {
                    const roleMeta = item.metadata[GRAPHICS_META_ID] as string;
                    return roleMeta === 'badge-eva-fg' || roleMeta === 'badge-cla-fg';
                });
                if (badgeFgItems.length > 0) {
                    await OBR.scene.local.deleteItems(badgeFgItems.map((item) => item.id));
                    localAttached = localAttached.filter((item) => !badgeFgItems.some((b) => b.id === item.id));
                }
            }

            const isTokenVisible = token.visible !== false;
            let tokenScale = 1;
            let baseBottomY = 75;

            if (isImage(token)) {
                let sceneDpi = 150;
                try {
                    if (await OBR.scene.isReady()) {
                        sceneDpi = await OBR.scene.grid.getDpi();
                    }
                } catch {
                    sceneDpi = 150;
                }
                if (!sceneDpi || sceneDpi <= 0) sceneDpi = 150;

                const rawWidth = token.image?.width || sceneDpi;
                const rawHeight = token.image?.height || sceneDpi;
                const tokenDpi = token.grid?.dpi && token.grid.dpi > 0 ? token.grid.dpi : sceneDpi;
                const scaleX = Math.abs(token.scale?.x || 1);
                const scaleY = Math.abs(token.scale?.y || 1);

                // Number of grid squares occupied on the scene
                const rawGridSquaresX = (rawWidth / tokenDpi) * scaleX;
                const rawGridSquaresY = (rawHeight / tokenDpi) * scaleY;

                // Inspect visual non-transparent bounds
                const visualBounds = token.image?.url
                    ? await detectImageVisualBounds(token.image.url).catch(() => null)
                    : null;

                const contentWidthFraction = visualBounds?.contentWidthFraction ?? 1.0;
                const bottomFraction = visualBounds?.bottomFraction ?? 1.0;

                // Effective visual size in grid squares (excluding transparent padding)
                const visualGridSquaresX = rawGridSquaresX * contentWidthFraction;

                // Standard 1x1 tokens (or slightly resized sprites up to 1.35 squares) evaluate to 2.0.
                // Multi-cell tokens (e.g. 2x2, 3x3) scale HUD gently.
                if (visualGridSquaresX <= 1.35) {
                    tokenScale = 2.0;
                } else {
                    tokenScale = Math.min(3.5, 2.0 + (visualGridSquaresX - 1) * 0.35);
                }

                // If the sprite has bottom transparent padding (bottomFraction < 0.93):
                // Anchor baseBottomY with clean breathing space below the visible character feet
                if (bottomFraction < 0.93) {
                    const offsetY = token.grid?.offset?.y ?? rawHeight / 2;
                    const visualBottomPixel = rawHeight * bottomFraction;
                    const pixelDistFromCenter = visualBottomPixel - offsetY;
                    const pixelToScene = sceneDpi / tokenDpi;
                    const visualBottomY = pixelDistFromCenter * pixelToScene * scaleY;

                    // Place baseBottomY so the HUD hugs the visible feet proportionally at any scale
                    const roomScale =
                        (data.roomDefaultScale && data.roomDefaultScale > 0 ? data.roomDefaultScale : 100) / 100;
                    const userScale = (data.trackerScale && data.trackerScale > 0 ? data.trackerScale : 100) / 100;
                    const effectiveScale = tokenScale * roomScale * userScale;
                    baseBottomY = visualBottomY + 17.5 * effectiveScale;
                } else {
                    // Standard full-bleed / circular token bottom
                    baseBottomY = Math.max(75, rawGridSquaresY * 0.5 * sceneDpi);
                }
            } else {
                tokenScale = Math.abs(token.scale?.x || 1) * 2.0;
                baseBottomY = 75 * tokenScale;
            }

            const graphicDefinitions = buildGraphicDefinitions(data, role, isTokenVisible, tokenScale, baseBottomY);
            await applyGraphicsToOwlbear(token, graphicDefinitions, localAttached, data.trackerLayer ?? 'ATTACHMENT');
        } catch (error) {
            console.error('[GraphicsRenderer] Token Graphics Sync Error:', error);
        }
    });

    await renderMutex[token.id];
}

export async function renderAllSceneTokens(forceRebuild: boolean | 'badges-only' = false, roomDefaultScale?: number) {
    if (!OBR.isAvailable) return;
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) return;

        const role = await OBR.player.getRole();
        const allItems = await OBR.scene.items.getItems(
            (i) =>
                i.layer === 'CHARACTER' &&
                (i.metadata[STATS_META_ID] !== undefined || i.metadata['pokerole-pmd-extension/stats'] !== undefined)
        );

        let scale = roomDefaultScale;
        if (scale === undefined) {
            try {
                const sceneMeta = (await OBR.scene.getMetadata())[SCENE_SETTINGS_META_ID] as
                    | Record<string, unknown>
                    | undefined;
                if (
                    sceneMeta?.sceneDefaultScale != null &&
                    !isNaN(Number(sceneMeta.sceneDefaultScale)) &&
                    Number(sceneMeta.sceneDefaultScale) > 0
                ) {
                    scale = Number(sceneMeta.sceneDefaultScale);
                } else {
                    const roomMeta = (await OBR.room.getMetadata())['pokerole-pmd-extension/room-settings'] as
                        | Record<string, unknown>
                        | undefined;
                    if (
                        roomMeta?.roomDefaultScale != null &&
                        !isNaN(Number(roomMeta.roomDefaultScale)) &&
                        Number(roomMeta.roomDefaultScale) > 0
                    ) {
                        scale = Number(roomMeta.roomDefaultScale);
                    }
                }
            } catch {
                scale = 100;
            }
        }
        if (!scale || isNaN(scale)) scale = 100;

        for (const item of allItems) {
            const meta = (item.metadata[STATS_META_ID] || item.metadata['pokerole-pmd-extension/stats']) as Record<
                string,
                unknown
            >;
            const gData = buildGraphicsFromMeta(meta, scale);
            await renderTokenGraphics(item, gData, role, forceRebuild);
        }
    } catch (error) {
        console.error('[GraphicsRenderer] Error rendering all scene tokens:', error);
    }
}
