import type {
    PcStorageData,
    PcPokemonSummary,
    CampaignProfile,
    TrainerRoster,
    PcBox
} from '../../types/pcStorageTypes';
import { sanitizePcData } from './pcStorageAdapter';

export interface PcJsonExportConfig {
    scope: 'all' | 'custom';
    campaignIds: string[];
    trainerIds?: string[];
    boxIndices?: number[];
}

/**
 * Downloads a complete or selectively filtered JSON snapshot of the user's PC storage.
 * Suitable for file-based backups, cross-PC migration, and version control.
 */
export function downloadPcBackupJson(pcData: PcStorageData, config?: PcJsonExportConfig): void {
    let campaignsToExport: Record<string, CampaignProfile> = {};
    let summariesToExport: Record<string, PcPokemonSummary> = {};
    let fileNameCamp = 'All_Campaigns';

    if (!config || config.scope === 'all') {
        campaignsToExport = pcData.campaigns;
        summariesToExport = pcData.pokemonSummaries;
    } else {
        const allowedCampIds = new Set(config.campaignIds);
        const referencedEntityIds = new Set<string>();

        for (const [cId, camp] of Object.entries(pcData.campaigns)) {
            if (!allowedCampIds.has(cId)) continue;

            const allowedTrainerIds = config.trainerIds ? new Set(config.trainerIds) : undefined;
            const allowedBoxIndices = config.boxIndices ? new Set(config.boxIndices) : undefined;
            const filteredTrainers: Record<string, TrainerRoster> = {};
            for (const [tId, tr] of Object.entries(camp.trainers)) {
                if (!allowedTrainerIds || allowedTrainerIds.has(tId)) {
                    let filteredTrainerBoxes = tr.boxes;
                    if (Array.isArray(tr.boxes) && tr.boxes.length > 0) {
                        filteredTrainerBoxes = tr.boxes.map((box, bIdx) => {
                            if (!allowedBoxIndices || allowedBoxIndices.has(bIdx)) {
                                for (const s of box.slots || []) {
                                    if (s) referencedEntityIds.add(s);
                                }
                                return box;
                            }
                            return { ...box, slots: [] };
                        });
                    }

                    filteredTrainers[tId] = {
                        ...tr,
                        boxes: filteredTrainerBoxes
                    };
                    for (const s of tr.party || []) {
                        if (s) referencedEntityIds.add(s);
                    }
                }
            }

            const filteredBoxes = camp.boxes.map((box, bIdx) => {
                if (!allowedBoxIndices || allowedBoxIndices.has(bIdx)) {
                    for (const s of box.slots || []) {
                        if (s) referencedEntityIds.add(s);
                    }
                    return box;
                }
                return { ...box, slots: [] };
            });

            campaignsToExport[cId] = {
                ...camp,
                trainers: filteredTrainers,
                boxes: filteredBoxes
            };
        }

        for (const id of referencedEntityIds) {
            if (pcData.pokemonSummaries[id]) {
                summariesToExport[id] = pcData.pokemonSummaries[id];
            }
        }

        if (config.campaignIds.length === 1) {
            const singleCamp = pcData.campaigns[config.campaignIds[0]];
            if (singleCamp) {
                fileNameCamp = singleCamp.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            }
        } else {
            fileNameCamp = `${config.campaignIds.length}_Campaigns`;
        }
    }

    const payload = {
        app: 'poke-e-role',
        format: 'pc-storage-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        activeCampaignId: pcData.activeCampaignId,
        campaigns: campaignsToExport,
        pokemonSummaries: summariesToExport
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pkr_pc_backup_${fileNameCamp}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export interface ImportPcJsonResult {
    success: boolean;
    nextData?: PcStorageData;
    importedPokemonCount?: number;
    importedCampaignCount?: number;
    error?: string;
}

function depositEntityIntoBoxes(boxes: PcBox[], entityId: string, preferredBoxName?: string): void {
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
 * Parses and merges an uploaded JSON backup file into the active PC storage data non-destructively.
 * Protects active trainer belt parties and existing campaign boxes from being overwritten.
 */
export async function importPcBackupJson(file: File, currentData: PcStorageData): Promise<ImportPcJsonResult> {
    try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Record<string, unknown>;

        if (!parsed || typeof parsed !== 'object') {
            return { success: false, error: 'Invalid JSON file: root is not an object.' };
        }

        const rawCampaigns = (parsed.campaigns as Record<string, CampaignProfile>) || {};
        const rawSummaries = (parsed.pokemonSummaries as Record<string, PcPokemonSummary>) || {};

        if (Object.keys(rawCampaigns).length === 0 && Object.keys(rawSummaries).length === 0) {
            return {
                success: false,
                error: 'The uploaded JSON file does not contain any valid campaigns or Pokémon summaries.'
            };
        }

        // Deep clone to avoid mutating active state
        const mergedCampaigns = JSON.parse(JSON.stringify(currentData.campaigns || {})) as Record<
            string,
            CampaignProfile
        >;
        const mergedSummaries = JSON.parse(JSON.stringify(currentData.pokemonSummaries || {})) as Record<
            string,
            PcPokemonSummary
        >;

        let importedCampaignCount = 0;
        let importedPokemonCount = 0;

        // 1. Merge Pokémon summaries safely
        for (const [pId, summary] of Object.entries(rawSummaries)) {
            if (!summary) continue;
            if (!mergedSummaries[pId]) {
                mergedSummaries[pId] = summary;
                importedPokemonCount++;
            } else {
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

        // 2. Merge campaigns non-destructively
        for (const [cId, incomingCamp] of Object.entries(rawCampaigns)) {
            if (!incomingCamp) continue;

            const existingCamp =
                mergedCampaigns[cId] ||
                Object.values(mergedCampaigns).find(
                    (c) => c.name.trim().toLowerCase() === incomingCamp.name.trim().toLowerCase()
                );

            if (!existingCamp) {
                // Check if incomingCamp is an empty stub without any Pokemon or active trainers
                const hasAnyPokemon =
                    (incomingCamp.teamParty || []).some(Boolean) ||
                    (incomingCamp.boxes || []).some((b) => (b.slots || []).some(Boolean)) ||
                    Object.values(incomingCamp.trainers || {}).some(
                        (tr) =>
                            (tr.party || []).some(Boolean) ||
                            (tr.boxes || []).some((b) => (b.slots || []).some(Boolean))
                    );

                // If completely empty and we already have existing campaigns, skip creating useless empty campaign
                if (!hasAnyPokemon && Object.keys(mergedCampaigns).length > 0) {
                    continue;
                }

                // Brand new campaign: safe to add directly
                mergedCampaigns[cId] = incomingCamp;
                importedCampaignCount++;
                continue;
            }

            // Existing campaign: safe non-destructive merge
            const currentTrainers = existingCamp.trainers || {};
            const incomingTrainers = incomingCamp.trainers || {};

            for (const [tId, inTr] of Object.entries(incomingTrainers)) {
                if (!inTr) continue;

                // Protect against pseudo "None / PMD" trainer profiles
                const isPmdPseudo =
                    tId === '__none__' ||
                    tId.startsWith('__pmd_') ||
                    (inTr.name && inTr.name.trim().toLowerCase().startsWith('none (pmd'));

                if (isPmdPseudo) {
                    for (const s of inTr.party || []) {
                        if (s) depositEntityIntoBoxes(existingCamp.boxes, s, 'Imported PMD');
                    }
                    for (const b of inTr.boxes || []) {
                        for (const s of b.slots || []) {
                            if (s) depositEntityIntoBoxes(existingCamp.boxes, s, b.name || 'PMD Box');
                        }
                    }
                    continue;
                }

                const existingTrKey = currentTrainers[tId]
                    ? tId
                    : Object.keys(currentTrainers).find(
                          (k) => currentTrainers[k].name.trim().toLowerCase() === inTr.name.trim().toLowerCase()
                      );

                if (!existingTrKey) {
                    // New trainer in this campaign: add directly
                    currentTrainers[tId] = inTr;
                } else {
                    const existingTr = currentTrainers[existingTrKey];
                    const trainerBoxes = existingTr.boxes || [];
                    existingTr.boxes = trainerBoxes;
                    if (trainerBoxes.length === 0) {
                        trainerBoxes.push({
                            id: crypto.randomUUID(),
                            name: 'Box 1',
                            slots: Array(30).fill(null),
                            themeColor: 'normal'
                        });
                    }

                    const existingPartySet = new Set((existingTr.party || []).filter(Boolean) as string[]);

                    // Any Pokémon in incoming party: deposit into boxes without wiping existing belt!
                    for (const partyEntityId of inTr.party || []) {
                        if (partyEntityId && !existingPartySet.has(partyEntityId)) {
                            depositEntityIntoBoxes(trainerBoxes, partyEntityId, 'Imported Party');
                        }
                    }

                    // Any Pokémon in incoming boxes: deposit safely into existing boxes
                    const incomingBoxes = inTr.boxes || [];
                    for (let bIdx = 0; bIdx < incomingBoxes.length; bIdx++) {
                        const inBox = incomingBoxes[bIdx];
                        for (const sId of inBox.slots || []) {
                            if (sId && !existingPartySet.has(sId)) {
                                depositEntityIntoBoxes(trainerBoxes, sId, inBox.name || `Imported Box ${bIdx + 1}`);
                            }
                        }
                    }

                    // Preserve existing avatar / tokens if present
                    if (!existingTr.avatarUrl && inTr.avatarUrl) {
                        existingTr.avatarUrl = inTr.avatarUrl;
                    }
                    if (!existingTr.savedTokenItem && inTr.savedTokenItem) {
                        existingTr.savedTokenItem = inTr.savedTokenItem;
                    }
                }
            }

            // Merge campaign-level boxes (shared / PMD)
            existingCamp.boxes = existingCamp.boxes || [];
            if (existingCamp.boxes.length === 0 && incomingCamp.boxes && incomingCamp.boxes.length > 0) {
                existingCamp.boxes = incomingCamp.boxes;
            } else if (incomingCamp.boxes && incomingCamp.boxes.length > 0) {
                for (let bIdx = 0; bIdx < incomingCamp.boxes.length; bIdx++) {
                    const inBox = incomingCamp.boxes[bIdx];
                    for (const sId of inBox.slots || []) {
                        if (sId) {
                            depositEntityIntoBoxes(existingCamp.boxes, sId, inBox.name || `Imported Box ${bIdx + 1}`);
                        }
                    }
                }
            }

            // PMD teamParty merge
            if (!existingCamp.teamParty || existingCamp.teamParty.filter(Boolean).length === 0) {
                if (incomingCamp.teamParty && incomingCamp.teamParty.length > 0) {
                    existingCamp.teamParty = incomingCamp.teamParty;
                }
            } else if (incomingCamp.teamParty) {
                const teamSet = new Set(existingCamp.teamParty.filter(Boolean) as string[]);
                for (const tMemberId of incomingCamp.teamParty) {
                    if (tMemberId && !teamSet.has(tMemberId)) {
                        depositEntityIntoBoxes(existingCamp.boxes, tMemberId, 'Imported Team');
                    }
                }
            }
        }

        const nextActiveCampaignId =
            (parsed.activeCampaignId as string) && mergedCampaigns[parsed.activeCampaignId as string]
                ? (parsed.activeCampaignId as string)
                : currentData.activeCampaignId;

        const candidateData: PcStorageData = {
            version: typeof parsed.version === 'number' ? (parsed.version as number) : currentData.version || 1,
            activeCampaignId: nextActiveCampaignId,
            campaigns: mergedCampaigns,
            pokemonSummaries: mergedSummaries
        };

        const sanitized = sanitizePcData(candidateData);

        return {
            success: true,
            nextData: sanitized,
            importedPokemonCount,
            importedCampaignCount
        };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : 'Failed to parse JSON backup file.'
        };
    }
}
