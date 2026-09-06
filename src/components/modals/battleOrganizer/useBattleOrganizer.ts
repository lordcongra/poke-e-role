import { useState, useEffect, useCallback, useRef } from 'react';
import OBR, { type Image, type Item } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId } from '../../../utils/obr';
import {
    extractTokenImage,
    extractCharacterName,
    calculateBaseInitFromCharacterData
} from '../../../utils/initiativeHelpers';
import { getBattleOrganizerSettings } from './battleOrganizerSettingsHelper';
import type {
    BattleOrganizerState,
    BattlefieldData,
    BattleRoundData,
    CombatantRowData,
    ActionSlotData,
    BattleOrganizerTimerEffect
} from '../../../types/battleOrganizerTypes';

const STORAGE_KEY = 'pkr_battle_organizer_data';
const LEGACY_OBR_SCENE_META_KEY = 'pokerole-pmd-extension/battle-organizer';

export function parseStatusesFromMetadata(meta: Record<string, unknown>): { statusText: string; isFainted: boolean } {
    let statusText = 'Healthy';
    try {
        const rawStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [];
        if (Array.isArray(rawStatuses)) {
            const nonHealthy = rawStatuses
                .filter((s: Record<string, unknown>) => s.name && s.name !== 'Healthy')
                .map((s: Record<string, unknown>) => {
                    const n = s.name === 'Custom...' ? String(s.customName || 'Custom') : String(s.name);
                    const r = Number(s.rounds || 0);
                    return r > 0 ? `${n} (${r})` : n;
                });
            if (nonHealthy.length > 0) statusText = nonHealthy.join(', ');
        }
    } catch (e) {
        console.warn('[useBattleOrganizer] Failed to parse status list:', e);
    }
    const isFainted = statusText.toLowerCase().includes('faint');
    return { statusText, isFainted };
}

export function parseHealthAndWillFromMetadata(meta: Record<string, unknown>): {
    hpCurr: number;
    hpMax: number;
    willCurr: number;
    willMax: number;
    tempHp: number;
    tempWill: number;
    activeTransformation: string;
} {
    const hpCurr = meta['hp-curr'] !== undefined ? Number(meta['hp-curr']) : 0;
    const hpMax =
        meta['hp-max-display'] !== undefined
            ? Number(meta['hp-max-display'])
            : meta['hp-max'] !== undefined
              ? Number(meta['hp-max'])
              : 0;
    const willCurr = meta['will-curr'] !== undefined ? Number(meta['will-curr']) : 0;
    const willMax =
        meta['will-max-display'] !== undefined
            ? Number(meta['will-max-display'])
            : meta['will-max'] !== undefined
              ? Number(meta['will-max'])
              : 0;
    const tempHp = meta['temporary-hit-points'] !== undefined ? Number(meta['temporary-hit-points']) : 0;
    const tempWill = meta['temporary-will'] !== undefined ? Number(meta['temporary-will']) : 0;
    const activeTransformation = String(meta['active-transformation'] || meta['activeTransformation'] || 'None');

    return {
        hpCurr,
        hpMax,
        willCurr,
        willMax,
        tempHp,
        tempWill,
        activeTransformation
    };
}

const createDefaultActionSlot = (): ActionSlotData => ({
    text: '',
    status: 'none'
});

const createDefaultActions = (): [ActionSlotData, ActionSlotData, ActionSlotData, ActionSlotData, ActionSlotData] => [
    createDefaultActionSlot(),
    createDefaultActionSlot(),
    createDefaultActionSlot(),
    createDefaultActionSlot(),
    createDefaultActionSlot()
];

const createDefaultCombatant = (name = '', image = '', isPlayer = true): CombatantRowData => ({
    id: crypto.randomUUID(),
    initiative: '',
    baseInit: 0,
    name,
    image,
    heldItem: '',
    status: 'Healthy',
    isFainted: false,
    actions: createDefaultActions(),
    evadeUsed: false,
    clashUsed: false,
    isPlayerSide: isPlayer,
    hpCurr: 0,
    hpMax: 0,
    willCurr: 0,
    willMax: 0,
    tempHp: 0,
    tempWill: 0,
    activeTransformation: 'None'
});

const createDefaultBattlefield = (): BattlefieldData => ({
    location: '',
    weather: { name: '', remainingRounds: 0 },
    terrain: { name: '', remainingRounds: 0 },
    other: { name: '', remainingRounds: 0 },
    playerSide: {
        forceFields: [
            { name: '', remainingRounds: 0 },
            { name: '', remainingRounds: 0 }
        ],
        entryHazard: '',
        cover: '',
        other: ''
    },
    foeSide: {
        forceFields: [
            { name: '', remainingRounds: 0 },
            { name: '', remainingRounds: 0 }
        ],
        entryHazard: '',
        cover: '',
        other: ''
    },
    playerTargets: '',
    foeTargets: '',
    highlightedSide: 'all'
});

const createDefaultState = (): BattleOrganizerState => ({
    battlefield: createDefaultBattlefield(),
    rounds: [
        {
            id: crypto.randomUUID(),
            roundNumber: 1,
            combatants: [
                createDefaultCombatant('', '', true),
                createDefaultCombatant('', '', true),
                createDefaultCombatant('', '', false),
                createDefaultCombatant('', '', false)
            ],
            endOfRoundEffects: ''
        }
    ],
    activeRoundIndex: 0
});

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
        []
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
        [persistState]
    );

    // Unmount cleanup for any pending debounce timer
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

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
    }, []);

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
    }, []);

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
        OBR.player.getRole().then((r) => {
            if (r && useCharacterStore.getState().role !== r) {
                useCharacterStore.setState({ role: r });
            }
        }).catch(() => {});

        // Request initial state from peers/GM on mount
        OBR.broadcast.sendMessage('pokerole-pmd-extension/battle-organizer-request', {}, {
            destination: 'REMOTE'
        });

        return () => {
            isMounted = false;
            unsubSync();
        };
    }, []);

    // 4. Real-time token metadata sync & Roll Log integration
    useEffect(() => {
        const unsubs: Array<() => void> = [];

        // Helper to apply incoming roll to the active round
        const applyRollToCombatants = (logData: Record<string, unknown>) => {
            const settings = getBattleOrganizerSettings();
            if (!settings.autoSyncActions || !logData) return;

            const rollId = String(logData.id || '');
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

            const label = String(logData.label || logData.title || '');
            const fallbackCharName = String(logData.characterName || logData.player || '');
            const rollTokenId = String(logData.tokenId || '');

            const clean = label
                .replace(/^\[PRIVATE\]\s*/i, '')
                .replace(/^[📢🎲💥🩹🍀🎯🛡️❄️]\s*/u, '')
                .trim();

            let charName = fallbackCharName;
            let moveName = '';

            // Format 1: "{Char} rolled {Move} (Acc)..." or "(Damage)" or "(Attack)" or "(Dmg)"
            const matchAccDmg = clean.match(/^(.+?)\s+rolled\s+(.+?)\s*\((?:Acc|Damage|Attack|Dmg)\)/i);
            if (matchAccDmg) {
                charName = matchAccDmg[1].trim();
                moveName = matchAccDmg[2].trim();
            } else {
                // Format 2: "{Char} rolled {Move}!"
                const matchRolled = clean.match(/^(.+?)\s+(?:rolled|used)\s+(.+?)(?:!|\s*\[|$)/i);
                if (matchRolled) {
                    charName = matchRolled[1].trim();
                    moveName = matchRolled[2].trim();
                } else {
                    // Format 3: "{Move} (Acc)"
                    const matchSimple = clean.match(/^(.+?)\s*(?:\(Acc\)|\(Damage\)|\(Attack\)|\(Dmg\))/i);
                    if (matchSimple) {
                        moveName = matchSimple[1].trim();
                    } else if (clean && !clean.includes('!')) {
                        moveName = clean.split('[')[0].trim();
                    }
                }
            }

            if (!moveName || moveName.match(/^(?:custom dice|a General|Recovery|Check)/i)) {
                return;
            }

            const isEvade = moveName.toLowerCase() === 'evade';
            const isClash = moveName.toLowerCase() === 'clash';
            const isDamageRoll =
                /\((?:Dmg|Damage)\)/i.test(clean) || String(logData.rollType || '') === 'damage';

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
                        (c.name.trim() && new RegExp(`\\b${safeName}\\b`, 'i').test(clean));

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
                    // For accuracy rolls and new attacks, populate into the next available empty slot.
                    if (isDamageRoll) {
                        const alreadyPresent = newActions.some(
                            (a) => a.text.trim().toLowerCase() === moveName.toLowerCase().trim()
                        );
                        if (alreadyPresent) return c;
                    }

                    const targetIdx = newActions.findIndex((a) => !a.text.trim());
                    if (targetIdx !== -1) {
                        // Populate the move name, but preserve status (leave up to user to mark hit/miss)
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

                updateState((prev) => {
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

                        let nextActions = combatant.actions;
                        let nextEvade = combatant.evadeUsed;
                        let nextClash = combatant.clashUsed;

                        // Action counter sync (only if autoSyncActions is enabled)
                        if (settings.autoSyncActions) {
                            const actionsUsed = Number(meta['actions-used'] || 0);
                            const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                            const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                            if (actionsUsed === 0) {
                                const clonedActions = [...combatant.actions] as CombatantRowData['actions'];
                                let slotCleared = false;
                                for (let i = 0; i < 5; i++) {
                                    if (clonedActions[i].status !== 'none') {
                                        clonedActions[i] = { ...clonedActions[i], status: 'none' };
                                        slotCleared = true;
                                    }
                                }
                                if (slotCleared) {
                                    nextActions = clonedActions;
                                    updated = true;
                                }
                            }

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
                                actions: nextActions,
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
                }, false, true);
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
    }, [updateState]);

    // 5. On-Demand & 30-Second Gentle Token Stats Soft-Sync
    const refreshTokenStats = useCallback(
        async (silent = false): Promise<boolean> => {
            let changesFound = false;
            try {
                const settings = getBattleOrganizerSettings();
                let candidateItems: Array<Item> = [];

                if (OBR.isAvailable && !isStandaloneMode) {
                    const isReady = await OBR.scene.isReady();
                    if (!isReady) return false;
                    candidateItems = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
                } else {
                    const localChars = await storageAdapter.getLocalCharacters();
                    candidateItems = localChars.map((c) => ({
                        id: c.id,
                        name: c.name,
                        layer: 'CHARACTER' as const,
                        metadata: c.metadata
                    })) as unknown as Item[];
                }

                if (candidateItems.length === 0) return false;

                updateState(
                    (prev) => {
                        const currentRound = prev.rounds[prev.activeRoundIndex];
                        if (!currentRound) return prev;

                        let hasChanges = false;
                        const newCombatants = currentRound.combatants.map((combatant) => {
                            const matchingItem = candidateItems.find((item) => {
                                if (combatant.tokenId && item.id === combatant.tokenId) return true;
                                if (!combatant.tokenId && combatant.name.trim()) {
                                    const meta = (item.metadata['pokerole-extension/stats'] || item.metadata) as Record<
                                        string,
                                        unknown
                                    >;
                                    const resolvedName = extractCharacterName(meta, item.name);
                                    if (resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim()) {
                                        return true;
                                    }
                                    if (item.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()) {
                                        return true;
                                    }
                                }
                                return false;
                            });

                            if (!matchingItem) return combatant;

                            const meta = (matchingItem.metadata['pokerole-extension/stats'] ||
                                matchingItem.metadata) as Record<string, unknown>;
                            if (!meta) return combatant;

                            const resolvedName = extractCharacterName(meta, matchingItem.name);
                            const imgItem = matchingItem as Image;
                            const resolvedImg = imgItem.image?.url || extractTokenImage(meta) || combatant.image;
                            const { statusText, isFainted: statusFainted } = parseStatusesFromMetadata(meta);
                            const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                                parseHealthAndWillFromMetadata(meta);
                            const isNPC =
                                meta['is-npc'] === true ||
                                meta['is-npc'] === 'true' ||
                                matchingItem.metadata['is-npc'] === true ||
                                matchingItem.metadata['is-npc'] === 'true';

                            const fingerprint = `${matchingItem.id}|${hpCurr}|${hpMax}|${willCurr}|${willMax}|${tempHp}|${tempWill}|${statusText}|${statusFainted}|${activeTransformation}|${resolvedName}|${resolvedImg}|${isNPC}`;
                            const lastFingerprint = lastTokenFingerprintsRef.current.get(matchingItem.id);
                            if (
                                lastFingerprint === fingerprint &&
                                combatant.hpCurr === hpCurr &&
                                combatant.hpMax === hpMax &&
                                combatant.willCurr === willCurr &&
                                combatant.willMax === willMax &&
                                combatant.status === statusText &&
                                combatant.name === (resolvedName || combatant.name) &&
                                combatant.activeTransformation === activeTransformation &&
                                combatant.image === (resolvedImg || combatant.image) &&
                                combatant.isNPC === isNPC
                            ) {
                                return combatant;
                            }
                            lastTokenFingerprintsRef.current.set(matchingItem.id, fingerprint);

                            let updated = false;

                            let nextName = combatant.name;
                            if (resolvedName && resolvedName !== combatant.name && resolvedName !== matchingItem.name) {
                                nextName = resolvedName;
                                updated = true;
                            } else if (!combatant.name.trim() && resolvedName) {
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

                            let nextActions = combatant.actions;
                            let nextEvade = combatant.evadeUsed;
                            let nextClash = combatant.clashUsed;

                            if (settings.autoSyncActions) {
                                const actionsUsed = Number(meta['actions-used'] || 0);
                                const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                                const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                                if (actionsUsed === 0) {
                                    const clonedActions = [...combatant.actions] as CombatantRowData['actions'];
                                    let slotCleared = false;
                                    for (let i = 0; i < 5; i++) {
                                        if (clonedActions[i].status !== 'none') {
                                            clonedActions[i] = { ...clonedActions[i], status: 'none' };
                                            slotCleared = true;
                                        }
                                    }
                                    if (slotCleared) {
                                        nextActions = clonedActions;
                                        updated = true;
                                    }
                                }

                                if (combatant.evadeUsed !== evadeUsed || combatant.clashUsed !== clashUsed) {
                                    nextEvade = evadeUsed;
                                    nextClash = clashUsed;
                                    updated = true;
                                }
                            }

                            let nextIsNPC = combatant.isNPC;
                            if (isNPC !== combatant.isNPC) {
                                nextIsNPC = isNPC;
                                updated = true;
                            }

                            if (updated || (!combatant.tokenId && matchingItem.id)) {
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
                                    tokenId: matchingItem.id,
                                    actions: nextActions,
                                    evadeUsed: nextEvade,
                                    clashUsed: nextClash,
                                    isNPC: nextIsNPC
                                };
                            }

                            return combatant;
                        });

                        if (!hasChanges) return prev;
                        changesFound = true;

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

                if (!silent && OBR.isAvailable) {
                    OBR.notification.show(
                        changesFound ? 'Combatant stats refreshed from scene!' : 'Combatant stats are up to date.',
                        'INFO'
                    );
                }
            } catch (err) {
                console.warn('[BattleOrganizer] Error during token refresh:', err);
            }
            return changesFound;
        },
        [updateState]
    );

    // 6. Gentle 30-second soft-sync interval (paused when tab/window is hidden)
    useEffect(() => {
        const initialTimer = setTimeout(() => {
            refreshTokenStats(true);
        }, 500);

        const intervalId = setInterval(() => {
            if (typeof document !== 'undefined' && !document.hidden) {
                refreshTokenStats(true);
            }
        }, 30000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(intervalId);
        };
    }, [refreshTokenStats]);

    // --- Pull from Initiative / Character Sheets ---
    const pullFromInitiative = useCallback(async () => {
        try {
            const combatantRows: CombatantRowData[] = [];

            if (isStandaloneMode) {
                const localChars = await storageAdapter.getLocalCharacters();
                const savedInitList = localStorage.getItem('pkr_standalone_init_list');
                const parsedInit = savedInitList ? JSON.parse(savedInitList) : [];

                if (Array.isArray(parsedInit) && parsedInit.length > 0) {
                    parsedInit.forEach((initItem: Record<string, unknown>, idx: number) => {
                        const charId = String(initItem.id || '');
                        const matchingChar = localChars.find((c) => c.id === charId);
                        const meta = (matchingChar?.metadata || {}) as Record<string, unknown>;

                        // Parse held items from Combat, Social, Hand slots + active inventory items
                        const heldItems: string[] = [];
                        const combatSlot = typeof meta['combat'] === 'string' ? meta['combat'].trim() : '';
                        const socialSlot = typeof meta['social'] === 'string' ? meta['social'].trim() : '';
                        const handSlot = typeof meta['hand'] === 'string' ? meta['hand'].trim() : '';

                        if (combatSlot) heldItems.push(combatSlot);
                        if (socialSlot && !heldItems.includes(socialSlot)) heldItems.push(socialSlot);
                        if (handSlot && !heldItems.includes(handSlot)) heldItems.push(handSlot);

                        try {
                            const rawInv = meta['inv-data'] ? JSON.parse(String(meta['inv-data'])) : [];
                            if (Array.isArray(rawInv)) {
                                rawInv
                                    .filter((i: Record<string, unknown>) => i.active === true || i.active === 'true')
                                    .map((i: Record<string, unknown>) => String(i.name || '').trim())
                                    .filter(Boolean)
                                    .forEach((itemName) => {
                                        if (!heldItems.includes(itemName)) {
                                            heldItems.push(itemName);
                                        }
                                    });
                            }
                        } catch (e) {
                            console.warn('[useBattleOrganizer] Failed to parse inventory items:', e);
                        }

                        const heldItemText = heldItems.join(', ');

                        // Parse statuses & health/will
                        const { statusText, isFainted } = parseStatusesFromMetadata(meta);
                        const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                            parseHealthAndWillFromMetadata(meta);

                        const actionsUsed = Number(meta['actions-used'] || 0);
                        const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                        const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                        const actions = createDefaultActions();
                        for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                            actions[i] = { text: actions[i].text, status: 'none' };
                        }

                        const globalStore = useCharacterStore.getState();
                        const baseInitVal = calculateBaseInitFromCharacterData(
                            matchingChar?.metadata || initItem,
                            globalStore
                        );
                        let initScore = String(baseInitVal);
                        if (typeof initItem.total === 'number' && typeof initItem.d6 === 'number' && initItem.d6 > 0) {
                            initScore = String(initItem.total);
                        } else if (typeof initItem.total === 'number' && initItem.total > 0) {
                            initScore = String(initItem.total);
                        }

                        const displayName = extractCharacterName(
                            (matchingChar?.metadata || initItem) as Record<string, unknown>,
                            String(matchingChar?.name || initItem.name || `Combatant ${idx + 1}`)
                        );

                        const isNPC = meta['is-npc'] === true || meta['is-npc'] === 'true';

                        combatantRows.push({
                            id: crypto.randomUUID(),
                            tokenId: charId,
                            initiative: initScore,
                            baseInit: baseInitVal,
                            name: displayName,
                            image: extractTokenImage(meta) || String(initItem.image || ''),
                            heldItem: heldItemText,
                            status: statusText,
                            isFainted,
                            actions,
                            evadeUsed,
                            clashUsed,
                            isPlayerSide: true,
                            hpCurr,
                            hpMax,
                            willCurr,
                            willMax,
                            tempHp,
                            tempWill,
                            activeTransformation,
                            isNPC
                        });
                    });
                }
            } else if (OBR.isAvailable) {
                const items = await OBR.scene.items.getItems();
                const initItems = items.filter(
                    (item) =>
                        item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
                );

                const sortedItems = [...initItems].sort((a, b) => {
                    const metaA = a.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                    const metaB = b.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                    return (metaB?.value || 0) - (metaA?.value || 0);
                });

                sortedItems.forEach((item) => {
                    const imgItem = item as Image;
                    const meta = item.metadata;
                    const statsMeta = (meta['pokerole-extension/stats'] || meta) as Record<string, unknown>;
                    const initMeta = meta['pokerole-pmd-extension/initiative'] as
                        | { value?: number; base?: number }
                        | undefined;

                    const globalStore = useCharacterStore.getState();
                    const baseInitVal = calculateBaseInitFromCharacterData(statsMeta, globalStore);
                    let initDisplay = String(baseInitVal);
                    if (initMeta?.value !== undefined && typeof initMeta.base === 'number' && initMeta.base > 0) {
                        initDisplay = String(Math.floor(initMeta.value));
                    }

                    // Parse held items from Combat, Social, Hand slots + active inventory items
                    const heldItems: string[] = [];
                    const combatSlot = typeof statsMeta['combat'] === 'string' ? statsMeta['combat'].trim() : '';
                    const socialSlot = typeof statsMeta['social'] === 'string' ? statsMeta['social'].trim() : '';
                    const handSlot = typeof statsMeta['hand'] === 'string' ? statsMeta['hand'].trim() : '';

                    if (combatSlot) heldItems.push(combatSlot);
                    if (socialSlot && !heldItems.includes(socialSlot)) heldItems.push(socialSlot);
                    if (handSlot && !heldItems.includes(handSlot)) heldItems.push(handSlot);

                    try {
                        const rawInv = statsMeta['inv-data'] ? JSON.parse(String(statsMeta['inv-data'])) : [];
                        if (Array.isArray(rawInv)) {
                            rawInv
                                .filter((i: Record<string, unknown>) => i.active === true || i.active === 'true')
                                .map((i: Record<string, unknown>) => String(i.name || '').trim())
                                .filter(Boolean)
                                .forEach((itemName) => {
                                    if (!heldItems.includes(itemName)) {
                                        heldItems.push(itemName);
                                    }
                                });
                        }
                    } catch (e) {
                        console.warn('[useBattleOrganizer] Failed to parse inventory items:', e);
                    }

                    const heldItemText = heldItems.join(', ');

                    // Parse statuses & health/will
                    const { statusText, isFainted } = parseStatusesFromMetadata(statsMeta);
                    const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                        parseHealthAndWillFromMetadata(statsMeta);

                    const actionsUsed = Number(statsMeta['actions-used'] || 0);
                    const evadeUsed = statsMeta['evasions-used'] === true || statsMeta['evasions-used'] === 'true';
                    const clashUsed = statsMeta['clashes-used'] === true || statsMeta['clashes-used'] === 'true';

                    const actions = createDefaultActions();
                    for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                        actions[i] = { text: actions[i].text, status: 'none' };
                    }

                    const displayName = extractCharacterName(statsMeta, item.name);
                    const tokenImg = imgItem.image?.url || extractTokenImage(statsMeta) || extractTokenImage(meta);

                    const isNPC =
                        statsMeta['is-npc'] === true ||
                        statsMeta['is-npc'] === 'true' ||
                        meta['is-npc'] === true ||
                        meta['is-npc'] === 'true';

                    combatantRows.push({
                        id: crypto.randomUUID(),
                        tokenId: item.id,
                        initiative: initDisplay,
                        baseInit: baseInitVal,
                        name: displayName,
                        image: tokenImg,
                        heldItem: heldItemText,
                        status: statusText,
                        isFainted,
                        actions,
                        evadeUsed,
                        clashUsed,
                        isPlayerSide: true,
                        hpCurr,
                        hpMax,
                        willCurr,
                        willMax,
                        tempHp,
                        tempWill,
                        activeTransformation,
                        isNPC
                    });
                });
            }

            if (combatantRows.length > 0) {
                updateState((prev) => {
                    const currentRound = prev.rounds[prev.activeRoundIndex];
                    if (!currentRound) return prev;
                    const updatedRound: BattleRoundData = {
                        ...currentRound,
                        combatants: combatantRows
                    };
                    const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
                    return { ...prev, rounds: newRounds };
                });

                if (OBR.isAvailable) {
                    OBR.notification.show(`Pulled ${combatantRows.length} combatants from Initiative!`, 'SUCCESS');
                }
            } else {
                if (OBR.isAvailable) {
                    OBR.notification.show('No active initiative combatants found.', 'WARNING');
                }
            }
        } catch (e) {
            console.error('[BattleOrganizer] Error pulling from initiative:', e);
        }
    }, [updateState]);

    // --- Sync Back to Character Sheets ---
    const syncToSheets = useCallback(async () => {
        try {
            const currentRound = state.rounds[state.activeRoundIndex];
            if (!currentRound) return;

            let updatedCount = 0;

            if (OBR.isAvailable && !isStandaloneMode) {
                await OBR.scene.items.updateItems(
                    (item) => item.layer === 'CHARACTER',
                    (items) => {
                        items.forEach((item) => {
                            const combatant = currentRound.combatants.find((c) => c.tokenId === item.id);
                            if (combatant) {
                                const usedActionsCount = combatant.actions.filter((a) => a.status === 'success').length;
                                item.metadata['actions-used'] = usedActionsCount;
                                item.metadata['evasions-used'] = combatant.evadeUsed;
                                item.metadata['clashes-used'] = combatant.clashUsed;
                                updatedCount++;
                            }
                        });
                    }
                );
            } else {
                for (const combatant of currentRound.combatants) {
                    if (combatant.tokenId) {
                        const usedActionsCount = combatant.actions.filter((a) => a.status === 'success').length;
                        try {
                            await storageAdapter.saveCharacter(
                                combatant.tokenId,
                                {
                                    'actions-used': usedActionsCount,
                                    'evasions-used': combatant.evadeUsed,
                                    'clashes-used': combatant.clashUsed
                                },
                                'pokerole-extension/stats'
                            );
                            updatedCount++;
                        } catch (e) {
                            console.warn('[BattleOrganizer] Error saving character update:', e);
                        }
                    }
                }

                const globalStore = useCharacterStore.getState();
                if (globalStore.tokenId) {
                    const activeCombatant = currentRound.combatants.find((c) => c.tokenId === globalStore.tokenId);
                    if (activeCombatant) {
                        const usedActionsCount = activeCombatant.actions.filter((a) => a.status === 'success').length;
                        globalStore.updateTracker('actions', usedActionsCount);
                        globalStore.updateTracker('evade', activeCombatant.evadeUsed);
                        globalStore.updateTracker('clash', activeCombatant.clashUsed);
                    }
                }
            }

            if (OBR.isAvailable) {
                OBR.notification.show(`Synced actions & reactions for ${updatedCount} tokens!`, 'SUCCESS');
            }
        } catch (e) {
            console.error('[BattleOrganizer] Error syncing to sheets:', e);
        }
    }, [state.rounds, state.activeRoundIndex]);

    // --- Round Management ---
    const addRound = useCallback(() => {
        updateState((prev) => {
            const nextRoundNumber = prev.rounds.length + 1;
            const currentRound = prev.rounds[prev.activeRoundIndex];
            const freshCombatants = currentRound
                ? currentRound.combatants.map((c) => ({
                      ...c,
                      id: crypto.randomUUID(),
                      actions: createDefaultActions(),
                      evadeUsed: false,
                      clashUsed: false
                  }))
                : [
                      createDefaultCombatant('', '', true),
                      createDefaultCombatant('', '', true),
                      createDefaultCombatant('', '', false),
                      createDefaultCombatant('', '', false)
                  ];

            const newRound: BattleRoundData = {
                id: crypto.randomUUID(),
                roundNumber: nextRoundNumber,
                combatants: freshCombatants,
                endOfRoundEffects: ''
            };

            return {
                ...prev,
                rounds: [...prev.rounds, newRound],
                activeRoundIndex: prev.rounds.length
            };
        });
    }, [updateState]);

    const duplicateRound = useCallback(
        (roundIndex: number) => {
            updateState((prev) => {
                const targetRound = prev.rounds[roundIndex];
                if (!targetRound) return prev;

                const clonedRound: BattleRoundData = {
                    id: crypto.randomUUID(),
                    roundNumber: prev.rounds.length + 1,
                    combatants: targetRound.combatants.map((c) => ({
                        ...c,
                        id: crypto.randomUUID(),
                        actions: c.actions.map((a) => ({ ...a })) as CombatantRowData['actions']
                    })),
                    endOfRoundEffects: targetRound.endOfRoundEffects
                };

                return {
                    ...prev,
                    rounds: [...prev.rounds, clonedRound],
                    activeRoundIndex: prev.rounds.length
                };
            });
        },
        [updateState]
    );

    const deleteRound = useCallback(
        (roundIndex: number) => {
            updateState((prev) => {
                if (prev.rounds.length <= 1) return prev;
                const newRounds = prev.rounds.filter((_, idx) => idx !== roundIndex);
                const nextActiveIdx = Math.max(0, Math.min(newRounds.length - 1, prev.activeRoundIndex));
                return {
                    ...prev,
                    rounds: newRounds,
                    activeRoundIndex: nextActiveIdx
                };
            });
        },
        [updateState]
    );

    const setActiveRoundIndex = useCallback(
        (index: number) => {
            updateState((prev) => ({
                ...prev,
                activeRoundIndex: Math.max(0, Math.min(prev.rounds.length - 1, index))
            }));
        },
        [updateState]
    );

    // --- Advance Round & Decrement Timers ---
    const advanceRound = useCallback(() => {
        updateState((prev) => {
            // 1. Decrement all Battlefield Remaining Rounds timers
            const dec = (timer: BattleOrganizerTimerEffect): BattleOrganizerTimerEffect => ({
                ...timer,
                remainingRounds: Math.max(0, timer.remainingRounds - 1)
            });

            const newBattlefield: BattlefieldData = {
                ...prev.battlefield,
                weather: dec(prev.battlefield.weather),
                terrain: dec(prev.battlefield.terrain),
                other: dec(prev.battlefield.other),
                playerSide: {
                    ...prev.battlefield.playerSide,
                    forceFields: [
                        dec(prev.battlefield.playerSide.forceFields[0]),
                        dec(prev.battlefield.playerSide.forceFields[1])
                    ]
                },
                foeSide: {
                    ...prev.battlefield.foeSide,
                    forceFields: [
                        dec(prev.battlefield.foeSide.forceFields[0]),
                        dec(prev.battlefield.foeSide.forceFields[1])
                    ]
                }
            };

            // 2. Check if we need to spawn the next round
            const isLastRound = prev.activeRoundIndex === prev.rounds.length - 1;
            const newRounds = [...prev.rounds];
            const nextIndex = prev.activeRoundIndex + 1;

            if (isLastRound) {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                const freshCombatants = currentRound.combatants.map((c) => ({
                    ...c,
                    id: crypto.randomUUID(),
                    actions: createDefaultActions(),
                    evadeUsed: false,
                    clashUsed: false
                }));

                newRounds.push({
                    id: crypto.randomUUID(),
                    roundNumber: (currentRound.roundNumber || prev.rounds.length) + 1,
                    combatants: freshCombatants,
                    endOfRoundEffects: ''
                });
            }

            return {
                battlefield: newBattlefield,
                rounds: newRounds,
                activeRoundIndex: nextIndex
            };
        });

        if (OBR.isAvailable) {
            OBR.notification.show('Round ended! Battlefield timers ticked down.', 'INFO');
        }
    }, [updateState]);

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
            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;
                const updatedRound: BattleRoundData = {
                    ...currentRound,
                    combatants: currentRound.combatants.map((c) => (c.id === updated.id ? updated : c))
                };
                const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
                return { ...prev, rounds: newRounds };
            });
        },
        [updateState]
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

    // --- Battlefield Direct Updates ---
    const updateBattlefield = useCallback(
        <K extends keyof BattlefieldData>(field: K, value: BattlefieldData[K]) => {
            updateState((prev) => ({
                ...prev,
                battlefield: {
                    ...prev.battlefield,
                    [field]: value
                }
            }));
        },
        [updateState]
    );

    const updateBattlefieldWeather = useCallback(
        (field: keyof BattleOrganizerTimerEffect, val: string | number) => {
            updateState((prev) => ({
                ...prev,
                battlefield: {
                    ...prev.battlefield,
                    weather: {
                        ...prev.battlefield.weather,
                        [field]: val
                    }
                }
            }));
        },
        [updateState]
    );

    const updateBattlefieldTerrain = useCallback(
        (field: keyof BattleOrganizerTimerEffect, val: string | number) => {
            updateState((prev) => ({
                ...prev,
                battlefield: {
                    ...prev.battlefield,
                    terrain: {
                        ...prev.battlefield.terrain,
                        [field]: val
                    }
                }
            }));
        },
        [updateState]
    );

    const updateBattlefieldOther = useCallback(
        (field: keyof BattleOrganizerTimerEffect, val: string | number) => {
            updateState((prev) => ({
                ...prev,
                battlefield: {
                    ...prev.battlefield,
                    other: {
                        ...prev.battlefield.other,
                        [field]: val
                    }
                }
            }));
        },
        [updateState]
    );

    const updatePlayerSide = useCallback(
        <K extends keyof BattlefieldData['playerSide']>(field: K, val: BattlefieldData['playerSide'][K]) => {
            updateState((prev) => ({
                ...prev,
                battlefield: {
                    ...prev.battlefield,
                    playerSide: {
                        ...prev.battlefield.playerSide,
                        [field]: val
                    }
                }
            }));
        },
        [updateState]
    );

    const updateFoeSide = useCallback(
        <K extends keyof BattlefieldData['foeSide']>(field: K, val: BattlefieldData['foeSide'][K]) => {
            updateState((prev) => ({
                ...prev,
                battlefield: {
                    ...prev.battlefield,
                    foeSide: {
                        ...prev.battlefield.foeSide,
                        [field]: val
                    }
                }
            }));
        },
        [updateState]
    );

    const updateEndOfRoundEffects = useCallback(
        (text: string) => {
            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;
                const updatedRound: BattleRoundData = {
                    ...currentRound,
                    endOfRoundEffects: text
                };
                const newRounds = prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r));
                return { ...prev, rounds: newRounds };
            });
        },
        [updateState]
    );

    const updateRoundNumber = useCallback(
        (roundIndex: number, newRoundNumber: number) => {
            updateState((prev) => {
                if (!prev.rounds[roundIndex]) return prev;
                const newRounds = prev.rounds.map((r, idx) =>
                    idx === roundIndex ? { ...r, roundNumber: Math.max(1, newRoundNumber) } : r
                );
                return { ...prev, rounds: newRounds };
            });
        },
        [updateState]
    );

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
                if (combatantToSync.tokenId) {
                    const tokenId = combatantToSync.tokenId;
                    const nextHp = combatantToSync.hpCurr;
                    storageAdapter
                        .saveCharacter(tokenId, { 'hp-curr': nextHp }, 'pokerole-extension/stats')
                        .catch((e) => console.warn('[useBattleOrganizer] HP sync failed:', e));
                }

                const updatedRound: BattleRoundData = { ...currentRound, combatants: newCombatants };
                return {
                    ...prev,
                    rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                };
            });
        },
        [updateState]
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
                if (combatantToSync.tokenId) {
                    const tokenId = combatantToSync.tokenId;
                    const nextWill = combatantToSync.willCurr;
                    storageAdapter
                        .saveCharacter(tokenId, { 'will-curr': nextWill }, 'pokerole-extension/stats')
                        .catch((e) => console.warn('[useBattleOrganizer] Will sync failed:', e));
                }

                const updatedRound: BattleRoundData = { ...currentRound, combatants: newCombatants };
                return {
                    ...prev,
                    rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                };
            });
        },
        [updateState]
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
