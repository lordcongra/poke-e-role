import OBR, { buildImage, type Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, PcBox, CampaignProfile } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../sync/obr';
import { getAbsolutePokeballUrl } from '../generators/trainerTokenSpawner';
import { rehomeTokenSubtree, calculateRelativeAttachment, chunkItems } from './rehomeEngine';
import { uploadBoxToObrCloud, downloadBoxFromObrCloud } from './pcStorageAdapter';

import { buildGraphicsFromMeta, renderTokenGraphics } from '../graphics/graphicsManager';

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
): Promise<{ success: boolean; newMapTokenId?: string }> {
    if (!OBR.isAvailable) {
        return { success: true };
    }

    try {
        const vpWidth = (await OBR.viewport.getWidth()) || 800;
        const vpHeight = (await OBR.viewport.getHeight()) || 600;
        const centerPos = await OBR.viewport.inverseTransformPoint({
            x: vpWidth / 2,
            y: vpHeight / 2
        });

        let parentItem: Item;

        if (summary.savedTokenItem) {
            // Restore exact token geometry, scale, grid, and image from the recalled token
            parentItem = JSON.parse(JSON.stringify(summary.savedTokenItem)) as Item;
            parentItem.position = centerPos;

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
            const gridDpi = (await OBR.scene.grid.getDpi()) || 150;
            const pokeImageContent = {
                url: summary.tokenImageUrl || getAbsolutePokeballUrl(),
                mime: (summary.tokenImageUrl || '').endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: gridDpi,
                height: gridDpi
            };
            const pokeGrid = {
                dpi: gridDpi,
                offset: { x: gridDpi / 2, y: gridDpi / 2 }
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
                .position(centerPos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: metadataObj
                })
                .build();
        }

        // Re-home parent token + any attached items with fresh IDs & landing position
        const rehomedItems = rehomeTokenSubtree(parentItem, summary.attachedItems || [], {
            landingPosition: centerPos,
            ownerId
        });

        // Add to scene in chunks
        const chunks = chunkItems(rehomedItems, 15);
        for (const chunk of chunks) {
            await OBR.scene.items.addItems(chunk);
        }

        const newParent = rehomedItems[0];
        const newParentId = newParent.id;
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

export async function recallPokemonFromMap(mapTokenId?: string): Promise<RecallPokemonResult> {
    if (!OBR.isAvailable || !mapTokenId) {
        return { success: true };
    }

    try {
        const sceneItems = await OBR.scene.items.getItems();
        const parent = sceneItems.find((i) => i.id === mapTokenId);

        if (!parent) {
            return { success: true, attachedItems: [] };
        }

        const attachedChildren = sceneItems.filter((i) => i.attachedTo === mapTokenId);
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

export async function exportBoxCloud(
    box: PcBox,
    campaign: CampaignProfile,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    customSceneName?: string
): Promise<boolean> {
    const items: Item[] = [];
    for (const entityId of box.slots) {
        if (!entityId) continue;
        const summary = pokemonSummaries[entityId];
        if (!summary) continue;

        const imgItem = buildImage(
            {
                url: summary.tokenImageUrl || getAbsolutePokeballUrl(),
                mime: (summary.tokenImageUrl || '').endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: 150,
                height: 150
            },
            {
                dpi: 150,
                offset: { x: 75, y: 75 }
            }
        )
            .name(summary.name || summary.species)
            .metadata({
                [METADATA_ID]: {
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
                }
            })
            .build();

        items.push(imgItem);
    }

    return await uploadBoxToObrCloud(box.name, campaign.name, items, customSceneName);
}

export async function importBoxCloud(campaign: CampaignProfile): Promise<PcPokemonSummary[]> {
    const downloadedScenes = await downloadBoxFromObrCloud(campaign.name);
    const importedSummaries: PcPokemonSummary[] = [];

    for (const scene of downloadedScenes) {
        if (!scene.items) continue;
        for (const item of scene.items) {
            const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
            const entityId = (meta.entityId as string) || crypto.randomUUID();
            const hpCurr = Number(meta['hp-curr']) || (typeof meta.hp === 'number' ? meta.hp : 10);
            const hpMax = Number(meta['hp-max-display']) || (typeof meta.hpMax === 'number' ? meta.hpMax : 10);
            const willCurr = Number(meta['will-curr']) || (typeof meta.will === 'number' ? meta.will : 5);
            const willMax = Number(meta['will-max-display']) || (typeof meta.willMax === 'number' ? meta.willMax : 5);

            importedSummaries.push({
                entityId,
                name: (meta.name as string) || (meta.nickname as string) || item.name || 'Imported Pokémon',
                species: (meta.species as string) || item.name || 'Unknown',
                rank: (meta.rank as string) || 'Starter',
                type1: (meta.type1 as string) || 'Normal',
                type2: meta.type2 as string | undefined,
                hp: hpCurr,
                maxHp: hpMax,
                will: willCurr,
                maxWill: willMax,
                tokenImageUrl: (meta['token-image-url'] as string) || undefined,
                fullMetadata: meta,
                savedTokenItem: item,
                lastModified: Date.now()
            });
        }
    }

    return importedSummaries;
}

export function buildActiveCharacterSummary(
    identity: {
        nickname?: string;
        species?: string;
        rank?: string;
        type1?: string;
        type2?: string;
        tokenImageUrl?: string | null;
    },
    health: { hpCurr?: number; hpMax?: number },
    will: { willCurr?: number; willMax?: number },
    activeTokenId: string | null,
    fullMetadata: Record<string, unknown>
): PcPokemonSummary | null {
    const activeName = identity.nickname || identity.species;
    if (!identity.species && !identity.nickname) return null;

    return {
        entityId: activeTokenId || crypto.randomUUID(),
        name: activeName || 'Active Pokémon',
        species: identity.species || activeName || 'Unknown',
        rank: identity.rank || 'Starter',
        type1: identity.type1 || 'Normal',
        type2: identity.type2 || undefined,
        hp: health.hpCurr ?? 10,
        maxHp: health.hpMax ?? 10,
        will: will.willCurr ?? 5,
        maxWill: will.willMax ?? 5,
        tokenImageUrl: identity.tokenImageUrl || undefined,
        isOnMap: !!activeTokenId,
        mapTokenId: activeTokenId || undefined,
        fullMetadata,
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
