import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from './owlbearSyncConstants';
import { useCharacterStore } from '../../store/useCharacterStore';
import { isBackupScene, syncBackupSceneTokens } from '../../utils/pc/pcBackupSceneSync';
import { recentlySpawnedTokenIds } from '../../utils/pc/pcModalOps';
import { renderTokenGraphicsForMeta, extractEntityId } from './setupOwlbearTokenSync';

let isReconciling = false;

/**
 * Cross-Scene Token Reconciliation & Persistence Engine:
 * When switching maps/scenes, tokens left on prior maps are NOT deleted.
 * Instead, they are recognized by entityId, re-linked to PC storage, and their
 * metadata (HP, Will, statuses, moves, inventory, stats) is synchronized with
 * the latest character sheet data.
 * Duplicate tokens on the SAME active scene are pruned.
 */
export async function reconcileSceneTokens(sceneItems: Item[], role: 'PLAYER' | 'GM'): Promise<void> {
    if (!OBR.isAvailable || isReconciling) return;

    try {
        if (await isBackupScene()) {
            await syncBackupSceneTokens(sceneItems);
            return;
        }

        isReconciling = true;
        const freshStore = useCharacterStore.getState();
        const summaries = freshStore.pcData.pokemonSummaries || {};
        const activeCamp = freshStore.pcData.campaigns[freshStore.pcData.activeCampaignId];
        const trainers = activeCamp?.trainers || {};

        // 1. Group character tokens on the active scene by entityId
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
        const tokensToUpdate: Array<{ id: string; metadata: Item['metadata']; name: string }> = [];

        for (const [entityId, tokens] of tokensByEntity.entries()) {
            const sum = summaries[entityId];
            const tr = trainers[entityId];

            if (!sum && !tr) {
                // Wild encounter or external NPC not managed by player PC storage; do not delete or alter
                continue;
            }

            // 2. If Pokémon is stored away in PC boxes or belt, purge any ghost tokens on the scene!
            if (sum && !sum.isOnMap) {
                for (const t of tokens) {
                    duplicateIdsToDelete.push(t.id);
                    const attached = sceneItems.filter((a) => a.attachedTo === t.id);
                    duplicateIdsToDelete.push(...attached.map((a) => a.id));
                }
                continue;
            }

            // 3. Prune duplicate clones on the SAME active scene if more than one exists
            let primaryToken: Item;
            if (tokens.length > 1) {
                const preferred = (sum && tokens.find((t) => t.id === sum.mapTokenId)) || tokens[0];
                primaryToken = preferred;
                for (const t of tokens) {
                    if (t.id !== preferred.id) {
                        duplicateIdsToDelete.push(t.id);
                        const attached = sceneItems.filter((a) => a.attachedTo === t.id);
                        duplicateIdsToDelete.push(...attached.map((a) => a.id));
                    }
                }
            } else {
                primaryToken = tokens[0];
            }

            // 4. Reconcile Pokémon tokens left sent out on the map with latest PC storage data
            if (sum && sum.isOnMap) {
                const tMeta =
                    ((primaryToken.metadata[METADATA_ID] ||
                        primaryToken.metadata['pokerole-pmd-extension/stats']) as Record<string, unknown>) || {};

                const statusStr = JSON.stringify(sum.fullMetadata?.['status-list'] || '');
                const tStatusStr = JSON.stringify(tMeta['status-list'] || '');
                const movesStr = JSON.stringify(sum.fullMetadata?.['moves-data'] || '');
                const tMovesStr = JSON.stringify(tMeta['moves-data'] || '');

                const sumTempHp = Number(sum.fullMetadata?.['temporary-hit-points']) || 0;
                const tTempHp = Number(tMeta['temporary-hit-points']) || 0;
                const sumTempWill = Number(sum.fullMetadata?.['temporary-will']) || 0;
                const tTempWill = Number(tMeta['temporary-will']) || 0;

                const isOutdated =
                    (sum.lastModified && (!tMeta.lastModified || Number(tMeta.lastModified) < sum.lastModified)) ||
                    tMeta['hp-curr'] !== sum.hp ||
                    tMeta['hp-max-display'] !== sum.maxHp ||
                    tMeta['will-curr'] !== sum.will ||
                    tMeta['will-max-display'] !== sum.maxWill ||
                    tTempHp !== sumTempHp ||
                    tTempWill !== sumTempWill ||
                    tMeta.name !== sum.name ||
                    (sum.tokenImageUrl && tMeta['token-image-url'] !== sum.tokenImageUrl) ||
                    statusStr !== tStatusStr ||
                    movesStr !== tMovesStr;

                if (isOutdated) {
                    const nextMeta: Record<string, unknown> = {
                        ...tMeta,
                        ...(sum.fullMetadata || {}),
                        entityId,
                        name: sum.name,
                        nickname: sum.name,
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
                }

                // Ensure the "Recall" button on the UI works for this token on this scene
                if (sum.mapTokenId !== primaryToken.id) {
                    freshStore.updatePokemonSummary({
                        ...sum,
                        isOnMap: true,
                        mapTokenId: primaryToken.id
                    });
                }
            } else if (tr && tr.fullMetadata) {
                // 4. Reconcile Trainer tokens with latest roster data
                const tMeta =
                    ((primaryToken.metadata[METADATA_ID] ||
                        primaryToken.metadata['pokerole-pmd-extension/stats']) as Record<string, unknown>) || {};

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

        // 5. Delete intra-scene duplicates
        if (duplicateIdsToDelete.length > 0) {
            const unique = Array.from(new Set(duplicateIdsToDelete));
            await OBR.scene.items.deleteItems(unique);
        }

        // 6. Update outdated tokens on the scene & refresh their HUD graphics
        if (tokensToUpdate.length > 0) {
            const updateMap = new Map(tokensToUpdate.map((t) => [t.id, t]));
            await OBR.scene.items.updateItems(
                tokensToUpdate.map((t) => t.id),
                (items) => {
                    for (const item of items) {
                        const match = updateMap.get(item.id);
                        if (match) {
                            item.metadata = match.metadata;
                            item.name = match.name;
                        }
                    }
                }
            );

            // Refresh token HUD graphics for each updated token
            for (const upd of tokensToUpdate) {
                const meta = upd.metadata[METADATA_ID] as Record<string, unknown>;
                const item = sceneItems.find((i) => i.id === upd.id);
                if (item && meta) {
                    renderTokenGraphicsForMeta(item, meta, role, false).catch(() => {});
                }
            }
        }
    } catch (e) {
        console.warn('[SyncEngine] Failed during scene token reconciliation:', e);
    } finally {
        setTimeout(() => {
            isReconciling = false;
        }, 300);
    }
}
