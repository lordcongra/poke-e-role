import OBR from '@owlbear-rodeo/sdk';
import type { Item, Image } from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    buildGraphicsFromMeta,
    renderTokenGraphics,
    cleanupOrphanedGraphics
} from '../../utils/graphics/graphicsManager';
import { setActiveTokenId, hasPendingUpdates, getIsPcSheetActive } from '../../utils/sync/obr';
import { harvestTokensItemArt } from '../../utils/graphics/itemArtCatalog';
import { METADATA_ID, getEffectiveScaleAndOffsets, type TransformData } from './owlbearSyncConstants';
import { reconcileSceneTokens } from './reconcileSceneTokens';

export interface OwlbearTokenSyncResult {
    renderAllTokens: (forceRebuild?: boolean | 'badges-only') => Promise<void>;
    unsubs: Array<() => void>;
    cleanup: () => void;
}

export function extractEntityId(item: Item): string | undefined {
    const tMeta = (item.metadata[METADATA_ID] || item.metadata['pokerole-pmd-extension/stats']) as
        | Record<string, unknown>
        | undefined;
    const claimMeta = item.metadata['pokerole-pmd-extension/claimed-by'] as { entityId?: string } | undefined;
    return (
        (tMeta?.entityId as string) ||
        (claimMeta?.entityId as string) ||
        (item.metadata['entityId'] as string) ||
        undefined
    );
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
    let ghostCleanupTimeout: ReturnType<typeof setTimeout> | null = null;

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
            await reconcileSceneTokens(sceneItems, role);
        } catch {
            lastSceneItemIds = new Set();
        }

        // Initial render for currently loaded items (non-destructive to avoid flickering)
        await renderAllTokens(false);

        // Follow-up render to catch late-arriving persistent tokens (from Persistent Tokens extension)
        if (sceneFollowupTimeout) clearTimeout(sceneFollowupTimeout);
        sceneFollowupTimeout = setTimeout(async () => {
            if (!isMounted()) return;
            try {
                const lateItems = await OBR.scene.items.getItems();
                await reconcileSceneTokens(lateItems, role);
            } catch {}
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
            if (ghostCleanupTimeout) clearTimeout(ghostCleanupTimeout);
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
                if (
                    store.identity.entityId &&
                    (getIsPcSheetActive() || Boolean(store.pcData?.pokemonSummaries?.[store.identity.entityId]))
                ) {
                    setActiveTokenId(store.identity.entityId);
                    store.setTokenData(store.identity.entityId, store.role || 'PLAYER');
                } else {
                    setActiveTokenId(null);
                    store.setTokenData('', store.role || 'PLAYER');
                }
            }
            cleanupOrphanedGraphics(currentItemIds).catch((err) =>
                console.error('[SyncEngine] Failed to clean up orphaned graphics on token delete:', err)
            );
        }

        // Harvest item art from updated scene items
        harvestTokensItemArt(items).catch(() => {});

        // Reconcile cross-scene token sheets and prune duplicates on active scene (debounced)
        if (ghostCleanupTimeout) clearTimeout(ghostCleanupTimeout);
        ghostCleanupTimeout = setTimeout(() => {
            if (!isMounted()) return;
            reconcileSceneTokens(items, role).catch(() => {});
        }, 800);

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

                    const storeState = useCharacterStore.getState();
                    const eId = extractEntityId(item);
                    const existingSum = eId ? storeState.pcData.pokemonSummaries[eId] : undefined;
                    const tMod = Number(meta.lastModified) || 0;
                    const pMod = Number(existingSum?.lastModified) || 0;
                    const isPcNewer = Boolean(existingSum && existingSum.fullMetadata && pMod > tMod);
                    const effectiveMeta = isPcNewer ? existingSum!.fullMetadata! : meta;

                    if (needsGraphicsUpdate) {
                        const { effectiveScale, effectiveOffsetX, effectiveOffsetY } = getEffectiveScaleAndOffsets(
                            storeState.identity
                        );

                        const gData = buildGraphicsFromMeta(
                            effectiveMeta,
                            effectiveScale,
                            effectiveOffsetX,
                            effectiveOffsetY
                        );
                        const currentRole = storeState.role || role;
                        renderTokenGraphics(item, gData, currentRole);
                    }

                    if (item.id === storeState.tokenId) {
                        const lastKnown = lastTransform?.metaStr;

                        if (lastKnown !== metaStr && !hasPendingUpdates()) {
                            if (isPcNewer) {
                                storeState.loadFromOwlbear(existingSum!.fullMetadata!);
                            } else {
                                storeState.loadFromOwlbear(meta);
                            }
                        }

                        const imgItem = item as Image;
                        if (imgItem.image?.url && imgItem.image.url !== storeState.identity.tokenImageUrl) {
                            storeState.setIdentity('tokenImageUrl', imgItem.image.url);
                        }
                    }

                    // Sync live Pokémon stats and metadata to PC storage if this token belongs to PC
                    const entityId = eId;
                    if (entityId) {
                        const pcSummary = storeState.pcData.pokemonSummaries[entityId];
                        if (pcSummary && pcSummary.isOnMap) {
                            const tokenLastMod = Number(meta.lastModified) || 0;
                            const pcLastMod = Number(pcSummary.lastModified) || 0;

                            // Anti-Reversion Guard: if local PC storage is strictly newer, do not overwrite from older token
                            if (pcLastMod > tokenLastMod) {
                                continue;
                            }
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
                            const pokeName =
                                (meta.name as string) || (meta.nickname as string) || item.name || pcSummary.name;
                            const scaleChanged =
                                pcSummary.savedTokenItem?.scale?.x !== item.scale?.x ||
                                pcSummary.savedTokenItem?.scale?.y !== item.scale?.y;

                            const sumTempHp = Number(pcSummary.fullMetadata?.['temporary-hit-points']) || 0;
                            const liveTempHp = Number(meta['temporary-hit-points']) || 0;
                            const sumTempWill = Number(pcSummary.fullMetadata?.['temporary-will']) || 0;
                            const liveTempWill = Number(meta['temporary-will']) || 0;
                            const sumStatusStr = JSON.stringify(pcSummary.fullMetadata?.['status-list'] || '');
                            const liveStatusStr = JSON.stringify(meta['status-list'] || '');
                            const sumMovesStr = JSON.stringify(pcSummary.fullMetadata?.['moves-data'] || '');
                            const liveMovesStr = JSON.stringify(meta['moves-data'] || '');

                            const hasLiveMoves = Boolean(meta['moves-data'] && meta['moves-data'] !== '[]');
                            const missingLocalMoves =
                                !pcSummary.fullMetadata?.['moves-data'] ||
                                pcSummary.fullMetadata['moves-data'] === '[]';
                            const nextMeta = { ...(pcSummary.fullMetadata || {}), ...meta };

                            if (
                                curHp !== pcSummary.hp ||
                                mHp !== pcSummary.maxHp ||
                                curWill !== pcSummary.will ||
                                mWill !== pcSummary.maxWill ||
                                sumTempHp !== liveTempHp ||
                                sumTempWill !== liveTempWill ||
                                sumStatusStr !== liveStatusStr ||
                                sumMovesStr !== liveMovesStr ||
                                pokeName !== pcSummary.name ||
                                pcSummary.mapTokenId !== item.id ||
                                scaleChanged ||
                                (hasLiveMoves && missingLocalMoves)
                            ) {
                                storeState.updatePokemonSummary({
                                    ...pcSummary,
                                    hp: curHp,
                                    maxHp: mHp,
                                    will: curWill,
                                    maxWill: mWill,
                                    name: pokeName,
                                    mapTokenId: item.id,
                                    savedTokenItem: item,
                                    fullMetadata: nextMeta,
                                    lastModified: Number(meta.lastModified) || pcSummary.lastModified || Date.now()
                                });
                            }
                        }
                    }

                    // Sync live Trainer scale, item, and stats if this token belongs to the active campaign trainer
                    const isTrainerMode = meta.mode === 'Trainer' || meta.mode === 'Trainer (Special)';
                    if (isTrainerMode) {
                        const camp = storeState.pcData.campaigns[storeState.pcData.activeCampaignId];
                        if (camp && camp.trainers) {
                            for (const [tId, tr] of Object.entries(camp.trainers)) {
                                const isMatch =
                                    tr.mapTokenId === item.id ||
                                    tr.name === meta.name ||
                                    tr.name === meta.nickname ||
                                    tr.name === item.name;
                                if (isMatch) {
                                    const scaleChanged =
                                        tr.savedTokenItem?.scale?.x !== item.scale?.x ||
                                        tr.savedTokenItem?.scale?.y !== item.scale?.y;
                                    const metaChanged = tr.mapTokenId !== item.id || scaleChanged;
                                    if (metaChanged) {
                                        storeState.updateTrainerProfile(tId, {
                                            mapTokenId: item.id,
                                            savedTokenItem: item,
                                            fullMetadata: { ...(tr.fullMetadata || {}), ...meta }
                                        });
                                    }
                                }
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
        if (ghostCleanupTimeout) clearTimeout(ghostCleanupTimeout);
        unsubs.forEach((unsub) => unsub());
    };

    return { renderAllTokens, unsubs, cleanup };
}
