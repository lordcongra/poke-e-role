import { useState, useEffect, useCallback } from 'react';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
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

        let isMounted = true;
        const unsubs: Array<() => void> = [];

        OBR.onReady(async () => {
            if (!isMounted) return;

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
            unsubs.push(unsub);
        });

        return () => {
            isMounted = false;
            unsubs.forEach((u) => u());
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

    // 4. Real-time token metadata sync & Roll Log integration
    useEffect(() => {
        const unsubs: Array<() => void> = [];

        // Helper to apply incoming roll to the active round
        const applyRollToCombatants = (logData: Record<string, unknown>) => {
            const settings = getBattleOrganizerSettings();
            if (!settings.autoSyncActions || !logData) return;

            const label = String(logData.label || logData.title || '');
            const fallbackCharName = String(logData.characterName || logData.player || '');
            const rollTokenId = String(logData.tokenId || '');

            const clean = label.replace(/^\[PRIVATE\]\s*/i, '').replace(/^[📢🎲💥🩹🍀🎯🛡️❄️]\s*/u, '').trim();

            let charName = fallbackCharName;
            let moveName = '';

            // Format 1: "{Char} rolled {Move} (Acc)..." or "(Damage)" or "(Attack)"
            const matchAccDmg = clean.match(/^(.+?)\s+rolled\s+(.+?)\s*\((?:Acc|Damage|Attack)\)/i);
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
                    const matchSimple = clean.match(/^(.+?)\s*(?:\(Acc\)|\(Damage\)|\(Attack\))/i);
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

            updateState((prev) => {
                const currentRound = prev.rounds[prev.activeRoundIndex];
                if (!currentRound) return prev;

                let changed = false;
                const newCombatants = currentRound.combatants.map((c) => {
                    const isMatch =
                        (rollTokenId && c.tokenId && rollTokenId === c.tokenId) ||
                        (charName && c.name.toLowerCase().trim() === charName.toLowerCase().trim()) ||
                        (c.name.trim() && label.toLowerCase().includes(c.name.toLowerCase().trim()));

                    if (!isMatch) return c;

                    const newActions = [...c.actions] as CombatantRowData['actions'];

                    // Don't duplicate move name if it is already in an action slot (e.g. rolling damage right after accuracy)
                    const alreadyPresent = newActions.some(
                        (a) => a.text.trim().toLowerCase() === moveName.toLowerCase().trim()
                    );
                    if (alreadyPresent) return c;

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
                    rounds: prev.rounds.map((r, idx) =>
                        idx === prev.activeRoundIndex ? updatedRound : r
                    )
                };
            });
        };

        // OBR scene items change listener
        if (OBR.isAvailable) {
            OBR.onReady(() => {
                const unsubItems = OBR.scene.items.onChange((items) => {
                    const settings = getBattleOrganizerSettings();
                    if (!settings.autoSyncActions) return;

                    updateState((prev) => {
                        const currentRound = prev.rounds[prev.activeRoundIndex];
                        if (!currentRound) return prev;

                        let hasChanges = false;
                        const newCombatants = currentRound.combatants.map((combatant) => {
                            const matchingItem = items.find((item) => {
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

                            const actionsUsed = Number(meta['actions-used'] || 0);
                            const evadeUsed =
                                meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                            const clashUsed =
                                meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                            const nextActions = [...combatant.actions] as CombatantRowData['actions'];

                            // Sync reactions and clear statuses only if tracker was reset to 0
                            if (actionsUsed === 0) {
                                for (let i = 0; i < 5; i++) {
                                    if (nextActions[i].status !== 'none') {
                                        nextActions[i] = { ...nextActions[i], status: 'none' };
                                        updated = true;
                                    }
                                }
                            }

                            if (combatant.evadeUsed !== evadeUsed || combatant.clashUsed !== clashUsed) {
                                updated = true;
                            }

                            if (updated || (!combatant.tokenId && matchingItem.id)) {
                                hasChanges = true;
                                return {
                                    ...combatant,
                                    name: nextName,
                                    image: nextImage,
                                    tokenId: matchingItem.id,
                                    actions: nextActions,
                                    evadeUsed,
                                    clashUsed
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
                            rounds: prev.rounds.map((r, idx) =>
                                idx === prev.activeRoundIndex ? updatedRound : r
                            )
                        };
                    });
                });
                unsubs.push(unsubItems);

                // Listen to OBR roll-log-sync broadcast (remote and local)
                const unsubRollLog = OBR.broadcast.onMessage(
                    'pokerole-pmd-extension/roll-log-sync',
                    (event) => applyRollToCombatants(event.data as Record<string, unknown>)
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
                if (!settings.autoSyncActions) return;

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

                        const actionsUsed = Number(meta['actions-used'] || 0);
                        const evadeUsed =
                            meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                        const clashUsed =
                            meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                        const nextActions = [...combatant.actions] as CombatantRowData['actions'];

                        // Sync reactions and clear statuses only if tracker was reset to 0
                        if (actionsUsed === 0) {
                            for (let i = 0; i < 5; i++) {
                                if (nextActions[i].status !== 'none') {
                                    nextActions[i] = { ...nextActions[i], status: 'none' };
                                    updated = true;
                                }
                            }
                        }

                        if (combatant.evadeUsed !== evadeUsed || combatant.clashUsed !== clashUsed) {
                            updated = true;
                        }

                        if (updated || (!combatant.tokenId && matchingChar.id)) {
                            hasChanges = true;
                            return {
                                ...combatant,
                                name: nextName,
                                image: nextImage,
                                tokenId: matchingChar.id,
                                actions: nextActions,
                                evadeUsed,
                                clashUsed
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
                        rounds: prev.rounds.map((r, idx) =>
                            idx === prev.activeRoundIndex ? updatedRound : r
                        )
                    };
                });
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

                        // Parse statuses
                        let statusText = 'Healthy';
                        try {
                            const rawStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [];
                            if (Array.isArray(rawStatuses)) {
                                const nonHealthy = rawStatuses
                                    .filter((s: Record<string, unknown>) => s.name && s.name !== 'Healthy')
                                    .map((s: Record<string, unknown>) => {
                                        const n =
                                            s.name === 'Custom...' ? String(s.customName || 'Custom') : String(s.name);
                                        const r = Number(s.rounds || 0);
                                        return r > 0 ? `${n} (${r})` : n;
                                    });
                                if (nonHealthy.length > 0) statusText = nonHealthy.join(', ');
                            }
                        } catch (e) {
                            console.warn('[useBattleOrganizer] Failed to parse status list:', e);
                        }

                        const actionsUsed = Number(meta['actions-used'] || 0);
                        const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                        const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                        const actions = createDefaultActions();
                        for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                            actions[i] = { text: actions[i].text, status: 'none' };
                        }

                        const baseInitVal = calculateBaseInitFromCharacterData(
                            matchingChar?.metadata || initItem,
                            globalState
                        );
                        let initScore = String(baseInitVal);
                        if (typeof initItem.total === 'number' && typeof initItem.d6 === 'number' && initItem.d6 > 0) {
                            initScore = String(initItem.total);
                        } else if (typeof initItem.total === 'number' && initItem.total > 0) {
                            initScore = String(initItem.total);
                        }
                        const isFainted = statusText.toLowerCase().includes('faint');

                        const displayName = extractCharacterName(
                            (matchingChar?.metadata || initItem) as Record<string, unknown>,
                            String(matchingChar?.name || initItem.name || `Combatant ${idx + 1}`)
                        );

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
                    const initMeta = meta['pokerole-pmd-extension/initiative'] as
                        | { value?: number; base?: number }
                        | undefined;

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
                    } catch (e) {
                        console.warn('[useBattleOrganizer] Failed to parse inventory items:', e);
                    }

                    const heldItemText = heldItems.join(', ');

                    // Parse statuses
                    let statusText = 'Healthy';
                    try {
                        const rawStatuses = meta['status-list'] ? JSON.parse(String(meta['status-list'])) : [];
                        if (Array.isArray(rawStatuses)) {
                            const nonHealthy = rawStatuses
                                .filter((s: Record<string, unknown>) => s.name && s.name !== 'Healthy')
                                .map((s: Record<string, unknown>) => {
                                    const n =
                                        s.name === 'Custom...' ? String(s.customName || 'Custom') : String(s.name);
                                    const r = Number(s.rounds || 0);
                                    return r > 0 ? `${n} (${r})` : n;
                                });
                            if (nonHealthy.length > 0) statusText = nonHealthy.join(', ');
                        }
                    } catch (e) {
                        console.warn('[useBattleOrganizer] Failed to parse status list:', e);
                    }

                    const actionsUsed = Number(meta['actions-used'] || 0);
                    const evadeUsed = meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                    const clashUsed = meta['clashes-used'] === true || meta['clashes-used'] === 'true';

                    const actions = createDefaultActions();
                    for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                        actions[i] = { text: actions[i].text, status: 'none' };
                    }

                    const isFainted = statusText.toLowerCase().includes('faint');

                    const statsMeta = (meta['pokerole-extension/stats'] || meta) as Record<string, unknown>;
                    const displayName = extractCharacterName(statsMeta, item.name);
                    const tokenImg =
                        imgItem.image?.url || extractTokenImage(statsMeta) || extractTokenImage(meta);

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
    }, [updateState, globalState]);

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
                        window.dispatchEvent(
                            new CustomEvent('pkr-select-character', { detail: { id: match.id } })
                        );
                        const store = useCharacterStore.getState();
                        setActiveTokenId(match.id);
                        store.setTokenData(match.id, 'PLAYER');
                        store.loadFromOwlbear((match.metadata || {}) as Record<string, unknown>);
                        const tokenImgUrl = combatant.image || extractTokenImage(match.metadata as Record<string, unknown>);
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
        openSheet,
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
        updateRoundNumber,
        clearAll
    };
}
