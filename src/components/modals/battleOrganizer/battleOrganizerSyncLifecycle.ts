import type React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import type { LocalCharacter } from '@/utils/sync/storageAdapter';
import {
    getBattleOrganizerStorageKey,
    getEffectiveRoomId,
    readBattleOrganizerStateRaw
} from '@/utils/sync/roomScopedStorage';
import { extractTokenImage, extractCharacterName } from '@/utils/combat/initiativeHelpers';
import {
    LEGACY_OBR_SCENE_META_KEY,
    parseStatusesFromMetadata,
    parseHealthAndWillFromMetadata,
    sanitizeBattlefield,
    createDefaultState
} from '@/components/modals/battleOrganizer/battleOrganizerUtils';
import type {
    BattleOrganizerSettings,
    BattleOrganizerState,
    BattleRoundData,
    CombatantRowData
} from '@/types/battleOrganizerTypes';

/**
 * Reloads room-scoped Battle Organizer state or migrates legacy scene metadata once OBR.onReady fires.
 */
export async function syncRoomBattleOrganizerOnReady(params: {
    initialRoomIdRef: React.MutableRefObject<string>;
    lastSavedJsonRef: React.MutableRefObject<string>;
    setState: React.Dispatch<React.SetStateAction<BattleOrganizerState>>;
    isMounted: () => boolean;
}): Promise<void> {
    const { initialRoomIdRef, lastSavedJsonRef, setState, isMounted } = params;
    try {
        const resolvedRoomId = getEffectiveRoomId();
        const roomChangedSinceMount = resolvedRoomId !== initialRoomIdRef.current;
        initialRoomIdRef.current = resolvedRoomId;

        const currentLocal = readBattleOrganizerStateRaw(resolvedRoomId);
        if (currentLocal) {
            if (roomChangedSinceMount) {
                try {
                    const parsed = JSON.parse(currentLocal) as BattleOrganizerState;
                    if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                        const sanitized: BattleOrganizerState = {
                            ...parsed,
                            battlefield: sanitizeBattlefield(parsed.battlefield)
                        };
                        lastSavedJsonRef.current = JSON.stringify(sanitized);
                        if (sanitized.battlefield) {
                            useCharacterStore.getState().setActiveBattlefield(sanitized.battlefield);
                        }
                        if (isMounted()) setState(sanitized);
                    }
                } catch (reloadErr) {
                    console.warn('[BattleOrganizer] Failed to reload room-scoped state on OBR ready:', reloadErr);
                }
            }
            return;
        }

        let migratedFromScene = false;
        const isReady = await OBR.scene.isReady();
        if (isReady) {
            const metadata = await OBR.scene.getMetadata();
            const rawLegacySceneData = metadata[LEGACY_OBR_SCENE_META_KEY];
            if (typeof rawLegacySceneData === 'string' && rawLegacySceneData.trim()) {
                try {
                    const parsed = JSON.parse(rawLegacySceneData) as BattleOrganizerState;
                    if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                        localStorage.setItem(getBattleOrganizerStorageKey(resolvedRoomId), rawLegacySceneData);
                        lastSavedJsonRef.current = rawLegacySceneData;
                        migratedFromScene = true;
                        if (isMounted()) setState(parsed);
                    }
                } catch (migErr) {
                    console.warn('[BattleOrganizer] Failed to read legacy scene data:', migErr);
                }
            }
        }
        if (!migratedFromScene && roomChangedSinceMount) {
            const fresh = createDefaultState();
            try {
                lastSavedJsonRef.current = JSON.stringify(fresh);
            } catch {
                lastSavedJsonRef.current = '';
            }
            useCharacterStore.getState().setActiveBattlefield(fresh.battlefield);
            if (isMounted()) setState(fresh);
        }
    } catch (e) {
        console.warn('[BattleOrganizer] Legacy scene read skipped:', e);
    }
}

/**
 * Pure helper to merge standalone LocalCharacter updates into the active Battle Organizer round.
 */
export function applyStandaloneCharsToBattleOrganizerState(
    prev: BattleOrganizerState,
    localChars: LocalCharacter[],
    settings: BattleOrganizerSettings,
    pendingTokenSync: Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
): BattleOrganizerState {
    const currentRound = prev.rounds[prev.activeRoundIndex];
    if (!currentRound) return prev;

    let hasChanges = false;
    const newCombatants = currentRound.combatants.map((combatant) => {
        const matchingChar = localChars.find((c) => {
            if (combatant.tokenId && c.id === combatant.tokenId) return true;
            if (!combatant.tokenId && combatant.name.trim()) {
                const meta = (c.metadata || {}) as Record<string, unknown>;
                const target = combatant.name.toLowerCase().trim();
                return (
                    extractCharacterName(meta, c.name).toLowerCase().trim() === target ||
                    c.name.toLowerCase().trim() === target
                );
            }
            return false;
        });

        if (!matchingChar) return combatant;
        const pending = pendingTokenSync.get(matchingChar.id);
        if (pending) {
            if (Date.now() < pending.until) return combatant;
            pendingTokenSync.delete(matchingChar.id);
        }

        const meta = (matchingChar.metadata || {}) as Record<string, unknown>;
        const resolvedName = extractCharacterName(meta, matchingChar.name);
        const resolvedImg = extractTokenImage(meta) || combatant.image;
        const { statusText, isFainted: statusFainted } = parseStatusesFromMetadata(meta);
        const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
            parseHealthAndWillFromMetadata(meta);

        const stateObj = (meta.state || meta) as Record<string, unknown>;
        const identityObj = (stateObj?.identity || meta.identity || {}) as Record<string, unknown>;
        const metaAbility = String(identityObj.ability || meta.ability || '');
        const metaAbilityActive =
            meta['ability-active'] !== undefined
                ? Boolean(meta['ability-active'])
                : identityObj.abilityActive !== false;
        const metaAbilityBoostLevel =
            meta['ability-boost-level'] !== undefined
                ? Number(meta['ability-boost-level'])
                : typeof identityObj.abilityBoostLevel === 'number'
                  ? identityObj.abilityBoostLevel
                  : undefined;
        const metaAbilityBoostActive =
            meta['ability-boost-active'] !== undefined
                ? Boolean(meta['ability-boost-active'])
                : typeof identityObj.abilityBoostActive === 'boolean'
                  ? identityObj.abilityBoostActive
                  : undefined;
        const metaAbilityChoiceIndex =
            meta['ability-choice-index'] !== undefined
                ? Number(meta['ability-choice-index'])
                : typeof identityObj.abilityChoiceIndex === 'number'
                  ? identityObj.abilityChoiceIndex
                  : undefined;

        const nextIsFainted =
            statusFainted || (hpCurr <= 0 && hpMax > 0)
                ? true
                : hpCurr > 0 && !statusFainted && combatant.isFainted
                  ? false
                  : combatant.isFainted;

        const nextEvade = settings.autoSyncActions
            ? meta['evasions-used'] === true || meta['evasions-used'] === 'true'
            : combatant.evadeUsed;
        const nextClash = settings.autoSyncActions
            ? meta['clashes-used'] === true || meta['clashes-used'] === 'true'
            : combatant.clashUsed;

        const nextCombatant: CombatantRowData = {
            ...combatant,
            name: resolvedName || combatant.name,
            image: resolvedImg || combatant.image,
            status: statusText || combatant.status,
            isFainted: nextIsFainted,
            hpCurr,
            hpMax,
            willCurr,
            willMax,
            tempHp,
            tempWill,
            activeTransformation,
            ability: metaAbility || combatant.ability,
            abilityActive: metaAbilityActive,
            abilityBoostLevel: metaAbilityBoostLevel ?? combatant.abilityBoostLevel,
            abilityBoostActive: metaAbilityBoostActive ?? combatant.abilityBoostActive,
            abilityChoiceIndex: metaAbilityChoiceIndex ?? combatant.abilityChoiceIndex,
            tokenId: matchingChar.id,
            evadeUsed: nextEvade,
            clashUsed: nextClash
        };

        const rowChanged =
            nextCombatant.name !== combatant.name ||
            nextCombatant.image !== combatant.image ||
            nextCombatant.status !== combatant.status ||
            nextCombatant.isFainted !== combatant.isFainted ||
            nextCombatant.hpCurr !== combatant.hpCurr ||
            nextCombatant.hpMax !== combatant.hpMax ||
            nextCombatant.willCurr !== combatant.willCurr ||
            nextCombatant.willMax !== combatant.willMax ||
            nextCombatant.activeTransformation !== combatant.activeTransformation ||
            nextCombatant.evadeUsed !== combatant.evadeUsed ||
            nextCombatant.clashUsed !== combatant.clashUsed ||
            nextCombatant.ability !== combatant.ability ||
            nextCombatant.abilityActive !== combatant.abilityActive ||
            nextCombatant.abilityBoostLevel !== combatant.abilityBoostLevel ||
            nextCombatant.abilityBoostActive !== combatant.abilityBoostActive ||
            nextCombatant.abilityChoiceIndex !== combatant.abilityChoiceIndex ||
            !combatant.tokenId;

        if (!rowChanged) return combatant;
        hasChanges = true;
        return nextCombatant;
    });

    if (!hasChanges) return prev;
    const updatedRound: BattleRoundData = { ...currentRound, combatants: newCombatants };
    return {
        ...prev,
        rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
    };
}

