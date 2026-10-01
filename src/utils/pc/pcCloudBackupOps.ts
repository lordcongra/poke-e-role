import OBR, { buildImage, type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import type { PcBox, CampaignProfile, PcPokemonSummary, TrainerRoster } from '../../types/pcStorageTypes';
import { getAbsolutePokeballUrl, resolveImageDimensions } from '../generators/trainerTokenSpawner';
import { uploadBoxToObrCloud, downloadBoxFromObrCloud } from './pcStorageAdapter';

/**
 * Builds array of Character tokens for a Box and optional Trainer Belt arranged
 * in a spaced battle grid (300px spacing) preserving proper aspect ratios and HUD metadata.
 */
export async function buildBackupSceneItems(
    box: PcBox,
    _campaign: CampaignProfile,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    partyEntityIds?: (string | null)[],
    trainer?: TrainerRoster
): Promise<Item[]> {
    const items: Item[] = [];
    const spacing = 300;
    const fallbackUrl = getAbsolutePokeballUrl();

    const createPokemonItem = async (summary: PcPokemonSummary, pos: { x: number; y: number }): Promise<Item> => {
        const metaObj: Record<string, unknown> = {
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

        if (summary.savedTokenItem) {
            const raw = JSON.parse(JSON.stringify(summary.savedTokenItem)) as Record<string, unknown>;
            const clone = {
                ...raw,
                id: crypto.randomUUID(),
                position: pos,
                layer: 'CHARACTER'
            } as Item;
            const merged = {
                ...((clone.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                ...metaObj
            };
            clone.metadata = {
                ...clone.metadata,
                [METADATA_ID]: merged,
                'pokerole-pmd-extension/stats': merged
            };
            return clone;
        }

        const dims = await resolveImageDimensions(summary.tokenImageUrl || fallbackUrl);
        return buildImage(
            {
                url: summary.tokenImageUrl || fallbackUrl,
                mime: (summary.tokenImageUrl || '').endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: dims.width,
                height: dims.height
            },
            {
                dpi: dims.width,
                offset: { x: dims.width / 2, y: dims.height / 2 }
            }
        )
            .name(summary.name || summary.species)
            .position(pos)
            .layer('CHARACTER')
            .metadata({
                [METADATA_ID]: metaObj,
                'pokerole-pmd-extension/stats': metaObj
            })
            .build();
    };

    let startBeltCol = 0;
    if (trainer) {
        const trainerMeta: Record<string, unknown> = {
            ...(trainer.fullMetadata || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.name,
            mode: 'Trainer',
            'token-image-url': trainer.avatarUrl
        };

        if (trainer.savedTokenItem) {
            const raw = JSON.parse(JSON.stringify(trainer.savedTokenItem)) as Record<string, unknown>;
            const clone = {
                ...raw,
                id: crypto.randomUUID(),
                position: { x: 0, y: 0 },
                layer: 'CHARACTER'
            } as Item;
            const merged = {
                ...((clone.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                ...trainerMeta
            };
            clone.metadata = {
                ...clone.metadata,
                [METADATA_ID]: merged,
                'pokerole-pmd-extension/stats': merged
            };
            items.push(clone);
            startBeltCol = 1;
        } else {
            const dims = await resolveImageDimensions(trainer.avatarUrl || fallbackUrl);
            const trainerItem = buildImage(
                {
                    url: trainer.avatarUrl || fallbackUrl,
                    mime: (trainer.avatarUrl || '').endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                    width: dims.width,
                    height: dims.height
                },
                {
                    dpi: dims.width,
                    offset: { x: dims.width / 2, y: dims.height / 2 }
                }
            )
                .name(trainer.name)
                .position({ x: 0, y: 0 })
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: trainerMeta,
                    'pokerole-pmd-extension/stats': trainerMeta
                })
                .build();
            items.push(trainerItem);
            startBeltCol = 1;
        }
    }

    // Row 0: Active Party Belt Pokémon
    const validPartyIds = (partyEntityIds || []).filter((id): id is string => Boolean(id));
    for (let idx = 0; idx < validPartyIds.length; idx++) {
        const entityId = validPartyIds[idx];
        const summary = pokemonSummaries[entityId];
        if (summary) {
            const pos = { x: (startBeltCol + idx) * spacing, y: 0 };
            const item = await createPokemonItem(summary, pos);
            items.push(item);
        }
    }

    // Row 1+: PC Box Pokémon in 6-column rows
    const partyIdSet = new Set(validPartyIds);
    const boxSlots = (box.slots || []).filter((id): id is string => Boolean(id) && !partyIdSet.has(id as string));
    for (let idx = 0; idx < boxSlots.length; idx++) {
        const entityId = boxSlots[idx];
        const summary = pokemonSummaries[entityId];
        if (summary) {
            const col = idx % 6;
            const row = Math.floor(idx / 6);
            const pos = { x: col * spacing, y: 350 + row * spacing };
            const item = await createPokemonItem(summary, pos);
            items.push(item);
        }
    }

    return items;
}

/**
 * Uploads a collection of tokens representing a Box and Party to Owlbear Rodeo Cloud Storage.
 */
export async function exportBoxCloud(
    box: PcBox,
    campaign: CampaignProfile,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    customSceneName?: string,
    partyEntityIds?: (string | null)[],
    trainer?: TrainerRoster
): Promise<boolean> {
    const items = await buildBackupSceneItems(box, campaign, pokemonSummaries, partyEntityIds, trainer);
    return await uploadBoxToObrCloud(box.name, campaign.name, items, customSceneName);
}

/**
 * Syncs Box and Party tokens directly onto the active scene currently open in Owlbear Rodeo,
 * removing previous backup tokens and cleanly laying out the updated team and storage grid.
 */
export async function syncToActiveScene(
    box: PcBox,
    campaign: CampaignProfile,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    partyEntityIds?: (string | null)[],
    trainer?: TrainerRoster
): Promise<boolean> {
    if (!OBR.isAvailable) return false;
    try {
        const isReady = await OBR.scene.isReady();
        if (!isReady) return false;

        // Tag scene with backup metadata
        await OBR.scene.setMetadata({
            'pokerole-pmd-extension/pc-backup': {
                boxName: box.name,
                campaignName: campaign.name,
                updatedAt: Date.now()
            }
        });

        // 1. Build the items using the clean spaced grid
        const items = await buildBackupSceneItems(box, campaign, pokemonSummaries, partyEntityIds, trainer);

        // 2. Clear previous tokens from this PC/box/party/trainer on the active scene
        const sceneItems = await OBR.scene.items.getItems();
        const boxSlotsSet = new Set((box.slots || []).filter(Boolean));
        const partySet = new Set((partyEntityIds || []).filter(Boolean));

        const idsToRemove = sceneItems
            .filter((it) => {
                if (it.layer !== 'CHARACTER') return false;
                const meta = (it.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                const entityId = meta.entityId as string;
                if (entityId && (boxSlotsSet.has(entityId) || partySet.has(entityId))) {
                    return true;
                }
                if (trainer && (meta.name === trainer.name || meta.species === trainer.name)) {
                    return true;
                }
                return false;
            })
            .map((it) => it.id);

        if (idsToRemove.length > 0) {
            await OBR.scene.items.deleteItems(idsToRemove);
        }

        // 3. Add the newly arranged items
        await OBR.scene.items.addItems(items);
        return true;
    } catch (e) {
        console.error('[PcCloudBackupOps] Failed to sync to active scene:', e);
        return false;
    }
}

/**
 * Imports Pokémon from an Owlbear Cloud backup scene into the active PC box.
 */
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
                tokenImageUrl: (meta['token-image-url'] as string) || (item as { image?: { url?: string } }).image?.url,
                isOnMap: false,
                savedTokenItem: item,
                fullMetadata: meta,
                lastModified: Date.now()
            });
        }
    }

    return importedSummaries;
}
