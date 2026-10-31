import type { BattleOrganizerState, CombatantRowData, BattleRoundData } from '../../../types/battleOrganizerTypes';
import { parseRollLogEntry, type RollLogDataInput } from './battleOrganizerRollParser';
import { getBattleOrganizerSettings, isBattleOrganizerOpen } from './battleOrganizerSettingsHelper';
import { STORAGE_KEY } from './battleOrganizerUtils';
import { useCharacterStore } from '../../../store/useCharacterStore';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';

/**
 * Pure function to apply a parsed roll to combatants in a BattleOrganizerState.
 * Returns the updated state and a boolean indicating if anything changed.
 */
export function applyRollToBattleOrganizerState(
    prevState: BattleOrganizerState,
    logData: RollLogDataInput
): { nextState: BattleOrganizerState; changed: boolean } {
    const settings = getBattleOrganizerSettings();
    if (!settings.autoSyncActions || !logData) {
        return { nextState: prevState, changed: false };
    }

    if (logData.targetVisibility === 'gm_only') {
        const store = useCharacterStore.getState();
        if (store.role !== 'GM') {
            return { nextState: prevState, changed: false };
        }
    }

    const parsedRoll = parseRollLogEntry(logData);
    if (!parsedRoll || !parsedRoll.shouldAddToRoundTracker) {
        return { nextState: prevState, changed: false };
    }

    const { rollId, charName, moveName, rollTokenId, isEvade, isClash, cleanLabel } = parsedRoll;
    const currentRound = prevState.rounds[prevState.activeRoundIndex];
    if (!currentRound) {
        return { nextState: prevState, changed: false };
    }

    const hasActiveCombatants = currentRound.combatants.some((c) => c.tokenId || c.name.trim());
    if (!hasActiveCombatants) {
        return { nextState: prevState, changed: false };
    }

    let changed = false;
    const newCombatants = currentRound.combatants.map((c) => {
        if (!c.tokenId && !c.name.trim()) return c;

        const safeName = c.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const isMatch =
            (rollTokenId && c.tokenId && rollTokenId === c.tokenId) ||
            (charName && c.name.trim() && charName.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
            (c.name.trim() && new RegExp(`\\b${safeName}\\b`, 'i').test(cleanLabel));

        if (!isMatch) return c;

        const updatedCombatant = { ...c };

        if (isEvade && !updatedCombatant.evadeUsed) {
            updatedCombatant.evadeUsed = true;
            changed = true;
        }
        if (isClash && !updatedCombatant.clashUsed) {
            updatedCombatant.clashUsed = true;
            changed = true;
        }

        // Prevent duplicate action entry if this exact roll has already been recorded in an action slot
        if (rollId && updatedCombatant.actions.some((a) => a.rollId === rollId)) {
            return updatedCombatant;
        }

        const newActions = [...updatedCombatant.actions] as CombatantRowData['actions'];
        const targetIdx = newActions.findIndex((a) => !a.text.trim());
        if (targetIdx !== -1) {
            const isCrit = Boolean(logData.isCrit);
            const isCritFail = Boolean(logData.isCritFail);
            const critType = isCrit ? 'crit_hit' : isCritFail ? 'crit_fail' : 'none';
            const nextStatus = isCrit ? 'success' : isCritFail ? 'failed' : newActions[targetIdx].status;

            newActions[targetIdx] = {
                ...newActions[targetIdx],
                text: moveName,
                status: nextStatus,
                critType,
                rollId: rollId || undefined
            };
            updatedCombatant.actions = newActions;
            changed = true;
        }

        return updatedCombatant;
    });

    if (!changed) {
        return { nextState: prevState, changed: false };
    }

    const updatedRound: BattleRoundData = {
        ...currentRound,
        combatants: newCombatants
    };

    const nextState: BattleOrganizerState = {
        ...prevState,
        rounds: prevState.rounds.map((r, idx) => (idx === prevState.activeRoundIndex ? updatedRound : r))
    };

    return { nextState, changed: true };
}

const processedStorageRollIds = new Set<string>();
const lastStorageRollTimes = new Map<string, number>();

/**
 * When a roll occurs outside of the Battle Organizer (when BattleOrganizerModal is closed),
 * immediately applies the roll directly to the persisted Battle Organizer storage.
 * This guarantees action entries are saved even if the roll log is cleared before opening the organizer.
 */
export function applyRollToBattleOrganizerStorage(logData: RollLogDataInput): boolean {
    if (typeof localStorage === 'undefined') return false;

    // If Battle Organizer is actively open and mounted, useBattleOrganizerSync handles live React state
    if (isBattleOrganizerOpen()) return false;

    const rollId = String((logData as { id?: string }).id || '');
    if (rollId) {
        if (processedStorageRollIds.has(rollId)) {
            return false;
        }
        processedStorageRollIds.add(rollId);
        if (processedStorageRollIds.size > 200) {
            const first = processedStorageRollIds.values().next().value;
            if (first) processedStorageRollIds.delete(first);
        }
    }

    const parsedRoll = parseRollLogEntry(logData);
    if (!parsedRoll || !parsedRoll.shouldAddToRoundTracker) return false;

    // Throttle rapid duplicate rolls of the exact same action for the same combatant within 1.2s
    const throttleKey = `${parsedRoll.rollTokenId || parsedRoll.charName}|${parsedRoll.moveName.toLowerCase().trim()}|${parsedRoll.rollKind}`;
    const lastTime = lastStorageRollTimes.get(throttleKey);
    const now = Date.now();
    if (lastTime && now - lastTime < 1200) {
        return false;
    }
    lastStorageRollTimes.set(throttleKey, now);

    try {
        const rawSaved = localStorage.getItem(STORAGE_KEY);
        if (!rawSaved) return false;

        const parsed = JSON.parse(rawSaved) as BattleOrganizerState;
        if (!parsed || !Array.isArray(parsed.rounds) || parsed.rounds.length === 0) {
            return false;
        }

        const { nextState, changed } = applyRollToBattleOrganizerState(parsed, logData);
        if (!changed) return false;

        const nextJson = JSON.stringify(nextState);
        localStorage.setItem(STORAGE_KEY, nextJson);

        // Update active battlefield in character store if modified
        useCharacterStore.getState().setActiveBattlefield(nextState.battlefield);

        // Dispatch storage event so any listeners (popouts/widgets) update
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: nextJson }));

        // If in OBR mode and user is GM, broadcast state to other peers
        if (OBR.isAvailable && !isStandaloneMode) {
            OBR.player
                .getRole()
                .then((role) => {
                    if (role === 'GM') {
                        OBR.broadcast
                            .sendMessage('pokerole-pmd-extension/battle-organizer-sync', nextState, {
                                destination: 'REMOTE'
                            })
                            .catch(() => {});
                    }
                })
                .catch(() => {});
        }

        return true;
    } catch (e) {
        console.warn('[BattleOrganizerStorageSync] Failed to apply roll to storage:', e);
        return false;
    }
}
