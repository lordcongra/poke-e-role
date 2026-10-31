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
import { SceneSwapPromptModal } from './SceneSwapPromptModal';
import { useSceneSwapDetection } from './useSceneSwapDetection';
import { BattleOrganizerAdvisoryBanner } from './BattleOrganizerAdvisoryBanner';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { BattleOrganizerFooter } from './BattleOrganizerFooter';
import { BattleOrganizerSettingsModal } from './BattleOrganizerSettingsModal';
import { CombatantSheetModal } from './CombatantSheetModal';
import { InModalRollLog } from './InModalRollLog';
import { RoundWeatherDamageModal } from './RoundWeatherDamageModal';
import {
    getBattleOrganizerSettings,
    saveBattleOrganizerSettings,
    subscribeBattleOrganizerSettings,
    setBattleOrganizerOpen
} from './battleOrganizerSettingsHelper';
import { openBattleOrganizerPopout, markCombatantActionStatus } from './battleOrganizerUtils';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { BattleOrganizerSettings, CombatantRowData, RollLogLayoutMode } from '../../../types/battleOrganizerTypes';
import { useRoundAdvanceModal } from './useRoundAdvanceModal';
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
        activateFieldEffectFromMove,
        clearBattlefield,
        clearAll
    } = useBattleOrganizer();

    const { showSceneSwapModal, handleClearForNewScene, handleKeepCurrentBattle } = useSceneSwapDetection({
        battlefield,
        rounds,
        updateBattlefield,
        clearAll
    });

    const [boSettings, setBoSettings] = useState<BattleOrganizerSettings>(() => getBattleOrganizerSettings());
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showPullConfirmModal, setShowPullConfirmModal] = useState(false);
    const [resetPullTrackers, setResetPullTrackers] = useState(true);
    const [resetFieldEffects, setResetFieldEffects] = useState(false);
    const [activeSheetCombatant, setActiveSheetCombatant] = useState<CombatantRowData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const {
        showWeatherDamageModal,
        setShowWeatherDamageModal,
        hazardWeatherName,
        handleAdvanceRoundRequest,
        handleApplyRoundTriggersAndAdvance,
        handleSkipWeatherDamageAndAdvance
    } = useRoundAdvanceModal({
        battlefield,
        currentRound,
        advanceRound,
        updateCombatant
    });

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

            if (OBR.isAvailable && !isStandaloneMode) {
                try {
                    const stored = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                    if (Array.isArray(stored) && stored.length > 0) {
                        const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
                        OBR.popover
                            .open({
                                id: 'pkr-roll-log',
                                url: `${baseUrl}/roll-log.html`,
                                height: 380,
                                width: 320,
                                disableClickAway: true,
                                anchorReference: 'POSITION',
                                anchorPosition: { left: window.innerWidth - 340, top: window.innerHeight - 400 }
                            })
                            .catch(() => {});
                    }
                } catch (e) {
                    console.warn('[BattleOrganizer] Failed to re-open roll-log popover:', e);
                }
            }
            window.dispatchEvent(new Event('pkr-roll-log-update'));
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

    const handlePopOut = () => {
        openBattleOrganizerPopout(boSettings);
        onClose();
    };

    const [pullModalMode, setPullModalMode] = useState<'replace' | 'merge'>('replace');

    const handlePullFromInitiative = () => {
        setResetPullTrackers(true);
        setPullModalMode('replace');
        setShowPullConfirmModal(true);
    };

    const handlePullNewFromInitiative = () => {
        setResetPullTrackers(true);
        setPullModalMode('merge');
        setShowPullConfirmModal(true);
    };

    const handleConfirmPullFromInitiative = (options?: { mergeOnly?: boolean }) => {
        const isMerge = options?.mergeOnly !== undefined ? options.mergeOnly : pullModalMode === 'merge';
        pullFromInitiative({ resetTrackers: resetPullTrackers, mergeOnly: isMerge });
        if (resetFieldEffects) {
            clearBattlefield();
        }
        setShowPullConfirmModal(false);
    };

    const handleOpenCombatantSheet = (combatant: CombatantRowData) => {
        const role = useCharacterStore.getState().role;
        if (!isStandaloneMode && role === 'PLAYER' && combatant.isNPC) {
            return;
        }
        setActiveSheetCombatant(combatant);
    };

    const handleMarkActionFromRoll = (
        combatantId: string,
        moveName: string,
        status: 'success' | 'failed',
        options?: { isEvade?: boolean; isClash?: boolean }
    ) => {
        const currentCombatants = currentRound?.combatants || [];
        const combatant = currentCombatants.find((c) => c.id === combatantId);
        if (!combatant) return;

        let updated = markCombatantActionStatus(combatant, moveName, status);
        if (options?.isEvade || /^(?:evade|evasion)$/i.test(moveName.trim())) {
            updated = { ...updated, evadeUsed: true };
        }
        if (options?.isClash || /(?:physical clash|special clash|^clash$)/i.test(moveName.trim())) {
            updated = { ...updated, clashUsed: true };
        }
        updateCombatant(updated);
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
            onActivateFieldEffect={activateFieldEffectFromMove}
            battlefield={battlefield}
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
                    onPullNewFromInitiative={handlePullNewFromInitiative}
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
                <BattleOrganizerAdvisoryBanner onWheel={handleStaticWheel} />

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
                                            onAdvanceRound={handleAdvanceRoundRequest}
                                            onAddRound={addRound}
                                            onDuplicateRound={duplicateRound}
                                            onDeleteRound={deleteRound}
                                            onSortInitiative={sortCombatantsByInitiative}
                                            onUpdateRoundNumber={updateRoundNumber}
                                        />

                                        <CombatantsTable
                                            combatants={currentRound?.combatants || []}
                                            endOfRoundEffects={currentRound?.endOfRoundEffects || ''}
                                            showCriticalMarks={boSettings.showCriticalMarks !== false}
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
                <BattleOrganizerFooter
                    confirmClear={confirmClear}
                    onSetConfirmClear={setConfirmClear}
                    onClearAll={clearAll}
                    onClose={onClose}
                    onWheel={handleStaticWheel}
                />

                {/* Sub-Modals & Overlays */}
                {showSettingsModal && <BattleOrganizerSettingsModal onClose={() => setShowSettingsModal(false)} />}

                <BattleOrganizerPullModal
                    isOpen={showPullConfirmModal}
                    mode={pullModalMode}
                    hasExistingCombatants={Boolean(currentRound?.combatants && currentRound.combatants.length > 0)}
                    resetPullTrackers={resetPullTrackers}
                    onToggleResetTrackers={setResetPullTrackers}
                    resetFieldEffects={resetFieldEffects}
                    onToggleResetFieldEffects={setResetFieldEffects}
                    onConfirm={handleConfirmPullFromInitiative}
                    onClose={() => setShowPullConfirmModal(false)}
                />

                <SceneSwapPromptModal
                    isOpen={showSceneSwapModal}
                    onClearForNewScene={handleClearForNewScene}
                    onKeepCurrentBattle={handleKeepCurrentBattle}
                />

                <BattleOrganizerTooltipModal tooltipInfo={tooltipInfo} onClose={() => setTooltipInfo(null)} />

                {showWeatherDamageModal && (
                    <RoundWeatherDamageModal
                        isOpen={true}
                        weatherName={hazardWeatherName}
                        battlefield={battlefield}
                        combatants={currentRound?.combatants || []}
                        onApplyDamageAndHeal={handleApplyRoundTriggersAndAdvance}
                        onSkip={handleSkipWeatherDamageAndAdvance}
                        onClose={() => setShowWeatherDamageModal(false)}
                    />
                )}

                {activeSheetCombatant && (
                    <CombatantSheetModal
                        key={activeSheetCombatant.id}
                        combatant={activeSheetCombatant}
                        allCombatants={currentRound?.combatants || []}
                        onSelectCombatant={(c) => {
                            const role = useCharacterStore.getState().role;
                            if (!isStandaloneMode && role === 'PLAYER' && c.isNPC) return;
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
