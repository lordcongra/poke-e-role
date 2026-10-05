import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import { useCharacterStore } from '../../store/useCharacterStore';

export const BACKUP_SCENE_META_KEY = 'pokerole-pmd-extension/pc-backup';
export const IS_BACKUP_SCENE_FLAG = 'pokerole-pmd-extension/is-backup-scene';

/**
 * Strictly checks whether the active Owlbear Rodeo scene is flagged as a PC Backup Scene.
 * Only inspects scene-level metadata to prevent false positives on regular maps.
 */
export async function isBackupScene(): Promise<boolean> {
    if (!OBR.isAvailable) return false;
    try {
        const sceneMeta = await OBR.scene.getMetadata();
        if (Boolean(sceneMeta[BACKUP_SCENE_META_KEY] || sceneMeta[IS_BACKUP_SCENE_FLAG])) {
            return true;
        }

        // Secondary check: If scene was loaded from an OBR Cloud Asset without scene metadata,
        // inspect items on scene for the is-backup-token flag and auto-flag the scene.
        const items = await OBR.scene.items.getItems();
        const hasBackupToken = items.some((it) => {
            if (it.layer !== 'CHARACTER') return false;
            const meta = (it.metadata?.[METADATA_ID] || it.metadata?.['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            return (
                meta?.['is-backup-token'] === true || it.metadata?.['pokerole-pmd-extension/is-backup-token'] === true
            );
        });

        if (hasBackupToken) {
            await setSceneBackupStatus(true);
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Sets or removes the backup scene flag on the active Owlbear Rodeo scene.
 */
export async function setSceneBackupStatus(isBackup: boolean): Promise<boolean> {
    if (!OBR.isAvailable) return false;
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) return false;

        if (isBackup) {
            await OBR.scene.setMetadata({
                [IS_BACKUP_SCENE_FLAG]: true,
                [BACKUP_SCENE_META_KEY]: {
                    updatedAt: Date.now()
                }
            });
        } else {
            await OBR.scene.setMetadata({
                [IS_BACKUP_SCENE_FLAG]: undefined,
                [BACKUP_SCENE_META_KEY]: undefined
            });
        }
        return true;
    } catch (e) {
        console.error('[PcBackupSceneSync] Failed to update scene backup status:', e);
        return false;
    }
}

let isSyncingBackupScene = false;

/**
 * Synchronizes tokens on a backup scene with current local PC storage data.
 * Updates character tokens with their latest HP, Will, and stats from PC storage.
 * Does NOT delete tokens and does NOT alter party/map states.
 */
export async function syncBackupSceneTokens(sceneItems: Item[]): Promise<void> {
    if (!OBR.isAvailable || isSyncingBackupScene) return;

    try {
        const isBackup = await isBackupScene();
        if (!isBackup) return;

        const role = (await OBR.player.getRole().catch(() => 'PLAYER')) || 'PLAYER';
        if (role !== 'GM') return;

        const store = useCharacterStore.getState();
        const tokensToUpdate: Array<{ id: string; metadata: Item['metadata'] }> = [];
        const characterTokens = sceneItems.filter((it) => it.layer === 'CHARACTER');

        for (const token of characterTokens) {
            const meta = (token.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
            const entityId = (meta.entityId as string) || (token.metadata?.[METADATA_ID] ? token.id : null);
            if (!entityId) continue;

            const summary = store.pcData.pokemonSummaries[entityId];
            if (summary) {
                const sumTempHp = Number(summary.fullMetadata?.['temporary-hit-points']) || 0;
                const metaTempHp = Number(meta['temporary-hit-points']) || 0;
                const sumTempWill = Number(summary.fullMetadata?.['temporary-will']) || 0;
                const metaTempWill = Number(meta['temporary-will']) || 0;
                const sumStatusStr = JSON.stringify(summary.fullMetadata?.['status-list'] || '');
                const metaStatusStr = JSON.stringify(meta['status-list'] || '');
                const sumMovesStr = JSON.stringify(summary.fullMetadata?.['moves-data'] || '');
                const metaMovesStr = JSON.stringify(meta['moves-data'] || '');

                // Strict diffing: only update if core fields actually changed
                const hasChanged =
                    meta['hp-curr'] !== summary.hp ||
                    meta['hp-max-display'] !== summary.maxHp ||
                    meta['will-curr'] !== summary.will ||
                    meta['will-max-display'] !== summary.maxWill ||
                    sumTempHp !== metaTempHp ||
                    sumTempWill !== metaTempWill ||
                    sumStatusStr !== metaStatusStr ||
                    sumMovesStr !== metaMovesStr ||
                    meta.name !== summary.name ||
                    (summary.tokenImageUrl && meta['token-image-url'] !== summary.tokenImageUrl) ||
                    meta.species !== summary.species;

                if (!hasChanged) continue;

                const explicitNick = summary.fullMetadata?.nickname ?? summary.fullMetadata?.['nickname'];
                const cleanNick =
                    explicitNick !== undefined
                        ? explicitNick
                        : summary.name && summary.species && summary.name !== summary.species
                          ? summary.name
                          : '';

                const nextMeta = {
                    ...(summary.fullMetadata || {}),
                    ...meta,
                    entityId,
                    name: summary.name,
                    nickname: cleanNick,
                    species: summary.species,
                    'hp-curr': summary.hp,
                    'hp-max-display': summary.maxHp,
                    'will-curr': summary.will,
                    'will-max-display': summary.maxWill,
                    'temporary-hit-points': sumTempHp,
                    'temporary-hit-points-max': Number(summary.fullMetadata?.['temporary-hit-points-max']) || sumTempHp,
                    'temporary-will': sumTempWill,
                    'temporary-will-max': Number(summary.fullMetadata?.['temporary-will-max']) || sumTempWill,
                    'token-image-url': summary.tokenImageUrl || (meta['token-image-url'] as string),
                    lastModified: summary.lastModified || Date.now()
                };

                tokensToUpdate.push({
                    id: token.id,
                    metadata: {
                        ...token.metadata,
                        [METADATA_ID]: nextMeta,
                        'pokerole-pmd-extension/stats': nextMeta
                    }
                });
            }
        }

        if (tokensToUpdate.length > 0) {
            isSyncingBackupScene = true;
            const updateMap = new Map(tokensToUpdate.map((t) => [t.id, t.metadata]));
            await OBR.scene.items.updateItems(
                tokensToUpdate.map((t) => t.id),
                (items) => {
                    for (const item of items) {
                        const newMeta = updateMap.get(item.id);
                        if (newMeta) {
                            item.metadata = newMeta;
                        }
                    }
                }
            );
        }
    } catch (e) {
        console.warn('[PcBackupSceneSync] Failed to sync backup scene tokens:', e);
    } finally {
        setTimeout(() => {
            isSyncingBackupScene = false;
        }, 500);
    }
}

/**
 * Scans the current scene for Pokémon character tokens that can be synced or imported.
 */
export async function scanSceneBackupTokens(): Promise<Item[]> {
    if (!OBR.isAvailable) return [];
    try {
        const items = await OBR.scene.items.getItems();
        const role = (await OBR.player.getRole()) || 'PLAYER';
        const myPlayerId = await OBR.player.getId().catch(() => undefined);
        return items.filter((it) => {
            if (it.layer !== 'CHARACTER') return false;
            // Security: Locked tokens, tokens claimed by others, or unclaimed GM tokens are excluded for non-GMs
            if (role !== 'GM') {
                if (it.locked) return false;
                const claim = it.metadata?.['pokerole-pmd-extension/claimed-by'] as { playerId?: string } | undefined;
                if (claim?.playerId) {
                    if (myPlayerId && claim.playerId !== myPlayerId) return false;
                } else {
                    // Unclaimed token: player must be the creator of the token to import it
                    if (myPlayerId && it.createdUserId !== myPlayerId) return false;
                    if (!it.createdUserId && !myPlayerId) return false;
                }
            }
            const meta = (it.metadata?.[METADATA_ID] || it.metadata?.['pokerole-pmd-extension/stats']) as
                | Record<string, unknown>
                | undefined;
            if (!meta) return false;
            const mode = (meta.mode as string) || '';
            if (mode === 'Trainer' || mode === 'Trainer (Special)') return false;
            return Boolean(meta.species || meta.name || it.name);
        });
    } catch {
        return [];
    }
}
