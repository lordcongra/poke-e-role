import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { canViewHomebrew } from '../../utils/helper';
import { CURRENT_VERSION } from '../../data/changelog';
import { flattenStateToMetadata } from '../../utils/stateMapper';
import { saveToOwlbear } from '../../utils/obr';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { useObrReady } from '../../hooks/useObrReady';
import { setActiveTokenId } from '../../utils/obr';
import { useInitiativePopover } from '../../hooks/useInitiativePopover';
import { exportCharacterData, parseImportedFile } from '../../utils/fileSystemHelpers';
import type { CharacterState } from '../../store/storeTypes';

// Modals
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { RulesModal } from '../modals/RulesModal';
import { ItemGeneratorModal } from '../modals/ItemGeneratorModal';
import { ChangelogModal } from '../modals/ChangelogModal';
import { InitiativeSettingsModal } from '../modals/InitiativeSettingsModal';
import { GeneratorModal } from '../modals/GeneratorModal';
import { PrintSettingsModal } from '../modals/PrintSettingsModal';
import { ThemeSettingsModal } from '../modals/ThemeSettingsModal';
import { AccessibilityModal } from '../modals/AccessibilityModal';
import { GmScreenModal } from '../modals/GmScreenModal';
import { BattleOrganizerModal } from '../modals/battleOrganizer/BattleOrganizerModal';
import { BattleOrganizerSettingsModal } from '../modals/battleOrganizer/BattleOrganizerSettingsModal';
import { getBattleOrganizerSettings } from '../modals/battleOrganizer/battleOrganizerSettingsHelper';
import { PrintBattleOrganizer } from '../print/PrintBattleOrganizer';

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
    Sun,
    Moon,
    Save,
    Upload,
    Printer,
    Wand2,
    Palette,
    AlertTriangle,
    XCircle,
    Eye,
    ShieldCheck,
    Layers
} from 'lucide-react';
import './GlobalToolbar.css';

const ICON_SHADOW = 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6))';

type ActiveModal =
    | 'homebrew'
    | 'rules'
    | 'loot'
    | 'changelog'
    | 'init'
    | 'generator'
    | 'print'
    | 'theme'
    | 'accessibility'
    | 'gm-screen'
    | 'battle-organizer'
    | 'battle-organizer-settings'
    | null;

export function GlobalToolbar() {
    const isObrReady = useObrReady();
    const { handleInitiativeToggle } = useInitiativePopover(isObrReady);
    const store = useCharacterStore();

    const storeRole = useCharacterStore((state) => state.role);
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const homebrewAccess = useCharacterStore((state) => state.identity.homebrewAccess) || 'Full';
    const gmOnlyLootGen = useCharacterStore((state) => state.identity.gmOnlyLootGen);

    const [localRole, setLocalRole] = useState<string>(isStandaloneMode ? 'GM' : storeRole);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [isDark, setIsDark] = useState<boolean>(true);

    // Consolidated State
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
    const [isPrintingBattleOrganizer, setIsPrintingBattleOrganizer] = useState(false);

    const fileInputReference = useRef<HTMLInputElement>(null);

    const showHomebrewButton = isStandaloneMode || canViewHomebrew(localRole, homebrewAccess);
    const showLootGenButton = isStandaloneMode || localRole === 'GM' || gmOnlyLootGen === false;
    const showPokemonGeneratorButton = true;

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
            if (urlParams.get('modal') === 'gm-screen' || window.location.hash.startsWith('#gm-screen')) {
                setActiveModal('gm-screen');
            }

            const savedExpanded = localStorage.getItem('pkr_global_toolbar_expanded');
            if (savedExpanded !== null) {
                setIsExpanded(savedExpanded === 'true');
            }
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

    const handleReturnToMenu = () => {
        useCharacterStore.setState({ tokenId: null });
        setActiveTokenId(null);
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
                store.loadFromOwlbear(importData);
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
        if (isStandaloneMode || !OBR.isAvailable || !isObrReady) {
            setActiveModal('battle-organizer');
            return;
        }

        try {
            const viewportWidth = (await OBR.viewport.getWidth()) ?? 1200;
            const viewportHeight = (await OBR.viewport.getHeight()) ?? 800;

            const settings = getBattleOrganizerSettings();
            let targetWidth = 1360;
            let targetHeight = 900;

            if (settings.showBattlefield && !settings.showRoundTracker) {
                targetWidth = 1040;
                targetHeight = 600;
            } else if (!settings.showBattlefield && settings.showRoundTracker) {
                targetWidth = 1200;
                targetHeight = 740;
            }

            targetWidth = Math.min(Math.round(viewportWidth * 0.95), targetWidth);
            targetHeight = Math.min(Math.round(viewportHeight * 0.95), targetHeight);

            const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
            const themeToPass = document.body.getAttribute('data-theme') || 'dark';
            const url = `${baseUrl}/battle-organizer.html?theme=${themeToPass}`;

            await OBR.modal.open({
                id: 'pkr-battle-organizer',
                url: url,
                width: targetWidth,
                height: targetHeight
            });
        } catch (e) {
            console.warn('[GlobalToolbar] Failed to open OBR Battle Organizer modal, falling back to local modal:', e);
            setActiveModal('battle-organizer');
        }
    };

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

                {isStandaloneMode && activeTokenId && (
                    <button
                        type="button"
                        className="global-toolbar__btn--back-header action-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReturnToMenu();
                        }}
                        title="Close sheet and return to file browser"
                    >
                        <ArrowLeft size={16} /> Back to Menu
                    </button>
                )}
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

                        <button
                            type="button"
                            className="global-toolbar__btn action-button--primary-hover"
                            onClick={() => setActiveModal('rules')}
                            title="Configure Room Rules & Dice Engine"
                        >
                            <BookOpen size={16} color="var(--primary)" /> Room Rules
                        </button>

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
                                onClick={() => exportCharacterData(store, isStandaloneMode, isObrReady)}
                                className="action-button action-button--dark global-toolbar__action-mini-btn"
                                title="Export Character (Download JSON)"
                                aria-label="Export Character JSON"
                            >
                                <Save size={16} style={{ filter: ICON_SHADOW }} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputReference.current?.click()}
                                className="action-button action-button--dark global-toolbar__action-mini-btn"
                                title="Import Character (Upload JSON)"
                                aria-label="Import Character JSON"
                            >
                                <Upload size={16} style={{ filter: ICON_SHADOW }} />
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
                                <Printer size={16} style={{ filter: ICON_SHADOW }} />
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

            {isPrintingBattleOrganizer && <PrintBattleOrganizer onDone={() => setIsPrintingBattleOrganizer(false)} />}
        </div>
    );
}
