import OBR from '@owlbear-rodeo/sdk';
import { RANK_TARGET_LIMITS, getMaxTargetsForRank } from '../../components/modals/combat/targetingModalUtils';
import type { BattlefieldData, BattleOrganizerState, CombatantRowData } from '../../types/battleOrganizerTypes';
import type { CharacterState } from '../../store/storeTypes';
import type { PcPokemonSummary, PcStorageData } from '../../types/pcStorageTypes';
import { getEffectsByCategory } from './fieldEffectsData';
import { resolveCharacterSide } from './combatantSideUtils';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getKnownAbility } from '../../data/abilities/knownAbilities';
import { parseHeldItemsFromMetadata } from '../../components/modals/battleOrganizer/battleOrganizerUtils';
import { EXTENSION_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';
import { STATS_META_ID } from '../graphics/graphicsManager';

export { RANK_TARGET_LIMITS, getMaxTargetsForRank };

export type AbilityTargetStance = 'allies-and-self' | 'allies-only' | 'foes' | 'all-except-self' | 'all-on-field' | 'none';

export const RUIN_ABILITIES = new Set([
    'tablets of ruin',
    'sword of ruin',
    'vessel of ruin',
    'beads of ruin'
]);

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
        const raw = localStorage.getItem('pkr_battle_organizer_data');
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
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(bo));
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
        const raw = localStorage.getItem('pkr_battle_organizer_data');
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
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(bo));
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

/**
 * Helper to parse ability target stance from tag strings.
 */
export function parseAbilityTargetStanceFromTags(tags: string): AbilityTargetStance {
    if (!tags) return 'none';
    const lowerTags = tags.toLowerCase();
    if (lowerTags.includes('[target: all foes]') || lowerTags.includes('[target: single foe]')) {
        return 'foes';
    }
    if (lowerTags.includes('[target: all allies]') || lowerTags.includes('[target: single ally]')) {
        return 'allies-only';
    }
    if (lowerTags.includes('[target: allies & self]') || lowerTags.includes('[target: allies and self]')) {
        return 'allies-and-self';
    }
    if (lowerTags.includes('[target: all except self]')) {
        return 'all-except-self';
    }
    if (lowerTags.includes('[target: all on field]') || lowerTags.includes('[target: field]')) {
        return 'all-on-field';
    }
    if (/\[target:\s*(?:all\s+)?foes?\]/i.test(tags)) return 'foes';
    if (/\[target:\s*(?:all\s+)?allies(?:-only)?\]/i.test(tags)) return 'allies-only';
    if (/\[target:\s*allies\s*(?:&|and)\s*self\]/i.test(tags)) return 'allies-and-self';
    if (/\[target:\s*all\s+(?:on\s+)?field\]/i.test(tags)) return 'all-on-field';
    if (/\[target:\s*all\s+except\s+self\]/i.test(tags)) return 'all-except-self';
    return 'none';
}

/**
 * Returns the targeting stance for unified range-based abilities.
 */
export function getAbilityTargetStance(ability: string, tags?: string): AbilityTargetStance {
    if (tags) {
        const fromTags = parseAbilityTargetStanceFromTags(tags);
        if (fromTags !== 'none') return fromTags;
    }

    if (!ability) return 'none';
    const clean = ability.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    switch (clean) {
        case 'flower gift':
        case 'steely spirit':
        case 'armor tail':
        case 'sweet veil':
        case 'pastel veil':
        case 'aroma veil':
        case 'flower veil':
        case 'victory star':
            return 'allies-and-self';
        case 'battery':
        case 'power spot':
        case 'costar':
        case 'hospitality':
        case 'commander':
            return 'allies-only';
        case 'intimidate':
        case 'supersweet syrup':
        case 'neutralizing gas':
        case 'frisk':
        case 'analytic':
        case 'unaware':
        case 'stakeout':
            return 'foes';
        case 'tablets of ruin':
        case 'sword of ruin':
        case 'vessel of ruin':
        case 'beads of ruin':
            return 'all-except-self';
        case 'dark aura':
        case 'fairy aura':
        case 'aura break':
            return 'all-on-field';
    }

    // Fall back to known ability tags or custom room abilities
    const known = getKnownAbility(clean);
    if (known?.tags) {
        const fromKnown = parseAbilityTargetStanceFromTags(known.tags);
        if (fromKnown !== 'none') return fromKnown;
    }

    try {
        const roomCustomAbilities = useCharacterStore.getState()?.roomCustomAbilities;
        const custom = roomCustomAbilities?.find(
            (ca) => ca.name?.trim().toLowerCase() === clean
        );
        if (custom) {
            const customTags = `${custom.effect || ''} ${custom.description || ''}`.trim();
            const fromCustom = parseAbilityTargetStanceFromTags(customTags);
            if (fromCustom !== 'none') return fromCustom;
        }
    } catch {
        // Ignore if store not available
    }

    return 'none';
}

/**
 * Calculates max target count for an ability based on its tags, canonical type, and rank.
 */
export function getAbilityMaxTargets(ability: string, tags?: string, rank?: string): number {
    const cleanTags = (tags || '').toLowerCase();
    if (cleanTags.includes('[target: single') || /\[target:\s*single\b/i.test(cleanTags)) {
        return 1;
    }
    const cleanAbility = (ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
    const singleTargetAbilities = new Set([
        'analytic',
        'costar',
        'hospitality',
        'frisk',
        'commander',
        'unaware',
        'stakeout'
    ]);
    if (singleTargetAbilities.has(cleanAbility)) {
        return 1;
    }
    return getMaxTargetsForRank(rank);
}

/**
 * Checks whether a combatant matches a given targetId or list of targetIds (by id, tokenId, entityId, or name).
 */
export function matchesTarget(
    c: { id?: string; tokenId?: string; entityId?: string; name?: string },
    targetId: string | string[]
): boolean {
    if (!targetId) return false;
    const targetIds = Array.isArray(targetId) ? targetId : [targetId];
    return targetIds.some((tId) => {
        if (!tId) return false;
        const clean = tId.trim().toLowerCase();
        if (c.id && c.id.toLowerCase() === clean) return true;
        if (c.tokenId && c.tokenId.toLowerCase() === clean) return true;
        if (c.entityId && c.entityId.toLowerCase() === clean) return true;
        if (c.name && c.name.trim().toLowerCase() === clean) return true;
        return false;
    });
}

/**
 * Checks whether targetId is explicitly selected in a target IDs array.
 */
export function isTargetInList(
    targetIds: string[],
    targetId: string | string[],
    combatants: CombatantRowData[]
): boolean {
    if (!targetId) return true;
    const rawTargets = Array.isArray(targetId) ? targetId : [targetId];
    const targets = rawTargets.filter(Boolean);
    if (targets.length === 0) return true;
    return targets.some((t) => {
        const clean = t.trim().toLowerCase();
        if (targetIds.some((id) => id.toLowerCase() === clean)) return true;
        const matched = combatants.find((c) => matchesTarget(c, t));
        if (matched) {
            return targetIds.some(
                (id) =>
                    id.toLowerCase() === matched.id.toLowerCase() ||
                    (matched.tokenId && id.toLowerCase() === matched.tokenId.toLowerCase()) ||
                    (matched.entityId && id.toLowerCase() === matched.entityId.toLowerCase()) ||
                    (matched.name && id.toLowerCase() === matched.name.trim().toLowerCase())
            );
        }
        return false;
    });
}

/**
 * Checks whether a target combatant has active Neutralizing Gas.
 * In canonical rules, Neutralizing Gas cannot negate another Neutralizing Gas.
 */
export function isTargetCombatantActiveNeutralizingGas(
    targetId: string | string[],
    allCombatants?: CombatantRowData[],
    activeCharState?: CharacterState | null
): boolean {
    if (!targetId) return false;
    const targetIds = Array.isArray(targetId) ? targetId.filter(Boolean) : [targetId];
    if (targetIds.length === 0) return false;

    let resolvedChar = activeCharState;
    if (resolvedChar === undefined) {
        try {
            resolvedChar = useCharacterStore.getState();
        } catch {
            resolvedChar = null;
        }
    }

    let combatants = allCombatants;
    if (!combatants && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const bo = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
                combatants = activeRound?.combatants;
            }
        } catch {
            // ignore
        }
    }

    if (combatants && combatants.length > 0) {
        const matched = combatants.find((c) => matchesTarget(c, targetIds));
        if (matched) {
            if (isCombatantInPc(matched, resolvedChar?.pcData) || matched.isFainted) {
                return false;
            }
            let ability = matched.ability;
            let active = matched.abilityActive !== false;
            if (resolvedChar) {
                const activeTokenId = resolvedChar.tokenId;
                const activeEntityId = resolvedChar.identity?.entityId;
                if (
                    (activeTokenId && (matched.tokenId === activeTokenId || matched.id === activeTokenId)) ||
                    (activeEntityId && (matched.entityId === activeEntityId || matched.id === activeEntityId))
                ) {
                    if (resolvedChar.identity?.ability) ability = resolvedChar.identity.ability;
                    if (resolvedChar.identity?.abilityActive !== undefined) active = resolvedChar.identity.abilityActive;
                }
            }
            const clean = (ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            return clean === 'neutralizing gas' && active;
        }
    }

    if (resolvedChar) {
        const activeTokenId = resolvedChar.tokenId;
        const activeEntityId = resolvedChar.identity?.entityId;
        const activeName = resolvedChar.identity?.nickname || resolvedChar.identity?.species;
        if (
            matchesTarget(
                { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
                targetIds
            )
        ) {
            const clean = (resolvedChar.identity?.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            const active = resolvedChar.identity?.abilityActive !== false;
            return clean === 'neutralizing gas' && active;
        }
    }

    return false;
}

/**
 * Checks whether a target combatant is immune to Ruin abilities (has an active Ruin ability).
 */
export function isTargetCombatantImmuneToRuin(
    targetId: string | string[],
    allCombatants?: CombatantRowData[],
    activeCharState?: CharacterState | null
): boolean {
    if (!targetId) return false;
    const targetIds = Array.isArray(targetId) ? targetId.filter(Boolean) : [targetId];
    if (targetIds.length === 0) return false;

    let resolvedChar = activeCharState;
    if (resolvedChar === undefined) {
        try {
            resolvedChar = useCharacterStore.getState();
        } catch {
            resolvedChar = null;
        }
    }

    let combatants = allCombatants;
    if (!combatants && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const bo = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
                combatants = activeRound?.combatants;
            }
        } catch {
            // ignore
        }
    }

    if (combatants && combatants.length > 0) {
        const matched = combatants.find((c) => matchesTarget(c, targetIds));
        if (matched) {
            if (isCombatantInPc(matched, resolvedChar?.pcData) || matched.isFainted) {
                return false;
            }
            let ability = matched.ability;
            let active = matched.abilityActive !== false;
            if (resolvedChar) {
                const activeTokenId = resolvedChar.tokenId;
                const activeEntityId = resolvedChar.identity?.entityId;
                if (
                    (activeTokenId && (matched.tokenId === activeTokenId || matched.id === activeTokenId)) ||
                    (activeEntityId && (matched.entityId === activeEntityId || matched.id === activeEntityId))
                ) {
                    if (resolvedChar.identity?.ability) ability = resolvedChar.identity.ability;
                    if (resolvedChar.identity?.abilityActive !== undefined) active = resolvedChar.identity.abilityActive;
                }
            }
            const clean = (ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            return RUIN_ABILITIES.has(clean) && active;
        }
    }

    if (resolvedChar) {
        const activeTokenId = resolvedChar.tokenId;
        const activeEntityId = resolvedChar.identity?.entityId;
        const activeName = resolvedChar.identity?.nickname || resolvedChar.identity?.species;
        if (
            matchesTarget(
                { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
                targetIds
            )
        ) {
            const clean = (resolvedChar.identity?.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            const active = resolvedChar.identity?.abilityActive !== false;
            return RUIN_ABILITIES.has(clean) && active;
        }
    }

    return false;
}

/**
 * Core unified engine for range-based and aura abilities.
 * Determines if targetId on targetSide is affected by abilityName under rank limits and targeting stance.
 */
export function isTargetAffectedByAbility(
    targetId: string | string[],
    targetSide: 'player' | 'foe' | 'none',
    abilityName: string,
    battlefield?: BattlefieldData | null
): boolean {
    if (!targetSide || (targetSide !== 'player' && targetSide !== 'foe') || !abilityName) {
        return false;
    }

    const cleanAbility = abilityName.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();

    // Neutralizing Gas self-immunity: Neutralizing Gas cannot negate another active Neutralizing Gas
    if (cleanAbility === 'neutralizing gas' && isTargetCombatantActiveNeutralizingGas(targetId)) {
        return false;
    }

    // Ruin Quartet mutual immunity: A combatant with a Ruin ability is immune to all Ruin abilities
    if (RUIN_ABILITIES.has(cleanAbility) && isTargetCombatantImmuneToRuin(targetId)) {
        return false;
    }

    // 1. Flower Gift requires Sunny / Harsh Sunlight / Desolate weather
    if (cleanAbility === 'flower gift') {
        const activeWeathers = battlefield ? getEffectsByCategory(battlefield, 'weather') : [];
        const hasSun = activeWeathers.some((w) => {
            const clean = (w?.name || '').trim().toLowerCase();
            return clean.includes('sun') || clean.includes('desolate');
        });
        if (!hasSun) return false;
    }

    // 2. Check Battlefield Side ForceFields / Notes
    if (battlefield) {
        const sideData = targetSide === 'player' ? battlefield.playerSide : battlefield.foeSide;
        if (sideData) {
            const inFf = sideData.forceFields?.some(
                (ff) => ff?.name?.toLowerCase().includes(cleanAbility) && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            );
            const inExtraFf = sideData.extraForceFields?.some(
                (ff) => ff?.name?.toLowerCase().includes(cleanAbility) && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            );
            const inOther = Boolean(sideData.other && sideData.other.toLowerCase().includes(cleanAbility));
            const inExtraOther = Boolean(sideData.extraOther?.some((o) => o?.toLowerCase().includes(cleanAbility)));
            if (inFf || inExtraFf || inOther || inExtraOther) {
                return true;
            }
        }

        if (cleanAbility === 'neutralizing gas') {
            if (
                battlefield.other?.name?.toLowerCase().includes('neutralizing gas') &&
                (battlefield.other.remainingRounds > 0 || battlefield.other.remainingRounds === -1)
            ) {
                return true;
            }
            if (
                battlefield.extraOther?.some(
                    (o) => o?.name?.toLowerCase().includes('neutralizing gas') && (o.remainingRounds > 0 || o.remainingRounds === -1)
                )
            ) {
                return true;
            }
        }
    }

    // 3. Check active round combatants in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                if (activeRound?.combatants && activeRound.combatants.length > 0) {
                    const allCombatants = activeRound.combatants;

                    let activeCharState: CharacterState | null = null;
                    try {
                        activeCharState = useCharacterStore.getState();
                    } catch {
                        // Ignore if store not ready
                    }

                    // Combatants in the PC cannot receive or be affected by auras
                    if (targetId) {
                        const matchedTargetCombatant = allCombatants.find((c) => matchesTarget(c, targetId));
                        if (matchedTargetCombatant && isCombatantInPc(matchedTargetCombatant, activeCharState?.pcData)) {
                            return false;
                        }
                    }

                    const isCombatantAbilityActive = (c: CombatantRowData): boolean => {
                        if (isCombatantInPc(c, activeCharState?.pcData)) {
                            return false;
                        }
                        if (activeCharState) {
                            const activeTokenId = activeCharState.tokenId;
                            const activeEntityId = activeCharState.identity?.entityId;
                            if (
                                (activeTokenId && (c.tokenId === activeTokenId || c.id === activeTokenId)) ||
                                (activeEntityId && (c.entityId === activeEntityId || c.id === activeEntityId))
                            ) {
                                return activeCharState.identity?.abilityActive !== false;
                            }
                        }
                        return c.abilityActive !== false;
                    };

                    const getCombatantTargets = (c: CombatantRowData): string[] | undefined => {
                        if (activeCharState) {
                            const activeTokenId = activeCharState.tokenId;
                            const activeEntityId = activeCharState.identity?.entityId;
                            if (
                                (activeTokenId && (c.tokenId === activeTokenId || c.id === activeTokenId)) ||
                                (activeEntityId && (c.entityId === activeEntityId || c.id === activeEntityId))
                            ) {
                                if (activeCharState.identity?.abilityTargetIds !== undefined) {
                                    return activeCharState.identity.abilityTargetIds;
                                }
                            }
                        }
                        return c.abilityTargetIds;
                    };

                    const potentialSources = allCombatants.filter((c) => {
                        if (c.isFainted) return false;
                        if (isCombatantInPc(c, activeCharState?.pcData)) return false;
                        if (!isCombatantAbilityActive(c)) return false;
                        const cAb = (c.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
                        return cAb === cleanAbility;
                    });

                    for (const source of potentialSources) {
                        const sourceTags = source.abilityTags || getKnownAbility(source.ability || '')?.tags || '';
                        const stance = getAbilityTargetStance(source.ability || cleanAbility, sourceTags);
                        if (stance === 'none') {
                            continue;
                        }

                        const sourceIsPlayer = typeof source.isPlayerSide === 'boolean' ? source.isPlayerSide : !source.isNPC;
                        const sourceSide: 'player' | 'foe' = sourceIsPlayer ? 'player' : 'foe';

                        // Verify stance match
                        if (stance === 'foes') {
                            if (sourceSide === targetSide) continue;
                        } else if (stance === 'allies-only' || stance === 'allies-and-self') {
                            if (sourceSide !== targetSide) continue;
                        } else if (stance === 'all-except-self' || stance === 'all-on-field') {
                            // Both sides are eligible
                        }

                        // Check Neutralizing Gas suppression of source (unless source itself is Neutralizing Gas)
                        if (cleanAbility !== 'neutralizing gas') {
                            const sourceIdentifiers = [source.id, source.tokenId, source.entityId, source.name].filter(
                                Boolean
                            ) as string[];
                            if (isTargetAffectedByAbility(sourceIdentifiers, sourceSide, 'neutralizing gas', battlefield)) {
                                continue;
                            }
                        }

                        const isTargetSelf = matchesTarget(source, targetId);

                        // If allies-only or all-except-self, source itself is never affected
                        if ((stance === 'allies-only' || stance === 'all-except-self') && isTargetSelf) {
                            continue;
                        }

                        // Check explicit targeting configuration:
                        // If configuredTargets is empty ([]) or undefined, treat it as 0 targets selected (do NOT fall back to auto-targeting candidates)
                        const configuredTargets = getCombatantTargets(source);
                        if (!configuredTargets || configuredTargets.length === 0) {
                            continue;
                        }

                        if (isTargetInList(configuredTargets, targetId, allCombatants)) {
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[abilityTargetingUtils] Failed to check ability targets from storage:', e);
        }
    }

    return false;
}

/**
 * Losslessly detects whether a side or specific character is suppressed by active opposing Neutralizing Gas,
 * delegating to the unified isTargetAffectedByAbility engine.
 */
export function isAbilitySuppressedByField(
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined,
    targetId: string | string[] = ''
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;
    return isTargetAffectedByAbility(targetId, side, 'neutralizing gas', battlefield);
}

/**
 * Checks whether a combatant/target on a given side is affected by an opposing active Intimidate.
 */
export function isTargetUnderIntimidate(
    targetId: string,
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;
    return isTargetAffectedByAbility(targetId, side, 'intimidate', battlefield);
}

/**
 * Checks whether an ally on the same side has an active aura ability in range.
 */
export function isAllyAuraActive(
    abilityName: string,
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined,
    userAbility?: string,
    userAbilityActive?: boolean
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;

    const cleanAbility = abilityName.trim().toLowerCase();

    if (userAbility && userAbilityActive !== false) {
        let inPc = false;
        try {
            const char = useCharacterStore.getState();
            if (char) {
                const dummyCombatant: CombatantRowData = {
                    id: char.identity.entityId || char.tokenId || '',
                    entityId: char.identity.entityId,
                    tokenId: char.tokenId || undefined,
                    name: char.identity.nickname || char.identity.species || '',
                    actions: [
                        { text: '', status: 'none' },
                        { text: '', status: 'none' },
                        { text: '', status: 'none' },
                        { text: '', status: 'none' },
                        { text: '', status: 'none' }
                    ],
                    evadeUsed: false,
                    clashUsed: false,
                    heldItem: '',
                    initiative: '0',
                    status: 'Normal'
                };
                inPc = isCombatantInPc(dummyCombatant, char.pcData);
            }
        } catch {
            // ignore
        }

        if (!inPc) {
            const cleanUserAb = userAbility.replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            if (cleanUserAb === cleanAbility) {
                if (!isAbilitySuppressedByField(side, battlefield)) {
                    return true;
                }
            }
        }
    }

    return isTargetAffectedByAbility('', side, abilityName, battlefield);
}

/**
 * Checks whether an opposing combatant on the field has an active aura ability.
 */
export function isOpposingAuraActive(
    abilityName: string,
    side: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined
): boolean {
    if (!side || (side !== 'player' && side !== 'foe')) return false;
    return isTargetAffectedByAbility('', side, abilityName, battlefield);
}

/**
 * Evaluates whether Victory Star is active for the character (either from self or an ally in range).
 */
export function isVictoryStarActive(state: CharacterState): boolean {
    const sideName = resolveCharacterSide(state);
    const resolvedSide: 'player' | 'foe' = sideName !== 'none' ? sideName : state.identity.isNPC ? 'foe' : 'player';
    const rollerId = state.identity.entityId || state.tokenId || state.identity.nickname || state.identity.species || '';
    return isTargetAffectedByAbility(rollerId, resolvedSide, 'victory star', state.activeBattlefield || null);
}

/**
 * Resolves target combatant name and held items for item-detecting abilities like Frisk.
 * Prioritizes:
 * 1) Active character sheet (if matches target) - equipped bag items + identity held slots
 * 2) Battle Organizer combatants in pkr_battle_organizer_data (combatant.heldItem)
 * 3) Local character / token metadata fallback via parseHeldItemsFromMetadata
 * 4) Unique items joined by ', ' or 'None'
 */
export function resolveTargetHeldItemInfo(
    targetId: string,
    charState?: CharacterState | null
): { targetName: string; heldItems: string } {
    if (!targetId) {
        return { targetName: '', heldItems: 'None' };
    }

    let resolvedChar = charState;
    if (resolvedChar === undefined) {
        try {
            resolvedChar = useCharacterStore.getState();
        } catch {
            resolvedChar = null;
        }
    }

    // 1) Active character sheet match
    if (resolvedChar) {
        const activeTokenId = resolvedChar.tokenId;
        const activeEntityId = resolvedChar.identity?.entityId;
        const activeName = resolvedChar.identity?.nickname || resolvedChar.identity?.species || 'Active Character';
        const isSelf = matchesTarget(
            { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
            targetId
        );

        if (isSelf) {
            const items: string[] = [];
            const addUnique = (item?: string) => {
                const trimmed = (item || '').trim();
                if (trimmed && !items.includes(trimmed)) {
                    items.push(trimmed);
                }
            };

            addUnique(resolvedChar.identity?.combat);
            addUnique(resolvedChar.identity?.social);
            addUnique(resolvedChar.identity?.hand);

            (resolvedChar.inventory || [])
                .filter((i) => i && (i.active === true || (i.active as unknown) === 'true'))
                .map((i) => i.name)
                .forEach(addUnique);

            return {
                targetName: activeName,
                heldItems: items.length > 0 ? items.join(', ') : 'None'
            };
        }
    }

    let fallbackTargetName = '';

    // 2) Battle Organizer combatants in pkr_battle_organizer_data
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const rawBo = window.localStorage.getItem('pkr_battle_organizer_data');
            if (rawBo) {
                const bo = JSON.parse(rawBo) as BattleOrganizerState;
                const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
                if (activeRound?.combatants) {
                    const combatant = activeRound.combatants.find((c) => matchesTarget(c, targetId));
                    if (combatant) {
                        fallbackTargetName = combatant.name || targetId;
                        if (combatant.heldItem !== undefined) {
                            const trimmed = combatant.heldItem.trim();
                            if (trimmed) {
                                return { targetName: fallbackTargetName, heldItems: trimmed };
                            }
                        }
                        if ((combatant as unknown as Record<string, unknown>).metadata) {
                            const parsed = parseHeldItemsFromMetadata(
                                (combatant as unknown as Record<string, unknown>).metadata as Record<string, unknown>
                            );
                            if (parsed) {
                                return { targetName: fallbackTargetName, heldItems: parsed };
                            }
                        }
                        // Note: If heldItem is empty string "" or metadata has no items, continue falling through to pcData / local characters
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    // 3) Local character / token metadata fallback via parseHeldItemsFromMetadata
    // 3a. Check pcData summaries
    if (resolvedChar?.pcData?.pokemonSummaries) {
        const summary = Object.values(resolvedChar.pcData.pokemonSummaries).find(
            (s) =>
                s.entityId === targetId ||
                s.mapTokenId === targetId ||
                s.savedTokenItem?.id === targetId ||
                s.name?.trim().toLowerCase() === targetId.trim().toLowerCase()
        );
        if (summary) {
            const targetName = summary.name || summary.species || fallbackTargetName || targetId;
            if (summary.heldItem) {
                const trimmed = summary.heldItem.trim();
                if (trimmed) return { targetName, heldItems: trimmed };
            }
            const meta = (summary.fullMetadata || summary.savedTokenItem?.metadata) as Record<string, unknown> | undefined;
            if (meta) {
                const parsed = parseHeldItemsFromMetadata(meta);
                if (parsed) {
                    return {
                        targetName,
                        heldItems: parsed
                    };
                }
            }
        }
    }

    // 3b. Check local characters
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const rawChars = window.localStorage.getItem('pkr_local_characters');
            if (rawChars) {
                const localChars = JSON.parse(rawChars);
                if (Array.isArray(localChars)) {
                    const found = localChars.find(
                        (c: { id?: string; name?: string; metadata?: Record<string, unknown> }) =>
                            matchesTarget({ id: c.id, name: c.name }, targetId)
                    );
                    if (found) {
                        const targetName = found.name || fallbackTargetName || targetId;
                        const parsed = found.metadata ? parseHeldItemsFromMetadata(found.metadata) : '';
                        if (parsed) {
                            return {
                                targetName,
                                heldItems: parsed
                            };
                        }
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    // 4) Fallback
    return {
        targetName: fallbackTargetName || targetId,
        heldItems: 'None'
    };
}

/**
 * Asynchronously resolves target combatant name and held items for item-detecting abilities like Frisk.
 * Queries live OBR scene tokens first if OBR is available, then falls back to Battle Organizer,
 * pcData, and local characters.
 */
export async function resolveTargetHeldItemInfoAsync(
    targetId: string,
    charState?: CharacterState | null
): Promise<{ targetName: string; heldItems: string }> {
    if (!targetId) {
        return { targetName: '', heldItems: 'None' };
    }

    let resolvedChar = charState;
    if (resolvedChar === undefined) {
        try {
            resolvedChar = useCharacterStore.getState();
        } catch {
            resolvedChar = null;
        }
    }

    // 1) Active character sheet match (isSelf)
    if (resolvedChar) {
        const activeTokenId = resolvedChar.tokenId;
        const activeEntityId = resolvedChar.identity?.entityId;
        const activeName = resolvedChar.identity?.nickname || resolvedChar.identity?.species || 'Active Character';
        const isSelf = matchesTarget(
            { id: activeEntityId, tokenId: activeTokenId || undefined, entityId: activeEntityId, name: activeName },
            targetId
        );

        if (isSelf) {
            return resolveTargetHeldItemInfo(targetId, resolvedChar);
        }
    }

    // 2) Live OBR Scene Items
    let sceneTargetName = '';
    if (OBR.isAvailable) {
        try {
            const items = await OBR.scene.items.getItems();
            for (const item of items) {
                const rawMeta = (
                    item.metadata?.[STATS_META_ID] ||
                    item.metadata?.['pokerole-extension/stats'] ||
                    item.metadata?.['pokerole-pmd-extension/stats'] ||
                    item.metadata
                ) as Record<string, unknown> | undefined;
                const stateObj = (rawMeta?.state || rawMeta) as Record<string, unknown> | undefined;
                const identityObj = (stateObj?.identity || rawMeta?.identity || {}) as Record<string, unknown>;

                const candName = String(
                    rawMeta?.name ||
                    rawMeta?.nickname ||
                    rawMeta?.species ||
                    identityObj.nickname ||
                    identityObj.species ||
                    identityObj.name ||
                    item.name ||
                    ''
                );
                const candId = String(rawMeta?.id || rawMeta?.entityId || identityObj.entityId || item.id || '');
                const candEntityId = String(rawMeta?.entityId || identityObj.entityId || '');

                if (
                    matchesTarget(
                        { id: candId, tokenId: item.id, entityId: candEntityId || undefined, name: candName },
                        targetId
                    )
                ) {
                    const tokenName = candName || item.name || targetId;
                    sceneTargetName = tokenName;
                    const parsed =
                        parseHeldItemsFromMetadata((item.metadata || {}) as Record<string, unknown>) ||
                        parseHeldItemsFromMetadata((rawMeta || {}) as Record<string, unknown>) ||
                        (typeof rawMeta?.heldItem === 'string' ? rawMeta.heldItem.trim() : '');
                    if (parsed) {
                        return { targetName: tokenName, heldItems: parsed };
                    }
                    break;
                }
            }
        } catch (e) {
            console.warn('[AbilityTargeting] Failed to query OBR scene items for held items:', e);
        }
    }

    // 3) Fallback to Battle Organizer, pcData, and local characters
    const fallback = resolveTargetHeldItemInfo(targetId, resolvedChar);
    return {
        targetName:
            fallback.targetName && fallback.targetName !== targetId
                ? fallback.targetName
                : sceneTargetName || fallback.targetName || targetId,
        heldItems: fallback.heldItems
    };
}
