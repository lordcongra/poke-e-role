import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';

export interface PlayerPcSyncPayload {
    campaignId: string;
    campaignName?: string;
    trainer: TrainerRoster;
    summaries: PcPokemonSummary[];
    chunkIndex?: number;
    totalChunks?: number;
}

export interface GmPcSyncPayload {
    campaignId: string;
    trainer?: TrainerRoster;
    summaries: PcPokemonSummary[];
    chunkIndex?: number;
    totalChunks?: number;
    timestamp: number;
}

/**
 * Strips bulky canvas attachments, raw scene items, and massive base64 URIs
 * before transmitting summaries over the Owlbear broadcast channel.
 */
export function sanitizeSummaryForSync(s: PcPokemonSummary): PcPokemonSummary {
    const cleanImageUrl =
        s.tokenImageUrl && s.tokenImageUrl.startsWith('data:') && s.tokenImageUrl.length > 2048
            ? undefined
            : s.tokenImageUrl;

    let slimMeta: Record<string, unknown> | undefined = undefined;
    if (s.fullMetadata && typeof s.fullMetadata === 'object') {
        slimMeta = {};
        for (const [k, v] of Object.entries(s.fullMetadata)) {
            if (typeof v === 'string' && v.startsWith('data:') && v.length > 1024) continue;
            if (k === 'savedTokenItem' || k === 'attachedItems') continue;
            slimMeta[k] = v;
        }
    }

    return {
        entityId: s.entityId,
        name: s.name,
        species: s.species,
        rank: s.rank,
        type1: s.type1,
        type2: s.type2,
        hp: s.hp,
        maxHp: s.maxHp,
        will: s.will,
        maxWill: s.maxWill,
        tokenImageUrl: cleanImageUrl,
        shiny: s.shiny,
        heldItem: s.heldItem,
        isOnMap: s.isOnMap,
        mapTokenId: s.mapTokenId,
        trainerId: s.trainerId,
        campaignId: s.campaignId,
        lastModified: s.lastModified,
        fullMetadata: slimMeta
    };
}

export function sanitizeTrainerForSync(t: TrainerRoster): TrainerRoster {
    const cleanAvatar =
        t.avatarUrl && t.avatarUrl.startsWith('data:') && t.avatarUrl.length > 2048 ? undefined : t.avatarUrl;
    return {
        id: t.id,
        name: t.name,
        avatarUrl: cleanAvatar,
        party: t.party || [],
        boxes: t.boxes || [],
        isLinked: t.isLinked,
        mapTokenId: t.mapTokenId
    };
}

/**
 * Merges incoming player summaries into GM PC summaries, respecting timestamps,
 * live map token authority, and the Anti-Reversion Guard.
 */
export function mergeIncomingPlayerSummaries(
    currentSummaries: Record<string, PcPokemonSummary>,
    incomingSummaries: PcPokemonSummary[],
    targetCampId: string
): { updatedSummaries: Record<string, PcPokemonSummary>; hasChanges: boolean } {
    const updatedSummaries = { ...currentSummaries };
    let hasChanges = false;

    for (const s of incomingSummaries || []) {
        if (!s || !s.entityId) continue;

        const existing = updatedSummaries[s.entityId];
        const existingMod = Number(existing?.lastModified) || 0;
        const incomingMod = Number(s.lastModified) || 0;

        // Anti-Reversion Guard: if GM already has a strictly newer modification, NEVER overwrite!
        if (existing && existingMod > incomingMod) {
            continue;
        }

        // If the incoming summary is genuinely NEWER than the existing token snapshot, adopt incoming stats.
        // If equal and live on canvas, preserve the canvas token's live combat stats.
        if (existing?.isOnMap && existing.savedTokenItem && incomingMod === existingMod) {
            updatedSummaries[s.entityId] = {
                ...s,
                campaignId: targetCampId,
                hp: existing.hp,
                maxHp: existing.maxHp,
                will: existing.will,
                maxWill: existing.maxWill,
                isOnMap: true,
                mapTokenId: existing.mapTokenId,
                savedTokenItem: existing.savedTokenItem,
                lastModified: Math.max(existingMod, incomingMod)
            };
        } else if (existing?.isOnMap) {
            updatedSummaries[s.entityId] = {
                ...s,
                campaignId: targetCampId,
                isOnMap: true,
                mapTokenId: existing.mapTokenId,
                savedTokenItem: existing.savedTokenItem
            };
        } else {
            updatedSummaries[s.entityId] = {
                ...s,
                campaignId: targetCampId
            };
        }
        hasChanges = true;
    }

    return { updatedSummaries, hasChanges };
}
