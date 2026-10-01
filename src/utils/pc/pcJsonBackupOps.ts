import type { PcStorageData, PcPokemonSummary, CampaignProfile, TrainerRoster } from '../../types/pcStorageTypes';
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

/**
 * Parses and merges an uploaded JSON backup file into the active PC storage data.
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

        // Merge campaigns
        const mergedCampaigns = { ...currentData.campaigns };
        let importedCampaignCount = 0;
        for (const [cId, camp] of Object.entries(rawCampaigns)) {
            if (!mergedCampaigns[cId]) {
                mergedCampaigns[cId] = camp;
                importedCampaignCount++;
            } else {
                // Merge trainers within existing campaign
                const currentTrainers = mergedCampaigns[cId].trainers || {};
                const incomingTrainers = camp.trainers || {};
                mergedCampaigns[cId] = {
                    ...mergedCampaigns[cId],
                    ...camp,
                    trainers: { ...currentTrainers, ...incomingTrainers },
                    boxes: camp.boxes && camp.boxes.length > 0 ? camp.boxes : mergedCampaigns[cId].boxes
                };
            }
        }

        // Merge Pokémon summaries (prefer incoming or newer lastModified)
        const mergedSummaries = { ...currentData.pokemonSummaries };
        let importedPokemonCount = 0;
        for (const [pId, summary] of Object.entries(rawSummaries)) {
            if (!mergedSummaries[pId]) {
                mergedSummaries[pId] = summary;
                importedPokemonCount++;
            } else {
                const existingTime = mergedSummaries[pId].lastModified || 0;
                const incomingTime = summary.lastModified || 0;
                if (incomingTime >= existingTime) {
                    mergedSummaries[pId] = summary;
                    importedPokemonCount++;
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
