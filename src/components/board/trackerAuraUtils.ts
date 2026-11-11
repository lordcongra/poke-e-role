import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CharacterState } from '../../store/storeTypes';
import type { BattleOrganizerState } from '../../types/battleOrganizerTypes';
import { STATS_META_ID } from '../../utils/graphics/graphicsManager';
import { matchesTarget, isCombatantInPc } from '../../utils/combat/abilityTargetingUtils';
import { getBattleOrganizerStorageKey, readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';
import { sendBattleOrganizerFullSync } from '@/components/modals/battleOrganizer/battleOrganizerSyncHelpers';

/**
 * Removes the current character from an attacker's `abilityTargetIds` in Battle Organizer
 * storage and OBR token metadata.
 */
export async function removeCharacterFromAuraSources(
    abilityName: string,
    state: CharacterState,
    onComplete?: () => void
): Promise<void> {
    const cleanAbility = abilityName.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    const charIdentifiers = [
        state.identity.entityId,
        state.tokenId,
        state.identity.nickname,
        state.identity.species
    ].filter(Boolean) as string[];

    const charMatcher = {
        id: state.identity.entityId,
        tokenId: state.tokenId || undefined,
        entityId: state.identity.entityId,
        name: state.identity.nickname || state.identity.species
    };

    let boChanged = false;
    const tokensToUpdate: { tokenId: string; targetIds: string[] }[] = [];

    try {
        const raw = readBattleOrganizerStateRaw();
        if (raw) {
            const data = JSON.parse(raw) as BattleOrganizerState;
            const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
            if (activeRound?.combatants) {
                activeRound.combatants.forEach((c) => {
                    const cAb = (c.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
                    if (cAb === cleanAbility && Array.isArray(c.abilityTargetIds) && c.abilityTargetIds.length > 0) {
                        const originalLength = c.abilityTargetIds.length;
                        const filtered = c.abilityTargetIds.filter((tId) => {
                            const cleanTId = tId.trim().toLowerCase();
                            if (charIdentifiers.some((id) => id.trim().toLowerCase() === cleanTId)) {
                                return false;
                            }
                            if (matchesTarget(charMatcher, tId)) {
                                return false;
                            }
                            return true;
                        });

                        if (filtered.length !== originalLength) {
                            c.abilityTargetIds = filtered;
                            boChanged = true;
                            if (c.tokenId) {
                                tokensToUpdate.push({ tokenId: c.tokenId, targetIds: filtered });
                            }
                            if (
                                (c.tokenId && c.tokenId === state.tokenId) ||
                                (c.entityId && c.entityId === state.identity.entityId)
                            ) {
                                useCharacterStore.getState().setIdentity('abilityTargetIds' as any, filtered);
                            }
                        }
                    }
                });

                if (boChanged) {
                    localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(data));
                    void sendBattleOrganizerFullSync(data);
                }
            }
        }
    } catch (e) {
        console.warn('[trackerAuraUtils] Failed to remove character from aura sources in organizer:', e);
    }

    if (OBR.isAvailable && tokensToUpdate.length > 0) {
        for (const update of tokensToUpdate) {
            try {
                await OBR.scene.items.updateItems([update.tokenId], (items) => {
                    for (const item of items) {
                        const statsMeta = (item.metadata[STATS_META_ID] || {}) as Record<string, unknown>;
                        statsMeta['ability-target-ids'] = update.targetIds.join(',');
                        item.metadata[STATS_META_ID] = statsMeta;
                    }
                });
            } catch (e) {
                console.warn('[trackerAuraUtils] Failed to sync token metadata for aura source:', e);
            }
        }
    }

    onComplete?.();
}

/**
 * Re-reads organizer storage, clears orphan aura associations across all combatants
 * in the active round, updates token metadata, and re-syncs state.
 */
export async function refreshAndCleanAuraAssociations(
    state?: CharacterState,
    onComplete?: () => void
): Promise<void> {
    const currentState = state || useCharacterStore.getState();
    let boChanged = false;
    const tokensToUpdate: { tokenId: string; targetIds: string[] }[] = [];

    try {
        const raw = readBattleOrganizerStateRaw();
        if (raw) {
            const data = JSON.parse(raw) as BattleOrganizerState;
            const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
            if (activeRound?.combatants) {
                const allCombatants = activeRound.combatants;

                allCombatants.forEach((c) => {
                    if (Array.isArray(c.abilityTargetIds) && c.abilityTargetIds.length > 0) {
                        const originalLength = c.abilityTargetIds.length;
                        const validTargets = c.abilityTargetIds.filter((tId) => {
                            if (!tId) return false;
                            return allCombatants.some(
                                (cand) => matchesTarget(cand, tId) && !isCombatantInPc(cand, currentState.pcData)
                            );
                        });

                        if (validTargets.length !== originalLength) {
                            c.abilityTargetIds = validTargets;
                            boChanged = true;
                            if (c.tokenId) {
                                tokensToUpdate.push({ tokenId: c.tokenId, targetIds: validTargets });
                            }
                            if (
                                (c.tokenId && c.tokenId === currentState.tokenId) ||
                                (c.entityId && c.entityId === currentState.identity.entityId)
                            ) {
                                useCharacterStore.getState().setIdentity('abilityTargetIds' as any, validTargets);
                            }
                        }
                    }
                });

                if (boChanged) {
                    localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(data));
                    void sendBattleOrganizerFullSync(data);
                }

                if (data.battlefield) {
                    useCharacterStore.getState().setActiveBattlefield(data.battlefield);
                }
            }
        }
    } catch (e) {
        console.warn('[trackerAuraUtils] Failed to clean orphan aura associations:', e);
    }

    if (OBR.isAvailable && tokensToUpdate.length > 0) {
        for (const update of tokensToUpdate) {
            try {
                await OBR.scene.items.updateItems([update.tokenId], (items) => {
                    for (const item of items) {
                        const statsMeta = (item.metadata[STATS_META_ID] || {}) as Record<string, unknown>;
                        statsMeta['ability-target-ids'] = update.targetIds.join(',');
                        item.metadata[STATS_META_ID] = statsMeta;
                    }
                });
            } catch (e) {
                console.warn('[trackerAuraUtils] Failed to update token metadata during aura cleanup:', e);
            }
        }
    }

    onComplete?.();
}
