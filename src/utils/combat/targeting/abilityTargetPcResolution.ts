import OBR from '@owlbear-rodeo/sdk';
import type { BattleOrganizerState, CombatantRowData } from '@/types/battleOrganizerTypes';
import type { PcPokemonSummary, PcStorageData } from '@/types/pcStorageTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { EXTENSION_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { STATS_META_ID } from '@/utils/graphics/graphicsManager';
import { matchesTarget } from './abilityTargetStances';
import { getBattleOrganizerStorageKey, readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';

/**
 * Checks if a combatant is currently deposited or recalled to the PC.
 */
export function isCombatantInPc(c: CombatantRowData, pcData?: PcStorageData | null): boolean {
    let resolvedPc = pcData;
    if (!resolvedPc) {
        try {
            resolvedPc = useCharacterStore.getState()?.pcData;
        } catch {
            // Ignore if store not available
        }
    }

    const hasSpecificId = Boolean(c.entityId || c.tokenId);
    let summary: PcPokemonSummary | undefined = undefined;
    if (resolvedPc?.pokemonSummaries) {
        if (c.entityId && resolvedPc.pokemonSummaries[c.entityId]) {
            summary = resolvedPc.pokemonSummaries[c.entityId];
        } else if (c.id && resolvedPc.pokemonSummaries[c.id]) {
            summary = resolvedPc.pokemonSummaries[c.id];
        } else if (c.tokenId) {
            summary = Object.values(resolvedPc.pokemonSummaries).find(
                (s) => s.mapTokenId === c.tokenId || s.savedTokenItem?.id === c.tokenId
            );
        } else if (!hasSpecificId && c.name) {
            const cleanName = c.name.trim().toLowerCase();
            summary = Object.values(resolvedPc.pokemonSummaries).find(
                (s) =>
                    s.name?.trim().toLowerCase() === cleanName ||
                    s.species?.trim().toLowerCase() === cleanName
            );
        }
    }

    // Verify whether c.tokenId or summary?.isOnMap indicates it is actually on the field
    const isOnField = summary?.isOnMap === true || (Boolean(c.tokenId) && summary?.isOnMap !== false);

    // If c.isInPc is true, verify whether it is actually on the field; if on the map, do not treat it as in the PC
    if (c.isInPc) {
        if (!isOnField) {
            return true;
        }
    }

    if (!resolvedPc) {
        return Boolean(c.isInPc && !isOnField);
    }

    // If summary?.isOnMap === true, return false (it is on the map)
    if (summary?.isOnMap === true) {
        return false;
    }

    const targetEntityId = summary?.entityId || c.entityId || c.id;
    if (targetEntityId) {
        // Check if targetEntityId is present in party or teamParty across campaigns/trainers.
        // If in party and not recalled (summary?.isOnMap !== false), return false.
        const isInParty = Object.values(resolvedPc.campaigns || {}).some((camp) => {
            if (camp.teamParty?.includes(targetEntityId)) return true;
            return Object.values(camp.trainers || {}).some((tr) => tr.party?.includes(targetEntityId));
        });

        if (isInParty && summary?.isOnMap !== false) {
            return false;
        }

        // If explicitly recalled, it is in PC
        if (summary?.isOnMap === false) {
            return true;
        }

        // Only return true from box slots if summary?.isOnMap !== true
        if (summary?.isOnMap !== true) {
            for (const camp of Object.values(resolvedPc.campaigns || {})) {
                if (camp.boxes?.some((b) => b.slots?.includes(targetEntityId))) {
                    return true;
                }
                for (const tr of Object.values(camp.trainers || {})) {
                    if (tr.boxes?.some((b) => b.slots?.includes(targetEntityId))) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Handles cleaning up combatants sent/recalled to the PC across Battle Organizer and OBR metadata.
 */
export async function syncCombatantSentToPc(entityId: string, pcData?: PcStorageData): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage || !entityId) return;
    try {
        const raw = readBattleOrganizerStateRaw();
        if (!raw) return;
        const bo = JSON.parse(raw) as BattleOrganizerState;
        if (!bo || !Array.isArray(bo.rounds)) return;

        let boChanged = false;
        const resolvedPcData = pcData ?? (useCharacterStore.getState()?.pcData as PcStorageData | undefined);
        const summary = resolvedPcData?.pokemonSummaries?.[entityId];
        const mapTokenId = summary?.mapTokenId;
        const savedTokenId = summary?.savedTokenItem?.id;
        const summaryName = (summary?.name || summary?.species || '').trim().toLowerCase();

        const idsToRemove = new Set<string>([entityId]);
        if (mapTokenId) idsToRemove.add(mapTokenId);
        if (savedTokenId) idsToRemove.add(savedTokenId);

        const summaryHasId = Boolean(entityId || mapTokenId || savedTokenId);

        // Also search rounds for matching combatants to capture c.id, c.tokenId, c.entityId
        bo.rounds.forEach((r) => {
            if (!r?.combatants) return;
            r.combatants.forEach((c) => {
                const combatantHasId = Boolean(c.entityId || c.tokenId);
                const isMatch = combatantHasId || summaryHasId
                    ? idsToRemove.has(c.id) ||
                      (Boolean(c.entityId) && idsToRemove.has(c.entityId!)) ||
                      (Boolean(c.tokenId) && idsToRemove.has(c.tokenId!))
                    : Boolean(summaryName && c.name && c.name.trim().toLowerCase() === summaryName);
                if (isMatch) {
                    if (c.id) idsToRemove.add(c.id);
                    if (c.tokenId) idsToRemove.add(c.tokenId);
                    if (c.entityId) idsToRemove.add(c.entityId);
                    if (!combatantHasId && !summaryHasId && c.name) {
                        idsToRemove.add(c.name.trim().toLowerCase());
                    }
                }
            });
        });

        const affectedSources: Array<{ tokenId?: string; entityId?: string; id: string; newTargetIds: string[] }> = [];

        // Collect all combatants across rounds to evaluate isCombatantInPc
        const allCombatants: CombatantRowData[] = [];
        bo.rounds.forEach((r) => {
            if (r?.combatants) {
                allCombatants.push(...r.combatants);
            }
        });

        bo.rounds.forEach((r) => {
            if (!r?.combatants) return;
            r.combatants.forEach((c) => {
                const combatantHasId = Boolean(c.entityId || c.tokenId);
                const isMatch = combatantHasId || summaryHasId
                    ? idsToRemove.has(c.id) ||
                      (Boolean(c.entityId) && idsToRemove.has(c.entityId!)) ||
                      (Boolean(c.tokenId) && idsToRemove.has(c.tokenId!))
                    : Boolean(summaryName && c.name && c.name.trim().toLowerCase() === summaryName);

                if (isMatch) {
                    if (!c.isInPc) {
                        c.isInPc = true;
                        boChanged = true;
                    }
                    if (c.abilityActive !== false) {
                        c.abilityActive = false;
                        boChanged = true;
                    }
                    if (c.abilityBoostActive) {
                        c.abilityBoostActive = false;
                        boChanged = true;
                    }
                    if (c.abilityTargetIds && c.abilityTargetIds.length > 0) {
                        c.abilityTargetIds = [];
                        boChanged = true;
                    }
                } else {
                    if (c.abilityTargetIds && c.abilityTargetIds.length > 0) {
                        const originalCount = c.abilityTargetIds.length;
                        const filtered = c.abilityTargetIds.filter((tId) => {
                            if (!tId) return false;
                            const cleanTId = tId.trim().toLowerCase();
                            if (idsToRemove.has(tId) || idsToRemove.has(cleanTId)) return false;
                            const matchesPcTarget = allCombatants.some(
                                (cand) => matchesTarget(cand, tId) && isCombatantInPc(cand, resolvedPcData)
                            );
                            if (matchesPcTarget) return false;
                            return true;
                        });
                        if (filtered.length !== originalCount) {
                            c.abilityTargetIds = filtered;
                            boChanged = true;
                            affectedSources.push({
                                tokenId: c.tokenId,
                                entityId: c.entityId,
                                id: c.id,
                                newTargetIds: filtered
                            });
                        }
                    }
                }
            });
        });

        if (boChanged) {
            localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(bo));
            if (OBR.isAvailable) {
                OBR.broadcast
                    .sendMessage(`${EXTENSION_ID}/battle-organizer-sync`, bo, { destination: 'REMOTE' })
                    .catch(() => {});
            }
        }

        // Sync active Zustand store if an affected source or deposited Pokémon is currently loaded
        try {
            const activeChar = useCharacterStore.getState();
            if (activeChar) {
                const activeEntityId = activeChar.identity?.entityId;
                const activeTokenId = activeChar.tokenId;

                const isActiveDeposited =
                    (activeEntityId && idsToRemove.has(activeEntityId)) ||
                    (activeTokenId && idsToRemove.has(activeTokenId)) ||
                    matchesTarget(
                        {
                            id: activeEntityId,
                            tokenId: activeTokenId || undefined,
                            entityId: activeEntityId,
                            name: activeChar.identity?.nickname || activeChar.identity?.species
                        },
                        Array.from(idsToRemove)
                    );

                if (isActiveDeposited) {
                    activeChar.setIdentity('abilityActive', false);
                    activeChar.setIdentity('abilityBoostActive', false);
                    activeChar.setIdentity('abilityTargetIds', []);
                } else {
                    // Directly inspect and prune active character's abilityTargetIds
                    const currentTargets = activeChar.identity?.abilityTargetIds;
                    if (Array.isArray(currentTargets) && currentTargets.length > 0) {
                        const originalCount = currentTargets.length;
                        const pruned = currentTargets.filter((tId) => {
                            if (!tId) return false;
                            const cleanTId = tId.trim().toLowerCase();
                            if (idsToRemove.has(tId) || idsToRemove.has(cleanTId)) return false;
                            const matchesPcTarget = allCombatants.some(
                                (cand) => matchesTarget(cand, tId) && isCombatantInPc(cand, resolvedPcData)
                            );
                            if (matchesPcTarget) return false;
                            return true;
                        });

                        if (pruned.length !== originalCount) {
                            activeChar.setIdentity('abilityTargetIds', pruned);
                            if (activeTokenId && !affectedSources.some((s) => s.tokenId === activeTokenId)) {
                                affectedSources.push({
                                    tokenId: activeTokenId,
                                    entityId: activeEntityId,
                                    id: activeEntityId || activeTokenId,
                                    newTargetIds: pruned
                                });
                            }
                        }
                    }

                    for (const src of affectedSources) {
                        if (
                            (activeEntityId && (src.entityId === activeEntityId || src.id === activeEntityId)) ||
                            (activeTokenId && (src.tokenId === activeTokenId || src.id === activeTokenId))
                        ) {
                            activeChar.setIdentity('abilityTargetIds', src.newTargetIds);
                            break;
                        }
                    }
                }
            }
        } catch {
            // Ignore if store not ready
        }

        // Sync updated target IDs to OBR token metadata
        if (OBR.isAvailable && affectedSources.length > 0) {
            try {
                const tokenMap = new Map<string, string[]>();
                for (const src of affectedSources) {
                    if (src.tokenId) {
                        tokenMap.set(src.tokenId, src.newTargetIds);
                    }
                }
                if (tokenMap.size > 0) {
                    await OBR.scene.items.updateItems(Array.from(tokenMap.keys()), (items) => {
                        for (const item of items) {
                            const newIds = tokenMap.get(item.id);
                            if (newIds !== undefined) {
                                const statsMeta = (item.metadata[STATS_META_ID] || {}) as Record<string, unknown>;
                                statsMeta['ability-target-ids'] = newIds.join(',');
                                item.metadata[STATS_META_ID] = statsMeta;
                            }
                        }
                    });
                }
            } catch (metaErr) {
                console.warn('[abilityTargetingUtils] Failed to sync pruned targets to OBR metadata:', metaErr);
            }
        }
    } catch (err) {
        console.warn('[abilityTargetingUtils] Failed to sync combatant sent to PC:', err);
    }
}

/**
 * Restores a combatant from the PC state when sent back onto the map.
 */
export async function syncCombatantSentToMap(entityId: string, pcData?: PcStorageData): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage || !entityId) return;
    try {
        const raw = readBattleOrganizerStateRaw();
        if (!raw) return;
        const bo = JSON.parse(raw) as BattleOrganizerState;
        if (!bo || !Array.isArray(bo.rounds)) return;

        let boChanged = false;
        const resolvedPcData = pcData ?? (useCharacterStore.getState()?.pcData as PcStorageData | undefined);
        const summary = resolvedPcData?.pokemonSummaries?.[entityId];
        const mapTokenId = summary?.mapTokenId;
        const savedTokenId = summary?.savedTokenItem?.id;
        const summaryName = (summary?.name || summary?.species || '').trim().toLowerCase();

        const idsToMatch = new Set<string>([entityId]);
        if (mapTokenId) idsToMatch.add(mapTokenId);
        if (savedTokenId) idsToMatch.add(savedTokenId);

        const summaryHasId = Boolean(entityId || mapTokenId || savedTokenId);

        // Also search rounds for matching combatants to capture c.id, c.tokenId, c.entityId
        bo.rounds.forEach((r) => {
            if (!r?.combatants) return;
            r.combatants.forEach((c) => {
                const combatantHasId = Boolean(c.entityId || c.tokenId);
                const isMatch = combatantHasId || summaryHasId
                    ? idsToMatch.has(c.id) ||
                      (Boolean(c.entityId) && idsToMatch.has(c.entityId!)) ||
                      (Boolean(c.tokenId) && idsToMatch.has(c.tokenId!))
                    : Boolean(summaryName && c.name && c.name.trim().toLowerCase() === summaryName);
                if (isMatch) {
                    if (c.id) idsToMatch.add(c.id);
                    if (c.tokenId) idsToMatch.add(c.tokenId);
                    if (c.entityId) idsToMatch.add(c.entityId);
                    if (!combatantHasId && !summaryHasId && c.name) {
                        idsToMatch.add(c.name.trim().toLowerCase());
                    }
                }
            });
        });

        bo.rounds.forEach((r) => {
            if (!r?.combatants) return;
            r.combatants.forEach((c) => {
                const combatantHasId = Boolean(c.entityId || c.tokenId);
                const isMatch = combatantHasId || summaryHasId
                    ? idsToMatch.has(c.id) ||
                      (Boolean(c.entityId) && idsToMatch.has(c.entityId!)) ||
                      (Boolean(c.tokenId) && idsToMatch.has(c.tokenId!))
                    : Boolean(summaryName && c.name && c.name.trim().toLowerCase() === summaryName);
                if (isMatch && c.isInPc) {
                    c.isInPc = false;
                    boChanged = true;
                }
            });
        });

        if (boChanged) {
            localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(bo));
            if (OBR.isAvailable) {
                OBR.broadcast
                    .sendMessage(`${EXTENSION_ID}/battle-organizer-sync`, bo, { destination: 'REMOTE' })
                    .catch(() => {});
            }
        }
    } catch (err) {
        console.warn('[abilityTargetingUtils] Failed to sync combatant sent to map:', err);
    }
}

