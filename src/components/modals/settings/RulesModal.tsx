import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { ScrollText, X, XCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { RoomSettings } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { NumberSpinner } from '../../ui/NumberSpinner';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import {
    flushRoomSettingsToOwlbear,
    flushSceneSettingsToOwlbear,
    clearSceneScaleFromOwlbear,
    clearSceneOffsetsFromOwlbear
} from '../../../utils/obr';
import { renderAllSceneTokens } from '../../../utils/graphicsRenderer';
import './RulesModal.css';

export function RulesModal({ onClose }: { onClose: () => void }) {
    const id = useCharacterStore((state) => state.identity);
    const updateRoomSetting = useCharacterStore((state) => state.updateRoomSetting);
    const updateSceneScale = useCharacterStore((state) => state.updateSceneScale);
    const setSceneScale = useCharacterStore((state) => state.setSceneScale);
    const updateSceneOffsets = useCharacterStore((state) => state.updateSceneOffsets);
    const setSceneOffsets = useCharacterStore((state) => state.setSceneOffsets);
    const role = useCharacterStore((state) => state.role);
    const [modalConfig, setModalConfig] = useState<{ title: string; content: string } | null>(null);
    const [isSyncingGlobalScale, setIsSyncingGlobalScale] = useState(false);
    const [isSyncingRoomScale, setIsSyncingRoomScale] = useState(false);
    const [isSyncingGlobalOffsets, setIsSyncingGlobalOffsets] = useState(false);
    const [isSyncingRoomOffsets, setIsSyncingRoomOffsets] = useState(false);

    const handleClose = () => {
        if (!isStandaloneMode) {
            flushRoomSettingsToOwlbear().catch(() => {});
        }
        onClose();
    };

    const handleRoomSelectChange = <K extends keyof RoomSettings>(
        field: K,
        val: RoomSettings[K],
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        e.target.blur();
        updateRoomSetting(field, val);
        if (!isStandaloneMode) {
            flushRoomSettingsToOwlbear({ [field]: val }).catch(() => {});
        }
    };

    const handleGlobalScaleChange = (val: number) => {
        const clamped = Math.max(25, Math.min(300, val));
        updateRoomSetting('roomDefaultScale', clamped);
        if (id.sceneDefaultScale === null || id.sceneDefaultScale === undefined) {
            renderAllSceneTokens(false, clamped).catch(() => {});
        }
    };

    const handleSyncGlobalScale = async () => {
        setIsSyncingGlobalScale(true);
        try {
            const targetScale = id.roomDefaultScale ?? 100;
            await flushRoomSettingsToOwlbear({ roomDefaultScale: targetScale });
            if (id.sceneDefaultScale === null || id.sceneDefaultScale === undefined) {
                await renderAllSceneTokens(true, targetScale);
            }
            if (OBR.isAvailable) {
                OBR.notification.show(`Saved ${targetScale}% Global Scale to room settings!`, 'SUCCESS');
            }
        } catch (err) {
            console.error('[RulesModal] Failed to sync global scale:', err);
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
            const targetScale = id.sceneDefaultScale ?? id.roomDefaultScale ?? 100;
            updateSceneScale(targetScale);
            await flushSceneSettingsToOwlbear({ sceneDefaultScale: targetScale });
            await renderAllSceneTokens(true, targetScale);
            if (OBR.isAvailable) {
                OBR.notification.show(`Applied ${targetScale}% Room Scale override to current scene!`, 'SUCCESS');
            }
        } catch (err) {
            console.error('[RulesModal] Failed to sync room scale:', err);
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
            const fallbackScale = id.roomDefaultScale ?? 100;
            await renderAllSceneTokens(true, fallbackScale);
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Cleared Room Scale override. Reverted to Global Scale (${fallbackScale}%).`,
                    'SUCCESS'
                );
            }
        } catch (err) {
            console.error('[RulesModal] Failed to clear room scale:', err);
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
        if (id.sceneDefaultOffsetX === null || id.sceneDefaultOffsetX === undefined) {
            renderAllSceneTokens(false, undefined, clamped, id.roomDefaultOffsetY ?? 0).catch(() => {});
        }
    };

    const handleGlobalOffsetYChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateRoomSetting('roomDefaultOffsetY', clamped);
        if (id.sceneDefaultOffsetY === null || id.sceneDefaultOffsetY === undefined) {
            renderAllSceneTokens(false, undefined, id.roomDefaultOffsetX ?? 0, clamped).catch(() => {});
        }
    };

    const handleSyncGlobalOffsets = async () => {
        setIsSyncingGlobalOffsets(true);
        try {
            const targetX = id.roomDefaultOffsetX ?? 0;
            const targetY = id.roomDefaultOffsetY ?? 0;
            await flushRoomSettingsToOwlbear({ roomDefaultOffsetX: targetX, roomDefaultOffsetY: targetY });
            if (id.sceneDefaultOffsetX == null && id.sceneDefaultOffsetY == null) {
                await renderAllSceneTokens(true, undefined, targetX, targetY);
            }
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Saved Global Offsets (X: ${targetX}, Y: ${targetY}) to room settings!`,
                    'SUCCESS'
                );
            }
        } catch (err) {
            console.error('[RulesModal] Failed to sync global offsets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to save Global Offsets.', 'ERROR');
            }
        } finally {
            setIsSyncingGlobalOffsets(false);
        }
    };

    const handleResetGlobalOffsets = async () => {
        handleGlobalOffsetXChange(0);
        handleGlobalOffsetYChange(0);
        await flushRoomSettingsToOwlbear({ roomDefaultOffsetX: 0, roomDefaultOffsetY: 0 });
        if (id.sceneDefaultOffsetX == null && id.sceneDefaultOffsetY == null) {
            await renderAllSceneTokens(true, undefined, 0, 0);
        }
    };

    const handleRoomOffsetXChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateSceneOffsets(clamped, id.sceneDefaultOffsetY ?? id.roomDefaultOffsetY ?? 0);
        renderAllSceneTokens(false, undefined, clamped, id.sceneDefaultOffsetY ?? id.roomDefaultOffsetY ?? 0).catch(
            () => {}
        );
    };

    const handleRoomOffsetYChange = (val: number) => {
        const clamped = Math.max(-300, Math.min(300, val));
        updateSceneOffsets(id.sceneDefaultOffsetX ?? id.roomDefaultOffsetX ?? 0, clamped);
        renderAllSceneTokens(false, undefined, id.sceneDefaultOffsetX ?? id.roomDefaultOffsetX ?? 0, clamped).catch(
            () => {}
        );
    };

    const handleSyncRoomOffsets = async () => {
        setIsSyncingRoomOffsets(true);
        try {
            const targetX = id.sceneDefaultOffsetX ?? id.roomDefaultOffsetX ?? 0;
            const targetY = id.sceneDefaultOffsetY ?? id.roomDefaultOffsetY ?? 0;
            updateSceneOffsets(targetX, targetY);
            await flushSceneSettingsToOwlbear({ sceneDefaultOffsetX: targetX, sceneDefaultOffsetY: targetY });
            await renderAllSceneTokens(true, undefined, targetX, targetY);
            if (OBR.isAvailable) {
                OBR.notification.show(
                    `Applied Room Offset override (X: ${targetX}, Y: ${targetY}) to current scene!`,
                    'SUCCESS'
                );
            }
        } catch (err) {
            console.error('[RulesModal] Failed to sync room offsets:', err);
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
            const fallbackX = id.roomDefaultOffsetX ?? 0;
            const fallbackY = id.roomDefaultOffsetY ?? 0;
            await renderAllSceneTokens(true, undefined, fallbackX, fallbackY);
            if (OBR.isAvailable) {
                OBR.notification.show('Cleared Room Offset override. Reverted to Global Offsets.', 'SUCCESS');
            }
        } catch (err) {
            console.error('[RulesModal] Failed to clear room offsets:', err);
            if (OBR.isAvailable) {
                OBR.notification.show('Failed to clear Room Offsets.', 'ERROR');
            }
        } finally {
            setIsSyncingRoomOffsets(false);
        }
    };

    const handleTrackersVisibilityChange = (gmOnly: boolean, e: React.ChangeEvent<HTMLSelectElement>) => {
        e.target.blur();
        updateRoomSetting('gmOnlyTrackers', gmOnly);
        if (!isStandaloneMode) {
            flushRoomSettingsToOwlbear({ gmOnlyTrackers: gmOnly }).catch(() => {});
        }
        renderAllSceneTokens(true).catch(() => {});
    };

    return (
        <div className="rules-modal__overlay">
            <div className="rules-modal__content">
                <div className="rules-modal__header-row">
                    <h3 className="rules-modal__title modal-title-with-icon text-title-primary">
                        <ScrollText size={20} /> Room Rules & Permissions
                    </h3>
                    <button onClick={handleClose} className="rules-modal__close-x" title="Close">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="rules-modal__form-group">
                    {!isStandaloneMode && (
                        <div>
                            <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                Dice Engine{' '}
                                <TooltipIcon
                                    onClick={() =>
                                        setModalConfig({
                                            title: 'Dice Engine Settings',
                                            content:
                                                'Select which Dice Extension to broadcast rolls to. Both engines support 3D dice and full sheet automation, but Custom Action Rolls may be better for performance and has more reliable accuracy with larger dice rolls.'
                                        })
                                    }
                                />
                            </label>
                            <select
                                className="identity-grid__select rules-modal__select text-subtext"
                                style={{ color: 'var(--text-main)' }}
                                value={id.diceEngine || 'car'}
                                onWheel={(e) => e.currentTarget.blur()}
                                onChange={(e) =>
                                    handleRoomSelectChange('diceEngine', e.target.value as 'dice-plus' | 'car', e)
                                }
                            >
                                <option value="car">Custom Action Rolls (3D Dice & Chat Log)</option>
                                <option value="dice-plus">Dice+ (3D Physics Dice)</option>
                            </select>
                            {id.diceEngine !== 'dice-plus' && (
                                <div
                                    style={{
                                        marginTop: '6px',
                                        padding: '8px 10px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--panel-alt)',
                                        border: '1px solid var(--primary)',
                                        fontSize: '0.8rem',
                                        lineHeight: '1.4'
                                    }}
                                >
                                    <span style={{ color: 'var(--text-main)' }}>
                                        <strong>CAR Manifest URL:</strong>{' '}
                                        <code style={{ wordBreak: 'break-all', color: 'var(--primary)' }}>
                                            https://custom-action-rolls.narcolepticdracu.com/manifest.json
                                        </code>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                            Ruleset{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Ruleset Settings',
                                        content: 'Determines how HP and Spec. Defense are calculated.'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select text-subtext"
                            style={{ color: 'var(--text-main)' }}
                            value={id.ruleset || 'vg-vit-hp'}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => handleRoomSelectChange('ruleset', e.target.value, e)}
                        >
                            <option value="vg-vit-hp">VIT = DEF/HP, INS = SPD</option>
                            <option value="tabletop">VIT = DEF/SPD/HP</option>
                            <option value="vg-high-hp">VIT = DEF, INS = SPD; either VIT/INS used for HP</option>
                        </select>
                    </div>

                    <div>
                        <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                            Pain Penalties{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Pain Penalties',
                                        content:
                                            'Automatically applies -1 or -2 success penalties to rolls when at low HP.'
                                    })
                                }
                            />
                        </label>
                        <select
                            className="identity-grid__select rules-modal__select text-subtext"
                            style={{ color: 'var(--text-main)' }}
                            value={id.pain || 'Enabled'}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => handleRoomSelectChange('pain', e.target.value, e)}
                        >
                            <option>Enabled</option>
                            <option>Disabled</option>
                        </select>
                    </div>

                    {!isStandaloneMode && (
                        <>
                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Homebrew Access{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Homebrew Access',
                                                content:
                                                    'Controls if players can view or edit the Homebrew Workshop. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.homebrewAccess || 'Full'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) => handleRoomSelectChange('homebrewAccess', e.target.value, e)}
                                >
                                    <option value="Full">Full Access</option>
                                    <option value="View Only">View Only</option>
                                    <option value="None">None (Hidden)</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Loot Generator{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Loot Generator',
                                                content:
                                                    'Controls if players can see and use the Random Loot Generator button on their sheets. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyLootGen === false ? 'Everyone' : 'GM Only'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                        handleRoomSelectChange('gmOnlyLootGen', e.target.value === 'GM Only', e)
                                    }
                                >
                                    <option value="GM Only">GM Only</option>
                                    <option value="Everyone">Everyone</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Pokémon & Trainer Generators{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Character & Team Generators Access',
                                                content:
                                                    'Controls whether players can see and use the PKMN Gen and TRNR Gen tools on their toolbar. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyGenerators === false ? 'Everyone' : 'GM Only'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                        handleRoomSelectChange('gmOnlyGenerators', e.target.value === 'GM Only', e)
                                    }
                                >
                                    <option value="GM Only">GM Only</option>
                                    <option value="Everyone">Everyone</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Damage Override{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Damage Override Permission',
                                                content:
                                                    'Controls if players can use the manual damage override tools in the Targeting Modal. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyDamageOverride ? 'GM Only' : 'Everyone'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                        handleRoomSelectChange('gmOnlyDamageOverride', e.target.value === 'GM Only', e)
                                    }
                                >
                                    <option value="Everyone">Everyone</option>
                                    <option value="GM Only">GM Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Type Matchups{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Type Matchups Visibility',
                                                content:
                                                    'Controls if players can see the Type Matchups chart on locked NPC sheets. Useful for hiding custom typings or boss weaknesses from players. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyMatchups ? 'GM Only' : 'Everyone'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                        handleRoomSelectChange('gmOnlyMatchups', e.target.value === 'GM Only', e)
                                    }
                                >
                                    <option value="Everyone">Everyone</option>
                                    <option value="GM Only">GM Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Unlock Sheet Attributes{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Unlock Sheet Attributes Permission',
                                                content:
                                                    'Controls whether players are allowed to unlock and edit the Base and Limit values in the Core and Social Attributes sections of their sheet. Defaults to "GM Only" to prevent players from accidentally editing Base/Limits instead of Rank. (Global Room Setting)'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyAttributeLock !== false ? 'GM Only' : 'Everyone'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                        handleRoomSelectChange('gmOnlyAttributeLock', e.target.value === 'GM Only', e)
                                    }
                                >
                                    <option value="GM Only">GM Only</option>
                                    <option value="Everyone">Everyone</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Token Trackers Visibility{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Token Trackers Visibility',
                                                content:
                                                    'Controls whether token HUD trackers (HP, Will, Defenses, Actions) are visible to players across the entire room. When set to "GM Only", all token HUDs are hidden from players and only visible to the GM. Default is "Everyone" (which respects each token\'s individual visibility settings).'
                                            })
                                        }
                                    />
                                </label>
                                <select
                                    className="identity-grid__select rules-modal__select text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                    value={id.gmOnlyTrackers ? 'GM Only' : 'Everyone'}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) => handleTrackersVisibilityChange(e.target.value === 'GM Only', e)}
                                >
                                    <option value="Everyone">Everyone (Respect Token Settings)</option>
                                    <option value="GM Only">GM Only (Hide All From Players)</option>
                                </select>
                            </div>

                            <div>
                                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                                    Global Scale (%){' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setModalConfig({
                                                title: 'Global Scale (Room Default)',
                                                content:
                                                    'Controls the baseline scale of all token HUDs across all scenes in this room. Default is 100%. Individual tokens can still adjust their scale relative to this baseline in Tracker Settings, or a Room Scale can be set below to override this for a specific scene map.'
                                            })
                                        }
                                    />
                                </label>
                                <div className="rules-modal__scale-row">
                                    <div className="rules-modal__step-btn-group">
                                        <button
                                            type="button"
                                            className="rules-modal__step-btn text-theme-header"
                                            onClick={() => handleGlobalScaleChange((id.roomDefaultScale ?? 100) - 10)}
                                            title="Decrease Global HUD scale by 10%"
                                        >
                                            -10
                                        </button>
                                        <button
                                            type="button"
                                            className="rules-modal__step-btn text-theme-header"
                                            onClick={() => handleGlobalScaleChange((id.roomDefaultScale ?? 100) + 10)}
                                            title="Increase Global HUD scale by 10%"
                                        >
                                            +10
                                        </button>
                                    </div>
                                    <NumberSpinner
                                        value={id.roomDefaultScale ?? 100}
                                        onChange={handleGlobalScaleChange}
                                        min={25}
                                        max={300}
                                    />
                                    <button
                                        type="button"
                                        className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                                        onClick={handleSyncGlobalScale}
                                        disabled={isSyncingGlobalScale}
                                        title="Immediately save and apply this Global Scale to all scenes in the room."
                                    >
                                        <RefreshCw
                                            size={13}
                                            className={isSyncingGlobalScale ? 'rules-modal__spin-icon' : ''}
                                        />{' '}
                                        Update Global
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label
                                        className="rules-modal__label text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        Global Offsets{' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setModalConfig({
                                                    title: 'Global Offsets (Room Default)',
                                                    content:
                                                        'Shifts the baseline X and Y position (in pixels) of all token HUDs across all scenes in this room. Positive X pushes right, negative X pulls left. Positive Y pushes down, negative Y pulls up. Tokens can still adjust individual offsets in Tracker Settings, or a Room Offset Override can be set per scene below.'
                                                })
                                            }
                                        />
                                    </label>
                                    {((id.roomDefaultOffsetX ?? 0) !== 0 || (id.roomDefaultOffsetY ?? 0) !== 0) && (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                                            X: {id.roomDefaultOffsetX ?? 0}px, Y: {id.roomDefaultOffsetY ?? 0}px
                                        </span>
                                    )}
                                </div>
                                <div className="rules-modal__offset-card">
                                    <div className="rules-modal__offset-row">
                                        <span className="rules-modal__offset-label text-subtext">X-Offset:</span>
                                        <div className="rules-modal__step-btn-group">
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleGlobalOffsetXChange((id.roomDefaultOffsetX ?? 0) - 10)
                                                }
                                                title="Move UI Left by 10"
                                            >
                                                -10
                                            </button>
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleGlobalOffsetXChange((id.roomDefaultOffsetX ?? 0) + 10)
                                                }
                                                title="Move UI Right by 10"
                                            >
                                                +10
                                            </button>
                                        </div>
                                        <NumberSpinner
                                            value={id.roomDefaultOffsetX ?? 0}
                                            onChange={handleGlobalOffsetXChange}
                                            min={-300}
                                            max={300}
                                        />
                                        <span className="rules-modal__offset-unit text-subtext">px</span>
                                    </div>
                                    <div className="rules-modal__offset-row">
                                        <span className="rules-modal__offset-label text-subtext">Y-Offset:</span>
                                        <div className="rules-modal__step-btn-group">
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleGlobalOffsetYChange((id.roomDefaultOffsetY ?? 0) - 10)
                                                }
                                                title="Move UI Up by 10"
                                            >
                                                -10
                                            </button>
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleGlobalOffsetYChange((id.roomDefaultOffsetY ?? 0) + 10)
                                                }
                                                title="Move UI Down by 10"
                                            >
                                                +10
                                            </button>
                                        </div>
                                        <NumberSpinner
                                            value={id.roomDefaultOffsetY ?? 0}
                                            onChange={handleGlobalOffsetYChange}
                                            min={-300}
                                            max={300}
                                        />
                                        <span className="rules-modal__offset-unit text-subtext">px</span>
                                    </div>
                                    <div className="rules-modal__offset-actions">
                                        <button
                                            type="button"
                                            className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                                            onClick={handleSyncGlobalOffsets}
                                            disabled={isSyncingGlobalOffsets}
                                            title="Immediately save and apply these Global Offsets to all scenes in the room."
                                        >
                                            <RefreshCw
                                                size={13}
                                                className={isSyncingGlobalOffsets ? 'rules-modal__spin-icon' : ''}
                                            />{' '}
                                            Update Global
                                        </button>
                                        {((id.roomDefaultOffsetX ?? 0) !== 0 || (id.roomDefaultOffsetY ?? 0) !== 0) && (
                                            <button
                                                type="button"
                                                className="action-button action-button--dark rules-modal__sync-btn text-subtext"
                                                onClick={handleResetGlobalOffsets}
                                                disabled={isSyncingGlobalOffsets}
                                                title="Reset Global Offsets back to (0, 0)."
                                                style={{ padding: '3px 7px' }}
                                            >
                                                <RotateCcw size={12} /> Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label
                                        className="rules-modal__label text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        Room Scale (%){' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setModalConfig({
                                                    title: 'Room Scale (Scene Map Override)',
                                                    content:
                                                        'Supercedes the Global Scale for this specific room / scene map. This provides a per-room scaling difference for situations where users have different size areas. If cleared, it defaults back to the Global Scale.'
                                                })
                                            }
                                        />
                                    </label>
                                    {id.sceneDefaultScale !== null && id.sceneDefaultScale !== undefined ? (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                                            Active Override
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            Using Global ({id.roomDefaultScale ?? 100}%)
                                        </span>
                                    )}
                                </div>
                                <div className="rules-modal__scale-row">
                                    <div className="rules-modal__step-btn-group">
                                        <button
                                            type="button"
                                            className="rules-modal__step-btn text-theme-header"
                                            onClick={() =>
                                                handleRoomScaleChange(
                                                    (id.sceneDefaultScale ?? id.roomDefaultScale ?? 100) - 10
                                                )
                                            }
                                            title="Decrease Room HUD scale by 10%"
                                        >
                                            -10
                                        </button>
                                        <button
                                            type="button"
                                            className="rules-modal__step-btn text-theme-header"
                                            onClick={() =>
                                                handleRoomScaleChange(
                                                    (id.sceneDefaultScale ?? id.roomDefaultScale ?? 100) + 10
                                                )
                                            }
                                            title="Increase Room HUD scale by 10%"
                                        >
                                            +10
                                        </button>
                                    </div>
                                    <NumberSpinner
                                        value={id.sceneDefaultScale ?? id.roomDefaultScale ?? 100}
                                        onChange={handleRoomScaleChange}
                                        min={25}
                                        max={300}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            type="button"
                                            className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                                            onClick={handleSyncRoomScale}
                                            disabled={isSyncingRoomScale}
                                            title="Immediately save and apply this Room Scale override to the current scene."
                                        >
                                            <RefreshCw
                                                size={13}
                                                className={isSyncingRoomScale ? 'rules-modal__spin-icon' : ''}
                                            />{' '}
                                            Update Room
                                        </button>
                                        {id.sceneDefaultScale !== null && id.sceneDefaultScale !== undefined && (
                                            <button
                                                type="button"
                                                className="action-button action-button--dark rules-modal__sync-btn text-subtext"
                                                onClick={handleClearRoomScale}
                                                disabled={isSyncingRoomScale}
                                                title="Clear room override and revert to Global Scale."
                                                style={{ padding: '3px 7px' }}
                                            >
                                                <RotateCcw size={12} /> Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label
                                        className="rules-modal__label text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        Room Offset Override{' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setModalConfig({
                                                    title: 'Room Offset Override (Scene Map Override)',
                                                    content:
                                                        'Supercedes the Global Offsets for this specific room / scene map. Shifts the baseline X and Y position (in pixels) of all token HUDs in this scene. If cleared, it reverts back to the Global Offsets.'
                                                })
                                            }
                                        />
                                    </label>
                                    {id.sceneDefaultOffsetX !== null && id.sceneDefaultOffsetX !== undefined ? (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                                            Active Override
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            Using Global (X: {id.roomDefaultOffsetX ?? 0}, Y:{' '}
                                            {id.roomDefaultOffsetY ?? 0})
                                        </span>
                                    )}
                                </div>
                                <div className="rules-modal__offset-card">
                                    <div className="rules-modal__offset-row">
                                        <span className="rules-modal__offset-label text-subtext">X-Offset:</span>
                                        <div className="rules-modal__step-btn-group">
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleRoomOffsetXChange(
                                                        (id.sceneDefaultOffsetX ?? id.roomDefaultOffsetX ?? 0) - 10
                                                    )
                                                }
                                                title="Move UI Left by 10"
                                            >
                                                -10
                                            </button>
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleRoomOffsetXChange(
                                                        (id.sceneDefaultOffsetX ?? id.roomDefaultOffsetX ?? 0) + 10
                                                    )
                                                }
                                                title="Move UI Right by 10"
                                            >
                                                +10
                                            </button>
                                        </div>
                                        <NumberSpinner
                                            value={id.sceneDefaultOffsetX ?? id.roomDefaultOffsetX ?? 0}
                                            onChange={handleRoomOffsetXChange}
                                            min={-300}
                                            max={300}
                                        />
                                        <span className="rules-modal__offset-unit text-subtext">px</span>
                                    </div>
                                    <div className="rules-modal__offset-row">
                                        <span className="rules-modal__offset-label text-subtext">Y-Offset:</span>
                                        <div className="rules-modal__step-btn-group">
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleRoomOffsetYChange(
                                                        (id.sceneDefaultOffsetY ?? id.roomDefaultOffsetY ?? 0) - 10
                                                    )
                                                }
                                                title="Move UI Up by 10"
                                            >
                                                -10
                                            </button>
                                            <button
                                                type="button"
                                                className="rules-modal__step-btn text-theme-header"
                                                onClick={() =>
                                                    handleRoomOffsetYChange(
                                                        (id.sceneDefaultOffsetY ?? id.roomDefaultOffsetY ?? 0) + 10
                                                    )
                                                }
                                                title="Move UI Down by 10"
                                            >
                                                +10
                                            </button>
                                        </div>
                                        <NumberSpinner
                                            value={id.sceneDefaultOffsetY ?? id.roomDefaultOffsetY ?? 0}
                                            onChange={handleRoomOffsetYChange}
                                            min={-300}
                                            max={300}
                                        />
                                        <span className="rules-modal__offset-unit text-subtext">px</span>
                                    </div>
                                    <div className="rules-modal__offset-actions">
                                        <button
                                            type="button"
                                            className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                                            onClick={handleSyncRoomOffsets}
                                            disabled={isSyncingRoomOffsets}
                                            title="Immediately save and apply this Room Offset override to the current scene."
                                        >
                                            <RefreshCw
                                                size={13}
                                                className={isSyncingRoomOffsets ? 'rules-modal__spin-icon' : ''}
                                            />{' '}
                                            Update Room
                                        </button>
                                        {id.sceneDefaultOffsetX !== null && id.sceneDefaultOffsetX !== undefined && (
                                            <button
                                                type="button"
                                                className="action-button action-button--dark rules-modal__sync-btn text-subtext"
                                                onClick={handleClearRoomOffsets}
                                                disabled={isSyncingRoomOffsets}
                                                title="Clear room offset override and revert to Global Offsets."
                                                style={{ padding: '3px 7px' }}
                                            >
                                                <RotateCcw size={12} /> Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(isStandaloneMode || role === 'GM') && (
                                <div>
                                    <label
                                        className="rules-modal__label text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        GM Demo Mode (CAR Only){' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setModalConfig({
                                                    title: 'GM Demonstration Mode',
                                                    content:
                                                        'When enabled, intercept ALL of your dice rolls and prompts you to specify the exact number of successes (or even the exact dice array!) you want the engine to fake. PERFECT for making tutorials/demo videos or for climactic GMing moments where you want a scenario to go a specific way. (GM ONLY FEATURE - does not affect player rolls). This feature ONLY works with the Custom Action Rolls dice engine option enabled, it is NOT compatible with Dice+.'
                                                })
                                            }
                                        />
                                    </label>
                                    <select
                                        className="identity-grid__select rules-modal__select text-subtext"
                                        style={{ color: 'var(--text-main)' }}
                                        value={id.gmDemoMode ? 'Enabled' : 'Disabled'}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        onChange={(e) =>
                                            handleRoomSelectChange('gmDemoMode', e.target.value === 'Enabled', e)
                                        }
                                    >
                                        <option value="Disabled">Disabled</option>
                                        <option value="Enabled">Enabled</option>
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="action-button action-button--dark rules-modal__close-btn"
                    onClick={handleClose}
                >
                    <XCircle size={18} /> Close
                </button>
            </div>

            {modalConfig && (
                <div className="rules-info__overlay">
                    <div className="rules-info__content">
                        <h3 className="rules-info__title text-title-primary">{modalConfig.title}</h3>
                        <hr className="rules-info__divider" />
                        <div
                            className="rules-info__text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                        >
                            {modalConfig.content}
                        </div>
                        <div className="rules-info__actions">
                            <button
                                type="button"
                                className="action-button action-button--dark rules-modal__close-btn"
                                onClick={() => setModalConfig(null)}
                            >
                                <XCircle size={18} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
