import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { canViewHomebrew } from '../../utils/helper';
import { CURRENT_VERSION } from '../../data/changelog';
import { HomebrewModal } from '../homebrew/HomebrewModal';
import { RulesModal } from '../modals/RulesModal';
import { ItemGeneratorModal } from '../modals/ItemGeneratorModal';
import { ChangelogModal } from '../modals/ChangelogModal';
import { isStandaloneMode } from '../../utils/storageAdapter';
import './GlobalToolbar.css';

export function GlobalToolbar() {
    const storeRole = useCharacterStore((state) => state.role);
    const homebrewAccess = useCharacterStore((state) => state.identity.homebrewAccess) || 'Full';
    const gmOnlyLootGen = useCharacterStore((state) => state.identity.gmOnlyLootGen);

    // Fetch the role locally on mount so we don't have to wait for a token click!
    const [localRole, setLocalRole] = useState<string>(isStandaloneMode ? 'GM' : storeRole);

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
        } catch (error) {
            console.warn('[GlobalToolbar] Could not read preferences from localStorage:', error);
        }
    }, []);

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
        <>
            <div className="global-toolbar">
                <div className="global-toolbar__group">
                    {showHomebrewButton && (
                        <button
                            type="button"
                            className="global-toolbar__btn global-toolbar__btn--homebrew"
                            onClick={() => setShowHomebrewModal(true)}
                            title="Manage Table Custom Content"
                        >
                            🛠️ Homebrew Workshop
                        </button>
                    )}

                    <button
                        type="button"
                        className="global-toolbar__btn global-toolbar__btn--rules"
                        onClick={() => setShowRulesModal(true)}
                        title="Configure Room Rules & Dice Engine"
                    >
                        📜 Room Rules
                    </button>

                    {showLootGenButton && (
                        <button
                            type="button"
                            className="global-toolbar__btn global-toolbar__btn--loot"
                            onClick={() => setShowLootGenModal(true)}
                            title="Generate Items & TMs"
                        >
                            🎁 Loot Generator
                        </button>
                    )}
                </div>

                <div className="global-toolbar__group">
                    <button
                        type="button"
                        className="global-toolbar__btn global-toolbar__btn--dark"
                        onClick={() => setShowChangelog(true)}
                        title="View System Updates"
                    >
                        📢 What's New
                    </button>

                    <button
                        type="button"
                        className="global-toolbar__btn global-toolbar__btn--dark"
                        onClick={toggleTheme}
                        title="Toggle Dark/Light Mode"
                    >
                        {isDark ? '☀️ Light' : '🌙 Dark'}
                    </button>
                </div>
            </div>

            {showHomebrewModal && <HomebrewModal onClose={() => setShowHomebrewModal(false)} />}
            {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
            {showLootGenModal && <ItemGeneratorModal onClose={() => setShowLootGenModal(false)} />}
            {showChangelog && <ChangelogModal onClose={handleCloseChangelog} />}
        </>
    );
}