import { describe, it, expect, beforeEach } from 'vitest';
import { findRoundEndTriggers } from '../roundEndTriggerUtils';
import type { CharacterState, CharacterIdentity } from '../../../../store/storeTypes';
import type { BattlefieldData } from '../../../../types/battleOrganizerTypes';

function createMockCharacterState(
    overrides: Partial<CharacterState> = {},
    identityOverrides: Partial<CharacterIdentity> = {}
): CharacterState {
    const baseIdentity = {
        nickname: 'Pikachu',
        species: 'Pikachu',
        type1: 'Electric',
        type2: '',
        ability: 'Static',
        abilityActive: true,
        abilityTags: '',
        isNPC: false,
        ...identityOverrides
    } as unknown as CharacterIdentity;

    return {
        identity: baseIdentity,
        health: {
            hpCurr: 10,
            hpMax: 10,
            hpBase: 10,
            temporaryHitPoints: 0,
            temporaryHitPointsMax: 0
        },
        will: {
            willCurr: 5,
            willMax: 5,
            willBase: 5,
            temporaryWill: 0,
            temporaryWillMax: 0
        },
        statuses: [],
        passives: [],
        inventory: [],
        trackers: {},
        ...overrides
    } as unknown as CharacterState;
}

function createMockBattlefield(overrides: Partial<BattlefieldData> = {}): BattlefieldData {
    return {
        location: '',
        weather: { name: '', remainingRounds: 0 },
        terrain: { name: '', remainingRounds: 0 },
        other: { name: '', remainingRounds: 0 },
        playerSide: {
            forceFields: [
                { name: '', remainingRounds: 0 },
                { name: '', remainingRounds: 0 }
            ],
            entryHazard: '',
            cover: '',
            other: ''
        },
        foeSide: {
            forceFields: [
                { name: '', remainingRounds: 0 },
                { name: '', remainingRounds: 0 }
            ],
            entryHazard: '',
            cover: '',
            other: ''
        },
        playerTargets: '',
        foeTargets: '',
        highlightedSide: 'all',
        ...overrides
    };
}

describe('findRoundEndTriggers', () => {
    beforeEach(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.clear();
        }
    });
    it('detects Burn (1st, 2nd, 3rd degree) and creates a checked 1 Damage trigger', () => {
        const state = createMockCharacterState({
            statuses: [{ id: 'b1', name: '1st Degree Burn', customName: '', rounds: 0 }]
        });

        const triggers = findRoundEndTriggers(state);
        const burnTrigger = triggers.find((t) => t.source === 'Burn');
        expect(burnTrigger).toBeDefined();
        expect(burnTrigger?.type).toBe('damageHp');
        expect(burnTrigger?.amount).toBe(1);
        expect(burnTrigger?.promptText).toBe('Burn: Suffer 1 Damage?');
        expect(burnTrigger?.checked).toBe(true);
    });

    it('detects Poison and creates a checked 1 Damage trigger', () => {
        const state = createMockCharacterState({
            statuses: [{ id: 'p1', name: 'Poison', customName: '', rounds: 0 }]
        });

        const triggers = findRoundEndTriggers(state);
        const poisonTrigger = triggers.find((t) => t.source === 'Poison');
        expect(poisonTrigger).toBeDefined();
        expect(poisonTrigger?.type).toBe('damageHp');
        expect(poisonTrigger?.amount).toBe(1);
        expect(poisonTrigger?.promptText).toBe('Poison: Suffer 1 Damage?');
        expect(poisonTrigger?.checked).toBe(true);
    });

    it('detects Badly Poisoned and scales damage with rounds (min 1)', () => {
        const stateRounds3 = createMockCharacterState({
            statuses: [{ id: 'bp1', name: 'Badly Poisoned', customName: '', rounds: 3 }]
        });
        const triggers3 = findRoundEndTriggers(stateRounds3);
        const bpTrigger3 = triggers3.find((t) => t.source === 'Badly Poisoned');
        expect(bpTrigger3).toBeDefined();
        expect(bpTrigger3?.amount).toBe(3);
        expect(bpTrigger3?.promptText).toBe('Badly Poisoned: Suffer 3 Damage?');
        expect(bpTrigger3?.checked).toBe(true);

        const stateRounds0 = createMockCharacterState({
            statuses: [{ id: 'bp2', name: 'Badly Poisoned', customName: '', rounds: 0 }]
        });
        const triggers0 = findRoundEndTriggers(stateRounds0);
        const bpTrigger0 = triggers0.find((t) => t.source === 'Badly Poisoned');
        expect(bpTrigger0?.amount).toBe(1);
        expect(bpTrigger0?.promptText).toBe('Badly Poisoned: Suffer 1 Damage?');
    });

    it('detects Sandstorm damage when character is not immune', () => {
        const battlefield = createMockBattlefield({
            weather: { name: 'Sandstorm', remainingRounds: 3 }
        });
        const state = createMockCharacterState(
            { activeBattlefield: battlefield },
            {
                nickname: 'Pikachu',
                species: 'Pikachu',
                type1: 'Electric',
                type2: '',
                ability: 'Static',
                abilityActive: true
            }
        );

        const triggers = findRoundEndTriggers(state);
        const sandTrigger = triggers.find((t) => t.source === 'Sandstorm');
        expect(sandTrigger).toBeDefined();
        expect(sandTrigger?.amount).toBe(1);
        expect(sandTrigger?.promptText).toBe('Sandstorm: Suffer 1 Damage?');
        expect(sandTrigger?.checked).toBe(true);
    });

    it('does not trigger Sandstorm damage when character is immune by typing (Rock, Ground, Steel)', () => {
        const battlefield = createMockBattlefield({
            weather: { name: 'Sandstorm', remainingRounds: 3 }
        });
        const state = createMockCharacterState(
            { activeBattlefield: battlefield },
            {
                nickname: 'Steelix',
                species: 'Steelix',
                type1: 'Steel',
                type2: 'Ground',
                ability: 'Sturdy',
                abilityActive: true
            }
        );

        const triggers = findRoundEndTriggers(state);
        const sandTrigger = triggers.find((t) => t.source === 'Sandstorm');
        expect(sandTrigger).toBeUndefined();
    });

    it('detects Hail damage when character is not immune and ignores when Ice type', () => {
        const battlefield = createMockBattlefield({
            weather: { name: 'Hail', remainingRounds: 2 }
        });
        const stateVulnerable = createMockCharacterState(
            { activeBattlefield: battlefield },
            {
                nickname: 'Pikachu',
                species: 'Pikachu',
                type1: 'Electric',
                type2: '',
                ability: 'Static',
                abilityActive: true
            }
        );
        expect(findRoundEndTriggers(stateVulnerable).find((t) => t.source === 'Hail')).toBeDefined();

        const stateImmune = createMockCharacterState(
            { activeBattlefield: battlefield },
            {
                nickname: 'Glaceon',
                species: 'Glaceon',
                type1: 'Ice',
                type2: '',
                ability: 'Snow Cloak',
                abilityActive: true
            }
        );
        expect(findRoundEndTriggers(stateImmune).find((t) => t.source === 'Hail')).toBeUndefined();
    });

    it('detects Leftovers in inventory with default base charges (3/3) and binds itemId', () => {
        const state = createMockCharacterState({
            inventory: [
                {
                    id: 'item-leftovers-1',
                    name: 'Leftovers',
                    active: true,
                    qty: 1
                } as any
            ]
        });

        const triggers = findRoundEndTriggers(state);
        const leftoversTrigger = triggers.find((t) => t.itemId === 'item-leftovers-1');
        expect(leftoversTrigger).toBeDefined();
        expect(leftoversTrigger?.type).toBe('healHp');
        expect(leftoversTrigger?.amount).toBe(1);
        expect(leftoversTrigger?.promptText).toBe('Leftovers (3/3 Charges): Restore 1 HP?');
        expect(leftoversTrigger?.checked).toBe(true);
        expect(leftoversTrigger?.itemId).toBe('item-leftovers-1');
    });

    it('does not trigger Leftovers when charges are depleted (0 remaining)', () => {
        const state = createMockCharacterState({
            inventory: [
                {
                    id: 'item-leftovers-depleted',
                    name: 'Leftovers',
                    charges: 0,
                    maxCharges: 3,
                    active: true,
                    qty: 1
                } as any
            ]
        });

        const triggers = findRoundEndTriggers(state);
        const leftoversTrigger = triggers.find((t) => t.itemId === 'item-leftovers-depleted');
        expect(leftoversTrigger).toBeUndefined();
    });

    it('displays custom remaining charges on Leftovers in promptText', () => {
        const state = createMockCharacterState({
            inventory: [
                {
                    id: 'item-leftovers-custom',
                    name: 'Leftovers',
                    charges: 2,
                    maxCharges: 3,
                    active: true,
                    qty: 1
                } as any
            ]
        });

        const triggers = findRoundEndTriggers(state);
        const leftoversTrigger = triggers.find((t) => t.itemId === 'item-leftovers-custom');
        expect(leftoversTrigger).toBeDefined();
        expect(leftoversTrigger?.promptText).toBe('Leftovers (2/3 Charges): Restore 1 HP?');
    });

    it('detects Leftovers specified on identity.heldItem when not in inventory', () => {
        const state = createMockCharacterState(
            { inventory: [] },
            { heldItem: 'Leftovers' }
        );

        const triggers = findRoundEndTriggers(state);
        const leftoversTrigger = triggers.find((t) => t.source.toLowerCase() === 'leftovers');
        expect(leftoversTrigger).toBeDefined();
        expect(leftoversTrigger?.type).toBe('healHp');
        expect(leftoversTrigger?.amount).toBe(1);
        expect(leftoversTrigger?.promptText).toBe('Leftovers: Restore 1 HP?');
        expect(leftoversTrigger?.checked).toBe(true);
        expect(leftoversTrigger?.itemId).toBeUndefined();
    });

    it('triggers item in inventory even if active is false if it matches identity.heldItem', () => {
        const state = createMockCharacterState(
            {
                inventory: [
                    {
                        id: 'item-held-inactive',
                        name: 'Leftovers',
                        active: false,
                        qty: 1
                    } as any
                ]
            },
            { heldItem: 'Leftovers' }
        );

        const triggers = findRoundEndTriggers(state);
        const leftoversTrigger = triggers.find((t) => t.itemId === 'item-held-inactive');
        expect(leftoversTrigger).toBeDefined();
        expect(leftoversTrigger?.promptText).toBe('Leftovers (3/3 Charges): Restore 1 HP?');
    });

    it('does not trigger inactive inventory item if it is not the held item', () => {
        const state = createMockCharacterState(
            {
                inventory: [
                    {
                        id: 'item-inactive',
                        name: 'Leftovers',
                        active: false,
                        qty: 1
                    } as any
                ]
            },
            { heldItem: '' }
        );

        const triggers = findRoundEndTriggers(state);
        const leftoversTrigger = triggers.find((t) => t.itemId === 'item-inactive');
        expect(leftoversTrigger).toBeUndefined();
    });

    describe('Side-Based Battlefield & Gravity Hardening', () => {
        it('applies Grassy Terrain heal when Grassy Terrain is active on playerSide for a player character', () => {
            const battlefield = createMockBattlefield({
                playerSide: {
                    forceFields: [
                        { name: 'Grassy Terrain', remainingRounds: 4 },
                        { name: '', remainingRounds: 0 }
                    ],
                    entryHazard: '',
                    cover: '',
                    other: ''
                }
            });
            const state = createMockCharacterState(
                { activeBattlefield: battlefield },
                { isNPC: false, type1: 'Normal' }
            );

            const triggers = findRoundEndTriggers(state);
            const grassyTrigger = triggers.find((t) => t.source === 'Grassy Terrain');
            expect(grassyTrigger).toBeDefined();
            expect(grassyTrigger?.amount).toBe(1);
            expect(grassyTrigger?.type).toBe('healHp');
        });

        it('does NOT apply Grassy Terrain heal when Grassy Terrain is only on foeSide for a player character', () => {
            const battlefield = createMockBattlefield({
                foeSide: {
                    forceFields: [
                        { name: 'Grassy Terrain', remainingRounds: 4 },
                        { name: '', remainingRounds: 0 }
                    ],
                    entryHazard: '',
                    cover: '',
                    other: ''
                }
            });
            const state = createMockCharacterState(
                { activeBattlefield: battlefield },
                { isNPC: false, type1: 'Normal' }
            );

            const triggers = findRoundEndTriggers(state);
            const grassyTrigger = triggers.find((t) => t.source === 'Grassy Terrain');
            expect(grassyTrigger).toBeUndefined();
        });

        it('excludes Flying-type airborne Pokémon from Grassy Terrain heal when Gravity is inactive', () => {
            const battlefield = createMockBattlefield({
                playerSide: {
                    forceFields: [
                        { name: 'Grassy Terrain', remainingRounds: 4 },
                        { name: '', remainingRounds: 0 }
                    ],
                    entryHazard: '',
                    cover: '',
                    other: ''
                }
            });
            const state = createMockCharacterState(
                { activeBattlefield: battlefield },
                { isNPC: false, type1: 'Flying' }
            );

            const triggers = findRoundEndTriggers(state);
            const grassyTrigger = triggers.find((t) => t.source === 'Grassy Terrain');
            expect(grassyTrigger).toBeUndefined();
        });

        it('allows Flying-type Pokémon to receive Grassy Terrain heal when Gravity is active', () => {
            const battlefield = createMockBattlefield({
                other: { name: 'Gravity', remainingRounds: 3 },
                playerSide: {
                    forceFields: [
                        { name: 'Grassy Terrain', remainingRounds: 4 },
                        { name: '', remainingRounds: 0 }
                    ],
                    entryHazard: '',
                    cover: '',
                    other: ''
                }
            });
            const state = createMockCharacterState(
                { activeBattlefield: battlefield },
                { isNPC: false, type1: 'Flying' }
            );

            const triggers = findRoundEndTriggers(state);
            const grassyTrigger = triggers.find((t) => t.source === 'Grassy Terrain');
            expect(grassyTrigger).toBeDefined();
            expect(grassyTrigger?.amount).toBe(1);
        });

        it('skips battlefield side triggers and weather damage for non-combatant sheets', () => {
            // Set battle organizer in localStorage with combatants not including our Pikachu
            localStorage.setItem(
                'pkr_battle_organizer_data',
                JSON.stringify({
                    activeRoundIndex: 0,
                    rounds: [{ combatants: [{ name: 'Charizard', isPlayerSide: true }] }]
                })
            );

            const battlefield = createMockBattlefield({
                weather: { name: 'Sandstorm', remainingRounds: 3 },
                playerSide: {
                    forceFields: [
                        { name: 'Grassy Terrain', remainingRounds: 4 },
                        { name: '', remainingRounds: 0 }
                    ],
                    entryHazard: '',
                    cover: '',
                    other: ''
                }
            });

            // Pikachu is not Charizard -> side resolves to 'none'
            const state = createMockCharacterState(
                { activeBattlefield: battlefield },
                { nickname: 'Pikachu', species: 'Pikachu', isNPC: false }
            );

            const triggers = findRoundEndTriggers(state);
            expect(triggers.find((t) => t.source === 'Grassy Terrain')).toBeUndefined();
            expect(triggers.find((t) => t.source === 'Sandstorm')).toBeUndefined();
        });

        it('respects side isolation on custom battlefield effects', () => {
            const battlefield = createMockBattlefield();
            const customEffects = [
                {
                    id: 'eff-1',
                    name: 'Ally Ward',
                    tags: '[Heal 1 HP Round End]',
                    side: 'player' as const
                }
            ];

            // Foe character should NOT trigger Ally Ward
            const foeState = createMockCharacterState(
                {
                    activeBattlefield: {
                        ...battlefield,
                        playerSide: {
                            ...battlefield.playerSide,
                            forceFields: [
                                { name: 'Ally Ward', remainingRounds: 3 },
                                { name: '', remainingRounds: 0 }
                            ]
                        }
                    },
                    roomCustomFieldEffects: customEffects as any
                },
                { isNPC: true }
            );

            const foeTriggers = findRoundEndTriggers(foeState);
            expect(foeTriggers.find((t) => t.source === 'Ally Ward')).toBeUndefined();

            // Player character DOES trigger Ally Ward
            const playerState = createMockCharacterState(
                {
                    activeBattlefield: {
                        ...battlefield,
                        playerSide: {
                            ...battlefield.playerSide,
                            forceFields: [
                                { name: 'Ally Ward', remainingRounds: 3 },
                                { name: '', remainingRounds: 0 }
                            ]
                        }
                    },
                    roomCustomFieldEffects: customEffects as any
                },
                { isNPC: false }
            );

            const playerTriggers = findRoundEndTriggers(playerState);
            expect(playerTriggers.find((t) => t.source === 'Ally Ward')).toBeDefined();
        });
    });
});
