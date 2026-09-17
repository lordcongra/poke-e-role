import OBR, { buildImage } from '@owlbear-rodeo/sdk';
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

export async function spawnTrainerAndTeam(
    result: GeneratedTrainerResult,
    destination: 'new' | 'overwrite' = 'new'
): Promise<void> {
    const store = useCharacterStore.getState();
    const fallbackUrl = `${import.meta.env.BASE_URL || '/'}pokeball.svg`;

    // --- STANDALONE MODE ---
    if (isStandaloneMode) {
        try {
            if (destination === 'overwrite' && result.teamMembers.length === 0) {
                // Simply overwrite the active character sheet
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
            store.setTokenData(trainerId, 'PLAYER');
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
        const vpWidth = await OBR.viewport.getWidth();
        const vpHeight = await OBR.viewport.getHeight();
        const centerPos = await OBR.viewport.inverseTransformPoint({
            x: vpWidth / 2,
            y: vpHeight / 2
        });

        // 300px standard cell resolution
        const tokenDimension = 300;
        const gridSpacing = 200; // Offset spacing between tokens in the formation

        const imageContent = {
            url: fallbackUrl,
            mime: 'image/svg+xml',
            width: tokenDimension,
            height: tokenDimension
        };
        const grid = {
            dpi: tokenDimension,
            offset: {
                x: tokenDimension / 2,
                y: tokenDimension / 2
            }
        };

        // 1. Build Trainer Token
        const trainerItem = buildImage(imageContent, grid)
            .name(result.trainerName)
            .position(centerPos)
            .layer('CHARACTER')
            .metadata({
                [METADATA_ID]: result.trainerMetadata
            })
            .build();

        // 2. Build Pokémon Tokens in Formation
        const offsets = calculateFormationOffsets(result.teamMembers.length, gridSpacing);
        const pokemonItems = result.teamMembers.map((member, idx) => {
            const offset = offsets[idx] || { dx: (idx + 1) * gridSpacing, dy: 0 };
            const pos = {
                x: centerPos.x + offset.dx,
                y: centerPos.y + offset.dy
            };

            return buildImage(imageContent, grid)
                .name(member.species)
                .position(pos)
                .layer('CHARACTER')
                .metadata({
                    [METADATA_ID]: member.metadata
                })
                .build();
        });

        const allItems = [trainerItem, ...pokemonItems];

        // Batch add all tokens to OBR scene
        await OBR.scene.items.addItems(allItems);

        // Select and activate Trainer token
        setActiveTokenId(trainerItem.id);
        store.setTokenData(trainerItem.id, store.role || 'PLAYER');
        store.setIdentity('tokenImageUrl', fallbackUrl);
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
