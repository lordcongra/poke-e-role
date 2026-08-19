import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { canViewHomebrew } from '../../utils/helper';
import { CURRENT_VERSION } from '../../data/changelog';
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { RulesModal } from '../modals/RulesModal';
import { ItemGeneratorModal } from '../modals/ItemGeneratorModal';
import { ChangelogModal } from '../modals/ChangelogModal';
import { InitiativeSettingsModal } from '../modals/InitiativeSettingsModal';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { useObrReady } from '../../hooks/useObrReady';
import { setActiveTokenId } from '../../utils/obr';
import { ChevronDown, ArrowLeft, Swords, Settings, Hammer, BookOpen, Package, Bell, Sun, Moon } from 'lucide-react';
import './GlobalToolbar.css';

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

    const [isDark, setIsDark] = useState<boolean>(false);
    const [showHomebrewModal, setShowHomebrewModal] = useState<boolean>(false);
    const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
    const [showLootGenModal, setShowLootGenModal] = useState<boolean>(false);
    const [showChangelog, setShowChangelog] = useState<boolean>(false);
    const [showInitSettings, setShowInitSettings] = useState<boolean>(false);

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

    return (
        <div className="global-toolbar-wrapper">
            <div
                className={`global-toolbar__header ${isExpanded ? 'global-toolbar__header--open' : ''}`}
                onClick={toggleExpanded}
            >
                <div className="global-toolbar__header-title">
                    <span className="global-toolbar__caret">
                        <ChevronDown
                            size={18}
                            style={{
                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.2s',
                                marginTop: '4px'
                            }}
                        />
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
                                className="global-toolbar__btn action-button--secondary-hover"
                                onClick={() => setShowHomebrewModal(true)}
                                title="Manage Table Custom Content"
                            >
                                <Hammer size={16} color="var(--secondary)" /> Homebrew Workshop
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

                    <div className="global-toolbar__side-tools">
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
                </div>
            )}

            {showHomebrewModal && <HomebrewModal onClose={() => setShowHomebrewModal(false)} />}
            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
            {showLootGenModal && <ItemGeneratorModal onClose={() => setShowLootGenModal(false)} />}
            {showChangelog && <ChangelogModal onClose={handleCloseChangelog} />}
            {showInitSettings && <InitiativeSettingsModal onClose={() => setShowInitSettings(false)} />}
        </div>
    );
}
