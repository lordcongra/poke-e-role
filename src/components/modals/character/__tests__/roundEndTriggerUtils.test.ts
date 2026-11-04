import { describe, it, expect } from 'vitest';
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
});
