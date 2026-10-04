import type {
    PcStorageData,
    PcPokemonSummary,
    CampaignProfile,
    TrainerRoster,
    PcBox
} from '../../types/pcStorageTypes';

export interface PcJsonExportConfig {
    scope: 'all' | 'custom';
    campaignIds: string[];
    trainerIds?: string[]; // Legacy shorthand for trainer profile IDs
    trainerProfileIds?: string[]; // Trainer profiles (sheets) to include
    trainerPartyIds?: string[]; // Trainers whose belt party Pokémon should be included
    trainerBoxIds?: string[]; // Trainers whose PC storage boxes should be included
    boxIndices?: number[]; // Specific box indices (if filtering by box)
    includeCampaignBoxes?: boolean;
}

/**
 * Downloads a complete or selectively filtered JSON snapshot of the user's PC storage.
 * Supports granular separation of Trainer Profiles, Belt Parties, and PC Boxes.
 */
export function downloadPcBackupJson(pcData: PcStorageData, config?: PcJsonExportConfig): void {
    let campaignsToExport: Record<string, CampaignProfile> = {};
    const summariesToExport: Record<string, PcPokemonSummary> = {};
    let fileNameCamp = 'All_Campaigns';

    if (!config || config.scope === 'all') {
        campaignsToExport = pcData.campaigns;
        for (const [id, sum] of Object.entries(pcData.pokemonSummaries)) {
            if (sum) summariesToExport[id] = sum;
        }
    } else {
        const allowedCampIds = new Set(config.campaignIds);
        const referencedEntityIds = new Set<string>();

        const allowedProfileIds = new Set(config.trainerProfileIds ?? config.trainerIds ?? []);
        const allowedPartyIds = new Set(config.trainerPartyIds ?? config.trainerProfileIds ?? config.trainerIds ?? []);
        const allowedBoxIds = new Set(config.trainerBoxIds ?? config.trainerProfileIds ?? config.trainerIds ?? []);
        const allowedBoxIndices = config.boxIndices ? new Set(config.boxIndices) : undefined;
        const includeCampaignBoxes = config.includeCampaignBoxes !== false;

        for (const [cId, camp] of Object.entries(pcData.campaigns)) {
            if (!allowedCampIds.has(cId)) continue;

            const filteredTrainers: Record<string, TrainerRoster> = {};
            const extraBoxesFromTrainers: PcBox[] = [];

            for (const [tId, tr] of Object.entries(camp.trainers || {})) {
                if (!tr) continue;

                const includeProfile = allowedProfileIds.has(tId);
                const includeParty = allowedPartyIds.has(tId);
                const includeBoxes = allowedBoxIds.has(tId);

                // Collect party Pokemon if requested
                const partyIds: (string | null)[] = [];
                if (includeParty) {
                    for (const s of tr.party || []) {
                        if (s) {
                            referencedEntityIds.add(s);
                            partyIds.push(s);
                        } else {
                            partyIds.push(null);
                        }
                    }
                }

                // Collect box Pokemon if requested
                let filteredTrainerBoxes: PcBox[] = [];
                if (includeBoxes && Array.isArray(tr.boxes)) {
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

                if (includeProfile) {
                    // Export trainer with their requested party & boxes
                    filteredTrainers[tId] = {
                        ...tr,
                        party: includeParty ? partyIds : Array(6).fill(null),
                        boxes: includeBoxes ? filteredTrainerBoxes : []
                    };
                } else {
                    // Trainer profile is EXCLUDED, but user wants to keep their party or boxes!
                    if (includeParty && partyIds.some(Boolean)) {
                        const partyBox: PcBox = {
                            id: crypto.randomUUID(),
                            name: `${tr.name}'s Party`,
                            slots: [...partyIds, ...Array(Math.max(0, 30 - partyIds.length)).fill(null)].slice(0, 30),
                            themeColor: 'normal'
                        };
                        extraBoxesFromTrainers.push(partyBox);
                    }
                    if (includeBoxes && filteredTrainerBoxes.length > 0) {
                        for (const b of filteredTrainerBoxes) {
                            if ((b.slots || []).some(Boolean)) {
                                extraBoxesFromTrainers.push({
                                    ...b,
                                    id: crypto.randomUUID(),
                                    name: `${tr.name} - ${b.name}`
                                });
                            }
                        }
                    }
                }
            }

            // Campaign-level boxes
            const filteredBoxes: PcBox[] = [];
            if (includeCampaignBoxes && Array.isArray(camp.boxes)) {
                for (let bIdx = 0; bIdx < camp.boxes.length; bIdx++) {
                    const box = camp.boxes[bIdx];
                    if (!allowedBoxIndices || allowedBoxIndices.has(bIdx)) {
                        for (const s of box.slots || []) {
                            if (s) referencedEntityIds.add(s);
                        }
                        filteredBoxes.push(box);
                    } else {
                        filteredBoxes.push({ ...box, slots: [] });
                    }
                }
            }

            // Append extra boxes preserved from excluded trainers
            for (const eb of extraBoxesFromTrainers) {
                filteredBoxes.push(eb);
            }

            // Team Party (PMD)
            if (camp.teamParty) {
                for (const s of camp.teamParty) {
                    if (s) referencedEntityIds.add(s);
                }
            }

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
