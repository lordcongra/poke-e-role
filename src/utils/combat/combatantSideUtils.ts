import type { CharacterState } from '../../store/storeTypes';
import type { BattlefieldData, BattleOrganizerState } from '../../types/battleOrganizerTypes';
import { isTargetAffectedByAbility } from './abilityTargetingUtils';

/**
 * Resolves whether a given CharacterState belongs to the 'player' (Ally) side or 'foe' side.
 * Checks in order:
 * 1. Active round combatant entries in `localStorage['pkr_battle_organizer_data']`:
 *    - Matched combatants return their resolved side ('player' or 'foe').
 *    - Unmatched characters return 'none' when active round combatants exist.
 * 2. Fallback (no active combatants in round):
 *    - Explicit `isPlayerSide` on identity if set, else `state.identity.isNPC` (NPC -> 'foe', PC -> 'player').
 */
export function resolveCharacterSide(state: CharacterState): 'player' | 'foe' | 'none' {
    if (!state || !state.identity) return 'none';

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                if (activeRound?.combatants && activeRound.combatants.length > 0) {
                    const matched = activeRound.combatants.find((c) => {
                        if (state.tokenId && c.tokenId && state.tokenId === c.tokenId) {
                            return true;
                        }
                        const nickname = state.identity.nickname?.trim().toLowerCase();
                        const species = state.identity.species?.trim().toLowerCase();
                        const cName = c.name?.trim().toLowerCase();
                        if (nickname && cName === nickname) return true;
                        if (species && cName === species) return true;
                        return false;
                    });
                    if (matched) {
                        if (typeof matched.isPlayerSide === 'boolean') {
                            return matched.isPlayerSide ? 'player' : 'foe';
                        }
                        return matched.isNPC ? 'foe' : 'player';
                    }
                    return 'none';
                }
            }
        } catch (e) {
            console.warn('[combatantSideUtils] Failed to resolve combatant side from storage:', e);
        }
    }

    if ((state.identity as { isPlayerSide?: boolean }).isPlayerSide !== undefined) {
        return (state.identity as { isPlayerSide?: boolean }).isPlayerSide ? 'player' : 'foe';
    }

    return state.identity.isNPC ? 'foe' : 'player';
}

/**
 * Evaluates whether Cherrim's "Flower Gift" aura is active for a given side ('player' or 'foe').
 *
 * Rules:
 * 1. Requires active Sunny/Harsh Sunlight/Desolate weather on the battlefield.
 * 2. Returns false for Cherrim itself when its own ability is active (to prevent double-dipping with its own tags).
 * 3. Returns true if the side's forceFields or other notes explicitly contain "flower gift".
 * 4. Checks active round combatants in localStorage to see if an unfainted ally on that side has Flower Gift / Cherrim.
 */
export function isFlowerGiftActiveForSide(
    sideName: 'player' | 'foe' | 'none',
    battlefield: BattlefieldData | null | undefined,
    activeAbilityName?: string,
    abilityActive?: boolean
): boolean {
    if (sideName !== 'player' && sideName !== 'foe') {
        return false;
    }
    // Prevent double-dipping if the active character itself has Flower Gift active
    if (activeAbilityName?.trim().toLowerCase() === 'flower gift' && abilityActive !== false) {
        return false;
    }
    return isTargetAffectedByAbility('', sideName, 'flower gift', battlefield);
}
