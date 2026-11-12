import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { renderTokenGraphicsForMeta, extractEntityId } from '@/hooks/owlbearSync/setupOwlbearTokenSync';
import { useCharacterStore } from '@/store/useCharacterStore';
import type { PcPokemonSummary } from '@/types/pcStorageTypes';
import { isBackupScene, syncBackupSceneTokens } from '@/utils/pc/pcBackupSceneSync';
import { recentlySpawnedTokenIds } from '@/utils/pc/pcModalOps';
import {
    separateAttachments,
    detachTokensFromParent,
    reconcileTokenAttachmentsOnScene
} from '@/utils/pc/pcAttachmentOps';
import {
    parseCombatPoolsFromMeta,
    isTokenSpeciesCompatible,
    resolveSummaryNickname,
    buildMergedSummaryMeta,
    buildClonedTokenMetadata
} from '@/utils/sync/tokenMetaUtils';

let isReconciling = false;
let hasPendingReconciliation = false;
let pendingReconcileRole: 'PLAYER' | 'GM' = 'PLAYER';

function getTokenMeta(item: Item): Record<string, unknown> {
    return (
        ((item.metadata[METADATA_ID] || item.metadata['pokerole-pmd-extension/stats']) as Record<string, unknown>) || {}
    );
}

function queueTokenDeletionWithAttachments(
    token: Item,
    sceneItems: Item[],
    duplicateIdsToDelete: string[]
): void {
    duplicateIdsToDelete.push(token.id);
    const { characterTokens: attachedChars, allAttachedChildren } = separateAttachments(sceneItems, token.id);
    if (attachedChars.length > 0) {
        detachTokensFromParent(attachedChars, sceneItems).catch(() => {});
    }
    const attachedCharIds = new Set(attachedChars.map((c) => c.id));
    const nonCharAttached = allAttachedChildren.filter((a) => !attachedCharIds.has(a.id));
    duplicateIdsToDelete.push(...nonCharAttached.map((a) => a.id));
}

function syncLiveTokenToSummary(
    item: Item,
    sum: PcPokemonSummary,
    tMeta: Record<string, unknown>,
    tokenLastMod: number,
    updateSummary: (summary: PcPokemonSummary) => void,
    requireOnMapSync: boolean
): void {
    const { hp: curHp, maxHp: curMaxHp, will: curWill, maxWill: curMaxWill } = parseCombatPoolsFromMeta(tMeta, {
        hp: sum.hp,
        maxHp: sum.maxHp,
        will: sum.will,
        maxWill: sum.maxWill
    });
    const mergedMeta = buildMergedSummaryMeta(sum, tMeta);
    const changed =
        sum.hp !== curHp ||
        sum.maxHp !== curMaxHp ||
        sum.will !== curWill ||
        sum.maxWill !== curMaxWill ||
        sum.mapTokenId !== item.id ||
        (requireOnMapSync && !sum.isOnMap);

    if (changed) {
        updateSummary({
            ...sum,
            hp: curHp,
            maxHp: curMaxHp,
            will: curWill,
            maxWill: curMaxWill,
            isOnMap: true,
            mapTokenId: item.id,
            savedTokenItem: item,
            fullMetadata: mergedMeta,
            lastModified: tokenLastMod
        });
    }
}

/**
 * Cross-Scene Token Reconciliation & Persistence Engine:
 * When switching maps/scenes, tokens left on prior maps are NOT deleted.
 * Instead, they are recognized by entityId, re-linked to PC storage, and their
 * metadata (HP, Will, statuses, moves, inventory, stats) is synchronized with
 * the latest character sheet data IF AND ONLY IF PC storage is genuinely newer.
 * Duplicate cloned tokens on the SAME active scene are assigned fresh UUIDs.
 *
 * Gameplay Authority:
 * - Only the GM may mutate, update, or delete scene tokens.
 * - Non-GM players passively synchronize their local PC summaries from the live canvas tokens.
 * - Live canvas tokens are the source of truth during gameplay (HP loss, Will usage, Temp HP, Statuses).
 */
export async function reconcileSceneTokens(sceneItems: Item[], role: 'PLAYER' | 'GM'): Promise<void> {
    if (!OBR.isAvailable) return;
    if (isReconciling) {
        hasPendingReconciliation = true;
        pendingReconcileRole = role;
        return;
    }

    isReconciling = true;
    try {
        if (await isBackupScene()) {
            await syncBackupSceneTokens(sceneItems);
            return;
        }

        // NON-GM PLAYERS: Passive local store synchronization only.
        if (role !== 'GM') {
            const freshStore = useCharacterStore.getState();
            const summaries = freshStore.pcData.pokemonSummaries || {};

            for (const item of sceneItems) {
                if (item.layer !== 'CHARACTER' || recentlySpawnedTokenIds.has(item.id)) continue;
                const entityId = extractEntityId(item);
                if (!entityId || !summaries[entityId]) continue;

                const sum = summaries[entityId];
                const tMeta = getTokenMeta(item);
                const compatible = isTokenSpeciesCompatible(
                    tMeta['species'] as string | undefined,
                    (tMeta['nickname'] as string | undefined) || item.name,
                    sum.species,
                    sum.fullMetadata?.nickname as string | undefined,
                    sum.name
                );
                if (!compatible) continue;

                const tokenLastMod = Number(tMeta.lastModified) || 0;
                const sumLastMod = Number(sum.lastModified) || 0;
                if (sumLastMod >= tokenLastMod || !tokenLastMod) continue;

                syncLiveTokenToSummary(item, sum, tMeta, tokenLastMod, freshStore.updatePokemonSummary, true);
            }
            return;
        }

        // GM AUTHORITY ONLY BELOW THIS POINT
        const freshStore = useCharacterStore.getState();
        const summaries = freshStore.pcData.pokemonSummaries || {};
        const activeCamp = freshStore.pcData.campaigns[freshStore.pcData.activeCampaignId];
        const trainers = activeCamp?.trainers || {};

        const tokensByEntity = new Map<string, Item[]>();
        for (const item of sceneItems) {
            if (item.layer === 'CHARACTER' && !recentlySpawnedTokenIds.has(item.id)) {
                const entityId = extractEntityId(item);
                if (entityId) {
                    const list = tokensByEntity.get(entityId) || [];
                    list.push(item);
                    tokensByEntity.set(entityId, list);
                }
            }
        }

        const duplicateIdsToDelete: string[] = [];
        const attachmentsToAdd: Item[] = [];
        const tokensToUpdate: Array<{ id: string; metadata: Item['metadata']; name?: string; skipRender?: boolean }> =
            [];

        for (const [entityId, tokens] of tokensByEntity.entries()) {
            let sum = summaries[entityId];
            const tr = trainers[entityId];
            if (!sum && !tr) continue;

            // Anti-Contamination Check: Ensure token species / nickname matches summary
            if (sum && tokens[0]) {
                const tMeta = getTokenMeta(tokens[0]);
                const compatible = isTokenSpeciesCompatible(
                    tMeta['species'] as string | undefined,
                    (tMeta['nickname'] as string | undefined) || tokens[0].name,
                    sum.species,
                    sum.fullMetadata?.nickname as string | undefined,
                    sum.name
                );
                if (!compatible) {
                    OBR.scene.items
                        .updateItems([tokens[0].id], (items) => {
                            for (const it of items) {
                                if (it.metadata[METADATA_ID]) {
                                    delete (it.metadata[METADATA_ID] as Record<string, unknown>).entityId;
                                }
                                if (it.metadata['pokerole-pmd-extension/stats']) {
                                    delete (it.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>)
                                        .entityId;
                                }
                                delete it.metadata['entityId'];
                            }
                        })
                        .catch(() => {});
                    continue;
                }
            }

            // Assign fresh UUIDs to copy-pasted clones so they act as independent combatants
            const preferred =
                (sum && tokens.find((t) => t.id === sum.mapTokenId)) ||
                (tr && tokens.find((t) => t.id === tr.mapTokenId)) ||
                tokens[0];

            if (tokens.length > 1) {
                for (const t of tokens) {
                    if (t.id !== preferred.id) {
                        tokensToUpdate.push({
                            id: t.id,
                            metadata: buildClonedTokenMetadata(t.metadata, METADATA_ID, crypto.randomUUID()),
                            skipRender: true
                        });
                    }
                }
            }
            const primaryToken = preferred;

            // If Pokémon is marked off-map in PC storage, only purge when PC storage is strictly newer
            if (sum && !sum.isOnMap) {
                const primaryMeta = getTokenMeta(primaryToken);
                const tokenLastMod = Number(primaryMeta.lastModified) || 0;
                const sumLastMod = Number(sum.lastModified) || 0;

                if (sumLastMod > tokenLastMod) {
                    queueTokenDeletionWithAttachments(primaryToken, sceneItems, duplicateIdsToDelete);
                    continue;
                }

                sum = { ...sum, isOnMap: true, mapTokenId: primaryToken.id };
                freshStore.updatePokemonSummary(sum);
            }

            // Reconcile Pokémon tokens left sent out on the map with latest PC storage data
            if (sum && sum.isOnMap) {
                const tMeta = getTokenMeta(primaryToken);
                const tokenLastMod = Number(tMeta.lastModified) || 0;
                const sumLastMod = Number(sum.lastModified) || 0;
                const hasValidFullMeta = Boolean(sum.fullMetadata && Object.keys(sum.fullMetadata).length > 5);
                const isOutdated = (sumLastMod > tokenLastMod || !tokenLastMod) && hasValidFullMeta;

                const { itemsToAdd: attachToAdd, idsToDelete: attachToDelete } = reconcileTokenAttachmentsOnScene(
                    primaryToken,
                    sum.attachedItems,
                    sceneItems,
                    false
                );
                if (attachToDelete.length > 0) duplicateIdsToDelete.push(...attachToDelete);
                if (isOutdated && attachToAdd.length > 0) attachmentsToAdd.push(...attachToAdd);

                if (isOutdated) {
                    const sumTempHp = Number(sum.fullMetadata?.['temporary-hit-points']) || 0;
                    const sumTempWill = Number(sum.fullMetadata?.['temporary-will']) || 0;
                    const nextMeta: Record<string, unknown> = {
                        ...tMeta,
                        ...(sum.fullMetadata || {}),
                        entityId,
                        name: sum.name,
                        nickname: resolveSummaryNickname(sum),
                        species: sum.species,
                        'hp-curr': sum.hp,
                        'hp-max-display': sum.maxHp,
                        'will-curr': sum.will,
                        'will-max-display': sum.maxWill,
                        'temporary-hit-points': sumTempHp,
                        'temporary-hit-points-max': Number(sum.fullMetadata?.['temporary-hit-points-max']) || sumTempHp,
                        'temporary-will': sumTempWill,
                        'temporary-will-max': Number(sum.fullMetadata?.['temporary-will-max']) || sumTempWill,
                        'token-image-url': sum.tokenImageUrl || (tMeta['token-image-url'] as string),
                        lastModified: sum.lastModified || Date.now()
                    };
                    tokensToUpdate.push({
                        id: primaryToken.id,
                        name: sum.name || sum.species,
                        metadata: {
                            ...primaryToken.metadata,
                            [METADATA_ID]: nextMeta,
                            'pokerole-pmd-extension/stats': nextMeta
                        }
                    });
                } else if (tokenLastMod > sumLastMod && tokenLastMod > 0) {
                    syncLiveTokenToSummary(primaryToken, sum, tMeta, tokenLastMod, freshStore.updatePokemonSummary, false);
                }

                if (sum.mapTokenId !== primaryToken.id) {
                    freshStore.updatePokemonSummary({ ...sum, isOnMap: true, mapTokenId: primaryToken.id });
                }
            } else if (tr && tr.fullMetadata) {
                const tMeta = getTokenMeta(primaryToken);
                const isOutdated =
                    tMeta.name !== tr.name || (tr.avatarUrl && tMeta['token-image-url'] !== tr.avatarUrl);
                if (isOutdated) {
                    const nextMeta: Record<string, unknown> = {
                        ...tMeta,
                        ...(tr.fullMetadata || {}),
                        entityId,
                        name: tr.name,
                        nickname: tr.name,
                        'token-image-url': tr.avatarUrl || (tMeta['token-image-url'] as string)
                    };
                    tokensToUpdate.push({
                        id: primaryToken.id,
                        name: tr.name,
                        metadata: {
                            ...primaryToken.metadata,
                            [METADATA_ID]: nextMeta,
                            'pokerole-pmd-extension/stats': nextMeta
                        }
                    });
                }
            }
        }

        if (duplicateIdsToDelete.length > 0) {
            await OBR.scene.items.deleteItems(Array.from(new Set(duplicateIdsToDelete)));
        }
        if (attachmentsToAdd.length > 0) {
            await OBR.scene.items.addItems(attachmentsToAdd);
        }
        if (tokensToUpdate.length > 0) {
            const updateMap = new Map(tokensToUpdate.map((t) => [t.id, t]));
            await OBR.scene.items.updateItems(
                tokensToUpdate.map((t) => t.id),
                (items) => {
                    for (const item of items) {
                        const match = updateMap.get(item.id);
                        if (match) {
                            item.metadata = match.metadata;
                            if (match.name !== undefined) item.name = match.name;
                        }
                    }
                }
            );

            for (const upd of tokensToUpdate) {
                if (upd.skipRender) continue;
                const meta = upd.metadata[METADATA_ID] as Record<string, unknown>;
                const item = sceneItems.find((i) => i.id === upd.id);
                if (item && meta) renderTokenGraphicsForMeta(item, meta, role, false).catch(() => {});
            }
        }
    } catch (e) {
        console.warn('[SyncEngine] Failed during scene token reconciliation:', e);
    } finally {
        isReconciling = false;
        if (hasPendingReconciliation) {
            hasPendingReconciliation = false;
            const nextRole = pendingReconcileRole;
            try {
                if (OBR.isAvailable && (await OBR.scene.isReady())) {
                    const freshItems = await OBR.scene.items.getItems();
                    await reconcileSceneTokens(freshItems, nextRole);
                }
            } catch (err) {
                console.warn('[SyncEngine] Failed during trailing scene token reconciliation:', err);
            }
        }
    }
}
