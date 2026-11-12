import type {
    PcStorageData,
    PcPokemonSummary,
    CampaignProfile,
    PcImportDuplicateMode
} from '../../types/pcStorageTypes';
import { sanitizePcData, createDefaultBox } from './pcStorageAdapter';
import {
    depositEntityIntoBoxes,
    depositEntityIntoTrainer,
    unclaimEntityFromOtherTrainers,
    cloneSummaryWithFreshId,
    handleSingleCharacterImport,
    unpackBackupData,
    depositUnassignedSummaries,
    depositCampaignPokemonIntoBoxes,
    isPlainRecord,
    safeNonEmptyString,
    safeTrimLower
} from './pcImportRoutingOps';

export { depositEntityIntoBoxes } from './pcImportRoutingOps';

export const MAX_PC_IMPORT_FILE_BYTES = 20 * 1024 * 1024;

export interface ImportPcJsonOptions {
    targetCampaignId?: string;
    targetTrainerId?: string;
    importMode?: 'active-trainer' | 'new-trainer' | 'merge-by-name' | 'campaign-boxes';
    duplicateMode?: PcImportDuplicateMode;
}

export interface ImportPcJsonResult {
    success: boolean;
    nextData?: PcStorageData;
    importedPokemonCount?: number;
    importedCampaignCount?: number;
    targetTrainerName?: string;
    targetTrainerId?: string;
    error?: string;
}

/**
 * Parses and merges an uploaded JSON backup file into the active PC storage data.
 * Supports targeting the active trainer, preventing unwanted trainer profile overwrites.
 */
export async function importPcBackupJson(
    file: File,
    currentData: PcStorageData,
    options?: ImportPcJsonOptions
): Promise<ImportPcJsonResult> {
    try {
        if (typeof file.size === 'number' && file.size > MAX_PC_IMPORT_FILE_BYTES) {
            return { success: false, error: 'Backup file exceeds the 20 MB size limit.' };
        }

        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;

        if (!isPlainRecord(parsed)) {
            return { success: false, error: 'Invalid JSON file: root is not an object.' };
        }

        const { rawCampaigns, rawSummaries } = unpackBackupData(parsed);

        const isSingleCharacter = Boolean(
            parsed['species'] ||
            parsed['moves-data'] ||
            parsed['hp-curr'] !== undefined ||
            isPlainRecord(parsed['identity'])
        );

        const mergedCampaigns = JSON.parse(JSON.stringify(currentData.campaigns || {})) as Record<
            string,
            CampaignProfile
        >;
        const mergedSummaries = JSON.parse(JSON.stringify(currentData.pokemonSummaries || {})) as Record<
            string,
            PcPokemonSummary
        >;

        const targetCampId = options?.targetCampaignId || currentData.activeCampaignId;
        const activeCamp = mergedCampaigns[targetCampId] || Object.values(mergedCampaigns)[0];
        const targetTrainerId = options?.targetTrainerId || activeCamp?.activeTrainerId;
        const targetTrainer = activeCamp?.trainers ? activeCamp.trainers[targetTrainerId || ''] : undefined;
        const importMode = options?.importMode || (targetTrainer ? 'active-trainer' : 'merge-by-name');
        const duplicateMode: PcImportDuplicateMode = options?.duplicateMode || 'duplicate-fresh';
        let resolvedTargetTrainerId: string | undefined = targetTrainer?.id;
        let resolvedTargetTrainerName: string | undefined = targetTrainer?.name;

        // Handle single character JSON upload
        if (isSingleCharacter) {
            return handleSingleCharacterImport(
                parsed,
                currentData,
                mergedCampaigns,
                mergedSummaries,
                duplicateMode,
                activeCamp,
                targetTrainer
            );
        }

        if (Object.keys(rawCampaigns).length === 0 && Object.keys(rawSummaries).length === 0) {
            return {
                success: false,
                error: 'The uploaded JSON file does not contain any valid campaigns or Pokémon summaries.'
            };
        }

        let importedCampaignCount = 0;
        let importedPokemonCount = 0;

        // 1. Merge baseline Pokémon summaries safely into global catalog if not cloning
        if (duplicateMode !== 'duplicate-fresh') {
            for (const [pId, summary] of Object.entries(rawSummaries)) {
                if (!summary) continue;
                if (!mergedSummaries[pId]) {
                    mergedSummaries[pId] = summary;
                    importedPokemonCount++;
                } else {
                    const existing = mergedSummaries[pId];
                    if ((summary.lastModified || 0) >= (existing.lastModified || 0)) {
                        mergedSummaries[pId] = {
                            ...summary,
                            isOnMap: existing.isOnMap || summary.isOnMap,
                            mapTokenId: existing.mapTokenId || summary.mapTokenId
                        };
                        importedPokemonCount++;
                    }
                }
            }
        }

        // Entity ID resolver according to duplicateMode
        const clonedIdMap = new Map<string, string>();
        const resolveEntityId = (oldId: string, targetTrId?: string): string => {
            if (!oldId) return oldId;

            if (duplicateMode === 'duplicate-fresh') {
                const existing = clonedIdMap.get(oldId);
                if (existing) return existing;
                const srcSum = rawSummaries[oldId] || currentData.pokemonSummaries[oldId];
                if (srcSum) {
                    const { clonedSummary, freshId } = cloneSummaryWithFreshId(srcSum, targetTrId);
                    mergedSummaries[freshId] = clonedSummary;
                    clonedIdMap.set(oldId, freshId);
                    return freshId;
                }
                return oldId;
            }

            if (duplicateMode === 'transfer-ownership') {
                if (activeCamp) {
                    unclaimEntityFromOtherTrainers(activeCamp, targetTrId, oldId);
                }
                if (mergedSummaries[oldId]) {
                    mergedSummaries[oldId].trainerId = targetTrId;
                }
                return oldId;
            }

            // 'update-existing':
            if (mergedSummaries[oldId] && rawSummaries[oldId]) {
                const incoming = rawSummaries[oldId];
                mergedSummaries[oldId] = {
                    ...incoming,
                    entityId: oldId,
                    isOnMap: mergedSummaries[oldId].isOnMap,
                    mapTokenId: mergedSummaries[oldId].mapTokenId,
                    trainerId: mergedSummaries[oldId].trainerId || targetTrId
                };
            }
            return oldId;
        };

        // 2. Route imported Pokémon based on selected Import Mode
        if (importMode === 'active-trainer' && targetTrainer) {
            targetTrainer.boxes = targetTrainer.boxes || [];
            if (targetTrainer.boxes.length === 0) {
                targetTrainer.boxes.push(createDefaultBox(0));
            }
            if (!Array.isArray(targetTrainer.party)) {
                targetTrainer.party = Array(6).fill(null);
            }

            const depositedIds = new Set<string>();

            for (const inCamp of Object.values(rawCampaigns)) {
                if (!isPlainRecord(inCamp)) continue;
                const inTrainers = isPlainRecord(inCamp.trainers) ? inCamp.trainers : {};
                // Collect from incoming trainers
                for (const inTr of Object.values(inTrainers)) {
                    if (!isPlainRecord(inTr)) continue;
                    const inTrName = safeNonEmptyString(inTr.name, 'Trainer');
                    for (const s of Array.isArray(inTr.party) ? inTr.party : []) {
                        if (typeof s === 'string' && s) {
                            const resolvedId = resolveEntityId(s, targetTrainer.id);
                            if (!depositedIds.has(resolvedId)) {
                                depositEntityIntoTrainer(targetTrainer, resolvedId, true, `${inTrName}'s Belt`);
                                depositedIds.add(resolvedId);
                            }
                        }
                    }
                    for (const b of Array.isArray(inTr.boxes) ? inTr.boxes : []) {
                        if (!isPlainRecord(b)) continue;
                        const boxName = safeNonEmptyString(b.name, 'Imported Box');
                        for (const s of Array.isArray(b.slots) ? b.slots : []) {
                            if (typeof s === 'string' && s) {
                                const resolvedId = resolveEntityId(s, targetTrainer.id);
                                if (!depositedIds.has(resolvedId)) {
                                    depositEntityIntoTrainer(targetTrainer, resolvedId, false, boxName);
                                    depositedIds.add(resolvedId);
                                }
                            }
                        }
                    }
                }

                // Collect from incoming campaign-level boxes
                for (const b of Array.isArray(inCamp.boxes) ? inCamp.boxes : []) {
                    if (!isPlainRecord(b)) continue;
                    const boxName = safeNonEmptyString(b.name, 'Imported Box');
                    for (const s of Array.isArray(b.slots) ? b.slots : []) {
                        if (typeof s === 'string' && s) {
                            const resolvedId = resolveEntityId(s, targetTrainer.id);
                            if (!depositedIds.has(resolvedId)) {
                                depositEntityIntoTrainer(targetTrainer, resolvedId, false, boxName);
                                depositedIds.add(resolvedId);
                            }
                        }
                    }
                }

                // Collect from incoming teamParty
                for (const s of Array.isArray(inCamp.teamParty) ? inCamp.teamParty : []) {
                    if (typeof s === 'string' && s) {
                        const resolvedId = resolveEntityId(s, targetTrainer.id);
                        if (!depositedIds.has(resolvedId)) {
                            depositEntityIntoTrainer(targetTrainer, resolvedId, true, 'Imported Team');
                            depositedIds.add(resolvedId);
                        }
                    }
                }
            }

            // Fallback: any raw summaries that were not in any slot
            for (const sId of Object.keys(rawSummaries)) {
                const resolvedId = resolveEntityId(sId, targetTrainer.id);
                if (!depositedIds.has(resolvedId)) {
                    depositEntityIntoTrainer(targetTrainer, resolvedId, false, 'Imported');
                    depositedIds.add(resolvedId);
                }
            }
            activeCamp.activeTrainerId = targetTrainer.id;
            resolvedTargetTrainerId = targetTrainer.id;
            resolvedTargetTrainerName = targetTrainer.name;
            importedPokemonCount = Math.max(importedPokemonCount, depositedIds.size);
        } else if (importMode === 'campaign-boxes' && activeCamp) {
            // Deposit all incoming Pokémon into shared campaign boxes
            activeCamp.boxes = activeCamp.boxes || [];
            if (activeCamp.boxes.length === 0) {
                activeCamp.boxes.push(createDefaultBox(0));
            }

            const depositedIds = new Set<string>();
            depositCampaignPokemonIntoBoxes(activeCamp.boxes, rawCampaigns, resolveEntityId, depositedIds);
            depositUnassignedSummaries(activeCamp, rawSummaries, resolveEntityId, depositedIds);
            importedPokemonCount = Math.max(importedPokemonCount, depositedIds.size);
        } else {
            // 'new-trainer' or 'merge-by-name': standard multi-campaign merge
            for (const [cId, incomingCamp] of Object.entries(rawCampaigns)) {
                if (!isPlainRecord(incomingCamp)) continue;

                const incomingCampLower = safeTrimLower(incomingCamp.name);
                const existingCamp =
                    mergedCampaigns[cId] ||
                    (incomingCampLower
                        ? Object.values(mergedCampaigns).find((c) => safeTrimLower(c.name) === incomingCampLower)
                        : undefined);

                if (!existingCamp) {
                    const campTrainers = isPlainRecord(incomingCamp.trainers) ? incomingCamp.trainers : {};
                    const hasAnyPokemon =
                        (Array.isArray(incomingCamp.teamParty) && incomingCamp.teamParty.some(Boolean)) ||
                        (Array.isArray(incomingCamp.boxes) &&
                            incomingCamp.boxes.some((b) => isPlainRecord(b) && Array.isArray(b.slots) && b.slots.some(Boolean))) ||
                        Object.values(campTrainers).some(
                            (tr) =>
                                isPlainRecord(tr) &&
                                ((Array.isArray(tr.party) && tr.party.some(Boolean)) ||
                                    (Array.isArray(tr.boxes) &&
                                        tr.boxes.some((b) => isPlainRecord(b) && Array.isArray(b.slots) && b.slots.some(Boolean))))
                        );

                    if (!hasAnyPokemon && Object.keys(mergedCampaigns).length > 0) {
                        continue;
                    }

                    mergedCampaigns[cId] = {
                        ...incomingCamp,
                        name: safeNonEmptyString(incomingCamp.name, 'Imported Campaign')
                    };
                    importedCampaignCount++;
                    continue;
                }

                // Merge trainers into existing campaign
                const currentTrainers = existingCamp.trainers || {};
                const incomingTrainers = isPlainRecord(incomingCamp.trainers) ? incomingCamp.trainers : {};

                for (const [tId, inTr] of Object.entries(incomingTrainers)) {
                    if (!isPlainRecord(inTr)) continue;

                    const inTrLower = safeTrimLower(inTr.name);
                    const isPmdPseudo =
                        tId === '__none__' || tId.startsWith('__pmd_') || inTrLower.startsWith('none (pmd');

                    if (isPmdPseudo) {
                        for (const s of Array.isArray(inTr.party) ? inTr.party : []) {
                            if (typeof s === 'string' && s)
                                depositEntityIntoBoxes(
                                    existingCamp.boxes,
                                    resolveEntityId(s, undefined),
                                    'Imported PMD'
                                );
                        }
                        for (const b of Array.isArray(inTr.boxes) ? inTr.boxes : []) {
                            if (!isPlainRecord(b)) continue;
                            const boxName = safeNonEmptyString(b.name, 'PMD Box');
                            for (const s of Array.isArray(b.slots) ? b.slots : []) {
                                if (typeof s === 'string' && s)
                                    depositEntityIntoBoxes(
                                        existingCamp.boxes,
                                        resolveEntityId(s, undefined),
                                        boxName
                                    );
                            }
                        }
                        continue;
                    }

                    const inTrSafeName = safeNonEmptyString(inTr.name, 'Trainer');
                    const inTrSafeLower = safeTrimLower(inTrSafeName);

                    if (importMode === 'new-trainer') {
                        // Always create a new trainer profile so existing trainers are untouched
                        const newId = `trainer-${crypto.randomUUID().slice(0, 8)}`;
                        const nameExists = Object.values(currentTrainers).some(
                            (tr) => safeTrimLower(tr.name) === inTrSafeLower
                        );
                        const newName = nameExists ? `${inTrSafeName} (Imported)` : inTrSafeName;

                        const nextParty = (Array.isArray(inTr.party) ? inTr.party : []).map((id) =>
                            typeof id === 'string' && id ? resolveEntityId(id, newId) : null
                        );
                        const nextBoxes = (Array.isArray(inTr.boxes) ? inTr.boxes : [])
                            .filter(isPlainRecord)
                            .map((b) => ({
                                ...b,
                                slots: (Array.isArray(b.slots) ? b.slots : []).map((id) =>
                                    typeof id === 'string' && id ? resolveEntityId(id, newId) : null
                                )
                            }));

                        currentTrainers[newId] = {
                            ...inTr,
                            id: newId,
                            name: newName,
                            party: nextParty,
                            boxes: nextBoxes
                        };
                        resolvedTargetTrainerId = newId;
                        resolvedTargetTrainerName = newName;
                        existingCamp.activeTrainerId = newId;
                        let count = nextParty.filter(Boolean).length;
                        for (const b of nextBoxes) {
                            count += (b.slots || []).filter(Boolean).length;
                        }
                        importedPokemonCount = Math.max(importedPokemonCount, count);
                        importedCampaignCount++;
                        continue;
                    }

                    // merge-by-name
                    const existingTrKey = currentTrainers[tId]
                        ? tId
                        : inTrLower
                          ? Object.keys(currentTrainers).find(
                                (k) => safeTrimLower(currentTrainers[k]?.name) === inTrLower
                            )
                          : undefined;

                    if (!existingTrKey) {
                        currentTrainers[tId] = { ...inTr, name: inTrSafeName };
                        for (const s of Array.isArray(inTr.party) ? inTr.party : []) {
                            if (typeof s === 'string' && s && mergedSummaries[s]) mergedSummaries[s].trainerId = tId;
                        }
                        for (const b of Array.isArray(inTr.boxes) ? inTr.boxes : []) {
                            if (!isPlainRecord(b)) continue;
                            for (const s of Array.isArray(b.slots) ? b.slots : []) {
                                if (typeof s === 'string' && s && mergedSummaries[s]) mergedSummaries[s].trainerId = tId;
                            }
                        }
                    } else {
                        const existingTr = currentTrainers[existingTrKey];
                        const trainerBoxes = existingTr.boxes || [];
                        existingTr.boxes = trainerBoxes;
                        if (trainerBoxes.length === 0) {
                            trainerBoxes.push(createDefaultBox(0));
                        }

                        const existingPartySet = new Set((existingTr.party || []).filter(Boolean) as string[]);

                        for (const partyEntityId of Array.isArray(inTr.party) ? inTr.party : []) {
                            if (typeof partyEntityId === 'string' && partyEntityId) {
                                const resolvedId = resolveEntityId(partyEntityId, existingTr.id);
                                if (!existingPartySet.has(resolvedId)) {
                                    depositEntityIntoTrainer(existingTr, resolvedId, true, 'Imported Party');
                                }
                            }
                        }

                        const incomingBoxes = Array.isArray(inTr.boxes) ? inTr.boxes : [];
                        for (let bIdx = 0; bIdx < incomingBoxes.length; bIdx++) {
                            const inBox = incomingBoxes[bIdx];
                            if (!isPlainRecord(inBox)) continue;
                            const boxName = safeNonEmptyString(inBox.name, `Imported Box ${bIdx + 1}`);
                            for (const sId of Array.isArray(inBox.slots) ? inBox.slots : []) {
                                if (typeof sId === 'string' && sId) {
                                    const resolvedId = resolveEntityId(sId, existingTr.id);
                                    if (!existingPartySet.has(resolvedId)) {
                                        depositEntityIntoTrainer(existingTr, resolvedId, false, boxName);
                                    }
                                }
                            }
                        }

                        if (!existingTr.avatarUrl && typeof inTr.avatarUrl === 'string') {
                            existingTr.avatarUrl = inTr.avatarUrl;
                        }
                        if (!existingTr.savedTokenItem && inTr.savedTokenItem) {
                            existingTr.savedTokenItem = inTr.savedTokenItem;
                        }
                    }
                }

                // Merge campaign boxes
                existingCamp.boxes = existingCamp.boxes || [];
                if (existingCamp.boxes.length === 0 && Array.isArray(incomingCamp.boxes) && incomingCamp.boxes.length > 0) {
                    existingCamp.boxes = incomingCamp.boxes;
                } else if (Array.isArray(incomingCamp.boxes) && incomingCamp.boxes.length > 0) {
                    for (let bIdx = 0; bIdx < incomingCamp.boxes.length; bIdx++) {
                        const inBox = incomingCamp.boxes[bIdx];
                        if (!isPlainRecord(inBox)) continue;
                        const boxName = safeNonEmptyString(inBox.name, `Imported Box ${bIdx + 1}`);
                        for (const sId of Array.isArray(inBox.slots) ? inBox.slots : []) {
                            if (typeof sId === 'string' && sId) {
                                const resolvedId = resolveEntityId(sId, undefined);
                                depositEntityIntoBoxes(existingCamp.boxes, resolvedId, boxName);
                            }
                        }
                    }
                }
            }
            if (Object.keys(rawCampaigns).length === 0) {
                importedPokemonCount = Math.max(
                    importedPokemonCount,
                    depositUnassignedSummaries(activeCamp, rawSummaries, resolveEntityId, new Set<string>())
                );
            }
        }

        const candidateData: PcStorageData = {
            version: typeof parsed.version === 'number' ? (parsed.version as number) : currentData.version || 1,
            activeCampaignId: currentData.activeCampaignId,
            campaigns: mergedCampaigns,
            pokemonSummaries: mergedSummaries
        };

        const sanitized = sanitizePcData(candidateData);

        return {
            success: true,
            nextData: sanitized,
            importedPokemonCount,
            importedCampaignCount,
            targetTrainerName: resolvedTargetTrainerName || targetTrainer?.name,
            targetTrainerId: resolvedTargetTrainerId || targetTrainer?.id
        };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : 'Failed to parse JSON backup file.'
        };
    }
}
