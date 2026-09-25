import OBR, { buildImage, isImage, type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID, setActiveTokenId } from './obr';
import { isStandaloneMode, storageAdapter } from './storageAdapter';
import { useCharacterStore } from '../store/useCharacterStore';
import { buildGraphicsFromMeta, renderTokenGraphics } from './graphicsManager';
import type { GeneratedTrainerResult } from './trainerGeneratorLogic';

export function calculateFormationOffsets(count: number, spacing: number): Array<{ dx: number; dy: number }> {
    switch (count) {
        case 1:
            return [{ dx: spacing, dy: 0 }];
        case 2:
            return [
                { dx: -spacing, dy: 0 },
                { dx: spacing, dy: 0 }
            ];
        case 3:
            return [
                { dx: -spacing, dy: spacing },
                { dx: 0, dy: spacing },
                { dx: spacing, dy: spacing }
            ];
        case 4:
            return [
                { dx: -spacing, dy: spacing },
                { dx: spacing, dy: spacing },
                { dx: -spacing, dy: spacing * 2 },
                { dx: spacing, dy: spacing * 2 }
            ];
        case 5:
            return [
                { dx: -spacing, dy: spacing },
                { dx: 0, dy: spacing },
                { dx: spacing, dy: spacing },
                { dx: -spacing * 0.75, dy: spacing * 2 },
                { dx: spacing * 0.75, dy: spacing * 2 }
            ];
        case 6:
            return [
                { dx: -spacing, dy: spacing },
                { dx: 0, dy: spacing },
                { dx: spacing, dy: spacing },
                { dx: -spacing, dy: spacing * 2 },
                { dx: 0, dy: spacing * 2 },
                { dx: spacing, dy: spacing * 2 }
            ];
        default:
            return [];
    }
}

export function getAbsolutePokeballUrl(): string {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const relative = `${cleanBase}pokeball.svg`;
    try {
        return new URL(relative, window.location.href).href;
    } catch {
        return relative;
    }
}

export function findMatchingSceneImage(
    targetName: string,
    sceneItems: Item[]
): { url: string; width: number; height: number } | null {
    if (!targetName) return null;
    const cleanTarget = targetName.trim().toLowerCase();

    for (const item of sceneItems) {
        if (!isImage(item)) continue;
        const image = item.image;
        if (!image?.url || image.url.includes('pokeball.svg')) continue;

        const itemName = (item.name || '').trim().toLowerCase();
        const meta = (item.metadata[METADATA_ID] as Record<string, unknown> | undefined) || {};
        const metaSpecies = ((meta.species as string) || '').trim().toLowerCase();
        const metaNickname = ((meta.nickname as string) || '').trim().toLowerCase();

        const matches =
            itemName === cleanTarget ||
            metaSpecies === cleanTarget ||
            metaNickname === cleanTarget ||
            itemName.startsWith(`${cleanTarget} `) ||
            itemName.startsWith(`${cleanTarget}-`) ||
            itemName.startsWith(`${cleanTarget} (`) ||
            metaSpecies.startsWith(`${cleanTarget} `) ||
            metaNickname.startsWith(`${cleanTarget} `);

        if (matches) {
            return {
                url: image.url,
                width: image.width || 300,
                height: image.height || 300
            };
        }
    }
    return null;
}

export async function resolveImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 300 });
        img.onerror = () => resolve({ width: 300, height: 300 });
        img.src = url;
    });
}

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
    imageOptions?: TrainerSpawnImageOptions
): Promise<void> {
    const store = useCharacterStore.getState();
    const fallbackUrl = getAbsolutePokeballUrl();

    // --- STANDALONE MODE ---
    if (isStandaloneMode) {
        try {
            if (imageOptions?.defaultImageUrl) {
                result.trainerMetadata['token-image-url'] = imageOptions.defaultImageUrl;
            }

            if (destination === 'overwrite' && result.teamMembers.length === 0) {
                store.loadFromOwlbear({
                    ...result.trainerMetadata,
                    parentId: null
                });
                return;
            }

            // Create new Trainer sheet
            const trainerId = await storageAdapter.createLocalCharacter(result.trainerName, null);
            await storageAdapter.saveCharacter(
                trainerId,
                {
                    ...result.trainerMetadata,
                    parentId: null
                },
                METADATA_ID
            );

            // Create nested Pokémon sheets
            for (const member of result.teamMembers) {
                const pokeId = await storageAdapter.createLocalCharacter(member.species, trainerId);
                await storageAdapter.saveCharacter(
                    pokeId,
                    {
                        ...member.metadata,
                        parentId: trainerId
                    },
                    METADATA_ID
                );
            }

            // Switch to the newly created Trainer
            setActiveTokenId(trainerId);
            store.setTokenData(trainerId, 'GM');
            store.loadFromOwlbear({
                ...result.trainerMetadata,
                parentId: null
            });
        } catch (err) {
            console.error('[trainerTokenSpawner] Failed to spawn in Standalone:', err);
            throw err;
        }
        return;
    }

    // --- OWLBEAR RODEO MODE ---
    try {
        if (destination === 'overwrite' && store.tokenId) {
            await OBR.scene.items.updateItems([store.tokenId], (items) => {
                for (const item of items) {
                    item.metadata[METADATA_ID] = result.trainerMetadata;
                }
            });
            store.loadFromOwlbear(result.trainerMetadata);
            const updatedItems = await OBR.scene.items.getItems([store.tokenId]);
            if (updatedItems.length > 0) {
                const meta = (updatedItems[0].metadata[METADATA_ID] as Record<string, unknown>) || {};
                const gData = buildGraphicsFromMeta(meta);
                await renderTokenGraphics(updatedItems[0], gData, store.role || 'PLAYER', true);
            }
            if (OBR.isAvailable) {
                OBR.notification.show(`Overwrote active token with ${result.trainerName}!`, 'SUCCESS');
            }
            return;
        }

        const vpWidth = await OBR.viewport.getWidth();
        const vpHeight = await OBR.viewport.getHeight();
        const centerPos = await OBR.viewport.inverseTransformPoint({
            x: vpWidth / 2,
            y: vpHeight / 2
        });

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

        const trainerItem = buildImage(trainerImageContent, trainerGrid)
            .name(result.trainerName)
            .position(centerPos)
            .layer('CHARACTER')
            .metadata({
                [METADATA_ID]: result.trainerMetadata
            })
            .build();

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

        const allItems = [trainerItem, ...pokemonItems];

        // Batch add all tokens to OBR scene
        await OBR.scene.items.addItems(allItems);

        // Select and activate Trainer token
        setActiveTokenId(trainerItem.id);
        store.setTokenData(trainerItem.id, store.role || 'PLAYER');
        store.setIdentity('tokenImageUrl', trainerImg.url);
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
    } catch (err) {
        console.error('[trainerTokenSpawner] Failed to spawn tokens in OBR:', err);
        throw err;
    }
}
