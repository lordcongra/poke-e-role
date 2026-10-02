import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { HomebrewPayload } from '../../store/storeTypes';
import { EXTENSION_ID } from './owlbearSyncConstants';
import { sendSafeBroadcastPayload, registerSafeBroadcastListener } from './owlbearBroadcastUtils';

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
                    true // silent flag
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
                    true // silent flag
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
                const saved = localStorage.getItem('pkr_battle_organizer_data');
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

    // Fire the homebrew request if we are a player
    if (role !== 'GM') {
        OBR.broadcast.sendMessage(`${EXTENSION_ID}/homebrew-request`, {}, { destination: 'REMOTE' }).catch(() => {});
    }

    return { unsubs };
}
