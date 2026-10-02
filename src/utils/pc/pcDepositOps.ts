import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, TrainerRoster, CampaignProfile } from '../../types/pcStorageTypes';
import type { CharacterState } from '../../store/storeTypes';
import { flattenStateToMetadata } from '../sync/stateMapper';
import { GRAPHICS_META_ID } from '../graphics/graphicsManager';
import { calculateRelativeAttachment } from './rehomeEngine';

/**
 * Validates whether a Pokémon summary can be deposited into a target slot.
 * Enforces:
 * - Cross-trainer lock: Pokémon registered to another trainer cannot be deposited.
 * - Party duplication: A Pokémon already in the active party cannot be re-added to party.
 * - Box duplication: A Pokémon already stored in PC boxes cannot be duplicated into a box slot.
 */
export function validateDepositTarget(
    summary: PcPokemonSummary,
    trainer: TrainerRoster | undefined,
    campaign: CampaignProfile | undefined,
    targetSlotType?: 'party' | 'box'
): { allowed: boolean; reason?: string } {
    const pokeName = summary.name || summary.species || 'Pokémon';

    // 1. Cross-trainer guard
    if (campaign?.trainers) {
        for (const otherTrainer of Object.values(campaign.trainers)) {
            if (trainer && otherTrainer.id === trainer.id) continue;
            const otherParty =
                otherTrainer.party || (otherTrainer as { partySlots?: (string | null)[] }).partySlots || [];
            const inOtherParty = otherParty.includes(summary.entityId);
            const inOtherBoxes = (otherTrainer.boxes || []).some((b) => (b.slots || []).includes(summary.entityId));
            if (inOtherParty || inOtherBoxes) {
                return {
                    allowed: false,
                    reason: `"${pokeName}" is already registered to ${otherTrainer.name}! Unlink them first before reassigning.`
                };
            }
        }
    }

    // 2. Party duplicate check
    const currentParty = trainer ? trainer.party : campaign?.teamParty || [];
    if (targetSlotType === 'party' && currentParty.includes(summary.entityId)) {
        return {
            allowed: false,
            reason: `${pokeName} is already in the party!`
        };
    }

    // 3. Box duplicate check
    if (targetSlotType === 'box' && trainer?.boxes) {
        const inBoxes = trainer.boxes.some((b) => (b.slots || []).includes(summary.entityId));
        if (inBoxes) {
            return {
                allowed: false,
                reason: `${pokeName} is already stored in your PC boxes!`
            };
        }
    }

    return { allowed: true };
}

/**
 * Prepares and normalizes a Pokémon summary for PC or Belt deposit,
 * ensuring trainer assignment, metadata snapshots, attachments, and saved token items are captured.
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

    // 1. Unify with existing summary if it is the same token
    if (pokemonSummaries && finalSummary.mapTokenId) {
        const existingMatch = Object.values(pokemonSummaries).find(
            (s) => s.mapTokenId === finalSummary.mapTokenId || s.savedTokenItem?.id === finalSummary.mapTokenId
        );
        if (existingMatch) {
            finalSummary.entityId = existingMatch.entityId;
            if (!finalSummary.attachedItems && existingMatch.attachedItems) {
                finalSummary.attachedItems = existingMatch.attachedItems;
            }
        }
    }

    // 2. Capture saved token item and real attachments from scene if on map
    if (OBR.isAvailable && finalSummary.mapTokenId) {
        try {
            const sceneItems = await OBR.scene.items.getItems();
            const parent = sceneItems.find((i) => i.id === finalSummary.mapTokenId);
            if (parent) {
                finalSummary.savedTokenItem = parent;
                if (!finalSummary.attachedItems || finalSummary.attachedItems.length === 0) {
                    const realAttachments = sceneItems.filter(
                        (it) =>
                            it.attachedTo === parent.id &&
                            !it.metadata[GRAPHICS_META_ID] &&
                            !it.metadata['pokerole-extension/graphic-v6'] &&
                            !it.id.startsWith(`${parent.id}-`)
                    );
                    if (realAttachments.length > 0) {
                        finalSummary.attachedItems = realAttachments.map((c) => calculateRelativeAttachment(parent, c));
                    }
                }
            }
        } catch (e) {
            console.warn('[pcDepositOps] Failed to get map token or attachments for deposit:', e);
        }
    }

    // 3. Stamp claim on map token
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

    return finalSummary;
}

/**
 * Creates a duplicate clone summary of an existing stored Pokémon with a fresh entityId.
 */
export function clonePokemonSummaryOps(summary: PcPokemonSummary): {
    clonedSummary: PcPokemonSummary;
    clonedId: string;
} {
    const clonedId = crypto.randomUUID();
    const cloneName = `${summary.name || summary.species} (Clone)`;
    const clonedSummary: PcPokemonSummary = {
        ...summary,
        entityId: clonedId,
        name: cloneName,
        isOnMap: false,
        mapTokenId: undefined,
        savedTokenItem: undefined
    };

    if (!OBR.isAvailable && typeof window !== 'undefined' && window.localStorage) {
        try {
            const origRaw =
                localStorage.getItem(`pkr_char_${summary.entityId}`) ||
                (summary.savedTokenItem?.id ? localStorage.getItem(`pkr_char_${summary.savedTokenItem.id}`) : null);
            const cloneMeta = origRaw ? JSON.parse(origRaw) : { ...(summary.fullMetadata || {}) };
            cloneMeta.nickname = cloneName;
            cloneMeta.name = cloneName;
            cloneMeta.entityId = clonedId;
            delete cloneMeta.parentId;
            localStorage.setItem(`pkr_char_${clonedId}`, JSON.stringify(cloneMeta));
            clonedSummary.fullMetadata = cloneMeta;
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        } catch (e) {
            console.warn('[pcDepositOps] Failed to create local clone sheet:', e);
        }
    }

    return { clonedSummary, clonedId };
}
