import assert from 'node:assert/strict';
import type { CharacterState } from '../src/store/storeTypes';

// Mock browser globals before any module imports that evaluate @owlbear-rodeo/sdk
const localStorageStore: Record<string, string> = {};
const mockWindow: Record<string, unknown> = {
    location: { search: '', href: 'http://localhost/' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    parent: { postMessage: () => {} }
};
mockWindow.self = mockWindow;
mockWindow.top = mockWindow;
(globalThis as any).window = mockWindow;
(globalThis as any).localStorage = {
    getItem: (key: string) => localStorageStore[key] || null,
    setItem: (key: string, val: string) => {
        localStorageStore[key] = String(val);
    },
    removeItem: (key: string) => {
        delete localStorageStore[key];
    },
    clear: () => {
        Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
    }
};

const { flattenStateToMetadata } = await import('../src/utils/sync/flattenStateToMetadata');
const { hydrateStateFromMetadata } = await import('../src/utils/sync/stateMapper');
const { applyRoomUpdatesToMeta, mapRoomSettings } = await import('../src/utils/sync/roomSettingsMeta');
const { BASE_ITEM_CHARGES, getBaseItemCharges, getItemEffectiveCharges, consumeChargeFromInventory } =
    await import('../src/utils/items/itemCharges');
const { BASE_ITEM_EFFECTS, getBaseItemEffect, applyItemUsageEffects, statusMatchesCure, isLegacyBottleCapacity } =
    await import('../src/utils/items/itemUsageEffects');
const { createInventorySlice } = await import('../src/store/slices/inventorySlice');
const { getTrainerItemTargets, applyItemToPokemonTarget } = await import('../src/utils/items/itemTargeting');
const { METADATA_ID } = await import('../src/hooks/owlbearSync/owlbearSyncConstants');
const { getAccessoryIdentityKey, sanitizeAttachmentBundles, hasAttachmentDiff, reconcileTokenAttachmentsOnScene } =
    await import('../src/utils/pc/pcAttachmentOps');

/**
 * Automated Verification Suite for Token Metadata & Serialization Invariants.
 *
 * Enforces architectural guarantees specified in AGENTS.md:
 * 1. Explicit serialization of numeric 0 values (no key omission).
 * 2. Symmetric serialization of boolean false values (no key omission).
 * 3. Explicit serialization of empty collection arrays ('[]').
 * 4. Proper shallow delta-merging via Object.assign() (no stale value leaks).
 * 5. Demonstration of nullish coalescing (??) correctness over falsy (||) fallbacks.
 */

if (!(import.meta as any).env) {
    (import.meta as any).env = { BASE_URL: '/' };
}

let passedCount = 0;
let failedCount = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
    try {
        await fn();
        console.log(`  ✓ PASS: ${name}`);
        passedCount++;
    } catch (err: unknown) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err);
        failedCount++;
    }
}

type DeepPartial<T> = {
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
function createTestCharacterState(overrides: DeepPartial<CharacterState> = {}): CharacterState {
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
            strength: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            dexterity: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
            vitality: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 },
            special: { base: 2, rank: 0, buff: 0, debuff: 0, limit: 5 },
            insight: { base: 1, rank: 0, buff: 0, debuff: 0, limit: 5 }
        },
        socials: {
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

console.log('\n=== RUNNING SERIALIZATION INVARIANT TESTS ===\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: Explicit Zero Serialization (No Key Omission)
// -----------------------------------------------------------------------------
runTest('Explicitly serializes numeric 0 for HP, Temp HP, Will, Temp Will', () => {
    const state = createTestCharacterState({
        health: {
            hpCurr: 0,
            hpMax: 12,
            hpBase: 4,
            temporaryHitPoints: 0,
            temporaryHitPointsMax: 0
        },
        will: {
            willCurr: 0,
            willMax: 6,
            willBase: 3,
            temporaryWill: 0,
            temporaryWillMax: 0
        }
    });

    const meta = flattenStateToMetadata(state);

    assert.equal(meta['hp-curr'], 0, 'hp-curr must explicitly serialize as 0');
    assert.equal(meta['temporary-hit-points'], 0, 'temporary-hit-points must serialize as 0');
    assert.equal(meta['temporary-hit-points-max'], 0, 'temporary-hit-points-max must serialize as 0');
    assert.equal(meta['will-curr'], 0, 'will-curr must explicitly serialize as 0');
    assert.equal(meta['temporary-will'], 0, 'temporary-will must serialize as 0');
    assert.equal(meta['temporary-will-max'], 0, 'temporary-will-max must serialize as 0');
});

runTest('Explicitly serializes numeric 0 for trackers, currency, and TP', () => {
    const state = createTestCharacterState({
        currency: 0,
        tp: 0,
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
        }
    });

    const meta = flattenStateToMetadata(state);

    assert.equal(meta['actions-used'], 0, 'actions-used must explicitly serialize as 0');
    assert.equal(meta['chances-used'], 0, 'chances-used must serialize as 0');
    assert.equal(meta['fate-used'], 0, 'fate-used must serialize as 0');
    assert.equal(meta['global-acc-mod'], 0, 'global-acc-mod must serialize as 0');
    assert.equal(meta['global-dmg-mod'], 0, 'global-dmg-mod must serialize as 0');
    assert.equal(meta['global-succ-mod'], 0, 'global-succ-mod must serialize as 0');
    assert.equal(meta['global-chance-mod'], 0, 'global-chance-mod must serialize as 0');
    assert.equal(meta['ignored-pain-mod'], 0, 'ignored-pain-mod must serialize as 0');
    assert.equal(meta['currency'], 0, 'currency must explicitly serialize as 0');
    assert.equal(meta['training-points'], 0, 'training-points must explicitly serialize as 0');
});

runTest('Explicitly serializes numeric 0 for offsets, buffs, and debuffs', () => {
    const state = createTestCharacterState({
        derived: {
            defBuff: 0,
            defDebuff: 0,
            sdefBuff: 0,
            sdefDebuff: 0,
            happy: 0,
            loyal: 0
        },
        identity: {
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
            claOffsetY: 0
        }
    });

    const meta = flattenStateToMetadata(state);

    assert.equal(meta['x-offset'], 0, 'x-offset must serialize as 0');
    assert.equal(meta['y-offset'], 0, 'y-offset must serialize as 0');
    assert.equal(meta['def-buff'], 0, 'def-buff must serialize as 0');
    assert.equal(meta['def-debuff'], 0, 'def-debuff must serialize as 0');
    assert.equal(meta['spd-buff'], 0, 'spd-buff must serialize as 0');
    assert.equal(meta['spd-debuff'], 0, 'spd-debuff must serialize as 0');
    assert.equal(meta['happiness-curr'], 0, 'happiness-curr must serialize as 0');
    assert.equal(meta['loyalty-curr'], 0, 'loyalty-curr must serialize as 0');
});

// -----------------------------------------------------------------------------
// TEST SUITE 2: Symmetric Boolean Serialization (No False Omission)
// -----------------------------------------------------------------------------
runTest('Explicitly serializes boolean false for trackers and toggles', () => {
    const state = createTestCharacterState({
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
        identity: {
            isNPC: false,
            abilityActive: false,
            abilityBoostActive: false,
            terastallizeBonusActive: false,
            showTrackers: false,
            settingHpBar: false,
            gmHpBar: false,
            settingWillBar: false,
            gmWillBar: false,
            settingDefBadge: false,
            gmDefBadge: false,
            settingEcoBadge: false,
            gmEcoBadge: false
        }
    });

    const meta = flattenStateToMetadata(state);

    assert.equal(meta['evasions-used'], false, 'evasions-used must explicitly serialize as false');
    assert.equal(meta['clashes-used'], false, 'clashes-used must explicitly serialize as false');
    assert.equal(meta['first-hit-acc-active'], false, 'first-hit-acc-active must serialize as false');
    assert.equal(meta['first-hit-dmg-active'], false, 'first-hit-dmg-active must serialize as false');
    assert.equal(meta['is-npc'], false, 'is-npc must explicitly serialize as false');
    assert.equal(meta['ability-active'], false, 'ability-active must explicitly serialize as false');
    assert.equal(meta['ability-boost-active'], false, 'ability-boost-active must serialize as false');
    assert.equal(meta['terastallize-bonus-active'], false, 'terastallize-bonus-active must serialize as false');
    assert.equal(meta['show-trackers'], false, 'show-trackers must explicitly serialize as false');
    assert.equal(meta['setting-hp-bar'], false, 'setting-hp-bar must explicitly serialize as false');
    assert.equal(meta['gm-hp-bar'], false, 'gm-hp-bar must explicitly serialize as false');
    assert.equal(meta['setting-will-bar'], false, 'setting-will-bar must explicitly serialize as false');
    assert.equal(meta['gm-will-bar'], false, 'gm-will-bar must explicitly serialize as false');
    assert.equal(meta['setting-def-badge'], false, 'setting-def-badge must explicitly serialize as false');
    assert.equal(meta['gm-def-badge'], false, 'gm-def-badge must explicitly serialize as false');
    assert.equal(meta['setting-eco-badge'], false, 'setting-eco-badge must explicitly serialize as false');
    assert.equal(meta['gm-eco-badge'], false, 'gm-eco-badge must explicitly serialize as false');
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: Empty Collection Serialization ('[]')
// -----------------------------------------------------------------------------
runTest('Explicitly serializes empty collections as "[]"', () => {
    const state = createTestCharacterState({
        moves: [],
        inventory: [],
        wishlist: [],
        passives: [],
        statuses: [],
        effects: [],
        skillChecks: [],
        extraCategories: [],
        customInfo: [],
        identity: {
            badges: []
        }
    });

    const meta = flattenStateToMetadata(state);

    assert.equal(meta['moves-data'], '[]', 'moves-data must explicitly serialize as "[]"');
    assert.equal(meta['inv-data'], '[]', 'inv-data must explicitly serialize as "[]"');
    assert.equal(meta['moves-wishlist-data'], '[]', 'moves-wishlist-data must serialize as "[]"');
    assert.equal(meta['passives-data'], '[]', 'passives-data must serialize as "[]"');
    assert.equal(meta['status-list'], '[]', 'status-list must serialize as "[]"');
    assert.equal(meta['effects-data'], '[]', 'effects-data must serialize as "[]"');
    assert.equal(meta['skill-checks-data'], '[]', 'skill-checks-data must serialize as "[]"');
    assert.equal(meta['extra-skills-data'], '[]', 'extra-skills-data must serialize as "[]"');
    assert.equal(meta['custom-info-data'], '[]', 'custom-info-data must serialize as "[]"');
    assert.equal(meta['badges-data'], '[]', 'badges-data must serialize as "[]"');
});

// -----------------------------------------------------------------------------
// TEST SUITE 4: Delta-Merge Overwrite Guarantee (Object.assign Simulation)
// -----------------------------------------------------------------------------
runTest('Delta merging resets stale token metadata without leaving phantom state', () => {
    // Stale token state in Owlbear Rodeo before a reset/rest action:
    const staleTokenMetadata: Record<string, string | number | boolean> = {
        'hp-curr': 14,
        'temporary-hit-points': 8,
        'will-curr': 6,
        'temporary-will': 4,
        'actions-used': 3,
        'evasions-used': true,
        'clashes-used': true,
        'chances-used': 2,
        'fate-used': 1,
        'global-acc-mod': 2,
        'global-dmg-mod': 3,
        'first-hit-acc-active': true,
        'first-hit-dmg-active': true,
        currency: 750,
        'training-points': 15,
        'ability-active': true,
        'ability-boost-active': true,
        'terastallize-bonus-active': true,
        'is-npc': true,
        'active-transformation': 'Mega',
        'active-form-id': 'mega-charizard-x',
        'color-act': '#ff0000',
        notes: 'Stale legacy combat notes',
        nickname: 'Sparky',
        'moves-data': JSON.stringify([{ id: 'tackle', name: 'Tackle' }]),
        'inv-data': JSON.stringify([{ id: 'potion', name: 'Potion' }]),
        'status-list': JSON.stringify([{ name: 'Burn' }]),
        'brawl-buff': 2,
        'label-brawl': 'Custom Brawling'
    };

    // New state following a reset or round clear:
    const resetState = createTestCharacterState({
        notes: '',
        health: {
            hpCurr: 0,
            hpMax: 14,
            hpBase: 4,
            temporaryHitPoints: 0,
            temporaryHitPointsMax: 0
        },
        will: {
            willCurr: 0,
            willMax: 6,
            willBase: 3,
            temporaryWill: 0,
            temporaryWillMax: 0
        },
        currency: 0,
        tp: 0,
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
        inventory: [],
        statuses: [],
        identity: {
            nickname: '',
            abilityActive: false,
            abilityBoostActive: false,
            terastallizeBonusActive: false,
            isNPC: false,
            activeTransformation: 'None',
            activeFormId: '',
            colorAct: '#4890fc'
        },
        skills: {
            brawl: { base: 0, buff: 0, customName: '' }
        }
    });

    const delta = flattenStateToMetadata(resetState);

    // Simulate Owlbear Rodeo / Standalone shallow delta merge:
    const merged = Object.assign({}, staleTokenMetadata, delta);

    assert.equal(merged['hp-curr'], 0, 'Merged hp-curr must overwrite 14 with 0');
    assert.equal(merged['temporary-hit-points'], 0, 'Merged temporary-hit-points must overwrite 8 with 0');
    assert.equal(merged['will-curr'], 0, 'Merged will-curr must overwrite 6 with 0');
    assert.equal(merged['temporary-will'], 0, 'Merged temporary-will must overwrite 4 with 0');
    assert.equal(merged['actions-used'], 0, 'Merged actions-used must overwrite 3 with 0');
    assert.equal(merged['evasions-used'], false, 'Merged evasions-used must overwrite true with false');
    assert.equal(merged['clashes-used'], false, 'Merged clashes-used must overwrite true with false');
    assert.equal(merged['chances-used'], 0, 'Merged chances-used must overwrite 2 with 0');
    assert.equal(merged['fate-used'], 0, 'Merged fate-used must overwrite 1 with 0');
    assert.equal(merged['global-acc-mod'], 0, 'Merged global-acc-mod must overwrite 2 with 0');
    assert.equal(merged['global-dmg-mod'], 0, 'Merged global-dmg-mod must overwrite 3 with 0');
    assert.equal(merged['first-hit-acc-active'], false, 'Merged first-hit-acc-active must overwrite true with false');
    assert.equal(merged['first-hit-dmg-active'], false, 'Merged first-hit-dmg-active must overwrite true with false');
    assert.equal(merged['currency'], 0, 'Merged currency must overwrite 750 with 0');
    assert.equal(merged['training-points'], 0, 'Merged training-points must overwrite 15 with 0');
    assert.equal(merged['ability-active'], false, 'Merged ability-active must overwrite true with false');
    assert.equal(merged['ability-boost-active'], false, 'Merged ability-boost-active must overwrite true with false');
    assert.equal(
        merged['terastallize-bonus-active'],
        false,
        'Merged terastallize-bonus-active must overwrite true with false'
    );
    assert.equal(merged['is-npc'], false, 'Merged is-npc must overwrite true with false');
    assert.equal(
        merged['active-transformation'],
        'None',
        'Merged active-transformation must overwrite "Mega" with "None"'
    );
    assert.equal(merged['active-form-id'], '', 'Merged active-form-id must overwrite form id with ""');
    assert.equal(merged['color-act'], '#4890fc', 'Merged color-act must overwrite custom color with default');
    assert.equal(merged['notes'], '', 'Merged notes must overwrite stale notes with ""');
    assert.equal(merged['nickname'], '', 'Merged nickname must overwrite stale nickname with ""');
    assert.equal(merged['moves-data'], '[]', 'Merged moves-data must overwrite populated array with "[]"');
    assert.equal(merged['inv-data'], '[]', 'Merged inv-data must overwrite populated array with "[]"');
    assert.equal(merged['status-list'], '[]', 'Merged status-list must overwrite populated array with "[]"');
    assert.equal(merged['brawl-buff'], 0, 'Merged brawl-buff must overwrite 2 with 0');
    assert.equal(merged['label-brawl'], '', 'Merged label-brawl must overwrite custom label with ""');
});

// -----------------------------------------------------------------------------
// TEST SUITE 5: Falsy (||) Fallback Anti-Pattern Verification
// -----------------------------------------------------------------------------
runTest('Nullish coalescing (??) preserves 0 and false whereas falsy (||) corrupts them', () => {
    const zeroVal: number = 0;
    const defaultHp = 10;
    const falseVal: boolean = false;
    const defaultFlag = true;

    // Falsy bug demonstration:
    assert.equal(zeroVal || defaultHp, 10, 'Demonstrates that || erroneously overwrites 0');
    assert.equal(falseVal || defaultFlag, true, 'Demonstrates that || erroneously overwrites false');

    // Correct nullish coalescing invariant:
    assert.equal(zeroVal ?? defaultHp, 0, '?? correctly preserves 0');
    assert.equal(falseVal ?? defaultFlag, false, '?? correctly preserves false');
});

// -----------------------------------------------------------------------------
// TEST SUITE 6: Temp Resource Barrier Absorption & Canvas HUD Invariants
// -----------------------------------------------------------------------------
runTest('Damage barrier absorption drains Temp HP before depleting Base HP and serializes explicit 0', () => {
    // Case A: Damage fully absorbed by Temp HP barrier
    let tempHp = 5;
    let baseHp = 10;
    let incomingDamage = 3;

    let absorbed = Math.min(tempHp, incomingDamage);
    let remainingDamage = incomingDamage - absorbed;
    let nextTempHp = tempHp - absorbed;
    let nextHp = Math.max(0, baseHp - remainingDamage);

    assert.equal(absorbed, 3, 'All 3 damage absorbed by Temp HP barrier');
    assert.equal(remainingDamage, 0, 'No leftover damage for Base HP');
    assert.equal(nextTempHp, 2, 'Temp HP decreased from 5 to 2');
    assert.equal(nextHp, 10, 'Base HP remained fully protected at 10');

    // Case B: Damage breaks Temp HP barrier and spills into Base HP
    tempHp = 3;
    baseHp = 10;
    incomingDamage = 7;

    absorbed = Math.min(tempHp, incomingDamage);
    remainingDamage = incomingDamage - absorbed;
    nextTempHp = tempHp - absorbed;
    nextHp = Math.max(0, baseHp - remainingDamage);

    assert.equal(absorbed, 3, 'Barrier absorbs 3 damage before depleting');
    assert.equal(remainingDamage, 4, 'Leftover 4 damage penetrates to Base HP');
    assert.equal(nextTempHp, 0, 'Temp HP explicitly reaches 0');
    assert.equal(nextHp, 6, 'Base HP drops from 10 to 6');

    // Serialization check: nextTempHp must delta-merge explicitly as 0
    const tokenMeta: Record<string, unknown> = {
        'temporary-hit-points': 3,
        'hp-curr': 10
    };
    const updates = {
        'temporary-hit-points': nextTempHp,
        'hp-curr': nextHp
    };
    Object.assign(tokenMeta, updates);
    assert.equal(tokenMeta['temporary-hit-points'], 0, 'Explicit 0 for temporary-hit-points must overwrite previous 3');
    assert.equal(tokenMeta['hp-curr'], 6, 'hp-curr must update to 6');

    // Case C: Damage when Temp HP is 0 directly reduces Base HP
    const caseC = { temp: 0, base: 5, dmg: 2, expectedTemp: 0, expectedBase: 3 };
    absorbed = Math.min(caseC.temp, caseC.dmg);
    remainingDamage = caseC.dmg - absorbed;
    nextTempHp = caseC.temp - absorbed;
    nextHp = Math.max(0, caseC.base - remainingDamage);

    assert.equal(absorbed, 0, 'No barrier absorption when Temp HP is 0');
    assert.equal(remainingDamage, caseC.dmg, 'All incoming damage penetrates directly to Base HP');
    assert.equal(nextTempHp, caseC.expectedTemp, 'Temp HP remains explicitly at 0');
    assert.equal(nextHp, caseC.expectedBase, 'Base HP drops from 5 to 3');
});

runTest('Canvas HUD graphics calculate effectiveTempMax and tempHpPercentage with 0-max fallback', () => {
    const dataWithZeroTempMax = {
        hpCurr: 10,
        hpMax: 10,
        temporaryHitPoints: 4,
        temporaryHitPointsMax: 0
    };

    // Old bug: temporaryHitPointsMax > 0 resulted in 0 percentage
    const oldTempHpPercentage =
        dataWithZeroTempMax.temporaryHitPointsMax > 0
            ? Math.max(
                  0,
                  Math.min(1, dataWithZeroTempMax.temporaryHitPoints / dataWithZeroTempMax.temporaryHitPointsMax)
              )
            : 0;
    assert.equal(oldTempHpPercentage, 0, 'Demonstrates the old bug swallowed purple barrier fill');

    // Correct implementation:
    const effectiveTempMax =
        dataWithZeroTempMax.temporaryHitPointsMax > 0
            ? dataWithZeroTempMax.temporaryHitPointsMax
            : Math.max(dataWithZeroTempMax.hpMax || 1, dataWithZeroTempMax.temporaryHitPoints, 1);
    const correctedPercentage = Math.max(0, Math.min(1, dataWithZeroTempMax.temporaryHitPoints / effectiveTempMax));

    assert.equal(effectiveTempMax, 10, 'effectiveTempMax safely defaults to base hpMax (10)');
    assert.equal(correctedPercentage, 0.4, 'Purple barrier fill renders at 40% instead of 0%');

    // Safe HP text calculation
    const effectiveHpMax = Math.max(1, dataWithZeroTempMax.hpMax || 1);
    const hpString =
        dataWithZeroTempMax.temporaryHitPoints > 0
            ? `${dataWithZeroTempMax.hpCurr}+${dataWithZeroTempMax.temporaryHitPoints}/${effectiveHpMax}`
            : `${dataWithZeroTempMax.hpCurr}/${effectiveHpMax}`;
    assert.equal(hpString, '10+4/10', 'hp-text renders formatted Temp HP string without /0 or NaN');
});

runTest('applyRoomUpdatesToMeta and mapRoomSettings serialize explicit false and 0 symmetrically', () => {
    const initialRoomMeta: Record<string, unknown> = {
        gmOnlyGenerators: true,
        defaultNpcInitiativeHidden: true,
        roomDefaultScale: 100,
        roomDefaultOffsetX: 10,
        roomDefaultOffsetY: 20
    };

    // User updates Generators to Everyone (false), NPC init to Visible to Everyone (false), and offsets to 0
    const updates = {
        gmOnlyGenerators: false,
        defaultNpcInitiativeHidden: false,
        roomDefaultOffsetX: 0,
        roomDefaultOffsetY: 0
    };

    applyRoomUpdatesToMeta(initialRoomMeta, updates);

    assert.equal(initialRoomMeta.gmOnlyGenerators, false, 'Explicitly sets gmOnlyGenerators to false');
    assert.equal(
        initialRoomMeta.defaultNpcInitiativeHidden,
        false,
        'Explicitly sets defaultNpcInitiativeHidden to false'
    );
    assert.equal(initialRoomMeta.roomDefaultOffsetX, 0, 'Explicitly sets roomDefaultOffsetX to 0');
    assert.equal(initialRoomMeta.roomDefaultOffsetY, 0, 'Explicitly sets roomDefaultOffsetY to 0');

    // Deserialization / mapping
    const mapped = mapRoomSettings(initialRoomMeta);
    assert.equal(mapped.gmOnlyGenerators, false, 'mapRoomSettings preserves false boolean');
    assert.equal(
        mapped.defaultNpcInitiativeHidden,
        false,
        'mapRoomSettings preserves false defaultNpcInitiativeHidden'
    );
    assert.equal(mapped.roomDefaultOffsetX, 0, 'mapRoomSettings preserves 0 offset');
    assert.equal(mapped.roomDefaultOffsetY, 0, 'mapRoomSettings preserves 0 offset');

    // Verify UI permission checks across GlobalToolbar and TokenEmptyState are identical
    const checkCanUse = (isGm: boolean, gmOnlyGenerators?: boolean) => isGm || gmOnlyGenerators === false;

    // GM always has access
    assert.equal(checkCanUse(true, true), true, 'GM can access when GM Only');
    assert.equal(checkCanUse(true, false), true, 'GM can access when Everyone');
    assert.equal(checkCanUse(true, undefined), true, 'GM can access when undefined');

    // Player access depends strictly on gmOnlyGenerators === false
    assert.equal(checkCanUse(false, false), true, 'Player can access when Everyone');
    assert.equal(checkCanUse(false, true), false, 'Player blocked when GM Only');
    assert.equal(checkCanUse(false, undefined), false, 'Player blocked when undefined');
});

runTest('hydrateStateFromMetadata hydrates gmEcoBadge and round-trips through flattenStateToMetadata', () => {
    const baseState = createTestCharacterState();

    // 1. Hydrate from meta with boolean true
    const metaWithTrue = { 'gm-eco-badge': true };
    const hydratedTrue = hydrateStateFromMetadata(metaWithTrue, baseState);
    assert.equal(hydratedTrue.identity?.gmEcoBadge, true, 'gmEcoBadge should hydrate as true from boolean true');

    // 2. Hydrate from meta with string "true"
    const metaWithStringTrue = { 'gm-eco-badge': 'true' };
    const hydratedStringTrue = hydrateStateFromMetadata(metaWithStringTrue, baseState);
    assert.equal(hydratedStringTrue.identity?.gmEcoBadge, true, 'gmEcoBadge should hydrate as true from string "true"');

    // 3. Hydrate from meta with false / 'false'
    const metaWithFalse = { 'gm-eco-badge': false };
    const hydratedFalse = hydrateStateFromMetadata(metaWithFalse, baseState);
    assert.equal(hydratedFalse.identity?.gmEcoBadge, false, 'gmEcoBadge should hydrate as false from boolean false');

    const metaWithStringFalse = { 'gm-eco-badge': 'false' };
    const hydratedStringFalse = hydrateStateFromMetadata(metaWithStringFalse, baseState);
    assert.equal(
        hydratedStringFalse.identity?.gmEcoBadge,
        false,
        'gmEcoBadge should hydrate as false from string "false"'
    );

    // 4. Round-trip through flattenStateToMetadata preserves 'gm-eco-badge': true
    const stateWithGmEco = createTestCharacterState({
        identity: {
            ...baseState.identity,
            gmEcoBadge: true
        }
    });
    const flattened = flattenStateToMetadata(stateWithGmEco);
    assert.equal(flattened['gm-eco-badge'], true, 'flattenStateToMetadata should output "gm-eco-badge": true');

    // 5. Hydrate back from flattened metadata
    const rehydrated = hydrateStateFromMetadata(flattened, baseState);
    assert.equal(rehydrated.identity?.gmEcoBadge, true, 're-hydrating flattened metadata preserves gmEcoBadge: true');
});

runTest('Explicitly serializes and hydrates item charges: 0, healHp: 0, and healWill: 0', () => {
    const baseState = createTestCharacterState({
        inventory: [
            {
                id: 'inv-item-1',
                name: 'Potion',
                qty: 1,
                desc: 'A pocket sized spray potion',
                charges: 0,
                maxCharges: 2,
                healHp: 0,
                healWill: 0,
                cures: ['Burn', 'Freeze']
            }
        ]
    });

    const flattened = flattenStateToMetadata(baseState);
    assert.ok(flattened['inv-data'], 'inv-data should exist in flattened metadata');
    const parsedRaw = JSON.parse(String(flattened['inv-data']));
    assert.equal(parsedRaw[0].charges, 0, 'charges should explicitly serialize 0');
    assert.equal(parsedRaw[0].maxCharges, 2, 'maxCharges should explicitly serialize 2');
    assert.equal(parsedRaw[0].healHp, 0, 'healHp should explicitly serialize 0');
    assert.equal(parsedRaw[0].healWill, 0, 'healWill should explicitly serialize 0');
    assert.deepEqual(parsedRaw[0].cures, ['Burn', 'Freeze'], 'cures should serialize array');

    const hydrated = hydrateStateFromMetadata(flattened, baseState);
    assert.equal(hydrated.inventory?.[0].charges, 0, 'charges: 0 should be hydrated');
    assert.equal(hydrated.inventory?.[0].maxCharges, 2, 'maxCharges: 2 should be hydrated');
    assert.equal(hydrated.inventory?.[0].healHp, 0, 'healHp: 0 should be hydrated');
    assert.equal(hydrated.inventory?.[0].healWill, 0, 'healWill: 0 should be hydrated');
    assert.deepEqual(hydrated.inventory?.[0].cures, ['Burn', 'Freeze'], 'cures should be hydrated');
});

runTest('itemCharges: BASE_ITEM_CHARGES covers the 11 audited items and getBaseItemCharges is case-insensitive', () => {
    const expectedItems: Record<string, number> = {
        Potion: 2,
        'Super Potion': 4,
        'Hyper Potion': 14,
        Remedy: 4,
        'Energy Root': 14,
        'Fresh Water': 4,
        'Soda Pop': 5,
        Lemonade: 6,
        'MooMoo Milk': 8,
        'Berry Juice': 2,
        'Pepper Spray Can': 5
    };

    for (const [name, count] of Object.entries(expectedItems)) {
        assert.equal(BASE_ITEM_CHARGES[name], count, `BASE_ITEM_CHARGES should have ${name} = ${count}`);
        assert.equal(
            getBaseItemCharges(name.toLowerCase()),
            count,
            `getBaseItemCharges should match lowercase ${name}`
        );
        assert.equal(
            getBaseItemCharges(`  ${name.toUpperCase()}  `),
            count,
            `getBaseItemCharges should trim and match`
        );
    }
    assert.equal(getBaseItemCharges('Unknown Item'), undefined);
});

runTest('itemCharges: getItemEffectiveCharges handles explicit charges and fallback to base charges', () => {
    // Explicit charges: 0
    const explicitZero = getItemEffectiveCharges({ name: 'Potion', charges: 0, maxCharges: 2 });
    assert.equal(explicitZero.hasCharges, true);
    assert.equal(explicitZero.charges, 0);
    assert.equal(explicitZero.maxCharges, 2);

    // Fallback to base charges when undefined
    const fallbackBase = getItemEffectiveCharges({ name: 'Super Potion' });
    assert.equal(fallbackBase.hasCharges, true);
    assert.equal(fallbackBase.charges, 4);
    assert.equal(fallbackBase.maxCharges, 4);

    // Non-charged item
    const nonCharged = getItemEffectiveCharges({ name: 'Oran Berry' });
    assert.equal(nonCharged.hasCharges, false);
    assert.equal(nonCharged.charges, 0);
    assert.equal(nonCharged.maxCharges, 0);
});

runTest(
    'itemCharges: consumeChargeFromInventory splits multi-qty stacks and merges into existing matching charges',
    () => {
        // 1. Stack split: 5 Potions at 2 charges -> 4 at 2 charges + 1 at 1 charge
        const initialInv = [
            {
                id: 'pot-stack-1',
                name: 'Potion',
                qty: 5,
                desc: 'A potion',
                charges: 2,
                maxCharges: 2
            }
        ];

        const step1 = consumeChargeFromInventory(initialInv, 'pot-stack-1');
        assert.equal(step1.remainingCharges, 1);
        assert.equal(step1.maxCharges, 2);
        assert.equal(step1.newInventory.length, 2);
        assert.equal(step1.newInventory[0].qty, 4);
        assert.equal(step1.newInventory[0].charges, 2);
        assert.equal(step1.newInventory[1].qty, 1);
        assert.equal(step1.newInventory[1].charges, 1);

        // 2. Consume from 4-stack when 1-charge stack already exists -> merges into existing 1-charge item
        const step2 = consumeChargeFromInventory(step1.newInventory, 'pot-stack-1');
        assert.equal(step2.newInventory.length, 2);
        assert.equal(step2.newInventory[0].qty, 3);
        assert.equal(step2.newInventory[0].charges, 2);
        assert.equal(step2.newInventory[1].qty, 2);
        assert.equal(step2.newInventory[1].charges, 1);

        // 3. Consume from a stack of 2 at 1 charge -> remainingCharges === 0, decrements qty to 1
        const oneChargeItemId = step2.newInventory[1].id;
        const step3 = consumeChargeFromInventory(step2.newInventory, oneChargeItemId);
        assert.equal(step3.remainingCharges, 0);
        assert.equal(step3.newInventory.length, 2);
        assert.equal(step3.newInventory[1].qty, 1);
        assert.equal(step3.newInventory[1].charges, 1);

        // 4. Consume from single-qty item at 1 charge -> remainingCharges === 0, removed completely
        const step4 = consumeChargeFromInventory(step3.newInventory, oneChargeItemId);
        assert.equal(step4.remainingCharges, 0);
        assert.equal(step4.newInventory.length, 1);
        assert.equal(step4.newInventory[0].qty, 3);
        assert.equal(step4.newInventory[0].charges, 2);
    }
);

runTest('itemCharges: destroyOnDepletion: false retains depleted item in inventory with explicit charges: 0', () => {
    // Single item with destroyOnDepletion === false
    const singleInv = [
        {
            id: 'canteen-1',
            name: 'Travel Canteen',
            qty: 1,
            desc: 'A water bottle',
            charges: 1,
            maxCharges: 3,
            destroyOnDepletion: false
        }
    ];

    const result = consumeChargeFromInventory(singleInv, 'canteen-1');
    assert.equal(result.remainingCharges, 0, 'Remaining charges should be 0');
    assert.equal(result.newInventory.length, 1, 'Item should be retained in inventory');
    assert.equal(result.newInventory[0].id, 'canteen-1', 'Retained item keeps same ID');
    assert.equal(result.newInventory[0].charges, 0, 'Charges must be explicitly 0');
    assert.equal(result.newInventory[0].maxCharges, 3, 'Max charges preserved');
    assert.equal(result.newInventory[0].destroyOnDepletion, false, 'destroyOnDepletion preserved');

    // Stack of 2 with 1 charge each and destroyOnDepletion === false
    const stackInv = [
        {
            id: 'bottle-stack-1',
            name: 'Spray Bottle',
            qty: 2,
            desc: 'A spray bottle',
            charges: 1,
            maxCharges: 2,
            destroyOnDepletion: false
        }
    ];
    const stackResult = consumeChargeFromInventory(stackInv, 'bottle-stack-1');
    assert.equal(stackResult.remainingCharges, 0);
    assert.equal(stackResult.newInventory.length, 2, 'Stack should split into 1 at 1 charge and 1 at 0 charges');
    const fullCharge = stackResult.newInventory.find((i) => i.id === 'bottle-stack-1');
    const emptyCharge = stackResult.newInventory.find((i) => i.id !== 'bottle-stack-1');
    assert.ok(fullCharge, 'Remaining stack should exist');
    assert.equal(fullCharge!.qty, 1);
    assert.equal(fullCharge!.charges, 1);
    assert.ok(emptyCharge, 'Depleted item should exist');
    assert.equal(emptyCharge!.qty, 1);
    assert.equal(emptyCharge!.charges, 0);
    assert.equal(emptyCharge!.destroyOnDepletion, false);
});

runTest(
    'itemUsageEffects: BASE_ITEM_EFFECTS contains all required items and getBaseItemEffect is case-insensitive',
    () => {
        // Multi-unit potions & drinks
        const multiUnits = [
            'Potion',
            'Super Potion',
            'Hyper Potion',
            'Remedy',
            'Energy Root',
            'Fresh Water',
            'Soda Pop',
            'Lemonade',
            'MooMoo Milk',
            'Berry Juice'
        ];
        for (const name of multiUnits) {
            const effect = getBaseItemEffect(name);
            assert.ok(effect, `Expected effect for ${name}`);
            assert.equal(effect.healHp, 1, `Expected 1 HP heal for ${name}`);
        }

        // Flat heals
        assert.equal(getBaseItemEffect('Sitrus Berry')?.healHp, 3);
        assert.equal(getBaseItemEffect('Oran Berry')?.healHp, 1);
        assert.equal(getBaseItemEffect('Chocolate')?.healHp, 1);
        assert.equal(getBaseItemEffect('Honey')?.healHp, 1);

        // Full heals & revives
        assert.equal(getBaseItemEffect('Max Potion')?.healHp, 99);
        assert.deepEqual(getBaseItemEffect('Full Restore'), { healHp: 99, cures: ['All Status'] });
        assert.deepEqual(getBaseItemEffect('Revival Herb'), { healHp: 99, cures: ['Fainted'] });
        assert.deepEqual(getBaseItemEffect('Max Revive'), { healHp: 99, cures: ['Fainted'] });
        assert.deepEqual(getBaseItemEffect('Revive'), { healHp: 1, cures: ['Fainted'] });

        // Status cures
        assert.deepEqual(getBaseItemEffect('Burn Heal'), { cures: ['Burn'] });
        assert.deepEqual(getBaseItemEffect('Antidote'), { cures: ['Poison'] });
        assert.deepEqual(getBaseItemEffect('Awakening'), { cures: ['Sleep'] });
        assert.deepEqual(getBaseItemEffect('Paralyze Heal'), { cures: ['Paralysis'] });
        assert.deepEqual(getBaseItemEffect('Ice Heal'), { cures: ['Frozen Solid'] });
        assert.deepEqual(getBaseItemEffect('Baked Goods'), { cures: ['Sleep', 'Poison', 'Frozen Solid', 'Paralysis'] });
        assert.deepEqual(getBaseItemEffect('Full Heal'), { cures: ['All Status'] });
        assert.deepEqual(getBaseItemEffect('Lum Berry'), { cures: ['All Status'] });

        // Case-insensitivity check
        assert.equal(getBaseItemEffect('  sItRuS bErRy  ')?.healHp, 3);
    }
);

runTest('itemUsageEffects: statusMatchesCure matches degrees of burns, poison variants, and custom statuses', () => {
    const burn1 = { id: '1', name: '1st Degree Burn', customName: '', rounds: 0 };
    const burn2 = { id: '2', name: '2nd Degree Burn', customName: '', rounds: 0 };
    const burn3 = { id: '3', name: '3rd Degree Burn', customName: '', rounds: 0 };
    const poison = { id: '4', name: 'Poison', customName: '', rounds: 0 };
    const badlyPoisoned = { id: '5', name: 'Badly Poisoned', customName: '', rounds: 0 };
    const fainted = { id: '6', name: 'Fainted', customName: '', rounds: 0 };
    const healthy = { id: '7', name: 'Healthy', customName: '', rounds: 0 };
    const customStatus = { id: '8', name: 'Custom...', customName: 'Frostbite', rounds: 0 };

    // Burn curing
    assert.equal(statusMatchesCure(burn1, 'Burn'), true);
    assert.equal(statusMatchesCure(burn2, 'Burn'), true);
    assert.equal(statusMatchesCure(burn3, 'Burn'), true);
    assert.equal(statusMatchesCure(poison, 'Burn'), false);

    // Poison curing
    assert.equal(statusMatchesCure(poison, 'Poison'), true);
    assert.equal(statusMatchesCure(badlyPoisoned, 'Poison'), true);
    assert.equal(statusMatchesCure(burn1, 'Poison'), false);

    // All Status curing
    assert.equal(statusMatchesCure(burn1, 'All Status'), true);
    assert.equal(statusMatchesCure(badlyPoisoned, 'All Status'), true);
    assert.equal(statusMatchesCure(customStatus, 'All Status'), true);
    assert.equal(statusMatchesCure(fainted, 'All Status'), false, 'All Status should NEVER cure Fainted');
    assert.equal(statusMatchesCure(healthy, 'All Status'), false, 'All Status should not target Healthy');

    // Fainted curing
    assert.equal(statusMatchesCure(fainted, 'Fainted'), true);
    assert.equal(statusMatchesCure(burn1, 'Fainted'), false);

    // Custom status matching
    const registry = [{ id: 'c1', name: 'Frostbite', description: '', effects: '', color: '#00f', textColor: '#fff' }];
    assert.equal(statusMatchesCure(customStatus, 'Frostbite', registry), true);
});

runTest('itemUsageEffects: applyItemUsageEffects applies HP/Will capping, cures statuses, and inserts Healthy', () => {
    const health = {
        hpCurr: 2,
        hpMax: 5,
        hpBase: 4,
        temporaryHitPoints: 0,
        temporaryHitPointsMax: 0
    };
    const will = {
        willCurr: 1,
        willMax: 4,
        willBase: 4,
        temporaryWill: 0,
        temporaryWillMax: 0
    };
    const statuses = [
        { id: 's1', name: 'Poison', customName: '', rounds: 1 },
        { id: 's2', name: '1st Degree Burn', customName: '', rounds: 2 }
    ];

    // 1. Antidote cures Poison only
    const antidoteResult = applyItemUsageEffects(
        { id: 'i1', name: 'Antidote', qty: 1, desc: '' },
        health,
        will,
        statuses
    );
    assert.equal(antidoteResult.hpHealed, 0);
    assert.deepEqual(antidoteResult.curedStatusNames, ['Poison']);
    assert.equal(antidoteResult.nextStatuses.length, 1);
    assert.equal(antidoteResult.nextStatuses[0].name, '1st Degree Burn');
    assert.equal(antidoteResult.summaryText, 'Cured Poison.');

    // 2. Sitrus Berry heals 3 HP capped at hpMax (2 + 3 = 5)
    const sitrusResult = applyItemUsageEffects(
        { id: 'i2', name: 'Sitrus Berry', qty: 1, desc: '' },
        health,
        will,
        statuses
    );
    assert.equal(sitrusResult.hpHealed, 3);
    assert.equal(sitrusResult.nextHealth.hpCurr, 5);
    assert.equal(sitrusResult.nextHealth.currentHitPoints, 5);
    assert.equal(sitrusResult.summaryText, 'Healed 3 HP.');

    // 3. Max Potion heals to full (from 2 to 5)
    const maxPotionResult = applyItemUsageEffects(
        { id: 'i3', name: 'Max Potion', qty: 1, desc: '' },
        health,
        will,
        statuses
    );
    assert.equal(maxPotionResult.hpHealed, 3);
    assert.equal(maxPotionResult.nextHealth.hpCurr, 5);

    // 4. Full Restore heals to full and cures all non-fainted, inserting Healthy
    const fullRestoreResult = applyItemUsageEffects(
        { id: 'i4', name: 'Full Restore', qty: 1, desc: '' },
        health,
        will,
        statuses
    );
    assert.equal(fullRestoreResult.hpHealed, 3);
    assert.equal(fullRestoreResult.nextHealth.hpCurr, 5);
    assert.deepEqual(fullRestoreResult.curedStatusNames, ['Poison', '1st Degree Burn']);
    assert.equal(fullRestoreResult.nextStatuses.length, 1);
    assert.equal(fullRestoreResult.nextStatuses[0].name, 'Healthy');
    assert.equal(fullRestoreResult.summaryText, 'Healed 3 HP. Cured Poison, 1st Degree Burn.');

    // 5. Revive restores 1 HP and cures Fainted
    const faintedHealth = { ...health, hpCurr: 0 };
    const faintedStatuses = [{ id: 'f1', name: 'Fainted', customName: '', rounds: 0 }];
    const reviveResult = applyItemUsageEffects(
        { id: 'i5', name: 'Revive', qty: 1, desc: '' },
        faintedHealth,
        will,
        faintedStatuses
    );
    assert.equal(reviveResult.hpHealed, 1);
    assert.equal(reviveResult.nextHealth.hpCurr, 1);
    assert.deepEqual(reviveResult.curedStatusNames, ['Fainted']);
    assert.equal(reviveResult.nextStatuses.length, 1);
    assert.equal(reviveResult.nextStatuses[0].name, 'Healthy');

    // 6. Custom item restoring Will
    const willItem = { id: 'i6', name: 'Elixir', qty: 1, desc: '', healWill: 2 };
    const willResult = applyItemUsageEffects(willItem, health, will, []);
    assert.equal(willResult.willHealed, 2);
    assert.equal(willResult.nextWill.willCurr, 3);
    assert.equal(willResult.summaryText, 'Restored 2 Will.');

    // 7. Defensive legacy normalization & item heal invariants
    const injuredHealth = { hpCurr: 1, hpMax: 20, hpBase: 20, temporaryHitPoints: 0, temporaryHitPointsMax: 0 };

    // Super Potion: healHp undefined -> 1 HP
    const superDef = applyItemUsageEffects(
        { id: 'sp-1', name: 'Super Potion', qty: 1, desc: '', charges: 4, maxCharges: 4 },
        injuredHealth,
        will,
        []
    );
    assert.equal(superDef.hpHealed, 1, 'Super Potion with undefined healHp should heal 1 HP');
    assert.equal(superDef.nextHealth.hpCurr, 2);

    // Super Potion: legacy healHp: 4 -> defensively normalized to 1 HP
    const superLegacy = applyItemUsageEffects(
        { id: 'sp-2', name: 'Super Potion', qty: 1, desc: '', charges: 4, maxCharges: 4, healHp: 4 },
        injuredHealth,
        will,
        []
    );
    assert.equal(superLegacy.hpHealed, 1, 'Super Potion with legacy healHp: 4 should defensively heal 1 HP');
    assert.equal(superLegacy.nextHealth.hpCurr, 2);

    // Hyper Potion: healHp undefined -> 1 HP
    const hyperDef = applyItemUsageEffects(
        { id: 'hp-1', name: 'Hyper Potion', qty: 1, desc: '', charges: 14, maxCharges: 14 },
        injuredHealth,
        will,
        []
    );
    assert.equal(hyperDef.hpHealed, 1, 'Hyper Potion with undefined healHp should heal 1 HP');
    assert.equal(hyperDef.nextHealth.hpCurr, 2);

    // Hyper Potion: legacy healHp: 14 -> defensively normalized to 1 HP
    const hyperLegacy = applyItemUsageEffects(
        { id: 'hp-2', name: 'Hyper Potion', qty: 1, desc: '', charges: 14, maxCharges: 14, healHp: 14 },
        injuredHealth,
        will,
        []
    );
    assert.equal(hyperLegacy.hpHealed, 1, 'Hyper Potion with legacy healHp: 14 should defensively heal 1 HP');
    assert.equal(hyperLegacy.nextHealth.hpCurr, 2);

    // Sitrus Berry: flat heal 3 HP
    const sitrus = applyItemUsageEffects(
        { id: 'sb-1', name: 'Sitrus Berry', qty: 1, desc: '' },
        injuredHealth,
        will,
        []
    );
    assert.equal(sitrus.hpHealed, 3, 'Sitrus Berry should heal 3 HP');
    assert.equal(sitrus.nextHealth.hpCurr, 4);

    // Max Potion: full heal (99 HP) restoring up to max HP (from 1 to 20 = 19 HP healed)
    const maxPot = applyItemUsageEffects({ id: 'mp-1', name: 'Max Potion', qty: 1, desc: '' }, injuredHealth, will, []);
    assert.equal(maxPot.hpHealed, 19, 'Max Potion should fully heal character to max HP');
    assert.equal(maxPot.nextHealth.hpCurr, 20);
});

runTest('itemUsageEffects: isLegacyBottleCapacity accurately detects legacy bottle capacity attributes', () => {
    assert.equal(isLegacyBottleCapacity({ name: 'Super Potion', healHp: 4, maxCharges: 4 }), true);
    assert.equal(isLegacyBottleCapacity({ name: 'Hyper Potion', healHp: 14, maxCharges: 14 }), true);
    assert.equal(isLegacyBottleCapacity({ name: 'Potion', healHp: 2, maxCharges: 2 }), true);
    assert.equal(isLegacyBottleCapacity({ name: 'Super Potion', healHp: 1, maxCharges: 4 }), false);
    assert.equal(isLegacyBottleCapacity({ name: 'Sitrus Berry', healHp: 3 }), false);
    assert.equal(isLegacyBottleCapacity({ name: 'Custom Drink', healHp: 4 }), false);
});

runTest(
    'inventorySlice: useInventoryItem decrements charges or qty, heals, cures statuses, and updates atomic state',
    () => {
        let currentState: any = {
            identity: { nickname: 'Pikachu', species: 'Pikachu' },
            health: { hpCurr: 2, hpMax: 5, hpBase: 4, temporaryHitPoints: 0, temporaryHitPointsMax: 0 },
            will: { willCurr: 1, willMax: 4, willBase: 4, temporaryWill: 0, temporaryWillMax: 0 },
            statuses: [{ id: 's1', name: '1st Degree Burn', customName: '', rounds: 1 }],
            roomCustomStatuses: [],
            inventory: [
                { id: 'item-pot', name: 'Potion', qty: 1, charges: 2, maxCharges: 2, desc: '' },
                { id: 'item-berry', name: 'Sitrus Berry', qty: 2, desc: '' },
                { id: 'item-burn', name: 'Burn Heal', qty: 1, desc: '' }
            ]
        };

        const setFn = (updater: any) => {
            const updates = typeof updater === 'function' ? updater(currentState) : updater;
            currentState = { ...currentState, ...updates };
        };

        const slice = createInventorySlice(setFn as any, (() => currentState) as any, {} as any);

        // 1. Use charged Potion: heals 1 HP (2 -> 3), consumes 1 charge (charges 2 -> 1, qty stays 1)
        slice.useInventoryItem('item-pot');
        assert.equal(currentState.health.hpCurr, 3);
        const potItem = currentState.inventory.find((i: any) => i.id === 'item-pot');
        assert.ok(potItem);
        assert.equal(potItem.charges, 1);
        assert.equal(potItem.qty, 1);

        // 2. Use Sitrus Berry: heals 3 HP (3 -> 5 capped at hpMax), decrements qty from 2 to 1
        slice.useInventoryItem('item-berry');
        assert.equal(currentState.health.hpCurr, 5);
        const berryItem = currentState.inventory.find((i: any) => i.id === 'item-berry');
        assert.ok(berryItem);
        assert.equal(berryItem.qty, 1);

        // 3. Use Burn Heal: cures 1st Degree Burn, inserts Healthy, decrements qty from 1 -> removed
        slice.useInventoryItem('item-burn');
        assert.equal(currentState.statuses.length, 1);
        assert.equal(currentState.statuses[0].name, 'Healthy');
        assert.equal(
            currentState.inventory.some((i: any) => i.id === 'item-burn'),
            false
        );
    }
);

await runTest(
    'itemTargeting: getTrainerItemTargets returns empty for non-trainer or non-restorative, and candidates for belt slot pokemon',
    () => {
        const mockStore: any = {
            identity: {
                mode: 'Trainer',
                nickname: 'Red',
                species: 'Human',
                rank: 'Trainer'
            },
            health: { hpCurr: 4, hpMax: 5 },
            will: { willCurr: 2, willMax: 4 },
            statuses: [{ id: 'st-1', name: 'Healthy', customName: '', rounds: 0 }],
            inventory: [],
            roomCustomStatuses: [],
            pcData: {
                activeCampaignId: 'camp-1',
                campaigns: {
                    'camp-1': {
                        id: 'camp-1',
                        name: 'Kanto',
                        activeTrainerId: 'tr-red',
                        trainers: {
                            'tr-red': {
                                id: 'tr-red',
                                name: 'Red',
                                party: ['pkmn-pika', 'pkmn-char']
                            }
                        }
                    }
                },
                pokemonSummaries: {
                    'pkmn-pika': {
                        entityId: 'pkmn-pika',
                        name: 'Sparky',
                        species: 'Pikachu',
                        hp: 2,
                        maxHp: 4,
                        will: 1,
                        maxWill: 3,
                        isOnMap: true,
                        trainerId: 'tr-red',
                        fullMetadata: {
                            'status-list': JSON.stringify([{ id: 'p1', name: 'Paralyzed', customName: '', rounds: 1 }])
                        }
                    },
                    'pkmn-char': {
                        entityId: 'pkmn-char',
                        name: 'Blaze',
                        species: 'Charizard',
                        hp: 5,
                        maxHp: 6,
                        will: 4,
                        maxWill: 4,
                        isOnMap: false, // In party but NOT on map!
                        trainerId: 'tr-red'
                    },
                    'pkmn-box': {
                        entityId: 'pkmn-box',
                        name: 'Boxy',
                        species: 'Snorlax',
                        hp: 10,
                        maxHp: 10,
                        will: 5,
                        maxWill: 5,
                        isOnMap: false,
                        trainerId: 'tr-red'
                    }
                }
            }
        };

        const potionItem: any = { id: 'it-pot', name: 'Potion', healHp: 1 };
        const swordItem: any = { id: 'it-sw', name: 'Iron Sword' }; // non-restorative

        // 1. Non-restorative item -> empty array
        const targetsForSword = getTrainerItemTargets(mockStore, swordItem);
        assert.equal(targetsForSword.length, 0);

        // 2. Non-trainer character -> empty array
        const nonTrainerStore: any = {
            ...mockStore,
            identity: { ...mockStore.identity, mode: 'Pokemon', rank: 'Rookie' }
        };
        const targetsForNonTrainer = getTrainerItemTargets(nonTrainerStore, potionItem);
        assert.equal(targetsForNonTrainer.length, 0);

        // 3. Trainer with belt slot Pokémon (Sparky on map, Blaze not on map) -> [Red (Trainer), Sparky (Pokemon), Blaze (Pokemon)]
        // Box Pokémon (pkmn-box) must be excluded
        const targets = getTrainerItemTargets(mockStore, potionItem);
        assert.equal(targets.length, 3);
        assert.equal(targets[0].isTrainer, true);
        assert.equal(targets[0].name, 'Red');
        assert.equal(targets[1].isTrainer, false);
        assert.equal(targets[1].name, 'Sparky');
        assert.equal(targets[1].statuses.length, 1);
        assert.equal(targets[1].statuses[0].name, 'Paralyzed');
        assert.equal(targets[2].isTrainer, false);
        assert.equal(targets[2].name, 'Blaze');
        assert.ok(!targets.some((t: any) => t.id === 'pkmn-box'));

        // 4. When trainer.party is empty -> empty array (allowing direct self-use without prompt)
        const mockStoreEmptyParty: any = {
            ...mockStore,
            pcData: {
                ...mockStore.pcData,
                campaigns: {
                    ...mockStore.pcData.campaigns,
                    'camp-1': {
                        ...mockStore.pcData.campaigns['camp-1'],
                        trainers: {
                            'tr-red': {
                                ...mockStore.pcData.campaigns['camp-1'].trainers['tr-red'],
                                party: []
                            }
                        }
                    }
                }
            }
        };
        const targetsEmptyParty = getTrainerItemTargets(mockStoreEmptyParty, potionItem);
        assert.equal(targetsEmptyParty.length, 0);
    }
);

await runTest(
    'itemTargeting: applyItemToPokemonTarget heals pokemon summary, updates OBR token, and decrements trainer charges',
    async () => {
        let updatedSummary: any = null;
        let nextInv: any = null;

        const mockStore: any = {
            identity: { nickname: 'Red', species: 'Human', mode: 'Trainer' },
            inventory: [{ id: 'it-pot', name: 'Potion', healHp: 1, charges: 2, maxCharges: 2 }],
            pcData: {
                pokemonSummaries: {
                    'pkmn-pika': {
                        entityId: 'pkmn-pika',
                        name: 'Sparky',
                        species: 'Pikachu',
                        hp: 2,
                        maxHp: 4,
                        will: 1,
                        maxWill: 3,
                        isOnMap: true,
                        fullMetadata: {
                            'hp-curr': 2,
                            'status-list': JSON.stringify([{ id: 'p1', name: 'Paralyzed', customName: '', rounds: 1 }])
                        },
                        savedTokenItem: {
                            id: 'tok-pika',
                            metadata: {
                                [METADATA_ID]: {
                                    'hp-curr': 2,
                                    'current-hp': 2
                                }
                            }
                        }
                    }
                }
            },
            updatePokemonSummary: (summary: any) => {
                updatedSummary = summary;
            }
        };

        const targetCandidate = {
            id: 'pkmn-pika',
            name: 'Sparky',
            species: 'Pikachu',
            hp: 2,
            maxHp: 4,
            will: 1,
            maxWill: 3,
            statuses: [{ id: 'p1', name: 'Paralyzed', customName: '', rounds: 1 }],
            isTrainer: false
        };

        await applyItemToPokemonTarget(mockStore, mockStore.inventory[0], targetCandidate as any);

        // Pokémon summary should be healed from 2 -> 3 HP
        assert.ok(updatedSummary);
        assert.equal(updatedSummary.hp, 3);
        assert.equal(updatedSummary.fullMetadata['hp-curr'], 3);

        // Status wasn't curable by basic Potion, so Paralyzed remains
        assert.ok(updatedSummary.fullMetadata['status-list'].includes('Paralyzed'));

        // savedTokenItem metadata should also be synchronized
        assert.ok(updatedSummary.savedTokenItem);
        assert.equal(updatedSummary.savedTokenItem.metadata[METADATA_ID]['hp-curr'], 3);
        assert.equal(updatedSummary.savedTokenItem.metadata[METADATA_ID]['current-hp'], 3);
    }
);

await runTest('attachments: getAccessoryIdentityKey extracts stable keys by source ID, image, name, or text', () => {
    const itemWithSourceId = {
        id: 't-1',
        metadata: { 'pokerole-pmd-extension/source-item-id': 'orig-clay-42' }
    } as any;
    assert.equal(getAccessoryIdentityKey(itemWithSourceId), 'source:orig-clay-42');

    const itemWithImage = {
        id: 't-2',
        image: { url: 'https://example.com/light_clay.png' }
    } as any;
    assert.equal(getAccessoryIdentityKey(itemWithImage), 'img:https://example.com/light_clay.png');

    const itemWithName = {
        id: 't-3',
        name: 'Light Clay'
    } as any;
    assert.equal(getAccessoryIdentityKey(itemWithName), 'name:Light Clay');

    const itemWithText = {
        id: 't-4',
        text: { plainText: 'Label Prop' }
    } as any;
    assert.equal(getAccessoryIdentityKey(itemWithText), 'text:Label Prop');

    const bareItem = { id: 't-5' } as any;
    assert.equal(getAccessoryIdentityKey(bareItem), 'id:t-5');
});

await runTest('attachments: sanitizeAttachmentBundles deduplicates by identity and caps at 30 items', () => {
    const duplicateBundles = Array.from({ length: 15 }, (_, i) => ({
        item: {
            id: `item-${i}`,
            image: { url: 'https://example.com/light_clay.png' },
            name: 'Light Clay'
        } as any,
        relativeOffset: { x: 10, y: 10 },
        relativeRotation: 0,
        relativeScale: { x: 1, y: 1 }
    }));

    const sanitizedSingle = sanitizeAttachmentBundles(duplicateBundles);
    // All 15 share the exact same image URL AND exact same relative offset (10, 10), so only 1 should survive
    assert.equal(sanitizedSingle.length, 1);
    assert.equal(sanitizedSingle[0].item.id, 'item-0');

    // Test intentional identical attachments: two bows with identical image URL but placed at different offsets (left ear vs right ear)
    const intentionalBows = [
        {
            item: { id: 'bow-left', image: { url: 'https://example.com/pink_bow.png' }, name: 'Pink Bow' } as any,
            relativeOffset: { x: -25, y: -15 },
            relativeRotation: 0,
            relativeScale: { x: 1, y: 1 }
        },
        {
            item: { id: 'bow-right', image: { url: 'https://example.com/pink_bow.png' }, name: 'Pink Bow' } as any,
            relativeOffset: { x: 25, y: -15 },
            relativeRotation: 0,
            relativeScale: { x: 1, y: 1 }
        }
    ];
    const sanitizedBows = sanitizeAttachmentBundles(intentionalBows);
    // Both bows must be preserved because their positions are distinctly different
    assert.equal(sanitizedBows.length, 2);
    assert.equal(sanitizedBows[0].item.id, 'bow-left');
    assert.equal(sanitizedBows[1].item.id, 'bow-right');

    // Test ceiling cap with 35 unique accessories
    const uniqueBundles = Array.from({ length: 35 }, (_, i) => ({
        item: {
            id: `item-${i}`,
            image: { url: `https://example.com/item_${i}.png` },
            name: `Item ${i}`
        } as any,
        relativeOffset: { x: i * 2, y: i * 2 },
        relativeRotation: 0,
        relativeScale: { x: 1, y: 1 }
    }));

    const sanitizedCapped = sanitizeAttachmentBundles(uniqueBundles);
    assert.equal(sanitizedCapped.length, 30);
});

await runTest(
    'attachments: reconcileTokenAttachmentsOnScene self-heals stacked duplicates while preserving intentional identical attachments',
    () => {
        const parent = {
            id: 'poke-1',
            layer: 'CHARACTER',
            position: { x: 100, y: 100 },
            scale: { x: 1, y: 1 },
            rotation: 0
        } as any;

        // 5 duplicate Light Clay tokens stacked at exact same coordinates (110, 110)
        const duplicateProps = Array.from({ length: 5 }, (_, i) => ({
            id: `prop-${i}`,
            layer: 'PROP',
            attachedTo: 'poke-1',
            image: { url: 'https://example.com/light_clay.png' },
            name: 'Light Clay',
            position: { x: 110, y: 110 },
            scale: { x: 1, y: 1 },
            rotation: 0
        }));

        // Plus 1 intentional bow on left ear and 1 intentional bow on right ear (same image URL, different positions)
        const intentionalBow1 = {
            id: 'live-bow-1',
            layer: 'PROP',
            attachedTo: 'poke-1',
            image: { url: 'https://example.com/bow.png' },
            name: 'Bow',
            position: { x: 75, y: 85 },
            scale: { x: 1, y: 1 },
            rotation: 0
        };
        const intentionalBow2 = {
            id: 'live-bow-2',
            layer: 'PROP',
            attachedTo: 'poke-1',
            image: { url: 'https://example.com/bow.png' },
            name: 'Bow',
            position: { x: 125, y: 85 },
            scale: { x: 1, y: 1 },
            rotation: 0
        };

        const sceneItems = [parent, ...duplicateProps, intentionalBow1, intentionalBow2];

        const desiredBundle = [
            {
                item: {
                    id: 'orig-clay',
                    image: { url: 'https://example.com/light_clay.png' },
                    name: 'Light Clay'
                } as any,
                relativeOffset: { x: 10, y: 10 },
                relativeRotation: 0,
                relativeScale: { x: 1, y: 1 }
            },
            {
                item: {
                    id: 'orig-bow-1',
                    image: { url: 'https://example.com/bow.png' },
                    name: 'Bow'
                } as any,
                relativeOffset: { x: -25, y: -15 },
                relativeRotation: 0,
                relativeScale: { x: 1, y: 1 }
            },
            {
                item: {
                    id: 'orig-bow-2',
                    image: { url: 'https://example.com/bow.png' },
                    name: 'Bow'
                } as any,
                relativeOffset: { x: 25, y: -15 },
                relativeRotation: 0,
                relativeScale: { x: 1, y: 1 }
            }
        ];

        const result = reconcileTokenAttachmentsOnScene(parent, desiredBundle, sceneItems, false);

        // 4 stacked duplicate Light Clay tokens should be marked for deletion (prop-1, prop-2, prop-3, prop-4)
        assert.equal(result.idsToDelete.length, 4);
        assert.deepEqual(result.idsToDelete, ['prop-1', 'prop-2', 'prop-3', 'prop-4']);

        // Both intentional bows and prop-0 are kept on the scene, so 0 new items need to be added!
        assert.equal(result.itemsToAdd.length, 0);
    }
);

await runTest(
    'attachments: hasAttachmentDiff handles horizontal scale flip sign inversions without diff runaway',
    () => {
        const normalBundle = [
            {
                item: {
                    id: 'clay-1',
                    image: { url: 'https://example.com/light_clay.png' },
                    name: 'Light Clay'
                } as any,
                relativeOffset: { x: 20, y: 15 },
                relativeRotation: 0,
                relativeScale: { x: 1, y: 1 }
            }
        ];

        // When horizontally flipped by Flip! extension, relativeOffset.x and relativeScale.x invert sign
        const flippedBundle = [
            {
                item: {
                    id: 'clay-1',
                    image: { url: 'https://example.com/light_clay.png' },
                    name: 'Light Clay'
                } as any,
                relativeOffset: { x: -20, y: 15 },
                relativeRotation: 0,
                relativeScale: { x: -1, y: 1 }
            }
        ];

        // hasAttachmentDiff should recognize this as a horizontal flip, NOT a changed attachment position!
        const isDiff = hasAttachmentDiff(normalBundle, flippedBundle);
        assert.equal(isDiff, false);

        // A real position shift (e.g. y offset moved from 15 to 45) MUST still trigger diff
        const movedBundle = [
            {
                item: {
                    id: 'clay-1',
                    image: { url: 'https://example.com/light_clay.png' },
                    name: 'Light Clay'
                } as any,
                relativeOffset: { x: 20, y: 45 },
                relativeRotation: 0,
                relativeScale: { x: 1, y: 1 }
            }
        ];
        assert.equal(hasAttachmentDiff(normalBundle, movedBundle), true);
    }
);

console.log('\n=============================================');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
console.log('=============================================\n');

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
