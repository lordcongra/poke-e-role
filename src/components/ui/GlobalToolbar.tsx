import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { canViewHomebrew } from '../../utils/helper';
import { CURRENT_VERSION } from '../../data/changelog';
import { flattenStateToMetadata } from '../../utils/stateMapper';
import { STATS_META_ID } from '../../utils/graphicsManager';
import { saveToOwlbear } from '../../utils/obr';
import type { CharacterState } from '../../store/storeTypes';
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { RulesModal } from '../modals/RulesModal';
import { ItemGeneratorModal } from '../modals/ItemGeneratorModal';
import { ChangelogModal } from '../modals/ChangelogModal';
import { InitiativeSettingsModal } from '../modals/InitiativeSettingsModal';
import { GeneratorModal } from '../modals/GeneratorModal';
import { PrintSettingsModal } from '../modals/PrintSettingsModal';
import { ThemeSettingsModal } from '../modals/ThemeSettingsModal';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { useObrReady } from '../../hooks/useObrReady';
import { setActiveTokenId } from '../../utils/obr';
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
    XCircle
} from 'lucide-react';
import './GlobalToolbar.css';

const ICON_SHADOW = 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6))';

export function GlobalToolbar() {
    const isObrReady = useObrReady();
    const storeRole = useCharacterStore((state) => state.role);
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const homebrewAccess = useCharacterStore((state) => state.identity.homebrewAccess) || 'Full';
    const gmOnlyLootGen = useCharacterStore((state) => state.identity.gmOnlyLootGen);
    const identityStore = useCharacterStore((state) => state.identity) || {};

    const [localRole, setLocalRole] = useState<string>(isStandaloneMode ? 'GM' : storeRole);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    useEffect(() => {
        if (!isStandaloneMode && OBR.isAvailable) {
            OBR.onReady(async () => {
                const currentRole = await OBR.player.getRole();
                setLocalRole(currentRole);
            });
        }
    }, []);

    const showHomebrewButton = isStandaloneMode || canViewHomebrew(localRole, homebrewAccess);
    const showLootGenButton = isStandaloneMode || localRole === 'GM' || gmOnlyLootGen === false;
    const showPokemonGeneratorButton = isStandaloneMode || !!activeTokenId;

    const [isDark, setIsDark] = useState<boolean>(false);
    const [showHomebrewModal, setShowHomebrewModal] = useState<boolean>(false);
    const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
    const [showLootGenModal, setShowLootGenModal] = useState<boolean>(false);
    const [showChangelog, setShowChangelog] = useState<boolean>(false);
    const [showInitSettings, setShowInitSettings] = useState<boolean>(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState<boolean>(false);
    const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
    const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
    const [importData, setImportData] = useState<Record<string, unknown> | null>(null);

    const fileInputReference = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('pokerole-theme');
            if (savedTheme === 'dark') {
                setIsDark(true);
                document.body.classList.add('dark-mode');
                document.body.setAttribute('data-theme', 'dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }

            const seenVersion = localStorage.getItem('pkr_changelog_seen');
            if (seenVersion !== CURRENT_VERSION) {
                setShowChangelog(true);
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
        } catch (e) {}
    };

    const handleReturnToMenu = () => {
        useCharacterStore.setState({ tokenId: null });
        setActiveTokenId(null);
    };

    useEffect(() => {
        if (!isObrReady || !OBR.isAvailable || isStandaloneMode) return;

        const timeout = setTimeout(() => {
            const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
                unsub();
                openTracker(true);
            });
            OBR.broadcast.sendMessage('pkr-init-ping-check', {}, { destination: 'LOCAL' });
            setTimeout(() => unsub(), 100);
        }, 300);
        return () => clearTimeout(timeout);
    }, [
        isObrReady,
        identityStore.initiativeTrackerPreset,
        identityStore.initiativeTrackerOffsetX,
        identityStore.initiativeTrackerOffsetY,
        identityStore.initiativeTrackerLayout,
        identityStore.initiativeTrackerAvatarShape,
        identityStore.initiativeTrackerMaxWidth,
        identityStore.initiativeTrackerMaxHeight
    ]);

    const openTracker = async (isReAnchor = false) => {
        if (!isObrReady || !OBR.isAvailable) return;

        const {
            initiativeTrackerPreset,
            initiativeTrackerOffsetX,
            initiativeTrackerOffsetY,
            initiativeTrackerLayout,
            initiativeTrackerAvatarShape,
            initiativeTrackerMaxWidth,
            initiativeTrackerMaxHeight
        } = identityStore;

        const width = await OBR.viewport.getWidth();
        const height = await OBR.viewport.getHeight();

        let anchorPosition = { top: 0, left: 0 };
        let transformOrigin = { vertical: 'TOP', horizontal: 'LEFT' };

        const posX = initiativeTrackerOffsetX || 0;
        const posY = initiativeTrackerOffsetY || 0;

        switch (initiativeTrackerPreset) {
            case 'top-left':
                anchorPosition = { top: posY, left: posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'LEFT' };
                break;
            case 'top-right':
                anchorPosition = { top: posY, left: width + posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'RIGHT' };
                break;
            case 'bottom-left':
                anchorPosition = { top: height + posY, left: posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'LEFT' };
                break;
            case 'bottom-right':
                anchorPosition = { top: height + posY, left: width + posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'RIGHT' };
                break;
            case 'center-left':
                anchorPosition = { top: height / 2 + posY, left: posX };
                transformOrigin = { vertical: 'CENTER', horizontal: 'LEFT' };
                break;
            case 'center-right':
                anchorPosition = { top: height / 2 + posY, left: width + posX };
                transformOrigin = { vertical: 'CENTER', horizontal: 'RIGHT' };
                break;
            case 'top-center':
                anchorPosition = { top: posY, left: width / 2 + posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'CENTER' };
                break;
            case 'bottom-center':
                anchorPosition = { top: height + posY, left: width / 2 + posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'CENTER' };
                break;
        }

        const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        const themeToPass = document.body.getAttribute('data-theme') || 'light';
        const url = `${baseUrl}/initiative-tracker.html?layout=${initiativeTrackerLayout || 'compact'}&theme=${themeToPass}&shape=${initiativeTrackerAvatarShape || 'circle'}&mw=${initiativeTrackerMaxWidth || 400}&mh=${initiativeTrackerMaxHeight || 600}`;

        const savedW = parseInt(localStorage.getItem('pkr_init_width') || '400');
        const savedH = parseInt(localStorage.getItem('pkr_init_height') || '150');

        OBR.popover
            .open({
                id: 'pkr-initiative-tracker',
                url: url,
                height: isReAnchor ? savedH : 150,
                width: isReAnchor ? savedW : 400,
                disableClickAway: true,
                anchorReference: 'POSITION',
                anchorPosition: anchorPosition,
                // @ts-ignore
                transformOrigin: transformOrigin
            })
            .catch(() => {});
    };

    const handleInitiativeToggle = async () => {
        if (isStandaloneMode) {
            window.dispatchEvent(new Event('toggle-standalone-tracker'));
            return;
        }

        if (!OBR.isAvailable || !isObrReady) return;

        let handled = false;
        const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
            handled = true;
            unsub();
            OBR.popover.close('pkr-initiative-tracker').catch(() => {});
        });

        OBR.broadcast.sendMessage('pkr-init-ping-toggle', {}, { destination: 'LOCAL' });

        setTimeout(() => {
            unsub();
            if (!handled) {
                openTracker();
            }
        }, 150);
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
        }
    };

    const handleCloseChangelog = () => {
        try {
            localStorage.setItem('pkr_changelog_seen', CURRENT_VERSION);
        } catch (error) {
            console.warn('[GlobalToolbar] Could not mark changelog as seen:', error);
        }
        setShowChangelog(false);
    };

    const handleExport = async () => {
        const state = useCharacterStore.getState();

        if (isStandaloneMode) {
            try {
                const exportData = flattenStateToMetadata(state);
                const dataString = JSON.stringify(exportData, null, 2);

                const blob = new Blob([dataString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const linkElement = document.createElement('a');
                const name = state.identity.nickname || state.identity.species || 'character';
                linkElement.href = url;
                linkElement.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;
                document.body.appendChild(linkElement);
                linkElement.click();
                document.body.removeChild(linkElement);
                URL.revokeObjectURL(url);
                return;
            } catch (error) {
                console.error('[GlobalToolbar] Standalone Export failed:', error);
                return;
            }
        }

        if (!state.tokenId || !OBR.isAvailable || !isObrReady) {
            if (OBR.isAvailable && isObrReady) OBR.notification.show('Please select a token to export.', 'WARNING');
            return;
        }

        try {
            const items = await OBR.scene.items.getItems([state.tokenId]);
            if (items.length === 0) return;

            const exportData = items[0].metadata[STATS_META_ID] || {};
            const dataString = JSON.stringify(exportData, null, 2);

            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const linkElement = document.createElement('a');
            const name = state.identity.nickname || state.identity.species || 'character';
            linkElement.href = url;
            linkElement.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[GlobalToolbar] Export failed:', error);
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            try {
                const imported = JSON.parse(fileEvent.target?.result as string);
                setImportData(imported);
            } catch (error) {
                if (OBR.isAvailable && isObrReady) OBR.notification.show('Invalid JSON file.', 'ERROR');
                else alert('Invalid JSON file.');
            }
            if (fileInputReference.current) fileInputReference.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if (!importData) return;
        const store = useCharacterStore.getState();
        try {
            if (
                importData['moves-data'] !== undefined ||
                importData['hp-curr'] !== undefined ||
                importData['v2-migrated']
            ) {
                store.loadFromOwlbear(importData);
                saveToOwlbear(importData);
            } else {
                useCharacterStore.setState(importData as unknown as CharacterState);
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
                                onClick={() => setShowInitSettings(true)}
                                title="Initiative Settings"
                            >
                                <Settings size={16} color="var(--text-muted)" />
                            </button>
                        </div>

                        {showHomebrewButton && (
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--primary-hover"
                                onClick={() => setShowHomebrewModal(true)}
                                title="Manage Table Custom Content"
                            >
                                <Hammer size={16} color="var(--primary)" /> Homebrew Workshop
                            </button>
                        )}

                        <button
                            type="button"
                            className="global-toolbar__btn action-button--primary-hover"
                            onClick={() => setShowRulesModal(true)}
                            title="Configure Room Rules & Dice Engine"
                        >
                            <BookOpen size={16} color="var(--primary)" /> Room Rules
                        </button>

                        {(showPokemonGeneratorButton || showLootGenButton) && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {showPokemonGeneratorButton && (
                                    <button
                                        type="button"
                                        className="global-toolbar__btn action-button--secondary-hover"
                                        onClick={() => setShowGeneratorModal(true)}
                                        title="Open Pokémon Generator"
                                    >
                                        <Wand2 size={16} color="var(--secondary)" /> PKMN Generator
                                    </button>
                                )}
                                {showLootGenButton && (
                                    <button
                                        type="button"
                                        className="global-toolbar__btn action-button--secondary-hover"
                                        onClick={() => setShowLootGenModal(true)}
                                        title="Generate Items & TMs"
                                    >
                                        <Package size={16} color="var(--secondary)" /> Loot Generator
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div
                        className="global-toolbar__side-tools"
                        style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}
                    >
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                type="button"
                                className="global-toolbar__btn action-button--neutral-hover"
                                onClick={() => setShowThemeModal(true)}
                                title="Override Theme Colors"
                            >
                                <Palette size={16} color="var(--text-main)" /> Theme
                            </button>

                            <button
                                type="button"
                                className="global-toolbar__btn action-button--neutral-hover"
                                onClick={() => setShowChangelog(true)}
                                title="View System Updates"
                            >
                                <Bell size={16} color="var(--text-main)" /> What's New
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
                        </div>

                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                type="button"
                                onClick={handleExport}
                                className="action-button action-button--dark"
                                title="Export Character (Download JSON)"
                            >
                                <Save size={14} style={{ filter: ICON_SHADOW }} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputReference.current?.click()}
                                className="action-button action-button--dark"
                                title="Import Character (Upload JSON)"
                            >
                                <Upload size={14} style={{ filter: ICON_SHADOW }} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputReference}
                                onChange={handleImport}
                                accept=".json"
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPrintModal(true)}
                                className="action-button action-button--dark"
                                title="Print Sheet"
                            >
                                <Printer size={14} style={{ filter: ICON_SHADOW }} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {showHomebrewModal && <HomebrewModal onClose={() => setShowHomebrewModal(false)} />}
            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
            {showLootGenModal && <ItemGeneratorModal onClose={() => setShowLootGenModal(false)} />}
            {showGeneratorModal && <GeneratorModal onClose={() => setShowGeneratorModal(false)} />}
            {showChangelog && <ChangelogModal onClose={handleCloseChangelog} />}
            {showInitSettings && <InitiativeSettingsModal onClose={() => setShowInitSettings(false)} />}
            {showPrintModal && <PrintSettingsModal onClose={() => setShowPrintModal(false)} />}
            {showThemeModal && <ThemeSettingsModal onClose={() => setShowThemeModal(false)} />}
        </div>
    );
}
