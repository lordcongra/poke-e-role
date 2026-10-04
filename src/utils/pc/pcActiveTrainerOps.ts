import type { CampaignProfile, TrainerRoster } from '../../types/pcStorageTypes';

let cachedObrPlayerId: string | undefined = undefined;

export function setCachedObrPlayerId(id?: string): void {
    cachedObrPlayerId = id;
}

export function getCachedObrPlayerId(): string | undefined {
    return cachedObrPlayerId;
}

export function persistTrainerSwitch(campId: string, trainerId: string, pid?: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.setItem(`pkr_active_trainer_${campId}`, trainerId);
        if (pid) {
            localStorage.setItem(`pkr_active_trainer_${pid}_${campId}`, trainerId);
        }
    } catch {}
}

/**
 * Resolves the effective active trainer for a campaign, prioritizing local client preference
 * or player ID to ensure non-GM players never have their active trainer profile reset
 * to the GM's trainer (e.g. Brendan).
 */
export function resolveEffectiveActiveTrainer(
    campaign?: CampaignProfile,
    myPlayerId?: string
): TrainerRoster | undefined {
    if (!campaign) return undefined;
    const resolvedPlayerId = myPlayerId || cachedObrPlayerId;

    // 1. Check player-scoped and global local storage preference
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            if (resolvedPlayerId) {
                const playerScoped = localStorage.getItem(`pkr_active_trainer_${resolvedPlayerId}_${campaign.id}`);
                if (playerScoped === '__none__') {
                    if (campaign.activeTrainerId === '__none__') return undefined;
                } else if (playerScoped && campaign.trainers?.[playerScoped]) {
                    return campaign.trainers[playerScoped];
                }
            }
            const localId = localStorage.getItem(`pkr_active_trainer_${campaign.id}`);
            if (localId === '__none__') {
                if (campaign.activeTrainerId === '__none__') return undefined;
            } else if (localId && campaign.trainers?.[localId]) {
                return campaign.trainers[localId];
            }
        } catch {}
    }

    // 2. Check player-specific mapping in campaign if available
    if (resolvedPlayerId && campaign.activeTrainerByPlayer?.[resolvedPlayerId]) {
        const playerIdMatch = campaign.activeTrainerByPlayer[resolvedPlayerId];
        if (playerIdMatch === '__none__') {
            if (campaign.activeTrainerId === '__none__') return undefined;
        } else if (campaign.trainers?.[playerIdMatch]) {
            return campaign.trainers[playerIdMatch];
        }
    }

    // 3. Check campaign.activeTrainerId (unless explicit PMD mode)
    if (campaign.activeTrainerId === '__none__') return undefined;
    if (campaign.activeTrainerId && campaign.trainers?.[campaign.activeTrainerId]) {
        return campaign.trainers[campaign.activeTrainerId];
    }

    // 4. Fallback to first available trainer
    return Object.values(campaign.trainers || {})[0];
}
