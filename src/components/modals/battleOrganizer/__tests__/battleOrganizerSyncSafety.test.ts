import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { EXTENSION_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { getBattleOrganizerStorageKey } from '@/utils/sync/roomScopedStorage';
import {
    createDefaultActions,
    createDefaultBattlefield,
    createDefaultCombatant
} from '@/components/modals/battleOrganizer/battleOrganizerUtils';
import {
    BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
    BATTLE_ORGANIZER_SYNC_CHANNEL,
    applyCombatantPatchToState,
    canBroadcastFullBattleOrganizerState,
    sendBattleOrganizerCombatantPatch,
    sendBattleOrganizerFullSync,
    type BattleOrganizerCombatantPatchPayload
} from '@/components/modals/battleOrganizer/battleOrganizerSyncHelpers';
import { applyRollToBattleOrganizerStorage } from '@/components/modals/battleOrganizer/battleOrganizerStorageSync';
import { syncBattlefieldUpdate } from '@/utils/combat/battlefieldSyncUtils';
import { syncCombatantSentToMap, syncCombatantSentToPc } from '@/utils/combat/targeting/abilityTargetPcResolution';
import { setupOwlbearHomebrewSync } from '@/hooks/owlbearSync/setupOwlbearHomebrewSync';
import { setBattleOrganizerOpen } from '@/components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import type { BattleOrganizerState, CombatantRowData } from '@/types/battleOrganizerTypes';

function buildFixtureState(): BattleOrganizerState {
    const playerRow: CombatantRowData = {
        ...createDefaultCombatant('Pikachu', '12', false),
        id: 'c-player',
        tokenId: 'tok-player',
        entityId: 'ent-player',
        isPlayerSide: true,
        isNPC: false,
        hidden: false,
        hpCurr: 10,
        hpMax: 10,
        willCurr: 5,
        willMax: 5
    };
    const gmNpcRow: CombatantRowData = {
        ...createDefaultCombatant('Hidden Boss', '15', true),
        id: 'c-npc-hidden',
        tokenId: 'tok-npc-hidden',
        entityId: 'ent-npc-hidden',
        isPlayerSide: false,
        isNPC: true,
        hidden: true,
        hpCurr: 40,
        hpMax: 40,
        gmHpBar: true
    };
    return {
        battlefield: createDefaultBattlefield(),
        rounds: [{ id: 'round-1', roundNumber: 1, combatants: [playerRow, gmNpcRow], endOfRoundEffects: '' }],
        activeRoundIndex: 0
    };
}

describe('battleOrganizerSyncSafety (B-01)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        setBattleOrganizerOpen(false);
        useCharacterStore.setState({ role: 'PLAYER', pcData: { version: 2, activeCampaignId: '', campaigns: {}, pokemonSummaries: {} } });
        (OBR.player.getRole as ReturnType<typeof vi.fn>).mockResolvedValue('PLAYER');
    });

    afterEach(() => {
        setBattleOrganizerOpen(false);
    });

    it('blocks non-GM clients from sending full-state battle-organizer-sync across all entry points', async () => {
        const initial = buildFixtureState();
        localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(initial));

        expect(canBroadcastFullBattleOrganizerState()).toBe(false);
        expect(await sendBattleOrganizerFullSync(initial)).toBe(false);

        const rollApplied = applyRollToBattleOrganizerStorage({
            id: 'roll-1',
            player: 'Player 1',
            characterName: 'Pikachu',
            tokenId: 'tok-player',
            label: 'Pikachu rolled Thunderbolt (Accuracy)',
            result: '4 Successes',
            icon: '',
            rollType: 'accuracy'
        });
        expect(rollApplied).toBe(true);

        syncBattlefieldUpdate({ ...initial.battlefield, location: 'Forest Clearing' });

        await syncCombatantSentToPc('ent-player', {
            version: 2,
            activeCampaignId: '',
            campaigns: {},
            pokemonSummaries: {
                'ent-player': {
                    entityId: 'ent-player',
                    name: 'Pikachu',
                    species: 'Pikachu',
                    rank: 'Starter',
                    type1: 'Electric',
                    hp: 10,
                    maxHp: 10,
                    will: 5,
                    maxWill: 5,
                    mapTokenId: 'tok-player',
                    isOnMap: false
                }
            }
        });
        await syncCombatantSentToMap('ent-player');

        const sendMock = OBR.broadcast.sendMessage as ReturnType<typeof vi.fn>;
        const fullSyncCalls = sendMock.mock.calls.filter(([ch]) => ch === `${EXTENSION_ID}/battle-organizer-sync`);
        expect(fullSyncCalls).toHaveLength(0);
    });

    it('allows GM clients to broadcast full-state battle-organizer-sync via sendBattleOrganizerFullSync', async () => {
        useCharacterStore.setState({ role: 'GM' });
        const initial = buildFixtureState();

        expect(canBroadcastFullBattleOrganizerState()).toBe(true);
        expect(await sendBattleOrganizerFullSync(initial)).toBe(true);

        const sendMock = OBR.broadcast.sendMessage as ReturnType<typeof vi.fn>;
        expect(sendMock).toHaveBeenCalledWith(BATTLE_ORGANIZER_SYNC_CHANNEL, initial, { destination: 'REMOTE' });
    });

    it('GM ignores incoming full-state battle-organizer-sync payloads and preserves NPCs/hidden combatants', () => {
        useCharacterStore.setState({ role: 'GM' });
        const gmState = buildFixtureState();
        localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(gmState));

        const listeners = new Map<string, (event: { data: unknown; connectionId: string }) => void>();
        (OBR.broadcast.onMessage as ReturnType<typeof vi.fn>).mockImplementation(
            (channel: string, cb: (event: { data: unknown; connectionId: string }) => void) => {
                listeners.set(channel, cb);
                return () => {};
            }
        );

        const { unsubs } = setupOwlbearHomebrewSync('GM');
        const syncListener = listeners.get(BATTLE_ORGANIZER_SYNC_CHANNEL);
        expect(syncListener).toBeDefined();

        const playerOverwritePayload: BattleOrganizerState = {
            battlefield: { ...gmState.battlefield, location: 'Wiped Arena' },
            rounds: [{ id: 'round-1', roundNumber: 1, combatants: [gmState.rounds[0].combatants[0]], endOfRoundEffects: '' }],
            activeRoundIndex: 0
        };
        syncListener?.({ data: playerOverwritePayload, connectionId: 'player-conn' });

        const persisted = JSON.parse(localStorage.getItem(getBattleOrganizerStorageKey()) || '{}') as BattleOrganizerState;
        expect(persisted.rounds[0].combatants).toHaveLength(2);
        expect(persisted.rounds[0].combatants[1].id).toBe('c-npc-hidden');
        expect(persisted.battlefield.location).toBe(gmState.battlefield.location);
        unsubs.forEach((u) => u());
    });

    it('applyCombatantPatchToState applies only allowlisted fields and preserves GM NPCs/hidden rows', () => {
        const gmState = buildFixtureState();
        const nextActions = createDefaultActions();
        nextActions[0] = { text: 'Quick Attack', status: 'success', critType: 'none' };

        const maliciousPatchPayload = {
            roundIndex: 0,
            combatantId: 'c-player',
            tokenId: 'tok-player',
            entityId: 'ent-player',
            patch: {
                hpCurr: 4,
                tempHp: 2,
                willCurr: 3,
                status: 'Paralyzed',
                isFainted: false,
                actions: nextActions,
                evadeUsed: true,
                clashUsed: true,
                abilityTargetIds: ['tok-npc-hidden'],
                name: 'Sparky',
                initiative: '16',
                baseInit: 6,
                isNPC: true,
                hidden: true,
                gmHpBar: false,
                tokenId: 'hijacked-token',
                entityId: 'hijacked-entity',
                unknownField: 'injected'
            } as unknown as BattleOrganizerCombatantPatchPayload['patch']
        };

        const { nextState, changed } = applyCombatantPatchToState(gmState, maliciousPatchPayload);
        expect(changed).toBe(true);

        const patchedPlayer = nextState.rounds[0].combatants[0];
        expect(patchedPlayer.hpCurr).toBe(4);
        expect(patchedPlayer.tempHp).toBe(2);
        expect(patchedPlayer.willCurr).toBe(3);
        expect(patchedPlayer.status).toBe('Paralyzed');
        expect(patchedPlayer.actions[0].text).toBe('Quick Attack');
        expect(patchedPlayer.evadeUsed).toBe(true);
        expect(patchedPlayer.clashUsed).toBe(true);
        expect(patchedPlayer.abilityTargetIds).toEqual(['tok-npc-hidden']);
        expect(patchedPlayer.name).toBe('Sparky');
        expect(patchedPlayer.initiative).toBe('16');
        expect(patchedPlayer.baseInit).toBe(6);

        expect(patchedPlayer.isNPC).toBe(false);
        expect(patchedPlayer.hidden).toBe(false);
        expect(patchedPlayer.tokenId).toBe('tok-player');
        expect(patchedPlayer.entityId).toBe('ent-player');
        expect((patchedPlayer as unknown as Record<string, unknown>).unknownField).toBeUndefined();
        expect(nextState.rounds[0].combatants[1]).toEqual(gmState.rounds[0].combatants[1]);
    });

    it('sends lightweight allowlisted patch from non-GM and GM merges only when BO is closed', async () => {
        const gmState = buildFixtureState();
        localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(gmState));

        useCharacterStore.setState({ role: 'PLAYER' });
        const sent = await sendBattleOrganizerCombatantPatch({
            roundIndex: 0,
            combatantId: 'c-player',
            tokenId: 'tok-player',
            patch: { hpCurr: 7, isNPC: true } as unknown as BattleOrganizerCombatantPatchPayload['patch']
        });
        expect(sent).toBe(true);

        const sendMock = OBR.broadcast.sendMessage as ReturnType<typeof vi.fn>;
        expect(sendMock).toHaveBeenCalledWith(
            BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
            { roundIndex: 0, combatantId: 'c-player', tokenId: 'tok-player', entityId: undefined, patch: { hpCurr: 7 } },
            { destination: 'REMOTE' }
        );

        sendMock.mockClear();
        useCharacterStore.setState({ role: 'GM' });
        const listeners = new Map<string, (event: { data: unknown; connectionId: string }) => void>();
        (OBR.broadcast.onMessage as ReturnType<typeof vi.fn>).mockImplementation(
            (channel: string, cb: (event: { data: unknown; connectionId: string }) => void) => {
                listeners.set(channel, cb);
                return () => {};
            }
        );

        const { unsubs } = setupOwlbearHomebrewSync('GM');
        const patchListener = listeners.get(BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL);
        expect(patchListener).toBeDefined();

        setBattleOrganizerOpen(true);
        patchListener?.({
            data: { roundIndex: 0, combatantId: 'c-player', patch: { hpCurr: 2 } },
            connectionId: 'player-conn'
        });
        let stored = JSON.parse(localStorage.getItem(getBattleOrganizerStorageKey()) || '{}') as BattleOrganizerState;
        expect(stored.rounds[0].combatants[0].hpCurr).toBe(10);

        setBattleOrganizerOpen(false);
        patchListener?.({
            data: { roundIndex: 0, combatantId: 'c-player', patch: { hpCurr: 6 } },
            connectionId: 'player-conn'
        });
        stored = JSON.parse(localStorage.getItem(getBattleOrganizerStorageKey()) || '{}') as BattleOrganizerState;
        expect(stored.rounds[0].combatants[0].hpCurr).toBe(6);
        expect(stored.rounds[0].combatants).toHaveLength(2);
        expect(stored.rounds[0].combatants[1].hidden).toBe(true);
        expect(sendMock).toHaveBeenCalledWith(
            BATTLE_ORGANIZER_SYNC_CHANNEL,
            expect.objectContaining({
                rounds: expect.arrayContaining([
                    expect.objectContaining({
                        combatants: expect.arrayContaining([
                            expect.objectContaining({ id: 'c-player', hpCurr: 6 }),
                            expect.objectContaining({ id: 'c-npc-hidden', hidden: true })
                        ])
                    })
                ])
            }),
            { destination: 'REMOTE' }
        );

        unsubs.forEach((u) => u());
    });
});
