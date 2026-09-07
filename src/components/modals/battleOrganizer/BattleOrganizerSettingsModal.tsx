import { useState, useEffect } from 'react';
import {
    Settings,
    X,
    Layers,
    Sparkles,
    Info,
    Lightbulb,
    Maximize2,
    Monitor,
    Dices,
    Move,
    Columns2,
    LayoutGrid,
    Swords
} from 'lucide-react';
import type { BattleOrganizerSettings, RollLogLayoutMode } from '../../../types/battleOrganizerTypes';
import {
    getBattleOrganizerSettings,
    saveBattleOrganizerSettings,
    subscribeBattleOrganizerSettings
} from './battleOrganizerSettingsHelper';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import './BattleOrganizerSettingsModal.css';

interface BattleOrganizerSettingsModalProps {
    onClose: () => void;
}

export function BattleOrganizerSettingsModal({ onClose }: BattleOrganizerSettingsModalProps) {
    const [settings, setSettings] = useState<BattleOrganizerSettings>(() => getBattleOrganizerSettings());

    useEffect(() => {
        const unsub = subscribeBattleOrganizerSettings((newSettings) => {
            setSettings(newSettings);
        });
        return () => unsub();
    }, []);

    const handleToggleBattlefield = () => {
        if (settings.showBattlefield && !settings.showRoundTracker) {
            // Cannot disable both
            return;
        }
        const updated = saveBattleOrganizerSettings({ showBattlefield: !settings.showBattlefield });
        setSettings(updated);
    };

    const handleToggleRoundTracker = () => {
        if (settings.showRoundTracker && !settings.showBattlefield) {
            // Cannot disable both
            return;
        }
        const updated = saveBattleOrganizerSettings({ showRoundTracker: !settings.showRoundTracker });
        setSettings(updated);
    };

    const handleToggleAutoSync = () => {
        const updated = saveBattleOrganizerSettings({ autoSyncActions: !settings.autoSyncActions });
        setSettings(updated);
    };

    const handleToggleFullScreen = () => {
        const updated = saveBattleOrganizerSettings({ fullScreen: !settings.fullScreen });
        setSettings(updated);
    };

    const handleSetRollLogMode = (mode: RollLogLayoutMode) => {
        const updated = saveBattleOrganizerSettings({ rollLogMode: mode });
        setSettings(updated);
    };

    return (
        <div className="bo-settings__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bo-settings__content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bo-settings__header-row">
                    <h3 className="bo-settings__title text-title-primary">
                        <Settings size={20} color="var(--primary)" /> Battle Organizer Settings
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bo-settings__close-x text-subtext"
                        title="Close Settings"
                        aria-label="Close Settings"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <p className="bo-settings__description text-subtext">
                    Choose which sections to display and how the organizer behaves to minimize screen space.
                </p>

                <div className="bo-settings__section">
                    {/* Section 1: Visibility Options */}
                    <div className="bo-settings__group-title text-label">
                        <Layers size={14} color="var(--primary)" /> Displayed Sections
                    </div>

                    <label
                        className={`bo-settings__checkbox-card ${settings.showBattlefield ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={settings.showBattlefield}
                            onChange={handleToggleBattlefield}
                            disabled={settings.showBattlefield && !settings.showRoundTracker}
                        />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">Battlefield Visualizer</span>
                            <span className="bo-settings__card-desc text-subtext">
                                Stadium pitch, active weather, terrains, force fields, hazards, and cover.
                            </span>
                        </div>
                    </label>

                    <label
                        className={`bo-settings__checkbox-card ${settings.showRoundTracker ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={settings.showRoundTracker}
                            onChange={handleToggleRoundTracker}
                            disabled={settings.showRoundTracker && !settings.showBattlefield}
                        />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">Round Tracker</span>
                            <span className="bo-settings__card-desc text-subtext">
                                Round tabs, initiative order, combatants table, 1-5 action counters, and reactions.
                            </span>
                        </div>
                    </label>

                    {/* Section 2: Roll Auto-Sync */}
                    <div className="bo-settings__group-title text-label" style={{ marginTop: '6px' }}>
                        <Sparkles size={14} color="var(--primary)" /> Automation & Sync
                    </div>

                    <label
                        className={`bo-settings__checkbox-card ${settings.autoSyncActions ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input type="checkbox" checked={settings.autoSyncActions} onChange={handleToggleAutoSync} />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">Auto-Populate Action Rolls</span>
                            <span className="bo-settings__card-desc text-subtext">
                                Automatically increment action counters and fill move names in the active round when
                                rolling from token sheets.
                            </span>
                        </div>
                    </label>

                    {!isStandaloneMode && (
                        <label
                            className={`bo-settings__checkbox-card ${settings.fullScreen ? 'bo-settings__checkbox-card--active' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={settings.fullScreen ?? false}
                                onChange={handleToggleFullScreen}
                            />
                            <div className="bo-settings__card-info">
                                <span className="bo-settings__card-title text-label">
                                    <Maximize2 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    Default to Full Screen View
                                </span>
                                <span className="bo-settings__card-desc text-subtext">
                                    Open the Battle Organizer covering the entire viewport in Owlbear Rodeo. Ideal for
                                    keeping in a dedicated second browser tab or large display.
                                </span>
                            </div>
                        </label>
                    )}

                    {/* Section 3: Roll Log Layout */}
                    <div className="bo-settings__group-title text-label" style={{ marginTop: '6px' }}>
                        <Dices size={14} color="var(--primary)" /> Roll Log Layout
                    </div>

                    <label
                        className={`bo-settings__checkbox-card ${!settings.rollLogMode || settings.rollLogMode === 'floating' ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="bo-roll-log-layout"
                            checked={!settings.rollLogMode || settings.rollLogMode === 'floating'}
                            onChange={() => handleSetRollLogMode('floating')}
                        />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">
                                <Move size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Floating Overlay
                            </span>
                            <span className="bo-settings__card-desc text-subtext">
                                Roll log floats in the bottom-right corner over the battle organizer.
                            </span>
                        </div>
                    </label>

                    <label
                        className={`bo-settings__checkbox-card ${settings.rollLogMode === 'full-sidebar' ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="bo-roll-log-layout"
                            checked={settings.rollLogMode === 'full-sidebar'}
                            onChange={() => handleSetRollLogMode('full-sidebar')}
                        />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">
                                <Columns2 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Side-by-Side (Full Length)
                            </span>
                            <span className="bo-settings__card-desc text-subtext">
                                Full-height sidebar on the right side next to both Battlefield and Round Tracker boxes.
                                Ideal for full-screen view.
                            </span>
                        </div>
                    </label>

                    <label
                        className={`bo-settings__checkbox-card ${settings.rollLogMode === 'battlefield-nested' ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="bo-roll-log-layout"
                            checked={settings.rollLogMode === 'battlefield-nested'}
                            onChange={() => handleSetRollLogMode('battlefield-nested')}
                        />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">
                                <LayoutGrid size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Side-by-Side (Battlefield Only)
                            </span>
                            <span className="bo-settings__card-desc text-subtext">
                                Nests next to just the Battlefield box at the top, leaving the Round Tracker table full
                                width below.
                            </span>
                        </div>
                    </label>

                    <label
                        className={`bo-settings__checkbox-card ${settings.rollLogMode === 'rounds-nested' ? 'bo-settings__checkbox-card--active' : ''}`}
                    >
                        <input
                            type="radio"
                            name="bo-roll-log-layout"
                            checked={settings.rollLogMode === 'rounds-nested'}
                            onChange={() => handleSetRollLogMode('rounds-nested')}
                        />
                        <div className="bo-settings__card-info">
                            <span className="bo-settings__card-title text-label">
                                <Swords size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Side-by-Side (Round Tracker Only)
                            </span>
                            <span className="bo-settings__card-desc text-subtext">
                                Battlefield is full width at the top; roll log nests next to just the Round Tracker
                                table below.
                            </span>
                        </div>
                    </label>

                    {/* Section 4: Owlbear Rodeo Multi-Tab Workflow vs Standalone Popout Tip */}
                    {!isStandaloneMode ? (
                        <>
                            <div className="bo-settings__group-title text-label" style={{ marginTop: '6px' }}>
                                <Info size={14} color="var(--primary)" /> Owlbear Dual-Tab Tip
                            </div>

                            <div className="bo-settings__tip-card">
                                <span className="bo-settings__tip-icon">
                                    <Lightbulb size={16} color="var(--primary)" />
                                </span>
                                <div className="bo-settings__tip-text text-subtext">
                                    <strong>Recommended Workflow:</strong> Because 3D dice and the canvas roll log
                                    render behind full-screen modals, opening your room in a{' '}
                                    <strong>second browser tab</strong> lets you manage the Battle Organizer on one
                                    screen while rolling on the main map!
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bo-settings__group-title text-label" style={{ marginTop: '6px' }}>
                                <Info size={14} color="var(--primary)" /> Standalone Pop-Out Window
                            </div>

                            <div className="bo-settings__tip-card">
                                <span className="bo-settings__tip-icon">
                                    <Monitor size={16} color="var(--primary)" />
                                </span>
                                <div className="bo-settings__tip-text text-subtext">
                                    <strong>Optimal Dual-Screen GM Setup:</strong> Open your Owlbear Rodeo room link in
                                    a <strong>Private / Incognito window</strong> as a guest, grant that guest GM
                                    permissions, and manage the organizer from there.{' '}
                                    <em>
                                        Avoid duplicating your logged-in tab on the same account to prevent Owlbear
                                        Rodeo rate-limit crashes.
                                    </em>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="bo-settings__footer">
                    <button
                        type="button"
                        className="action-button action-button--primary bo-settings__done-btn"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
