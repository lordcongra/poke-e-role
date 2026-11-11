import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { HomebrewPayload } from '../../store/storeTypes';
import type { BattleOrganizerState } from '../../types/battleOrganizerTypes';
import { EXTENSION_ID } from './owlbearSyncConstants';
import { sendSafeBroadcastPayload, registerSafeBroadcastListener } from './owlbearBroadcastUtils';
import { getBattleOrganizerStorageKey, readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';
import { isBattleOrganizerOpen } from '@/components/modals/battleOrganizer/battleOrganizerSettingsHelper';
import {
    BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
    BATTLE_ORGANIZER_SYNC_CHANNEL,
    type BattleOrganizerCombatantPatchPayload,
    applyCombatantPatchToState,
    sendBattleOrganizerFullSync
} from '@/components/modals/battleOrganizer/battleOrganizerSyncHelpers';

export interface OwlbearHomebrewSyncResult {
    unsubs: Array<() => void>;
}

export function setupOwlbearHomebrewSync(role: 'PLAYER' | 'GM'): OwlbearHomebrewSyncResult {
    const unsubs: Array<() => void> = [];

    // Peer-to-Peer Homebrew Handshake: GM sends homebrew payload with 16kB chunking
    const unsubHomebrewRequest = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-request`, async () => {
        if (role === 'GM') {
            const payload = useCharacterStore.getState().getHomebrewPayload();
            await sendSafeBroadcastPayload(`${EXTENSION_ID}/homebrew-payload`, payload);
        }
    });
    unsubs.push(unsubHomebrewRequest);

    // Player listens for GM's chunked homebrew payload
    const unsubHomebrewPayload = registerSafeBroadcastListener<HomebrewPayload>(
        `${EXTENSION_ID}/homebrew-payload`,
        (payload) => {
            if (role !== 'GM' && payload) {
                useCharacterStore.getState().mergeAllHomebrewData(
                    payload.customTypes || [],
                    payload.customAbilities || [],
                    payload.customMoves || [],
                    payload.customPokemon || [],
                    payload.customItems || [],
                    payload.customForms || [],
                    payload.customStatuses || [],
                    true, // silent flag
                    payload.customFieldEffects || []
                );
                OBR.notification.show('[ ↓ ] Homebrew data synced from GM!', 'SUCCESS');
            }
        }
    );
    unsubs.push(unsubHomebrewPayload);

    // Table-wide chunked homebrew share
    const unsubHomebrewShare = registerSafeBroadcastListener<HomebrewPayload>(
        `${EXTENSION_ID}/homebrew-share`,
        (payload) => {
            if (payload) {
                useCharacterStore.getState().mergeAllHomebrewData(
                    payload.customTypes || [],
                    payload.customAbilities || [],
                    payload.customMoves || [],
                    payload.customPokemon || [],
                    payload.customItems || [],
                    payload.customForms || [],
                    payload.customStatuses || [],
                    true, // silent flag
                    payload.customFieldEffects || []
                );
                OBR.notification.show('[ ↓ ] New Homebrew shared to table!', 'SUCCESS');
            }
        }
    );
    unsubs.push(unsubHomebrewShare);

    // Peer-to-Peer Battle Organizer Responder with chunking
    const unsubBattleOrganizerRequest = OBR.broadcast.onMessage(
        `${EXTENSION_ID}/battle-organizer-request`,
        async () => {
            if (role === 'GM') {
                const saved = readBattleOrganizerStateRaw();
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                            await sendSafeBroadcastPayload(`${EXTENSION_ID}/battle-organizer-sync`, parsed);
                        }
                    } catch (e) {
                        console.warn('[SyncEngine] Failed to broadcast battle organizer data:', e);
                    }
                }
            }
        }
    );
    unsubs.push(unsubBattleOrganizerRequest);

    // Global listener for battle organizer sync to hydrate active battlefield (even when modal is closed)
    // GM is authoritative and ignores incoming full-state battle-organizer-sync payloads
    const unsubBattleOrganizerSync = registerSafeBroadcastListener<BattleOrganizerState>(
        BATTLE_ORGANIZER_SYNC_CHANNEL,
        (incoming) => {
            if (role === 'GM' || useCharacterStore.getState().role === 'GM') {
                return;
            }
            try {
                if (incoming) {
                    try {
                        localStorage.setItem(getBattleOrganizerStorageKey(), JSON.stringify(incoming));
                    } catch (storageErr) {
                        console.warn('[SyncEngine] Failed to cache battle organizer data:', storageErr);
                    }
                }
                if (incoming && incoming.battlefield) {
                    if (incoming.battlefield.broadcastToPlayers === false) {
                        useCharacterStore.getState().setActiveBattlefield(null);
                    } else {
                        useCharacterStore.getState().setActiveBattlefield(incoming.battlefield);
                    }
                }
            } catch (e) {
                console.warn('[SyncEngine] Failed to process incoming battlefield from battle-organizer-sync:', e);
            }
        }
    );
    unsubs.push(unsubBattleOrganizerSync);

    // GM merges lightweight player combatant patches when Battle Organizer is closed (when open, useBattleOrganizerSync handles it)
    const unsubBattleOrganizerPatch = registerSafeBroadcastListener<BattleOrganizerCombatantPatchPayload>(
        BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
        (payload) => {
            if (role !== 'GM' && useCharacterStore.getState().role !== 'GM') {
                return;
            }
            if (isBattleOrganizerOpen() || !payload) {
                return;
            }
            try {
                const rawSaved = readBattleOrganizerStateRaw();
                if (!rawSaved) return;
                const parsed = JSON.parse(rawSaved) as BattleOrganizerState;
                const { nextState, changed } = applyCombatantPatchToState(parsed, payload);
                if (!changed) return;

                const nextJson = JSON.stringify(nextState);
                const storageKey = getBattleOrganizerStorageKey();
                localStorage.setItem(storageKey, nextJson);
                if (nextState.battlefield) {
                    useCharacterStore.getState().setActiveBattlefield(nextState.battlefield);
                }
                window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: nextJson }));
                window.dispatchEvent(new CustomEvent('pkr-battle-organizer-update', { detail: nextState }));
                void sendBattleOrganizerFullSync(nextState);
            } catch (e) {
                console.warn('[SyncEngine] Failed to apply combatant patch to battle organizer storage:', e);
            }
        }
    );
    unsubs.push(unsubBattleOrganizerPatch);

    // Fire the homebrew and battle organizer requests if we are a player
    if (role !== 'GM') {
        OBR.broadcast.sendMessage(`${EXTENSION_ID}/homebrew-request`, {}, { destination: 'REMOTE' }).catch(() => {});
        OBR.broadcast
            .sendMessage(`${EXTENSION_ID}/battle-organizer-request`, {}, { destination: 'REMOTE' })
            .catch(() => {});
    }

    return { unsubs };
}
