import { STATS_META_ID } from '../../utils/graphics/graphicsManager';

export const METADATA_ID = STATS_META_ID;
export const ROOM_META_ID = 'pokerole-pmd-extension/room-settings';
export const EXTENSION_ID = 'pokerole-pmd-extension';

export interface RollSyncData {
    id: string;
    targetVisibility: string;
    playerId: string;
    player: string;
    label: string;
    result: string;
    icon: string;
}

export interface TransformData {
    x: number;
    y: number;
    r: number;
    v: boolean;
    metaStr: string;
}

export function mapRoomSettings(sData: Record<string, unknown>) {
    return {
        ruleset: sData.ruleset !== undefined ? String(sData.ruleset) : undefined,
        pain: sData.painEnabled !== undefined ? (sData.painEnabled ? 'Enabled' : 'Disabled') : undefined,
        diceEngine: sData.diceEngine !== undefined ? (String(sData.diceEngine) as 'dice-plus' | 'car') : undefined,
        homebrewAccess: sData.homebrewAccess !== undefined ? String(sData.homebrewAccess) : undefined,
        gmOnlyLootGen: sData.gmOnlyLootGen !== undefined ? Boolean(sData.gmOnlyLootGen) : undefined,
        gmOnlyGenerators: sData.gmOnlyGenerators !== undefined ? Boolean(sData.gmOnlyGenerators) : undefined,
        gmOnlyMatchups: sData.gmOnlyMatchups !== undefined ? Boolean(sData.gmOnlyMatchups) : undefined,
        gmOnlyDamageOverride:
            sData.gmOnlyDamageOverride !== undefined ? Boolean(sData.gmOnlyDamageOverride) : undefined,
        gmOnlyTrackers: sData.gmOnlyTrackers !== undefined ? Boolean(sData.gmOnlyTrackers) : undefined,
        gmOnlyAttributeLock: sData.gmOnlyAttributeLock !== undefined ? Boolean(sData.gmOnlyAttributeLock) : undefined,
        pmdSkills: sData.pmdSkills !== undefined ? Boolean(sData.pmdSkills) : undefined,
        gmDemoMode: sData.gmDemoMode !== undefined ? Boolean(sData.gmDemoMode) : undefined,
        roomDefaultScale: sData.roomDefaultScale !== undefined ? Number(sData.roomDefaultScale) : undefined,
        roomDefaultOffsetX: sData.roomDefaultOffsetX !== undefined ? Number(sData.roomDefaultOffsetX) : undefined,
        roomDefaultOffsetY: sData.roomDefaultOffsetY !== undefined ? Number(sData.roomDefaultOffsetY) : undefined
    };
}

export function getEffectiveScaleAndOffsets(identity: {
    sceneDefaultScale?: number | null;
    roomDefaultScale?: number;
    sceneDefaultOffsetX?: number | null;
    roomDefaultOffsetX?: number;
    sceneDefaultOffsetY?: number | null;
    roomDefaultOffsetY?: number;
}) {
    const effectiveScale =
        identity.sceneDefaultScale != null && identity.sceneDefaultScale > 0
            ? identity.sceneDefaultScale
            : (identity.roomDefaultScale ?? 100);
    const effectiveOffsetX =
        identity.sceneDefaultOffsetX != null ? identity.sceneDefaultOffsetX : (identity.roomDefaultOffsetX ?? 0);
    const effectiveOffsetY =
        identity.sceneDefaultOffsetY != null ? identity.sceneDefaultOffsetY : (identity.roomDefaultOffsetY ?? 0);

    return { effectiveScale, effectiveOffsetX, effectiveOffsetY };
}
