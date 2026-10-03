import OBR, { buildImage, isImage, type Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, PcBox, TrainerRoster } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../sync/obr';
import { rehomeTokenSubtree, chunkItems } from './rehomeEngine';
import {
    exportBoxCloud,
    syncToActiveScene,
    importBoxCloud,
    buildBackupSceneItems,
    downloadAndRestoreCloudScene,
    restoreTokensIntoPcStorage
} from './pcCloudBackupOps';
export {
    exportBoxCloud,
    syncToActiveScene,
    importBoxCloud,
    buildBackupSceneItems,
    downloadAndRestoreCloudScene,
    restoreTokensIntoPcStorage
};

export {
    recallPokemonFromMap,
    clearTokenClaimOps,
    unlinkPokemonFromPcOps,
    type RecallPokemonResult
} from './pcRecallOps';

import { buildGraphicsFromMeta, renderTokenGraphics } from '../graphics/graphicsManager';
import { resolveExistingCharacterEntityId } from './pcCandidateMatching';
import { resolveTokenImageForMap } from './pcTokenImageOps';
import {
    resolveSpawnAnchorToken,
    findOpenGridPosition,
    getAbsoluteItemPosition,
    setBatchAnchorPos,
    getBatchAnchorPos,
    recentlySpawnedTokenIds,
    markTokenAsRecentlySpawned
} from './pcPlacementUtils';
import { isMatchingPokemonItem } from './pcItemMatching';
import { useCharacterStore } from '../../store/useCharacterStore';

export { recentlySpawnedTokenIds, markTokenAsRecentlySpawned };

export async function spawnPokemonToMap(
    summary: PcPokemonSummary,
    ownerId?: string,
    role: 'PLAYER' | 'GM' = 'PLAYER',
    trainer?: TrainerRoster
): Promise<{ success: boolean; newMapTokenId?: string; alreadyOnMap?: boolean }> {
    if (!OBR.isAvailable) {
        return { success: true };
    }

    try {
        const gridDpi = (await OBR.scene.grid.getDpi().catch(() => 150)) || 150;
        const sceneItems = await OBR.scene.items.getItems();

        // 1. Check if this Pokémon is already actively placed on the current scene
        if (summary.mapTokenId) {
            const existing = sceneItems.find((it) => it.id === summary.mapTokenId);
            if (existing && isMatchingPokemonItem(existing, summary)) {
                await OBR.player.select([existing.id]);
                return { success: true, newMapTokenId: existing.id, alreadyOnMap: true };
            }
        }

        // 2. Check if already placed by entityId
        if (summary.entityId) {
            const existingByEntity = sceneItems.find((it) => isMatchingPokemonItem(it, summary));
            if (existingByEntity) {
                await OBR.player.select([existingByEntity.id]);
                return { success: true, newMapTokenId: existingByEntity.id, alreadyOnMap: true };
            }
        }

        // 3. Drop adjacent to trainer (or currently selected token) if present on scene
        let anchorPos: { x: number; y: number } = { x: 0, y: 0 };
        try {
            const activeTokenId = useCharacterStore.getState().tokenId;
            const selectedTokenIds = await OBR.player.getSelection().catch(() => []);
            const anchorToken = resolveSpawnAnchorToken(trainer, sceneItems, activeTokenId, selectedTokenIds);

            if (anchorToken) {
                anchorPos = getAbsoluteItemPosition(anchorToken, sceneItems);
                setBatchAnchorPos(anchorPos);
            } else {
                const sessionAnchor = getBatchAnchorPos();
                if (sessionAnchor) {
                    anchorPos = sessionAnchor;
                } else {
                    const vpWidth = (await OBR.viewport.getWidth()) || 800;
                    const vpHeight = (await OBR.viewport.getHeight()) || 600;
                    anchorPos = await OBR.viewport.inverseTransformPoint({
                        x: vpWidth / 2,
                        y: vpHeight / 2
                    });
                    setBatchAnchorPos(anchorPos);
                }
            }
        } catch {
            anchorPos = { x: 0, y: 0 };
        }

        // Concentric 2D grid search guarantees tokens never stack on top of each other
        const landingPos = findOpenGridPosition(anchorPos, gridDpi, sceneItems);

        // 4. Resolve safe, valid map artwork (handles local-img, scene match, and pokeball fallback)
        const resolvedImg = await resolveTokenImageForMap(summary, sceneItems);

        // 5. Construct token item
        let parentItem: Item;
        const validEntityId = summary.entityId || crypto.randomUUID();

        const metadataObj: Record<string, unknown> = {
            ...(summary.fullMetadata || {}),
            entityId: validEntityId,
            name: summary.name || summary.species,
            nickname: summary.name || summary.species,
            species: summary.species || summary.name,
            type1: summary.type1 || 'Normal',
            type2: summary.type2,
            'hp-curr': summary.hp,
            'hp-max-display': summary.maxHp,
            'will-curr': summary.will,
            'will-max-display': summary.maxWill,
            rank: summary.rank || 'Starter',
            'token-image-url': resolvedImg.url
        };

        if (summary.savedTokenItem && isImage(summary.savedTokenItem)) {
            parentItem = JSON.parse(JSON.stringify(summary.savedTokenItem)) as Item;
            parentItem.position = landingPos;
            delete (parentItem as { attachedTo?: unknown }).attachedTo;
            if (parentItem.scale) {
                parentItem.scale = { ...parentItem.scale };
            }

            // Ensure image URL is map-safe and matches resolved artwork
            const currUrl = isImage(parentItem) ? parentItem.image?.url : undefined;
            const needsImageUpdate =
                !currUrl ||
                currUrl.startsWith('local-img:') ||
                currUrl.startsWith('file:') ||
                currUrl.startsWith('file:///') ||
                (resolvedImg.url &&
                    !resolvedImg.url.includes('pokeball.svg') &&
                    (currUrl.includes('pokeball.svg') || currUrl !== resolvedImg.url));

            if (needsImageUpdate && isImage(parentItem)) {
                parentItem.image = {
                    url: resolvedImg.url,
                    mime: resolvedImg.mime,
                    width: resolvedImg.width,
                    height: resolvedImg.height
                };
                if (parentItem.grid) {
                    const maxDim = Math.max(resolvedImg.width, resolvedImg.height);
                    parentItem.grid.dpi = maxDim;
                    parentItem.grid.offset = {
                        x: resolvedImg.width / 2,
                        y: resolvedImg.height / 2
                    };
                }
            }

            parentItem.name = summary.name || summary.species;

            const existingMeta =
                (parentItem.metadata?.[METADATA_ID] as Record<string, unknown>) ||
                (parentItem.metadata?.['pokerole-pmd-extension/stats'] as Record<string, unknown>) ||
                summary.fullMetadata ||
                {};
            const fullSpawnMeta = {
                ...existingMeta,
                ...metadataObj,
                'token-image-url': resolvedImg.url
            };
            parentItem.metadata = {
                ...parentItem.metadata,
                [METADATA_ID]: fullSpawnMeta,
                'pokerole-pmd-extension/stats': fullSpawnMeta
            };
        } else {
            const maxDim = Math.max(resolvedImg.width, resolvedImg.height);
            const pokeImageContent = {
                url: resolvedImg.url,
                mime: resolvedImg.mime,
                width: resolvedImg.width,
                height: resolvedImg.height
            };
            const pokeGrid = {
                dpi: maxDim,
                offset: { x: resolvedImg.width / 2, y: resolvedImg.height / 2 }
            };

            parentItem = buildImage(pokeImageContent, pokeGrid)
                .name(summary.name || summary.species)
                .position(landingPos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: metadataObj,
                    'pokerole-pmd-extension/stats': metadataObj
                })
                .build();
        }

        try {
            const myId = await OBR.player.getId();
            const myName = await OBR.player.getName();
            parentItem.metadata = {
                ...parentItem.metadata,
                'pokerole-pmd-extension/claimed-by': {
                    playerId: myId,
                    playerName: myName,
                    entityId: validEntityId,
                    trainerName: trainer?.name
                }
            };
        } catch {
            // Ignore player lookup error
        }

        // 6. Re-home parent token + any attached items with fresh IDs & landing position
        const rehomedItems = rehomeTokenSubtree(parentItem, summary.attachedItems || [], {
            landingPosition: landingPos,
            ownerId
        });

        const newParent = rehomedItems[0] || parentItem;
        const newParentId = newParent.id;
        markTokenAsRecentlySpawned(newParentId);

        // 7. Add to scene with fallback in case savedTokenItem had incompatible metadata
        try {
            const chunks = chunkItems(rehomedItems, 15);
            for (const chunk of chunks) {
                await OBR.scene.items.addItems(chunk);
            }
        } catch (addError) {
            console.warn('[PcModalOps] Re-homed token add failed, attempting fresh rebuild:', addError);
            const maxDim = Math.max(resolvedImg.width, resolvedImg.height);
            const fallbackItem = buildImage(
                {
                    url: resolvedImg.url,
                    mime: resolvedImg.mime,
                    width: resolvedImg.width,
                    height: resolvedImg.height
                },
                {
                    dpi: maxDim,
                    offset: { x: resolvedImg.width / 2, y: resolvedImg.height / 2 }
                }
            )
                .name(summary.name || summary.species)
                .position(landingPos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: metadataObj,
                    'pokerole-pmd-extension/stats': metadataObj
                })
                .build();

            await OBR.scene.items.addItems([fallbackItem]);
            (newParent as { id: string }).id = fallbackItem.id;
        }

        // 8. Render tracker HUD graphics for the newly spawned Pokémon
        try {
            const meta =
                ((newParent.metadata?.[METADATA_ID] || newParent.metadata?.['pokerole-pmd-extension/stats']) as Record<
                    string,
                    unknown
                >) || {};
            const gData = buildGraphicsFromMeta(meta);
            await renderTokenGraphics(newParent, gData, role, true);
        } catch (gErr) {
            console.error('[PcModalOps] Failed to render token graphics for spawned Pokémon:', gErr);
        }

        return { success: true, newMapTokenId: newParent.id };
    } catch (e) {
        console.error('[PcModalOps] Failed to spawn Pokémon to map:', e);
        return { success: false };
    }
}

export { spawnTrainerToMap } from './pcTrainerOps';

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

    let resolvedMapTokenId: string | undefined = undefined;
    let resolvedIsOnMap = false;

    if (existingSummary) {
        if (existingSummary.isOnMap && existingSummary.mapTokenId) {
            resolvedIsOnMap = true;
            resolvedMapTokenId = existingSummary.mapTokenId;
        } else if (activeTokenId && existingSummary.mapTokenId === activeTokenId) {
            resolvedIsOnMap = true;
            resolvedMapTokenId = activeTokenId;
        } else {
            resolvedIsOnMap = false;
            resolvedMapTokenId = undefined;
        }
    } else if (activeTokenId) {
        resolvedIsOnMap = true;
        resolvedMapTokenId = activeTokenId;
    }

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
        isOnMap: resolvedIsOnMap,
        mapTokenId: resolvedMapTokenId,
        savedTokenItem: existingSummary?.savedTokenItem,
        attachedItems: existingSummary?.attachedItems,
        fullMetadata: { ...(existingSummary?.fullMetadata || {}), ...fullMetadata, entityId },
        lastModified: Date.now()
    };
}

export function filterTrainerPokemonSummaries(
    summaries: Record<string, PcPokemonSummary>,
    trainer?: { id: string; party: (string | null)[]; boxes?: PcBox[] },
    campaign?: { id?: string; boxes: PcBox[]; teamParty?: (string | null)[] }
): PcPokemonSummary[] {
    if (trainer) {
        const partyEntityIds = new Set(trainer.party?.filter(Boolean) || []);
        const trainerBoxEntityIds = new Set<string>();
        for (const b of trainer.boxes || []) {
            for (const s of b.slots || []) {
                if (s) trainerBoxEntityIds.add(s);
            }
        }
        return Object.values(summaries).filter((p) => {
            if (!p) return false;
            if (partyEntityIds.has(p.entityId)) return false;
            if (p.trainerId && p.trainerId === trainer.id) return true;
            if (trainerBoxEntityIds.has(p.entityId)) return true;
            return false;
        });
    }

    // PMD / No-Trainer Mode: Strictly use campaign teamParty and campaign boxes
    const teamPartyIds = new Set(campaign?.teamParty?.filter(Boolean) || []);
    const campaignBoxEntityIds = new Set<string>();
    for (const b of campaign?.boxes || []) {
        for (const s of b.slots || []) {
            if (s) campaignBoxEntityIds.add(s);
        }
    }
    return Object.values(summaries).filter((p) => {
        if (!p) return false;
        if (teamPartyIds.has(p.entityId)) return false;
        if (campaignBoxEntityIds.has(p.entityId)) return true;
        if (!p.trainerId && campaign?.id && p.campaignId === campaign.id) return true;
        return false;
    });
}

export function findOtherLinkedTrainer(
    campaign: { trainers?: Record<string, TrainerRoster> } | undefined,
    currentTrainerId: string | undefined,
    activeTokenId: string | null,
    identity: { mode?: string; nickname?: string; species?: string; trainerId?: string }
): TrainerRoster | undefined {
    const isTrainerMode = identity.mode === 'Trainer' || identity.mode === 'Trainer (Special)';
    if (!isTrainerMode || !currentTrainerId || !campaign?.trainers) return undefined;
    const activeTrainerName = (identity.nickname || identity.species || '').trim().toLowerCase();

    return Object.values(campaign.trainers).find((t) => {
        if (t.id === currentTrainerId) return false;
        if (activeTokenId && (t.mapTokenId === activeTokenId || t.savedTokenItem?.id === activeTokenId)) return true;
        if (identity.trainerId && identity.trainerId === t.id) return true;
        if (t.isLinked && activeTrainerName && t.name.toLowerCase() === activeTrainerName) return true;
        return false;
    });
}
