import { useCallback, useEffect } from 'react';
import OBR, { type Image, type Item } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import {
    extractTokenImage,
    extractCharacterName,
    calculateBaseInitFromCharacterData
} from '../../../utils/initiativeHelpers';
import { getBattleOrganizerSettings } from './battleOrganizerSettingsHelper';
import type { StatusItem } from '../../../store/storeTypes';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import {
    parseStatusesFromMetadata,
    mapStatusTextToStatusItems,
    resolveCombatantTokenId,
    parseHealthAndWillFromMetadata,
    parseHeldItemsFromMetadata,
    createDefaultActions
} from './battleOrganizerUtils';

export interface UseBattleOrganizerTokenOpsProps {
    state: BattleOrganizerState;
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
    lastTokenFingerprintsRef: React.MutableRefObject<Map<string, string>>;
    tokenSyncTimersRef: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
    pendingTokenSyncRef: React.MutableRefObject<
        Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
    >;
}

export function useBattleOrganizerTokenOps({
    state,
    updateState,
    lastTokenFingerprintsRef,
    tokenSyncTimersRef,
    pendingTokenSyncRef
}: UseBattleOrganizerTokenOpsProps) {
    // 1. On-Demand & 30-Second Gentle Token Stats Soft-Sync
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
                            const pending = pendingTokenSyncRef.current.get(matchingItem.id);
                            if (pending) {
                                if (Date.now() < pending.until) {
                                    return combatant;
                                }
                                pendingTokenSyncRef.current.delete(matchingItem.id);
                            }

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

                            let nextIsNPC = combatant.isNPC;
                            if (isNPC !== combatant.isNPC) {
                                nextIsNPC = isNPC;
                                updated = true;
                            }

                            if (updated || (!combatant.tokenId && matchingItem.id)) {
                                hasChanges = true;
                                changesFound = true;
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
                                    evadeUsed: nextEvade,
                                    clashUsed: nextClash,
                                    isNPC: nextIsNPC
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

                if (!silent && OBR.isAvailable) {
                    if (changesFound) {
                        OBR.notification.show('Combatant stats synchronized with character tokens.', 'SUCCESS');
                    } else {
                        OBR.notification.show('Combatants are already up-to-date with character tokens.', 'INFO');
                    }
                }
            } catch (err) {
                console.warn('[BattleOrganizer] Soft-sync error:', err);
            }
            return changesFound;
        },
        [lastTokenFingerprintsRef, pendingTokenSyncRef, updateState]
    );

    // 2. Gentle 30-second soft-sync interval (paused when tab/window is hidden)
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

    // 3. Pull from Initiative / Character Sheets
    const pullFromInitiative = useCallback(
        async (options?: { resetTrackers?: boolean }) => {
            const shouldReset = options?.resetTrackers !== false;

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

                            const heldItemText = parseHeldItemsFromMetadata(meta);

                            // Parse statuses & health/will
                            const { statusText, isFainted } = parseStatusesFromMetadata(meta);
                            const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                                parseHealthAndWillFromMetadata(meta);

                            const actionsUsed = shouldReset ? 0 : Number(meta['actions-used'] || 0);
                            const evadeUsed = shouldReset
                                ? false
                                : meta['evasions-used'] === true || meta['evasions-used'] === 'true';
                            const clashUsed = shouldReset
                                ? false
                                : meta['clashes-used'] === true || meta['clashes-used'] === 'true';

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
                            if (
                                typeof initItem.total === 'number' &&
                                typeof initItem.d6 === 'number' &&
                                initItem.d6 > 0
                            ) {
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
                                image: matchingChar?.metadata?.tokenImageUrl
                                    ? String(matchingChar.metadata.tokenImageUrl)
                                    : '',
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
                    const isReady = await OBR.scene.isReady();
                    if (!isReady) return;

                    const allItems = await OBR.scene.items.getItems((item) => item.layer === 'CHARACTER');
                    const initItems = allItems.filter((item) => item.metadata['pokerole-pmd-extension/initiative']);

                    const sortedItems = [...initItems].sort((a, b) => {
                        const metaA = a.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                        const metaB = b.metadata['pokerole-pmd-extension/initiative'] as { value?: number } | undefined;
                        return (metaB?.value || 0) - (metaA?.value || 0);
                    });

                    sortedItems.forEach((item) => {
                        const imgItem = item as Image;
                        const meta = item.metadata;
                        const statsMeta = (meta['pokerole-extension/stats'] || meta) as Record<string, unknown>;

                        const heldItemText = parseHeldItemsFromMetadata(statsMeta);

                        // Parse statuses & health/will
                        const { statusText, isFainted } = parseStatusesFromMetadata(statsMeta);
                        const { hpCurr, hpMax, willCurr, willMax, tempHp, tempWill, activeTransformation } =
                            parseHealthAndWillFromMetadata(statsMeta);

                        const actionsUsed = shouldReset ? 0 : Number(statsMeta['actions-used'] || 0);
                        const evadeUsed = shouldReset
                            ? false
                            : statsMeta['evasions-used'] === true || statsMeta['evasions-used'] === 'true';
                        const clashUsed = shouldReset
                            ? false
                            : statsMeta['clashes-used'] === true || statsMeta['clashes-used'] === 'true';

                        const actions = createDefaultActions();
                        for (let i = 0; i < Math.min(5, actionsUsed); i++) {
                            actions[i] = { text: actions[i].text, status: 'none' };
                        }

                        const initMeta = meta['pokerole-pmd-extension/initiative'] as
                            | { value?: number; base?: number; tiebreaker?: number }
                            | undefined;
                        const initVal = initMeta?.value ?? 0;
                        const baseInit =
                            initMeta?.base !== undefined
                                ? initMeta.base
                                : calculateBaseInitFromCharacterData(meta, useCharacterStore.getState());

                        const charName = extractCharacterName(statsMeta, item.name);
                        const tokenImage = imgItem.image?.url || extractTokenImage(statsMeta) || '';

                        const isNPC =
                            statsMeta['is-npc'] === true ||
                            statsMeta['is-npc'] === 'true' ||
                            meta['is-npc'] === true ||
                            meta['is-npc'] === 'true';

                        combatantRows.push({
                            id: crypto.randomUUID(),
                            tokenId: item.id,
                            initiative: String(initVal),
                            baseInit,
                            name: charName,
                            image: tokenImage,
                            heldItem: heldItemText,
                            status: statusText,
                            isFainted,
                            actions,
                            evadeUsed,
                            clashUsed,
                            isPlayerSide: !isNPC,
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

                        return {
                            ...prev,
                            rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                        };
                    });

                    // Reset tokens & character sheets if requested
                    if (shouldReset) {
                        if (OBR.isAvailable && !isStandaloneMode) {
                            await OBR.scene.items.updateItems(
                                (item) => item.layer === 'CHARACTER',
                                (items) => {
                                    items.forEach((item) => {
                                        const matched = combatantRows.find((c) => c.tokenId === item.id);
                                        if (matched) {
                                            if (!item.metadata['pokerole-extension/stats']) {
                                                item.metadata['pokerole-extension/stats'] = {};
                                            }
                                            const stats = item.metadata['pokerole-extension/stats'] as Record<
                                                string,
                                                unknown
                                            >;
                                            stats['actions-used'] = 0;
                                            stats['evasions-used'] = false;
                                            stats['clashes-used'] = false;

                                            item.metadata['actions-used'] = 0;
                                            item.metadata['evasions-used'] = false;
                                            item.metadata['clashes-used'] = false;
                                        }
                                    });
                                }
                            );
                        } else {
                            for (const combatant of combatantRows) {
                                if (combatant.tokenId) {
                                    try {
                                        await storageAdapter.saveCharacter(
                                            combatant.tokenId,
                                            {
                                                'actions-used': 0,
                                                'evasions-used': false,
                                                'clashes-used': false
                                            },
                                            'pokerole-extension/stats'
                                        );
                                    } catch (e) {
                                        console.warn('[useBattleOrganizer] Failed to reset token trackers on pull:', e);
                                    }
                                }
                            }
                        }

                        const globalStore = useCharacterStore.getState();
                        if (globalStore.tokenId) {
                            const isMatched = combatantRows.some((c) => c.tokenId === globalStore.tokenId);
                            if (isMatched) {
                                globalStore.updateTracker('actions', 0);
                                globalStore.updateTracker('evade', false);
                                globalStore.updateTracker('clash', false);
                            }
                        }
                    }

                    if (OBR.isAvailable) {
                        const resetMsg = shouldReset ? ' and reset actions/reactions' : '';
                        OBR.notification.show(
                            `Pulled ${combatantRows.length} combatants from Initiative${resetMsg}!`,
                            'SUCCESS'
                        );
                    }
                } else {
                    if (OBR.isAvailable) {
                        OBR.notification.show('No active initiative combatants found.', 'WARNING');
                    }
                }
            } catch (e) {
                console.error('[BattleOrganizer] Error pulling from initiative:', e);
            }
        },
        [updateState]
    );

    // 4. Sync Back to Character Sheets
    const syncToSheets = useCallback(async () => {
        try {
            const currentRound = state.rounds[state.activeRoundIndex];
            if (!currentRound) return;

            // Helper to count how many actions were taken in this round
            const countUsedActions = (actions: CombatantRowData['actions']): number => {
                const count = actions.filter(
                    (a) => a.status === 'success' || a.status === 'failed' || (a.text && a.text.trim().length > 0)
                ).length;
                return Math.max(0, Math.min(5, count));
            };

            let updatedCount = 0;

            if (OBR.isAvailable && !isStandaloneMode) {
                await OBR.scene.items.updateItems(
                    (item) => item.layer === 'CHARACTER',
                    (items) => {
                        items.forEach((item) => {
                            const rawMeta = (item.metadata['pokerole-extension/stats'] || item.metadata) as Record<
                                string,
                                unknown
                            >;
                            const charName = extractCharacterName(rawMeta, item.name);

                            // Match combatant by tokenId first, then fallback to character nickname/name
                            const combatant = currentRound.combatants.find((c) => {
                                if (c.tokenId && c.tokenId === item.id) return true;
                                if (c.name.trim()) {
                                    const cName = c.name.trim().toLowerCase();
                                    if (charName.trim() && cName === charName.trim().toLowerCase()) return true;
                                    if (item.name.trim() && cName === item.name.trim().toLowerCase()) return true;
                                }
                                return false;
                            });

                            if (combatant) {
                                const usedActionsCount = countUsedActions(combatant.actions);

                                // Write to character sheet metadata namespace (where character sheets read from)
                                if (!item.metadata['pokerole-extension/stats']) {
                                    item.metadata['pokerole-extension/stats'] = {};
                                }
                                const stats = item.metadata['pokerole-extension/stats'] as Record<string, unknown>;
                                stats['actions-used'] = usedActionsCount;
                                stats['evasions-used'] = combatant.evadeUsed;
                                stats['clashes-used'] = combatant.clashUsed;

                                // Also mirror to root metadata for backward compatibility
                                item.metadata['actions-used'] = usedActionsCount;
                                item.metadata['evasions-used'] = combatant.evadeUsed;
                                item.metadata['clashes-used'] = combatant.clashUsed;

                                updatedCount++;
                            }
                        });
                    }
                );
            } else {
                const localChars = await storageAdapter.getLocalCharacters();
                for (const combatant of currentRound.combatants) {
                    const matchedChar = localChars.find((lc) => {
                        if (combatant.tokenId && lc.id === combatant.tokenId) return true;
                        const charName = extractCharacterName(lc.metadata, lc.name);
                        if (combatant.name.trim()) {
                            const cName = combatant.name.trim().toLowerCase();
                            if (charName.trim() && cName === charName.trim().toLowerCase()) return true;
                            if (lc.name.trim() && cName === lc.name.trim().toLowerCase()) return true;
                        }
                        return false;
                    });

                    const targetId = combatant.tokenId || matchedChar?.id;
                    if (targetId) {
                        const usedActionsCount = countUsedActions(combatant.actions);
                        try {
                            await storageAdapter.saveCharacter(
                                targetId,
                                {
                                    'actions-used': usedActionsCount,
                                    'evasions-used': combatant.evadeUsed,
                                    'clashes-used': combatant.clashUsed
                                },
                                'pokerole-extension/stats'
                            );
                            updatedCount++;
                        } catch (e) {
                            console.warn('[BattleOrganizer] Error saving to character sheet:', e);
                        }
                    }
                }
            }

            // Immediately reflect in open character store if currently inspecting a combatant
            const globalStore = useCharacterStore.getState();
            if (globalStore.tokenId) {
                const activeCombatant = currentRound.combatants.find((c) => {
                    if (c.tokenId && c.tokenId === globalStore.tokenId) return true;
                    if (c.name.trim() && globalStore.identity.nickname.trim()) {
                        return c.name.trim().toLowerCase() === globalStore.identity.nickname.trim().toLowerCase();
                    }
                    return false;
                });

                if (activeCombatant) {
                    const used = countUsedActions(activeCombatant.actions);
                    globalStore.updateTracker('actions', used);
                    globalStore.updateTracker('evade', activeCombatant.evadeUsed);
                    globalStore.updateTracker('clash', activeCombatant.clashUsed);
                }
            }

            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Updated action & reaction trackers for ${updatedCount} character sheets!`,
                    'SUCCESS'
                );
            }
        } catch (err) {
            console.error('[BattleOrganizer] Error syncing to character sheets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to sync to character sheets.', 'ERROR');
            }
        }
    }, [state.activeRoundIndex, state.rounds]);

    // 5. Sync Combatant To Token
    const syncCombatantToToken = useCallback(
        async (
            combatant: CombatantRowData,
            syncOptions: {
                syncStatus?: boolean;
                syncHp?: boolean;
                syncWill?: boolean;
                syncEvade?: boolean;
                syncClash?: boolean;
            }
        ) => {
            try {
                let targetTokenId = combatant.tokenId;
                if (!targetTokenId && combatant.name.trim()) {
                    targetTokenId = (await resolveCombatantTokenId(combatant)) || undefined;
                    if (targetTokenId) {
                        updateState((prev) => {
                            const round = prev.rounds[prev.activeRoundIndex];
                            if (!round) return prev;
                            const updatedRound: BattleRoundData = {
                                ...round,
                                combatants: round.combatants.map((c) =>
                                    c.id === combatant.id ? { ...c, tokenId: targetTokenId } : c
                                )
                            };
                            return {
                                ...prev,
                                rounds: prev.rounds.map((r, idx) => (idx === prev.activeRoundIndex ? updatedRound : r))
                            };
                        });
                    }
                }
                if (!targetTokenId) return;

                const updates: Record<string, unknown> = {};
                let statusItems: StatusItem[] | undefined = undefined;

                if (syncOptions.syncStatus) {
                    statusItems = mapStatusTextToStatusItems(combatant.status, combatant.isFainted);
                    updates['status-list'] = JSON.stringify(statusItems);
                }

                if (syncOptions.syncHp && typeof combatant.hpCurr === 'number') {
                    updates['hp-curr'] = combatant.hpCurr;
                }

                if (syncOptions.syncWill && typeof combatant.willCurr === 'number') {
                    updates['will-curr'] = combatant.willCurr;
                }

                if (syncOptions.syncEvade) {
                    updates['evasions-used'] = combatant.evadeUsed;
                }

                if (syncOptions.syncClash) {
                    updates['clashes-used'] = combatant.clashUsed;
                }

                if (Object.keys(updates).length === 0) return;

                // Live in-memory update for current window's active character store if it matches
                const globalStore = useCharacterStore.getState();
                if (globalStore.tokenId === targetTokenId) {
                    if (statusItems) {
                        useCharacterStore.setState({ statuses: statusItems });
                    }
                    if (typeof updates['hp-curr'] === 'number') {
                        globalStore.updateHealth('hpCurr', updates['hp-curr']);
                    }
                    if (typeof updates['will-curr'] === 'number') {
                        globalStore.updateWill('willCurr', updates['will-curr']);
                    }
                    if (syncOptions.syncEvade) {
                        globalStore.updateTracker('evade', combatant.evadeUsed);
                    }
                    if (syncOptions.syncClash) {
                        globalStore.updateTracker('clash', combatant.clashUsed);
                    }
                }

                // Register pending sync lock so soft-sync does not revert it before OBR syncs
                pendingTokenSyncRef.current.set(targetTokenId, {
                    statusText: combatant.status,
                    hpCurr: combatant.hpCurr,
                    willCurr: combatant.willCurr,
                    until: Date.now() + 2500
                });

                // Debounce save to storageAdapter / Owlbear Rodeo (300ms)
                const existingTimer = tokenSyncTimersRef.current.get(targetTokenId);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }

                const timer = setTimeout(async () => {
                    tokenSyncTimersRef.current.delete(targetTokenId!);
                    try {
                        await storageAdapter.saveCharacter(targetTokenId!, updates, 'pokerole-extension/stats');
                        console.log(`[useBattleOrganizer] Synced updates for "${combatant.name}" to token:`, updates);
                    } catch (err) {
                        console.warn('[useBattleOrganizer] Failed to save token updates:', err);
                    } finally {
                        if (targetTokenId) {
                            const entry = pendingTokenSyncRef.current.get(targetTokenId);
                            if (entry) {
                                entry.until = Date.now() + 1500;
                            }
                        }
                    }
                }, 300);

                tokenSyncTimersRef.current.set(targetTokenId, timer);
            } catch (e) {
                console.error('[useBattleOrganizer] Failed to sync combatant to token:', e);
            }
        },
        [pendingTokenSyncRef, tokenSyncTimersRef, updateState]
    );

    return {
        refreshTokenStats,
        pullFromInitiative,
        syncToSheets,
        syncCombatantToToken
    };
}
