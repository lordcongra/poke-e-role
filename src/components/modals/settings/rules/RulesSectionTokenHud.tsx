import { RefreshCw, RotateCcw } from 'lucide-react';
import { TooltipIcon } from '../../../ui/TooltipIcon';
import { NumberSpinner } from '../../../ui/NumberSpinner';
import { isStandaloneMode } from '../../../../utils/sync/storageAdapter';
import { useRulesTokenHudOps } from './useRulesTokenHudOps';

interface RulesSectionTokenHudProps {
    onOpenInfo: (info: { title: string; content: string }) => void;
}

export function RulesSectionTokenHud({ onOpenInfo }: RulesSectionTokenHudProps) {
    const ops = useRulesTokenHudOps();

    if (isStandaloneMode) {
        return null;
    }

    return (
        <>
            <div>
                <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                    Token Trackers Visibility{' '}
                    <TooltipIcon
                        onClick={() =>
                            onOpenInfo({
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
                    value={ops.gmOnlyTrackers ? 'GM Only' : 'Everyone'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => ops.handleTrackersVisibilityChange(e.target.value === 'GM Only', e)}
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
                            onOpenInfo({
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
                            onClick={() => ops.handleGlobalScaleChange((ops.roomDefaultScale ?? 100) - 10)}
                            title="Decrease Global HUD scale by 10%"
                        >
                            -10
                        </button>
                        <button
                            type="button"
                            className="rules-modal__step-btn text-theme-header"
                            onClick={() => ops.handleGlobalScaleChange((ops.roomDefaultScale ?? 100) + 10)}
                            title="Increase Global HUD scale by 10%"
                        >
                            +10
                        </button>
                    </div>
                    <NumberSpinner
                        value={ops.roomDefaultScale ?? 100}
                        onChange={ops.handleGlobalScaleChange}
                        min={25}
                        max={300}
                    />
                    <button
                        type="button"
                        className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                        onClick={ops.handleSyncGlobalScale}
                        disabled={ops.isSyncingGlobalScale}
                        title="Immediately save and apply this Global Scale to all scenes in the room."
                    >
                        <RefreshCw size={13} className={ops.isSyncingGlobalScale ? 'rules-modal__spin-icon' : ''} />{' '}
                        Update Global
                    </button>
                </div>
            </div>

            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                        Global Offsets{' '}
                        <TooltipIcon
                            onClick={() =>
                                onOpenInfo({
                                    title: 'Global Offsets (Room Default)',
                                    content:
                                        'Shifts the baseline X and Y position (in pixels) of all token HUDs across all scenes in this room. Positive X pushes right, negative X pulls left. Positive Y pushes down, negative Y pulls up. Tokens can still adjust individual offsets in Tracker Settings, or a Room Offset Override can be set per scene below.'
                                })
                            }
                        />
                    </label>
                    {((ops.roomDefaultOffsetX ?? 0) !== 0 || (ops.roomDefaultOffsetY ?? 0) !== 0) && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                            X: {ops.roomDefaultOffsetX ?? 0}px, Y: {ops.roomDefaultOffsetY ?? 0}px
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
                                onClick={() => ops.handleGlobalOffsetXChange((ops.roomDefaultOffsetX ?? 0) - 10)}
                                title="Move UI Left by 10"
                            >
                                -10
                            </button>
                            <button
                                type="button"
                                className="rules-modal__step-btn text-theme-header"
                                onClick={() => ops.handleGlobalOffsetXChange((ops.roomDefaultOffsetX ?? 0) + 10)}
                                title="Move UI Right by 10"
                            >
                                +10
                            </button>
                        </div>
                        <NumberSpinner
                            value={ops.roomDefaultOffsetX ?? 0}
                            onChange={ops.handleGlobalOffsetXChange}
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
                                onClick={() => ops.handleGlobalOffsetYChange((ops.roomDefaultOffsetY ?? 0) - 10)}
                                title="Move UI Up by 10"
                            >
                                -10
                            </button>
                            <button
                                type="button"
                                className="rules-modal__step-btn text-theme-header"
                                onClick={() => ops.handleGlobalOffsetYChange((ops.roomDefaultOffsetY ?? 0) + 10)}
                                title="Move UI Down by 10"
                            >
                                +10
                            </button>
                        </div>
                        <NumberSpinner
                            value={ops.roomDefaultOffsetY ?? 0}
                            onChange={ops.handleGlobalOffsetYChange}
                            min={-300}
                            max={300}
                        />
                        <span className="rules-modal__offset-unit text-subtext">px</span>
                    </div>
                    <div className="rules-modal__offset-actions">
                        <button
                            type="button"
                            className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                            onClick={ops.handleSyncGlobalOffsets}
                            disabled={ops.isSyncingGlobalOffsets}
                            title="Immediately save and apply these Global Offsets to all scenes in the room."
                        >
                            <RefreshCw
                                size={13}
                                className={ops.isSyncingGlobalOffsets ? 'rules-modal__spin-icon' : ''}
                            />{' '}
                            Update Global
                        </button>
                        {((ops.roomDefaultOffsetX ?? 0) !== 0 || (ops.roomDefaultOffsetY ?? 0) !== 0) && (
                            <button
                                type="button"
                                className="action-button action-button--dark rules-modal__sync-btn text-subtext"
                                onClick={ops.handleResetGlobalOffsets}
                                disabled={ops.isSyncingGlobalOffsets}
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
                    <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                        Room Scale (%){' '}
                        <TooltipIcon
                            onClick={() =>
                                onOpenInfo({
                                    title: 'Room Scale (Scene Map Override)',
                                    content:
                                        'Supercedes the Global Scale for this specific room / scene map. This provides a per-room scaling difference for situations where users have different size areas. If cleared, it defaults back to the Global Scale.'
                                })
                            }
                        />
                    </label>
                    {ops.sceneDefaultScale !== null && ops.sceneDefaultScale !== undefined ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                            Active Override
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Using Global ({ops.roomDefaultScale ?? 100}%)
                        </span>
                    )}
                </div>
                <div className="rules-modal__scale-row">
                    <div className="rules-modal__step-btn-group">
                        <button
                            type="button"
                            className="rules-modal__step-btn text-theme-header"
                            onClick={() =>
                                ops.handleRoomScaleChange((ops.sceneDefaultScale ?? ops.roomDefaultScale ?? 100) - 10)
                            }
                            title="Decrease Room HUD scale by 10%"
                        >
                            -10
                        </button>
                        <button
                            type="button"
                            className="rules-modal__step-btn text-theme-header"
                            onClick={() =>
                                ops.handleRoomScaleChange((ops.sceneDefaultScale ?? ops.roomDefaultScale ?? 100) + 10)
                            }
                            title="Increase Room HUD scale by 10%"
                        >
                            +10
                        </button>
                    </div>
                    <NumberSpinner
                        value={ops.sceneDefaultScale ?? ops.roomDefaultScale ?? 100}
                        onChange={ops.handleRoomScaleChange}
                        min={25}
                        max={300}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                            type="button"
                            className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                            onClick={ops.handleSyncRoomScale}
                            disabled={ops.isSyncingRoomScale}
                            title="Immediately save and apply this Room Scale override to the current scene."
                        >
                            <RefreshCw size={13} className={ops.isSyncingRoomScale ? 'rules-modal__spin-icon' : ''} />{' '}
                            Update Room
                        </button>
                        {ops.sceneDefaultScale !== null && ops.sceneDefaultScale !== undefined && (
                            <button
                                type="button"
                                className="action-button action-button--dark rules-modal__sync-btn text-subtext"
                                onClick={ops.handleClearRoomScale}
                                disabled={ops.isSyncingRoomScale}
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
                    <label className="rules-modal__label text-label" style={{ color: 'var(--text-main)' }}>
                        Room Offset Override{' '}
                        <TooltipIcon
                            onClick={() =>
                                onOpenInfo({
                                    title: 'Room Offset Override (Scene Map Override)',
                                    content:
                                        'Supercedes the Global Offsets for this specific room / scene map. Shifts the baseline X and Y position (in pixels) of all token HUDs in this scene. If cleared, it reverts back to the Global Offsets.'
                                })
                            }
                        />
                    </label>
                    {ops.sceneDefaultOffsetX !== null && ops.sceneDefaultOffsetX !== undefined ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                            Active Override
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Using Global (X: {ops.roomDefaultOffsetX ?? 0}, Y: {ops.roomDefaultOffsetY ?? 0})
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
                                    ops.handleRoomOffsetXChange(
                                        (ops.sceneDefaultOffsetX ?? ops.roomDefaultOffsetX ?? 0) - 10
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
                                    ops.handleRoomOffsetXChange(
                                        (ops.sceneDefaultOffsetX ?? ops.roomDefaultOffsetX ?? 0) + 10
                                    )
                                }
                                title="Move UI Right by 10"
                            >
                                +10
                            </button>
                        </div>
                        <NumberSpinner
                            value={ops.sceneDefaultOffsetX ?? ops.roomDefaultOffsetX ?? 0}
                            onChange={ops.handleRoomOffsetXChange}
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
                                    ops.handleRoomOffsetYChange(
                                        (ops.sceneDefaultOffsetY ?? ops.roomDefaultOffsetY ?? 0) - 10
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
                                    ops.handleRoomOffsetYChange(
                                        (ops.sceneDefaultOffsetY ?? ops.roomDefaultOffsetY ?? 0) + 10
                                    )
                                }
                                title="Move UI Down by 10"
                            >
                                +10
                            </button>
                        </div>
                        <NumberSpinner
                            value={ops.sceneDefaultOffsetY ?? ops.roomDefaultOffsetY ?? 0}
                            onChange={ops.handleRoomOffsetYChange}
                            min={-300}
                            max={300}
                        />
                        <span className="rules-modal__offset-unit text-subtext">px</span>
                    </div>
                    <div className="rules-modal__offset-actions">
                        <button
                            type="button"
                            className="action-button action-button--theme rules-modal__sync-btn text-theme-header"
                            onClick={ops.handleSyncRoomOffsets}
                            disabled={ops.isSyncingRoomOffsets}
                            title="Immediately save and apply this Room Offset override to the current scene."
                        >
                            <RefreshCw size={13} className={ops.isSyncingRoomOffsets ? 'rules-modal__spin-icon' : ''} />{' '}
                            Update Room
                        </button>
                        {ops.sceneDefaultOffsetX !== null && ops.sceneDefaultOffsetX !== undefined && (
                            <button
                                type="button"
                                className="action-button action-button--dark rules-modal__sync-btn text-subtext"
                                onClick={ops.handleClearRoomOffsets}
                                disabled={ops.isSyncingRoomOffsets}
                                title="Clear room offset override and revert to Global Offsets."
                                style={{ padding: '3px 7px' }}
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
