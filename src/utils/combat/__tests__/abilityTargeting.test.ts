import { describe, it, expect, beforeEach } from 'vitest';
import {
    getAbilityTargetStance,
    getAbilityMaxTargets,
    isTargetAffectedByAbility,
    isCombatantInPc,
    syncCombatantSentToMap,
    syncCombatantSentToPc
} from '../abilityTargetingUtils';
import { resolveChoiceTags } from '../../tagParser/parseCombatTags';
import { flattenStateToMetadata } from '../../sync/flattenStateToMetadata';
import { hydrateStateFromMetadata } from '../../sync/stateMapper';
import { calculateStatTotal, calculateDefTotal, calculateSDefTotal } from '../combatMath';
import { CombatStat } from '../../../types/enums';
import { createTestCharacterState } from '../../../test/testStateHelpers';

describe('Ability Targeting System', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('Stance Resolution, Limits & Choice Tags', () => {
        it('resolves stance for all unified abilities and tag overrides', () => {
            // Allies and self
            expect(getAbilityTargetStance('Flower Gift')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Steely Spirit')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Armor Tail')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Sweet Veil')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Pastel Veil')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Aroma Veil')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Flower Veil')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Victory Star')).toBe('allies-and-self');

            // Allies only
            expect(getAbilityTargetStance('Battery')).toBe('allies-only');
            expect(getAbilityTargetStance('Power Spot')).toBe('allies-only');
            expect(getAbilityTargetStance('Commander')).toBe('allies-only');
            expect(getAbilityTargetStance('Costar')).toBe('allies-only');
            expect(getAbilityTargetStance('Hospitality')).toBe('allies-only');

            // Foes
            expect(getAbilityTargetStance('Intimidate')).toBe('foes');
            expect(getAbilityTargetStance('Supersweet Syrup')).toBe('foes');
            expect(getAbilityTargetStance('Neutralizing Gas')).toBe('foes');
            expect(getAbilityTargetStance('Frisk')).toBe('foes');
            expect(getAbilityTargetStance('Analytic')).toBe('foes');
            expect(getAbilityTargetStance('Unaware')).toBe('foes');
            expect(getAbilityTargetStance('Stakeout')).toBe('foes');

            // Ruin
            expect(getAbilityTargetStance('Tablets of Ruin')).toBe('all-except-self');
            expect(getAbilityTargetStance('Sword of Ruin')).toBe('all-except-self');
            expect(getAbilityTargetStance('Vessel of Ruin')).toBe('all-except-self');
            expect(getAbilityTargetStance('Beads of Ruin')).toBe('all-except-self');

            // Aura
            expect(getAbilityTargetStance('Dark Aura')).toBe('all-on-field');
            expect(getAbilityTargetStance('Fairy Aura')).toBe('all-on-field');
            expect(getAbilityTargetStance('Aura Break')).toBe('all-on-field');

            // Tag overrides
            expect(getAbilityTargetStance('Custom', '[Target: All Foes]')).toBe('foes');
            expect(getAbilityTargetStance('Custom', '[Target: Single Ally]')).toBe('allies-only');
            expect(getAbilityTargetStance('Custom', '[Target: Allies & Self]')).toBe('allies-and-self');
            expect(getAbilityTargetStance('Custom', '[Target: All on Field]')).toBe('all-on-field');
            expect(getAbilityTargetStance('Custom', '[Target: All Except Self]')).toBe('all-except-self');
            expect(getAbilityTargetStance('Blaze')).toBe('none');

            // Max targets
            expect(getAbilityMaxTargets('Commander')).toBe(1);
            expect(getAbilityMaxTargets('Analytic')).toBe(1);
            expect(getAbilityMaxTargets('Costar')).toBe(1);
            expect(getAbilityMaxTargets('Custom', '[Target: Single Foe]')).toBe(1);
            expect(getAbilityMaxTargets('Flower Gift', undefined, 'Standard')).toBe(3);
        });

        it('resolves choice tags by index', () => {
            expect(
                resolveChoiceTags('[Choice: Str +1 (Same Gender) | Str -1 (Opposite Gender)]', 0)
            ).toBe('[Str +1]');
            expect(
                resolveChoiceTags('[Choice: Str +1 (Same Gender) | Str -1 (Opposite Gender)]', 1)
            ).toBe('[Str -1]');
            expect(
                resolveChoiceTags('[Choice: Str +1 (Lower Def) | Spe +1 (Lower SpD)]', 0)
            ).toBe('[Str +1]');
            expect(
                resolveChoiceTags('[Choice: Str +1 (Lower Def) | Spe +1 (Lower SpD)]', 1)
            ).toBe('[Spe +1]');
            expect(
                resolveChoiceTags('[Choice: 1 Neutral Dmg | 2 Typeless Dmg]', 0)
            ).toBe('[1 Neutral Dmg]');
            expect(
                resolveChoiceTags('[Choice: 1 Neutral Dmg | 2 Typeless Dmg]', 1)
            ).toBe('[2 Typeless Dmg]');
        });

        it('serializes and hydrates ability-target-ids', () => {
            const testState = createTestCharacterState();
            testState.identity.ability = 'Intimidate';
            testState.identity.abilityTargetIds = ['foe-1', 'foe-2'];

            const flat = flattenStateToMetadata(testState);
            expect(flat['ability-target-ids']).toBe('foe-1,foe-2');

            const hydrated = hydrateStateFromMetadata(flat, createTestCharacterState());
            expect(hydrated.identity?.abilityTargetIds).toEqual(['foe-1', 'foe-2']);

            testState.identity.abilityTargetIds = [];
            const flatEmpty = flattenStateToMetadata(testState);
            expect(flatEmpty['ability-target-ids']).toBe('');

            const unconfiguredMeta: Record<string, unknown> = {
                species: 'Koffing',
                ability: 'Neutralizing Gas'
            };
            const hydUnconfigured = hydrateStateFromMetadata(unconfiguredMeta, createTestCharacterState());
            expect(hydUnconfigured.identity?.abilityTargetIds).toBeUndefined();

            const emptyConfigMeta: Record<string, unknown> = {
                species: 'Koffing',
                ability: 'Neutralizing Gas',
                'ability-target-ids': ''
            };
            const hydEmpty = hydrateStateFromMetadata(emptyConfigMeta, createTestCharacterState());
            expect(hydEmpty.identity?.abilityTargetIds).toEqual([]);

            const targetedMeta: Record<string, unknown> = {
                species: 'Koffing',
                ability: 'Neutralizing Gas',
                'ability-target-ids': 'combatant-1, combatant-2'
            };
            const hydTargeted = hydrateStateFromMetadata(targetedMeta, createTestCharacterState());
            expect(hydTargeted.identity?.abilityTargetIds).toEqual(['combatant-1', 'combatant-2']);
        });

        it('handles isTargetAffectedByAbility with undefined vs empty arrays', () => {
            const battleState = {
                rounds: [
                    {
                        roundNumber: 1,
                        combatants: [
                            {
                                id: 'source-koffing',
                                tokenId: 'token-koffing',
                                name: 'Koffing',
                                ability: 'Neutralizing Gas',
                                abilityActive: true,
                                isPlayerSide: false,
                                isNPC: true,
                                rank: 'Starter',
                                abilityTargetIds: undefined as string[] | undefined
                            },
                            {
                                id: 'foe-1',
                                tokenId: 'token-foe-1',
                                name: 'Pikachu',
                                isPlayerSide: true,
                                isNPC: false
                            }
                        ]
                    }
                ],
                activeRoundIndex: 0
            };
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(battleState));

            expect(isTargetAffectedByAbility('foe-1', 'player', 'Neutralizing Gas', null)).toBe(false);

            battleState.rounds[0].combatants[0].abilityTargetIds = [];
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(battleState));
            expect(isTargetAffectedByAbility('foe-1', 'player', 'Neutralizing Gas', null)).toBe(false);

            battleState.rounds[0].combatants[0].abilityTargetIds = ['foe-other'];
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(battleState));
            expect(isTargetAffectedByAbility('foe-1', 'player', 'Neutralizing Gas', null)).toBe(false);

            battleState.rounds[0].combatants[0].abilityTargetIds = ['foe-1'];
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(battleState));
            expect(isTargetAffectedByAbility('foe-1', 'player', 'Neutralizing Gas', null)).toBe(true);
        });

        it('Neutralizing Gas suppresses targeted individual without blocking unaffected ally auras', () => {
            const multiCombatState = {
                rounds: [
                    {
                        roundNumber: 1,
                        combatants: [
                            {
                                id: 'koffing-1',
                                tokenId: 'token-koffing',
                                name: 'Koffing',
                                ability: 'Neutralizing Gas',
                                abilityActive: true,
                                isPlayerSide: false,
                                isNPC: true,
                                rank: 'Starter',
                                abilityTargetIds: ['growlithe-1']
                            },
                            {
                                id: 'growlithe-1',
                                tokenId: 'token-growlithe',
                                name: 'Growlithe',
                                ability: 'Intimidate',
                                abilityActive: true,
                                isPlayerSide: true,
                                isNPC: false,
                                rank: 'Starter',
                                abilityTargetIds: ['koffing-1']
                            },
                            {
                                id: 'milcery-1',
                                tokenId: 'token-milcery',
                                name: 'Milcery',
                                ability: 'Sweet Veil',
                                abilityActive: true,
                                isPlayerSide: true,
                                isNPC: false,
                                rank: 'Starter',
                                abilityTargetIds: ['growlithe-1', 'milcery-1']
                            }
                        ]
                    }
                ],
                activeRoundIndex: 0
            };
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(multiCombatState));

            expect(isTargetAffectedByAbility('growlithe-1', 'player', 'Neutralizing Gas', null)).toBe(true);
            expect(isTargetAffectedByAbility('milcery-1', 'player', 'Neutralizing Gas', null)).toBe(false);
            expect(isTargetAffectedByAbility('growlithe-1', 'player', 'Sweet Veil', null)).toBe(true);
            expect(isTargetAffectedByAbility('koffing-1', 'foe', 'Intimidate', null)).toBe(false);
        });

        it('Neutralizing Gas self-immunity: opposing Weezings do not suppress each other', () => {
            const dualWeezingState = {
                rounds: [
                    {
                        roundNumber: 1,
                        combatants: [
                            {
                                id: 'player-weezing',
                                tokenId: 'token-player-weezing',
                                name: 'Galarian Weezing',
                                ability: 'Neutralizing Gas',
                                abilityActive: true,
                                isPlayerSide: true,
                                isNPC: false,
                                rank: 'Ace',
                                abilityTargetIds: ['foe-weezing', 'foe-pikachu']
                            },
                            {
                                id: 'foe-weezing',
                                tokenId: 'token-foe-weezing',
                                name: 'Kanto Weezing',
                                ability: 'Neutralizing Gas',
                                abilityActive: true,
                                isPlayerSide: false,
                                isNPC: true,
                                rank: 'Ace',
                                abilityTargetIds: ['player-weezing', 'player-eevee']
                            },
                            {
                                id: 'foe-pikachu',
                                tokenId: 'token-foe-pikachu',
                                name: 'Pikachu',
                                ability: 'Static',
                                abilityActive: true,
                                isPlayerSide: false,
                                isNPC: true,
                                rank: 'Starter',
                                abilityTargetIds: []
                            },
                            {
                                id: 'player-eevee',
                                tokenId: 'token-player-eevee',
                                name: 'Eevee',
                                ability: 'Run Away',
                                abilityActive: true,
                                isPlayerSide: true,
                                isNPC: false,
                                rank: 'Starter',
                                abilityTargetIds: []
                            }
                        ]
                    }
                ],
                activeRoundIndex: 0
            };
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(dualWeezingState));

            expect(isTargetAffectedByAbility('player-weezing', 'player', 'Neutralizing Gas', null)).toBe(false);
            expect(isTargetAffectedByAbility('foe-weezing', 'foe', 'Neutralizing Gas', null)).toBe(false);
            expect(isTargetAffectedByAbility('foe-pikachu', 'foe', 'Neutralizing Gas', null)).toBe(true);
            expect(isTargetAffectedByAbility('player-eevee', 'player', 'Neutralizing Gas', null)).toBe(true);
        });
    });

    describe('PC Storage & Map Synchronization', () => {
        const testPcData = {
            activeCampaignId: 'c1',
            campaigns: {
                c1: {
                    id: 'c1',
                    name: 'Campaign 1',
                    activeTrainerId: 't1',
                    trainers: {
                        t1: {
                            id: 't1',
                            name: 'Ash',
                            party: ['party-mon-1', 'party-mon-2', null, null, null, null],
                            boxes: [
                                {
                                    id: 'b1',
                                    name: 'Box 1',
                                    slots: ['box-mon-1', null]
                                }
                            ]
                        }
                    },
                    teamParty: ['team-mon-1', null],
                    boxes: [
                        {
                            id: 'cb1',
                            name: 'Campaign Box 1',
                            slots: ['box-mon-2', null]
                        }
                    ]
                }
            },
            pokemonSummaries: {
                'party-mon-1': {
                    entityId: 'party-mon-1',
                    name: 'Pikachu',
                    species: 'Pikachu',
                    isOnMap: true,
                    mapTokenId: 'tok-pika'
                },
                'party-mon-2': {
                    entityId: 'party-mon-2',
                    name: 'Bulbasaur',
                    species: 'Bulbasaur',
                    isOnMap: false
                },
                'team-mon-1': {
                    entityId: 'team-mon-1',
                    name: 'Charmander',
                    species: 'Charmander',
                    isOnMap: true
                },
                'box-mon-1': {
                    entityId: 'box-mon-1',
                    name: 'Gengar',
                    species: 'Gengar',
                    isOnMap: false,
                    savedTokenItem: undefined as any
                },
                'box-mon-2': {
                    entityId: 'box-mon-2',
                    name: 'Machamp',
                    species: 'Machamp',
                    isOnMap: true,
                    mapTokenId: 'tok-machamp'
                }
            },
            version: 1
        };

        it('accurately identifies whether a combatant is in PC storage', () => {
            // Boxed Pokémon on map
            expect(
                isCombatantInPc(
                    { id: 'c-machamp', entityId: 'box-mon-2', tokenId: 'tok-machamp', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(false);

            // Party Pokémon on map
            expect(
                isCombatantInPc(
                    { id: 'c-pika', entityId: 'party-mon-1', tokenId: 'tok-pika', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(false);

            // Team party Pokémon
            expect(
                isCombatantInPc(
                    { id: 'c-charmander', entityId: 'team-mon-1', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(false);

            // Party Pokémon recalled
            expect(
                isCombatantInPc(
                    { id: 'c-bulba', entityId: 'party-mon-2', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(true);

            // Boxed Pokémon not on map
            expect(
                isCombatantInPc(
                    { id: 'c-gengar', entityId: 'box-mon-1', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(true);

            // Wild Pokémon collisions
            expect(
                isCombatantInPc(
                    { id: 'c-wild-gengar', entityId: 'wild-gengar-id', name: 'Gengar', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(false);
            expect(
                isCombatantInPc(
                    { id: 'c-wild-pika', tokenId: 'wild-tok-pika', name: 'Pikachu', initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(false);

            // Stale isInPc flag
            expect(
                isCombatantInPc(
                    { id: 'c-machamp-stale', entityId: 'box-mon-2', tokenId: 'tok-machamp', isInPc: true, initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(false);

            // Preserved orphan
            expect(
                isCombatantInPc(
                    { id: 'c-orphan-pc', isInPc: true, initiative: '10' } as any,
                    testPcData as any
                )
            ).toBe(true);
        });

        it('syncCombatantSentToMap restores combatants across identifiers', async () => {
            const initialBoState = {
                rounds: [
                    {
                        roundNumber: 1,
                        combatants: [
                            {
                                id: 'c-map-1',
                                entityId: 'box-mon-1',
                                isInPc: true,
                                name: 'Gengar'
                            },
                            {
                                id: 'c-map-2',
                                tokenId: 'saved-tok-99',
                                isInPc: true,
                                name: 'Gengar'
                            }
                        ]
                    }
                ],
                activeRoundIndex: 0
            };
            testPcData.pokemonSummaries['box-mon-1'].savedTokenItem = { id: 'saved-tok-99' };
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(initialBoState));

            await syncCombatantSentToMap('box-mon-1', testPcData as any);

            const updatedBo = JSON.parse(localStorage.getItem('pkr_battle_organizer_data') || '{}');
            expect(updatedBo.rounds[0].combatants[0].isInPc).toBe(false);
            expect(updatedBo.rounds[0].combatants[1].isInPc).toBe(false);
        });

        it('syncCombatantSentToPc prunes targets and does not resurrect on send to map', async () => {
            const depositPcData = {
                activeCampaignId: 'c1',
                campaigns: {
                    c1: {
                        id: 'c1',
                        name: 'Campaign 1',
                        trainers: {},
                        boxes: [
                            {
                                id: 'b1',
                                slots: ['mon-pc-deposit']
                            }
                        ]
                    }
                },
                pokemonSummaries: {
                    'mon-pc-deposit': {
                        entityId: 'mon-pc-deposit',
                        name: 'Vulpix',
                        species: 'Vulpix',
                        isOnMap: false,
                        mapTokenId: 'tok-vulpix'
                    }
                },
                version: 1
            };

            const initialBo = {
                rounds: [
                    {
                        roundNumber: 1,
                        combatants: [
                            {
                                id: 'c-ninetales',
                                name: 'Ninetales',
                                tokenId: 'tok-ninetales',
                                ability: 'Drought',
                                abilityActive: true,
                                abilityTargetIds: ['mon-pc-deposit', 'c-other']
                            },
                            {
                                id: 'c-vulpix',
                                name: 'Vulpix',
                                entityId: 'mon-pc-deposit',
                                tokenId: 'tok-vulpix',
                                isInPc: false,
                                abilityActive: true,
                                abilityBoostActive: true,
                                abilityTargetIds: ['c-ninetales']
                            },
                            {
                                id: 'c-other',
                                name: 'Oddish',
                                tokenId: 'tok-oddish',
                                isInPc: false,
                                abilityTargetIds: ['tok-vulpix']
                            }
                        ]
                    }
                ],
                activeRoundIndex: 0
            };
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(initialBo));

            await syncCombatantSentToPc('mon-pc-deposit', depositPcData as any);

            const boAfterDeposit = JSON.parse(localStorage.getItem('pkr_battle_organizer_data') || '{}');
            const round1 = boAfterDeposit.rounds[0];
            const ninetales = round1.combatants.find((c: any) => c.id === 'c-ninetales');
            const vulpix = round1.combatants.find((c: any) => c.id === 'c-vulpix');
            const other = round1.combatants.find((c: any) => c.id === 'c-other');

            expect(ninetales.abilityTargetIds).toEqual(['c-other']);
            expect(other.abilityTargetIds).toEqual([]);
            expect(vulpix).toBeDefined();
            expect(vulpix.isInPc).toBe(true);
            expect(vulpix.abilityActive).toBe(false);
            expect(vulpix.abilityBoostActive).toBe(false);
            expect(vulpix.abilityTargetIds).toEqual([]);

            // Send back to map: targeting is NOT resurrected
            depositPcData.pokemonSummaries['mon-pc-deposit'].isOnMap = true;
            await syncCombatantSentToMap('mon-pc-deposit', depositPcData as any);

            const boAfterMap = JSON.parse(localStorage.getItem('pkr_battle_organizer_data') || '{}');
            const round1AfterMap = boAfterMap.rounds[0];
            const ninetalesAfterMap = round1AfterMap.combatants.find((c: any) => c.id === 'c-ninetales');
            const vulpixAfterMap = round1AfterMap.combatants.find((c: any) => c.id === 'c-vulpix');
            const otherAfterMap = round1AfterMap.combatants.find((c: any) => c.id === 'c-other');

            expect(vulpixAfterMap.isInPc).toBe(false);
            expect(ninetalesAfterMap.abilityTargetIds).toEqual(['c-other']);
            expect(otherAfterMap.abilityTargetIds).toEqual([]);
        });
    });

    describe('Commander Dondozo & Ruin Mutual Immunity', () => {
        it('calculates Commander Dondozo stat boosts and Ruin mutual immunity', () => {
            const boData = {
                battlefield: {
                    playerSide: { forceFields: [], extraForceFields: [] },
                    foeSide: { forceFields: [], extraForceFields: [] }
                },
                rounds: [
                    {
                        id: 'r1',
                        roundNumber: 1,
                        combatants: [
                            {
                                id: 'tatsugiri-1',
                                name: 'Tatsugiri',
                                ability: 'Commander',
                                abilityActive: true,
                                abilityTargetIds: ['dondozo-1'],
                                isPlayerSide: true,
                                isNPC: false
                            },
                            {
                                id: 'dondozo-1',
                                name: 'Dondozo',
                                species: 'Dondozo',
                                ability: 'Unaware',
                                abilityActive: true,
                                isPlayerSide: true,
                                isNPC: false
                            },
                            {
                                id: 'wo-chien-1',
                                name: 'Wo-Chien',
                                ability: 'Tablets of Ruin',
                                abilityActive: true,
                                abilityTargetIds: ['dondozo-1', 'chien-pao-1'],
                                isPlayerSide: false,
                                isNPC: true
                            },
                            {
                                id: 'chien-pao-1',
                                name: 'Chien-Pao',
                                ability: 'Sword of Ruin',
                                abilityActive: true,
                                isPlayerSide: false,
                                isNPC: true
                            }
                        ]
                    }
                ],
                activeRoundIndex: 0
            };
            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(boData));

            expect(isTargetAffectedByAbility('dondozo-1', 'player', 'commander')).toBe(true);
            expect(isTargetAffectedByAbility('chien-pao-1', 'foe', 'tablets of ruin')).toBe(false);
            expect(isTargetAffectedByAbility('dondozo-1', 'player', 'tablets of ruin')).toBe(true);

            const dondozoState = createTestCharacterState({
                identity: {
                    entityId: 'dondozo-1',
                    species: 'Dondozo',
                    nickname: 'Dondozo',
                    isNPC: false,
                    rank: 'Standard'
                },
                stats: {
                    str: { base: 4, rank: 0, buff: 0, debuff: 0 },
                    dex: { base: 2, rank: 0, buff: 0, debuff: 0 },
                    vit: { base: 5, rank: 0, buff: 0, debuff: 0 },
                    spe: { base: 3, rank: 0, buff: 0, debuff: 0 },
                    ins: { base: 3, rank: 0, buff: 0, debuff: 0 }
                }
            });

            const dummyInvMods = {
                stats: {},
                skills: {},
                def: 0,
                spd: 0,
                hp: 0,
                will: 0,
                init: 0,
                dmg: 0,
                acc: 0,
                accSucc: 0,
                dmgSucc: 0,
                chance: 0,
                seDmg: 0,
                critDmg: 0,
                firstHitDmg: 0,
                firstHitAcc: 0,
                gainTempHp: 0,
                tempHpOnHit: 0,
                tempHpDmgRatio: '',
                highCritStacks: 0,
                stackingHighCritStacks: 0,
                ignoreLowAcc: 0,
                addLowAcc: 0,
                ignorePain: false,
                roundHeal: 0,
                roundDamage: 0,
                roundWillRestore: 0,
                roundWillDamage: 0,
                loseAction: 0,
                noReactions: false,
                extraReactions: 0,
                accFaceAddsDmg: 0,
                accFaceAddsDmgLimit: 0,
                itemNames: [],
                accItemNames: [],
                dmgItemNames: [],
                accSuccItemNames: [],
                dmgSuccItemNames: [],
                passiveNames: [],
                accPassiveNames: [],
                dmgPassiveNames: [],
                accSuccPassiveNames: [],
                dmgSuccPassiveNames: [],
                abilityNames: [],
                accAbilityNames: [],
                dmgAbilityNames: [],
                accSuccAbilityNames: [],
                dmgSuccAbilityNames: [],
                defAbilityNames: [],
                spdAbilityNames: [],
                highCritItemNames: [],
                highCritPassiveNames: [],
                highCritAbilityNames: []
            };

            // Str: 4 + 2 (Commander) - 2 (Tablets of Ruin) = 4
            expect(calculateStatTotal(CombatStat.STR, dondozoState, dummyInvMods)).toBe(4);
            // Dex: 2 + 2 (Commander) = 4
            expect(calculateStatTotal(CombatStat.DEX, dondozoState, dummyInvMods)).toBe(4);
            // Spe: 3 + 2 (Commander) = 5
            expect(calculateStatTotal(CombatStat.SPE, dondozoState, dummyInvMods)).toBe(5);
            // Vit: 5 + 0 = 5 (Commander does not touch Vitality)
            expect(calculateStatTotal(CombatStat.VIT, dondozoState, dummyInvMods)).toBe(5);
            // Ins: 3 + 0 = 3 (Commander does not touch Insight)
            expect(calculateStatTotal(CombatStat.INS, dondozoState, dummyInvMods)).toBe(3);

            // Def: vit (5) + commander (2) = 7
            expect(calculateDefTotal(dondozoState, dummyInvMods)).toBe(7);
            // SpD: ins (3) + commander (2) = 5
            expect(calculateSDefTotal(dondozoState, dummyInvMods)).toBe(5);
        });
    });
});

