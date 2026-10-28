import type { PcPokemonSummary, PcBox } from '../../types/pcStorageTypes';

/**
 * Filters the list of Pokémon summaries relevant to the currently viewed Trainer or Campaign.
 */
export function filterTrainerPokemonSummaries(
    summaries: Record<string, PcPokemonSummary>,
    trainer?: { id: string; party: (string | null)[]; boxes?: PcBox[] },
    campaign?: { id?: string; boxes: PcBox[]; teamParty?: (string | null)[] }
): PcPokemonSummary[] {
    if (trainer) {
        const partyEntityIds = new Set(trainer.party?.filter(Boolean) || []);
        const trainerBoxEntityIds = new Set<string>();
        for (const b of trainer.boxes || []) {
            for (const s of b.slots || []) {
                if (s) trainerBoxEntityIds.add(s);
            }
        }
        return Object.values(summaries).filter((p) => {
            if (!p) return false;
            if (partyEntityIds.has(p.entityId)) return false;
            if (p.trainerId && p.trainerId === trainer.id) return true;
            if (trainerBoxEntityIds.has(p.entityId)) return true;
            return false;
        });
    }

    // PMD / No-Trainer Mode: Strictly use campaign teamParty and campaign boxes
    const teamPartyIds = new Set(campaign?.teamParty?.filter(Boolean) || []);
    const campaignBoxEntityIds = new Set<string>();
    for (const b of campaign?.boxes || []) {
        for (const s of b.slots || []) {
            if (s) campaignBoxEntityIds.add(s);
        }
    }
    return Object.values(summaries).filter((p) => {
        if (!p) return false;
        if (teamPartyIds.has(p.entityId)) return false;
        if (campaignBoxEntityIds.has(p.entityId)) return true;
        if (!p.trainerId && campaign?.id && p.campaignId === campaign.id) return true;
        return false;
    });
}
