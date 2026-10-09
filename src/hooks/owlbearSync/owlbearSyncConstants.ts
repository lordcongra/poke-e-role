import OBR from '@owlbear-rodeo/sdk';
export const METADATA_ID = 'pokerole-extension/stats';
export const ROOM_META_ID = 'pokerole-pmd-extension/room-settings';
export const EXTENSION_ID = 'pokerole-pmd-extension';

/**
 * Displays the Dice+ retirement notification at most once per user session
 * to prevent annoying notification spam during gameplay or sync loops.
 */
export function showDicePlusRetirementNotice(message?: string): void {
    if (typeof window === 'undefined') return;
    try {
        if (sessionStorage.getItem('pkr_dice_plus_retired_warned')) return;
        sessionStorage.setItem('pkr_dice_plus_retired_warned', 'true');
    } catch {
        // ignore storage quota/security issues
    }
    if (OBR.isAvailable) {
        OBR.notification.show(
            message ||
                '[ ⚠️ ] Dice+ has been retired and removed. Please install Custom Action Rolls (CAR): https://custom-action-rolls.narcolepticdracu.com/manifest.json',
            'WARNING'
        );
    }
}

export interface RollSyncData {
    id: string;
    targetVisibility?: string;
    playerId?: string;
    player: string;
    characterName?: string;
    tokenId?: string;
    label: string;
    result: string;
    icon: string;
    rollType?: string;
    isCrit?: boolean;
    targetTokenId?: string;
    targetId?: string;
    targetCombatantId?: string;
    targetName?: string;
    target?: string;
    damage?: number;
    damageValue?: number;
    incomingDamage?: number;
    isDirectDamage?: boolean;
    isTarget?: boolean;
    applyDamage?: boolean;
}

export interface TransformData {
    x: number;
    y: number;
    r: number;
    v: boolean;
    metaStr: string;
}

export { mapRoomSettings } from '../../utils/sync/roomSettingsMeta';

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
