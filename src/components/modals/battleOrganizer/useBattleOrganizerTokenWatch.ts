import { useCallback, useEffect } from 'react';
import OBR, { type Image, type Item } from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { extractTokenImage, extractCharacterName } from '../../../utils/initiativeHelpers';
import { getBattleOrganizerSettings } from './battleOrganizerSettingsHelper';
import type { BattleOrganizerState, BattleRoundData } from '../../../types/battleOrganizerTypes';
import { parseStatusesFromMetadata, parseHealthAndWillFromMetadata } from './battleOrganizerUtils';

export interface UseBattleOrganizerTokenWatchProps {
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
    lastTokenFingerprintsRef: React.MutableRefObject<Map<string, string>>;
    pendingTokenSyncRef: React.MutableRefObject<
        Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
    >;
}

export function useBattleOrganizerTokenWatch({
    updateState,
    lastTokenFingerprintsRef,
    pendingTokenSyncRef
}: UseBattleOrganizerTokenWatchProps) {
    // 1. On-Demand & Gentle Token Stats Soft-Sync
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

    // 2. Real-time Reactive Sync: OBR Scene Tokens, Character Store & Standalone changes
    useEffect(() => {
        let isMounted = true;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const triggerRefresh = (delay = 120) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (isMounted) {
                    refreshTokenStats(true);
                }
            }, delay);
        };

        // Initial sync on mount
        const initialTimer = setTimeout(() => {
            if (isMounted) refreshTokenStats(true);
        }, 300);

        // 1. OBR scene items change listener (when tokens are updated by sheets, other players, or GM)
        let unsubObr: (() => void) | null = null;
        if (OBR.isAvailable && !isStandaloneMode) {
            OBR.onReady(() => {
                if (!isMounted) return;
                try {
                    unsubObr = OBR.scene.items.onChange((items) => {
                        const hasCharChange = items.some((i) => i.layer === 'CHARACTER');
                        if (hasCharChange) {
                            triggerRefresh(150);
                        }
                    });
                } catch (e) {
                    console.warn('[BattleOrganizer] Failed to subscribe to OBR.scene.items.onChange:', e);
                }
            });
        }

        // 2. Standalone / cross-tab events
        const handleLocalChange = () => triggerRefresh(100);
        window.addEventListener('pkr-local-data-changed', handleLocalChange);
        window.addEventListener('storage', handleLocalChange);

        // 3. In-memory useCharacterStore changes (when user edits a sheet in the same window)
        const unsubStore = useCharacterStore.subscribe((currState, prevState) => {
            const statusChanged = currState.statuses !== prevState.statuses;
            const hpChanged =
                currState.health.hpCurr !== prevState.health.hpCurr ||
                currState.health.hpMax !== prevState.health.hpMax;
            const willChanged =
                currState.will.willCurr !== prevState.will.willCurr ||
                currState.will.willMax !== prevState.will.willMax;
            const evadeChanged = currState.trackers.evade !== prevState.trackers.evade;
            const clashChanged = currState.trackers.clash !== prevState.trackers.clash;
            if (statusChanged || hpChanged || willChanged || evadeChanged || clashChanged) {
                const targetTokenId = currState.tokenId;
                const charName = (currState.identity.nickname || currState.identity.species || '').toLowerCase().trim();
                if (targetTokenId || charName) {
                    updateState(
                        (prev) => {
                            const currentRound = prev.rounds[prev.activeRoundIndex];
                            if (!currentRound) return prev;

                            const targetCombatant = currentRound.combatants.find(
                                (c) =>
                                    (targetTokenId && c.tokenId === targetTokenId) ||
                                    (charName && c.name.toLowerCase().trim() === charName)
                            );
                            if (!targetCombatant) return prev;

                            const { statusText, isFainted } = parseStatusesFromMetadata({
                                'status-list': JSON.stringify(currState.statuses)
                            });

                            let updated = false;
                            let nextStatus = targetCombatant.status;
                            if (statusText !== targetCombatant.status) {
                                nextStatus = statusText;
                                updated = true;
                            }

                            let nextFainted = targetCombatant.isFainted;
                            if (isFainted || (currState.health.hpCurr <= 0 && currState.health.hpMax > 0)) {
                                if (!nextFainted) {
                                    nextFainted = true;
                                    updated = true;
                                }
                            } else if (currState.health.hpCurr > 0 && !isFainted && nextFainted) {
                                nextFainted = false;
                                updated = true;
                            }

                            let nextHpCurr = targetCombatant.hpCurr;
                            let nextHpMax = targetCombatant.hpMax;
                            if (
                                currState.health.hpCurr !== targetCombatant.hpCurr ||
                                currState.health.hpMax !== targetCombatant.hpMax
                            ) {
                                nextHpCurr = currState.health.hpCurr;
                                nextHpMax = currState.health.hpMax;
                                updated = true;
                            }

                            let nextWillCurr = targetCombatant.willCurr;
                            let nextWillMax = targetCombatant.willMax;
                            if (
                                currState.will.willCurr !== targetCombatant.willCurr ||
                                currState.will.willMax !== targetCombatant.willMax
                            ) {
                                nextWillCurr = currState.will.willCurr;
                                nextWillMax = currState.will.willMax;
                                updated = true;
                            }

                            let nextEvade = targetCombatant.evadeUsed;
                            let nextClash = targetCombatant.clashUsed;
                            if (currState.trackers.evade !== targetCombatant.evadeUsed) {
                                nextEvade = currState.trackers.evade;
                                updated = true;
                            }
                            if (currState.trackers.clash !== targetCombatant.clashUsed) {
                                nextClash = currState.trackers.clash;
                                updated = true;
                            }

                            if (!updated) return prev;

                            const newCombatants = currentRound.combatants.map((c) =>
                                c.id === targetCombatant.id
                                    ? {
                                          ...c,
                                          status: nextStatus,
                                          isFainted: nextFainted,
                                          hpCurr: nextHpCurr,
                                          hpMax: nextHpMax,
                                          willCurr: nextWillCurr,
                                          willMax: nextWillMax,
                                          evadeUsed: nextEvade,
                                          clashUsed: nextClash
                                      }
                                    : c
                            );

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
                }

                triggerRefresh(150);
            }
        });

        // Periodic gentle fallback heartbeat (every 15s when tab is active)
        const intervalId = setInterval(() => {
            if (typeof document !== 'undefined' && !document.hidden) {
                refreshTokenStats(true);
            }
        }, 15000);

        return () => {
            isMounted = false;
            clearTimeout(initialTimer);
            if (debounceTimer) clearTimeout(debounceTimer);
            clearInterval(intervalId);
            if (unsubObr) unsubObr();
            window.removeEventListener('pkr-local-data-changed', handleLocalChange);
            window.removeEventListener('storage', handleLocalChange);
            unsubStore();
        };
    }, [refreshTokenStats, updateState]);

    return {
        refreshTokenStats
    };
}
