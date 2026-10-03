import OBR from '@owlbear-rodeo/sdk';
import type { PcStorageData, PcPokemonSummary } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';
import { stripEntityFromTrainer, stripEntityFromBoxes } from './pcStateMutations';

export interface GmClaimConflict {
    summary: PcPokemonSummary;
    targetSlotOverride?: { type: 'party' | 'box'; index: number };
    reason: string;
    sourceCampaignName?: string;
    sourceTrainerName?: string;
}

/**
 * Checks if a deposit validation failure was caused by an ownership conflict
 * (cross-campaign, cross-trainer, or PMD expedition team registration).
 */
export function isOwnershipConflict(reason?: string): boolean {
    if (!reason) return false;
    return (
        reason.includes('registered to another campaign') ||
        reason.includes('registered to the Expedition Team') ||
        reason.includes('already registered to') ||
        reason.includes('already claimed by') ||
        reason.includes('Unlink them first')
    );
}

/**
 * Forcefully strips an entity from all conflicting campaign rosters, trainer parties,
 * boxes, and PMD team parties, reassigning it cleanly to the target campaign and trainer.
 */
export function applyForceTransferOwnership(
    pcData: PcStorageData,
    entityId: string,
    targetCampaignId: string,
    targetTrainerId?: string
): PcStorageData {
    const nextCampaigns = { ...pcData.campaigns };

    for (const [cId, camp] of Object.entries(nextCampaigns)) {
        const nextTrainers = { ...camp.trainers };
        for (const [tId, tr] of Object.entries(nextTrainers)) {
            // Strip from any conflicting trainer
            if (cId !== targetCampaignId || (targetTrainerId && tId !== targetTrainerId)) {
                nextTrainers[tId] = stripEntityFromTrainer(tr, entityId);
            }
        }

        const nextBoxes =
            cId !== targetCampaignId ? stripEntityFromBoxes(camp.boxes, entityId) || camp.boxes : camp.boxes;

        const nextTeamParty =
            cId !== targetCampaignId
                ? (camp.teamParty || []).map((slot) => (slot === entityId ? null : slot))
                : camp.teamParty;

        nextCampaigns[cId] = {
            ...camp,
            trainers: nextTrainers,
            boxes: nextBoxes,
            teamParty: nextTeamParty
        };
    }

    const nextSummaries = { ...pcData.pokemonSummaries };
    const existingSummary = nextSummaries[entityId];
    if (existingSummary) {
        nextSummaries[entityId] = {
            ...existingSummary,
            trainerId: targetTrainerId || (targetCampaignId ? undefined : existingSummary.trainerId),
            lastModified: Date.now()
        };
    }

    return {
        ...pcData,
        campaigns: nextCampaigns,
        pokemonSummaries: nextSummaries
    };
}

/**
 * Updates canvas scene token metadata to overwrite previous campaign/trainer claim ownership.
 */
export async function forceClaimSceneToken(
    tokenId: string,
    entityId: string,
    targetCampaignId: string,
    targetTrainerName?: string
): Promise<void> {
    if (!OBR.isAvailable) return;
    try {
        const myPlayerId = await OBR.player.getId().catch(() => undefined);
        const myPlayerName = (await OBR.player.getName().catch(() => undefined)) || 'GM';

        await OBR.scene.items.updateItems([tokenId], (items) => {
            for (const item of items) {
                const claimMeta = {
                    playerId: myPlayerId,
                    playerName: myPlayerName,
                    trainerName: targetTrainerName || (targetCampaignId ? 'Active Team' : undefined),
                    claimedAt: Date.now()
                };

                item.metadata['pokerole-pmd-extension/claimed-by'] = claimMeta;

                if (!item.metadata[METADATA_ID]) item.metadata[METADATA_ID] = {};
                const tokenStats = item.metadata[METADATA_ID] as Record<string, unknown>;
                tokenStats['entityId'] = entityId;
                tokenStats['campaignId'] = targetCampaignId;
                tokenStats['trainerId'] = targetTrainerName || '__none__';
                tokenStats['lastModified'] = Date.now();

                if (item.metadata['pokerole-pmd-extension/stats']) {
                    const altStats = item.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>;
                    altStats['entityId'] = entityId;
                    altStats['campaignId'] = targetCampaignId;
                    altStats['trainerId'] = targetTrainerName || '__none__';
                    altStats['lastModified'] = Date.now();
                }
            }
        });
    } catch (e) {
        console.warn('[pcClaimOverrideOps] Failed to stamp force claim onto scene item:', e);
    }
}

/**
 * Orchestrates the full GM claim override workflow:
 * 1. Strips conflicting ownership across all campaigns, rosters, and boxes.
 * 2. Overwrites canvas token claim metadata if token is present on the scene.
 * 3. Commits the Pokémon into the target party or box slot.
 * 4. Broadcasts PC state updates across the room.
 */
export async function executeGmClaimOverride(params: {
    conflict: GmClaimConflict;
    campaign: { id: string; name: string; activeTrainerId?: string };
    trainer?: { id: string; name: string };
    role?: 'PLAYER' | 'GM';
    activeBoxIndex: number;
    updatePokemonSummary: (summary: PcPokemonSummary) => void;
    setPartySlot: (trainerId: string, slotIndex: number, entityId: string | null) => void;
    setBoxSlot: (boxIndex: number, slotIndex: number, entityId: string | null) => void;
    depositPokemonToBox: (entityId: string, boxIndex?: number) => boolean;
    prepareDepositSummaryFn: (
        summary: PcPokemonSummary,
        trainer: any,
        summaries: Record<string, PcPokemonSummary>,
        storeState: any,
        campaignId?: string
    ) => Promise<PcPokemonSummary>;
    savePcStorageFn: (data: PcStorageData) => void;
    broadcastPlayerPcFn: () => void;
    broadcastGmPcFn: (payload: { campaignId?: string; trainer?: any; summaries?: PcPokemonSummary[] }) => void;
}): Promise<void> {
    const {
        conflict,
        campaign,
        trainer,
        role,
        activeBoxIndex,
        updatePokemonSummary,
        setPartySlot,
        setBoxSlot,
        depositPokemonToBox,
        prepareDepositSummaryFn,
        savePcStorageFn,
        broadcastPlayerPcFn,
        broadcastGmPcFn
    } = params;

    const { summary, targetSlotOverride: slotOverride } = conflict;
    const targetTrainerId = trainer?.id;

    // 1. Force strip conflicting ownership across campaigns, boxes, and rosters
    const { useCharacterStore } = await import('../../store/useCharacterStore');
    const currentPcData = useCharacterStore.getState().pcData;
    const updatedPcData = applyForceTransferOwnership(currentPcData, summary.entityId, campaign.id, targetTrainerId);
    useCharacterStore.setState({ pcData: updatedPcData });
    savePcStorageFn(updatedPcData);

    // 2. Overwrite ownership on live canvas token if present
    const canvasTokenId = summary.mapTokenId || summary.savedTokenItem?.id;
    if (canvasTokenId) {
        const claimTrainerName =
            trainer?.name || (campaign.activeTrainerId === '__none__' ? 'Expedition Team' : undefined);
        await forceClaimSceneToken(canvasTokenId, summary.entityId, campaign.id, claimTrainerName);
    }

    // 3. Prepare deposit summary and commit
    const finalSummary = await prepareDepositSummaryFn(
        summary,
        trainer,
        updatedPcData.pokemonSummaries,
        useCharacterStore.getState(),
        campaign.id
    );

    updatePokemonSummary(finalSummary);
    if (slotOverride?.type === 'party') {
        const trId = trainer ? trainer.id : '__none__';
        setPartySlot(trId, slotOverride.index, finalSummary.entityId);
    } else if (slotOverride?.type === 'box') {
        setBoxSlot(activeBoxIndex, slotOverride.index, finalSummary.entityId);
    } else {
        depositPokemonToBox(finalSummary.entityId, activeBoxIndex);
    }

    if (OBR.isAvailable) {
        if (role !== 'GM') {
            broadcastPlayerPcFn();
        } else {
            const latestCamp = useCharacterStore.getState().pcData.campaigns[campaign.id];
            const latestTrainer = trainer && latestCamp?.trainers ? latestCamp.trainers[trainer.id] : undefined;
            broadcastGmPcFn({
                campaignId: campaign.id,
                trainer: latestTrainer || trainer,
                summaries: [finalSummary]
            });
        }
        OBR.notification.show(`Force claimed & transferred ${finalSummary.name || finalSummary.species}!`, 'SUCCESS');
    }
}
