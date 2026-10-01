import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, TrainerRoster } from '../../types/pcStorageTypes';
import type { CharacterState } from '../../store/storeTypes';
import { flattenStateToMetadata } from '../sync/stateMapper';

/**
 * Prepares and normalizes a Pokémon summary for PC or Belt deposit,
 * ensuring trainer assignment, metadata snapshots, and saved token items are attached.
 */
export async function prepareDepositSummary(
    summary: PcPokemonSummary,
    trainer: TrainerRoster | undefined,
    pokemonSummaries: Record<string, PcPokemonSummary> | undefined,
    activeStore: CharacterState
): Promise<PcPokemonSummary> {
    const finalSummary = { ...summary };
    if (trainer) {
        finalSummary.trainerId = trainer.id;
    } else {
        delete finalSummary.trainerId;
    }
    if (!finalSummary.fullMetadata) {
        finalSummary.fullMetadata = flattenStateToMetadata(activeStore);
    }
    if (!finalSummary.savedTokenItem && OBR.isAvailable && finalSummary.mapTokenId) {
        try {
            const items = await OBR.scene.items.getItems([finalSummary.mapTokenId]);
            if (items.length > 0) {
                finalSummary.savedTokenItem = items[0];
            }
        } catch (e) {
            console.warn('[pcDepositOps] Failed to get map token for deposit:', e);
        }
    }

    // Stamp claim on map token
    if (OBR.isAvailable && finalSummary.mapTokenId) {
        try {
            const myId = await OBR.player.getId();
            const myName = await OBR.player.getName();
            await OBR.scene.items.updateItems([finalSummary.mapTokenId], (items) => {
                for (const it of items) {
                    it.metadata['pokerole-pmd-extension/claimed-by'] = {
                        playerId: myId,
                        playerName: myName,
                        entityId: finalSummary.entityId,
                        trainerName: trainer?.name
                    };
                }
            });
        } catch (e) {
            console.warn('[pcDepositOps] Failed to stamp claimed-by on deposit:', e);
        }
    }

    // Unify with existing summary if it is the same token
    if (pokemonSummaries && finalSummary.mapTokenId) {
        const existingMatch = Object.values(pokemonSummaries).find(
            (s) => s.mapTokenId === finalSummary.mapTokenId || s.savedTokenItem?.id === finalSummary.mapTokenId
        );
        if (existingMatch) finalSummary.entityId = existingMatch.entityId;
    }

    return finalSummary;
}
