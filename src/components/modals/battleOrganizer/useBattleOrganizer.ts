import { useState, useEffect, useCallback } from 'react';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { extractTokenImage, calculateBaseInitFromCharacterData } from '../../../utils/initiativeHelpers';
import type {
    BattleOrganizerState,
    BattlefieldData,
    BattleRoundData,
    CombatantRowData,
    ActionSlotData,
    BattleOrganizerTimerEffect
} from '../../../types/battleOrganizerTypes';

const STORAGE_KEY = 'pkr_battle_organizer_data';
const OBR_SCENE_META_KEY = 'pokerole-pmd-extension/battle-organizer';

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
    isPlayerSide: isPlayer
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

    const globalState = useCharacterStore();

    // 1. Save State to localStorage / OBR
    const persistState = useCallback((newState: BattleOrganizerState) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (e) {
            console.error('[BattleOrganizer] Failed to save state to localStorage:', e);
        }

        if (OBR.isAvailable && !isStandaloneMode) {
            try {
                OBR.scene.setMetadata({
                    [OBR_SCENE_META_KEY]: JSON.stringify(newState)
                });
            } catch (e) {
                console.error('[BattleOrganizer] Failed to save state to OBR scene:', e);
            }
        }
    }, []);

    const updateState = useCallback(
        (updater: (prev: BattleOrganizerState) => BattleOrganizerState) => {
            setState((prev) => {
                const updated = updater(prev);
                persistState(updated);
                return updated;
            });
        },
        [persistState]
    );

    // 2. Load from OBR Scene on Mount / Room Load
    useEffect(() => {
        if (!OBR.isAvailable || isStandaloneMode) return;

        const loadObrState = async () => {
            try {
                const metadata = await OBR.scene.getMetadata();
                const rawSceneData = metadata[OBR_SCENE_META_KEY];
                if (typeof rawSceneData === 'string' && rawSceneData.trim()) {
                    const parsed = JSON.parse(rawSceneData);
                    if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                        setState(parsed);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                    }
                }
            } catch (e) {
                console.error('[BattleOrganizer] Failed to load initial OBR scene metadata:', e);
            }
        };

        loadObrState();

        const unsub = OBR.scene.onMetadataChange((meta) => {
            try {
                const raw = meta[OBR_SCENE_META_KEY];
                if (typeof raw === 'string' && raw.trim()) {
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.rounds)) {
                        setState(parsed);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                    }
                }
            } catch (e) {
                console.error('[BattleOrganizer] Error syncing remote scene state:', e);
            }
        });

        return () => {
            unsub();
        };
    }, []);

    // 3. Listen to local storage changes
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && Array.isArray(parsed.rounds)) {
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
                        } catch {}

                        const heldItemText = heldItems.join(', ');

                        // Parse statuses
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
                        } catch {}

                        const actionsUsed = Number(meta['actions-used'] || 0);
                        const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                        const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                        const actions = createDefaultActions();
                        for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                            actions[i] = { text: actions[i].text, status: 'success' };
                        }

                        const baseInitVal = calculateBaseInitFromCharacterData(matchingChar?.metadata || initItem, globalState);
                        let initScore = String(baseInitVal);
                        if (typeof initItem.total === 'number' && typeof initItem.d6 === 'number' && initItem.d6 > 0) {
                            initScore = String(initItem.total);
                        } else if (typeof initItem.total === 'number' && initItem.total > 0) {
                            initScore = String(initItem.total);
                        }
                        const isFainted = statusText.toLowerCase().includes('faint');

                        const charNickname =
                            typeof meta['nickname'] === 'string' && meta['nickname'].trim()
                                ? meta['nickname'].trim()
                                : matchingChar && typeof (matchingChar.metadata as Record<string, unknown> | undefined)?.nickname === 'string'
                                  ? String((matchingChar.metadata as Record<string, unknown>).nickname).trim()
                                  : '';

                        const displayName = charNickname || String(initItem.name || matchingChar?.name || meta['species'] || `Combatant ${idx + 1}`);

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
                            isPlayerSide: true
                        });
                    });
                }
            } else if (OBR.isAvailable) {
                const items = await OBR.scene.items.getItems();
                const initItems = items.filter(
                    (item) => item.layer === 'CHARACTER' && item.metadata['pokerole-pmd-extension/initiative'] !== undefined
                );

                const sortedItems = [...initItems].sort((a, b) => {
                    const metaA = a.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                    const metaB = b.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                    return (metaB?.value || 0) - (metaA?.value || 0);
                });

                sortedItems.forEach((item) => {
                    const imgItem = item as Image;
                    const meta = item.metadata;
                    const initMeta = meta['pokerole-pmd-extension/initiative'] as { value?: number; base?: number } | undefined;

                    const baseInitVal = calculateBaseInitFromCharacterData(meta, globalState);
                    let initDisplay = String(baseInitVal);
                    if (initMeta?.value !== undefined && typeof initMeta.base === 'number' && initMeta.base > 0) {
                        initDisplay = String(Math.floor(initMeta.value));
                    }

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
                    } catch {}

                    const heldItemText = heldItems.join(', ');

                    // Parse statuses
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
                    } catch {}

                    const actionsUsed = Number(meta['actions-used'] || 0);
                    const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                    const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                    const actions = createDefaultActions();
                    for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                        actions[i] = { text: actions[i].text, status: 'success' };
                    }

                    const isFainted = statusText.toLowerCase().includes('faint');

                    const obrNickname =
                        typeof meta['nickname'] === 'string' && meta['nickname'].trim()
                            ? meta['nickname'].trim()
                            : typeof (meta['pokerole-pmd-extension/stats'] as Record<string, unknown> | undefined)?.nickname === 'string' &&
                                (meta['pokerole-pmd-extension/stats'] as Record<string, unknown>).nickname
                              ? String((meta['pokerole-pmd-extension/stats'] as Record<string, unknown>).nickname).trim()
                              : typeof meta['name'] === 'string' && meta['name'].trim()
                                ? meta['name'].trim()
                                : '';

                    const displayName = obrNickname || item.name;

                    combatantRows.push({
                        id: crypto.randomUUID(),
                        tokenId: item.id,
                        initiative: initDisplay,
                        baseInit: baseInitVal,
                        name: displayName,
                        image: imgItem.image?.url || extractTokenImage(meta),
                        heldItem: heldItemText,
                        status: statusText,
                        isFainted,
                        actions,
                        evadeUsed,
                        clashUsed,
                        isPlayerSide: true
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

                if (globalState.tokenId) {
                    const activeCombatant = currentRound.combatants.find((c) => c.tokenId === globalState.tokenId);
                    if (activeCombatant) {
                        const usedActionsCount = activeCombatant.actions.filter((a) => a.status === 'success').length;
                        globalState.updateTracker('actions', usedActionsCount);
                        globalState.updateTracker('evade', activeCombatant.evadeUsed);
                        globalState.updateTracker('clash', activeCombatant.clashUsed);
                    }
                }
            }

            if (OBR.isAvailable) {
                OBR.notification.show(`Synced actions & reactions for ${updatedCount} tokens!`, 'SUCCESS');
            }
        } catch (e) {
            console.error('[BattleOrganizer] Error syncing to sheets:', e);
        }
    }, [state.rounds, state.activeRoundIndex, globalState]);

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
            let newRounds = [...prev.rounds];
            let nextIndex = prev.activeRoundIndex + 1;

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
                if (isStandaloneMode) {
                    try {
                        const localChars = await storageAdapter.getLocalCharacters();
                        const match = localChars.find((c) => c.id === target.tokenId);
                        if (match?.metadata) {
                            tokenBaseInit = calculateBaseInitFromCharacterData(match.metadata, globalState);
                        }
                    } catch (e) {
                        console.warn('[BattleOrganizer] Failed to load local character for init roll:', e);
                    }
                } else if (OBR.isAvailable) {
                    try {
                        const items = await OBR.scene.items.getItems([target.tokenId]);
                        if (items.length > 0 && items[0].metadata) {
                            tokenBaseInit = calculateBaseInitFromCharacterData(items[0].metadata, globalState);
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
                        let base = tokenBaseInit !== null ? tokenBaseInit : (c.baseInit !== undefined && c.baseInit > 0 ? c.baseInit : 0);
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
        [state.rounds, state.activeRoundIndex, globalState, updateState]
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

    const clearAll = useCallback(() => {
        const fresh = createDefaultState();
        setState(fresh);
        persistState(fresh);
    }, [persistState]);

    return {
        state,
        battlefield: state.battlefield,
        rounds: state.rounds,
        activeRoundIndex: state.activeRoundIndex,
        currentRound: state.rounds[state.activeRoundIndex],
        setActiveRoundIndex,
        pullFromInitiative,
        syncToSheets,
        addRound,
        duplicateRound,
        deleteRound,
        advanceRound,
        addCombatant,
        updateCombatant,
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
        clearAll
    };
}
