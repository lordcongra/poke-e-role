import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCharacterStore } from '@/store/useCharacterStore';
import { assignInitiative, type StandaloneCombatant } from '../dice/diceInitiativeOps';
import { executeChanceRoll } from '../dice/chanceRoller';
import { broadcastInfo } from '../dice/diceBroadcastOps';
import { addRollLogEntry, rollDicePlus, rollDice } from '../diceRoller';
import type { RollSyncData } from '@/hooks/owlbearSync/owlbearSyncConstants';

vi.mock('@/utils/sync/storageAdapter', () => ({
    isStandaloneMode: true
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
            localStorage.setItem('pkr_roll_log', JSON.stringify([mockRoll]));

            await executeChanceRoll(mockRoll);

            const updatedLog: RollSyncData[] = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            const originalRoll = updatedLog.find((r) => r.id === mockRoll.id);
            expect(originalRoll?.chanceRolled).toBe(true);
        });
    });

    describe('Broadcast Operations & Re-exports', () => {
        it('broadcastInfo records info log into roll log in standalone mode', async () => {
            await broadcastInfo('Battle Announcement', 'A wild Pokemon appeared!');

            const log: RollSyncData[] = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
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

            const log: RollSyncData[] = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            expect(log[0].label).toContain('[PRIVATE] Hidden Roll');
            expect(log[0].targetVisibility).toBe('gm_only');
        });
    });
});
