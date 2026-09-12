import React from 'react';
import {
    Layers,
    ExternalLink,
    Settings,
    ChevronDown,
    X,
    Sparkles,
    RefreshCw,
    Upload,
    Check,
    Printer,
    HelpCircle,
    Mountain,
    Swords,
    Dices
} from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { getRollLogModeLabel, getRollLogModeShortLabel } from './battleOrganizerUtils';
import type { BattleOrganizerSettings } from '../../../types/battleOrganizerTypes';

export interface BattleOrganizerHeaderProps {
    isStandaloneMode: boolean;
    isPopout?: boolean;
    isHeaderToolsOpen: boolean;
    isRefreshing: boolean;
    isPushingActions: boolean;
    showHelp: boolean;
    boSettings: BattleOrganizerSettings;
    onPopOut: () => void;
    onOpenSettings: () => void;
    onToggleHeaderTools: () => void;
    onClose: () => void;
    onPullFromInitiative: () => void;
    onManualRefresh: () => void;
    onPushActionsToSheets: () => void;
    onPrintClick: () => void;
    onToggleHelp: () => void;
    onQuickToggleBattlefield: () => void;
    onQuickToggleRoundTracker: () => void;
    onCycleRollLogMode: () => void;
    onShowTooltip: (info: { title: string; desc: string }) => void;
    onWheel?: (e: React.WheelEvent) => void;
}

export function BattleOrganizerHeader({
    isStandaloneMode,
    isPopout,
    isHeaderToolsOpen,
    isRefreshing,
    isPushingActions,
    showHelp,
    boSettings,
    onPopOut,
    onOpenSettings,
    onToggleHeaderTools,
    onClose,
    onPullFromInitiative,
    onManualRefresh,
    onPushActionsToSheets,
    onPrintClick,
    onToggleHelp,
    onQuickToggleBattlefield,
    onQuickToggleRoundTracker,
    onCycleRollLogMode,
    onShowTooltip,
    onWheel
}: BattleOrganizerHeaderProps) {
    return (
        <>
            {/* Modal Top Header */}
            <div className="bo-modal__header" onWheel={onWheel}>
                <div className="bo-modal__header-left">
                    <span className="bo-modal__icon">
                        <Layers size={22} color="var(--primary)" />
                    </span>
                    <h2 className="bo-modal__title text-title-primary">Battle Organizer Sheet</h2>
                </div>

                <div className="bo-modal__header-right">
                    {isStandaloneMode && !isPopout && (
                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-collapse-btn"
                            onClick={onPopOut}
                            title="Pop Out to Separate Window"
                            aria-label="Pop Out to Separate Window"
                        >
                            <ExternalLink size={14} color="var(--primary)" />
                            <span className="bo-header-collapse-label">Pop Out</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="action-button action-button--dark bo-header-collapse-btn"
                        onClick={onOpenSettings}
                        title="Battle Organizer Settings"
                        aria-label="Battle Organizer Settings"
                    >
                        <Settings size={14} color="var(--primary)" />
                        <span className="bo-header-collapse-label">Settings</span>
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark bo-header-collapse-btn"
                        onClick={onToggleHeaderTools}
                        title={isHeaderToolsOpen ? 'Collapse Header Tools' : 'Expand Header Tools'}
                        aria-label={isHeaderToolsOpen ? 'Collapse Header Tools' : 'Expand Header Tools'}
                    >
                        <ChevronDown
                            size={15}
                            style={{
                                transform: isHeaderToolsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}
                        />
                        <span className="bo-header-collapse-label">{isHeaderToolsOpen ? 'Hide Tools' : 'Tools'}</span>
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--ghost bo-header-close"
                        onClick={onClose}
                        title="Close Battle Organizer"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Collapsible Header Action Bar */}
            {isHeaderToolsOpen && (
                <div className="bo-modal__header-toolbar" onWheel={onWheel}>
                    <button
                        type="button"
                        className="action-button action-button--primary bo-header-btn"
                        onClick={onPullFromInitiative}
                        title="Pull combatants, items, and statuses from Initiative Order"
                    >
                        <Sparkles size={14} /> Pull from Initiative
                    </button>

                    <div className="bo-header-refresh-container">
                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={onManualRefresh}
                            disabled={isRefreshing}
                            title="Refresh combatant HP, Will, and statuses from scene tokens"
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'bo-spin' : ''} /> Refresh Stats
                        </button>
                        <TooltipIcon
                            onClick={() =>
                                onShowTooltip({
                                    title: 'Token Sync & Live Updates',
                                    desc: 'If you or players adjust HP, Will, or statuses directly on character sheets or canvas tokens outside this organizer, click "Refresh Stats" to immediately pull their newest stats into this lineup.\n\nWhy manual & soft-sync? Owlbear Rodeo limits how many network messages can be sent per second. To prevent room lag and connection drops when multiple players have the battle organizer open, stats automatically sync whenever dice are rolled or numbers are clicked, and a gentle background check runs once every 30 seconds.'
                                })
                            }
                        />
                    </div>

                    <div className="bo-header-action-container">
                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={onPushActionsToSheets}
                            disabled={isPushingActions}
                            title="Push round action counters and reaction states (Evade/Clash) back to character sheets"
                        >
                            {isPushingActions ? (
                                <Check size={14} color="var(--semantic-success, #4caf50)" />
                            ) : (
                                <Upload size={14} />
                            )}{' '}
                            {isPushingActions ? 'Actions Pushed!' : 'Push Actions to Sheets'}
                        </button>
                        <TooltipIcon
                            onClick={() =>
                                onShowTooltip({
                                    title: 'Push Actions to Character Sheets',
                                    desc: "Transfers the action counters and reaction states (Evade and Clash used) from this round of the Battle Organizer back into each combatant's character sheet and token trackers.\n\nUseful when you run or plan turns inside the Battle Organizer and want to resume manual play on the main canvas with everyone's action counters up to date."
                                })
                            }
                        />
                    </div>

                    <button
                        type="button"
                        className="action-button action-button--dark bo-header-btn"
                        onClick={onPrintClick}
                        title="Print or export Battle Record to PDF"
                    >
                        <Printer size={14} /> Print PDF
                    </button>

                    <button
                        type="button"
                        className={`action-button ${showHelp ? 'action-button--primary' : 'action-button--dark'} bo-header-btn`}
                        onClick={onToggleHelp}
                        title="Help & Instructions Guide"
                    >
                        <HelpCircle size={14} /> Instructions
                    </button>

                    {/* Quick View Toggles */}
                    <div className="bo-header-toggle-group">
                        <button
                            type="button"
                            className={`action-button bo-header-view-toggle ${boSettings.showBattlefield ? 'action-button--primary' : 'action-button--dark'}`}
                            onClick={onQuickToggleBattlefield}
                            title={boSettings.showBattlefield ? 'Hide Battlefield section' : 'Show Battlefield section'}
                            disabled={boSettings.showBattlefield && !boSettings.showRoundTracker}
                        >
                            <Mountain size={13} /> Battlefield
                        </button>
                        <button
                            type="button"
                            className={`action-button bo-header-view-toggle ${boSettings.showRoundTracker ? 'action-button--primary' : 'action-button--dark'}`}
                            onClick={onQuickToggleRoundTracker}
                            title={
                                boSettings.showRoundTracker
                                    ? 'Hide Round Tracker section'
                                    : 'Show Round Tracker section'
                            }
                            disabled={boSettings.showRoundTracker && !boSettings.showBattlefield}
                        >
                            <Swords size={13} /> Rounds
                        </button>
                        <button
                            type="button"
                            className={`action-button bo-header-view-toggle ${boSettings.rollLogMode && boSettings.rollLogMode !== 'floating' ? 'action-button--primary' : 'action-button--dark'}`}
                            onClick={onCycleRollLogMode}
                            title={`Roll Log: ${getRollLogModeLabel(boSettings.rollLogMode)} (Click to switch layout)`}
                            aria-label={`Roll Log: ${getRollLogModeLabel(boSettings.rollLogMode)}`}
                        >
                            <Dices size={13} /> Log: {getRollLogModeShortLabel(boSettings.rollLogMode)}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
