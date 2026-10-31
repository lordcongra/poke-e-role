import type { CharacterState } from '../../store/storeTypes';
import type { BattlefieldData, BattleOrganizerState } from '../../types/battleOrganizerTypes';
import { getEffectsByCategory } from './fieldEffectsData';

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
    sideName: 'player' | 'foe',
    battlefield: BattlefieldData | null | undefined,
    activeAbilityName?: string,
    abilityActive?: boolean
): boolean {
    if (!battlefield) return false;

    // 1. Must have active Sunny / Harsh Sun / Desolate weather
    const activeWeathers = getEffectsByCategory(battlefield, 'weather');
    const hasSun = activeWeathers.some((w) => {
        const clean = (w?.name || '').trim().toLowerCase();
        return clean.includes('sun') || clean.includes('desolate');
    });
    if (!hasSun) return false;

    // 2. Prevent double-dipping if the active character itself has Flower Gift active
    if (activeAbilityName?.trim().toLowerCase() === 'flower gift' && abilityActive !== false) {
        return false;
    }

    // 3. Check side forceFields, extraForceFields, and other field descriptions
    const side = sideName === 'foe' ? battlefield.foeSide : battlefield.playerSide;
    if (side) {
        const inForceFields = side.forceFields?.some(
            (ff) =>
                ff?.name?.toLowerCase().includes('flower gift') &&
                (ff.remainingRounds > 0 || ff.remainingRounds === -1)
        );
        const inExtraForceFields = side.extraForceFields?.some(
            (ff) =>
                ff?.name?.toLowerCase().includes('flower gift') &&
                (ff.remainingRounds > 0 || ff.remainingRounds === -1)
        );
        const inOther = Boolean(side.other && side.other.toLowerCase().includes('flower gift'));
        const inExtraOther = Boolean(side.extraOther?.some((o) => o?.toLowerCase().includes('flower gift')));
        if (inForceFields || inExtraForceFields || inOther || inExtraOther) {
            return true;
        }
    }

    // 4. Check battle organizer combatants for unfainted Cherrim / Flower Gift on that side
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                if (activeRound?.combatants) {
                    const isTargetSide = sideName === 'player';
                    const hasCherrimOrFlowerGift = activeRound.combatants.some((c) => {
                        if (c.isFainted) return false;
                        const onSide = typeof c.isPlayerSide === 'boolean' ? c.isPlayerSide : !c.isNPC;
                        if (onSide !== isTargetSide) return false;

                        const abilityMatch =
                            c.ability?.trim().toLowerCase() === 'flower gift' && c.abilityActive !== false;
                        const speciesMatch = c.species?.trim().toLowerCase() === 'cherrim';
                        const nameMatch = c.name?.trim().toLowerCase().includes('cherrim');
                        return abilityMatch || speciesMatch || nameMatch;
                    });
                    if (hasCherrimOrFlowerGift) return true;
                }
            }
        } catch (e) {
            console.warn('[combatantSideUtils] Failed to check Flower Gift from battle organizer storage:', e);
        }
    }

    return false;
}

