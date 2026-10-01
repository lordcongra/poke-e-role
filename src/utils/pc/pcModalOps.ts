import OBR, { buildImage, type Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, PcBox } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../sync/obr';
import { getAbsolutePokeballUrl, resolveImageDimensions } from '../generators/trainerTokenSpawner';
import { rehomeTokenSubtree, calculateRelativeAttachment, chunkItems } from './rehomeEngine';
import { exportBoxCloud, syncToActiveScene, importBoxCloud, buildBackupSceneItems } from './pcCloudBackupOps';
export { exportBoxCloud, syncToActiveScene, importBoxCloud, buildBackupSceneItems };

import { buildGraphicsFromMeta, renderTokenGraphics } from '../graphics/graphicsManager';
import { resolveExistingCharacterEntityId } from './pcCandidateMatching';

export const recentlySpawnedTokenIds = new Set<string>();

export function markTokenAsRecentlySpawned(id: string) {
    recentlySpawnedTokenIds.add(id);
    setTimeout(() => {
        recentlySpawnedTokenIds.delete(id);
    }, 3500);
}

export interface RecallPokemonResult {
    success: boolean;
    attachedItems?: PcPokemonSummary['attachedItems'];
    savedTokenItem?: Item;
    fullMetadata?: Record<string, unknown>;
    currentHp?: number;
    maxHp?: number;
    currentWill?: number;
    maxWill?: number;
}

export async function spawnPokemonToMap(
    summary: PcPokemonSummary,
    ownerId?: string,
    role: 'PLAYER' | 'GM' = 'PLAYER'
): Promise<{ success: boolean; newMapTokenId?: string; alreadyOnMap?: boolean }> {
    if (!OBR.isAvailable) {
        return { success: true };
    }

    try {
        const gridDpi = (await OBR.scene.grid.getDpi()) || 150;
        const sceneItems = await OBR.scene.items.getItems();

        // Check if this Pokémon is already actively placed on the current scene
        if (summary.mapTokenId) {
            const existing = sceneItems.find((it) => it.id === summary.mapTokenId);
            if (existing) {
                await OBR.player.select([existing.id]);
                return { success: true, newMapTokenId: existing.id, alreadyOnMap: true };
            }
        }
        const existingByEntity = sceneItems.find((it) => {
            if (it.layer !== 'CHARACTER') return false;
            const meta = (it.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
            const claimMeta = it.metadata?.['pokerole-pmd-extension/claimed-by'] as { entityId?: string } | undefined;
            return (
                (meta.entityId && meta.entityId === summary.entityId) ||
                (claimMeta?.entityId && claimMeta.entityId === summary.entityId)
            );
        });
        if (existingByEntity) {
            await OBR.player.select([existingByEntity.id]);
            return { success: true, newMapTokenId: existingByEntity.id, alreadyOnMap: true };
        }

        // Check if there is an active trainer token on the scene to drop in front of
        const trainerToken = sceneItems.find((it) => {
            if (it.layer !== 'CHARACTER') return false;
            const meta = (it.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
            const mode = (meta.mode as string) || '';
            return mode === 'Trainer' || mode === 'Trainer (Special)';
        });

        let landingPos: { x: number; y: number };
        if (trainerToken) {
            const targetY = trainerToken.position.y + gridDpi * 1.25;
            const occupiedXs = sceneItems
                .filter((it) => it.layer === 'CHARACTER' && Math.abs(it.position.y - targetY) < gridDpi * 0.7)
                .map((it) => it.position.x);

            let chosenOffset = 0;
            const offsets = [0, gridDpi, -gridDpi, gridDpi * 2, -gridDpi * 2, gridDpi * 3, -gridDpi * 3];
            for (const off of offsets) {
                const candX = trainerToken.position.x + off;
                const isTaken = occupiedXs.some((ox) => Math.abs(ox - candX) < gridDpi * 0.7);
                if (!isTaken) {
                    chosenOffset = off;
                    break;
                }
            }

            landingPos = {
                x: trainerToken.position.x + chosenOffset,
                y: targetY
            };
        } else {
            // Default drop: 35% from left of viewport so it is NOT covered by extension iframe on the right
            const vpWidth = (await OBR.viewport.getWidth()) || 800;
            const vpHeight = (await OBR.viewport.getHeight()) || 600;
            landingPos = await OBR.viewport.inverseTransformPoint({
                x: vpWidth * 0.35,
                y: vpHeight * 0.5
            });
        }

        let parentItem: Item;

        if (summary.savedTokenItem) {
            // Restore exact token geometry, scale, grid, and image from the recalled token
            parentItem = JSON.parse(JSON.stringify(summary.savedTokenItem)) as Item;
            parentItem.position = landingPos;
            if (parentItem.scale) {
                parentItem.scale = { ...parentItem.scale };
            }

            const existingMeta =
                (parentItem.metadata?.[METADATA_ID] as Record<string, unknown>) || summary.fullMetadata || {};
            const mergedMeta: Record<string, unknown> = {
                ...existingMeta,
                ...(summary.fullMetadata || {}),
                entityId: summary.entityId,
                name: summary.name,
                nickname: summary.name,
                species: summary.species,
                'hp-curr': summary.hp,
                'hp-max-display': summary.maxHp,
                'will-curr': summary.will,
                'will-max-display': summary.maxWill,
                type1: summary.type1,
                type2: summary.type2,
                rank: summary.rank
            };
            if (summary.tokenImageUrl) {
                mergedMeta['token-image-url'] = summary.tokenImageUrl;
            }

            parentItem.metadata = {
                ...parentItem.metadata,
                [METADATA_ID]: mergedMeta
            };
        } else {
            const pokeUrl = summary.tokenImageUrl || getAbsolutePokeballUrl();
            const dims = await resolveImageDimensions(pokeUrl);
            const maxDim = Math.max(dims.width, dims.height);
            const pokeImageContent = {
                url: pokeUrl,
                mime: pokeUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: dims.width,
                height: dims.height
            };
            const pokeGrid = {
                dpi: maxDim,
                offset: { x: dims.width / 2, y: dims.height / 2 }
            };

            const metadataObj: Record<string, unknown> = {
                ...(summary.fullMetadata || {}),
                entityId: summary.entityId,
                name: summary.name,
                nickname: summary.name,
                species: summary.species,
                type1: summary.type1,
                type2: summary.type2,
                'hp-curr': summary.hp,
                'hp-max-display': summary.maxHp,
                'will-curr': summary.will,
                'will-max-display': summary.maxWill,
                rank: summary.rank,
                'token-image-url': summary.tokenImageUrl
            };

            parentItem = buildImage(pokeImageContent, pokeGrid)
                .name(summary.name || summary.species)
                .position(landingPos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: metadataObj
                })
                .build();
        }

        if (OBR.isAvailable) {
            try {
                const myId = await OBR.player.getId();
                const myName = await OBR.player.getName();
                parentItem.metadata = {
                    ...parentItem.metadata,
                    'pokerole-pmd-extension/claimed-by': {
                        playerId: myId,
                        playerName: myName,
                        entityId: summary.entityId
                    }
                };
            } catch {
                // Ignore player lookup error
            }
        }

        // Re-home parent token + any attached items with fresh IDs & landing position
        const rehomedItems = rehomeTokenSubtree(parentItem, summary.attachedItems || [], {
            landingPosition: landingPos,
            ownerId
        });

        const newParent = rehomedItems[0];
        const newParentId = newParent.id;
        markTokenAsRecentlySpawned(newParentId);

        // Add to scene in chunks
        const chunks = chunkItems(rehomedItems, 15);
        for (const chunk of chunks) {
            await OBR.scene.items.addItems(chunk);
        }

        await OBR.player.select([newParentId]);

        // Render tracker HUD graphics for the newly spawned Pokémon
        try {
            const meta = (newParent.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
            const gData = buildGraphicsFromMeta(meta);
            await renderTokenGraphics(newParent, gData, role, true);
        } catch (gErr) {
            console.error('[PcModalOps] Failed to render token graphics for spawned Pokémon:', gErr);
        }

        return { success: true, newMapTokenId: newParentId };
    } catch (e) {
        console.error('[PcModalOps] Failed to spawn Pokémon to map:', e);
        return { success: false };
    }
}

export { spawnTrainerToMap } from './pcTrainerOps';

export async function recallPokemonFromMap(
    mapTokenId?: string,
    summary?: PcPokemonSummary
): Promise<RecallPokemonResult> {
    if (!OBR.isAvailable || (!mapTokenId && !summary?.entityId)) {
        return { success: true };
    }

    try {
        const sceneItems = await OBR.scene.items.getItems();
        let parent = mapTokenId ? sceneItems.find((i) => i.id === mapTokenId) : undefined;
        if (!parent && summary?.entityId) {
            parent = sceneItems.find((i) => {
                if (i.layer !== 'CHARACTER') return false;
                const meta = (i.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                const claimMeta = i.metadata?.['pokerole-pmd-extension/claimed-by'] as
                    | { entityId?: string }
                    | undefined;
                return (
                    (meta.entityId && meta.entityId === summary.entityId) ||
                    (claimMeta?.entityId && claimMeta.entityId === summary.entityId)
                );
            });
        }

        if (!parent) {
            // Token not on active scene (e.g. spawned in another scene, or removed).
            // Do NOT wipe attachments with an empty array!
            return { success: true };
        }

        const resolvedParentId = parent.id;
        const attachedChildren = sceneItems.filter((i) => i.attachedTo === resolvedParentId);
        const bundles = attachedChildren.map((child) => calculateRelativeAttachment(parent, child));

        const meta = (parent.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
        const currentHp =
            typeof meta['hp-curr'] === 'number'
                ? meta['hp-curr']
                : !isNaN(Number(meta['hp-curr'])) && meta['hp-curr'] !== '' && meta['hp-curr'] !== undefined
                  ? Number(meta['hp-curr'])
                  : undefined;
        const maxHp =
            typeof meta['hp-max-display'] === 'number'
                ? meta['hp-max-display']
                : !isNaN(Number(meta['hp-max-display'])) &&
                    meta['hp-max-display'] !== '' &&
                    meta['hp-max-display'] !== undefined
                  ? Number(meta['hp-max-display'])
                  : undefined;
        const currentWill =
            typeof meta['will-curr'] === 'number'
                ? meta['will-curr']
                : !isNaN(Number(meta['will-curr'])) && meta['will-curr'] !== '' && meta['will-curr'] !== undefined
                  ? Number(meta['will-curr'])
                  : undefined;
        const maxWill =
            typeof meta['will-max-display'] === 'number'
                ? meta['will-max-display']
                : !isNaN(Number(meta['will-max-display'])) &&
                    meta['will-max-display'] !== '' &&
                    meta['will-max-display'] !== undefined
                  ? Number(meta['will-max-display'])
                  : undefined;

        // Delete parent and accessories from active scene
        const idsToDelete = [parent.id, ...attachedChildren.map((c) => c.id)];
        await OBR.scene.items.deleteItems(idsToDelete);

        return {
            success: true,
            attachedItems: bundles,
            savedTokenItem: parent,
            fullMetadata: meta,
            currentHp,
            maxHp,
            currentWill,
            maxWill
        };
    } catch (e) {
        console.error('[PcModalOps] Failed to recall Pokémon from map:', e);
        return { success: false };
    }
}

export function buildActiveCharacterSummary(
    identity: {
        nickname?: string;
        species?: string;
        rank?: string;
        type1?: string;
        type2?: string;
        mode?: string;
        tokenImageUrl?: string | null;
    },
    health: { hpCurr?: number; hpMax?: number },
    will: { willCurr?: number; willMax?: number },
    activeTokenId: string | null,
    fullMetadata: Record<string, unknown>,
    existingSummaries?: Record<string, PcPokemonSummary>,
    partySlots?: (string | null)[]
): PcPokemonSummary | null {
    if (identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)') {
        return null;
    }
    const activeName = identity.nickname || identity.species;
    if (!identity.species && !identity.nickname) return null;

    const matchedEntityId = resolveExistingCharacterEntityId(
        identity,
        activeTokenId,
        fullMetadata,
        existingSummaries,
        partySlots
    );

    const entityId = matchedEntityId || (fullMetadata.entityId as string) || activeTokenId || crypto.randomUUID();
    const existingSummary = matchedEntityId && existingSummaries ? existingSummaries[matchedEntityId] : undefined;

    return {
        entityId,
        trainerId: existingSummary?.trainerId,
        name: activeName || 'Active Pokémon',
        species: identity.species || activeName || 'Unknown',
        rank: identity.rank || existingSummary?.rank || 'Starter',
        type1: identity.type1 || existingSummary?.type1 || 'Normal',
        type2: identity.type2 || existingSummary?.type2 || undefined,
        hp: health.hpCurr ?? existingSummary?.hp ?? 10,
        maxHp: health.hpMax ?? existingSummary?.maxHp ?? 10,
        will: will.willCurr ?? existingSummary?.will ?? 5,
        maxWill: will.willMax ?? existingSummary?.maxWill ?? 5,
        tokenImageUrl: identity.tokenImageUrl || existingSummary?.tokenImageUrl || undefined,
        isOnMap: activeTokenId ? true : (existingSummary?.isOnMap ?? false),
        mapTokenId: activeTokenId || existingSummary?.mapTokenId || undefined,
        savedTokenItem: existingSummary?.savedTokenItem,
        attachedItems: existingSummary?.attachedItems,
        fullMetadata: { ...(existingSummary?.fullMetadata || {}), ...fullMetadata, entityId },
        lastModified: Date.now()
    };
}

export function filterTrainerPokemonSummaries(
    summaries: Record<string, PcPokemonSummary>,
    trainer?: { id: string; party: (string | null)[] },
    campaign?: { boxes: PcBox[] }
): PcPokemonSummary[] {
    const partyEntityIds = new Set(trainer?.party?.filter(Boolean) || []);
    return Object.values(summaries).filter((p) => {
        if (!p) return false;
        if (partyEntityIds.has(p.entityId)) return false;
        if (p.trainerId && trainer && p.trainerId === trainer.id) return true;
        if (campaign) {
            return campaign.boxes.some((b) => b.slots.includes(p.entityId));
        }
        return false;
    });
}

export async function clearTokenClaimOps(mapTokenId?: string, entityId?: string): Promise<void> {
    if (!OBR.isAvailable || (!mapTokenId && !entityId)) return;
    try {
        const sceneItems = await OBR.scene.items.getItems();
        const targets = sceneItems.filter((it) => {
            if (mapTokenId && it.id === mapTokenId) return true;
            if (entityId) {
                const meta = (it.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                const claimMeta = it.metadata?.['pokerole-pmd-extension/claimed-by'] as
                    | { entityId?: string }
                    | undefined;
                return (
                    (meta.entityId && meta.entityId === entityId) ||
                    (claimMeta?.entityId && claimMeta.entityId === entityId)
                );
            }
            return false;
        });
        if (targets.length > 0) {
            await OBR.scene.items.updateItems(
                targets.map((t) => t.id),
                (items) => {
                    for (const it of items) {
                        delete it.metadata['pokerole-pmd-extension/claimed-by'];
                    }
                }
            );
        }
    } catch (e) {
        console.warn('[PcModalOps] Failed to clear claimed-by on item:', e);
    }
}

export async function unlinkPokemonFromPcOps(
    summary: PcPokemonSummary,
    role: 'PLAYER' | 'GM' = 'PLAYER'
): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        let tokenId = summary.mapTokenId;
        if (!summary.isOnMap) {
            const res = await spawnPokemonToMap(summary, undefined, role);
            if (res.success && res.newMapTokenId) {
                tokenId = res.newMapTokenId;
            }
        }
        if (tokenId) {
            await clearTokenClaimOps(tokenId);
        }
    } catch (e) {
        console.warn('[PcModalOps] Failed to unlink Pokémon to map:', e);
    }
}
