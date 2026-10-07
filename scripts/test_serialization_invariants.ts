import assert from 'node:assert/strict';
import { flattenStateToMetadata } from '../src/utils/sync/flattenStateToMetadata';
import type { CharacterState } from '../src/store/storeTypes';

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

let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void) {
    try {
        fn();
        console.log(`  ✓ PASS: ${name}`);
        passedCount++;
    } catch (err: unknown) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err);
        failedCount++;
    }
}

/**
 * Helper to generate a minimal valid CharacterState for testing serialization.
 */
function createTestCharacterState(overrides: Partial<CharacterState> = {}): CharacterState {
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
        trackers: { ...defaultState.trackers, ...(overrides.trackers || {}) }
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
        } as any
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
        } as any
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
        } as any
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
        } as any,
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

console.log('\n=============================================');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
console.log('=============================================\n');

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
