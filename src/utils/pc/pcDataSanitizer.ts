import type {
    PcStorageData,
    PcBox,
    CampaignProfile,
    PcPokemonSummary,
    TrainerRoster
} from '@/types/pcStorageTypes';

export function createDefaultBox(index: number): PcBox {
    return {
        id: `box-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
        name: `Box ${index + 1}`,
        themeColor: '#3b82f6',
        wallpaper: 'default',
        slots: Array(30).fill(null)
    };
}

export function createDefaultCampaign(id = 'default', name = 'Main Adventure'): CampaignProfile {
    const trainerId = `trainer-${crypto.randomUUID().slice(0, 8)}`;
    const boxes = Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
    return {
        id,
        name,
        activeTrainerId: trainerId,
        trainers: {
            [trainerId]: {
                id: trainerId,
                name: 'Trainer',
                party: Array(6).fill(null),
                boxes: Array.from({ length: 8 }, (_, i) => createDefaultBox(i))
            }
        },
        boxes,
        teamParty: Array(6).fill(null),
        lastSynced: Date.now()
    };
}

export function sanitizePcData(data: PcStorageData): PcStorageData {
    if (!data.pokemonSummaries || typeof data.pokemonSummaries !== 'object') {
        data.pokemonSummaries = {};
    }
    if (!data.campaigns || typeof data.campaigns !== 'object') {
        data.campaigns = {};
    }

    if (Object.keys(data.campaigns).length === 0) {
        const defaultCamp = createDefaultCampaign();
        data.campaigns[defaultCamp.id] = defaultCamp;
        data.activeCampaignId = defaultCamp.id;
    } else if (!data.activeCampaignId || !data.campaigns[data.activeCampaignId]) {
        data.activeCampaignId = Object.keys(data.campaigns)[0];
    }

    const referencedIds = new Set<string>();

    for (const camp of Object.values(data.campaigns)) {
        if (!camp.trainers || typeof camp.trainers !== 'object') {
            camp.trainers = {};
        }
        if (!Array.isArray(camp.teamParty)) {
            camp.teamParty = Array(6).fill(null);
        }
        if (!Array.isArray(camp.boxes)) {
            camp.boxes = Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
        }

        const claimedByTrainer = new Map<string, string>();

        const resolveValidPokemonId = (pid: string | null, targetTrainerId?: string): string | null => {
            if (!pid) return null;
            const existingTrainer = claimedByTrainer.get(pid);
            if (existingTrainer && targetTrainerId && existingTrainer !== targetTrainerId) return null;

            const sum = data.pokemonSummaries[pid];
            if (!sum) {
                // Keep valid entity ID strings in slots so offline/partial hydration never wipes references
                if (typeof pid === 'string' && pid.trim().length > 0) {
                    if (targetTrainerId) {
                        claimedByTrainer.set(pid, targetTrainerId);
                    }
                    return pid;
                }
                return null;
            }
            if (targetTrainerId) {
                sum.trainerId = targetTrainerId;
                claimedByTrainer.set(pid, targetTrainerId);
            }
            return pid;
        };

        for (const [tid, t] of Object.entries(camp.trainers)) {
            if (!t || typeof t !== 'object' || !t.id) {
                delete camp.trainers[tid];
                continue;
            }

            // Convert player PMD profiles and storage rosters into valid storage profiles without pruning
            if (tid.startsWith('__pmd_') || t.profileType === 'storage') {
                t.profileType = 'storage';
                if (!t.name || !t.name.trim() || t.name === 'Trainer') {
                    t.name = t.playerName ? `${t.playerName}'s Storage` : 'PMD Storage';
                }
            }

            // Prune pseudo "None / PMD" placeholder if it slipped into camp.trainers
            const isPmdPseudo =
                tid === '__none__' ||
                (t.profileType !== 'storage' &&
                    !tid.startsWith('__pmd_') &&
                    t.name &&
                    t.name.trim().toLowerCase().startsWith('none (pmd'));

            if (isPmdPseudo) {
                if (Array.isArray(t.party)) {
                    for (const pid of t.party) {
                        if (pid && !camp.teamParty.includes(pid)) {
                            const emptyIdx = camp.teamParty.findIndex((s) => s === null);
                            if (emptyIdx !== -1) camp.teamParty[emptyIdx] = pid;
                            else if (camp.boxes[0]) camp.boxes[0].slots.push(pid);
                        }
                    }
                }
                if (Array.isArray(t.boxes)) {
                    for (const b of t.boxes) {
                        for (const pid of b.slots || []) {
                            if (pid && camp.boxes[0]) camp.boxes[0].slots.push(pid);
                        }
                    }
                }
                delete camp.trainers[tid];
                continue;
            }

            if (!t.name || !t.name.trim()) t.name = 'Trainer';

            if (t.avatarUrl && (t.avatarUrl.startsWith('file:') || t.avatarUrl.startsWith('file:///'))) {
                t.avatarUrl = undefined;
            }
            if (!Array.isArray(t.party)) {
                t.party = Array(6).fill(null);
            }
            if (!Array.isArray(t.boxes) || t.boxes.length === 0) {
                const isSingleLegacyTrainer =
                    Object.keys(camp.trainers).length === 1 &&
                    Array.isArray(camp.boxes) &&
                    camp.boxes.some((b) => b.slots.some(Boolean));
                t.boxes = isSingleLegacyTrainer
                    ? (JSON.parse(JSON.stringify(camp.boxes)) as PcBox[])
                    : Array.from({ length: 8 }, (_, i) => createDefaultBox(i));
            }

            t.party = t.party.map((pid) => resolveValidPokemonId(pid, t.id));

            for (const b of t.boxes || []) {
                if (Array.isArray(b.slots)) {
                    b.slots = b.slots.map((pid) => resolveValidPokemonId(pid, t.id));
                    while (b.slots.length < 30) b.slots.push(null);
                } else {
                    b.slots = Array(30).fill(null);
                }
            }
        }

        if (Object.keys(camp.trainers).length > 0) {
            for (const b of camp.boxes) {
                if (Array.isArray(b.slots)) {
                    b.slots = b.slots.map((pid) =>
                        pid && claimedByTrainer.has(pid) ? null : resolveValidPokemonId(pid)
                    );
                    while (b.slots.length < 30) b.slots.push(null);
                } else {
                    b.slots = Array(30).fill(null);
                }
            }
            camp.teamParty = camp.teamParty.map((pid) =>
                pid && claimedByTrainer.has(pid) ? null : resolveValidPokemonId(pid)
            );
        }

        // Active trainer sanity check
        if (camp.activeTrainerId !== '__none__') {
            if (!camp.trainers[camp.activeTrainerId]) {
                const firstId = Object.keys(camp.trainers)[0];
                camp.activeTrainerId = firstId || '__none__';
            }
        }

        for (const t of Object.values(camp.trainers)) {
            for (const pid of t.party) {
                if (pid) referencedIds.add(pid);
            }
            for (const b of t.boxes || []) {
                for (const pid of b.slots || []) {
                    if (pid) referencedIds.add(pid);
                }
            }
        }
        for (const b of camp.boxes) {
            for (const pid of b.slots || []) {
                if (pid) referencedIds.add(pid);
            }
        }
        for (const pid of camp.teamParty) {
            if (pid) referencedIds.add(pid);
        }
    }

    // Prune invalid or corrupted Pokémon summaries
    for (const [id, s] of Object.entries(data.pokemonSummaries)) {
        if (!s || typeof s !== 'object' || (!s.name && !s.species)) {
            delete data.pokemonSummaries[id];
        }
    }

    // Sanitize any file:/// URLs from stored Pokémon summaries
    for (const summary of Object.values(data.pokemonSummaries)) {
        if (
            summary.tokenImageUrl &&
            (summary.tokenImageUrl.startsWith('file:') || summary.tokenImageUrl.startsWith('file:///'))
        ) {
            summary.tokenImageUrl = undefined;
        }
    }

    // Auto-recovery: If any valid Pokémon summary in data.pokemonSummaries has a trainerId matching a trainer,
    // but was accidentally unreferenced from slots due to prior cross-claim conflicts, recover it into their boxes.
    for (const [id, summary] of Object.entries(data.pokemonSummaries)) {
        if (!summary || referencedIds.has(id) || summary.isOnMap) continue;
        if (summary.trainerId) {
            for (const camp of Object.values(data.campaigns)) {
                const tr: TrainerRoster | undefined = camp.trainers?.[summary.trainerId];
                if (tr && Array.isArray(tr.boxes) && tr.boxes.length > 0) {
                    for (const b of tr.boxes) {
                        const emptyIdx = b.slots.findIndex((s: string | null) => s === null);
                        if (emptyIdx !== -1) {
                            b.slots[emptyIdx] = id;
                            referencedIds.add(id);
                            break;
                        }
                    }
                    if (referencedIds.has(id)) break;
                }
            }
        }
    }

    // Auto-cleansing: prune unreferenced orphan summaries that are not in any party/box and not on the map
    const pruned: Record<string, PcPokemonSummary> = {};
    for (const [id, summary] of Object.entries(data.pokemonSummaries)) {
        if (referencedIds.has(id) || summary.isOnMap) {
            pruned[id] = summary;
        }
    }
    data.pokemonSummaries = pruned;

    return data;
}

