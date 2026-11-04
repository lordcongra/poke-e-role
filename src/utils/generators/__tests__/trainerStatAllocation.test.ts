import { describe, it, expect } from 'vitest';
import {
    determineSuggestedBadges,
    allocatePrioritizedAttributes,
    allocatePrioritizedSkills,
    allocateTrainerStats,
    buildTrainerTokenMetadata,
    KANTO_BADGE_PRESETS
} from '../trainerStatAllocation';
import { Skill } from '../../../types/enums';
import { getRankPoints, getAgePoints } from '../../../store/useCharacterStore';
import type { Rank } from '../../../store/storeTypes';

describe('trainerStatAllocation', () => {
    describe('determineSuggestedBadges', () => {
        it('returns 0 badges for Starter and Rookie ranks', () => {
            expect(determineSuggestedBadges('Starter')).toEqual([]);
            expect(determineSuggestedBadges('Rookie')).toEqual([]);
            expect(determineSuggestedBadges('Unknown' as any)).toEqual([]);
        });

        it('returns 1 badge for Standard rank', () => {
            const badges = determineSuggestedBadges('Standard');
            expect(badges).toHaveLength(1);
            expect(badges[0].name).toBe('Boulder Badge');
            expect(badges[0].emoji).toBe('🪨');
            expect(badges[0].id).toBeDefined();
        });

        it('returns 4 badges for Advanced rank in sequence', () => {
            const badges = determineSuggestedBadges('Advanced');
            expect(badges).toHaveLength(4);
            expect(badges.map((b) => b.name)).toEqual([
                'Boulder Badge',
                'Cascade Badge',
                'Thunder Badge',
                'Rainbow Badge'
            ]);
            expect(badges.map((b) => b.emoji)).toEqual(['🪨', '💧', '⚡', '🌈']);
            badges.forEach((b) => expect(b.id).toBeDefined());
        });

        it('returns 8 badges for Expert, Ace, and Master ranks', () => {
            const ranks = ['Expert', 'Ace', 'Master'] as const;
            for (const rank of ranks) {
                const badges = determineSuggestedBadges(rank);
                expect(badges).toHaveLength(8);
                expect(badges.map((b) => b.name)).toEqual(KANTO_BADGE_PRESETS.map((p) => p.name));
                expect(badges.map((b) => b.emoji)).toEqual(KANTO_BADGE_PRESETS.map((p) => p.emoji));
            }
        });

        it('returns 8 badges plus 1 Champion Trophy for Champion rank', () => {
            const badges = determineSuggestedBadges('Champion');
            expect(badges).toHaveLength(9);

            // First 8 badges are the standard Kanto badges
            expect(badges.slice(0, 8).map((b) => b.name)).toEqual(KANTO_BADGE_PRESETS.map((p) => p.name));

            // 9th item is the Champion Trophy
            const trophy = badges[8];
            expect(trophy.name).toBe('Champion Trophy');
            expect(trophy.emoji).toBe('🏆');
            expect(trophy.id).toBeDefined();
        });
    });

    describe('allocatePrioritizedAttributes', () => {
        it('returns zeroed stats when points <= 0 or empty priority list', () => {
            expect(allocatePrioritizedAttributes(0, ['str', 'dex'])).toEqual({ str: 0, dex: 0 });
            expect(allocatePrioritizedAttributes(-2, ['str', 'dex'])).toEqual({ str: 0, dex: 0 });
            expect(allocatePrioritizedAttributes(5, [])).toEqual({});
        });

        it('allocates evenly across priority list when isBalanced is true', () => {
            const result = allocatePrioritizedAttributes(6, ['str', 'dex', 'vit'], 4, true);
            expect(result).toEqual({ str: 2, dex: 2, vit: 2 });
        });

        it('allocates stepped priority when isBalanced is false', () => {
            const result = allocatePrioritizedAttributes(3, ['str', 'dex', 'vit', 'ins'], 4, false);
            // Steps: p1 (1), p2 (1), p1 (2)
            expect(result.str).toBe(2);
            expect(result.dex).toBe(1);
            expect(result.vit).toBe(0);
            expect(result.ins).toBe(0);
        });
    });

    describe('allocatePrioritizedSkills', () => {
        it('returns zeroed skills when points <= 0', () => {
            const result = allocatePrioritizedSkills(0, [Skill.BRAWL, Skill.ALERT], 3);
            Object.values(Skill).forEach((s) => {
                expect(result[s]).toBe(0);
            });
        });

        it('allocates evenly across priority skills when isBalanced is true', () => {
            const result = allocatePrioritizedSkills(4, [Skill.BRAWL, Skill.ALERT], 3, true);
            expect(result[Skill.BRAWL]).toBe(2);
            expect(result[Skill.ALERT]).toBe(2);
        });

        it('respects skillLimit cap', () => {
            const result = allocatePrioritizedSkills(10, [Skill.BRAWL], 2, false);
            expect(result[Skill.BRAWL]).toBe(2);
        });
    });

    describe('allocateTrainerStats', () => {
        it('allocates core and social points matching getRankPoints + getAgePoints', () => {
            const ranks: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Ace'];
            const ages = ['Child', 'Teen', 'Adult', 'Senior'];

            ranks.forEach((rank) => {
                ages.forEach((age) => {
                    const expectedCore = getRankPoints(rank).core + getAgePoints(age).core;
                    const expectedSocial = getRankPoints(rank).social + getAgePoints(age).social;

                    const result = allocateTrainerStats(rank, age, 'battler', false);
                    const totalAttr = Object.values(result.attr).reduce((sum, v) => sum + v, 0);
                    const totalSoc = Object.values(result.soc).reduce((sum, v) => sum + v, 0);

                    expect(totalAttr).toBe(expectedCore);
                    expect(totalSoc).toBe(expectedSocial);
                });
            });
        });

        it('verifies skills do not exceed getRankPoints(rank).skillLimit', () => {
            const ranks: Rank[] = ['Starter', 'Rookie', 'Standard', 'Advanced', 'Expert', 'Champion'];

            ranks.forEach((rank) => {
                const limit = getRankPoints(rank).skillLimit;
                const result = allocateTrainerStats(rank, 'Teen', 'battler', false);

                Object.values(result.skills).forEach((val) => {
                    expect(val).toBeLessThanOrEqual(limit);
                });
            });
        });

        it('verifies archetype priorities for battler (prioritizing Brawl/Strength)', () => {
            const result = allocateTrainerStats('Standard', 'Teen', 'battler', false);

            // Battler prioritizes STR over INS
            expect(result.attr.str).toBeGreaterThanOrEqual(result.attr.ins);
            // Battler prioritizes Brawl over intellectual skills like Lore or Medicine
            expect(result.skills[Skill.BRAWL]).toBeGreaterThan(0);
            expect(result.skills[Skill.BRAWL]).toBeGreaterThanOrEqual(result.skills[Skill.LORE]);
            expect(result.skills[Skill.BRAWL]).toBeGreaterThanOrEqual(result.skills[Skill.MEDICINE]);
        });

        it('verifies archetype priorities for scholar (prioritizing Insight/Special and Magic/Medicine/Lore)', () => {
            const result = allocateTrainerStats('Advanced', 'Adult', 'scholar', true);

            // Scholar prioritizes INS and SPE over STR
            expect(result.attr.ins).toBeGreaterThanOrEqual(result.attr.str);
            expect(result.attr.spe).toBeGreaterThanOrEqual(result.attr.str);
            // Scholar prioritizes intellectual skills
            expect(result.skills[Skill.MAGIC]).toBeGreaterThan(0);
            expect(result.skills[Skill.MEDICINE]).toBeGreaterThan(0);
            expect(result.skills[Skill.MAGIC]).toBeGreaterThanOrEqual(result.skills[Skill.BRAWL]);
        });

        it('allocates evenly across stats and skills for balanced profile', () => {
            const result = allocateTrainerStats('Standard', 'Teen', 'balanced', false);
            const totalAttr = Object.values(result.attr).reduce((sum, v) => sum + v, 0);
            const expectedCore = getRankPoints('Standard').core + getAgePoints('Teen').core;
            expect(totalAttr).toBe(expectedCore);

            const totalSoc = Object.values(result.soc).reduce((sum, v) => sum + v, 0);
            const expectedSocial = getRankPoints('Standard').social + getAgePoints('Teen').social;
            expect(totalSoc).toBe(expectedSocial);
        });
    });

    describe('buildTrainerTokenMetadata', () => {
        it('calculates hp-max = 4 + 1 + attr.vit and will-max = 3 + 1 + attr.ins', () => {
            const metadata = buildTrainerTokenMetadata(
                'Red',
                null,
                'Standard',
                'Teen',
                'Male',
                'Brave',
                false,
                'battler',
                true
            );

            const vitRank = Number(metadata['vit-rank']);
            const insRank = Number(metadata['ins-rank']);

            expect(metadata['hp-base']).toBe(4);
            expect(metadata['hp-max']).toBe(4 + 1 + vitRank);
            expect(metadata['hp-curr']).toBe(metadata['hp-max']);
            expect(metadata['hp-max-display']).toBe(metadata['hp-max']);

            expect(metadata['will-base']).toBe(3);
            expect(metadata['will-max']).toBe(3 + 1 + insRank);
            expect(metadata['will-curr']).toBe(metadata['will-max']);
            expect(metadata['will-max-display']).toBe(metadata['will-max']);

            // Badges assigned for Standard rank (1 badge)
            expect(Array.isArray(metadata['badges'])).toBe(true);
            expect((metadata['badges'] as unknown[]).length).toBe(1);
        });

        it('sets explicit boolean and string privacy flags when privacy options are enabled', () => {
            const metadata = buildTrainerTokenMetadata(
                'Blue',
                null,
                'Advanced',
                'Adult',
                'Male',
                'Calm',
                false,
                'battler',
                false,
                undefined,
                {
                    privacyDefaults: true,
                    privateNpcLock: true,
                    privateRolls: true,
                    privateGmTrackers: true
                }
            );

            expect(metadata['is-npc']).toBe(true);
            expect(metadata['rolls']).toBe('Private (GM)');
            expect(metadata['gm-hp-bar']).toBe(true);
            expect(metadata['gm-hp-text']).toBe(true);
            expect(metadata['gm-will-bar']).toBe(true);
            expect(metadata['gm-will-text']).toBe(true);
            expect(metadata['gm-def-badge']).toBe(true);
            expect(metadata['gm-eco-badge']).toBe(true);
        });

        it('omits privacy flags when privacy defaults are false or omitted', () => {
            const metadata = buildTrainerTokenMetadata(
                'Green',
                null,
                'Starter',
                'Child',
                'Female',
                'Jolly',
                false,
                'battler',
                false
            );

            expect(metadata['is-npc']).toBeUndefined();
            expect(metadata['rolls']).toBeUndefined();
            expect(metadata['gm-hp-bar']).toBeUndefined();
        });

        it('configures Special Trainer mode and attributes when isSpecialTrainer is true', () => {
            const metadata = buildTrainerTokenMetadata(
                'Sabrina',
                null,
                'Expert',
                'Adult',
                'Female',
                'Mystic',
                true,
                'mystic',
                true
            );

            expect(metadata['mode']).toBe('Trainer (Special)');
            expect(metadata['spe-base']).toBe(1);
            expect(metadata['spe-limit']).toBe(5);
            expect(Number(metadata['spe-rank'])).toBeGreaterThanOrEqual(0);
        });
    });
});
