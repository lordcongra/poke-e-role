import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, TrainerRoster, CampaignProfile } from '../../types/pcStorageTypes';
import type { CharacterState } from '../../store/storeTypes';
import { flattenStateToMetadata } from '../sync/stateMapper';
import { GRAPHICS_META_ID } from '../graphics/graphicsManager';
import { calculateRelativeAttachment } from './rehomeEngine';

/**
 * Resolves ownership status of a Pokémon entityId within the current campaign and across other campaigns.
 */
export function resolvePokemonOwnership(
    entityId: string,
    activeTrainerId: string | undefined,
    campaign: CampaignProfile | undefined,
    allCampaigns?: Record<string, CampaignProfile>,
    metadataClaim?: { trainerName?: string; playerName?: string; playerId?: string; entityId?: string },
    summary?: PcPokemonSummary,
    myPlayerId?: string,
    myRole?: 'PLAYER' | 'GM'
): {
    claimedBy?: string;
    isInParty: boolean;
    isInBoxes: boolean;
} {
    let claimedBy: string | undefined = undefined;
    let isInParty = false;
    let isInBoxes = false;

    // Security check: locked tokens or tokens claimed by another player
    if (myRole !== 'GM') {
        const isLocked = Boolean(
            summary?.savedTokenItem?.locked || (summary?.fullMetadata as Record<string, unknown>)?.locked === true
        );
        if (isLocked) {
            return { claimedBy: 'Locked by GM (Ask GM to unlock)', isInParty: false, isInBoxes: false };
        }
        if (metadataClaim?.playerId && myPlayerId && metadataClaim.playerId !== myPlayerId) {
            return {
                claimedBy: metadataClaim.playerName || metadataClaim.trainerName || 'Another Player',
                isInParty: false,
                isInBoxes: false
            };
        }
    }

    const isNamedTrainer = Boolean(activeTrainerId && activeTrainerId !== '__none__');

    if (campaign) {
        if (isNamedTrainer) {
            const activeTrainer = campaign.trainers ? campaign.trainers[activeTrainerId!] : undefined;
            if (activeTrainer) {
                const trParty =
                    activeTrainer.party || (activeTrainer as { partySlots?: (string | null)[] }).partySlots || [];
                if (trParty.includes(entityId)) isInParty = true;
                if ((activeTrainer.boxes || []).some((b) => (b.slots || []).includes(entityId))) isInBoxes = true;
            }

            // Check other trainers in same campaign
            if (campaign.trainers) {
                for (const tr of Object.values(campaign.trainers)) {
                    if (tr.id === activeTrainerId) continue;
                    const otherParty = tr.party || (tr as { partySlots?: (string | null)[] }).partySlots || [];
                    const inOtherParty = otherParty.includes(entityId);
                    const inOtherBoxes = (tr.boxes || []).some((b) => (b.slots || []).includes(entityId));
                    if (inOtherParty || inOtherBoxes) {
                        claimedBy = tr.name || 'Another Trainer';
                        break;
                    }
                }
            }

            // Check PMD expedition team / shared storage
            if (!claimedBy) {
                const inPmdParty = (campaign.teamParty || []).includes(entityId);
                const inPmdBoxes = (campaign.boxes || []).some((b) => (b.slots || []).includes(entityId));
                if (inPmdParty || inPmdBoxes) {
                    claimedBy = 'Expedition Team (PMD)';
                }
            }
        } else {
            // PMD / No-Trainer Mode
            if ((campaign.teamParty || []).includes(entityId)) isInParty = true;
            if ((campaign.boxes || []).some((b) => (b.slots || []).includes(entityId))) isInBoxes = true;

            // Check all named trainers in campaign
            if (campaign.trainers) {
                for (const tr of Object.values(campaign.trainers)) {
                    const trParty = tr.party || (tr as { partySlots?: (string | null)[] }).partySlots || [];
                    const inParty = trParty.includes(entityId);
                    const inBoxes = (tr.boxes || []).some((b) => (b.slots || []).includes(entityId));
                    if (inParty || inBoxes) {
                        claimedBy = tr.name || 'Another Trainer';
                        break;
                    }
                }
            }
        }
    }

    // Cross-campaign check
    if (!claimedBy && allCampaigns && campaign) {
        for (const [cId, otherCamp] of Object.entries(allCampaigns)) {
            if (cId === campaign.id) continue;
            const inOtherTeam = (otherCamp.teamParty || []).includes(entityId);
            const inOtherCampBoxes = (otherCamp.boxes || []).some((b) => (b.slots || []).includes(entityId));
            if (inOtherTeam || inOtherCampBoxes) {
                claimedBy = `Expedition Team (${otherCamp.name})`;
                break;
            }
            for (const tr of Object.values(otherCamp.trainers || {})) {
                const trParty = tr.party || (tr as { partySlots?: (string | null)[] }).partySlots || [];
                if (trParty.includes(entityId) || (tr.boxes || []).some((b) => (b.slots || []).includes(entityId))) {
                    claimedBy = `${tr.name} (${otherCamp.name})`;
                    break;
                }
            }
            if (claimedBy) break;
        }
    }

    // Metadata claim fallback
    if (!claimedBy && metadataClaim?.trainerName) {
        const activeName = isNamedTrainer && campaign?.trainers?.[activeTrainerId!]?.name;
        if (!activeName || metadataClaim.trainerName.trim().toLowerCase() !== activeName.trim().toLowerCase()) {
            claimedBy = metadataClaim.trainerName;
        }
    }

    return { claimedBy, isInParty, isInBoxes };
}

/**
 * Validates whether a Pokémon summary can be deposited into a target slot.
 * Enforces:
 * - Trainer mode guard: Trainer tokens cannot be stored into Pokémon slots.
 * - Locked token guard: Tokens locked by GM cannot be stored into PC by players.
 * - GM / unowned token guard: Tokens created by others without player claim cannot be deposited.
 * - Cross-trainer lock: Pokémon registered to another trainer cannot be deposited.
 * - PMD cross-mode lock: Pokémon registered to the Expedition Team cannot be stolen by a trainer, and vice versa.
 * - Cross-campaign lock: Pokémon registered in another campaign cannot be deposited without unlinking.
 * - Party duplication: A Pokémon already in the active party cannot be re-added to party.
 * - Box duplication: A Pokémon already stored in PC boxes cannot be duplicated into a box slot.
 */
export function validateDepositTarget(
    summary: PcPokemonSummary,
    trainer: TrainerRoster | undefined,
    campaign: CampaignProfile | undefined,
    targetSlotType?: 'party' | 'box',
    allCampaigns?: Record<string, CampaignProfile>,
    role?: 'PLAYER' | 'GM',
    myPlayerId?: string
): { allowed: boolean; reason?: string } {
    const pokeName = summary.name || summary.species || 'Pokémon';

    // 0. Mode & Role Protections
    const mode = summary.fullMetadata?.mode;
    if (mode === 'Trainer' || mode === 'Trainer (Special)' || summary.rank === 'Trainer') {
        return {
            allowed: false,
            reason: 'Trainer tokens cannot be stored into Pokémon slots.'
        };
    }

    if (role !== 'GM') {
        const isLocked = Boolean(
            summary.savedTokenItem?.locked || (summary.fullMetadata as Record<string, unknown>)?.locked === true
        );
        if (isLocked) {
            return {
                allowed: false,
                reason: `"${pokeName}" is locked by the GM. Ask your GM to unlock it to add it to your party.`
            };
        }

        const claimMeta = summary.fullMetadata?.['pokerole-pmd-extension/claimed-by'] as
            | { playerId?: string; playerName?: string }
            | undefined;

        if (claimMeta?.playerId && myPlayerId && claimMeta.playerId !== myPlayerId) {
            return {
                allowed: false,
                reason: `"${pokeName}" is claimed by ${claimMeta.playerName || 'another player'} and cannot be deposited into your PC.`
            };
        }
    }

    // 1. Cross-trainer guard within active campaign
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

    // 2. Named trainer -> PMD guard
    if (trainer && campaign) {
        const inPmdParty = (campaign.teamParty || []).includes(summary.entityId);
        const inPmdBoxes = (campaign.boxes || []).some((b) => (b.slots || []).includes(summary.entityId));
        if (inPmdParty || inPmdBoxes) {
            return {
                allowed: false,
                reason: `"${pokeName}" is registered to the Expedition Team (PMD)! Unlink them first before reassigning.`
            };
        }
    }

    // 3. Cross-campaign guard
    if (allCampaigns && campaign) {
        for (const [cId, otherCamp] of Object.entries(allCampaigns)) {
            if (cId === campaign.id) continue;
            const inOtherTeam = (otherCamp.teamParty || []).includes(summary.entityId);
            const inOtherCampBoxes = (otherCamp.boxes || []).some((b) => (b.slots || []).includes(summary.entityId));
            if (inOtherTeam || inOtherCampBoxes) {
                return {
                    allowed: false,
                    reason: `"${pokeName}" is registered to another campaign (${otherCamp.name})! Unlink them first before transferring.`
                };
            }
            for (const tr of Object.values(otherCamp.trainers || {})) {
                const trParty = tr.party || (tr as { partySlots?: (string | null)[] }).partySlots || [];
                if (
                    trParty.includes(summary.entityId) ||
                    (tr.boxes || []).some((b) => (b.slots || []).includes(summary.entityId))
                ) {
                    return {
                        allowed: false,
                        reason: `"${pokeName}" is registered to ${tr.name} in campaign "${otherCamp.name}"! Unlink them first before transferring.`
                    };
                }
            }
        }
    }

    // 4. Party duplicate check
    const currentParty = trainer ? trainer.party : campaign?.teamParty || [];
    if (targetSlotType === 'party' && currentParty.includes(summary.entityId)) {
        return {
            allowed: false,
            reason: `${pokeName} is already in the party!`
        };
    }

    // 5. Box duplicate check (supporting both Trainer boxes and PMD campaign boxes)
    const currentBoxes = trainer ? trainer.boxes || [] : campaign?.boxes || [];
    if (targetSlotType === 'box' && currentBoxes.length > 0) {
        const inBoxes = currentBoxes.some((b) => (b.slots || []).includes(summary.entityId));
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
    activeStore: CharacterState,
    campaignId?: string
): Promise<PcPokemonSummary> {
    const finalSummary = { ...summary };
    if (trainer) {
        finalSummary.trainerId = trainer.id;
    } else {
        delete finalSummary.trainerId;
    }
    if (campaignId) {
        finalSummary.campaignId = campaignId;
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
