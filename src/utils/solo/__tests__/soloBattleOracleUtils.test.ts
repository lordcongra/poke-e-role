import { describe, it, expect } from 'vitest';
import type { MoveData } from '@/store/storeTypes';
import {
    extractCandidateMoves,
    isDamagingMove,
    isSupportMove,
    calculateMoveProbabilities,
    selectMoveByTactics,
    rollWildInstinct,
    getClashCandidateMoves,
    selectClashMove,
    formatMoveDirective,
    formatClashDirective,
    formatEvadeDirective,
    formatCoverDirective,
    formatStruggleDirective,
    extractTokenTargetInfo
} from '../soloBattleOracleUtils';

const mockMove = (partial: Partial<MoveData>): MoveData => ({
    id: partial.id || 'm-1',
    name: partial.name !== undefined ? partial.name : 'Test Move',
    category: partial.category || 'Physical',
    type: partial.type || 'Normal',
    active: partial.active ?? false,
    acc1: 'str',
    acc2: 'brawl',
    dmg1: 'str',
    power: partial.power ?? 1,
    desc: 'Test description',
    marker: ''
});

describe('soloBattleOracleUtils', () => {
    describe('extractCandidateMoves', () => {
        it('caps moves at 3 + Insight', () => {
            const moves: MoveData[] = [
                mockMove({ id: '1', name: 'Tackle' }),
                mockMove({ id: '2', name: 'Tail Whip' }),
                mockMove({ id: '3', name: 'Bite' }),
                mockMove({ id: '4', name: 'Growl' }),
                mockMove({ id: '5', name: 'Hyper Fang' }),
                mockMove({ id: '6', name: 'Super Fang' })
            ];

            // Insight = 1 -> Limit = 4
            const candidates1 = extractCandidateMoves(moves, 1);
            expect(candidates1).toHaveLength(4);
            expect(candidates1.map((m) => m.name)).toEqual(['Tackle', 'Tail Whip', 'Bite', 'Growl']);

            // Insight = 2 -> Limit = 5
            const candidates2 = extractCandidateMoves(moves, 2);
            expect(candidates2).toHaveLength(5);
        });

        it('respects active move toggles when at least one move is active', () => {
            const moves: MoveData[] = [
                mockMove({ id: '1', name: 'Tackle', active: false }),
                mockMove({ id: '2', name: 'Tail Whip', active: true }),
                mockMove({ id: '3', name: 'Bite', active: true }),
                mockMove({ id: '4', name: 'Growl', active: false })
            ];

            const candidates = extractCandidateMoves(moves, 1);
            expect(candidates.map((m) => m.name)).toEqual(['Tail Whip', 'Bite']);
        });

        it('filters out empty or unnamed moves', () => {
            const moves: MoveData[] = [
                mockMove({ id: '1', name: '   ' }),
                mockMove({ id: '2', name: 'Bite' }),
                mockMove({ id: '3', name: '' })
            ];

            const candidates = extractCandidateMoves(moves, 1);
            expect(candidates.map((m) => m.name)).toEqual(['Bite']);
        });
    });

    describe('isDamagingMove & isSupportMove', () => {
        it('correctly categorizes Physical and Special as damaging, and Status as support', () => {
            const phys = mockMove({ name: 'Bite', category: 'Physical' });
            const spec = mockMove({ name: 'Ember', category: 'Special' });
            const stat = mockMove({ name: 'Leer', category: 'Status' });

            expect(isDamagingMove(phys)).toBe(true);
            expect(isSupportMove(phys)).toBe(false);

            expect(isDamagingMove(spec)).toBe(true);
            expect(isSupportMove(spec)).toBe(false);

            expect(isDamagingMove(stat)).toBe(false);
            expect(isSupportMove(stat)).toBe(true);
        });
    });

    describe('calculateMoveProbabilities & 5 Tactics Modes', () => {
        const moves: MoveData[] = [
            mockMove({ id: '1', name: 'Bite', category: 'Physical' }),
            mockMove({ id: '2', name: 'Leer', category: 'Status' })
        ];

        it('Equal Random produces uniform weights (50% each for 2 moves)', () => {
            const probs = calculateMoveProbabilities(moves, 'equal');
            expect(probs).toHaveLength(2);
            expect(probs[0].percentage).toBe(50);
            expect(probs[1].percentage).toBe(50);
        });

        it('Aggressive gives 3x weight to damaging moves (75% / 25%)', () => {
            const probs = calculateMoveProbabilities(moves, 'aggressive');
            expect(probs[0].weight).toBe(3);
            expect(probs[1].weight).toBe(1);
            expect(probs[0].percentage).toBe(75);
            expect(probs[1].percentage).toBe(25);
        });

        it('Tactical gives 3x weight to support moves (25% / 75%)', () => {
            const probs = calculateMoveProbabilities(moves, 'tactical');
            expect(probs[0].weight).toBe(1);
            expect(probs[1].weight).toBe(3);
            expect(probs[0].percentage).toBe(25);
            expect(probs[1].percentage).toBe(75);
        });

        it('Wild Instinct biases towards damaging moves (66.7% / 33.3%)', () => {
            const probs = calculateMoveProbabilities(moves, 'wild');
            expect(probs[0].weight).toBe(2);
            expect(probs[1].weight).toBe(1);
            expect(probs[0].percentage).toBe(66.7);
            expect(probs[1].percentage).toBe(33.3);
        });

        it('Custom Weights applies user-defined multipliers with live percentages', () => {
            // Damaging: 4, Support: 1 -> Total 5 -> 80% / 20%
            const probs = calculateMoveProbabilities(moves, 'custom', { damaging: 4, support: 1 });
            expect(probs[0].weight).toBe(4);
            expect(probs[1].weight).toBe(1);
            expect(probs[0].percentage).toBe(80);
            expect(probs[1].percentage).toBe(20);
        });
    });

    describe('selectMoveByTactics', () => {
        it('selects move based on cumulative probability', () => {
            const moves: MoveData[] = [
                mockMove({ id: '1', name: 'Bite', category: 'Physical' }),
                mockMove({ id: '2', name: 'Leer', category: 'Status' })
            ];

            // In Aggressive: Bite weight is 3, Leer is 1 (Total 4).
            // A roll <= 3 should pick Bite; > 3 should pick Leer.
            // randomFn returning 0.5 -> 0.5 * 4 = 2.0 <= 3 -> Bite
            const move1 = selectMoveByTactics(moves, 'aggressive', undefined, () => 0.5);
            expect(move1?.name).toBe('Bite');

            // randomFn returning 0.9 -> 0.9 * 4 = 3.6 > 3 -> Leer
            const move2 = selectMoveByTactics(moves, 'aggressive', undefined, () => 0.9);
            expect(move2?.name).toBe('Leer');
        });
    });

    describe('rollWildInstinct (d6 behavior table)', () => {
        const moves: MoveData[] = [
            mockMove({ id: '1', name: 'Bite', category: 'Physical', power: 2 }),
            mockMove({ id: '2', name: 'Crunch', category: 'Physical', power: 3 }),
            mockMove({ id: '3', name: 'Leer', category: 'Status' })
        ];

        it('d6 = 1 triggers Roar / Hesitate and favors support move', () => {
            const res = rollWildInstinct(moves, 'Ekans', 1);
            expect(res.d6Roll).toBe(1);
            expect(res.behavior).toBe('Roar / Hesitate');
            expect(res.selectedMove?.name).toBe('Leer');
            expect(res.directive).toBe("Roll Leer on Ekans's sheet!");
        });

        it('d6 = 2 triggers Intimidate and uses support/show of force', () => {
            const res = rollWildInstinct(moves, 'Ekans', 2);
            expect(res.d6Roll).toBe(2);
            expect(res.behavior).toBe('Intimidate');
            expect(res.selectedMove).not.toBeNull();
        });

        it('d6 = 3 or 4 triggers Direct Attack', () => {
            const res = rollWildInstinct(moves, 'Ekans', 3);
            expect(res.d6Roll).toBe(3);
            expect(res.behavior).toBe('Direct Attack');
            expect(['Bite', 'Crunch']).toContain(res.selectedMove?.name);
        });

        it('d6 = 5 or 6 triggers Desperate Strike and picks highest power damaging move', () => {
            const res = rollWildInstinct(moves, 'Ekans', 6);
            expect(res.d6Roll).toBe(6);
            expect(res.behavior).toBe('Desperate Strike');
            expect(res.selectedMove?.name).toBe('Crunch');
            expect(res.directive).toBe("Roll Crunch on Ekans's sheet!");
        });
    });

    describe('Clash move selector', () => {
        it('strictly filters candidates to Physical and Special damaging moves', () => {
            const moves: MoveData[] = [
                mockMove({ id: '1', name: 'Leer', category: 'Status' }),
                mockMove({ id: '2', name: 'Bite', category: 'Physical' }),
                mockMove({ id: '3', name: 'Thunderbolt', category: 'Special' }),
                mockMove({ id: '4', name: 'Thunder Wave', category: 'Status' })
            ];

            const clashCandidates = getClashCandidateMoves(moves);
            expect(clashCandidates.map((m) => m.name)).toEqual(['Bite', 'Thunderbolt']);
        });

        it('selects a clash move from damaging moves or returns null if none exist', () => {
            const supportOnly: MoveData[] = [mockMove({ id: '1', name: 'Growl', category: 'Status' })];
            expect(selectClashMove(supportOnly)).toBeNull();

            const withDmg: MoveData[] = [mockMove({ id: '1', name: 'Bite', category: 'Physical' })];
            const clash = selectClashMove(withDmg);
            expect(clash?.name).toBe('Bite');
        });
    });

    describe('Directive formatters', () => {
        it('formatMoveDirective produces "Roll [Move] on [Name]\'s sheet!"', () => {
            expect(formatMoveDirective('Ekans', 'Bite')).toBe("Roll Bite on Ekans's sheet!");
        });

        it('formatClashDirective produces "Roll Clash (using [Move]) on [Name]\'s sheet!"', () => {
            expect(formatClashDirective('Ekans', 'Bite')).toBe("Roll Clash (using Bite) on Ekans's sheet!");
        });

        it('formatEvadeDirective produces "Roll Evade on [Name]\'s sheet!"', () => {
            expect(formatEvadeDirective('Ekans')).toBe("Roll Evade on Ekans's sheet!");
        });

        it('formatCoverDirective produces valid cover directive', () => {
            expect(formatCoverDirective('Ekans', 'Pikachu')).toBe(
                "Roll Cover (Dexterity + Brawl/Alert) on Ekans's sheet to protect Pikachu!"
            );
        });

        it('formatStruggleDirective produces valid struggle directive', () => {
            expect(formatStruggleDirective('Ekans')).toBe("Roll Desperation Struggle on Ekans's sheet!");
        });
    });

    describe('extractTokenTargetInfo', () => {
        it('extracts token metadata, hp, will, insight and moves', () => {
            const rawToken = {
                id: 'token-123',
                metadata: {
                    'pokerole-extension/stats': {
                        'character-name': 'Arbok',
                        'hp-curr': 8,
                        'hp-max': 10,
                        'will-curr': 3,
                        'will-max': 5,
                        'ins-base': 2,
                        'moves-data': JSON.stringify([{ name: 'Poison Sting', category: 'Physical', power: 1 }])
                    }
                }
            };

            const info = extractTokenTargetInfo(rawToken);
            expect(info.id).toBe('token-123');
            expect(info.name).toBe('Arbok');
            expect(info.hpCurr).toBe(8);
            expect(info.hpMax).toBe(10);
            expect(info.willCurr).toBe(3);
            expect(info.willMax).toBe(5);
            expect(info.insight).toBe(2);
            expect(info.moves).toHaveLength(1);
            expect(info.moves[0].name).toBe('Poison Sting');
        });
    });
});
