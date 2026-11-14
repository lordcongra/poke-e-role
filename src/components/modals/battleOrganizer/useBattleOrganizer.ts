import { useState, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId } from '../../../utils/sync/obr';
import {
    computeCombatantHpUpdate,
    computeCombatantWillUpdate,
    pickAllowlistedCombatantPatch,
    sendBattleOrganizerCombatantPatch,
    sendBattleOrganizerFullSync
} from '@/components/modals/battleOrganizer/battleOrganizerSyncHelpers';
import {
    extractTokenImage,
    extractCharacterName,
    calculateBaseInitFromCharacterData,
    formatInitiativeDisplay
} from '../../../utils/combat/initiativeHelpers';
import { addRollLogEntry, assignInitiative } from '../../../utils/combat/diceRoller';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import { getBattleOrganizerStorageKey, readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';
import {
    LEGACY_OBR_SCENE_META_KEY,
    parseStatusesFromMetadata,
    mapStatusTextToStatusItems,
    resolveCombatantTokenId,
    parseHealthAndWillFromMetadata,
    parseHeldItemsFromMetadata,
    parseRollLogEntry,
    createDefaultTimerEffect,
    createDefaultActionSlot,
    createDefaultActions,
    createDefaultCombatant,
    compareCombatantsByInitiative,
    createDefaultBattlefield,
    sanitizeBattlefield,
    createDefaultState
} from './battleOrganizerUtils';
import { useBattleOrganizerSync } from './useBattleOrganizerSync';
import { useBattleOrganizerRoundOps } from './useBattleOrganizerRoundOps';
import { useBattleOrganizerTokenOps } from './useBattleOrganizerTokenOps';

export {
    LEGACY_OBR_SCENE_META_KEY,
    parseStatusesFromMetadata,
    mapStatusTextToStatusItems,
    resolveCombatantTokenId,
    parseHealthAndWillFromMetadata,
    parseHeldItemsFromMetadata,
    parseRollLogEntry,
    createDefaultTimerEffect,
    createDefaultActionSlot,
    createDefaultActions,
    createDefaultCombatant,
    createDefaultBattlefield,
    sanitizeBattlefield,
    createDefaultState
};

export function useBattleOrganizer() {
    const [state, setState] = useState<BattleOrganizerState>(() => {
        try {
            const saved = readBattleOrganizerStateRaw();
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                    return {
                        ...parsed,
                        battlefield: sanitizeBattlefield(parsed.battlefield)
                    };
                }
            }
        } catch (e) {
            console.error('[BattleOrganizer] Failed to load local initial state:', e);
        }
        return createDefaultState();
    });

    const lastSavedJsonRef = useRef<string>('');
    if (!lastSavedJsonRef.current) {
        try {
            lastSavedJsonRef.current = JSON.stringify(state);
        } catch {
            lastSavedJsonRef.current = '';
        }
    }

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTokenFingerprintsRef = useRef<Map<string, string>>(new Map());
    const processedRollIdsRef = useRef<Set<string>>(new Set());
    const lastMoveRollTimestampRef = useRef<Map<string, number>>(new Map());
    const tokenSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const pendingTokenSyncRef = useRef<
        Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
    >(new Map());

    // 1. Peer-to-peer sync, localStorage persistence, and real-time roll/storage listeners
    const { updateState } = useBattleOrganizerSync({
        state,
        setState,
        lastSavedJsonRef,
        saveTimerRef,
        processedRollIdsRef,
        lastMoveRollTimestampRef,
        tokenSyncTimersRef,
        pendingTokenSyncRef
    });

    // 2. Round progression & Battlefield state modifiers
    const {
        addRound,
        duplicateRound,
        deleteRound,
        setActiveRoundIndex,
        advanceRound,
        updateRoundNumber,
        updateBattlefield,
        updateBattlefieldWeather,
        updateBattlefieldTerrain,
        updateBattlefieldOther,
        updatePlayerSide,
        updateFoeSide,
        updateEndOfRoundEffects,
        activateFieldEffectFromMove,
        clearBattlefield
    } = useBattleOrganizerRoundOps({ updateState });

    // 3. Token & Initiative syncing operations
    const { refreshTokenStats, pullFromInitiative, syncToSheets, syncCombatantToToken } = useBattleOrganizerTokenOps({
        state,
        updateState,
        lastTokenFingerprintsRef,
        tokenSyncTimersRef,
        pendingTokenSyncRef
    });

    // --- Combatant Row Updates ---
    const addCombatant = useCallback(() => {
        updateState((prev) => {
            const currentRound = prev.rounds[prev.activeRoundIndex];
            if (!currentRound) return prev;
            const newCombatant = createDefaultCombatant('', '', true);
            const updatedRound: BattleRoundData = {
                ...currentRound,
                combatants: [...currentRound.combatants, newCombatant]
            };
            const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
            return { ...prev, rounds: newRounds };
        });
    }, [updateState]);

    const updateCombatant = useCallback(
        (updated: CombatantRowData) => {
            const currentRound = state.rounds[state.activeRoundIndex];
            const prevCombatant = currentRound?.combatants.find((c) => c.id === updated.id);

            updateState((prev) => {
                const round = prev.rounds[prev.activeRoundIndex];
                if (!round) return prev;
                const updatedCombatants = round.combatants.map((c) => (c.id === updated.id ? updated : c));
                const updatedRound: BattleRoundData = {
                    ...round,
                    combatants: updatedCombatants
                };
                const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));

                let nextBf = prev.battlefield;
                if (
                    !prevCombatant ||
                    prevCombatant.isPlayerSide !== updated.isPlayerSide ||
                    prevCombatant.isFainted !== updated.isFainted
                ) {
                    const playerTargets = updatedCombatants.filter((c) => c.isPlayerSide && !c.isFainted).length;
                    const foeTargets = updatedCombatants.filter((c) => !c.isPlayerSide && !c.isFainted).length;
                    nextBf = {
                        ...prev.battlefield,
                        playerTargets,
                        foeTargets
                    };
                }

                return { ...prev, rounds: newRounds, battlefield: nextBf };
            });

            if (prevCombatant) {
                const statusChanged =
                    prevCombatant.status !== updated.status || prevCombatant.isFainted !== updated.isFainted;
                const hpChanged = prevCombatant.hpCurr !== updated.hpCurr && typeof updated.hpCurr === 'number';
                const willChanged = prevCombatant.willCurr !== updated.willCurr && typeof updated.willCurr === 'number';
                const evadeChanged = prevCombatant.evadeUsed !== updated.evadeUsed;
                const clashChanged = prevCombatant.clashUsed !== updated.clashUsed;
                const actionsChanged = JSON.stringify(prevCombatant.actions) !== JSON.stringify(updated.actions);
                const initiativeChanged = prevCombatant.initiative !== updated.initiative;
                const sideChanged = prevCombatant.isPlayerSide !== updated.isPlayerSide;
                const abilityActiveChanged = prevCombatant.abilityActive !== updated.abilityActive;
                const abilityTargetsChanged =
                    JSON.stringify(prevCombatant.abilityTargetIds) !== JSON.stringify(updated.abilityTargetIds);
                const abilityBoostChanged =
                    prevCombatant.abilityBoostActive !== updated.abilityBoostActive ||
                    prevCombatant.abilityBoostLevel !== updated.abilityBoostLevel;
                const abilityChoiceChanged =
                    prevCombatant.abilityChoiceIndex !== updated.abilityChoiceIndex;

                if (
                    statusChanged ||
                    hpChanged ||
                    willChanged ||
                    evadeChanged ||
                    clashChanged ||
                    actionsChanged ||
                    initiativeChanged ||
                    sideChanged ||
                    abilityActiveChanged ||
                    abilityTargetsChanged ||
                    abilityBoostChanged ||
                    abilityChoiceChanged
                ) {
                    syncCombatantToToken(updated, {
                        syncStatus: statusChanged,
                        syncHp: hpChanged,
                        syncWill: willChanged,
                        syncEvade: evadeChanged,
                        syncClash: clashChanged,
                        syncActions: actionsChanged,
                        syncInitiative: initiativeChanged,
                        syncSide: sideChanged,
                        syncAbilityActive: abilityActiveChanged,
                        syncAbilityTargets: abilityTargetsChanged,
                        syncAbilityBoost: abilityBoostChanged,
                        syncAbilityChoice: abilityChoiceChanged
                    });
                }
            }

            if (!isStandaloneMode && OBR.isAvailable && useCharacterStore.getState().role !== 'GM') {
                const patch = pickAllowlistedCombatantPatch(updated, prevCombatant);
                if (Object.keys(patch).length > 0) {
                    void sendBattleOrganizerCombatantPatch({
                        roundIndex: state.activeRoundIndex,
                        combatantId: updated.id,
                        tokenId: updated.tokenId,
                        entityId: updated.entityId,
                        patch
                    });
                }
            }
        },
        [state.rounds, state.activeRoundIndex, updateState, syncCombatantToToken]
    );

    const deleteCombatant = useCallback(
        (id: string) => {
            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;
                const toDelete = currentRound.combatants.find((c) => c.id === id);
                const removedIds = new Set<string>();
                if (toDelete) {
                    if (toDelete.id) removedIds.add(toDelete.id);
                    if (toDelete.tokenId) removedIds.add(toDelete.tokenId);
                    if (toDelete.entityId) removedIds.add(toDelete.entityId);
                } else {
                    removedIds.add(id);
                }

                const updatedRound: BattleRoundData = {
                    ...currentRound,
                    combatants: currentRound.combatants
                        .filter((c) => c.id !== id)
                        .map((c) => {
                            if (c.abilityTargetIds && c.abilityTargetIds.length > 0) {
                                const nextTargets = c.abilityTargetIds.filter((tId) => !removedIds.has(tId));
                                if (nextTargets.length !== c.abilityTargetIds.length) {
                                    return { ...c, abilityTargetIds: nextTargets };
                                }
                            }
                            return c;
                        })
                };
                const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
                return { ...prev, rounds: newRounds };
            });
        },
        [updateState]
    );

    const rollCombatantInitiative = useCallback(
        async (combatantId: string) => {
            let tokenBaseInit: number | null = null;
            const currentRound = state.rounds[state.activeRoundIndex];
            const target = currentRound?.combatants.find((c) => c.id === combatantId);
            if (!target) return;

            const globalStore = useCharacterStore.getState();
            if (target.tokenId) {
                if (isStandaloneMode) {
                    try {
                        const localChars = await storageAdapter.getLocalCharacters();
                        const match = localChars.find((c) => c.id === target.tokenId);
                        if (match?.metadata) {
                            tokenBaseInit = calculateBaseInitFromCharacterData(match.metadata, globalStore);
                        }
                    } catch (e) {
                        console.warn('[BattleOrganizer] Failed to load local character for init roll:', e);
                    }
                } else if (OBR.isAvailable) {
                    try {
                        const items = await OBR.scene.items.getItems([target.tokenId]);
                        if (items.length > 0 && items[0].metadata) {
                            tokenBaseInit = calculateBaseInitFromCharacterData(items[0].metadata, globalStore);
                        }
                    } catch (e) {
                        console.warn('[BattleOrganizer] Failed to load OBR item for init roll:', e);
                    }
                }
            }

            const base =
                tokenBaseInit !== null
                    ? tokenBaseInit
                    : target.baseInit !== undefined && target.baseInit > 0
                      ? target.baseInit
                      : 1;

            const roll = Math.floor(Math.random() * 6) + 1;
            const total = base + roll;

            let tiebreaker = 0;
            if (target.tokenId) {
                tiebreaker = await assignInitiative(target.tokenId, total, base);
            }

            const formattedInit = formatInitiativeDisplay(total, base, tiebreaker);
            const tiebreakerNote = tiebreaker > 0 ? ` (Tiebreaker: [${tiebreaker}])` : '';

            addRollLogEntry(
                `${target.name} rolled Initiative!`,
                `Total: ${total} (Base: ${base} + Roll: ${roll})${tiebreakerNote}`,
                target.image || '',
                target.name,
                target.name,
                target.tokenId,
                'init'
            );

            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                const updatedCombatants = currentRound.combatants.map((c) => {
                    if (c.id === combatantId) {
                        return {
                            ...c,
                            baseInit: base,
                            initiative: formattedInit
                        };
                    }
                    return c;
                });

                // Auto-sort combatants descending by initiative hierarchy
                const sortedCombatants = [...updatedCombatants].sort(compareCombatantsByInitiative);

                const updatedRound: BattleRoundData = {
                    ...currentRound,
                    combatants: sortedCombatants
                };

                const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
                return { ...prev, rounds: newRounds };
            });
        },
        [state.rounds, state.activeRoundIndex, updateState]
    );

    const sortCombatantsByInitiative = useCallback(() => {
        updateState((prev) => {
            const currentRound = prev.rounds[prev.activeRoundIndex];
            if (!currentRound) return prev;

            const sortedCombatants = [...currentRound.combatants].sort(compareCombatantsByInitiative);

            const updatedRound: BattleRoundData = {
                ...currentRound,
                combatants: sortedCombatants
            };

            const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
            return { ...prev, rounds: newRounds };
        });
    }, [updateState]);

    const openSheet = useCallback(
        async (combatant: CombatantRowData) => {
            try {
                const role = useCharacterStore.getState().role;
                if (!isStandaloneMode && role === 'PLAYER' && combatant.isNPC) {
                    return;
                }

                if (isStandaloneMode) {
                    const localChars = await storageAdapter.getLocalCharacters();
                    let match = localChars.find((c) => c.id === combatant.tokenId);
                    if (!match && combatant.name.trim()) {
                        match = localChars.find((c) => {
                            const meta = (c.metadata || {}) as Record<string, unknown>;
                            const resolvedName = extractCharacterName(meta, c.name);
                            return (
                                resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim() ||
                                c.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()
                            );
                        });
                    }

                    if (match) {
                        localStorage.setItem('pkr_active_character_id', match.id);
                        window.dispatchEvent(new CustomEvent('pkr-select-character', { detail: { id: match.id } }));
                        const store = useCharacterStore.getState();
                        setActiveTokenId(match.id);
                        store.setTokenData(match.id, 'GM');
                        store.loadFromOwlbear((match.metadata || {}) as Record<string, unknown>);
                        const tokenImgUrl =
                            combatant.image || extractTokenImage(match.metadata as Record<string, unknown>);
                        if (tokenImgUrl) store.setIdentity('tokenImageUrl', tokenImgUrl);
                    }
                    return;
                }

                if (OBR.isAvailable) {
                    let targetTokenId = combatant.tokenId;
                    if (!targetTokenId && combatant.name.trim()) {
                        const items = await OBR.scene.items.getItems((item) => {
                            if (item.layer !== 'CHARACTER') return false;
                            const meta = (item.metadata['pokerole-extension/stats'] || item.metadata) as Record<
                                string,
                                unknown
                            >;
                            const resolvedName = extractCharacterName(meta, item.name);
                            return (
                                resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim() ||
                                item.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()
                            );
                        });
                        if (items.length > 0) {
                            targetTokenId = items[0].id;
                            updateCombatant({ ...combatant, tokenId: items[0].id });
                        }
                    }

                    if (targetTokenId) {
                        await OBR.player.select([targetTokenId]);
                    }

                    try {
                        await OBR.action.open();
                    } catch (actionErr) {
                        console.warn('[BattleOrganizer] OBR.action.open failed or not available:', actionErr);
                    }
                }
            } catch (e) {
                console.error('[BattleOrganizer] Failed to open sheet for combatant:', e);
            }
        },
        [updateCombatant]
    );

    const clearAll = useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        const fresh = createDefaultState();
        let freshJson = '';
        try {
            freshJson = JSON.stringify(fresh);
        } catch (e) {
            console.error('[BattleOrganizer] Failed to serialize fresh reset state:', e);
        }

        lastSavedJsonRef.current = freshJson;

        try {
            localStorage.setItem(getBattleOrganizerStorageKey(), freshJson);
        } catch (e) {
            console.error('[BattleOrganizer] Failed to reset localStorage:', e);
        }

        setState(fresh);

        if (OBR.isAvailable) {
            void sendBattleOrganizerFullSync(fresh);

            OBR.scene.items
                .updateItems(
                    (item) => item.layer === 'CHARACTER',
                    (items) => {
                        items.forEach((item) => {
                            if (!item.metadata) item.metadata = {};
                            const stats = (item.metadata['pokerole-extension/stats'] || {}) as Record<string, unknown>;
                            stats['ability-target-ids'] = '';
                            item.metadata['pokerole-extension/stats'] = stats;

                            const pmdStats = (item.metadata['pokerole-pmd-extension/stats'] || {}) as Record<string, unknown>;
                            pmdStats['ability-target-ids'] = '';
                            item.metadata['pokerole-pmd-extension/stats'] = pmdStats;

                            item.metadata['ability-target-ids'] = '';
                        });
                    }
                )
                .catch((err) => {
                    console.warn('[BattleOrganizer] Failed to clear token ability-target-ids on clearAll:', err);
                });
        } else if (isStandaloneMode) {
            storageAdapter
                .getLocalCharacters()
                .then((chars) => {
                    chars.forEach((c) => {
                        storageAdapter
                            .saveCharacter(
                                c.id,
                                {
                                    'actions-used': 0,
                                    'evasions-used': false,
                                    'clashes-used': false,
                                    'ability-boost-active': false,
                                    'ability-boost-level': 0,
                                    'ability-target-ids': ''
                                },
                                'pokerole-extension/stats'
                            )
                            .catch(() => {});
                    });
                })
                .catch((e) => {
                    console.warn('[BattleOrganizer] Failed to clear characters ability-target-ids on clearAll:', e);
                });
        }

        const globalStore = useCharacterStore.getState();
        globalStore.updateTracker('actions', 0);
        globalStore.updateTracker('evade', false);
        globalStore.updateTracker('clash', false);
        globalStore.setIdentity('abilityTargetIds', []);
    }, []);

    const updateCombatantHp = useCallback(
        (combatantId: string, delta: number) => {
            const currentRoundSnapshot = state.rounds[state.activeRoundIndex];
            const targetBefore = currentRoundSnapshot?.combatants.find((c) => c.id === combatantId);

            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                let updatedCombatant: CombatantRowData | null = null;
                const newCombatants = currentRound.combatants.map((c) => {
                    if (c.id !== combatantId) return c;
                    updatedCombatant = computeCombatantHpUpdate(c, delta);
                    return updatedCombatant;
                });

                if (!updatedCombatant) return prev;

                const combatantToSync: CombatantRowData = updatedCombatant;
                const originalCombatant = currentRound.combatants.find((c) => c.id === combatantId);
                const statusChanged =
                    originalCombatant?.status !== combatantToSync.status ||
                    originalCombatant?.isFainted !== combatantToSync.isFainted;

                syncCombatantToToken(combatantToSync, {
                    syncHp: true,
                    syncStatus: statusChanged
                });

                const updatedRound: BattleRoundData = { ...currentRound, combatants: newCombatants };
                return {
                    ...prev,
                    rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                };
            });

            if (targetBefore && !isStandaloneMode && OBR.isAvailable && useCharacterStore.getState().role !== 'GM') {
                const updatedSnapshot = computeCombatantHpUpdate(targetBefore, delta);
                const patch = pickAllowlistedCombatantPatch(updatedSnapshot, targetBefore);
                if (Object.keys(patch).length > 0) {
                    void sendBattleOrganizerCombatantPatch({
                        roundIndex: state.activeRoundIndex,
                        combatantId: updatedSnapshot.id,
                        tokenId: updatedSnapshot.tokenId,
                        entityId: updatedSnapshot.entityId,
                        patch
                    });
                }
            }
        },
        [state.rounds, state.activeRoundIndex, updateState, syncCombatantToToken]
    );

    const updateCombatantWill = useCallback(
        (combatantId: string, delta: number) => {
            const currentRoundSnapshot = state.rounds[state.activeRoundIndex];
            const targetBefore = currentRoundSnapshot?.combatants.find((c) => c.id === combatantId);

            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                let updatedCombatant: CombatantRowData | null = null;
                const newCombatants = currentRound.combatants.map((c) => {
                    if (c.id !== combatantId) return c;
                    updatedCombatant = computeCombatantWillUpdate(c, delta);
                    return updatedCombatant;
                });

                if (!updatedCombatant) return prev;

                const combatantToSync: CombatantRowData = updatedCombatant;
                syncCombatantToToken(combatantToSync, {
                    syncWill: true
                });

                const updatedRound: BattleRoundData = { ...currentRound, combatants: newCombatants };
                return {
                    ...prev,
                    rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                };
            });

            if (targetBefore && !isStandaloneMode && OBR.isAvailable && useCharacterStore.getState().role !== 'GM') {
                const updatedSnapshot = computeCombatantWillUpdate(targetBefore, delta);
                const patch = pickAllowlistedCombatantPatch(updatedSnapshot, targetBefore);
                if (Object.keys(patch).length > 0) {
                    void sendBattleOrganizerCombatantPatch({
                        roundIndex: state.activeRoundIndex,
                        combatantId: updatedSnapshot.id,
                        tokenId: updatedSnapshot.tokenId,
                        entityId: updatedSnapshot.entityId,
                        patch
                    });
                }
            }
        },
        [state.rounds, state.activeRoundIndex, updateState, syncCombatantToToken]
    );

    return {
        state,
        battlefield: state.battlefield,
        rounds: state.rounds,
        activeRoundIndex: state.activeRoundIndex,
        currentRound: state.rounds[state.activeRoundIndex],
        setActiveRoundIndex,
        pullFromInitiative,
        syncToSheets,
        pushActionsToSheets: syncToSheets,
        refreshTokenStats,
        openSheet,
        addRound,
        duplicateRound,
        deleteRound,
        advanceRound,
        addCombatant,
        updateCombatant,
        updateCombatantHp,
        updateCombatantWill,
        deleteCombatant,
        rollCombatantInitiative,
        sortCombatantsByInitiative,
        updateBattlefield,
        updateBattlefieldWeather,
        updateBattlefieldTerrain,
        updateBattlefieldOther,
        updatePlayerSide,
        updateFoeSide,
        updateEndOfRoundEffects,
        updateRoundNumber,
        activateFieldEffectFromMove,
        clearBattlefield,
        clearAll
    };
}
