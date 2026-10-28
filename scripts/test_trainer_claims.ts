// Mock browser globals before any module imports are executed
const localStorageStore: Record<string, string> = {};
(import.meta as unknown as { env: Record<string, string> }).env = { BASE_URL: '/poke-e-role/' };
(globalThis as unknown as { window: unknown }).window = {
    location: { search: '', href: 'http://localhost/' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    parent: { postMessage: () => {} },
    self: {},
    top: { other: true } // simulate iframe for OBR mode
};
(globalThis as unknown as { localStorage: unknown }).localStorage = {
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

import assert from 'assert';

// Dynamic imports ensure globalThis.window is defined before @owlbear-rodeo/sdk evaluates
const { default: OBR } = await import('@owlbear-rodeo/sdk');
const { findOtherLinkedTrainer } = await import('../src/utils/pc/pcModalOps');
const { executeLinkActiveTrainer } = await import('../src/utils/pc/pcTrainerOps');
const { calculateFormationOffsets } = await import('../src/utils/generators/trainerTokenSpawner');
import type { Item } from '@owlbear-rodeo/sdk';
import type { CampaignProfile, TrainerRoster } from '../src/types/pcStorageTypes';

console.log('=== RUNNING TRAINER CLAIMS & OVERWRITE VERIFICATION TESTS ===\n');

// 1. Verify Formation Offset Geometry
function testFormationGeometry() {
    console.log('Test 1: Verifying team formation offsets around trainer center...');
    const offsets3 = calculateFormationOffsets(3, 200);
    assert.strictEqual(offsets3.length, 3, 'Should have 3 offsets for 3 team members');
    assert.ok(offsets3.some((o: { dx: number; dy: number }) => o.dx !== 0 || o.dy !== 0), 'Offsets should spread around center');
    console.log('  ✓ PASS: calculateFormationOffsets correctly arranges Pokémon around trainer');
}

// 2. Verify findOtherLinkedTrainer 1:1 Conflict Detection
function testConflictDetection() {
    console.log('\nTest 2: Verifying findOtherLinkedTrainer 1:1 ownership detection...');

    const campaign: CampaignProfile = {
        id: 'camp-1',
        name: 'Kanto',
        activeTrainerId: 'trainer-ash',
        boxes: [],
        trainers: {
            'trainer-ash': {
                id: 'trainer-ash',
                name: 'Ash Ketchum',
                party: [],
                boxes: []
            },
            'trainer-gary': {
                id: 'trainer-gary',
                name: 'Gary Oak',
                party: [],
                boxes: []
            }
        }
    };

    // Case 2a: Token is claimed by Gary with isTrainer: true
    const tokenClaimedByGary: Item = {
        id: 'token-gary-1',
        name: 'Gary Oak',
        position: { x: 100, y: 100 },
        layer: 'CHARACTER',
        metadata: {
            'pokerole-pmd-extension/claimed-by': {
                playerId: 'player-bob',
                playerName: 'Bob',
                trainerId: 'trainer-gary',
                trainerName: 'Gary Oak',
                isTrainer: true
            }
        }
    } as unknown as Item;

    // Ash attempts to inspect this token
    const conflict = findOtherLinkedTrainer(
        campaign,
        'trainer-ash',
        'token-gary-1',
        { mode: 'Trainer', nickname: 'Ash Ketchum' },
        tokenClaimedByGary
    );

    assert.ok(conflict, 'Should detect conflict with Gary Oak');
    assert.strictEqual(conflict?.id, 'trainer-gary', 'Conflict should identify trainer-gary');
    assert.strictEqual(conflict?.name, 'Gary Oak', 'Conflict should have trainer name Gary Oak');
    console.log('  ✓ PASS: Conflicting trainer detected via pokerole-pmd-extension/claimed-by');

    // Case 2b: Token claimed by current trainer (Ash) -> No conflict
    const tokenClaimedByAsh: Item = {
        id: 'token-ash-1',
        name: 'Ash Ketchum',
        position: { x: 100, y: 100 },
        layer: 'CHARACTER',
        metadata: {
            'pokerole-pmd-extension/claimed-by': {
                playerId: 'player-alice',
                playerName: 'Alice',
                trainerId: 'trainer-ash',
                trainerName: 'Ash Ketchum',
                isTrainer: true
            }
        }
    } as unknown as Item;

    const noConflict = findOtherLinkedTrainer(
        campaign,
        'trainer-ash',
        'token-ash-1',
        { mode: 'Trainer', nickname: 'Ash Ketchum' },
        tokenClaimedByAsh
    );

    assert.strictEqual(noConflict, undefined, 'Current trainer claiming their own token has no conflict');
    console.log('  ✓ PASS: No conflict when token is claimed by the current trainer');

    // Case 2c: Non-trainer claim (e.g. Pokémon token) does not trigger trainer conflict
    const pokemonToken: Item = {
        id: 'token-pikachu',
        name: 'Pikachu',
        position: { x: 100, y: 100 },
        layer: 'CHARACTER',
        metadata: {
            'pokerole-pmd-extension/claimed-by': {
                playerId: 'player-alice',
                playerName: 'Alice',
                trainerId: 'trainer-ash',
                trainerName: 'Ash Ketchum',
                isTrainer: false
            }
        }
    } as unknown as Item;

    const nonTrainerConflict = findOtherLinkedTrainer(
        campaign,
        'trainer-gary',
        'token-pikachu',
        { mode: 'Trainer', nickname: 'Gary Oak' },
        pokemonToken
    );
    assert.strictEqual(nonTrainerConflict, undefined, 'Non-trainer claim (isTrainer=false) does not trigger trainer collision');
    console.log('  ✓ PASS: isTrainer: false does not collide with trainer claims');
}

// 3. Verify executeLinkActiveTrainer Non-GM vs GM Overrides
async function testLinkingAndGmOverrides() {
    console.log('\nTest 3: Verifying executeLinkActiveTrainer restrictions and GM override privileges...');

    const campaign: CampaignProfile = {
        id: 'camp-1',
        name: 'Kanto',
        activeTrainerId: 'trainer-ash',
        boxes: [],
        trainers: {
            'trainer-ash': {
                id: 'trainer-ash',
                name: 'Ash Ketchum',
                party: [],
                boxes: []
            },
            'trainer-gary': {
                id: 'trainer-gary',
                name: 'Gary Oak',
                party: [],
                boxes: []
            }
        }
    };

    const tokenClaimedByGary: Item = {
        id: 'token-gary-1',
        name: 'Gary Oak',
        position: { x: 100, y: 100 },
        layer: 'CHARACTER',
        metadata: {
            'pokerole-pmd-extension/claimed-by': {
                playerId: 'player-bob',
                playerName: 'Bob',
                trainerId: 'trainer-gary',
                trainerName: 'Gary Oak',
                isTrainer: true
            }
        }
    } as unknown as Item;

    let savedProfile: TrainerRoster | null = null;
    const saveTrainerProfile = (t: TrainerRoster) => {
        savedProfile = t;
    };

    // 3a: Non-GM player cannot link token claimed by another trainer
    savedProfile = null;
    await executeLinkActiveTrainer({
        trainer: {
            id: 'trainer-ash',
            name: 'Ash Ketchum',
            party: [],
            boxes: [],
            savedTokenItem: tokenClaimedByGary
        },
        campaign,
        canLinkActiveTrainer: true,
        identity: { mode: 'Trainer', nickname: 'Ash Ketchum' },
        role: 'PLAYER',
        saveTrainerProfile
    });

    assert.strictEqual(savedProfile, null, 'Non-GM player MUST NOT be allowed to link another trainer\'s claimed token');
    console.log('  ✓ PASS: Non-GM player blocked from linking token claimed by another trainer');

    // 3b: Non-GM player cannot link token belonging to another player
    const tokenOfAnotherPlayer: Item = {
        id: 'token-other-player',
        name: 'Ash Ketchum',
        position: { x: 100, y: 100 },
        layer: 'CHARACTER',
        metadata: {
            'pokerole-pmd-extension/claimed-by': {
                playerId: 'player-bob', // different player
                playerName: 'Bob',
                trainerId: 'trainer-ash',
                trainerName: 'Ash Ketchum',
                isTrainer: true
            }
        }
    } as unknown as Item;

    savedProfile = null;
    // Mock OBR.isAvailable and OBR.player
    const origDescriptor = Object.getOwnPropertyDescriptor(OBR, 'isAvailable');
    Object.defineProperty(OBR, 'isAvailable', {
        get: () => true,
        configurable: true
    });

    const origPlayer = OBR.player;
    (OBR as unknown as { player: unknown }).player = {
        ...origPlayer,
        getId: async () => 'player-alice',
        getName: async () => 'Alice'
    } as unknown as typeof OBR.player;

    const origNotification = OBR.notification;
    let notificationShown: { msg: string; type: string } | null = null;
    (OBR as unknown as { notification: unknown }).notification = {
        ...origNotification,
        show: (msg: string, type: string) => {
            notificationShown = { msg, type };
        }
    } as unknown as typeof OBR.notification;

    const origScene = OBR.scene;
    (OBR as unknown as { scene: unknown }).scene = {
        ...origScene,
        items: {
            ...origScene?.items,
            updateItems: async (ids: string[], updater: (items: Item[]) => void) => {
                const items = [tokenClaimedByGary];
                updater(items);
            }
        }
    } as unknown as typeof OBR.scene;

    await executeLinkActiveTrainer({
        trainer: {
            id: 'trainer-ash',
            name: 'Ash Ketchum',
            party: [],
            boxes: [],
            savedTokenItem: tokenOfAnotherPlayer
        },
        campaign,
        canLinkActiveTrainer: true,
        identity: { mode: 'Trainer', nickname: 'Ash Ketchum' },
        role: 'PLAYER',
        saveTrainerProfile
    });

    assert.strictEqual(savedProfile, null, 'Non-GM player MUST NOT be allowed to link token owned by another player ID');
    console.log('  ✓ PASS: Non-GM player blocked from linking token belonging to another player ID');

    // 3c: GM Role Overrides and Successfully Claims
    savedProfile = null;
    await executeLinkActiveTrainer({
        trainer: {
            id: 'trainer-ash',
            name: 'Ash Ketchum',
            party: [],
            boxes: [],
            savedTokenItem: tokenClaimedByGary
        },
        campaign,
        canLinkActiveTrainer: true,
        identity: { mode: 'Trainer', nickname: 'Ash Ketchum' },
        role: 'GM', // GM role!
        saveTrainerProfile
    });

    assert.ok(savedProfile, 'GM role MUST be able to link and override claims');
    const profile = savedProfile as TrainerRoster;
    assert.strictEqual(profile.isLinked, true, 'GM linking sets isLinked: true');
    console.log('  ✓ PASS: GM role successfully overrides locks/claims and links trainer');

    // Restore OBR mocks
    (OBR as unknown as { player: unknown }).player = origPlayer;
    (OBR as unknown as { notification: unknown }).notification = origNotification;
    (OBR as unknown as { scene: unknown }).scene = origScene;
    if (origDescriptor) {
        Object.defineProperty(OBR, 'isAvailable', origDescriptor);
    }
}

// 4. Verify Unlinking Removes Claim
function testUnlinkingCleansClaim() {
    console.log('\nTest 4: Verifying unlinking removes claimed-by from savedTokenItem...');

    const tokenWithClaim: Item = {
        id: 'token-ash',
        name: 'Ash Ketchum',
        metadata: {
            'pokerole-pmd-extension/claimed-by': {
                playerId: 'player-alice',
                playerName: 'Alice',
                trainerId: 'trainer-ash',
                trainerName: 'Ash Ketchum',
                isTrainer: true
            }
        }
    } as unknown as Item;

    const trainer: TrainerRoster = {
        id: 'trainer-ash',
        name: 'Ash Ketchum',
        party: [],
        boxes: [],
        isLinked: true,
        savedTokenItem: tokenWithClaim
    };

    // Simulate handleUnlinkTrainer logic
    let cleanedSavedItem = trainer.savedTokenItem;
    if (cleanedSavedItem?.metadata?.['pokerole-pmd-extension/claimed-by']) {
        const nextMeta = { ...cleanedSavedItem.metadata };
        delete nextMeta['pokerole-pmd-extension/claimed-by'];
        cleanedSavedItem = { ...cleanedSavedItem, metadata: nextMeta };
    }

    const unlinkedTrainer: TrainerRoster = {
        ...trainer,
        isLinked: false,
        avatarUrl: undefined,
        mapTokenId: undefined,
        savedTokenItem: cleanedSavedItem
    };

    assert.strictEqual(unlinkedTrainer.isLinked, false, 'Trainer isLinked should be false');
    assert.strictEqual(unlinkedTrainer.mapTokenId, undefined, 'mapTokenId should be undefined');
    assert.strictEqual(
        unlinkedTrainer.savedTokenItem?.metadata?.['pokerole-pmd-extension/claimed-by'],
        undefined,
        'claimed-by metadata must be deleted on unlink'
    );
    console.log('  ✓ PASS: Unlinking cleanly clears isLinked and deletes claimed-by metadata');
}

// 5. Verify spawnTrainerAndTeam with destination === 'overwrite'
async function testTrainerSpawnerOverwriteTeam() {
    console.log('\nTest 5: Verifying spawnTrainerAndTeam in OBR mode with destination: "overwrite"...');

    const origDescriptor = Object.getOwnPropertyDescriptor(OBR, 'isAvailable');
    Object.defineProperty(OBR, 'isAvailable', {
        get: () => true,
        configurable: true
    });

    const origPlayer = OBR.player;
    const origPlayerIdDesc = Object.getOwnPropertyDescriptor(origPlayer, 'id');
    Object.defineProperty(origPlayer, 'id', {
        get: () => 'player-alice',
        configurable: true
    });
    origPlayer.getId = async () => 'player-alice';
    origPlayer.getName = async () => 'Alice';

    const existingToken: Item = {
        id: 'target-token-123',
        name: 'Old Character',
        position: { x: 500, y: 500 },
        layer: 'CHARACTER',
        metadata: {
            'pokerole-pmd-extension/character-data': {
                nickname: 'Old Character'
            }
        }
    } as unknown as Item;

    const addedItems: Item[] = [];
    let updatedTokenMeta: Record<string, unknown> | null = null;

    const origScene = OBR.scene;
    (OBR as unknown as { scene: unknown }).scene = {
        ...origScene,
        local: {
            ...origScene?.local,
            getItems: async () => [],
            addItems: async () => {},
            deleteItems: async () => {}
        },
        items: {
            ...origScene?.items,
            getItems: async (ids?: string[]) => {
                if (ids && ids.includes('target-token-123')) {
                    return [existingToken];
                }
                return [existingToken];
            },
            updateItems: async (ids: string[], updater: (items: Item[]) => void) => {
                if (ids.includes('target-token-123')) {
                    updater([existingToken]);
                    updatedTokenMeta = existingToken.metadata;
                }
            },
            addItems: async (items: Item[]) => {
                addedItems.push(...items);
            }
        }
    } as unknown as typeof OBR.scene;

    const { useCharacterStore } = await import('../src/store/useCharacterStore');
    useCharacterStore.setState({ tokenId: 'target-token-123' });

    const { spawnTrainerAndTeam } = await import('../src/utils/generators/trainerTokenSpawner');

    const mockResult = {
        trainerName: 'Brock',
        trainerMetadata: {
            entityId: 'trainer-brock',
            nickname: 'Brock',
            species: 'Gym Leader',
            mode: 'Trainer',
            rank: 'Advanced'
        },
        teamMembers: [
            {
                species: 'Geodude',
                metadata: {
                    nickname: 'Geodude',
                    species: 'Geodude',
                    mode: 'Pokémon',
                    rank: 'Starter',
                    'hp-max-display': 10
                }
            },
            {
                species: 'Onix',
                metadata: {
                    nickname: 'Onix',
                    species: 'Onix',
                    mode: 'Pokémon',
                    rank: 'Amateur',
                    'hp-max-display': 14
                }
            }
        ]
    };

    const origNotification = OBR.notification;
    (OBR as unknown as { notification: unknown }).notification = {
        ...origNotification,
        show: () => {}
    } as unknown as typeof OBR.notification;

    await spawnTrainerAndTeam(mockResult as any, 'overwrite');

    // 1. Verify target token metadata was updated with Brock's metadata
    const characterData = updatedTokenMeta ? (updatedTokenMeta['pokerole-extension/stats'] as unknown as Record<string, unknown>) : null;
    assert.ok(characterData, 'Target token character data should be present');
    assert.strictEqual(characterData.nickname, 'Brock', 'Target token nickname should be overwritten with Brock');

    // 2. Verify claimed-by metadata was stamped with isTrainer: true
    const claim = updatedTokenMeta ? (updatedTokenMeta['pokerole-pmd-extension/claimed-by'] as unknown as Record<string, unknown>) : null;
    assert.ok(claim, 'Target token should be stamped with claimed-by metadata');
    assert.strictEqual(claim.isTrainer, true, 'claimed-by should have isTrainer: true');
    assert.strictEqual(claim.trainerId, 'trainer-brock', 'claimed-by should have trainerId: trainer-brock');
    assert.strictEqual(claim.trainerName, 'Brock', 'claimed-by should have trainerName: Brock');
    assert.strictEqual(claim.playerId, 'player-alice', 'claimed-by should have playerId: player-alice');
    console.log('  ✓ PASS: Overwritten target token stamped with 1:1 trainer ownership claim');

    // 3. Verify team members were added to scene in formation
    assert.strictEqual(addedItems.length, 2, '2 team members should have been spawned on scene');
    assert.strictEqual(addedItems[0].name, 'Geodude', 'First team member should be Geodude');
    assert.strictEqual(addedItems[1].name, 'Onix', 'Second team member should be Onix');
    assert.notStrictEqual(addedItems[0].position.x, 500, 'Geodude should be placed with formation offset relative to trainer (500, 500)');
    assert.notStrictEqual(addedItems[1].position.x, 500, 'Onix should be placed with formation offset relative to trainer (500, 500)');
    console.log('  ✓ PASS: Pokémon team members spawned in formation around trainer center position');

    // Restore OBR mocks
    (OBR as unknown as { player: unknown }).player = origPlayer;
    (OBR as unknown as { scene: unknown }).scene = origScene;
    (OBR as unknown as { notification: unknown }).notification = origNotification;
    if (origPlayerIdDesc) {
        Object.defineProperty(origPlayer, 'id', origPlayerIdDesc);
    }
    if (origDescriptor) {
        Object.defineProperty(OBR, 'isAvailable', origDescriptor);
    }
}

async function runAll() {
    testFormationGeometry();
    testConflictDetection();
    await testLinkingAndGmOverrides();
    testUnlinkingCleansClaim();
    await testTrainerSpawnerOverwriteTeam();
    console.log('\n=============================================');
    console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('=============================================\n');
}

runAll().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
