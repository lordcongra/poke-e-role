import type {
    PcBox,
    TrainerRoster,
    CampaignProfile,
    PcPokemonSummary,
    PcStorageData,
    PcImportDuplicateMode
} from '../../types/pcStorageTypes';
import { createDefaultBox, sanitizePcData } from './pcStorageAdapter';

/**
 * Deposits an entity into the first available box slot, creating a new box if all are full.
 */
export function depositEntityIntoBoxes(boxes: PcBox[], entityId: string, preferredBoxName?: string): void {
    // Prevent duplicate entries across boxes
    for (const b of boxes) {
        if (b.slots.includes(entityId)) return;
    }

    // Try to find preferred box first
    if (preferredBoxName) {
        const pref = boxes.find((b) => b.name.trim().toLowerCase() === preferredBoxName.trim().toLowerCase());
        if (pref) {
            const emptyIdx = pref.slots.findIndex((s: string | null) => s === null);
            if (emptyIdx !== -1) {
                pref.slots[emptyIdx] = entityId;
                return;
            }
        }
    }

    // Try any box with an empty slot
    for (const box of boxes) {
        const emptyIdx = box.slots.findIndex((s: string | null) => s === null);
        if (emptyIdx !== -1) {
            box.slots[emptyIdx] = entityId;
            return;
        }
    }

    // All existing boxes full: create a new box
    const newBoxNumber = boxes.length + 1;
    const newBox: PcBox = {
        id: crypto.randomUUID(),
        name: preferredBoxName || `Box ${newBoxNumber}`,
        slots: Array(30).fill(null),
        themeColor: 'normal'
    };
    newBox.slots[0] = entityId;
    boxes.push(newBox);
}

/**
 * Deposits an entity into the trainer's belt party if preferred and empty slots exist,
 * otherwise deposits into their PC storage boxes.
 */
export function depositEntityIntoTrainer(
    trainer: TrainerRoster,
    entityId: string,
    isPartyPreferred: boolean,
    preferredBoxName?: string
): void {
    if (isPartyPreferred && Array.isArray(trainer.party)) {
        if (trainer.party.includes(entityId)) return;
        for (const b of trainer.boxes || []) {
            if (b.slots.includes(entityId)) return;
        }
        const emptyPartyIdx = trainer.party.findIndex((s: string | null) => s === null);
        if (emptyPartyIdx !== -1) {
            trainer.party[emptyPartyIdx] = entityId;
            return;
        }
    }
    const targetBoxes = trainer.boxes || [];
    depositEntityIntoBoxes(targetBoxes, entityId, preferredBoxName);
}

/**
 * Unclaims an entity ID from any other trainer in the campaign so it isn't double-claimed
 * or wiped by sanitizePcData when assigned to a specific target trainer.
 */
export function unclaimEntityFromOtherTrainers(
    camp: CampaignProfile,
    targetTrainerId: string | undefined,
    entityId: string
): void {
    for (const [trId, otherTr] of Object.entries(camp.trainers || {})) {
        if (trId !== targetTrainerId && otherTr) {
            if (Array.isArray(otherTr.party)) {
                otherTr.party = otherTr.party.map((id) => (id === entityId ? null : id));
            }
            if (Array.isArray(otherTr.boxes)) {
                for (const b of otherTr.boxes) {
                    if (Array.isArray(b.slots)) {
                        b.slots = b.slots.map((id) => (id === entityId ? null : id));
                    }
                }
            }
        }
    }
}

/**
 * Converts a raw single-character metadata export into a valid PcPokemonSummary.
 */
export function buildSingleCharacterSummary(rawMeta: Record<string, unknown>): PcPokemonSummary {
    const entityId = (rawMeta.entityId as string) || (rawMeta['entityId'] as string) || crypto.randomUUID();
    const rawSpecies = (rawMeta.species as string) || (rawMeta['species'] as string) || 'Pokémon';
    const rawName =
        (rawMeta.nickname as string) || (rawMeta['nickname'] as string) || (rawMeta.name as string) || rawSpecies;
    const rawHp = Number(rawMeta['hp-curr'] ?? rawMeta['hp'] ?? 4);
    const rawMaxHp = Number(rawMeta['hp-max-display'] ?? rawMeta['hp-base'] ?? 4);
    const rawWill = Number(rawMeta['will-curr'] ?? rawMeta['will'] ?? 2);
    const rawMaxWill = Number(rawMeta['will-max-display'] ?? rawMeta['will-base'] ?? 2);
    const rawType1 = (rawMeta.type1 as string) || (rawMeta['type1'] as string) || 'Normal';
    const rawType2 = (rawMeta.type2 as string) || (rawMeta['type2'] as string) || undefined;
    const rawRank = (rawMeta.rank as string) || (rawMeta['identity-rank'] as string) || 'Starter';
    const rawImg = (rawMeta['token-image-url'] as string) || (rawMeta['tokenImageUrl'] as string) || undefined;

    return {
        entityId,
        name: rawName,
        species: rawSpecies,
        rank: rawRank,
        type1: rawType1,
        type2: rawType2 && rawType2.toLowerCase() !== 'none' ? rawType2 : undefined,
        hp: rawHp,
        maxHp: rawMaxHp,
        will: rawWill,
        maxWill: rawMaxWill,
        tokenImageUrl: rawImg,
        fullMetadata: rawMeta,
        lastModified: Date.now()
    };
}

/**
 * Unpacks campaigns and Pokémon summaries from an uploaded JSON object,
 * extracting pcData if present (such as from a master backup) and converting legacy
 * parsed.characters arrays into valid PcPokemonSummary objects.
 */
export function unpackBackupData(parsed: Record<string, unknown>): {
    rawCampaigns: Record<string, CampaignProfile>;
    rawSummaries: Record<string, PcPokemonSummary>;
} {
    const pcSource =
        parsed.pcData && typeof parsed.pcData === 'object' ? (parsed.pcData as Record<string, unknown>) : parsed;

    const rawCampaigns: Record<string, CampaignProfile> = {
        ...((parsed.campaigns as Record<string, CampaignProfile>) || {}),
        ...((pcSource.campaigns as Record<string, CampaignProfile>) || {})
    };

    const rawSummaries: Record<string, PcPokemonSummary> = {
        ...((parsed.pokemonSummaries as Record<string, PcPokemonSummary>) || {}),
        ...((pcSource.pokemonSummaries as Record<string, PcPokemonSummary>) || {})
    };

    if (Array.isArray(parsed.characters)) {
        for (const charItem of parsed.characters) {
            if (!charItem || typeof charItem !== 'object') continue;
            const charObj = charItem as Record<string, unknown>;
            const meta = (
                charObj.metadata && typeof charObj.metadata === 'object' ? charObj.metadata : charObj
            ) as Record<string, unknown>;
            const effectiveMeta = { ...meta };
            if (!effectiveMeta.entityId && charObj.id) {
                effectiveMeta.entityId = String(charObj.id);
            }
            const summary = buildSingleCharacterSummary(effectiveMeta);
            if (charObj.name && !summary.name) {
                summary.name = String(charObj.name);
            }
            if (!rawSummaries[summary.entityId]) {
                rawSummaries[summary.entityId] = summary;
            }
        }
    }

    return { rawCampaigns, rawSummaries };
}

/**
 * Deposits any summaries not already placed in a trainer or box slot into the campaign boxes.
 */
export function depositUnassignedSummaries(
    camp: CampaignProfile | undefined,
    rawSummaries: Record<string, PcPokemonSummary>,
    resolveEntityId: (id: string, trId?: string) => string,
    existingDepositedIds: Set<string>
): number {
    if (!camp) return existingDepositedIds.size;
    camp.boxes = camp.boxes || [];
    if (camp.boxes.length === 0) {
        camp.boxes.push(createDefaultBox(0));
    }
    for (const sId of Object.keys(rawSummaries)) {
        const resolvedId = resolveEntityId(sId, undefined);
        if (!existingDepositedIds.has(resolvedId)) {
            depositEntityIntoBoxes(camp.boxes, resolvedId, 'Imported');
            existingDepositedIds.add(resolvedId);
        }
    }
    return existingDepositedIds.size;
}

/**
 * Deposits all Pokémon from incoming campaigns into campaign boxes.
 */
export function depositCampaignPokemonIntoBoxes(
    boxes: PcBox[],
    rawCampaigns: Record<string, CampaignProfile>,
    resolveEntityId: (id: string, trId?: string) => string,
    depositedIds: Set<string>
): void {
    for (const inCamp of Object.values(rawCampaigns)) {
        for (const inTr of Object.values(inCamp.trainers || {})) {
            if (!inTr) continue;
            for (const s of inTr.party || []) {
                if (s) {
                    const resolvedId = resolveEntityId(s, undefined);
                    if (!depositedIds.has(resolvedId)) {
                        depositEntityIntoBoxes(boxes, resolvedId, `${inTr.name}'s Belt`);
                        depositedIds.add(resolvedId);
                    }
                }
            }
            for (const b of inTr.boxes || []) {
                for (const s of b.slots || []) {
                    if (s) {
                        const resolvedId = resolveEntityId(s, undefined);
                        if (!depositedIds.has(resolvedId)) {
                            depositEntityIntoBoxes(boxes, resolvedId, b.name || 'Imported');
                            depositedIds.add(resolvedId);
                        }
                    }
                }
            }
        }
        for (const b of inCamp.boxes || []) {
            for (const s of b.slots || []) {
                if (s) {
                    const resolvedId = resolveEntityId(s, undefined);
                    if (!depositedIds.has(resolvedId)) {
                        depositEntityIntoBoxes(boxes, resolvedId, b.name || 'Imported');
                        depositedIds.add(resolvedId);
                    }
                }
            }
        }
    }
}

/**
 * Creates a clean duplicate of an existing summary with a brand-new entity ID and strips previous
 * trainer and map token claims so it acts as an independent entity.
 */
export function cloneSummaryWithFreshId(
    summary: PcPokemonSummary,
    targetTrainerId?: string
): { clonedSummary: PcPokemonSummary; freshId: string } {
    const freshId = crypto.randomUUID();
    const rawMeta = summary.fullMetadata ? { ...summary.fullMetadata } : {};
    rawMeta.entityId = freshId;
    if (targetTrainerId) {
        rawMeta.trainerId = targetTrainerId;
    } else {
        delete rawMeta.trainerId;
    }
    delete rawMeta['parent-id'];
    delete rawMeta.parentId;

    const clonedSummary: PcPokemonSummary = {
        ...summary,
        entityId: freshId,
        trainerId: targetTrainerId,
        isOnMap: false,
        mapTokenId: undefined,
        savedTokenItem: undefined,
        fullMetadata: Object.keys(rawMeta).length > 0 ? rawMeta : undefined,
        lastModified: Date.now()
    };

    return { clonedSummary, freshId };
}

/**
 * Handles single character JSON restore with support for fresh duplicates and target trainer assignment.
 */
export function handleSingleCharacterImport(
    parsed: Record<string, unknown>,
    currentData: PcStorageData,
    mergedCampaigns: Record<string, CampaignProfile>,
    mergedSummaries: Record<string, PcPokemonSummary>,
    duplicateMode: PcImportDuplicateMode,
    activeCamp?: CampaignProfile,
    targetTrainer?: TrainerRoster
): {
    success: boolean;
    nextData: PcStorageData;
    importedPokemonCount: number;
    importedCampaignCount: number;
    targetTrainerName?: string;
} {
    const rawSummary = buildSingleCharacterSummary(parsed);
    let finalSummary = rawSummary;
    let entityId = rawSummary.entityId;

    if (duplicateMode === 'duplicate-fresh' && (currentData.pokemonSummaries[entityId] || targetTrainer)) {
        const cloned = cloneSummaryWithFreshId(rawSummary, targetTrainer?.id);
        finalSummary = cloned.clonedSummary;
        entityId = cloned.freshId;
    } else if (targetTrainer) {
        finalSummary.trainerId = targetTrainer.id;
    }

    mergedSummaries[entityId] = finalSummary;

    if (targetTrainer && Array.isArray(targetTrainer.boxes)) {
        if (targetTrainer.boxes.length === 0) {
            targetTrainer.boxes.push(createDefaultBox(0));
        }
        if (duplicateMode === 'transfer-ownership' && activeCamp) {
            unclaimEntityFromOtherTrainers(activeCamp, targetTrainer.id, entityId);
        }
        depositEntityIntoTrainer(targetTrainer, entityId, true, 'Imported');
    } else if (activeCamp) {
        activeCamp.boxes = activeCamp.boxes || [];
        if (activeCamp.boxes.length === 0) {
            activeCamp.boxes.push(createDefaultBox(0));
        }
        depositEntityIntoBoxes(activeCamp.boxes, entityId, 'Imported');
    }

    const candidateData: PcStorageData = {
        ...currentData,
        campaigns: mergedCampaigns,
        pokemonSummaries: mergedSummaries
    };

    return {
        success: true,
        nextData: sanitizePcData(candidateData),
        importedPokemonCount: 1,
        importedCampaignCount: 0,
        targetTrainerName: targetTrainer?.name
    };
}
