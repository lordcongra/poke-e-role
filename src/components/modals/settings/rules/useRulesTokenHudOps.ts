import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../../store/useCharacterStore';
import { isStandaloneMode } from '../../../../utils/storageAdapter';
import {
    flushRoomSettingsToOwlbear,
    flushSceneSettingsToOwlbear,
    clearSceneScaleFromOwlbear,
    clearSceneOffsetsFromOwlbear
} from '../../../../utils/obr';
import { renderAllSceneTokens } from '../../../../utils/graphicsRenderer';

export function useRulesTokenHudOps() {
    const roomDefaultScale = useCharacterStore((state) => state.identity.roomDefaultScale);
    const sceneDefaultScale = useCharacterStore((state) => state.identity.sceneDefaultScale);
    const roomDefaultOffsetX = useCharacterStore((state) => state.identity.roomDefaultOffsetX);
    const roomDefaultOffsetY = useCharacterStore((state) => state.identity.roomDefaultOffsetY);
    const sceneDefaultOffsetX = useCharacterStore((state) => state.identity.sceneDefaultOffsetX);
    const sceneDefaultOffsetY = useCharacterStore((state) => state.identity.sceneDefaultOffsetY);
    const gmOnlyTrackers = useCharacterStore((state) => state.identity.gmOnlyTrackers);

    const updateRoomSetting = useCharacterStore((state) => state.updateRoomSetting);
    const updateSceneScale = useCharacterStore((state) => state.updateSceneScale);
    const setSceneScale = useCharacterStore((state) => state.setSceneScale);
    const updateSceneOffsets = useCharacterStore((state) => state.updateSceneOffsets);
    const setSceneOffsets = useCharacterStore((state) => state.setSceneOffsets);

    const [isSyncingGlobalScale, setIsSyncingGlobalScale] = useState(false);
    const [isSyncingRoomScale, setIsSyncingRoomScale] = useState(false);
    const [isSyncingGlobalOffsets, setIsSyncingGlobalOffsets] = useState(false);
    const [isSyncingRoomOffsets, setIsSyncingRoomOffsets] = useState(false);

    const handleTrackersVisibilityChange = (gmOnly: boolean, e: React.ChangeEvent<HTMLSelectElement>) => {
        e.target.blur();
        updateRoomSetting('gmOnlyTrackers', gmOnly);
        if (!isStandaloneMode) {
            flushRoomSettingsToOwlbear({ gmOnlyTrackers: gmOnly }).catch(() => {});
        }
        renderAllSceneTokens(true).catch(() => {});
    };

    const handleGlobalScaleChange = (val: number) => {
        const clamped = Math.max(25, Math.min(300, val));
        updateRoomSetting('roomDefaultScale', clamped);
        if (sceneDefaultScale === null || sceneDefaultScale === undefined) {
            renderAllSceneTokens(false, clamped).catch(() => {});
        }
    };

    const handleSyncGlobalScale = async () => {
        setIsSyncingGlobalScale(true);
        try {
            const targetScale = roomDefaultScale ?? 100;
            await flushRoomSettingsToOwlbear({ roomDefaultScale: targetScale });
            if (sceneDefaultScale === null || sceneDefaultScale === undefined) {
                await renderAllSceneTokens(true, targetScale);
            }
            if (OBR.isAvailable) {
                OBR.notification.show(`Saved ${targetScale}% Global Scale to room settings!`, 'SUCCESS');
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to sync global scale:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to save Global Scale.', 'ERROR');
            }
        } finally {
            setIsSyncingGlobalScale(false);
        }
    };

    const handleRoomScaleChange = (val: number) => {
        const clamped = Math.max(25, Math.min(300, val));
        updateSceneScale(clamped);
        renderAllSceneTokens(false, clamped).catch(() => {});
    };

    const handleSyncRoomScale = async () => {
        setIsSyncingRoomScale(true);
        try {
            const targetScale = sceneDefaultScale ?? roomDefaultScale ?? 100;
            updateSceneScale(targetScale);
            await flushSceneSettingsToOwlbear({ sceneDefaultScale: targetScale });
            await renderAllSceneTokens(true, targetScale);
            if (OBR.isAvailable) {
                OBR.notification.show(`Applied ${targetScale}% Room Scale override to current scene!`, 'SUCCESS');
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to sync room scale:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to apply Room Scale.', 'ERROR');
            }
        } finally {
            setIsSyncingRoomScale(false);
        }
    };

    const handleClearRoomScale = async () => {
        setIsSyncingRoomScale(true);
        try {
            await clearSceneScaleFromOwlbear();
            setSceneScale(null);
            const fallbackScale = roomDefaultScale ?? 100;
            await renderAllSceneTokens(true, fallbackScale);
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Cleared Room Scale override. Reverted to Global Scale (${fallbackScale}%).`,
                    'SUCCESS'
                );
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to clear room scale:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to clear Room Scale.', 'ERROR');
            }
        } finally {
            setIsSyncingRoomScale(false);
        }
    };

    const handleGlobalOffsetXChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateRoomSetting('roomDefaultOffsetX', clamped);
        if (sceneDefaultOffsetX === null || sceneDefaultOffsetX === undefined) {
            renderAllSceneTokens(false, undefined, clamped, roomDefaultOffsetY ?? 0).catch(() => {});
        }
    };

    const handleGlobalOffsetYChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateRoomSetting('roomDefaultOffsetY', clamped);
        if (sceneDefaultOffsetY === null || sceneDefaultOffsetY === undefined) {
            renderAllSceneTokens(false, undefined, roomDefaultOffsetX ?? 0, clamped).catch(() => {});
        }
    };

    const handleSyncGlobalOffsets = async () => {
        setIsSyncingGlobalOffsets(true);
        try {
            const targetX = roomDefaultOffsetX ?? 0;
            const targetY = roomDefaultOffsetY ?? 0;
            await flushRoomSettingsToOwlbear({
                roomDefaultOffsetX: targetX,
                roomDefaultOffsetY: targetY
            });
            if (sceneDefaultOffsetX === null || sceneDefaultOffsetX === undefined) {
                await renderAllSceneTokens(true, undefined, targetX, targetY);
            }
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Saved Global Offsets (X: ${targetX}px, Y: ${targetY}px) to room settings!`,
                    'SUCCESS'
                );
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to sync global offsets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to save Global Offsets.', 'ERROR');
            }
        } finally {
            setIsSyncingGlobalOffsets(false);
        }
    };

    const handleResetGlobalOffsets = async () => {
        setIsSyncingGlobalOffsets(true);
        try {
            updateRoomSetting('roomDefaultOffsetX', 0);
            updateRoomSetting('roomDefaultOffsetY', 0);
            await flushRoomSettingsToOwlbear({
                roomDefaultOffsetX: 0,
                roomDefaultOffsetY: 0
            });
            if (sceneDefaultOffsetX === null || sceneDefaultOffsetX === undefined) {
                await renderAllSceneTokens(true, undefined, 0, 0);
            }
            if (OBR.isAvailable) {
                OBR.notification.show('Reset Global Offsets to (0, 0).', 'SUCCESS');
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to reset global offsets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to reset Global Offsets.', 'ERROR');
            }
        } finally {
            setIsSyncingGlobalOffsets(false);
        }
    };

    const handleRoomOffsetXChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateSceneOffsets(clamped, sceneDefaultOffsetY ?? roomDefaultOffsetY ?? 0);
        renderAllSceneTokens(false, undefined, clamped, sceneDefaultOffsetY ?? roomDefaultOffsetY ?? 0).catch(() => {});
    };

    const handleRoomOffsetYChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateSceneOffsets(sceneDefaultOffsetX ?? roomDefaultOffsetX ?? 0, clamped);
        renderAllSceneTokens(false, undefined, sceneDefaultOffsetX ?? roomDefaultOffsetX ?? 0, clamped).catch(() => {});
    };

    const handleSyncRoomOffsets = async () => {
        setIsSyncingRoomOffsets(true);
        try {
            const targetX = sceneDefaultOffsetX ?? roomDefaultOffsetX ?? 0;
            const targetY = sceneDefaultOffsetY ?? roomDefaultOffsetY ?? 0;
            updateSceneOffsets(targetX, targetY);
            await flushSceneSettingsToOwlbear({
                sceneDefaultOffsetX: targetX,
                sceneDefaultOffsetY: targetY
            });
            await renderAllSceneTokens(true, undefined, targetX, targetY);
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Applied Room Offset override (X: ${targetX}px, Y: ${targetY}px) to current scene!`,
                    'SUCCESS'
                );
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to sync room offsets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to apply Room Offsets.', 'ERROR');
            }
        } finally {
            setIsSyncingRoomOffsets(false);
        }
    };

    const handleClearRoomOffsets = async () => {
        setIsSyncingRoomOffsets(true);
        try {
            await clearSceneOffsetsFromOwlbear();
            setSceneOffsets(null, null);
            const fallbackX = roomDefaultOffsetX ?? 0;
            const fallbackY = roomDefaultOffsetY ?? 0;
            await renderAllSceneTokens(true, undefined, fallbackX, fallbackY);
            if (OBR.isAvailable) {
                OBR.notification.show('Cleared Room Offset override. Reverted to Global Offsets.', 'SUCCESS');
            }
        } catch (err: unknown) {
            console.error('[RulesTokenHudOps] Failed to clear room offsets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to clear Room Offsets.', 'ERROR');
            }
        } finally {
            setIsSyncingRoomOffsets(false);
        }
    };

    return {
        roomDefaultScale,
        sceneDefaultScale,
        roomDefaultOffsetX,
        roomDefaultOffsetY,
        sceneDefaultOffsetX,
        sceneDefaultOffsetY,
        gmOnlyTrackers,
        isSyncingGlobalScale,
        isSyncingRoomScale,
        isSyncingGlobalOffsets,
        isSyncingRoomOffsets,
        handleTrackersVisibilityChange,
        handleGlobalScaleChange,
        handleSyncGlobalScale,
        handleRoomScaleChange,
        handleSyncRoomScale,
        handleClearRoomScale,
        handleGlobalOffsetXChange,
        handleGlobalOffsetYChange,
        handleSyncGlobalOffsets,
        handleResetGlobalOffsets,
        handleRoomOffsetXChange,
        handleRoomOffsetYChange,
        handleSyncRoomOffsets,
        handleClearRoomOffsets
    };
}
