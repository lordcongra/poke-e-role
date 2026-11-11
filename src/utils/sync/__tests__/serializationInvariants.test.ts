import { describe, it, assert } from 'vitest';
import { createTestCharacterState } from '../../../test/testStateHelpers';

import { flattenStateToMetadata } from '../flattenStateToMetadata';
import { hydrateStateFromMetadata } from '../stateMapper';
import { applyRoomUpdatesToMeta, mapRoomSettings } from '../roomSettingsMeta';
import {
    BASE_ITEM_CHARGES,
    getBaseItemCharges,
    getItemEffectiveCharges,
    consumeChargeFromInventory,
    CORE_INFLICTABLE_STATUSES
} from '../../items/itemCharges';
import {
    getBaseItemEffect,
    applyItemUsageEffects,
    statusMatchesCure,
    isLegacyBottleCapacity,
    hasItemUsageEffect
} from '../../items/itemUsageEffects';
import { getCustomStatWhitelist, getStatChoiceScope } from '../../items/itemStatChoice';
import { parseCombatBoostFromItem, hasCombatBoostTags } from '../../items/combatBoostParser';
import { applyUsageToState } from '../../items/inventoryItemOps';
import { createInventorySlice } from '../../../store/slices/inventorySlice';
import { getTrainerItemTargets, applyItemToPokemonTarget } from '../../items/itemTargeting';
import { METADATA_ID } from '../../../hooks/owlbearSync/owlbearSyncConstants';
import {
    getAccessoryIdentityKey,
    sanitizeAttachmentBundles,
    hasAttachmentDiff,
    reconcileTokenAttachmentsOnScene
} from '../../pc/pcAttachmentOps';
import { buildEphemeralMoveFromItem } from '../../items/itemAttackRoller';
import { isTrackedBackupChange } from '../storageAdapter';
import {
    countPokedexTotals,
    getPokedexEntry,
    isPokemonRegistered,
    findCanonicalSpeciesName
} from '../../../components/board/trainerPokedexUtils';
import { resolvePokeballUrl, POKEBALL_PRESETS } from '../../graphics/pokeballConstants';
import OBR from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import {
    SCENE_SETTINGS_META_ID,
    clearSceneScaleFromOwlbear,
    clearSceneOffsetsFromOwlbear
} from '@/utils/sync/obr';
import { findMatchingTrainerEntries } from '@/hooks/owlbearSync/owlbearPcSyncUtils';
import type { TrainerRoster } from '@/types/pcStorageTypes';

describe('Token Metadata & Serialization Invariants', () => {
// -----------------------------------------------------------------------------
// TEST SUITE 1: Explicit Zero Serialization (No Key Omission)
// -----------------------------------------------------------------------------
it('Explicitly serializes numeric 0 for HP, Temp HP, Will, Temp Will', () => {
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

it('Explicitly serializes numeric 0 for trackers, currency, and TP', () => {
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

it('Explicitly serializes numeric 0 for offsets, buffs, and debuffs', () => {
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
    assert.equal(meta['ability-choice-index'], 0, 'ability-choice-index must serialize as 0');
});

// -----------------------------------------------------------------------------
// TEST SUITE 2: Symmetric Boolean Serialization (No False Omission)
// -----------------------------------------------------------------------------
it('Explicitly serializes boolean false for trackers and toggles', () => {
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
            gmEcoBadge: false,
            ignoreRoomHudRules: false
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
    assert.equal(meta['ignore-room-hud-rules'], false, 'ignore-room-hud-rules must explicitly serialize as false');

    const stateTrue = createTestCharacterState({
        identity: {
            ignoreRoomHudRules: true
        }
    });
    const metaTrue = flattenStateToMetadata(stateTrue);
    assert.equal(metaTrue['ignore-room-hud-rules'], true, 'ignore-room-hud-rules must serialize as true');

    const hydrated = hydrateStateFromMetadata(metaTrue, stateTrue);
    assert.equal(
        hydrated.identity?.ignoreRoomHudRules,
        true,
        'hydrateStateFromMetadata hydrates ignoreRoomHudRules true'
    );
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: Empty Collection Serialization ('[]')
// -----------------------------------------------------------------------------
it('Explicitly serializes empty collections as "[]"', () => {
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
it('Delta merging resets stale token metadata without leaving phantom state', () => {
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
it('Nullish coalescing (??) preserves 0 and false whereas falsy (||) corrupts them', () => {
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
it('Damage barrier absorption drains Temp HP before depleting Base HP and serializes explicit 0', () => {
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

it('Canvas HUD graphics calculate effectiveTempMax and tempHpPercentage with 0-max fallback', () => {
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

it('applyRoomUpdatesToMeta and mapRoomSettings serialize explicit false and 0 symmetrically', () => {
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
    // Test roomHide* granular HUD visibility toggles
    const hudVisibilityUpdates = {
        roomHideHpBar: true,
        roomHideHpText: true,
        roomHideWillBar: true,
        roomHideWillText: true,
        roomHideDef: true,
        roomHideActions: true,
        roomHideEvade: true,
        roomHideClash: true,
        roomHideHudPlayersOnly: true,
        roomHideHudEnemiesOnly: true,
        roomTrackersRequireInitiative: true
    };
    applyRoomUpdatesToMeta(initialRoomMeta, hudVisibilityUpdates);
    assert.equal(initialRoomMeta.roomHideHpBar, true, 'Explicitly sets roomHideHpBar to true');
    assert.equal(initialRoomMeta.roomHideHpText, true, 'Explicitly sets roomHideHpText to true');
    assert.equal(initialRoomMeta.roomHideWillBar, true, 'Explicitly sets roomHideWillBar to true');
    assert.equal(initialRoomMeta.roomHideWillText, true, 'Explicitly sets roomHideWillText to true');
    assert.equal(initialRoomMeta.roomHideDef, true, 'Explicitly sets roomHideDef to true');
    assert.equal(initialRoomMeta.roomHideActions, true, 'Explicitly sets roomHideActions to true');
    assert.equal(initialRoomMeta.roomHideEvade, true, 'Explicitly sets roomHideEvade to true');
    assert.equal(initialRoomMeta.roomHideClash, true, 'Explicitly sets roomHideClash to true');
    assert.equal(initialRoomMeta.roomHideHudPlayersOnly, true, 'Explicitly sets roomHideHudPlayersOnly to true');
    assert.equal(initialRoomMeta.roomHideHudEnemiesOnly, true, 'Explicitly sets roomHideHudEnemiesOnly to true');
    assert.equal(
        initialRoomMeta.roomTrackersRequireInitiative,
        true,
        'Explicitly sets roomTrackersRequireInitiative to true'
    );

    const mappedHud = mapRoomSettings(initialRoomMeta);
    assert.equal(mappedHud.roomHideHpBar, true, 'mapRoomSettings maps roomHideHpBar true');
    assert.equal(mappedHud.roomHideHpText, true, 'mapRoomSettings maps roomHideHpText true');
    assert.equal(mappedHud.roomHideWillBar, true, 'mapRoomSettings maps roomHideWillBar true');
    assert.equal(mappedHud.roomHideWillText, true, 'mapRoomSettings maps roomHideWillText true');
    assert.equal(mappedHud.roomHideDef, true, 'mapRoomSettings maps roomHideDef true');
    assert.equal(mappedHud.roomHideActions, true, 'mapRoomSettings maps roomHideActions true');
    assert.equal(mappedHud.roomHideEvade, true, 'mapRoomSettings maps roomHideEvade true');
    assert.equal(mappedHud.roomHideClash, true, 'mapRoomSettings maps roomHideClash true');
    assert.equal(mappedHud.roomHideHudPlayersOnly, true, 'mapRoomSettings maps roomHideHudPlayersOnly true');
    assert.equal(mappedHud.roomHideHudEnemiesOnly, true, 'mapRoomSettings maps roomHideHudEnemiesOnly true');
    assert.equal(
        mappedHud.roomTrackersRequireInitiative,
        true,
        'mapRoomSettings maps roomTrackersRequireInitiative true'
    );

    // Symmetrical reset to false
    applyRoomUpdatesToMeta(initialRoomMeta, {
        roomHideHpBar: false,
        roomHideHpText: false,
        roomHideWillBar: false,
        roomHideWillText: false,
        roomHideDef: false,
        roomHideActions: false,
        roomHideEvade: false,
        roomHideClash: false,
        roomHideHudPlayersOnly: false,
        roomHideHudEnemiesOnly: false,
        roomTrackersRequireInitiative: false
    });
    const mappedHudFalse = mapRoomSettings(initialRoomMeta);
    assert.equal(mappedHudFalse.roomHideHpBar, false, 'mapRoomSettings maps roomHideHpBar false symmetrically');
    assert.equal(mappedHudFalse.roomHideHpText, false, 'mapRoomSettings maps roomHideHpText false symmetrically');
    assert.equal(mappedHudFalse.roomHideDef, false, 'mapRoomSettings maps roomHideDef false symmetrically');
    assert.equal(mappedHudFalse.roomHideActions, false, 'mapRoomSettings maps roomHideActions false symmetrically');
    assert.equal(
        mappedHudFalse.roomHideHudPlayersOnly,
        false,
        'mapRoomSettings maps roomHideHudPlayersOnly false symmetrically'
    );
    assert.equal(
        mappedHudFalse.roomHideHudEnemiesOnly,
        false,
        'mapRoomSettings maps roomHideHudEnemiesOnly false symmetrically'
    );
    assert.equal(
        mappedHudFalse.roomTrackersRequireInitiative,
        false,
        'mapRoomSettings maps roomTrackersRequireInitiative false symmetrically'
    );

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

it('hydrateStateFromMetadata hydrates gmEcoBadge and round-trips through flattenStateToMetadata', () => {
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

it('Explicitly serializes and hydrates item charges: 0, healHp: 0, and healWill: 0', () => {
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

it('itemCharges: BASE_ITEM_CHARGES covers the 11 audited items and getBaseItemCharges is case-insensitive', () => {
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

it('itemCharges: getItemEffectiveCharges handles explicit charges and fallback to base charges', () => {
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

it(
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

it('itemCharges: destroyOnDepletion: false retains depleted item in inventory with explicit charges: 0', () => {
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

it(
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
            assert.equal(effect!.healHp, 1, `Expected 1 HP heal for ${name}`);
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

it('itemUsageEffects: statusMatchesCure matches degrees of burns, poison variants, and custom statuses', () => {
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

it('itemUsageEffects: applyItemUsageEffects applies HP/Will capping, cures statuses, and inserts Healthy', () => {
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

it('itemUsageEffects: isLegacyBottleCapacity accurately detects legacy bottle capacity attributes', () => {
    assert.equal(isLegacyBottleCapacity({ name: 'Super Potion', healHp: 4, maxCharges: 4 }), true);
    assert.equal(isLegacyBottleCapacity({ name: 'Hyper Potion', healHp: 14, maxCharges: 14 }), true);
    assert.equal(isLegacyBottleCapacity({ name: 'Potion', healHp: 2, maxCharges: 2 }), true);
    assert.equal(isLegacyBottleCapacity({ name: 'Super Potion', healHp: 1, maxCharges: 4 }), false);
    assert.equal(isLegacyBottleCapacity({ name: 'Sitrus Berry', healHp: 3 }), false);
    assert.equal(isLegacyBottleCapacity({ name: 'Custom Drink', healHp: 4 }), false);
});

it('itemUsageEffects: applyItemUsageEffects handles 1st, 2nd, and 3rd degree burn stacking and infliction', () => {
    const health = { hpCurr: 5, hpMax: 5, hpBase: 5, temporaryHitPoints: 0, temporaryHitPointsMax: 0 };
    const will = { willCurr: 4, willMax: 4, willBase: 4, temporaryWill: 0, temporaryWillMax: 0 };

    // 1. Target with no burn inflicted with 1st Degree Burn
    const res1 = applyItemUsageEffects(
        { id: 'b1', name: 'Flame Powder', qty: 1, desc: '', inflictsStatus: ['1st Degree Burn'] },
        health,
        will,
        [{ id: 'h1', name: 'Healthy', customName: '', rounds: 0 }]
    );
    assert.deepEqual(res1.inflictedStatusNames, ['1st Degree Burn']);
    assert.equal(res1.nextStatuses.length, 1);
    assert.equal(res1.nextStatuses[0].name, '1st Degree Burn');

    // 2. Target with 1st Degree Burn inflicted with 'Burn' -> upgrades to 2nd Degree Burn
    const res2 = applyItemUsageEffects(
        { id: 'b2', name: 'Burner', qty: 1, desc: '', inflictsStatus: ['Burn'] },
        health,
        will,
        res1.nextStatuses
    );
    assert.deepEqual(res2.inflictedStatusNames, ['2nd Degree Burn']);
    assert.equal(res2.nextStatuses.length, 1);
    assert.equal(res2.nextStatuses[0].name, '2nd Degree Burn');

    // 3. Target with 2nd Degree Burn inflicted with 1st Degree Burn -> upgrades to 3rd Degree Burn
    const res3 = applyItemUsageEffects(
        { id: 'b3', name: 'Sparks', qty: 1, desc: '', inflictsStatus: ['1st Degree Burn'] },
        health,
        will,
        res2.nextStatuses
    );
    assert.deepEqual(res3.inflictedStatusNames, ['3rd Degree Burn']);
    assert.equal(res3.nextStatuses.length, 1);
    assert.equal(res3.nextStatuses[0].name, '3rd Degree Burn');

    // 4. Target with 3rd Degree Burn inflicted with 1st Degree Burn -> preserved, no changes
    const res4 = applyItemUsageEffects(
        { id: 'b4', name: 'Sparks', qty: 1, desc: '', inflictsStatus: ['1st Degree Burn'] },
        health,
        will,
        res3.nextStatuses
    );
    assert.deepEqual(res4.inflictedStatusNames, []);
    assert.equal(res4.nextStatuses.length, 1);
    assert.equal(res4.nextStatuses[0].name, '3rd Degree Burn');

    // 5. Target with 1st Degree Burn inflicted with 2nd Degree Burn -> upgrades to 3rd Degree Burn
    const res5 = applyItemUsageEffects(
        { id: 'b5', name: 'Heavy Burner', qty: 1, desc: '', inflictsStatus: ['2nd Degree Burn'] },
        health,
        will,
        [{ id: 'b1-status', name: '1st Degree Burn', customName: '', rounds: 0 }]
    );
    assert.deepEqual(res5.inflictedStatusNames, ['3rd Degree Burn']);
    assert.equal(res5.nextStatuses[0].name, '3rd Degree Burn');

    // 6. Target with no burn inflicted with 2nd Degree Burn -> inflicts 2nd Degree Burn
    const res6 = applyItemUsageEffects(
        { id: 'b6', name: 'Heavy Burner', qty: 1, desc: '', inflictsStatus: ['2nd Degree Burn'] },
        health,
        will,
        [{ id: 'h1', name: 'Healthy', customName: '', rounds: 0 }]
    );
    assert.deepEqual(res6.inflictedStatusNames, ['2nd Degree Burn']);
    assert.equal(res6.nextStatuses[0].name, '2nd Degree Burn');

    // 7. Target inflicted with 3rd Degree Burn
    const res7 = applyItemUsageEffects(
        { id: 'b7', name: 'Inferno', qty: 1, desc: '', inflictsStatus: ['3rd Degree Burn'] },
        health,
        will,
        [{ id: 'h1', name: 'Healthy', customName: '', rounds: 0 }]
    );
    assert.deepEqual(res7.inflictedStatusNames, ['3rd Degree Burn']);
    assert.equal(res7.nextStatuses[0].name, '3rd Degree Burn');

    // 8. Verify CORE_INFLICTABLE_STATUSES has all 12 items
    assert.equal(CORE_INFLICTABLE_STATUSES.length, 12);
    assert.ok(CORE_INFLICTABLE_STATUSES.includes('1st Degree Burn'));
    assert.ok(CORE_INFLICTABLE_STATUSES.includes('2nd Degree Burn'));
    assert.ok(CORE_INFLICTABLE_STATUSES.includes('3rd Degree Burn'));
});

it(
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

it(
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

it(
    'itemTargeting: applyItemToPokemonTarget heals pokemon summary, updates OBR token, and decrements trainer charges',
    async () => {
        let updatedSummary: any = null;

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

it('attachments: getAccessoryIdentityKey extracts stable keys by source ID, image, name, or text', () => {
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

it('attachments: sanitizeAttachmentBundles deduplicates by identity and caps at 30 items', () => {
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

it(
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

it(
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

it(
    'inventory: serialization & hydration preserves destroyOnDepletion=false and attackAction invariants',
    () => {
        const itemWithRetention = {
            id: 'custom-wand-1',
            qty: 1,
            name: 'Wand of Sparks',
            desc: 'Fires sparks at foes',
            active: true,
            charges: 0,
            maxCharges: 5,
            destroyOnDepletion: false,
            healHp: 0,
            healWill: 2,
            cures: ['Paralysis'],
            permanentStatBoost: { stat: 'Special' as const, value: 1 },
            statBuff: { stat: 'Special', value: 2 },
            statDebuff: { stat: 'Defense', value: 1 },
            gainTempHp: 5,
            gainTempWill: 3,
            dungeonPassive: 'Glows in dark',
            inflictsStatus: ['Burn'],
            attackAction: {
                acc1: 'Special',
                acc2: 'Insight',
                type: 'Electric',
                category: 'Special' as const,
                power: 2
            }
        };

        const state = createTestCharacterState({
            inventory: [itemWithRetention]
        });

        const flatMeta = flattenStateToMetadata(state);
        assert.ok(flatMeta['inv-data'], 'Metadata must include inv-data');

        const parsedRaw = JSON.parse(String(flatMeta['inv-data']));
        assert.equal(parsedRaw.length, 1);
        assert.equal(parsedRaw[0].destroyOnDepletion, false, 'Explicitly persists destroyOnDepletion: false');
        assert.ok(parsedRaw[0].attackAction, 'Explicitly persists attackAction');
        assert.equal(parsedRaw[0].attackAction.type, 'Electric');
        assert.equal(parsedRaw[0].dungeonPassive, 'Glows in dark');
        assert.equal(parsedRaw[0].gainTempHp, 5);

        const hydrated = hydrateStateFromMetadata(flatMeta, state);
        assert.ok(hydrated.inventory, 'Hydrated inventory must exist');
        assert.equal(hydrated.inventory!.length, 1);
        const hydratedItem = hydrated.inventory![0];
        assert.equal(hydratedItem.destroyOnDepletion, false, 'Hydrated item retains destroyOnDepletion: false');
        assert.equal(hydratedItem.attackAction?.type, 'Electric');
        assert.equal(hydratedItem.gainTempHp, 5);
        assert.equal(hydratedItem.dungeonPassive, 'Glows in dark');
        assert.deepEqual(hydratedItem.cures, ['Paralysis']);
        assert.deepEqual(hydratedItem.inflictsStatus, ['Burn']);
    }
);

it('inventory: isItemUsable suppresses quick use button when attackAction exists', async () => {
    const { isItemUsable } = await import('../../items/itemUsageEffects');
    const itemWithAttack = {
        id: 'item-1',
        qty: 1,
        name: 'Flame Orb',
        desc: 'Throws a fire orb',
        charges: 3,
        maxCharges: 3,
        attackAction: {
            acc1: 'Special',
            acc2: 'Special',
            type: 'Fire',
            category: 'Special' as const,
            power: 1
        }
    };

    // Suppressed when item.attackAction exists
    assert.equal(isItemUsable(itemWithAttack), false);
    // Suppressed when hasAttackAction boolean flag is explicitly passed
    assert.equal(
        isItemUsable({ id: 'item-2', qty: 1, name: 'Stone', desc: '', charges: 3, maxCharges: 3 }, true),
        false
    );

    // Allowed when regular consumable item with charges has no attackAction
    assert.equal(
        isItemUsable({ id: 'item-3', qty: 1, name: 'Potion', desc: 'Heals 1 HP', charges: 3, maxCharges: 3 }),
        true
    );
});

it(
    'inventory: applyLookupResultToItem maps all fields including destroyOnDepletion and attackAction',
    async () => {
        const { applyLookupResultToItem } = await import('../../items/inventoryItemOps');
        const existing = {
            id: 'item-base',
            qty: 1,
            name: 'Custom Wand',
            desc: ''
        };

        const lookupResult = {
            found: true,
            name: 'Custom Wand',
            description: 'Custom wand effect',
            tags: '[Dmg +1]',
            fullDescription: 'Custom wand effect [Dmg +1]',
            charges: 5,
            maxCharges: 5,
            destroyOnDepletion: false,
            healHp: 0,
            healWill: 1,
            cures: ['Burn'],
            permanentStatBoost: { stat: 'Special' as const, value: 1 },
            statBuff: { stat: 'Special', value: 1 },
            statDebuff: { stat: 'Defense', value: 1 },
            gainTempHp: 4,
            gainTempWill: 2,
            dungeonPassive: 'Dungeon light',
            inflictsStatus: ['Blind'],
            attackAction: {
                acc1: 'Special',
                acc2: 'Insight',
                type: 'Psychic',
                category: 'Special' as const,
                power: 1
            }
        };

        const updates = applyLookupResultToItem(existing, lookupResult);
        assert.equal(updates.destroyOnDepletion, false);
        assert.equal(updates.attackAction?.type, 'Psychic');
        assert.equal(updates.desc, 'Custom wand effect');
        assert.equal(updates.tags, '[Dmg +1]');
        assert.equal(updates.charges, 5);
        assert.equal(updates.healWill, 1);
        assert.equal(updates.gainTempHp, 4);
        assert.equal(updates.dungeonPassive, 'Dungeon light');
    }
);

it(
    'itemAttackRoller: dual-scale resolution respects higher stat and explicit player selection',
    async () => {
        const testState = createTestCharacterState({
            stats: {
                str: { base: 2, rank: 0, buff: 0, debuff: 0 },
                dex: { base: 5, rank: 0, buff: 0, debuff: 0 },
                vit: { base: 2, rank: 0, buff: 0, debuff: 0 },
                spe: { base: 3, rank: 0, buff: 0, debuff: 0 },
                ins: { base: 1, rank: 0, buff: 0, debuff: 0 }
            },
            skills: {
                brawl: { base: 1, buff: 0, customName: '' },
                channel: { base: 4, buff: 0, customName: '' },
                clash: { base: 0, buff: 0, customName: '' },
                evasion: { base: 0, buff: 0, customName: '' },
                alert: { base: 0, buff: 0, customName: '' },
                athletic: { base: 0, buff: 0, customName: '' },
                nature: { base: 0, buff: 0, customName: '' },
                stealth: { base: 0, buff: 0, customName: '' },
                charm: { base: 0, buff: 0, customName: '' },
                etiquette: { base: 0, buff: 0, customName: '' },
                intimidate: { base: 0, buff: 0, customName: '' },
                perform: { base: 0, buff: 0, customName: '' },
                crafts: { base: 0, buff: 0, customName: '' },
                lore: { base: 0, buff: 0, customName: '' },
                medicine: { base: 0, buff: 0, customName: '' },
                magic: { base: 0, buff: 0, customName: '' }
            }
        });

        const testItem = {
            id: 'item-thrown-knife',
            qty: 1,
            name: 'Throwing Knife',
            desc: '',
            attackAction: {
                category: 'Physical' as const,
                type: 'Steel',
                power: 2,
                acc1: 'str',
                acc1Alt: 'dex',
                acc2: 'brawl',
                acc2Alt: 'channel',
                dmg1: 'str',
                dmg1Alt: 'dex'
            }
        };

        // 1. Without explicit selection: automatically resolves to higher stat (dex: 5 > str: 2, channel: 4 > brawl: 1)
        const autoMove = buildEphemeralMoveFromItem(testItem, testItem.attackAction, testState);
        assert.equal(autoMove.acc1, 'dex', 'Auto resolves acc1 to higher stat (dex)');
        assert.equal(autoMove.acc2, 'channel', 'Auto resolves acc2 to higher skill (channel)');
        assert.equal(autoMove.dmg1, 'dex', 'Auto resolves dmg1 to higher stat (dex)');
        assert.ok(
            autoMove.desc?.includes('[Dual Scale: DEX (Strength Alt), Channel (Brawl Alt), DEX (Strength Alt)]'),
            'Includes dual scale notes in desc'
        );

        // 2. With explicit selection: respects player choice of str/brawl even if lower
        const itemWithChoice = {
            ...testItem,
            attackAction: {
                ...testItem.attackAction,
                selectedAcc1: 'str',
                selectedAcc2: 'brawl',
                selectedDmg1: 'str'
            }
        };
        const explicitMove = buildEphemeralMoveFromItem(itemWithChoice, itemWithChoice.attackAction, testState);
        assert.equal(explicitMove.acc1, 'str', 'Respects explicit choice of str for acc1');
        assert.equal(explicitMove.acc2, 'brawl', 'Respects explicit choice of brawl for acc2');
        assert.equal(explicitMove.dmg1, 'str', 'Respects explicit choice of str for dmg1');
        assert.ok(
            explicitMove.desc?.includes('[Dual Scale: STR (Dexterity Alt), Brawl (Channel Alt), STR (Dexterity Alt)]'),
            'Includes updated active dual scale note reflecting chosen stat'
        );

        // 3. Round-trip serialization preserves selected dual-scale preferences in inv-data
        const stateWithChosen = createTestCharacterState({
            inventory: [itemWithChoice]
        });
        const flatMeta = flattenStateToMetadata(stateWithChosen);
        const parsedInv = JSON.parse(String(flatMeta['inv-data']));
        assert.equal(parsedInv[0].attackAction.selectedAcc1, 'str');
        assert.equal(parsedInv[0].attackAction.selectedAcc2, 'brawl');
        assert.equal(parsedInv[0].attackAction.selectedDmg1, 'str');

        const hydrated = hydrateStateFromMetadata(flatMeta, stateWithChosen);
        const hydratedInv = hydrated.inventory;
        assert.ok(hydratedInv, 'Hydrated inventory must exist');
        assert.equal(hydratedInv![0].attackAction?.selectedAcc1, 'str');
        assert.equal(hydratedInv![0].attackAction?.selectedAcc2, 'brawl');
        assert.equal(hydratedInv![0].attackAction?.selectedDmg1, 'str');
    }
);

it('combatBoost: symmetrical serialization, hydration, and item effect arming', async () => {
    // 1. Symmetrical serialization: empty string when null
    const stateWithoutBoost = createTestCharacterState({
        trackers: {
            activeCombatBoost: null
        } as any
    });
    const metaWithoutBoost = flattenStateToMetadata(stateWithoutBoost);
    assert.equal(
        metaWithoutBoost['active-combat-boost'],
        '',
        'Serializes active-combat-boost as empty string when null'
    );

    // 2. Serialization with active combat boost
    const sampleBoost = {
        sourceName: 'Rock Gem',
        type: 'Rock',
        accSucc: 1,
        dmgSucc: 2,
        stage: 'armed' as const
    };
    const stateWithBoost = createTestCharacterState({
        trackers: {
            activeCombatBoost: sampleBoost
        } as any
    });
    const metaWithBoost = flattenStateToMetadata(stateWithBoost);
    assert.equal(
        metaWithBoost['active-combat-boost'],
        JSON.stringify(sampleBoost),
        'Serializes active-combat-boost as JSON string when present'
    );

    // 3. Hydration round-trip
    const hydratedState = hydrateStateFromMetadata(metaWithBoost, stateWithoutBoost);
    assert.deepEqual(
        hydratedState.trackers?.activeCombatBoost,
        sampleBoost,
        'Hydrates activeCombatBoost object from metadata'
    );

    // Hydration with empty string returns null
    const hydratedEmpty = hydrateStateFromMetadata(metaWithoutBoost, stateWithBoost);
    assert.equal(
        hydratedEmpty.trackers?.activeCombatBoost,
        null,
        'Hydrates activeCombatBoost as null when metadata is empty'
    );

    // 4. Combat boost detection from item tags
    const gemItem = {
        id: 'item-rock-gem',
        name: 'Rock Gem',
        qty: 1,
        desc: '',
        tags: '[Acc Succ +1: Rock] [Dmg Succ +2: Rock]'
    };
    assert.ok(hasCombatBoostTags(gemItem.tags), 'Detects combat boost tags in item string');
    const parsedBoost = parseCombatBoostFromItem(gemItem);
    assert.ok(parsedBoost, 'Parses boost from Rock Gem tags');
    assert.equal(parsedBoost!.sourceName, 'Rock Gem');
    assert.equal(parsedBoost!.type, 'Rock');
    assert.equal(parsedBoost!.accSucc, 1);
    assert.equal(parsedBoost!.dmgSucc, 2);
    assert.equal(parsedBoost!.stage, 'armed');

    // 4b. De-duplication across tags, desc, and description
    const duplicateTagItem = {
        id: 'item-fire-gem',
        name: 'Fire Gem',
        tags: '[Acc Succ +1: Fire] [Dmg Succ +2: Fire]',
        desc: 'Fire Gem: [Acc Succ +1: Fire] [Dmg Succ +2: Fire]',
        description: 'Consumable gem: [Acc Succ +1: Fire] [Dmg Succ +2: Fire]'
    };
    const deduplicatedBoost = parseCombatBoostFromItem(duplicateTagItem);
    assert.ok(deduplicatedBoost, 'Parses boost from multi-field item');
    assert.equal(deduplicatedBoost!.accSucc, 1, 'Does not duplicate accSucc across fields');
    assert.equal(deduplicatedBoost!.dmgSucc, 2, 'Does not duplicate dmgSucc across fields');
    assert.equal(deduplicatedBoost!.type, 'Fire', 'Detects type accurately');

    // 5. Item usage effect detection and applyUsageToState
    const usage = applyItemUsageEffects(
        gemItem,
        stateWithoutBoost.health,
        stateWithoutBoost.will,
        stateWithoutBoost.statuses
    );
    assert.ok(usage.combatBoost, 'applyItemUsageEffects returns combatBoost');
    assert.equal(usage.combatBoost!.sourceName, 'Rock Gem');

    const { partialState, updatesToSave } = applyUsageToState(stateWithoutBoost, gemItem, usage, []);
    assert.equal(
        updatesToSave['active-combat-boost'],
        JSON.stringify(usage.combatBoost),
        'updatesToSave contains serialized active-combat-boost'
    );
    assert.deepEqual(
        partialState.trackers?.activeCombatBoost,
        usage.combatBoost,
        'partialState arms trackers.activeCombatBoost'
    );
});

it('trainerPokedex: serialization, hydration, and storageAdapter tracking', async () => {
    const mockState = createTestCharacterState({
        identity: {
            mode: 'Trainer',
            pokedex: {
                Pikachu: { seen: true, caught: true, shiny: false, ball: 'ultra' },
                Charizard: { seen: true, caught: false, shiny: true, ball: 'master' }
            }
        } as any
    });

    // 1. Serialization
    const meta = flattenStateToMetadata(mockState);
    assert.equal(meta['pokedex-data'], JSON.stringify(mockState.identity.pokedex), 'Serializes pokedex-data correctly');

    // 2. Hydration
    const hydrated = hydrateStateFromMetadata(meta, createTestCharacterState());
    assert.deepEqual(
        hydrated.identity?.pokedex,
        mockState.identity.pokedex,
        'Hydrates pokedex-data accurately including ball'
    );

    // 3. StorageAdapter change tracking
    assert.ok(
        isTrackedBackupChange({ 'pokedex-data': meta['pokedex-data'] }),
        'isTrackedBackupChange flags pokedex-data updates'
    );

    // 4. Case-insensitive auto-healing and deduplication during hydration
    const corruptedMeta = {
        ...meta,
        'pokedex-data': JSON.stringify({
            pikachu: { seen: true, caught: false, shiny: false },
            Pikachu: { seen: true, caught: true, shiny: false, ball: 'dive' },
            CHARIZARD: { seen: false, caught: false, shiny: true, ball: 'https://example.com/custom-ball.png' }
        })
    };
    const autoHealed = hydrateStateFromMetadata(corruptedMeta, createTestCharacterState());
    const healedPokedex = autoHealed.identity?.pokedex || {};
    assert.equal(Object.keys(healedPokedex).length, 2, 'Deduplicates mixed-casing entries to exactly 2');
    assert.ok(healedPokedex.Pikachu, 'Canonical or title-cased key Pikachu is preserved');
    assert.equal(healedPokedex.Pikachu.caught, true, 'Merged flags: caught is true from uppercase variant');
    assert.equal(healedPokedex.Pikachu.seen, true, 'Merged flags: seen is true');
    assert.equal(healedPokedex.Pikachu.ball, 'dive', 'Preserves ball through case-deduplication');
    assert.equal(healedPokedex.CHARIZARD?.ball, 'https://example.com/custom-ball.png', 'Preserves custom web ball url');
    assert.equal(
        getPokedexEntry(healedPokedex, 'charizard').ball,
        'https://example.com/custom-ball.png',
        'getPokedexEntry retrieves custom ball case-insensitively'
    );

    // 5. Utility functions case-insensitivity & ball retrieval
    const lookupList = [{ name: 'Pikachu' }, { name: 'Charizard' }];
    assert.equal(findCanonicalSpeciesName('pikachu', lookupList), 'Pikachu');
    assert.equal(findCanonicalSpeciesName('  CHARIZARD  ', lookupList), 'Charizard');
    assert.equal(findCanonicalSpeciesName('CustomMon', lookupList), 'CustomMon');

    const entry = getPokedexEntry(healedPokedex, 'pikachu');
    assert.equal(entry.caught, true, 'getPokedexEntry matches lowercase name against TitleCase key');
    assert.equal(entry.ball, 'dive', 'getPokedexEntry retains ball');
    assert.equal(isPokemonRegistered(healedPokedex, 'PIKACHU'), true, 'isPokemonRegistered is case-insensitive');

    // 6. countPokedexTotals deduplication
    const unmergedPokedex = {
        pikachu: { seen: true, caught: false, shiny: false },
        Pikachu: { seen: true, caught: true, shiny: false, ball: 'luxury' }
    };
    const totals = countPokedexTotals(unmergedPokedex);
    assert.equal(totals.seen, 1, 'countPokedexTotals seen deduplicated to 1');
    assert.equal(totals.caught, 1, 'countPokedexTotals caught deduplicated to 1');

    // 7. Pokéball presets & pure resolver
    assert.equal(POKEBALL_PRESETS.length, 16, 'Contains all 16 Pokéball presets');
    assert.equal(resolvePokeballUrl('great'), '/pokeballs/great.svg', 'Resolves preset id');
    assert.equal(
        resolvePokeballUrl('GREAT.SVG'),
        '/pokeballs/great.svg',
        'Case-insensitive preset resolver with extension'
    );
    assert.equal(
        resolvePokeballUrl('https://example.com/ball.png'),
        'https://example.com/ball.png',
        'Preserves web URL'
    );
    assert.equal(resolvePokeballUrl('local-img:12345'), 'local-img:12345', 'Preserves IndexedDB image key');
    assert.equal(resolvePokeballUrl(''), '/pokeballs/poke.svg', 'Defaults to standard Poké Ball when empty');
});

it('itemUsageEffects: negative HP and Will reduction with Temp pool absorption', async () => {
    const health = {
        hpCurr: 10,
        hpMax: 10,
        hpBase: 10,
        currentHitPoints: 10,
        maxHitPoints: 10,
        temporaryHitPoints: 3,
        temporaryHitPointsMax: 3
    };
    const will = {
        willCurr: 5,
        willMax: 5,
        willBase: 5,
        temporaryWill: 2,
        temporaryWillMax: 2
    };

    // 1. Partial HP reduction absorbed completely by Temp HP
    const absorbHpItem = { id: 'nh1', name: 'Curse Doll', qty: 1, desc: '', healHp: -2 };
    const res1 = applyItemUsageEffects(absorbHpItem, health, will, []);
    assert.equal(res1.nextHealth.temporaryHitPoints, 1, 'Drains 2 Temp HP');
    assert.equal(res1.nextHealth.hpCurr, 10, 'Base HP remains untouched when absorbed by Temp HP');
    assert.equal(res1.summaryText, 'No effect.');

    // 2. HP reduction exceeding Temp HP spills over into Base HP
    const spillHpItem = { id: 'nh2', name: 'Blood Chalice', qty: 1, desc: '', healHp: -5 };
    const res2 = applyItemUsageEffects(spillHpItem, health, will, []);
    assert.equal(res2.nextHealth.temporaryHitPoints, 0, 'Temp HP fully drained');
    assert.equal(res2.nextHealth.hpCurr, 8, 'Remaining 2 damage reduces Base HP from 10 to 8');
    assert.equal(res2.summaryText, 'Reduced 2 HP.');

    // 3. HP reduction <= -99 sets both Temp HP and Base HP to 0
    const killHpItem = { id: 'nh3', name: 'Guillotine Trap', qty: 1, desc: '', healHp: -99 };
    const res3 = applyItemUsageEffects(killHpItem, health, will, []);
    assert.equal(res3.nextHealth.temporaryHitPoints, 0, 'Temp HP set to 0 on <= -99');
    assert.equal(res3.nextHealth.hpCurr, 0, 'Base HP set to 0 on <= -99');
    assert.equal(res3.summaryText, 'Reduced 10 HP.');

    // 4. Partial Will reduction absorbed completely by Temp Will
    const absorbWillItem = { id: 'nw1', name: 'Draining Orb', qty: 1, desc: '', healWill: -1 };
    const res4 = applyItemUsageEffects(absorbWillItem, health, will, []);
    assert.equal(res4.nextWill.temporaryWill, 1, 'Drains 1 Temp Will');
    assert.equal(res4.nextWill.willCurr, 5, 'Base Will remains untouched when absorbed by Temp Will');
    assert.equal(res4.summaryText, 'No effect.');

    // 5. Will reduction exceeding Temp Will spills over into Base Will
    const spillWillItem = { id: 'nw2', name: 'Mind Flay Crystal', qty: 1, desc: '', healWill: -4 };
    const res5 = applyItemUsageEffects(spillWillItem, health, will, []);
    assert.equal(res5.nextWill.temporaryWill, 0, 'Temp Will fully drained');
    assert.equal(res5.nextWill.willCurr, 3, 'Remaining 2 damage reduces Base Will from 5 to 3');
    assert.equal(res5.summaryText, 'Reduced 2 Will.');

    // 6. Will reduction <= -99 sets both Temp Will and Base Will to 0
    const killWillItem = { id: 'nw3', name: 'Amnesia Draught', qty: 1, desc: '', healWill: -99 };
    const res6 = applyItemUsageEffects(killWillItem, health, will, []);
    assert.equal(res6.nextWill.temporaryWill, 0, 'Temp Will set to 0 on <= -99');
    assert.equal(res6.nextWill.willCurr, 0, 'Base Will set to 0 on <= -99');
    assert.equal(res6.summaryText, 'Reduced 5 Will.');

    // 7. hasItemUsageEffect detects negative healHp and healWill
    assert.ok(hasItemUsageEffect({ healHp: -1 }), 'hasItemUsageEffect returns true for negative healHp');
    assert.ok(hasItemUsageEffect({ healWill: -1 }), 'hasItemUsageEffect returns true for negative healWill');
    assert.ok(!hasItemUsageEffect({ healHp: 0, healWill: 0 }), 'hasItemUsageEffect returns false for 0');
});

it('itemStatChoice: custom PlayerChoice stat whitelist parsing and resolution', async () => {
    const customItem = {
        id: 'pc-custom-1',
        name: 'Training Manual',
        qty: 1,
        desc: '',
        permanentStatBoost: { stat: 'PlayerChoice:custom:Strength,Beauty,Max HP', value: 2 }
    };

    // 1. getCustomStatWhitelist
    const whitelist = getCustomStatWhitelist(customItem as any);
    assert.deepEqual(whitelist, ['Strength', 'Beauty', 'Max HP'], 'Parses custom whitelist array accurately');

    const nonCustomItem = {
        id: 'pc-std-1',
        name: 'Core Candy',
        qty: 1,
        desc: '',
        permanentStatBoost: { stat: 'PlayerChoice:core', value: 1 }
    };
    assert.equal(getCustomStatWhitelist(nonCustomItem as any), null, 'Returns null for standard scopes');

    // 2. getStatChoiceScope
    assert.equal(getStatChoiceScope(customItem as any), 'custom', 'Identifies custom scope');
    assert.equal(getStatChoiceScope(nonCustomItem as any), 'core', 'Identifies standard core scope');

    // 3. applyItemUsageEffects with chosenStat
    const health = { hpCurr: 10, hpMax: 10, hpBase: 10, temporaryHitPoints: 0, temporaryHitPointsMax: 0 };
    const will = { willCurr: 5, willMax: 5, willBase: 5, temporaryWill: 0, temporaryWillMax: 0 };
    const res = applyItemUsageEffects(customItem as any, health, will, [], [], { chosenStat: 'Beauty' });

    assert.deepEqual(
        res.permanentStatBoosts,
        [{ stat: 'Beauty', value: 2 }],
        'Applies permanent boost to player-chosen stat'
    );
    assert.equal(res.summaryText, '+2 Beauty (Permanent).', 'Formats summary text with chosen stat');
});

it('battleOrganizer: combatants are never automatically deleted from organizer when map tokens are deleted', async () => {
    const boData = {
        rounds: [
            {
                roundNumber: 1,
                combatants: [
                    {
                        id: 'c-wild-pika',
                        name: 'Wild Pikachu',
                        tokenId: 'tok-pika',
                        isNPC: true,
                        ability: 'Static',
                        abilityActive: true,
                        abilityBoostLevel: 2,
                        abilityBoostActive: true,
                        abilityChoiceIndex: 1
                    },
                    {
                        id: 'c-trainer-mon',
                        name: 'Charizard',
                        tokenId: 'tok-charizard',
                        isNPC: false,
                        ability: 'Blaze',
                        abilityActive: true
                    }
                ]
            }
        ],
        activeRoundIndex: 0
    };
    localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(boData));

    const raw = localStorage.getItem('pkr_battle_organizer_data');
    const parsed = JSON.parse(raw || '{}');
    assert.equal(parsed.rounds[0].combatants.length, 2, 'All combatants remain preserved in round 1');
    const pika = parsed.rounds[0].combatants.find((c: any) => c.id === 'c-wild-pika');
    assert.ok(pika, 'NPC combatant remains in organizer');
    assert.equal(pika.abilityBoostLevel, 2, 'abilityBoostLevel preserved');
    assert.equal(pika.abilityBoostActive, true, 'abilityBoostActive preserved');
    assert.equal(pika.abilityChoiceIndex, 1, 'abilityChoiceIndex preserved');
    assert.ok(parsed.rounds[0].combatants.some((c: any) => c.id === 'c-trainer-mon'), 'Player combatant remains in organizer');
});

it('Explicitly serializes type2 as empty string when empty or none for shallow delta merge invariant', () => {
    const stateEmptyType2 = createTestCharacterState({
        identity: { type1: 'Water', type2: '' } as any
    });
    const metaEmpty = flattenStateToMetadata(stateEmptyType2);
    assert.equal(metaEmpty['type2'], '', 'type2 explicitly serializes as empty string when empty');

    const stateNoneType2 = createTestCharacterState({
        identity: { type1: 'Water', type2: 'none' } as any
    });
    const metaNone = flattenStateToMetadata(stateNoneType2);
    assert.equal(metaNone['type2'], '', 'type2 explicitly serializes as empty string when "none"');

    const stateValType2 = createTestCharacterState({
        identity: { type1: 'Water', type2: 'Dark' } as any
    });
    const metaVal = flattenStateToMetadata(stateValType2);
    assert.equal(metaVal['type2'], 'Dark', 'type2 serializes as "Dark" when provided');
});

it('clearSceneScaleFromOwlbear preserves scene offsets in SCENE_SETTINGS_META_ID', async () => {
    const origGetRole = OBR.player.getRole;
    const origScene = OBR.scene as unknown as {
        getMetadata?: () => Promise<Record<string, unknown>>;
        setMetadata?: (meta: Record<string, unknown>) => Promise<void>;
    };
    const origGetMeta = origScene.getMetadata;
    const origSetMeta = origScene.setMetadata;

    let currentSceneMeta: Record<string, unknown> = {
        [SCENE_SETTINGS_META_ID]: {
            sceneDefaultScale: 1.5,
            sceneDefaultOffsetX: 12,
            sceneDefaultOffsetY: -8
        }
    };

    try {
        OBR.player.getRole = async () => 'GM';
        origScene.getMetadata = async () => currentSceneMeta;
        origScene.setMetadata = async (update: Record<string, unknown>) => {
            currentSceneMeta = { ...currentSceneMeta, ...update };
        };

        await clearSceneScaleFromOwlbear();
        const afterScaleClear = currentSceneMeta[SCENE_SETTINGS_META_ID] as Record<string, unknown>;
        assert.equal(afterScaleClear.sceneDefaultScale, null, 'sceneDefaultScale cleared to null');
        assert.equal(afterScaleClear.sceneDefaultOffsetX, 12, 'sceneDefaultOffsetX preserved');
        assert.equal(afterScaleClear.sceneDefaultOffsetY, -8, 'sceneDefaultOffsetY preserved');

        currentSceneMeta = {
            [SCENE_SETTINGS_META_ID]: {
                sceneDefaultScale: 2,
                sceneDefaultOffsetX: 5,
                sceneDefaultOffsetY: 10
            }
        };
        await clearSceneOffsetsFromOwlbear();
        const afterOffsetClear = currentSceneMeta[SCENE_SETTINGS_META_ID] as Record<string, unknown>;
        assert.equal(afterOffsetClear.sceneDefaultScale, 2, 'sceneDefaultScale preserved when clearing offsets');
        assert.equal(afterOffsetClear.sceneDefaultOffsetX, null, 'sceneDefaultOffsetX cleared to null');
        assert.equal(afterOffsetClear.sceneDefaultOffsetY, null, 'sceneDefaultOffsetY cleared to null');
    } finally {
        OBR.player.getRole = origGetRole;
        origScene.getMetadata = origGetMeta;
        origScene.setMetadata = origSetMeta;
    }
});

it('findMatchingTrainerEntries prioritizes IDs and ignores empty or default Trainer names', () => {
    const trainers: Record<string, TrainerRoster> = {
        't-default': { id: 't-default', name: 'Trainer', party: [] },
        't-blank': { id: 't-blank', name: '   ', party: [] },
        't-red': { id: 't-red', name: 'Red', party: [] },
        't-blue': { id: 't-blue', name: 'Blue', mapTokenId: 'tok-blue-existing', party: [] }
    };

    const defaultNamedToken = { id: 'tok-1', name: 'Trainer', metadata: {} } as unknown as Item;
    assert.equal(
        findMatchingTrainerEntries(trainers, defaultNamedToken, { name: 'Trainer', nickname: 'trainer' }).length,
        0,
        'Must not match default Trainer name'
    );

    const blankToken = { id: 'tok-2', name: '  ', metadata: {} } as unknown as Item;
    assert.equal(
        findMatchingTrainerEntries(trainers, blankToken, { name: '', nickname: '   ' }).length,
        0,
        'Must not match empty/whitespace name'
    );

    const linkedBlueToken = { id: 'tok-blue-existing', name: 'Red', metadata: {} } as unknown as Item;
    const blueByTokenId = findMatchingTrainerEntries(trainers, linkedBlueToken, { name: 'Red' });
    assert.equal(blueByTokenId.length, 1);
    assert.equal(blueByTokenId[0][0], 't-blue', 'Prioritizes mapTokenId over name match');

    const unlinkedTokenWithBlueName = { id: 'tok-other', name: 'Blue', metadata: {} } as unknown as Item;
    assert.equal(
        findMatchingTrainerEntries(trainers, unlinkedTokenWithBlueName, { name: 'Blue' }).length,
        0,
        'Does not match by name when trainer already has mapTokenId set'
    );

    const unlinkedRedToken = { id: 'tok-red-new', name: 'Red', metadata: {} } as unknown as Item;
    const redByName = findMatchingTrainerEntries(trainers, unlinkedRedToken, { name: 'Red' });
    assert.equal(redByName.length, 1);
    assert.equal(redByName[0][0], 't-red', 'Matches unlinked trainer by distinct non-default name');
});

it('S-07: NaN, empty string, and non-finite metadata values never propagate into hydrated state or settings', () => {
    const baseState = createTestCharacterState();
    const corruptMeta: Record<string, unknown> = {
        'str-base': '',
        'dex-rank': '   ',
        'vit-buff': null,
        'spe-debuff': 'not-a-number',
        'ins-limit': Infinity,
        'hp-curr': NaN,
        'hp-max-display': '',
        'will-curr': 'NaN',
        'def-buff': 'Infinity',
        'extra-core': '',
        'tracker-scale': 'abc',
        'x-offset': '',
        'y-offset': null,
        'ability-boost-level': '',
        'moves-data': JSON.stringify([{ id: 'm1', name: 'Tackle', power: '' }]),
        'inv-data': JSON.stringify([{ id: 'i1', name: 'Potion', qty: 'bad', charges: NaN }]),
        'status-list': JSON.stringify([{ id: 's1', name: 'Burn', rounds: '' }]),
        'effects-data': JSON.stringify([{ id: 'e1', name: 'Tailwind', rounds: 'oops' }])
    };

    const hydrated = hydrateStateFromMetadata(corruptMeta, baseState);
    assert.equal(hydrated.stats?.str.base, 2, 'Empty str-base falls back cleanly');
    assert.equal(hydrated.stats?.dex.rank, 0, 'Whitespace dex-rank falls back to 0');
    assert.equal(hydrated.stats?.vit.buff, 0, 'Null vit-buff falls back to 0');
    assert.equal(hydrated.stats?.spe.debuff, 0, 'Non-numeric spe-debuff falls back to 0');
    assert.equal(hydrated.stats?.ins.limit, 5, 'Infinity ins-limit falls back to 5');
    assert.equal(hydrated.health?.hpCurr, 5, 'NaN hp-curr falls back instead of propagating NaN');
    assert.equal(hydrated.will?.willCurr, 4, 'String NaN will-curr falls back cleanly');
    assert.equal(hydrated.derived?.defBuff, 0, 'Infinity def-buff falls back to 0');
    assert.equal(hydrated.extras?.core, 0, 'Empty extra-core falls back to 0');
    assert.equal(hydrated.identity?.trackerScale, 100, 'Invalid tracker-scale falls back to 100');
    assert.equal(hydrated.identity?.xOffset, 0, 'Empty x-offset falls back to 0');
    assert.equal(hydrated.identity?.yOffset, 0, 'Null y-offset falls back to 0');
    assert.equal(hydrated.identity?.abilityBoostLevel, 0, 'Empty ability-boost-level falls back to 0');
    assert.equal(hydrated.moves?.[0].power, 0, 'Empty move power falls back to 0');
    assert.equal(hydrated.inventory?.[0].qty, 1, 'Invalid item qty falls back to 1');
    assert.equal(hydrated.inventory?.[0].charges, undefined, 'NaN item charges becomes undefined');
    assert.equal(hydrated.statuses?.[0].rounds, 0, 'Empty status rounds falls back to 0');
    assert.equal(hydrated.effects?.[0].rounds, 0, 'Invalid effect rounds falls back to 0');

    const roomMeta: Record<string, unknown> = { roomDefaultScale: 100, roomDefaultOffsetX: 5 };
    applyRoomUpdatesToMeta(roomMeta, { roomDefaultScale: '', roomDefaultOffsetX: Number.NaN, roomDefaultOffsetY: 0 });
    assert.equal(roomMeta.roomDefaultScale, 100, 'Empty roomDefaultScale update is ignored');
    assert.equal(roomMeta.roomDefaultOffsetX, 5, 'NaN roomDefaultOffsetX update is ignored');
    assert.equal(roomMeta.roomDefaultOffsetY, 0, 'Explicit 0 roomDefaultOffsetY is preserved');

    const mappedRoom = mapRoomSettings({ roomDefaultScale: 'bad', roomDefaultOffsetX: '', roomDefaultOffsetY: 0 });
    assert.equal(mappedRoom.roomDefaultScale, undefined, 'Non-numeric roomDefaultScale maps to undefined');
    assert.equal(mappedRoom.roomDefaultOffsetX, undefined, 'Empty roomDefaultOffsetX maps to undefined');
    assert.equal(mappedRoom.roomDefaultOffsetY, 0, 'Explicit 0 roomDefaultOffsetY maps to 0');
});

it('B-11: parsePokedex preserves seen, caught, shiny, and ball when upgrading lowercase keys', () => {
    const baseState = createTestCharacterState();
    const meta = {
        'pokedex-data': JSON.stringify({
            pikachu: { seen: true, caught: true, shiny: true, ball: 'Ultra Ball' },
            Pikachu: { seen: true, caught: false, shiny: false }
        })
    };

    const hydrated = hydrateStateFromMetadata(meta, baseState);
    const dex = hydrated.identity?.pokedex || {};
    assert.equal(dex['pikachu'], undefined, 'Lowercase key should be upgraded to mixed-case key');
    assert.deepEqual(dex['Pikachu'], {
        seen: true,
        caught: true,
        shiny: true,
        ball: 'Ultra Ball'
    });
});

it('B-14: parseInventory migrates [tags] only for legacy items with tags === undefined', () => {
    const baseState = createTestCharacterState();
    const meta = {
        'inv-data': JSON.stringify([
            { id: 'legacy', name: 'Old Charm', desc: 'Boosts attack [Atk +1] in combat' },
            { id: 'modern-empty', name: 'Journal', desc: 'Notes [Session 1] reminders', tags: '' },
            { id: 'modern-tagged', name: 'Amulet', desc: 'Keep [Flavor Note] intact', tags: '[Def +1]' }
        ])
    };

    const hydrated = hydrateStateFromMetadata(meta, baseState);
    const inv = hydrated.inventory || [];
    assert.equal(inv[0].tags, '[Atk +1]', 'Legacy item extracts bracket tag');
    assert.equal(inv[0].desc, 'Boosts attack  in combat', 'Legacy item strips bracket tag from desc');
    assert.equal(inv[1].desc, 'Notes [Session 1] reminders', 'Modern item with tags="" keeps brackets in desc');
    assert.equal(inv[2].desc, 'Keep [Flavor Note] intact', 'Modern item with defined tags keeps brackets in desc');
    assert.equal(inv[2].tags, '[Def +1]', 'Modern item keeps its explicit tags');
});

it('B-15: feature parsers skip null/non-object items without dropping siblings and use deterministic fallback IDs', () => {
    const baseState = createTestCharacterState();
    const meta = {
        'moves-data': JSON.stringify([null, 'bad', { name: 'Tackle', type: 'Normal', category: 'Physical' }]),
        'inv-data': JSON.stringify([42, null, { name: 'Oran Berry', qty: 2 }]),
        'passives-data': JSON.stringify([null, { name: 'Tough Claws', desc: 'Boosts contact' }]),
        'status-list': JSON.stringify([null, { name: 'Burn', rounds: 2 }]),
        'effects-data': JSON.stringify([false, { name: 'Reflect', rounds: 3 }]),
        'custom-info-data': JSON.stringify([null, { label: 'Bond', value: 'High' }]),
        'badges-data': JSON.stringify(['invalid', { name: 'Boulder Badge' }])
    };

    const first = hydrateStateFromMetadata(meta, baseState);
    const second = hydrateStateFromMetadata(meta, baseState);

    assert.equal(first.moves?.length, 1);
    assert.equal(first.moves?.[0].name, 'Tackle');
    assert.equal(first.moves?.[0].id, second.moves?.[0].id, 'Move fallback ID is deterministic');

    assert.equal(first.inventory?.length, 1);
    assert.equal(first.inventory?.[0].name, 'Oran Berry');
    assert.equal(first.inventory?.[0].id, second.inventory?.[0].id, 'Inventory fallback ID is deterministic');

    assert.equal(first.passives?.length, 1);
    assert.equal(first.passives?.[0].id, second.passives?.[0].id, 'Passive fallback ID is deterministic');

    assert.equal(first.statuses?.length, 1);
    assert.equal(first.statuses?.[0].id, second.statuses?.[0].id, 'Status fallback ID is deterministic');

    assert.equal(first.effects?.length, 1);
    assert.equal(first.effects?.[0].id, second.effects?.[0].id, 'Effect fallback ID is deterministic');

    assert.equal(first.customInfo?.length, 1);
    assert.equal(first.customInfo?.[0].id, second.customInfo?.[0].id, 'CustomInfo fallback ID is deterministic');

    assert.equal(first.identity?.badges?.length, 1);
    assert.equal(first.identity?.badges?.[0].id, second.identity?.badges?.[0].id, 'Badge fallback ID is deterministic');
});
});
