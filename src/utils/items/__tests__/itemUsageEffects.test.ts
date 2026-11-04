import { describe, it, expect } from 'vitest';
import {
    applyItemUsageEffects,
    getTargetBurnDegree,
    expandStatBoost,
    CORE_STATS,
    SOCIAL_STATS
} from '@/utils/items/itemUsageEffects';
import type { InventoryItem, CharacterHealth, CharacterWill, StatusItem } from '@/store/entityTypes';

describe('itemUsageEffects', () => {
    const createHealth = (overrides: Partial<CharacterHealth> = {}): CharacterHealth => ({
        hpCurr: 5,
        hpMax: 10,
        hpBase: 10,
        temporaryHitPoints: 0,
        temporaryHitPointsMax: 0,
        ...overrides
    });

    const createWill = (overrides: Partial<CharacterWill> = {}): CharacterWill => ({
        willCurr: 3,
        willMax: 6,
        willBase: 6,
        temporaryWill: 0,
        temporaryWillMax: 0,
        ...overrides
    });

    describe('applyItemUsageEffects: HP & Will Healing', () => {
        it('clamps HP healing at hpMax', () => {
            const item: InventoryItem = {
                id: 'item-1',
                name: 'Custom Tonic',
                desc: 'Heals HP',
                qty: 1,
                healHp: 8
            };
            const health = createHealth({ hpCurr: 7, hpMax: 10 });
            const will = createWill();

            const result = applyItemUsageEffects(item, health, will, []);

            expect(result.nextHealth.hpCurr).toBe(10);
            expect(result.hpHealed).toBe(3);
        });

        it('heals 1 HP per charge for multi-dose potions (Super Potion)', () => {
            const item: InventoryItem = {
                id: 'item-super-potion',
                name: 'Super Potion',
                desc: 'A regular can of concentrated formula spray',
                qty: 1,
                charges: 4,
                maxCharges: 4
            };
            const health = createHealth({ hpCurr: 5, hpMax: 10 });
            const will = createWill();

            const result = applyItemUsageEffects(item, health, will, []);

            expect(result.nextHealth.hpCurr).toBe(6);
            expect(result.hpHealed).toBe(1);
        });

        it('clamps Will healing at willMax', () => {
            const item: InventoryItem = {
                id: 'item-2',
                name: 'Elixir',
                desc: 'Restores Will',
                qty: 1,
                healWill: 10
            };
            const health = createHealth();
            const will = createWill({ willCurr: 2, willMax: 5 });

            const result = applyItemUsageEffects(item, health, will, []);

            expect(result.nextWill.willCurr).toBe(5);
            expect(result.willHealed).toBe(3);
        });

        it('handles full heals via healHp >= 99 (Max Potion)', () => {
            const item: InventoryItem = {
                id: 'item-max',
                name: 'Max Potion',
                desc: 'Fully restores HP',
                qty: 1
            };
            const health = createHealth({ hpCurr: 1, hpMax: 15 });
            const will = createWill();

            const result = applyItemUsageEffects(item, health, will, []);

            expect(result.nextHealth.hpCurr).toBe(15);
            expect(result.hpHealed).toBe(14);
        });
    });

    describe('applyItemUsageEffects: Reviving from Fainted State', () => {
        it('revives Pokémon when hpCurr <= 0 and cures Fainted status', () => {
            const item: InventoryItem = {
                id: 'item-revive',
                name: 'Revive',
                desc: 'Revives fainted Pokémon',
                qty: 1
            };
            const health = createHealth({ hpCurr: 0, hpMax: 8 });
            const will = createWill({ willCurr: 0, willMax: 5 });
            const statuses: StatusItem[] = [
                { id: 'status-faint', name: 'Fainted', customName: '', rounds: 0 }
            ];

            const result = applyItemUsageEffects(item, health, will, statuses);

            expect(result.nextHealth.hpCurr).toBe(1);
            expect(result.hpHealed).toBe(1);
            expect(result.curedStatusNames).toContain('Fainted');
            expect(result.nextStatuses.some((s) => s.name === 'Fainted')).toBe(false);
            expect(result.nextStatuses.some((s) => s.name === 'Healthy')).toBe(true);
        });

        it('revives Pokémon to full HP using Max Revive', () => {
            const item: InventoryItem = {
                id: 'item-max-revive',
                name: 'Max Revive',
                desc: 'Fully revives fainted Pokémon',
                qty: 1
            };
            const health = createHealth({ hpCurr: 0, hpMax: 12 });
            const will = createWill();
            const statuses: StatusItem[] = [
                { id: 'status-faint', name: 'Fainted', customName: '', rounds: 0 }
            ];

            const result = applyItemUsageEffects(item, health, will, statuses);

            expect(result.nextHealth.hpCurr).toBe(12);
            expect(result.hpHealed).toBe(12);
            expect(result.curedStatusNames).toContain('Fainted');
            expect(result.nextStatuses.some((s) => s.name === 'Healthy')).toBe(true);
        });
    });

    describe('applyItemUsageEffects: Burn Degree Detection & Curing', () => {
        it('detects burn degree via getTargetBurnDegree', () => {
            expect(getTargetBurnDegree({ id: '1', name: '1st Degree Burn', customName: '', rounds: 0 })).toBe(1);
            expect(getTargetBurnDegree({ id: '2', name: '2nd Degree Burn', customName: '', rounds: 0 })).toBe(2);
            expect(getTargetBurnDegree({ id: '3', name: '3rd Degree Burn', customName: '', rounds: 0 })).toBe(3);
            expect(getTargetBurnDegree({ id: '4', name: 'Burn', customName: '', rounds: 0 })).toBe(1);
            expect(
                getTargetBurnDegree({
                    id: '5',
                    name: 'Custom...',
                    customName: 'Nasty 2nd Degree Burn',
                    rounds: 0
                })
            ).toBe(2);
            expect(getTargetBurnDegree({ id: '6', name: 'Poison', customName: '', rounds: 0 })).toBeNull();
        });

        it('cures burn degrees using Burn Heal and returns Healthy status', () => {
            const item: InventoryItem = {
                id: 'item-burn-heal',
                name: 'Burn Heal',
                desc: 'Cures burn',
                qty: 1
            };
            const health = createHealth();
            const will = createWill();
            const statuses: StatusItem[] = [
                { id: 'burn-2', name: '2nd Degree Burn', customName: '', rounds: 0 }
            ];

            const result = applyItemUsageEffects(item, health, will, statuses);

            expect(result.curedStatusNames).toContain('2nd Degree Burn');
            expect(result.nextStatuses.some((s) => s.name.includes('Burn'))).toBe(false);
            expect(result.nextStatuses.some((s) => s.name === 'Healthy')).toBe(true);
        });
    });

    describe('applyItemUsageEffects: Temp HP and Temp Will Decoupling', () => {
        it('returns temp HP and temp Will in result without modifying base pools', () => {
            const item: InventoryItem = {
                id: 'item-temp',
                name: 'Shield Tonic',
                desc: 'Grants temporary defenses',
                qty: 1,
                gainTempHp: 4,
                gainTempWill: 3
            };
            const health = createHealth({ hpCurr: 5, hpMax: 10, temporaryHitPoints: 1 });
            const will = createWill({ willCurr: 2, willMax: 6, temporaryWill: 0 });

            const result = applyItemUsageEffects(item, health, will, []);

            expect(result.tempHpGained).toBe(4);
            expect(result.tempWillGained).toBe(3);
            expect(result.nextHealth.hpCurr).toBe(5);
            expect(result.nextHealth.hpMax).toBe(10);
            expect(result.nextHealth.temporaryHitPoints).toBe(5);
            expect(result.nextWill.willCurr).toBe(2);
            expect(result.nextWill.willMax).toBe(6);
            expect(result.nextWill.temporaryWill).toBe(3);
        });
    });

    describe('expandStatBoost', () => {
        it("expands 'all core' to 5 core stats", () => {
            const expanded = expandStatBoost('all core', 2);
            expect(expanded).toHaveLength(5);
            expect(expanded.map((e) => e.stat)).toEqual(CORE_STATS);
            expect(expanded.every((e) => e.value === 2)).toBe(true);
        });

        it("expands 'all social' to 5 social stats", () => {
            const expanded = expandStatBoost('all social', 1);
            expect(expanded).toHaveLength(5);
            expect(expanded.map((e) => e.stat)).toEqual(SOCIAL_STATS);
            expect(expanded.every((e) => e.value === 1)).toBe(true);
        });

        it("expands 'all attributes' to 10 total stats", () => {
            const expanded = expandStatBoost('all attributes', 3);
            expect(expanded).toHaveLength(10);
            expect(expanded.map((e) => e.stat)).toEqual([...CORE_STATS, ...SOCIAL_STATS]);
        });

        it('returns single stat when given a specific attribute', () => {
            const expanded = expandStatBoost('Strength', 1);
            expect(expanded).toEqual([{ stat: 'Strength', value: 1 }]);
        });
    });
});

