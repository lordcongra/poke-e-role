import OBR, { buildImage, type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID, setActiveTokenId } from '../sync/obr';
import { isStandaloneMode, storageAdapter } from '../sync/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { buildGraphicsFromMeta, renderTokenGraphics } from '../graphics/graphicsManager';
import type { GeneratedTrainerResult } from './trainerGeneratorLogic';
import type { Rank } from '../../store/storeTypes';
import type { PcPokemonSummary, TrainerRoster, PcStorageData } from '../../types/pcStorageTypes';
import {
    calculateFormationOffsets,
    getAbsolutePokeballUrl,
    sanitizeImageUrl,
    findMatchingSceneImage,
    resolveImageDimensions
} from './tokenSpawnerUtils';

export {
    calculateFormationOffsets,
    getAbsolutePokeballUrl,
    sanitizeImageUrl,
    findMatchingSceneImage,
    resolveImageDimensions
};

export interface TrainerSpawnImageOptions {
    imageMode: 'default' | 'prompt_each' | 'fallback_pokeball';
    defaultImageUrl?: string;
    defaultImageWidth?: number;
    defaultImageHeight?: number;
    autoMatchExisting: boolean;
}

export async function spawnTrainerAndTeam(
    result: GeneratedTrainerResult,
    destination: 'new' | 'overwrite' = 'new',
    imageOptions?: TrainerSpawnImageOptions,
    options?: { generatePcEntry?: boolean }
): Promise<void> {
    const store = useCharacterStore.getState();
    const fallbackUrl = getAbsolutePokeballUrl();

    // --- STANDALONE MODE ---
    if (isStandaloneMode) {
        try {
            if (imageOptions?.defaultImageUrl) {
                result.trainerMetadata['token-image-url'] = imageOptions.defaultImageUrl;
            }

            let trainerId = store.tokenId;
            if (destination === 'overwrite' && trainerId) {
                await storageAdapter.saveCharacter(
                    trainerId,
                    {
                        ...result.trainerMetadata,
                        parentId: null
                    },
                    METADATA_ID
                );
                store.loadFromOwlbear({
                    ...result.trainerMetadata,
                    parentId: null
                });
            } else {
                trainerId = await storageAdapter.createLocalCharacter(result.trainerName, null);
                await storageAdapter.saveCharacter(
                    trainerId,
                    {
                        ...result.trainerMetadata,
                        parentId: null
                    },
                    METADATA_ID
                );
            }

            if (destination === 'overwrite' && result.teamMembers.length === 0) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('pkr-local-data-changed'));
                }
                return;
            }

            let pokemonParentId = trainerId;
            let beltFolderId: string | null = null;
            const shouldGeneratePc = options?.generatePcEntry !== false;

            if (shouldGeneratePc && result.teamMembers.length > 0) {
                beltFolderId = await storageAdapter.createFolder('Belt', trainerId);
                pokemonParentId = beltFolderId;
            }

            const generatedPartyIds: string[] = [];
            const newSummaries: Record<string, PcPokemonSummary> = {};

            // 2. Create nested Pokémon sheets
            for (let idx = 0; idx < result.teamMembers.length; idx++) {
                const member = result.teamMembers[idx];
                const pokeId = await storageAdapter.createLocalCharacter(member.species, pokemonParentId);
                const pokeMeta = {
                    ...member.metadata,
                    entityId: pokeId,
                    parentId: pokemonParentId
                };
                await storageAdapter.saveCharacter(pokeId, pokeMeta, METADATA_ID);

                if (shouldGeneratePc && idx < 6) {
                    generatedPartyIds.push(pokeId);
                    const hpMax = Number(member.metadata['hp-max-display']) || 10;
                    const rawHpCurr = member.metadata['hp-curr'];
                    const hpCurr =
                        rawHpCurr !== undefined && rawHpCurr !== null && !isNaN(Number(rawHpCurr))
                            ? Number(rawHpCurr)
                            : hpMax;
                    const willMax = Number(member.metadata['will-max-display']) || 5;
                    const rawWillCurr = member.metadata['will-curr'];
                    const willCurr =
                        rawWillCurr !== undefined && rawWillCurr !== null && !isNaN(Number(rawWillCurr))
                            ? Number(rawWillCurr)
                            : willMax;
                    newSummaries[pokeId] = {
                        entityId: pokeId,
                        name: member.species,
                        species: member.species,
                        rank: (member.metadata['rank'] as Rank) || 'Starter',
                        type1: (member.metadata['type1'] as string) || 'Normal',
                        type2: (member.metadata['type2'] as string) || undefined,
                        hp: hpCurr,
                        maxHp: hpMax,
                        will: willCurr,
                        maxWill: willMax,
                        tokenImageUrl: (member.metadata['token-image-url'] as string) || fallbackUrl,
                        trainerId,
                        fullMetadata: pokeMeta,
                        savedTokenItem: { id: pokeId } as unknown as Item,
                        lastModified: Date.now()
                    };
                }
            }

            // 3. Register Trainer and team into PC Storage if enabled
            if (shouldGeneratePc) {
                const { createDefaultBox, savePcStorage } = await import('../pc/pcStorageAdapter');
                const pcData = store.pcData;
                const activeCampId = pcData.activeCampaignId;
                const camp = pcData.campaigns[activeCampId];
                if (camp) {
                    const partySlots = Array(6).fill(null);
                    generatedPartyIds.forEach((pId, i) => {
                        partySlots[i] = pId;
                    });

                    const nextTrainer: TrainerRoster = {
                        id: trainerId,
                        name: result.trainerName,
                        party: partySlots,
                        boxes: Array.from({ length: 8 }, (_, i) => createDefaultBox(i)),
                        avatarUrl: (result.trainerMetadata['token-image-url'] as string) || undefined,
                        fullMetadata: result.trainerMetadata,
                        savedTokenItem: { id: trainerId } as unknown as Item
                    };

                    const nextPcData: PcStorageData = {
                        ...pcData,
                        pokemonSummaries: {
                            ...pcData.pokemonSummaries,
                            ...newSummaries
                        },
                        campaigns: {
                            ...pcData.campaigns,
                            [activeCampId]: {
                                ...camp,
                                activeTrainerId: trainerId,
                                trainers: {
                                    ...camp.trainers,
                                    [trainerId]: nextTrainer
                                }
                            }
                        }
                    };

                    useCharacterStore.setState({ pcData: nextPcData });
                    await savePcStorage(nextPcData);
                }
            }

            // Switch to the Trainer
            setActiveTokenId(trainerId);
            store.setTokenData(trainerId, 'GM');
            store.loadFromOwlbear({
                ...result.trainerMetadata,
                parentId: null
            });

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('pkr-local-data-changed'));
            }
        } catch (err) {
            console.error('[trainerTokenSpawner] Failed to spawn in Standalone:', err);
            throw err;
        }
        return;
    }

    // --- OWLBEAR RODEO MODE ---
    if (!OBR.isAvailable) return;
    try {
        const playerId = await OBR.player.getId().catch(() => '');
        const playerName = await OBR.player.getName().catch(() => '');
        const gridSpacing = 200; // Offset spacing between tokens in the formation

        let sceneItems: Item[] = [];
        if (imageOptions?.autoMatchExisting) {
            try {
                sceneItems = await OBR.scene.items.getItems();
            } catch (e) {
                console.warn('[trainerTokenSpawner] Could not inspect scene items for matching images:', e);
            }
        }

        async function resolveTokenImage(
            targetName: string,
            fallbackConcept?: string
        ): Promise<{ url: string; width: number; height: number }> {
            // 1. Check existing scene items
            if (imageOptions?.autoMatchExisting && sceneItems.length > 0) {
                const sceneMatch =
                    findMatchingSceneImage(targetName, sceneItems) ||
                    (fallbackConcept ? findMatchingSceneImage(fallbackConcept, sceneItems) : null);
                if (sceneMatch) {
                    return sceneMatch;
                }
            }

            // 2. Prompt each token if requested
            if (imageOptions?.imageMode === 'prompt_each' && typeof OBR.assets?.downloadImages === 'function') {
                try {
                    const images = await OBR.assets.downloadImages(false, targetName, 'CHARACTER');
                    if (images && images.length > 0) {
                        const img = images[0];
                        const width = img.image?.width || 0;
                        const height = img.image?.height || 0;
                        const url = img.image?.url || '';
                        if (url) {
                            const dim = width && height ? { width, height } : await resolveImageDimensions(url);
                            return { url, ...dim };
                        }
                    }
                } catch (e) {
                    console.warn(`[trainerTokenSpawner] Image prompt cancelled or failed for ${targetName}:`, e);
                }
            }

            // 3. Use default image if set
            if (imageOptions?.imageMode === 'default' && imageOptions.defaultImageUrl) {
                const width = imageOptions.defaultImageWidth || 300;
                const height = imageOptions.defaultImageHeight || 300;
                return {
                    url: imageOptions.defaultImageUrl,
                    width,
                    height
                };
            }

            // 4. Fallback Pokéball (absolute URL)
            return {
                url: fallbackUrl,
                width: 300,
                height: 300
            };
        }

        let centerPos = { x: 0, y: 0 };
        let trainerItem: Item | null = null;
        const targetTokenId = store.tokenId;

        if (destination === 'overwrite' && targetTokenId) {
            const updatedItems = await OBR.scene.items.getItems([targetTokenId]);
            if (updatedItems.length > 0) {
                const targetItem = updatedItems[0];
                centerPos = targetItem.position;
                const trainerId = (result.trainerMetadata.entityId as string) || targetTokenId;
                const claim = {
                    playerId,
                    playerName,
                    trainerId,
                    trainerName: result.trainerName,
                    isTrainer: true
                };

                await OBR.scene.items.updateItems([targetTokenId], (items) => {
                    for (const item of items) {
                        item.metadata[METADATA_ID] = result.trainerMetadata;
                        item.metadata['pokerole-pmd-extension/claimed-by'] = claim;
                    }
                });
                store.loadFromOwlbear(result.trainerMetadata);

                const refreshedItems = await OBR.scene.items.getItems([targetTokenId]);
                if (refreshedItems.length > 0) {
                    const meta = (refreshedItems[0].metadata[METADATA_ID] as Record<string, unknown>) || {};
                    const gData = buildGraphicsFromMeta(meta);
                    await renderTokenGraphics(refreshedItems[0], gData, store.role || 'PLAYER', true);
                }

                if (result.teamMembers.length === 0) {
                    OBR.notification.show(`Overwrote active token with ${result.trainerName}!`, 'SUCCESS');
                    return;
                }
            } else {
                const vpWidth = await OBR.viewport.getWidth();
                const vpHeight = await OBR.viewport.getHeight();
                centerPos = await OBR.viewport.inverseTransformPoint({
                    x: vpWidth / 2,
                    y: vpHeight / 2
                });
            }
        } else {
            const vpWidth = await OBR.viewport.getWidth();
            const vpHeight = await OBR.viewport.getHeight();
            centerPos = await OBR.viewport.inverseTransformPoint({
                x: vpWidth / 2,
                y: vpHeight / 2
            });

            // 1. Build Trainer Token
            const trainerImg = await resolveTokenImage(result.trainerName, result.trainerMetadata.species as string);
            result.trainerMetadata['token-image-url'] = trainerImg.url;

            const trainerImageContent = {
                url: trainerImg.url,
                mime: trainerImg.url.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: trainerImg.width,
                height: trainerImg.height
            };
            const trainerGrid = {
                dpi: trainerImg.width,
                offset: {
                    x: trainerImg.width / 2,
                    y: trainerImg.height / 2
                }
            };

            trainerItem = buildImage(trainerImageContent, trainerGrid)
                .name(result.trainerName)
                .position(centerPos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: result.trainerMetadata
                })
                .build();

            const trainerId = (result.trainerMetadata.entityId as string) || trainerItem.id;
            trainerItem.metadata['pokerole-pmd-extension/claimed-by'] = {
                playerId,
                playerName,
                trainerId,
                trainerName: result.trainerName,
                isTrainer: true
            };
        }

        // 2. Build Pokémon Tokens in Formation
        const offsets = calculateFormationOffsets(result.teamMembers.length, gridSpacing);
        const pokemonItems: Item[] = [];

        for (let idx = 0; idx < result.teamMembers.length; idx++) {
            const member = result.teamMembers[idx];
            const offset = offsets[idx] || { dx: (idx + 1) * gridSpacing, dy: 0 };
            const pos = {
                x: centerPos.x + offset.dx,
                y: centerPos.y + offset.dy
            };

            const pokeImg = await resolveTokenImage(member.species);
            member.metadata['token-image-url'] = pokeImg.url;

            const pokeImageContent = {
                url: pokeImg.url,
                mime: pokeImg.url.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
                width: pokeImg.width,
                height: pokeImg.height
            };
            const pokeGrid = {
                dpi: pokeImg.width,
                offset: {
                    x: pokeImg.width / 2,
                    y: pokeImg.height / 2
                }
            };

            const pokeItem = buildImage(pokeImageContent, pokeGrid)
                .name(member.species)
                .position(pos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: member.metadata
                })
                .build();

            pokemonItems.push(pokeItem);
        }

        if (destination === 'overwrite' && targetTokenId) {
            if (pokemonItems.length > 0) {
                await OBR.scene.items.addItems(pokemonItems);
                for (const item of pokemonItems) {
                    const meta = (item.metadata[METADATA_ID] as Record<string, unknown>) || {};
                    const gData = buildGraphicsFromMeta(meta);
                    await renderTokenGraphics(item, gData, store.role || 'PLAYER', true);
                }
            }
            if (OBR.isAvailable) {
                const countText = pokemonItems.length > 0 ? ` & spawned ${pokemonItems.length} Pokémon` : '';
                OBR.notification.show(`Overwrote active token with ${result.trainerName}${countText}!`, 'SUCCESS');
            }
        } else if (trainerItem) {
            const allItems = [trainerItem, ...pokemonItems];

            // Batch add all tokens to OBR scene
            await OBR.scene.items.addItems(allItems);

            // Select and activate Trainer token
            setActiveTokenId(trainerItem.id);
            store.setTokenData(trainerItem.id, store.role || 'PLAYER');
            store.setIdentity('tokenImageUrl', (result.trainerMetadata['token-image-url'] as string) || fallbackUrl);
            store.loadFromOwlbear(result.trainerMetadata);
            await OBR.player.select([trainerItem.id]);

            // Render tracker graphics for each token
            for (const item of allItems) {
                const meta = (item.metadata[METADATA_ID] as Record<string, unknown>) || {};
                const gData = buildGraphicsFromMeta(meta);
                await renderTokenGraphics(item, gData, store.role || 'PLAYER', true);
            }

            if (OBR.isAvailable) {
                const countText = pokemonItems.length > 0 ? ` & ${pokemonItems.length} Pokémon` : '';
                OBR.notification.show(`Spawned ${result.trainerName}${countText}!`, 'SUCCESS');
            }
        }
    } catch (err) {
        console.error('[trainerTokenSpawner] Failed to spawn tokens in OBR:', err);
        throw err;
    }
}
