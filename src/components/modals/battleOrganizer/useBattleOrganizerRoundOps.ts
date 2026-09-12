import { useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { extractCharacterName } from '../../../utils/initiativeHelpers';
import type {
    BattleOrganizerState,
    BattlefieldData,
    BattleRoundData,
    CombatantRowData,
    BattleOrganizerTimerEffect
} from '../../../types/battleOrganizerTypes';
import { createDefaultActions, createDefaultCombatant } from './battleOrganizerUtils';

export interface UseBattleOrganizerRoundOpsProps {
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
}

export function useBattleOrganizerRoundOps({ updateState }: UseBattleOrganizerRoundOpsProps) {
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
    const advanceRound = useCallback(async () => {
        let combatantsToReset: CombatantRowData[] = [];

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

            const currentRound = prev.rounds[prev.activeRoundIndex];
            combatantsToReset = currentRound ? currentRound.combatants : [];

            if (isLastRound) {
                const freshCombatants = (currentRound ? currentRound.combatants : []).map((c) => ({
                    ...c,
                    id: crypto.randomUUID(),
                    actions: createDefaultActions(),
                    evadeUsed: false,
                    clashUsed: false
                }));

                newRounds.push({
                    id: crypto.randomUUID(),
                    roundNumber: (currentRound?.roundNumber || prev.rounds.length) + 1,
                    combatants: freshCombatants,
                    endOfRoundEffects: ''
                });
            } else if (newRounds[nextIndex]) {
                // If advancing into an existing round, ensure reactions and action slots start fresh
                newRounds[nextIndex] = {
                    ...newRounds[nextIndex],
                    combatants: newRounds[nextIndex].combatants.map((c) => ({
                        ...c,
                        actions: createDefaultActions(),
                        evadeUsed: false,
                        clashUsed: false
                    }))
                };
            }

            return {
                battlefield: newBattlefield,
                rounds: newRounds,
                activeRoundIndex: nextIndex
            };
        });

        // 3. Reset tokens and active character sheets for the new round
        if (combatantsToReset.length > 0) {
            try {
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
                                const combatant = combatantsToReset.find((c) => {
                                    if (c.tokenId && c.tokenId === item.id) return true;
                                    if (c.name.trim()) {
                                        const cName = c.name.trim().toLowerCase();
                                        if (charName.trim() && cName === charName.trim().toLowerCase()) return true;
                                        if (item.name.trim() && cName === item.name.trim().toLowerCase()) return true;
                                    }
                                    return false;
                                });

                                if (combatant) {
                                    if (!item.metadata['pokerole-extension/stats']) {
                                        item.metadata['pokerole-extension/stats'] = {};
                                    }
                                    const stats = item.metadata['pokerole-extension/stats'] as Record<string, unknown>;
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
                    const localChars = await storageAdapter.getLocalCharacters();
                    for (const combatant of combatantsToReset) {
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
                            try {
                                await storageAdapter.saveCharacter(
                                    targetId,
                                    {
                                        'actions-used': 0,
                                        'evasions-used': false,
                                        'clashes-used': false
                                    },
                                    'pokerole-extension/stats'
                                );
                            } catch (e) {
                                console.warn('[BattleOrganizer] Error resetting character round trackers:', e);
                            }
                        }
                    }
                }

                // Immediately update the active character store if currently opened
                const globalStore = useCharacterStore.getState();
                if (globalStore.tokenId) {
                    const activeCombatant = combatantsToReset.find((c) => {
                        if (c.tokenId && c.tokenId === globalStore.tokenId) return true;
                        if (c.name.trim() && globalStore.identity.nickname.trim()) {
                            return c.name.trim().toLowerCase() === globalStore.identity.nickname.trim().toLowerCase();
                        }
                        return false;
                    });

                    if (activeCombatant) {
                        globalStore.updateTracker('actions', 0);
                        globalStore.updateTracker('evade', false);
                        globalStore.updateTracker('clash', false);
                    }
                }
            } catch (err) {
                console.error('[BattleOrganizer] Error resetting token actions on advance round:', err);
            }
        }

        if (OBR.isAvailable) {
            OBR.notification.show('Round ended! Actions & reactions reset, timers ticked down.', 'INFO');
        }
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

    return {
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
    };
}
