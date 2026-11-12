import type {
    PcBox,
    TrainerRoster,
    CampaignProfile,
    PcPokemonSummary,
    PcStorageData,
    PcImportDuplicateMode
} from '../../types/pcStorageTypes';
import { createDefaultBox, sanitizePcData } from './pcStorageAdapter';

export function isPlainRecord(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
}

export function safeNonEmptyString(val: unknown, fallback: string): string {
    return typeof val === 'string' && val.trim().length > 0 ? val : fallback;
}

export function safeTrimLower(val: unknown): string {
    return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

function toFiniteNumber(val: unknown, fallback: number): number {
    if (typeof val === 'number') {
        return Number.isFinite(val) ? val : fallback;
    }
    if (typeof val === 'string' && val.trim().length > 0) {
        const parsed = Number(val);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

/**
 * Deposits an entity into the first available box slot, creating a new box if all are full.
 */
export function depositEntityIntoBoxes(boxes: PcBox[], entityId: string, preferredBoxName?: string): void {
    // Prevent duplicate entries across boxes
    for (const b of boxes) {
        if (b && Array.isArray(b.slots) && b.slots.includes(entityId)) return;
    }

    // Try to find preferred box first
    if (preferredBoxName) {
        const prefLower = preferredBoxName.trim().toLowerCase();
        const pref = boxes.find((b) => b && safeTrimLower(b.name) === prefLower);
        if (pref && Array.isArray(pref.slots)) {
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
    const entityId = safeNonEmptyString(rawMeta.entityId ?? rawMeta['entityId'], crypto.randomUUID());
    const rawSpecies = safeNonEmptyString(rawMeta.species ?? rawMeta['species'], 'Pokémon');
    const rawName = safeNonEmptyString(rawMeta.nickname ?? rawMeta['nickname'] ?? rawMeta.name, rawSpecies);
    const rawHp = toFiniteNumber(rawMeta['hp-curr'] ?? rawMeta['hp'], 4);
    const rawMaxHp = toFiniteNumber(rawMeta['hp-max-display'] ?? rawMeta['hp-base'], 4);
    const rawWill = toFiniteNumber(rawMeta['will-curr'] ?? rawMeta['will'], 2);
    const rawMaxWill = toFiniteNumber(rawMeta['will-max-display'] ?? rawMeta['will-base'], 2);
    const rawType1 = safeNonEmptyString(rawMeta.type1 ?? rawMeta['type1'], 'Normal');
    const rawType2Val = rawMeta.type2 ?? rawMeta['type2'];
    const rawType2 = typeof rawType2Val === 'string' && rawType2Val.trim().length > 0 ? rawType2Val : undefined;
    const rawRank = safeNonEmptyString(rawMeta.rank ?? rawMeta['identity-rank'], 'Starter');
    const rawImgVal = rawMeta['token-image-url'] ?? rawMeta['tokenImageUrl'];
    const rawImg = typeof rawImgVal === 'string' && rawImgVal.trim().length > 0 ? rawImgVal : undefined;

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

function pickRecordEntries<T>(source: unknown): Record<string, T> {
    if (!isPlainRecord(source)) return {};
    const out: Record<string, T> = {};
    for (const [k, v] of Object.entries(source)) {
        if (isPlainRecord(v)) {
            out[k] = v as unknown as T;
        }
    }
    return out;
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
    const pcSource = isPlainRecord(parsed.pcData) ? parsed.pcData : parsed;

    const rawCampaigns: Record<string, CampaignProfile> = {
        ...pickRecordEntries<CampaignProfile>(parsed.campaigns),
        ...pickRecordEntries<CampaignProfile>(pcSource.campaigns)
    };

    const rawSummaries: Record<string, PcPokemonSummary> = {
        ...pickRecordEntries<PcPokemonSummary>(parsed.pokemonSummaries),
        ...pickRecordEntries<PcPokemonSummary>(pcSource.pokemonSummaries)
    };

    if (Array.isArray(parsed.characters)) {
        for (const charItem of parsed.characters) {
            if (!isPlainRecord(charItem)) continue;
            const meta = isPlainRecord(charItem.metadata) ? charItem.metadata : charItem;
            const effectiveMeta = { ...meta };
            if (!effectiveMeta.entityId && charItem.id !== undefined && charItem.id !== null) {
                effectiveMeta.entityId = String(charItem.id);
            }
            const summary = buildSingleCharacterSummary(effectiveMeta);
            if (typeof charItem.name === 'string' && charItem.name.trim() && !summary.name) {
                summary.name = charItem.name;
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
        if (!isPlainRecord(inCamp)) continue;
        const trainersObj = isPlainRecord(inCamp.trainers) ? inCamp.trainers : {};
        for (const inTr of Object.values(trainersObj)) {
            if (!isPlainRecord(inTr)) continue;
            const trainerName = safeNonEmptyString(inTr.name, 'Trainer');
            for (const s of Array.isArray(inTr.party) ? inTr.party : []) {
                if (typeof s === 'string' && s) {
                    const resolvedId = resolveEntityId(s, undefined);
                    if (!depositedIds.has(resolvedId)) {
                        depositEntityIntoBoxes(boxes, resolvedId, `${trainerName}'s Belt`);
                        depositedIds.add(resolvedId);
                    }
                }
            }
            for (const b of Array.isArray(inTr.boxes) ? inTr.boxes : []) {
                if (!isPlainRecord(b)) continue;
                const boxName = safeNonEmptyString(b.name, 'Imported');
                for (const s of Array.isArray(b.slots) ? b.slots : []) {
                    if (typeof s === 'string' && s) {
                        const resolvedId = resolveEntityId(s, undefined);
                        if (!depositedIds.has(resolvedId)) {
                            depositEntityIntoBoxes(boxes, resolvedId, boxName);
                            depositedIds.add(resolvedId);
                        }
                    }
                }
            }
        }
        for (const b of Array.isArray(inCamp.boxes) ? inCamp.boxes : []) {
            if (!isPlainRecord(b)) continue;
            const boxName = safeNonEmptyString(b.name, 'Imported');
            for (const s of Array.isArray(b.slots) ? b.slots : []) {
                if (typeof s === 'string' && s) {
                    const resolvedId = resolveEntityId(s, undefined);
                    if (!depositedIds.has(resolvedId)) {
                        depositEntityIntoBoxes(boxes, resolvedId, boxName);
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
