import { useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { extractCharacterName } from '../../../utils/initiativeHelpers';
import type { StatusItem } from '../../../store/storeTypes';
import type { BattleOrganizerState, BattleRoundData, CombatantRowData } from '../../../types/battleOrganizerTypes';
import { mapStatusTextToStatusItems, resolveCombatantTokenId } from './battleOrganizerUtils';

export interface UseBattleOrganizerTokenSyncProps {
    state: BattleOrganizerState;
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
    tokenSyncTimersRef: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
    pendingTokenSyncRef: React.MutableRefObject<
        Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
    >;
}

export function useBattleOrganizerTokenSync({
    state,
    updateState,
    tokenSyncTimersRef,
    pendingTokenSyncRef
}: UseBattleOrganizerTokenSyncProps) {
    // 1. Bulk Sync Back to Character Sheets
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

    // 2. Individual Combatant Sync To Token
    const syncCombatantToToken = useCallback(
        async (
            combatant: CombatantRowData,
            syncOptions: {
                syncStatus?: boolean;
                syncHp?: boolean;
                syncWill?: boolean;
                syncEvade?: boolean;
                syncClash?: boolean;
                syncActions?: boolean;
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

                if (syncOptions.syncActions) {
                    const usedActionsCount = combatant.actions.filter(
                        (a) => a.status === 'success' || a.status === 'failed' || (a.text && a.text.trim().length > 0)
                    ).length;
                    updates['actions-used'] = Math.max(0, Math.min(5, usedActionsCount));
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
                    if (syncOptions.syncActions && typeof updates['actions-used'] === 'number') {
                        globalStore.updateTracker('actions', updates['actions-used'] as number);
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
                        if (OBR.isAvailable && !isStandaloneMode) {
                            await OBR.scene.items.updateItems([targetTokenId!], (items) => {
                                for (const item of items) {
                                    if (typeof updates['actions-used'] === 'number') {
                                        item.metadata['actions-used'] = updates['actions-used'];
                                    }
                                    if (typeof updates['evasions-used'] === 'boolean') {
                                        item.metadata['evasions-used'] = updates['evasions-used'];
                                    }
                                    if (typeof updates['clashes-used'] === 'boolean') {
                                        item.metadata['clashes-used'] = updates['clashes-used'];
                                    }
                                }
                            });
                        }
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
        syncToSheets,
        syncCombatantToToken
    };
}
