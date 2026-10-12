import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { isStandaloneMode } from '../sync/storageAdapter';
import type { BattlefieldData, BattleOrganizerState } from '../../types/battleOrganizerTypes';
import type { ActiveFieldEffectItem } from './fieldEffectsData';

export const BATTLEFIELD_STORAGE_KEY = 'pokerole-pmd-extension/battlefield';
export const BATTLE_ORGANIZER_STORAGE_KEY = 'pkr_battle_organizer_data';
export const BATTLE_ORGANIZER_SYNC_BROADCAST = 'pokerole-pmd-extension/battle-organizer-sync';

/**
 * Updates the remaining rounds of a specific active battlefield effect.
 * If newRounds <= 0, clears or removes the effect.
 */
export function updateBattlefieldEffectRounds(
    battlefield: BattlefieldData,
    targetItem: ActiveFieldEffectItem,
    newRounds: number
): BattlefieldData {
    const rounds = Math.max(0, newRounds);

    if (targetItem.category === 'weather') {
        if (!targetItem.isExtra) {
            return {
                ...battlefield,
                weather: {
                    ...battlefield.weather,
                    remainingRounds: rounds,
                    ...(rounds === 0 ? { name: '' } : {})
                }
            };
        } else if (targetItem.extraIndex !== undefined && battlefield.extraWeathers) {
            const nextExtras = battlefield.extraWeathers
                .map((w, idx) => (idx === targetItem.extraIndex ? { ...w, remainingRounds: rounds } : w))
                .filter((w) => w.remainingRounds > 0 && w.name.trim().length > 0);
            return {
                ...battlefield,
                extraWeathers: nextExtras
            };
        }
    } else if (targetItem.category === 'terrain') {
        if (!targetItem.isExtra) {
            return {
                ...battlefield,
                terrain: {
                    ...battlefield.terrain,
                    remainingRounds: rounds,
                    ...(rounds === 0 ? { name: '' } : {})
                }
            };
        } else if (targetItem.extraIndex !== undefined && battlefield.extraTerrains) {
            const nextExtras = battlefield.extraTerrains
                .map((t, idx) => (idx === targetItem.extraIndex ? { ...t, remainingRounds: rounds } : t))
                .filter((t) => t.remainingRounds > 0 && t.name.trim().length > 0);
            return {
                ...battlefield,
                extraTerrains: nextExtras
            };
        }
    } else if (targetItem.category === 'other') {
        if (!targetItem.isExtra) {
            return {
                ...battlefield,
                other: {
                    ...battlefield.other,
                    remainingRounds: rounds,
                    ...(rounds === 0 ? { name: '' } : {})
                }
            };
        } else if (targetItem.extraIndex !== undefined && battlefield.extraOther) {
            const nextExtras = battlefield.extraOther
                .map((o, idx) => (idx === targetItem.extraIndex ? { ...o, remainingRounds: rounds } : o))
                .filter((o) => o.remainingRounds > 0 && o.name.trim().length > 0);
            return {
                ...battlefield,
                extraOther: nextExtras
            };
        }
    } else if (targetItem.category === 'forceField') {
        const sideKey = targetItem.side === 'foe' ? 'foeSide' : 'playerSide';
        const currentSide = battlefield[sideKey];
        const fields = [...currentSide.forceFields] as [
            (typeof currentSide.forceFields)[0],
            (typeof currentSide.forceFields)[1]
        ];
        const idx = targetItem.forceFieldIndex ?? 0;
        fields[idx] = {
            ...fields[idx],
            remainingRounds: rounds,
            ...(rounds === 0 ? { name: '' } : {})
        };
        return {
            ...battlefield,
            [sideKey]: {
                ...currentSide,
                forceFields: fields
            }
        };
    }

    return battlefield;
}

/**
 * Permanently deletes / clears an active battlefield effect.
 */
export function deleteBattlefieldEffect(
    battlefield: BattlefieldData,
    targetItem: ActiveFieldEffectItem
): BattlefieldData {
    return updateBattlefieldEffectRounds(battlefield, targetItem, 0);
}

/**
 * Real-time synchronization helper:
 * 1. Mutates Zustand `activeBattlefield`
 * 2. Updates localStorage ('pokerole-pmd-extension/battlefield' and 'pkr_battle_organizer_data')
 * 3. Updates OBR scene metadata ('pokerole-pmd-extension/battlefield') if GM
 * 4. Broadcasts 'pokerole-pmd-extension/battle-organizer-sync'
 */
export function syncBattlefieldUpdate(newBattlefield: BattlefieldData): void {
    // 1. Mutate Zustand activeBattlefield
    useCharacterStore.getState().setActiveBattlefield(newBattlefield);

    // 2. Persist to localStorage
    try {
        localStorage.setItem(BATTLEFIELD_STORAGE_KEY, JSON.stringify(newBattlefield));
        const rawSaved = localStorage.getItem(BATTLE_ORGANIZER_STORAGE_KEY);
        if (rawSaved) {
            const parsed = JSON.parse(rawSaved) as BattleOrganizerState;
            parsed.battlefield = newBattlefield;
            localStorage.setItem(BATTLE_ORGANIZER_STORAGE_KEY, JSON.stringify(parsed));
        }
    } catch (e) {
        console.error('[battlefieldSyncUtils] Failed to persist battlefield to localStorage:', e);
    }

    // 3. OBR Synchronization (Broadcast & Scene Metadata)
    if (OBR.isAvailable && !isStandaloneMode) {
        let broadcastPayload: unknown = { battlefield: newBattlefield };
        try {
            const rawSaved = localStorage.getItem(BATTLE_ORGANIZER_STORAGE_KEY);
            if (rawSaved) {
                const parsed = JSON.parse(rawSaved) as BattleOrganizerState;
                parsed.battlefield = newBattlefield;
                broadcastPayload = parsed;
            }
        } catch {
            // Fallback to { battlefield: newBattlefield }
        }

        try {
            OBR.broadcast
                .sendMessage(BATTLE_ORGANIZER_SYNC_BROADCAST, broadcastPayload, {
                    destination: 'REMOTE'
                })
                .catch((err) => {
                    console.warn('[battlefieldSyncUtils] Failed to broadcast battle-organizer-sync:', err);
                });
        } catch (broadcastErr) {
            console.warn('[battlefieldSyncUtils] Broadcast send error:', broadcastErr);
        }

        OBR.player
            .getRole()
            .then((role) => {
                if (role === 'GM') {
                    OBR.scene.isReady().then((ready) => {
                        if (ready) {
                            OBR.scene
                                .setMetadata({
                                    [BATTLEFIELD_STORAGE_KEY]: newBattlefield
                                })
                                .catch((err) => {
                                    console.warn(
                                        '[battlefieldSyncUtils] Failed to save battlefield to scene metadata:',
                                        err
                                    );
                                });
                        }
                    });
                }
            })
            .catch(() => {});
    }
}
