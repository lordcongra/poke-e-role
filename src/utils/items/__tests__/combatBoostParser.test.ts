import { describe, it, expect } from 'vitest';
import {
    hasCombatBoostTags,
    parseCombatBoostFromItem
} from '@/utils/items/combatBoostParser';

describe('combatBoostParser', () => {
    describe('hasCombatBoostTags', () => {
        it('detects [Acc Succ ...] and [Dmg Succ ...] variations', () => {
            expect(hasCombatBoostTags('[Acc Succ +1]')).toBe(true);
            expect(hasCombatBoostTags('[acc succ +2]')).toBe(true);
            expect(hasCombatBoostTags('[Dmg Succ +3]')).toBe(true);
            expect(hasCombatBoostTags('[dmg succ +1: Fire]')).toBe(true);
            expect(hasCombatBoostTags('Contains [Acc Success +1] in sentence')).toBe(true);
            expect(hasCombatBoostTags('Item with [Dmg Successes +2] effect')).toBe(true);
        });

        it('returns false for unrelated combat tags or empty text', () => {
            expect(hasCombatBoostTags('')).toBe(false);
            expect(hasCombatBoostTags('[Crit on 4+]')).toBe(false);
            expect(hasCombatBoostTags('[Acc +2] [Dmg +1]')).toBe(false);
            expect(hasCombatBoostTags('[First Hit Dmg +3]')).toBe(false);
        });
    });

    describe('parseCombatBoostFromItem', () => {
        it('extracts accuracy and damage success counts', () => {
            const item = {
                name: 'Dire Hit Alpha',
                tags: '[Acc Succ +1] [Dmg Succ +2]'
            };

            const boost = parseCombatBoostFromItem(item);

            expect(boost).toBeDefined();
            expect(boost?.accSucc).toBe(1);
            expect(boost?.dmgSucc).toBe(2);
            expect(boost?.stage).toBe('armed');
            expect(boost?.sourceName).toBe('Dire Hit Alpha');
        });

        it('extracts type restrictions', () => {
            const item = {
                name: 'Charcoal Boost',
                desc: '[Acc Succ +1: Fire] [Dmg Succ +2: Fire]'
            };

            const boost = parseCombatBoostFromItem(item);

            expect(boost).toBeDefined();
            expect(boost?.accSucc).toBe(1);
            expect(boost?.dmgSucc).toBe(2);
            expect(boost?.type).toBe('Fire');
        });

        it('handles type restrictions with trigger conditions', () => {
            const item = {
                name: 'Mystic Water Boost',
                description: '[Dmg Succ +2: Water @ Boost]'
            };

            const boost = parseCombatBoostFromItem(item);

            expect(boost).toBeDefined();
            expect(boost?.dmgSucc).toBe(2);
            expect(boost?.type).toBe('Water');
        });

        it('deduplicates repeated bracket tags across tags, desc, and description', () => {
            const item = {
                name: 'Miracle Seed',
                tags: '[Acc Succ +1: Grass]',
                desc: '[Acc Succ +1: Grass]',
                description: '[Acc Succ +1: Grass]'
            };

            const boost = parseCombatBoostFromItem(item);

            expect(boost).toBeDefined();
            expect(boost?.accSucc).toBe(1);
            expect(boost?.dmgSucc).toBe(0);
            expect(boost?.type).toBe('Grass');
        });

        it('returns undefined if no combat boost tags exist', () => {
            const item = {
                name: 'Oran Berry',
                desc: 'Restores 1 HP'
            };

            expect(parseCombatBoostFromItem(item)).toBeUndefined();
        });

        it('returns undefined if total success bonuses sum to 0', () => {
            const item = {
                name: 'Neutral Gem',
                tags: '[Acc Succ +0] [Dmg Succ +0]'
            };

            expect(parseCombatBoostFromItem(item)).toBeUndefined();
        });

        it('falls back to default sourceName "Item" when item has no name', () => {
            const item = {
                tags: '[Acc Succ +2]'
            };

            const boost = parseCombatBoostFromItem(item);

            expect(boost?.sourceName).toBe('Item');
            expect(boost?.accSucc).toBe(2);
        });
    });
});

