import { describe, it, expect } from 'vitest';
import {
    parseStatOptions,
    parseSkillOptions,
    normalizeSingleStatistic,
    normalizeSingleSkill
} from '../pipeline/generatorOptionsParser';
import { buildTokenMetadataFromBuild } from '../pipeline/generatorMetadataBuilder';
import {
    resolveBaseStatsAndLimits,
    createGeneratorFakeState,
    resolveBuildIdentity,
    resolveDualScalingMoves
} from '../pipeline/generatorBuildLogic';
import type { TempBuild, CharacterState, TempMove, GeneratorConfig } from '@/store/storeTypes';
import { CombatStat } from '@/types/enums';

describe('Generator Pipeline Modules', () => {
    describe('generatorOptionsParser', () => {
        it('normalizes single statistics accurately', () => {
            expect(normalizeSingleStatistic('Strength')).toBe('str');
            expect(normalizeSingleStatistic('dex')).toBe('dex');
            expect(normalizeSingleStatistic('Special')).toBe('spe');
            expect(normalizeSingleStatistic('Will')).toBe('will');
            expect(normalizeSingleStatistic('none')).toBe('');
            expect(normalizeSingleStatistic('invalid')).toBe('');
        });

        it('parses multi-option stat strings with various delimiters', () => {
            expect(parseStatOptions('Strength / Dexterity')).toEqual(['str', 'dex']);
            expect(parseStatOptions('Vitality, Special or Insight')).toEqual(['vit', 'spe', 'ins']);
            expect(parseStatOptions('')).toEqual([]);
            expect(parseStatOptions('None')).toEqual([]);
        });

        it('normalizes single skills accurately', () => {
            expect(normalizeSingleSkill('Brawl')).toBe('brawl');
            expect(normalizeSingleSkill('channel')).toBe('channel');
            expect(normalizeSingleSkill('none')).toBe('none');
            expect(normalizeSingleSkill('xyz')).toBe('none');
        });

        it('parses multi-option skill strings and filters duplicates or invalid entries', () => {
            expect(parseSkillOptions('Brawl / Channel')).toEqual(['brawl', 'channel']);
            expect(parseSkillOptions('Alert, Stealth or Alert')).toEqual(['alert', 'stealth']);
            expect(parseSkillOptions('')).toEqual([]);
            expect(parseSkillOptions('none')).toEqual([]);
        });
    });

    describe('generatorMetadataBuilder', () => {
        const mockBuild: TempBuild = {
            species: 'Pikachu',
            rank: 'Starter',
            gender: 'Male',
            nature: 'Brave',
            attr: { str: 1, dex: 2, vit: 0, spe: 0, ins: 1 },
            soc: { tou: 1, coo: 0, bea: 0, cut: 2, cle: 0 },
            skills: { brawl: 2, alert: 1 },
            customSkillsList: [],
            customSkillMap: {},
            moves: [
                {
                    id: 'm1',
                    name: 'Thunderbolt',
                    attr: 'spe',
                    skill: 'channel',
                    type: 'Electric',
                    cat: 'Spec',
                    dmgStat: 'spe',
                    power: 3,
                    desc: 'A strong electrical attack.'
                }
            ],
            maxMoves: 5,
            includePmd: false,
            pokemonData: {
                Name: 'Pikachu',
                Type1: 'Electric',
                Type2: 'None',
                BaseHP: 4,
                BaseWill: 3,
                Strength: 2,
                Dexterity: 3,
                Vitality: 2,
                Special: 2,
                Insight: 1,
                Ability1: 'Static'
            },
            baseStats: { str: 2, dex: 3, vit: 2, spe: 2, ins: 1 },
            loyalty: 2,
            happiness: 2
        };

        it('constructs flat token metadata properly', () => {
            const metadata = buildTokenMetadataFromBuild(mockBuild, 'Sparky', 'https://example.com/sparky.png');

            expect(metadata.nickname).toBe('Sparky');
            expect(metadata.species).toBe('Pikachu');
            expect(metadata.rank).toBe('Starter');
            expect(metadata.type1).toBe('Electric');
            expect(metadata.type2).toBe('');
            expect(metadata.ability).toBe('Static');
            expect(metadata.nature).toBe('Brave');
            expect(metadata.gender).toBe('Male');
            expect(metadata['token-image-url']).toBe('https://example.com/sparky.png');
            expect(metadata['ruleset']).toBeUndefined();
            expect(metadata['v2-migrated']).toBe(true);

            // Health & Will calculations
            expect(metadata['hp-base']).toBe(4);
            expect(typeof metadata['hp-curr']).toBe('number');
            expect(typeof metadata['will-curr']).toBe('number');

            // Attributes and skills
            expect(metadata['str-base']).toBe(2);
            expect(metadata['str-rank']).toBe(1);
            expect(metadata['dex-base']).toBe(3);
            expect(metadata['dex-rank']).toBe(2);
            expect(metadata['cut-rank']).toBe(2);
            expect(metadata['brawl-base']).toBe(2);

            // Moves JSON serialized
            const parsedMoves = JSON.parse(metadata['moves-data'] as string);
            expect(parsedMoves).toHaveLength(1);
            expect(parsedMoves[0].name).toBe('Thunderbolt');
            expect(parsedMoves[0].category).toBe('Special');
            expect(parsedMoves[0].acc1).toBe('spe');
            expect(parsedMoves[0].acc2).toBe('channel');
        });

        it('applies privacy settings when requested', () => {
            const metadata = buildTokenMetadataFromBuild(mockBuild, 'Sparky', '', {
                privacyDefaults: true,
                privateNpcLock: true,
                privateRolls: true,
                privateGmTrackers: true
            });

            expect(metadata['is-npc']).toBe(true);
            expect(metadata['rolls']).toBe('Private (GM)');
            expect(metadata['gm-hp-bar']).toBe(true);
            expect(metadata['gm-will-bar']).toBe(true);
            expect(metadata['gm-def-badge']).toBe(true);
        });
    });

    describe('generatorBuildLogic helpers', () => {
        const dummyState = {
            stats: {
                [CombatStat.STR]: { base: 2, limit: 5 },
                [CombatStat.DEX]: { base: 2, limit: 5 },
                [CombatStat.VIT]: { base: 2, limit: 5 },
                [CombatStat.SPE]: { base: 2, limit: 5 },
                [CombatStat.INS]: { base: 1, limit: 5 }
            },
            socials: {},
            extraCategories: [],
            roomCustomPokemon: [],
            roomCustomMoves: []
        } as unknown as CharacterState;

        it('resolves base stats and limits from species record', () => {
            const pd = {
                Strength: 3,
                Dexterity: 4,
                Vitality: 2,
                Special: 1,
                Insight: 2
            };
            const { finalBaseStats, attributeLimits } = resolveBaseStatsAndLimits(pd, dummyState);
            expect(finalBaseStats).toEqual({ str: 3, dex: 4, vit: 2, spe: 1, ins: 2 });
            expect(attributeLimits.dex).toBe(5);
        });

        it('creates generator fake state with default socials and correct stat limits', () => {
            const baseStats = { str: 2, dex: 3, vit: 2, spe: 2, ins: 1 };
            const limits = { str: 5, dex: 5, vit: 5, spe: 5, ins: 5 };
            const fake = createGeneratorFakeState(dummyState, baseStats, limits);

            expect(fake.stats[CombatStat.DEX].base).toBe(3);
            expect(fake.socials.tou.base).toBe(1);
            expect(fake.socials.tou.rank).toBe(0);
        });

        it('resolves build identity attributes (nature, gender, loyalty)', () => {
            const config = {
                randomizeGender: true,
                randomizeNature: true,
                scaleLoyaltyHappiness: true,
                slotIndex: 0
            } as GeneratorConfig;

            const identity = resolveBuildIdentity(config, 'Standard');
            expect(['Male', 'Female']).toContain(identity.generatedGender);
            expect(typeof identity.generatedNature).toBe('string');
            expect(identity.generatedLoyalty).toBe(5);
            expect(identity.generatedHappiness).toBe(4);
        });

        it('resolves dual scaling moves to optimal attributes and skills', () => {
            const moves: TempMove[] = [
                {
                    id: 'm1',
                    name: 'Dual Strike',
                    attr: 'str',
                    skill: 'brawl',
                    type: 'Fight',
                    cat: 'Phys',
                    dmgStat: 'str',
                    power: 2,
                    desc: '',
                    rawAcc1: 'Strength / Dexterity',
                    rawAcc2: 'Brawl / Alert',
                    candidateAttrs: ['str', 'dex'],
                    candidateSkills: ['brawl', 'alert']
                }
            ];

            const genAttr = { str: 1, dex: 4, vit: 0, spe: 0, ins: 0 };
            const genSoc = { tou: 0, coo: 0, bea: 0, cut: 0, cle: 0 };
            const genSkills = { brawl: 1, alert: 3 };
            const finalBaseStats = { str: 2, dex: 2, vit: 2, spe: 2, ins: 1 };

            resolveDualScalingMoves(moves, genAttr, genSoc, genSkills, finalBaseStats, 1, {});

            expect(moves[0].attr).toBe('dex'); // dex total 6 > str total 3
            expect(moves[0].skill).toBe('alert'); // alert 3 > brawl 1
            expect(moves[0].dualScaleSelected).toBe(true);
        });
    });
});
