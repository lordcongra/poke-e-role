import { describe, it, expect } from 'vitest';
import {
    buildTagString,
    generateExplanation,
    parseTagStringToConfig,
    extractTagsFromText,
    extractItemTags,
    extractMoveTags,
    MOVE_KEYWORDS_MAP,
    MATCHUP_TARGET_MAP,
    COMBAT_TARGET_NAME_MAP,
    STAT_NORM_MAP
} from '../tagBuilderLogic';
import type { TagBuilderConfig } from '../tagBuilderTypes';

describe('tagBuilderLogic & Sub-modules', () => {
    describe('buildTagString', () => {
        it('builds stat and skill tags', () => {
            const statConfig: TagBuilderConfig = {
                category: 'stat',
                target: 'Str',
                value: 2,
                value2: 0,
                reqGroup: 'none',
                typeOption: '',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(statConfig)).toBe('[Str +2]');

            const skillConfig: TagBuilderConfig = {
                ...statConfig,
                category: 'skill',
                target: 'Brawl',
                value: -1
            };
            expect(buildTagString(skillConfig)).toBe('[Brawl -1]');
        });

        it('builds combat tags and type gem', () => {
            const combatConfig: TagBuilderConfig = {
                category: 'combat',
                target: 'Crit Dmg',
                value: 3,
                value2: 0,
                reqGroup: 'none',
                typeOption: '',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(combatConfig)).toBe('[Crit Dmg +3]');

            const typeGemConfig: TagBuilderConfig = {
                category: 'combat',
                target: 'Type Gem',
                value: 1,
                value2: 2,
                reqGroup: 'type',
                typeOption: 'Fire',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(typeGemConfig)).toBe('[Acc Succ +1: Fire] [Dmg Succ +2: Fire]');

            const lowAccPenaltyConfig: TagBuilderConfig = {
                category: 'combat',
                target: 'Low Acc Penalty',
                value: 2,
                value2: 0,
                reqGroup: 'type',
                typeOption: 'Flying',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(lowAccPenaltyConfig)).toBe('[Low Acc +2: Flying]');
        });

        it('builds matchup and mechanic tags', () => {
            const matchupConfig: TagBuilderConfig = {
                category: 'matchup',
                target: 'Immune',
                value: 1,
                value2: 0,
                reqGroup: 'type',
                typeOption: 'Ghost',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(matchupConfig)).toBe('[Immune: Ghost]');

            const removeImmunityConfig: TagBuilderConfig = {
                ...matchupConfig,
                target: 'Remove Immunities',
                typeOption: ''
            };
            expect(buildTagString(removeImmunityConfig)).toBe('[Remove Immunities]');

            const buffConfig: TagBuilderConfig = {
                category: 'mechanic',
                target: 'Encounter Buff',
                value: 2,
                value2: 0,
                reqGroup: 'none',
                typeOption: 'Dexterity',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(buffConfig)).toBe('[Buff: Dexterity +2]');
        });

        it('builds battlefield tags with standard and scene durations', () => {
            const weatherConfig: TagBuilderConfig = {
                category: 'battlefield',
                target: 'Weather',
                value: 5,
                value2: 0,
                reqGroup: 'none',
                typeOption: 'Rain',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(weatherConfig)).toBe('[Weather: Rain, 5]');

            const hazardConfig: TagBuilderConfig = {
                category: 'battlefield',
                target: 'Entry Hazard',
                value: -1,
                value2: 0,
                reqGroup: 'none',
                typeOption: 'Stealth Rock',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(hazardConfig)).toBe('[Hazard: Stealth Rock]');

            const sceneFieldConfig: TagBuilderConfig = {
                category: 'battlefield',
                target: 'Force Field',
                value: -1,
                value2: 0,
                reqGroup: 'none',
                typeOption: 'Light Screen',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(buildTagString(sceneFieldConfig)).toBe('[Force Field: Light Screen, scene]');
        });

        it('applies conditions correctly', () => {
            const halfHpConfig: TagBuilderConfig = {
                category: 'stat',
                target: 'Atk',
                value: 1,
                value2: 0,
                reqGroup: 'none',
                typeOption: '',
                condition: 'half hp',
                customMaxStacks: 5
            };
            expect(buildTagString(halfHpConfig)).toBe('[Atk +1 @ Half HP]');

            const stackingConfig: TagBuilderConfig = {
                ...halfHpConfig,
                condition: 'custom_stacking_boost',
                customMaxStacks: 4
            };
            expect(buildTagString(stackingConfig)).toBe('[Atk +1 @ Stacking Boost: 4]');
        });
    });

    describe('tagStringParser (parseTagStringToConfig)', () => {
        it('returns null for empty tag strings', () => {
            expect(parseTagStringToConfig('')).toBeNull();
        });

        it('parses choice and targeting tags', () => {
            const choiceResult = parseTagStringToConfig('[Choice: Fire | Ice | Electric]');
            expect(choiceResult).toMatchObject({
                category: 'choice',
                target: 'Custom Choice',
                typeOption: 'Fire | Ice | Electric'
            });

            const targetResult = parseTagStringToConfig('[Target: All Foes]');
            expect(targetResult).toMatchObject({
                category: 'targeting',
                target: 'All Foes'
            });
        });

        it('parses battlefield tags with durations', () => {
            const weather = parseTagStringToConfig('[Weather: Sun, 5]');
            expect(weather).toMatchObject({
                category: 'battlefield',
                target: 'Weather',
                typeOption: 'Sun',
                value: 5
            });

            const terrain = parseTagStringToConfig('[Terrain: Electric Terrain, scene]');
            expect(terrain).toMatchObject({
                category: 'battlefield',
                target: 'Terrain',
                typeOption: 'Electric Terrain',
                value: -1
            });
        });

        it('parses move mechanics with category or modifier requirements', () => {
            const physicalCrit = parseTagStringToConfig('[High Critical: Physical]');
            expect(physicalCrit).toMatchObject({
                category: 'mechanic',
                target: 'High Critical',
                typeOption: 'Physical',
                reqGroup: 'category'
            });

            const moveCrit = parseTagStringToConfig('[High Crit: Sound Move]');
            expect(moveCrit).toMatchObject({
                category: 'mechanic',
                target: 'High Critical',
                typeOption: 'Sound Move',
                reqGroup: 'modifier'
            });

            const unbracketedRecoil = parseTagStringToConfig('Recoil', true);
            expect(unbracketedRecoil).toMatchObject({
                category: 'move_mechanics',
                target: 'Recoil'
            });
        });

        it('parses buff, debuff, and permanent boost', () => {
            const buff = parseTagStringToConfig('[Buff: Strength +2]');
            expect(buff).toMatchObject({
                category: 'mechanic',
                target: 'Encounter Buff',
                typeOption: 'Strength',
                value: 2
            });

            const debuff = parseTagStringToConfig('[Debuff: Defense -1]');
            expect(debuff).toMatchObject({
                category: 'mechanic',
                target: 'Encounter Debuff',
                typeOption: 'Defense',
                value: 1
            });

            const perm = parseTagStringToConfig('[Permanent: Vitality +1]');
            expect(perm).toMatchObject({
                category: 'mechanic',
                target: 'Permanent Boost',
                typeOption: 'Vitality',
                value: 1
            });
        });

        it('parses combat type gem and flat successes', () => {
            const typeGem = parseTagStringToConfig('[Acc Succ +1: Fire] [Dmg Succ +2: Fire]');
            expect(typeGem).toMatchObject({
                category: 'combat',
                target: 'Type Gem',
                value: 1,
                value2: 2,
                typeOption: 'Fire',
                reqGroup: 'type'
            });

            const dmgSucc = parseTagStringToConfig('[Dmg Succ +2: Water]');
            expect(dmgSucc).toMatchObject({
                category: 'combat',
                target: 'Dmg Succ',
                value: 2,
                typeOption: 'Water',
                reqGroup: 'type'
            });
        });

        it('parses stats and skills with normalization map', () => {
            const statResult = parseTagStringToConfig('[sp. atk +3]');
            expect(statResult).toMatchObject({
                category: 'stat',
                target: 'Sp. Atk',
                value: 3
            });

            const skillResult = parseTagStringToConfig('[athletics +2]');
            expect(skillResult).toMatchObject({
                category: 'skill',
                target: 'Athletics',
                value: 2
            });
        });

        it('extracts conditions and custom stacking stacks', () => {
            const condResult = parseTagStringToConfig('[Str +2 @ Stacking Boost: 4]');
            expect(condResult).toMatchObject({
                category: 'stat',
                target: 'Str',
                value: 2,
                condition: 'custom_stacking_boost',
                customMaxStacks: 4
            });
        });

        it('exports parsing lookup dictionaries', () => {
            expect(MOVE_KEYWORDS_MAP['high crit']).toBe('High Critical');
            expect(MATCHUP_TARGET_MAP['immune']).toBe('Immune');
            expect(COMBAT_TARGET_NAME_MAP['init']).toBe('Init');
            expect(STAT_NORM_MAP['dexterity']).toBe('Dex');
        });
    });

    describe('tagExplanationGenerator', () => {
        it('generates fallback when no built tag is present', () => {
            const config: TagBuilderConfig = {
                category: 'stat',
                target: 'Str',
                value: 1,
                value2: 0,
                reqGroup: 'none',
                typeOption: '',
                condition: 'none',
                customMaxStacks: 5
            };
            expect(generateExplanation(config, '')).toBe('Select options above to configure your tag.');
        });

        it('generates combat explanation with condition', () => {
            const config: TagBuilderConfig = {
                category: 'combat',
                target: 'Dmg',
                value: 2,
                value2: 0,
                reqGroup: 'type',
                typeOption: 'Electric',
                condition: 'half hp',
                customMaxStacks: 5
            };
            const explanation = generateExplanation(config, '[Dmg +2: Electric @ Half HP]');
            expect(explanation).toContain('Adds +2 damage dice on Electric moves');
            expect(explanation).toContain('(only active when at 50% HP or less).');
        });

        it('generates battlefield explanation with round count', () => {
            const config: TagBuilderConfig = {
                category: 'battlefield',
                target: 'Weather',
                value: 4,
                value2: 0,
                reqGroup: 'none',
                typeOption: 'Rain',
                condition: 'none',
                customMaxStacks: 5
            };
            const explanation = generateExplanation(config, '[Weather: Rain, 4]');
            expect(explanation).toContain('Changes battlefield weather to "Rain" for 4 rounds');
        });
    });

    describe('tagPillExtractors', () => {
        it('extractTagsFromText parses bracketed tags', () => {
            const text = 'Grants [Str +1] and [Immune: Fire] in battle.';
            const pills = extractTagsFromText(text);
            expect(pills).toHaveLength(2);
            expect(pills[0]).toEqual({
                tag: '[Str +1]',
                display: 'Str +1',
                raw: '[Str +1]',
                isMoveKeyword: false
            });
            expect(pills[1].display).toBe('Immune: Fire');
        });

        it('extractItemTags handles tags, desc legacy brackets, and deduplicates', () => {
            const item = {
                name: 'Custom Berry',
                tags: '[Heal 2 Round End]',
                desc: 'A juicy berry. [Heal 2 Round End] [Will +1]'
            };
            const pills = extractItemTags(item);
            expect(pills).toHaveLength(2);
            expect(pills.map((p) => p.display)).toEqual(['Heal 2 Round End', 'Will +1']);
        });

        it('extractMoveTags parses both bracketed tags and unbracketed move keywords', () => {
            const moveDesc = 'Strikes rapidly. [Dmg +1] High Crit and Low Accuracy 2.';
            const pills = extractMoveTags(moveDesc);
            const displays = pills.map((p) => p.display);
            expect(displays).toContain('Dmg +1');
            expect(displays).toContain('High Critical');
            expect(displays).toContain('Low Accuracy 2');
        });
    });
});

