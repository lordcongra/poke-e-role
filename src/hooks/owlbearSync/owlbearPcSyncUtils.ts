import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';

export interface PlayerPcSyncPayload {
    campaignId: string;
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
