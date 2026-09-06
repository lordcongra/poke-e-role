import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useBattleOrganizer } from './useBattleOrganizer';
import { BattlefieldPitch } from './BattlefieldPitch';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { CombatantRow } from './CombatantRow';
import {
    X,
    RefreshCw,
    Plus,
    Copy,
    FastForward,
    Trash2,
    Printer,
    Sparkles,
    Shield,
    RotateCcw,
    Layers,
    MapPin,
    CloudSun,
    Mountain,
    HelpCircle,
    ArrowUpDown,
    ChevronDown,
    Settings,
    Swords,
    ExternalLink,
    BookOpen,
    Monitor,
    AlertTriangle,
    Zap,
    Lightbulb
} from 'lucide-react';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { BattleOrganizerSettingsModal } from './BattleOrganizerSettingsModal';
import { CombatantSheetModal } from './CombatantSheetModal';
import { InModalRollLog } from './InModalRollLog';
import {
    getBattleOrganizerSettings,
    saveBattleOrganizerSettings,
    subscribeBattleOrganizerSettings,
    setBattleOrganizerOpen
} from './battleOrganizerSettingsHelper';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { BattleOrganizerSettings, CombatantRowData } from '../../../types/battleOrganizerTypes';
import './BattleOrganizerModal.css';

interface BattleOrganizerModalProps {
    onClose: () => void;
    onPrint?: () => void;
    isPopout?: boolean;
}

export function BattleOrganizerModal({ onClose, onPrint, isPopout }: BattleOrganizerModalProps) {
    const {
        battlefield,
        rounds,
        currentRound,
        activeRoundIndex,
        pullFromInitiative,
        syncToSheets,
        refreshTokenStats,
        openSheet,
        addRound,
        duplicateRound,
        deleteRound,
        setActiveRoundIndex,
        advanceRound,
        addCombatant,
        updateCombatant,
        updateCombatantHp,
        updateCombatantWill,
        deleteCombatant,
        rollCombatantInitiative,
        sortCombatantsByInitiative,
        updateBattlefield,
        updateBattlefieldWeather,
        updateBattlefieldTerrain,
        updateBattlefieldOther,
        updatePlayerSide,
        updateFoeSide,
        updateEndOfRoundEffects,
        updateRoundNumber,
        clearAll
    } = useBattleOrganizer();

    const [boSettings, setBoSettings] = useState<BattleOrganizerSettings>(() => getBattleOrganizerSettings());
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showPullConfirmModal, setShowPullConfirmModal] = useState(false);
    const [activeSheetCombatant, setActiveSheetCombatant] = useState<CombatantRowData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleManualRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshTokenStats(false);
        } finally {
            setTimeout(() => setIsRefreshing(false), 600);
        }
    };

    // Lock background scrolling on document body while modal is open & track BO open status
    useEffect(() => {
        setBattleOrganizerOpen(true);
        if (OBR.isAvailable) {
            OBR.popover.close('pkr-roll-log').catch(() => {});
        }

        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            setBattleOrganizerOpen(false);
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    // Auto-close open combatant sheet modal if the combatant is deleted or reset from the active round
    useEffect(() => {
        if (activeSheetCombatant) {
            const stillExists = currentRound?.combatants.some((c) => c.id === activeSheetCombatant.id);
            if (!stillExists) {
                setActiveSheetCombatant(null);
            }
        }
    }, [activeSheetCombatant, currentRound?.combatants]);

    // Forward wheel scrolls on static bars (header/toolbar/footer) directly to the scrollable body
    const handleStaticWheel = (e: React.WheelEvent) => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop += e.deltaY;
        }
    };

    const [showObrAdvisory, setShowObrAdvisory] = useState(() => {
        if (isStandaloneMode) return false;
        try {
            return localStorage.getItem('pkr_bo_advisory_dismissed') !== 'true';
        } catch {
            return true;
        }
    });

    const handlePopOut = () => {
        const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        const themeToPass = document.body.getAttribute('data-theme') || 'dark';

        const computedStyle = getComputedStyle(document.documentElement);
        let primaryColor =
            document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
            document.body.style.getPropertyValue('--dynamic-type-color') ||
            computedStyle.getPropertyValue('--dynamic-type-color') ||
            '';
        let secondaryColor =
            document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
            document.body.style.getPropertyValue('--dynamic-secondary-color') ||
            computedStyle.getPropertyValue('--dynamic-secondary-color') ||
            '';

        if (!primaryColor.trim()) {
            try {
                const sheetColors = localStorage.getItem('pkr_sheet_theme_colors');
                if (sheetColors) {
                    const parsed = JSON.parse(sheetColors);
                    if (parsed?.primary) primaryColor = parsed.primary;
                    if (parsed?.secondary) secondaryColor = parsed.secondary || '';
                }
            } catch {
                // ignore
            }
        }
        if (!primaryColor.trim()) {
            try {
                const activeColors = localStorage.getItem('pkr_active_theme_colors');
                if (activeColors) {
                    const parsed = JSON.parse(activeColors);
                    if (parsed?.primary) primaryColor = parsed.primary;
                    if (parsed?.secondary) secondaryColor = parsed.secondary || '';
                }
            } catch {
                // ignore
            }
        }

        const currentRole = useCharacterStore.getState().role;
        const urlParams = new URLSearchParams();
        urlParams.set('theme', themeToPass);
        if (currentRole) urlParams.set('role', currentRole);
        if (primaryColor.trim()) urlParams.set('primary', primaryColor.trim());
        if (secondaryColor.trim()) urlParams.set('secondary', secondaryColor.trim());

        if (primaryColor.trim()) {
            try {
                localStorage.setItem(
                    'pkr_sheet_theme_colors',
                    JSON.stringify({
                        primary: primaryColor.trim(),
                        secondary: secondaryColor.trim() || undefined
                    })
                );
                localStorage.setItem(
                    'pkr_active_theme_colors',
                    JSON.stringify({
                        enabled: true,
                        primary: primaryColor.trim(),
                        secondary: secondaryColor.trim() || undefined
                    })
                );
            } catch {
                // ignore
            }
        }

        const url = `${baseUrl}/battle-organizer.html?${urlParams.toString()}`;

        let width = 1360;
        let height = 880;
        if (boSettings.showBattlefield && !boSettings.showRoundTracker) {
            width = 1040;
            height = 620;
        } else if (!boSettings.showBattlefield && boSettings.showRoundTracker) {
            width = 1200;
            height = 760;
        }

        window.open(
            url,
            'pkr-battle-organizer-window',
            `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
        );
        onClose();
    };

    const handlePullFromInitiative = () => {
        const hasExistingCombatants = currentRound && currentRound.combatants && currentRound.combatants.length > 0;
        if (hasExistingCombatants) {
            setShowPullConfirmModal(true);
            return;
        }
        pullFromInitiative();
    };

    const handleConfirmPullFromInitiative = () => {
        pullFromInitiative();
        setShowPullConfirmModal(false);
    };

    const handleDismissAdvisory = () => {
        setShowObrAdvisory(false);
        try {
            localStorage.setItem('pkr_bo_advisory_dismissed', 'true');
        } catch (e) {
            console.warn('[BattleOrganizerModal] Failed to persist advisory dismissal:', e);
        }
    };

    const handleOpenCombatantSheet = (combatant: CombatantRowData) => {
        const role = useCharacterStore.getState().role;
        if (role === 'PLAYER' && combatant.isNPC) {
            return;
        }
        setActiveSheetCombatant(combatant);
        openSheet(combatant).catch((e) => {
            console.warn('[BattleOrganizerModal] Background token select error:', e);
        });
    };

    const handleMarkActionFromRoll = (combatantId: string, moveName: string, status: 'success' | 'failed') => {
        const currentCombatants = currentRound?.combatants || [];
        const combatant = currentCombatants.find((c) => c.id === combatantId);
        if (!combatant) return;

        // Prioritize the first action slot matching moveName that has not yet been marked ('none')
        let targetIdx = combatant.actions.findIndex(
            (a) => a.text.trim().toLowerCase() === moveName.trim().toLowerCase() && a.status === 'none'
        );
        if (targetIdx === -1) {
            targetIdx = combatant.actions.findIndex(
                (a) => a.text.trim().toLowerCase() === moveName.trim().toLowerCase()
            );
        }
        if (targetIdx === -1) {
            targetIdx = combatant.actions.findIndex((a) => !a.text.trim());
        }
        if (targetIdx === -1) targetIdx = 0;

        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        newActions[targetIdx] = {
            text: newActions[targetIdx].text.trim() || moveName,
            status: status
        };

        updateCombatant({
            ...combatant,
            actions: newActions
        });
    };

    useEffect(() => {
        const unsub = subscribeBattleOrganizerSettings(setBoSettings);
        return () => unsub();
    }, []);

    const handleQuickToggleBattlefield = () => {
        if (boSettings.showBattlefield && !boSettings.showRoundTracker) return;
        const next = saveBattleOrganizerSettings({ showBattlefield: !boSettings.showBattlefield });
        setBoSettings(next);
    };

    const handleQuickToggleRoundTracker = () => {
        if (boSettings.showRoundTracker && !boSettings.showBattlefield) return;
        const next = saveBattleOrganizerSettings({ showRoundTracker: !boSettings.showRoundTracker });
        setBoSettings(next);
    };

    const [showHelp, setShowHelp] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmDeleteRoundIdx, setConfirmDeleteRoundIdx] = useState<number | null>(null);
    const [isHeaderToolsOpen, setIsHeaderToolsOpen] = useState(true);
    const [isBattlefieldOpen, setIsBattlefieldOpen] = useState(true);

    const handlePrintClick = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    const handleWeatherChange = (text: string) => {
        updateBattlefieldWeather('name', text);
        if (text.trim() && battlefield.weather.remainingRounds === 0) {
            updateBattlefieldWeather('remainingRounds', 4);
        } else if (!text.trim() && battlefield.weather.remainingRounds > 0) {
            updateBattlefieldWeather('remainingRounds', 0);
        }
    };

    const handleTerrainChange = (text: string) => {
        updateBattlefieldTerrain('name', text);
        if (text.trim() && battlefield.terrain.remainingRounds === 0) {
            updateBattlefieldTerrain('remainingRounds', 4);
        } else if (!text.trim() && battlefield.terrain.remainingRounds > 0) {
            updateBattlefieldTerrain('remainingRounds', 0);
        }
    };

    const handleOtherChange = (text: string) => {
        updateBattlefieldOther('name', text);
        if (text.trim() && battlefield.other.remainingRounds === 0) {
            updateBattlefieldOther('remainingRounds', 4);
        } else if (!text.trim() && battlefield.other.remainingRounds > 0) {
            updateBattlefieldOther('remainingRounds', 0);
        }
    };

    const handlePlayerForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...battlefield.playerSide.forceFields] as [
            (typeof battlefield.playerSide.forceFields)[0],
            (typeof battlefield.playerSide.forceFields)[1]
        ];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        updatePlayerSide('forceFields', fields);
    };

    const handleFoeForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...battlefield.foeSide.forceFields] as [
            (typeof battlefield.foeSide.forceFields)[0],
            (typeof battlefield.foeSide.forceFields)[1]
        ];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        updateFoeSide('forceFields', fields);
    };

    const contentModeClass =
        boSettings.showBattlefield && !boSettings.showRoundTracker
            ? 'bo-modal__content--battlefield-only'
            : !boSettings.showBattlefield && boSettings.showRoundTracker
              ? 'bo-modal__content--rounds-only'
              : '';

    return (
        <div className={`bo-modal__overlay ${isPopout ? 'bo-modal__overlay--popout' : ''}`}>
            <div className={`bo-modal__content ${contentModeClass}`}>
                {/* Modal Top Header */}
                <div className="bo-modal__header" onWheel={handleStaticWheel}>
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
                                onClick={handlePopOut}
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
                            onClick={() => setShowSettingsModal(true)}
                            title="Battle Organizer Settings"
                            aria-label="Battle Organizer Settings"
                        >
                            <Settings size={14} color="var(--primary)" />
                            <span className="bo-header-collapse-label">Settings</span>
                        </button>

                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-collapse-btn"
                            onClick={() => setIsHeaderToolsOpen(!isHeaderToolsOpen)}
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
                            <span className="bo-header-collapse-label">
                                {isHeaderToolsOpen ? 'Hide Tools' : 'Tools'}
                            </span>
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
                    <div className="bo-modal__header-toolbar" onWheel={handleStaticWheel}>
                        <button
                            type="button"
                            className="action-button action-button--primary bo-header-btn"
                            onClick={handlePullFromInitiative}
                            title="Pull combatants, items, and statuses from Initiative Order"
                        >
                            <Sparkles size={14} /> Pull from Initiative
                        </button>

                        <div className="bo-header-refresh-container">
                            <button
                                type="button"
                                className="action-button action-button--dark bo-header-btn"
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                title="Refresh combatant HP, Will, and statuses from scene tokens"
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'bo-spin' : ''} /> Refresh Stats
                            </button>
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({
                                        title: 'Token Sync & Live Updates',
                                        desc: 'If you or players adjust HP, Will, or statuses directly on character sheets or canvas tokens outside this organizer, click "Refresh Stats" to immediately pull their newest stats into this lineup.\n\nWhy manual & soft-sync? Owlbear Rodeo limits how many network messages can be sent per second. To prevent room lag and connection drops when multiple players have the battle organizer open, stats automatically sync whenever dice are rolled or numbers are clicked, and a gentle background check runs once every 30 seconds.'
                                    })
                                }
                            />
                        </div>

                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={syncToSheets}
                            title="Sync action counters and reactions back to token sheets"
                        >
                            <RotateCcw size={14} /> Sync to Sheets
                        </button>

                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={handlePrintClick}
                            title="Print or export Battle Record to PDF"
                        >
                            <Printer size={14} /> Print PDF
                        </button>

                        <button
                            type="button"
                            className={`action-button ${showHelp ? 'action-button--primary' : 'action-button--dark'} bo-header-btn`}
                            onClick={() => setShowHelp(!showHelp)}
                            title="Help & Instructions Guide"
                        >
                            <HelpCircle size={14} /> Instructions
                        </button>

                        {/* Quick View Toggles */}
                        <div className="bo-header-toggle-group">
                            <button
                                type="button"
                                className={`action-button bo-header-view-toggle ${boSettings.showBattlefield ? 'action-button--primary' : 'action-button--dark'}`}
                                onClick={handleQuickToggleBattlefield}
                                title={
                                    boSettings.showBattlefield ? 'Hide Battlefield section' : 'Show Battlefield section'
                                }
                                disabled={boSettings.showBattlefield && !boSettings.showRoundTracker}
                            >
                                <Mountain size={13} /> Battlefield
                            </button>
                            <button
                                type="button"
                                className={`action-button bo-header-view-toggle ${boSettings.showRoundTracker ? 'action-button--primary' : 'action-button--dark'}`}
                                onClick={handleQuickToggleRoundTracker}
                                title={
                                    boSettings.showRoundTracker
                                        ? 'Hide Round Tracker section'
                                        : 'Show Round Tracker section'
                                }
                                disabled={boSettings.showRoundTracker && !boSettings.showBattlefield}
                            >
                                <Swords size={13} /> Rounds
                            </button>
                        </div>
                    </div>
                )}

                {/* Owlbear Rodeo Dual-Screen / Dual-Window Advisory Banner */}
                {!isStandaloneMode && showObrAdvisory && (
                    <div className="bo-advisory-banner" onWheel={handleStaticWheel}>
                        <div className="bo-advisory-banner__content text-subtext">
                            <span className="bo-advisory-banner__icon">
                                <Lightbulb size={16} color="#f59e0b" />
                            </span>
                            <span>
                                <strong>Optimal Dual-Screen GM Setup:</strong> For the best experience without modal occlusion on your battle map or 3D dice, open your Owlbear Rodeo room link in a <strong>Private / Incognito window</strong> as a guest, grant that guest <strong>GM permissions</strong>, and manage the Battle Organizer there. <em>(Do not duplicate your tab on the same logged-in account, as Owlbear Rodeo rate-limits duplicate sessions and will crash).</em>
                            </span>
                        </div>
                        <button
                            type="button"
                            className="bo-advisory-banner__close"
                            onClick={handleDismissAdvisory}
                            title="Dismiss tip"
                            aria-label="Dismiss tip"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Comprehensive Help & Setup Guide */}
                {showHelp && (
                    <div className="bo-help-banner" onWheel={handleStaticWheel}>
                        <div className="bo-help-banner__content text-subtext">
                            <div className="bo-help-banner__header">
                                <span className="bo-help-banner__title text-title-primary">
                                    <BookOpen size={16} color="var(--primary)" /> Battle Organizer Guide & Optimal Setup
                                </span>
                                <button
                                    type="button"
                                    className="action-button action-button--ghost bo-help-close"
                                    onClick={() => setShowHelp(false)}
                                    title="Close Guide"
                                    aria-label="Close Guide"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="bo-help-banner__grid">
                                <div className="bo-help-banner__section">
                                    <h4 className="bo-help-section-title">
                                        <Monitor size={14} color="var(--primary)" /> Optimal Dual-Screen Setup (Private Window)
                                    </h4>
                                    <p>
                                        Want to keep your battle map and 3D dice rolls visible while running the Battle Organizer on a second screen or side-by-side window?
                                    </p>
                                    <ol>
                                        <li>Open your room link in a <strong>Private / Incognito browser window</strong> (or separate browser profile) and join as a guest.</li>
                                        <li>On your primary GM screen, click the guest user in the player list and grant them <strong>GM permissions</strong>.</li>
                                        <li>Open and run the Battle Organizer on that screen! Live state synchronizes across both windows in real time.</li>
                                    </ol>
                                    <div className="bo-help-alert">
                                        <AlertTriangle size={14} color="var(--semantic-danger, #ef5350)" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span>
                                            <strong>Why avoid duplicating your logged-in tab?</strong> Owlbear Rodeo enforces strict per-account connection limits. Opening multiple tabs under the exact same logged-in account triggers concurrent real-time room sessions that lead to <code>Realtime error: 4003 Rate limited</code> disconnections. A private guest session has an independent connection that avoids this completely.
                                        </span>
                                    </div>
                                </div>

                                <div className="bo-help-banner__section">
                                    <h4 className="bo-help-section-title">
                                        <Zap size={14} color="var(--primary)" /> Round Tracker & Moves
                                    </h4>
                                    <ul>
                                        <li>
                                            <strong>Auto-Sync Moves:</strong> Rolling move accuracy checks automatically populates that combatant's next open action slot. Damage rolls resolve the move without using extra slots.
                                        </li>
                                        <li>
                                            <strong>Multi-Action Moves:</strong> Moves used multiple times in a round (such as Successive Actions, Double Actions, or homebrew refreshes) automatically allocate into subsequent action slots with each new accuracy roll.
                                        </li>
                                        <li>
                                            <strong>Hit / Miss Marking:</strong> Use the <strong>✓</strong> (success) and <strong>✗</strong> (fail) buttons on any slot or directly from the in-modal Roll Log to resolve actions.
                                        </li>
                                        <li>
                                            <strong>Environmental Timers:</strong> Remaining Rounds boxes (1–4) on Weathers, Terrains, and Force Fields automatically decrement when you click <strong>Advance / End Round</strong>.
                                        </li>
                                        <li>
                                            <strong>Pull from Initiative:</strong> Automatically imports all active scene characters, held items, statuses, and rolled initiatives in descending order.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Scrollable Body */}
                <div className="bo-modal__body" ref={bodyRef}>
                    {/* ========================================= */}
                    {/* CARD 1: BATTLEFIELD                       */}
                    {/* ========================================= */}
                    {boSettings.showBattlefield && (
                        <div
                            className={`bo-section-card bo-section-card--battlefield ${!isBattlefieldOpen ? 'bo-section-card--collapsed' : ''}`}
                        >
                            {/* Header Pill */}
                            <div
                                className="bo-pill-header bo-pill-header--center bo-pill-header--toggle"
                                onClick={() => setIsBattlefieldOpen(!isBattlefieldOpen)}
                                title={
                                    isBattlefieldOpen ? 'Click to Collapse Battlefield' : 'Click to Expand Battlefield'
                                }
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        setIsBattlefieldOpen(!isBattlefieldOpen);
                                    }
                                }}
                            >
                                <span className="bo-pill-header__text text-theme-header">Battlefield</span>
                                <ChevronDown
                                    size={14}
                                    style={{
                                        transform: isBattlefieldOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                />
                            </div>

                            {isBattlefieldOpen && (
                                <>
                                    {/* Battlefield Location */}
                                    <div className="bo-location-row">
                                        <label className="bo-field-label text-label">
                                            <MapPin size={14} /> Battlefield Location
                                        </label>
                                        <input
                                            type="text"
                                            className="bo-input bo-input--underline text-label"
                                            value={battlefield.location}
                                            onChange={(e) => updateBattlefield('location', e.target.value)}
                                            placeholder="e.g. Viridian Forest Clearing / Distortion World"
                                        />
                                    </div>

                                    {/* Global Battlefield Row: Weather, Terrain, Other */}
                                    <div className="bo-global-effects-grid">
                                        {/* Active Weather */}
                                        <div className="bo-effect-card">
                                            <div className="bo-effect-card__header">
                                                <span className="bo-field-label text-label">
                                                    <CloudSun size={14} /> Active Weather
                                                </span>
                                                <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                            </div>
                                            <div className="bo-effect-card__body">
                                                <input
                                                    type="text"
                                                    className="bo-input bo-input--underline text-label"
                                                    value={battlefield.weather.name}
                                                    onChange={(e) => handleWeatherChange(e.target.value)}
                                                    placeholder="e.g. Rain, Harsh Sun, Sandstorm"
                                                />
                                                <RemainingRoundsBoxes
                                                    value={battlefield.weather.remainingRounds}
                                                    onChange={(val) => updateBattlefieldWeather('remainingRounds', val)}
                                                    title="Weather Remaining Rounds"
                                                />
                                            </div>
                                        </div>

                                        {/* Active Terrain */}
                                        <div className="bo-effect-card">
                                            <div className="bo-effect-card__header">
                                                <span className="bo-field-label text-label">
                                                    <Mountain size={14} /> Active Terrain
                                                </span>
                                                <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                            </div>
                                            <div className="bo-effect-card__body">
                                                <input
                                                    type="text"
                                                    className="bo-input bo-input--underline text-label"
                                                    value={battlefield.terrain.name}
                                                    onChange={(e) => handleTerrainChange(e.target.value)}
                                                    placeholder="e.g. Electric Terrain, Grassy Terrain"
                                                />
                                                <RemainingRoundsBoxes
                                                    value={battlefield.terrain.remainingRounds}
                                                    onChange={(val) => updateBattlefieldTerrain('remainingRounds', val)}
                                                    title="Terrain Remaining Rounds"
                                                />
                                            </div>
                                        </div>

                                        {/* Other Global Battlefield Effect */}
                                        <div className="bo-effect-card">
                                            <div className="bo-effect-card__header">
                                                <span className="bo-field-label text-label">
                                                    <Sparkles size={14} /> Other
                                                </span>
                                                <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                            </div>
                                            <div className="bo-effect-card__body">
                                                <input
                                                    type="text"
                                                    className="bo-input bo-input--underline text-label"
                                                    value={battlefield.other.name}
                                                    onChange={(e) => handleOtherChange(e.target.value)}
                                                    placeholder="e.g. Gravity, Trick Room, Ion Deluge"
                                                />
                                                <RemainingRoundsBoxes
                                                    value={battlefield.other.remainingRounds}
                                                    onChange={(val) => updateBattlefieldOther('remainingRounds', val)}
                                                    title="Other Global Remaining Rounds"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Split Stadium Pitch Grid: Player's Side | Pitch | Foe's Side */}
                                    <div className="bo-stadium-split-grid">
                                        {/* Player's Side */}
                                        <div className="bo-side-panel bo-side-panel--player">
                                            <h3 className="bo-side-title bo-side-title--player text-title-primary">
                                                Player's Side
                                            </h3>

                                            {/* Force Fields */}
                                            <div className="bo-field-group">
                                                <div className="bo-field-group__header">
                                                    <span className="bo-field-label text-label">
                                                        <Shield size={14} /> Force Field
                                                    </span>
                                                    <span className="bo-rounds-label text-subtext">
                                                        Remaining Rounds
                                                    </span>
                                                </div>
                                                <div className="bo-field-group__row">
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.playerSide.forceFields[0].name}
                                                        onChange={(e) =>
                                                            handlePlayerForceFieldChange(0, e.target.value)
                                                        }
                                                        placeholder="e.g. Reflect, Light Screen"
                                                    />
                                                    <RemainingRoundsBoxes
                                                        value={battlefield.playerSide.forceFields[0].remainingRounds}
                                                        onChange={(val) => {
                                                            const fields = [...battlefield.playerSide.forceFields] as [
                                                                (typeof battlefield.playerSide.forceFields)[0],
                                                                (typeof battlefield.playerSide.forceFields)[1]
                                                            ];
                                                            fields[0] = { ...fields[0], remainingRounds: val };
                                                            updatePlayerSide('forceFields', fields);
                                                        }}
                                                        title="Player Force Field 1 Rounds"
                                                    />
                                                </div>
                                                <div className="bo-field-group__row">
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.playerSide.forceFields[1].name}
                                                        onChange={(e) =>
                                                            handlePlayerForceFieldChange(1, e.target.value)
                                                        }
                                                        placeholder="e.g. Safeguard, Tailwind"
                                                    />
                                                    <RemainingRoundsBoxes
                                                        value={battlefield.playerSide.forceFields[1].remainingRounds}
                                                        onChange={(val) => {
                                                            const fields = [...battlefield.playerSide.forceFields] as [
                                                                (typeof battlefield.playerSide.forceFields)[0],
                                                                (typeof battlefield.playerSide.forceFields)[1]
                                                            ];
                                                            fields[1] = { ...fields[1], remainingRounds: val };
                                                            updatePlayerSide('forceFields', fields);
                                                        }}
                                                        title="Player Force Field 2 Rounds"
                                                    />
                                                </div>
                                            </div>

                                            {/* Hazard & Cover subgrid */}
                                            <div className="bo-side-subgrid">
                                                <div className="bo-subfield">
                                                    <label className="bo-field-label text-label">Entry Hazard</label>
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.playerSide.entryHazard}
                                                        onChange={(e) =>
                                                            updatePlayerSide('entryHazard', e.target.value)
                                                        }
                                                        placeholder="e.g. Stealth Rock, Spikes"
                                                    />
                                                </div>
                                                <div className="bo-subfield">
                                                    <label className="bo-field-label text-label">Cover</label>
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.playerSide.cover}
                                                        onChange={(e) => updatePlayerSide('cover', e.target.value)}
                                                        placeholder="e.g. Half Cover (+1 Def)"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bo-subfield">
                                                <label className="bo-field-label text-label">Other</label>
                                                <input
                                                    type="text"
                                                    className="bo-input bo-input--underline text-label"
                                                    value={battlefield.playerSide.other}
                                                    onChange={(e) => updatePlayerSide('other', e.target.value)}
                                                    placeholder="e.g. Cheer, Safeguard"
                                                />
                                            </div>
                                        </div>

                                        {/* Center Stadium Graphic */}
                                        <div className="bo-center-pitch-panel">
                                            <BattlefieldPitch
                                                highlightedSide={battlefield.highlightedSide}
                                                onHighlightChange={(side) => updateBattlefield('highlightedSide', side)}
                                                playerTargets={battlefield.playerTargets}
                                                foeTargets={battlefield.foeTargets}
                                                onPlayerTargetsChange={(val) => updateBattlefield('playerTargets', val)}
                                                onFoeTargetsChange={(val) => updateBattlefield('foeTargets', val)}
                                            />
                                        </div>

                                        {/* Foe's Side */}
                                        <div className="bo-side-panel bo-side-panel--foe">
                                            <h3 className="bo-side-title bo-side-title--foe text-title-primary">
                                                Foe's Side
                                            </h3>

                                            {/* Force Fields */}
                                            <div className="bo-field-group">
                                                <div className="bo-field-group__header">
                                                    <span className="bo-field-label text-label">
                                                        <Shield size={14} /> Force Field
                                                    </span>
                                                    <span className="bo-rounds-label text-subtext">
                                                        Remaining Rounds
                                                    </span>
                                                </div>
                                                <div className="bo-field-group__row">
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.foeSide.forceFields[0].name}
                                                        onChange={(e) => handleFoeForceFieldChange(0, e.target.value)}
                                                        placeholder="e.g. Light Screen, Protect"
                                                    />
                                                    <RemainingRoundsBoxes
                                                        value={battlefield.foeSide.forceFields[0].remainingRounds}
                                                        onChange={(val) => {
                                                            const fields = [...battlefield.foeSide.forceFields] as [
                                                                (typeof battlefield.foeSide.forceFields)[0],
                                                                (typeof battlefield.foeSide.forceFields)[1]
                                                            ];
                                                            fields[0] = { ...fields[0], remainingRounds: val };
                                                            updateFoeSide('forceFields', fields);
                                                        }}
                                                        title="Foe Force Field 1 Rounds"
                                                    />
                                                </div>
                                                <div className="bo-field-group__row">
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.foeSide.forceFields[1].name}
                                                        onChange={(e) => handleFoeForceFieldChange(1, e.target.value)}
                                                        placeholder="e.g. Aurora Veil, Tailwind"
                                                    />
                                                    <RemainingRoundsBoxes
                                                        value={battlefield.foeSide.forceFields[1].remainingRounds}
                                                        onChange={(val) => {
                                                            const fields = [...battlefield.foeSide.forceFields] as [
                                                                (typeof battlefield.foeSide.forceFields)[0],
                                                                (typeof battlefield.foeSide.forceFields)[1]
                                                            ];
                                                            fields[1] = { ...fields[1], remainingRounds: val };
                                                            updateFoeSide('forceFields', fields);
                                                        }}
                                                        title="Foe Force Field 2 Rounds"
                                                    />
                                                </div>
                                            </div>

                                            {/* Hazard & Cover subgrid */}
                                            <div className="bo-side-subgrid">
                                                <div className="bo-subfield">
                                                    <label className="bo-field-label text-label">Entry Hazard</label>
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.foeSide.entryHazard}
                                                        onChange={(e) => updateFoeSide('entryHazard', e.target.value)}
                                                        placeholder="e.g. Toxic Spikes, Sticky Web"
                                                    />
                                                </div>
                                                <div className="bo-subfield">
                                                    <label className="bo-field-label text-label">Cover</label>
                                                    <input
                                                        type="text"
                                                        className="bo-input bo-input--underline text-label"
                                                        value={battlefield.foeSide.cover}
                                                        onChange={(e) => updateFoeSide('cover', e.target.value)}
                                                        placeholder="e.g. Full Cover (+2 Def)"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bo-subfield">
                                                <label className="bo-field-label text-label">Other</label>
                                                <input
                                                    type="text"
                                                    className="bo-input bo-input--underline text-label"
                                                    value={battlefield.foeSide.other}
                                                    onChange={(e) => updateFoeSide('other', e.target.value)}
                                                    placeholder="e.g. Safeguard, Mist"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ========================================= */}
                    {/* CARD 2: REPLICABLE ROUND SECTIONS         */}
                    {/* ========================================= */}
                    {boSettings.showRoundTracker && (
                        <div className="bo-section-card bo-section-card--round">
                            {/* Round Navigation Bar */}
                            <div className="bo-round-nav-bar">
                                <div className="bo-round-tabs">
                                    {rounds.map((r, idx) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            className={`bo-round-tab ${idx === activeRoundIndex ? 'bo-round-tab--active' : ''}`}
                                            onClick={() => setActiveRoundIndex(idx)}
                                        >
                                            Round {r.roundNumber || idx + 1}
                                        </button>
                                    ))}
                                </div>

                                <div className="bo-round-actions">
                                    <button
                                        type="button"
                                        className="action-button action-button--primary bo-round-btn"
                                        onClick={advanceRound}
                                        title="End current round, decrement battlefield timers, and advance to next round"
                                    >
                                        <FastForward size={14} /> End Round & Advance
                                    </button>

                                    <button
                                        type="button"
                                        className="action-button action-button--dark bo-round-btn"
                                        onClick={addRound}
                                        title="Add a new blank round"
                                    >
                                        <Plus size={14} /> New Round
                                    </button>

                                    <button
                                        type="button"
                                        className="action-button action-button--dark bo-round-btn"
                                        onClick={() => duplicateRound(activeRoundIndex)}
                                        title="Duplicate current round and all its combatants"
                                    >
                                        <Copy size={14} /> Replicate Round
                                    </button>

                                    <button
                                        type="button"
                                        className="action-button action-button--dark bo-round-btn"
                                        onClick={sortCombatantsByInitiative}
                                        title="Sort combatants descending by initiative score"
                                    >
                                        <ArrowUpDown size={14} /> Sort Init
                                    </button>

                                    {rounds.length > 1 &&
                                        (confirmDeleteRoundIdx === activeRoundIndex ? (
                                            <div className="bo-confirm-delete-round-inline">
                                                <span className="bo-confirm-delete-text text-subtext">Delete?</span>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark bo-round-btn-mini"
                                                    onClick={() => setConfirmDeleteRoundIdx(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--red bo-round-btn-mini"
                                                    onClick={() => {
                                                        deleteRound(activeRoundIndex);
                                                        setConfirmDeleteRoundIdx(null);
                                                    }}
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="action-button action-button--dark bo-round-btn bo-round-btn--danger"
                                                onClick={() => setConfirmDeleteRoundIdx(activeRoundIndex)}
                                                title="Delete this round"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        ))}
                                </div>
                            </div>

                            {/* Round Header Pill */}
                            <div className="bo-pill-header bo-pill-header--round">
                                <span className="bo-pill-header__text text-theme-header">Round</span>
                                <input
                                    type="number"
                                    className="bo-round-number-input text-value-highlight"
                                    value={currentRound?.roundNumber || activeRoundIndex + 1}
                                    onChange={(e) => {
                                        const num = parseInt(e.target.value, 10) || 1;
                                        updateRoundNumber(activeRoundIndex, num);
                                    }}
                                    min={1}
                                />
                            </div>

                            {/* Combatants Table */}
                            <div className="bo-table-wrapper">
                                <table className="bo-table">
                                    <thead>
                                        <tr className="bo-table-header text-theme-header">
                                            <th className="bo-th bo-th--init">Initiative Order</th>
                                            <th className="bo-th bo-th--combatant">Combatant</th>
                                            <th className="bo-th bo-th--item">Held Item</th>
                                            <th className="bo-th bo-th--status">Status</th>
                                            <th className="bo-th bo-th--actions">Action Counter (1 - 5)</th>
                                            <th className="bo-th bo-th--tools">Tools</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRound?.combatants.map((combatant, cIdx) => (
                                            <CombatantRow
                                                key={combatant.id}
                                                combatant={combatant}
                                                index={cIdx}
                                                onUpdate={updateCombatant}
                                                onDelete={deleteCombatant}
                                                onRollInitiative={rollCombatantInitiative}
                                                onOpenSheet={handleOpenCombatantSheet}
                                                onAdjustHp={updateCombatantHp}
                                                onAdjustWill={updateCombatantWill}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add Combatant Button */}
                            <div className="bo-add-combatant-row">
                                <button
                                    type="button"
                                    className="action-button action-button--secondary bo-add-combatant-btn"
                                    onClick={addCombatant}
                                >
                                    <Plus size={16} /> Add Combatant Row
                                </button>
                            </div>

                            {/* End of the Round Effects */}
                            <div className="bo-end-effects-row">
                                <label className="bo-field-label text-label">End of the Round Effects:</label>
                                <input
                                    type="text"
                                    className="bo-input bo-input--underline text-label"
                                    value={currentRound?.endOfRoundEffects || ''}
                                    onChange={(e) => updateEndOfRoundEffects(e.target.value)}
                                    placeholder="e.g. Sandstorm damage, Leftovers recovery, Burn ticks, Speed Boost activation"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bo-modal__footer" onWheel={handleStaticWheel}>
                    <div className="bo-modal__footer-left">
                        {confirmClear ? (
                            <div className="bo-confirm-clear">
                                <span className="text-subtext">Clear entire Battle Organizer?</span>
                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-footer-btn"
                                    onClick={() => setConfirmClear(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--red bo-footer-btn"
                                    onClick={() => {
                                        clearAll();
                                        setConfirmClear(false);
                                        setActiveSheetCombatant(null);
                                        if (OBR.isAvailable) {
                                            OBR.notification.show('Battle Organizer sheet has been reset.', 'INFO');
                                        }
                                    }}
                                >
                                    Confirm Reset
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="action-button action-button--dark bo-footer-btn"
                                onClick={() => setConfirmClear(true)}
                                title="Reset all battlefield and round data"
                            >
                                <RotateCcw size={14} /> Reset Sheet
                            </button>
                        )}
                    </div>

                    <div className="bo-modal__footer-right">
                        <button
                            type="button"
                            className="action-button action-button--dark bo-footer-btn"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>

                {showSettingsModal && <BattleOrganizerSettingsModal onClose={() => setShowSettingsModal(false)} />}

                {showPullConfirmModal && (
                    <div
                        className="bo-settings__overlay"
                        onClick={() => setShowPullConfirmModal(false)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="bo-settings__content"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '420px' }}
                        >
                            <div className="bo-settings__header-row">
                                <h3 className="bo-settings__title text-title-primary">
                                    <Layers size={20} color="var(--primary)" /> Pull From Initiative
                                </h3>
                                <button
                                    type="button"
                                    className="bo-settings__close-x"
                                    onClick={() => setShowPullConfirmModal(false)}
                                    title="Close dialog"
                                    aria-label="Close dialog"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div
                                style={{
                                    padding: '8px 0',
                                    fontSize: '0.88rem',
                                    lineHeight: '1.4',
                                    color: 'var(--text-main)'
                                }}
                            >
                                This will replace the current combatant lineup and initiative in the Battle Organizer with the active tokens from the initiative tracker. Do you want to proceed?
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '8px',
                                    marginTop: '8px'
                                }}
                            >
                                <button
                                    type="button"
                                    className="action-button action-button--dark"
                                    onClick={() => setShowPullConfirmModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--primary"
                                    onClick={handleConfirmPullFromInitiative}
                                >
                                    Overwrite Lineup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {tooltipInfo && (
                    <div
                        className="bo-settings__overlay"
                        onClick={() => setTooltipInfo(null)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="bo-settings__content"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '460px' }}
                        >
                            <div className="bo-settings__header-row">
                                <h3 className="bo-settings__title text-title-primary">
                                    <HelpCircle size={18} color="var(--primary)" /> {tooltipInfo.title}
                                </h3>
                                <button
                                    type="button"
                                    className="bo-settings__close-x"
                                    onClick={() => setTooltipInfo(null)}
                                    title="Close info"
                                    aria-label="Close info"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div
                                style={{
                                    padding: '10px 0',
                                    fontSize: '0.88rem',
                                    lineHeight: '1.5',
                                    color: 'var(--text-main)',
                                    whiteSpace: 'pre-line'
                                }}
                            >
                                {tooltipInfo.desc}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '8px',
                                    marginTop: '10px'
                                }}
                            >
                                <button
                                    type="button"
                                    className="action-button action-button--primary"
                                    onClick={() => setTooltipInfo(null)}
                                >
                                    Got It
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeSheetCombatant && (
                    <CombatantSheetModal
                        combatant={activeSheetCombatant}
                        allCombatants={currentRound?.combatants || []}
                        onSelectCombatant={(c) => {
                            const role = useCharacterStore.getState().role;
                            if (role === 'PLAYER' && c.isNPC) return;
                            setActiveSheetCombatant(c);
                        }}
                        onClose={() => setActiveSheetCombatant(null)}
                        onMarkAction={handleMarkActionFromRoll}
                    />
                )}

                {/* Built-in live Roll Log display with quick action marking */}
                <InModalRollLog combatants={currentRound?.combatants || []} onMarkAction={handleMarkActionFromRoll} />
            </div>
        </div>
    );
}
