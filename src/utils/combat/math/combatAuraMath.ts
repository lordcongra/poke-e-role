import type { CharacterState } from '@/store/storeTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { resolveCharacterSide } from '@/utils/combat/combatantSideUtils';
import { isTargetAffectedByAbility } from '@/utils/combat/abilityTargetingUtils';
import { readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';

export interface FieldAuraDamageBonusResult {
    diceBonus: number;
    tag: string;
}

export const AURA_NAMES = {
    DARK_AURA: 'dark aura',
    FAIRY_AURA: 'fairy aura',
    AURA_BREAK: 'aura break',
    NEUTRALIZING_GAS: 'neutralizing gas'
} as const;

/**
 * Calculates dice bonus or penalty applied to Dark and Fairy moves
 * from active field auras (Dark Aura, Fairy Aura) and Aura Break reversal.
 */
export function getFieldAuraDamageBonus(
    moveType: string | undefined,
    battlefield: CharacterState['activeBattlefield'],
    isNPC?: boolean,
    state?: CharacterState
): FieldAuraDamageBonusResult {
    if (!moveType) return { diceBonus: 0, tag: '' };

    const cleanType = moveType.trim().toLowerCase();
    if (cleanType !== 'dark' && cleanType !== 'fairy') {
        return { diceBonus: 0, tag: '' };
    }

    let charState = state;
    if (!charState) {
        try {
            charState = useCharacterStore.getState();
        } catch {
            charState = undefined;
        }
    }

    const resolvedSide = charState ? resolveCharacterSide(charState) : (isNPC ? 'foe' : 'player');
    const rollerSide: 'player' | 'foe' =
        resolvedSide === 'foe' ? 'foe' : resolvedSide === 'player' ? 'player' : (isNPC ? 'foe' : 'player');
    const rollerId = charState
        ? charState.identity.entityId || charState.tokenId || charState.identity.nickname || charState.identity.species || ''
        : '';

    const checkAuraOnField = (auraName: string): boolean => {
        // 1. Direct check if target is affected by aura
        if (isTargetAffectedByAbility(rollerId, rollerSide, auraName, battlefield)) {
            return true;
        }

        // 2. Self has active aura and is not suppressed by Neutralizing Gas
        if (charState) {
            const selfAbility = (charState.identity.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
            if (selfAbility === auraName && charState.identity.abilityActive !== false) {
                if (!isTargetAffectedByAbility(rollerId, rollerSide, AURA_NAMES.NEUTRALIZING_GAS, battlefield)) {
                    return true;
                }
            }
        }

        // 3. Check active combatants from battle organizer storage
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const raw = readBattleOrganizerStateRaw();
                if (raw) {
                    const data = JSON.parse(raw);
                    const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                    if (activeRound?.combatants && Array.isArray(activeRound.combatants)) {
                        const hasActive = activeRound.combatants.some((c: any) => {
                            if (c.isFainted || c.abilityActive === false) return false;
                            const ab = (c.ability || '').replace(/\s*\(HA\)$/i, '').trim().toLowerCase();
                            if (ab !== auraName) return false;
                            const cSide = (typeof c.isPlayerSide === 'boolean' ? c.isPlayerSide : !c.isNPC) ? 'player' : 'foe';
                            const cIdentifiers = [c.id, c.tokenId, c.entityId, c.name].filter(Boolean);
                            return !isTargetAffectedByAbility(cIdentifiers, cSide, AURA_NAMES.NEUTRALIZING_GAS, battlefield);
                        });
                        if (hasActive) return true;
                    }
                }
            } catch {
                // Ignore storage parse issues
            }
        }

        return false;
    };

    const hasAuraBreak = checkAuraOnField(AURA_NAMES.AURA_BREAK);

    if (cleanType === 'dark') {
        const hasDarkAura = checkAuraOnField(AURA_NAMES.DARK_AURA);
        if (!hasDarkAura) return { diceBonus: 0, tag: '' };

        if (hasAuraBreak) {
            return {
                diceBonus: -1,
                tag: 'Ability: Dark Aura Reversed by Aura Break (-1 Dmg)'
            };
        }
        return {
            diceBonus: 1,
            tag: 'Ability: Dark Aura (+1 Dmg)'
        };
    }

    if (cleanType === 'fairy') {
        const hasFairyAura = checkAuraOnField(AURA_NAMES.FAIRY_AURA);
        if (!hasFairyAura) return { diceBonus: 0, tag: '' };

        if (hasAuraBreak) {
            return {
                diceBonus: -1,
                tag: 'Ability: Fairy Aura Reversed by Aura Break (-1 Dmg)'
            };
        }
        return {
            diceBonus: 1,
            tag: 'Ability: Fairy Aura (+1 Dmg)'
        };
    }

    return { diceBonus: 0, tag: '' };
}

