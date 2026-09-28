import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { HomebrewPayload } from '../../store/storeTypes';
import { EXTENSION_ID } from './owlbearSyncConstants';

export interface OwlbearHomebrewSyncResult {
    unsubs: Array<() => void>;
}

export function setupOwlbearHomebrewSync(role: 'PLAYER' | 'GM'): OwlbearHomebrewSyncResult {
    const unsubs: Array<() => void> = [];

    // Peer-to-Peer Homebrew Handshake
    const unsubHomebrewRequest = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-request`, () => {
        if (role === 'GM') {
            const payload = useCharacterStore.getState().getHomebrewPayload();
            OBR.broadcast.sendMessage(`${EXTENSION_ID}/homebrew-payload`, payload, {
                destination: 'REMOTE'
            });
        }
    });
    unsubs.push(unsubHomebrewRequest);

    const unsubHomebrewPayload = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-payload`, (event) => {
        if (role !== 'GM') {
            const payload = event.data as HomebrewPayload;
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
    });
    unsubs.push(unsubHomebrewPayload);

    const unsubHomebrewShare = OBR.broadcast.onMessage(`${EXTENSION_ID}/homebrew-share`, (event) => {
        const payload = event.data as HomebrewPayload;
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
    });
    unsubs.push(unsubHomebrewShare);

    // Peer-to-Peer Battle Organizer Responder
    const unsubBattleOrganizerRequest = OBR.broadcast.onMessage(`${EXTENSION_ID}/battle-organizer-request`, () => {
        if (role === 'GM') {
            const saved = localStorage.getItem('pkr_battle_organizer_data');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
                        OBR.broadcast.sendMessage(`${EXTENSION_ID}/battle-organizer-sync`, parsed, {
                            destination: 'REMOTE'
                        });
                    }
                } catch (e) {
                    console.warn('[SyncEngine] Failed to broadcast battle organizer data:', e);
                }
            }
        }
    });
    unsubs.push(unsubBattleOrganizerRequest);

    // Fire the homebrew request if we are a player
    if (role !== 'GM') {
        OBR.broadcast.sendMessage(`${EXTENSION_ID}/homebrew-request`, {}, { destination: 'REMOTE' });
    }

    return { unsubs };
}
