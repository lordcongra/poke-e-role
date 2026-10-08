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
 * Filters trainers based on player role:
 * - GM sees all trainers in the room/campaign.
 * - Non-GM players ONLY see their own trainers (matched by playerId, claim metadata, or active token).
 */
export function filterTrainersForRole(
    trainers: Record<string, TrainerRoster> = {},
    myPlayerId?: string,
    isGm?: boolean,
    activeTokenId?: string | null
): Record<string, TrainerRoster> {
    if (isGm) return trainers;
    const resolvedPlayerId = myPlayerId || cachedObrPlayerId;
    if (!resolvedPlayerId) return trainers;

    const filtered: Record<string, TrainerRoster> = {};
    for (const [id, t] of Object.entries(trainers)) {
        // 1. Explicit playerId matches
        if (t.playerId && t.playerId === resolvedPlayerId) {
            filtered[id] = t;
            continue;
        }
        // 2. Claim metadata matches
        const claim = t.savedTokenItem?.metadata?.['pokerole-pmd-extension/claimed-by'] as
            | { playerId?: string }
            | undefined;
        if (claim?.playerId && claim.playerId === resolvedPlayerId) {
            filtered[id] = t;
            continue;
        }
        const fullClaim =
            (t.fullMetadata?.['pokerole-pmd-extension/claimed-by'] as { playerId?: string } | undefined)?.playerId ||
            (t.fullMetadata?.['claimed-by'] as string | undefined);
        if (fullClaim && fullClaim === resolvedPlayerId) {
            filtered[id] = t;
            continue;
        }
        // 3. Active token matches (ONLY if not claimed by another player)
        if (activeTokenId && (t.mapTokenId === activeTokenId || t.id === activeTokenId)) {
            const isClaimedByOther =
                (t.playerId && t.playerId !== resolvedPlayerId) ||
                (claim?.playerId && claim.playerId !== resolvedPlayerId) ||
                (fullClaim && fullClaim !== resolvedPlayerId);
            if (!isClaimedByOther && (!t.playerId || t.playerId === resolvedPlayerId)) {
                filtered[id] = t;
                continue;
            }
        }
        // 4. If trainer has no playerId and no claim, only include if not claimed by someone else
        if (!t.playerId && !claim?.playerId && !fullClaim) {
            filtered[id] = t;
        }
    }
    return filtered;
}

/**
 * Resolves the effective active trainer for a campaign, prioritizing local client preference
 * or player ID to ensure non-GM players never have their active trainer profile reset
 * to the GM's trainer (e.g. Brendan).
 */
export function resolveEffectiveActiveTrainer(
    campaign?: CampaignProfile,
    myPlayerId?: string,
    overrideTrainers?: Record<string, TrainerRoster>
): TrainerRoster | undefined {
    if (!campaign) return undefined;
    const resolvedPlayerId = myPlayerId || cachedObrPlayerId;
    const availableTrainers = overrideTrainers || campaign.trainers || {};

    // 1. Check player-scoped and global local storage preference
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            if (resolvedPlayerId) {
                const playerScoped = localStorage.getItem(`pkr_active_trainer_${resolvedPlayerId}_${campaign.id}`);
                if (playerScoped === '__none__') {
                    if (campaign.activeTrainerId === '__none__') return undefined;
                } else if (playerScoped && availableTrainers[playerScoped]) {
                    return availableTrainers[playerScoped];
                }
            }
            const localId = localStorage.getItem(`pkr_active_trainer_${campaign.id}`);
            if (localId === '__none__') {
                if (campaign.activeTrainerId === '__none__') return undefined;
            } else if (localId && availableTrainers[localId]) {
                return availableTrainers[localId];
            }
        } catch {}
    }

    // 2. Check player-specific mapping in campaign if available
    if (resolvedPlayerId && campaign.activeTrainerByPlayer?.[resolvedPlayerId]) {
        const playerIdMatch = campaign.activeTrainerByPlayer[resolvedPlayerId];
        if (playerIdMatch === '__none__') {
            if (campaign.activeTrainerId === '__none__') return undefined;
        } else if (availableTrainers[playerIdMatch]) {
            return availableTrainers[playerIdMatch];
        }
    }

    // 3. Check campaign.activeTrainerId (unless explicit PMD mode)
    if (campaign.activeTrainerId === '__none__') return undefined;
    if (campaign.activeTrainerId && availableTrainers[campaign.activeTrainerId]) {
        return availableTrainers[campaign.activeTrainerId];
    }

    // 4. Fallback to first available trainer
    return Object.values(availableTrainers)[0];
}
