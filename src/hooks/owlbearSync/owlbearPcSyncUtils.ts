import OBR from '@owlbear-rodeo/sdk';
import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { hydrateActiveSheet } from '../../utils/sync/unifiedSheetHydration';

export interface PlayerPcSyncPayload {
    campaignId: string;
    campaignName?: string;
    trainer: TrainerRoster;
    summaries: PcPokemonSummary[];
    chunkIndex?: number;
    totalChunks?: number;
    senderId?: string;
    playerId?: string;
    playerName?: string;
}

export interface GmPcSyncPayload {
    campaignId: string;
    campaignName?: string;
    trainer?: TrainerRoster;
    summaries: PcPokemonSummary[];
    chunkIndex?: number;
    totalChunks?: number;
    timestamp: number;
    senderId?: string;
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
        if (s.hp !== undefined) slimMeta['hp-curr'] = s.hp;
        if (s.maxHp !== undefined) slimMeta['hp-max-display'] = s.maxHp;
        if (s.will !== undefined) slimMeta['will-curr'] = s.will;
        if (s.maxWill !== undefined) slimMeta['will-max-display'] = s.maxWill;
        if (s.name) slimMeta['nickname'] = s.name;
        if (s.species) slimMeta['species'] = s.species;
        if (s.lastModified) slimMeta['lastModified'] = s.lastModified;
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

/**
 * Ensures that no Pokémon entity ID appears more than once across a trainer's party and boxes,
 * eliminating slot duplication bugs during two-way synchronization.
 */
export function deduplicateTrainerSlots(t: TrainerRoster): TrainerRoster {
    const seen = new Set<string>();
    const cleanParty = (t.party || []).map((id) => {
        if (!id) return null;
        if (seen.has(id)) return null;
        seen.add(id);
        return id;
    });

    const cleanBoxes = (t.boxes || []).map((b) => ({
        ...b,
        slots: (b.slots || []).map((id) => {
            if (!id) return null;
            if (seen.has(id)) return null;
            seen.add(id);
            return id;
        })
    }));

    return {
        ...t,
        party: cleanParty,
        boxes: cleanBoxes
    };
}

export function sanitizeTrainerForSync(t: TrainerRoster): TrainerRoster {
    const cleanAvatar =
        t.avatarUrl && t.avatarUrl.startsWith('data:') && t.avatarUrl.length > 2048 ? undefined : t.avatarUrl;
    const deduped = deduplicateTrainerSlots(t);

    let slimMeta: Record<string, unknown> | undefined = undefined;
    if (deduped.fullMetadata && typeof deduped.fullMetadata === 'object') {
        slimMeta = {};
        for (const [k, v] of Object.entries(deduped.fullMetadata)) {
            if (typeof v === 'string' && v.startsWith('data:') && v.length > 1024) continue;
            if (k === 'savedTokenItem' || k === 'attachedItems') continue;
            slimMeta[k] = v;
        }
    }

    return {
        id: deduped.id,
        name: deduped.name,
        avatarUrl: cleanAvatar,
        party: deduped.party,
        boxes: deduped.boxes,
        isLinked: deduped.isLinked,
        mapTokenId: deduped.mapTokenId,
        playerId: deduped.playerId,
        playerName: deduped.playerName,
        fullMetadata: slimMeta
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

        // Anti-Reversion Guard: if GM already has this modification or newer, NEVER overwrite!
        if (existing && existingMod >= incomingMod) {
            continue;
        }

        // If the incoming summary explicitly sets isOnMap to false (e.g. recalled into PC storage),
        // adopt isOnMap: false and clear mapTokenId.
        if (s.isOnMap === false) {
            updatedSummaries[s.entityId] = {
                ...s,
                campaignId: targetCampId,
                isOnMap: false,
                mapTokenId: undefined,
                savedTokenItem: existing?.savedTokenItem ?? s.savedTokenItem
            };
        } else if (s.isOnMap === true) {
            updatedSummaries[s.entityId] = {
                ...s,
                campaignId: targetCampId,
                isOnMap: true,
                mapTokenId: s.mapTokenId || existing?.mapTokenId,
                savedTokenItem: existing?.savedTokenItem ?? s.savedTokenItem
            };
        } else if (existing?.isOnMap && existing.savedTokenItem && incomingMod === existingMod) {
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
                campaignId: targetCampId,
                savedTokenItem: existing?.savedTokenItem ?? s.savedTokenItem
            };
        }
        hasChanges = true;
    }

    return { updatedSummaries, hasChanges };
}

/**
 * Unified sheet rehydration for PC storage sync.
 * If the incoming summary corresponds to the active sheet open in the store,
 * it runs unified sheet hydration to synchronize store, stats, and canvas tokens.
 */
export async function rehydrateActivePcCharacter(
    summary: PcPokemonSummary,
    overrideRole: 'PLAYER' | 'GM'
): Promise<void> {
    if (!summary || !summary.fullMetadata) return;
    const store = useCharacterStore.getState();
    const currentTokenId = store.tokenId;
    const currentEntityId = store.identity.entityId;

    const isMatch =
        currentTokenId === summary.entityId ||
        currentEntityId === summary.entityId ||
        (Boolean(summary.mapTokenId) && currentTokenId === summary.mapTokenId);

    if (!isMatch) return;

    let tokenItem: import('@owlbear-rodeo/sdk').Item | undefined;
    if (summary.isOnMap && summary.mapTokenId && OBR.isAvailable) {
        try {
            const items = await OBR.scene.items.getItems([summary.mapTokenId]);
            if (items.length > 0) tokenItem = items[0];
        } catch {}
    }

    await hydrateActiveSheet({
        targetId: currentTokenId || summary.entityId,
        overrideRole,
        sourceMeta: summary.fullMetadata,
        entityId: summary.entityId,
        tokenItem,
        saveIfNewer: true,
        applyTheme: true,
        fetchSpecies: false
    });
}
