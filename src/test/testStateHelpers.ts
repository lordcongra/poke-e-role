import type { CharacterState } from '../store/storeTypes';

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? DeepPartial<U>[]
        : T[P] extends readonly (infer U)[]
          ? readonly DeepPartial<U>[]
          : T[P] extends object
            ? DeepPartial<T[P]>
            : T[P];
};

/**
 * Helper to generate a minimal valid CharacterState for testing serialization.
 */
export function createTestCharacterState(overrides: DeepPartial<CharacterState> = {}): CharacterState {
    const defaultState = {
        notes: '',
        tp: 0,
        currency: 0,
        identity: {
            entityId: 'test-entity-1',
            nickname: 'Pikachu',
            species: 'Pikachu',
            nature: 'Brave',
            ability: 'Static',
            abilityActive: true,
            abilityBoostActive: false,
            abilityBoostLevel: 0,
            abilityChoiceIndex: 0,
            abilityTags: '',
            availableAbilities: ['Static', 'Lightning Rod'],
            previousNativeAbility: '',
            type1: 'Electric',
            type2: 'None',
            mode: 'pkm',
            rank: 'Amateur',
            age: '2',
            gender: 'Male',
            rolls: '',
            combat: '',
            social: '',
            hand: 'Right',
            isNPC: false,
            coreLocked: true,
            socialLocked: true,
            hpLocked: true,
            willLocked: true,
            tokenImageUrl: 'http://example.com/token.png',
            activeTransformation: 'None',
            activeFormId: '',
            formSaves: {},
            customFormConfig: null,
            customFormImages: {},
            badges: [],
            pokedex: {},
            terastallizeAffinity: '',
            terastallizeBonusActive: false,
            megaImageUrl: '',
            maxImageUrl: '',
            teraImageUrl: '',
            customFormFirstHitAccActive: false,
            customFormFirstHitDmgActive: false,
            dexId: '025',
            dexCategory: 'Mouse',
            height: '0.4m',
            weight: '6.0kg',
            dexDescription: 'Electric mouse',
            showTrackers: true,
            settingHpBar: true,
            gmHpBar: false,
            settingHpText: true,
            gmHpText: false,
            settingWillBar: true,
            gmWillBar: false,
            settingWillText: true,
            gmWillText: false,
            settingDefBadge: true,
            gmDefBadge: false,
            settingEcoBadge: true,
            gmEcoBadge: false,
            colorAct: '#4890fc',
            colorEva: '#c387fc',
            colorCla: '#dfad43',
            trackerScale: 100,
            trackerLayer: 'ATTACHMENT',
            xOffset: 0,
            yOffset: 0,
            hpOffsetX: 0,
            hpOffsetY: 0,
            willOffsetX: 0,
            willOffsetY: 0,
            defOffsetX: 0,
            defOffsetY: 0,
            actOffsetX: 0,
            actOffsetY: 0,
            evaOffsetX: 0,
            evaOffsetY: 0,
            claOffsetX: 0,
            claOffsetY: 0,
            themePrimaryOverride: '',
            themeSecondaryOverride: '',
            baseFormData: '',
            altFormData: '',
            maxFormData: '',
            pokemonBackup: '',
            trainerBackup: ''
        },
        health: {
            hpCurr: 10,
            hpMax: 10,
            hpBase: 4,
            temporaryHitPoints: 0,
            temporaryHitPointsMax: 0
        },
        will: {
            willCurr: 5,
            willMax: 5,
            willBase: 3,
            temporaryWill: 0,
            temporaryWillMax: 0
        },
        derived: {
            defBuff: 0,
            defDebuff: 0,
            sdefBuff: 0,
            sdefDebuff: 0,
            happy: 0,
            loyal: 0
        },
        extras: {
            core: 0,
            social: 0,
            skill: 0
        },
        trackers: {
            actions: 0,
            evade: false,
            clash: false,
            chances: 0,
            fate: 0,
            globalAcc: 0,
            globalDmg: 0,
            globalSucc: 0,
            globalChance: 0,
            ignoredPain: 0,
            firstHitAcc: false,
            firstHitDmg: false,
            bankedAccDice: {},
            boostLevels: {}
        },
        moves: [],
        wishlist: [],
        inventory: [],
        passives: [],
        skillChecks: [],
        extraCategories: [],
        statuses: [],
        effects: [],
        customInfo: [],
        stats: {
            str: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            dex: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
            vit: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            spe: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
            ins: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            strength: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            dexterity: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
            vitality: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            special: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
            insight: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 }
        },
        socials: {
            tou: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            coo: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            bea: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            cut: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            cle: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            tough: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            cool: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            beauty: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            cute: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            clever: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 }
        },
        skills: {
            brawl: { base: 0, buff: 0, customName: '' },
            evasion: { base: 1, buff: 0, customName: '' }
        }
    };

    return {
        ...defaultState,
        ...overrides,
        identity: { ...defaultState.identity, ...(overrides.identity || {}) },
        health: { ...defaultState.health, ...(overrides.health || {}) },
        will: { ...defaultState.will, ...(overrides.will || {}) },
        derived: { ...defaultState.derived, ...(overrides.derived || {}) },
        extras: { ...defaultState.extras, ...(overrides.extras || {}) },
        trackers: { ...defaultState.trackers, ...(overrides.trackers || {}) },
        skills: { ...defaultState.skills, ...(overrides.skills || {}) }
    } as unknown as CharacterState;
}

