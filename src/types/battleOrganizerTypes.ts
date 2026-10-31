export interface BattleOrganizerTimerEffect {
    name: string;
    remainingRounds: number; // 0 to 4+, or -1 for Until End of Scene
}

export interface BattlefieldSideData {
    forceFields: [BattleOrganizerTimerEffect, BattleOrganizerTimerEffect];
    extraForceFields?: BattleOrganizerTimerEffect[];
    entryHazard: string;
    extraHazards?: string[];
    cover: string;
    other: string;
    extraOther?: string[];
}

export type BattlefieldSideHighlight = 'all' | 'player' | 'foe';

export interface BattlefieldData {
    location: string;
    weather: BattleOrganizerTimerEffect;
    terrain: BattleOrganizerTimerEffect;
    other: BattleOrganizerTimerEffect;
    extraWeathers?: BattleOrganizerTimerEffect[];
    extraTerrains?: BattleOrganizerTimerEffect[];
    extraOther?: BattleOrganizerTimerEffect[];
    playerSide: BattlefieldSideData;
    foeSide: BattlefieldSideData;
    playerTargets: number | string;
    foeTargets: number | string;
    highlightedSide: BattlefieldSideHighlight;
    sceneId?: string;
    broadcastToPlayers?: boolean;
}

export type ActionStatus = 'none' | 'success' | 'failed';
export type ActionCritType = 'none' | 'crit_hit' | 'crit_fail';

export interface ActionSlotData {
    text: string;
    status: ActionStatus;
    critType?: ActionCritType;
    rollId?: string;
}

export interface CombatantRowData {
    id: string;
    tokenId?: string;
    entityId?: string;
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
    hpCurr?: number;
    hpMax?: number;
    willCurr?: number;
    willMax?: number;
    tempHp?: number;
    tempWill?: number;
    activeTransformation?: string;
    ability?: string;
    abilityActive?: boolean;
    species?: string;
    isNPC?: boolean;
    hidden?: boolean;
    gmHpBar?: boolean;
    gmHpText?: boolean;
    gmWillBar?: boolean;
    gmWillText?: boolean;
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

export type RollLogLayoutMode = 'floating' | 'full-sidebar' | 'battlefield-nested' | 'rounds-nested';

export interface BattleOrganizerSettings {
    showBattlefield: boolean;
    showRoundTracker: boolean;
    windowMode?: BattleOrganizerWindowMode;
    autoSyncActions: boolean;
    fullScreen?: boolean;
    rollLogMode?: RollLogLayoutMode;
    showCriticalMarks?: boolean;
}
