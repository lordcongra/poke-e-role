import { describe, it, expect } from 'vitest';
import { MOVE_TAGS_DATA, formatMoveTagBroadcast } from '../gmMoveTagsData';
import { GM_CHEAT_ITEMS } from '../gmCheatItems';

describe('gmMoveTagsData', () => {
    const EXPECTED_TAG_IDS = [
        'must-recharge',
        'rampage',
        'charged-moves',
        'successive-actions',
        'switcher-moves',
        'never-miss',
        'ongoing-damage',
        'ranged-moves',
        'heals-hp-recovery',
        'high-critical',
        'low-accuracy',
        'recoil',
        'set-damage',
        'out-of-range',
        'vulnerable',
        'sound-moves',
        'shield-moves',
        'force-field',
        'entry-hazard',
        'blocking',
        'powder-moves',
        'ability-archetypes',
        'copy-move',
        'unique-move',
        'durations'
    ];

    it('contains all 25 official corebook move tags with dedicated entries', () => {
        expect(MOVE_TAGS_DATA).toHaveLength(25);
        const ids = MOVE_TAGS_DATA.map((t) => t.id);
        expect(ids).toEqual(expect.arrayContaining(EXPECTED_TAG_IDS));
    });

    it('has exact official names for Never Miss, High Critical, Low Accuracy, Force Field, and Entry Hazard', () => {
        const neverMiss = MOVE_TAGS_DATA.find((t) => t.id === 'never-miss');
        expect(neverMiss?.name).toBe('Never Miss');

        const highCrit = MOVE_TAGS_DATA.find((t) => t.id === 'high-critical');
        expect(highCrit?.name).toBe('High Critical');

        const lowAcc = MOVE_TAGS_DATA.find((t) => t.id === 'low-accuracy');
        expect(lowAcc?.name).toBe('Low Accuracy');

        const forceField = MOVE_TAGS_DATA.find((t) => t.id === 'force-field');
        expect(forceField?.name).toBe('Force Field');

        const entryHazard = MOVE_TAGS_DATA.find((t) => t.id === 'entry-hazard');
        expect(entryHazard?.name).toBe('Entry Hazard');

        const copyMove = MOVE_TAGS_DATA.find((t) => t.id === 'copy-move');
        expect(copyMove?.name).toBe('Copy Move');

        const uniqueMove = MOVE_TAGS_DATA.find((t) => t.id === 'unique-move');
        expect(uniqueMove?.name).toBe('Unique Move');
    });

    it('has unique IDs across all entries', () => {
        const ids = MOVE_TAGS_DATA.map((t) => t.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('has valid categories and non-empty metadata for every tag', () => {
        const validCategories = [
            'action-economy',
            'combat-damage',
            'defensive-field',
            'archetypes',
            'durations'
        ];

        for (const tag of MOVE_TAGS_DATA) {
            expect(validCategories).toContain(tag.category);
            expect(tag.name.trim().length).toBeGreaterThan(0);
            expect(tag.categoryLabel.trim().length).toBeGreaterThan(0);
            expect(tag.badgeIcon.trim().length).toBeGreaterThan(0);
            expect(tag.summary.trim().length).toBeGreaterThan(0);
            expect(tag.rules.length).toBeGreaterThanOrEqual(2);
            for (const rule of tag.rules) {
                expect(rule.trim().length).toBeGreaterThan(0);
            }
        }
    });

    it('includes voluntary action progression and per-attack damage for successive actions', () => {
        const successiveTag = MOVE_TAGS_DATA.find((t) => t.id === 'successive-actions');
        expect(successiveTag).toBeDefined();
        const ruleText = successiveTag?.rules.join(' ');
        expect(ruleText).toContain('One-at-a-Time Voluntary Progression');
        expect(ruleText).toContain('Damage is rolled per-attack');
    });

    it('includes unclashable rule for set damage', () => {
        const setDmgTag = MOVE_TAGS_DATA.find((t) => t.id === 'set-damage');
        expect(setDmgTag).toBeDefined();
        const ruleText = setDmgTag?.rules.join(' ');
        expect(ruleText).toContain('Cannot Be Clashed');
    });

    it('correctly formats broadcast messages without tactical tips', () => {
        const rechargeTag = MOVE_TAGS_DATA.find((t) => t.id === 'must-recharge');
        expect(rechargeTag).toBeDefined();
        if (rechargeTag) {
            const broadcast = formatMoveTagBroadcast(rechargeTag);
            expect(broadcast).toContain('[Move Tag] Must Recharge');
            expect(broadcast).toContain('(Action Economy & Timing)');
            expect(broadcast).toContain('Stacks per Hit');
            expect(broadcast).not.toContain('Tactical Tip:');
        }
    });

    it('is registered in GM_CHEAT_ITEMS with comprehensive keywords and broadcast text', () => {
        const cheatItem = GM_CHEAT_ITEMS.find((item) => item.id === 'move-tags-reference');
        expect(cheatItem).toBeDefined();
        expect(cheatItem?.category).toBe('rules');
        expect(cheatItem?.badge).toBe('Core Reference');
        expect(cheatItem?.keywords).toContain('must recharge');
        expect(cheatItem?.keywords).toContain('rampage');
        expect(cheatItem?.keywords).toContain('never miss');
        expect(cheatItem?.keywords).toContain('high critical');
        expect(cheatItem?.keywords).toContain('low accuracy');
        expect(cheatItem?.keywords).toContain('force field');
        expect(cheatItem?.keywords).toContain('entry hazards');
        expect(cheatItem?.keywords).toContain('recoil');
        expect(cheatItem?.keywords).toContain('set damage');
        expect(cheatItem?.keywords).toContain('blocking');
        expect(cheatItem?.keywords).toContain('powder moves');
        expect(cheatItem?.broadcastText).toContain('Move Tags & Special Mechanics:');
        expect(cheatItem?.discordMarkdown).toContain('Pokerole Move Tags & Special Mechanics');
        expect(cheatItem?.discordMarkdown).not.toContain('Tactical Tip:');
    });
});
