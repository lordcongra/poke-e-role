import type { BattleOrganizerState } from '../../../types/battleOrganizerTypes';
import { useBattleOrganizerTokenWatch } from './useBattleOrganizerTokenWatch';
import { useBattleOrganizerTokenSync } from './useBattleOrganizerTokenSync';
import { useBattleOrganizerTokenImport } from './useBattleOrganizerTokenImport';

export interface UseBattleOrganizerTokenOpsProps {
    state: BattleOrganizerState;
    updateState: (
        updater: (prev: BattleOrganizerState) => BattleOrganizerState,
        immediate?: boolean,
        skipBroadcast?: boolean
    ) => void;
    lastTokenFingerprintsRef: React.MutableRefObject<Map<string, string>>;
    tokenSyncTimersRef: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
    pendingTokenSyncRef: React.MutableRefObject<
        Map<string, { statusText: string; hpCurr?: number; willCurr?: number; until: number }>
    >;
}

/**
 * Coordinated Token Operations for the Battle Organizer.
 * Decomposed into:
 * - `useBattleOrganizerTokenWatch`: Inbound real-time soft-sync from OBR tokens, sheets & storage
 * - `useBattleOrganizerTokenSync`: Outbound sync from Battle Organizer back to tokens & sheets
 * - `useBattleOrganizerTokenImport`: Ingesting characters from Initiative & scene tokens
 */
export function useBattleOrganizerTokenOps({
    state,
    updateState,
    lastTokenFingerprintsRef,
    tokenSyncTimersRef,
    pendingTokenSyncRef
}: UseBattleOrganizerTokenOpsProps) {
    // 1. Inbound Watch & Reactive Listeners
    const { refreshTokenStats } = useBattleOrganizerTokenWatch({
        updateState,
        lastTokenFingerprintsRef,
        pendingTokenSyncRef
    });

    // 2. Outbound Sync to Tokens & Sheets
    const { syncToSheets, syncCombatantToToken } = useBattleOrganizerTokenSync({
        state,
        updateState,
        tokenSyncTimersRef,
        pendingTokenSyncRef
    });

    // 3. Initiative & Character Ingestion
    const { pullFromInitiative } = useBattleOrganizerTokenImport({
        updateState
    });

    return {
        refreshTokenStats,
        pullFromInitiative,
        syncToSheets,
        syncCombatantToToken
    };
}
