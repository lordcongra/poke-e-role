import { useEffect, useCallback, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '@/utils/sync/storageAdapter';
import {
    getBattleOrganizerStorageKey,
    getEffectiveRoomId,
    getRollLogStorageKey
} from '@/utils/sync/roomScopedStorage';
import { useCharacterStore } from '@/store/useCharacterStore';
import { EXTENSION_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { registerSafeBroadcastListener } from '@/hooks/owlbearSync/owlbearBroadcastUtils';
import { getBattleOrganizerSettings } from '@/components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import type { BattleOrganizerState } from '@/types/battleOrganizerTypes';
import { sanitizeBattlefield } from '@/components/modals/battleOrganizer/battleOrganizerUtils';
import { parseRollLogEntry } from '@/components/modals/battleOrganizer/battleOrganizerRollParser';
import { applyRollToBattleOrganizerState } from '@/components/modals/battleOrganizer/battleOrganizerStorageSync';
import {
    BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
    BATTLE_ORGANIZER_SYNC_CHANNEL,
    type BattleOrganizerCombatantPatchPayload,
    applyCombatantPatchToState,
    canBroadcastFullBattleOrganizerState,
    sendBattleOrganizerFullSync
} from '@/components/modals/battleOrganizer/battleOrganizerSyncHelpers';
import {
    applyStandaloneCharsToBattleOrganizerState,
    syncRoomBattleOrganizerOnReady
} from '@/components/modals/battleOrganizer/battleOrganizerSyncLifecycle';

export interface UseBattleOrganizerSyncProps {
    state: BattleOrganizerState;
    setState: React.Dispatch<React.SetStateAction<BattleOrganizerState>>;
    lastSavedJsonRef: React.MutableRefObject<string>;
    saveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    processedRollIdsRef: React.MutableRefObject<Set<string>>;
    lastMoveRollTimestampRef: React.MutableRefObject<Map<string, number>>;
    tokenSyncTimersRef: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
    pendingTokenSyncRef: React.MutableRefObject<
        Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
    >;
}

export function useBattleOrganizerSync({
    state,
    setState,
    lastSavedJsonRef,
    saveTimerRef,
    processedRollIdsRef,
    lastMoveRollTimestampRef,
    tokenSyncTimersRef,
    pendingTokenSyncRef
}: UseBattleOrganizerSyncProps) {
    const initialRoomIdRef = useRef<string>(getEffectiveRoomId());
    const latestStateRef = useRef<BattleOrganizerState>(state);
    latestStateRef.current = state;

    // 1. Debounced persistence to localStorage & GM-authoritative OBR peer broadcast
    const persistState = useCallback(
        (newState: BattleOrganizerState, immediate = false, _skipBroadcast = false) => {
            latestStateRef.current = newState;
            let json = '';
            try {
                json = JSON.stringify(newState);
            } catch (e) {
                console.error('[BattleOrganizer] Failed to serialize state for persistence:', e);
                return;
            }

            if (json === lastSavedJsonRef.current) {
                return;
            }

            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }

            const executeSave = () => {
                lastSavedJsonRef.current = json;

                try {
                    localStorage.setItem(getBattleOrganizerStorageKey(), json);
                } catch (e) {
                    console.error('[BattleOrganizer] Failed to save state to localStorage:', e);
                }

                useCharacterStore.getState().setActiveBattlefield(newState.battlefield);

                if (isStandaloneMode) {
                    try {
                        localStorage.setItem(
                            'pokerole-pmd-extension/battlefield',
                            JSON.stringify(newState.battlefield)
                        );
                    } catch {}
                }

                if (!_skipBroadcast && OBR.isAvailable && !isStandaloneMode) {
                    void sendBattleOrganizerFullSync(newState);

                    if (canBroadcastFullBattleOrganizerState()) {
                        OBR.player
                            .getRole()
                            .then((role) => {
                                if (role === 'GM') {
                                    OBR.scene.isReady().then((ready) => {
                                        if (ready) {
                                            OBR.scene
                                                .setMetadata({
                                                    'pokerole-pmd-extension/battlefield': newState.battlefield
                                                })
                                                .catch((err) => {
                                                    console.warn(
                                                        '[BattleOrganizer] Failed to save battlefield to scene metadata:',
                                                        err
                                                    );
                                                });
                                        }
                                    });
                                }
                            })
                            .catch(() => {});
                    }
                }
            };

            if (immediate) {
                executeSave();
            } else {
                saveTimerRef.current = setTimeout(executeSave, 300);
            }
        },
        [lastSavedJsonRef, saveTimerRef]
    );

    const updateState = useCallback(
        (updater: (prev: BattleOrganizerState) => BattleOrganizerState, immediate = false, _skipBroadcast = false) => {
            setState((prev) => {
                const updated = updater(prev);
                if (updated === prev) {
                    return prev;
                }
                persistState(updated, immediate, _skipBroadcast);
                return updated;
            });
        },
        [persistState, setState]
    );

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            tokenSyncTimersRef.current.forEach((t) => clearTimeout(t));
            tokenSyncTimersRef.current.clear();
        };
    }, [saveTimerRef, tokenSyncTimersRef]);

    // 2. Room-scoped reload & offline-first legacy scene metadata migration on OBR ready
    useEffect(() => {
        if (!OBR.isAvailable || isStandaloneMode) return;

        let isMounted = true;
        OBR.onReady(() =>
            syncRoomBattleOrganizerOnReady({
                initialRoomIdRef,
                lastSavedJsonRef,
                setState,
                isMounted: () => isMounted
            })
        );

        return () => {
            isMounted = false;
        };
    }, [lastSavedJsonRef, setState]);

    // 3. Listen to local storage changes (multi-tab / popout windows on same computer)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === getBattleOrganizerStorageKey() && e.newValue) {
                try {
                    if (e.newValue === lastSavedJsonRef.current) {
                        return;
                    }
                    const parsed = JSON.parse(e.newValue) as BattleOrganizerState;
                    if (parsed && Array.isArray(parsed.rounds)) {
                        if (saveTimerRef.current) {
                            clearTimeout(saveTimerRef.current);
                            saveTimerRef.current = null;
                        }
                        const sanitized: BattleOrganizerState = {
                            ...parsed,
                            battlefield: sanitizeBattlefield(parsed.battlefield)
                        };
                        lastSavedJsonRef.current = e.newValue;
                        latestStateRef.current = sanitized;
                        if (sanitized.battlefield) {
                            useCharacterStore.getState().setActiveBattlefield(sanitized.battlefield);
                        }
                        setState(sanitized);
                    }
                } catch (err) {
                    console.error('[BattleOrganizer] Failed to parse storage update:', err);
                }
            }
        };

        const handleCustomUpdate = (e: Event) => {
            const custom = e as CustomEvent<BattleOrganizerState>;
            if (custom.detail && Array.isArray(custom.detail.rounds)) {
                if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = null;
                }
                lastSavedJsonRef.current = JSON.stringify(custom.detail);
                latestStateRef.current = custom.detail;
                setState(custom.detail);
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('pkr-battle-organizer-update', handleCustomUpdate as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('pkr-battle-organizer-update', handleCustomUpdate as EventListener);
        };
    }, [lastSavedJsonRef, saveTimerRef, setState]);

    // 4. Peer-to-peer sync via OBR broadcast (chunk-safe; GM ignores full-state & merges patches)
    useEffect(() => {
        if (!OBR.isAvailable || isStandaloneMode) return;

        let isMounted = true;

        const unsubSync = registerSafeBroadcastListener<BattleOrganizerState>(
            BATTLE_ORGANIZER_SYNC_CHANNEL,
            (incoming) => {
                if (!isMounted) return;
                if (useCharacterStore.getState().role === 'GM') {
                    return;
                }
                if (incoming && Array.isArray(incoming.rounds) && incoming.rounds.length > 0) {
                    try {
                        const incomingJson = JSON.stringify(incoming);
                        if (incomingJson === lastSavedJsonRef.current) {
                            return;
                        }

                        if (saveTimerRef.current) {
                            clearTimeout(saveTimerRef.current);
                            saveTimerRef.current = null;
                        }

                        lastSavedJsonRef.current = incomingJson;
                        try {
                            localStorage.setItem(getBattleOrganizerStorageKey(), incomingJson);
                        } catch (e) {
                            console.warn('[BattleOrganizer] Failed to cache synced state in localStorage:', e);
                        }

                        let processedIncoming = incoming;
                        const currentRole = useCharacterStore.getState().role;
                        const gmOnlyPullEnemies = useCharacterStore.getState().identity.gmOnlyPullEnemies;
                        const shouldFilterEnemies = currentRole !== 'GM' && gmOnlyPullEnemies !== false;

                        if (shouldFilterEnemies && processedIncoming.rounds) {
                            processedIncoming = {
                                ...processedIncoming,
                                rounds: processedIncoming.rounds.map((r) => ({
                                    ...r,
                                    combatants: r.combatants.filter((c) => !c.isNPC && !c.hidden)
                                }))
                            };
                        }

                        if (processedIncoming.battlefield) {
                            processedIncoming = {
                                ...processedIncoming,
                                battlefield: sanitizeBattlefield(processedIncoming.battlefield)
                            };
                            if (currentRole !== 'GM' && processedIncoming.battlefield.broadcastToPlayers === false) {
                                useCharacterStore.getState().setActiveBattlefield(null);
                            } else {
                                useCharacterStore.getState().setActiveBattlefield(processedIncoming.battlefield);
                            }
                        }
                        latestStateRef.current = processedIncoming;
                        setState(processedIncoming);
                    } catch (err) {
                        console.error('[BattleOrganizer] Failed to apply broadcast sync:', err);
                    }
                }
            }
        );

        const unsubPatch = registerSafeBroadcastListener<BattleOrganizerCombatantPatchPayload>(
            BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
            (payload) => {
                if (!isMounted) return;
                if (useCharacterStore.getState().role !== 'GM') return;
                if (!payload) return;

                const { nextState, changed } = applyCombatantPatchToState(latestStateRef.current, payload);
                if (!changed) return;

                if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = null;
                }

                latestStateRef.current = nextState;
                try {
                    const nextJson = JSON.stringify(nextState);
                    lastSavedJsonRef.current = nextJson;
                    localStorage.setItem(getBattleOrganizerStorageKey(), nextJson);
                } catch (e) {
                    console.warn('[BattleOrganizer] Failed to persist patched state:', e);
                }

                if (nextState.battlefield) {
                    useCharacterStore.getState().setActiveBattlefield(nextState.battlefield);
                }
                setState(nextState);
                void sendBattleOrganizerFullSync(nextState);
            }
        );

        OBR.player
            .getRole()
            .then((r) => {
                if (r && useCharacterStore.getState().role !== r) {
                    useCharacterStore.setState({ role: r });
                }
            })
            .catch(() => {});

        if (useCharacterStore.getState().role !== 'GM') {
            OBR.broadcast
                .sendMessage(`${EXTENSION_ID}/battle-organizer-request`, {}, { destination: 'REMOTE' })
                .catch(() => {});
        }

        return () => {
            isMounted = false;
            unsubSync();
            unsubPatch();
        };
    }, [lastSavedJsonRef, saveTimerRef, setState]);

    // 5. Real-time token metadata sync & Roll Log integration
    useEffect(() => {
        const unsubs: Array<() => void> = [];

        const applyRollToCombatants = (logData: Record<string, unknown>) => {
            const settings = getBattleOrganizerSettings();
            if (!settings.autoSyncActions || !logData) return;

            if (logData.targetVisibility === 'gm_only') {
                const store = useCharacterStore.getState();
                if (store.role !== 'GM') return;
            }

            const parsedRoll = parseRollLogEntry(logData);
            if (!parsedRoll || !parsedRoll.shouldAddToRoundTracker) return;

            const { rollId, charName, moveName, rollTokenId } = parsedRoll;

            if (rollId) {
                if (processedRollIdsRef.current.has(rollId)) {
                    return;
                }
                processedRollIdsRef.current.add(rollId);
                if (processedRollIdsRef.current.size > 200) {
                    const first = processedRollIdsRef.current.values().next().value;
                    if (first) processedRollIdsRef.current.delete(first);
                }
            }

            const throttleKey = `${rollTokenId || charName}|${moveName.toLowerCase().trim()}|${parsedRoll.rollKind}`;
            const lastTime = lastMoveRollTimestampRef.current.get(throttleKey);
            const now = Date.now();
            if (lastTime && now - lastTime < 1200) {
                return;
            }
            lastMoveRollTimestampRef.current.set(throttleKey, now);

            updateState((prev) => {
                const { nextState, changed } = applyRollToBattleOrganizerState(prev, logData);
                return changed ? nextState : prev;
            });
        };

        if (OBR.isAvailable) {
            OBR.onReady(() => {
                const unsubRollLog = OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-log-sync`, (event) =>
                    applyRollToCombatants(event.data as Record<string, unknown>)
                );
                unsubs.push(unsubRollLog);
            });
        }

        const handleLocalRollEvent = (e: Event) => {
            const customEvent = e as CustomEvent<Record<string, unknown>>;
            if (customEvent.detail) {
                applyRollToCombatants(customEvent.detail);
            }
        };
        window.addEventListener('pkr-roll-log-event', handleLocalRollEvent);
        unsubs.push(() => window.removeEventListener('pkr-roll-log-event', handleLocalRollEvent));

        const handleCrossWindowRoll = (e: StorageEvent) => {
            if (e.key === getRollLogStorageKey() && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        applyRollToCombatants(parsed[0]);
                    }
                } catch (err) {
                    console.error('[BattleOrganizer] Failed to parse cross-window roll:', err);
                }
            }
        };
        window.addEventListener('storage', handleCrossWindowRoll);
        unsubs.push(() => window.removeEventListener('storage', handleCrossWindowRoll));

        if (isStandaloneMode) {
            const handleStandaloneChange = async () => {
                const settings = getBattleOrganizerSettings();
                const localChars = await storageAdapter.getLocalCharacters();

                updateState(
                    (prev) =>
                        applyStandaloneCharsToBattleOrganizerState(
                            prev,
                            localChars,
                            settings,
                            pendingTokenSyncRef.current
                        ),
                    false,
                    true
                );
            };

            const handleStandaloneStorage = (e: StorageEvent) => {
                if (
                    e.key === null ||
                    e.key.startsWith('pkr_char_') ||
                    e.key === 'pkr_folders' ||
                    e.key.includes('pkr_pc_storage')
                ) {
                    handleStandaloneChange();
                }
            };

            window.addEventListener('pkr-local-data-changed', handleStandaloneChange);
            window.addEventListener('storage', handleStandaloneStorage);
            unsubs.push(() => {
                window.removeEventListener('pkr-local-data-changed', handleStandaloneChange);
                window.removeEventListener('storage', handleStandaloneStorage);
            });
        }

        return () => {
            unsubs.forEach((u) => u());
        };
    }, [lastMoveRollTimestampRef, pendingTokenSyncRef, processedRollIdsRef, updateState]);

    return {
        persistState,
        updateState
    };
}
