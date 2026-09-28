// Mock browser globals before any module imports are executed
const localStorageStore: Record<string, string> = {};
(globalThis as any).window = {
    location: { search: '', href: 'http://localhost/' },
    addEventListener: () => {},
    removeEventListener: () => {},
    parent: { postMessage: () => {} }
};
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

// Dynamic imports ensure globalThis.window is defined before @owlbear-rodeo/sdk evaluates
const { useCharacterStore } = await import('../src/store/useCharacterStore');
const { parseCombatTags } = await import('../src/utils/tagParser/parseCombatTags');
const { getStatusPenalties, getPainPenalty, calculateBaseAccuracy, calculateCriticalRequirement, calculateBaseDamage } =
    await import('../src/utils/combat/combatMath');
const { flattenStateToMetadata, hydrateStateFromMetadata } = await import('../src/utils/sync/stateMapper');
const { parseRollLogEntry } = await import('../src/components/modals/battleOrganizer/battleOrganizerRollParser');
const { createDefaultCombatant, markCombatantActionStatus, parseStatusesFromMetadata, parseHealthAndWillFromMetadata } =
    await import('../src/components/modals/battleOrganizer/battleOrganizerUtils');
import type { MoveData, InventoryItem, CharacterState } from '../src/store/storeTypes';
import type { CombatantRowData } from '../src/types/battleOrganizerTypes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
        console.log(`  ✓ PASS: ${testName}`);
        passed++;
    } else {
        console.error(`  ✕ FAIL: ${testName} ${details ? `(${details})` : ''}`);
        failed++;
    }
}

async function runCombatEngineTests() {
    console.log('\n============================================================');
    console.log('   RUNNING COMBAT ENGINE, ROLLER & BATTLE ORGANIZER TESTS   ');
    console.log('============================================================\n');

    // ----------------------------------------------------
    // TEST SUITE 1: Tag System & Combat Buff Calculations
    // ----------------------------------------------------
    console.log('--- Test Suite 1: Tag Parser & Buff Extraction ---');
    const mockItems: InventoryItem[] = [
        {
            id: 'item-1',
            name: 'Custom Scope Lens',
            desc: '[Crit on 4+] [Acc +1]',
            qty: 1,
            active: true
        },
        {
            id: 'item-2',
            name: 'Custom Muscle Band',
            desc: '[Dmg +2] [First Hit Dmg +3]',
            qty: 1,
            active: true
        },
        {
            id: 'item-3',
            name: 'Damp Rock',
            desc: 'Unrelated item without combat tags',
            qty: 1,
            active: true
        },
        {
            id: 'item-4',
            name: 'Inactive Item',
            desc: '[Dmg +5]',
            qty: 1,
            active: false // Inactive items must be ignored
        }
    ];

    const mockMove: MoveData = {
        id: 'move-slash',
        active: true,
        name: 'Slash',
        type: 'Normal',
        category: 'Physical',
        power: 2,
        acc1: 'str',
        acc2: 'brawl',
        dmg1: 'str',
        desc: '[High Critical]'
    };

    const parsedBuffs = parseCombatTags(mockItems, [], mockMove);
    assert(parsedBuffs.acc === 1, 'Tag System extracts [Acc +1] from active items', `Got: ${parsedBuffs.acc}`);
    assert(parsedBuffs.dmg === 2, 'Tag System extracts [Dmg +2] and ignores inactive items', `Got: ${parsedBuffs.dmg}`);
    assert(parsedBuffs.firstHitDmg === 3, 'Tag System extracts [First Hit Dmg +3]', `Got: ${parsedBuffs.firstHitDmg}`);
    assert(
        parsedBuffs.highCritStacks >= 1,
        'Tag System extracts [High Critical] stack from move description',
        `Got: ${parsedBuffs.highCritStacks}`
    );

    // Test accuracy math integration with tag buffs
    const store = useCharacterStore.getState();
    store.loadFromOwlbear({});
    store.setStat('str' as any, 'base', 3);
    store.setSkill('brawl' as any, 'base', 2);
    const baseAcc = calculateBaseAccuracy(mockMove, useCharacterStore.getState(), parsedBuffs);
    assert(baseAcc === 6, 'Accuracy calculation includes Stats (3) + Skill (2) + Tag Acc (1) = 6', `Got: ${baseAcc}`);

    // Test critical hit requirement calculation with High Critical & Scope Lens
    const critReq = calculateCriticalRequirement(mockMove, 1, useCharacterStore.getState(), parsedBuffs);
    assert(
        critReq.criticalRequirement <= 4,
        'Critical threshold reduced to 4 or lower by High Critical tag & Scope Lens',
        `Got: ${critReq.criticalRequirement}`
    );

    // ----------------------------------------------------
    // TEST SUITE 2: Status Penalties & Pain Penalty
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: Status Penalties & Pain Engine ---');
    store.loadFromOwlbear({});
    store.updateHealth('hpMax', 10);
    store.updateHealth('hpCurr', 10);

    const healthyPenalties = getStatusPenalties(useCharacterStore.getState());
    assert(healthyPenalties.paralysisDexterityPenalty === 0, 'Healthy character has 0 Dexterity penalty');
    assert(healthyPenalties.confusionPenalty === 0, 'Healthy character has 0 Confusion penalty');
    assert(!healthyPenalties.isAsleep, 'Healthy character is not asleep');

    // Add Paralysis & Confusion
    store.addStatus();
    const paralysisId = useCharacterStore.getState().statuses[useCharacterStore.getState().statuses.length - 1].id;
    store.updateStatus(paralysisId, 'name', 'Paralysis');

    store.addStatus();
    const confusionId = useCharacterStore.getState().statuses[useCharacterStore.getState().statuses.length - 1].id;
    store.updateStatus(confusionId, 'name', 'Confusion');

    // Starter rank -> Confusion penalty -1, Paralysis Dex penalty -2
    const starterPenalties = getStatusPenalties(useCharacterStore.getState());
    assert(starterPenalties.paralysisDexterityPenalty === -2, 'Paralysis applies -2 Dexterity dice penalty');
    assert(starterPenalties.confusionPenalty === -1, 'Confusion at Starter rank applies -1 Success penalty');

    // Advanced/Expert rank -> Confusion penalty scales to -2
    store.setIdentity('rank', 'Expert');
    const expertPenalties = getStatusPenalties(useCharacterStore.getState());
    assert(expertPenalties.confusionPenalty === -2, 'Confusion at Expert rank scales to -2 Successes penalty');

    // Add Sleep status
    store.addStatus();
    const sleepId = useCharacterStore.getState().statuses[useCharacterStore.getState().statuses.length - 1].id;
    store.updateStatus(sleepId, 'name', 'Sleep');
    const sleepPenalties = getStatusPenalties(useCharacterStore.getState());
    assert(sleepPenalties.isAsleep === true, 'Sleep status flags character as asleep');

    // Test Pain Penalty at full HP vs 1 HP
    store.updateHealth('hpMax', 10);
    store.updateHealth('hpCurr', 10);
    const painFullHp = getPainPenalty('str', useCharacterStore.getState());
    assert(painFullHp === 0, 'Pain Penalty at full HP (10/10) is 0');

    store.updateHealth('hpCurr', 1);
    const painCriticalHp = getPainPenalty('str', useCharacterStore.getState());
    assert(
        painCriticalHp === -3,
        'Pain Penalty at critical HP (1/10) applies -3 Successes penalty',
        `Pain: ${painCriticalHp}`
    );

    // Test [Ignore Pain] tag bypasses pain penalty
    const ignorePainBuffs = { ...parsedBuffs, ignorePain: true };
    const painWithIgnoreTag = getPainPenalty('str', useCharacterStore.getState(), ignorePainBuffs);
    assert(painWithIgnoreTag === 0, '[Ignore Pain] tag negates pain penalty at 1 HP');

    // ----------------------------------------------------
    // TEST SUITE 3: Action Counters & First Hit Tracking
    // ----------------------------------------------------
    console.log('\n--- Test Suite 3: Action Counters & First Hit Tracking ---');
    store.updateTracker('actions', 0);
    store.updateTracker('firstHitAcc', true);
    store.updateTracker('firstHitDmg', true);

    assert(useCharacterStore.getState().trackers.actions === 0, 'Actions initially start at 0');
    store.incrementAction();
    assert(useCharacterStore.getState().trackers.actions === 1, 'First action increments actions counter to 1');
    store.incrementAction();
    assert(useCharacterStore.getState().trackers.actions === 2, 'Second action increments actions counter to 2');

    // Success requirement scales with actions taken (actions + 1)
    const requiredSuccessesForNext = useCharacterStore.getState().trackers.actions + 1;
    assert(requiredSuccessesForNext === 3, 'Accuracy required successes correctly scale to (actions + 1) = 3');

    // ----------------------------------------------------
    // TEST SUITE 4: Evade & Clash Tracking
    // ----------------------------------------------------
    console.log('\n--- Test Suite 4: Evade & Clash Consumption ---');
    store.updateTracker('evade', false);
    store.updateTracker('clash', false);
    assert(!useCharacterStore.getState().trackers.evade, 'Evade initially unchecked (false)');
    assert(!useCharacterStore.getState().trackers.clash, 'Clash initially unchecked (false)');

    // Simulate Evasion roll consuming reaction
    store.updateTracker('evade', true);
    assert(useCharacterStore.getState().trackers.evade === true, 'Evade reaction marked true on Evasion roll');

    // Simulate Clash roll consuming reaction
    store.updateTracker('clash', true);
    assert(useCharacterStore.getState().trackers.clash === true, 'Clash reaction marked true on Clash roll');

    // Reset round trackers via resetRound()
    store.resetRound();
    assert(useCharacterStore.getState().trackers.evade === false, 'Round reset clears Evade reaction to false');
    assert(useCharacterStore.getState().trackers.clash === false, 'Round reset clears Clash reaction to false');
    assert(useCharacterStore.getState().trackers.actions === 0, 'Round reset resets Actions counter to 0');

    // ----------------------------------------------------
    // TEST SUITE 5: Battle Organizer Roll Parser & Syncing
    // ----------------------------------------------------
    console.log('\n--- Test Suite 5: Battle Organizer Roll Parser & Combatant Sync ---');

    // 1. Accuracy Roll classification
    const parsedAccRoll = parseRollLogEntry({
        id: 'roll-acc-1',
        label: 'Pikachu rolled Thunderbolt (Acc)! [ Need 1 Succ | Crit on 5+ ]',
        rollType: 'roll',
        tokenId: 'token-pika'
    });
    assert(
        parsedAccRoll !== null && parsedAccRoll.isAccuracyRoll === true,
        'Battle Organizer identifies (Acc) as accuracy roll'
    );
    assert(
        parsedAccRoll?.moveName === 'Thunderbolt',
        `Battle Organizer extracts move name "Thunderbolt" (Got: ${parsedAccRoll?.moveName})`
    );
    assert(parsedAccRoll?.shouldAddToRoundTracker === true, 'Accuracy roll flags shouldAddToRoundTracker: true');

    // 2. Damage Roll classification
    const parsedDmgRoll = parseRollLogEntry({
        id: 'roll-dmg-1',
        label: 'Pikachu rolled Thunderbolt (Dmg)! [ STAB (+1 Die) ]',
        rollType: 'damage',
        tokenId: 'token-pika'
    });
    assert(
        parsedDmgRoll !== null && parsedDmgRoll.isDamageRoll === true,
        'Battle Organizer identifies (Dmg) as damage roll'
    );
    assert(
        parsedDmgRoll?.shouldAddToRoundTracker === false,
        'Damage roll does not consume additional round action slots'
    );

    // 3. Evasion Reaction Roll classification
    const parsedEvadeRoll = parseRollLogEntry({
        id: 'roll-eva-1',
        label: 'Pikachu rolled Evasion! [ Need 1 Succ ]',
        rollType: 'roll',
        tokenId: 'token-pika'
    });
    assert(parsedEvadeRoll !== null && parsedEvadeRoll.isEvade === true, 'Battle Organizer identifies Evasion roll');
    assert(parsedEvadeRoll?.shouldAddToRoundTracker === true, 'Evasion roll flags shouldAddToRoundTracker: true');

    // 4. Clash Reaction Roll classification
    const parsedClashRoll = parseRollLogEntry({
        id: 'roll-cla-1',
        label: 'Charizard rolled Physical Clash!',
        rollType: 'roll',
        tokenId: 'token-chari'
    });
    assert(
        parsedClashRoll !== null && parsedClashRoll.isClash === true,
        'Battle Organizer identifies Physical Clash roll'
    );

    // 5. Action-Consuming Status Recovery classification (Burn / Sleep)
    const parsedBurnRecovery = parseRollLogEntry({
        id: 'roll-burn-rec',
        label: 'Pikachu rolled 1st Degree Burn Recovery!',
        rollType: 'status',
        tokenId: 'token-pika'
    });
    assert(
        parsedBurnRecovery !== null && parsedBurnRecovery.isActionConsumingRecovery === true,
        'Burn Recovery classified as action-consuming recovery'
    );

    // 6. Action Slot population in CombatantRowData
    let mockCombatant: CombatantRowData = createDefaultCombatant('Pikachu', 'http://example.com/pika.png', true);
    mockCombatant.tokenId = 'token-pika';
    assert(
        mockCombatant.actions.every((a) => a.text === ''),
        'Combatant action slots initially empty'
    );

    // Populate Thunderbolt action status
    mockCombatant = markCombatantActionStatus(mockCombatant, 'Thunderbolt', 'success');
    assert(mockCombatant.actions[0].text === 'Thunderbolt', 'First action slot filled with Thunderbolt');
    assert(mockCombatant.actions[0].status === 'success', 'Action slot marked with success status');

    // ----------------------------------------------------
    // TEST SUITE 6: OBR Metadata Serialization & Hydration
    // ----------------------------------------------------
    console.log('\n--- Test Suite 6: OBR Token Metadata Serialization & Hydration ---');
    store.updateTracker('actions', 3);
    store.updateTracker('evade', true);
    store.updateTracker('clash', false);
    store.updateHealth('hpCurr', 8);
    store.updateHealth('hpMax', 12);
    store.updateWill('willCurr', 4);
    store.updateWill('willMax', 6);

    const flatMeta = flattenStateToMetadata(useCharacterStore.getState());
    assert(flatMeta['actions-used'] === 3, 'flattenStateToMetadata serializes actions to actions-used: 3');
    assert(flatMeta['evasions-used'] === true, 'flattenStateToMetadata serializes evade to evasions-used: true');
    assert(flatMeta['clashes-used'] === false, 'flattenStateToMetadata serializes clash to clashes-used: false');
    assert(flatMeta['hp-curr'] === 8, 'flattenStateToMetadata serializes hp-curr: 8');
    assert(
        flatMeta['hp-max-display'] === 12 || flatMeta['hp-max'] === 12,
        'flattenStateToMetadata serializes hp-max: 12'
    );

    // Test reverse hydration from Battle Organizer / Token metadata
    const incomingOrganizerMeta: Record<string, unknown> = {
        'actions-used': 1,
        'evasions-used': false,
        'clashes-used': true,
        'hp-curr': 7,
        'hp-max': 12,
        'will-curr': 3,
        'status-list': JSON.stringify([{ id: 'status-1', name: 'Paralysis', rounds: 2 }])
    };
    const hydrated = hydrateStateFromMetadata(incomingOrganizerMeta, useCharacterStore.getState());
    assert(hydrated.trackers?.actions === 1, 'hydrateStateFromMetadata extracts actions-used as actions: 1');
    assert(hydrated.trackers?.evade === false, 'hydrateStateFromMetadata extracts evasions-used as evade: false');
    assert(hydrated.trackers?.clash === true, 'hydrateStateFromMetadata extracts clashes-used as clash: true');
    assert(hydrated.health?.hpCurr === 7, 'hydrateStateFromMetadata extracts hp-curr as 7');

    // Parse statuses from metadata helper
    const parsedMetaStatuses = parseStatusesFromMetadata(incomingOrganizerMeta);
    assert(
        parsedMetaStatuses.statusText.includes('Paralysis (2)'),
        'parseStatusesFromMetadata formats status list as "Paralysis (2)"'
    );

    // Parse health & will from metadata helper
    const parsedHw = parseHealthAndWillFromMetadata(incomingOrganizerMeta);
    assert(
        parsedHw.hpCurr === 7 && parsedHw.willCurr === 3,
        'parseHealthAndWillFromMetadata parses hpCurr: 7, willCurr: 3'
    );

    console.log('\n============================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('============================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runCombatEngineTests().catch((e) => {
    console.error('Test suite runner crashed:', e);
    process.exit(1);
});
