import { useEffect, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { extractTokenImage, extractCharacterName } from '../../../utils/initiativeHelpers';
import { getBattleOrganizerSettings } from './battleOrganizerSettingsHelper';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import {
    STORAGE_KEY,
    LEGACY_OBR_SCENE_META_KEY,
    parseStatusesFromMetadata,
    parseHealthAndWillFromMetadata,
    parseRollLogEntry
} from './battleOrganizerUtils';

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
    setState,
    lastSavedJsonRef,
    saveTimerRef,
    processedRollIdsRef,
    lastMoveRollTimestampRef,
    tokenSyncTimersRef,
    pendingTokenSyncRef
}: UseBattleOrganizerSyncProps) {
    // 1. Debounced persistence to localStorage & OBR peer broadcast (0 bytes scene metadata quota!)
    const persistState = useCallback(
        (newState: BattleOrganizerState, immediate = false, _skipBroadcast = false) => {
            let json = '';
            try {
                json = JSON.stringify(newState);
            } catch (e) {
                console.error('[BattleOrganizer] Failed to serialize state for persistence:', e);
                return;
            }

            // Loop & echo guard: Do not persist or broadcast if data is identical to current state
            if (json === lastSavedJsonRef.current) {
                return;
            }

            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }

            const executeSave = () => {
                lastSavedJsonRef.current = json;

                // 1. Save to local storage (offline-first, zero OBR scene quota used)
                try {
                    localStorage.setItem(STORAGE_KEY, json);
                } catch (e) {
                    console.error('[BattleOrganizer] Failed to save state to localStorage:', e);
                }

                // 2. Broadcast to peers in room (remote clients, guest players, etc.)
                if (!_skipBroadcast && OBR.isAvailable && !isStandaloneMode) {
                    try {
                        OBR.broadcast.sendMessage('pokerole-pmd-extension/battle-organizer-sync', newState, {
                            destination: 'REMOTE'
                        });
                    } catch (broadcastErr) {
                        console.warn('[BattleOrganizer] Failed to broadcast battle organizer state:', broadcastErr);
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

    // Unmount cleanup for any pending debounce timer
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            tokenSyncTimersRef.current.forEach((t) => clearTimeout(t));
            tokenSyncTimersRef.current.clear();
        };
    }, [saveTimerRef, tokenSyncTimersRef]);

    // 2. Offline-First Migration from legacy scene metadata (READ-ONLY, ZERO writes to OBR scene metadata)
    useEffect(() => {
        if (!OBR.isAvailable || isStandaloneMode) return;

        let isMounted = true;

        OBR.onReady(async () => {
            if (!isMounted) return;

            try {
                // If localStorage already has battle state, no migration needed
                const currentLocal = localStorage.getItem(STORAGE_KEY);
                if (currentLocal) return;

                const isReady = await OBR.scene.isReady();
                if (isReady) {
                    const metadata = await OBR.scene.getMetadata();
                    const rawLegacySceneData = metadata[LEGACY_OBR_SCENE_META_KEY];
                    if (typeof rawLegacySceneData === 'string' && rawLegacySceneData.trim()) {
                        try {
                            const parsed = JSON.parse(rawLegacySceneData);
                            if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                                localStorage.setItem(STORAGE_KEY, rawLegacySceneData);
                                lastSavedJsonRef.current = rawLegacySceneData;
                                if (isMounted) setState(parsed);
                            }
                        } catch (migErr) {
                            console.warn('[BattleOrganizer] Failed to read legacy scene data:', migErr);
                        }
                    }
                }
            } catch (e) {
                console.warn('[BattleOrganizer] Legacy scene read skipped:', e);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [lastSavedJsonRef, setState]);

    // 3. Listen to local storage changes (multi-tab / popout windows on same computer)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    if (e.newValue === lastSavedJsonRef.current) {
                        return;
                    }
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && Array.isArray(parsed.rounds)) {
                        if (saveTimerRef.current) {
                            clearTimeout(saveTimerRef.current);
                            saveTimerRef.current = null;
                        }
                        lastSavedJsonRef.current = e.newValue;
                        setState(parsed);
                    }
                } catch (err) {
                    console.error('[BattleOrganizer] Failed to parse storage update:', err);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [lastSavedJsonRef, saveTimerRef, setState]);

    // 4. Peer-to-peer sync via OBR broadcast (syncs across private windows, guest accounts, & remote players)
    useEffect(() => {
        if (!OBR.isAvailable || isStandaloneMode) return;

        let isMounted = true;

        const unsubSync = OBR.broadcast.onMessage('pokerole-pmd-extension/battle-organizer-sync', (event) => {
            if (!isMounted) return;
            const incoming = event.data as BattleOrganizerState;
            if (incoming && Array.isArray(incoming.rounds) && incoming.rounds.length > 0) {
                try {
                    const incomingJson = JSON.stringify(incoming);
                    if (incomingJson === lastSavedJsonRef.current) {
                        return; // Echo guard
                    }

                    if (saveTimerRef.current) {
                        clearTimeout(saveTimerRef.current);
                        saveTimerRef.current = null;
                    }

                    lastSavedJsonRef.current = incomingJson;
                    try {
                        localStorage.setItem(STORAGE_KEY, incomingJson);
                    } catch (e) {
                        console.warn('[BattleOrganizer] Failed to cache synced state in localStorage:', e);
                    }

                    setState(incoming);
                } catch (err) {
                    console.error('[BattleOrganizer] Failed to apply broadcast sync:', err);
                }
            }
        });

        // Sync role from OBR if available
        OBR.player
            .getRole()
            .then((r) => {
                if (r && useCharacterStore.getState().role !== r) {
                    useCharacterStore.setState({ role: r });
                }
            })
            .catch(() => {});

        // Request initial state from peers/GM on mount
        OBR.broadcast.sendMessage(
            'pokerole-pmd-extension/battle-organizer-request',
            {},
            {
                destination: 'REMOTE'
            }
        );

        return () => {
            isMounted = false;
            unsubSync();
        };
    }, [lastSavedJsonRef, saveTimerRef, setState]);

    // 5. Real-time token metadata sync & Roll Log integration
    useEffect(() => {
        const unsubs: Array<() => void> = [];

        // Helper to apply incoming roll to the active round
        const applyRollToCombatants = (logData: Record<string, unknown>) => {
            const settings = getBattleOrganizerSettings();
            if (!settings.autoSyncActions || !logData) return;

            const parsedRoll = parseRollLogEntry(logData);
            if (!parsedRoll) return;

            const { rollId, charName, moveName, rollTokenId, isEvade, isClash, isDamageRoll, cleanLabel } = parsedRoll;

            if (rollId) {
                if (processedRollIdsRef.current.has(rollId)) {
                    return; // Ignore duplicate local / broadcast event
                }
                processedRollIdsRef.current.add(rollId);
                if (processedRollIdsRef.current.size > 200) {
                    const first = processedRollIdsRef.current.values().next().value;
                    if (first) processedRollIdsRef.current.delete(first);
                }
            }

            // Throttle rapid duplicate rolls of the exact same move for the same combatant within 1.2s
            const throttleKey = `${rollTokenId || charName}|${moveName.toLowerCase().trim()}|${isDamageRoll ? 'dmg' : 'acc'}`;
            const lastTime = lastMoveRollTimestampRef.current.get(throttleKey);
            const now = Date.now();
            if (lastTime && now - lastTime < 1200) {
                return;
            }
            lastMoveRollTimestampRef.current.set(throttleKey, now);

            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                // Ensure the Battle Organizer has been utilized (has at least one real combatant in current round)
                const hasActiveCombatants = currentRound.combatants.some((c) => c.tokenId || c.name.trim());
                if (!hasActiveCombatants) return prev;

                let changed = false;
                const newCombatants = currentRound.combatants.map((c) => {
                    if (!c.tokenId && !c.name.trim()) return c;

                    const safeName = c.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const isMatch =
                        (rollTokenId && c.tokenId && rollTokenId === c.tokenId) ||
                        (charName && c.name.trim() && charName.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
                        (c.name.trim() && new RegExp(`\\b${safeName}\\b`, 'i').test(cleanLabel));

                    if (!isMatch) return c;

                    // Handle reaction rolls (Evade / Clash) directly on checkboxes without consuming an action slot
                    if (isEvade) {
                        if (!c.evadeUsed) {
                            changed = true;
                            return { ...c, evadeUsed: true };
                        }
                        return c;
                    }

                    if (isClash) {
                        if (!c.clashUsed) {
                            changed = true;
                            return { ...c, clashUsed: true };
                        }
                        return c;
                    }

                    const newActions = [...c.actions] as CombatantRowData['actions'];

                    // If this is a damage roll and the move name already exists in an action slot,
                    // do not allocate a new action slot because damage resolves the preceding accuracy roll.
                    if (isDamageRoll) {
                        const alreadyPresent = newActions.some(
                            (a) => a.text.trim().toLowerCase() === moveName.toLowerCase().trim()
                        );
                        if (alreadyPresent) return c;
                    }

                    const targetIdx = newActions.findIndex((a) => !a.text.trim());
                    if (targetIdx !== -1) {
                        newActions[targetIdx] = {
                            ...newActions[targetIdx],
                            text: moveName
                        };
                        changed = true;
                        return {
                            ...c,
                            actions: newActions
                        };
                    }

                    return c;
                });

                if (!changed) return prev;

                const updatedRound: BattleRoundData = {
                    ...currentRound,
                    combatants: newCombatants
                };
                return {
                    ...prev,
                    rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                };
            });
        };

        // Listen to OBR roll-log-sync broadcast (remote and local)
        if (OBR.isAvailable) {
            OBR.onReady(() => {
                const unsubRollLog = OBR.broadcast.onMessage('pokerole-pmd-extension/roll-log-sync', (event) =>
                    applyRollToCombatants(event.data as Record<string, unknown>)
                );
                unsubs.push(unsubRollLog);
            });
        }

        // Listen to local window roll event (both OBR and Standalone)
        const handleLocalRollEvent = (e: Event) => {
            const customEvent = e as CustomEvent<Record<string, unknown>>;
            if (customEvent.detail) {
                applyRollToCombatants(customEvent.detail);
            }
        };
        window.addEventListener('pkr-roll-log-event', handleLocalRollEvent);
        unsubs.push(() => window.removeEventListener('pkr-roll-log-event', handleLocalRollEvent));

        // Listen to cross-window roll log events in Standalone mode
        const handleCrossWindowRoll = (e: StorageEvent) => {
            if (e.key === 'pkr_roll_log' && e.newValue) {
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
                    (prev) => {
                        const currentRound = prev.rounds[prev.activeRoundIndex];
                        if (!currentRound) return prev;

                        let hasChanges = false;
                        const newCombatants = currentRound.combatants.map((combatant) => {
                            const matchingChar = localChars.find((c) => {
                                if (combatant.tokenId && c.id === combatant.tokenId) return true;
                                if (!combatant.tokenId && combatant.name.trim()) {
                                    const meta = (c.metadata || {}) as Record<string, unknown>;
                                    const resolvedName = extractCharacterName(meta, c.name);
                                    if (resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim()) {
                                        return true;
                                    }
                                    if (c.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()) {
                                        return true;
                                    }
                                }
                                return false;
                            });

                            if (!matchingChar) return combatant;
                            const pending = pendingTokenSyncRef.current.get(matchingChar.id);
                            if (pending) {
                                if (Date.now() < pending.until) {
                                    return combatant;
                                }
                                pendingTokenSyncRef.current.delete(matchingChar.id);
                            }
                            const meta = (matchingChar.metadata || {}) as Record<string, unknown>;

                            const resolvedName = extractCharacterName(meta, matchingChar.name);
                            const resolvedImg = extractTokenImage(meta) || combatant.image;
                            const { statusText, isFainted: statusFainted } = parseStatusesFromMetadata(meta);
                            const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                                parseHealthAndWillFromMetadata(meta);

                            let updated = false;

                            let nextName = combatant.name;
                            if (resolvedName && resolvedName !== combatant.name) {
                                nextName = resolvedName;
                                updated = true;
                            }

                            let nextImage = combatant.image;
                            if (resolvedImg && resolvedImg !== combatant.image) {
                                nextImage = resolvedImg;
                                updated = true;
                            }

                            let nextStatus = combatant.status;
                            if (statusText && statusText !== combatant.status) {
                                nextStatus = statusText;
                                updated = true;
                            }

                            let nextIsFainted = combatant.isFainted;
                            if (statusFainted || (hpCurr <= 0 && hpMax > 0)) {
                                if (!nextIsFainted) {
                                    nextIsFainted = true;
                                    updated = true;
                                }
                            } else if (hpCurr > 0 && !statusFainted && nextIsFainted) {
                                nextIsFainted = false;
                                updated = true;
                            }

                            let nextHpCurr = combatant.hpCurr;
                            let nextHpMax = combatant.hpMax;
                            if (hpCurr !== combatant.hpCurr || hpMax !== combatant.hpMax) {
                                nextHpCurr = hpCurr;
                                nextHpMax = hpMax;
                                updated = true;
                            }

                            let nextWillCurr = combatant.willCurr;
                            let nextWillMax = combatant.willMax;
                            if (willCurr !== combatant.willCurr || willMax !== combatant.willMax) {
                                nextWillCurr = willCurr;
                                nextWillMax = willMax;
                                updated = true;
                            }

                            let nextTrans = combatant.activeTransformation;
                            if (activeTransformation !== combatant.activeTransformation) {
                                nextTrans = activeTransformation;
                                updated = true;
                            }

                            let nextEvade = combatant.evadeUsed;
                            let nextClash = combatant.clashUsed;

                            // Reaction sync (only if autoSyncActions is enabled)
                            if (settings.autoSyncActions) {
                                const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                                const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                                if (combatant.evadeUsed !== evadeUsed || combatant.clashUsed !== clashUsed) {
                                    nextEvade = evadeUsed;
                                    nextClash = clashUsed;
                                    updated = true;
                                }
                            }

                            if (updated || (!combatant.tokenId && matchingChar.id)) {
                                hasChanges = true;
                                return {
                                    ...combatant,
                                    name: nextName,
                                    image: nextImage,
                                    status: nextStatus,
                                    isFainted: nextIsFainted,
                                    hpCurr: nextHpCurr,
                                    hpMax: nextHpMax,
                                    willCurr: nextWillCurr,
                                    willMax: nextWillMax,
                                    tempHp,
                                    tempWill,
                                    activeTransformation: nextTrans,
                                    tokenId: matchingChar.id,
                                    evadeUsed: nextEvade,
                                    clashUsed: nextClash
                                };
                            }

                            return combatant;
                        });

                        if (!hasChanges) return prev;

                        const updatedRound: BattleRoundData = {
                            ...currentRound,
                            combatants: newCombatants
                        };
                        return {
                            ...prev,
                            rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                        };
                    },
                    false,
                    true
                );
            };

            window.addEventListener('pkr-local-data-changed', handleStandaloneChange);
            window.addEventListener('storage', handleStandaloneChange);
            unsubs.push(() => {
                window.removeEventListener('pkr-local-data-changed', handleStandaloneChange);
                window.removeEventListener('storage', handleStandaloneChange);
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
