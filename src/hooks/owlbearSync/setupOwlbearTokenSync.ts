import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    buildGraphicsFromMeta,
    renderTokenGraphics,
    cleanupOrphanedGraphics
} from '../../utils/graphics/graphicsManager';
import { setActiveTokenId, hasPendingUpdates } from '../../utils/sync/obr';
import { harvestTokensItemArt } from '../../utils/graphics/itemArtCatalog';
import { METADATA_ID, getEffectiveScaleAndOffsets, type TransformData } from './owlbearSyncConstants';

export interface OwlbearTokenSyncResult {
    renderAllTokens: (forceRebuild?: boolean | 'badges-only') => Promise<void>;
    unsubs: Array<() => void>;
    cleanup: () => void;
}

export async function renderTokenGraphicsForMeta(
    tokenItem: Item,
    meta: Record<string, unknown>,
    currentRole: 'PLAYER' | 'GM',
    forceRebuild: boolean | 'badges-only' = false
) {
    const freshStore = useCharacterStore.getState();
    const { effectiveScale, effectiveOffsetX, effectiveOffsetY } = getEffectiveScaleAndOffsets(freshStore.identity);
    const gData = buildGraphicsFromMeta(meta, effectiveScale, effectiveOffsetX, effectiveOffsetY);
    await renderTokenGraphics(tokenItem, gData, currentRole, forceRebuild);
}

export async function setupOwlbearTokenSync(params: {
    role: 'PLAYER' | 'GM';
    syncSceneSettings: () => Promise<void>;
    resetSceneSyncState: () => void;
    isMounted: () => boolean;
}): Promise<OwlbearTokenSyncResult> {
    const { role, syncSceneSettings, resetSceneSyncState, isMounted } = params;
    const unsubs: Array<() => void> = [];

    const knownTransforms: Record<string, TransformData> = {};
    let lastSceneItemIds = new Set<string>();
    let isSceneTransitioning = false;
    let sceneFollowupTimeout: ReturnType<typeof setTimeout> | null = null;
    let sceneBadgeRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearKnownTransforms = () => {
        for (const key of Object.keys(knownTransforms)) {
            delete knownTransforms[key];
        }
        lastSceneItemIds.clear();
    };

    const renderAllTokens = async (forceRebuild: boolean | 'badges-only' = false) => {
        try {
            const allItems = await OBR.scene.items.getItems(
                (i) =>
                    i.layer === 'CHARACTER' &&
                    (i.metadata[METADATA_ID] !== undefined || i.metadata['pokerole-pmd-extension/stats'] !== undefined)
            );

            // Passively harvest known item artwork from active scene tokens
            harvestTokensItemArt(allItems).catch(() => {});
            for (const item of allItems) {
                const meta = (item.metadata[METADATA_ID] || item.metadata['pokerole-pmd-extension/stats']) as Record<
                    string,
                    unknown
                >;
                knownTransforms[item.id] = {
                    x: item.scale.x,
                    y: item.scale.y,
                    r: item.rotation,
                    v: item.visible,
                    metaStr: JSON.stringify(meta)
                };
                const freshStore = useCharacterStore.getState();
                const { effectiveScale, effectiveOffsetX, effectiveOffsetY } = getEffectiveScaleAndOffsets(
                    freshStore.identity
                );

                const gData = buildGraphicsFromMeta(meta, effectiveScale, effectiveOffsetX, effectiveOffsetY);
                const currentRole = freshStore.role || role;
                await renderTokenGraphics(item, gData, currentRole, forceRebuild);
            }
        } catch (e) {
            console.error('[SyncEngine] Error rendering tokens on load:', e);
        }
    };

    const handleSceneReady = async () => {
        if (!isMounted()) return;

        // Sync scene metadata for active scene first
        await syncSceneSettings();

        // Reset knownTransforms cache because OBR.scene.local items are wiped on scene switch/load
        clearKnownTransforms();

        // Mark transition complete so item change events can process with verified scene settings
        isSceneTransitioning = false;

        if (role === 'GM') {
            try {
                const legacyItems = await OBR.scene.items.getItems(
                    (i) => i.metadata['pokerole-extension/graphics'] !== undefined
                );
                if (legacyItems.length > 0) {
                    await OBR.scene.items.deleteItems(legacyItems.map((i) => i.id));
                }
            } catch (e) {
                console.warn('[SyncEngine] Failed to clean legacy network graphics:', e);
            }
        }

        // Clean up any orphaned local graphics left over from previous scenes
        await cleanupOrphanedGraphics();

        try {
            const sceneItems = await OBR.scene.items.getItems();
            lastSceneItemIds = new Set(sceneItems.map((i) => i.id));

            // Clean up any stale ghost tokens left behind from Pokémon recalled on another scene
            const freshStore = useCharacterStore.getState();
            const ghostIdsToDelete: string[] = [];
            for (const item of sceneItems) {
                if (item.layer === 'CHARACTER') {
                    const tMeta = (item.metadata[METADATA_ID] || item.metadata['pokerole-pmd-extension/stats']) as
                        | Record<string, unknown>
                        | undefined;
                    if (tMeta?.entityId && typeof tMeta.entityId === 'string') {
                        const sum = freshStore.pcData.pokemonSummaries[tMeta.entityId];
                        if (sum && (!sum.isOnMap || (sum.mapTokenId && sum.mapTokenId !== item.id))) {
                            ghostIdsToDelete.push(item.id);
                            const attached = sceneItems.filter((a) => a.attachedTo === item.id);
                            ghostIdsToDelete.push(...attached.map((a) => a.id));
                        }
                    }
                }
            }
            if (ghostIdsToDelete.length > 0) {
                await OBR.scene.items.deleteItems(ghostIdsToDelete);
            }
        } catch {
            lastSceneItemIds = new Set();
        }

        // Initial render for currently loaded items (non-destructive to avoid flickering)
        await renderAllTokens(false);

        // Follow-up render to catch late-arriving persistent tokens (from Persistent Tokens extension)
        if (sceneFollowupTimeout) clearTimeout(sceneFollowupTimeout);
        sceneFollowupTimeout = setTimeout(async () => {
            if (!isMounted()) return;
            await renderAllTokens(false);
        }, 800);

        // Targeted badge-only refresh: only rebuilds the Evade and Clash text glyphs once fonts are warm.
        if (sceneBadgeRefreshTimeout) clearTimeout(sceneBadgeRefreshTimeout);
        sceneBadgeRefreshTimeout = setTimeout(async () => {
            if (!isMounted()) return;
            await renderAllTokens('badges-only');
        }, 1200);

        if (typeof document !== 'undefined' && document.fonts) {
            document.fonts.ready
                .then(() => {
                    if (!isMounted()) return;
                    renderAllTokens('badges-only');
                })
                .catch(() => {});
        }
    };

    const isReady = await OBR.scene.isReady();
    if (isReady) {
        await handleSceneReady();
    }

    const unsubReady = OBR.scene.onReadyChange(async (ready) => {
        if (ready) {
            await handleSceneReady();
        } else {
            // Scene unloading: lock transition, clean cache and cancel pending follow-up timers
            isSceneTransitioning = true;
            clearKnownTransforms();
            if (sceneFollowupTimeout) clearTimeout(sceneFollowupTimeout);
            if (sceneBadgeRefreshTimeout) clearTimeout(sceneBadgeRefreshTimeout);
            resetSceneSyncState();
        }
    });
    unsubs.push(unsubReady);

    const unsubItems = OBR.scene.items.onChange(async (items) => {
        if (isSceneTransitioning) return;

        const currentItemIds = new Set(items.map((i) => i.id));
        const deletedTokenIds: string[] = [];

        for (const prevId of lastSceneItemIds) {
            if (!currentItemIds.has(prevId)) {
                deletedTokenIds.push(prevId);
            }
        }
        lastSceneItemIds = currentItemIds;

        for (const id of Object.keys(knownTransforms)) {
            if (!currentItemIds.has(id)) {
                delete knownTransforms[id];
                if (!deletedTokenIds.includes(id)) {
                    deletedTokenIds.push(id);
                }
            }
        }

        if (deletedTokenIds.length > 0) {
            const store = useCharacterStore.getState();
            if (store.tokenId && deletedTokenIds.includes(store.tokenId)) {
                setActiveTokenId(null);
                store.setTokenData('', store.role || 'PLAYER');
            }
            cleanupOrphanedGraphics(currentItemIds).catch((err) =>
                console.error('[SyncEngine] Failed to clean up orphaned graphics on token delete:', err)
            );
        }

        // Harvest item art from updated scene items
        harvestTokensItemArt(items).catch(() => {});

        for (const item of items) {
            const rawMeta = item.metadata[METADATA_ID] || item.metadata['pokerole-pmd-extension/stats'];
            if (item.layer === 'CHARACTER' && rawMeta) {
                try {
                    const meta = (rawMeta as Record<string, unknown>) || {};
                    const lastTransform = knownTransforms[item.id];

                    const rawX = item.scale.x;
                    const rawY = item.scale.y;
                    const rawR = item.rotation;
                    const rawV = item.visible;
                    const metaStr = JSON.stringify(meta);

                    let needsGraphicsUpdate = false;

                    if (!lastTransform) {
                        knownTransforms[item.id] = { x: rawX, y: rawY, r: rawR, v: rawV, metaStr };
                        needsGraphicsUpdate = true;
                    } else {
                        const diffX = Math.abs(lastTransform.x - rawX);
                        const diffY = Math.abs(lastTransform.y - rawY);
                        const diffR = Math.abs(lastTransform.r - rawR);
                        const diffV = lastTransform.v !== rawV;

                        if (
                            diffX > 0.005 ||
                            diffY > 0.005 ||
                            diffR > 0.005 ||
                            diffV ||
                            lastTransform.metaStr !== metaStr
                        ) {
                            knownTransforms[item.id] = { x: rawX, y: rawY, r: rawR, v: rawV, metaStr };
                            needsGraphicsUpdate = true;
                        }
                    }

                    if (needsGraphicsUpdate) {
                        const freshStore = useCharacterStore.getState();
                        const { effectiveScale, effectiveOffsetX, effectiveOffsetY } = getEffectiveScaleAndOffsets(
                            freshStore.identity
                        );

                        const gData = buildGraphicsFromMeta(meta, effectiveScale, effectiveOffsetX, effectiveOffsetY);
                        const currentRole = freshStore.role || role;
                        renderTokenGraphics(item, gData, currentRole);
                    }

                    const storeState = useCharacterStore.getState();
                    if (item.id === storeState.tokenId) {
                        const lastKnown = lastTransform?.metaStr;

                        if (lastKnown !== metaStr && !hasPendingUpdates()) {
                            storeState.loadFromOwlbear(meta);
                        }

                        const imgItem = item as Image;
                        if (imgItem.image?.url && imgItem.image.url !== storeState.identity.tokenImageUrl) {
                            storeState.setIdentity('tokenImageUrl', imgItem.image.url);
                        }
                    }

                    // Sync live Pokémon stats and metadata to PC storage if this token belongs to PC
                    const entityId = meta.entityId as string | undefined;
                    if (entityId) {
                        const pcSummary = storeState.pcData.pokemonSummaries[entityId];
                        if (pcSummary && pcSummary.isOnMap) {
                            const curHp =
                                typeof meta['hp-curr'] === 'number'
                                    ? meta['hp-curr']
                                    : !isNaN(Number(meta['hp-curr'])) && meta['hp-curr'] !== ''
                                      ? Number(meta['hp-curr'])
                                      : pcSummary.hp;
                            const mHp =
                                typeof meta['hp-max-display'] === 'number'
                                    ? meta['hp-max-display']
                                    : !isNaN(Number(meta['hp-max-display'])) && meta['hp-max-display'] !== ''
                                      ? Number(meta['hp-max-display'])
                                      : pcSummary.maxHp;
                            const curWill =
                                typeof meta['will-curr'] === 'number'
                                    ? meta['will-curr']
                                    : !isNaN(Number(meta['will-curr'])) && meta['will-curr'] !== ''
                                      ? Number(meta['will-curr'])
                                      : pcSummary.will;
                            const mWill =
                                typeof meta['will-max-display'] === 'number'
                                    ? meta['will-max-display']
                                    : !isNaN(Number(meta['will-max-display'])) && meta['will-max-display'] !== ''
                                      ? Number(meta['will-max-display'])
                                      : pcSummary.maxWill;
                            const name = (meta.name as string) || (meta.nickname as string) || pcSummary.name;

                            if (
                                curHp !== pcSummary.hp ||
                                mHp !== pcSummary.maxHp ||
                                curWill !== pcSummary.will ||
                                mWill !== pcSummary.maxWill ||
                                name !== pcSummary.name ||
                                pcSummary.mapTokenId !== item.id
                            ) {
                                storeState.updatePokemonSummary({
                                    ...pcSummary,
                                    hp: curHp,
                                    maxHp: mHp,
                                    will: curWill,
                                    maxWill: mWill,
                                    name,
                                    mapTokenId: item.id,
                                    savedTokenItem: item,
                                    fullMetadata: meta,
                                    lastModified: Date.now()
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('[SyncEngine] Engine recovered from background item sync crash:', e);
                }
            }
        }
    });
    unsubs.push(unsubItems);

    const cleanup = () => {
        clearKnownTransforms();
        if (sceneFollowupTimeout) clearTimeout(sceneFollowupTimeout);
        if (sceneBadgeRefreshTimeout) clearTimeout(sceneBadgeRefreshTimeout);
        unsubs.forEach((unsub) => unsub());
    };

    return { renderAllTokens, unsubs, cleanup };
}
