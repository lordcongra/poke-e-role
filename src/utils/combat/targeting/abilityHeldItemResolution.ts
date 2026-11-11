import OBR from '@owlbear-rodeo/sdk';
import type { BattleOrganizerState } from '@/types/battleOrganizerTypes';
import type { CharacterState } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { parseHeldItemsFromMetadata } from '@/components/modals/battleOrganizer/battleOrganizerUtils';
import { STATS_META_ID } from '@/utils/graphics/graphicsManager';
import { extractCharacterName } from '@/utils/combat/initiativeHelpers';
import { matchesTarget } from './abilityTargetStances';
import { readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';

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

    // 2) Battle Organizer combatants in room-scoped storage
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const rawBo = readBattleOrganizerStateRaw();
            if (rawBo) {
                const bo = JSON.parse(rawBo) as BattleOrganizerState;
                const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
                if (activeRound?.combatants) {
                    const combatant = activeRound.combatants.find((c) => matchesTarget(c, targetId));
                    if (combatant) {
                        const combatantMeta = (combatant as { metadata?: Record<string, unknown> }).metadata;
                        fallbackTargetName = combatantMeta
                            ? extractCharacterName(combatantMeta, combatant.name || targetId)
                            : (combatant.name || targetId);
                        if (combatant.heldItem !== undefined) {
                            const trimmed = combatant.heldItem.trim();
                            if (trimmed) {
                                return { targetName: fallbackTargetName, heldItems: trimmed };
                            }
                        }
                        if (combatantMeta) {
                            const parsed = parseHeldItemsFromMetadata(combatantMeta);
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

                const candName = extractCharacterName(
                    (rawMeta || item.metadata) as Record<string, unknown>,
                    item.name || ''
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
            sceneTargetName && sceneTargetName !== targetId
                ? sceneTargetName
                : fallback.targetName && fallback.targetName !== targetId
                  ? fallback.targetName
                  : targetId,
        heldItems: fallback.heldItems
    };
}

