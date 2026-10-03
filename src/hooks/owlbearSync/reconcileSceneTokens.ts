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
 * the latest character sheet data IF AND ONLY IF PC storage is genuinely newer.
 * Duplicate tokens on the SAME active scene are pruned.
 *
 * Gameplay Authority:
 * - Only the GM may mutate, update, or delete scene tokens.
 * - Non-GM players passively synchronize their local PC summaries from the live canvas tokens.
 * - Live canvas tokens are the source of truth during gameplay (HP loss, Will usage, Temp HP, Statuses).
 */
export async function reconcileSceneTokens(sceneItems: Item[], role: 'PLAYER' | 'GM'): Promise<void> {
    if (!OBR.isAvailable || isReconciling) return;

    try {
        if (await isBackupScene()) {
            await syncBackupSceneTokens(sceneItems);
            return;
        }

        // NON-GM PLAYERS: Passive local store synchronization only.
        // Never call updateItems or deleteItems on the scene from background reconciliation.
        if (role !== 'GM') {
            const freshStore = useCharacterStore.getState();
            const summaries = freshStore.pcData.pokemonSummaries || {};

            for (const item of sceneItems) {
                if (item.layer === 'CHARACTER' && !recentlySpawnedTokenIds.has(item.id)) {
                    const entityId = extractEntityId(item);
                    if (entityId && summaries[entityId]) {
                        const sum = summaries[entityId];
                        const tMeta =
                            ((item.metadata[METADATA_ID] || item.metadata['pokerole-pmd-extension/stats']) as Record<
                                string,
                                unknown
                            >) || {};

                        const curHp =
                            typeof tMeta['hp-curr'] === 'number'
                                ? tMeta['hp-curr']
                                : !isNaN(Number(tMeta['hp-curr'])) && tMeta['hp-curr'] !== ''
                                  ? Number(tMeta['hp-curr'])
                                  : sum.hp;
                        const curMaxHp =
                            typeof tMeta['hp-max-display'] === 'number'
                                ? tMeta['hp-max-display']
                                : !isNaN(Number(tMeta['hp-max-display'])) && tMeta['hp-max-display'] !== ''
                                  ? Number(tMeta['hp-max-display'])
                                  : sum.maxHp;
                        const curWill =
                            typeof tMeta['will-curr'] === 'number'
                                ? tMeta['will-curr']
                                : !isNaN(Number(tMeta['will-curr'])) && tMeta['will-curr'] !== ''
                                  ? Number(tMeta['will-curr'])
                                  : sum.will;
                        const curMaxWill =
                            typeof tMeta['will-max-display'] === 'number'
                                ? tMeta['will-max-display']
                                : !isNaN(Number(tMeta['will-max-display'])) && tMeta['will-max-display'] !== ''
                                  ? Number(tMeta['will-max-display'])
                                  : sum.maxWill;

                        // If the live token on the canvas has moves and local summary was missing them, adopt them!
                        const hasLiveMoves = Boolean(tMeta['moves-data'] && tMeta['moves-data'] !== '[]');
                        const missingLocalMoves =
                            !sum.fullMetadata?.['moves-data'] || sum.fullMetadata['moves-data'] === '[]';
                        const mergedMeta =
                            hasLiveMoves && missingLocalMoves
                                ? { ...(sum.fullMetadata || {}), ...tMeta }
                                : { ...tMeta, ...(sum.fullMetadata || {}) };

                        if (
                            sum.hp !== curHp ||
                            sum.maxHp !== curMaxHp ||
                            sum.will !== curWill ||
                            sum.maxWill !== curMaxWill ||
                            sum.mapTokenId !== item.id ||
                            !sum.isOnMap ||
                            (hasLiveMoves && missingLocalMoves)
                        ) {
                            freshStore.updatePokemonSummary({
                                ...sum,
                                hp: curHp,
                                maxHp: curMaxHp,
                                will: curWill,
                                maxWill: curMaxWill,
                                isOnMap: true,
                                mapTokenId: item.id,
                                savedTokenItem: item,
                                fullMetadata: mergedMeta,
                                lastModified: Number(tMeta.lastModified) || sum.lastModified || Date.now()
                            });
                        }
                    }
                }
            }
            return;
        }

        // GM AUTHORITY ONLY BELOW THIS POINT
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
                // Wild encounter or external NPC not managed by GM PC storage; do not delete or alter
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

                const tokenLastMod = Number(tMeta.lastModified) || 0;
                const sumLastMod = Number(sum.lastModified) || 0;
                const hasValidFullMeta = Boolean(sum.fullMetadata && Object.keys(sum.fullMetadata).length > 5);

                // A token on the map is ONLY outdated if PC storage was explicitly modified
                // AFTER the token (e.g. edited in PcSheetModal or cross-scene return from another map)
                // AND PC storage has valid sheet data.
                // Combat mutations (HP/Will decrease, Temp HP, Statuses) on the canvas token MUST NEVER
                // be considered "outdated" or overwritten by stale PC values!
                const isOutdated = tokenLastMod > 0 && sumLastMod > tokenLastMod && hasValidFullMeta;

                if (isOutdated) {
                    const sumTempHp = Number(sum.fullMetadata?.['temporary-hit-points']) || 0;
                    const sumTempWill = Number(sum.fullMetadata?.['temporary-will']) || 0;

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
                } else {
                    // Token on the map is live or newer: update local GM PC storage to mirror live combat stats!
                    const curHp =
                        typeof tMeta['hp-curr'] === 'number'
                            ? tMeta['hp-curr']
                            : !isNaN(Number(tMeta['hp-curr'])) && tMeta['hp-curr'] !== ''
                              ? Number(tMeta['hp-curr'])
                              : sum.hp;
                    const curMaxHp =
                        typeof tMeta['hp-max-display'] === 'number'
                            ? tMeta['hp-max-display']
                            : !isNaN(Number(tMeta['hp-max-display'])) && tMeta['hp-max-display'] !== ''
                              ? Number(tMeta['hp-max-display'])
                              : sum.maxHp;
                    const curWill =
                        typeof tMeta['will-curr'] === 'number'
                            ? tMeta['will-curr']
                            : !isNaN(Number(tMeta['will-curr'])) && tMeta['will-curr'] !== ''
                              ? Number(tMeta['will-curr'])
                              : sum.will;
                    const curMaxWill =
                        typeof tMeta['will-max-display'] === 'number'
                            ? tMeta['will-max-display']
                            : !isNaN(Number(tMeta['will-max-display'])) && tMeta['will-max-display'] !== ''
                              ? Number(tMeta['will-max-display'])
                              : sum.maxWill;

                    if (
                        sum.hp !== curHp ||
                        sum.maxHp !== curMaxHp ||
                        sum.will !== curWill ||
                        sum.maxWill !== curMaxWill ||
                        sum.mapTokenId !== primaryToken.id
                    ) {
                        freshStore.updatePokemonSummary({
                            ...sum,
                            hp: curHp,
                            maxHp: curMaxHp,
                            will: curWill,
                            maxWill: curMaxWill,
                            mapTokenId: primaryToken.id,
                            savedTokenItem: primaryToken,
                            fullMetadata: { ...(sum.fullMetadata || {}), ...tMeta },
                            lastModified: tokenLastMod || Date.now()
                        });
                    }
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
                // Reconcile Trainer tokens with latest roster data
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

        // 5. Delete intra-scene duplicates & ghost tokens (GM only)
        if (duplicateIdsToDelete.length > 0) {
            const unique = Array.from(new Set(duplicateIdsToDelete));
            await OBR.scene.items.deleteItems(unique);
        }

        // 6. Update genuinely outdated tokens on the scene & refresh their HUD graphics (GM only)
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
