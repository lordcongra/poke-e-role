import type { StateCreator } from 'zustand';
import type { CharacterState, RoomSettings, RoomSettingsSlice } from '../storeTypes';
import {
    saveRoomSettingsToOwlbear,
    flushSceneSettingsToOwlbear,
    clearSceneScaleFromOwlbear,
    clearSceneOffsetsFromOwlbear
} from '../../utils/sync/obr';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';

export const ROOM_SETTINGS_KEYS: Array<keyof RoomSettings> = [
    'ruleset',
    'pain',
    'diceEngine',
    'homebrewAccess',
    'gmOnlyLootGen',
    'gmOnlyGenerators',
    'gmOnlyMatchups',
    'gmOnlyDamageOverride',
    'gmOnlyTrackers',
    'gmOnlyAttributeLock',
    'gmOnlyPullEnemies',
    'defaultNpcInitiativeHidden',
    'pmdSkills',
    'gmDemoMode',
    'roomDefaultScale',
    'roomDefaultOffsetX',
    'roomDefaultOffsetY',
    'activeRoomCampaignName',
    'activeRoomCampaignId',
    'roomHideHpBar',
    'roomHideHpText',
    'roomHideWillBar',
    'roomHideWillText',
    'roomHideDef',
    'roomHideActions',
    'roomHideEvade',
    'roomHideClash',
    'roomHideHudPlayersOnly',
    'roomHideHudEnemiesOnly',
    'roomTrackersRequireInitiative'
];

export interface InitialRoomAndSceneSettings {
    initialInitSettings: {
        preset: string;
        offsetX: number;
        offsetY: number;
        layout: string;
        shape: string;
        mw: number;
        mh: number;
    };
    initialRoomDefaultScale: number;
    initialRoomDefaultOffsetX: number;
    initialRoomDefaultOffsetY: number;
    initialSceneDefaultScale: number | null;
    initialSceneDefaultOffsetX: number | null;
    initialSceneDefaultOffsetY: number | null;
}

export function loadInitialRoomAndSceneSettings(): InitialRoomAndSceneSettings {
    let initialInitSettings = {
        preset: 'top-right',
        offsetX: -80,
        offsetY: 0,
        layout: 'vertical',
        shape: 'none',
        mw: 0,
        mh: 0
    };
    try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_init_settings') : null;
        if (stored) initialInitSettings = { ...initialInitSettings, ...JSON.parse(stored) };
    } catch (e) {
        console.warn('[RoomSettingsSlice] Failed to parse init settings from local storage.', e);
    }

    let initialRoomDefaultScale = 100;
    let initialRoomDefaultOffsetX = 0;
    let initialRoomDefaultOffsetY = 0;
    try {
        const storedScale = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_room_default_scale') : null;
        if (storedScale) {
            const parsed = Number(storedScale);
            if (!isNaN(parsed) && parsed >= 25 && parsed <= 300) {
                initialRoomDefaultScale = parsed;
            }
        }
        const storedX = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_room_default_offset_x') : null;
        if (storedX) {
            const parsed = Number(storedX);
            if (!isNaN(parsed)) initialRoomDefaultOffsetX = parsed;
        }
        const storedY = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_room_default_offset_y') : null;
        if (storedY) {
            const parsed = Number(storedY);
            if (!isNaN(parsed)) initialRoomDefaultOffsetY = parsed;
        }
    } catch (e) {
        console.warn('[RoomSettingsSlice] Failed to load room scale from local storage.', e);
    }

    let initialSceneDefaultScale: number | null = null;
    let initialSceneDefaultOffsetX: number | null = null;
    let initialSceneDefaultOffsetY: number | null = null;
    try {
        const storedSceneScale = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_scene_default_scale') : null;
        if (storedSceneScale) {
            const parsed = Number(storedSceneScale);
            if (!isNaN(parsed) && parsed >= 25 && parsed <= 300) {
                initialSceneDefaultScale = parsed;
            }
        }
        const storedX = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_scene_default_offset_x') : null;
        if (storedX) {
            const parsed = Number(storedX);
            if (!isNaN(parsed)) initialSceneDefaultOffsetX = parsed;
        }
        const storedY = typeof localStorage !== 'undefined' ? localStorage.getItem('pkr_scene_default_offset_y') : null;
        if (storedY) {
            const parsed = Number(storedY);
            if (!isNaN(parsed)) initialSceneDefaultOffsetY = parsed;
        }
    } catch (e) {
        console.warn('[RoomSettingsSlice] Failed to load scene scale from local storage.', e);
    }

    return {
        initialInitSettings,
        initialRoomDefaultScale,
        initialRoomDefaultOffsetX,
        initialRoomDefaultOffsetY,
        initialSceneDefaultScale,
        initialSceneDefaultOffsetX,
        initialSceneDefaultOffsetY
    };
}

export const createRoomSettingsSlice: StateCreator<
    CharacterState,
    [['zustand/devtools', never]],
    [],
    RoomSettingsSlice
> = (set) => ({
    applyRoomSettings: (settings) => {
        if (settings.roomDefaultScale !== undefined && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_scale', String(settings.roomDefaultScale));
            } catch {}
        }
        if (settings.roomDefaultOffsetX !== undefined && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_offset_x', String(settings.roomDefaultOffsetX));
            } catch {}
        }
        if (settings.roomDefaultOffsetY !== undefined && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_offset_y', String(settings.roomDefaultOffsetY));
            } catch {}
        }
        if (settings.pmdSkills !== undefined && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_pmd_skills', String(settings.pmdSkills));
            } catch {
                /* ignore storage errors */
            }
        }
        if (settings.defaultNpcInitiativeHidden !== undefined && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_npc_init_hidden', String(settings.defaultNpcInitiativeHidden));
            } catch {
                /* ignore storage errors */
            }
        }
        const cleanSettings: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(settings)) {
            if (v !== undefined) {
                cleanSettings[k] = v;
            }
        }
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    ...cleanSettings
                }
            }),
            false,
            'roomSettings/applySettings'
        );
    },

    updateRoomSetting: (field, value) => {
        if (field === 'roomDefaultScale' && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_scale', String(value));
            } catch {}
        }
        if (field === 'roomDefaultOffsetX' && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_offset_x', String(value));
            } catch {}
        }
        if (field === 'roomDefaultOffsetY' && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_offset_y', String(value));
            } catch {}
        }
        if (field === 'pmdSkills' && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_pmd_skills', String(value));
            } catch {
                /* ignore storage errors */
            }
        }
        if (field === 'defaultNpcInitiativeHidden' && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('pkr_room_default_npc_init_hidden', String(value));
            } catch {
                /* ignore storage errors */
            }
        }
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    [field]: value
                }
            }),
            false,
            'roomSettings/updateSetting'
        );

        if (OBR.isAvailable && !isStandaloneMode) {
            saveRoomSettingsToOwlbear({ [field]: value });
        }
    },

    setIsInitiativeActive: (active) => {
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    isInitiativeActive: active
                }
            }),
            false,
            'roomSettings/setIsInitiativeActive'
        );
    },

    setSceneScale: (scale) => {
        if (typeof localStorage !== 'undefined') {
            try {
                if (scale != null && !isNaN(scale) && scale >= 25 && scale <= 300) {
                    localStorage.setItem('pkr_scene_default_scale', String(scale));
                } else {
                    localStorage.removeItem('pkr_scene_default_scale');
                }
            } catch {}
        }
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    sceneDefaultScale: scale
                }
            }),
            false,
            'roomSettings/setSceneScale'
        );
    },

    updateSceneScale: (scale) => {
        if (typeof localStorage !== 'undefined') {
            try {
                if (scale != null && !isNaN(scale) && scale >= 25 && scale <= 300) {
                    localStorage.setItem('pkr_scene_default_scale', String(scale));
                } else {
                    localStorage.removeItem('pkr_scene_default_scale');
                }
            } catch {}
        }
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    sceneDefaultScale: scale
                }
            }),
            false,
            'roomSettings/updateSceneScale'
        );

        if (OBR.isAvailable && !isStandaloneMode) {
            if (scale === null || scale === undefined) {
                clearSceneScaleFromOwlbear().catch(() => {});
            } else {
                flushSceneSettingsToOwlbear({ sceneDefaultScale: scale }).catch(() => {});
            }
        }
    },

    setSceneOffsets: (x, y) => {
        if (typeof localStorage !== 'undefined') {
            try {
                if (x != null && !isNaN(x)) {
                    localStorage.setItem('pkr_scene_default_offset_x', String(x));
                } else {
                    localStorage.removeItem('pkr_scene_default_offset_x');
                }
                if (y != null && !isNaN(y)) {
                    localStorage.setItem('pkr_scene_default_offset_y', String(y));
                } else {
                    localStorage.removeItem('pkr_scene_default_offset_y');
                }
            } catch {}
        }
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    sceneDefaultOffsetX: x,
                    sceneDefaultOffsetY: y
                }
            }),
            false,
            'roomSettings/setSceneOffsets'
        );
    },

    updateSceneOffsets: (x, y) => {
        if (typeof localStorage !== 'undefined') {
            try {
                if (x != null && !isNaN(x)) {
                    localStorage.setItem('pkr_scene_default_offset_x', String(x));
                } else {
                    localStorage.removeItem('pkr_scene_default_offset_x');
                }
                if (y != null && !isNaN(y)) {
                    localStorage.setItem('pkr_scene_default_offset_y', String(y));
                } else {
                    localStorage.removeItem('pkr_scene_default_offset_y');
                }
            } catch {}
        }
        set(
            (state) => ({
                identity: {
                    ...state.identity,
                    sceneDefaultOffsetX: x,
                    sceneDefaultOffsetY: y
                }
            }),
            false,
            'roomSettings/updateSceneOffsets'
        );

        if (OBR.isAvailable && !isStandaloneMode) {
            if (x === null && y === null) {
                clearSceneOffsetsFromOwlbear().catch(() => {});
            } else {
                flushSceneSettingsToOwlbear({ sceneDefaultOffsetX: x, sceneDefaultOffsetY: y }).catch(() => {});
            }
        }
    }
});

