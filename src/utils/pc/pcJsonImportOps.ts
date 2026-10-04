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
    handleSingleCharacterImport
} from './pcImportRoutingOps';

export { depositEntityIntoBoxes } from './pcImportRoutingOps';

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
        const text = await file.text();
        const parsed = JSON.parse(text) as Record<string, unknown>;

        if (!parsed || typeof parsed !== 'object') {
            return { success: false, error: 'Invalid JSON file: root is not an object.' };
        }

        const rawCampaigns = (parsed.campaigns as Record<string, CampaignProfile>) || {};
        const rawSummaries = (parsed.pokemonSummaries as Record<string, PcPokemonSummary>) || {};

        const isSingleCharacter = Boolean(
            parsed['species'] ||
            parsed['moves-data'] ||
            parsed['hp-curr'] ||
            (parsed['identity'] && typeof parsed['identity'] === 'object')
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
        for (const [pId, summary] of Object.entries(rawSummaries)) {
            if (!summary) continue;
            if (!mergedSummaries[pId]) {
                mergedSummaries[pId] = summary;
                importedPokemonCount++;
            } else if (duplicateMode !== 'duplicate-fresh') {
                const existing = mergedSummaries[pId];
                const existingTime = existing.lastModified || 0;
                const incomingTime = summary.lastModified || 0;
                if (incomingTime >= existingTime) {
                    mergedSummaries[pId] = {
                        ...summary,
                        isOnMap: existing.isOnMap || summary.isOnMap,
                        mapTokenId: existing.mapTokenId || summary.mapTokenId
                    };
                    importedPokemonCount++;
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
                // Collect from incoming trainers
                for (const inTr of Object.values(inCamp.trainers || {})) {
                    if (!inTr) continue;
                    for (const s of inTr.party || []) {
                        if (s) {
                            const resolvedId = resolveEntityId(s, targetTrainer.id);
                            if (!depositedIds.has(resolvedId)) {
                                depositEntityIntoTrainer(targetTrainer, resolvedId, true, `${inTr.name}'s Belt`);
                                depositedIds.add(resolvedId);
                            }
                        }
                    }
                    for (const b of inTr.boxes || []) {
                        for (const s of b.slots || []) {
                            if (s) {
                                const resolvedId = resolveEntityId(s, targetTrainer.id);
                                if (!depositedIds.has(resolvedId)) {
                                    depositEntityIntoTrainer(
                                        targetTrainer,
                                        resolvedId,
                                        false,
                                        b.name || 'Imported Box'
                                    );
                                    depositedIds.add(resolvedId);
                                }
                            }
                        }
                    }
                }

                // Collect from incoming campaign-level boxes
                for (const b of inCamp.boxes || []) {
                    for (const s of b.slots || []) {
                        if (s) {
                            const resolvedId = resolveEntityId(s, targetTrainer.id);
                            if (!depositedIds.has(resolvedId)) {
                                depositEntityIntoTrainer(targetTrainer, resolvedId, false, b.name || 'Imported Box');
                                depositedIds.add(resolvedId);
                            }
                        }
                    }
                }

                // Collect from incoming teamParty
                for (const s of inCamp.teamParty || []) {
                    if (s) {
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
            for (const inCamp of Object.values(rawCampaigns)) {
                for (const inTr of Object.values(inCamp.trainers || {})) {
                    if (!inTr) continue;
                    for (const s of inTr.party || []) {
                        if (s) {
                            const resolvedId = resolveEntityId(s, undefined);
                            if (!depositedIds.has(resolvedId)) {
                                depositEntityIntoBoxes(activeCamp.boxes, resolvedId, `${inTr.name}'s Belt`);
                                depositedIds.add(resolvedId);
                            }
                        }
                    }
                    for (const b of inTr.boxes || []) {
                        for (const s of b.slots || []) {
                            if (s) {
                                const resolvedId = resolveEntityId(s, undefined);
                                if (!depositedIds.has(resolvedId)) {
                                    depositEntityIntoBoxes(activeCamp.boxes, resolvedId, b.name || 'Imported');
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
                                depositEntityIntoBoxes(activeCamp.boxes, resolvedId, b.name || 'Imported');
                                depositedIds.add(resolvedId);
                            }
                        }
                    }
                }
            }
            importedPokemonCount = Math.max(importedPokemonCount, depositedIds.size);
        } else {
            // 'new-trainer' or 'merge-by-name': standard multi-campaign merge
            for (const [cId, incomingCamp] of Object.entries(rawCampaigns)) {
                if (!incomingCamp) continue;

                const existingCamp =
                    mergedCampaigns[cId] ||
                    Object.values(mergedCampaigns).find(
                        (c) => c.name.trim().toLowerCase() === incomingCamp.name.trim().toLowerCase()
                    );

                if (!existingCamp) {
                    const hasAnyPokemon =
                        (incomingCamp.teamParty || []).some(Boolean) ||
                        (incomingCamp.boxes || []).some((b) => (b.slots || []).some(Boolean)) ||
                        Object.values(incomingCamp.trainers || {}).some(
                            (tr) =>
                                (tr.party || []).some(Boolean) ||
                                (tr.boxes || []).some((b) => (b.slots || []).some(Boolean))
                        );

                    if (!hasAnyPokemon && Object.keys(mergedCampaigns).length > 0) {
                        continue;
                    }

                    mergedCampaigns[cId] = incomingCamp;
                    importedCampaignCount++;
                    continue;
                }

                // Merge trainers into existing campaign
                const currentTrainers = existingCamp.trainers || {};
                const incomingTrainers = incomingCamp.trainers || {};

                for (const [tId, inTr] of Object.entries(incomingTrainers)) {
                    if (!inTr) continue;

                    const isPmdPseudo =
                        tId === '__none__' ||
                        tId.startsWith('__pmd_') ||
                        (inTr.name && inTr.name.trim().toLowerCase().startsWith('none (pmd'));

                    if (isPmdPseudo) {
                        for (const s of inTr.party || []) {
                            if (s)
                                depositEntityIntoBoxes(
                                    existingCamp.boxes,
                                    resolveEntityId(s, undefined),
                                    'Imported PMD'
                                );
                        }
                        for (const b of inTr.boxes || []) {
                            for (const s of b.slots || []) {
                                if (s)
                                    depositEntityIntoBoxes(
                                        existingCamp.boxes,
                                        resolveEntityId(s, undefined),
                                        b.name || 'PMD Box'
                                    );
                            }
                        }
                        continue;
                    }

                    if (importMode === 'new-trainer') {
                        // Always create a new trainer profile so existing trainers are untouched
                        const newId = `trainer-${crypto.randomUUID().slice(0, 8)}`;
                        const nameExists = Object.values(currentTrainers).some(
                            (tr) => tr.name.trim().toLowerCase() === inTr.name.trim().toLowerCase()
                        );
                        const newName = nameExists ? `${inTr.name} (Imported)` : inTr.name;

                        const nextParty = (inTr.party || []).map((id) => (id ? resolveEntityId(id, newId) : null));
                        const nextBoxes = (inTr.boxes || []).map((b) => ({
                            ...b,
                            slots: (b.slots || []).map((id) => (id ? resolveEntityId(id, newId) : null))
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
                        : Object.keys(currentTrainers).find(
                              (k) => currentTrainers[k].name.trim().toLowerCase() === inTr.name.trim().toLowerCase()
                          );

                    if (!existingTrKey) {
                        currentTrainers[tId] = inTr;
                        for (const s of inTr.party || []) {
                            if (s && mergedSummaries[s]) mergedSummaries[s].trainerId = tId;
                        }
                        for (const b of inTr.boxes || []) {
                            for (const s of b.slots || []) {
                                if (s && mergedSummaries[s]) mergedSummaries[s].trainerId = tId;
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

                        for (const partyEntityId of inTr.party || []) {
                            if (partyEntityId) {
                                const resolvedId = resolveEntityId(partyEntityId, existingTr.id);
                                if (!existingPartySet.has(resolvedId)) {
                                    depositEntityIntoTrainer(existingTr, resolvedId, true, 'Imported Party');
                                }
                            }
                        }

                        const incomingBoxes = inTr.boxes || [];
                        for (let bIdx = 0; bIdx < incomingBoxes.length; bIdx++) {
                            const inBox = incomingBoxes[bIdx];
                            for (const sId of inBox.slots || []) {
                                if (sId) {
                                    const resolvedId = resolveEntityId(sId, existingTr.id);
                                    if (!existingPartySet.has(resolvedId)) {
                                        depositEntityIntoTrainer(
                                            existingTr,
                                            resolvedId,
                                            false,
                                            inBox.name || `Imported Box ${bIdx + 1}`
                                        );
                                    }
                                }
                            }
                        }

                        if (!existingTr.avatarUrl && inTr.avatarUrl) {
                            existingTr.avatarUrl = inTr.avatarUrl;
                        }
                        if (!existingTr.savedTokenItem && inTr.savedTokenItem) {
                            existingTr.savedTokenItem = inTr.savedTokenItem;
                        }
                    }
                }

                // Merge campaign boxes
                existingCamp.boxes = existingCamp.boxes || [];
                if (existingCamp.boxes.length === 0 && incomingCamp.boxes && incomingCamp.boxes.length > 0) {
                    existingCamp.boxes = incomingCamp.boxes;
                } else if (incomingCamp.boxes && incomingCamp.boxes.length > 0) {
                    for (let bIdx = 0; bIdx < incomingCamp.boxes.length; bIdx++) {
                        const inBox = incomingCamp.boxes[bIdx];
                        for (const sId of inBox.slots || []) {
                            if (sId) {
                                const resolvedId = resolveEntityId(sId, undefined);
                                depositEntityIntoBoxes(
                                    existingCamp.boxes,
                                    resolvedId,
                                    inBox.name || `Imported Box ${bIdx + 1}`
                                );
                            }
                        }
                    }
                }
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
