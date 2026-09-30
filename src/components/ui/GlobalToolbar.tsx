import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { canViewHomebrew } from '../../utils/common/helper';
import { CURRENT_VERSION } from '../../data/changelog';
import { flattenStateToMetadata } from '../../utils/sync/stateMapper';
import { saveToOwlbear } from '../../utils/sync/obr';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { useObrReady } from '../../hooks/useObrReady';
import { setActiveTokenId } from '../../utils/sync/obr';
import { useInitiativePopover } from '../../hooks/useInitiativePopover';
import { exportCharacterData, parseImportedFile } from '../../utils/common/fileSystemHelpers';
import type { CharacterState } from '../../store/storeTypes';

// Modals
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { RulesModal } from '../modals/settings/RulesModal';
import { ItemGeneratorModal } from '../modals/itemGenerator';
import { ChangelogModal } from '../modals/settings/ChangelogModal';
import { InitiativeSettingsModal } from '../modals/trackers/InitiativeSettingsModal';
import { GeneratorModal } from '../modals/pokemonGenerator';
import { PrintSettingsModal } from '../modals/settings/PrintSettingsModal';
import { ThemeSettingsModal } from '../modals/settings/ThemeSettingsModal';
import { AccessibilityModal } from '../modals/settings/AccessibilityModal';
import { GmScreenModal } from '../modals/gmScreen/GmScreenModal';
import { BattleOrganizerModal } from '../modals/battleOrganizer/BattleOrganizerModal';
import { BattleOrganizerSettingsModal } from '../modals/battleOrganizer/BattleOrganizerSettingsModal';
import { getBattleOrganizerSettings } from '../modals/battleOrganizer/battleOrganizerSettingsHelper';
import { PrintBattleOrganizer } from '../print/PrintBattleOrganizer';
import { TrainerGeneratorModal } from '../modals/trainerGenerator';
import { BugReportModal } from '../modals/settings';
import { PcStorageModal } from '../modals/pcStorage/PcStorageModal';

// Icons
import {
    ChevronDown,
    ArrowLeft,
    Swords,
    Settings,
    Hammer,
    BookOpen,
    Package,
    Bell,
    Printer,
    Wand2,
    Palette,
    AlertTriangle,
    XCircle,
    Eye,
    ShieldCheck,
    Layers,
    UserCheck,
    Sun,
    Moon,
    Save,
    Upload,
    Bug,
    HardDrive
} from 'lucide-react';
import './GlobalToolbar.css';

type ActiveModal =
    | 'homebrew'
    | 'rules'
    | 'loot'
    | 'changelog'
    | 'init'
    | 'generator'
    | 'trainer-generator'
    | 'print'
    | 'theme'
    | 'accessibility'
    | 'gm-screen'
    | 'battle-organizer'
    | 'battle-organizer-settings'
    | 'bug-report'
    | 'pc'
    | null;

export function GlobalToolbar() {
    const isObrReady = useObrReady();
    const { handleInitiativeToggle } = useInitiativePopover(isObrReady);
    const loadFromOwlbear = useCharacterStore((state) => state.loadFromOwlbear);

    const storeRole = useCharacterStore((state) => state.role);
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const homebrewAccess = useCharacterStore((state) => state.identity.homebrewAccess) || 'Full';
    const gmOnlyLootGen = useCharacterStore((state) => state.identity.gmOnlyLootGen);
    const gmOnlyGenerators = useCharacterStore((state) => state.identity.gmOnlyGenerators);

    const [localRole, setLocalRole] = useState<string>(isStandaloneMode ? 'GM' : storeRole);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [isDark, setIsDark] = useState<boolean>(true);

    // Consolidated State
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
    const [isPrintingBattleOrganizer, setIsPrintingBattleOrganizer] = useState(false);

    const fileInputReference = useRef<HTMLInputElement>(null);
    const handleBattleOrganizerClickRef = useRef<() => void>(() => {});

    const isGm = isStandaloneMode || storeRole === 'GM' || localRole === 'GM';
    const showHomebrewButton = isStandaloneMode || canViewHomebrew(localRole, homebrewAccess);
    const showLootGenButton = isGm || gmOnlyLootGen === false;
    const showPokemonGeneratorButton = isGm || gmOnlyGenerators === false;

    useEffect(() => {
        if (!isStandaloneMode && OBR.isAvailable) {
            OBR.onReady(async () => {
                const currentRole = await OBR.player.getRole();
                setLocalRole(currentRole);
            });
        }
    }, []);

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('pokerole-theme');
            if (savedTheme === 'light') {
                setIsDark(false);
                document.body.classList.remove('dark-mode');
                document.body.setAttribute('data-theme', 'light');
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                setIsDark(true);
                document.body.classList.add('dark-mode');
                document.body.setAttribute('data-theme', 'dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }

            const savedContrast = localStorage.getItem('pkr_high_contrast');
            if (savedContrast === null || savedContrast === 'true') {
                document.body.setAttribute('data-high-contrast', 'true');
            }

            const seenVersion = localStorage.getItem('pkr_changelog_seen');
            if (seenVersion !== CURRENT_VERSION) {
                setActiveModal('changelog');
            }

            const urlParams = new URLSearchParams(window.location.search);
            const modalParam = urlParams.get('modal');
            const sectionParam = urlParams.get('section');
            const hash = window.location.hash;
            if (
                modalParam === 'gm-screen' ||
                modalParam === 'lookup' ||
                modalParam === 'pokemon-lookup' ||
                sectionParam === 'lookup' ||
                hash.startsWith('#gm-screen') ||
                hash.startsWith('#pokemon-lookup') ||
                hash.startsWith('#lookup')
            ) {
                setActiveModal('gm-screen');
            }

            const savedExpanded = localStorage.getItem('pkr_global_toolbar_expanded');
            if (savedExpanded !== null) {
                setIsExpanded(savedExpanded === 'true');
            }
            const handleOpenModal = (e: Event) => {
                const custom = e as CustomEvent<ActiveModal>;
                if (custom.detail === 'battle-organizer') {
                    handleBattleOrganizerClickRef.current();
                    return;
                }
                if (custom.detail) {
                    setActiveModal(custom.detail);
                }
            };
            window.addEventListener('pkr-open-modal', handleOpenModal as EventListener);
            return () => {
                window.removeEventListener('pkr-open-modal', handleOpenModal as EventListener);
            };
        } catch (error) {
            console.warn('[GlobalToolbar] Could not read preferences from localStorage:', error);
        }
    }, []);

    const toggleExpanded = () => {
        const next = !isExpanded;
        setIsExpanded(next);
        try {
            localStorage.setItem('pkr_global_toolbar_expanded', String(next));
        } catch (e) {
            console.warn('[GlobalToolbar] Failed to save toolbar state:', e);
        }
    };

    const handleReturnToMenu = async () => {
        if (OBR.isAvailable) {
            try {
                await OBR.player.select([]);
            } catch (e) {
                console.warn('[GlobalToolbar] Failed to deselect OBR player selection:', e);
            }
        }
        useCharacterStore.setState({ tokenId: null });
        setActiveTokenId(null);
        useCharacterStore.getState().loadFromOwlbear({});
    };

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        const themeValue = newIsDark ? 'dark' : 'light';

        if (newIsDark) {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }

        try {
            localStorage.setItem('pokerole-theme', themeValue);
        } catch (error) {
            console.warn('[GlobalToolbar] Could not persist theme selection:', error);
        }

        if (OBR.isAvailable) {
            OBR.broadcast.sendMessage('pokerole-pmd-extension/theme-sync', themeValue, { destination: 'LOCAL' });
            OBR.broadcast.sendMessage('pkr-theme-update', themeValue, { destination: 'LOCAL' });
        }
    };

    const handleCloseChangelog = () => {
        try {
            localStorage.setItem('pkr_changelog_seen', CURRENT_VERSION);
        } catch (error) {
            console.warn('[GlobalToolbar] Failed to store changelog seen version in localStorage:', error);
        }
        setActiveModal(null);
    };

    const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const data = await parseImportedFile(file);
            setImportData(data);
        } catch (error) {
            console.error('[GlobalToolbar] Failed to parse imported character JSON:', error);
            if (OBR.isAvailable && isObrReady) OBR.notification.show('Invalid JSON file.', 'ERROR');
            else alert('Invalid JSON file.');
        }
        if (fileInputReference.current) fileInputReference.current.value = '';
    };

    const confirmImport = () => {
        if (!importData) return;
        try {
            if (
                importData['moves-data'] !== undefined ||
                importData['hp-curr'] !== undefined ||
                importData['v2-migrated']
            ) {
                loadFromOwlbear(importData);
                saveToOwlbear(importData);
            } else {
                useCharacterStore.setState(importData as Partial<CharacterState>);
                const fullState = useCharacterStore.getState();
                const metaToSave = flattenStateToMetadata(fullState);
                saveToOwlbear(metaToSave);
            }
        } catch (error) {
            console.error('[GlobalToolbar] Failed to import character data:', error);
            if (OBR.isAvailable && isObrReady) OBR.notification.show('Failed to import data.', 'ERROR');
            else alert('Failed to import data.');
        } finally {
            setImportData(null);
        }
    };

    const handleBattleOrganizerClick = async () => {
        const isReady = isObrReady || Boolean(OBR.isAvailable && OBR.isReady);
        if (isStandaloneMode || !OBR.isAvailable || !isReady) {
            console.warn('[GlobalToolbar] Bypassing OBR modal, falling back to local modal:', {
                isStandaloneMode,
                isAvailable: OBR.isAvailable,
                isReady: OBR.isReady,
                isObrReady
            });
            setActiveModal('battle-organizer');
            return;
        }

        try {
            // Measure viewport safely in parallel with defaults to avoid stalling or unhandled rejection
            const [vpWidthRes, vpHeightRes] = await Promise.allSettled([
                OBR.viewport.getWidth(),
                OBR.viewport.getHeight()
            ]);
            const viewportWidth =
                vpWidthRes.status === 'fulfilled' && typeof vpWidthRes.value === 'number' ? vpWidthRes.value : 1200;
            const viewportHeight =
                vpHeightRes.status === 'fulfilled' && typeof vpHeightRes.value === 'number' ? vpHeightRes.value : 800;

            const settings = getBattleOrganizerSettings();
            const isFullScreen = settings.fullScreen ?? false;

            let targetWidth = 1360;
            let targetHeight = 900;

            if (settings.showBattlefield && !settings.showRoundTracker) {
                targetWidth = 1040;
                targetHeight = 600;
            } else if (!settings.showBattlefield && settings.showRoundTracker) {
                targetWidth = 1200;
                targetHeight = 740;
            }

            if (viewportWidth > 800) {
                targetWidth = Math.max(1000, Math.min(Math.round(viewportWidth * 0.95), targetWidth));
            }
            if (viewportHeight > 600) {
                targetHeight = Math.max(650, Math.min(Math.round(viewportHeight * 0.95), targetHeight));
            }

            const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
            const themeToPass = document.body.getAttribute('data-theme') || 'dark';
            const currentPrimary =
                document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
                document.body.style.getPropertyValue('--dynamic-type-color') ||
                '';
            const currentSecondary =
                document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
                document.body.style.getPropertyValue('--dynamic-secondary-color') ||
                '';
            const urlParams = new URLSearchParams();
            urlParams.set('theme', themeToPass);
            if (storeRole) urlParams.set('role', storeRole);
            if (currentPrimary.trim()) urlParams.set('primary', currentPrimary.trim());
            if (currentSecondary.trim()) urlParams.set('secondary', currentSecondary.trim());
            const url = `${baseUrl}/battle-organizer.html?${urlParams.toString()}`;

            // Try opening in requested mode (always passing width & height)
            try {
                await OBR.modal.open({
                    id: 'pkr-battle-organizer',
                    url: url,
                    width: targetWidth,
                    height: targetHeight,
                    fullScreen: isFullScreen
                });
            } catch (firstErr) {
                // If opening in fullscreen failed, gracefully retry with standard modal view
                if (isFullScreen) {
                    console.warn('[GlobalToolbar] Fullscreen modal failed, retrying in standard modal view:', firstErr);
                    await OBR.modal.open({
                        id: 'pkr-battle-organizer',
                        url: url,
                        width: targetWidth,
                        height: targetHeight,
                        fullScreen: false
                    });
                } else {
                    throw firstErr;
                }
            }
        } catch (e) {
            console.warn('[GlobalToolbar] Failed to open OBR Battle Organizer modal, falling back to local modal:', e);
            setActiveModal('battle-organizer');
        }
    };
    handleBattleOrganizerClickRef.current = handleBattleOrganizerClick;

    return (
        <div className="global-toolbar-wrapper">
            <div
                className={`global-toolbar__header ${isExpanded ? 'global-toolbar__header--open' : ''}`}
                onClick={toggleExpanded}
            >
                <div className="global-toolbar__header-title">
                    <span className="global-toolbar__caret">
                        <ChevronDown size={18} />
                    </span>
                    TABLE TOOLS & SETTINGS
                </div>

                <div className="global-toolbar__header-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className="global-toolbar__btn--bug-header action-button"
                        onClick={() => setActiveModal('bug-report')}
                        title="Report a bug or send feedback directly to Congra"
                    >
                        <Bug size={14} color="var(--primary)" /> Report Bug
                    </button>

                    {activeTokenId && (
                        <button
                            type="button"
                            className="global-toolbar__btn--back-header action-button"
                            onClick={handleReturnToMenu}
                            title={
                                isStandaloneMode
                                    ? 'Close sheet and return to file browser'
                                    : 'Deselect active token and close sheet'
                            }
                        >
                            <ArrowLeft size={16} /> {isStandaloneMode ? 'Back to Menu' : 'Deselect Token'}
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="global-toolbar__content">
                    <div className="global-toolbar__main-tools">
                        <div className="global-toolbar__init-group">
                            <button
                                type="button"
                                className="global-toolbar__btn global-toolbar__btn--init-main action-button--primary-hover"
                                onClick={handleInitiativeToggle}
                                title="Toggle Initiative Tracker window"
                            >
                                <Swords size={16} color="var(--primary)" /> Initiative
                            </button>
                            <button
                                type="button"
                                className="global-toolbar__btn global-toolbar__btn--init-cog action-button--primary-hover"
                                onClick={() => setActiveModal('init')}
                                title="Initiative Settings"
                            >
                                <Settings size={16} color="var(--text-muted)" />
                            </button>
                        </div>

                        <div className="global-toolbar__bo-group">
                            <button
                                type="button"
                                className="global-toolbar__btn global-toolbar__btn--bo-main action-button--primary-hover"
                                onClick={handleBattleOrganizerClick}
                                title="Toggle Battle Organizer Sheet"
                            >
                                <Layers size={16} color="var(--primary)" /> Battle Organizer
                            </button>
                            <button
                                type="button"
                                className="global-toolbar__btn global-toolbar__btn--bo-cog action-button--primary-hover"
                                onClick={() => setActiveModal('battle-organizer-settings')}
                                title="Battle Organizer Settings"
                                aria-label="Battle Organizer Settings"
                            >
                                <Settings size={16} color="var(--text-muted)" />
                            </button>
                        </div>

                        <button
                            type="button"
                            className="global-toolbar__btn action-button--primary-hover"
                            onClick={() => setActiveModal('pc')}
                            title="Open Pokémon PC Storage & Party Belt"
                        >
                            <HardDrive size={16} color="var(--primary)" /> Pokémon PC
                        </button>

                        {showHomebrewButton && (
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--primary-hover"
                                onClick={() => setActiveModal('homebrew')}
                                title="Manage Table Custom Content"
                            >
                                <Hammer size={16} color="var(--primary)" /> Homebrew Workshop
                            </button>
                        )}

                        {isGm && (
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--primary-hover"
                                onClick={() => setActiveModal('rules')}
                                title="Configure Room Rules & Dice Engine"
                            >
                                <BookOpen size={16} color="var(--primary)" /> Room Rules
                            </button>
                        )}

                        {showLootGenButton && (
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--primary-hover"
                                onClick={() => setActiveModal('loot')}
                                title="Generate Items & TMs"
                            >
                                <Package size={16} color="var(--primary)" /> Loot Generator
                            </button>
                        )}

                        {showPokemonGeneratorButton && (
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--primary-hover"
                                onClick={() => setActiveModal('generator')}
                                title="Open Pokémon Generator"
                            >
                                <Wand2 size={16} color="var(--primary)" /> PKMN Generator
                            </button>
                        )}

                        {showPokemonGeneratorButton && (
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--primary-hover"
                                onClick={() => setActiveModal('trainer-generator')}
                                title="Open Trainer & Team Generator"
                            >
                                <UserCheck size={16} color="var(--primary)" /> TRNR Generator
                            </button>
                        )}
                    </div>

                    <div className="global-toolbar__side-tools">
                        <button
                            type="button"
                            className="global-toolbar__btn action-button--primary-hover"
                            onClick={() => setActiveModal('theme')}
                            title="Override Theme Colors"
                        >
                            <Palette size={16} color="var(--primary)" /> Theme
                        </button>

                        <button
                            type="button"
                            className="global-toolbar__btn action-button--primary-hover"
                            onClick={() => setActiveModal('changelog')}
                            title="View System Updates"
                        >
                            <Bell size={16} color="var(--primary)" /> What's New
                        </button>

                        <button
                            type="button"
                            className="global-toolbar__btn action-button--primary-hover"
                            onClick={() => setActiveModal('accessibility')}
                            title="Accessibility Options (Contrast & Fonts)"
                        >
                            <Eye size={16} color="var(--primary)" /> Accessibility
                        </button>

                        <button
                            type="button"
                            className="global-toolbar__btn action-button--neutral-hover"
                            onClick={toggleTheme}
                            title="Toggle Dark/Light Mode"
                        >
                            {isDark ? (
                                <>
                                    <Sun size={16} color="#F8D030" /> Light
                                </>
                            ) : (
                                <>
                                    <Moon size={16} color="#A890F0" /> Dark
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            className="global-toolbar__btn global-toolbar__btn--gm-screen action-button--primary-hover"
                            onClick={() => setActiveModal('gm-screen')}
                            title="Open GM Screen & Rules Cheat Sheet"
                        >
                            <ShieldCheck size={16} color="var(--primary)" /> GM Screen
                        </button>

                        <div className="global-toolbar__icon-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    exportCharacterData(useCharacterStore.getState(), isStandaloneMode, isObrReady)
                                }
                                className="action-button action-button--dark global-toolbar__action-mini-btn"
                                title="Export Character (Download JSON)"
                                aria-label="Export Character JSON"
                            >
                                <Save size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputReference.current?.click()}
                                className="action-button action-button--dark global-toolbar__action-mini-btn"
                                title="Import Character (Upload JSON)"
                                aria-label="Import Character JSON"
                            >
                                <Upload size={16} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputReference}
                                onChange={handleImportChange}
                                accept=".json"
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                onClick={() => setActiveModal('print')}
                                className="action-button action-button--dark global-toolbar__action-mini-btn"
                                title="Print Sheet"
                                aria-label="Print Sheet"
                            >
                                <Printer size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Standalone Import Prompt */}
            {importData && (
                <div className="global-toolbar__modal-overlay">
                    <div className="global-toolbar__modal-content">
                        <h3 className="global-toolbar__modal-title">
                            <AlertTriangle size={20} /> Confirm Import
                        </h3>
                        <p className="global-toolbar__modal-text text-subtext">
                            Import character data? This will completely overwrite the current token.
                        </p>
                        <div className="global-toolbar__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark global-toolbar__modal-btn"
                                onClick={() => setImportData(null)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red global-toolbar__modal-btn"
                                onClick={confirmImport}
                            >
                                <Upload size={16} /> Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conditionally Rendered Modals */}
            {activeModal === 'homebrew' && <HomebrewModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'rules' && <RulesModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'loot' && <ItemGeneratorModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'generator' && <GeneratorModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'trainer-generator' && <TrainerGeneratorModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'changelog' && <ChangelogModal onClose={handleCloseChangelog} />}
            {activeModal === 'init' && <InitiativeSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'print' && <PrintSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'theme' && <ThemeSettingsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'accessibility' && <AccessibilityModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'gm-screen' && <GmScreenModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'battle-organizer-settings' && (
                <BattleOrganizerSettingsModal onClose={() => setActiveModal(null)} />
            )}
            {activeModal === 'battle-organizer' && (
                <BattleOrganizerModal
                    onClose={() => setActiveModal(null)}
                    onPrint={() => setIsPrintingBattleOrganizer(true)}
                />
            )}
            {activeModal === 'bug-report' && <BugReportModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'pc' && <PcStorageModal onClose={() => setActiveModal(null)} />}

            {isPrintingBattleOrganizer && <PrintBattleOrganizer onDone={() => setIsPrintingBattleOrganizer(false)} />}
        </div>
    );
}
