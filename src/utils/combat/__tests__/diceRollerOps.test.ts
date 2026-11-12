import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCharacterStore } from '@/store/useCharacterStore';
import { assignInitiative, type StandaloneCombatant } from '../dice/diceInitiativeOps';
import { executeChanceRoll } from '../dice/chanceRoller';
import { broadcastInfo, dispatchNativeObrRoll } from '../dice/diceBroadcastOps';
import { executePinnedStateIntercepts } from '../dice/diceStateIntercepts';
import { addRollLogEntry, rollDicePlus, rollDice } from '../diceRoller';
import { getRollLogStorageKey } from '@/utils/sync/roomScopedStorage';
import type { RollSyncData } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { storageAdapter } from '@/utils/sync/storageAdapter';
import { METADATA_ID } from '@/utils/sync/obr';
import * as pcStorageAdapter from '@/utils/pc/pcStorageAdapter';
import * as rollLogSync from '@/utils/combat/rollLogSync';

vi.mock('@/utils/sync/storageAdapter', () => ({
    isStandaloneMode: true,
    storageAdapter: {
        saveCharacter: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('@owlbear-rodeo/sdk', () => ({
    default: {
        isAvailable: false
    }
}));

describe('Dice Roller & OBR Sync Ops Decomposition Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useCharacterStore.getState().loadFromOwlbear({});
    });

    describe('Standalone Initiative Assignment (diceInitiativeOps)', () => {
        it('assigns initiative to standalone combatant without stalemate', async () => {
            const initialList: StandaloneCombatant[] = [
                {
                    id: 'combatant-1',
                    name: 'Pikachu',
                    image: '',
                    d6: 0,
                    baseInit: 5,
                    total: 0,
                    tiebreaker: 0
                }
            ];
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(initialList));

            const tiebreaker = await assignInitiative('combatant-1', 9, 5);
            expect(tiebreaker).toBe(0);

            const updatedList: StandaloneCombatant[] = JSON.parse(
                localStorage.getItem('pkr_standalone_init_list') || '[]'
            );
            expect(updatedList[0].total).toBe(9);
            expect(updatedList[0].d6).toBe(4);
            expect(updatedList[0].tiebreaker).toBe(0);
        });

        it('detects stalemate and rolls unique tiebreaker', async () => {
            const initialList: StandaloneCombatant[] = [
                {
                    id: 'combatant-1',
                    name: 'Raichu',
                    image: '',
                    d6: 3,
                    baseInit: 5,
                    total: 8,
                    tiebreaker: 0
                },
                {
                    id: 'combatant-2',
                    name: 'Electabuzz',
                    image: '',
                    d6: 0,
                    baseInit: 5,
                    total: 0,
                    tiebreaker: 0
                }
            ];
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(initialList));

            const tiebreaker = await assignInitiative('combatant-2', 8, 5);
            expect(tiebreaker).toBeGreaterThanOrEqual(1);
            expect(tiebreaker).toBeLessThanOrEqual(6);

            const updatedList: StandaloneCombatant[] = JSON.parse(
                localStorage.getItem('pkr_standalone_init_list') || '[]'
            );
            const c1 = updatedList.find((c) => c.id === 'combatant-1');
            const c2 = updatedList.find((c) => c.id === 'combatant-2');
            expect(c1).toBeDefined();
            expect(c2).toBeDefined();
            expect(c1?.tiebreaker).not.toBe(c2?.tiebreaker);
        });

        it('keeps existing opponent tiebreakers stable and handles >6 stalemate combatants without spinning', async () => {
            const initialList: StandaloneCombatant[] = Array.from({ length: 7 }, (_, i) => ({
                id: `c-${i + 1}`,
                name: `Fighter ${i + 1}`,
                image: '',
                d6: 4,
                baseInit: 5,
                total: 9,
                tiebreaker: i < 6 ? i + 1 : 0
            }));
            localStorage.setItem('pkr_standalone_init_list', JSON.stringify(initialList));

            const tiebreaker = await assignInitiative('c-7', 9, 5);
            expect(tiebreaker).toBeGreaterThanOrEqual(7);

            const updatedList: StandaloneCombatant[] = JSON.parse(
                localStorage.getItem('pkr_standalone_init_list') || '[]'
            );
            // Existing unique tiebreakers 1..6 remain untouched
            for (let i = 0; i < 6; i++) {
                const member = updatedList.find((c) => c.id === `c-${i + 1}`);
                expect(member?.tiebreaker).toBe(i + 1);
            }
            const ties = updatedList.map((c) => c.tiebreaker);
            expect(new Set(ties).size).toBe(7);
        });
    });

    describe('Chance Roller (chanceRoller)', () => {
        it('marks roll entry as chanceRolled and triggers roll', async () => {
            const mockRoll: RollSyncData = {
                id: 'roll-123',
                player: 'Ash',
                characterName: 'Pikachu',
                label: 'Thunderbolt',
                result: 'Paralysis chance',
                icon: 'icon.png',
                chanceDice: 1,
                chanceEffect: 'Paralysis',
                chanceRolled: false
            };
            localStorage.setItem(getRollLogStorageKey(), JSON.stringify([mockRoll]));

            await executeChanceRoll(mockRoll);

            const updatedLog: RollSyncData[] = JSON.parse(localStorage.getItem(getRollLogStorageKey()) || '[]');
            const originalRoll = updatedLog.find((r) => r.id === mockRoll.id);
            expect(originalRoll?.chanceRolled).toBe(true);
        });
    });

    describe('Broadcast Operations & Re-exports', () => {
        it('broadcastInfo records info log into roll log in standalone mode', async () => {
            await broadcastInfo('Battle Announcement', 'A wild Pokemon appeared!');

            const log: RollSyncData[] = JSON.parse(localStorage.getItem(getRollLogStorageKey()) || '[]');
            expect(log.length).toBeGreaterThan(0);
            expect(log[0].label).toContain('Battle Announcement');
            expect(log[0].result).toBe('A wild Pokemon appeared!');
        });

        it('exports rollDice as alias for rollDicePlus', () => {
            expect(rollDice).toBe(rollDicePlus);
        });

        it('addRollLogEntry correctly adds log entry with privacy prefix when private rolls are active', () => {
            useCharacterStore.getState().loadFromOwlbear({ rolls: 'Private (GM)' });

            addRollLogEntry('Hidden Roll', '1 Success', '', 'Red');

            const log: RollSyncData[] = JSON.parse(localStorage.getItem(getRollLogStorageKey()) || '[]');
            expect(log[0].label).toContain('[PRIVATE] Hidden Roll');
            expect(log[0].targetVisibility).toBe('gm_only');
        });
    });

    describe('Dice Notation Validation & Bounds (B-20)', () => {
        it('rejects malformed or out-of-bounds dice notations without logging a roll', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const invalidNotations = ['invalid', '1d6xyz', '201d6>3', '2d6>0', '2d6>7', '1d20'];

            for (const bad of invalidNotations) {
                await rollDicePlus(bad, 'Bad Roll');
            }

            const log: RollSyncData[] = JSON.parse(localStorage.getItem(getRollLogStorageKey()) || '[]');
            expect(log.length).toBe(0);
            expect(warnSpy).toHaveBeenCalledTimes(invalidNotations.length);
            warnSpy.mockRestore();
        });

        it('accepts valid boundary dice notations such as 0d6>3 and 2d6>5+1', async () => {
            await rollDicePlus('0d6>3+4', 'Direct Damage', 'damage');
            await rollDicePlus('2d6>5+1', 'Chance Roll', 'chance');

            const log: RollSyncData[] = JSON.parse(localStorage.getItem(getRollLogStorageKey()) || '[]');
            expect(log.length).toBe(2);
        });
    });

    describe('Delayed Roll Token Pinning & Safe Timeout Handlers (B-03)', () => {
        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('applies delayed intercepts to active store when token still matches after 3.5s delay', async () => {
            vi.useFakeTimers();
            const store = useCharacterStore.getState();
            store.setTokenData('tok-match', 'PLAYER');
            store.loadFromOwlbear({
                'temporary-hit-points': 0,
                'temporary-hit-points-max': 0,
                'banked-acc-dice': '{}'
            });

            await dispatchNativeObrRoll({
                diceEngine: 'car',
                obrPlayerName: 'Ash',
                playerName: 'Pikachu',
                playerId: 'player-1',
                tokenId: 'tok-match',
                finalLabel: 'Shield Move',
                icon: 'icon.png',
                rollType: 'damage',
                targetVisibility: 'everyone',
                diceData: [{ type: 6, result: 6 }],
                executeStateIntercepts: () =>
                    executePinnedStateIntercepts({
                        rollingTokenId: 'tok-match',
                        rollingEntityId: 'ent-match',
                        rollingTempHpMax: 0,
                        rollingBankedAccDice: {},
                        rollingStatuses: [],
                        rollType: 'damage',
                        payload: '4',
                        isSuccessRoll: true,
                        finalSuccesses: 1,
                        rawSuccesses: 1,
                        finalSum: 6,
                        diceData: [{ type: 6, result: 6 }],
                        baseMessage: 'Hit'
                    })
            });

            expect(useCharacterStore.getState().health.temporaryHitPoints).toBe(0);
            await vi.advanceTimersByTimeAsync(3500);

            expect(useCharacterStore.getState().health.temporaryHitPointsMax).toBe(4);
            expect(useCharacterStore.getState().health.temporaryHitPoints).toBe(4);
            expect(storageAdapter.saveCharacter).not.toHaveBeenCalled();
        });

        it('persists delayed intercepts to rolling token and PC summary when active token switched during delay', async () => {
            vi.useFakeTimers();
            const saveDeltaSpy = vi.spyOn(pcStorageAdapter, 'savePcSummaryDelta').mockResolvedValue(undefined);

            useCharacterStore.setState((s) => ({
                ...s,
                isInitialized: true,
                pcData: {
                    ...s.pcData,
                    pokemonSummaries: {
                        'ent-a': {
                            entityId: 'ent-a',
                            mapTokenId: 'tok-a',
                            name: 'Bulbasaur',
                            species: 'Bulbasaur',
                            rank: 'Starter',
                            type1: 'Grass',
                            hp: 5,
                            maxHp: 5,
                            will: 4,
                            maxWill: 4,
                            lastModified: 1000,
                            fullMetadata: {}
                        }
                    }
                }
            }));
            useCharacterStore.getState().setTokenData('tok-a', 'PLAYER');

            const rollingStatuses = [{ id: 'st-burn', name: 'Burn', customName: '', rounds: 1 }];

            await dispatchNativeObrRoll({
                diceEngine: 'car',
                obrPlayerName: 'Ash',
                playerName: 'Bulbasaur',
                playerId: 'player-1',
                tokenId: 'tok-a',
                finalLabel: 'Status Recovery',
                icon: 'icon.png',
                rollType: 'status',
                targetVisibility: 'everyone',
                diceData: [{ type: 6, result: 5 }],
                executeStateIntercepts: () =>
                    executePinnedStateIntercepts({
                        rollingTokenId: 'tok-a',
                        rollingEntityId: 'ent-a',
                        rollingTempHpMax: 0,
                        rollingBankedAccDice: {},
                        rollingStatuses,
                        rollType: 'status',
                        payload: 'st-burn',
                        isSuccessRoll: true,
                        finalSuccesses: 2,
                        rawSuccesses: 2,
                        finalSum: 5,
                        diceData: [{ type: 6, result: 5 }],
                        baseMessage: 'Recovery'
                    })
            });

            // Switch active sheet to Token B before the 3.5s animation completes
            useCharacterStore.getState().setTokenData('tok-b', 'PLAYER');
            useCharacterStore.setState((s) => ({
                ...s,
                health: { ...s.health, temporaryHitPoints: 1, temporaryHitPointsMax: 1 },
                statuses: [{ id: 'st-burn', name: 'Burn', customName: '', rounds: 5 }]
            }));

            await vi.advanceTimersByTimeAsync(3500);

            // Token B's active sheet must remain untouched
            expect(useCharacterStore.getState().statuses[0].rounds).toBe(5);
            expect(useCharacterStore.getState().health.temporaryHitPoints).toBe(1);

            // Token A's updated status must be persisted directly and synced to PC summary
            expect(storageAdapter.saveCharacter).toHaveBeenCalledWith(
                'tok-a',
                { 'status-list': JSON.stringify([{ id: 'st-burn', name: 'Burn', customName: '', rounds: 3 }]) },
                METADATA_ID
            );
            const updatedSummary = useCharacterStore.getState().pcData.pokemonSummaries['ent-a'];
            expect(updatedSummary.fullMetadata?.['status-list']).toBe(
                JSON.stringify([{ id: 'st-burn', name: 'Burn', customName: '', rounds: 3 }])
            );
            expect(saveDeltaSpy).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'ent-a' }));
        });

        it('catches errors from executeStateIntercepts and broadcastRollEntry inside delayed timeout without unhandled rejection', async () => {
            vi.useFakeTimers();
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await dispatchNativeObrRoll({
                diceEngine: 'car',
                obrPlayerName: 'Ash',
                playerName: 'Pikachu',
                playerId: 'player-1',
                tokenId: 'tok-err',
                finalLabel: 'Err Roll',
                icon: 'icon.png',
                rollType: 'roll',
                targetVisibility: 'everyone',
                diceData: [{ type: 6, result: 4 }],
                executeStateIntercepts: vi.fn().mockRejectedValue(new Error('intercept boom'))
            });

            await vi.advanceTimersByTimeAsync(3500);
            expect(errorSpy).toHaveBeenCalledWith(
                '[DiceBroadcastOps] Delayed roll execution failed:',
                expect.objectContaining({ message: 'intercept boom' })
            );

            errorSpy.mockClear();
            vi.spyOn(rollLogSync, 'broadcastRollLog').mockRejectedValueOnce(new Error('broadcast boom'));

            await dispatchNativeObrRoll({
                diceEngine: 'car',
                obrPlayerName: 'Ash',
                playerName: 'Pikachu',
                playerId: 'player-1',
                tokenId: 'tok-err',
                finalLabel: 'Err Broadcast',
                icon: 'icon.png',
                rollType: 'roll',
                targetVisibility: 'everyone',
                diceData: [{ type: 6, result: 4 }],
                executeStateIntercepts: vi.fn().mockResolvedValue('Done')
            });

            await vi.advanceTimersByTimeAsync(3500);
            expect(errorSpy).toHaveBeenCalledWith(
                '[DiceBroadcastOps] Delayed roll execution failed:',
                expect.objectContaining({ message: 'broadcast boom' })
            );
        });
    });
});
