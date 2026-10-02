import { type Item } from '@owlbear-rodeo/sdk';
import { METADATA_ID } from '../sync/obr';
import type { PcBox, CampaignProfile, PcPokemonSummary, PcStorageData } from '../../types/pcStorageTypes';
import { sanitizeImageUrl } from '../generators/trainerTokenSpawner';
import { downloadBoxFromObrCloud } from './pcStorageAdapter';
import { getTrainerBoxes } from './pcStateMutations';

export interface RestoreTokensResult {
    success: boolean;
    nextData: PcStorageData;
    totalImported: number;
    partyCount: number;
    boxCount: number;
    trainerRestored: boolean;
    error?: string;
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

/**
 * Robustly restores tokens (from either an imported Cloud Scene Asset or an active open backup scene)
 * into PC Storage data. Accurately distinguishes Belt party members, individual Box placements,
 * and Trainer profiles without depositing Trainer tokens into boxes or clobbering existing slots.
 */
export function restoreTokensIntoPcStorage(
    items: Item[],
    currentPcData: PcStorageData,
    activeBoxIndex: number = 0
): RestoreTokensResult {
    if (!currentPcData?.campaigns) {
        return {
            success: false,
            nextData: currentPcData,
            totalImported: 0,
            partyCount: 0,
            boxCount: 0,
            trainerRestored: false,
            error: 'No valid campaign structure found.'
        };
    }

    const nextData: PcStorageData = JSON.parse(JSON.stringify(currentPcData));
    const camp = nextData.campaigns[nextData.activeCampaignId];
    if (!camp) {
        return {
            success: false,
            nextData: currentPcData,
            totalImported: 0,
            partyCount: 0,
            boxCount: 0,
            trainerRestored: false,
            error: 'Active campaign not found.'
        };
    }

    const trainer = camp.trainers ? camp.trainers[camp.activeTrainerId] : undefined;
    const isTrainerMode = Boolean(trainer);

    let nextParty: (string | null)[] = isTrainerMode
        ? [...(trainer?.party || Array(6).fill(null))]
        : [...(camp.teamParty || Array(6).fill(null))];

    while (nextParty.length < 6) nextParty.push(null);
    if (nextParty.length > 6) nextParty = nextParty.slice(0, 6);

    const boxes = getTrainerBoxes(trainer, camp);
    const nextBoxes = boxes.map((b) => ({
        ...b,
        slots: [...b.slots]
    }));

    const nextSummaries = { ...(nextData.pokemonSummaries || {}) };

    let totalImported = 0;
    let partyCount = 0;
    let boxCount = 0;
    let trainerRestored = false;

    for (const item of items) {
        const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};

        // 1. Trainer Token Detection - NEVER deposit into a Pokémon Box!
        const isTrainer =
            meta.mode === 'Trainer' ||
            meta['is-trainer'] === true ||
            (typeof meta.rank === 'string' && meta.rank.startsWith('Trainer')) ||
            (trainer && item.name === trainer.name);

        if (isTrainer) {
            if (trainer) {
                const imgUrl = (meta['token-image-url'] as string) || (item as { image?: { url?: string } }).image?.url;
                if (imgUrl) trainer.avatarUrl = sanitizeImageUrl(imgUrl);
                trainer.savedTokenItem = item;
                trainerRestored = true;
            }
            continue;
        }

        // 2. Parse Pokémon Summary
        const entityId = (meta.entityId as string) || crypto.randomUUID();
        const hpCurr = Number(meta['hp-curr']) || (typeof meta.hp === 'number' ? meta.hp : 10);
        const hpMax = Number(meta['hp-max-display']) || (typeof meta.hpMax === 'number' ? meta.hpMax : 10);
        const willCurr = Number(meta['will-curr']) || (typeof meta.will === 'number' ? meta.will : 5);
        const willMax = Number(meta['will-max-display']) || (typeof meta.willMax === 'number' ? meta.willMax : 5);
        const tokenImg = (meta['token-image-url'] as string) || (item as { image?: { url?: string } }).image?.url;

        const summary: PcPokemonSummary = {
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
            tokenImageUrl: tokenImg ? sanitizeImageUrl(tokenImg) : undefined,
            isOnMap: false,
            savedTokenItem: item,
            fullMetadata: meta,
            lastModified: (meta.lastModified as number) || Date.now()
        };

        nextSummaries[entityId] = summary;

        // 3. Determine Belt Party vs Box Placement
        const isParty =
            meta['is-party'] === true ||
            meta['belt-slot'] !== undefined ||
            (typeof item.position?.y === 'number' && item.position.y <= 150);

        if (isParty) {
            // Remove entityId from party and boxes to avoid duplicates
            nextParty = nextParty.map((s) => (s === entityId ? null : s));
            nextBoxes.forEach((b) => {
                b.slots = b.slots.map((s) => (s === entityId ? null : s));
            });

            let targetSlot = -1;
            if (typeof meta['belt-slot'] === 'number' && meta['belt-slot'] >= 0 && meta['belt-slot'] < 6) {
                targetSlot = meta['belt-slot'];
            } else if (typeof item.position?.x === 'number') {
                const derivedSlot = Math.round(item.position.x / 300) - 1;
                if (derivedSlot >= 0 && derivedSlot < 6 && nextParty[derivedSlot] === null) {
                    targetSlot = derivedSlot;
                }
            }

            if (targetSlot === -1 || nextParty[targetSlot] !== null) {
                targetSlot = nextParty.findIndex((s) => s === null);
            }

            if (targetSlot !== -1 && targetSlot < 6) {
                nextParty[targetSlot] = entityId;
                partyCount++;
                totalImported++;
            } else {
                depositToBoxSlots(nextBoxes, activeBoxIndex, entityId);
                boxCount++;
                totalImported++;
            }
        } else {
            // Box Pokémon
            nextParty = nextParty.map((s) => (s === entityId ? null : s));

            let targetBoxIdx = activeBoxIndex;
            if (
                typeof meta['box-index'] === 'number' &&
                meta['box-index'] >= 0 &&
                meta['box-index'] < nextBoxes.length
            ) {
                targetBoxIdx = meta['box-index'];
            } else if (meta['box-name'] && typeof meta['box-name'] === 'string') {
                const foundIdx = nextBoxes.findIndex(
                    (b) => b.name.trim().toLowerCase() === String(meta['box-name']).trim().toLowerCase()
                );
                if (foundIdx !== -1) targetBoxIdx = foundIdx;
            }

            if (targetBoxIdx < 0 || targetBoxIdx >= nextBoxes.length) {
                targetBoxIdx = 0;
            }

            depositToBoxSlots(nextBoxes, targetBoxIdx, entityId);
            boxCount++;
            totalImported++;
        }
    }

    if (trainer && camp.trainers) {
        camp.trainers[camp.activeTrainerId] = {
            ...trainer,
            party: nextParty,
            boxes: nextBoxes
        };
    } else {
        camp.teamParty = nextParty;
        camp.boxes = nextBoxes;
    }

    nextData.pokemonSummaries = nextSummaries;

    return {
        success: true,
        nextData,
        totalImported,
        partyCount,
        boxCount,
        trainerRestored
    };
}

function depositToBoxSlots(boxes: PcBox[], preferredBoxIndex: number, entityId: string): void {
    for (const b of boxes) {
        b.slots = b.slots.map((s) => (s === entityId ? null : s));
    }

    const box = boxes[preferredBoxIndex] || boxes[0];
    if (!box) return;

    const emptyIdx = box.slots.findIndex((s) => s === null);
    if (emptyIdx !== -1) {
        box.slots[emptyIdx] = entityId;
    } else {
        for (const otherBox of boxes) {
            const idx = otherBox.slots.findIndex((s) => s === null);
            if (idx !== -1) {
                otherBox.slots[idx] = entityId;
                return;
            }
        }
        if (box.slots.length < 30) {
            box.slots.push(entityId);
        }
    }
}

/**
 * Opens the cloud scene picker, downloads the selected scene items, and restores them cleanly
 * into the given PC storage dataset.
 */
export async function downloadAndRestoreCloudScene(
    campaignName: string,
    currentPcData: PcStorageData,
    activeBoxIndex: number
): Promise<RestoreTokensResult> {
    const downloadedScenes = await downloadBoxFromObrCloud(campaignName);
    if (!downloadedScenes || downloadedScenes.length === 0) {
        return {
            success: false,
            nextData: currentPcData,
            totalImported: 0,
            partyCount: 0,
            boxCount: 0,
            trainerRestored: false
        };
    }

    const allItems: Item[] = [];
    for (const sc of downloadedScenes) {
        if (sc.items) allItems.push(...sc.items);
    }

    if (allItems.length === 0) {
        return {
            success: false,
            nextData: currentPcData,
            totalImported: 0,
            partyCount: 0,
            boxCount: 0,
            trainerRestored: false,
            error: 'No items found in selected Cloud Scene Asset.'
        };
    }

    return restoreTokensIntoPcStorage(allItems, currentPcData, activeBoxIndex);
}
