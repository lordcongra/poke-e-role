import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '@/store/useCharacterStore';
import {
    checkCondition,
    isBoostCondition,
    isStackingBoostCondition,
    getBoostMultiplier
} from '@/utils/tagParser/conditionChecker';

describe('conditionChecker', () => {
    beforeEach(() => {
        useCharacterStore.setState({
            statuses: [{ id: 'healthy-id', name: 'Healthy', customName: '', rounds: 0 }],
            identity: {
                ...useCharacterStore.getState().identity,
                abilityBoostActive: false
            },
            activeBattlefield: undefined
        });
    });

    describe('checkCondition: HP thresholds', () => {
        it('returns true when condition is undefined or empty', () => {
            expect(checkCondition(undefined, false)).toBe(true);
            expect(checkCondition('', false)).toBe(true);
        });

        it('evaluates "half hp" and variants against isHalfHp boolean', () => {
            expect(checkCondition('half hp', true)).toBe(true);
            expect(checkCondition('half hp', false)).toBe(false);

            expect(checkCondition('<50% hp', true)).toBe(true);
            expect(checkCondition('<50% hp', false)).toBe(false);

            expect(checkCondition('<=50% hp', true)).toBe(true);
            expect(checkCondition('<=50% hp', false)).toBe(false);

            expect(checkCondition('50% hp', true)).toBe(true);
            expect(checkCondition('50% hp', false)).toBe(false);

            expect(checkCondition('half-hp', true)).toBe(true);
            expect(checkCondition('half-hp', false)).toBe(false);
        });
    });

    describe('checkCondition: Ability and Source Boost Triggers', () => {
        it('evaluates explicit sourceBoostActive parameter when provided', () => {
            expect(checkCondition('boost', false, true)).toBe(true);
            expect(checkCondition('boost', false, false)).toBe(false);
            expect(checkCondition('triggered', false, true)).toBe(true);
            expect(checkCondition('triggered', false, false)).toBe(false);
        });

        it('falls back to identity.abilityBoostActive in store when sourceBoostActive is undefined', () => {
            useCharacterStore.setState({
                identity: {
                    ...useCharacterStore.getState().identity,
                    abilityBoostActive: true
                }
            });
            expect(checkCondition('boost', false)).toBe(true);
            expect(checkCondition('ability boost', false)).toBe(true);

            useCharacterStore.setState({
                identity: {
                    ...useCharacterStore.getState().identity,
                    abilityBoostActive: false
                }
            });
            expect(checkCondition('boost', false)).toBe(false);
            expect(checkCondition('ability boost', false)).toBe(false);
        });
    });

    describe('checkCondition: Status Conditions', () => {
        it('evaluates "any status" and "status" correctly', () => {
            // Only Healthy -> false
            expect(checkCondition('any status', false)).toBe(false);
            expect(checkCondition('status', false)).toBe(false);

            // With active non-healthy status -> true
            useCharacterStore.setState({
                statuses: [{ id: 'burn-1', name: 'Burn', customName: '', rounds: 0 }]
            });
            expect(checkCondition('any status', false)).toBe(true);
            expect(checkCondition('status', false)).toBe(true);
        });

        it('evaluates burn status and specific degrees', () => {
            useCharacterStore.setState({
                statuses: [{ id: 'burn-1', name: '2nd Degree Burn', customName: '', rounds: 0 }]
            });

            expect(checkCondition('burn', false)).toBe(true);
            expect(checkCondition('burned', false)).toBe(true);
            expect(checkCondition('2nd degree burn', false)).toBe(true);
            expect(checkCondition('1st degree burn', false)).toBe(false);
            expect(checkCondition('paralysis', false)).toBe(false);
        });

        it('evaluates paralysis status', () => {
            useCharacterStore.setState({
                statuses: [{ id: 'para-1', name: 'Paralysis', customName: '', rounds: 0 }]
            });

            expect(checkCondition('paralysis', false)).toBe(true);
            expect(checkCondition('paralyzed', false)).toBe(true);
            expect(checkCondition('sleep', false)).toBe(false);
        });

        it('evaluates poison and badly poisoned / toxic statuses', () => {
            useCharacterStore.setState({
                statuses: [{ id: 'psn-1', name: 'Badly Poisoned', customName: '', rounds: 0 }]
            });

            expect(checkCondition('poison', false)).toBe(true);
            expect(checkCondition('badly poisoned', false)).toBe(true);
            expect(checkCondition('toxic', false)).toBe(true);
        });

        it('evaluates frozen, sleep, and custom statuses by customName', () => {
            useCharacterStore.setState({
                statuses: [
                    { id: 'frost-1', name: 'Frozen Solid', customName: '', rounds: 0 },
                    { id: 'custom-1', name: 'Custom...', customName: 'Cursed Mark', rounds: 0 }
                ]
            });

            expect(checkCondition('frozen solid', false)).toBe(true);
            expect(checkCondition('freeze', false)).toBe(true);
            expect(checkCondition('cursed mark', false)).toBe(true);
        });
    });

    describe('isBoostCondition & isStackingBoostCondition', () => {
        it('identifies boost conditions', () => {
            expect(isBoostCondition('boost')).toBe(true);
            expect(isBoostCondition('triggered')).toBe(true);
            expect(isBoostCondition('active')).toBe(true);
            expect(isBoostCondition('ability boost')).toBe(true);
            expect(isBoostCondition('stack: 3')).toBe(true);
            expect(isBoostCondition('half hp')).toBe(false);
            expect(isBoostCondition(undefined)).toBe(false);
        });

        it('identifies stacking boost conditions', () => {
            expect(isStackingBoostCondition('stack')).toBe(true);
            expect(isStackingBoostCondition('stacking')).toBe(true);
            expect(isStackingBoostCondition('boost: 2')).toBe(true);
            expect(isStackingBoostCondition('boost 3')).toBe(true);
            expect(isStackingBoostCondition('boost')).toBe(false);
            expect(isStackingBoostCondition('active')).toBe(false);
            expect(isStackingBoostCondition(undefined)).toBe(false);
        });
    });

    describe('getBoostMultiplier', () => {
        it('returns 1 for non-boost conditions', () => {
            expect(getBoostMultiplier('half hp', 3, 5)).toBe(1);
            expect(getBoostMultiplier(undefined, 2, 3)).toBe(1);
        });

        it('returns Math.max(1, boostLevel) for stacking boost condition', () => {
            expect(getBoostMultiplier('stack', 3, 5)).toBe(3);
            expect(getBoostMultiplier('stack', 0, 5)).toBe(1);
            expect(getBoostMultiplier('boost: 2', 4, 1)).toBe(4);
        });

        it('returns Math.max(1, boostLevel) when maxBoost > 1 even if condition is simple boost', () => {
            expect(getBoostMultiplier('boost', 4, 3)).toBe(4);
            expect(getBoostMultiplier('boost', 0, 3)).toBe(1);
        });

        it('returns 1 for non-stacking boost condition when maxBoost <= 1', () => {
            expect(getBoostMultiplier('boost', 5, 1)).toBe(1);
        });
    });
});

