import type { CharacterState } from '../../store/storeTypes';
import type { BattleOrganizerState } from '../../types/battleOrganizerTypes';

/**
 * Resolves whether a given CharacterState belongs to the 'player' (Ally) side or 'foe' side.
 * Checks in order:
 * 1. Explicit `isPlayerSide` on the character identity.
 * 2. Active round combatant entries in `localStorage['pkr_battle_organizer_data']`.
 * 3. Fallback to `state.identity.isNPC` (NPC -> 'foe', PC -> 'player').
 */
export function resolveCharacterSide(state: CharacterState): 'player' | 'foe' {
    if (!state || !state.identity) return 'player';

    if ((state.identity as { isPlayerSide?: boolean }).isPlayerSide !== undefined) {
        return (state.identity as { isPlayerSide?: boolean }).isPlayerSide ? 'player' : 'foe';
    }

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                if (activeRound?.combatants) {
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
                    if (matched && typeof matched.isPlayerSide === 'boolean') {
                        return matched.isPlayerSide ? 'player' : 'foe';
                    }
                }
            }
        } catch (e) {
            console.warn('[combatantSideUtils] Failed to resolve combatant side from storage:', e);
        }
    }

    return state.identity.isNPC ? 'foe' : 'player';
}
