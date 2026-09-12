import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useBattleOrganizer } from './useBattleOrganizer';
import { BattleOrganizerHeader } from './BattleOrganizerHeader';
import { BattleOrganizerInstructions } from './BattleOrganizerInstructions';
import { BattlefieldSection } from './BattlefieldSection';
import { BattleRoundNav } from './BattleRoundNav';
import { CombatantsTable } from './CombatantsTable';
import { BattleOrganizerPullModal } from './BattleOrganizerPullModal';
import { BattleOrganizerTooltipModal } from './BattleOrganizerTooltipModal';
import { RotateCcw, X, Lightbulb } from 'lucide-react';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import { BattleOrganizerSettingsModal } from './BattleOrganizerSettingsModal';
import { CombatantSheetModal } from './CombatantSheetModal';
import { InModalRollLog } from './InModalRollLog';
import {
    getBattleOrganizerSettings,
    saveBattleOrganizerSettings,
    subscribeBattleOrganizerSettings,
    setBattleOrganizerOpen
} from './battleOrganizerSettingsHelper';
import { openBattleOrganizerPopout, markCombatantActionStatus } from './battleOrganizerUtils';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { BattleOrganizerSettings, CombatantRowData, RollLogLayoutMode } from '../../../types/battleOrganizerTypes';
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
    const [resetPullTrackers, setResetPullTrackers] = useState(true);
    const [activeSheetCombatant, setActiveSheetCombatant] = useState<CombatantRowData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const [isPushingActions, setIsPushingActions] = useState(false);

    const handleManualRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshTokenStats(false);
        } finally {
            setTimeout(() => setIsRefreshing(false), 600);
        }
    };

    const handlePushActionsToSheets = async () => {
        if (isPushingActions) return;
        setIsPushingActions(true);
        try {
            await syncToSheets();
        } finally {
            setTimeout(() => setIsPushingActions(false), 900);
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
        openBattleOrganizerPopout(boSettings);
        onClose();
    };

    const handlePullFromInitiative = () => {
        setResetPullTrackers(true);
        setShowPullConfirmModal(true);
    };

    const handleConfirmPullFromInitiative = () => {
        pullFromInitiative({ resetTrackers: resetPullTrackers });
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
        updateCombatant(markCombatantActionStatus(combatant, moveName, status));
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

    const handleCycleRollLogMode = () => {
        const currentMode = boSettings.rollLogMode || 'floating';
        let nextMode: RollLogLayoutMode;
        switch (currentMode) {
            case 'floating':
                nextMode = 'full-sidebar';
                break;
            case 'full-sidebar':
                nextMode = 'battlefield-nested';
                break;
            case 'battlefield-nested':
                nextMode = 'rounds-nested';
                break;
            case 'rounds-nested':
                nextMode = 'floating';
                break;
            default:
                nextMode = 'floating';
        }
        const next = saveBattleOrganizerSettings({ rollLogMode: nextMode });
        setBoSettings(next);
    };

    const [showHelp, setShowHelp] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [isHeaderToolsOpen, setIsHeaderToolsOpen] = useState(true);
    const [isBattlefieldOpen, setIsBattlefieldOpen] = useState(true);

    const handlePrintClick = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    const contentModeClass =
        boSettings.showBattlefield && !boSettings.showRoundTracker
            ? 'bo-modal__content--battlefield-only'
            : !boSettings.showBattlefield && boSettings.showRoundTracker
              ? 'bo-modal__content--rounds-only'
              : '';

    const layoutModeClass = boSettings.rollLogMode === 'full-sidebar' ? 'bo-modal__content--with-sidebar' : '';
    const rollLogMode = boSettings.rollLogMode || 'floating';

    const renderRollLog = (mode: RollLogLayoutMode) => (
        <InModalRollLog
            combatants={currentRound?.combatants || []}
            onMarkAction={handleMarkActionFromRoll}
            layoutMode={mode}
            onCycleLayoutMode={handleCycleRollLogMode}
        />
    );

    return (
        <div className={`bo-modal__overlay ${isPopout ? 'bo-modal__overlay--popout' : ''}`}>
            <div className={`bo-modal__content ${contentModeClass} ${layoutModeClass}`}>
                {/* Header and Toolbar */}
                <BattleOrganizerHeader
                    isStandaloneMode={isStandaloneMode}
                    isPopout={isPopout}
                    isHeaderToolsOpen={isHeaderToolsOpen}
                    isRefreshing={isRefreshing}
                    isPushingActions={isPushingActions}
                    showHelp={showHelp}
                    boSettings={boSettings}
                    onPopOut={handlePopOut}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    onToggleHeaderTools={() => setIsHeaderToolsOpen(!isHeaderToolsOpen)}
                    onClose={onClose}
                    onPullFromInitiative={handlePullFromInitiative}
                    onManualRefresh={handleManualRefresh}
                    onPushActionsToSheets={handlePushActionsToSheets}
                    onPrintClick={handlePrintClick}
                    onToggleHelp={() => setShowHelp(!showHelp)}
                    onQuickToggleBattlefield={handleQuickToggleBattlefield}
                    onQuickToggleRoundTracker={handleQuickToggleRoundTracker}
                    onCycleRollLogMode={handleCycleRollLogMode}
                    onShowTooltip={(info) => setTooltipInfo(info)}
                    onWheel={handleStaticWheel}
                />

                {/* Owlbear Rodeo Dual-Screen / Dual-Window Advisory Banner */}
                {!isStandaloneMode && showObrAdvisory && (
                    <div className="bo-advisory-banner" onWheel={handleStaticWheel}>
                        <div className="bo-advisory-banner__content text-subtext">
                            <span className="bo-advisory-banner__icon">
                                <Lightbulb size={16} color="#f59e0b" />
                            </span>
                            <span>
                                <strong>Optimal Dual-Screen GM Setup:</strong> For the best experience without modal
                                occlusion on your battle map or 3D dice, open your Owlbear Rodeo room link in a{' '}
                                <strong>Private / Incognito window</strong> as a guest, grant that guest{' '}
                                <strong>GM permissions</strong>, and manage the Battle Organizer there.{' '}
                                <em>
                                    (Do not duplicate your tab on the same logged-in account, as Owlbear Rodeo
                                    rate-limits duplicate sessions and will crash).
                                </em>
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
                    <BattleOrganizerInstructions onClose={() => setShowHelp(false)} onWheel={handleStaticWheel} />
                )}

                {/* Modal Scrollable Body */}
                <div
                    className={rollLogMode === 'full-sidebar' ? 'bo-modal__body-with-sidebar' : 'bo-modal__body'}
                    ref={rollLogMode !== 'full-sidebar' ? bodyRef : undefined}
                >
                    <div
                        className={rollLogMode === 'full-sidebar' ? 'bo-modal__main-col' : 'bo-modal__body-inner'}
                        ref={rollLogMode === 'full-sidebar' ? bodyRef : undefined}
                    >
                        {/* CARD 1: BATTLEFIELD */}
                        {boSettings.showBattlefield && (
                            <BattlefieldSection
                                battlefield={battlefield}
                                isBattlefieldOpen={isBattlefieldOpen}
                                onToggleBattlefieldOpen={() => setIsBattlefieldOpen(!isBattlefieldOpen)}
                                updateBattlefield={updateBattlefield}
                                updateBattlefieldWeather={updateBattlefieldWeather}
                                updateBattlefieldTerrain={updateBattlefieldTerrain}
                                updateBattlefieldOther={updateBattlefieldOther}
                                updatePlayerSide={updatePlayerSide}
                                updateFoeSide={updateFoeSide}
                                rollLogMode={rollLogMode}
                                renderRollLog={renderRollLog}
                            />
                        )}

                        {/* CARD 2: REPLICABLE ROUND SECTIONS */}
                        {boSettings.showRoundTracker && (
                            <div className={rollLogMode === 'rounds-nested' ? 'bo-rounds-nest-row' : 'bo-rounds-wrap'}>
                                <div
                                    className={
                                        rollLogMode === 'rounds-nested' ? 'bo-rounds-nest-main' : 'bo-rounds-main-wrap'
                                    }
                                >
                                    <div className="bo-section-card bo-section-card--round">
                                        <BattleRoundNav
                                            rounds={rounds}
                                            activeRoundIndex={activeRoundIndex}
                                            currentRoundNumber={currentRound?.roundNumber}
                                            onSelectRound={setActiveRoundIndex}
                                            onAdvanceRound={advanceRound}
                                            onAddRound={addRound}
                                            onDuplicateRound={duplicateRound}
                                            onDeleteRound={deleteRound}
                                            onSortInitiative={sortCombatantsByInitiative}
                                            onUpdateRoundNumber={updateRoundNumber}
                                        />

                                        <CombatantsTable
                                            combatants={currentRound?.combatants || []}
                                            endOfRoundEffects={currentRound?.endOfRoundEffects || ''}
                                            onUpdateCombatant={updateCombatant}
                                            onDeleteCombatant={deleteCombatant}
                                            onRollInitiative={rollCombatantInitiative}
                                            onOpenSheet={handleOpenCombatantSheet}
                                            onAdjustHp={updateCombatantHp}
                                            onAdjustWill={updateCombatantWill}
                                            onAddCombatant={addCombatant}
                                            onUpdateEndOfRoundEffects={updateEndOfRoundEffects}
                                        />
                                    </div>
                                </div>
                                {rollLogMode === 'rounds-nested' && (
                                    <div className="bo-rounds-nest-sidebar">{renderRollLog('rounds-nested')}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {rollLogMode === 'full-sidebar' && (
                        <div className="bo-modal__sidebar-col">{renderRollLog('full-sidebar')}</div>
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

                {/* Sub-Modals & Overlays */}
                {showSettingsModal && <BattleOrganizerSettingsModal onClose={() => setShowSettingsModal(false)} />}

                <BattleOrganizerPullModal
                    isOpen={showPullConfirmModal}
                    hasExistingCombatants={Boolean(currentRound?.combatants && currentRound.combatants.length > 0)}
                    resetPullTrackers={resetPullTrackers}
                    onToggleResetTrackers={setResetPullTrackers}
                    onConfirm={handleConfirmPullFromInitiative}
                    onClose={() => setShowPullConfirmModal(false)}
                />

                <BattleOrganizerTooltipModal tooltipInfo={tooltipInfo} onClose={() => setTooltipInfo(null)} />

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

                {/* Built-in live Roll Log display with quick action marking (Floating or Fallback) */}
                {(rollLogMode === 'floating' ||
                    (rollLogMode === 'battlefield-nested' && !boSettings.showBattlefield) ||
                    (rollLogMode === 'rounds-nested' && !boSettings.showRoundTracker)) &&
                    renderRollLog('floating')}
            </div>
        </div>
    );
}
