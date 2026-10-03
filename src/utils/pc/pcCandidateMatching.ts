import type { Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, PcBox, TrainerRoster, CampaignProfile } from '../../types/pcStorageTypes';
import { METADATA_ID } from '../sync/obr';
import { storageAdapter } from '../sync/storageAdapter';
import { getAbsolutePokeballUrl } from '../generators/trainerTokenSpawner';
import { imageManager } from '../graphics/imageManager';
import { extractTokenImage } from '../combat/initiativeHelpers';

/**
 * Determines whether a token item or stored Pokémon summary is locked by the GM,
 * checking native OBR item locks, NPC sheet lock flags ('is-npc'), and generic locks.
 */
export function isEntityLockedByGm(
    itemOrSummary?: {
        locked?: boolean;
        savedTokenItem?: { locked?: boolean };
        fullMetadata?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    } | null,
    extraMetadata?: Record<string, unknown> | null
): boolean {
    if (!itemOrSummary && !extraMetadata) return false;
    if (itemOrSummary?.locked === true) return true;
    if (itemOrSummary?.savedTokenItem?.locked === true) return true;

    const rawMeta =
        extraMetadata ||
        itemOrSummary?.fullMetadata ||
        (itemOrSummary?.metadata?.[METADATA_ID] as Record<string, unknown>) ||
        itemOrSummary?.metadata;

    if (rawMeta && typeof rawMeta === 'object') {
        const meta = rawMeta as Record<string, unknown>;
        if (meta.locked === true || meta.locked === 'true') return true;
        if (meta['is-npc'] === true || meta['is-npc'] === 'true') return true;
        if (meta.isNPC === true || meta.isNPC === 'true') return true;
        if (meta['is-locked'] === true || meta['is-locked'] === 'true') return true;
    }

    return false;
}

/**
 * Resolves whether a given active character identity/metadata already corresponds
 * to an existing Pokémon in the trainer's party or stored summaries.
 */
export function resolveExistingCharacterEntityId(
    _identity: { nickname?: string; species?: string },
    activeTokenId: string | null,
    fullMetadata: Record<string, unknown>,
    existingSummaries?: Record<string, PcPokemonSummary>,
    _partySlots?: (string | null)[]
): string | null {
    if (!existingSummaries) return null;

    const summariesList = Object.values(existingSummaries);

    // 1. Match by explicit entityId in fullMetadata
    const explicitEntityId =
        (fullMetadata.entityId as string) ||
        (fullMetadata['pokerole-pmd-extension/claimed-by'] as { entityId?: string })?.entityId;
    if (explicitEntityId && existingSummaries[explicitEntityId]) {
        return explicitEntityId;
    }

    // 2. Match by activeTokenId against mapTokenId or savedTokenItem.id
    if (activeTokenId) {
        const byMap = summariesList.find(
            (s) => s.mapTokenId === activeTokenId || s.savedTokenItem?.id === activeTokenId
        );
        if (byMap) return byMap.entityId;
    }

    return null;
}

/**
 * Resolves an Owlbear Rodeo Item candidate against existing PC summaries and party slots.
 */
export function resolveSceneCandidateMatch(
    item: Item,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    partySlots: (string | null)[] = [],
    myPlayerId?: string,
    activeTrainerId?: string,
    activeTrainerName?: string,
    allTrainers?: TrainerRoster[],
    campaign?: CampaignProfile,
    allCampaigns?: Record<string, CampaignProfile>,
    myRole: 'PLAYER' | 'GM' = 'PLAYER'
): {
    matchedEntityId?: string;
    isInParty: boolean;
    isInBoxes: boolean;
    claimedBy?: string;
} {
    const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
    const claimMeta = item.metadata?.['pokerole-pmd-extension/claimed-by'] as
        | { playerId?: string; playerName?: string; trainerName?: string; entityId?: string }
        | undefined;

    // Security check: locked tokens for non-GMs
    if (myRole !== 'GM' && isEntityLockedByGm(item, meta)) {
        return {
            matchedEntityId: undefined,
            isInParty: false,
            isInBoxes: false,
            claimedBy: 'Locked by GM (Ask GM to unlock)'
        };
    }
    // Cross-client ownership check (for all roles including GM)
    if (claimMeta?.playerId && myPlayerId && claimMeta.playerId !== myPlayerId) {
        return {
            matchedEntityId: undefined,
            isInParty: false,
            isInBoxes: false,
            claimedBy: claimMeta.trainerName
                ? `${claimMeta.trainerName}${claimMeta.playerName ? ` (${claimMeta.playerName})` : ''}`
                : claimMeta.playerName || 'Another Player'
        };
    }

    const summariesList = Object.values(pokemonSummaries);
    let matchedEntityId: string | undefined = undefined;

    // 1. By mapTokenId or saved item id
    const byTokenId = summariesList.find((s) => s.mapTokenId === item.id || s.savedTokenItem?.id === item.id);
    if (byTokenId) {
        matchedEntityId = byTokenId.entityId;
    }

    // 2. By entityId in metadata or claimed-by
    if (!matchedEntityId) {
        const rawEntityId = (meta.entityId as string) || (claimMeta?.entityId as string);
        if (rawEntityId && pokemonSummaries[rawEntityId]) {
            matchedEntityId = rawEntityId;
        }
    }

    let claimedBy: string | undefined = undefined;
    let isInParty = false;
    let isInBoxes = false;
    const isNamedTrainer = Boolean(activeTrainerId && activeTrainerId !== '__none__');

    // Check ownership across all trainers in campaign
    if (allTrainers && allTrainers.length > 0) {
        for (const tr of allTrainers) {
            const isCurrentTrainer =
                isNamedTrainer &&
                ((activeTrainerId && tr.id === activeTrainerId) ||
                    (activeTrainerName && tr.name.toLowerCase() === activeTrainerName.toLowerCase()));

            const rawParty = tr.party || (tr as { partySlots?: (string | null)[] }).partySlots || [];
            const trPartyIds = new Set(rawParty.filter(Boolean) as string[]);
            const trBoxIds = new Set((tr.boxes || []).flatMap((b) => (b.slots || []).filter(Boolean) as string[]));

            const hasMatchedEntity =
                matchedEntityId && (trPartyIds.has(matchedEntityId) || trBoxIds.has(matchedEntityId));
            const hasMatchedToken =
                (tr.savedTokenItem?.id && tr.savedTokenItem.id === item.id) ||
                (tr.mapTokenId && tr.mapTokenId === item.id);
            const summaryTrainerMatch = matchedEntityId && pokemonSummaries[matchedEntityId]?.trainerId === tr.id;

            if (hasMatchedEntity || hasMatchedToken || summaryTrainerMatch) {
                if (isCurrentTrainer) {
                    if (matchedEntityId && trPartyIds.has(matchedEntityId)) {
                        isInParty = true;
                    }
                    if (matchedEntityId && trBoxIds.has(matchedEntityId)) {
                        isInBoxes = true;
                    }
                } else {
                    claimedBy = tr.name || 'Another Trainer';
                    break;
                }
            }
        }
    }

    // PMD team & box checks
    if (campaign && matchedEntityId) {
        const inPmdParty = (campaign.teamParty || []).includes(matchedEntityId);
        const inPmdBoxes = (campaign.boxes || []).some((b: PcBox) => (b.slots || []).includes(matchedEntityId));
        if (isNamedTrainer) {
            if (!claimedBy && (inPmdParty || inPmdBoxes)) {
                claimedBy = 'Expedition Team (PMD)';
            }
        } else {
            if (inPmdParty) isInParty = true;
            if (inPmdBoxes) isInBoxes = true;
        }
    }

    // Cross-campaign ownership check
    if (!claimedBy && allCampaigns && campaign && matchedEntityId) {
        for (const [cId, otherCamp] of Object.entries(allCampaigns)) {
            if (cId === campaign.id) continue;
            const inOtherTeam = (otherCamp.teamParty || []).includes(matchedEntityId);
            const inOtherBoxes = (otherCamp.boxes || []).some((b: PcBox) => (b.slots || []).includes(matchedEntityId));
            if (inOtherTeam || inOtherBoxes) {
                claimedBy = `Expedition Team (${otherCamp.name})`;
                break;
            }
            for (const tr of Object.values(otherCamp.trainers || {}) as TrainerRoster[]) {
                const trParty = tr.party || (tr as { partySlots?: (string | null)[] }).partySlots || [];
                if (
                    trParty.includes(matchedEntityId) ||
                    (tr.boxes || []).some((b: PcBox) => (b.slots || []).includes(matchedEntityId))
                ) {
                    claimedBy = `${tr.name} (${otherCamp.name})`;
                    break;
                }
            }
            if (claimedBy) break;
        }
    }

    // Fallback ownership check via partySlots param
    if (!isInParty && matchedEntityId) {
        const partyEntityIds = new Set(partySlots.filter(Boolean) as string[]);
        if (partyEntityIds.has(matchedEntityId)) {
            isInParty = true;
        }
    }

    // Fallback ownership check via claim metadata
    if (!claimedBy) {
        if (claimMeta?.playerId && myPlayerId && claimMeta.playerId !== myPlayerId) {
            claimedBy = claimMeta.trainerName
                ? `${claimMeta.trainerName}${claimMeta.playerName ? ` (${claimMeta.playerName})` : ''}`
                : claimMeta.playerName || 'Another Player';
        } else if (
            claimMeta?.trainerName &&
            activeTrainerName &&
            claimMeta.trainerName.trim().toLowerCase() !== activeTrainerName.trim().toLowerCase()
        ) {
            claimedBy = claimMeta.trainerName;
        }
    }

    return {
        matchedEntityId,
        isInParty,
        isInBoxes,
        claimedBy
    };
}

/**
 * Scans local characters from standalone localStorage and converts them to candidate items.
 */
export async function scanStandaloneCandidates(
    pokemonSummaries: Record<string, PcPokemonSummary>,
    partySlots: (string | null)[]
): Promise<
    Array<{
        id: string;
        name: string;
        species: string;
        imageUrl: string;
        hp: number;
        maxHp: number;
        will: number;
        maxWill: number;
        type1: string;
        type2?: string;
        rank: string;
        item: Item;
        metadata: Record<string, unknown>;
        isInParty?: boolean;
        matchedEntityId?: string;
    }>
> {
    try {
        const localChars = await storageAdapter.getLocalCharacters();
        const partyEntityIds = new Set(partySlots.filter(Boolean) as string[]);
        const found = [];

        for (const char of localChars) {
            const meta = (char.metadata || {}) as Record<string, unknown>;
            const mode = (meta.mode as string) || '';
            if (mode === 'Trainer' || mode === 'Trainer (Special)') continue;

            const species =
                (meta.species as string) ||
                (meta.name as string) ||
                (meta.nickname as string) ||
                char.name ||
                'Pokémon';
            const rawImage = extractTokenImage(meta);
            let imgUrl = rawImage || getAbsolutePokeballUrl();
            if (rawImage && rawImage.startsWith('local-img:')) {
                try {
                    const resolved = await imageManager.getImageUrl(rawImage);
                    if (resolved) imgUrl = resolved;
                } catch (e) {
                    console.warn('[pcCandidateMatching] Failed to resolve local image:', e);
                }
            }
            const hpCurr = Number(meta['hp-curr']) || (typeof meta.hp === 'number' ? meta.hp : 10);
            const hpMax = Number(meta['hp-max-display']) || (typeof meta.hpMax === 'number' ? meta.hpMax : 10);
            const willCurr = Number(meta['will-curr']) || (typeof meta.will === 'number' ? meta.will : 5);
            const willMax = Number(meta['will-max-display']) || (typeof meta.willMax === 'number' ? meta.willMax : 5);

            let matchedEntityId: string | undefined;
            for (const [eId, sum] of Object.entries(pokemonSummaries)) {
                if (eId === char.id || sum.entityId === char.id || (sum.name && sum.name === char.name)) {
                    matchedEntityId = eId;
                    break;
                }
            }

            const isInParty = Boolean(
                partyEntityIds.has(char.id) || (matchedEntityId && partyEntityIds.has(matchedEntityId))
            );

            found.push({
                id: char.id,
                name: (meta.nickname as string) || (meta.name as string) || char.name || species,
                species,
                imageUrl: imgUrl,
                hp: hpCurr,
                maxHp: hpMax,
                will: willCurr,
                maxWill: willMax,
                type1: (meta.type1 as string) || 'Normal',
                type2: meta.type2 as string | undefined,
                rank: (meta.rank as string) || 'Starter',
                item: { id: char.id, name: char.name, layer: 'CHARACTER', metadata: meta } as unknown as Item,
                metadata: {
                    ...meta,
                    'token-image-url': rawImage || imgUrl,
                    tokenImageUrl: rawImage || imgUrl
                },
                isInParty,
                matchedEntityId
            });
        }
        return found;
    } catch (e) {
        console.error('[pcCandidateMatching] Failed to scan standalone candidates:', e);
        return [];
    }
}

/**
 * Refreshes pokemon summaries from local storage on Standalone so changes to typing,
 * nicknames, HP, or artwork made in the main sheet viewer immediately reflect in PC boxes.
 */
export function refreshSummariesFromLocalStorage(summaries: Record<string, PcPokemonSummary>): {
    updated: Record<string, PcPokemonSummary>;
    hasChanges: boolean;
} {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { updated: summaries, hasChanges: false };
    }

    let hasChanges = false;
    const nextSummaries: Record<string, PcPokemonSummary> = { ...summaries };

    for (const [id, summary] of Object.entries(summaries)) {
        try {
            const raw = localStorage.getItem(`pkr_char_${id}`);
            if (!raw) continue;
            const meta = JSON.parse(raw);
            if (!meta || typeof meta !== 'object') continue;

            const newType1 = (meta.type1 as string) ?? summary.type1;
            const newType2 = (meta.type2 as string) ?? summary.type2;
            const newName = (meta.nickname as string) || (meta.species as string) || summary.name;
            const newSpecies = (meta.species as string) || summary.species;
            const newRank = (meta.rank as string) || summary.rank;
            const newHp = typeof meta['hp-curr'] === 'number' ? (meta['hp-curr'] as number) : summary.hp;
            const newMaxHp =
                typeof meta['hp-max-display'] === 'number' ? (meta['hp-max-display'] as number) : summary.maxHp;
            const newWill = typeof meta['will-curr'] === 'number' ? (meta['will-curr'] as number) : summary.will;
            const newMaxWill =
                typeof meta['will-max-display'] === 'number' ? (meta['will-max-display'] as number) : summary.maxWill;
            const newAvatar = (meta['token-image-url'] as string) || summary.tokenImageUrl;

            if (
                newType1 !== summary.type1 ||
                newType2 !== summary.type2 ||
                newName !== summary.name ||
                newSpecies !== summary.species ||
                newRank !== summary.rank ||
                newHp !== summary.hp ||
                newMaxHp !== summary.maxHp ||
                newWill !== summary.will ||
                newMaxWill !== summary.maxWill ||
                newAvatar !== summary.tokenImageUrl
            ) {
                nextSummaries[id] = {
                    ...summary,
                    type1: newType1,
                    type2: newType2,
                    name: newName,
                    species: newSpecies,
                    rank: newRank,
                    hp: newHp,
                    maxHp: newMaxHp,
                    will: newWill,
                    maxWill: newMaxWill,
                    tokenImageUrl: newAvatar,
                    fullMetadata: { ...(summary.fullMetadata || {}), ...meta }
                };
                hasChanges = true;
            }
        } catch {
            // Ignore parse errors on corrupted keys
        }
    }

    return { updated: nextSummaries, hasChanges };
}

/**
 * Builds the list of candidate Pokémon/Trainer summaries viewable in the PC sheet modal.
 */
export function buildSheetAvailableSummaries(
    trainer: TrainerRoster | undefined,
    trainerSummary: PcPokemonSummary | null,
    pokemonSummaries: Record<string, PcPokemonSummary>,
    partySlots: (string | null)[],
    trainerBoxes: PcBox[],
    role: string = 'PLAYER'
): PcPokemonSummary[] {
    const list: PcPokemonSummary[] = [];
    if (trainer && trainerSummary) list.push(trainerSummary);
    for (const pId of partySlots) {
        const sum = pId ? pokemonSummaries[pId] : null;
        if (sum && !list.some((s) => s.entityId === pId) && (role === 'GM' || !isEntityLockedByGm(sum))) {
            list.push(sum);
        }
    }
    for (const b of trainerBoxes) {
        for (const sId of b.slots || []) {
            const sum = sId ? pokemonSummaries[sId] : null;
            if (sum && !list.some((s) => s.entityId === sId) && (role === 'GM' || !isEntityLockedByGm(sum))) {
                list.push(sum);
            }
        }
    }
    return list;
}
