import { useState, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId } from '../../../utils/obr';
import {
    extractTokenImage,
    extractCharacterName,
    calculateBaseInitFromCharacterData
} from '../../../utils/initiativeHelpers';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import {
    STORAGE_KEY,
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
    createDefaultState
} from './battleOrganizerUtils';
import { useBattleOrganizerSync } from './useBattleOrganizerSync';
import { useBattleOrganizerRoundOps } from './useBattleOrganizerRoundOps';
import { useBattleOrganizerTokenOps } from './useBattleOrganizerTokenOps';

export {
    STORAGE_KEY,
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
    createDefaultState
};

export function useBattleOrganizer() {
    const [state, setState] = useState<BattleOrganizerState>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                    return parsed;
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
        updateEndOfRoundEffects
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
                const updatedRound: BattleRoundData = {
                    ...round,
                    combatants: round.combatants.map((c) => (c.id === updated.id ? updated : c))
                };
                const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
                return { ...prev, rounds: newRounds };
            });

            if (prevCombatant) {
                const statusChanged =
                    prevCombatant.status !== updated.status || prevCombatant.isFainted !== updated.isFainted;
                const hpChanged = prevCombatant.hpCurr !== updated.hpCurr && typeof updated.hpCurr === 'number';
                const willChanged = prevCombatant.willCurr !== updated.willCurr && typeof updated.willCurr === 'number';
                const evadeChanged = prevCombatant.evadeUsed !== updated.evadeUsed;
                const clashChanged = prevCombatant.clashUsed !== updated.clashUsed;

                if (statusChanged || hpChanged || willChanged || evadeChanged || clashChanged) {
                    syncCombatantToToken(updated, {
                        syncStatus: statusChanged,
                        syncHp: hpChanged,
                        syncWill: willChanged,
                        syncEvade: evadeChanged,
                        syncClash: clashChanged
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
                const updatedRound: BattleRoundData = {
                    ...currentRound,
                    combatants: currentRound.combatants.filter((c) => c.id !== id)
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

            if (target?.tokenId) {
                const globalStore = useCharacterStore.getState();
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

            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                const updatedCombatants = currentRound.combatants.map((c) => {
                    if (c.id === combatantId) {
                        const roll = Math.floor(Math.random() * 6) + 1;
                        let base =
                            tokenBaseInit !== null
                                ? tokenBaseInit
                                : c.baseInit !== undefined && c.baseInit > 0
                                  ? c.baseInit
                                  : 0;
                        if (base === 0) {
                            const parsed = parseInt(c.initiative, 10);
                            if (!isNaN(parsed) && parsed > 0 && parsed <= 12) {
                                base = parsed;
                            } else {
                                base = 1;
                            }
                        }
                        const total = base + roll;
                        return {
                            ...c,
                            baseInit: base,
                            initiative: String(total)
                        };
                    }
                    return c;
                });

                // Auto-sort combatants descending by initiative
                const sortedCombatants = [...updatedCombatants].sort((a, b) => {
                    const valA = parseFloat(a.initiative) || 0;
                    const valB = parseFloat(b.initiative) || 0;
                    return valB - valA;
                });

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

            const sortedCombatants = [...currentRound.combatants].sort((a, b) => {
                const valA = parseFloat(a.initiative) || 0;
                const valB = parseFloat(b.initiative) || 0;
                return valB - valA;
            });

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
                if (role === 'PLAYER' && combatant.isNPC) {
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
                        store.setTokenData(match.id, 'PLAYER');
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
            localStorage.setItem(STORAGE_KEY, freshJson);
        } catch (e) {
            console.error('[BattleOrganizer] Failed to reset localStorage:', e);
        }

        setState(fresh);
    }, []);

    const updateCombatantHp = useCallback(
        (combatantId: string, delta: number) => {
            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                let updatedCombatant: CombatantRowData | null = null;
                const newCombatants = currentRound.combatants.map((c) => {
                    if (c.id !== combatantId) return c;

                    const curr = c.hpCurr ?? 0;
                    const max = c.hpMax && c.hpMax > 0 ? c.hpMax : 999;
                    const nextHp = Math.max(0, Math.min(max, curr + delta));

                    const nextFainted = nextHp <= 0 ? true : c.isFainted;
                    let nextStatus = c.status || 'Healthy';
                    if (nextHp <= 0 && !nextStatus.toLowerCase().includes('faint')) {
                        nextStatus = nextStatus === 'Healthy' ? 'Fainted' : `${nextStatus}, Fainted`;
                    }

                    const updated: CombatantRowData = {
                        ...c,
                        hpCurr: nextHp,
                        isFainted: nextFainted,
                        status: nextStatus
                    };
                    updatedCombatant = updated;
                    return updated;
                });

                if (!updatedCombatant) return prev;

                // Sync to OBR or Standalone character
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
        },
        [updateState, syncCombatantToToken]
    );

    const updateCombatantWill = useCallback(
        (combatantId: string, delta: number) => {
            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                let updatedCombatant: CombatantRowData | null = null;
                const newCombatants = currentRound.combatants.map((c) => {
                    if (c.id !== combatantId) return c;

                    const curr = c.willCurr ?? 0;
                    const max = c.willMax && c.willMax > 0 ? c.willMax : 999;
                    const nextWill = Math.max(0, Math.min(max, curr + delta));

                    const updated: CombatantRowData = {
                        ...c,
                        willCurr: nextWill
                    };
                    updatedCombatant = updated;
                    return updated;
                });

                if (!updatedCombatant) return prev;

                // Sync to OBR or Standalone character
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
        },
        [updateState, syncCombatantToToken]
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
        clearAll
    };
}
