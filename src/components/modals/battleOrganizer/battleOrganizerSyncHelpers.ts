import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '@/store/useCharacterStore';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { EXTENSION_ID } from '@/hooks/owlbearSync/owlbearSyncConstants';
import { sendSafeBroadcastPayload } from '@/hooks/owlbearSync/owlbearBroadcastUtils';
import type {
    BattlefieldData,
    BattleOrganizerState,
    BattleRoundData,
    CombatantRowData
} from '@/types/battleOrganizerTypes';

export const BATTLE_ORGANIZER_SYNC_CHANNEL = `${EXTENSION_ID}/battle-organizer-sync`;
export const BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL = `${EXTENSION_ID}/battle-organizer-combatant-patch`;

export const COMBATANT_PATCH_ALLOWLIST = [
    'hpCurr',
    'hpMax',
    'willCurr',
    'willMax',
    'tempHp',
    'tempWill',
    'status',
    'isFainted',
    'actions',
    'evadeUsed',
    'clashUsed',
    'abilityTargetIds',
    'name',
    'initiative',
    'baseInit'
] as const;

export type CombatantPatchField = (typeof COMBATANT_PATCH_ALLOWLIST)[number];
export type CombatantPatchData = Partial<Pick<CombatantRowData, CombatantPatchField>>;

export interface BattleOrganizerCombatantPatchPayload {
    roundIndex: number;
    combatantId: string;
    tokenId?: string;
    entityId?: string;
    patch: CombatantPatchData;
}

const COMBATANT_PATCH_ALLOWLIST_SET = new Set<string>(COMBATANT_PATCH_ALLOWLIST);

function areFieldValuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (Array.isArray(a) || Array.isArray(b)) {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
}

function assignPatchField(target: Record<string, unknown>, key: string, value: unknown): void {
    target[key] = value;
}

/**
 * Returns true when this client is allowed to broadcast full Battle Organizer state.
 * In OBR mode, only the GM is authoritative for full-state broadcasts.
 */
export function canBroadcastFullBattleOrganizerState(): boolean {
    return isStandaloneMode || useCharacterStore.getState().role === 'GM';
}

/**
 * Broadcasts full Battle Organizer state over OBR using 16kB-safe chunking,
 * strictly gated so non-GM OBR clients can never overwrite table state.
 */
export async function sendBattleOrganizerFullSync(
    payload: BattleOrganizerState | { battlefield: BattlefieldData }
): Promise<boolean> {
    if (isStandaloneMode || !OBR.isAvailable) return false;
    if (!canBroadcastFullBattleOrganizerState()) return false;

    try {
        await sendSafeBroadcastPayload(BATTLE_ORGANIZER_SYNC_CHANNEL, payload, {
            destination: 'REMOTE'
        });
        return true;
    } catch (err) {
        console.warn('[BattleOrganizerSync] Failed to broadcast full state:', err);
        return false;
    }
}

/**
 * Filters a raw patch object down to strictly allowlisted combatant fields.
 */
export function sanitizeCombatantPatch(rawPatch: unknown): CombatantPatchData {
    const clean: Record<string, unknown> = {};
    if (!rawPatch || typeof rawPatch !== 'object' || Array.isArray(rawPatch)) {
        return clean as CombatantPatchData;
    }
    for (const [key, value] of Object.entries(rawPatch as Record<string, unknown>)) {
        if (!COMBATANT_PATCH_ALLOWLIST_SET.has(key) || value === undefined) continue;
        assignPatchField(clean, key, value);
    }
    return clean as CombatantPatchData;
}

/**
 * Builds a minimal allowlisted patch containing only fields that changed from `prev`.
 */
export function pickAllowlistedCombatantPatch(
    updated: CombatantRowData,
    prev?: CombatantRowData
): CombatantPatchData {
    const patch: Record<string, unknown> = {};
    for (const key of COMBATANT_PATCH_ALLOWLIST) {
        const nextVal = updated[key];
        if (nextVal === undefined) continue;
        if (prev && areFieldValuesEqual(nextVal, prev[key])) continue;
        assignPatchField(patch, key, nextVal);
    }
    return patch as CombatantPatchData;
}

/**
 * Broadcasts a lightweight allowlisted combatant delta from non-GM OBR clients to the GM.
 */
export async function sendBattleOrganizerCombatantPatch(
    payload: BattleOrganizerCombatantPatchPayload
): Promise<boolean> {
    if (isStandaloneMode || !OBR.isAvailable) return false;
    if (useCharacterStore.getState().role === 'GM') return false;

    const cleanPatch = sanitizeCombatantPatch(payload.patch);
    if (Object.keys(cleanPatch).length === 0) return false;

    try {
        await sendSafeBroadcastPayload(
            BATTLE_ORGANIZER_COMBATANT_PATCH_CHANNEL,
            {
                roundIndex: payload.roundIndex,
                combatantId: payload.combatantId,
                tokenId: payload.tokenId,
                entityId: payload.entityId,
                patch: cleanPatch
            },
            { destination: 'REMOTE' }
        );
        return true;
    } catch (err) {
        console.warn('[BattleOrganizerSync] Failed to broadcast combatant patch:', err);
        return false;
    }
}

function matchesPatchedCombatant(
    c: CombatantRowData,
    payload: BattleOrganizerCombatantPatchPayload
): boolean {
    if (payload.combatantId && c.id === payload.combatantId) return true;
    if (payload.tokenId && c.tokenId && c.tokenId === payload.tokenId) return true;
    if (payload.entityId && c.entityId && c.entityId === payload.entityId) return true;
    return false;
}

/**
 * Purely merges an allowlisted combatant patch into a single matching combatant,
 * preserving all other rows (including GM NPCs and hidden combatants).
 */
export function applyCombatantPatchToState(
    state: BattleOrganizerState,
    payload: BattleOrganizerCombatantPatchPayload
): { nextState: BattleOrganizerState; changed: boolean } {
    if (!state || !Array.isArray(state.rounds) || state.rounds.length === 0 || !payload) {
        return { nextState: state, changed: false };
    }

    const roundIdx =
        typeof payload.roundIndex === 'number' && payload.roundIndex >= 0
            ? payload.roundIndex
            : state.activeRoundIndex;
    const targetRound = state.rounds[roundIdx];
    if (!targetRound || !Array.isArray(targetRound.combatants)) {
        return { nextState: state, changed: false };
    }

    const cleanPatch = sanitizeCombatantPatch(payload.patch);
    const patchEntries = Object.entries(cleanPatch);
    if (patchEntries.length === 0) {
        return { nextState: state, changed: false };
    }

    let changed = false;
    let faintedChanged = false;

    const nextCombatants = targetRound.combatants.map((c) => {
        if (!matchesPatchedCombatant(c, payload)) return c;

        const nextRecord: Record<string, unknown> = { ...c };
        let rowChanged = false;

        for (const [key, value] of patchEntries) {
            if (!areFieldValuesEqual(nextRecord[key], value)) {
                if (key === 'isFainted') faintedChanged = true;
                nextRecord[key] = value;
                rowChanged = true;
            }
        }

        if (!rowChanged) return c;
        changed = true;
        return nextRecord as unknown as CombatantRowData;
    });

    if (!changed) {
        return { nextState: state, changed: false };
    }

    const updatedRound: BattleRoundData = {
        ...targetRound,
        combatants: nextCombatants
    };

    let nextBattlefield = state.battlefield;
    if (faintedChanged && roundIdx === state.activeRoundIndex && state.battlefield) {
        nextBattlefield = {
            ...state.battlefield,
            playerTargets: nextCombatants.filter((c) => c.isPlayerSide && !c.isFainted).length,
            foeTargets: nextCombatants.filter((c) => !c.isPlayerSide && !c.isFainted).length
        };
    }

    return {
        nextState: {
            ...state,
            battlefield: nextBattlefield,
            rounds: state.rounds.map((r, idx) => (idx === roundIdx ? updatedRound : r))
        },
        changed: true
    };
}

/** Pure HP delta update helper (absorbs Temp HP before base HP). */
export function computeCombatantHpUpdate(combatant: CombatantRowData, delta: number): CombatantRowData {
    const curr = combatant.hpCurr ?? 0;
    const max = combatant.hpMax && combatant.hpMax > 0 ? combatant.hpMax : 999;
    let nextHp = curr;
    let nextTempHp = combatant.tempHp ?? 0;

    if (delta < 0) {
        const damage = Math.abs(delta);
        if (nextTempHp > 0) {
            const absorbed = Math.min(nextTempHp, damage);
            nextTempHp -= absorbed;
            nextHp = Math.max(0, curr - (damage - absorbed));
        } else {
            nextHp = Math.max(0, curr - damage);
        }
    } else if (delta > 0) {
        nextHp = Math.max(0, Math.min(max, curr + delta));
    }

    const nextFainted = nextHp <= 0 ? true : combatant.isFainted;
    let nextStatus = combatant.status || 'Healthy';
    if (nextHp <= 0 && !nextStatus.toLowerCase().includes('faint')) {
        nextStatus = nextStatus === 'Healthy' ? 'Fainted' : `${nextStatus}, Fainted`;
    }

    return {
        ...combatant,
        hpCurr: nextHp,
        tempHp: nextTempHp,
        isFainted: nextFainted,
        status: nextStatus
    };
}

/** Pure Will delta update helper (absorbs Temp Will before base Will). */
export function computeCombatantWillUpdate(combatant: CombatantRowData, delta: number): CombatantRowData {
    const curr = combatant.willCurr ?? 0;
    const max = combatant.willMax && combatant.willMax > 0 ? combatant.willMax : 999;
    let nextWill = curr;
    let nextTempWill = combatant.tempWill ?? 0;

    if (delta < 0) {
        const drain = Math.abs(delta);
        if (nextTempWill > 0) {
            const absorbed = Math.min(nextTempWill, drain);
            nextTempWill -= absorbed;
            nextWill = Math.max(0, curr - (drain - absorbed));
        } else {
            nextWill = Math.max(0, curr - drain);
        }
    } else if (delta > 0) {
        nextWill = Math.max(0, Math.min(max, curr + delta));
    }

    return {
        ...combatant,
        willCurr: nextWill,
        tempWill: nextTempWill
    };
}
