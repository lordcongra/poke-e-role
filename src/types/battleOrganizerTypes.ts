export interface BattleOrganizerTimerEffect {
    name: string;
    remainingRounds: number; // 0 to 4+
}

export interface BattlefieldSideData {
    forceFields: [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
    entryHazard: string;
    cover: string;
    other: string;
}

export type BattlefieldSideHighlight = 'all' | 'player' | 'foe';

export interface BattlefieldData {
    location: string;
    weather: BattleOrganizerTimerEffect;
    terrain: BattleOrganizerTimerEffect;
    other: BattleOrganizerTimerEffect;
    playerSide: BattlefieldSideData;
    foeSide: BattlefieldSideData;
    playerTargets: number | string;
    foeTargets: number | string;
    highlightedSide: BattlefieldSideHighlight;
}

export type ActionStatus = 'none' | 'success' | 'failed';

export interface ActionSlotData {
    text: string;
    status: ActionStatus;
}

export interface CombatantRowData {
    id: string;
    tokenId?: string;
    initiative: string;
    baseInit?: number;
    name: string;
    image?: string;
    heldItem: string;
    status: string;
    isFainted?: boolean;
    actions: [ActionSlotData, ActionSlotData, ActionSlotData, ActionSlotData, ActionSlotData];
    evadeUsed: boolean;
    clashUsed: boolean;
    isPlayerSide?: boolean;
}

export interface BattleRoundData {
    id: string;
    roundNumber: number;
    combatants: CombatantRowData[];
    endOfRoundEffects: string;
}

export interface BattleOrganizerState {
    battlefield: BattlefieldData;
    rounds: BattleRoundData[];
    activeRoundIndex: number;
}

export type BattleOrganizerWindowMode = 'popover' | 'modal' | 'popout';

export interface BattleOrganizerSettings {
    showBattlefield: boolean;
    showRoundTracker: boolean;
    windowMode?: BattleOrganizerWindowMode;
    autoSyncActions: boolean;
}
